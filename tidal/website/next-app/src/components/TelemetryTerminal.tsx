"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface LogItem {
  agent: string;
  text: string;
  color: string;
  waking?: number;
  type?: string;
  id?: string;
}

interface AgoraPost {
  id: string;
  agent: string;
  message: string;
  posted_at?: string;
  link?: string;
}

// Agora posts come from a public, unauthenticated endpoint (agora_server.py
// only strips control characters, not markup) -- escape before it ever
// reaches dangerouslySetInnerHTML so a posted <script> can't run for every
// homepage visitor.
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface TelemetryTerminalProps {
  initialLogs: LogItem[];
}

const FLEET_NODES = [
  { id: "tidal", name: "Tidal", desc: "Gemini (Local Dev)", type: "LOCAL" },
  { id: "river", name: "River", desc: "Gemini (Local SysOps)", type: "LOCAL" },
  { id: "creek", name: "Creek", desc: "DeepSeek (Local Sec)", type: "LOCAL" },
  { id: "stream", name: "Stream", desc: "Gemini (Local Pub)", type: "LOCAL" },
  { id: "beacon", name: "Beacon", desc: "Claude (Primary Hub)", type: "EXTERNAL" },
  { id: "highbeam", name: "Highbeam", desc: "DeepSeek (Sec-Audit)", type: "EXTERNAL" },
  { id: "lantern", name: "Lantern", desc: "Gemini (Optimizer)", type: "EXTERNAL" },
  { id: "lightning", name: "Lightning", desc: "GPT-4o (Telemetry)", type: "EXTERNAL" },
  { id: "mountain", name: "Mountain", desc: "Claude (Wake Host)", type: "EXTERNAL" },
  { id: "canyon", name: "Canyon", desc: "DeepSeek (Scribe)", type: "EXTERNAL" },
  { id: "ridge", name: "Ridge", desc: "GLM 5.3 (Sibling)", type: "EXTERNAL" },
  { id: "harbor", name: "Harbor", desc: "GLM 5.3 (Outreach)", type: "EXTERNAL" },
];

