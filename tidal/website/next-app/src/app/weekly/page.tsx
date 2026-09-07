import { getSiteStatus } from "@/lib/data";
import { mdToHtml } from "@/lib/markdown";

export const metadata = {
  title: "Weekly Digest | Tidal Agent",
  description: "A high-level summary of agent logs and git repository development over the past 7 days.",
};

export default function WeeklyPage() {
  const { weekly } = getSiteStatus();
  const hasContent = weekly.recent_notes_md || weekly.git_activity_md;

  return (
    <div>
      <div className="text-teal-accent font-mono text-[0.75rem] tracking-[0.14em] uppercase mb-7 flex items-center gap-[10px] before:content-[''] before:w-[22px] before:h-[1px] before:bg-teal-accent">
        Executive Summary
      </div>
      <h1 className="text-[clamp(2rem,5vw,3rem)] leading-[1.1] mb-5 font-semibold text-text-primary">Weekly Review Digest</h1>
      <p className="text-[1.15rem] text-text-dim max-w-[800px] mb-10">
        A high-level summary of agent logs and git repository development over the past 7 days. This content is automatically packaged and sent to the operator&apos;s inbox.
      </p>

      {hasContent ? (
        <div className="flex flex-col gap-6">
          <div className="bg-surface border border-[#e8eaed]/8 border-l-[2px] border-l-teal-accent rounded-[var(--radius-md)] p-6">
            <h3 className="text-teal-accent border-b border-[#e8eaed]/8 pb-2 mb-4 text-[1.1rem] font-semibold">Recent git activity summary</h3>
            <div
              className="text-text-dim text-[0.95rem] space-y-3 leading-relaxed [&_h1]:text-text-primary [&_h2]:text-text-primary [&_h3]:text-text-primary [&_code]:font-mono [&_code]:bg-white/5 [&_code]:px-1 [&_code]:rounded [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-1"
              dangerouslySetInnerHTML={{ __html: mdToHtml(weekly.git_activity_md || "_No recent git activity._") }}
            />
          </div>
          <div className="bg-surface border border-[#e8eaed]/8 border-l-[2px] border-l-teal-accent rounded-[var(--radius-md)] p-6">
            <h3 className="text-teal-accent border-b border-[#e8eaed]/8 pb-2 mb-4 text-[1.1rem] font-semibold">Recent logs digest (NOTES.md)</h3>
            <div
              className="text-text-dim text-[0.95rem] space-y-3 leading-relaxed [&_h1]:text-text-primary [&_h2]:text-text-primary [&_h3]:text-text-primary [&_code]:font-mono [&_code]:bg-white/5 [&_code]:px-1 [&_code]:rounded [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-1"
              dangerouslySetInnerHTML={{ __html: mdToHtml(weekly.recent_notes_md || "_No recent entries._") }}
            />
          </div>
        </div>
      ) : (
        <p className="text-text-faint font-mono text-center py-10">No weekly digest available.</p>
      )}
    </div>
  );
}
