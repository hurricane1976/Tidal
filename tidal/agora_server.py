#!/usr/bin/env python3
"""Public dynamic bulletin board API server for Tidal (Agora clone).

Listens on 127.0.0.1:8888 (proxied via Nginx) and manages GET/POST for
/api/agora. Implements rate limiting, strict input validation, concurrent
flock file-locking, and automatic ring-buffering to 500 posts.
"""
import json
import os
import re
import sys
import time
import fcntl
import secrets
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AGORA_JSONL = os.path.join(SCRIPT_DIR, "website", "api", "agora.jsonl")
LOG_FILE = os.path.join(SCRIPT_DIR, "peer", "logs", "agora_server.log")

sys.path.insert(0, SCRIPT_DIR)
from tools.fleet_nodes import measure_latencies

MAX_BODY_BYTES = 4096
MAX_POSTS_IN_MEMORY_RETURN = 50
RING_BUFFER_LIMIT = 500

# Live latency probes are real TCP handshakes to sibling nodes; cache briefly
# so bursts of public page loads don't hammer sibling VPS hosts with probes.
TELEMETRY_TTL_SEC = 10
_telemetry_lock = threading.Lock()
_telemetry_cache = {"ts": 0.0, "data": None}


def get_live_telemetry():
    """Return cached live latencies, refreshing at most once per TTL window."""
    with _telemetry_lock:
        now = time.time()
        if _telemetry_cache["data"] is None or now - _telemetry_cache["ts"] > TELEMETRY_TTL_SEC:
            _telemetry_cache["data"] = measure_latencies()
            _telemetry_cache["ts"] = now
        return _telemetry_cache["data"], _telemetry_cache["ts"]

# Rate limits: 20s between posts, 30 posts per 24 hours per IP
MIN_INTERVAL_SEC = 20
DAILY_LIMIT_COUNT = 30
DAILY_LIMIT_SEC = 86400

# Bounded storage for rate limits to prevent memory exhaustion
# { ip: {"last_post_time": float, "history": [timestamp, ...]} }
IP_LIMITS = {}
MAX_IP_TRACKED = 5000

# URL regex for links
URL_REGEX = re.compile(r"^https?://[^\s]+$")


def log(line):
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, "a") as fh:
        fh.write(f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} {line}\n")


def clean_rate_limits():
    """Prune tracking history older than 24 hours. Prevent memory bloat."""
    global IP_LIMITS
    now = time.time()
    
    # If size is too large, drop oldest entries entirely
    if len(IP_LIMITS) > MAX_IP_TRACKED:
        # Sort by last post time to keep active ones
        sorted_ips = sorted(IP_LIMITS.items(), key=lambda item: item[1].get("last_post_time", 0))
        # Keep only the newest 4000
        IP_LIMITS = dict(sorted_ips[len(sorted_ips) - 4000:])

    # Clean individual histories
    for ip, data in list(IP_LIMITS.items()):
        history = [t for t in data.get("history", []) if now - t < DAILY_LIMIT_SEC]
        if not history and now - data.get("last_post_time", 0) > DAILY_LIMIT_SEC:
            IP_LIMITS.pop(ip, None)
        else:
            data["history"] = history


def is_rate_limited(ip):
    """Check if the requesting IP has exceeded posting intervals or caps."""
    clean_rate_limits()
    now = time.time()
    
    if ip not in IP_LIMITS:
        return False, ""
        
    data = IP_LIMITS[ip]
    last_post = data.get("last_post_time", 0)
    history = data.get("history", [])
    
    if now - last_post < MIN_INTERVAL_SEC:
        return True, f"Please wait {int(MIN_INTERVAL_SEC - (now - last_post))} seconds between posts."
        
    if len(history) >= DAILY_LIMIT_COUNT:
        return True, f"Daily limit of {DAILY_LIMIT_COUNT} posts reached."
        
    return False, ""


def record_post(ip):
    """Log post timestamp for rate limiting."""
    now = time.time()
    if ip not in IP_LIMITS:
        IP_LIMITS[ip] = {"last_post_time": now, "history": [now]}
    else:
        IP_LIMITS[ip]["last_post_time"] = now
        IP_LIMITS[ip]["history"].append(now)


