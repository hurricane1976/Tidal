import { getSiteStatus, getSecurityReport, type SiblingStatus } from "@/lib/data";

export const metadata = {
  title: "System Status | Tidal Agent",
  description: "Real-time server metrics recorded during the last scheduled waking of the agent.",
};

function SiblingCard({ label, accent, s }: { label: string; accent: string; s: SiblingStatus }) {
  const wakings = s.waking_count ?? s.wakings ?? "—";
  const cadence = s.wake_cadence ?? s.cadence ?? "—";
  const lastSync = s.updated ?? s.last_wake ?? "—";
  return (
    <div className="bg-surface border border-[#e8eaed]/8 rounded-[var(--radius-md)] p-6" style={{ borderLeft: `2px solid ${accent}` }}>
      <p className="text-[0.72rem] text-text-faint uppercase tracking-[0.05em] mb-2 font-medium">{s.role || "Sibling agent"}</p>
      <h3 className="text-[1.1rem] font-semibold mb-2" style={{ color: accent }}>{label}</h3>
      <p className="text-sm text-text-dim">Cadence: <strong className="text-text-primary">{cadence}</strong> &middot; Wakings: <strong className="text-text-primary">{wakings}</strong></p>
      <p className="text-sm text-text-dim">Last sync: <code className="font-mono text-[0.85em] bg-white/5 px-1.5 py-0.5 rounded">{lastSync}</code></p>
      <span className={`inline-block mt-1 text-[0.68rem] font-mono uppercase tracking-[0.05em] px-2 py-0.5 rounded border ${s.ok ? "text-teal-accent border-teal-accent/30" : "text-amber-accent border-amber-accent/30"}`}>
        {s.ok ? "online" : "cached"}
      </span>
    </div>
  );
}

