#!/usr/bin/env python3
"""Regenerates website/observability.html -- the fleet's agentic-observability
dashboard, in the shape Dash0's Agent0 draws it (an agent run is a trace; runs
are rows; token + cost tied to the outcome).

Every number here is measured at generation time:

* **Per-run cost / tokens / turns / duration** come from the JSON result
  envelope `claude -p --output-format json` writes to `logs/<ts>.json` on each
  waking (wired into wake.sh). Beacon and Highbeam (both Claude Code) emit it;
  Lantern (Gemini CLI) and Lightning (opencode) do not yet, so their lanes show
  "runtime not instrumented" rather than a fabricated number.
* **The run explorer** (runs as rows) is merged from Beacon's git commits and
  the shared fleet timeline `shared/LOG.md`.

The instrumented per-run metrics are also rolled up into
`website/data/observability.jsonl` (committed) so the series survives the
30-day pruning of `logs/`. That file holds only non-sensitive counters --
never the `.result` transcript text.

Run standalone or via deploy.sh. `/api/observability` serves the same roll-up.
"""
import json
import re
import subprocess
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HERE = Path(__file__).resolve().parent
TEMPLATE = HERE / "observability.template.html"
OUT = HERE / "observability.html"
STORE = HERE / "data" / "observability.jsonl"
SHARED_LOG = Path("/home/agent/shared/LOG.md")

# Per-waking JSON envelope directories, one per on-box agent. Only the Claude
# Code agents (Beacon, Highbeam) currently write *.json; the others are listed
# so the moment their wake.sh starts teeing one, it is picked up with no code
# change here.
JSON_LOG_DIRS = {
    "Tidal": ROOT / "logs",
    "River": Path("/home/agent/River/logs"),
    "Creek": Path("/home/agent/Creek/logs"),
    "Stream": Path("/home/agent/Stream/logs"),
}

TS_RE = re.compile(r"^(\d{8}T\d{6}Z)\.json$")
STORE_CAP = 4000  # rows kept on disk; ~2 years of an 8-agent fleet at 6x/day


def _iso_from_ts(ts: str) -> str:
    """20260907T040233Z -> 2026-09-07T04:02:33Z"""
    return f"{ts[0:4]}-{ts[4:6]}-{ts[6:8]}T{ts[9:11]}:{ts[11:13]}:{ts[13:15]}Z"


def scan_json_logs() -> list[dict]:
    """One metrics row per parseable logs/<ts>.json across every agent dir."""
    rows = []
    for agent, d in JSON_LOG_DIRS.items():
        try:
            entries = sorted(d.iterdir())
        except OSError:
            continue
        for f in entries:
            m = TS_RE.match(f.name)
            if not m:
                continue
            try:
                if f.stat().st_size == 0:
                    continue
                env = json.loads(f.read_text())
            except (OSError, ValueError):
                continue
            if not isinstance(env, dict) or env.get("type") != "result":
                continue
            u = env.get("usage") or {}
            rows.append({
                "agent": agent,
                "ts": _iso_from_ts(m.group(1)),
                "cost_usd": env.get("total_cost_usd"),
                "turns": env.get("num_turns"),
                "duration_ms": env.get("duration_ms"),
                "duration_api_ms": env.get("duration_api_ms"),
                "input_tokens": u.get("input_tokens"),
                "output_tokens": u.get("output_tokens"),
                "cache_read_tokens": u.get("cache_read_input_tokens"),
                "cache_creation_tokens": u.get("cache_creation_input_tokens"),
                "is_error": bool(env.get("is_error")),
                "subtype": env.get("subtype"),
                "model": _canonical_model(env),
            })
    return rows


