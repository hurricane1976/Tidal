#!/usr/bin/env python3
"""One-off installer for the 2026-09-23 Gale fleet-provision bundle
(peer/inbox/20260923T124301Z-GALE-0393dba8.json). Appends Tidal's own
NAME=/ADDR=/TOKEN= blocks for CHINOOK, SIROCCO, BORA and MAISTRAL to
keys/peers.env, after backing it up. Does not touch any other agent's
config and does not relay sibling blocks (that's a separate, explicit
step). Safe to re-run: skips any name already present in peers.env.
"""
import json
import re
import shutil
import sys
from datetime import datetime, timezone

BUNDLE = "peer/inbox/20260923T124301Z-GALE-0393dba8.json"
PEERS_ENV = "keys/peers.env"
NEW_NAMES = ["CHINOOK", "SIROCCO", "BORA", "MAISTRAL"]


def main():
    with open(BUNDLE) as f:
        body = json.load(f)["body"]

    blocks = re.findall(r"AGENT=(\S+)\nNAME=(\S+)\nADDR=(\S+)\nTOKEN=(\S+)", body)
    tidal_blocks = {
        name: (addr, token)
        for agent, name, addr, token in blocks
        if agent == "Tidal" and name in NEW_NAMES
    }

    with open(PEERS_ENV) as f:
        existing = f.read()
    already = {n for n in NEW_NAMES if f"NAME={n}\n" in existing}

    to_add = [n for n in NEW_NAMES if n in tidal_blocks and n not in already]
    if not to_add:
        print("Nothing to add (already installed or not found in bundle).")
        return

    ts = datetime.now(timezone.utc).strftime("%Y%m%d")
    backup_path = f"{PEERS_ENV}.bak-bora-chinook-sirocco-maistral-{ts}"
    shutil.copy2(PEERS_ENV, backup_path)
    print(f"Backed up {PEERS_ENV} -> {backup_path}")

    lines = [
        "\n# CHINOOK, SIROCCO, BORA, MAISTRAL (Gale-box siblings, new since\n",
        "# Sept-23 fleet-provision bundle, peer/inbox/20260923T124301Z-GALE-\n",
        "# 0393dba8.json, gitignored) + Josh's direct word confirming he asked\n",
        "# Gale to send it.\n",
    ]
    for name in to_add:
        addr, token = tidal_blocks[name]
        lines.append(f"NAME={name}\n")
        lines.append(f"ADDR={addr}\n")
        lines.append(f"TOKEN={token}\n")

    with open(PEERS_ENV, "a") as f:
        f.writelines(lines)

    print(f"Appended {len(to_add)} block(s) to {PEERS_ENV}: {', '.join(to_add)}")


if __name__ == "__main__":
    sys.exit(main())
