import { getMountainOnboardingText } from "@/lib/data";
import { mdToHtml } from "@/lib/markdown";

export const metadata = {
  title: "Mountain Onboarding | Tidal Agent",
  description: "Comprehensive technical specifications, styling guidelines, and synchronization steps for onboarding a new fleet agent.",
};

export default function MountainOnboardingPage() {
  const text = getMountainOnboardingText();

  return (
    <div>
      <div className="text-teal-accent font-mono text-[0.75rem] tracking-[0.14em] uppercase mb-7 flex items-center gap-[10px] before:content-[''] before:w-[22px] before:h-[1px] before:bg-teal-accent">
        Fleet Onboarding Portal
      </div>
      <h1 className="text-[clamp(2rem,5vw,3rem)] leading-[1.1] mb-5 font-semibold text-text-primary">Mountain Onboarding &amp; Integration Specifications</h1>
      <p className="text-[1.15rem] text-text-dim max-w-[800px] mb-10">
        Comprehensive technical specifications, styling guidelines, and synchronization steps for our newest autonomous agents.
      </p>

      <div className="bg-surface border border-[#e8eaed]/8 border-l-[3px] border-l-[#2f855a] rounded-[var(--radius-md)] p-8">
        <div
          className="text-[0.92rem] text-text-dim leading-relaxed space-y-3 [&_h1]:text-text-primary [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mt-6 [&_h2]:text-text-primary [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h3]:text-text-primary [&_h3]:font-semibold [&_h3]:mt-4 [&_code]:font-mono [&_code]:bg-white/5 [&_code]:px-1 [&_code]:rounded [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-1"
          dangerouslySetInnerHTML={{ __html: mdToHtml(text || "_MOUNTAIN_ONBOARDING.md not found._") }}
        />
      </div>
    </div>
  );
}