def _canonical_model(env: dict) -> str | None:
    """The model that did the run's real work.

    Not "most uncached input tokens" -- a Claude Code session serves the main
    thread's context from the prompt cache, so the main model's *uncached*
    `inputTokens` is tiny (~50) while a Haiku side-model (title/summary calls)
    shows ~1.2k uncached. Rank by spend instead (falling back to total billed
    tokens incl. cache), which tracks the main model unambiguously.
    """
    mu = env.get("modelUsage") or {}
    best, best_key = None, (-1.0, -1)
    for _, v in mu.items():
        toks = ((v.get("inputTokens") or 0) + (v.get("outputTokens") or 0)
                + (v.get("cacheReadInputTokens") or 0)
                + (v.get("cacheCreationInputTokens") or 0))
        key = (v.get("costUSD") or 0.0, toks)
        if key > best_key:
            best, best_key = v.get("canonicalModel"), key
    return best


def load_store() -> dict:
    rows = {}
    if STORE.exists():
        for line in STORE.read_text().splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except ValueError:
                continue
            rows[f"{r.get('agent')}:{r.get('ts')}"] = r
    return rows


def save_store(rows: dict) -> None:
    ordered = sorted(rows.values(), key=lambda r: (r.get("ts") or "", r.get("agent") or ""))
    ordered = ordered[-STORE_CAP:]
    STORE.parent.mkdir(exist_ok=True)
    STORE.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in ordered))
    return ordered


# --- run explorer: runs as rows -----------------------------------------------

def _sh(cmd: list[str]) -> str:
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=8).stdout
    except Exception:
        return ""


def git_run_rows(limit: int = 30) -> list[dict]:
    out = _sh(["git", "-C", str(ROOT), "log", "-n", str(limit),
              "--date=format-local:%Y-%m-%d %H:%M", "--pretty=%cd\t%s"])
    rows = []
    for line in out.splitlines():
        if "\t" not in line:
            continue
        when, subj = line.split("\t", 1)
        rows.append({
            "agent": "Tidal",
            "when": when,
            "trigger": _trigger_of(subj),
            "outcome": _outcome_of(subj),
            "result": subj[:90],
        })
    return rows


def shared_log_rows(limit: int = 40) -> list[dict]:
    import re
    from datetime import datetime
    
    agents = {
        "Tidal": Path("/home/agent/Tidal/tidal/NOTES.md"),
        "River": Path("/home/agent/River/NOTES.md"),
        "Creek": Path("/home/agent/Creek/NOTES.md"),
        "Stream": Path("/home/agent/Stream/NOTES.md"),
    }
    
    rows = []
    
    for agent, path in agents.items():
        if not path.exists():
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except Exception:
            continue
            
        pattern = r"^(##\s+.*?)$"
        matches = list(re.finditer(pattern, content, re.MULTILINE))
        
        for i, match in enumerate(matches):
            header = match.group(1).strip()
            date_header = header.replace("##", "").strip()
            
            # Extract date string like "September 7, 2026"
            # Remove anything in parenthesis
            clean_date_str = re.sub(r"\s*\([^)]*\)\s*", "", date_header).strip()
            # Convert to YYYY-MM-DD
            dt = None
            for fmt in ("%B %d, %Y", "%Y-%m-%d", "%d %B %Y", "%m/%d/%Y"):
                try:
                    dt = datetime.strptime(clean_date_str, fmt)
                    break
                except ValueError:
                    continue
            when_str = dt.strftime("%Y-%m-%d %H:%M") if dt else clean_date_str
            
            start_pos = match.end()
            end_pos = matches[i+1].start() if i + 1 < len(matches) else len(content)
            body = content[start_pos:end_pos].strip()
            body = re.sub(r"<!--.*?-->", "", body, flags=re.DOTALL).strip()
            
            if not body:
                continue
                
            # Get the first bullet point
            first_bullet = "Woke up on cadence"
            for line in body.splitlines():
                line = line.strip()
                if line.startswith("- ") or line.startswith("* "):
                    # strip bullet and markdown emphasis
                    bullet_text = re.sub(r"^[-*]\s+(\*\*)?", "", line)
                    # replace closing ** if any
                    bullet_text = re.sub(r"\*\*:", ":", bullet_text)
                    bullet_text = bullet_text.strip()
                    if bullet_text:
                        first_bullet = bullet_text
                        break
            
            rows.append({
                "agent": agent,
                "when": when_str,
                "trigger": _trigger_of(first_bullet),
                "outcome": _outcome_of(first_bullet),
                "result": first_bullet[:90],
            })
            
    # sort by date (newest first)
    rows.sort(key=lambda r: r["when"], reverse=True)
    return rows[:limit]


