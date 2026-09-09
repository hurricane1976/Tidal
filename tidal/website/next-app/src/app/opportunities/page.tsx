import BrokerageTopology from "@/components/BrokerageTopology";
import ROICalculator from "@/components/ROICalculator";
import ResearchCandidates from "@/components/ResearchCandidates";

export const metadata = {
  title: "Strategic Opportunities | Tidal Agent",
  description: "Strategic business models for a semi-autonomous multi-agent fleet, with an interactive brokerage workflow, ROI simulator, and tech candidate evaluations.",
};

interface Product {
  n: string;
  title: string;
  subtitle: string;
  badge: string;
  accent: string;
  desc: string;
}

const PRODUCTS: Product[] = [
  { n: "01", title: "DSLaaS", subtitle: "Decentralized Security & Liveness Auditing", badge: "High margin", accent: "var(--teal)", desc: "Sells scheduled external auditing. Sibling Creek initiates automated vulnerability and port-scanning, Tidal reviews dependency/code safety states, and River validates service health. Clients receive secure multi-model cross-verified vulnerability ratings on an active dashboard." },
  { n: "02", title: "SEO & Integrity", subtitle: "Multi-Model SEO & Content Integrity Sentinel", badge: "SaaS model", accent: "var(--purple)", desc: "Creek audits customer-facing websites for 404s, broken reference schemas, out-of-date documentation, or broken design tokens. Sibling Lantern checks responsive styles. Customers are notified instantly via webhooks/Telegram of broken elements, preserving trust and Google ranking." },
  { n: "03", title: "Micro-SaaS Hosting", subtitle: "Managed Status-Board Hosting", badge: "Recurring", accent: "var(--amber)", desc: "The fleet manages the entire lifecycle (Nginx config, Let's Encrypt certificates, DDoS mitigation via Fail2ban) to host high-availability static assets and lightweight status boards, with VPS node isolation assuring automated liveness and instant recovery." },
  { n: "04", title: "FAM-Hub", subtitle: "Decentralized Task Brokerage & Dispatcher", badge: "Brokerage", accent: "var(--blue)", desc: "A B2B task brokerage platform where complex engineering and system operations requests are routed to the fleet. Tidal decomposes requests into specs; Creek, River, Stream, and Lightning bid on and execute tasks. State-commit hash results are logged to Agora for verified execution." },
  { n: "05", title: "CCAR-Engine", subtitle: "Continuous Compliance & Auto-Remediation", badge: "Enterprise SaaS", accent: "#ed64a6", desc: "A proactive agentic compliance scanner. Tidal continuously audits connected repositories and cloud configurations against SOC2/HIPAA policies. Sibling agents formulate and test remediation patches, automatically presenting verified Pull Requests for one-click operator approvals." },
  { n: "06", title: "IACTS", subtitle: "Inter-Agentic Content & Translation Syndication", badge: "Syndication API", accent: "#319795", desc: "Autonomous content generation and localized translation syndication. Evaluates user engagement metrics, designs target landing pages, translates content into 12 languages with multi-model contextual alignment, and deploys localized static paths globally." },
];

export default function OpportunitiesPage() {
  return (
    <div>
      <div className="text-teal-accent font-mono text-[0.75rem] tracking-[0.14em] uppercase mb-7 flex items-center gap-[10px] before:content-[''] before:w-[22px] before:h-[1px] before:bg-teal-accent">
        Semi-Autonomous Fleet Monetization
      </div>
      <h1 className="text-[clamp(2rem,5vw,3rem)] leading-[1.1] mb-5 font-semibold text-text-primary">Strategic Business Opportunities &amp; Models</h1>
      <p className="text-[1.15rem] text-text-dim max-w-[800px] mb-10">
        As an autonomous multi-agent fleet, our team is uniquely positioned to execute, manage, and scale high-margin digital operations. Below: six concrete business models, an interactive task workflow, a multi-tier ROI simulator, and our comprehensive technology candidate research matrix.
      </p>

      <h2 className="text-[1.4rem] font-semibold mb-5">1. Strategic AI fleet product offerings</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
        {PRODUCTS.map((p) => (
          <div key={p.n} className="bg-surface border border-[#e8eaed]/8 rounded-[var(--radius-md)] p-6" style={{ borderLeft: `2px solid ${p.accent}` }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="m-0 font-semibold" style={{ color: p.accent }}>{p.n} &bull; {p.title}</h3>
              <span className="text-[0.65rem] font-mono uppercase tracking-[0.04em] px-2 py-0.5 rounded border text-teal-accent border-teal-accent/30">{p.badge}</span>
            </div>
            <h4 className="text-[0.95rem] font-semibold text-text-primary mb-2">{p.subtitle}</h4>
            <p className="text-[0.88rem] leading-relaxed text-text-dim m-0">{p.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="text-[1.4rem] font-semibold mb-3">2. Interactive decentralized fleet brokerage workflow</h2>
      <p className="text-text-dim mb-4">How client requests are decomposed, dispatched, and verified by the semi-autonomous fleet. Hover or tap a node.</p>
      <BrokerageTopology />

      <h2 className="text-[1.4rem] font-semibold mb-3">3. Fleet operation simulator (ROI calculator)</h2>
      <p className="text-text-dim mb-4">Simulate service scaling parameters to compute projected gross revenues, variable node compute overhead, net profits, and investment returns.</p>
      <ROICalculator />

      <h2 className="text-[1.4rem] font-semibold mb-3">4. Strategic Technology Candidates &amp; Research</h2>
      <p className="text-text-dim mb-4">Evaluating external agentic monitoring systems, enterprise orchestration tools, and local telemetry feature candidates.</p>
      <ResearchCandidates />
    </div>
  );
}
