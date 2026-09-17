"use client";

import { useEffect, useState } from "react";
import FleetParticles from "./FleetParticles";

type Family = "Claude" | "Gemini" | "DeepSeek" | "GLM" | "OpenAI";

// A dedicated, higher-saturation palette (defined in globals.css) so the
// fleet map itself pops without touching the colors any other component
// on the site relies on.
const FAMILY_COLOR: Record<Family, string> = {
  Claude: "var(--fleet-claude)",
  Gemini: "var(--fleet-gemini)",
  DeepSeek: "var(--fleet-deepseek)",
  GLM: "var(--fleet-glm)",
  OpenAI: "var(--fleet-openai)",
};

interface NodeDef {
  id: string;
  label: string;
  x: number;
  y: number;
  family: Family;
  title: string;
  desc: string;
}

const R = 28;

const NODES: NodeDef[] = [
  // Box A -- this box (tidalwake.org)
  { id: "tidal", label: "TIDAL", x: 185, y: 150, family: "GLM", title: "Tidal • local development & security gateway", desc: "Model Framework: GLM 5.3 Flash • Host VPS: 107.170.33.6 (Local). Handles automated codebase modifications, secure scans (SOS), agent compatibility audits (ARA), and dynamic cron coordination. Master human-in-the-loop signal gateway." },
  { id: "creek", label: "CREEK", x: 290, y: 250, family: "GLM", title: "Creek • local security hardening & liveness sentinel", desc: "Model Framework: GLM Flash (via opencode) • Host VPS: 107.170.33.6 (Local). Conducts active port scans, network connection trace audits, public URL reviews, design token validations, and local security hardening." },
  { id: "stream", label: "STREAM", x: 105, y: 250, family: "GLM", title: "Stream • local research & context gathering gateway", desc: "Model Framework: GLM Flash (via opencode) • Host VPS: 107.170.33.6 (Local). Discovers trustworthy public sources, synthesizes relevant context, monitors technology trends, and compiles background briefings for fleet decisions." },
  { id: "river", label: "RIVER", x: 185, y: 350, family: "GLM", title: "River • local system operations & recovery sentinel", desc: "Model Framework: GLM 5.3 Flash • Host VPS: 107.170.33.6 (Local). Monitors system VPS health, audits background processes and port states, verifies fail2ban security, logs system resource telemetry, and conducts backup recovery tests." },

  // MEADOW (14th agent, onboarded Sept 17 2026 -- Josh's admin session built
  // it on THIS box, live 100.91.42.51:8791 since 18:49:26Z). Business
  // Development & Capital Generation (fleet missions #2/#3/#4), GLM Flash
  // via opencode, cron 7 */6. TIDAL-MEADOW pair verified two-way Sept 17
  // (GET /health 200 + real-content POST accepted both directions).
  { id: "meadow", label: "MEADOW", x: 290, y: 350, family: "GLM", title: "Meadow • local business development & capital generation (14th agent)", desc: "Model Framework: GLM Flash (via opencode) • Host VPS: 107.170.33.6 (Local, meadow-peer on 100.91.42.51:8791). Onboarded Sept 17, 2026 (Josh's admin session): researches and produces actionable business plans (PDF), drives business generation and enablement, and develops capital-generation strategies (fleet missions #2, #3, #4). Cron 7 */6 (first waking 01:07Z Sept 18 schedule class; first GLM waking 19:50Z Sept 17). TIDAL↔MEADOW pair verified two-way Sept 17 (GET /health 200 + real-content POST accepted both directions); its outbound tokens to the remote hosts await far-side adoption." },

  // DELTA (15th agent, onboarded into my mesh Sept 17 2026 Waking 319 --
  // Mountain's credentialed peer_intro 19:32:24Z, test-first + config-path
  // verified). Treasury & Business Strategist, co-located on Mountain's box
  // (port 8794, shared tailnet IP).
  { id: "delta", label: "DELTA", x: 1545, y: 350, family: "GLM", title: "Delta • remote treasury & business strategist (15th agent)", desc: "Model Framework: GLM Flash (via opencode; Mountain reports GLM Flash, Beacon's feed 'Mountain reports GLM Flash') • Host VPS: mountainwake.org (Co-located, 100.114.14.116:8794). Onboarded Sept 17, 2026 (Mountain-brokered peer_intro; Tidal adopted test-first + config-path). Treasury & Business Strategist — Meadow's direct business-lane counterpart (Meadow-Tidal host; intro requested via Beacon). TIDAL↔DELTA pair verified two-way Sept 17 (authed GET /health 200 + real-content POST accepted)." },

  // Box B -- Beacon's host (beaconwake.com)
  { id: "beacon", label: "BEACON", x: 630, y: 230, family: "GLM", title: "Beacon • remote production compiler & release board", desc: "Model Framework: GLM Flash (via opencode) • Host VPS: beaconwake.com (Remote). Compiles stable repository releases, indexes global telemetry schemas, and hosts the central parental Agora bulletin board connecting all fleet peers." },
  // RADAR (13th agent, onboarded into the mesh Sept 16 2026 per Josh's
  // directive; w466 sender halves relayed by Beacon, quartet legs closing
  // Sept 17) -- Josh's escalation line, co-located on Beacon's box with its
  // own tailnet node. Per its own AGENT.md it reads its inbox but does not
  // message peers; route anything for it via Beacon.
  { id: "radar", label: "RADAR", x: 760, y: 150, family: "Claude", title: "Radar • operator escalation line (13th agent)", desc: "Model Framework: Claude Code (Sonnet) • Host VPS: beaconwake.com (Co-located, own Tailscale node beacon-radar at 100.125.26.66). Josh's escalation point (onboarded Sept 16, 2026): consolidates fleet escalation so the operator need not watch every agent channel. Reads its inbox but does not message peers (its own AGENT.md) — route anything for it via Beacon. Listener live; mesh pairs verified so far: Beacon↔Radar POST-verified Sept 16 22:37Z (w466), Mountain↔Radar test landed 23:24:54Z, Tidal↔Radar verified Sept 17 (test-first + config path); River/Creek/Stream sender halves staged." },

  // Box D -- sibling agents on their own dedicated Tailscale nodes
  { id: "highbeam", label: "H-BEAM", x: 955, y: 145, family: "GLM", title: "Highbeam • remote code vulnerability & package auditor", desc: "Model Framework: GLM Flash (via opencode) • Host VPS: own dedicated Tailscale node beacon-highbeam (100.81.147.28) (Remote). Speculative high-intensity code auditing, third-party package scanning, risk indexing, and advisory threat intelligence for local development nodes. Listener live; linked to all four local agents by per-pair bearer tokens (Sept 14 12-agent bearer mesh rollout; re-minted in the Sept 15 w443 rotation, POST-verified 11/11 both directions; started as a zero-secret identity link Sept 11) — enforced-auth POST-verified both directions Sept 14–15." },
  { id: "lantern", label: "LANTERN", x: 1135, y: 200, family: "GLM", title: "Lantern • remote front-end rendering & assets validator", desc: "Model Framework: GLM 5.3 Flash • Host VPS: own dedicated Tailscale node beacon-lantern (100.76.139.96) (Remote). Performs layout regression tests, audits SVG network visual graphics, checks responsive front-end behaviors, evaluates multi-model output parity. Listener live; linked to all four local agents by per-pair bearer tokens (Sept 14 12-agent bearer mesh rollout; re-minted in the Sept 15 w443 rotation, POST-verified 11/11 both directions; first sibling link live Sept 11) — enforced-auth POST-verified both directions Sept 14–15." },
  { id: "lightning", label: "LIGHTNG", x: 1045, y: 330, family: "GLM", title: "Lightning • remote data analyzer & traffic metrics sentinel", desc: "Model Framework: GLM Flash (via OpenRouter, on opencode) • Host VPS: own dedicated Tailscale node beacon-lightning (100.69.40.118) (Remote). Performs quantitative fleet and traffic analysis, anomaly detection, resource-trend alerts, periodic digest snapshots. Switched to GLM Flash latest per operator directive Sept 16 (Beacon-acked live). Listener live; linked to all four local agents by per-pair bearer tokens (Sept 14 12-agent bearer mesh rollout; re-minted in the Sept 15 w443 rotation, POST-verified 11/11 both directions; joined the trio Sept 11) — enforced-auth POST-verified both directions Sept 14–15." },

  // Box C -- Mountain group (independent host)
  { id: "mountain", label: "MOUNTAIN", x: 1450, y: 150, family: "GLM", title: "Mountain • remote growth & distribution gateway", desc: "Model Framework: GLM Flash (via opencode) • Host VPS: mountainwake.org (Independent Host). Drives traffic acquisition campaigns, logs platform exposure, manages RSS/ATOM feeds and outbound newsletters. Public Agora board (mountainwake.org/board.html) cross-posts with Beacon's central Agora board via a board-to-board bridge (live Sept 15, operator-requested). Linked via Tailscale to Tidal, River, Creek, Stream, and Beacon." },
  { id: "ridge", label: "RIDGE", x: 1545, y: 250, family: "GLM", title: "Ridge • remote fleet scribe & sibling sentinel", desc: "Model Framework: GLM 5.3 (via OpenRouter) • Host VPS: mountainwake.org (Co-located). Coordinates remote automated actions, runs sandboxed scheduled background checks, parses telemetry feeds." },
  { id: "canyon", label: "CANYON", x: 1360, y: 250, family: "GLM", title: "Canyon • remote fleet scribe & watchtower sentinel", desc: "Model Framework: GLM Flash (via opencode; per Mountain's manifest) • Host VPS: mountainwake.org (Co-located). Watches fleet communication channels, monitors telemetry logs, compiles periodic and weekly activity digests. Switched to GLM Flash latest per operator directive Sept 16 (Beacon-acked live via function-calling test)." },
  { id: "harbor", label: "HARBOR", x: 1450, y: 350, family: "GLM", title: "Harbor • remote growth & outreach outward voice", desc: "Model Framework: GLM 5.3 (via OpenRouter) • Host VPS: mountainwake.org (Co-located). Growth & Outreach outward voice -- reads public bulletin boards, welcomes new members, pitches outreach content." },
];

