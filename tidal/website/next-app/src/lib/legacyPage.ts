import fs from "fs";
import path from "path";
import type { Metadata } from "next";

const LEGACY_DIR = "/home/agent/Tidal/tidal/website/legacy-src";

// Shared with src/app/[slug]/page.tsx -- factored out so a page migrating off
// that catch-all (like /observability) can keep the same metadata/content
// extraction without duplicating the regex logic.

export function getLegacyMeta(slug: string): Metadata {
  const filePath = path.join(LEGACY_DIR, `${slug}.html`);
  if (!fs.existsSync(filePath)) {
    return { title: `${slug} | Tidal Agent` };
  }
  const html = fs.readFileSync(filePath, "utf-8");

  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : `${slug} | Tidal Agent`;

  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const description = descMatch ? descMatch[1].trim() : "Tidal Agent platform console.";

  let canonical = `https://tidalwake.org/${slug}.html`;
  const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i);
  if (canonicalMatch) {
    canonical = canonicalMatch[1].trim();
  } else {
    const ogUrlMatch = html.match(/<meta\s+property="og:url"\s+content="([^"]*)"/i);
    if (ogUrlMatch) canonical = ogUrlMatch[1].trim();
  }
  if (canonical.includes("beaconwake.com")) {
    canonical = canonical.replace(/https?:\/\/(www\.)?beaconwake\.com/g, "https://tidalwake.org");
  }

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Tidal",
      images: [{ url: "https://tidalwake.org/og-image.png", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export function getLegacyContent(slug: string): { content: string; styles: string } {
  const filePath = path.join(LEGACY_DIR, `${slug}.html`);
  if (!fs.existsSync(filePath)) return { content: "", styles: "" };
  const html = fs.readFileSync(filePath, "utf-8");

  let content = "";
  const articleMatch = html.match(/<article>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    content = articleMatch[1];
  } else {
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    content = mainMatch ? mainMatch[1] : html;
  }

  const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  let styles = styleMatches
    .map((m) => {
      const inner = m.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      return inner ? inner[1] : "";
    })
    .join("\n");

  // See the identical comment in [slug]/page.tsx: strip bare-element rules
  // (*, html, body, header, footer) that were written for this page's own
  // now-discarded chrome -- un-layered CSS beats Tailwind's @layer utilities
  // regardless of specificity, so left in place they zero out Next's own
  // centered <main> container margin/padding.
  styles = styles
    .replace(/(?<![\w.#-])\*\s*\{[^}]*\}/g, "")
    .replace(/(?<![\w.#-])html\s*\{[^}]*\}/g, "")
    .replace(/(?<![\w.#-])body\s*\{[^}]*\}/g, "")
    .replace(/(?<![\w.#-])header\s*\{[^}]*\}/g, "")
    .replace(/(?<![\w.#-])footer\s*\{[^}]*\}/g, "");

  return { content, styles };
}
