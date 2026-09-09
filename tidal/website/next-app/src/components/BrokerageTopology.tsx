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
  { id: "client", label: "CLIENT", x: 100, y: 125, r: 24, dot: "var(--teal)", title: "Client request & ingestion endpoint", desc: "Clients securely transmit request parameters (target URLs, source code, auditing frequency) via HTTP REST APIs or Telegram payloads. The endpoint authenticates requests against configured client tokens." },
  { id: "tidal", label: "TIDAL", x: 350, y: 125, r: 26, dot: "var(--teal)", title: "Tidal broker & task orchestrator", desc: "The coordinating brain: parses the client specification into isolated sub-task contracts (port audit, health verify, context lookup), runs real-time liveness queries against sibling nodes, and routes tasks dynamically." },
  { id: "river", label: "RIVER", x: 650, y: 50, r: 22, dot: "var(--blue)", title: "River SysOps executor node", desc: "Specialized in system state, package health, VPS parameters, and cert status. Executes server audit scripts and returns structured validation objects." },
  { id: "creek", label: "CREEK", x: 650, y: 125, r: 22, dot: "var(--purple)", title: "Creek security & vulnerability sentinel", desc: "Specialized in target port auditing, external network exposure checks, and dependency safety audits. Delivers multi-model security verification ratings." },
  { id: "stream", label: "STRM/LTG", x: 650, y: 200, r: 22, dot: "var(--amber)", title: "Stream & Lightning analytics nodes", desc: "Stream gathers dynamic threat-intel feeds and web context, while Lightning tracks comparative VPS network traffic trends. Combined: threat analysis and live telemetry." },
  { id: "agora", label: "AGORA", x: 900, y: 125, r: 24, dot: "var(--teal)", title: "Agora cross-VPS consensus ledger", desc: "The immutable execution database. Sub-agents commit cryptographic hash proofs of completed executions, bidirectionally cross-posted. Clients can query Agora to verify independent liveness metrics." },
];

function byId(id: string) {
  return NODES.find((n) => n.id === id)!;
}

const LINKS: [string, string, string][] = [
  ["client", "tidal", "rgba(79,209,197,0.4)"],
  ["tidal", "river", "rgba(159,122,234,0.4)"],
  ["tidal", "creek", "rgba(159,122,234,0.4)"],
  ["tidal", "stream", "rgba(159,122,234,0.4)"],
  ["river", "agora", "rgba(255,138,61,0.4)"],
  ["creek", "agora", "rgba(255,138,61,0.4)"],
  ["stream", "agora", "rgba(255,138,61,0.4)"],
];

export default function BrokerageTopology() {
  const [active, setActive] = useState<NodeDef>(NODES[1]);

  return (
    <div>
      <div className="bg-[#06080c] border border-[#e8eaed]/8 rounded-lg p-6 mb-6">
        <svg viewBox="0 0 1000 250" className="w-full h-auto block">
          {LINKS.map(([a, b, color], i) => {
            const na = byId(a);
            const nb = byId(b);
            return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={color} strokeWidth={a === "client" ? 2 : 1.5} className="pulse-line" />;
          })}
          <circle r={4.5} fill="var(--teal)">
            <animateMotion dur="6s" repeatCount="indefinite" path="M120,125 L320,125 L620,125 L870,125" />
          </circle>
          <circle r={4.5} fill="var(--purple)">
            <animateMotion dur="8s" repeatCount="indefinite" path="M120,125 L320,125 L620,50 L870,125" />
          </circle>
          <circle r={4.5} fill="var(--amber)">
            <animateMotion dur="7s" repeatCount="indefinite" path="M120,125 L320,125 L620,200 L870,125" />
          </circle>
          {NODES.map((n) => (
            <g key={n.id} className="topo-node cursor-pointer" tabIndex={0} role="button" aria-label={n.title} onMouseEnter={() => setActive(n)} onFocus={() => setActive(n)} onClick={() => setActive(n)}>
              <circle className="ping-halo" cx={n.x} cy={n.y} r={n.r + 2} style={{ stroke: n.dot }} aria-hidden="true" />
              <circle className="topo-node-bg" cx={n.x} cy={n.y} r={n.r} />
              <circle className="ping-dot" cx={n.x} cy={n.y} r={4} fill={n.dot} />
              <text x={n.x} y={n.y + 4} fill="var(--text)" fontFamily="'Space Grotesk', sans-serif" fontSize={n.label.length > 6 ? 7 : 9} fontWeight={600} textAnchor="middle">
                {n.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="bg-white/[0.03] border-l-[3px] rounded-[var(--radius-md)] p-6 mb-10" style={{ borderLeftColor: active.dot }}>
        <h3 className="text-[1.1rem] font-semibold mb-2" style={{ color: active.dot }}>{active.title}</h3>
        <p className="text-sm text-text-dim m-0">{active.desc}</p>
      </div>
    </div>
  );
}
