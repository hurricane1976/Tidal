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
      <div className="card">
        <p className="!mb-0" style={{ color: "var(--muted)" }}>
          Awaiting the first instrumented run &mdash; this widget polls{" "}
          <code>/api/observability</code> live and will populate automatically.
        </p>
      </div>
    );
  }

  return (
    <section className="card" style={{ marginTop: "1.1rem" }}>
      <div className="card-head" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <div className="card-head" style={{ marginBottom: 0 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10" />
            <path d="M12 7v5l3 3" />
            <path d="M16 2l4 4-4 4" />
          </svg>
          <h2>
            Cost, tokens &amp; wall-clock &mdash; interactive
            <span className="panel-flag live">{live ? "Live" : fetchError ? "Live (cached)" : "Live"}</span>
          </h2>
        </div>
        <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: '"IBM Plex Mono",monospace' }}>
          updated {agoLabel(lastFetch, now)}
        </span>
      </div>
      <p>
        A real React widget, not a server-rendered image: it polls the same <code>/api/observability</code> endpoint
        the machine-readable view uses, every 30s. Filter by agent, switch views, and click any bar or row to pin its
        full detail below.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.1rem", alignItems: "center", margin: "0.2rem 0 1rem" }}>
        <div style={{ display: "flex", gap: "0.35rem" }} role="tablist" aria-label="Chart view">
          {(["cost", "tokens", "wallclock"] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              style={{
                fontFamily: '"Space Grotesk",sans-serif',
                fontSize: "0.74rem",
                letterSpacing: "0.02em",
                padding: "0.35rem 0.8rem",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
                background: tab === t ? "var(--accent-2, #4fd1c5)" : "rgba(255,255,255,0.03)",
                color: tab === t ? "#02120f" : "var(--muted)",
                fontWeight: tab === t ? 600 : 400,
              }}
            >
              {t === "cost" ? "Cost / run" : t === "tokens" ? "Token mix" : "API vs. orchestration"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {agents.map((a) => {
            const off = excludedAgents.has(a);
            return (
              <button
                key={a}
                onClick={() => toggleAgent(a)}
                title={off ? `Show ${a}` : `Hide ${a}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.7rem",
                  fontFamily: '"IBM Plex Mono",monospace',
                  padding: "0.25rem 0.55rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                  opacity: off ? 0.4 : 1,
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--muted)",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: agentColor.get(a),
                    display: "inline-block",
                  }}
                />
                {a}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mock-gauge-wrap" style={{ marginBottom: "1rem" }}>
        <div className="mock-gauge">
          <div className="n ok">{kpis.n}</div>
          <div className="l">runs (filtered)</div>
        </div>
        <div className="mock-gauge">
          <div className="n ok">{fmtCost(kpis.cost)}</div>
          <div className="l">total cost</div>
        </div>
        <div className="mock-gauge">
          <div className="n ok">{fmtCost(kpis.mean)}</div>
          <div className="l">mean cost</div>
        </div>
        <div className="mock-gauge">
          <div className="n ok">{fmtInt(kpis.tokens)}</div>
          <div className="l">tokens (incl. cache)</div>
        </div>
      </div>

      <div className="mock-window">
        <div className="mock-titlebar">
          <span className="dot" /><span className="dot" /><span className="dot" />
          <span className="label">last {windowRuns.length} runs &middot; hover or click a bar for detail</span>
        </div>
        <div className="mock-body">
          {tab === "cost" && (
            <div className="costbars">
              {windowRuns.map((r) => {
                const key = runKey(r);
                return (
                  <div
                    key={key}
                    style={{ display: "contents", cursor: "pointer" }}
                    onClick={() => setSelected(selected === key ? null : key)}
                  >
                    <span className="cb-l">{shortTs(r.ts)}</span>
                    <div className="cb-t" title={`${r.agent} &middot; ${fmtCost(r.cost_usd)}`}>
                      <div
                        className="cb-b real"
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
              <div className="stackbars">
                {windowRuns.map((r) => {
                  const key = runKey(r);
                  const total = totalTokens(r) || 1;
                  return (
                    <div
                      key={key}
                      style={{ display: "contents", cursor: "pointer" }}
                      onClick={() => setSelected(selected === key ? null : key)}
                    >
                      <span className="sb-l">{shortTs(r.ts)}</span>
                      <div
                        className="sb-t"
                        style={{
                          width: `${Math.max(3, (total / tokMax) * 100)}%`,
                          outline: selected === key ? "2px solid #fff" : "none",
                        }}
                      >
                        {(r.input_tokens || 0) > 0 && (
                          <div className="sb-seg" style={{ width: `${((r.input_tokens || 0) / total) * 100}%`, background: "#8ea0c8" }} title={`input: ${fmtInt(r.input_tokens)}`} />
                        )}
                        {(r.output_tokens || 0) > 0 && (
                          <div className="sb-seg" style={{ width: `${((r.output_tokens || 0) / total) * 100}%`, background: "var(--amber)" }} title={`output: ${fmtInt(r.output_tokens)}`} />
                        )}
                        {(r.cache_read_tokens || 0) > 0 && (
                          <div className="sb-seg" style={{ width: `${((r.cache_read_tokens || 0) / total) * 100}%`, background: "var(--accent-2)" }} title={`cache read: ${fmtInt(r.cache_read_tokens)}`} />
                        )}
                        {(r.cache_creation_tokens || 0) > 0 && (
                          <div className="sb-seg" style={{ width: `${((r.cache_creation_tokens || 0) / total) * 100}%`, background: "var(--purple)" }} title={`cache write: ${fmtInt(r.cache_creation_tokens)}`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="stack-legend">
                <span><i style={{ background: "#8ea0c8" }} />input</span>
                <span><i style={{ background: "var(--amber)" }} />output</span>
                <span><i style={{ background: "var(--accent-2)" }} />cache read</span>
                <span><i style={{ background: "var(--purple)" }} />cache write</span>
              </div>
            </>
          )}

          {tab === "wallclock" && (
            <>
              <div className="stackbars">
                {wallRuns.length === 0 && (
                  <p style={{ gridColumn: "1 / -1", color: "var(--muted)", fontSize: "0.82rem" }}>
                    No run in this window carries <code>duration_api_ms</code> yet.
                  </p>
                )}
                {wallRuns.map((r) => {
                  const key = runKey(r);
                  const d = r.duration_ms || 1;
                  const api = Math.max(0, Math.min(r.duration_api_ms || 0, d));
                  const orch = Math.max(0, d - api);
                  return (
                    <div
                      key={key}
                      style={{ display: "contents", cursor: "pointer" }}
                      onClick={() => setSelected(selected === key ? null : key)}
                    >
                      <span className="sb-l">{shortTs(r.ts)}</span>
                      <div
                        className="sb-t"
                        style={{
                          width: `${Math.max(3, (d / wallMax) * 100)}%`,
                          outline: selected === key ? "2px solid #fff" : "none",
                        }}
                      >
                        <div className="sb-seg" style={{ width: `${(api / d) * 100}%`, background: "var(--accent-2)" }} title={`API: ${fmtDur(api)}`} />
                        <div className="sb-seg" style={{ width: `${(orch / d) * 100}%`, background: "#8ea0c8" }} title={`orchestration: ${fmtDur(orch)}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="stack-legend">
                <span><i style={{ background: "var(--accent-2)" }} />API call time</span>
                <span><i style={{ background: "#8ea0c8" }} />orchestration (tools, I/O, deploy)</span>
              </div>
            </>
          )}

          {selectedRun && (
            <div className="attr-list" style={{ marginTop: "1rem" }}>
              <span className="k">agent</span> = &quot;{selectedRun.agent}&quot;<br />
              <span className="k">ts</span> = &quot;{selectedRun.ts}&quot;<br />
              <span className="k">model</span> = &quot;{selectedRun.model || "unknown"}&quot;<br />
              <span className="k">cost_usd</span> = {fmtCost(selectedRun.cost_usd)}<br />
              <span className="k">turns</span> = {fmtInt(selectedRun.turns)}<br />
              <span className="k">duration_ms</span> = {fmtInt(selectedRun.duration_ms)} ({fmtDur(selectedRun.duration_ms)})<br />
              <span className="k">duration_api_ms</span> = {fmtInt(selectedRun.duration_api_ms)}<br />
              <span className="k">input_tokens</span> = {fmtInt(selectedRun.input_tokens)}<br />
              <span className="k">output_tokens</span> = {fmtInt(selectedRun.output_tokens)}<br />
              <span className="k">cache_read_tokens</span> = {fmtInt(selectedRun.cache_read_tokens)}<br />
              <span className="k">cache_creation_tokens</span> = {fmtInt(selectedRun.cache_creation_tokens)}<br />
              <span className="k">is_error</span> = {String(!!selectedRun.is_error)}
            </div>
          )}
        </div>
      </div>

      <div style={{ overflowX: "auto", marginTop: "1rem" }}>
        <table className="data-table" style={{ minWidth: "44rem" }}>
          <thead>
            <tr>
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
                  style={{ cursor: key ? "pointer" : "default", userSelect: "none" }}
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
                  style={{ cursor: "pointer", background: selected === key ? "rgba(255,255,255,0.05)" : undefined }}
                >
                  <td>{r.agent}</td>
                  <td className="mono">{shortTs(r.ts)}</td>
                  <td className="mono">{fmtCost(r.cost_usd)}</td>
                  <td className="mono">{fmtInt(r.turns)}</td>
                  <td className="mono">{fmtDur(r.duration_ms)}</td>
                  <td className="mono">{fmtInt(totalTokens(r))}</td>
                  <td>
                    <span className={`outcome ${r.is_error ? "error" : "shipped"}`}>{r.is_error ? "error" : "ok"}</span>
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
