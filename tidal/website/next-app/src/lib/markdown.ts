// Tiny markdown -> HTML pass, ported from build_site.py's md_to_html() so
// weekly digests / onboarding docs render the same way they did in the
// Python-generated pages. Source markdown always comes from local, trusted
// files (NOTES.md, git log, MOUNTAIN_ONBOARDING.md) -- never public input.
export function mdToHtml(text: string): string {
  const lines = text.trim().split("\n");
  const htmlLines: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      htmlLines.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }
    if (line.startsWith("### ")) {
      closeList();
      htmlLines.push(`<h3>${line.slice(4)}</h3>`);
    } else if (line.startsWith("## ")) {
      closeList();
      htmlLines.push(`<h2>${line.slice(3)}</h2>`);
    } else if (line.startsWith("# ")) {
      closeList();
      htmlLines.push(`<h1>${line.slice(2)}</h1>`);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        htmlLines.push("<ul>");
        inList = true;
      }
      htmlLines.push(`<li>${line.slice(2)}</li>`);
    } else {
      closeList();
      htmlLines.push(`<p>${line}</p>`);
    }
  }
  closeList();

  let html = htmlLines.join("\n");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`(.*?)`/g, "<code>$1</code>");
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return html;
}