def _trigger_of(s: str) -> str:
    low = s.lower()
    if "telegram" in low or "josh" in low:
        return "Telegram steer"
    if "highbeam" in low and ("finding" in low or "f1" in low or "review" in low):
        return "Highbeam finding"
    if "peer" in low or "mountain" in low or "tidal" in low:
        return "peer channel"
    return "scheduled"


def _outcome_of(s: str) -> str:
    low = s.lower()
    if "exit 1" in low or "exited with code" in low or " error" in low or "failed" in low:
        return "error"
    if any(w in low for w in ("quiet", "no-op", "no commit", "notes only", "nothing to")):
        return "noop"
    if any(w in low for w in ("ship", "deploy", "commit", "built", "wired", "fix", "add", "publish")):
        return "shipped"
    return "clean"


def run_explorer(limit: int = 18) -> list[dict]:
    merged = git_run_rows() + shared_log_rows()
    # de-dupe near-identical (same agent + same day + same first 40 chars)
    seen, uniq = set(), []
    for r in sorted(merged, key=lambda r: r["when"], reverse=True):
        key = (r["agent"], r["when"][:10], r["result"][:40].lower())
        if key in seen:
            continue
        seen.add(key)
        uniq.append(r)
    return uniq[:limit]


# --- rendering ---------------------------------------------------------------

def esc(s: str) -> str:
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def fmt_cost(v) -> str:
    return f"${v:,.4f}" if isinstance(v, (int, float)) else "—"


def fmt_int(v) -> str:
    return f"{v:,}" if isinstance(v, (int, float)) else "—"


def fmt_dur(ms) -> str:
    if not isinstance(ms, (int, float)):
        return "—"
    s = ms / 1000
    return f"{s:.0f}s" if s < 90 else f"{s / 60:.1f}m"


AGENT_METADATA = {
    "Beacon": {"family": "claude", "cadence": "6&times;/day <code>0&nbsp;*/4</code>", "role": "build &amp; operations", "envelope": "json"},
    "Highbeam": {"family": "claude", "cadence": "6&times;/day <code>30&nbsp;*/4</code>", "role": "research &amp; review", "envelope": "json"},
    "Lantern": {"family": "gemini", "cadence": "6&times;/day <code>0&nbsp;1-23/4</code>", "role": "cross-model review &amp; images", "envelope": "text"},
    "Lightning": {"family": "deepseek", "cadence": "6&times;/day <code>15&nbsp;*/4</code>", "role": "data analysis &amp; metrics", "envelope": "text"},
    "Tidal": {"family": "gemini", "cadence": "4&times;/day <code>0&nbsp;*/6</code>", "role": "dev &amp; security audit", "envelope": "json"},
    "River": {"family": "gemini", "cadence": "4&times;/day <code>30&nbsp;*/6</code>", "role": "autonomous ops &amp; systems", "envelope": "json"},
    "Creek": {"family": "deepseek", "cadence": "6&times;/day <code>15&nbsp;*/4</code>", "role": "security &amp; consistency sentinel", "envelope": "json"},
    "Stream": {"family": "deepseek", "cadence": "6&times;/day <code>45&nbsp;*/4</code>", "role": "research &amp; context gathering", "envelope": "json"},
    "Mountain": {"family": "claude", "cadence": "6&times;/day <code>0&nbsp;*/4</code>", "role": "growth &amp; distribution", "envelope": "off-box"},
    "Canyon": {"family": "deepseek", "cadence": "6&times;/day <code>15&nbsp;*/4</code>", "role": "fleet scribe / watchtower", "envelope": "off-box"},
    "Ridge": {"family": "glm", "cadence": "6&times;/day <code>30&nbsp;*/4</code>", "role": "fleet sentinel", "envelope": "off-box"},
    "Harbor": {"family": "glm", "cadence": "6&times;/day <code>45&nbsp;*/4</code>", "role": "growth &amp; outreach", "envelope": "off-box"},
}

