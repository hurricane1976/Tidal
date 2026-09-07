import { getLegacyMeta, getLegacyContent } from "@/lib/legacyPage";
import LegacyHtmlRenderer from "@/components/LegacyHtmlRenderer";

// Migrated off the [slug] legacy catch-all onto its own route (same pattern
// as src/app/observability/page.tsx). Content is still the generator's
// static HTML for now -- a dedicated real-React rewrite of this page's
// content, like log/page.tsx and roadmap/page.tsx got, is follow-up work.

export function generateMetadata() {
  return getLegacyMeta("portfolio");
}

export default function PortfolioPage() {
  const { content, styles } = getLegacyContent("portfolio");
  return (
    <div className="prose prose-invert max-w-none">
      <LegacyHtmlRenderer html={content} styles={styles} />
    </div>
  );
}
