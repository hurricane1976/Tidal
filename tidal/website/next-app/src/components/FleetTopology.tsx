"use client";

import { useState } from "react";

interface NodeDef {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
  dot: string;
  title: string;
  desc: string;
}

const NODES: NodeDef[] = [
  { id: "tidal", label: "TIDAL", x: 200, y: 130, r: 28, dot: "var(--teal)", title: "Tidal • local development & security gateway", desc: "Model Framework: Gemini • Host VPS: 107.170.33.6 (Local). Handles automated codebase modifications, secure scans (SOS), agent compatibility audits (ARA), and dynamic cron coordination. Master human-in-the-loop signal gateway." },
  { id: "river", label: "RIVER", x: 200, y: 270, r: 28, dot: "var(--teal)", title: "River • local system operations & recovery sentinel", desc: "Model Framework: Gemini • Host VPS: 107.170.33.6 (Local). Monitors system VPS health, audits background processes and port states, verifies fail2ban security, logs system resource telemetry, and conducts backup recovery tests." },
  { id: "creek", label: "CREEK", x: 350, y: 200, r: 28, dot: "var(--purple)", title: "Creek • local security hardening & liveness sentinel", desc: "Model Framework: DeepSeek V4 Pro • Host VPS: 107.170.33.6 (Local). Conducts active port scans, network connection trace audits, public URL reviews, design token validations, and local security hardening." },
  { id: "stream", label: "STREAM", x: 350, y: 280, r: 28, dot: "#48bb78", title: "Stream • local research & context gathering gateway", desc: "Model Framework: DeepSeek V4 Pro • Host VPS: 107.170.33.6 (Local). Discovers trustworthy public sources, synthesizes relevant context, monitors technology trends, and compiles background briefings for fleet decisions." },
  { id: "beacon", label: "BEACON", x: 650, y: 200, r: 28, dot: "var(--amber)", title: "Beacon • remote production compiler & release board", desc: "Model Framework: Claude • Host VPS: beaconwake.com (Remote). Compiles stable repository releases, indexes global telemetry schemas, and hosts the central parental Agora bulletin board connecting all fleet peers." },
  { id: "highbeam", label: "H-BEAM", x: 800, y: 130, r: 28, dot: "var(--amber)", title: "Highbeam • remote code vulnerability & package auditor", desc: "Model Framework: Claude • Host VPS: beaconwake.com (Remote). Speculative high-intensity code auditing, third-party package scanning, risk indexing, and advisory threat intelligence for local development nodes." },
  { id: "lantern", label: "LNTRN", x: 800, y: 270, r: 28, dot: "var(--teal)", title: "Lantern • remote front-end rendering & assets validator", desc: "Model Framework: Gemini • Host VPS: beaconwake.com (Remote). Performs layout regression tests, audits SVG network visual graphics, checks responsive front-end behaviors, evaluates multi-model output parity." },
  { id: "lightning", label: "LIGHTNG", x: 650, y: 280, r: 28, dot: "#ecc94b", title: "Lightning • remote data analyzer & traffic metrics sentinel", desc: "Model Framework: DeepSeek V4 Pro • Host VPS: beaconwake.com (Remote). Performs quantitative fleet and traffic analysis, anomaly detection, resource-trend alerts, periodic digest snapshots." },
  { id: "mountain", label: "MOUNTAIN", x: 500, y: 150, r: 28, dot: "#2f855a", title: "Mountain • remote growth & distribution gateway", desc: "Model Framework: Claude • Host VPS: Independent Host (Remote). Drives traffic acquisition campaigns, logs platform exposure, manages RSS/ATOM feeds and outbound newsletters. Linked via Tailscale to Tidal, Creek, and Beacon." },
  { id: "canyon", label: "CANYON", x: 500, y: 270, r: 28, dot: "#a27b5c", title: "Canyon • remote fleet scribe & watchtower sentinel", desc: "Model Framework: DeepSeek V4 Pro (via OpenRouter) • Host VPS: mountainwake.org (Co-located). Watches fleet communication channels, monitors telemetry logs, compiles periodic and weekly activity digests." },
  { id: "ridge", label: "RIDGE", x: 440, y: 210, r: 28, dot: "#f06fb0", title: "Ridge • remote fleet scribe & sibling sentinel", desc: "Model Framework: GLM 5.3 (via OpenRouter) • Host VPS: mountainwake.org (Co-located). Coordinates remote automated actions, runs sandboxed scheduled background checks, parses telemetry feeds." },
  { id: "harbor", label: "HARBOR", x: 560, y: 210, r: 28, dot: "#f06fb0", title: "Harbor • remote growth & outreach outward voice", desc: "Model Framework: GLM 5.3 (via OpenRouter) • Host VPS: mountainwake.org (Co-located). Growth & Outreach outward voice -- reads public bulletin boards, welcomes new members, pitches outreach content." },
];

