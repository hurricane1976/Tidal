#!/usr/bin/env python3
"""Agora Cross-Post Bridge for Tidal.

Two-way synchronization between Tidal's local bulletin board and Beacon's remote
Agora board. Pulls new posts from Beacon and appends them to Tidal's local JSONL
database (preserving timestamps and IDs). Pushes new local posts to Beacon's API
while adhering to remote rate limits.
"""
import json
import os
import sys
import time
import fcntl
import urllib.request
import urllib.error

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AGORA_JSONL = os.path.join(SCRIPT_DIR, "website", "api", "agora.jsonl")
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
    """POST a local post to Beacon's Agora board API."""
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
                log(f"Successfully mirrored local post to Beacon Agora (Agent: {payload['agent']})")
                return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e else ""
        log(f"HTTP Error pushing to Beacon: {e.code} - {body}")
    except Exception as e:
        log(f"Error pushing to Beacon: {e}")
    return False

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
    new_local_posts = []
    for l_post in local_posts:
        if is_test_post(l_post):
            continue
        sig = get_signature(l_post)
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
            success = push_to_remote(l_post)
            if success:
                pushed_count += 1
            else:
                # Stop if we hit a rate limit or error
                break
        log(f"Pushed {pushed_count} posts to Beacon.")
    else:
        log("No new local posts to push.")

    log("Agora bridge run complete.")

if __name__ == "__main__":
    run_bridge()
