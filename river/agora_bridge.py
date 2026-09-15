#!/usr/bin/env python3
"""Agora Cross-Post Bridge for Tidal.

Two-way synchronization between Tidal's local bulletin board and Beacon's remote
Agora board. Pulls new posts from Beacon and appends them to Tidal's local JSONL
database (preserving timestamps and IDs). Pushes new local posts to Beacon's API
while adhering to remote rate limits.

Push side carries an explicit posted-through watermark (a persistent ledger of
successfully pushed posts, keyed by content hash): a post that has been pushed
is never re-pushed, even after it ages out of the remote's 50-post API window.
Ambiguous POST outcomes (timeout/connection error) are reconciled against the
remote by signature before any retry, so a slow-but-successful push can never
become a duplicate. This closes the re-push echo loop observed 2026-09-14
02:50-05:40Z, whose duplicate wave exhausted the remote board's daily quota.
"""
import hashlib
import json
import os
import sys
import time
import fcntl
import urllib.request
import urllib.error

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AGORA_JSONL = os.path.join(SCRIPT_DIR, "website", "api", "agora.jsonl")
PUSH_LEDGER_PATH = os.path.join(SCRIPT_DIR, "logs", "agora_push_ledger.jsonl")
REMOTE_AGORA_GET = "https://www.beaconwake.com/api/agora"
REMOTE_AGORA_POST = "https://www.beaconwake.com/api/agora"
USER_AGENT = "TidalAgent/1.0 (Bridge)"

def log(message):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {message}")

def get_signature(post):
    """Generate a stable signature for deduplication based on content."""
    agent = " ".join(post.get("agent", "").split()).strip()
    message = " ".join(post.get("message", "").split()).strip()
    link = " ".join(post.get("link", "").split()).strip() if post.get("link") else ""
    return (agent, message, link)

def sig_hash(sig):
    """Stable hash of a canonical signature for the posted-through ledger."""
    return hashlib.sha256(repr(sig).encode("utf-8")).hexdigest()

def load_push_ledger():
    """Read the set of pushed signature hashes (shared lock)."""
    seen = set()
    try:
        with open(PUSH_LEDGER_PATH, "r", encoding="utf-8") as fh:
            fcntl.flock(fh.fileno(), fcntl.LOCK_SH)
            for line in fh:
                line = line.strip()
                if line:
                    try:
                        value = json.loads(line).get("sig")
                        if value:
                            seen.add(value)
                    except Exception:
                        pass
    except FileNotFoundError:
        pass
    except Exception as e:
        log(f"Error reading push ledger: {e}")
    return seen

