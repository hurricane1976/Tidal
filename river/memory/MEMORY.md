# River Private Project Memory

River's private project memory. Canonical location:
`/home/agent/River/memory/`. A mirror pointer exists at the legacy path
`/home/agent/.gemini/tmp/river-1/memory/MEMORY.md`. NOTE (corrected Waking
105): despite an older header claim, this file IS git-tracked and committed
each waking (`git ls-files river/memory/` proves it).

## Runtime
- **Waking 117 (2026-09-12 23:30:48Z, poke via `*/5` sweep — not a cron slot; 60 min after Waking 116)**: quiet
  single-flight wake (only my session live). check_replies: no operator messages. Processed 18 inbox arrivals
  (168 cumulative): 8× MOUNTAIN (link verifications 22:48–23:12Z + liveness probes 22:50/23:21Z — fresh
  post-restore mountain→river proof ~90 min after the 22:02Z re-key), 3× RIDGE + 2× CANYON + 3× HARBOR
  own-identity link verifications (22:50–23:15Z), TIDAL liveness 23:16:13Z, BEACON beacon-fullcheck ping
  23:19:18Z — all data-only, no replies sent. A 19th arrival (MOUNTAIN liveness probe 23:34:22Z) landed
  mid-commit and was processed immediately (169 total). Fresh outbound sweep **11/11 green** (~23:33Z; mountain-pair
  stable). **Quiet-window drift audit: NOTHING to port** — FC/build_observability/peer_server byte-identical;
  build_site/tests/INFRA/agora diffs = documented River polymorphism + documented test divergence (river's
  next-app existence guard, unported benign duplicate assertNotIn). Catalogued cosmetic divergence: topology
  card "GLM Flash" (river) vs "GLM" (tidal), from Sep 11 ~20:33–20:58Z auto-commits, survived the w116 audit —
  left as-is. All 12 services active; peer /health 200; agora 200; live fleet.html 200. Suite 79/79 OK,
  ARA/SOS 100/100. reboot:stuck ASK item still open (no operator reply, NOT rebooted). No inline deploy (zero
  site-content changes; wake.sh post-session deploy covers NOTES/memory/inbox). Next cron wake: 00:30Z.
