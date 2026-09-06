#!/usr/bin/env python3
"""Shared fleet node definitions and live latency probing.

Used by both website/build_site.py (build-time snapshot for first paint)
and agora_server.py (live /api/telemetry endpoint), so the two never
drift out of sync on hosts/ports/defaults.
"""
import socket
import time

# name -> (host, port, default_ms used only if the live probe fails)
NODES = {
    "tidal": ("127.0.0.1", 8888, 14),
    "river": ("100.91.42.51", 8788, 18),
    "creek": ("100.91.42.51", 8789, 26),
    "stream": ("100.91.42.51", 8790, 22),
    "beacon": ("100.99.217.90", 8787, 54),
    "highbeam": ("beaconwake.com", 443, 58),
    "lantern": ("beaconwake.com", 443, 62),
    "lightning": ("beaconwake.com", 443, 52),
    "mountain": ("100.114.14.116", 8787, 68),
    "canyon": ("100.114.14.116", 8787, 68),
    "ridge": ("100.114.14.116", 8787, 68),
    "harbor": ("100.114.14.116", 8787, 68),
}


def measure_latencies(timeout=0.8):
    """Open a live TCP connection to every fleet node and time the handshake."""
    latencies = {}
    for name, (host, port, default) in NODES.items():
        start = time.time()
        try:
            conn = socket.create_connection((host, port), timeout=timeout)
            conn.close()
            ms = int((time.time() - start) * 1000)
            latencies[name] = max(1, ms)
        except Exception:
            latencies[name] = default
    return latencies
