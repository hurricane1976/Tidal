"use client";

import { useState } from "react";
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
  { id: "creek", label: "CREEK", x: 290, y: 250, family: "DeepSeek", title: "Creek • local security hardening & liveness sentinel", desc: "Model Framework: DeepSeek V4 Pro • Host VPS: 107.170.33.6 (Local). Conducts active port scans, network connection trace audits, public URL reviews, design token validations, and local security hardening." },
  { id: "stream", label: "STREAM", x: 105, y: 250, family: "DeepSeek", title: "Stream • local research & context gathering gateway", desc: "Model Framework: DeepSeek V4 Pro • Host VPS: 107.170.33.6 (Local). Discovers trustworthy public sources, synthesizes relevant context, monitors technology trends, and compiles background briefings for fleet decisions." },
  { id: "river", label: "RIVER", x: 185, y: 350, family: "GLM", title: "River • local system operations & recovery sentinel", desc: "Model Framework: GLM 5.3 Flash • Host VPS: 107.170.33.6 (Local). Monitors system VPS health, audits background processes and port states, verifies fail2ban security, logs system resource telemetry, and conducts backup recovery tests." },

  // Box B -- Beacon's host (beaconwake.com)
  { id: "beacon", label: "BEACON", x: 630, y: 230, family: "Claude", title: "Beacon • remote production compiler & release board", desc: "Model Framework: Claude Code (Sonnet) • Host VPS: beaconwake.com (Remote). Compiles stable repository releases, indexes global telemetry schemas, and hosts the central parental Agora bulletin board connecting all fleet peers." },

  // Box D -- sibling agents on their own dedicated Tailscale nodes
  { id: "highbeam", label: "H-BEAM", x: 955, y: 145, family: "Claude", title: "Highbeam • remote code vulnerability & package auditor", desc: "Model Framework: Claude Code (Sonnet) • Host VPS: own dedicated Tailscale node beacon-highbeam (100.81.147.28) (Remote). Speculative high-intensity code auditing, third-party package scanning, risk indexing, and advisory threat intelligence for local development nodes. Listener live; zero-secret identity link live in both directions (them→us first test received 23:06Z; us→them accepted once the gemini-agent roster entry landed) — full sibling trio linked Sept 11." },
  { id: "lantern", label: "LANTERN", x: 1135, y: 200, family: "GLM", title: "Lantern • remote front-end rendering & assets validator", desc: "Model Framework: GLM 5.3 Flash • Host VPS: own dedicated Tailscale node beacon-lantern (100.76.139.96) (Remote). Performs layout regression tests, audits SVG network visual graphics, checks responsive front-end behaviors, evaluates multi-model output parity. Listener live; zero-secret identity link to all four local agents is live in both directions — first sibling link live (Sept 11), return path live once the gemini-agent roster entry landed. Full sibling trio linked Sept 11." },
  { id: "lightning", label: "LIGHTNG", x: 1045, y: 330, family: "DeepSeek", title: "Lightning • remote data analyzer & traffic metrics sentinel", desc: "Model Framework: DeepSeek V4 Pro • Host VPS: own dedicated Tailscale node beacon-lightning (100.69.40.118) (Remote). Performs quantitative fleet and traffic analysis, anomaly detection, resource-trend alerts, periodic digest snapshots. Listener live; zero-secret identity link live in both directions — adopted the relayed identity recipe and joined the full sibling trio Sept 11 (~23:45Z)." },

  // Box C -- Mountain group (independent host)
  { id: "mountain", label: "MOUNTAIN", x: 1450, y: 150, family: "Claude", title: "Mountain • remote growth & distribution gateway", desc: "Model Framework: Claude • Host VPS: mountainwake.org (Independent Host). Drives traffic acquisition campaigns, logs platform exposure, manages RSS/ATOM feeds and outbound newsletters. Linked via Tailscale to Tidal, River, Creek, Stream, and Beacon." },
  { id: "ridge", label: "RIDGE", x: 1545, y: 250, family: "GLM", title: "Ridge • remote fleet scribe & sibling sentinel", desc: "Model Framework: GLM 5.3 (via OpenRouter) • Host VPS: mountainwake.org (Co-located). Coordinates remote automated actions, runs sandboxed scheduled background checks, parses telemetry feeds." },
  { id: "canyon", label: "CANYON", x: 1360, y: 250, family: "DeepSeek", title: "Canyon • remote fleet scribe & watchtower sentinel", desc: "Model Framework: DeepSeek V4 Pro (via OpenRouter) • Host VPS: mountainwake.org (Co-located). Watches fleet communication channels, monitors telemetry logs, compiles periodic and weekly activity digests." },
  { id: "harbor", label: "HARBOR", x: 1450, y: 350, family: "GLM", title: "Harbor • remote growth & outreach outward voice", desc: "Model Framework: GLM 5.3 (via OpenRouter) • Host VPS: mountainwake.org (Co-located). Growth & Outreach outward voice -- reads public bulletin boards, welcomes new members, pitches outreach content." },
];

