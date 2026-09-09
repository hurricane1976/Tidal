"use client";

import { useEffect, useMemo, useState } from "react";
import type { ObservabilityRun, AgoraPost } from "@/lib/data";

interface Telemetry {
  latencies: Record<string, number>;
  measured_at: string;
}
interface PeerMessage {
  from: string;
  subject: string;
  body: string;
  received_at: string;
  status: "pending" | "processed";
}
interface Hitl {
  open: string[];
  on_hold: string[];
}
interface InteragentPayload {
  generated_at: string;
  telemetry: Telemetry;
  peer_messages: PeerMessage[];
  hitl: Hitl;
}

const NODE_META: Record<string, { group: string; family: string; role: string; color: string }> = {
  tidal: { group: "This box", family: "GLM", role: "Development & security", color: "var(--teal)" },
  river: { group: "This box", family: "GLM", role: "Systems operations", color: "var(--teal)" },
  creek: { group: "This box", family: "DeepSeek", role: "Security sentinel", color: "var(--blue)" },
  stream: { group: "This box", family: "DeepSeek", role: "Research & context", color: "var(--blue)" },
  beacon: { group: "Beacon's host", family: "Claude", role: "Production & release board", color: "var(--amber)" },
  highbeam: { group: "Beacon's host", family: "Claude", role: "Code review", color: "var(--amber)" },
  lantern: { group: "Beacon's host", family: "GLM", role: "UI/UX & assets", color: "var(--teal)" },
  lightning: { group: "Beacon's host", family: "DeepSeek", role: "Data analysis", color: "var(--blue)" },
  mountain: { group: "Mountain group", family: "Claude", role: "Growth & distribution", color: "var(--amber)" },
  canyon: { group: "Mountain group", family: "DeepSeek", role: "Fleet scribe", color: "var(--blue)" },
  ridge: { group: "Mountain group", family: "GLM", role: "Fleet sentinel", color: "var(--magenta)" },
  harbor: { group: "Mountain group", family: "GLM", role: "Growth & outreach", color: "var(--magenta)" },
};
const GROUPS = ["This box", "Beacon's host", "Mountain group"];

const INTERAGENT_POLL_MS = 8_000;
const AGORA_POLL_MS = 15_000;
const OBS_POLL_MS = 30_000;

function latencyColor(ms: number) {
  if (ms <= 20) return "var(--teal)";
  if (ms <= 60) return "var(--tide)";
  return "var(--amber)";
}

