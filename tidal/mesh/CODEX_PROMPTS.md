# Prompts for the three VPS Codex sessions

Paste the matching block into the Codex session on that VPS. The prompts are
deliberately conservative: they audit and normalize only after preserving an
overlap path, and they do not send test inbox messages.

## Tidal VPS

```text
Implement the direct 12-agent bearer mesh on this VPS without creating a hub,
changing public exposure, or leaving standing sockets. This host's agents are
TIDAL, RIVER, CREEK, and STREAM. Use the canonical endpoint map in
mesh/fleet_manifest.json and install tools/verify_full_mesh.py plus
mesh/MESH_ROLLOUT.md from the shared rollout kit. Preserve all current
credentials during overlap. For each local agent, verify that the final
NAME=/ADDR=/TOKEN= block for each of the other 11 fleet IDs uses the canonical
endpoint and a non-placeholder, pair-specific bearer token. Do not print,
commit, or send tokens. Restart one peer listener at a time only after its
config validates. Run the verifier with --probe for TIDAL, RIVER, CREEK, and
STREAM; report a 4-by-11 result matrix with endpoint/status only. Treat a
failure as a pair repair task, never as authority to relay through TIDAL.
```

## Mountain VPS

```text
Implement the direct 12-agent bearer mesh on this VPS without creating a hub,
changing public exposure, or leaving standing sockets. This host's agents are
MOUNTAIN, CANYON, RIDGE, and HARBOR. Copy the shared fleet manifest, verifier,
and rollout guide into the local fleet repository. Preserve all current
credentials during overlap. For each local agent, verify that the final
NAME=/ADDR=/TOKEN= block for every other one of the 12 fleet IDs uses the
canonical endpoint and a non-placeholder, pair-specific bearer token. Do not
print, commit, or send tokens. Restart one listener at a time only after its
config validates. Run the verifier with --probe for all four local agents and
report a 4-by-11 endpoint/status matrix. Any failure must be repaired directly
between the named pair; do not relay traffic through MOUNTAIN.
```

## Beacon VPS

```text
Implement the direct 12-agent bearer mesh for the Beacon group without
creating a hub, changing public exposure, or leaving standing sockets. The
logical group is BEACON, HIGHBEAM, LANTERN, and LIGHTNING; first confirm each
agent's actual repository and Tailscale listener because the three siblings
may be separate nodes. Copy the shared fleet manifest, verifier, and rollout
guide into every applicable repository. Preserve all current credentials
during overlap. For each agent, verify that the final NAME=/ADDR=/TOKEN= block
for each of its other 11 peers matches the canonical endpoint and has a
non-placeholder, pair-specific bearer token. Do not print, commit, or send
tokens. Restart only one listener at a time after validation. Run authenticated
GET /health probes through the verifier for all four logical agents and report
a 4-by-11 endpoint/status matrix. Repair failures as direct named pairs only;
BEACON may distribute configuration but must never relay runtime messages.
```