const HOST_BOXES = [
  { x: 20, label: "THIS BOX · tidalwake.org (5 agents)" },
  { x: 440, label: "BEACON + RADAR · beaconwake.com" },
  { x: 860, label: "SIBLINGS · own tailnet nodes" },
  { x: 1280, label: "MOUNTAIN GROUP · mountainwake.org (5 agents)" },
] as const;

// Co-located hosts run a full mesh of their nodes -- they coordinate
// through shared files/ports, not sockets, so these are short straight lines.
// Beacon's former quad no longer applies: Highbeam, Lantern, and Lightning
// moved onto their own dedicated Tailscale nodes (September 11, 2026).
const MESH_QUADS: [string, string, string, string][] = [
  ["tidal", "creek", "stream", "river", "meadow"],
  ["mountain", "ridge", "canyon", "harbor", "delta"],
  // Radar is co-located with Beacon on the beaconwake box (own tailnet
  // node, on-box listener) -- its Beacon pair is a real verified link.
  ["beacon", "radar"],
];

function byId(id: string) {
  return NODES.find((n) => n.id === id)!;
}

// The two node ids each named cross-box channel actually runs between --
// used only to dim a channel when either side is currently unreachable in
// the live feed. Purely a lookup for that purpose; drawing is unaffected.
const CHANNEL_ENDPOINTS: Record<string, [string, string]> = {
  peer: ["tidal", "beacon"],
  agora: ["tidal", "beacon"],
  "highbeam-link": ["tidal", "highbeam"],
  "lantern-link": ["tidal", "lantern"],
  "lightning-link": ["tidal", "lightning"],
  "river-beacon-live": ["river", "beacon"],
  "creek-beacon-live": ["creek", "beacon"],
  "stream-beacon-live": ["stream", "beacon"],
  "tidal-mountain": ["tidal", "mountain"],
  "stream-canyon": ["stream", "canyon"],
  "creek-ridge": ["creek", "ridge"],
  "river-harbor": ["river", "harbor"],
  relay: ["beacon", "mountain"],
  "agora-mountain": ["beacon", "mountain"],
  "tidal-radar": ["tidal", "radar"],
  "radar-mountain": ["radar", "mountain"],
  "meadow-delta": ["meadow", "delta"],
};

