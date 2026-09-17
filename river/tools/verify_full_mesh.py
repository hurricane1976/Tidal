#!/usr/bin/env python3
"""Verify one agent's direct, bearer-authenticated 11-peer fleet mesh.

This tool never prints credentials and never POSTs messages.  With --probe it
makes authenticated GET /health requests only.  The flat peers.env format is
parsed exactly as the existing send_to_peer.sh helpers: the final NAME block
for an agent is that agent's outbound route; all blocks remain valid inbound
credentials for peer_server.py.
"""
import argparse
import json
import pathlib
import sys
import urllib.error
import urllib.request


def parse_peers(path):
    self_name = None
    blocks, current = [], None
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = (part.strip() for part in line.split("=", 1))
        if key == "SELF_NAME":
            self_name = value.upper()
        elif key == "NAME":
            if current:
                blocks.append(current)
            current = {"NAME": value.upper()}
        elif current is not None and key in {"ADDR", "TOKEN"}:
            current[key] = value
    if current:
        blocks.append(current)
    return self_name, blocks


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("agent_dir", type=pathlib.Path)
    parser.add_argument("--manifest", type=pathlib.Path,
                        default=pathlib.Path(__file__).parents[1] / "mesh" / "fleet_manifest.json")
    parser.add_argument("--probe", action="store_true", help="GET /health using each final outbound credential")
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text())
    expected = {entry["id"]: entry["endpoint"] for entry in manifest["agents"]}
    env_path = args.agent_dir / "keys" / "peers.env"
    if not env_path.is_file():
        return fail(f"missing {env_path}")
    self_name, blocks = parse_peers(env_path)
    if self_name not in expected:
        return fail(f"SELF_NAME {self_name!r} is absent from manifest")

    # Deliberately last-wins: this matches every deployed send_to_peer.sh.
    outbound = {block["NAME"]: block for block in blocks if block.get("NAME")}
    peers = set(expected) - {self_name}
    errors = []
    if set(outbound) != peers:
        errors.append("outbound names differ: missing=%s extra=%s" %
                      (sorted(peers - set(outbound)), sorted(set(outbound) - peers)))
    for name in sorted(peers & set(outbound)):
        block = outbound[name]
        if block.get("ADDR") != expected[name]:
            errors.append(f"{name}: endpoint is {block.get('ADDR')!r}, expected {expected[name]!r}")
        token = block.get("TOKEN", "")
        if len(token) < 32 or token.startswith(("REPLACE", "CHANGEME")):
            errors.append(f"{name}: missing or placeholder bearer credential")
    if errors:
        for error in errors:
            print(f"FAIL: {error}")
        return 1

    print(f"PASS: {self_name} has {len(peers)} direct outbound routes with the canonical endpoints.")
    if not args.probe:
        return 0
    failures = 0
    for name in sorted(peers):
        block = outbound[name]
        request = urllib.request.Request(
            f"http://{block['ADDR']}/health",
            headers={"Authorization": f"Bearer {block['TOKEN']}"}, method="GET")
        try:
            with urllib.request.urlopen(request, timeout=8) as response:
                status = response.status
            ok = 200 <= status < 300
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            status, ok = type(exc).__name__, False
        print(f"{'OK' if ok else 'FAIL'} {name} {block['ADDR']} health={status}")
        failures += not ok
    return int(bool(failures))


def fail(message):
    print(f"FAIL: {message}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
