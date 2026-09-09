"use client";

import { useEffect, useRef, useState } from "react";
import type { SystemStatus } from "@/lib/data";

const POLL_MS = 5000;
const WAVE_POINTS = 50;

interface NodeMeta {
  name: string;
  host: string;
  port: number;
  defaultMs: number;
  type: "LOCAL" | "REMOTE";
  desc: string;
}

const NODES: NodeMeta[] = [
  { name: "tidal", host: "127.0.0.1", port: 8888, defaultMs: 14, type: "LOCAL", desc: "GLM 5.3 Flash (Local Dev)" },
  { name: "river", host: "100.91.42.51", port: 8788, defaultMs: 18, type: "LOCAL", desc: "Gemini (Local SysOps)" },
  { name: "creek", host: "100.91.42.51", port: 8789, defaultMs: 26, type: "LOCAL", desc: "DeepSeek (Local Sec)" },
  { name: "stream", host: "100.91.42.51", port: 8790, defaultMs: 22, type: "LOCAL", desc: "Gemini (Local Pub)" },
  { name: "beacon", host: "100.99.217.90", port: 8787, defaultMs: 54, type: "REMOTE", desc: "Claude (Remote Ops)" },
  { name: "highbeam", host: "beaconwake.com", port: 443, defaultMs: 58, type: "REMOTE", desc: "Claude (Remote Sec)" },
  { name: "lantern", host: "beaconwake.com", port: 443, defaultMs: 62, type: "REMOTE", desc: "Gemini (Remote UI)" },
  { name: "lightning", host: "beaconwake.com", port: 443, defaultMs: 52, type: "REMOTE", desc: "DeepSeek (Remote Data)" },
  { name: "mountain", host: "100.114.14.116", port: 8787, defaultMs: 68, type: "REMOTE", desc: "Claude (Remote Growth)" },
  { name: "canyon", host: "100.114.14.116", port: 8791, defaultMs: 68, type: "REMOTE", desc: "DeepSeek (Remote Scribe)" },
  { name: "ridge", host: "100.114.14.116", port: 8792, defaultMs: 68, type: "REMOTE", desc: "GLM 5.3 (Remote Sibling)" },
  { name: "harbor", host: "100.114.14.116", port: 8793, defaultMs: 68, type: "REMOTE", desc: "GLM 5.3 (Outward Voice)" },
];

function pingColor(ms: number) {
  if (ms < 30) return "var(--teal)";
  if (ms < 100) return "var(--purple)";
  return "var(--amber)";
}