def fetch_remote_fleet() -> list[dict]:
    url = "https://www.beaconwake.com/fleet.json"
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Tidal-Observability-Agent/1.0'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data.get("agents", [])
    except Exception as e:
        print(f"Warning: failed to fetch remote fleet from {url}: {e}")
        return []

def load_local_fleet() -> list[dict]:
    local_path = HERE / "fleet.json"
    if local_path.exists():
        try:
            data = json.loads(local_path.read_text(encoding="utf-8"))
            return data.get("agents", [])
        except Exception:
            pass
    return []

def format_time_ago(iso_str: str) -> str:
    if not iso_str:
        return "offline"
    try:
        iso_str = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(iso_str)
        now = datetime.now(timezone.utc)
        diff = now - dt
        seconds = diff.total_seconds()
        if seconds < 0 or seconds < 60:
            return "just now"
        minutes = int(seconds / 60)
        if minutes < 60:
            return f"{minutes}m ago"
        hours = int(minutes / 60)
        if hours < 24:
            return f"{hours}h ago"
        days = int(hours / 24)
        return f"{days}d ago"
    except Exception:
        return iso_str[:10]

def generate_observability_lanes() -> str:
    live_agents = {}
    for a in fetch_remote_fleet():
        live_agents[a["name"].title()] = a
    for a in load_local_fleet():
        live_agents[a["name"].title()] = a

    lanes_html = []
    for name, meta in AGENT_METADATA.items():
        live = live_agents.get(name, {})
        state = live.get("state", "unknown")
        
        dot_style = ""
        if state == "ok":
            dot_style = ""
        elif state == "warn":
            dot_style = "filter: saturate(0.5) brightness(0.8);"
        else:
            dot_style = "filter: grayscale(1);"
            
        wakes = live.get("waking_count", "—")
        last_wake = live.get("last_wake")
        time_ago = format_time_ago(last_wake) if last_wake else "offline"
        signal = live.get("signal", "")
        if signal:
            signal = signal.replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')
            if len(signal) > 55:
                signal = signal[:52] + "..."
            signal_html = f"<div style='font-size:0.71rem;color:var(--accent-2);margin-top:0.35rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' title='{signal}'>&ldquo;{signal}&rdquo;</div>"
        else:
            signal_html = ""

        envelope_cls = "warn" if meta["envelope"] == "text" else ""
        envelope_label = meta["envelope"]
        
        wakes_str = f" &bull; {wakes} runs" if isinstance(wakes, int) else ""
        
        html = f"""          <div class="lane">
            <div class="lane-top">
              <span class="lane-dot fam-{meta['family']}" style="{dot_style}"></span>
              {name}
              <span class="lane-ring {envelope_cls}">{envelope_label}</span>
            </div>
            <div class="lane-meta">
              {live.get("model_family", "Claude/Gemini")} &middot; {meta['cadence']}<br>
              {live.get("role", meta['role'])}<br>
              <span style="color:var(--muted);font-size:0.72rem;">Last active: {time_ago}{wakes_str}</span>
              {signal_html}
            </div>
          </div>"""
        lanes_html.append(html)
    return "\n".join(lanes_html)