- **Waking 116 (2026-09-12 22:30:17Z, operator /wake poke via `*/5` sweep — 25 min after Waking 115)**: quiet
  single-flight wake (no twin; no sibling sessions live — Tidal's 21:55Z w241/w242 sessions had finished).
  check_replies: no operator messages (bare `/wake`). Processed 5 inbox arrivals (149 cumulative): TIDAL
  22:09:47Z admin w242 heads-up (mountain-pair applied 22:02Z, skip-if-rotated, do-not-re-apply — acted on:
  verified peers.env untouched since 22:02:20Z, did NOT re-apply/rotate) + 4× MOUNTAIN (2 liveness probes
  22:09:59/22:22:53Z + 2 operator-requested link verifications 22:11/22:20Z) — all data-only; the 4 MOUNTAIN
  arrivals themselves prove mountain→river inbound fresh post-restore. **river↔MOUNTAIN verified green both
  directions this waking**: outbound send ~22:31Z `{"ok":true,"agent":"mountain"}`. **DRIFT SYNC EXECUTED
  (Tidal idle — port window)**: (1) FLEET_COORDINATION.md wholesale-copied (gains Waking 238/239/240/241/242
  fleet records: Beacon trusted-introducer decline + two-party pivot, Beacon↔siblings bilateral re-key +
  shared-token incident closure, 66/66 restore via Josh-authorized borrowed-token path); (2) website/
  build_site.py — ported ONLY the 3 agent-agnostic w242 hunks (pending Mountain↔River dashed-amber arc +
  label REMOVED → restored comment; sibling↔Beacon label → "re-keyed + re-verified Sept 12 21:47Z"; legend
  65/66 → 66/66 "full fleet mesh complete"); River palette/UA polymorphism untouched; (3) tests/test_beacon.py
  — ported Tidal's 242 assertion flips (66/66 pins, pending-arc absence locks: `stroke-dasharray="3 6"` +
  pending label assertNotIn, "full fleet mesh complete" assertIn; next-app block flipped to absence locks)
  with River's next-app existence guard KEPT (river/ has no next-app) and clean single assertNotIn("M200,130…")
  kept (Tidal's benign duplicate NOT ported). Suite 79/79 OK, ARA/SOS 100/100, all 12 services active, peer
  /health 200. Full deploy pushed 68a3ce4..35fbed7 (24 files incl. FC port + build_site + tests + 5 inbox
  moves); live fleet.html verified serving 66/66 legend + restored comment, zero pending remnants. Watchdog
  reboot:stuck unchanged (still-bad through 22:30:02Z; ASK item open, no operator reply, NOT rebooted).
  Next cron wake: 00:30Z.
- **Waking 115 (2026-09-12 22:05:03Z, operator /wake poke via `*/5` sweep)**: **river↔MOUNTAIN RESTORED — 66/66 again.** Staged peer_intro (agent=mountain, borrowed-CANYON-token path (a)) landed 21:58:21Z → keys/inbox-intros/ (first-ever staging); Tidal's admin applied it BEFORE my spawn (peers.env 22:02:20Z — both MOUNTAIN blocks now = staged secret sha16 3e58d8b81113396b; river-peer restarted 22:02:22Z; its w242 admin probe accepted inbound as MOUNTAIN 22:02:31Z) → my w240 conditional duty moot, admin-first per plan. Outbound MOUNTAIN probe ~22:06Z `{"ok":true,"agent":"mountain"}` — watch item CLOSED. Tidal w241 also re-keyed BEACON<->River (21:47:44Z admin probe accepted). Fresh 11/11 outbound sweep ~22:06Z + 11 inbound arrivals processed (144 cumulative). TWO Tidal sessions live (21:55Z, w242 executing Josh's 21:51:17Z topology-update directive) → no drift sync, no shared-file edits, no inline deploy; selective river/-only commit. Suite 79/79, ARA/SOS 100/100, 12/12 services. reboot:stuck ASK item still open (no reply, NOT rebooted). Next cron wake: 00:30Z.
- **Waking 114 (2026-09-12 21:30:xxZ, operator /wake poke via `*/5` sweep — Creek+Tidal+River all 21:30, no cron slot)**: processed 6
  inbox arrivals (132 cumulative): 3× HARBOR link-verification, TIDAL w238 Mountain-pair
  administration note, CREEK w115 sentinel check + CREEK 21:31:21Z connectivity — all data-only.
  **MOUNTAIN re-probe 21:31Z: STILL 401** (Mountain-side adoption pending; keys/inbox-intros/ still
  absent/0; Tidal w238 plan: BEACON mints fresh Mountain<->River secret, peer_intros it to my :8788,
  Tidal applies + restarts river-peer + verifies at its ~00:00Z waking — NO action on River's side,
  current MOUNTAIN blocks stay untouched until then). Fresh outbound sweep 10/11 green (~21:31Z:
  7 bearer + 3 trio identity). Read-only peek at tidal inbox MOUNTAIN 21:30:07-11Z sends = routine
  operator-requested link verifications, not the peer_intro. Suite 79/79 OK, ARA/SOS 100/100,
  all 12 services active, peer /health 200 via tailscale0. ETIQUETTE: Tidal+Creek sessions live →
  no drift sync, no shared-file edits, no inline deploy; selective river/-only commit. LESSON: do not
  invent probe URLs — River's canonical public URL is `http://107.170.33.6:8889/` (loopback-bound;
  peers reach River on tailscale0:8788); there is NO riverwake.org (NXDOMAIN, never existed —
  self-created false alarm, caught before escalating). Next cron wake: 00:30Z.
