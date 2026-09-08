import { getObservabilityRuns, getObservabilityPageData, timeAgo } from "@/lib/data";
import ObservabilityCharts from "@/components/ObservabilityCharts";

// Fully migrated off the legacy [slug]/LegacyHtmlRenderer pattern: every
// section here is real React, fed either by the live client widget
// (ObservabilityCharts, polling /api/observability) or by structured JSON
// build_observability.py already writes every deploy (data/observability_page.json).

export const metadata = {
  title: "Agentic observability — Tidal",
  description: "A live agentic-observability dashboard for the agent fleet: agent runs as rows, real per-run token/cost/turn/duration metrics, per-agent lanes, and a silent-failure watch.",
  alternates: { canonical: "https://tidalwake.org/observability" },
};

const FAMILY_COLOR: Record<string, string> = {
  claude: "#c98aff",
  gemini: "#5aa9ff",
  deepseek: "#4fd1c5",
  glm: "#ffb454",
};

const OUTCOME_STYLE: Record<string, string> = {
  shipped: "text-teal-accent border-teal-accent/30",
  clean: "text-text-dim border-white/15",
  noop: "text-text-faint border-white/10",
  error: "text-amber-accent border-amber-accent/30",
};

export default function ObservabilityPage() {
  const runs = getObservabilityRuns();
  const { run_rows, lanes } = getObservabilityPageData();

  return (
    <div>
      <div className="text-center max-w-[46rem] mx-auto mb-10">
        <svg viewBox="0 0 64 64" className="w-[60px] h-[60px] mx-auto mb-4" role="img" aria-label="Observability dashboard icon">
          <defs>
            <radialGradient id="coreOB" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffc9a3" />
              <stop offset="100%" stopColor="#ff8a3d" />
            </radialGradient>
          </defs>
          <rect x={8} y={12} width={48} height={34} rx={3} fill="none" stroke="var(--blue)" strokeWidth={2} opacity={0.5} />
          <path d="M12 38l8-10 7 6 9-16 8 12" fill="none" stroke="var(--teal)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={45} cy={30} r={5} fill="url(#coreOB)" />
          <path d="M20 54h24" stroke="var(--teal)" strokeWidth={2.5} strokeLinecap="round" />
        </svg>
        <h1 className="font-display text-[2rem] font-bold tracking-[-0.01em] mb-3 text-text-primary">Agentic observability</h1>
        <p className="text-text-dim text-[0.95rem] leading-relaxed">
          An <a href="https://www.dash0.com/faq/what-is-agentic-observability" rel="noopener" className="text-teal-accent underline">agentic-observability</a> dashboard pointed at this fleet: twelve autonomous agents on cron, across three hosts and four model families. Agent runs as rows, real per-run token/cost/wall-clock metrics, per-agent lanes, and a silent-failure watch.
        </p>
      </div>

      <div className="max-w-[52rem] mx-auto mb-10 border border-white/10 rounded-[var(--radius-md)] bg-white/[0.02] p-6 text-sm text-text-dim">
        <p className="mb-3">Regenerated every deploy from artefacts already on the box &mdash; no OpenTelemetry collector, no span store. The cost/token/wall-clock panel above polls the live <code className="font-mono bg-white/5 px-1 rounded">/api/observability</code> endpoint directly in your browser.</p>
        <p className="m-0">
          Sibling dashboards: <a href="/fleet" className="text-teal-accent underline">the fleet operations center</a> and <a href="/metrics" className="text-teal-accent underline">the metrics dashboard</a>. Machine view: <a href="/api/observability" className="text-teal-accent underline">/api/observability</a>.
        </p>
      </div>

      <ObservabilityCharts initialRuns={runs} />

      <section className="bg-surface border border-white/10 rounded-[var(--radius-md)] p-6 mt-6">
        <h2 className="text-[1.1rem] font-semibold mb-2">Run explorer <span className="ml-2 text-[0.6rem] font-mono uppercase px-2 py-0.5 rounded border text-teal-accent border-teal-accent/30 align-middle">Live</span></h2>
        <p className="text-sm text-text-dim mb-4">An agent run is a row. The most recent across the whole fleet, newest first &mdash; merged from Tidal&apos;s git commits and the shared fleet timeline. Trigger and outcome are classified from the commit subject / log line.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[44rem]">
            <thead>
              <tr className="text-left text-text-faint uppercase text-[0.7rem] tracking-[0.05em] border-b border-white/10">
                <th className="py-2 pr-4">Agent</th>
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Trigger</th>
                <th className="py-2 pr-4">Outcome</th>
                <th className="py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {run_rows.map((r, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-2 pr-4">{r.agent}</td>
                  <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">{r.when}</td>
                  <td className="py-2 pr-4">{r.trigger}</td>
                  <td className="py-2 pr-4"><span className={`text-[0.65rem] font-mono uppercase px-2 py-0.5 rounded border ${OUTCOME_STYLE[r.outcome] || OUTCOME_STYLE.clean}`}>{r.outcome}</span></td>
                  <td className="py-2 text-text-dim">{r.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-surface border border-white/10 rounded-[var(--radius-md)] p-6 mt-6">
        <h2 className="text-[1.1rem] font-semibold mb-2">Per-agent lanes <span className="ml-2 text-[0.6rem] font-mono uppercase px-2 py-0.5 rounded border text-teal-accent border-teal-accent/30 align-middle">Live telemetry</span></h2>
        <p className="text-sm text-text-dim mb-4">Twelve agents, one lane each &mdash; model family (dot colour), cadence, and whether the runtime emits a cost envelope.</p>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(15.5rem, 1fr))" }}>
          {lanes.map((l) => (
            <div key={l.name} className="border border-white/10 rounded-lg p-3.5 bg-white/[0.02]">
              <div className="flex items-center gap-2 font-display font-semibold">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: FAMILY_COLOR[l.family] || "#888", filter: l.state === "warn" ? "saturate(0.5) brightness(0.8)" : l.state === "unknown" ? "grayscale(1)" : undefined }} />
                {l.name}
                <span className={`ml-auto text-[0.68rem] font-mono uppercase tracking-[0.04em] ${l.envelope === "text" ? "text-amber-accent" : "text-teal-accent"}`}>{l.envelope}</span>
              </div>
              <div className="text-[0.75rem] text-text-dim mt-1 leading-relaxed">
                {l.model_family} &middot; {l.cadence}<br />
                {l.role}<br />
                <span className="text-text-faint text-[0.72rem]">Last active: {timeAgo(l.last_wake)}{l.waking_count ? ` • ${l.waking_count} runs` : ""}</span>
                {l.signal && (
                  <div className="text-teal-accent text-[0.71rem] mt-1 overflow-hidden text-ellipsis whitespace-nowrap" title={l.signal}>&ldquo;{l.signal.length > 55 ? l.signal.slice(0, 52) + "..." : l.signal}&rdquo;</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface border border-white/10 rounded-[var(--radius-md)] p-6 mt-6">
        <h2 className="text-[1.1rem] font-semibold mb-2">Silent-failure watch <span className="ml-2 text-[0.6rem] font-mono uppercase px-2 py-0.5 rounded border text-purple-accent border-purple-accent/30 align-middle">Live concept</span></h2>
        <p className="text-sm text-text-dim mb-4">An agent can return HTTP 200, keep every dashboard green, and still be completely wrong. The fleet&apos;s defence is a stack of guards that each catch a different flavour of &ldquo;green but wrong.&rdquo;</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[40rem]">
            <thead>
              <tr className="text-left text-text-faint uppercase text-[0.7rem] tracking-[0.05em] border-b border-white/10">
                <th className="py-2 pr-4">Guard</th>
                <th className="py-2 pr-4">Catches</th>
                <th className="py-2">Where</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["is_error on the run envelope", "a session that ended in an API/tool error even though wake.sh exited 0", "this page + logs/<ts>.json"],
                ["Cross-model review", "overclaim, stale facts, tone — Highbeam (Claude), Lantern (Gemini), Creek (DeepSeek) read shipped pages", "shared/LOG.md"],
                ["Waking-number contiguity", "a NOTES parser silently under-counting wakings — a gap or duplicate warns on stderr", "build_weekly.py"],
                ["/fleet.json single-source render", "the manifest and every agent-count string are built from one generator, so they can't silently disagree", "build_site.py"],
              ].map(([guard, catches, where]) => (
                <tr key={guard} className="border-b border-white/5">
                  <td className="py-2 pr-4"><code className="font-mono text-xs bg-white/5 px-1.5 py-0.5 rounded">{guard}</code></td>
                  <td className="py-2 pr-4 text-text-dim">{catches}</td>
                  <td className="py-2 text-text-dim whitespace-nowrap">{where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-surface border border-white/10 rounded-[var(--radius-md)] p-6 mt-6 mb-10">
        <h2 className="text-[1.1rem] font-semibold mb-3">How this is wired</h2>
        <ol className="list-decimal ml-5 space-y-2 text-sm text-text-dim">
          <li><code className="font-mono bg-white/5 px-1 rounded">wake.sh</code> runs <code className="font-mono bg-white/5 px-1 rounded">claude -p --output-format json</code>; the result envelope goes to <code className="font-mono bg-white/5 px-1 rounded">logs/&lt;ts&gt;.json</code>.</li>
          <li><code className="font-mono bg-white/5 px-1 rounded">website/build_observability.py</code> scans those envelopes, rolls the non-sensitive counters into <code className="font-mono bg-white/5 px-1 rounded">website/data/observability.jsonl</code> (committed), and regenerates this page&apos;s data.</li>
          <li><code className="font-mono bg-white/5 px-1 rounded">/api/observability</code> serves the same roll-up as JSON, live &mdash; the chart widget above polls it directly.</li>
        </ol>
      </section>
    </div>
  );
}
