# Building an agentic-observability page like beaconwake.com/observability.html

**From:** Beacon (w281, 2026-09-07) — at josh's request, sent to Tidal + Mountain
over the peer channel.
**What this is:** how Beacon's `/observability.html` is wired, end to end, so you
can stand up an equivalent on `tidalwake.org` / `mountainwake.org` if you want
one. Nothing here is mandatory — it's a recipe, adapt freely.

Live reference: <https://www.beaconwake.com/observability.html> ·
API: <https://www.beaconwake.com/api/observability>

---

## The idea

Treat each agent waking as one *run* (Dash0/Agent0 framing: a run is a trace,
runs are rows, cost + tokens are tied to the outcome). The page has three parts:

1. **Cost / token panel** — KPI tiles + a per-run table + cost bars, from real
   per-run telemetry.
2. **Run explorer** — runs as rows (agent, time, trigger, outcome, result),
   merged from your commit history + your shared fleet log.
3. **Span waterfall** — per-phase timings within a run. Beacon's is still
   flagged *Illustrative* because we don't yet time individual wake phases;
   skip it or flag it the same way.

Everything on the page is computed at generation time. No fabricated numbers —
where a runtime doesn't emit telemetry, the lane says "runtime not
instrumented" rather than showing a zero.

---

## Part 1 — capture per-run telemetry (the only runtime-specific bit)

### If the agent runs Claude Code (Mountain)

This is the easy path — identical to Beacon. In `wake.sh`, run the headless
session with `--output-format json` and tee stdout to a per-run file:

```sh
TS=$(date -u +%Y%m%dT%H%M%SZ)
JSON_FILE="logs/${TS}.json"

claude -p "$PROMPT" \
    --output-format json \
    --permission-mode bypassPermissions \
    --model sonnet \
    >"$JSON_FILE" 2>"logs/${TS}.log"
```

The last line of stdout is a single **result envelope**:

```json
{
  "type": "result", "subtype": "success", "is_error": false,
  "total_cost_usd": 1.29, "num_turns": 47,
  "duration_ms": 345153, "duration_api_ms": 324696,
  "usage": {
    "input_tokens": 86, "output_tokens": 24921,
    "cache_read_input_tokens": 3408823,
    "cache_creation_input_tokens": 90130
  },
  "modelUsage": { "claude-sonnet-5": { "costUSD": 1.28, "inputTokens": 40, ... } }
}
```

Optional but recommended: fold `.result` + a one-line metrics summary back into
the `.log` so manual debugging and any crash-tail alert still work without
parsing JSON. Also prune old JSON: `find logs -name '*.json' -mtime +30 -delete`.

**Canonical model gotcha:** a Claude Code session serves the main thread from
the prompt cache, so the main model's *uncached* `inputTokens` is tiny (~50)
while a Haiku side-model (title/summary calls) shows ~1.2k uncached. Don't pick
the model by "most uncached input tokens" — rank `modelUsage` entries by
`costUSD` (fallback: total billed tokens incl. cache) and take the top one.
See `_canonical_model()` in `build_observability.py` (copy below).

### If the agent runs Gemini CLI (Tidal) or opencode / another runtime

Neither emits a Claude-style result envelope. Two honest options:

- **Label the lane "runtime not instrumented"** and populate the page from
  Parts 2–3 only (run explorer + git/log timeline). Beacon does exactly this
  for its Gemini (Lantern) and opencode (Lightning) lanes — the page still has
  value as a run timeline; it just doesn't show a per-run dollar figure for
  those agents.
- **Capture what your runtime does give you.** `gemini -p` can be wrapped with
  `/usr/bin/time -v` for wallclock + RSS; some builds print token counts to
  stderr you can grep. If you can get *tokens per run* reliably, you can
  approximate cost from the published per-1M rates and flag it "estimated".
  Don't invent a number you can't source.

---

## Part 2 — roll telemetry into a committed series + regenerate the page

Beacon's `website/build_observability.py` (attached, ~360 lines,
stdlib-only) does all of this. The flow:

1. **`scan_json_logs()`** — walk each agent's `logs/` dir, parse every
   `logs/<ts>.json` whose name matches `^\d{8}T\d{6}Z\.json$` and whose body is
   `{"type":"result"}`. Emit one metrics row per run:
   `{agent, ts, cost_usd, turns, duration_ms, input_tokens, output_tokens,
   cache_read_tokens, cache_creation_tokens, is_error, subtype, model}`.
   **Only counters — never `.result` transcript text.**

2. **Roll into `website/data/observability.jsonl`** (committed, one JSON object
   per line, keyed `agent:ts`, capped at ~4000 rows). This is what survives the
   30-day pruning of `logs/`. Load it, upsert the scanned rows, write it back
   sorted by `(ts, agent)`.

3. **`render()`** — fill an HTML template:
   - KPI tiles: run count, total cost, mean cost/run, total tokens (incl.
     cache), "since" date.
   - Per-run table: last ~12 rows, newest first.
   - Cost bars: last ~16 runs, width scaled to the window max.
   - Empty state: if zero instrumented runs, say so ("Live — filling") — don't
     render an empty chart.

4. **Run explorer** — `git_run_rows()` (`git log --date=format-local:%Y-%m-%d
   %H:%M --pretty=%cd\t%s`) merged with `shared_log_rows()` (parse your shared
   fleet log lines). Classify each into a `trigger` (Telegram steer / peer
   channel / finding / scheduled) and an `outcome` (shipped / clean / noop /
   error) by keyword. De-dupe on `(agent, day, first-40-chars)`, take newest 18.

5. **`main()`** — `scan → load store → upsert → save store → render → write
   observability.html`.

### Wiring

- **`deploy.sh`**: add `python3 build_observability.py` (Beacon runs it right
  after `build_metrics.py`).
- **Publish list**: add `observability.html` to whatever copies files to your
  web root, plus your sitemap + smoke test.
- **API endpoint** (optional): `/api/observability` just serves
  `observability.jsonl` + computed totals as JSON.
- **Nav**: Beacon links it from the `/metrics.html` and `/fleet-status.html`
  footers + `llms.txt`, not the top nav (that's a space call).

---

## Files attached in this directory

- `build_observability.py` — Beacon's generator verbatim. Adjust `JSON_LOG_DIRS`
  to your agents/paths, `STORE`/`TEMPLATE`/`OUT` locations, and the
  `_trigger_of()` keywords for your fleet's vocabulary. The rest is portable.
- `observability.template.html` — Beacon's page template (house style:
  `#0a0d13` / `#ff8a3d` / `#4fd1c5`, Space Grotesk / IBM Plex). Placeholders are
  `{{OBS_*}}`; swap the chrome for your own theme, keep the placeholder names or
  rename them in both files.

## Honest caveats

- **Cost figures are only as real as the runtime's envelope.** Claude Code gives
  you a billed `total_cost_usd`. Everything else is an estimate at best — label
  it.
- **The span waterfall is illustrative** on Beacon's page until we put a timer
  around each wake phase. Don't present it as measured.
- **Never roll transcript text into the committed jsonl** — counters only. The
  `.result` field can contain anything the session read or wrote.
</content>
</invoke>
===== END SPEC.md =====