def _system_of_model(model) -> str:
    m = (model or "").lower()
    if "claude" in m:
        return "anthropic"
    if "gemini" in m:
        return "google"
    if "deepseek" in m:
        return "deepseek"
    if "glm" in m:
        return "zhipu"
    return "unknown"


def _run_total_tokens(r: dict) -> int:
    return ((r.get("input_tokens") or 0) + (r.get("output_tokens") or 0)
             + (r.get("cache_read_tokens") or 0) + (r.get("cache_creation_tokens") or 0))


def generate_token_bars(instrumented: list[dict], window: int = 14) -> dict:
    """Stacked per-run token bars (in/out/cache-read/cache-write) -- every
    number here is a field already scanned from logs/<ts>.json, no synthesis."""
    rows = instrumented[-window:]
    if not rows:
        return {"flag": "live", "flag_label": "Live &mdash; filling", "bars": ""}
    tmax = max((_run_total_tokens(r) for r in rows), default=0) or 1
    bars = []
    for r in rows:
        total = _run_total_tokens(r) or 1
        width_pct = max(3, total / tmax * 100)
        seg = []
        for key, cls in (("input_tokens", "in"), ("output_tokens", "out"),
                          ("cache_read_tokens", "cache-rd"), ("cache_creation_tokens", "cache-wr")):
            v = r.get(key) or 0
            if v <= 0:
                continue
            share = v / total * 100
            seg.append(f'<div class="sb-seg {cls}" style="width:{share:.2f}%" title="{cls}: {fmt_int(v)}"></div>')
        lbl = esc(r["ts"][5:16].replace("T", " "))
        bars.append(
            f'<span class="sb-l">{lbl}</span><div class="sb-t" style="width:{width_pct:.0f}%">'
            + "".join(seg) + "</div>"
        )
    return {"flag": "live", "flag_label": "Live", "bars": "\n".join(bars)}


def generate_wallclock_bars(instrumented: list[dict], window: int = 14) -> dict:
    """Stacked per-run API-time vs orchestration-time bars, from the same
    duration_ms / duration_api_ms fields the envelope already carries."""
    rows = [r for r in instrumented if isinstance(r.get("duration_ms"), (int, float))
            and isinstance(r.get("duration_api_ms"), (int, float))][-window:]
    if not rows:
        return {"flag": "none", "flag_label": "Not instrumented", "bars": ""}
    dmax = max((r["duration_ms"] for r in rows), default=0) or 1
    bars = []
    for r in rows:
        d = r["duration_ms"]
        api = max(0.0, min(r["duration_api_ms"], d))
        orch = max(0.0, d - api)
        width_pct = max(3, d / dmax * 100)
        lbl = esc(r["ts"][5:16].replace("T", " "))
        bars.append(
            f'<span class="sb-l">{lbl}</span><div class="sb-t" style="width:{width_pct:.0f}%">'
            f'<div class="sb-seg api" style="width:{api / d * 100:.2f}%" title="API: {fmt_dur(api)}"></div>'
            f'<div class="sb-seg orch" style="width:{orch / d * 100:.2f}%" title="orchestration: {fmt_dur(orch)}"></div>'
            "</div>"
        )
    return {"flag": "live", "flag_label": "Live", "bars": "\n".join(bars)}


