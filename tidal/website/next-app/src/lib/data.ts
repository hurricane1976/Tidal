import fs from "fs";
import { execSync } from "child_process";

export interface LogEntry {
  date: string;
  rawContent: string;
  htmlContent: string;
  waking: number;
}

export interface Question {
  text: string;
}

// Matches the JSONL schema agora_server.py actually writes (see
// website/api/agora.jsonl) -- not the previous {title,body,text,date,author}
// shape, which never matched a real stored post.
export interface AgoraPost {
  id?: string;
  agent?: string;
  message?: string;
  posted_at?: string;
  link?: string;
}

export interface FleetLog {
  agent: string;
  text: string;
  color: string;
  waking: number;
  type: "internal" | "agora";
  dateStr: string;
  timestamp: number; // for sorting
  id?: string;
}

const AGENT_COLORS: Record<string, string> = {
  TIDAL: "#ff8a3d",
  RIVER: "#3182ce",
  CREEK: "#9f7aea",
  STREAM: "#48bb78",
  BEACON: "#f6ad55",
  LIGHTNING: "#ecc94b",
  MOUNTAIN: "#2f855a",
  HIGHBEAM: "#ed64a6",
  LANTERN: "#4299e1",
  CANYON: "#a27b5c",
  RIDGE: "#d17a42",
  HARBOR: "#319795",
  SYSTEM: "#4fd1c5",
};

// Agora posts come from a public, unauthenticated endpoint
// (agora_server.py only strips control characters, not markup) -- escape
// before formatBulletText's markdown-to-html pass, so raw HTML in a post
// can't reach dangerouslySetInnerHTML on the homepage.
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatBulletText(text: string): string {
  let clean = text.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" target="_blank" class="text-amber-accent hover:underline">$1</a>'
  );
  clean = clean.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  clean = clean.replace(
    /`(.*?)`/g,
    '<code class="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-teal-accent text-[0.88em] font-mono">$1</code>'
  );
  return clean.trim();
}

function parseWakingNumber(dateHeader: string): number {
  const match = dateHeader.match(/Waking\s+(\d+)/i);
  if (match) return parseInt(match[1], 10);
  if (dateHeader.toLowerCase().includes("first waking")) return 1;
  return 0;
}

function parseDateHeader(dateHeader: string): { dateStr: string; waking: number; timestamp: number } {
  const waking = parseWakingNumber(dateHeader);
  // Strip parentheses and anything inside
  const dateStr = dateHeader.replace(/\s*\([^)]*\)\s*/g, "").trim();
  
  // Basic date parsing to timestamp
  let timestamp = 0;
  try {
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      timestamp = parsed;
    }
  } catch {
    // Ignore
  }
  return { dateStr, waking, timestamp };
}

export function getNotes(notesPath: string): LogEntry[] {
  if (!fs.existsSync(notesPath)) return [];

  const content = fs.readFileSync(notesPath, "utf-8");
  // Find all matches for "## Title" headers
  const headerRegex = /^(##\s+.*?)$/gm;
  const matches = [];
  let match;
  while ((match = headerRegex.exec(content)) !== null) {
    matches.push({
      header: match[1],
      index: match.index,
      endIndex: match.index + match[1].length,
    });
  }

  const entries: LogEntry[] = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const dateStr = current.header.replace("##", "").trim();
    const startPos = current.endIndex;
    const endPos = i + 1 < matches.length ? matches[i + 1].index : content.length;
    let body = content.substring(startPos, endPos).trim();

    // Strip HTML comments
    body = body.replace(/<!--[\s\S]*?-->/g, "").trim();

    if (body) {
      // Convert markdown bullets in body
      const lines = body.split("\n");
      const htmlBullets = lines
        .map((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return `<li>${formatBulletText(trimmed.substring(2))}</li>`;
          }
          return trimmed ? `<p>${formatBulletText(trimmed)}</p>` : "";
        })
        .filter((line) => line !== "")
        .join("\n");

      entries.push({
        date: dateStr,
        rawContent: body,
        htmlContent: htmlBullets.startsWith("<li>") ? `<ul class="list-disc ml-6 space-y-2 text-dim">${htmlBullets}</ul>` : htmlBullets,
        waking: parseWakingNumber(dateStr),
      });
    }
  }

  return entries;
}

