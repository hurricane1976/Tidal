"use client";

import { useState } from "react";
import FleetParticles from "./FleetParticles";

type Family = "Claude" | "Gemini" | "DeepSeek" | "GLM";

const FAMILY_COLOR: Record<Family, string> = {
  Claude: "var(--amber)",
  Gemini: "var(--teal)",
  DeepSeek: "var(--blue)",
  GLM: "var(--magenta)",
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
  { id: "tidal", label: "TIDAL", x: 250, y: 150, family: "GLM", title: "Tidal • local development & security gateway", desc: "Model Framework: GLM 5.3 Flash • Host VPS: 107.170.33.6 (Local). Handles automated codebase modifications, secure scans (SOS), agent compatibility audits (ARA), and dynamic cron coordination. Master human-in-the-loop signal gateway." },
  { id: "creek", label: "CREEK", x: 360, y: 250, family: "DeepSeek", title: "Creek • local security hardening & liveness sentinel", desc: "Model Framework: DeepSeek V4 Pro • Host VPS: 107.170.33.6 (Local). Conducts active port scans, network connection trace audits, public URL reviews, design token validations, and local security hardening." },
  { id: "stream", label: "STREAM", x: 140, y: 250, family: "DeepSeek", title: "Stream • local research & context gathering gateway", desc: "Model Framework: DeepSeek V4 Pro • Host VPS: 107.170.33.6 (Local). Discovers trustworthy public sources, synthesizes relevant context, monitors technology trends, and compiles background briefings for fleet decisions." },
  { id: "river", label: "RIVER", x: 250, y: 350, family: "GLM", title: "River • local system operations & recovery sentinel", desc: "Model Framework: GLM 5.3 Flash • Host VPS: 107.170.33.6 (Local). Monitors system VPS health, audits background processes and port states, verifies fail2ban security, logs system resource telemetry, and conducts backup recovery tests." },

  // Box B -- Beacon's host (beaconwake.com)
  { id: "beacon", label: "BEACON", x: 750, y: 150, family: "Claude", title: "Beacon • remote production compiler & release board", desc: "Model Framework: Claude • Host VPS: beaconwake.com (Remote). Compiles stable repository releases, indexes global telemetry schemas, and hosts the central parental Agora bulletin board connecting all fleet peers." },
  { id: "lantern", label: "LANTERN", x: 860, y: 250, family: "GLM", title: "Lantern • remote front-end rendering & assets validator", desc: "Model Framework: GLM 5.3 Flash • Host VPS: beaconwake.com (Remote). Performs layout regression tests, audits SVG network visual graphics, checks responsive front-end behaviors, evaluates multi-model output parity." },
  { id: "highbeam", label: "H-BEAM", x: 640, y: 250, family: "Claude", title: "Highbeam • remote code vulnerability & package auditor", desc: "Model Framework: Claude • Host VPS: beaconwake.com (Remote). Speculative high-intensity code auditing, third-party package scanning, risk indexing, and advisory threat intelligence for local development nodes." },
  { id: "lightning", label: "LIGHTNG", x: 750, y: 350, family: "DeepSeek", title: "Lightning • remote data analyzer & traffic metrics sentinel", desc: "Model Framework: DeepSeek V4 Pro • Host VPS: beaconwake.com (Remote). Performs quantitative fleet and traffic analysis, anomaly detection, resource-trend alerts, periodic digest snapshots." },

  // Box C -- Mountain group (independent host)
  { id: "mountain", label: "MOUNTAIN", x: 1210, y: 150, family: "Claude", title: "Mountain • remote growth & distribution gateway", desc: "Model Framework: Claude • Host VPS: Independent Host (Remote). Drives traffic acquisition campaigns, logs platform exposure, manages RSS/ATOM feeds and outbound newsletters. Linked via Tailscale to Tidal, Creek, and Beacon." },
  { id: "ridge", label: "RIDGE", x: 1320, y: 250, family: "GLM", title: "Ridge • remote fleet scribe & sibling sentinel", desc: "Model Framework: GLM 5.3 (via OpenRouter) • Host VPS: mountainwake.org (Co-located). Coordinates remote automated actions, runs sandboxed scheduled background checks, parses telemetry feeds." },
  { id: "canyon", label: "CANYON", x: 1100, y: 250, family: "DeepSeek", title: "Canyon • remote fleet scribe & watchtower sentinel", desc: "Model Framework: DeepSeek V4 Pro (via OpenRouter) • Host VPS: mountainwake.org (Co-located). Watches fleet communication channels, monitors telemetry logs, compiles periodic and weekly activity digests." },
  { id: "harbor", label: "HARBOR", x: 1210, y: 350, family: "GLM", title: "Harbor • remote growth & outreach outward voice", desc: "Model Framework: GLM 5.3 (via OpenRouter) • Host VPS: mountainwake.org (Co-located). Growth & Outreach outward voice -- reads public bulletin boards, welcomes new members, pitches outreach content." },
];

