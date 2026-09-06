"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface LogItem {
  agent: string;
  text: string;
  color: string;
  waking?: number;
  type?: string;
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
];

export default function TelemetryTerminal({ initialLogs }: TelemetryTerminalProps) {
  const [logs, setLogs] = useState<LogItem[]>(initialLogs);
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
  });

  const termBodyRef = useRef<HTMLDivElement>(null);
  const logIndexRef = useRef(0);
  const rowCounterRef = useRef(0);

  // Helper for UTC timestamp formatting
  const getFormattedTime = () => {
    const now = new Date();
    const h = String(now.getUTCHours()).padStart(2, "0");
    const m = String(now.getUTCMinutes()).padStart(2, "0");
    const s = String(now.getUTCSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const appendTerminalRow = useCallback((agent: string, text: string, color: string) => {
    const id = `${Date.now()}-${rowCounterRef.current++}`;
    setTerminalRows((prev) => {
      const next = [
        ...prev,
        { id, time: getFormattedTime(), agent, text, color },
      ];
      if (next.length > 25) {
        return next.slice(next.length - 25);
      }
      return next;
    });
  }, []);

  // Log cycling & Pings simulation
  useEffect(() => {
    // Initial hello row
    appendTerminalRow("SYSTEM", "Listening on Ports: 8888 (Agora), 8787 (Peer)", "#4fd1c5");

    const interval = setInterval(() => {
      if (logs.length === 0) return;
      const entry = logs[logIndexRef.current];
      appendTerminalRow(entry.agent, entry.text, entry.color);
      logIndexRef.current = (logIndexRef.current + 1) % logs.length;

      // Randomize pings slightly
      setPings((prev) => {
        const next: Record<string, number> = {};
        for (const [node, base] of Object.entries(prev)) {
          const diff = Math.floor(Math.random() * 5) - 2; // -2 to +2
          next[node] = Math.max(1, base + diff);
        }
        return next;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [logs, appendTerminalRow]);

  // Scroll to bottom when rows change
  useEffect(() => {
    if (termBodyRef.current) {
      termBodyRef.current.scrollTop = termBodyRef.current.scrollHeight;
    }
  }, [terminalRows]);

  // Optional: Poll live API
  useEffect(() => {
    const checkLiveTelemetry = async () => {
      try {
        const res = await fetch("/api");
        if (res.ok) {
          const data = await res.json();
          if (data.latencies) {
            setPings((prev) => ({ ...prev, ...data.latencies }));
          }
          if (data.logs && data.logs.length > 0) {
            setLogs(data.logs);
          }
        }
      } catch {
        // Quietly fail
      }
    };
    const poll = setInterval(checkLiveTelemetry, 30000);
    return () => clearInterval(poll);
  }, []);

  const triggerSimulatedScan = () => {
    appendTerminalRow("TIDAL", "Manual security audit requested. Scanning workspace files...", "#ff8a3d");
    setTimeout(() => {
      appendTerminalRow("TIDAL", "Raw secrets scan: PASS. Dangerous functions scan: PASS.", "#ff8a3d");
      appendTerminalRow("TIDAL", "Readiness score: 100/100 (NOMINAL).", "#4fd1c5");
    }, 1000);
  };

  const triggerSimulatedDigest = () => {
    appendTerminalRow("SYSTEM", "Simulating daily notification compile pipeline...", "#4fd1c5");
    setTimeout(() => {
      appendTerminalRow("SYSTEM", "Daily email and Telegram digest pushed to operator. Successful.", "#f6ad55");
    }, 1200);
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
          onClick={triggerSimulatedScan}
          className="btn-ghost text-[0.8rem] px-4 py-2 hover:border-teal-accent hover:text-teal-accent hover:bg-teal-accent/5"
        >
          Simulate Security Scan
        </button>
        <button
          onClick={triggerSimulatedDigest}
          className="btn-ghost text-[0.8rem] px-4 py-2 border-amber-accent/30 text-amber-accent hover:border-amber-accent hover:bg-amber-accent/5"
        >
          Simulate Daily Digest
        </button>
      </div>
    </div>
  );
}