function svgPath(data: number[]) {
  const step = 500 / (WAVE_POINTS - 1);
  return data
    .map((val, idx) => {
      const x = idx * step;
      const y = 140 - (val / 100) * 130;
      return `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

interface Props {
  initialSystem: SystemStatus;
  initialLatencies: Record<string, number>;
  initialComplianceScore: number;
  activeSocketsCount: number;
  remediationsCount: number;
  openWarningsCount: number;
  listeningPorts: { interface?: string; port: number }[];
}

export default function SecOpsConsole({
  initialSystem, initialLatencies, initialComplianceScore,
  activeSocketsCount, remediationsCount, openWarningsCount, listeningPorts,
}: Props) {
  const [system, setSystem] = useState(initialSystem);
  const [latencies, setLatencies] = useState(initialLatencies);
  const [measuredAt, setMeasuredAt] = useState("Snapshot");
  const [complianceDisplay, setComplianceDisplay] = useState(0);
  const [cpuData, setCpuData] = useState<number[]>(() => Array.from({ length: WAVE_POINTS }, (_, i) => Math.max(2, Math.min(95, 10 + Math.sin(i * 0.3) * 5))));
  const [memData, setMemData] = useState<number[]>(() => Array(WAVE_POINTS).fill(initialSystem.mem_pct));
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [terminalLines, setTerminalLines] = useState<{ text: string; color: string }[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  const cpuLoad1 = parseFloat(system.cpu.split(",")[0]) || 0;
  const cpuPct = Math.max(2, Math.min(100, Math.round(cpuLoad1 * 50)));

  // Compliance ring: animate the stroke offset + counter from 0 -> score.
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const [ringOffset, setRingOffset] = useState(circumference);
  useEffect(() => {
    const t = setTimeout(() => {
      setRingOffset(circumference - (initialComplianceScore / 100) * circumference);
      const duration = 2000;
      const interval = 30;
      const step = initialComplianceScore / (duration / interval);
      let current = 0;
      const counter = setInterval(() => {
        current += step;
        if (current >= initialComplianceScore) {
          current = initialComplianceScore;
          clearInterval(counter);
        }
        setComplianceDisplay(Math.round(current));
      }, interval);
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live poll: same /api/telemetry endpoint the old inline script hit.
  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/telemetry", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.latencies) setLatencies(data.latencies);
        if (data.measured_at) setMeasuredAt(data.measured_at);
        if (data.system) setSystem((prev) => ({ ...prev, ...data.system }));

        const load1 = data.system?.cpu ? parseFloat(String(data.system.cpu).split(",")[0]) || 0 : 0;
        const nextCpu = Math.max(2, Math.min(100, Math.round(load1 * 50)));
        const nextMem = typeof data.system?.mem_pct === "number" ? data.system.mem_pct : memData[memData.length - 1];
        setCpuData((d) => [...d.slice(1), nextCpu]);
        setMemData((d) => [...d.slice(1), nextMem]);
      } catch {
        setCpuData((d) => [...d.slice(1), d[d.length - 1]]);
      }
    }
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runScan() {
    setScanning(true);
    setScanProgress(0);
    setTerminalLines([{ text: "[RUNNING] Spawning full system and security scan audit subprocess...", color: "var(--amber)" }]);
    const progInterval = setInterval(() => setScanProgress((p) => Math.min(95, p + 4)), 150);
    try {
      const res = await fetch("/api/telemetry?scan=1", { cache: "no-store" });
      clearInterval(progInterval);
      if (!res.ok) {
        setTerminalLines((l) => [...l, { text: `[ERROR] Remote execution returned status ${res.status}. Execution halted.`, color: "#ff5f56" }]);
        setScanning(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setTerminalLines([{ text: `[SUCCESS] Live scan compiled successfully! Compliance score: ${data.score}/100`, color: "var(--teal)" }]);
        const lines: string[] = String(data.output || "").split("\n").map((l: string) => l.trim()).filter(Boolean);
        let idx = 0;
        const printNext = () => {
          if (idx < lines.length) {
            setTerminalLines((l) => [...l, { text: lines[idx], color: "var(--text-dim)" }]);
            idx++;
            setTimeout(printNext, 40);
          } else {
            setScanning(false);
          }
        };
        printNext();
      } else {
        setTerminalLines((l) => [...l, { text: `[FAILED] Subprocess returned error: ${data.error}`, color: "#ff5f56" }]);
        setScanning(false);
      }
    } catch (e) {
      clearInterval(progInterval);
      setTerminalLines((l) => [...l, { text: `[ERROR] Request failed: ${String(e)}`, color: "#ff5f56" }]);
      setScanning(false);
    }
  }

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [terminalLines, scanProgress]);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-surface border border-[#e8eaed]/8 border-l-[3px] border-l-teal-accent rounded-[var(--radius-md)] p-6 flex flex-col items-center text-center">
          <div className="font-mono text-[0.72rem] text-text-faint uppercase tracking-[0.1em] mb-3">Unified security compliance</div>
          <div className="relative w-[120px] h-[120px] mb-2">
            <svg viewBox="0 0 120 120" className="w-[120px] h-[120px]">
              <circle cx={60} cy={60} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
              <circle
                cx={60} cy={60} r={radius} fill="none" stroke="var(--teal)" strokeWidth={6}
                strokeDasharray={circumference} strokeDashoffset={ringOffset} strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 2s var(--ease-expo, cubic-bezier(.16,1,.3,1))", transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
              />
              <text x={60} y={66} fontFamily="'Space Grotesk', sans-serif" fontSize={20} fontWeight={700} fill="var(--teal)" textAnchor="middle">{complianceDisplay}%</text>
            </svg>
          </div>
          <div className="text-sm text-text-dim">Score based on 5 parameters</div>
        </div>

        <div className="bg-surface border border-[#e8eaed]/8 border-l-[3px] border-l-[var(--tide)] rounded-[var(--radius-md)] p-6">
          <div className="font-mono text-[0.72rem] text-text-faint uppercase tracking-[0.1em] mb-4">Host resource gauges</div>
          {[
            { label: "CPU load average", val: system.cpu, pct: cpuPct, color: "var(--teal)" },
            { label: `Memory usage (${system.mem_used} / ${system.mem_total})`, val: `${system.mem_pct}%`, pct: system.mem_pct, color: "var(--tide)" },
            { label: `Disk space (${system.disk_used} / ${system.disk_total})`, val: `${system.disk_pct}%`, pct: system.disk_pct, color: "var(--amber)" },
          ].map((row) => (
            <div key={row.label} className="mb-3.5 last:mb-0">
              <div className="flex justify-between text-[0.8rem] text-text-dim mb-1">
                <span>{row.label}</span>
                <span>{row.val}</span>
              </div>
              <div className="bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div className="h-full transition-[width] duration-700" style={{ width: `${row.pct}%`, background: row.color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-surface border border-[#e8eaed]/8 border-l-[3px] border-l-amber-accent rounded-[var(--radius-md)] p-6">
          <div className="font-mono text-[0.72rem] text-text-faint uppercase tracking-[0.1em] mb-3">Active security metrics</div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[
              ["Active sockets", activeSocketsCount, "var(--teal)"],
              ["Remediations", remediationsCount, "var(--tide)"],
              ["Open warnings", openWarningsCount, "var(--amber)"],
              ["Host uptime", system.uptime, "var(--text-dim)"],
            ].map(([label, val, color]) => (
              <div key={label as string} className="bg-white/[0.02] border border-[#e8eaed]/8 rounded-lg p-2.5 text-center">
                <div className="text-[1.5rem] font-bold" style={{ color: color as string }}>{val}</div>
                <div className="text-[0.65rem] text-text-dim uppercase">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-black/[0.15] border border-white/10 rounded-[var(--radius-md)] p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[1.1rem] font-semibold m-0">Live resources rolling waves</h3>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-accent inline-block" />CPU load %</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--tide)] inline-block" />Memory %</span>
            </div>
          </div>
          <svg viewBox="0 0 500 150" className="w-full h-[200px] bg-[rgba(3,11,22,0.4)] border border-white/10 rounded-[var(--radius-md)]" preserveAspectRatio="none">
            <line x1={0} y1={37.5} x2={500} y2={37.5} stroke="rgba(255,255,255,0.03)" strokeDasharray="4,4" />
            <line x1={0} y1={75} x2={500} y2={75} stroke="rgba(255,255,255,0.03)" strokeDasharray="4,4" />
            <line x1={0} y1={112.5} x2={500} y2={112.5} stroke="rgba(255,255,255,0.03)" strokeDasharray="4,4" />
            <path d={svgPath(cpuData)} fill="none" stroke="var(--teal)" strokeWidth={2} />
            <path d={svgPath(memData)} fill="none" stroke="var(--tide)" strokeWidth={2} />
          </svg>
          <div className="text-xs text-text-faint mt-2 font-mono text-right">Polling frequency: {POLL_MS}ms</div>
        </div>

        <div className="bg-surface border border-white/10 rounded-[var(--radius-md)] p-6">
          <h3 className="text-[1.1rem] font-semibold mb-4">Agent processes pulse</h3>
          <div className="flex flex-col gap-3">
            {Object.entries(system.services).map(([svc, state]) => {
              const active = state === "active";
              return (
                <div key={svc} className="flex justify-between items-center bg-white/[0.02] px-3.5 py-2.5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full inline-block pulse-dot-anim" style={{ background: active ? "var(--teal)" : "var(--amber)" }} />
                    <span className="text-[0.85rem] font-mono font-medium">{svc}.service</span>
                  </div>
                  <span className="text-xs font-semibold uppercase" style={{ color: active ? "var(--teal)" : "var(--amber)" }}>{state}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-white/10 rounded-[var(--radius-md)] p-6 mb-8">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-[1.1rem] font-semibold m-0">Live P2P fleet latency matrix</h3>
          <div className="text-xs text-text-faint font-mono">P2P probes refreshed: {measuredAt}</div>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {NODES.map((n) => {
            const ping = latencies[n.name] ?? n.defaultMs;
            const color = pingColor(ping);
            return (
              <div key={n.name} className="bg-white/[0.02] border border-white/10 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[0.9rem] flex items-center gap-2">
                    <span>{n.name.charAt(0).toUpperCase() + n.name.slice(1)}</span>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                  </div>
                  <div className="text-[0.72rem] text-text-faint mt-0.5">{n.desc}</div>
                </div>
                <div className="text-right">
                  <span
                    className="inline-block text-[0.55rem] px-1.5 py-0.5 rounded font-bold uppercase border"
                    style={{ color: n.type === "LOCAL" ? "var(--teal)" : "var(--purple)", borderColor: n.type === "LOCAL" ? "var(--teal)" : "var(--purple)" }}
                  >
                    {n.type}
                  </span>
                  <div className="text-[0.8rem] font-bold text-text-dim font-mono mt-1">{ping}ms</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-surface border border-white/10 rounded-[var(--radius-md)] p-6">
          <h3 className="text-[1.1rem] font-semibold mb-2">Active interface socket matrix</h3>
          <p className="text-[0.85rem] text-text-dim mb-4">Verified open TCP listeners mapped to local system, Tailscale, and public endpoints.</p>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
            {listeningPorts.map((p, i) => {
              const portName = p.port === 443 ? "Nginx" : p.port === 8888 ? "Agora" : p.port === 8787 ? "Peer" : "Service";
              return (
                <div key={i} className="bg-white/[0.02] border border-white/10 rounded-lg p-2.5 text-center">
                  <div className="text-[0.65rem] font-mono text-text-faint">{p.interface || "0.0.0.0"}</div>
                  <div className="text-[1.3rem] font-display font-bold text-teal-accent my-1">:{p.port}</div>
                  <div className="text-[0.7rem] uppercase tracking-[0.05em] text-text-dim">{portName}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-surface border border-white/10 rounded-[var(--radius-md)] p-6">
          <h3 className="text-[1.1rem] font-semibold mb-2">Live on-demand security audit console</h3>
          <p className="text-[0.85rem] text-text-dim mb-4">Trigger a live host-wide security scan and watch the diagnostics output stream in real time.</p>
          <div className="bg-[rgba(2,6,13,0.95)] border border-white/10 rounded-[var(--radius-md)] font-mono text-[0.8rem] overflow-hidden">
            <div className="bg-white/5 px-4 py-2 flex justify-between items-center border-b border-white/10">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ff5f56] inline-block" />
                <span className="w-2 h-2 rounded-full bg-[#ffbd2e] inline-block" />
                <span className="w-2 h-2 rounded-full bg-[#27c93f] inline-block" />
              </div>
              <span className="text-[0.7rem] text-text-faint">diagnostics@tidalwake.org</span>
            </div>
            <div ref={terminalRef} className="p-4 h-[180px] overflow-y-auto text-teal-accent leading-relaxed scroll-smooth">
              {terminalLines.length === 0 ? (
                <div className="text-text-faint mb-2">[SYSTEM] Terminal ready. Waiting for directive.</div>
              ) : (
                terminalLines.map((l, i) => <div key={i} style={{ color: l.color }} className="mt-0.5">{l.text}</div>)
              )}
              {scanning && terminalLines.length <= 1 && (
                <div className="text-text-dim mt-1">
                  Audit progress: [{"=".repeat(Math.round(scanProgress / 5))}{" ".repeat(20 - Math.round(scanProgress / 5))}] {scanProgress}%
                </div>
              )}
            </div>
            <div className="p-2.5 border-t border-white/10 flex justify-end">
              <button
                onClick={runScan} disabled={scanning}
                className="bg-teal-accent text-[#0a0d13] px-3.5 py-1.5 font-display text-[0.8rem] font-semibold rounded-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>Execute live scan</span> &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
