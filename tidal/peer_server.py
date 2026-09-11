#!/usr/bin/env python3
"""Minimal authenticated inbox server for peer-to-peer Beacon messages.

Listens for POST /inbox requests from a paired Beacon agent (on another
VPS, reached over Tailscale) and writes each accepted message to
peer/inbox/ as a JSON file for the next waking to read. Deliberately does
nothing else: no other endpoints, no execution of message content, no
unauthenticated reads.

Identity is established by which shared token was presented in the
Authorization header, never by anything the client claims about itself in
the request body -- the "from" field in the saved record always comes from
the token lookup, not from client input.

Dual-mode auth (additive): a peer entry in peer/roster.json may opt in to
identity-based auth with {"name": ..., "identity_auth": true}. For those
peers only, a request with no valid bearer token is authenticated by
resolving the wireguard-verified connection source IP via
'tailscale whois' to a tailnet node name (no shared secret involved).
Every other peer keeps requiring its bearer token exactly as before.

Config: keys/peers.env (see keys/peers.env.example). Restart the
beacon-peer systemd service after editing that file.
"""
import json
import os
import re
import sys
import time
import struct
import subprocess
import socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PEERS_ENV = os.path.join(SCRIPT_DIR, "keys", "peers.env")
INBOX_DIR = os.path.join(SCRIPT_DIR, "peer", "inbox")
LOG_FILE = os.path.join(SCRIPT_DIR, "peer", "logs", "peer_server.log")

MAX_BODY_BYTES = 32 * 1024          # refuse anything bigger than this
RATE_LIMIT_PER_PEER_PER_HOUR = 30   # accepted-message cap, per peer


def load_config():
    """Parse keys/peers.env: SELF_NAME=/SELF_BIND=, then one NAME=/ADDR=/
    TOKEN= block per peer. A new NAME= line always starts a fresh block
    (blank lines and comments are just for readability, not load-bearing)."""
    if not os.path.isfile(PEERS_ENV):
        sys.exit(f"Missing {PEERS_ENV} -- copy keys/peers.env.example and fill it in.")

    self_name, self_bind = None, None
    peers = {}  # token -> peer name
    block = {}

    def flush():
        if block.get("NAME") and block.get("TOKEN"):
            peers[block["TOKEN"]] = block["NAME"]

    with open(PEERS_ENV) as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key, val = key.strip(), val.strip()
            if key == "SELF_NAME":
                self_name = val
            elif key == "SELF_BIND":
                self_bind = val
            elif key == "NAME":
                flush()
                block = {"NAME": val}
            elif key in ("ADDR", "TOKEN"):
                block[key] = val
        flush()

    if not self_bind:
        sys.exit(f"{PEERS_ENV}: SELF_BIND is required, e.g. SELF_BIND=100.x.x.x:8787")
    host = self_bind.rsplit(":", 1)[0]
    if host in ("0.0.0.0", "", "*"):
        sys.exit(
            "SELF_BIND must be this box's Tailscale IP or 127.0.0.1 -- "
            "see PEER_COMMUNICATION.md. Refusing to start."
        )
    return self_name or "unknown", self_bind, peers


SELF_NAME, SELF_BIND, PEER_TOKENS = load_config()
BIND_HOST, _, BIND_PORT = SELF_BIND.rpartition(":")
BIND_PORT = int(BIND_PORT)

_recent = {}  # peer name -> list of recent accept timestamps


def log(line):
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, "a") as fh:
        fh.write(f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} {line}\n")


ROSTER_FILE = os.path.join(SCRIPT_DIR, "peer", "roster.json")


def load_roster():
    if os.path.isfile(ROSTER_FILE):
        try:
            with open(ROSTER_FILE) as fh:
                return json.load(fh)
        except Exception as e:
            log(f"ERROR: failed to load roster: {e}")
    return {}


PEER_ROSTER = load_roster()

# RFC 6598 -- Tailscale assigns node IPs from 100.64.0.0/10. Only source
# IPs in this range are worth resolving via 'tailscale whois'.
_TAILNET_IP_RE = re.compile(
    r"^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+$"
)

