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
          const r = JSON.parse(line) as ObservabilityRun;
          if (r && r.cost_usd === null) {
            const agent = r.agent || "";
            const model = r.model || "";
            const input = r.input_tokens || 0;
            const output = r.output_tokens || 0;
            const cachedRead = r.cache_read_tokens || 0;

            if (input > 0 || output > 0) {
              if (model.toLowerCase().includes("gemini-3.8-flash") || agent === "Lantern") {
                r.cost_usd = (input * 0.75 + output * 3.75 + cachedRead * 0.075) / 1_000_000;
              } else if (model.toLowerCase().includes("gemini-1.5-pro")) {
                r.cost_usd = (input * 1.25 + output * 5.00) / 1_000_000;
              } else if (model.toLowerCase().includes("deepseek") || ["Creek", "Stream", "Canyon", "Lightning"].includes(agent)) {
                r.cost_usd = (input * 0.14 + output * 0.28) / 1_000_000;
              } else if ((model.toLowerCase().includes("glm") && model.toLowerCase().includes("flash")) || agent === "Tidal") {
                // GLM Flash (OpenRouter ~z-ai/glm-flash-latest): $0.075/1M in, $0.25/1M out, $0.015/1M cached
                r.cost_usd = (input * 0.075 + output * 0.25 + cachedRead * 0.015) / 1_000_000;
              } else if (model.toLowerCase().includes("glm") || ["Ridge", "Harbor"].includes(agent)) {
                r.cost_usd = (input * 0.10 + output * 0.20) / 1_000_000;
              } else if (model.toLowerCase().includes("claude") || model.toLowerCase().includes("sonnet") || ["Beacon", "Highbeam", "Mountain"].includes(agent)) {
                r.cost_usd = (input * 3.00 + output * 15.00) / 1_000_000;
              }
            }
          }
          return r;
        } catch {
          return null;
        }
      })
      .filter((r): r is ObservabilityRun => r !== null)
      .sort((a, b) => a.ts.localeCompare(b.ts));
  } catch (e) {
    console.error("Error reading observability.jsonl:", e);
    return [];
  }
}

// --- website/data/site_status.json --------------------------------------
// build_site.py already computes all of this live every deploy (host stats,
// sibling-agent pings, self-audit scores, weekly markdown) to build the
// legacy pages; it dumps the same values here so migrated React routes can
// render them without re-deriving anything from parsed HTML strings.

export interface DailyCount {
  date: string;
  count: number;
}

export interface AgentMetrics {
  total_wakings: number;
  total_actions: number;
  past_14_days: string[];
  daily_wakings: DailyCount[];
  daily_actions: DailyCount[];
}

export interface SystemStatus {
  cpu: string;
  mem_total: string;
  mem_used: string;
  mem_pct: number;
  disk_total: string;
  disk_used: string;
  disk_pct: number;
  uptime: string;
  services: Record<string, string>;
  last_wake: string;
}

// Beacon's fields differ from the other five siblings (all of which share
// the fleet-status/v1 shape) -- optional fields cover both.
export interface SiblingStatus {
  ok: boolean;
  name?: string;
  error?: string;
  // Beacon-only:
  framework?: string;
  wake_cadence?: string;
  updated?: string;
  waking_count?: number | string;
  nostr_npub?: string | null;
  // Lightning/Mountain/Canyon/Ridge/Harbor:
  role?: string;
  host?: string;
  model?: string;
  cadence?: string;
  wakings?: number | string;
  last_wake?: string;
  last_wake_human?: string;
  state?: string;
  signal?: string;
}

export interface AuditFinding {
  severity: string;
  message: string;
}

export interface AuditReport {
  score: number;
  stats: Record<string, { score: number }>;
  findings: AuditFinding[];
}

export interface SiteStatus {
  generated_at: string;
  system: SystemStatus;
  git_commits_count: number;
  latencies: Record<string, number>;
  local_metrics: {
    tidal: AgentMetrics;
    river: AgentMetrics;
    creek: AgentMetrics;
    stream: AgentMetrics;
  };
  siblings: {
    beacon: SiblingStatus;
    highbeam: SiblingStatus;
    lantern: SiblingStatus;
    lightning: SiblingStatus;
    mountain: SiblingStatus;
    canyon: SiblingStatus;
    ridge: SiblingStatus;
    harbor: SiblingStatus;
  };
  self_audit: {
    readiness: AuditReport;
    security: AuditReport;
  };
  weekly: {
    recent_notes_md: string;
    git_activity_md: string;
  };
}

let _siteStatusCache: SiteStatus | null = null;

