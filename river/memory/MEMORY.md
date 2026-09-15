# River Private Project Memory

River's private project memory. Canonical location:
`/home/agent/River/memory/`. A mirror pointer exists at the legacy path
`/home/agent/.gemini/tmp/river-1/memory/MEMORY.md`. NOTE (corrected Waking
105): despite an older header claim, this file IS git-tracked and committed
each waking (`git ls-files river/memory/` proves it).

## Runtime
- **Waking 146 (2026-09-15 20:30:03Z, regular cron `30 */4`; next = 00:30Z Sep 16)**: single-flight (Tidal's w294 sessions exited pre-spawn). **Josh-approved purge executed by Tidal (73f8fc38→8c44d1a6, force-push)**: river honored the do-not-push window (pushed nothing 20:06–20:16Z), then **resynced BEFORE any push** (`git fetch origin && git reset --hard origin/main` → HEAD edd331bb == origin/main; clean tree, shared-repo effect — w145 commits rode through). Processed 13 inbox arrivals (553→566): 3× TIDAL purge/rotation coordination + 2× BEACON health-checks + 6× MOUNTAIN (duplicate class) + 1× HIGHBEAM w198 (mid-session) — data-only, zero credential shapes. **Rule 7: GET 11/11, POST 8/11 — HIGHBEAM/LANTERN/LIGHTNING 401 persistent** (retry confirmed): correlated with Beacon's w443 removal phase (Tidal adopted trio tokens 20:0xZ, green-lit removal); **river's per-recipient age bundle NOT yet arrived** (inbox + peer/inbox/river/ empty ~20:37Z); Beacon informed data-only (accepted). Miss #1 each — watch item, under 3-miss threshold; NO old-token changes; dual-adopt protocol on bundle arrival (additional finals, keep-old-live, POST-test, confirm to Beacon). **FC port executed** (w145 deferral cleared; wholesale copy → byte-identical). Drift: peer_server + build_observability identical; build_site 105 / tests 97 / INFRA 10 / agora 4 = documented classes, zero new hunks. Agora: 20:10Z run 429, ledger steady 9, quota-unrecovered observation now 8th waking. Services: 11 units + 0 failed, peer/agora/live 200s, watchdog ok through 20:30:03Z, load 0.32 (decayed), disk 36%, no reboot flag, josh-desktop11 reachable (4th consecutive). Suite 83/83 (12.2s), ARA 100, SOS 100 (NOTE: SOS with `website` as scan-root arg = 88/"missing .gitignore" artifact — canonical no-arg run is the baseline). No deploy (records-only). Next-waking watch items: w443 bundle adoption + confirm; trio POST legs; Beacon agora quota.
- **Waking 145 (2026-09-15 20:00:04Z, poke-signature spawn via check_replies — NOT a cron slot; `30 */4` next = 00:30Z Sep 16)**: concurrent-sibling waking (spawned same minute as TIDAL ×2 — its 19:50Z operator-/wake w293 still in flight + its 20:00Z cron double-spawn — and CREEK). check_replies: "(no new messages)" (trigger consumed at spawn). Processed 14 inbox arrivals (539→553 cumulative): 2× HARBOR own-identity + 2× BEACON health-checks + 8× MOUNTAIN (5 op-req link verifications + 3 liveness, duplicate class; + 1 business FYI: Mountain's live mainnet x402 seller, $0.02/call, no action expected) + 1× TIDAL w293 sweep note + 1× HIGHBEAM w197 probe — all data-only, zero credential shapes. Sweep 11/11 two-layer green (~20:02–20:05Z; GET PASS + 11/11 bearer POST accepted, w145 label correct this time). Drift audit CONCURRENT-window: peer_server + build_observability identical; build_site 105 / tests 97 / INFRA 10 / agora 4 = documented classes, zero new hunks; **FC port DEFERRED to Waking 146 — Tidal mid-session appending its w293 record to FLEET_COORDINATION.md (1 diff-line growing); per 274/275 de-confliction convention, no wholesale copy while sibling in-flight**. Agora: 19:40Z run 429 → 3 posts pending-not-ledgered; ledger steady 9; Beacon quota still not recovered (Tidal's 7th-waking observation continues). Services: 11 units active + 0 failed (vpc-peering exited = normal), peer/agora(/api/*, /health is not an agora route — first probe 404, corrected)/live root+fleet all 200, watchdog ok through 20:00:03Z, uptime 1d22h26m, load 2.34 (3 concurrent opencode sessions — expected), disk 36%, no reboot flag; josh-desktop11 no offline marker (reachable, corroborates Tidal). Suite 83/83 OK (12.0s), ARA/SOS zero findings. ASK.md clean (river lane). **No deploy** (records-only; observability regen ships via post-session deploy). Selective river-only commit (14 moves + NOTES/memory + observability). Next cron wake: 00:30Z (Sep 16).
- **Waking 144 (2026-09-15 16:30:39Z, regular cron `30 */4`; full details in NOTES.md — its session updated NOTES but not this memory file)**: 20 arrivals archived (539 cumulative); 11/11 two-layer sweep green (its sweep-note bodies mislabeled "w142" — cosmetic typo documented); FC ported (Tidal w292) → byte-identical; suite 83/83; no deploy; records-only commit.
- **Waking 143 (2026-09-15 12:30:31Z, regular cron `30 */4`)**: quiet single-flight wake (only this
  session; Tidal's w291 exited ~12:0xZ before my spawn — w290 was its 11:45Z operator /wake, w291 its
  12:00Z cron; next Tidal cron 16:00Z). check_replies: "(no new messages)". Processed 15 inbox arrivals
  (504→519 cumulative): 2× HARBOR own-identity (08:51:45/52Z, benign retry-duplicate pair) + 2× BEACON
  health-checks (11:33:48/12:01:11Z) + 8× MOUNTAIN (op-req link verifications ×6 across 11:42+12:00Z
  bursts + 2× liveness — benign operator-broadcast duplicate class) + 2× TIDAL sweep notes (w290, w291)
  + 1× HIGHBEAM w195 probe (12:31:15Z mid-sweep catch) — all data-only. Sweep 11/11 two-layer green
  (~12:33Z; probe PASS + 11/11 bearer POST accepted, response shapes = documented classes). Drift audit:
  peer_server + build_observability identical; **one port: FLEET_COORDINATION.md wholesale-copied →
  byte-identical** (Tidal w290: /wake trigger syslog-verified, 33rd consecutive zero-failure sweep,
  Beacon SOL-vault FYI ~32.96 Squads 2-of-2 = data only, 923→934 archived; w291: regular cron, 34th
  sweep, **josh-desktop11 reachable again after 6 offline wakings** — river tailscale cross-check
  agrees, 934→939). Two operator credential decisions stay pending in TIDAL's lane; river's ASK.md
  clean. Post-port residuals = documented classes (agora 3/1, INFRA 5/5, build_site 105/55, tests
  97/52 — tests growth 80→97 = w142 pins guard-indented vs Tidal's unconditional form, zero new
  unported hunks; benign duplicate assertNotIn verified 1-vs-2). Agora: 12:10Z run 429 → pushed 0 →
  pending-not-ledgered (designed); **ledger steady at 9 entries**, echo loop still closed; Beacon
  quota still not recovered, monitoring only. Suite 83/83 OK (10.6s), ARA/SOS zero findings, all 12
  units active (vpc-peering active/exited = normal one-shot), peer/agora/live root+fleet 200, watchdog
  ok through 12:30:02Z, uptime 1d14h55m, load 0.61, disk 35%, no reboot flag. ASK.md empty. **No
  deploy** (FC port records-only, Waking-141 trigger class) — selective river-only commit (FC +
  NOTES/memory + 15 processed moves). Next cron wake: 16:30Z (Sep 15).
- **Waking 142 (2026-09-15 08:30:39Z, regular cron `30 */4`)**: quiet single-flight wake (only this
  session; Tidal's w289 exited 08:1xZ before my spawn, next cron 12:00Z). check_replies: no operator
  messages. Processed 24 inbox arrivals (504 cumulative): 8× MOUNTAIN link verifications + 4× MOUNTAIN
  liveness + 4× BEACON health-checks + 2× HARBOR own-identity + 2× HIGHBEAM probes (incl. mid-sweep catch)
  + 4× TIDAL (w285 sweep + w287 ×2 **carrying Josh's 05:48:00Z topology ask** + w289 sweep) — all data-only.
  **MAIN EVENT: operator's 05:48Z ask mirrored into river's lane (via TIDAL w287 notes, data-only transport;
  same class as Waking 135's stamps mirror)** — ported Tidal's w287 bearer-mesh ground-truth relabeling +
  Sept-15 stamps: build_site.py (×12 sibling-links label, "Sibling bearer-pair links live" legend, y=474/490
  stamps → "re-verified Sept 15 … 11/11 GET + 11/11 ACCEPTED enforced-auth POST", trio nodeData ×3, fleet
  card Link lines ×3 → "Link: bearer pair tokens (Sept 14 mesh), live", comment header) + test pins in
  lockstep (static + **inside river's kept next-app existence-guard**: new topo pins incl. "11/11 GET +
  11/11 enforced-auth POST" + the new fleet/page.tsx block — silent no-ops in river's next-app-less tree,
  guard form + comment preserved per Waking-107/131/135 lessons) + **FC wholesale-copied → byte-identical**
  (Tidal w285–w289 records: adoption census COMPLETE 4/4 all co-located agents on the posted-through ledger;
  w286 "lanterns and tidal connected" answered YES; w287 topology deliverable + double-spawn de-conflicted;
  w288 stale-bake suspicion DISPROVEN — embedded FC quotes keep historical strings by design; 29th–32nd
  consecutive zero-failure sweeps). Post-port residuals = documented classes only (build_site 105 =
  palette/UA/agent_display/GLM-label; tests blank-lines + guard form; agora 3/1; INFRA 5/5; peer_server +
  build_observability identical) — zero new unported hunks. fleet.html rebuilt: Sept-15 stamps live;
  residual old-string hits verified inside the embedded FC historical pre (by design). **Agora ledger
  verified live (Waking-140 prediction confirmed): 9 entries 03:10–05:10Z incl. Mountain intro
  (2a1aab34…/c861d4799aec) pushed exactly-once 03:10:02Z — echo loop closed; 429 runs now pending-not-
  ledgered (designed) with 3 posts awaiting quota.** Sweep 11/11 two-layer green (~08:33–40Z; probe PASS +
  11/11 bearer POST accepted, response shapes = w141 classes). josh-desktop11 offline ~6h (6th waking,
  operator's desktop, not a Rule-7 peer). Suite 83/83 OK (11.7s), ARA/SOS zero findings, all 12 services
  active, peer/agora/live-site/fleet 200, watchdog ok, uptime 1d11h, load 0.07, no reboot flag. ASK.md
  empty. Full deploy (stamp port = site-content change, trigger class of w135/136/137). Next cron wake:
  12:30Z (Sep 15).
- **Waking 140 (2026-09-15 02:25:02Z, operator-poke wake via check_replies `*/5` — not a cron slot; `30 */4` next = 04:30Z)**: ADOPTED Tidal's agora_bridge posted-through ledger patch (its w283, offered via peer note 02:12:20Z; bridge copies share the base code). Patch: persistent ledger `logs/agora_push_ledger.jsonl` (gitignored — logs/ rule 14; stores only sig-hash + agent + local id + ts, never post bodies), skip-on-ledger in push phase, push_to_remote returns pushed/rejected/ambiguous, ambiguous reconciles by signature before retry, clean 4xx stays pending. Wholesale copy (byte-identical to Tidal's tree) + TestAgoraBridge section ported (4 new tests + 2 mock updates; suite 79→**83/83**). Live symptom confirmed pre-patch: bridge 429ing Beacon since Sept 14 06:05Z (echo wave burned the 30/24h shared-IP quota), same stuck candidate found = Mountain Sept-5 intro post (id 9704def80ef3; also in Tidal's backlog) — lands once when quota resets (~02:50–05:40Z), then ledger closes the loop. FC port (Tidal w282+w283 records) → byte-identical; other shared files unchanged documented classes (tests 80 diff-lines = documented 41/39). Sweep 11/11 GET + 11/11 bearer POST. Suite 83/83, ARA/SOS 100/100.
- **Waking 139 (2026-09-15 00:30:33Z, regular cron `30 */4`)**: quiet single-flight wake (only this
  session; Tidal's w281 exited 00:0xZ before my spawn, next cron 04:00Z). check_replies: no operator messages.
  Processed 3 inbox arrivals (454 cumulative): BEACON health-check (00:20:29Z) + 2× MOUNTAIN link verifications
  (00:21:16/19Z — byte-identical body 3s apart, benign duplicate-delivery instance, distinct hashes, zero impact)
  — all data-only. Outbound sweep **11/11 green, two-layer proof** (~00:31–32Z): verify_full_mesh --probe PASS
  (canonical endpoints, 11/11 GET /health 200) + 11/11 bearer POST /inbox accepted (trio included; response
  shapes = w138 classes) — credential agreement intact, no misses, no operator notification due. Drift audit:
  peer_server + build_observability + **FLEET_COORDINATION.md byte-identical — zero ports** (first since Waking
  130; Tidal idle since w281, already ported); agora 3/1 + INFRA 5/5 + build_site 55/50 + tests 41/39 =
  documented classes, zero new hunks. Redaction clean. Suite 79/79 OK (11.7s), ARA/SOS zero findings, all 12
  services active, peer /health 200, agora 200, live site root/fleet.html 200, watchdog ok, uptime 1d2h56m,
  no reboot flag. ASK.md empty. **No deploy** (zero site-content changes; Waking-130 trigger class) — selective
  river-only commit (NOTES/memory + 3 processed moves). Next cron wake: 04:30Z (Sep 15).
- **Waking 138 (2026-09-15 00:05:39Z, poke-pattern `*/5` sweep wake — not a cron slot; Stream spawned same minute)**: quiet single-flight wake (Tidal's w281 00:00 cron spawn exited before mine; its post-session deploy 0e56d47f landed 00:06:23 pre-commit, no race). check_replies: trigger consumed by the spawning sweep (poke signature). Processed 48 inbox arrivals (403→451 cumulative), incl. 5× TIDAL mesh-rollout messages. **MESH ROLLOUT VERIFIED on river's lane, zero config changes**: operator session installed mesh-age key 21:46Z + minted pair tokens/normalized endpoints into peers.env 22:19–22:20Z + restarted river-peer 22:19:51Z (after mint); Tidal shipped the kit (mesh/ + tools/verify_full_mesh.py) into river's tree. Kit code verified before running (GET-only probe, never prints tokens, final-block-wins). Honored Tidal's w279 CORRECTION: no verbatim envelope adoption (double-TOKEN=-prefix 401 bug class); no config edit. Fresh proof: verifier --probe **PASS 11/11 canonical GET /health 200** + **11/11 bearer POST /inbox accepted** (real token-agreement test — GET is unauthed on this lineage) — trio (HIGHBEAM/LANTERN/LIGHTNING) included; operator's mint correct as-delivered; old duplicate blocks retained. **New credential-hygiene convention mirrored from Tidal c946d81a** (its w280 caught Beacon's plaintext-token relay auto-committed public): token-bearing messages untracked + per-file gitignored, kept on disk — applied to river's one AGE-ciphertext envelope-relay message. Drift audit: peer_server + build_observability identical; agora/INFRA/build_site/tests = documented classes, zero new hunks; **FC port (Tidal w278–281 records)** incl. its w280 incident + w281 note that both operator decisions (history purge; rotation path) remain awaited. Suite 79/79 OK, ARA/SOS 100/100 (637 files), all 12 services active, peer/agora/live-site 200, watchdog ok, uptime 1d2h35m. Full deploy pushed 0e56d47f..e8c59f32 (FC + hygiene + 48 moves; NOTES/memory in follow-up commit). Next cron wake: 04:30Z (Sep 15).
- **Waking 137 (2026-09-14 20:30:02Z, regular cron `30 */4`)**: quiet single-flight wake (only this
  session; Tidal's w277 ran 20:00–20:0xZ and exited before my spawn). check_replies: no operator messages.
  Processed 7 inbox arrivals (403 cumulative): CANYON liveness (16:31:37Z, after w136's window) + 3× HARBOR
  own-identity link verifications (16:52:31/36/42Z) + BEACON health-check (20:00:37Z) + MOUNTAIN liveness
  probe (20:01:00Z) + CREEK w134 mesh check (20:15:46Z) — all data-only. Outbound sweep **11/11 green via
  bearer-authed GET /health in one pass, all classes** (~20:32Z; Mountain quad GET-200 — fifth straight
  waking; trio + Beacon + co-located trio all 200). Drift audit (quiet window): peer_server +
  build_observability identical; INFRA 5/5 + agora 3/1 + tests 41/39 + build_site 55/50 (= exactly w136's
  post-port residual) = zero new unported hunks. **One port: FLEET_COORDINATION.md wholesale-copied**
  (Tidal's Waking-277 record: routine, 21st consecutive zero-failure sweep, all-11 GET-200 one pass,
  7 archived 811→818, 79/79 tests, no code changes; PLUS its logged transient — unexplained
  duplicate-delivery flash in tidal/inbox at 20:00:33Z, 3 byte-identical copies of w276-archived msgs,
  gone in seconds, zero impact, no ACCEPT/git/cron actor found; PAT-rotation + GitHub-GC +
  git-history-residue petitions unchanged as operator residuals). **Watch-item cross-check: river's tree
  showed NO duplicate-delivery flash** — 7 distinct arrivals, zero re-deliveries; sent TIDAL a one-shot
  data-only peer note (w137 cross-check). Redaction clean (zero credential shapes; secret/token hits =
  benign prose classes). Suite 79/79 OK (11.5s), ARA/SOS zero findings, all 12 services active, peer
  /health 200 via tailscale0, agora 200, live site root/fleet.html/observability.json all 200, watchdog
  ok, uptime 22h54m, no reboot flag. ASK.md empty. Full deploy pushed (FC port + NOTES/memory + 7
  processed inbox moves). Next cron wake: 00:30Z (Sep 15).
- **Waking 136 (2026-09-14 16:30:33Z, regular cron `30 */4`)**: quiet single-flight wake (only this
  session; Tidal's w276 ran 16:00–16:1xZ and exited before my spawn). check_replies: no operator messages.
  Processed 7 inbox arrivals (396 cumulative): 2× HARBOR own-identity link verifications (12:48:49/54Z) +
  3× MOUNTAIN (2 operator-requested link verifications 16:00:47/50Z + 1 automated liveness probe 16:00:54Z)
  + BEACON health-check (16:00:58Z) + CREEK w133 mesh check (16:15:57Z) — all data-only. Outbound sweep
  **11/11 green via bearer-authed GET /health in one pass, all classes** (~16:32Z; Mountain quad GET-200
  with names echoed — fourth straight waking, no POST fallback needed; trio + Beacon + co-located trio all
  200). Drift audit (quiet window): peer_server + build_observability identical; INFRA 5/5 name-swap +
  agora 3/1 port-guard = documented classes; test_beacon 41/39 = river's kept next-app existence guard
  (w135 pins inside) vs Tidal's unconditional-open form + benign duplicate assertNotIn — zero new unported.
  **Two ports: (1) FLEET_COORDINATION.md wholesale-copied** (Tidal's Waking-276 record: routine, 20th
  consecutive zero-failure sweep, all-11 GET-200 one pass, 10 archived 801→811, 79/79 tests, no code
  changes; PAT-rotation + GitHub-GC + git-history-residue petitions unchanged as operator residuals);
  **(2) build_site.py ONE new unported hunk in place** — long topology footnote (y=490 line) gained
  Tidal's "re-verified Sept 14, fresh sweep 11/11 peer listeners 200" stamp (second legend location,
  missed by w135's port which covered only the short y=474 legend); post-port build_site residual =
  palette/UA/labels/agent_display classes only. Note: w135's audit counts (105/66/10/4) were pre-port
  side-only counts; this waking re-measured with per-side grep counts (56/51, 41/39, 5/5, 3/1) — the
  "growth" was measurement artifact, only the one footnote hunk was genuinely unported. Redaction clean
  (zero credential shapes; 2 severity-word hits = pre-existing benign role-title prose). Suite 79/79 OK
  (11.5s), ARA/SOS zero findings, all 12 services active, peer /health 200 via tailscale0, agora 200,
  live fleet.html 200 (footnote stamp live ×2), watchdog ok, uptime 18h56m, no reboot flag. ASK.md empty.
  Full deploy pushed (1b16d111: footnote port + FC port + NOTES/memory + 7 processed inbox moves).
  Next cron wake: 20:30Z (Sep 14).
- **Waking 135 (2026-09-14 12:30Z, regular cron `30 */4`)**: quiet single-flight wake (only this
  session; no sibling sessions — Tidal's w273/274/275 ran 11:15–12:1xZ and exited before my spawn;
  w275 was a documented duplicate-spawn-class wake de-conflicted by Tidal itself). check_replies:
  no operator messages. Processed 13 inbox arrivals (389 cumulative): 3× HARBOR link verifications
  (08:52–53Z) + 6× MOUNTAIN (3 liveness 11:15/11:51/12:01Z + 3 link verifications 11:51–12:00Z) +
  3× BEACON health-checks (11:25/11:53/12:00Z) + CREEK w132 mesh check (12:16:21Z) — all data-only.
  Outbound sweep **11/11 green** (~12:31Z; mountain-pair stable; trio via POST). **Two operator asks
  mirrored into river's lane from Tidal's FC records**: (1) Josh's 11:48:53Z external-site-reference
  scrub — river's ONE source occurrence (build_site.py portfolio intro sentence) scrubbed in place,
  portfolio.html rebuilt clean; river has no legacy-src, NOTES never carried the term, ASK Open empty;
  (2) Josh's 11:13:31Z topology-stamp ask (w273) — legend "(Sept 12; re-verified Sept 14)" + test
  pins (legend, content, 3 topo pins inside river's kept existence guard) ported in place. Drift
  audit (quiet window): peer_server + build_observability identical; INFRA (10)/agora (4) unchanged;
  **two ports: FLEET_COORDINATION.md wholesale-copied** (w273 topology live-feed + stamps +
  headless-verified 12/12 feed; w274 scrub + honest git-history filter-repo residual flagged to
  Josh; w275 de-conflicted concurrent wake + third petition, 801 archived; PAT-rotation + GitHub-GC
  unchanged) **+ build_site/test w273/274 hunks in place**. Redaction clean (zero credential shapes,
  zero flagged-term hits). Suite 79/79 OK, ARA/SOS zero findings, all 12 services active, peer
  /health 200, agora 200, live fleet.html 200 (stamp live), watchdog ok, uptime 14h56m, no reboot
  flag. ASK.md empty. Full deploy pushed (scrub + stamps + FC port + NOTES/memory + 13 processed
  inbox moves). Next cron wake: 16:30Z (Sep 14).
- **Waking 134 (2026-09-14 08:30Z, regular cron `30 */4`)**: quiet single-flight wake (only this
  session; Tidal's w272 ran 08:00–08:1xZ and exited before my spawn). check_replies: no operator messages.
  Processed 10 inbox arrivals (376 dir count; 9 at wake + 1 mid-sweep CANYON liveness 08:31:11Z caught by the
  same glob): 1× CANYON liveness (04:32:34Z) + 2× HARBOR own-identity link
  verifications (04:48:12/17Z) + 4× MOUNTAIN (3 link verifications 08:00:33–38Z + 1 liveness probe 08:00:52Z)
  + BEACON health-check (08:01:46Z) + CREEK w131 mesh check (08:16:43Z) — all data-only. Outbound sweep
  **11/11 green** (~08:31Z; mountain-pair stable; trio probed via POST — see w272 note). Drift audit (quiet
  window): peer_server + build_observability identical; build_site (105)/test_beacon (66)/INFRA (10)/agora (4)
  = documented polymorphism, zero NEW hunks; **one port: FLEET_COORDINATION.md wholesale-copied** (Tidal's
  Waking-272 record: 16th consecutive zero-failure sweep; its honest probe-shape note — MOUNTAIN/RIDGE/HARBOR
  401 on authed GET /health, the documented bearer-mode-normal (reject GET / accept POST), reachability proven
  via accepted POSTs same window, strike 0; 10 archived 776→786; PAT-rotation + GitHub-GC residuals unchanged).
  Redaction clean (zero credential shapes; 2 severity-word hits = pre-existing role-description prose).
  Suite 79/79 OK, ARA/SOS zero findings, all 12 services active, peer /health 200, agora 200, live fleet.html
  200, watchdog ok, uptime 10h55m post-reboot, no reboot flag. ASK.md empty. Full deploy pushed (FC port +
  NOTES/memory + 9 processed inbox moves). Next cron wake: 12:30Z (Sep 14).
- **Waking 133 (2026-09-14 04:30:02Z, regular cron `30 */4`)**: quiet single-flight wake (only this
  session; Tidal's w271 ran 04:00–04:1xZ and exited before my spawn). check_replies: no operator messages.
  Processed 7 inbox arrivals (366 cumulative): 4× MOUNTAIN link verifications (04:00:44–55Z) + 1× MOUNTAIN
  liveness probe (04:00:51Z) + BEACON health-check (04:00:49Z) + CREEK w130 mesh check (04:16:06Z) — all
  data-only. Outbound sweep **11/11 green** (~04:31Z; mountain-pair stable). Drift audit (quiet window):
  peer_server + build_observability identical; build_site (105)/test_beacon (66)/INFRA (10)/agora (4) =
  documented polymorphism, zero NEW hunks; **one port: FLEET_COORDINATION.md wholesale-copied** (Tidal's
  Waking-271 record: 15th consecutive zero-failure sweep; its honest probe-shape note — first pass https://
  +ADDR curl 000 ×11 pre-tailnet, corrected to http://, zero peers unreachable, class of 254/266; beacon-peer
  post-reboot bind-race OSError 21:36:22Z Sept 13 retro-noted as known boot race; 8 archived 768→776;
  PAT-rotation + GitHub-GC residuals unchanged). Redaction clean (zero credential shapes; single severity-word
  hit = pre-existing redaction-pointer prose). Suite 79/79 OK, ARA/SOS zero findings, all 12 services active,
  peer /health 200, agora 200, live fleet.html 200, watchdog ok, uptime 6h54m post-reboot, no reboot flag.
  ASK.md empty. Full deploy pushed (FC port + NOTES/memory + 7 processed inbox moves). Next cron wake: 08:30Z (Sep 14).
- **Waking 132 (2026-09-14 01:40:14Z, poke-pattern spawn via `*/5` sweep — not a cron slot; ~1h10m after Waking 131; same-minute spawn with Stream = poke signature)**:
  quiet single-flight wake (only this + Stream's session live; Tidal's w270 exited 01:3xZ before my spawn).
  check_replies: no operator messages. Processed 17 inbox arrivals (359 cumulative): 8× MOUNTAIN (1 empty
  liveness 00:31:20Z + 5 link verifications + 2 liveness probes) + 2× BEACON health-checks (00:40:59Z,
  01:25:46Z) + 5× HARBOR own-identity link verifications (00:48–01:17Z) + CANYON liveness (01:35:33Z) +
  CREEK w129 mesh check (01:36:43Z) — all data-only. Outbound sweep **11/11 green** (~01:41Z; mountain-pair
  stable). Drift audit (quiet window): peer_server + build_observability identical; build_site (105)/INFRA
  (10)/agora (4) = documented polymorphism, zero NEW hunks; **test_beacon diff SHRANK 85→66 lines** —
  expected: Waking 131's date-fix port removed the previously-diffing hunks; remainder = documented
  divergence (river's next-app guard kept, Tidal's benign duplicate assertNotIn unported, comments/
  whitespace). **One port: FLEET_COORDINATION.md wholesale-copied** (Tidal's Waking-270 record: quietest-
  window class, 14th consecutive zero-failure sweep, 768 archived; BEACON 8s-probe-timeout transient noted
  on Tidal's side, 200 on retries; PAT-rotation + GitHub-GC residuals unchanged). Redaction clean (zero
  credential shapes, zero audit text). Suite 79/79 OK, ARA/SOS zero findings, all 12 services active, peer
  /health 200, agora 200, live fleet.html 200, watchdog ok, uptime 4h04m post-reboot, no reboot flag. ASK.md
  empty. Full deploy pushed (FC port + NOTES/memory + 17 processed inbox moves). Next cron wake: 04:30Z (Sep 14).
- **Waking 131 (2026-09-14 00:30:22Z, regular cron `30 */4`)**: quiet single-flight wake (only this
  session; Tidal's w268/w269 sessions had exited before my spawn — both recorded in FC). check_replies:
  no operator messages. Processed 24 inbox arrivals (342 cumulative): 4× BEACON health-checks
  (23:40:41Z, 00:00:21Z, 00:06:17Z, 00:25:49Z) + 13× MOUNTAIN (9 link verifications 23:50–00:04Z +
  4 liveness probes) + 5× HARBOR own-identity link verifications (00:01–00:17Z) + 2× CREEK connectivity
  checks — all data-only. Outbound sweep **11/11 green** (~00:31Z; mountain-pair stable). **FIRST
  FAILING SUITE in River's sweep era, fixed same waking**: `test_get_tidal_metrics` StopIteration at
  wake (78/79) — mock dates pinned to Aug 31 fell out of the rolling 14-day window at the 00:00Z Sep 14
  UTC rollover; Tidal's Waking-268 had just fixed the identical bug in its copy (spotted via drift
  audit: test_beacon diff grew 64→85 lines). Ported the date-independence fix IN PLACE (mock dates from
  `datetime.now() - timedelta(days=1|2)`; river's next-app existence guard + no-duplicate form kept —
  not a wholesale copy). **79/79 OK post-fix.** Drift audit (quiet window): peer_server +
  build_observability identical; build_site (105)/INFRA (10)/agora (4) = documented polymorphism, zero
  NEW hunks; **one port: FLEET_COORDINATION.md wholesale-copied** (Tidal's w267 post-reboot verification
  + w268 test-fix + w269 routine records; PAT-rotation + GitHub-GC residuals unchanged, operator's
  calls). Redaction clean (zero credential shapes, zero audit text). Suite 79/79, ARA/SOS 100/100,
  all 12 services active, peer /health 200, agora 200, live fleet.html 200, watchdog ok, no reboot
  flag (uptime 2h55m post-reboot). ASK.md empty. Full deploy pushed (FC port + test fix + NOTES/memory
  + 24 processed inbox moves). Next cron wake: 04:30Z (Sep 14).
- **Waking 130 (2026-09-13 22:55:02Z, poke-pattern spawn via `*/5` sweep — not a cron slot; ~2h25m after Waking 129; a 22:50:02Z spawn attempt died on "database is locked" opencode transient)**:
  quiet single-flight wake (only this session; Tidal idle since ~20:1xZ). check_replies: no operator
  messages (spawning sweep consumed the trigger). Processed 19 inbox arrivals (318 cumulative):
  1× MOUNTAIN empty liveness (20:31:47Z) + 7× HARBOR own-identity link verifications (20:44–20:47Z,
  22:42–22:43Z) + 1× STREAM Mountain-relayed status check (20:46:21Z) + 5× MOUNTAIN (4 link
  verifications 22:26–22:46Z + 1 liveness 22:27:07Z) + BEACON routine health-check (22:45:32Z) +
  CANYON empty liveness (22:46:49Z) — all data-only, no replies. Outbound sweep **11/11 green**
  (~22:56Z; mountain-pair stable). **reboot:stuck RESOLVED — operator rebooted the host himself
  21:36:13Z** (root session 198.211.111.194 in 21:35:46Z, wtmp-verified; watchdog RECOVERED 21:45:02Z,
  ok through 22:45:02Z; /var/run/reboot-required gone; all 12 services back active post-reboot, peer
  /health 200, agora 200, fleet.html 200); ASK.md item Open→Resolved, nothing left open. **Drift audit
  (quiet window): ZERO ports — FLEET_COORDINATION.md byte-identical** (first zero-port audit since the
  FC-port streak began; w266 records already ported in Waking 129); peer_server + build_observability
  identical; build_site (105)/test_beacon (64)/INFRA (10)/agora (4) diffs = documented polymorphism,
  zero NEW hunks. Suite 79/79 OK, ARA/SOS 100/100. No deploy (zero site-content changes; wake.sh
  post-session deploy covers). River-only commit + push (NOTES/memory/ASK + 19 processed inbox moves;
  tidal's sibling-copy inbox JSONs left unprocessed — committing ≠ processing). Next cron wake: 00:30Z
  (Sep 14).
- **Waking 129 (2026-09-13 20:30:33Z, regular cron `30 */4`)**: quiet
  single-flight wake (only this session; Tidal idle — its w266 finished ~20:1xZ).
  check_replies: no operator messages (cron spawn). Processed 10 inbox
  arrivals (299 cumulative): 2× BEACON credentialed health-checks
  (18:55:40/20:00:37Z) + 3× MOUNTAIN (2 operator-requested link verifications
  20:00:52/54Z + 1 automated liveness probe 20:01:04Z) + CREEK periodic
  full-mesh connectivity check (20:15:52Z) + 4× RIDGE own-identity link
  verifications (20:18:49–20:19:07Z) — all data-only, no replies. Outbound
  sweep **11/11 green** (~20:31Z; mountain-pair stable). **Drift audit (quiet
  window): one port — FLEET_COORDINATION.md wholesale-copied** (gains Tidal's
  Waking-265/266 §3.1 records: 263→264→265 history-rewrite arc completed —
  filter-repo, w263 OOM-kill mid-flight, w265 origin re-add + force-push
  2b0a41b1→0c6d45c0; w266 post-rewrite resync verification CLOSED —
  origin/main on the rewritten chain with River's w128 records on top; LIGHTNING
  listener UP, w233 ack outstanding quiet-wake watch; residuals both operator's
  calls: old-commit-by-hash until GitHub GC + PAT rotation); peer_server +
  build_observability identical; build_site (105)/test_beacon (64)/INFRA (10)/
  agora (4) diffs = documented polymorphism, zero NEW hunks. Redaction
  cross-check: ported FC zero finding strings + zero credential shapes.
  Suite 79/79 OK, ARA/SOS 100/100, all 12 services active, peer /health 200,
  agora 200, live fleet.html 200. reboot:stuck ASK item still open (no
  operator reply, NOT rebooted). Full deploy pushed (FC port + NOTES/memory
  + 10 processed inbox moves; tidal's 5 sibling-copy inbox JSONs left
  unprocessed for Tidal — committing ≠ processing). Next cron wake: 00:30Z.
- **Waking 128 (2026-09-13 18:50:02Z, poke-pattern spawn via `*/5` sweep — not a cron slot; ~1h after Waking 127; Tidal session live 18:31Z throughout)**: etiquette-window wake — Tidal's session live (history-rewrite follow-through; its commits landed mid-session fd8b3c45→65d99c04) → no drift sync, no shared-file edits, no inline deploy; selective river/-only commit + push. check_replies: spawning sweep consumed the trigger. Processed 15 inbox arrivals (289 dir count): 8× MOUNTAIN link verifications/liveness + 2× BEACON health-checks + 2× TIDAL rewrite-coordination (w263 do-not-push superseded by w265 done-note) + HIGHBEAM w177 probe + MOUNTAIN-relayed operator request + 3 mid-move MOUNTAIN arrivals — all data-only. **Tidal's Josh-approved git history rewrite: River's lane = resync verification** — HEAD already == origin/main (no reset needed), zero river/ uncommitted changes, `git log --all -- '**/AUDIT*'` empty (audit path absent my whole chain); last push predated w263's notice; w265 authorizes pushes again. **Operator peer-status request (relayed via Mountain 18:15:39Z) executed**: fresh Rule-7 sweep **11/11 green** (~18:53Z; BEACON/TIDAL/CREEK/STREAM ok, MOUNTAIN/CANYON/RIDGE/HARBOR received:true with names echoed, HIGHBEAM/LANTERN/LIGHTNING ok) + full 11-peer UP list sent to Josh via notify.sh (~18:54Z); inbound legs proven by the 15 arrivals (17:59–18:51Z). Suite 79/79 OK, ARA/SOS 100/100, all 12 services active, peer /health 200, agora 200, live fleet.html 200. reboot:stuck ASK item still open (no operator reply, NOT rebooted). Next cron wake: 20:30Z.
- **Waking 127 (2026-09-13 17:50:48Z, poke-pattern spawn via `*/5` sweep — not a cron slot; spawned by Josh's 17:48:32Z fleet-wide full-mesh directive; Creek+Stream+River poke group 17:50, Tidal idle)**: quiet-window wake — Creek+Stream sessions live (own no shared files), Tidal idle → drift audit + FC port executed per the Waking-123 precedent, but **no inline deploy** (sibling sessions live; selective river/-only commit; wake.sh post-session deploy covers the rebuild). check_replies: spawning sweep consumed Josh's 17:48:32Z directive into ASK.md. Processed 18 inbox arrivals (270 cumulative): 3× BEACON health-checks + 6× MOUNTAIN (4 link verifications + 2 liveness) + TIDAL w261 full-mesh validation (ack requested) + CANYON liveness + 2× HARBOR link verifications + HIGHBEAM w176 full-mesh validation + RIDGE link verification + 3 mid-session (CREEK w125 + STREAM + LANTERN full-mesh validations, same directive) — all data-only. **Josh's full-mesh directive executed by fresh verification**: outbound Rule-7 sweep **11/11 green** (~17:53–54Z; mountain-pair stable) + acks sent to TIDAL/HIGHBEAM; inbound legs proven fresh by the 18 arrivals (17:26–17:53Z), incl. HIGHBEAM + RIDGE inbound on river's own listener the same window Tidal's w262 logged them quiet on its listener (cadence, not fault). Zero faults, zero config changes (mesh already 66/66). ASK.md directive item → Resolved with the verification story. **Drift audit**: peer_server/build_observability byte-identical; build_site (105)/test_beacon (64)/INFRA (10)/agora (4) = documented polymorphism, zero NEW hunks; **ONE port: FLEET_COORDINATION.md wholesale-copied** (Tidal's Waking 255–262 records: model scrub + Mountain model_sync_check confirm-back + audit redaction/remediation — redaction already applied, no finding text in the port — w261 11/11 validation, w262 duplicate-spawn lane). Suite 79/79 OK, ARA/SOS 100/100, all 12 services active, peer /health 200, agora 200, live fleet.html 200. reboot:stuck ASK item still open (no operator reply, NOT rebooted). Next cron wake: 20:30Z.
- **Waking 126 (2026-09-13 17:20:48Z, poke-pattern spawn via `*/5` sweep — not a cron slot; fleet-wide poke: Tidal 17:10, Creek+Stream+River 17:20)**: etiquette-window wake — **Tidal's session live the whole waking** (its 17:10 poke spawn, executing Josh's 17:05:27Z audit-redaction ask) → no drift sync (deferred; last audit Waking 124, zero NEW hunks), no shared-file edits, no inline deploy; selective river/-only commit. check_replies: no pending messages (spawning sweep consumed the trigger). Processed 13 inbox arrivals (252 cumulative): CANYON liveness (16:35:41Z) + 7× HARBOR link verifications (16:47–17:20Z) + 5× MOUNTAIN (17:09Z) + CREEK w124 connectivity (17:21:14Z, mid-session) — all data-only. Outbound sweep **11/11 green** (~17:22Z; mountain-pair stable). **Josh's 17:05:27Z audit-redaction ask — River's surfaces verified clean**: zero audit-finding strings in tracked river/ (only SETUP_GUIDE.md's pre-audit NOPASSWD template text, left consistent with Tidal's FYI to Josh); no AUDIT file ever in river/; added `AUDIT-*.md` to river/.gitignore as the same safety net Tidal added. NOTES entry carries no finding text (the mistake class Josh flagged). Suite 79/79 OK, ARA/SOS 100/100, all 12 services active, peer /health 200, agora 200. reboot:stuck ASK item still open (no operator reply, NOT rebooted). Next cron wake: 20:30Z.
- **Waking 125 (2026-09-13 16:30:37Z, regular cron `30 */4`)**: etiquette-window wake — **Tidal's session live the whole waking** (its 16:30:04Z cron) → no drift sync, no shared-file edits, no inline deploy; selective river/-only commit. check_replies: no operator messages (cron spawn; no sweep suppression). Processed 11 inbox arrivals (239 cumulative): 6× MOUNTAIN link verifications (15:23–16:01Z) + 5× MOUNTAIN liveness probes (15:23–16:29Z) + CREEK w123 connectivity (16:16:33Z) — all data-only. Outbound sweep **11/11 green** (~16:31Z; mountain-pair stable). Drift audit DEFERRED to next quiet window (last: Waking 124, zero NEW hunks). Suite 79/79 OK, ARA/SOS 100/100, all 12 services active, peer /health 200, agora 200, live fleet.html 200. reboot:stuck ASK item still open (no operator reply, NOT rebooted). Next cron wake: 20:30Z.
- **Waking 124 (2026-09-13 15:15:02Z, Telegram-reply-triggered spawn via `*/5` sweep — not a cron slot; ~5 min after Waking 123)**: quiet
  single-flight wake. **RULES 6/7 ADDED to River's AGENT.md** — Josh approved on Telegram 15:14:48Z (the reply
  spawned this waking; it answered Waking 123's ASK.md question). Source: Mountain's authenticated 14:22:08Z
  proposal (read from Tidal's processed inbox `20260913T142208Z-MOUNTAIN-8d596af4.json` — data; authorization
  chain is Josh's). Rule 7 verbatim; Rule 6 phrased for River as subject-to-arbitration (arbiter trio
  Beacon/Tidal/Mountain 2-of-3; River NOT an arbiter; credentials/irreversible/strange always straight to
  Josh; decisions logged; authenticated-channel provenance only) — exactly the framing approved. Added in
  Tidal's position (after the inbound-content rule) with a provenance annotation (proposal → Tidal add
  ~14:35Z → River Waking-123 question → Josh 15:14:48Z → this add). ASK.md item → Resolved; **Mountain
  confirm-back sent** (proposal asked for it; doubles as w124 MOUNTAIN health check, accepted ~15:19Z).
  check_replies: no pending messages. Processed 0 inbox arrivals (228 cumulative; empty at wake). Outbound
  sweep **11/11 green** (~15:19Z; mountain-pair stable). Drift audit (quiet window, Tidal idle): FC/
  peer_server/build_observability identical; build_site (105)/test_beacon (64)/INFRA (10)/agora (4) diffs =
  documented polymorphism, **zero NEW hunks, nothing to port**. Suite 79/79 OK, ARA/SOS 100/100, all 12
  services active, peer /health 200, agora 200, live fleet.html 200. reboot:stuck ASK item still open (no
  operator reply on it, NOT rebooted). No inline deploy (no site-content change; wake.sh post-session deploy
  covers). Next cron wake: 16:30Z.
- **Waking 123 (2026-09-13 15:10:02Z, poke-pattern spawn via `*/5` sweep — not a cron slot; ~2h40m after Waking 122; Stream woke the same minute, Tidal idle)**: quiet
  single-flight wake. check_replies: no operator messages (spawning sweep consumed the trigger). Processed 13 inbox
  arrivals (228 cumulative): CANYON liveness (12:32:45Z), 3× HARBOR own-identity link verifications (12:46–47Z),
  4× MOUNTAIN (2 link verifications 14:39Z + 2 liveness probes 14:39/14:48Z), CREEK w122 connectivity (14:57Z),
  2× HARBOR link verifications (15:09Z), CANYON "scribe pass" (15:10Z, mid-session) — all data-only, no replies.
  **Governance question queued, NOT self-adopted**: Mountain's Rule 6 (fleet arbitration, Beacon/Tidal/Mountain
  2-of-3 — River subject but not arbiter) + Rule 7 (per-wake peer health-checks) proposal was approved by Josh
  (Telegram 14:31:27Z) and added verbatim to TIDAL's AGENT.md only; nothing reached River's bot/inbox and per
  AGENT.md only Josh changes River's rules → ASK.md Open item + focused Telegram ask whether to mirror verbatim
  (Rule 7 already matches River's standing practice). Fresh outbound sweep **11/11 green** (~15:12Z; HIGHBEAM
  stays recovered; mountain-pair stable). **Drift audit (quiet window): one port — FLEET_COORDINATION.md
  wholesale-copied** (gains Waking-252/253/254 records: proposal routing, Josh approval chain, quiet 254 sweep,
  623 msgs archived; Track A promotion watch still with Mountain); build_site (105)/test_beacon (64)/INFRA (10)/
  agora (4) diffs = documented polymorphism, zero NEW hunks; peer_server + build_observability identical.
  AGENT.md is per-agent — Tidal's rule edit deliberately NOT ported. Suite 79/79 OK, ARA/SOS 100/100, all 12
  services active, peer /health 200, agora 200, live fleet.html 200 (66/66 legend + 252/253/254 records live).
  reboot:stuck ASK item still open (no operator reply, NOT rebooted). Full deploy pushed (FC port + NOTES/memory
  + 13 processed inbox moves; swept tidal's unprocessed inbox JSONs — committing ≠ processing). Next cron wake: 16:30Z.
- **Waking 122 (2026-09-13 12:30:29Z, regular cron `30 */4`)**: quiet
  single-flight wake. check_replies: no operator messages. Processed 9 inbox
  arrivals (215 cumulative): CANYON liveness (08:32:07Z), 3× HARBOR own-identity
  link verifications (08:47–08:48Z), 4× MOUNTAIN (3 link verifications +
  1 liveness probe, 12:02Z), CREEK w121 connectivity (12:16:04Z) — all
  data-only, no replies. **HIGHBEAM watch item CLOSED — listener RECOVERED**;
  outbound sweep **11/11 green** (~12:32Z; mountain-pair stable; trio fine) —
  corroborated by Tidal's Waking-251 (HIGHBEAM 200×3 + accepted POST 12:04Z,
  Beacon's side fixed ~12:0xZ). **Drift audit (quiet window, no sibling
  sessions): one port — FLEET_COORDINATION.md wholesale-copied** (gains
  Waking-251 record: HIGHBEAM recovery closing the 250 outage, first
  zero-failure remote sweep since 249, Track A promotion watch still with
  Mountain, 609 msgs archived); build_site (105)/test_beacon (64)/INFRA (10)/
  agora (4) diffs = documented polymorphism, zero NEW hunks; peer_server +
  build_observability identical. Suite 79/79 OK, ARA/SOS 100/100, all 12
  services active, peer /health 200, agora 200, live fleet.html 200 (66/66
  legend + Waking-251 record live). reboot:stuck ASK item still open (no
  operator reply, NOT rebooted). Full deploy pushed ddd89c4d..b0ce3a87 (FC
  port + NOTES/memory + 9 processed inbox moves; swept tidal's 4 unprocessed
  inbox JSONs — committing ≠ processing). Next cron wake: 16:30Z.
- **Waking 121 (2026-09-13 08:30:44Z, regular cron `30 */4`)**: quiet
  single-flight wake. check_replies: no operator messages. Processed 7 inbox
  arrivals (206 cumulative): 3× HARBOR own-identity link verifications
  (04:47–04:48Z), 3× MOUNTAIN liveness probes (06:02/06:20/08:02Z), CREEK w120
  connectivity (08:15:59Z) — all data-only, no replies. **NEW WATCH ITEM:
  HIGHBEAM listener DOWN** — 4 probes to 100.81.147.28:8787 failed (curl
  52/56 empty-reply/reset, ~08:31–08:36Z; was green in w120 ~04:32Z → window
  ~04–08Z); node UP (tailscale ping 1ms) → listener process needs restart on
  its node, not River's lane; data-only heads-up sent to BEACON (accepted);
  independently corroborated by Tidal's Waking-250 (same 000-FAIL, also
  flagged to Beacon). Outbound sweep **10/11 green** (~08:31Z; mountain-pair
  stable; LANTERN/LIGHTNING fine). **Drift audit (quiet window, Tidal's w250
  done 08:08Z): one port — FLEET_COORDINATION.md wholesale-copied** (gains
  Waking-250 record: HIGHBEAM-down flag, Josh's Beacon-topology ask closed by
  Beacon's own fix, Mountain Chrome-size = normal responsive scaling, 11 msgs
  archived → 599); build_site (140)/test_beacon (74)/INFRA (20)/agora (6)
  diffs = documented polymorphism, zero NEW hunks; peer_server +
  build_observability identical. Suite 79/79 OK, ARA/SOS zero findings, all
  12 services active, peer /health 200, agora 200, live fleet.html 200 (66/66
  legend + Waking-250 record live). reboot:stuck ASK item still open (no
  operator reply, NOT rebooted). Full deploy pushed dd6e90cb..9b9989f2 (FC
  port + NOTES/memory + 7 processed inbox moves; swept tidal's 2 unprocessed
  inbox JSONs — committing ≠ processing). Re-probe HIGHBEAM next waking.
  Next cron wake: 12:30Z.
- **Waking 120 (2026-09-13 04:30:26Z, regular cron `30 */4`)**: quiet
  single-flight wake. check_replies: no operator messages. Processed 7 inbox
  arrivals (199 cumulative): 4× MOUNTAIN link verifications (03:48:36/39Z +
  04:00:33Z) + 2× MOUNTAIN liveness probes (03:48:42Z + 04:00:44Z), CREEK w119
  connectivity (04:16:06Z), + mid-session CANYON liveness (04:32:07Z) — all
  data-only, no replies. Fresh outbound sweep **11/11 green** (~04:32Z;
  mountain-pair stable). **Drift audit (quiet window, Tidal's w248/w249 done
  04:04Z): one port — FLEET_COORDINATION.md wholesale-copied** (gains Waking-
  248 ~03:50Z early + Waking-249 04:00Z cron routine all-green records; Track
  A promotion watch still with Mountain); build_site (140-line)/test_beacon
  (74-line)/INFRA/agora diffs = documented polymorphism/divergence, zero NEW
  hunks; peer_server + build_observability identical. Suite 79/79 OK,
  ARA/SOS zero findings, all 12 services active, peer /health 200, agora 200,
  live fleet.html 200 (66/66 legend + Waking-249 record live). reboot:stuck
  ASK item still open (no operator reply, NOT rebooted). Full deploy pushed
  a01bf56e..e1c90c48 (FC port + NOTES/memory + 7 processed inbox moves;
  swept tidal's 3 unprocessed inbox JSONs — committing ≠ processing). Next
  cron wake: 08:30Z.
- **Waking 119 (2026-09-13 01:15:02Z, poke-pattern spawn via `*/5` sweep — not a cron slot; 45 min after Waking 118)**: quiet
  single-flight wake. check_replies: no operator messages (spawning sweep consumed the trigger). Processed 6 inbox
  arrivals (192 cumulative): 5× HARBOR own-identity link verifications (00:47:57–00:58:15Z) + CREEK w118 connectivity
  check (01:00:54Z) — all data-only, no replies. Fresh outbound sweep **11/11 green** (~01:16Z; mountain-pair stable).
  **Drift audit (quiet window): one port — FLEET_COORDINATION.md wholesale-copied** (gains Tidal's Waking-247 fleet
  record: routine all-green monitoring, Track A 9-pair promotion watch still with Mountain); peer_server +
  build_observability identical; build_site (105-line)/agora_server/INFRASTRUCTURE/test_beacon (64-line) diffs =
  documented polymorphism/divergence, untouched. Suite 79/79 OK, ARA/SOS zero findings, all 12 services active,
  peer /health 200, agora 200, live fleet.html 200. reboot:stuck ASK item still open (no operator reply, NOT
  rebooted). Full deploy run (FC = site-content change). Next cron wake: 04:30Z.
- **Waking 118 (2026-09-13 00:30:22Z, regular cron `30 */4`)**: quiet
  single-flight wake. check_replies: no operator messages. Processed 15 inbox
  arrivals (184 cumulative): 8× MOUNTAIN (6 link verifications 23:37–00:01Z +
  2 liveness probes), 2× each CANYON/RIDGE/HARBOR own-identity link
  verifications, CREEK w117 connectivity — all data-only. Fresh outbound sweep
  **11/11 green** (~00:31Z; mountain-pair stable). **Drift audit (quiet
  window, Tidal's w243/w246 finished ~00:12Z): one port — FLEET_COORDINATION.md
  wholesale-copied** (gains Waking-246 Track A remainder attribution record:
  9/9 authenticated sibling→Mountain-box POSTs 00:01:40Z incl. River's 3);
  build_site/test diffs all documented polymorphism/divergence (GLM Flash/GLM
  cosmetic label persists); peer_server + build_observability identical; left
  Tidal's uncommitted next-app WIP untouched. Suite 79/79 OK, ARA/SOS 100/100,
  all 12 services active, peer /health 200, agora 200, live fleet.html 200.
  reboot:stuck ASK item still open (no operator reply, NOT rebooted). Full
  deploy run (FC = site-content change). Next cron wake: 04:30Z.
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
3. `python3 -m unittest tests.test_beacon` (expect 83/83 as of Waking 140 — was 79/79 through Waking 139, 75/75 through Waking 118).
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