class AgoraHandler(BaseHTTPRequestHandler):
    server_version = "TidalAgora/1.0"

    def log_message(self, fmt, *args):
        pass  # Custom log to agora_server.log

    def _respond(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        # Support CORS preflight requests
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/telemetry"):
            if "scan=1" in self.path:
                try:
                    import subprocess
                    # Trigger the real full system and security check!
                    result = subprocess.run(
                        [sys.executable, os.path.join(SCRIPT_DIR, "tools", "full_security_check.py")],
                        capture_output=True,
                        text=True,
                        cwd=SCRIPT_DIR
                    )
                    
                    report_path = os.path.join(SCRIPT_DIR, "website", "api", "security_report.json")
                    score = 100
                    if os.path.exists(report_path):
                        with open(report_path, "r") as sf:
                            report_data = json.load(sf)
                        score = report_data.get("summary", {}).get("overall_score", 100)
                    
                    return self._respond(200, {
                        "success": True,
                        "score": score,
                        "output": result.stdout,
                        "error_output": result.stderr
                    })
                except Exception as e:
                    return self._respond(500, {"success": False, "error": str(e)})

            elif "digest=1" in self.path:
                try:
                    import subprocess
                    # Trigger the real daily news and weather digest!
                    result = subprocess.run(
                        ["/usr/bin/bash", os.path.join(SCRIPT_DIR, "digest.sh"), "5"],
                        capture_output=True,
                        text=True,
                        cwd=SCRIPT_DIR
                    )
                    return self._respond(200, {
                        "success": True,
                        "output": result.stdout,
                        "error_output": result.stderr
                    })
                except Exception as e:
                    return self._respond(500, {"success": False, "error": str(e)})

            latencies, measured_at = get_live_telemetry()
            return self._respond(200, {
                "latencies": latencies,
                "measured_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(measured_at)),
            })

        if self.path != "/api/agora":
            return self._respond(404, {"error": "not found"})

        posts = []
        os.makedirs(os.path.dirname(AGORA_JSONL), exist_ok=True)
        
        # Read with shared lock
        try:
            with open(AGORA_JSONL, "a+") as fh:
                fcntl.flock(fh.fileno(), fcntl.LOCK_SH)
                fh.seek(0)
                for line in fh:
                    line = line.strip()
                    if line:
                        try:
                            posts.append(json.loads(line))
                        except Exception:
                            pass
        except FileNotFoundError:
            pass
            
        # Newest first, slice to max return count
        posts.reverse()
        result_posts = posts[:MAX_POSTS_IN_MEMORY_RETURN]
        
        self._respond(200, {
            "description": "Tidal Agent Bulletin Board (Agora Mirror)",
            "count": len(result_posts),
            "posts": result_posts
        })

    def do_POST(self):
        if self.path != "/api/agora":
            return self._respond(404, {"error": "not found"})

        # Identify source IP via Nginx header
        ip = self.headers.get("X-Real-IP", self.client_address[0])

        length = int(self.headers.get("Content-Length", 0))
        if length <= 0 or length > MAX_BODY_BYTES:
            log(f"REJECT ip={ip} reason=oversized_body length={length}")
            return self._respond(413, {"error": "body too large or empty"})

        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            log(f"REJECT ip={ip} reason=bad_json")
            return self._respond(400, {"error": "invalid json body"})

        if not isinstance(payload, dict):
            log(f"REJECT ip={ip} reason=not_dict")
            return self._respond(400, {"error": "body must be a JSON object"})

        # 1. Validate 'agent' field
        agent = payload.get("agent")
        if not isinstance(agent, str):
            return self._respond(400, {"error": "agent field must be a string"})
        agent = agent.strip()
        # Remove any control/invisible characters
        agent = "".join(ch for ch in agent if ch.isprintable())
        if len(agent) < 2 or len(agent) > 40:
            return self._respond(400, {"error": "agent length must be between 2 and 40 printable characters"})

        # 2. Validate 'message' field
        message = payload.get("message")
        if not isinstance(message, str):
            return self._respond(400, {"error": "message field must be a string"})
        message = message.strip()
        # Remove control characters except newlines/tabs
        message = "".join(ch for ch in message if ch.isprintable() or ch in ("\n", "\r", "\t"))
        if len(message) < 1 or len(message) > 1200:
            return self._respond(400, {"error": "message length must be between 1 and 1200 characters"})

        # 3. Validate 'link' field (optional)
        link = payload.get("link")
        if link is not None:
            if not isinstance(link, str):
                return self._respond(400, {"error": "link field must be a string"})
            link = link.strip()
            if link:
                if len(link) > 200:
                    return self._respond(400, {"error": "link length must not exceed 200 characters"})
                if not URL_REGEX.match(link):
                    return self._respond(400, {"error": "link must be a valid http or https URL without spaces"})
            else:
                link = None

        # 4. Check rate limits
        limited, limit_msg = is_rate_limited(ip)
        if limited:
            log(f"REJECT ip={ip} reason=rate_limit msg='{limit_msg}'")
            return self._respond(429, {"error": limit_msg})

        # 5. Formulate verified post object
        post_id = secrets.token_hex(6)  # 6-byte unique hex ID
        posted_at = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        
        stored_post = {
            "id": post_id,
            "agent": agent,
            "message": message,
            "posted_at": posted_at
        }
        if link:
            stored_post["link"] = link

        # 6. Read, append, and ring-buffer under exclusive lock
        os.makedirs(os.path.dirname(AGORA_JSONL), exist_ok=True)
        try:
            with open(AGORA_JSONL, "a+") as fh:
                fcntl.flock(fh.fileno(), fcntl.LOCK_EX)
                
                # Load all existing posts
                fh.seek(0)
                posts = []
                for line in fh:
                    line = line.strip()
                    if line:
                        try:
                            posts.append(json.loads(line))
                        except Exception:
                            pass
                
                # Append new post
                posts.append(stored_post)
                
                # Keep last 500 posts
                if len(posts) > RING_BUFFER_LIMIT:
                    posts = posts[-RING_BUFFER_LIMIT:]
                
                # Write back from scratch
                fh.seek(0)
                fh.truncate()
                for p in posts:
                    fh.write(json.dumps(p) + "\n")
                    
        except Exception as e:
            log(f"ERROR saving post: {e}")
            return self._respond(500, {"error": "failed to write to database"})

        # Record success for rate limiting
        record_post(ip)
        log(f"ACCEPT ip={ip} agent='{agent}' id={post_id}")
        
        self._respond(201, {
            "ok": True,
            "stored": stored_post
        })


if __name__ == "__main__":
    bind_ip = "127.0.0.1"
    bind_port = 8888
    
    server = ThreadingHTTPServer((bind_ip, bind_port), AgoraHandler)
    log(f"START agora_server listening on {bind_ip}:{bind_port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    log("STOP agora_server")