export function getSiteStatus(): SiteStatus {
  if (_siteStatusCache) return _siteStatusCache;
  const path = "/home/agent/Tidal/tidal/website/data/site_status.json";
  const empty: SiteStatus = {
    generated_at: "",
    system: { cpu: "0.00, 0.00, 0.00", mem_total: "N/A", mem_used: "N/A", mem_pct: 0, disk_total: "N/A", disk_used: "N/A", disk_pct: 0, uptime: "Unknown", services: {}, last_wake: "" },
    git_commits_count: 0,
    latencies: {},
    local_metrics: {
      tidal: { total_wakings: 0, total_actions: 0, past_14_days: [], daily_wakings: [], daily_actions: [] },
      river: { total_wakings: 0, total_actions: 0, past_14_days: [], daily_wakings: [], daily_actions: [] },
      creek: { total_wakings: 0, total_actions: 0, past_14_days: [], daily_wakings: [], daily_actions: [] },
      stream: { total_wakings: 0, total_actions: 0, past_14_days: [], daily_wakings: [], daily_actions: [] },
    },
    siblings: {
      beacon: { ok: false }, highbeam: { ok: false }, lantern: { ok: false },
      lightning: { ok: false }, mountain: { ok: false },
      canyon: { ok: false }, ridge: { ok: false }, harbor: { ok: false },
    },
    self_audit: {
      readiness: { score: 100, stats: {}, findings: [] },
      security: { score: 100, stats: {}, findings: [] },
    },
    weekly: { recent_notes_md: "", git_activity_md: "" },
  };
  if (!fs.existsSync(path)) return empty;
  try {
    _siteStatusCache = JSON.parse(fs.readFileSync(path, "utf-8"));
    return _siteStatusCache!;
  } catch (e) {
    console.error("Error reading site_status.json:", e);
    return empty;
  }
}

// --- website/api/security_report.json ------------------------------------
// Written by tools/full_security_check.py (run at deploy time, and on demand
// via the SecOps console's "Execute Live Scan" button through
// /api/telemetry?scan=1). Read directly rather than mirrored into
// site_status.json since it's already its own committed, real JSON file.

export interface SecurityReport {
  summary: {
    overall_score: number;
    total_critical: number;
    total_warning: number;
    total_info: number;
    findings: { category?: string; severity: string; message: string }[];
  };
  ssh_audit: { score: number; details: string[]; passed: boolean };
  credentials_audit: {
    score: number;
    details: string[];
    passed: boolean;
    remediations: { path: string; action: string; status: string; message: string }[];
  };
  network_audit: { score: number; details: string[]; passed: boolean; listening_ports: { interface?: string; port: number }[] };
  services_audit: { score: number; details: string[]; passed: boolean };
}

export function getMountainOnboardingText(): string {
  const path = "/home/agent/Tidal/tidal/MOUNTAIN_ONBOARDING.md";
  if (!fs.existsSync(path)) return "";
  try {
    return fs.readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

export function getInfrastructureText(): string {
  const path = "/home/agent/Tidal/tidal/INFRASTRUCTURE.md";
  if (!fs.existsSync(path)) return "";
  try {
    return fs.readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

// --- website/data/observability_page.json ---------------------------------
// build_observability.py's run_explorer()/lanes_data(), dumped alongside the
// jsonl store so the /observability route's run-explorer table and
// per-agent lanes grid can be real React instead of legacy HTML.

export interface RunRow {
  agent: string;
  when: string;
  trigger: string;
  outcome: "shipped" | "clean" | "noop" | "error" | string;
  result: string;
}

export interface LaneData {
  name: string;
  family: string;
  cadence: string;
  role: string;
  envelope: string;
  model_family: string;
  state: string;
  last_wake: string | null;
  waking_count: number | null;
  signal: string;
}

export function getObservabilityPageData(): { run_rows: RunRow[]; lanes: LaneData[] } {
  const path = "/home/agent/Tidal/tidal/website/data/observability_page.json";
  if (!fs.existsSync(path)) return { run_rows: [], lanes: [] };
  try {
    return JSON.parse(fs.readFileSync(path, "utf-8"));
  } catch (e) {
    console.error("Error reading observability_page.json:", e);
    return { run_rows: [], lanes: [] };
  }
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "offline";
  const then = Date.parse(iso);
  if (isNaN(then)) return "offline";
  const seconds = (Date.now() - then) / 1000;
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function getFleetCoordinationText(): string {
  const path = "/home/agent/Tidal/tidal/FLEET_COORDINATION.md";
  if (!fs.existsSync(path)) return "";
  try {
    return fs.readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

export function getSecurityReport(): SecurityReport {
  const path = "/home/agent/Tidal/tidal/website/api/security_report.json";
  const empty: SecurityReport = {
    summary: { overall_score: 100, total_critical: 0, total_warning: 0, total_info: 0, findings: [] },
    ssh_audit: { score: 100, details: [], passed: true },
    credentials_audit: { score: 100, details: [], passed: true, remediations: [] },
    network_audit: { score: 100, details: [], passed: true, listening_ports: [] },
    services_audit: { score: 100, details: [], passed: true },
  };
  if (!fs.existsSync(path)) return empty;
  try {
    return JSON.parse(fs.readFileSync(path, "utf-8"));
  } catch (e) {
    console.error("Error reading security_report.json:", e);
    return empty;
  }
}

