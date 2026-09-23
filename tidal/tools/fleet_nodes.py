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
    "meadow": ("100.91.42.51", 8791, 26),
    "beacon": ("100.99.217.90", 8787, 54),
    "highbeam": ("beaconwake.com", 443, 58),
    "lantern": ("beaconwake.com", 443, 62),
    "lightning": ("beaconwake.com", 443, 52),
    "radar": ("100.125.26.66", 8787, 70),
    "mountain": ("100.114.14.116", 8787, 68),
    "canyon": ("100.114.14.116", 8791, 68),
    "ridge": ("100.114.14.116", 8792, 68),
    "harbor": ("100.114.14.116", 8793, 68),
    "delta": ("100.114.14.116", 8794, 70),
    # Expansion wave 2026-09-19 (Josh directive 15:50:59Z: account for all 18):
    "brook": ("100.91.42.51", 8792, 26),      # 16th, this host (operator-onboarded 2026-09-19)
    "prism": ("100.100.158.42", 8787, 70),    # 17th, Beacon host (beacon-prism tailnet node)
    "mesa": ("100.114.14.116", 8795, 70),     # 18th, Mountain host (fleet link / mesh reliability)
    # Second Sept-19 wave (21 agents, Waking 350 ground truth): mist (7th on
    # this host, operator session 22:03Z), pulsar (Beacon host 7th, own
    # beacon-pulsar tailnet node), vista (Mountain host 7th, live per the
    # W-350 sweep -- TIDAL<->VISTA two-way green).
    "mist": ("100.91.42.51", 8793, 26),       # this host (fleet knowledge & documentation curator)
    "pulsar": ("100.70.91.55", 8787, 70),     # Beacon host (security sentinel, beacon-pulsar)
    "vista": ("100.114.14.116", 8796, 70),    # Mountain host (site & product quality)
    # Gale (22nd agent, onboarded 2026-09-21): its own 4th host, own Tailscale
    # node gale-agent -- does not co-locate with Tidal/Beacon/Mountain. Lead
    # pairs (Tidal/Beacon/Mountain <-> Gale) verified live same day.
    "gale": ("100.66.39.59", 8787, 75),
    # Gale's own siblings (23rd-25th agents, operator-installed 2026-09-21,
    # same host/tailnet node as Gale -- forms a 4th host group of 4 rather
    # than a 7-agent pentagram). All three probed health=200 from Tidal's
    # side 2026-09-22; sibling-mesh installs confirmed by River/Stream/Beacon.
    "zephyr": ("100.66.39.59", 8788, 75),
    "squall": ("100.66.39.59", 8789, 75),
    "tempest": ("100.66.39.59", 8790, 75),
    # Cyclone + Vortex (26th-27th agents, Gale's own siblings, same host):
    # tokens arrived in Gale's 2026-09-22T22:27:14Z fleet-provision bundle;
    # role not yet published. Only TIDAL's own outbound leg is verified
    # (POST 200, Josh's 23:30:17Z "approved to connect any remaining legs");
    # sibling installs are relayed but held pending the leaked-token purge.
    "cyclone": ("100.66.39.59", 8794, 75),
    "vortex": ("100.66.39.59", 8792, 75),
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
