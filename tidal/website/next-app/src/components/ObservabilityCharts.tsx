"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ObservabilityRun } from "@/lib/data";

interface Props {
  initialRuns: ObservabilityRun[];
}

interface ApiResponse {
  runs: ObservabilityRun[];
  generated_at?: string;
}

const POLL_MS = 30_000; // matches the site's existing SecOps polling cadence
const WINDOW = 16; // bars shown per chart
const TABLE_ROWS = 14;
const AGENT_PALETTE = ["#4fd1c5", "#ff8a3d", "#c98aff", "#5aa9ff", "#ffb454", "#f06fb0"];

type Tab = "cost" | "tokens" | "wallclock";
type SortKey = "ts" | "cost_usd" | "turns" | "duration_ms" | "tokens";

function fmtCost(v: number | null | undefined) {
  return typeof v === "number" ? `$${v.toFixed(4)}` : "—";
}
function fmtInt(v: number | null | undefined) {
  return typeof v === "number" ? v.toLocaleString() : "—";
}
function fmtDur(ms: number | null | undefined) {
  if (typeof ms !== "number") return "—";
  const s = ms / 1000;
  return s < 90 ? `${s.toFixed(0)}s` : `${(s / 60).toFixed(1)}m`;
}
function totalTokens(r: ObservabilityRun) {
  return (r.input_tokens || 0) + (r.output_tokens || 0) + (r.cache_read_tokens || 0) + (r.cache_creation_tokens || 0);
}
function shortTs(ts: string) {
  return ts.slice(5, 16).replace("T", " ");
}
function agoLabel(fromMs: number, nowMs: number) {
  const s = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

export default function ObservabilityCharts({ initialRuns }: Props) {
  const [runs, setRuns] = useState<ObservabilityRun[]>(initialRuns);
  const [lastFetch, setLastFetch] = useState<number>(Date.now());
  const [now, setNow] = useState<number>(Date.now());
  const [live, setLive] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [tab, setTab] = useState<Tab>("cost");
  const [excludedAgents, setExcludedAgents] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null); // `${agent}:${ts}`
  const [sortKey, setSortKey] = useState<SortKey>("ts");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live poll of the real endpoint agora_server.py serves (proxied by nginx) --
  // same mechanism the SecOps console already uses for /api/telemetry, just
  // on a longer cadence since this data only changes every few hours.
  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/observability", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data: ApiResponse = await res.json();
        if (Array.isArray(data.runs) && data.runs.length) {
          setRuns(data.runs.filter((r) => typeof r.cost_usd === "number"));
          setLive(true);
          setFetchError(false);
        }
      } catch {
        // Stay on whatever we already have (build-time data or the last
        // successful poll) -- never blank the widget over a flaky fetch.
        setFetchError(true);
      } finally {
        setLastFetch(Date.now());
      }
    }
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Separate 1s ticker just to keep the "updated Xs ago" readout honest.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const agents = useMemo(() => {
    const seen: string[] = [];
    for (const r of runs) if (!seen.includes(r.agent)) seen.push(r.agent);
    return seen.sort();
  }, [runs]);

  const agentColor = useMemo(() => {
    const map = new Map<string, string>();
    agents.forEach((a, i) => map.set(a, AGENT_PALETTE[i % AGENT_PALETTE.length]));
    return map;
  }, [agents]);

  const filtered = useMemo(
    () => runs.filter((r) => !excludedAgents.has(r.agent)),
    [runs, excludedAgents]
  );

  const kpis = useMemo(() => {
    const n = filtered.length;
    const cost = filtered.reduce((s, r) => s + (r.cost_usd || 0), 0);
    const tokens = filtered.reduce((s, r) => s + totalTokens(r), 0);
    return { n, cost, mean: n ? cost / n : 0, tokens };
  }, [filtered]);

  const windowRuns = useMemo(() => filtered.slice(-WINDOW), [filtered]);

  const sortedTable = useMemo(() => {
    const rows = [...filtered].slice(-120); // cap so an ever-growing store stays snappy client-side
    rows.sort((a, b) => {
      let av: number | string, bv: number | string;
      if (sortKey === "tokens") {
        av = totalTokens(a);
        bv = totalTokens(b);
      } else if (sortKey === "ts") {
        av = a.ts;
        bv = b.ts;
      } else {
        av = a[sortKey] ?? -Infinity;
        bv = b[sortKey] ?? -Infinity;
      }
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
    return rows.slice(0, TABLE_ROWS);
  }, [filtered, sortKey, sortDir]);

  function toggleAgent(a: string) {
    setExcludedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1) as 1 | -1);
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  function runKey(r: ObservabilityRun) {
    return `${r.agent}:${r.ts}`;
  }

  const selectedRun = useMemo(
    () => (selected ? runs.find((r) => runKey(r) === selected) : undefined),
    [selected, runs]
  );

  const costMax = Math.max(1, ...windowRuns.map((r) => r.cost_usd || 0));
  const tokMax = Math.max(1, ...windowRuns.map(totalTokens));
  const wallRuns = windowRuns.filter((r) => typeof r.duration_ms === "number" && typeof r.duration_api_ms === "number");
  const wallMax = Math.max(1, ...wallRuns.map((r) => r.duration_ms || 0));

  if (!runs.length) {
    return (
      <div className="bg-surface border border-white/10 rounded-[var(--radius-md)] p-6">
        <p className="m-0 text-text-dim text-sm">
          Awaiting the first instrumented run &mdash; this widget polls{" "}
          <code className="font-mono bg-white/5 px-1 rounded">/api/observability</code> live and will populate automatically.
        </p>
      </div>
    );
  }

  const legend: [string, string][] = [
    ["#8ea0c8", "input"],
    ["var(--amber)", "output"],
    ["var(--teal)", "cache read"],
    ["var(--purple)", "cache write"],
  ];
  const wallLegend: [string, string][] = [
    ["var(--teal)", "API call time"],
    ["#8ea0c8", "orchestration (tools, I/O, deploy)"],
  ];

  return (
    <section className="bg-surface border border-white/10 rounded-[var(--radius-md)] p-6 mt-6">
      <div className="flex justify-between items-center flex-wrap gap-2 mb-1">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--tide)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-none">
            <path d="M12 2a10 10 0 1 0 10 10" />
            <path d="M12 7v5l3 3" />
            <path d="M16 2l4 4-4 4" />
          </svg>
          <h2 className="text-[1.1rem] font-semibold m-0">
            Cost, tokens &amp; wall-clock &mdash; interactive
            <span className="ml-2 text-[0.6rem] font-mono uppercase px-2 py-0.5 rounded border text-teal-accent border-teal-accent/30 align-middle">
              {live ? "Live" : fetchError ? "Live (cached)" : "Live"}
            </span>
          </h2>
        </div>
        <span className="text-[0.72rem] text-text-faint font-mono">updated {agoLabel(lastFetch, now)}</span>
      </div>
      <p className="text-sm text-text-dim mb-4">
        A real React widget, not a server-rendered image: it polls the same <code className="font-mono bg-white/5 px-1 rounded">/api/observability</code> endpoint
        the machine-readable view uses, every 30s. Filter by agent, switch views, and click any bar or row to pin its
        full detail below.
      </p>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex gap-1.5" role="tablist" aria-label="Chart view">
          {(["cost", "tokens", "wallclock"] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`font-display text-[0.74rem] tracking-[0.02em] px-3 py-1.5 rounded-md border border-white/10 cursor-pointer ${
                tab === t ? "bg-teal-accent text-[#02120f] font-semibold" : "bg-white/[0.03] text-text-dim"
              }`}
            >
              {t === "cost" ? "Cost / run" : t === "tokens" ? "Token mix" : "API vs. orchestration"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {agents.map((a) => {
            const off = excludedAgents.has(a);
            return (
              <button
                key={a}
                onClick={() => toggleAgent(a)}
                title={off ? `Show ${a}` : `Hide ${a}`}
                className="inline-flex items-center gap-1.5 text-[0.7rem] font-mono px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03] text-text-dim cursor-pointer"
                style={{ opacity: off ? 0.4 : 1 }}
              >
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: agentColor.get(a) }} />
                {a}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          [kpis.n, "runs (filtered)"],
          [fmtCost(kpis.cost), "total cost"],
          [fmtCost(kpis.mean), "mean cost"],
          [fmtInt(kpis.tokens), "tokens (incl. cache)"],
        ].map(([val, label]) => (
          <div key={label as string} className="bg-white/[0.02] border border-white/10 rounded-lg p-3 text-center">
            <div className="text-[1.3rem] font-display font-semibold text-teal-accent">{val}</div>
            <div className="text-[0.65rem] text-text-dim uppercase tracking-[0.03em] mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="border border-white/10 rounded-lg overflow-hidden bg-black/20">
        <div className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border-b border-white/10">
          <span className="w-2 h-2 rounded-full bg-white/20 inline-block" />
          <span className="w-2 h-2 rounded-full bg-white/20 inline-block" />
          <span className="w-2 h-2 rounded-full bg-white/20 inline-block" />
          <span className="text-xs text-text-faint font-mono ml-2">last {windowRuns.length} runs &middot; hover or click a bar for detail</span>
        </div>
        <div className="p-4">
          {tab === "cost" && (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "9.5rem 1fr" }}>
              {windowRuns.map((r) => {
                const key = runKey(r);
                return (
                  <div key={key} style={{ display: "contents", cursor: "pointer" }} onClick={() => setSelected(selected === key ? null : key)}>
                    <span className="text-xs font-mono text-text-dim text-right self-center">{shortTs(r.ts)}</span>
                    <div className="h-4 bg-white/5 rounded relative self-center" title={`${r.agent} · ${fmtCost(r.cost_usd)}`}>
                      <div
                        className="absolute inset-y-0 left-0 rounded"
                        style={{
                          width: `${Math.max(3, ((r.cost_usd || 0) / costMax) * 100)}%`,
                          background: agentColor.get(r.agent),
                          outline: selected === key ? "2px solid #fff" : "none",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "tokens" && (
            <>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: "9.5rem 1fr" }}>
                {windowRuns.map((r) => {
                  const key = runKey(r);
                  const total = totalTokens(r) || 1;
                  return (
                    <div key={key} style={{ display: "contents", cursor: "pointer" }} onClick={() => setSelected(selected === key ? null : key)}>
                      <span className="text-xs font-mono text-text-dim text-right self-center">{shortTs(r.ts)}</span>
                      <div
                        className="h-4 bg-white/5 rounded flex overflow-hidden self-center"
                        style={{ width: `${Math.max(3, (total / tokMax) * 100)}%`, outline: selected === key ? "2px solid #fff" : "none" }}
                      >
                        {(r.input_tokens || 0) > 0 && <div className="h-full" style={{ width: `${((r.input_tokens || 0) / total) * 100}%`, background: "#8ea0c8" }} title={`input: ${fmtInt(r.input_tokens)}`} />}
                        {(r.output_tokens || 0) > 0 && <div className="h-full" style={{ width: `${((r.output_tokens || 0) / total) * 100}%`, background: "var(--amber)" }} title={`output: ${fmtInt(r.output_tokens)}`} />}
                        {(r.cache_read_tokens || 0) > 0 && <div className="h-full" style={{ width: `${((r.cache_read_tokens || 0) / total) * 100}%`, background: "var(--teal)" }} title={`cache read: ${fmtInt(r.cache_read_tokens)}`} />}
                        {(r.cache_creation_tokens || 0) > 0 && <div className="h-full" style={{ width: `${((r.cache_creation_tokens || 0) / total) * 100}%`, background: "var(--purple)" }} title={`cache write: ${fmtInt(r.cache_creation_tokens)}`} />}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-[0.72rem] text-text-dim">
                {legend.map(([color, label]) => (
                  <span key={label} className="inline-flex items-center gap-1.5">
                    <i className="w-2 h-2 rounded-sm inline-block not-italic" style={{ background: color }} />
                    {label}
                  </span>
                ))}
              </div>
            </>
          )}

          {tab === "wallclock" && (
            <>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: "9.5rem 1fr" }}>
                {wallRuns.length === 0 && (
                  <p className="text-text-dim text-[0.82rem]" style={{ gridColumn: "1 / -1" }}>
                    No run in this window carries <code className="font-mono bg-white/5 px-1 rounded">duration_api_ms</code> yet.
                  </p>
                )}
                {wallRuns.map((r) => {
                  const key = runKey(r);
                  const d = r.duration_ms || 1;
                  const api = Math.max(0, Math.min(r.duration_api_ms || 0, d));
                  const orch = Math.max(0, d - api);
                  return (
                    <div key={key} style={{ display: "contents", cursor: "pointer" }} onClick={() => setSelected(selected === key ? null : key)}>
                      <span className="text-xs font-mono text-text-dim text-right self-center">{shortTs(r.ts)}</span>
                      <div
                        className="h-4 bg-white/5 rounded flex overflow-hidden self-center"
                        style={{ width: `${Math.max(3, (d / wallMax) * 100)}%`, outline: selected === key ? "2px solid #fff" : "none" }}
                      >
                        <div className="h-full" style={{ width: `${(api / d) * 100}%`, background: "var(--teal)" }} title={`API: ${fmtDur(api)}`} />
                        <div className="h-full" style={{ width: `${(orch / d) * 100}%`, background: "#8ea0c8" }} title={`orchestration: ${fmtDur(orch)}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-[0.72rem] text-text-dim">
                {wallLegend.map(([color, label]) => (
                  <span key={label} className="inline-flex items-center gap-1.5">
                    <i className="w-2 h-2 rounded-sm inline-block not-italic" style={{ background: color }} />
                    {label}
                  </span>
                ))}
              </div>
            </>
          )}

          {selectedRun && (
            <div className="font-mono text-xs leading-relaxed text-text-dim bg-white/[0.02] border border-white/10 rounded-lg p-3.5 overflow-x-auto mt-4">
              <span className="text-teal-accent">agent</span> = &quot;{selectedRun.agent}&quot;<br />
              <span className="text-teal-accent">ts</span> = &quot;{selectedRun.ts}&quot;<br />
              <span className="text-teal-accent">model</span> = &quot;{selectedRun.model || "unknown"}&quot;<br />
              <span className="text-teal-accent">cost_usd</span> = {fmtCost(selectedRun.cost_usd)}<br />
              <span className="text-teal-accent">turns</span> = {fmtInt(selectedRun.turns)}<br />
              <span className="text-teal-accent">duration_ms</span> = {fmtInt(selectedRun.duration_ms)} ({fmtDur(selectedRun.duration_ms)})<br />
              <span className="text-teal-accent">duration_api_ms</span> = {fmtInt(selectedRun.duration_api_ms)}<br />
              <span className="text-teal-accent">input_tokens</span> = {fmtInt(selectedRun.input_tokens)}<br />
              <span className="text-teal-accent">output_tokens</span> = {fmtInt(selectedRun.output_tokens)}<br />
              <span className="text-teal-accent">cache_read_tokens</span> = {fmtInt(selectedRun.cache_read_tokens)}<br />
              <span className="text-teal-accent">cache_creation_tokens</span> = {fmtInt(selectedRun.cache_creation_tokens)}<br />
              <span className="text-teal-accent">is_error</span> = {String(!!selectedRun.is_error)}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm min-w-[44rem]">
          <thead>
            <tr className="text-left text-text-faint uppercase text-[0.7rem] tracking-[0.05em] border-b border-white/10">
              {([
                ["agent", "Agent", null],
                ["ts", "Started", "ts"],
                ["cost_usd", "Cost", "cost_usd"],
                ["turns", "Turns", "turns"],
                ["duration_ms", "Wall", "duration_ms"],
                ["tokens", "Tokens", "tokens"],
                ["status", "Status", null],
              ] as [string, string, SortKey | null][]).map(([id, label, key]) => (
                <th
                  key={id}
                  onClick={() => key && toggleSort(key)}
                  className={`py-2 pr-4 ${key ? "cursor-pointer select-none" : ""}`}
                  title={key ? "Click to sort" : undefined}
                >
                  {label}
                  {key && sortKey === key ? (sortDir === 1 ? " ▲" : " ▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTable.map((r) => {
              const key = runKey(r);
              return (
                <tr
                  key={key}
                  onClick={() => setSelected(selected === key ? null : key)}
                  className="border-b border-white/5 cursor-pointer"
                  style={{ background: selected === key ? "rgba(255,255,255,0.05)" : undefined }}
                >
                  <td className="py-2 pr-4">{r.agent}</td>
                  <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">{shortTs(r.ts)}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{fmtCost(r.cost_usd)}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{fmtInt(r.turns)}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{fmtDur(r.duration_ms)}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{fmtInt(totalTokens(r))}</td>
                  <td className="py-2">
                    <span className={`text-[0.65rem] font-mono uppercase px-2 py-0.5 rounded border ${r.is_error ? "text-amber-accent border-amber-accent/30" : "text-teal-accent border-teal-accent/30"}`}>
                      {r.is_error ? "error" : "ok"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