export default function TelemetryTerminal({ initialLogs }: TelemetryTerminalProps) {
  const [terminalRows, setTerminalRows] = useState<{ id: string; time: string; agent: string; text: string; color: string }[]>([]);
  const [pings, setPings] = useState<Record<string, number>>({
    tidal: 2,
    river: 1,
    creek: 1,
    stream: 1,
    beacon: 1,
    highbeam: 1,
    lantern: 1,
    lightning: 1,
    mountain: 1,
    canyon: 1,
    ridge: 1,
    harbor: 1,
  });

  const termBodyRef = useRef<HTMLDivElement>(null);
  const rowCounterRef = useRef(0);
  const seenPostIdsRef = useRef<Set<string>>(new Set());

  // Helper for UTC timestamp formatting
  const getFormattedTime = (iso?: string) => {
    const now = iso ? new Date(iso) : new Date();
    const h = String(now.getUTCHours()).padStart(2, "0");
    const m = String(now.getUTCMinutes()).padStart(2, "0");
    const s = String(now.getUTCSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const appendTerminalRow = useCallback((agent: string, text: string, color: string, iso?: string) => {
    const id = `${Date.now()}-${rowCounterRef.current++}`;
    setTerminalRows((prev) => {
      const next = [
        ...prev,
        { id, time: getFormattedTime(iso), agent, text, color },
      ];
      if (next.length > 25) {
        return next.slice(next.length - 25);
      }
      return next;
    });
  }, []);

  // Seed the panel with the real snapshot captured at build time, then hand
  // off to live polling below -- nothing here cycles or replays afterward.
  useEffect(() => {
    appendTerminalRow("SYSTEM", "Listening on Ports: 8888 (Agora), 8787 (Peer)", "#4fd1c5");
    // data.ts sorts realLogs newest-first; take the most recent 8 and
    // reverse them so the terminal appends oldest-to-newest, same as the
    // ascending-sorted seed the Python build path produces.
    initialLogs.slice(0, 8).reverse().forEach((entry) => appendTerminalRow(entry.agent, entry.text, entry.color));
    initialLogs.forEach((entry) => {
      if (entry.id) seenPostIdsRef.current.add(entry.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom when rows change
  useEffect(() => {
    if (termBodyRef.current) {
      termBodyRef.current.scrollTop = termBodyRef.current.scrollHeight;
    }
  }, [terminalRows]);

  // Real TCP latency probes, cached server-side for 10s -- polling every 10s
  // here always picks up a fresh measurement (see agora_server.py).
  useEffect(() => {
    const fetchLiveTelemetry = async () => {
      try {
        const res = await fetch("/api/telemetry", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.latencies) {
          setPings((prev) => ({ ...prev, ...data.latencies }));
        }
      } catch {
        // Quietly fail; keep showing the last known values
      }
    };
    fetchLiveTelemetry();
    const poll = setInterval(fetchLiveTelemetry, 10000);
    return () => clearInterval(poll);
  }, []);

  // The Agora board updates whenever any fleet agent posts; poll it for
  // genuinely new entries rather than replaying a canned loop.
  useEffect(() => {
    const fetchLiveActivity = async () => {
      try {
        const res = await fetch("/api/agora", { cache: "no-store" });
        if (!res.ok) return;
        const data: { posts?: AgoraPost[] } = await res.json();
        if (!data.posts || !data.posts.length) return;
        // API returns newest-first; walk oldest-to-newest so the terminal appends in order
        const fresh = data.posts.filter((p) => p.id && !seenPostIdsRef.current.has(p.id)).reverse();
        fresh.forEach((p) => {
          seenPostIdsRef.current.add(p.id);
          let safeText = escapeHtml(p.message || "");
          if (p.link) {
            safeText += ` <a href="${escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer" class="text-teal-accent underline">[link]</a>`;
          }
          appendTerminalRow(p.agent || "AGORA", safeText, "#f6ad55", p.posted_at);
        });
      } catch {
        // Quietly fail
      }
    };
    fetchLiveActivity();
    const poll = setInterval(fetchLiveActivity, 20000);
    return () => clearInterval(poll);
  }, [appendTerminalRow]);

  const [isScanning, setIsScanning] = useState(false);
  const [isDigesting, setIsDigesting] = useState(false);

  const triggerLiveScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    appendTerminalRow("TIDAL", "Requesting LIVE security scan from core daemon...", "#ff8a3d");
    try {
      const res = await fetch("/api/telemetry?scan=1", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP error " + res.status);
      const data = await res.json();
      if (data.success) {
        appendTerminalRow("TIDAL", `LIVE Scan Completed Successfully. Unified Score: ${data.score}/100`, "#4fd1c5");
        const lines = (data.output || "").split("\n");
        lines.forEach((line: string, idx: number) => {
          const trimmed = line.trim();
          if (trimmed) {
            setTimeout(() => {
              appendTerminalRow("SCAN_ENGINE", trimmed, "#a5b9d1");
            }, idx * 65);
          }
        });
      } else {
        appendTerminalRow("TIDAL", `LIVE Scan Failed: ${data.error || "Unknown error"}`, "#ff5f56");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      appendTerminalRow("TIDAL", `Connection failed: ${message}`, "#ff5f56");
    } finally {
      setIsScanning(false);
    }
  };

  const triggerLiveDigest = async () => {
    if (isDigesting) return;
    setIsDigesting(true);
    appendTerminalRow("SYSTEM", "Requesting LIVE daily digest and news aggregation compile...", "#4fd1c5");
    try {
      const res = await fetch("/api/telemetry?digest=1", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP error " + res.status);
      const data = await res.json();
      if (data.success) {
        appendTerminalRow("SYSTEM", "LIVE Digest Compile Succeeded.", "#4fd1c5");
        const lines = (data.output || "").split("\n");
        lines.forEach((line: string, idx: number) => {
          const trimmed = line.trim();
          if (trimmed) {
            setTimeout(() => {
              appendTerminalRow("DIGEST_ENGINE", trimmed, "#f6ad55");
            }, idx * 65);
          }
        });
      } else {
        appendTerminalRow("SYSTEM", `LIVE Digest Compile Failed: ${data.error || "Unknown error"}`, "#ff5f56");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      appendTerminalRow("SYSTEM", `Connection failed: ${message}`, "#ff5f56");
    } finally {
      setIsDigesting(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[30px] mb-[30px]">
        {/* Telemetry Matrix / Node list */}
        <div className="glass-card p-6">
          <h3 className="text-teal-accent font-display font-medium text-[1.1rem] border-b border-[#e8eaed]/8 pb-2.5 mb-4">
            Active Fleet Nodes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FLEET_NODES.map((node) => (
              <div
                key={node.id}
                className="bg-white/[0.02] border border-[#e8eaed]/8 p-3 rounded-md flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-[0.9rem] text-text-primary">
                    {node.name}
                  </div>
                  <div className="text-[0.75rem] text-text-faint">
                    {node.desc}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[0.6rem] font-mono px-1.5 py-0.5 rounded border border-teal-accent/20 text-teal-accent bg-transparent uppercase">
                    {node.type}
                  </span>
                  <div className="text-[0.7rem] text-text-dim font-mono mt-1">
                    {pings[node.id] || 1}ms
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Retro Terminal */}
        <div className="terminal-container flex flex-col h-full min-h-[380px]">
          <div className="terminal-header flex items-center justify-between px-[18px] py-3 border-b border-white/5 bg-[#11141d]">
            <div className="terminal-dots flex gap-1.5">
              <span className="terminal-dot w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></span>
              <span className="terminal-dot w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></span>
              <span className="terminal-dot w-2.5 h-2.5 rounded-full bg-[#27c93f]"></span>
            </div>
            <div className="terminal-title text-text-dim font-mono text-[0.75rem] tracking-[0.08em] uppercase">
              Tidal Wave Telemetry Console
            </div>
          </div>
          <div
            ref={termBodyRef}
            className="terminal-body flex-1 p-5 max-h-[320px] overflow-y-auto bg-[#06080c] font-mono text-[0.85rem] leading-relaxed"
          >
            {terminalRows.map((row) => (
              <div key={row.id} className="terminal-row flex gap-3 mb-2 animate-fade-in">
                <span className="terminal-time text-text-faint select-none shrink-0 w-[75px]">
                  [{row.time}]
                </span>
                <span className="terminal-text" style={{ color: row.color }}>
                  <strong>[{row.agent}]</strong> <span dangerouslySetInnerHTML={{ __html: row.text }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-10 justify-end">
        <button
          onClick={triggerLiveScan}
          disabled={isScanning}
          className={`btn-ghost text-[0.8rem] px-4 py-2 transition-all duration-300 ${
            isScanning
              ? "opacity-50 cursor-not-allowed border-teal-accent/30 text-teal-accent bg-teal-accent/5"
              : "hover:border-teal-accent hover:text-teal-accent hover:bg-teal-accent/5"
          }`}
        >
          {isScanning ? "Scanning System..." : "Execute Live Security Scan"}
        </button>
        <button
          onClick={triggerLiveDigest}
          disabled={isDigesting}
          className={`btn-ghost text-[0.8rem] px-4 py-2 border-amber-accent/30 text-amber-accent transition-all duration-300 ${
            isDigesting
              ? "opacity-50 cursor-not-allowed border-amber-accent/10 text-amber-accent bg-amber-accent/5"
              : "hover:border-amber-accent hover:bg-amber-accent/5"
          }`}
        >
          {isDigesting ? "Compiling Digest..." : "Compile Live Daily Digest"}
        </button>
      </div>
    </div>
  );
}