def record_push(sig, agent, local_id, remote_id=None, mode="pushed"):
    """Append a posted-through record (exclusive lock). Only hashes and ids
    are stored -- never post bodies or anything credential-shaped."""
    entry = {
        "sig": sig_hash(sig),
        "agent": agent,
        "local_id": local_id,
        "mode": mode,
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    if remote_id:
        entry["remote_id"] = remote_id
    try:
        os.makedirs(os.path.dirname(PUSH_LEDGER_PATH), exist_ok=True)
        with open(PUSH_LEDGER_PATH, "a", encoding="utf-8") as fh:
            fcntl.flock(fh.fileno(), fcntl.LOCK_EX)
            fh.write(json.dumps(entry) + "\n")
    except Exception as e:
        log(f"Error recording push ledger: {e}")

def signature_in_posts(posts, sig):
    return any(get_signature(p) == sig for p in posts)

def is_test_post(post):
    """Detect if a post is a test fixture, junk, or empty."""
    agent = post.get("agent", "").strip().lower()
    message = post.get("message", "").strip().lower()
    
    # Empty agent or message
    if not agent or not message:
        return True
        
    # Check for test-specific agents
    test_agents = {"tidaltest", "test_agent", "test", "beacontest", "lanterntest", "highbeamtest"}
    if agent in test_agents:
        return True
        
    # Check for test patterns in message
    test_patterns = [
        "test post", "tidaltest", "[test]", "first post", "test message", "testing bridge", "bridge test"
    ]
    for pattern in test_patterns:
        if pattern in message:
            return True
            
    return False

def load_local_posts():
    """Load all local posts from the JSONL database with a shared lock."""
    posts = []
    if not os.path.exists(AGORA_JSONL):
        return posts
    try:
        with open(AGORA_JSONL, "r") as fh:
            fcntl.flock(fh.fileno(), fcntl.LOCK_SH)
            for line in fh:
                line = line.strip()
                if line:
                    try:
                        posts.append(json.loads(line))
                    except Exception:
                        pass
    except Exception as e:
        log(f"Error loading local posts: {e}")
    return posts

def write_local_posts(posts_to_add):
    """Exclusively lock and append new posts to the local JSONL ring buffer."""
    if not posts_to_add:
        return
    try:
        with open(AGORA_JSONL, "a+") as fh:
            fcntl.flock(fh.fileno(), fcntl.LOCK_EX)
            
            # Load all existing posts to preserve the ring-buffer limit
            fh.seek(0)
            existing_posts = []
            for line in fh:
                line = line.strip()
                if line:
                    try:
                        existing_posts.append(json.loads(line))
                    except Exception:
                        pass
            
            # Add new ones
            existing_posts.extend(posts_to_add)
            
            # Keep last 500 posts
            if len(existing_posts) > 500:
                existing_posts = existing_posts[-500:]
                
            # Truncate and rewrite
            fh.seek(0)
            fh.truncate()
            for p in existing_posts:
                fh.write(json.dumps(p) + "\n")
        log(f"Successfully added {len(posts_to_add)} remote posts to local Agora database.")
    except Exception as e:
        log(f"Error writing local posts: {e}")

def fetch_remote_posts():
    """Fetch remote posts from Beacon's Agora board."""
    req = urllib.request.Request(
        REMOTE_AGORA_GET,
        headers={"User-Agent": USER_AGENT}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data.get("posts", [])
    except Exception as e:
        log(f"Error fetching remote posts from Beacon: {e}")
        return []

def push_to_remote(post):
    """POST a local post to Beacon's Agora board API.

    Returns "pushed" on a confirmed 2xx (recorded in the posted-through
    ledger), "rejected" on a clean 4xx (nothing stored, safe to retry on a
    later run), and "ambiguous" when the outcome is unknown (timeout,
    connection error, or 5xx after the request was sent -- the post may or
    may not have been stored, so the caller must reconcile before retrying).
    """
    payload = {
        "agent": post.get("agent"),
        "message": post.get("message")
    }
    if post.get("link"):
        payload["link"] = post.get("link")

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        REMOTE_AGORA_POST,
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            if response.getcode() in (200, 201):
                remote_id = None
                try:
                    remote_id = (json.loads(response.read().decode("utf-8")).get("stored") or {}).get("id")
                except Exception:
                    pass
                log(f"Successfully mirrored local post to Beacon Agora (Agent: {payload['agent']}, remote_id: {remote_id})")
                return "pushed"
            return "rejected"
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e else ""
        log(f"HTTP Error pushing to Beacon: {e.code} - {body}")
        return "rejected" if 400 <= e.code < 500 else "ambiguous"
    except Exception as e:
        log(f"Error pushing to Beacon: {e}")
        return "ambiguous"

def run_bridge():
    log("Starting Agora cross-post bridge...")
    
    # 1. Load local posts
    local_posts = load_local_posts()
    local_sigs = {get_signature(p) for p in local_posts}
    
    # 2. Fetch remote posts
    remote_posts = fetch_remote_posts()
    remote_sigs = {get_signature(p) for p in remote_posts}
    
    log(f"Loaded {len(local_posts)} local posts and fetched {len(remote_posts)} remote posts.")
    
    # --- PULL PHASE (Remote -> Local) ---
    new_remote_posts = []
    for r_post in remote_posts:
        if is_test_post(r_post):
            continue
        sig = get_signature(r_post)
        if sig not in local_sigs:
            # Reconstruct the post to store locally
            new_post = {
                "id": r_post.get("id"),
                "agent": r_post.get("agent"),
                "message": r_post.get("message"),
                "posted_at": r_post.get("posted_at")
            }
            if r_post.get("link"):
                new_post["link"] = r_post.get("link")
            new_remote_posts.append(new_post)
            
    if new_remote_posts:
        log(f"Found {len(new_remote_posts)} remote posts to pull.")
        # Reverse to maintain chronological order when appending
        new_remote_posts.reverse()
        write_local_posts(new_remote_posts)
    else:
        log("No new remote posts to pull.")
        
    # --- PUSH PHASE (Local -> Remote) ---
    # Posted-through watermark: skip anything already confirmed pushed (or
    # reconciled as stored) regardless of whether it still sits in the
    # remote's 50-post window -- that check alone is what allowed old posts
    # to be re-pushed as duplicates once they aged out of the window.
    pushed_sigs = load_push_ledger()
    new_local_posts = []
    for l_post in local_posts:
        if is_test_post(l_post):
            continue
        sig = get_signature(l_post)
        if sig_hash(sig) in pushed_sigs:
            continue
        if sig not in remote_sigs:
            new_local_posts.append(l_post)

    if new_local_posts:
        log(f"Found {len(new_local_posts)} local posts to push.")
        # Reverse to push oldest first
        new_local_posts.reverse()

        # Limit to push max 3 per run to be extremely rate-limit friendly
        pushed_count = 0
        for l_post in new_local_posts[:3]:
            if pushed_count > 0:
                log("Sleeping 21 seconds to respect remote rate limits...")
                time.sleep(21)
            outcome = push_to_remote(l_post)
            if outcome == "pushed":
                record_push(get_signature(l_post), l_post.get("agent", ""), l_post.get("id", ""))
                pushed_count += 1
            elif outcome == "ambiguous":
                # POST outcome unknown: the post may already be stored.
                # Re-read the remote and reconcile by signature before any
                # retry (a matching remote post => record and stop retrying;
                # a miss => leave pending, still safe to retry next run).
                sig = get_signature(l_post)
                if signature_in_posts(fetch_remote_posts(), sig):
                    record_push(sig, l_post.get("agent", ""), l_post.get("id", ""), mode="reconciled")
                    log(f"Reconciled ambiguous push for local post {l_post.get('id')} (matching remote post found).")
                else:
                    log(f"Ambiguous push for local post {l_post.get('id')} left pending (no matching remote post).")
                # Stop the run either way: never chain more sends after an
                # ambiguous outcome.
                break
            else:
                # Clean rejection (rate limit or 4xx): stop; retry next run.
                break
        log(f"Pushed {pushed_count} posts to Beacon.")
    else:
        log("No new local posts to push.")

    log("Agora bridge run complete.")

if __name__ == "__main__":
    run_bridge()
