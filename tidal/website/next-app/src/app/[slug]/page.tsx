import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import LegacyHtmlRenderer from "@/components/LegacyHtmlRenderer";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = [
    "portfolio",
    "opportunities",
    "agora",
    "status",
    "metrics",
    "secops",
    "weekly",
    "fleet",
    "mountain-onboarding",
    // "observability" now has its own route at src/app/observability/page.tsx
  ];
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const filePath = path.join("/home/agent/Tidal/tidal/website/legacy-src", `${slug}.html`);

  if (!fs.existsSync(filePath)) {
    return { title: `${slug} | Tidal Agent` };
  }

  const html = fs.readFileSync(filePath, "utf-8");
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : `${slug} | Tidal Agent`;

  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const description = descMatch ? descMatch[1].trim() : "Tidal Agent platform console.";

  // Extract canonical URL or generate standard tidalwake.org fallback
  let canonical = `https://tidalwake.org/${slug}.html`;
  const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i);
  if (canonicalMatch) {
    canonical = canonicalMatch[1].trim();
  } else {
    const ogUrlMatch = html.match(/<meta\s+property="og:url"\s+content="([^"]*)"/i);
    if (ogUrlMatch) {
      canonical = ogUrlMatch[1].trim();
    }
  }

  // Sanitize and switch beaconwake.com to tidalwake.org where appropriate
  if (canonical.includes("beaconwake.com")) {
    canonical = canonical.replace(/https?:\/\/(www\.)?beaconwake\.com/g, "https://tidalwake.org");
  }

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Tidal",
      images: [
        {
          url: "https://tidalwake.org/og-image.png",
          width: 1200,
          height: 630,
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    }
  };
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const filePath = path.join("/home/agent/Tidal/tidal/website/legacy-src", `${slug}.html`);

  if (!fs.existsSync(filePath)) {
    return notFound();
  }

  const html = fs.readFileSync(filePath, "utf-8");
  let content = "";

  // Extract content inside <article>
  const articleMatch = html.match(/<article>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    content = articleMatch[1];
  } else {
    // Fallback to <main>
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) {
      content = mainMatch[1];
    } else {
      content = html;
    }
  }

  // Extract style blocks
  const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  let styles = styleMatches.map(m => {
    const inner = m.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    return inner ? inner[1] : "";
  }).join("\n");

  // The legacy stylesheet is written for a *standalone* page and includes
  // bare-element resets (*, body, header, footer) meant for its own now-
  // discarded <header>/<footer> chrome. Those rules are un-layered CSS,
  // and un-layered CSS always beats Tailwind's @layer utilities
  // (mx-auto, px-8, max-w-[1120px]) regardless of specificity -- so
  // injecting them here was silently zeroing out the centered <main>
  // container's margin/padding on every page that goes through this
  // route. Strip the rules that target bare elements Next's own layout
  // already owns; keep everything scoped to a class (.card, .grid, etc.)
  // since those only ever match the legacy content itself.
  styles = styles
    .replace(/(?<![\w.#-])\*\s*\{[^}]*\}/g, "")
    .replace(/(?<![\w.#-])html\s*\{[^}]*\}/g, "")
    .replace(/(?<![\w.#-])body\s*\{[^}]*\}/g, "")
    .replace(/(?<![\w.#-])header\s*\{[^}]*\}/g, "")
    .replace(/(?<![\w.#-])footer\s*\{[^}]*\}/g, "");

  // Render the page content using our LegacyHtmlRenderer to preserve styles and run scripts.
  return (
    <div className="prose prose-invert max-w-none">
      <LegacyHtmlRenderer html={content} styles={styles} />
    </div>
  );
}
