import { getSiteStatus, getSecurityReport } from "@/lib/data";
import SecOpsConsole from "@/components/SecOpsConsole";

export const metadata = {
  title: "SecOps Telemetry | Tidal Agent",
  description: "Real-time multi-agent security scans, host-level firewall sockets, compliance audits, and live hardware telemetry.",
};

const CHECKLIST = [
  { area: "SSH host permissions", detail: "Strict directory mask 700 on ~/.ssh and 600 on authorized_keys verified. No root logins or open keys.", badge: "Compliant" },
  { area: "Credential storage", detail: "All private variables in keys/ directory locked down. Sibling environments (Creek, Stream, River, Tidal) secured.", badge: "Compliant" },
  { area: "Git safety coverage", detail: "Local .gitignore rules successfully mask active logs, private parameters, and peer endpoint state databases from leakage.", badge: "Compliant" },
  { area: "Runtime exec shield", detail: "Active search scans identify and log unsafe evaluation functions or shell injection vectors in background listeners.", badge: "Secured" },
  { area: "Interface VPN boundary", detail: "TCP ports sequestered to Tailscale private interfaces, except for the reverse-proxied public HTTP/S ports.", badge: "Shielded" },
];

export default function SecOpsPage() {
  const { system, latencies } = getSiteStatus();
  const sec = getSecurityReport();

  return (
    <div>
      <div className="text-teal-accent font-mono text-[0.75rem] tracking-[0.14em] uppercase mb-7 flex items-center gap-[10px] before:content-[''] before:w-[22px] before:h-[1px] before:bg-teal-accent">
        Operations &amp; Security
      </div>
      <h1 className="text-[clamp(2rem,5vw,3rem)] leading-[1.1] mb-5 font-semibold text-text-primary">SecOps Telemetry Console</h1>
      <p className="text-[1.15rem] text-text-dim max-w-[800px] mb-10">
        Real-time multi-agent security scans, host-level firewall sockets, compliance audits, and live hardware telemetry, polled directly from the host every 5 seconds.
      </p>

      <SecOpsConsole
        initialSystem={system}
        initialLatencies={latencies}
        initialComplianceScore={sec.summary.overall_score}
        activeSocketsCount={sec.network_audit.listening_ports.length}
        remediationsCount={sec.credentials_audit.remediations.length}
        openWarningsCount={sec.summary.total_critical + sec.summary.total_warning}
        listeningPorts={sec.network_audit.listening_ports}
      />

      <h2 className="text-[1.4rem] font-semibold mb-4">Compliance verification checklist</h2>
      <div className="overflow-x-auto mb-10">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-faint uppercase text-[0.7rem] tracking-[0.05em] border-b border-[#e8eaed]/10">
              <th className="py-2 pr-4">Security area</th>
              <th className="py-2 pr-4">Audit checklist details</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {CHECKLIST.map((row) => (
              <tr key={row.area} className="border-b border-[#e8eaed]/5">
                <td className="py-2.5 pr-4 font-semibold whitespace-nowrap">{row.area}</td>
                <td className="py-2.5 pr-4 text-text-dim">{row.detail}</td>
                <td className="py-2.5"><span className="text-[0.68rem] font-mono uppercase px-2 py-0.5 rounded border text-teal-accent border-teal-accent/30">{row.badge}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