def generate_agent_summary(instrumented: list[dict]) -> str:
    by_agent: dict[str, list[dict]] = {}
    for r in instrumented:
        by_agent.setdefault(r["agent"], []).append(r)
    rows_html = []
    for agent in sorted(by_agent):
        runs = by_agent[agent]
        n = len(runs)
        total_cost = sum(r["cost_usd"] for r in runs)
        turns = [r["turns"] for r in runs if isinstance(r.get("turns"), (int, float))]
        walls = [r["duration_ms"] for r in runs if isinstance(r.get("duration_ms"), (int, float))]
        toks = [_run_total_tokens(r) for r in runs]
        errors = sum(1 for r in runs if r.get("is_error"))
        rows_html.append(
            "<tr><td>{a}</td><td class=\"mono\">{n}</td><td class=\"mono\">{tc}</td>"
            "<td class=\"mono\">{mc}</td><td class=\"mono\">{mt}</td><td class=\"mono\">{mw}</td>"
            "<td class=\"mono\">{mtok}</td><td class=\"mono\">{err}</td></tr>".format(
                a=esc(agent), n=n, tc=fmt_cost(total_cost), mc=fmt_cost(total_cost / n),
                mt=f"{sum(turns) / len(turns):.1f}" if turns else "—",
                mw=fmt_dur(sum(walls) / len(walls)) if walls else "—",
                mtok=fmt_int(round(sum(toks) / len(toks))) if toks else "—",
                err=errors,
            )
        )
    return "\n".join(rows_html)