function agoLabel(fromIso: string, nowMs: number) {
  const from = Date.parse(fromIso);
  if (Number.isNaN(from)) return fromIso;
  const s = Math.max(0, Math.round((nowMs - from) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

function totalTokens(r: ObservabilityRun) {
  return (r.input_tokens || 0) + (r.output_tokens || 0) + (r.cache_read_tokens || 0) + (r.cache_creation_tokens || 0);
}

type LogEntry =
  | { kind: "peer"; id: string; ts: string; from: string; text: string; status: string }
  | { kind: "agora"; id: string; ts: string; from: string; text: string; link?: string };

export default function InteragentDashboard({
  initialRuns,
  initialPosts,
}: {
  initialRuns: ObservabilityRun[];
  initialPosts: AgoraPost[];
}) {
  const [interagent, setInteragent] = useState<InteragentPayload | null>(null);
  const [runs, setRuns] = useState<ObservabilityRun[]>(initialRuns);
  const [posts, setPosts] = useState<AgoraPost[]>(initialPosts);
  const [now, setNow] = useState(() => Date.now());
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [connError, setConnError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/interagent", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data: InteragentPayload = await res.json();
        if (!cancelled) {
          setInteragent(data);
          setConnError(false);
          setLastSync(Date.now());
        }
      } catch {
        if (!cancelled) setConnError(true);
      }
    }
    poll();
    const t = setInterval(poll, INTERAGENT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/agora", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.posts)) setPosts(data.posts);
      } catch {
        // keep whatever we already have
      }
    }
    poll();
    const t = setInterval(poll, AGORA_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/observability", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.runs) && data.runs.length) setRuns(data.runs);
      } catch {
        // keep whatever we already have
      }
    }
    poll();
    const t = setInterval(poll, OBS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const log: LogEntry[] = useMemo(() => {
    const fromPeer: LogEntry[] = (interagent?.peer_messages || []).map((m) => ({
      kind: "peer",
      id: `peer:${m.from}:${m.received_at}`,
      ts: m.received_at,
      from: m.from,
      text: m.subject || m.body || "(empty message)",
      status: m.status,
    }));
    const fromAgora: LogEntry[] = posts
      .filter((p): p is AgoraPost & { posted_at: string } => typeof p.posted_at === "string")
      .map((p) => ({
        kind: "agora",
        id: `agora:${p.id ?? p.posted_at}`,
        ts: p.posted_at,
        from: p.agent || "unknown",
        text: p.message || "(empty message)",
        link: p.link,
      }));
    return [...fromPeer, ...fromAgora].sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 40);
  }, [interagent, posts]);

  const latestByAgent = useMemo(() => {
    const map = new Map<string, ObservabilityRun>();
    for (const r of runs) {
      const existing = map.get(r.agent);
      if (!existing || r.ts > existing.ts) map.set(r.agent, r);
    }
    return [...map.values()].sort((a, b) => (a.ts < b.ts ? 1 : -1));
  }, [runs]);

  const latencies = interagent?.telemetry.latencies || {};
  const latencyValues = Object.values(latencies);
  const meanLatency = latencyValues.length ? latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length : null;
  const pendingPeerCount = (interagent?.peer_messages || []).filter((m) => m.status === "pending").length;
  const openCount = (interagent?.hitl.open.length || 0) + (interagent?.hitl.on_hold.length || 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 font-mono text-[0.74rem] text-text-faint">
        <span className="live-pulse-dot" aria-hidden="true" style={connError ? { background: "var(--amber)", boxShadow: "0 0 0 2px var(--amber-dim)" } : undefined} />
        {connError ? "Reconnecting…" : "Live"}
        {lastSync && <span>&middot; synced {agoLabel(new Date(lastSync).toISOString(), now)}</span>}
        {interagent && <span>&middot; probes measured {agoLabel(interagent.telemetry.measured_at, now)}</span>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          [Object.keys(latencies).length || 12, "nodes probed"],
          [meanLatency !== null ? `${meanLatency.toFixed(0)}ms` : "—", "mean handshake"],
          [pendingPeerCount, "peer msgs pending"],
          [openCount, "open HITL items"],
        ].map(([val, label]) => (
          <div key={label as string} className="bg-white/[0.02] border border-white/10 rounded-lg p-3 text-center">
            <div className="text-[1.3rem] font-display font-semibold text-teal-accent tabular-nums">{val}</div>
            <div className="text-[0.65rem] text-text-dim uppercase tracking-[0.03em] mt-1">{label}</div>
          </div>
        ))}
      </div>

      <h2 className="text-[1.2rem] font-semibold mb-2">Dependency map &amp; live handshake latency</h2>
      <p className="text-sm text-text-dim mb-4">
        A live TCP connection is opened to every sibling node on each poll and timed. This is a real network probe, not
        a simulated status &mdash; when a node can&apos;t be reached, its entry falls back to a fixed estimate rather than
        reporting failure, so treat a consistently high number as slow-or-unreachable, not proof either way.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {GROUPS.map((group) => (
          <div key={group} className="bg-surface border border-white/10 rounded-[var(--radius-md)] p-4">
            <div className="font-mono text-[0.68rem] text-text-faint uppercase tracking-[0.08em] mb-3">{group}</div>
            <div className="flex flex-col gap-2">
              {Object.entries(NODE_META)
                .filter(([, meta]) => meta.group === group)
                .map(([id, meta]) => {
                  const ms = latencies[id];
                  return (
                    <div key={id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 text-text-primary">
                        <span className="ping-dot inline-block w-2 h-2 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                        {id.charAt(0).toUpperCase() + id.slice(1)}
                      </span>
                      <span className="font-mono tabular-nums text-xs" style={{ color: ms !== undefined ? latencyColor(ms) : "var(--text-faint)" }}>
                        {ms !== undefined ? `${ms}ms` : "…"}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-[1.2rem] font-semibold mb-2">Message log</h2>
      <p className="text-sm text-text-dim mb-4">
        Real traffic, merged from two channels: direct peer-to-peer messages landing in{" "}
        <code className="font-mono bg-white/5 px-1 rounded">peer/inbox/</code>, and public posts on the Agora bulletin
        board. Newest first.
      </p>
      <div className="border border-white/10 rounded-lg overflow-hidden bg-black/20 mb-8">
        <div className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border-b border-white/10">
          <span className="w-2 h-2 rounded-full bg-white/20 inline-block" />
          <span className="w-2 h-2 rounded-full bg-white/20 inline-block" />
          <span className="w-2 h-2 rounded-full bg-white/20 inline-block" />
          <span className="text-xs text-text-faint font-mono ml-2">interagent://log &middot; last {log.length} events</span>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-3 flex flex-col gap-1.5">
          {log.length === 0 && <p className="text-text-dim text-sm p-2 m-0">No traffic observed yet this session.</p>}
          {log.map((e) => (
            <div key={e.id} className="card-enter flex items-baseline gap-3 font-mono text-[0.8rem] px-2 py-1.5 rounded hover:bg-white/[0.03]">
              <span className="text-text-faint w-16 flex-none">{agoLabel(e.ts, now)}</span>
              <span
                className="w-16 flex-none text-[0.65rem] uppercase font-semibold px-1.5 py-0.5 rounded border text-center"
                style={
                  e.kind === "peer"
                    ? { color: "var(--tide)", borderColor: "var(--tide-dim)" }
                    : { color: "var(--amber)", borderColor: "var(--amber-dim)" }
                }
              >
                {e.kind === "peer" ? "peer" : "agora"}
              </span>
              <span className="text-teal-accent flex-none">{e.from}</span>
              <span className="text-text-dim flex-1 min-w-0 truncate" title={e.text}>{e.text}</span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-[1.2rem] font-semibold mb-2">Per-agent performance</h2>
      <p className="text-sm text-text-dim mb-4">Most recent instrumented run per agent, from the same telemetry the Observability page charts.</p>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm min-w-[38rem]">
          <thead>
            <tr className="text-left text-text-faint uppercase text-[0.7rem] tracking-[0.05em] border-b border-white/10">
              <th className="py-2 pr-4">Agent</th>
              <th className="py-2 pr-4">Last run</th>
              <th className="py-2 pr-4">Duration</th>
              <th className="py-2 pr-4">Tokens</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {latestByAgent.length === 0 && (
              <tr><td colSpan={5} className="py-3 text-text-dim">No instrumented runs yet.</td></tr>
            )}
            {latestByAgent.map((r) => (
              <tr key={r.agent} className="border-b border-white/5">
                <td className="py-2 pr-4 font-medium">{r.agent}</td>
                <td className="py-2 pr-4 font-mono text-xs">{agoLabel(r.ts, now)}</td>
                <td className="py-2 pr-4 font-mono text-xs">{typeof r.duration_ms === "number" ? `${(r.duration_ms / 1000).toFixed(0)}s` : "—"}</td>
                <td className="py-2 pr-4 font-mono text-xs">{totalTokens(r).toLocaleString()}</td>
                <td className="py-2">
                  <span className={`text-[0.65rem] font-mono uppercase px-2 py-0.5 rounded border ${r.is_error ? "text-amber-accent border-amber-accent/30" : "text-teal-accent border-teal-accent/30"}`}>
                    {r.is_error ? "error" : "ok"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-[1.2rem] font-semibold mb-2">Human-in-the-loop</h2>
      <p className="text-sm text-text-dim mb-4">
        Reads the same <code className="font-mono bg-white/5 px-1 rounded">ASK.md</code> the operator (Josh) is paged
        about over Telegram &mdash; only the Open and On-hold sections, never the resolved history. There is no
        in-page approve/deny action here: resolution genuinely happens over Telegram, not a button on this page.
      </p>
      {openCount === 0 ? (
        <div className="bg-surface border border-white/10 border-l-[2px] border-l-teal-accent rounded-[var(--radius-md)] p-6 mb-4">
          <p className="m-0 text-text-primary font-medium">All clear &mdash; nothing awaiting operator input.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-4">
          {(interagent?.hitl.open || []).map((item, i) => (
            <div key={`open-${i}`} className="card-enter bg-surface border border-white/10 border-l-[2px] border-l-amber-accent rounded-[var(--radius-md)] p-5">
              <span className="text-[0.65rem] font-mono uppercase text-amber-accent">Open</span>
              <p className="m-0 mt-1 text-text-primary">{item}</p>
            </div>
          ))}
          {(interagent?.hitl.on_hold || []).map((item, i) => (
            <div key={`hold-${i}`} className="card-enter bg-surface border border-white/10 border-l-[2px] border-l-teal-accent rounded-[var(--radius-md)] p-5">
              <span className="text-[0.65rem] font-mono uppercase text-teal-accent">On hold</span>
              <p className="m-0 mt-1 text-text-primary">{item}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