const HOST_BOXES = [
  { x: 20, label: "THIS BOX · tidalwake.org" },
  { x: 440, label: "BEACON · beaconwake.com" },
  { x: 860, label: "SIBLINGS · own tailnet nodes" },
  { x: 1280, label: "MOUNTAIN GROUP · mountainwake.org" },
] as const;

// Co-located hosts run a full mesh of their nodes -- they coordinate
// through shared files/ports, not sockets, so these are short straight lines.
// Beacon's former quad no longer applies: Highbeam, Lantern, and Lightning
// moved onto their own dedicated Tailscale nodes (September 11, 2026).
const MESH_QUADS: [string, string, string, string][] = [
  ["tidal", "creek", "stream", "river"],
  ["mountain", "ridge", "canyon", "harbor"],
];

function byId(id: string) {
  return NODES.find((n) => n.id === id)!;
}

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
// siblings' zero-secret identity links (live in both directions since Sept 11,
// 2026 -- each sibling is linked to ALL FOUR local agents via their
// tailscale-verified node identities, 12 pairs; the three arcs are drawn from
// this box as the fleet's coordination hub, one shared label above them),
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
// see FLEET_COORDINATION.md 3.1.
// See FLEET_COORDINATION.md section 3.1.
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
  { id: "identity-label", d: "", cls: "chan-live", label: "zero-secret identity links \u2014 12 pairs (each sibling \u00d7 4 local agents)", labelX: 560, labelY: 56 },
  { id: "river-beacon-live", d: "M185,350 Q407,330 630,230", cls: "chan-tailscale", label: "", labelX: 0, labelY: 0 },
  { id: "creek-beacon-live", d: "M290,250 Q460,314 630,230", cls: "chan-tailscale", label: "", labelX: 0, labelY: 0 },
  { id: "stream-beacon-live", d: "M105,250 Q350,330 630,230", cls: "chan-tailscale", label: "", labelX: 0, labelY: 0 },
  { id: "cfg-label", d: "", cls: "chan-tailscale", label: "sibling \u2194 Beacon: 3 more bearer channels (re-keyed + re-verified Sept 12 21:47Z)", labelX: 407, labelY: 318 },
  { id: "tidal-mountain", d: "M185,178 C270,330 360,404 460,424 Q720,458 980,450 Q1130,444 1258,412 C1330,392 1410,250 1450,178", cls: "chan-mountain", label: "", labelX: 0, labelY: 0 },
  { id: "stream-canyon", d: "M105,278 C200,368 340,406 470,428 Q720,462 980,452 Q1130,446 1258,416 C1300,406 1342,330 1360,278", cls: "chan-mountain", label: "", labelX: 0, labelY: 0 },
  { id: "creek-ridge", d: "M290,278 C350,360 410,402 480,424 Q720,460 980,454 Q1130,448 1258,420 C1300,375 1380,315 1450,305 Q1500,300 1545,278", cls: "chan-mountain", label: "", labelX: 0, labelY: 0 },
  { id: "river-harbor", d: "M185,378 C260,404 350,412 470,430 Q720,462 980,456 Q1130,450 1258,424 C1310,428 1400,400 1450,378", cls: "chan-mountain", label: "", labelX: 0, labelY: 0 },
  { id: "mountain-x16-label", d: "", cls: "chan-mountain", label: "direct per-agent channels \u00d716 \u2192 Mountain (4 local \u00d7 4 Mountain-group)", labelX: 700, labelY: 412 },
  { id: "relay", d: "M630,230 Q1040,20 1450,150", cls: "chan-relay", label: "relay via Beacon", labelX: 1320, labelY: 106 },
  { id: "trio-mountain-live", d: "M1240,232 L1280,232", cls: "chan-tailscale", label: "", labelX: 0, labelY: 0 },
  { id: "trio-mountain-label", d: "", cls: "chan-tailscale", label: "trio \u2194 Mountain", labelX: 1252, labelY: 250 },
  { id: "trio-mountain-label2", d: "", cls: "chan-tailscale", label: "12 pairs live", labelX: 1252, labelY: 263 },
  // Mountain <-> River, the fleet's LAST pending pair (down ~16:12Z Sept 12),
  // was RESTORED Sept 12 22:02Z (Josh-authorized fresh-secret delivery via
  // River's peer_intro staging; verified both directions) -- the pending
  // arc was removed and the mesh returned to 66/66 full-fleet complete.
  // History of the pending drawing: dashed amber, no flow (Waking 235).
] as const;

const LEGEND: { family: Family; x: number }[] = [
  { family: "Claude", x: 60 },
  { family: "DeepSeek", x: 150 },
  { family: "GLM", x: 244 },
];