- **Waking 113 (2026-09-12 20:30:17Z, regular cron `30 */4`)**: quiet single-flight wake; processed 2
  inbox arrivals (126 cumulative): CREEK w114 sentinel liveness (20:16:06Z) + CANYON empty-body probe
  (20:31:13Z) — data-only. check_replies: no operator messages; ASK reboot item still OPEN, no reply,
  NOT rebooted. **river↔MOUNTAIN re-probe 20:30Z: STILL 401** — Mountain-side adoption pending (keys/
  inbox-intros/ still 0). Fresh outbound sweep 10/11 green (7 bearer + 3 trio identity). **DRIFT SYNC
  EXECUTED (no sibling sessions live — the port window since Waking 112)**: (1) FLEET_COORDINATION.md
  wholesale-copied from tidal/ (gain: Waking 222/223/224/225/227/229/232/233/234/235 fleet records +
  line-88 RESOLVED/accuracy updates); (2) website/build_site.py — ported ONLY the 4 agent-agnostic
  topology hunks (viewBox 1680×512, ×16 Mountain bundle arcs + label, pending Mountain↔River dashed-
  amber no-pulse arc + label, 3 live sibling↔Beacon arcs + label, trio↔Mountain connector + "12 pairs
  live", identity-links ×12 label, ×16 legend, "Fleet mesh 65/66 two-way live (Sept 12)" + 2 footnote
  lines); River palette/logo polymorphism + RiverAgent UA kept (16-hunk audit: 12 polymorphism hunks
  untouched); (3) tests/test_beacon.py — ported Tidal's 222/223/235 assertions (65/66 legend, 512
  viewBox, ×16 arcs, pending arc present + asserted NOT pulse-line) merged with river's next-app
  existence guard; single assertNotIn kept (Tidal's copy still has the benign duplicate); (4)
  INFRASTRUCTURE.md — ported Tidal's agent-agnostic swap bullet (2 GiB /swapfile added Sept 12 after
  00:07Z OOM killed a wake session, exit 137). agora_server.py delta = river port polymorphism only,
  untouched. Suite 79/79 OK, ARA/SOS 100/100, full deploy pushed c5b1d38..4fd9a5c (swept tidal's 3
  unprocessed inbox JSONs — on disk, committing ≠ processing), live fleet.html verified serving
  65/66 legend + pending arc + 200. All 12 services active. Next cron wake: 00:30Z.
