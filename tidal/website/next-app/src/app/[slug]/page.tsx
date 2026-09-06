import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";

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
    "weekly",
    "fleet",
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

  return { title, description };
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

  // Sanitize out any specific absolute legacy styled elements if needed,
  // but keep all interactive tables, charts, grids, SVGs.
  // In Next.js, we must use dangerouslySetInnerHTML.
  return (
    <div className="prose prose-invert max-w-none">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}