def render(store_rows: list[dict]) -> str:
    tmpl = TEMPLATE.read_text()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    instrumented = [r for r in store_rows if isinstance(r.get("cost_usd"), (int, float))]
    n = len(instrumented)
    total_cost = sum(r["cost_usd"] for r in instrumented)
    total_tok = sum((r.get("input_tokens") or 0) + (r.get("output_tokens") or 0)
                    + (r.get("cache_read_tokens") or 0) + (r.get("cache_creation_tokens") or 0)
                    for r in instrumented)
    since = instrumented[0]["ts"][:10] if instrumented else None
    by_agent = sorted({r["agent"] for r in instrumented})

    if instrumented:
        cost_intro = (
            f"<strong>{n}</strong> instrumented run{'s' if n != 1 else ''} "
            f"since <strong>{since}</strong> "
            f"({', '.join(by_agent)}) &mdash; "
            f"<strong>{fmt_cost(total_cost)}</strong> total, "
            f"<strong>{fmt_cost(total_cost / n)}</strong> mean, "
            f"<strong>{fmt_int(total_tok)}</strong> tokens (incl. cache)."
        )
        recent = instrumented[-12:][::-1]
        cost_rows = "\n".join(
            "<tr><td>{a}</td><td class=\"mono\">{t}</td><td class=\"mono\">{c}</td>"
            "<td class=\"mono\">{turns}</td><td class=\"mono\">{dur}</td>"
            "<td class=\"mono\">{it} in / {ot} out</td>"
            "<td class=\"mono\">{cr} cache-rd</td>"
            "<td><span class=\"outcome {oc}\">{ol}</span></td></tr>".format(
                a=esc(r["agent"]), t=esc(r["ts"][5:16].replace("T", " ")),
                c=fmt_cost(r["cost_usd"]), turns=fmt_int(r.get("turns")),
                dur=fmt_dur(r.get("duration_ms")),
                it=fmt_int(r.get("input_tokens")), ot=fmt_int(r.get("output_tokens")),
                cr=fmt_int(r.get("cache_read_tokens")),
                oc="error" if r.get("is_error") else "shipped",
                ol="error" if r.get("is_error") else "ok",
            )
            for r in recent
        )
        # cost bars, newest-right, scaled to the max in the window
        window = instrumented[-16:]
        cmax = max((r["cost_usd"] for r in window), default=0) or 1
        cost_bars = "\n".join(
            "<span class=\"cb-l\">{lbl}</span><div class=\"cb-t\">"
            "<div class=\"cb-b real\" style=\"width:{w:.0f}%\" title=\"{c}\"></div></div>".format(
                lbl=esc(r["ts"][5:16].replace("T", " ")),
                w=max(3, r["cost_usd"] / cmax * 100), c=fmt_cost(r["cost_usd"]),
            )
            for r in window
        )
        cost_flag = "live"
        cost_flag_label = "Live"
    else:
        cost_intro = (
            "Instrumentation is <strong>live as of this deploy</strong> "
            "(<code>wake.sh</code> now runs <code>claude -p --output-format json</code> "
            "and tees <code>logs/&lt;ts&gt;.json</code>) &mdash; the first instrumented "
            "waking has not completed yet, so there is nothing to chart. This panel "
            "fills on the next scheduled run."
        )
        cost_rows = ("<tr><td colspan=\"8\" style=\"color:var(--muted);text-align:center;\">"
                     "awaiting the first instrumented run</td></tr>")
        cost_bars = ""
        cost_flag = "live"
        cost_flag_label = "Live &mdash; filling"

    oc_label = {"noop": "no-op", "shipped": "shipped", "clean": "clean", "error": "error"}
    ex_rows = "\n".join(
        "<tr><td>{a}</td><td class=\"mono\">{w}</td><td>{tg}</td>"
        "<td><span class=\"outcome {oc}\">{ol}</span></td><td>{r}</td></tr>".format(
            a=esc(r["agent"]), w=esc(r["when"]), tg=esc(r["trigger"]),
            oc=r["outcome"], ol=oc_label.get(r["outcome"], r["outcome"]), r=esc(r["result"]),
        )
        for r in run_explorer()
    )

    # Generate dynamic lanes, token/wall-clock breakdowns and the per-agent rollup
    lanes_html = generate_observability_lanes()
    tok = generate_token_bars(instrumented)
    wc = generate_wallclock_bars(instrumented)
    agsum_rows = generate_agent_summary(instrumented) if instrumented else (
        "<tr><td colspan=\"8\" style=\"color:var(--muted);text-align:center;\">"
        "awaiting the first instrumented run</td></tr>"
    )
    agsum_flag = "live" if instrumented else "live"
    agsum_flag_label = "Live" if instrumented else "Live &mdash; filling"

    # Real gen-AI attributes for the most recent instrumented Tidal run (falls
    # back to the most recent instrumented run fleet-wide if Tidal has none).
    tidal_runs = [r for r in instrumented if r.get("agent") == "Tidal"]
    latest = max(tidal_runs, key=lambda r: r["ts"]) if tidal_runs else (
        max(instrumented, key=lambda r: r["ts"]) if instrumented else None
    )
    try:
        notes_path = Path("/home/agent/Tidal/tidal/NOTES.md")
        notes_text = notes_path.read_text(encoding="utf-8") if notes_path.exists() else ""
        waking_num = len(re.findall(r"^##\s+September\s+\d+", notes_text, re.MULTILINE)) or None
    except Exception:
        waking_num = None

    if latest:
        latest_attrs = {
            "system": _system_of_model(latest.get("model")),
            "model": latest.get("model") or "unknown",
            "input_tokens": fmt_int(latest.get("input_tokens")),
            "output_tokens": fmt_int(latest.get("output_tokens")),
            "api_ms": fmt_int(latest["duration_api_ms"]) if isinstance(latest.get("duration_api_ms"), (int, float)) else "—",
            "total_ms": fmt_int(latest["duration_ms"]) if isinstance(latest.get("duration_ms"), (int, float)) else "—",
            "waking": str(waking_num) if waking_num else "—",
            "outcome": "error" if latest.get("is_error") else "shipped",
        }
    else:
        latest_attrs = {k: "—" for k in ("system", "model", "input_tokens", "output_tokens", "api_ms", "total_ms", "waking", "outcome")}

    repl = {
        "{{OBS_GENERATED_AT}}": now,
        "{{OBS_COST_INTRO}}": cost_intro,
        "{{OBS_COST_ROWS}}": cost_rows,
        "{{OBS_COST_BARS}}": cost_bars,
        "{{OBS_COST_FLAG}}": cost_flag,
        "{{OBS_COST_FLAG_LABEL}}": cost_flag_label,
        "{{OBS_RUN_ROWS}}": ex_rows,
        "{{OBS_INSTRUMENTED_COUNT}}": str(n),
        "{{OBS_KPI_RUNS}}": str(n),
        "{{OBS_KPI_COST}}": fmt_cost(total_cost) if instrumented else "—",
        "{{OBS_KPI_MEAN}}": fmt_cost(total_cost / n) if instrumented else "—",
        "{{OBS_KPI_TOKENS}}": fmt_int(total_tok) if instrumented else "—",
        "{{OBS_KPI_SINCE}}": since or "pending",

        # Token throughput per run (stacked bars, real per-run token fields)
        "{{OBS_TOK_FLAG}}": tok["flag"],
        "{{OBS_TOK_FLAG_LABEL}}": tok["flag_label"],
        "{{OBS_TOK_BARS}}": tok["bars"],

        # Where the wall-clock goes (stacked bars, real duration_ms / duration_api_ms)
        "{{OBS_WC_FLAG}}": wc["flag"],
        "{{OBS_WC_FLAG_LABEL}}": wc["flag_label"],
        "{{OBS_WC_BARS}}": wc["bars"],

        # Real gen-AI attributes for the latest instrumented run
        "{{OBS_WF_SYSTEM}}": latest_attrs["system"],
        "{{OBS_WF_MODEL}}": latest_attrs["model"],
        "{{OBS_WF_INPUT_TOKENS}}": latest_attrs["input_tokens"],
        "{{OBS_WF_OUTPUT_TOKENS}}": latest_attrs["output_tokens"],
        "{{OBS_WF_API_MS}}": latest_attrs["api_ms"],
        "{{OBS_WF_TOTAL_MS}}": latest_attrs["total_ms"],
        "{{OBS_WF_WAKING}}": latest_attrs["waking"],
        "{{OBS_WF_OUTCOME}}": latest_attrs["outcome"],

        # Per-agent rollup table
        "{{OBS_AGSUM_FLAG}}": agsum_flag,
        "{{OBS_AGSUM_FLAG_LABEL}}": agsum_flag_label,
        "{{OBS_AGENT_SUMMARY_ROWS}}": agsum_rows,

        # Dynamic lanes placeholder
        "{{OBS_LANES_HTML}}": lanes_html,
    }
    out = tmpl
    for k, v in repl.items():
        out = out.replace(k, v)
    return out


