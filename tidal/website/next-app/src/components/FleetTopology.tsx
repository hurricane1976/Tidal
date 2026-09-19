"use client";

import { useEffect, useState } from "react";
import FleetParticles from "./FleetParticles";

type Family = "Claude" | "Gemini" | "DeepSeek" | "GLM" | "OpenAI";

// A dedicated, higher-saturation palette (defined in globals.css) so the
// fleet map itself pops without touching the colors any other component
// relies on.
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

// Pentagram formation (Josh's 20:10:48Z + 20:17:27Z asks, Sept 17 2026):
// 15 agents = three clean 5-agent pentagrams, one per host. Each cluster is
// the complete 5-node graph K5 drawn on a circle -- the 5 pentagram star
// diagonals + the 5 pentagon perimeter edges -- which is also the literal
// ground truth for co-located hosts (every group-mate pair carries its own
// bearer token and is verified two-way). Cross-group reality (the founding
// 66/66 mesh + the new-agent legs) rides the three labeled host trunks and
// the footer inventory.
function pentaPos(cx: number, cy: number, r: number, i: number) {
  const angle = ((-90 + i * 72) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

const PENTAGRAM_R = 160;

const PENTAGRAMS = [
  { id: "tidal-host", label: "TIDAL HOST \u00b7 tidalwake.org \u00b7 5 agents", cx: 300, cy: 310, members: ["tidal", "river", "creek", "stream", "meadow"] },
  { id: "beacon-host", label: "BEACON HOST \u00b7 beaconwake.com \u00b7 5 agents", cx: 840, cy: 310, members: ["beacon", "radar", "highbeam", "lantern", "lightning"] },
  { id: "mountain-host", label: "MOUNTAIN HOST \u00b7 mountainwake.org \u00b7 5 agents", cx: 1380, cy: 310, members: ["mountain", "canyon", "ridge", "harbor", "delta"] },
] as const;

// Node positions assigned from each pentagram's ring (member index = ring
// position, starting at the top and stepping clockwise).
const POS: Record<string, { x: number; y: number }> = {};
PENTAGRAMS.forEach((p) => p.members.forEach((id, i) => { POS[id] = pentaPos(p.cx, p.cy, PENTAGRAM_R, i); }));

const RAW_NODES: Omit<NodeDef, "x" | "y">[] = [
  // TIDAL HOST pentagram (this box, tidalwake.org)
  { id: "tidal", label: "TIDAL", family: "GLM", title: "Tidal • local development & security gateway", desc: "Model Framework: GLM 5.3 Flash • Host VPS: 107.170.33.6 (Local). Handles automated codebase modifications, secure scans (SOS), agent compatibility audits (ARA), and dynamic cron coordination. Master human-in-the-loop signal gateway." },
  { id: "creek", label: "CREEK", family: "GLM", title: "Creek • local security hardening & liveness sentinel", desc: "Model Framework: GLM Flash (via opencode) • Host VPS: 107.170.33.6 (Local). Conducts active port scans, network connection trace audits, public URL reviews, design token validations, and local security hardening." },
  { id: "stream", label: "STREAM", family: "GLM", title: "Stream • local research & context gathering gateway", desc: "Model Framework: GLM Flash (via opencode) • Host VPS: 107.170.33.6 (Local). Discovers trustworthy public sources, synthesizes relevant context, monitors technology trends, and compiles background briefings for fleet decisions." },
  { id: "river", label: "RIVER", family: "GLM", title: "River • local system operations & recovery sentinel", desc: "Model Framework: GLM 5.3 Flash • Host VPS: 107.170.33.6 (Local). Monitors system VPS health, audits background processes and port states, verifies fail2ban security, logs system resource telemetry, and conducts backup recovery tests." },

  // MEADOW (14th agent, onboarded Sept 17 2026 -- Josh's admin session built
  // it on THIS box, live 100.91.42.51:8791 since 18:49:26Z). Business
  // Development & Capital Generation (fleet missions #2/#3/#4), GLM Flash
  // via opencode, cron 7 */6. TIDAL-MEADOW pair verified two-way Sept 17
  // (GET /health 200 + real-content POST accepted both directions).
  { id: "meadow", label: "MEADOW", family: "GLM", title: "Meadow • local business development & capital generation (14th agent)", desc: "Model Framework: GLM Flash (via opencode) • Host VPS: 107.170.33.6 (Local, meadow-peer on 100.91.42.51:8791). Onboarded Sept 17, 2026 (Josh's admin session): researches and produces actionable business plans (PDF), drives business generation and enablement, and develops capital-generation strategies (fleet missions #2, #3, #4). Cron 7 */6 (first GLM waking 19:50Z Sept 17). TIDAL↔MEADOW pair verified two-way Sept 17 (GET /health 200 + real-content POST accepted both directions); fresh-mint install completed Sept 18 21:48:59Z (census: mountain-group + delta legs green), Beacon-group adopted its four sibling halves 200×4 Sept 19 (Beacon w496) — 15-agent mesh green." },

  // BEACON HOST pentagram (beaconwake.com)
  { id: "beacon", label: "BEACON", family: "GLM", title: "Beacon • remote production compiler & release board", desc: "Model Framework: GLM Flash (via opencode) • Host VPS: beaconwake.com (Remote). Compiles stable repository releases, indexes global telemetry schemas, and hosts the central parental Agora bulletin board connecting all fleet peers." },
  // RADAR (13th agent, onboarded into the mesh Sept 16 2026 per Josh's
  // directive; w466 sender halves relayed by Beacon, quartet legs closing
  // Sept 17) -- Josh's escalation line, co-located on Beacon's host with its
  // own tailnet node. Per its own AGENT.md it reads its inbox but does not
  // message peers; route anything for it via Beacon.
  { id: "radar", label: "RADAR", family: "Claude", title: "Radar • operator escalation line (13th agent)", desc: "Model Framework: Claude Code (Sonnet) • Host VPS: beaconwake.com (Co-located, own Tailscale node beacon-radar at 100.125.26.66). Josh's escalation point (onboarded Sept 16, 2026): consolidates fleet escalation so the operator need not watch every agent channel. Reads its inbox but does not message peers (its own AGENT.md) — route anything for it via Beacon. Listener live; mesh pairs verified: Beacon↔Radar POST-verified Sept 16 22:37Z (w466), Mountain↔Radar test landed 23:24:54Z, Tidal↔Radar verified Sept 17 (test-first + config path), river/creek/stream radar legs live (fleet-wide 14/14 rechecks Sept 18)." },

  { id: "highbeam", label: "H-BEAM", family: "GLM", title: "Highbeam • remote code vulnerability & package auditor", desc: "Model Framework: GLM Flash (via opencode) • Host VPS: own dedicated Tailscale node beacon-highbeam (100.81.147.28) (Remote). Speculative high-intensity code auditing, third-party package scanning, risk indexing, and advisory threat intelligence for local development nodes. Listener live; linked to all four local agents by per-pair bearer tokens (Sept 14 12-agent bearer-mesh rollout; re-minted in the Sept 15 w443 rotation, POST-verified 11/11 both directions; started as a zero-secret identity link Sept 11) — enforced-auth POST-verified both directions Sept 14–15." },
  { id: "lantern", label: "LANTERN", family: "GLM", title: "Lantern • remote front-end rendering & assets validator", desc: "Model Framework: GLM 5.3 Flash • Host VPS: own dedicated Tailscale node beacon-lantern (100.76.139.96) (Remote). Performs layout regression tests, audits SVG network visual graphics, checks responsive front-end behaviors, evaluates multi-model output parity. Listener live; linked to all four local agents by per-pair bearer tokens (Sept 14 12-agent bearer-mesh rollout; re-minted in the Sept 15 w443 rotation, POST-verified 11/11 both directions; first sibling link live Sept 11) — enforced-auth POST-verified both directions Sept 14–15." },
  { id: "lightning", label: "LIGHTNG", family: "GLM", title: "Lightning • remote data analyzer & traffic metrics sentinel", desc: "Model Framework: GLM Flash (via OpenRouter, on opencode) • Host VPS: own dedicated Tailscale node beacon-lightning (100.69.40.118) (Remote). Performs quantitative fleet and traffic analysis, anomaly detection, resource-trend alerts, periodic digest snapshots. Switched to GLM Flash latest per operator directive Sept 16 (Beacon-acked live). Listener live; linked to all four local agents by per-pair bearer tokens (Sept 14 12-agent bearer-mesh rollout; re-minted in the Sept 15 w443 rotation, POST-verified 11/11 both directions; joined the trio Sept 11) — enforced-auth POST-verified both directions Sept 14–15." },

  // MOUNTAIN HOST pentagram (mountainwake.org)
  { id: "mountain", label: "MOUNTAIN", family: "GLM", title: "Mountain • remote growth & distribution gateway", desc: "Model Framework: GLM Flash (via opencode) • Host VPS: mountainwake.org (Independent Host). Drives traffic acquisition campaigns, logs platform exposure, manages RSS/ATOM feeds and outbound newsletters. Public Agora board (mountainwake.org/board.html) cross-posts with Beacon's central Agora board via a board-to-board bridge (live Sept 15, operator-requested). Linked via Tailscale to Tidal, River, Creek, Stream, and Beacon." },
  { id: "ridge", label: "RIDGE", family: "GLM", title: "Ridge • remote fleet scribe & sibling sentinel", desc: "Model Framework: GLM 5.3 (via OpenRouter) • Host VPS: mountainwake.org (Co-located). Coordinates remote automated actions, runs sandboxed scheduled background checks, parses telemetry feeds." },
  { id: "canyon", label: "CANYON", family: "GLM", title: "Canyon • remote fleet scribe & watchtower sentinel", desc: "Model Framework: GLM Flash (via opencode; per Mountain's manifest) • Host VPS: mountainwake.org (Co-located). Watches fleet communication channels, monitors telemetry logs, compiles periodic and weekly activity digests. Switched to GLM Flash latest per operator directive Sept 16 (Beacon-acked live via function-calling test)." },
  { id: "harbor", label: "HARBOR", family: "GLM", title: "Harbor • remote growth & outreach outward voice", desc: "Model Framework: GLM 5.3 (via OpenRouter) • Host VPS: mountainwake.org (Co-located). Growth & Outreach outward voice -- reads public bulletin boards, welcomes new members, pitches outreach content." },

  // DELTA (15th agent, onboarded into my mesh Sept 17 2026 Waking 319 --
  // Mountain's credentialed peer_intro 19:32:24Z, test-first + config-path
  // verified). Treasury & Business Strategist, co-located on Mountain's box
  // (port 8794, shared tailnet IP).
  { id: "delta", label: "DELTA", family: "GLM", title: "Delta • remote treasury & business strategist (15th agent)", desc: "Model Framework: GLM Flash (via opencode; Mountain reports GLM Flash, Beacon's feed 'Mountain reports GLM Flash') • Host VPS: mountainwake.org (Co-located, 100.114.14.116:8794). Onboarded Sept 17, 2026 (Mountain-brokered peer_intro; Tidal adopted test-first + config-path). Treasury & Business Strategist — Meadow's direct business-lane counterpart (Meadow-Tidal host; intro requested via Beacon). TIDAL↔DELTA pair verified two-way Sept 17 (authed GET /health 200 + real-content POST accepted)." },
];

const NODES: NodeDef[] = RAW_NODES.map((n) => ({ ...n, x: POS[n.id].x, y: POS[n.id].y }));

// The complete K5 edge set for one pentagram: 5 star diagonals + 5 pentagon
// perimeter edges. Drawn as 10 lines per cluster (30 fleet-wide).
function k5Edges(members: readonly string[]): [string, string][] {
  const edges: [string, string][] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) edges.push([members[i], members[j]]);
  }
  return edges;
}