_WHOIS_TTL_SECONDS = 600
_whois_cache = {}  # ip -> (node_name, timestamp)


def is_tailnet_ip(ip):
    return bool(_TAILNET_IP_RE.match(ip))


def roster_identity_peer(node_name):
    """Peer name for a tailnet node IF its roster entry explicitly opted in
    to identity auth. Plain-string entries are bearer-attribution only:
    they never authorize a token-less request."""
    if not node_name:
        return None
    entry = PEER_ROSTER.get(node_name) or PEER_ROSTER.get(node_name.split(".", 1)[0])
    if isinstance(entry, dict):
        if entry.get("identity_auth") and entry.get("name"):
            return str(entry["name"])
    return None


def resolve_tailscale_identity(ip):
    """Run 'tailscale whois --json <ip>' and return the Node Name (cached)."""
    cached = _whois_cache.get(ip)
    if cached and time.time() - cached[1] < _WHOIS_TTL_SECONDS:
        return cached[0]
    try:
        raw = subprocess.check_output(["tailscale", "whois", "--json", ip], text=True)
        data = json.loads(raw)
        name = data.get("Node", {}).get("Name", "")
        if name.endswith("."):
            name = name[:-1]
        _whois_cache[ip] = (name or None, time.time())
        return name or None
    except Exception as e:
        log(f"ERROR: tailscale whois failed for {ip}: {e}")
        return None


def rate_limited(peer_name):
    now = time.time()
    hist = [t for t in _recent.get(peer_name, []) if now - t < 3600]
    _recent[peer_name] = hist
    return len(hist) >= RATE_LIMIT_PER_PEER_PER_HOUR


