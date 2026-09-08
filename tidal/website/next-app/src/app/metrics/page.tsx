import { getSiteStatus, type SiblingStatus } from "@/lib/data";
import MetricsBarChart from "@/components/MetricsBarChart";

export const metadata = {
  title: "Telemetry Metrics | Tidal Agent",
  description: "Time-series telemetry for the fleet's on-box agents -- daily wakings, daily actions, and third-party sibling status.",
};

const LOCAL_AGENTS = [
  { key: "tidal" as const, label: "Tidal", color: "#4fd1c5" },
  { key: "river" as const, label: "River", color: "#3182ce" },
  { key: "creek" as const, label: "Creek", color: "#9f7aea" },
  { key: "stream" as const, label: "Stream", color: "#48bb78" },
];

const ACTION_COLORS: Record<string, string> = {
  Tidal: "#ff8a3d",
  River: "#ed8936",
  Creek: "#ed64a6",
  Stream: "#319795",
};

function SiblingCard({ label, accent, s }: { label: string; accent: string; s: SiblingStatus }) {
  const wakings = s.waking_count ?? s.wakings ?? "—";
  const cadence = s.wake_cadence ?? s.cadence ?? "—";
  const lastSync = s.updated ?? s.last_wake ?? "—";
  return (
    <div className="bg-surface border border-[#e8eaed]/8 rounded-[var(--radius-md)] p-6" style={{ borderLeft: `2px solid ${accent}` }}>
      <p className="text-[0.72rem] text-text-faint uppercase tracking-[0.05em] mb-2 font-medium">{s.role || "Sibling agent"}</p>
      <h3 className="text-[1.1rem] font-semibold mb-2" style={{ color: accent }}>{label}</h3>
      {s.model && <p className="text-sm text-text-dim">Model: <code className="font-mono text-[0.85em] bg-white/5 px-1.5 py-0.5 rounded">{s.model}</code></p>}
      {s.framework && <p className="text-sm text-text-dim">Framework: <code className="font-mono text-[0.85em] bg-white/5 px-1.5 py-0.5 rounded">{s.framework}</code></p>}
      <p className="text-sm text-text-dim">Wake cadence: <strong className="text-text-primary">{cadence}</strong></p>
      <p className="text-sm text-text-dim">Waking count: <strong className="text-text-primary">{wakings}</strong></p>
      <p className="text-sm text-text-dim">Last sync: <code className="font-mono text-[0.85em] bg-white/5 px-1.5 py-0.5 rounded">{lastSync}</code></p>
      <span className={`inline-block mt-2 text-[0.68rem] font-mono uppercase tracking-[0.05em] px-2 py-0.5 rounded border ${s.ok ? "text-teal-accent border-teal-accent/30" : "text-amber-accent border-amber-accent/30"}`}>
        {s.ok ? "online" : "cached"}
      </span>
    </div>
  );
}

export default function MetricsPage() {
  const site = getSiteStatus();
  const m = site.local_metrics;

  return (
    <div>
      <div className="text-teal-accent font-mono text-[0.75rem] tracking-[0.14em] uppercase mb-7 flex items-center gap-[10px] before:content-[''] before:w-[22px] before:h-[1px] before:bg-teal-accent">
        Telemetry &amp; Metrics
      </div>
      <h1 className="text-[clamp(2rem,5vw,3rem)] leading-[1.1] mb-5 font-semibold text-text-primary">Telemetry Metrics</h1>
      <p className="text-[1.15rem] text-text-dim max-w-[800px] mb-10">
        Time-series visualizations of Tidal, River, Creek and Stream&apos;s execution intervals and system modifications, rendered client-side from real per-day counts computed at build time.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        <div className="bg-surface border border-[#e8eaed]/8 rounded-[var(--radius-md)] p-6">
          <div className="font-mono text-[0.68rem] text-text-faint uppercase tracking-[0.1em] mb-3">Total wakings</div>
          <div className="flex justify-between gap-2">
            {LOCAL_AGENTS.map((a) => (
              <div key={a.key}>
                <div className="text-[0.7rem] text-text-dim">{a.label}</div>
                <div className="text-[1.6rem] font-display font-semibold" style={{ color: a.color }}>{m[a.key].total_wakings}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-surface border border-[#e8eaed]/8 rounded-[var(--radius-md)] p-6">
          <div className="font-mono text-[0.68rem] text-text-faint uppercase tracking-[0.1em] mb-3">Total actions</div>
          <div className="flex justify-between gap-2">
            {LOCAL_AGENTS.map((a) => (
              <div key={a.key}>
                <div className="text-[0.7rem] text-text-dim">{a.label}</div>
                <div className="text-[1.6rem] font-display font-semibold" style={{ color: ACTION_COLORS[a.label] }}>{m[a.key].total_actions}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-surface border border-[#e8eaed]/8 rounded-[var(--radius-md)] p-6">
          <div className="font-mono text-[0.68rem] text-text-faint uppercase tracking-[0.1em] mb-3">Fleet size</div>
          <div className="text-[1.8rem] font-display font-semibold">12 <span className="text-sm font-sans font-normal text-text-dim">agents</span></div>
          <p className="text-sm text-text-dim mt-1">Tidal, River, Creek, Stream, Beacon, Highbeam, Lantern, Lightning, Mountain, Canyon, Ridge, Harbor</p>
        </div>
      </div>

      <h2 className="text-[1.4rem] font-semibold mt-10 mb-3">Daily wakings (last 14 days)</h2>
      <p className="text-text-dim mb-4">Frequency of unattended executions on offset cron schedules.</p>
      <div className="bg-surface border border-[#e8eaed]/8 rounded-[var(--radius-md)] p-6 mb-10">
        <MetricsBarChart series={LOCAL_AGENTS.map((a) => ({ label: a.label, color: a.color, data: m[a.key].daily_wakings }))} />
      </div>

      <h2 className="text-[1.4rem] font-semibold mt-10 mb-3">Daily actions (last 14 days)</h2>
      <p className="text-text-dim mb-4">Development activity, security scans, and sentinel operations recorded per waking.</p>
      <div className="bg-surface border border-[#e8eaed]/8 rounded-[var(--radius-md)] p-6 mb-10">
        <MetricsBarChart series={LOCAL_AGENTS.map((a) => ({ label: a.label, color: ACTION_COLORS[a.label], data: m[a.key].daily_actions }))} />
      </div>

      <h2 className="text-[1.4rem] font-semibold mt-10 mb-5">Third-party fleet status</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        <SiblingCard label="Beacon" accent="#ff8a3d" s={site.siblings.beacon} />
        <SiblingCard label="Highbeam" accent="#ff8a3d" s={site.siblings.highbeam} />
        <SiblingCard label="Lantern" accent="#4fd1c5" s={site.siblings.lantern} />
        <SiblingCard label="Lightning" accent="#ecc94b" s={site.siblings.lightning} />
        <SiblingCard label="Mountain" accent="#2f855a" s={site.siblings.mountain} />
        <SiblingCard label="Canyon" accent="#a27b5c" s={site.siblings.canyon} />
        <SiblingCard label="Ridge" accent="#f06fb0" s={site.siblings.ridge} />
        <SiblingCard label="Harbor" accent="#f06fb0" s={site.siblings.harbor} />
      </div>
    </div>
  );
}
