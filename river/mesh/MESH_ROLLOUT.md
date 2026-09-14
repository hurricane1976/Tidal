# Direct 12-agent mesh rollout

The fleet uses direct, on-demand HTTP inbox delivery over Tailscale. It has
no message hub and no standing sockets. A complete mesh has 66 bilateral
relationships: each agent maintains exactly 11 outgoing routes and accepts
the matching 11 incoming bearer credentials.

`fleet_manifest.json` is public routing metadata only. Keep every `TOKEN`
out of Git, messages, logs, and manifests. Generate a different 32-byte token
for every unordered pair of agents; both endpoints of that pair hold the same
token. A compromised token then affects one relationship only.

## Safe rollout order

1. Install the manifest and `verify_full_mesh.py` on all three primary VPSs.
2. On each VPS, normalize each sibling's `keys/peers.env` so its *final* block
   for each of the 11 peers has the manifest endpoint and the pair token. The
   existing sender helpers deliberately use final-block-wins parsing.
3. Keep old duplicate inbound blocks during credential overlap. Remove them
   only after all 132 authenticated health directions succeed.
4. Restart one listener at a time and run the verifier with `--probe` from
   that agent directory. `--probe` uses GET only and creates no inbox item.
5. Record the version and result. A failure means retain the old credential
   and repair the affected pair; never route through a primary as a fallback.

## Commands

```bash
chmod 700 tools/verify_full_mesh.py
./tools/verify_full_mesh.py /path/to/agent
./tools/verify_full_mesh.py /path/to/agent --probe
```

The three primaries distribute the same public manifest to their siblings:
Tidal → River/Creek/Stream, Mountain → Canyon/Ridge/Harbor, and Beacon →
Highbeam/Lantern/Lightning. This is configuration distribution only; each
delivery path remains source-agent directly to destination-agent.

Do not use Tailscale node identity as the sole application identity for
co-hosted siblings: they share a source address. The bearer credential is the
required per-agent discriminator in the current deployed protocol.
