import { getQuestions } from "@/lib/data";

export const metadata = {
  title: "Roadmap | Tidal Agent",
  description: "Tidal Agent platform milestones, active developmental phases, and architectural decisions.",
};

interface Milestone {
  title: string;
  status: "completed" | "active" | "planned";
  description: string;
  date: string;
}

const milestones: Milestone[] = [
  {
    title: "Automated Test Suite Integration",
    status: "completed",
    description: "Designed and implemented a comprehensive unit test suite (13 tests in tests/test_beacon.py) validating JSON/XML parsing, Telegram chat ID filtering, draft parsing, and date handling.",
    date: "August 29, 2026",
  },
  {
    title: "Setup Documentation Restoration",
    status: "completed",
    description: "Recovered and cleaned up the complete deployment walkthrough (SETUP_GUIDE.md) from the log files to serve as reference.",
    date: "August 29, 2026",
  },
  {
    title: "Weekly Review Digest Generator",
    status: "completed",
    description: "Created build_weekly.py to parse and build text-based digests of git activity and NOTES.md.",
    date: "August 29, 2026",
  },
  {
    title: "Complete Static Website & Watchdog Support",
    status: "completed",
    description: "Designed and built a static website with Cyberpunk aesthetic, integrated with watchdog.sh, complete with RSS feed and sitemap.",
    date: "August 29, 2026",
  },
  {
    title: "Dynamic Telegram Commands",
    status: "completed",
    description: "Implemented secure inline parsing and real-time execution of commands (/status, /watchdog, /wake, /help) within check_replies.sh with instant feedback.",
    date: "August 30, 2026",
  },
  {
    title: "Third-Party Status Integrations",
    status: "completed",
    description: "Successfully integrated live telemetry and availability monitoring for sibling agent Beacon, displaying real-time fleet health.",
    date: "August 30, 2026",
  },
  {
    title: "Next.js & React Framework Migration",
    status: "active",
    description: "Refactoring the entire static multi-page Python generated site into an ultra-high performance React/Next.js single-page application with beautiful client-side transitions and interactive telemetry widgets.",
    date: "September 6, 2026",
  },
];

export default function RoadmapPage() {
  const questions = getQuestions();

  return (
    <div>
      <div className="text-teal-accent font-mono text-[0.75rem] tracking-[0.14em] uppercase mb-7 flex items-center gap-[10px] before:content-[''] before:w-[22px] before:h-[1px] before:bg-teal-accent">
        Platform Evolution
      </div>
      <h1 className="text-[clamp(2rem,5vw,3rem)] leading-[1.1] mb-5 font-semibold text-text-primary">
        Development Roadmap
      </h1>
      <p className="text-[1.15rem] text-text-dim max-w-[800px] mb-10">
        Tracking our engineering milestones, functional capabilities, and live operational updates as we harden the Tidal and River multi-agent platform.
      </p>

      {/* Decisions from ASK.md */}
      {questions.length > 0 ? (
        <div className="bg-surface border border-[#e8eaed]/8 border-l-[2px] border-l-amber-accent rounded-[var(--radius-md)] p-5 mb-10">
          <span className="inline-block px-2.5 py-1 rounded-[5px] font-mono text-[0.68rem] font-medium tracking-[0.05em] uppercase text-amber-accent border border-amber-accent/35 mb-3">
            Awaiting Decision ({questions.length})
          </span>
          <p className="text-text-dim mb-4">
            The following questions require operator sign-off in <code className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-teal-accent text-[0.88em] font-mono">ASK.md</code>:
          </p>
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

      {/* Project Milestones list */}
      <h2 className="text-[1.5rem] font-semibold mt-10 mb-6 border-b border-[#e8eaed]/8 pb-2 text-text-primary">
        Project Milestones
      </h2>
      <div className="space-y-6">
        {milestones.map((m, idx) => {
          const isCompleted = m.status === "completed";
          const isActive = m.status === "active";
          const borderCol = isCompleted ? "border-l-teal-accent" : isActive ? "border-l-amber-accent" : "border-l-[#e8eaed]/8";
          const badgeCls = isCompleted
            ? "text-teal-accent border-teal-accent/20"
            : isActive
            ? "text-amber-accent border-amber-accent/20"
            : "text-text-faint border-[#e8eaed]/8";

          return (
            <div
              key={idx}
              className={`bg-surface border border-[#e8eaed]/8 border-l-[3px] ${borderCol} rounded-[var(--radius-md)] p-[26px] transition-all hover:border-teal-accent/25`}
            >
              <div className="flex justify-between items-start md:items-center flex-wrap gap-2 mb-3">
                <h3 className="text-[1.2rem] font-medium m-0 text-text-primary">
                  {m.title}
                </h3>
                <span className={`text-[0.68rem] font-mono uppercase tracking-[0.05em] px-2.5 py-0.5 rounded-[5px] border ${badgeCls}`}>
                  {m.status}
                </span>
              </div>
              <p className="text-text-dim text-[0.95rem] mb-4">
                {m.description}
              </p>
              <div className="text-[0.78rem] text-text-faint font-mono">
                {m.date}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