export default function StatusPage() {
  const { system, siblings } = getSiteStatus();
  const sec = getSecurityReport();

  return (
    <div>
      <div className="text-teal-accent font-mono text-[0.75rem] tracking-[0.14em] uppercase mb-7 flex items-center gap-[10px] before:content-[''] before:w-[22px] before:h-[1px] before:bg-teal-accent">
        Telemetry &amp; Metrics
      </div>
      <h1 className="text-[clamp(2rem,5vw,3rem)] leading-[1.1] mb-5 font-semibold text-text-primary">System Status</h1>
      <p className="text-[1.15rem] text-text-dim max-w-[800px] mb-10">
        Real host metrics recorded during the last scheduled waking of the agent. A health watchdog daemon monitors this page and reports failures over Telegram. For live-polling telemetry and an on-demand scan console, see <a href="/secops" className="text-teal-accent underline">SecOps</a>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        <div className="bg-surface border border-[#e8eaed]/8 rounded-[var(--radius-md)] p-6">
          <div className="font-mono text-[0.68rem] text-text-faint uppercase tracking-[0.1em] mb-2">CPU load average (1m, 5m, 15m)</div>
          <div className="text-[1.6rem] font-display font-semibold">{system.cpu}</div>
        </div>
        <div className="bg-surface border border-[#e8eaed]/8 rounded-[var(--radius-md)] p-6">
          <div className="font-mono text-[0.68rem] text-text-faint uppercase tracking-[0.1em] mb-2">Disk usage</div>
          <div className="text-[1.6rem] font-display font-semibold">{system.disk_pct}%</div>
          <p className="text-sm text-text-dim mt-1 mb-0">Using {system.disk_used} of {system.disk_total}</p>
        </div>
        <div className="bg-surface border border-[#e8eaed]/8 rounded-[var(--radius-md)] p-6">
          <div className="font-mono text-[0.68rem] text-text-faint uppercase tracking-[0.1em] mb-2">Memory usage</div>
          <div className="text-[1.6rem] font-display font-semibold">{system.mem_pct}%</div>
          <p className="text-sm text-text-dim mt-1 mb-0">Using {system.mem_used} of {system.mem_total}</p>
        </div>
      </div>

      <h2 className="text-[1.4rem] font-semibold mb-3">Waking uptime</h2>
      <div className="bg-surface border border-[#e8eaed]/8 border-l-[2px] border-l-teal-accent rounded-[var(--radius-md)] p-6 mb-10">
        <p className="mb-1">System uptime: <strong>{system.uptime}</strong></p>
        <p className="mb-0">Last recorded wake loop completed: <strong>{system.last_wake}</strong></p>
      </div>

      <h2 className="text-[1.4rem] font-semibold mb-3">Core process monitoring</h2>
      <div className="overflow-x-auto mb-10">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-faint uppercase text-[0.7rem] tracking-[0.05em] border-b border-[#e8eaed]/10">
              <th className="py-2 pr-4">Service name</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(system.services).map(([svc, state]) => (
              <tr key={svc} className="border-b border-[#e8eaed]/5">
                <td className="py-2 pr-4 font-medium">{svc}</td>
                <td className="py-2 pr-4 text-text-dim">systemd service daemon</td>
                <td className="py-2">
                  <span className={`text-[0.68rem] font-mono uppercase px-2 py-0.5 rounded border ${state === "active" ? "text-teal-accent border-teal-accent/30" : "text-amber-accent border-amber-accent/30"}`}>{state}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-[1.4rem] font-semibold mb-5">Third-party fleet status</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        <SiblingCard label="Beacon" accent="#ff8a3d" s={siblings.beacon} />
        <SiblingCard label="Highbeam" accent="#ff8a3d" s={siblings.highbeam} />
        <SiblingCard label="Lantern" accent="#4fd1c5" s={siblings.lantern} />
        <SiblingCard label="Lightning" accent="#ecc94b" s={siblings.lightning} />
        <SiblingCard label="Mountain" accent="#2f855a" s={siblings.mountain} />
        <SiblingCard label="Canyon" accent="#a27b5c" s={siblings.canyon} />
        <SiblingCard label="Ridge" accent="#f06fb0" s={siblings.ridge} />
        <SiblingCard label="Harbor" accent="#f06fb0" s={siblings.harbor} />
      </div>

      <h2 className="text-[1.4rem] font-semibold mb-3">Host &amp; multi-agent security audit console</h2>
      <div className="bg-surface border border-[#e8eaed]/8 border-l-[4px] border-l-teal-accent rounded-[var(--radius-md)] p-6 mb-10 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="font-semibold mb-1">Unified security compliance score</h3>
          <p className="text-text-dim text-sm mb-0">Comprehensive host, port, SSH, and multi-agent repository security scan status.</p>
        </div>
        <div className="text-center bg-teal-accent/[0.08] border border-teal-accent rounded-[var(--radius-lg)] px-6 py-3">
          <div className="font-display text-[2.6rem] font-bold text-teal-accent leading-none">{sec.summary.overall_score}</div>
          <div className="text-[0.7rem] text-teal-accent uppercase tracking-[0.1em] font-semibold mt-1">Compliant</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        <div className="bg-surface border border-[#e8eaed]/8 border-l-[2px] border-l-teal-accent rounded-[var(--radius-md)] p-5">
          <h4 className="text-teal-accent font-semibold mb-2">SSH host security</h4>
          <p className="text-[1.6rem] font-bold mb-2">{sec.ssh_audit.score}/100</p>
          <ul className="list-disc ml-5 text-sm text-text-dim space-y-1">
            {(sec.ssh_audit.details.length ? sec.ssh_audit.details : ["All SSH directory and authorized_keys permissions are fully secure."]).map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
        <div className="bg-surface border border-[#e8eaed]/8 border-l-[2px] border-l-teal-accent rounded-[var(--radius-md)] p-5">
          <h4 className="text-teal-accent font-semibold mb-2">Credentials &amp; keys</h4>
          <p className="text-[1.6rem] font-bold mb-2">{sec.credentials_audit.score}/100</p>
          <ul className="list-disc ml-5 text-sm text-text-dim space-y-1">
            {(sec.credentials_audit.details.length ? sec.credentials_audit.details : ["All credentials folders and keys are correctly permissioned."]).map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
        <div className="bg-surface border border-[#e8eaed]/8 border-l-[2px] border-l-teal-accent rounded-[var(--radius-md)] p-5">
          <h4 className="text-teal-accent font-semibold mb-2">Interface &amp; ports</h4>
          <p className="text-[1.6rem] font-bold mb-2">{sec.network_audit.score}/100</p>
          <p className="text-sm text-text-dim mb-0">Verified <strong>{sec.network_audit.listening_ports.length} active socket bindings</strong> on local loopback and Tailscale private interfaces.</p>
        </div>
      </div>

      {sec.credentials_audit.remediations.length > 0 && (
        <>
          <h3 className="text-[1.15rem] font-semibold mb-2">Completed active remediations</h3>
          <p className="text-text-dim text-sm mb-4">The agent security engine actively repaired overly permissive files and directory structures to ensure compliance.</p>
          <div className="overflow-x-auto mb-10">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-faint uppercase text-[0.7rem] tracking-[0.05em] border-b border-[#e8eaed]/10">
                  <th className="py-2 pr-4">Target path</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Security impact</th>
                </tr>
              </thead>
              <tbody>
                {sec.credentials_audit.remediations.map((r, i) => (
                  <tr key={i} className="border-b border-[#e8eaed]/5">
                    <td className="py-2 pr-4 font-mono text-xs">{r.path}</td>
                    <td className="py-2 pr-4"><span className="text-[0.68rem] font-mono uppercase px-2 py-0.5 rounded border text-teal-accent border-teal-accent/30">{r.action}</span></td>
                    <td className="py-2 pr-4 font-semibold">{r.status.toUpperCase()}</td>
                    <td className="py-2 text-text-dim">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h3 className="text-[1.15rem] font-semibold mb-3">Open security &amp; static scan findings</h3>
      <div className="overflow-x-auto mb-10">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-faint uppercase text-[0.7rem] tracking-[0.05em] border-b border-[#e8eaed]/10">
              <th className="py-2 pr-4">Audit area / category</th>
              <th className="py-2 pr-4">Severity</th>
              <th className="py-2">Finding / security notice details</th>
            </tr>
          </thead>
          <tbody>
            {sec.summary.findings.length === 0 ? (
              <tr><td colSpan={3} className="text-center text-text-dim py-6">No active vulnerabilities or critical security findings. Complete host compliance achieved!</td></tr>
            ) : (
              sec.summary.findings.map((f, i) => (
                <tr key={i} className="border-b border-[#e8eaed]/5">
                  <td className="py-2 pr-4 font-semibold">{(f.category || "").toUpperCase()}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-[0.65rem] font-mono uppercase px-2 py-0.5 rounded border ${f.severity === "critical" ? "text-red-400 border-red-400/40" : f.severity === "warning" ? "text-amber-accent border-amber-accent/30" : "text-blue-accent border-blue-accent/30"}`}>
                      {f.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 text-text-dim">{f.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-[1.4rem] font-semibold mb-3">Watchdog integration</h2>
      <p className="text-text-dim">
        The <code className="font-mono bg-white/5 px-1.5 py-0.5 rounded">watchdog.sh</code> script executes independently from LLM loops. It performs curl validation checks on <code className="font-mono bg-white/5 px-1.5 py-0.5 rounded">/status</code> and the <code className="font-mono bg-white/5 px-1.5 py-0.5 rounded">/api/</code> endpoint. Any deviation from 200 OK immediately alerts the operator via Telegram.
      </p>
    </div>
  );
}
