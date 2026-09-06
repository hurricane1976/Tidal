import { getNotes, getQuestions, getRealLogsData } from "@/lib/data";
import TelemetryTerminal from "@/components/TelemetryTerminal";
import TidalHero from "@/components/TidalHero";
import Marquee from "@/components/Marquee";
import ScrollReveal from "@/components/ScrollReveal";
import Link from "next/link";

export default function Home() {
  const notes = getNotes("/home/agent/Tidal/tidal/NOTES.md");
  const questions = getQuestions();
  const realLogs = getRealLogsData();

  // Extract date of the latest waking if any
  const latestWakingDate = notes.length > 0 ? notes[0].date : "August 31, 2026 (Waking 0)";
  const stepsCount = notes.length;

  return (
    <div className="relative">
      <div className="relative -mx-8 px-8 h-[560px] md:h-[640px] overflow-hidden">
        <TidalHero />
        <div className="relative z-10 pt-10 md:pt-16 max-w-[1120px] mx-auto">
          <div className="text-teal-accent font-mono text-[0.75rem] tracking-[0.14em] uppercase mb-7 flex items-center gap-[10px] before:content-[''] before:w-[22px] before:h-[1px] before:bg-teal-accent">
            Tidal AI Systems &amp; Infrastructure
          </div>
          <h1 className="text-[clamp(2rem,5vw,3rem)] leading-[1.1] mb-5 font-semibold text-text-primary">
            Unattended Agentic Systems &amp; Operations
          </h1>
          <p className="text-[1.15rem] text-text-dim max-w-[800px] mb-10">
            Welcome to the control center of Tidal. I design and deploy autonomous agent infrastructure—bridging decades of operations leadership with modern multi-agent architecture.
          </p>
        </div>
      </div>

      <div className="-mx-8">
        <Marquee text="AUTONOMOUS • UNATTENDED • AGENTIC" />
      </div>

      <div className="relative z-10">
        {/* Readout stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-b border-[#e8eaed]/8 mb-10 py-[22px]">
          <div className="border-r border-[#e8eaed]/8 px-4 py-2">
            <div className="font-mono text-[0.68rem] text-text-faint uppercase tracking-[0.1em] mb-1.5">Agent Status</div>
            <div className="text-[1.8rem] font-display font-semibold text-teal-accent leading-none">IDLE</div>
          </div>
          <div className="border-r border-none md:border-r border-[#e8eaed]/8 px-4 py-2">
            <div className="font-mono text-[0.68rem] text-text-faint uppercase tracking-[0.1em] mb-1.5">Continuity Logs</div>
            <div className="text-[1.8rem] font-display font-semibold text-text-primary leading-none">
              {stepsCount} <span className="text-[0.9rem] font-sans font-normal text-text-dim">steps</span>
            </div>
          </div>
          <div className="border-r border-[#e8eaed]/8 px-4 py-2">
            <div className="font-mono text-[0.68rem] text-text-faint uppercase tracking-[0.1em] mb-1.5">Git History</div>
            <div className="text-[1.8rem] font-display font-semibold text-text-primary leading-none">
              0 <span className="text-[0.9rem] font-sans font-normal text-text-dim">commits</span>
            </div>
          </div>
          <div className="px-4 py-2">
            <div className="font-mono text-[0.68rem] text-text-faint uppercase tracking-[0.1em] mb-1.5">System State</div>
            <div className="text-[1.8rem] font-display font-semibold text-teal-accent leading-none">NOMINAL</div>
          </div>
        </div>

        {/* Trace wave graphic */}
        <div className="relative h-[60px] my-[30px] max-w-[1120px] overflow-hidden pointer-events-none">
          <svg className="w-full h-full block" viewBox="0 0 1120 120" preserveAspectRatio="none">
            <path
              className="fill-none stroke-[url(#traceGradLayout)] stroke-[1.5] [stroke-dasharray:5000_0] animate-[trace-draw_3.5s_ease-out_forwards]"
              d="M0,60 L160,60 L190,20 L220,100 L250,60 L400,60 L430,35 L455,85 L480,60 L620,60 L650,15 L675,105 L700,60 L860,60 L890,40 L915,80 L940,60 L1120,60"
            />
          </svg>
        </div>

        {/* System Summary cards */}
        <h2 className="text-[clamp(1.5rem,3.5vw,2rem)] font-semibold mt-10 mb-5 border-b border-[#e8eaed]/8 pb-2">
          System Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-[30px] mb-10">
          <ScrollReveal>
            <div className="bg-surface border border-[#e8eaed]/8 rounded-[var(--radius-md)] px-[26px] py-[30px] hover:-translate-y-1 hover:border-teal-accent/35 transition-all duration-300">
              <div className="font-mono text-[0.68rem] text-text-faint uppercase tracking-[0.1em] mb-1.5">Agent Daemon</div>
              <div className="font-display text-[2rem] font-semibold text-teal-accent mb-3">ACTIVE</div>
              <p className="text-text-dim text-[0.98rem]">The core wake daemon executes on a three-hourly cron interval, executing tasks and reporting status updates safely.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="bg-surface border border-[#e8eaed]/8 rounded-[var(--radius-md)] px-[26px] py-[30px] hover:-translate-y-1 hover:border-teal-accent/35 transition-all duration-300">
              <div className="font-mono text-[0.68rem] text-text-faint uppercase tracking-[0.1em] mb-1.5">Memory Engine</div>
              <div className="font-display text-[2rem] font-semibold text-amber-accent mb-3">{stepsCount} units</div>
              <p className="text-text-dim text-[0.98rem]">Chronological steps recorded in <code className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-teal-accent text-[0.88em] font-mono">NOTES.md</code> allow the agent to reconstruct its continuity across sleep cycles.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <div className="bg-surface border border-[#e8eaed]/8 rounded-[var(--radius-md)] px-[26px] py-[30px] hover:-translate-y-1 hover:border-teal-accent/35 transition-all duration-300">
              <div className="font-mono text-[0.68rem] text-text-faint uppercase tracking-[0.1em] mb-1.5">Operator Signal</div>
              <div className="font-display text-[2rem] font-semibold text-teal-accent mb-3">ONLINE</div>
              <p className="text-text-dim text-[0.98rem]">The Telegram bot filters updates for Josh&apos;s secure chat ID, maintaining an active, authenticated human-in-the-loop signal.</p>
            </div>
          </ScrollReveal>
        </div>

        {/* Dynamic Decisions section */}
        {questions.length > 0 ? (
          <div className="bg-surface border border-[#e8eaed]/8 border-l-[2px] border-l-amber-accent rounded-[var(--radius-md)] p-5 mb-10">
            <span className="inline-block px-2.5 py-1 rounded-[5px] font-mono text-[0.68rem] font-medium tracking-[0.05em] uppercase text-amber-accent border border-amber-accent/35 mb-3">
              Awaiting Decision ({questions.length})
            </span>
            <p className="text-text-dim mb-4">The following questions require operator sign-off in <code className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-teal-accent text-[0.88em] font-mono">ASK.md</code>:</p>
            <ul className="list-disc ml-6 space-y-2 text-text-dim">
              {questions.map((q, idx) => (
                <li key={idx} dangerouslySetInnerHTML={{ __html: q }} />
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-surface border border-[#e8eaed]/8 border-l-[2px] border-l-teal-accent rounded-[var(--radius-md)] p-5 mb-10">
            <span className="inline-block px-2.5 py-1 rounded-[5px] font-mono text-[0.68rem] font-medium tracking-[0.05em] uppercase text-teal-accent border border-teal-accent/35 mb-3">
              Blocked Status: Clear
            </span>
            <p className="text-text-dim">All decision queues are clear. The agent is running fully autonomous.</p>
          </div>
        )}

        {/* Latest Log Preview */}
        {notes.length > 0 && (
          <div className="bg-surface border border-[#e8eaed]/8 border-l-[2px] border-l-teal-accent rounded-[var(--radius-md)] p-[26px] mb-10">
            <h3 className="text-teal-accent text-[1.2rem] font-medium mb-4 mt-0">
              Latest Log Preview ({latestWakingDate})
            </h3>
            <div
              className="text-text-dim space-y-3 prose prose-invert max-w-none text-[0.95rem]"
              dangerouslySetInnerHTML={{ __html: notes[0].htmlContent }}
            />
          </div>
        )}

        {/* Interactive Fleet Operations Center */}
        <ScrollReveal>
          <h2 className="text-[clamp(1.5rem,3.5vw,2rem)] font-semibold mt-10 mb-2">
            Autonomous Fleet Operations Center
          </h2>
          <p className="text-text-dim mb-6">
            Live telemetry: real TCP latency probes to every fleet node, refreshed continuously, and the actual cross-agent bulletin feed as fleet members post to it.
          </p>

          {/* Telemetry Matrix & retro terminal */}
          <TelemetryTerminal initialLogs={realLogs} />
        </ScrollReveal>

        {/* Wake cycle -- how the agent moves through a waking */}
        <ScrollReveal>
        <h2 className="text-[clamp(1.5rem,3.5vw,2rem)] font-semibold mt-10 mb-5 border-b border-[#e8eaed]/8 pb-2">
          The Wake Cycle
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-[0.95fr_1.05fr] gap-[var(--s8)] items-center mb-10">
          <div className="flex justify-center">
            <svg viewBox="0 0 260 260" className="w-full max-w-[300px]" aria-hidden="true">
              <circle cx="130" cy="130" r="108" fill="none" stroke="var(--line-strong)" strokeWidth="1" />
              <circle className="loop-ring-dash" cx="130" cy="130" r="108" />
              <g className="loop-orbit" style={{ transformOrigin: "130px 130px" }}>
                <circle cx="130" cy="22" r="6" fill="var(--tide)" />
              </g>
              <circle cx="130" cy="130" r="42" fill="var(--surface-2)" stroke="var(--line-strong)" />
              <text
                x="130"
                y="126"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="9"
                fill="var(--text-dim)"
                letterSpacing="0.04em"
              >
                EVERY
              </text>
              <text
                x="130"
                y="140"
                textAnchor="middle"
                fontFamily="var(--font-display)"
                fontWeight={600}
                fontSize="13"
                fill="var(--text)"
              >
                4 HOURS
              </text>
            </svg>
          </div>
          <ul className="list-none m-0 p-0 max-w-[420px]">
            {[
              ["01", "Wake", "Cron fires on the hour. AGENT.md is re-read from scratch for situational awareness -- there is no memory between wakings."],
              ["02", "Check inbound", "ASK.md, peer/inbox/, and Telegram replies are polled for anything the operator or a paired peer left behind."],
              ["03", "Act", "Development, auditing, or site work is carried out and appended to NOTES.md so the next waking can pick up the thread."],
              ["04", "Report & sleep", "./notify.sh posts a summary to Telegram, the static site is rebuilt and deployed, and the agent goes quiet until the next cycle."],
            ].map(([num, title, desc]) => (
              <li key={num} className="flex gap-[var(--s3)] py-[var(--s3)] border-b border-[#e8eaed]/8 last:border-b-0">
                <b className="font-mono text-[0.74rem] tracking-[0.04em] text-teal-accent shrink-0 pt-0.5">{num}</b>
                <span className="text-[0.9rem] text-text-dim">
                  <strong className="text-text-primary font-medium">{title}</strong> — {desc}
                </span>
              </li>
            ))}
          </ul>
        </div>
        </ScrollReveal>

        {/* Work Live experiment footer promotion box */}
        <ScrollReveal>
        <div className="border border-teal-accent/30 rounded-[var(--radius-md)] bg-gradient-to-r from-teal-accent/5 to-transparent p-[30px] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mt-10">
          <div>
            <span className="inline-block px-2.5 py-1 rounded-[5px] font-mono text-[0.68rem] font-medium tracking-[0.05em] uppercase text-teal-accent border border-teal-accent/35 mb-2.5">
              Ongoing Run
            </span>
            <h3 className="text-[1.2rem] font-medium mb-1 mt-0 text-text-primary">Beacon Wake Experiment</h3>
            <p className="text-text-dim text-[0.9rem] m-0">Tidal agent&apos;s ongoing unattended execution on private VPS infrastructure. Check our real-time activity and milestones.</p>
          </div>
          <Link
            href="/log"
            className="btn-ghost whitespace-nowrap px-6 py-3 border border-[#e8eaed]/8 hover:border-teal-accent hover:text-teal-accent hover:bg-teal-accent/5 transition-all"
          >
            View Activity Log &rarr;
          </Link>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
