import { getObservabilityRuns } from "@/lib/data";
import { getLegacyMeta, getLegacyContent } from "@/lib/legacyPage";
import LegacyHtmlRenderer from "@/components/LegacyHtmlRenderer";
import ObservabilityCharts from "@/components/ObservabilityCharts";

// First page migrated off the [slug] legacy-HTML catch-all onto its own
// route: the hero/run-explorer/lanes/guards sections are still the
// generator's static HTML (unchanged from the other legacy pages), but the
// three chart panels are a real client component fed by the live
// /api/observability endpoint instead of server-templated bar divs.

export function generateMetadata() {
  return getLegacyMeta("observability");
}

export default function ObservabilityPage() {
  const { content, styles } = getLegacyContent("observability");
  const [before, rest] = content.split("<!-- OBS_CHARTS_START -->");
  const after = rest ? (rest.split("<!-- OBS_CHARTS_END -->")[1] ?? "") : "";
  const runs = getObservabilityRuns();

  return (
    <div className="prose prose-invert max-w-none">
      <LegacyHtmlRenderer html={before} styles={styles} />
      <ObservabilityCharts initialRuns={runs} />
      <LegacyHtmlRenderer html={after} />
    </div>
  );
}