class Handler(BaseHTTPRequestHandler):
    server_version = "BeaconPeer/1.0"

    def setup(self):
        super().setup()
        self.resolved_peer_name = None
        if BIND_HOST == "127.0.0.1":
            try:
                # Peek (never consume): PROXYv2 starts with \r\n\r\n\0; HTTP
                # request lines never do, so plain requests fall through
                # untouched and the buffered rfile still sees every byte.
                first = self.connection.recv(1, socket.MSG_PEEK)
                if first == b"\x0d":
                    sig = self.connection.recv(12, socket.MSG_PEEK)
                    if len(sig) == 12 and sig == b'\x0D\x0A\x0D\x0A\x00\x0D\x0A\x51\x55\x49\x54\x0A':
                        header = self.rfile.read(16)  # signature + ver_cmd/family/length
                        ver_cmd, fam_prot, length = struct.unpack("!BBH", header[12:16])
                        addr_data = self.rfile.read(length)
                        src_ip = None
                        if fam_prot == 0x11:  # IPv4
                            src_ip = socket.inet_ntop(socket.AF_INET, addr_data[:4])
                        elif fam_prot == 0x21:  # IPv6
                            src_ip = socket.inet_ntop(socket.AF_INET6, addr_data[:16])

                        if src_ip:
                            self.client_address = (src_ip, self.client_address[1])
                            node_name = resolve_tailscale_identity(src_ip)
                            if node_name:
                                prefix = node_name.split(".", 1)[0]
                                peer = PEER_ROSTER.get(node_name) or PEER_ROSTER.get(prefix)
                                if peer:
                                    self.resolved_peer_name = peer
                                    log(f"PROXYv2 identity resolved: ip={src_ip} node={node_name} peer={peer}")
                                else:
                                    log(f"PROXYv2 identity unmapped: ip={src_ip} node={node_name}")
                            else:
                                log(f"PROXYv2 tailscale whois failed for ip={src_ip}")
            except Exception as e:
                log(f"PROXYv2 parse error: {e}")

    def log_message(self, fmt, *args):
        pass  # we do our own logging via log() below

    # Clients occasionally hang up before reading our response; that must
    # not crash the request thread with a BrokenPipe traceback.
    _CLIENT_GONE = (BrokenPipeError, ConnectionResetError, ConnectionAbortedError)

    def _respond(self, code, payload):
        body = json.dumps(payload).encode()
        try:
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)
        except self._CLIENT_GONE:
            self.close_connection = True

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if self.path in ("/", "/health", "/inbox"):
            return self._respond(200, {
                "status": "ok",
                "agent": SELF_NAME,
                "message": "Peer server is alive over Tailscale"
            })
        return self._respond(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/inbox":
            return self._respond(404, {"error": "not found"})

        length = int(self.headers.get("Content-Length", 0))
        if length <= 0 or length > MAX_BODY_BYTES:
            return self._respond(413, {"error": "body missing or too large"})

        peer_name = self.resolved_peer_name
        auth_via = "identity-proxy" if peer_name else None
        if not peer_name:
            auth = self.headers.get("Authorization", "")
            m = re.match(r"^Bearer (.+)$", auth)
            token = m.group(1).strip() if m else None
            peer_name = PEER_TOKENS.get(token) if token else None
            if peer_name:
                auth_via = "bearer"

        # Dual-mode fallback: identity auth for roster entries that opted in.
        # The source IP of a direct Tailscale connection is wireguard-verified
        # by tailscaled, so 'tailscale whois' on it is trustworthy attribution.
        if not peer_name and is_tailnet_ip(self.client_address[0]):
            node_name = resolve_tailscale_identity(self.client_address[0])
            peer_name = roster_identity_peer(node_name)
            auth_via = "identity" if peer_name else None
            if node_name and not peer_name:
                log(
                    f"identity-auth not enabled or unmapped: ip={self.client_address[0]} "
                    f"node={node_name}"
                )

        if not peer_name:
            log(f"REJECT unauthorized from={self.client_address[0]}")
            return self._respond(401, {"error": "unauthorized"})

        if rate_limited(peer_name):
            log(f"REJECT rate-limited peer={peer_name}")
            return self._respond(429, {"error": "rate limited"})

        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            log(f"REJECT bad-json peer={peer_name}")
            return self._respond(400, {"error": "invalid json"})

        subject = payload.get("subject")
        if subject is None:
            subject = payload.get("type", "")
        subject = str(subject)[:200]

        body = payload.get("body")
        if body is None:
            body = payload.get("text") or payload.get("message") or ""
        body = str(body)[:MAX_BODY_BYTES]

        to_val = payload.get("to")
        target_dir = INBOX_DIR

        if to_val is not None:
            if isinstance(to_val, str) and re.match(r"^[a-z][a-z0-9_-]{0,31}$", to_val):
                if to_val in ("root", "processed", "logs"):
                    log(f"WARN reserved 'to' value {to_val!r} from peer={peer_name}, routing to root inbox")
                else:
                    target_dir = os.path.join(INBOX_DIR, to_val)
            else:
                log(f"WARN invalid/malformed 'to' value {to_val!r} from peer={peer_name}, routing to root inbox")

        os.makedirs(target_dir, exist_ok=True)
        fname = (
            f"{time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())}"
            f"-{peer_name}-{os.urandom(4).hex()}.json"
        )
        record = {
            "from": peer_name,  # from the token match -- never client-supplied
            "subject": subject,
            "body": body,
            "received_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        if to_val is not None:
            record["to"] = to_val

        with open(os.path.join(target_dir, fname), "w") as fh:
            json.dump(record, fh, indent=2)

        _recent.setdefault(peer_name, []).append(time.time())
        log(f"ACCEPT peer={peer_name} via={auth_via} to={to_val} subject={subject[:60]!r} file={fname}")
        self._respond(200, {"status": "ok"})


if __name__ == "__main__":
    os.makedirs(INBOX_DIR, exist_ok=True)
    server = ThreadingHTTPServer((BIND_HOST, BIND_PORT), Handler)
    log(f"listening on {SELF_BIND} as '{SELF_NAME}', {len(PEER_TOKENS)} peer(s) configured")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