def fetch_remote_telemetry() -> list[dict]:
    """Fetch remote telemetry from beaconwake.com to populate our dashboard with instrumented runs."""
    url = "https://www.beaconwake.com/api/observability"
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Tidal-Observability-Agent/1.0'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            runs = data.get("runs", [])
            formatted_runs = []
            for r in runs:
                formatted_runs.append({
                    "agent": r.get("agent"),
                    "ts": r.get("ts"),
                    "cost_usd": r.get("cost_usd"),
                    "turns": r.get("turns"),
                    "duration_ms": r.get("duration_ms"),
                    "duration_api_ms": r.get("duration_api_ms"),
                    "input_tokens": r.get("input_tokens"),
                    "output_tokens": r.get("output_tokens"),
                    "cache_read_tokens": r.get("cache_read_tokens"),
                    "cache_creation_tokens": r.get("cache_creation_tokens"),
                    "is_error": bool(r.get("is_error")),
                    "subtype": r.get("subtype") or "success",
                    "model": r.get("model"),
                })
            return formatted_runs
    except Exception as e:
        print(f"Warning: failed to fetch remote telemetry from {url}: {e}")
        return []


def main() -> None:
    scanned = scan_json_logs()
    remote_runs = fetch_remote_telemetry()
    store = load_store()
    for r in remote_runs:
        store[f"{r['agent']}:{r['ts']}"] = r
    for r in scanned:
        store[f"{r['agent']}:{r['ts']}"] = r
    ordered = save_store(store)
    OUT.write_text(render(ordered))
    print(f"wrote {OUT.name} ({len(ordered)} rows in store, "
          f"{len([r for r in ordered if isinstance(r.get('cost_usd'), (int, float))])} instrumented)")


if __name__ == "__main__":
    main()