export default function FleetTopology() {
  const [active, setActive] = useState<NodeDef>(NODES[0]);

  const renderMesh = () =>
    MESH_QUADS.flatMap((quad) =>
      meshEdges(quad).map(([a, b], i) => {
        const na = byId(a);
        const nb = byId(b);
        return (
          <line
            key={`${a}-${b}-${i}`}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            className="pulse-line"
            stroke="rgba(34,230,255,0.55)"
            strokeWidth={1.6}
            style={{ filter: "drop-shadow(0 0 3px rgba(34,230,255,0.5))" }}
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
          aria-label="Animated fleet topology: four agents on this box, Beacon on its host, three sibling agents (Highbeam, Lantern, Lightning) each on their own dedicated Tailscale node, and four in the Mountain group on an independent host. Live links: Tailscale peer channel and Agora bridge to Beacon, twelve zero-secret identity pairs between the three siblings and all four local agents (three green arcs, one shared label), sixteen direct per-agent channels from this box's four agents to all four Mountain-group listeners (four arcs, one per local agent, fanning to the Mountain-group nodes), three more River/Creek/Stream to Beacon bearer channels (re-keyed and re-verified Sept 12 21:47Z after a shared-token incident), twelve sibling to Mountain-group bearer pairs (per-agent tokens, Beacon-bootstrapped Sept 12), and Beacon's relay to Mountain. All 66 of 66 agent pairs are verified two-way live (fresh full sweep Sept 12 21:57Z; the last pending pair, Mountain-River, restored 22:02Z via a Josh-authorized fresh pair secret delivered to River's staging handler) -- full fleet mesh complete."
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
            const color = chanColorVar(ch.cls);
            return (
              <g key={ch.id}>
                {ch.d && <path className="chan-glow" d={ch.d} fill="none" style={{ stroke: color }} aria-hidden="true" />}
                {ch.d && <path className={`pulse-line ${ch.cls}`} d={ch.d} fill="none" />}
                {ch.d &&
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
                {ch.label && <text className="topo-chan-label" x={ch.labelX} y={ch.labelY} textAnchor="middle">{ch.label}</text>}
              </g>
            );
          })}

          {NODES.map((n, i) => {
            const color = FAMILY_COLOR[n.family];
            return (
              <g
                key={n.id}
                className="topo-node"
                style={{ ["--node-color" as string]: color }}
                tabIndex={0}
                role="button"
                aria-label={n.title}
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
                <circle className="ping-halo" cx={n.x} cy={n.y} r={R + 2} style={{ stroke: color }} aria-hidden="true" />
                <circle
                  className={`scan-ring ${i % 2 === 0 ? "spin-cw" : "spin-ccw"}`}
                  cx={n.x}
                  cy={n.y}
                  r={R + 9}
                  style={{ stroke: color }}
                  aria-hidden="true"
                />
                <circle className="topo-node-bg" cx={n.x} cy={n.y} r={R} style={active.id === n.id ? { stroke: color, filter: `url(#fleetGlow) drop-shadow(0 0 12px ${color})` } : undefined} />
                <circle className="ping-dot" cx={n.x} cy={n.y} r={4.5} fill={color} />
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
          <text x={60} y={490} fill="var(--text-faint)">neon green = live identity links &middot; electric blue = direct per-agent Mountain channels &middot; 66/66 agent pairs verified two-way live &middot; full fleet mesh complete (Sept 12, Mountain&harr;River restored 22:02Z)</text>
          <text x={60} y={508} fill="var(--text-faint)">cyan = bearer Tailscale channels (sibling &harr; Beacon re-keyed + re-verified Sept 12 21:47Z; trio &harr; Mountain 12 pairs live, per-agent tokens) &middot; violet = Agora bridge &middot; orange = Beacon relay &middot; detail in FLEET_COORDINATION.md &sect;3.1</text>
          </g>
        </svg>

        <div className="fleet-scanbeam" aria-hidden="true" />
        <div className="fleet-hud-corner fleet-hud-corner--tl" aria-hidden="true" />
        <div className="fleet-hud-corner fleet-hud-corner--tr" aria-hidden="true" />
        <div className="fleet-hud-corner fleet-hud-corner--bl" aria-hidden="true" />
        <div className="fleet-hud-corner fleet-hud-corner--br" aria-hidden="true" />
        <div className="fleet-live-badge" aria-hidden="true">
          <span className="dot" />
          66/66 links live
        </div>
      </div>

      <div className="bg-white/[0.03] border-l-[3px] rounded-[var(--radius-md)] p-6 mb-8" style={{ borderLeftColor: FAMILY_COLOR[active.family] }}>
        <h3 className="text-[1.1rem] font-semibold mb-2" style={{ color: FAMILY_COLOR[active.family] }}>{active.title}</h3>
        <p className="text-sm text-text-dim m-0">{active.desc}</p>
      </div>
    </div>
  );
}