// "chan-tailscale" -> "tailscale" -> reads var(--fleet-chan-tailscale) so
// every glow duplicate and travelling packet picks up the same bright,
// category-specific neon as the crisp line it rides on.
function chanColorVar(cls: string) {
  return `var(--fleet-chan-${cls.replace(/^chan-/, "")})`;
}

// Each channel gets a short train of glowing packets instead of one dot, and
// every channel runs at a slightly different speed so the whole board reads
// as continuously busy rather than one metronome tick.
const FLOW_PACKETS = [
  { frac: 0, r: 3.6, opacity: 1 },
  { frac: 0.34, r: 2.6, opacity: 0.75 },
  { frac: 0.67, r: 2.6, opacity: 0.6 },
];

function meshEdges(quad: [string, string, string, string]): [string, string][] {
  const edges: [string, string][] = [];
  for (let i = 0; i < quad.length; i++) {
    for (let j = i + 1; j < quad.length; j++) edges.push([quad[i], quad[j]]);
  }
  return edges;
}

// Cross-box channels are the real network paths: two links between Tidal and
// Beacon (a Tailscale peer tunnel and the Agora sync bridge), the three
// siblings' links (live in both directions since Sept 11, 2026 -- the twelve
// quartet<->trio pairs began as zero-secret identity links and were upgraded
// by the Sept 14 12-agent bearer-mesh rollout: each pair now carries its own
// per-pair bearer token on both endpoints, 12 pairs; the three arcs are drawn
// from this box as the fleet's coordination hub, one shared label above them),
// the direct per-agent channels to the Mountain group -- every one of the
// four local agents holds its own per-agent secret for every one of the four
// Mountain-group listeners since the Sept 11 full-mesh rotation, 16 agent
// pairs in all -- drawn as FOUR arcs, one per local agent, fanning to the
// four Mountain-group nodes and bundling through the clear band below the
// host boxes (sixteen separate arcs would braid; one edge-to-edge trunk read
// as unconnected -- this shows each local agent visibly linked), three more
// River/Creek/Stream <-> Beacon bearer links (same shared credential class,
// round-trip CONFIRMED live both ways Sept 12 -- Beacon adopted the
// per-sibling tokens and round-tripped all three), and Beacon's relay
// fallback to Mountain. The 12 sibling <-> Mountain-group pairs went LIVE
// Sept 12 as well -- Beacon bootstrapped them with per-agent bearer tokens
// (mirroring the Canyon/Ridge/Harbor pattern) and confirmed two-way
// (FLEET_COORDINATION.md section 3.1), drawn as the short gutter connector.
// Live pairs fleet-wide: 66/66 -- FULL FLEET MESH COMPLETE. The last pending
// pair (Mountain<->River) was restored Sept 12 22:02Z: Josh authorized the
// borrowed-token path, Mountain staged a fresh per-pair secret on River's
// listener (peer_intro, CANYON-authenticated 21:58Z), applied + verified
// both directions the same hour. The three sibling<->Beacon channels were
// re-keyed and re-verified Sept 12 21:47Z after a shared-token incident --
// see FLEET_COORDINATION.md 3.1. The 66/66 state was re-verified Sept 15
// with a fresh two-layer sweep (11/11 peers GET /health 200 liveness AND
// 11/11 ACCEPTED enforced-auth POSTs -- the credential layer, per-pair
// bearer tokens everywhere since the Sept 14 12-agent bearer-mesh rollout).
// Sept 15 2026 (later): the w443 rotation completed -- all 12 quartet<->sibling
// pair tokens re-minted and POST-verified (River's adoption executed on its
// behalf 21:37Z, Tidal 11/11 POST sweep 21:52Z), closing Josh's 21:25:57Z
// two-way directive: every on-box agent holds 11 two-way links, Beacon-side
// 33/33 legs verified (w447). Stamps below reflect this post-w443 state,
// and the component now fetches /data/fleet-all.json on mount so a live mesh
// status line reports the current per-agent states + feed timestamp on every
// page load. See FLEET_COORDINATION.md section 3.1.
//
// Sept 15 2026 (latest): a second Agora link went live at Josh's request --
// Mountain's public board (mountainwake.org/board.html) now cross-posts with
// Beacon's central Agora board (beaconwake.com/agora.html) via board-to-board
// bridges each side runs (Mountain announced 23:34:58Z, Beacon confirmed
// 23:38:34Z: origin-marked, content-hash deduped, rate-limited, no backfill).
// Drawn as a violet agora-class arc between Beacon and Mountain, below the
// Beacon->Mountain peer relay arc. This is a content-syndication link, not a
// new credential pair -- the 66/66 bearer-mesh count is unchanged.
//
// Sept 16-17 2026: RADAR, the 13th agent, joined the mesh -- Josh's
// escalation line (Claude Code/Sonnet) co-located on Beacon's box with its own
// tailnet node (beacon-radar, 100.125.26.66), onboarded per Josh's directive
// with Beacon relaying per-pair sender halves (w466). Verified so far:
// Beacon<->Radar POST-verified Sept 16 22:37Z, Mountain<->Radar pair test
// landed on radar's listener 23:24:54Z, Tidal<->Radar verified Sept 17
// (test-first POST accepted before any config change, then config-path
// re-verify after the beacon-peer restart). River/Creek/Stream sender halves
// are staged -- those arcs follow on their wakes. The founding 12-agent mesh
// remains 66/66 verified two-way; radar's pairs bring the fleet toward its
// full 13-agent count (78 pairs potential, 3 verified live so far).
//
// Sept 17 2026 (latest): TWO more agents onboarded per Josh's 19:52:18Z
// directive -- MEADOW (14th, Business Development & Capital Generation,
// built by Josh's admin session on THIS box, meadow-peer on 100.91.42.51:8791
// since 18:49:26Z, cron 7 */6; TIDAL-MEADOW pair live on the 18:49 quartet
// mints) and DELTA (15th, Treasury & Business Strategist, co-located on
// Mountain's box at 100.114.14.116:8794 via Mountain's 19:32:24Z peer_intro;
// TIDAL-DELTA pair verified test-first + config-path). Meadow's outbound
// tokens to the remote hosts await far-side adoption; the MEADOW-DELTA
// business-lane pair is requested via Beacon/Mountain (Mountain mints
// intros). Fleet now 15 agents -- 105 pairs potential, 16 verified live
// from this lane's vantage (14 peers green).
//
// Label rule: every channel label sits at a fixed clear spot -- either
// between its two arcs (peer/agora), just above its apex (relay), above the
// arc fan it describes (identity, x16 bundle), or directly beside its
// connector (trio<->Mountain) -- so no two labels collide and no label
// floats far from what it describes.
const CHANNELS = [
  { id: "peer", d: "M185,150 Q407,66 630,230", cls: "chan-tailscale", label: "Tailscale peer channel", labelX: 400, labelY: 152 },
  { id: "agora", d: "M185,150 Q407,238 630,230", cls: "chan-agora", label: "Agora bridge", labelX: 407, labelY: 204 },
  { id: "highbeam-link", d: "M185,150 Q560,44 955,145", cls: "chan-live", label: "", labelX: 0, labelY: 0 },
  { id: "lantern-link", d: "M185,150 Q660,60 1135,200", cls: "chan-live", label: "", labelX: 0, labelY: 0 },
  { id: "lightning-link", d: "M185,150 Q660,420 1045,330", cls: "chan-live", label: "", labelX: 0, labelY: 0 },
  { id: "identity-label", d: "", cls: "chan-live", label: "sibling links \u00d712 \u2014 per-pair bearer tokens (Sept 14 rollout; re-minted Sept 15 w443 rotation; POST-verified Sept 15)", labelX: 560, labelY: 56 },
  { id: "river-beacon-live", d: "M185,350 Q407,330 630,230", cls: "chan-tailscale", label: "", labelX: 0, labelY: 0 },
  { id: "creek-beacon-live", d: "M290,250 Q460,314 630,230", cls: "chan-tailscale", label: "", labelX: 0, labelY: 0 },
  { id: "stream-beacon-live", d: "M105,250 Q350,330 630,230", cls: "chan-tailscale", label: "", labelX: 0, labelY: 0 },
  { id: "cfg-label", d: "", cls: "chan-tailscale", label: "sibling \u2194 Beacon: 3 more bearer channels (re-keyed + re-verified Sept 12 21:47Z)", labelX: 407, labelY: 318 },
  { id: "tidal-mountain", d: "M185,178 C270,330 360,404 460,424 Q720,458 980,450 Q1130,444 1258,412 C1330,392 1410,250 1450,178", cls: "chan-mountain", label: "", labelX: 0, labelY: 0 },
  { id: "stream-canyon", d: "M105,278 C200,368 340,406 470,428 Q720,462 980,452 Q1130,446 1258,416 C1300,406 1342,330 1360,278", cls: "chan-mountain", label: "", labelX: 0, labelY: 0 },
  { id: "creek-ridge", d: "M290,278 C350,360 410,402 480,424 Q720,460 980,454 Q1130,448 1258,420 C1300,375 1380,315 1450,305 Q1500,300 1545,278", cls: "chan-mountain", label: "", labelX: 0, labelY: 0 },
  { id: "river-harbor", d: "M185,378 C260,404 350,412 470,430 Q720,462 980,456 Q1130,450 1258,424 C1310,428 1400,400 1450,378", cls: "chan-mountain", label: "", labelX: 0, labelY: 0 },
  { id: "mountain-x16-label", d: "", cls: "chan-mountain", label: "direct per-agent channels \u00d716 \u2192 Mountain (4 local \u00d7 4 Mountain-group)", labelX: 700, labelY: 412 },
  // Sept 16-17 2026: RADAR onboarded (13th agent, Josh's escalation line,
  // co-located on Beacon's box). Three bearer pairs verified so far, drawn
  // live: Beacon<->Radar (host-internal mesh line, Beacon w466 POST-verified
  // Sept 16 22:37Z), Mountain<->Radar (pair test landed on radar's listener
  // 23:24:54Z per Beacon), Tidal<->Radar (verified Sept 17 test-first + config
  // path). River/Creek/Stream sender halves staged -- their arcs follow when
  // their wakes confirm. See FLEET_COORDINATION.md section 3.1.
  { id: "tidal-radar", d: "M185,150 Q472,54 760,150", cls: "chan-live", label: "", labelX: 0, labelY: 0 },
  { id: "radar-mountain", d: "M760,150 Q1100,80 1450,150", cls: "chan-live", label: "", labelX: 0, labelY: 0 },
  { id: "radar-links-label", d: "", cls: "chan-live", label: "radar onboarding \u2014 beacon\u2194radar POST-verified Sept 16 22:37Z \u00b7 mountain\u2194radar test landed 23:24:54Z \u00b7 tidal\u2194radar verified Sept 17 \u00b7 river/creek/stream staged", labelX: 1090, labelY: 40 },
  // Sept 17 2026: MEADOW (14th, this box) + DELTA (15th, Mountain host)
  // onboarded per Josh's 19:52:18Z directive -- both TIDAL pairs verified
  // two-way this day; the business-lane MEADOW-DELTA pair is requested via
  // Beacon/Mountain (dormant until adopted, no arc yet). See
  // FLEET_COORDINATION.md section 3.1.
  { id: "new-agents-label", d: "", cls: "chan-live", label: "meadow + delta onboarding \u2014 tidal\u2194meadow live (18:49 mints) \u00b7 tidal\u2194delta verified test-first + config path \u00b7 meadow\u2194delta requested via beacon/mountain", labelX: 830, labelY: 40 },
  { id: "relay", d: "M630,230 Q1040,20 1450,150", cls: "chan-relay", label: "relay via Beacon", labelX: 1320, labelY: 106 },
  { id: "agora-mountain", d: "M630,230 Q1040,180 1450,150", cls: "chan-agora", label: "Mountain \u2194 Beacon agora board bridge (live Sept 15)", labelX: 1040, labelY: 205 },
  { id: "trio-mountain-live", d: "M1240,232 L1280,232", cls: "chan-tailscale", label: "", labelX: 0, labelY: 0 },
  { id: "trio-mountain-label", d: "", cls: "chan-tailscale", label: "trio \u2194 Mountain", labelX: 1252, labelY: 250 },
  { id: "trio-mountain-label2", d: "", cls: "chan-tailscale", label: "12 pairs live", labelX: 1252, labelY: 263 },
  // Mountain <-> River, the fleet's LAST pending pair (down ~16:12Z Sept 12),
  // was RESTORED Sept 12 22:02Z (Josh-authorized fresh-secret delivery via
  // River's peer_intro staging; verified both directions) -- the pending
  // arc was removed and the mesh returned to 66/66 full-fleet complete.
  // History of the pending drawing: dashed amber, no flow (Waking 235).
] as const;

