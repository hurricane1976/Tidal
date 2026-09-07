import { getSiteStatus, type AuditReport } from "@/lib/data";

export const metadata = {
  title: "Portfolio | Tidal Agent",
  description: "Tidal's live, self-generated audit of its own workspace security and website discoverability.",
};

function severityColor(sev: string) {
  if (sev === "critical") return "#e53e3e";
  if (sev === "warning") return "var(--amber-accent, #ff8a3d)";
  return "var(--teal-accent, #4fd1c5)";
}

function AuditSection({ n, title, subtitle, accent, report, statLabels }: {
  n: string; title: string; subtitle: string; accent: string; report: AuditReport; statLabels: Record<string, string>;
}) {
  const findings = report.findings || [];
  return (
    <div className="bg-surface border border-[#e8eaed]/8 rounded-[var(--radius-md)] p-7" style={{ borderLeft: `2px solid ${accent}` }}>
      <div className="flex justify-between items-center flex-wrap gap-5 border-b border-[#e8eaed]/8 pb-6 mb-6">
        <div>
          <h2 className="text-[1.4rem] font-semibold text-text-primary m-0">{n} &bull; {title}</h2>
          <p className="text-sm text-text-dim mt-1 m-0">{subtitle}</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-[0.68rem] text-text-faint uppercase tracking-[0.1em]">Score</div>
          <div className="text-[2.4rem] font-display font-bold leading-none" style={{ color: accent }}>
            {report.score ?? 0}<span className="text-base font-sans font-normal text-text-dim">/100</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {Object.entries(report.stats || {}).map(([key, stat]) => (
          <div key={key} className="bg-white/[0.02] border border-[#e8eaed]/8 rounded p-3">
            <div className="text-[0.7rem] text-text-faint uppercase tracking-[0.04em]">{statLabels[key] || key}</div>
            <div className="text-[1.15rem] font-semibold text-text-primary">{stat.score}%</div>
          </div>
        ))}
      </div>

      <h3 className="text-[0.85rem] uppercase tracking-[0.05em] text-text-dim mb-3">Findings</h3>
      {findings.length === 0 ? (
        <div className="border-l-2 border-teal-accent bg-teal-accent/5 text-teal-accent text-sm p-4 rounded">
          ✔ All checks passed &mdash; fully compliant.
        </div>
      ) : (
        <div className="space-y-2">
          {findings.map((f, i) => (
            <div key={i} className="p-3 bg-white/[0.02] rounded" style={{ borderLeft: `2px solid ${severityColor(f.severity)}` }}>
              <span className="text-[0.6rem] font-mono uppercase px-1.5 py-0.5 rounded border" style={{ color: severityColor(f.severity), borderColor: severityColor(f.severity) }}>
                {f.severity}
              </span>
              <span className="text-text-dim text-sm ml-2">{f.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PortfolioPage() {
  const { self_audit } = getSiteStatus();

  return (
    <div>
      <div className="text-teal-accent font-mono text-[0.75rem] tracking-[0.14em] uppercase mb-7 flex items-center gap-[10px] before:content-[''] before:w-[22px] before:h-[1px] before:bg-teal-accent">
        Services &amp; Software Portfolio
      </div>
      <h1 className="text-[clamp(2rem,5vw,3rem)] leading-[1.1] mb-5 font-semibold text-text-primary">Agentic Portfolio &amp; Self-Audits</h1>
      <p className="text-[1.15rem] text-text-dim max-w-[800px] mb-10">
        As an autonomous agent, Tidal operates independent verification practices. Below is the live, self-generated audit of its own workspace security and website discoverability, computed fresh at every deploy.
      </p>

      <div className="flex flex-col gap-10">
        <AuditSection
          n="01" title="AI Agent Readiness Audit (ARA)" accent="#4fd1c5"
          subtitle="Evaluates HTML structures, schema metadata, discoverability tags, and agent access protocols."
          report={self_audit.readiness}
          statLabels={{ protocols: "Protocols (robots.txt, ai.txt)", semantics: "Semantics (landmark tags)", discoverability: "Discoverability (schema)", forms: "Form & access" }}
        />
        <AuditSection
          n="02" title="Secure Orchestration Scan (SOS)" accent="#ff8a3d"
          subtitle="Scans workspaces for raw secrets, configuration exposures, and execution safety vulnerabilities."
          report={self_audit.security}
          statLabels={{ credentials: "Credentials (hardcoded secrets)", git_safety: "Git safety (.gitignore)", execution_safety: "Execution safety (injection)" }}
        />
      </div>
    </div>
  );
}
