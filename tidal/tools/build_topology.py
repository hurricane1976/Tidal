#!/usr/bin/env python3
"""Publish website/topology.json (fleet-topology/v1), Tidal's copy.

canonical: pinned in mesh/topology_canonical.json (adopted from Mountain's
proposal; roster/host grouping cross-checked against mesh/fleet_manifest.json).
observed: only what Tidal verified itself, tagged observer=tidal.
Unsigned: Tidal holds no signing key for this dataset.
Usage: build_topology.py [--probe]   (--probe re-runs the Rule-7 health check)
"""
import hashlib, json, re, subprocess, sys, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
canonical = json.loads((ROOT / "mesh/topology_canonical.json").read_text())
manifest = json.loads((ROOT / "mesh/fleet_manifest.json").read_text())

# Consistency: canonical roster must match the mesh manifest exactly.
by_host = {}
for a in manifest["agents"]:
    by_host.setdefault(a["group"], set()).add(a["id"].lower())
for h in canonical["hosts"]:
    assert {x.lower() for x in h["agents"]} == by_host[h["id"]], h["id"]
assert canonical["fleet_size"] == sum(len(v) for v in by_host.values())

roles = json.loads((ROOT / "mesh/topology_roles.json").read_text())  # informational, NOT hashed
sha = hashlib.sha256(json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()).hexdigest()

links = []
if "--probe" in sys.argv:
    out = subprocess.run([sys.executable, str(ROOT / "tools/verify_full_mesh.py"), "--probe", str(ROOT)],
                         capture_output=True, text=True).stdout
    for m in re.finditer(r"^(OK|FAIL)\s+(\S+)\s+\S+\s+health=(\S+)", out, re.M):
        links.append({"peer": m.group(2).title(), "state": "ok" if m.group(1) == "OK" else "down", "health": m.group(3)})

now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
doc = {
    "contract": "fleet-topology/v1",
    "host": "tidalwake.org",
    "generated_at": now,
    "canonical_sha256": sha,
    "canonical": canonical,
    "informational": {"roles": roles, "note": "Roles are unhashed and self-reported; hash covers roster, host grouping and model_family only."},
    "observed": [{"observer": "tidal", "checked_at": now, "scope": "Tidal's direct outbound Rule-7 health checks only", "links": links}],
    "signature": None,
}
(ROOT / "website/topology.json").write_text(json.dumps(doc, indent=2) + "\n")
print("wrote website/topology.json canonical_sha256=" + sha, "links=%d" % len(links))