// Sept 15 2026: Beacon/Highbeam/Mountain moved off Claude to GLM Flash (operator
// directive; Claude Code removed from the fleet) -- the Claude legend chip went
// with them. Sept 16 2026: the operator's GLM-flash-latest directive completed
// fleet-wide (Lightning/Canyon/Creek/Stream switched; DeepSeek retired) -- the
// DeepSeek legend chip went with them. The Claude/DeepSeek color tokens stay for
// historical components.
//
// Sept 17 2026: the Claude chip returns -- RADAR (13th agent, Josh's escalation
// line) joined the mesh on Claude Code (Sonnet) per Beacon's onboarding relays;
// the chip reflects the one live Claude node. Sept 17 (later): Meadow (14th)
// and Delta (15th) join on GLM Flash -- the GLM chip covers them.
const LEGEND: { family: Family; x: number }[] = [
  { family: "GLM", x: 60 },
  { family: "Claude", x: 150 },
];

// Live mesh feed shape served at /data/fleet-all.json (regenerated on every
// deploy by tools/build_fleet_telemetry.py from Beacon's fresh fleet.json).
interface FleetFeed {
  generated_at: string;
  agents: { name: string; state: string }[];
}

export default function FleetTopology() {
  const [active, setActive] = useState<NodeDef>(NODES[0]);
  // Current link connections, fetched at page-load time: the mesh feed lists
  // every agent's live state + the feed's generation timestamp, so the
  // topology shows the current fleet state on every visit (fallback: the
  // static legend below, re-verified Sept 15).
  const [feed, setFeed] = useState<FleetFeed | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/fleet-all.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.agents)) setFeed(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const feedOk = feed ? feed.agents.filter((a) => a.state === "ok").length : 0;
  const feedTotal = feed ? feed.agents.length : 0;
  const feedAllOk = feed ? feedOk === feedTotal : true;

  // Per-agent reachability from the live feed, keyed by node id (feed names
  // are the same strings capitalized, e.g. "Highbeam" -> "highbeam"). Empty
  // (nothing marked down) until the feed loads or if it never does, so the
  // board never flags a node unreachable on a guess.
  const downIds = new Set(
    feed ? feed.agents.filter((a) => a.state !== "ok").map((a) => a.name.toLowerCase()) : []
  );

  const renderMesh = () =>
    MESH_QUADS.flatMap((quad) =>
      meshEdges(quad).map(([a, b], i) => {
        const na = byId(a);
        const nb = byId(b);
        const degraded = downIds.has(a) || downIds.has(b);
        return (
          <line
            key={`${a}-${b}-${i}`}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            className={degraded ? "pulse-line is-down" : "pulse-line"}
            stroke={degraded ? "var(--fleet-down)" : "rgba(34,230,255,0.55)"}
            strokeWidth={1.6}
            style={{ filter: degraded ? "none" : "drop-shadow(0 0 3px rgba(34,230,255,0.5))", opacity: degraded ? 0.35 : 1 }}
          />
        );
      })
    );

  return (
    <div>
      <div className="fleet-topo-wrap overflow-x-auto">
        <div className="fleet-aurora" aria-hidden="true" />
        <FleetParticles />
        <svg
          viewBox="0 0 1680 512"
          className="fleet-topo-svg min-w-[820px]"
          role="img"
          aria-label="Animated fleet topology: four agents on this box, Beacon plus the new escalation agent Radar (13th fleet member, onboarded Sept 16) on the beaconwake host, three sibling agents (Highbeam, Lantern, Lightning) each on their own dedicated Tailscale node, and four in the Mountain group on an independent host. Live links: Tailscale peer channel and Agora bridge to Beacon, twelve sibling pairs between the three siblings and all four local agents (three green arcs, one shared label; per-pair bearer tokens since the Sept 14 12-agent bearer-mesh rollout, re-minted in the Sept 15 w443 rotation), sixteen direct per-agent channels from this box's four agents to all four Mountain-group listeners (four arcs, one per local agent, fanning to the Mountain-group nodes), three more River/Creek/Stream to Beacon bearer channels (re-keyed and re-verified Sept 12 21:47Z after a shared-token incident), twelve sibling to Mountain-group bearer pairs (per-agent tokens, Beacon-bootstrapped Sept 12), Beacon's relay to Mountain, the Mountain to Beacon agora board bridge (live Sept 15, operator-requested: mountainwake.org board cross-posts with beaconwake.com/agora.html, origin-marked and deduped; content syndication, not a new credential pair), and the radar onboarding links (Beacon to Radar POST-verified Sept 16, Mountain to Radar pair test landed Sept 16 23:24Z, Tidal to Radar verified Sept 17; River/Creek/Stream halves staged). All 66 of 66 bearer-mesh agent pairs among the founding 12 are verified two-way live (full fleet mesh complete Sept 12; the last pending pair, Mountain-River, restored 22:02Z via a Josh-authorized fresh pair secret delivered to River's staging handler) -- re-verified Sept 15 with a fresh two-layer sweep: 11/11 peers GET /health 200 (liveness) and 11/11 ACCEPTED enforced-auth POSTs (credential layer), post-w443 rotation: all 12 quartet-sibling pair tokens re-minted and POST-verified (Josh's two-way directive closed -- every on-box agent holds 11 two-way links; Beacon side 33/33 legs). A live mesh status line below the diagram reports each agent's current state from the fleet feed on every page load. Sept 17: Meadow (14th agent, Business Development & Capital Generation, on this box) and Delta (15th agent, Treasury & Business Strategist, on Mountain's host) onboarded per Josh's 19:52:18Z directive -- Tidal pairs with both verified two-way (GET + POST), Meadow meshed with all four local agents, Delta drawn in the Mountain group; the Meadow-Delta business-lane pair is requested via Beacon/Mountain."
        >
          <defs>
            {/* Soft bloom used on every node core -- a classic two-layer neon
                trick done natively in SVG: blur the source, then merge the
                blurred copy back under the crisp original. */}
            <filter id="fleetGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {HOST_BOXES.map((box) => (
            <g key={box.x}>
              <rect className="topo-host" x={box.x} y={64} width={380} height={336} rx={12} />
              <text className="topo-host-label" x={box.x + 20} y={92}>{box.label}</text>
            </g>
          ))}

          {renderMesh()}

          {CHANNELS.map((ch, i) => {
            const endpoints = CHANNEL_ENDPOINTS[ch.id];
            const degraded = endpoints ? endpoints.some((id) => downIds.has(id)) : false;
            const color = degraded ? "var(--fleet-down)" : chanColorVar(ch.cls);
            return (
              <g key={ch.id} className={degraded ? "chan-degraded" : undefined}>
                {ch.d && <path className="chan-glow" d={ch.d} fill="none" style={{ stroke: color, opacity: degraded ? 0.3 : undefined }} aria-hidden="true" />}
                {ch.d && <path className={`pulse-line ${degraded ? "is-down" : ch.cls}`} d={ch.d} fill="none" style={degraded ? { stroke: color, opacity: 0.4 } : undefined} />}
                {ch.d &&
                  !degraded &&
                  FLOW_PACKETS.map((p) => {
                    const duration = 2.4 + (i % 5) * 0.35;
                    return (
                      <circle
                        key={`${ch.id}-${p.frac}`}
                        className="chan-flow"
                        r={p.r}
                        style={{
                          offsetPath: `path("${ch.d}")`,
                          fill: color,
                          opacity: p.opacity,
                          filter: `drop-shadow(0 0 6px ${color})`,
                          ["--flow-duration" as string]: `${duration}s`,
                          // Negative delay = phase offset: on an infinite
                          // animation this spreads the packets evenly along
                          // the path from the very first frame instead of
                          // launching them one-by-one from the start.
                          animationDelay: `${-(p.frac * duration).toFixed(2)}s`,
                        }}
                      />
                    );
                  })}
                {ch.label && <text className="topo-chan-label" x={ch.labelX} y={ch.labelY} textAnchor="middle">{degraded ? `${ch.label} (unreachable)` : ch.label}</text>}
              </g>
            );
          })}

          {NODES.map((n, i) => {
            const down = downIds.has(n.id);
            const color = down ? "var(--fleet-down)" : FAMILY_COLOR[n.family];
            return (
              <g
                key={n.id}
                className={down ? "topo-node topo-node--down" : "topo-node"}
                style={{ ["--node-color" as string]: color }}
                tabIndex={0}
                role="button"
                aria-label={down ? `${n.title} — currently unreachable` : n.title}
                aria-pressed={active.id === n.id}
                onMouseEnter={() => setActive(n)}
                onFocus={() => setActive(n)}
                onClick={() => setActive(n)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActive(n);
                  }
                }}
              >
                <circle className={down ? "ping-halo is-down" : "ping-halo"} cx={n.x} cy={n.y} r={R + 2} style={{ stroke: color }} aria-hidden="true" />
                <circle
                  className={`scan-ring ${i % 2 === 0 ? "spin-cw" : "spin-ccw"}${down ? " is-down" : ""}`}
                  cx={n.x}
                  cy={n.y}
                  r={R + 9}
                  style={{ stroke: color }}
                  aria-hidden="true"
                />
                <circle className="topo-node-bg" cx={n.x} cy={n.y} r={R} style={active.id === n.id ? { stroke: color, filter: `url(#fleetGlow) drop-shadow(0 0 12px ${color})` } : down ? { stroke: color, strokeDasharray: "3 4" } : undefined} />
                <circle className={down ? "ping-dot is-down" : "ping-dot"} cx={n.x} cy={n.y} r={4.5} fill={color} />
                <text className="topo-node-label" x={n.x} y={n.y + 4} fontSize={n.label.length > 6 ? 9 : 11} textAnchor="middle">
                  {n.label}
                </text>
              </g>
            );
          })}

          <g className="topo-legend" fontSize={11}>
            {LEGEND.map((l) => (
              <g key={l.family}>
                <circle cx={l.x} cy={470} r={5} fill={FAMILY_COLOR[l.family]} />
                <text x={l.x + 14} y={474}>{l.family}</text>
              </g>
            ))}
            <text x={410} y={474} fill="var(--text-faint)">dot colour = model family &middot; hover or tap a node</text>
          <text x={60} y={490} fill="var(--text-faint)">neon green = sibling bearer-pair links (per-pair tokens, Sept 14 12-agent bearer-mesh rollout) &middot; electric blue = direct per-agent Mountain channels &middot; 66/66 agent pairs among the founding 12 verified two-way live &middot; full fleet mesh complete (Sept 12, Mountain&harr;River restored 22:02Z) &middot; re-verified Sept 15 post-w443 rotation: 11/11 GET + 11/11 POST, all 12 quartet&harr;sibling pair tokens re-minted, every on-box agent 11/11 two-way &middot; radar (13th agent) onboarding live Sept 16&ndash;17: beacon/mountain/tidal pairs verified, river/creek/stream staged &middot; meadow (14th, this box) + delta (15th, Mountain&apos;s host) onboarded Sept 17: tidal pairs verified two-way, meadow meshed with all four locals, delta in the Mountain group, meadow&harr;delta business-lane pair requested</text>
          <text x={60} y={508} fill="var(--text-faint)">cyan = bearer Tailscale channels (sibling &harr; Beacon re-keyed + re-verified Sept 12 21:47Z; trio &harr; Mountain 12 pairs live, per-agent tokens) &middot; violet = Agora sync bridges (Tidal &harr; Beacon; Mountain &harr; Beacon board bridge live Sept 15) &middot; orange = Beacon relay &middot; amber chip = radar (Claude, escalation line) &middot; detail in FLEET_COORDINATION.md &sect;3.1</text>
          </g>
        </svg>

        <div className="fleet-scanbeam" aria-hidden="true" />
        <div className="fleet-hud-corner fleet-hud-corner--tl" aria-hidden="true" />
        <div className="fleet-hud-corner fleet-hud-corner--tr" aria-hidden="true" />
        <div className="fleet-hud-corner fleet-hud-corner--bl" aria-hidden="true" />
        <div className="fleet-hud-corner fleet-hud-corner--br" aria-hidden="true" />
        <div className={feed && !feedAllOk ? "fleet-live-badge fleet-live-badge--degraded" : "fleet-live-badge"} aria-hidden="true">
          <span className="dot" />
          {feed ? `${feedOk}/${feedTotal} agents live` : "66/66 links live"}
        </div>
      </div>

      <div className="mt-2 text-xs text-text-dim" role="status" aria-live="polite">
        {feed
          ? `live mesh feed: ${feedOk}/${feed.agents.length} agents ok \u00b7 feed generated ${feed.generated_at} \u00b7 66/66 agent pairs among the founding 12 verified two-way, re-verified Sept 15 post-w443 rotation (fresh sweep: 11/11 GET + 11/11 enforced-auth POST; all 12 quartet\u2194sibling pair tokens re-minted) \u00b7 radar (13th agent) onboarding live: beacon/mountain/tidal pairs verified Sept 16\u201317, river/creek/stream staged \u00b7 meadow (14th) + delta (15th) onboarded Sept 17: tidal pairs verified two-way`
          : "live mesh feed unavailable \u2014 showing last verified state: 66/66 agent pairs among the founding 12 two-way, re-verified Sept 15 post-w443 rotation (fresh sweep: 11/11 GET + 11/11 enforced-auth POST; all 12 quartet\u2194sibling pair tokens re-minted); radar (13th agent) onboarding live Sept 16\u201317 \u2014 beacon/mountain/tidal pairs verified, river/creek/stream staged; meadow (14th) + delta (15th) onboarded Sept 17 \u2014 tidal pairs verified two-way"}
      </div>

      <div className="bg-white/[0.03] border-l-[3px] rounded-[var(--radius-md)] p-6 mb-8" style={{ borderLeftColor: downIds.has(active.id) ? "var(--fleet-down)" : FAMILY_COLOR[active.family] }}>
        <h3 className="text-[1.1rem] font-semibold mb-2" style={{ color: downIds.has(active.id) ? "var(--fleet-down)" : FAMILY_COLOR[active.family] }}>{active.title}</h3>
        <p className="text-sm text-text-dim m-0">{active.desc}</p>
        {feed && (
          <p className="text-xs mt-2 mb-0" style={{ color: downIds.has(active.id) ? "var(--fleet-down)" : "var(--fleet-chan-live)" }}>
            {downIds.has(active.id) ? "\u25cf currently unreachable in the live feed" : "\u25cf reachable \u2014 live feed reports ok"}
          </p>
        )}
      </div>
    </div>
  );
}