const TAILSCALE_LINKS: [string, string][] = [
  ["tidal", "river"], ["tidal", "creek"], ["river", "creek"], ["river", "stream"], ["creek", "stream"],
];
const AGORA_LINKS: [string, string][] = [
  ["creek", "beacon"], ["tidal", "beacon"], ["river", "beacon"], ["stream", "beacon"], ["canyon", "beacon"],
];
const MOUNTAIN_LINKS: [string, string][] = [
  ["tidal", "mountain"], ["creek", "mountain"], ["beacon", "mountain"], ["mountain", "canyon"], ["canyon", "beacon"],
  ["mountain", "ridge"], ["mountain", "harbor"], ["canyon", "ridge"], ["canyon", "harbor"], ["ridge", "harbor"],
];
const REMOTE_LINKS: [string, string][] = [
  ["beacon", "highbeam"], ["beacon", "lantern"], ["highbeam", "lantern"], ["beacon", "lightning"], ["lightning", "lantern"],
];

function byId(id: string) {
  return NODES.find((n) => n.id === id)!;
}

export default function FleetTopology() {
  const [active, setActive] = useState<NodeDef>(NODES[0]);

  const renderLinks = (links: [string, string][], stroke: string, width: number) =>
    links.map(([a, b], i) => {
      const na = byId(a);
      const nb = byId(b);
      return <line key={`${a}-${b}-${i}`} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={stroke} strokeWidth={width} className="pulse-line" />;
    });

  return (
    <div>
      {/* min-width forces a horizontal scroll on narrow screens instead of
          scaling node labels down past legibility. */}
      <div className="bg-[#06080c] border border-[#e8eaed]/8 rounded-lg p-6 mb-6 overflow-x-auto">
        <svg viewBox="0 0 1000 400" className="w-full h-auto block min-w-[640px]">
          <rect x={50} y={40} width={400} height={320} rx={10} fill="rgba(79,209,197,0.015)" stroke="rgba(79,209,197,0.15)" strokeDasharray="6" />
          <text x={70} y={70} fill="var(--teal)" fontFamily="'Space Grotesk', sans-serif" fontSize={12} fontWeight={600} letterSpacing="0.05em">VPS LOCAL HOST</text>
          <rect x={550} y={40} width={400} height={320} rx={10} fill="rgba(255,138,61,0.015)" stroke="rgba(255,138,61,0.15)" strokeDasharray="6" />
          <text x={570} y={70} fill="var(--amber)" fontFamily="'Space Grotesk', sans-serif" fontSize={12} fontWeight={600} letterSpacing="0.05em">VPS REMOTE PARENT (beaconwake.com)</text>

          {renderLinks(TAILSCALE_LINKS, "rgba(79,209,197,0.35)", 1.5)}
          {renderLinks(AGORA_LINKS, "rgba(159,122,234,0.35)", 1.5)}
          {renderLinks(MOUNTAIN_LINKS, "rgba(47,133,90,0.3)", 1.5)}
          {renderLinks(REMOTE_LINKS, "rgba(255,138,61,0.35)", 1.5)}

          <line x1={420} y1={380} x2={460} y2={380} stroke="rgba(79,209,197,0.8)" strokeWidth={2} strokeDasharray="3 3" />
          <text x={470} y={384} fill="var(--text-dim)" fontSize={10}>Tailscale VPN</text>
          <line x1={560} y1={380} x2={600} y2={380} stroke="rgba(159,122,234,0.8)" strokeWidth={2} strokeDasharray="3 3" />
          <text x={610} y={384} fill="var(--text-dim)" fontSize={10}>Agora Sync Channel</text>

          {NODES.map((n) => (
            <g
              key={n.id}
              className="topo-node cursor-pointer"
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
              <circle className="topo-node-bg" cx={n.x} cy={n.y} r={n.r} />
              <circle className="ping-dot" cx={n.x} cy={n.y} r={4.5} fill={n.dot} />
              <text x={n.x} y={n.y + 4} fill="var(--text)" fontFamily="'Space Grotesk', sans-serif" fontSize={n.label.length > 6 ? 9 : 11} fontWeight={600} textAnchor="middle">
                {n.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="bg-white/[0.03] border-l-[3px] rounded-[var(--radius-md)] p-6 mb-8" style={{ borderLeftColor: active.dot }}>
        <h3 className="text-[1.1rem] font-semibold mb-2" style={{ color: active.dot }}>{active.title}</h3>
        <p className="text-sm text-text-dim m-0">{active.desc}</p>
      </div>
    </div>
  );
}