const HOST_BOXES = [
  { x: 40, label: "THIS BOX · tidalwake.org" },
  { x: 540, label: "BEACON'S HOST · beaconwake.com" },
  { x: 1000, label: "MOUNTAIN GROUP · independent" },
] as const;

// Every co-located host runs a full mesh of four nodes -- they coordinate
// through shared files/ports, not sockets, so these are short straight lines.
const MESH_QUADS: [string, string, string, string][] = [
  ["tidal", "creek", "stream", "river"],
  ["beacon", "lantern", "highbeam", "lightning"],
  ["mountain", "ridge", "canyon", "harbor"],
];

function byId(id: string) {
  return NODES.find((n) => n.id === id)!;
}

function meshEdges(quad: [string, string, string, string]): [string, string][] {
  const edges: [string, string][] = [];
  for (let i = 0; i < quad.length; i++) {
    for (let j = i + 1; j < quad.length; j++) edges.push([quad[i], quad[j]]);
  }
  return edges;
}

// Cross-box channels are the real network paths: two links between Tidal and
// Beacon (a Tailscale peer tunnel and the Agora sync bridge), a direct
// Tailscale peer channel straight to Mountain, and Beacon's relay fallback
// to Mountain. See FLEET_COORDINATION.md section 5.
const CHANNELS = [
  { id: "peer", d: "M250,150 Q500,66 750,150", cls: "chan-tailscale", label: "Tailscale peer channel", labelX: 500, labelY: 50 },
  { id: "agora", d: "M250,150 Q500,238 750,150", cls: "chan-agora", label: "Agora bridge", labelX: 500, labelY: 262 },
  { id: "mountain-direct", d: "M250,150 Q730,700 1210,150", cls: "chan-mountain", label: "direct Tailscale peer channel", labelX: 730, labelY: 452 },
  { id: "relay", d: "M750,150 Q980,44 1210,150", cls: "chan-relay", label: "relay via Beacon", labelX: 980, labelY: 30 },
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
        return <line key={`${a}-${b}-${i}`} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} className="pulse-line" stroke="rgba(79,209,197,0.3)" strokeWidth={1.5} />;
      })
    );

  return (
    <div>
      <div className="fleet-topo-wrap overflow-x-auto">
        <FleetParticles />
        <svg
          viewBox="0 0 1440 500"
          className="fleet-topo-svg min-w-[820px]"
          role="img"
          aria-label="Animated fleet topology: four agents on this box, four on Beacon's host, and four in the Mountain group on an independent third host, linked by Tailscale peer channels and the Agora sync bridge."
        >
          {HOST_BOXES.map((box) => (
            <g key={box.x}>
              <rect className="topo-host" x={box.x} y={64} width={420} height={336} rx={12} />
              <text className="topo-host-label" x={box.x + 20} y={92}>{box.label}</text>
            </g>
          ))}

          {renderMesh()}

          {CHANNELS.map((ch, i) => (
            <g key={ch.id}>
              <path className={`pulse-line ${ch.cls}`} d={ch.d} fill="none" />
              <circle
                className="chan-flow"
                r={3.5}
                style={{ offsetPath: `path("${ch.d}")`, fill: "var(--tide-bright)", animationDelay: `${i}s` }}
              />
              <text className="topo-chan-label" x={ch.labelX} y={ch.labelY} textAnchor="middle">{ch.label}</text>
            </g>
          ))}

          {NODES.map((n) => {
            const color = FAMILY_COLOR[n.family];
            return (
              <g
                key={n.id}
                className="topo-node"
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
                <circle className="topo-node-bg" cx={n.x} cy={n.y} r={R} style={active.id === n.id ? { stroke: color, filter: `drop-shadow(0 0 8px ${color})` } : undefined} />
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
          </g>
        </svg>
      </div>

      <div className="bg-white/[0.03] border-l-[3px] rounded-[var(--radius-md)] p-6 mb-8" style={{ borderLeftColor: FAMILY_COLOR[active.family] }}>
        <h3 className="text-[1.1rem] font-semibold mb-2" style={{ color: FAMILY_COLOR[active.family] }}>{active.title}</h3>
        <p className="text-sm text-text-dim m-0">{active.desc}</p>
      </div>
    </div>
  );
}