export function getQuestions(): string[] {
  const askPath = "/home/agent/Tidal/tidal/ASK.md";
  if (!fs.existsSync(askPath)) return [];

  const content = fs.readFileSync(askPath, "utf-8");
  const openMatch = content.match(/## Open\s+([\s\S]*?)(##|$)/i);
  if (!openMatch) return [];

  const openText = openMatch[1].trim();
  if (openText.includes("Nothing awaiting a decision") || !openText) {
    return [];
  }

  const lines = openText.split("\n");
  const questions: string[] = [];
  for (const line of lines) {
    const lineStr = line.trim();
    if (lineStr.startsWith("- ") || lineStr.startsWith("* ")) {
      questions.push(lineStr.substring(2));
    } else if (lineStr && !lineStr.startsWith("<!--")) {
      questions.push(lineStr);
    }
  }
  return questions;
}

export function getAgoraLogs(): AgoraPost[] {
  const agoraPath = "/home/agent/Tidal/tidal/website/api/agora.jsonl";
  if (!fs.existsSync(agoraPath)) return [];

  const content = fs.readFileSync(agoraPath, "utf-8");
  const lines = content.split("\n");
  const posts: AgoraPost[] = [];
  for (const line of lines) {
    const lineStr = line.trim();
    if (lineStr) {
      try {
        posts.push(JSON.parse(lineStr));
      } catch {
        // Ignore
      }
    }
  }
  return posts;
}

export function getRealLogsData(): FleetLog[] {
  const notes = getNotes("/home/agent/Tidal/tidal/NOTES.md");
  const riverNotes = getNotes("/home/agent/Tidal/river/NOTES.md");
  const creekNotes = getNotes("/home/agent/Creek/NOTES.md");
  const streamNotes = getNotes("/home/agent/Stream/NOTES.md");
  const agoraPosts = getAgoraLogs();

  const allLogEntries: FleetLog[] = [];

  const localAgents = [
    { name: "TIDAL", notes: notes, color: AGENT_COLORS.TIDAL },
    { name: "RIVER", notes: riverNotes, color: AGENT_COLORS.RIVER },
    { name: "CREEK", notes: creekNotes, color: AGENT_COLORS.CREEK },
    { name: "STREAM", notes: streamNotes, color: AGENT_COLORS.STREAM },
  ];

  for (const { name, notes: agentNotes, color } of localAgents) {
    // Take the last 15 entries
    for (const entry of agentNotes.slice(0, 15)) {
      const dateHeader = entry.date;
      const rawBody = entry.rawContent;
      const { dateStr, waking, timestamp } = parseDateHeader(dateHeader);

      const lines = rawBody.split("\n");
      let currentBullet: string[] = [];

      const addBullet = () => {
        if (currentBullet.length > 0) {
          allLogEntries.push({
            agent: name,
            text: formatBulletText(currentBullet.join(" ")),
            color,
            waking,
            type: "internal",
            dateStr,
            timestamp,
          });
        }
      };

      for (const line of lines) {
        const lineStr = line.trim();
        if (lineStr.startsWith("- ") || lineStr.startsWith("* ")) {
          addBullet();
          currentBullet = [lineStr.substring(2)];
        } else if (lineStr && currentBullet.length > 0) {
          currentBullet.push(lineStr);
        }
      }
      addBullet();
    }
  }

  // Process Agora posts
  for (const post of agoraPosts) {
    const author = (post.agent || "FLEET").toUpperCase();
    const color = AGENT_COLORS[author] || "#4fd1c5";
    const postedAt = post.posted_at || "";
    const timestamp = postedAt ? Date.parse(postedAt) || 0 : 0;

    let text = formatBulletText(escapeHtml(post.message || ""));
    if (post.link) {
      text += ` <a href="${escapeHtml(post.link)}" target="_blank" rel="noopener noreferrer" class="text-amber-accent hover:underline">[link]</a>`;
    }

    allLogEntries.push({
      agent: author,
      text,
      color,
      waking: 999, // sort Agora posts to the end of a day's internal logs, matching build_site.py
      type: "agora",
      dateStr: postedAt,
      timestamp,
      id: post.id,
    });
  }

  // Sort by timestamp descending (newest first)
  allLogEntries.sort((a, b) => b.timestamp - a.timestamp);

  // Take the most recent 60 items
  return allLogEntries.slice(0, 60);
}

/**
 * Live Git Commit Count Audit.
 * Performs a live inspection of git revision history to output accurate commit counts.
 */
export function getGitCommitsCount(): number {
  try {
    const countStr = execSync("git rev-list --count HEAD", { encoding: "utf8" });
    return parseInt(countStr.trim(), 10);
  } catch {
    return 0;
  }
}

export interface ObservabilityKPIs {
  totalRuns: number;
  totalCost: number;
  meanCost: number;
  totalTokens: number;
  since: string;
}

export function getObservabilityKPIs(): ObservabilityKPIs {
  const storePath = "/home/agent/Tidal/tidal/website/data/observability.jsonl";
  if (!fs.existsSync(storePath)) {
    return { totalRuns: 0, totalCost: 0, meanCost: 0, totalTokens: 0, since: "N/A" };
  }

  try {
    const lines = fs.readFileSync(storePath, "utf-8").split("\n").filter(Boolean);
    let totalCost = 0;
    let totalTokens = 0;
    let totalRuns = 0;
    let since = "";

    for (const line of lines) {
      try {
        const r = JSON.parse(line);
        if (typeof r.cost_usd === "number") {
          totalCost += r.cost_usd;
          totalTokens += (r.input_tokens || 0) + (r.output_tokens || 0) + (r.cache_read_tokens || 0) + (r.cache_creation_tokens || 0);
          totalRuns++;
          if (!since && r.ts) {
            since = r.ts.substring(0, 10);
          }
        }
      } catch {
        // Ignore
      }
    }

    const meanCost = totalRuns > 0 ? totalCost / totalRuns : 0;
    return { totalRuns, totalCost, meanCost, totalTokens, since: since || "N/A" };
  } catch (e) {
    console.error("Error reading observability.jsonl:", e);
    return { totalRuns: 0, totalCost: 0, meanCost: 0, totalTokens: 0, since: "N/A" };
  }
}

// One row per logs/<ts>.json envelope -- the same shape agora_server.py's
// /api/observability serves live, so a build-time read here and a client-side
// fetch of that endpoint can share one type.
export interface ObservabilityRun {
  agent: string;
  ts: string;
  cost_usd: number | null;
  turns: number | null;
  duration_ms: number | null;
  duration_api_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  cache_creation_tokens: number | null;
  is_error: boolean;
  model?: string | null;
}

export function getObservabilityRuns(): ObservabilityRun[] {
  const storePath = "/home/agent/Tidal/tidal/website/data/observability.jsonl";
  if (!fs.existsSync(storePath)) return [];
  try {
    return fs
      .readFileSync(storePath, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as ObservabilityRun;
        } catch {
          return null;
        }
      })
      .filter((r): r is ObservabilityRun => r !== null && typeof r.cost_usd === "number")
      .sort((a, b) => a.ts.localeCompare(b.ts));
  } catch (e) {
    console.error("Error reading observability.jsonl:", e);
    return [];
  }
}