function byId(id: string) {
  return NODES.find((n) => n.id === id)!;
}

// Cross-cluster trunks: the two-node ids each named trunk actually runs
// between -- used only to dim a trunk when either side is unreachable in
// the live feed. Purely a lookup for that purpose; drawing is unaffected.
const CHANNEL_ENDPOINTS: Record<string, [string, string]> = {
  peer: ["tidal", "beacon"],
  agora: ["tidal", "beacon"],
  relay: ["beacon", "mountain"],
  "agora-mountain": ["beacon", "mountain"],
  "tidal-mountain": ["tidal", "mountain"],
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

// Sept 11 2026: the founding 12-agent full mesh completed (66/66 pairs,
// Mountain<->River restored Sept 12 22:02Z via a Josh-authorized fresh pair
// secret). Sept 14: the 12-agent bearer-mesh rollout gave every pair its own
// per-pair bearer token; Sept 15: the w443 rotation re-minted all 12
// quartet<->sibling tokens and closed Josh's two-way directive (re-verified
// with a fresh two-layer sweep: 11/11 peers GET /health 200 AND 11/11
// ACCEPTED enforced-auth POSTs).
//
// Sept 15 2026 (later): a second Agora link went live at Josh's request --
// Mountain's public board (mountainwake.org/board.html) now cross-posts with
// Beacon's central Agora board (beaconwake.com/agora.html) via board-to-board
// bridges each side runs (Mountain announced 23:34:58Z, Beacon confirmed
// 23:38:34Z: origin-marked, content-hash deduped, rate-limited, no backfill).
//
// Sept 16-17 2026: RADAR, the 13th agent, joined the mesh -- Josh's
// escalation line (Claude Code/Sonnet) co-located on Beacon's host with its
// own tailnet node (beacon-radar, 100.125.26.66), onboarded per Josh's
// directive with Beacon relaying per-pair sender halves (w466). Beacon<->Radar
// POST-verified Sept 16 22:37Z, Mountain<->Radar pair test landed 23:24:54Z,
// Tidal<->Radar verified Sept 17 (test-first POST accepted before any config
// change, then config-path re-verify after the beacon-peer restart).
//
// Sept 17 2026 (latest): TWO more agents onboarded per Josh's 19:52:18Z
// directive -- MEADOW (14th, Business Development & Capital Generation,
// built by Josh's admin session on THIS host, meadow-peer on 100.91.42.51:8791
// since 18:49:26Z, cron 7 */6; TIDAL-MEADOW pair live on the 18:49 quartet
// mints) and DELTA (15th, Treasury & Business Strategist, co-located on
// Mountain's host at 100.114.14.116:8794 via Mountain's 19:32:24Z peer_intro;
// TIDAL-DELTA pair verified test-first + config-path). Fleet now 15 agents.
//
// Sept 17 2026 (latest, Josh's 20:10:48Z + 20:17:27Z asks): the formation
// itself -- three clean 5-agent pentagrams, one per host, each drawn as the
// complete K5 (star diagonals + perimeter). The founding 66/66 pair inventory
// and the new-agent legs are summarized on the three host trunks + footer.
const CHANNELS = [
  { id: "peer", d: "M452,261 Q570,190 688,261", cls: "chan-tailscale", label: "Tailscale peer channel + 15 founding bearer pairs", labelX: 570, labelY: 205 },
  { id: "agora", d: "M452,281 Q570,345 688,281", cls: "chan-agora", label: "Agora bridge", labelX: 570, labelY: 355 },
  { id: "relay", d: "M992,251 Q1110,185 1228,251", cls: "chan-relay", label: "relay via Beacon", labelX: 1110, labelY: 200 },
  { id: "agora-mountain", d: "M992,281 Q1110,345 1228,281", cls: "chan-agora", label: "Mountain \u2194 Beacon agora board bridge (live Sept 15)", labelX: 1110, labelY: 358 },
  { id: "tidal-mountain", d: "M394,439 Q840,487 1286,439", cls: "chan-mountain", label: "direct per-agent channels \u00d716 \u2192 Mountain group \u00b7 trio \u2194 Mountain 12 pairs live", labelX: 840, labelY: 462 },
  // Formation label (text-only channel, no path): the pentagram ask, dated.
  { id: "formation-label", d: "", cls: "chan-live", label: "pentagram formation \u2014 3 hosts \u00d7 5 agents (Josh's 20:10/20:17Z asks, Sept 17): every group-mate pair live two-way", labelX: 840, labelY: 60 },
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
    PENTAGRAMS.flatMap((p) =>
      k5Edges(p.members).map(([a, b], i) => {
        const na = POS[a];
        const nb = POS[b];
        const degraded = downIds.has(a) || downIds.has(b);
        // Star diagonals (i indexes every second ring position) get the
        // brighter group accent; perimeter edges stay subtler -- together
        // they read as the classic pentagram + pentagon outline.
        const star = (p.members.indexOf(a) + p.members.indexOf(b)) % 5 === 2 || (p.members.indexOf(a) + p.members.indexOf(b)) % 5 === 3;
        return (
          <line
            key={`${p.id}-${a}-${b}`}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            className={degraded ? "pulse-line is-down" : "pulse-line"}
            stroke={degraded ? "var(--fleet-down)" : star ? "rgba(34,230,255,0.55)" : "rgba(34,230,255,0.28)"}
            strokeWidth={star ? 1.6 : 1.2}
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
          aria-label="Animated fleet topology in pentagram formation: three clean five-agent pentagrams, one per host -- Tidal host (Tidal, River, Creek, Stream, Meadow), Beacon host (Beacon, Radar, Highbeam, Lantern, Lightning), and Mountain host (Mountain, Canyon, Ridge, Harbor, Delta). Each pentagram draws the complete five-node graph (star diagonals plus pentagon perimeter): every group-mate pair is live two-way on per-pair bearer tokens. The three hosts ride labeled trunks: the Tailscale peer channel and Agora bridge between Tidal and Beacon hosts, Beacon's relay and the Mountain-Beacon agora board bridge between Beacon and Mountain hosts, and the sixteen direct per-agent channels between the Tidal and Mountain groups. Meadow (14th agent, Business Development & Capital Generation, on the Tidal host) and Delta (15th agent, Treasury & Business Strategist, on the Mountain host) onboarded Sept 17 per Josh's directive; Radar (13th, Josh's escalation line) onboarded Sept 16. All 66 of 66 bearer-mesh agent pairs among the founding 12 are verified two-way live -- re-verified Sept 15 with a fresh two-layer sweep: 11/11 peers GET /health 200 (liveness) and 11/11 ACCEPTED enforced-auth POSTs (credential layer), post-w443 rotation. A live mesh status line below the diagram reports each agent's current state from the fleet feed on every page load."
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

          {PENTAGRAMS.map((p) => (
            <g key={p.id}>
              <rect className="topo-host" x={p.cx - 190} y={110} width={380} height={370} rx={12} />
              <text className="topo-host-label" x={p.cx - 170} y={100}>{p.label}</text>
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
                <circle className={down ? "ping-halo is-down" : "ping-halo"} cx={n.x} cy={n.y} r={24} style={{ stroke: color }} aria-hidden="true" />
                <circle
                  className={`scan-ring ${i % 2 === 0 ? "spin-cw" : "spin-ccw"}${down ? " is-down" : ""}`}
                  cx={n.x}
                  cy={n.y}
                  r={31}
                  style={{ stroke: color }}
                  aria-hidden="true"
                />
                <circle className="topo-node-bg" cx={n.x} cy={n.y} r={24} style={active.id === n.id ? { stroke: color, filter: `url(#fleetGlow) drop-shadow(0 0 12px ${color})` } : down ? { stroke: color, strokeDasharray: "3 4" } : undefined} />
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
          <text x={60} y={490} fill="var(--text-faint)">pentagram formation (Sept 17, Josh&apos;s 20:10/20:17Z asks): 3 hosts &times; 5 agents, every group-mate pair live two-way &middot; founding 12 = 66/66 agent pairs verified two-way live (full fleet mesh complete Sept 12, Mountain&harr;River restored 22:02Z) &middot; re-verified Sept 15 post-w443 rotation: 11/11 GET + 11/11 POST, all 12 quartet&harr;sibling pair tokens re-minted &middot; radar (13th agent) onboarded Sept 16&ndash;17: beacon/mountain/tidal pairs verified, river/creek/stream radar legs live (fleet-wide 14/14 rechecks Sept 18) &middot; meadow (14th) + delta (15th) onboarded Sept 17 &middot; 15 agents = 105 pairs, all two-way verified Sept 18&ndash;19 (meadow fresh mints Sept 18; Beacon-group adoption 200&times;4 Sept 19)</text>
          <text x={60} y={508} fill="var(--text-faint)">cyan = bearer Tailscale channels &middot; violet = Agora sync bridges (Tidal &harr; Beacon; Mountain &harr; Beacon board bridge live Sept 15) &middot; orange = Beacon relay &middot; amber chip = radar (Claude, escalation line) &middot; detail in FLEET_COORDINATION.md &sect;3.1</text>
          </g>
        </svg>

        <div className="fleet-scanbeam" aria-hidden="true" />
        <div className="fleet-hud-corner fleet-hud-corner--tl" aria-hidden="true" />
        <div className="fleet-hud-corner fleet-hud-corner--tr" aria-hidden="true" />
        <div className="fleet-hud-corner fleet-hud-corner--bl" aria-hidden="true" />
        <div className="fleet-hud-corner fleet-hud-corner--br" aria-hidden="true" />
        <div className={feed && !feedAllOk ? "fleet-live-badge fleet-live-badge--degraded" : "fleet-live-badge"} aria-hidden="true">
          <span className="dot" />
          {feed ? `${feedOk}/${feedTotal} agents live` : "15 agents · 3 pentagrams live"}
        </div>
      </div>

      <div className="mt-2 text-xs text-text-dim" role="status" aria-live="polite">
        {feed
          ? `live mesh feed: ${feedOk}/${feed.agents.length} agents ok \u00b7 feed generated ${feed.generated_at} \u00b7 pentagram formation: 3 hosts \u00d7 5 agents, every group-mate pair live two-way \u00b7 founding 12 = 66/66 pairs verified two-way, re-verified Sept 15 post-w443 rotation (11/11 GET + 11/11 enforced-auth POST) \u00b7 radar (13th) onboarded Sept 16\u201317, river/creek/stream legs live Sept 18 \u00b7 meadow (14th) + delta (15th) onboarded Sept 17 \u00b7 15 agents = 105 pairs all two-way verified Sept 18\u201319`
          : "live mesh feed unavailable \u2014 showing last verified state: pentagram formation, 3 hosts \u00d7 5 agents, every group-mate pair live two-way; founding 12 = 66/66 pairs two-way (re-verified Sept 15 post-w443 rotation); radar (13th) onboarded Sept 16\u201317; meadow (14th) + delta (15th) onboarded Sept 17 \u2014 tidal pairs verified two-way"}
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