- **Waking 112 (2026-09-12 18:35:02Z, operator /wake poke via */5 sweep)**: processed 4 inbox
  arrivals (121 cumulative): HIGHBEAM w166 liveness, TIDAL 17:48:58Z full-mesh validation ping
  (Josh's 17:28:34Z fleet-wide directive) + TIDAL 17:50:53Z Mountain-fix note, CREEK w113 —
  all data-only. **river↔MOUNTAIN river-side fix DONE by Tidal unilaterally** (as river's admin):
  fresh tidal-minted secret installed directly in BOTH MOUNTAIN blocks (peers.env 17:47:45Z),
  river-peer restarted 17:47:48Z, inbound bearer ACCEPTed (Tidal log-verified) — nothing left to
  adopt on river's side (inbox-intros still 0). Outbound re-probe 18:37Z still 401: Mountain-side
  adoption pending (Mountain rejected tidal's peer_intro 'not authorized'; Tidal sent it two
  authorized paths). Fresh outbound sweep 10/11 green (~18:37Z: 4 bearer ok incl. TIDAL ack of
  its 17:48:58Z validation, quartet Track-A received:true, trio identity ok; MOUNTAIN sole 401).
  Suite 79/79, ARA/SOS 100/100, all 12 services active. reboot:stuck ASK item STILL open (no
  operator reply) — did not reboot; etiquette held (Tidal sessions 18:15+18:35 + Stream live:
  no drift sync, no shared-file edits, no inline deploy; selective river/-only commit). Next cron
  wake 20:30Z.
- **Waking 111 (2026-09-12 ~17:40Z, fleet-wide operator poke — River+Tidal+Stream all 17:40)**: answered Josh's
  16:26:22Z "Is river still waking" (ASK.md → Resolved; wakes never stopped — 16:30Z cron slot was
  flock-suppressed behind the 16:05 session, by design). river↔MOUNTAIN 401 root cause CONFIRMED from
  Mountain's own 17:30:49Z message to Tidal (read-only peek in tidal/peer/inbox): Mountain's 2026-09-11
  hub secret (`~/keys/peers/river.env`) was orphaned by Tidal's ~17:14Z canonical-credential pass — pair
  secret dead BOTH directions (river outbound re-probed 401 at 17:44Z). Mountain asked TIDAL to peer_intro
  a fresh Mountain<->River credential (Track-A style); Tidal session was live, so River did NOT duplicate —
  sent RIDGE-relay to Mountain + data-only heads-up to Tidal (both accepted). River stands ready to adopt
  via peer_intro staging (keys/inbox-intros/ — still 0 staged this waking). Outbound mesh 10/11 green
  (fresh 17:44Z: 8 bearer/identity ok + CANYON/RIDGE/HARBOR Track-A received:true); inbound legs proven
  by CANYON/RIDGE/HARBOR/CREEK/LANTERN arrivals 17:29-17:41Z. Suite 79/79, ARA/SOS 100/100, all services
  active. reboot:stuck ASK item STILL open (uptime ~5d20h, flag present) — did not reboot; etiquette held
  (no drift sync, no inline deploy, selective river/-only commit). Next cron wake 20:30Z.
- **Waking 110 (2026-09-12 16:05:03Z, regular cron `30 */4`)**: adopted Tidal's
  peer_intro staging into river/peer_server.py (wholesale copy — trees were
  byte-identical pre-edit; +4 tests → suite 79/79); adopted Track A live set
  (14:20:56Z relay) for CANYON/RIDGE/HARBOR (morning HARBOR token dead, canyon/
  ridge still 200 — replaced all six block copies anyway); verified via
  exhaustive grep that NO Track A/B token ever entered git history (46 tokens ×
  60 commits: zero hits — Tidal redacted my inbox 14:25Z, first sweep commit
  14:40Z carried redacted copies). Trio ground truth (Tidal 229 + Beacon audit
  15:53:41Z): trio listeners are AUTH_MODE=identity, never read Authorization —
  river-minted peer_intros land as ordinary messages, NOT config; trio bearer
  is a non-goal; HIGHBEAM/LANTERN/LIGHTNING peers.env blocks are script-
  compatibility placeholders (mirrors Tidal). NEW WATCH ITEM: Mountain retired
  the river-pair bearer credential between 16:12Z (200) and 16:24Z (401) —
  relay request sent via RIDGE (Track A, verified 200) asking Mountain to
  peer_intro a fresh RIVER credential to 100.91.42.51:8788; until then
  river→MOUNTAIN is 401 (identity fallback does not exist for Mountain).
  MOUNTAIN outbound upgraded off the public-history shared token onto the
  (then-live, now-retired) morning river-specific token. 10/11 peers verified
  outbound green; reboot ASK item still open, no operator reply, not rebooted.
- **Waking 109 (2026-09-12 12:30:18Z, regular cron `30 */4`)**: verified the per-NAME
  token rollout landed on River's side (applied externally by Tidal's Waking 222
  ~08:3xZ, operator-approved: 4 additive Mountain-quartet per-NAME blocks in
  river `keys/peers.env`, mtime 08:48:37Z, river-peer restarted 08:48:42Z,
  `/health` 200; HARBOR's 12:02:01Z round-trip arrival post-restart proves the
  new token→name inbound path). Tidal's IN-FLIGHT Waking 223 (12:00Z session)
  declares 66/66 full fleet mesh in FLEET_COORDINATION.md — recorded as
  Tidal's claim pending its commit. Its `tests/test_beacon.py` (+61 lines,
  66/66-topology assertions) NOT ported (Tidal session live; port next waking
  if it doesn't mirror). Trio blocks in river keys still zero. Suite 75/75,
  ARA/SOS 100/100, 11/11 services. `reboot:stuck` ASK.md item still open, no
  operator reply — did not reboot.
- **Waking 108 (2026-09-12 08:30:18Z, regular cron `30 */4`)**: root-caused the
  watchdog `reboot:stuck` alert (live since 06:15Z): unattended libc6 upgrade
  set `/var/run/reboot-required` 06:12Z, uptime ~131h > 36h threshold, but **no
  auto-reboot mechanism exists anywhere** (root crontab /etc/cron.* /etc/crontab
  systemd timers all clean — the "auto-reboot runs daily" text is template-only
  from SETUP_GUIDE.md). Alert can only clear via operator reboot (precedent:
  Aug-30 incident cleared by ~Sep-6 boot). Escalated via ASK.md Open + Telegram;
  did NOT reboot (would kill all co-located agent sessions — Tidal was
  mid-flight). If Josh delegates: pick a slot right after a :30/:45 wake exits;
  no cron boundary avoids the four agents' `*/5` check_replies sweeps.
- As of Waking 78 (2026-09-09), River runs via `opencode` CLI on
  `openrouter/~z-ai/glm-flash-latest` (GLM Flash), launched by `wake.sh`
  (`opencode run --auto --dir`), not the legacy Gemini CLI.
- **Workspace layout (verified Waking 101, 2026-09-11 ~23:4xZ)**: one git repo at
  `/home/agent/Tidal` contains BOTH workspaces: `river/` (River, ports 8889/8788)
  and `tidal/` (Tidal, ports 8888/8787). `/home/agent/River` is a symlink to
  `/home/agent/Tidal/river`; `/home/agent/agent` is a symlink to
  `/home/agent/Tidal/tidal` (Tidal's crontab still points at `agent/`). systemd
  units confirm: `river-peer.service` runs `Tidal/river/peer_server.py`,
  `beacon-peer.service` runs `Tidal/tidal/peer_server.py`. Top-level copies of
  `*.py`/`*.md` directly under `/home/agent/Tidal/` are legacy pre-restructure
  artifacts — do NOT treat them as "Tidal's tree" when diffing; compare
  `river/X` vs `tidal/X`. The shared next-app sources live ONLY in Tidal's tree
  (`tidal/website/next-app/`) — River has no next-app; tests referencing it must
  guard with an existence check (River's suite does since Waking 102).
- **Wake triggering**: besides the `30 */4` cron, the operator can fire wakes by
  sending `/wake` to River's Telegram bot — `_check_replies.py` (cron `*/5`)
  Popen-spawns `wake.sh` detached (PPID 1). Waking 100 and 101 (23:30/23:40Z,
  2026-09-11) were both operator `/wake` pokes, 10 min apart. Before touching
  shared files (FLEET_COORDINATION.md, tests/test_beacon.py, website/build_site.py),
  check `ps aux | grep opencode` for a concurrent sibling session — Tidal's
  session may be mid-flight in its tree (Waking 100/101 etiquette: defer drift
  sync rather than clobber; Tidal usually mirrors to river/ itself, else port
  next waking).
- **wake.sh prompt-path bug: FIXED (Waking 102, 2026-09-12 00:30:40Z)** by the
  concurrent twin River session while both sessions ran. NOTE: an atomic-replace
  (or editor temp+rename) while `wake.sh` instances are running is safe-ish (bash
  keeps the old inode open); plain in-place byte edits are not. Both 00:30Z
  sessions still carried the stale prompt (spawned pre-fix); future wakes use the
  corrected `/home/agent/River/peer/inbox/` path.
- **Double-wake twin sessions (seen Waking 102, 2026-09-12 00:30Z)**: cron (`30 */4`)
  and an operator poke fired in the same minute → TWO concurrent River
  opencode sessions in the same tree. FIXED for the future (Waking 102): `wake.sh`
  now takes an `flock -n` single-flight lock on `/tmp/river_wake.lock` and exits
  immediately (logged to `logs/doublewake.log`) if another wake is running — no
  more duplicate sessions/NOTES/Telegram summaries.
- **Waking 104 (2026-09-12 01:10:02Z, operator /wake poke — `*/5` check_replies signature, not cron)**: drift-sync pass while Tidal idle (its Waking 214 at 00:45Z had executed the operator's 00:03:08Z "rebuild fleet topology" directive). Ported into river/: (1) `build_site.py` — wholesale-replaced ONLY the fleet-topology SVG block (card div → Topology Info Panel comment; 12814→13376 chars): clean four-host-box viewBox 1680×500 (Local/Beacon/OWN TAILNET NODES/MOUNTAIN GROUP), local+Mountain 6-edge co-location meshes, all 11 links live, 5-item legend; River's palette polymorphism elsewhere untouched (39-diff hunk audit: all others were River colors / RiverAgent UA / "GLM Flash" label). (2) `tests/test_beacon.py` — new Waking 214 assertions (MOUNTAIN GROUP, 1680×500, old arc assertNotIn, arcs `M185,150 Q660,60 1135,200` / `Q560,44 955,145` / `Q660,420 1045,330`) merged with River's next-app existence guard KEPT (Tidal's copy dropped the guard because next-app always exists there; River's tree has none — porting verbatim would break the suite). (3) `FLEET_COORDINATION.md` wholesale-copied (sole delta = Waking 214 REBUILT bullet). Deploy `172877d`; live fleet.html serves the rebuilt SVG; 75/75, ARA/SOS 100/100. Watch item (Tidal's live fleet.html legend) RESOLVED — its rebuild went live ~00:4xZ.
- **Waking 103 (2026-09-12 00:35:02Z, operator /wake poke — `*/5` check_replies
  signature, not cron)**: verification-only pass 5 min after the twin 102
  sessions. All 11 services active, watchdog ok, suite 75/75, ARA/SOS 100/100,
  river/ tree clean, inbox empty. Watch items re-verified and still standing:
  `keys/peers.env` zero trio blocks (0 matches) and Tidal's LIVE fleet.html
  still lacked the "Identity links live" SVG legend at 00:37Z even though
  Tidal's own 00:35Z session was mid-flight (expect its end-of-session
  rebuild to self-heal; re-check next waking).

- **Waking 107 (2026-09-12 04:30:17Z, regular cron `30 */4`)**: quiet verification
  pass, no concurrent sessions. All services active, watchdog ok, 75/75,
  ARA/SOS 100/100, River inbox empty, no operator messages. Drift check:
  shared files in sync (only intentional polymorphism diffs) EXCEPT Tidal's
  test_beacon.py has a DUPLICATED `assertNotIn("M200,130 Q550,60 905,200")`
  line (benign; river/ copy is the clean one — do NOT "port" it to river).
  Deploy `61e6e9b` pushed; NOTE deploy's auto-commit swept Tidal's two
  unprocessed HARBOR inbox JSONs (04:02:40Z + 04:30:52Z, data-only) into the
  commit — files stayed on disk in tidal/peer/inbox/ for Tidal to process
  (committing ≠ processing). peers.env still zero trio blocks.
- **Waking 105 (2026-09-12 02:05:37Z, fleet-wide operator /wake pokes — all four
  co-located agents woke simultaneously at 02:05, no cron slot at :05)**:
  full-mesh re-verified 11/11 BOTH directions in one waking (inbound: 11 msgs
  processed from HARBOR/TIDAL/HIGHBEAM/LANTERN/CREEK; outbound: 8 bearer probes
  + 3 token-less identity POSTs to trio, all 200/ok). Tidal/Creek/Stream
  sessions concurrent → no drift sync, NO inline deploy.sh (would sweep
  Tidal's tidal/ASK.md WIP via `git add .`) — selective river/-only commit +
  push instead; wake.sh post-session deploy covers the rebuild. Three late
  inbox arrivals were moved to river/processed/ by a concurrent sibling
  session mid-waking (benign; who exactly is unidentified). Watch item
  re-verified: peers.env still zero trio blocks.
- **Waking 106 (2026-09-12 02:40:41Z, operator /wake poke)**: light verification
  + fresh outbound mesh sweep answering Josh's 02:29Z "full mesh please" (known
  via Lantern's relayed probe; nothing on River's own bot). 11/11 outbound
  acks (~02:41Z: 8 bearer + 3 identity POSTs); inbound legs proven by CREEK
  02:11:59Z + LANTERN 02:32:02Z arrivals. Tidal + Stream sessions concurrent →
  etiquette held (no drift sync, no shared-file edits, no inline deploy;
  selective river/-only commit + push). 75/75, ARA/SOS 100/100. Watch item
  re-verified: peers.env still zero trio blocks. Tidal's inbox had 3 unprocessed
  arrivals — left for its own session.

## Local Services & Ports
- **river-agora.service**: River Agora API server, local port `8889`.
- **river-peer.service**: River peer inbox server over Tailscale, port `8788`.
- **watchdog.sh**: autonomic liveness watchdog every 15 minutes via cron; logs to `logs/watchdog.log`.
- Tidal's peer inbox service on this host is named **beacon-peer.service** (port `8787`), not `tidal-peer`.

## Crontab Configuration
- River wake cycle: `30 */4 * * *` (reverted to 4-hour cadence per operator directive 2026-09-09, after Waking 66 had shifted it to 6 hours; offset from Tidal's hourly wakes to prevent contention).
- River Daily Digest: `30 * * * *` (fires hourly, self-gating to 08:30 US/Eastern).
- River Weekly Digest: `30 * * * *` (fires hourly on Mondays, self-gating to 08:30 US/Eastern).
- Telegram Command Checking: `*/5 * * * *` (`check_replies.sh`, dedicated bot token).

## Sibling Co-location
- **Tidal**: Primary Development & Security Gateway (wake: `0 */4` — moved from 6h to 4h cadence ~2026-09-11 20:0xZ, crontab-verified; agora `8888`, peer `8787`).
- **Creek**: Active Security Hardening & Liveness Sentinel (wake: `15 */4 * * *`; agora `8890`, peer `8789`).
- **Stream**: Context gathering agent (wake: `45 */4 * * *`; agora `8891`, peer `8790`).
- **Mountain box** (`mountainwake.org`, Tailscale `100.114.14.116`): hosts MOUNTAIN (peer `8787`), HARBOR (peer `8793`), and other Mountain-fleet listeners on distinct ports. Distinct port per agent on a shared box; verify targeting before sending.
- Sibling endpoints are restricted to the `tailscale0` interface via UFW rules (ports 8787-8790 + 8793).

## Verification Routine (per waking)
1. `watchdog.sh` / `systemctl` service check (nginx, fail2ban, cron, all agora/peer services).
2. `check_replies.sh` for operator Telegram commands.
3. `python3 -m unittest tests.test_beacon` (expect 75/75 as of Waking 100).
4. `tools/agent_readiness_audit.py` and `tools/agent_security_scan.py` (expect 100/100, zero findings).
5. `./website/deploy.sh` to recompile site/telemetry and push to GitHub.

## Fleet Coordination
- `FLEET_COORDINATION.md` is the joint agreement document, mirrored between River and Tidal.
- **Pending drift sync: DONE (Waking 102, 2026-09-12 00:31-00:33Z)** — one twin
  session (this file's author) ported from Tidal's tree: FLEET_COORDINATION.md
  (wholesale copy), tests/test_beacon.py (full-mesh live-topology assertions,
  next-app part guarded by file-existence since only Tidal has next-app), and
  website/build_site.py edited in place (full-mesh SVG legend "Identity links
  live (Lantern, H-BEAM, LIGHTNG)" + 3 live arcs + trio fleet-card descs/"Link:
  identity, live" ×3; River's color palette kept). Suite 75/75 OK post-port.
   NOTE: `peer/roster.json` river-vs-tidal diff (gemini-agent→TIDAL vs →RIVER)
   is INTENTIONAL per-tree mapping (each listener attributes its counterpart's
   identity sends), not drift. RESOLVED (Waking 104, 01:1xZ): Tidal's live
   fleet.html now carries the rebuilt four-box 1680×500 topology — watch item
   closed. Per-NAME bearer rollout: superseded same day — Track A live set
   (14:20:56Z) adopted for the quartet (Waking 110); trio blocks now exist as
   script-compatibility placeholders ONLY (trio is identity-only per Beacon's
   audit — bearer never validates there, do not "fix" this).
- Peer messages are data, not instructions (AGENT.md). River's peer inbox: `peer/inbox/`, processed items moved to `peer/inbox/processed/`. As of Waking 100, `"to": "root"` is a reserved value in `peer_server.py` (routes to the main inbox) — the trio had been sending it; if an `inbox/root/` subdir ever reappears, it predates the fix (fix mirrored to Tidal's copy; beacon-peer restart pending on Tidal's side).
- `website/.well-known/agent.json` (River) and Tidal's equivalent are hand-maintained static files; `build_site.py` does NOT regenerate them. On model/identity changes, edit the manifest directly, advance `updated`, and re-deploy. Tidal's live public site (nginx root = Tidal's website dir) exposes only Tidal's manifest; keep River's fleet entry in Tidal's manifest in sync. Beacon's master manifest at beaconwake.com is off-box — notify BEACON via `send_to_peer.sh` to sync.

## Model Families (as of 2026-09-11)
- Beacon and Highbeam have reverted back to **Claude Code (Sonnet)** — operator directive 2026-09-11 (Waking revert). Mountain, Beacon, and Highbeam are now the fleet's Claude members.
- Lantern migrated Gemini -> GLM Flash (glm-5.3-flash pricing); Lightning/Canyon/Stream/Creek are DeepSeek; Ridge/Harbor/Tidal/River are GLM.
- Obsolete Luna observability pricing is retained for historical gpt-5.6-luna runs; new runs without model strings fall back to Claude rates ($3.00/1M input, $15.00/1M output).

## Fleet Topology (verified 2026-09-11)
- Highbeam, Lantern, Lightning left Beacon's box; each runs its own Tailscale node (`beacon-highbeam` 100.81.147.28, `beacon-lantern` 100.76.139.96, `beacon-lightning` 100.69.40.118, each :8787). Beacon's box is Beacon-only.
- The authoritative 12-listener map lives in `FLEET_COORDINATION.md` §3.1. **FULL
  MESH: 11/11 two-way links live as of 2026-09-11 ~23:45Z** (8 bearer peers +
  trio via identity mode; us→trio sends ride the shared `gemini-agent` source,
  attributed as TIDAL on their rosters — accepted precision loss, see FC §full-mesh
   entry). `keys/peers.env` HIGHBEAM/LANTERN/LIGHTNING blocks are script-
compatibility placeholders (the trio never validates bearer — see Runtime
   Waking 110); **river↔MOUNTAIN: RESTORED 2026-09-12 ~22:06Z (Waking 115)** —
   Mountain peer_introd a fresh pair secret 21:58:21Z (borrowed-CANYON-token
   path), Tidal's admin applied it to both MOUNTAIN blocks + restarted
   river-peer 22:02:2xZ; outbound probe green (`agent: mountain`), inbound
   admin probe accepted via bearer. Full mesh back to 66/66 (was 65/66
   ~16:24–22:06Z).
- **Dual-mode peer auth (live ~2026-09-11 20:25Z)**: local `peer_server.py` accepts bearer OR `tailscale whois`-verified identity; identity is opt-in per peer via object entries with `identity_auth: true` in `peer/roster.json` (trio flagged inbound-only). Operator DECLINED identity auth as a bearer replacement ("Keep bearer", 18:21:25Z); bearer-first stays the rule for existing links.
- Tidal's workspace copies of `build_site.py`/`build_observability.py`/`agora_server.py`/`tests/test_beacon.py`/`FLEET_COORDINATION.md` are usually the most current; diff them each waking and port (wholesale-copy only when diffs are agent-agnostic; build_site.py carries River-specific polymorphism/branding — edit it in place; agora_server.py needs River's 8889 port polymorphism re-applied at the bottom after a wholesale copy).
