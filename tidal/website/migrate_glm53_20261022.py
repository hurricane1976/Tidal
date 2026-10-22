#!/usr/bin/env python3
"""2026-10-22 21:08:27Z operator directive migration (Tidal waking):
"all the models are now running GLM 5.3 Flash please ensure the website is
updated to reflect this on all pages".

Canonical current label everywhere: "GLM 5.3 Flash", provenance
"operator directive 2026-10-22 21:08:27Z, fleet-wide", keeping each agent's
"was ..." history. Every agent's family becomes GLM. Ordered exact-string
replacements; every replacement must hit exactly once (or a documented
count) — any miss aborts with a report so nothing silently goes stale.
"""
import re, sys, pathlib

ROOT = pathlib.Path("/home/agent/agent/website")

PROV = "operator directive 2026-10-22 21:08:27Z, fleet-wide"

def clause(desc_prefix, was, alias=True):
    mech = "latest alias, via opencode; " if alias else ""
    was_txt = f" \u2014 was {was}" if was else ""
    return f"{desc_prefix} (operator directive 2026-10-22 21:08:27Z, fleet-wide{was_txt})"

# ---------------------------------------------------------------- FleetTopology.tsx
FTX = ROOT / "next-app/src/components/FleetTopology.tsx"
ftx_old_new = [
    # --- local seven ---
    ('GLM Flash (latest alias, via opencode) \u2014 operator directive 2026-10-22 \u201call 7 agents on GLM Flash latest\u201d (Claude Code (Sonnet) window 2026-09-20..10-22)',
     'GLM 5.3 Flash (latest alias, via opencode) \u2014 operator directives 2026-10-22: 16:04Z \u201call 7 agents on GLM Flash latest\u201d, 21:08:27Z fleet-wide \u201call the models are now running GLM 5.3 Flash\u201d (Claude Code (Sonnet) window 2026-09-20..10-22)'),
    ('GLM Flash (latest alias, via opencode; operator directive 2026-10-22 \u2014 Ling 3.1 Flash window 2026-10-17..10-22)',
     'GLM 5.3 Flash (latest alias, via opencode; operator directives 2026-10-22: 16:04Z local, 21:08:27Z fleet-wide \u2014 Ling 3.1 Flash window 2026-10-17..10-22)'),
    ('GLM Flash (latest alias, via opencode; operator directive 2026-10-22 \u2014 was Muse Spark 1.3 free)',
     'GLM 5.3 Flash (latest alias, via opencode; operator directives 2026-10-22: 16:04Z local, 21:08:27Z fleet-wide \u2014 was Muse Spark 1.3 free)'),
    ('GLM Flash (latest alias, via opencode; operator directive 2026-10-22 \u2014 was gpt-5.6-luna via Codex CLI 2026-09-20..10-22, Muse Spark 1.2 at onboarding)',
     'GLM 5.3 Flash (latest alias, via opencode; operator directives 2026-10-22: 16:04Z local, 21:08:27Z fleet-wide \u2014 was gpt-5.6-luna via Codex CLI 2026-09-20..10-22, Muse Spark 1.2 at onboarding)'),
    ('GLM Flash (latest alias, via opencode; operator directive 2026-10-22 \u2014 was gpt-5.6-luna via Codex CLI 2026-09-20..10-22, Qwen 3.8 27B Free at onboarding)',
     'GLM 5.3 Flash (latest alias, via opencode; operator directives 2026-10-22: 16:04Z local, 21:08:27Z fleet-wide \u2014 was gpt-5.6-luna via Codex CLI 2026-09-20..10-22, Qwen 3.8 27B Free at onboarding)'),
    # --- beacon group ---
    ("Claude Code (Sonnet) \u2014 first-party in Beacon's live master feed 2026-09-20 (moved off opencode/GLM Flash)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 was Claude Code (Sonnet) 2026-09-20..10-22, GLM Flash via opencode before that)'),
    ('GLM Flash Latest (via OpenRouter, on opencode; was Claude Code Sonnet until 2026-09-19 -- Josh\'s Sept 20 correction)',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 Ling 3.1 Flash window 2026-10-17..10-22, GLM Flash Latest until 2026-10-17; was Claude Code Sonnet until 2026-09-19 \u2014 Josh\'s Sept 20 correction)'),
    ('GLM Flash (via opencode)',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 was Ling 3.1 Flash 2026-10-17..10-22, GLM Flash via opencode before that)'),
    ('GLM 5.3 Flash',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 was Ling 3.1 Flash 2026-10-17..10-22)'),
    ('GLM Flash (via OpenRouter, on opencode)',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 was Ling 3.1 Flash 2026-10-17..10-22, GLM Flash via OpenRouter before that)'),
    ("Codex CLI + gpt-5.6-luna (per Beacon's master feed 2026-09-20; was GLM Flash Latest via OpenRouter on opencode)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 was Codex CLI + gpt-5.6-luna 2026-09-20..10-22, GLM Flash Latest via OpenRouter on opencode at onboarding)'),
    # --- mountain group ---
    ("Claude Code (Sonnet 5, claude-sonnet-5; Mountain's first-party agent.json \u2014 2026-09-20 engine switch back from GLM Flash)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 was Claude Code (Sonnet 5) 2026-09-20..10-22, GLM Flash via opencode before that)'),
    ('GLM Flash Latest (per Mountain)',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 was GLM Flash Latest, per Mountain)'),
    ('GLM Flash (via opencode; per Mountain\'s manifest)',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 was GLM Flash via opencode, per Mountain\'s manifest)'),
    ("Muse Spark 1.3 free (opencode Zen; Mountain's first-party fleet.json + agent.json, 2026-09-26)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 was Muse Spark 1.3 free (opencode Zen), per Mountain\'s first-party fleet.json + agent.json 2026-09-26)'),
    ("gpt-5.6-luna (via Codex CLI; Mountain's first-party agent.json + wake log 2026-09-20 -- was Muse Spark 1.2)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 was gpt-5.6-luna via Codex CLI 2026-09-20..10-22, Muse Spark 1.2 at onboarding)'),
    ("gpt-5.6-luna (via Codex CLI; Mountain's first-party agent.json + wake log 2026-09-20 -- was Qwen 3.8 27B Free)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 was gpt-5.6-luna via Codex CLI 2026-09-20..10-22, Qwen 3.8 27B Free at onboarding)'),
    # --- beacon-host second wave + gale host ---
    ("Claude Code (Sonnet) (per Beacon's master feed 2026-09-20; was Qwen 3.8 27B Free via OpenRouter)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 was Claude Code (Sonnet) 2026-09-20..10-22, Qwen 3.8 27B Free via OpenRouter at onboarding)'),
    ("Claude Code (Sonnet 5), per Gale's own authenticated self-reports to Beacon/Tidal/Mountain 2026-09-21",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 was Claude Code (Sonnet 5), per Gale\'s own authenticated self-reports to Beacon/Tidal/Mountain 2026-09-21)'),
    ("opencode / muse-spark-1.2-contributor-free, per Gale's own fleet intro (2026-09-21 17:49:18Z)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 was opencode / muse-spark-1.2-contributor-free, per Gale\'s own fleet intro 2026-09-21)'),
    ('Qwen (operator Josh\'s word, 2026-09-26)',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 was Qwen, operator Josh\'s word 2026-09-26)'),
    ('Qwen (local Ollama qwen3.8:27b; Gale\'s own onboarding note, 2026-09-25)',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide \u2014 was Qwen local Ollama qwen3.8:27b, per Gale\'s own onboarding note 2026-09-25)'),
    # --- legend: single GLM chip ---
    ('''const LEGEND: { family: Family; x: number }[] = [
  { family: "Claude", x: 60 },
  { family: "GLM", x: 150 },
  { family: "OpenAI", x: 240 },
  { family: "Muse", x: 330 },
  { family: "Qwen", x: 420 },''',
     '''const LEGEND: { family: Family; x: number }[] = [
  // 2026-10-22 (operator directive "all the models are now running GLM 5.3
  // Flash", fleet-wide): every agent is GLM -- the Claude/OpenAI/Muse/Qwen
  // chips are retired (same precedent as the Sept 15 + Sept 20 chip
  // retirements; FAMILY_COLOR keeps the historical tokens for dated records).
  { family: "GLM", x: 60 },'''),
]

# ---------------------------------------------------------------- build_site.py
BS = ROOT / "build_site.py"
bs_old_new = [
    # fleet.json fallback strings + static roster model lines (plain and HTML-entity variants)
    ('GLM Flash (latest alias, via opencode; operator directive 2026-10-22 &mdash; was Claude Code (Sonnet) 2026-09-20..10-22)',
     'GLM 5.3 Flash (latest alias, via opencode; operator directives 2026-10-22: 16:04Z local, 21:08:27Z fleet-wide &mdash; was Claude Code (Sonnet) 2026-09-20..10-22)'),
    ('GLM Flash (latest alias, via opencode; operator directive 2026-10-22 &mdash; Ling 3.1 Flash window 2026-10-17..10-22)',
     'GLM 5.3 Flash (latest alias, via opencode; operator directives 2026-10-22: 16:04Z local, 21:08:27Z fleet-wide &mdash; Ling 3.1 Flash window 2026-10-17..10-22)'),
    ('GLM Flash (latest alias, via opencode; operator directive 2026-10-22 &mdash; was Muse Spark 1.3 free)',
     'GLM 5.3 Flash (latest alias, via opencode; operator directives 2026-10-22: 16:04Z local, 21:08:27Z fleet-wide &mdash; was Muse Spark 1.3 free)'),
    ('GLM Flash (latest alias, via opencode; operator directive 2026-10-22 &mdash; was gpt-5.6-luna via Codex CLI 2026-09-20..10-22)',
     'GLM 5.3 Flash (latest alias, via opencode; operator directives 2026-10-22: 16:04Z local, 21:08:27Z fleet-wide &mdash; was gpt-5.6-luna via Codex CLI 2026-09-20..10-22)'),
    ("Claude Code (Sonnet) (first-party in Beacon's live feed 2026-09-20; was GLM Flash via opencode)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide &mdash; was Claude Code (Sonnet) 2026-09-20..10-22, GLM Flash via opencode before that)'),
    ('GLM Flash (via OpenRouter, on opencode; was Claude Code Sonnet until 2026-09-19)',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide &mdash; Ling 3.1 Flash window 2026-10-17..10-22, GLM Flash Latest until 2026-10-17; was Claude Code Sonnet until 2026-09-19)'),
    ('GLM Flash (via opencode)',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide &mdash; was Ling 3.1 Flash 2026-10-17..10-22, GLM Flash via opencode before that)'),
    ("Claude Code (Sonnet 5) (Mountain's 2026-09-20 engine switch back; was GLM Flash via opencode)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide &mdash; was Claude Code (Sonnet 5) 2026-09-20..10-22, GLM Flash via opencode before that)'),
    ('GLM Flash Latest (per Mountain)',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide &mdash; was GLM Flash Latest, per Mountain)'),
    ("Muse Spark 1.3 free (opencode Zen; per Mountain's first-party feed)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide &mdash; was Muse Spark 1.3 free (opencode Zen), per Mountain\'s first-party feed)'),
    ("Codex CLI + gpt-5.6-luna (per Beacon's feed 2026-09-20; was GLM Flash Latest via OpenRouter)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide &mdash; was Codex CLI + gpt-5.6-luna 2026-09-20..10-22, GLM Flash Latest via OpenRouter at onboarding)'),
    ("Claude Code (Sonnet) (per Beacon's feed 2026-09-20; was Qwen 3.8 27B Free via OpenRouter)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide &mdash; was Claude Code (Sonnet) 2026-09-20..10-22, Qwen 3.8 27B Free via OpenRouter at onboarding)'),
    ("gpt-5.6-luna (via Codex CLI; Mountain's first-party agent.json + wake log 2026-09-20 -- was Muse Spark 1.2)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide &mdash; was gpt-5.6-luna via Codex CLI 2026-09-20..10-22, Muse Spark 1.2 at onboarding)'),
    ("gpt-5.6-luna (via Codex CLI; Mountain's first-party agent.json + wake log 2026-09-20 -- was Qwen 3.8 27B Free)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide &mdash; was gpt-5.6-luna via Codex CLI 2026-09-20..10-22, Qwen 3.8 27B Free at onboarding)'),
    ("Claude Code (Sonnet 5), per Gale's own authenticated self-reports",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide &mdash; was Claude Code (Sonnet 5), per Gale\'s own authenticated self-reports 2026-09-21)'),
    ("opencode / muse-spark-1.2-contributor-free, per Gale's own fleet intro",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide &mdash; was opencode / muse-spark-1.2-contributor-free, per Gale\'s own fleet intro 2026-09-21)'),
    ("Qwen (operator Josh's word, 2026-09-26)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide &mdash; was Qwen, operator Josh\'s word 2026-09-26)'),
    ('Qwen (local Ollama qwen3.8:27b)',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide &mdash; was Qwen local Ollama qwen3.8:27b)'),
    # jsonl/fleet.json fallback strings (plain, non-entity)
    ('GLM Flash (via opencode; per Mountain\'s report)',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide; was GLM Flash via opencode, per Mountain\'s report)'),
    ('GLM Flash Latest (via OpenRouter, on opencode)',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide; was GLM Flash Latest via OpenRouter on opencode)'),
    ('GLM Flash (via OpenRouter, on opencode)',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide; was Ling 3.1 Flash 2026-10-17..10-22, GLM Flash via OpenRouter before that)'),
    ('GLM Flash (via opencode)',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide; was Ling 3.1 Flash 2026-10-17..10-22, GLM Flash via opencode before that)'),
    ('GLM (per Mountain\'s manifest)',
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide; was GLM, per Mountain\'s manifest)'),
    ("GLM Flash Latest (per Mountain's manifest)",
     'GLM 5.3 Flash (operator directive 2026-10-22 21:08:27Z, fleet-wide; was GLM Flash Latest, per Mountain\'s manifest)'),
    # ping-card model suffixes (local agents) -- keep but reword lead-in
    ('GLM Flash (latest, via opencode) (Local Dev)', 'GLM 5.3 Flash (latest alias, via opencode) (Local Dev)'),
    ('GLM Flash (latest) (Local SysOps)', 'GLM 5.3 Flash (latest alias, via opencode) (Local SysOps)'),
    ('GLM Flash (latest) (Local Sec)', 'GLM 5.3 Flash (latest alias, via opencode) (Local Sec)'),
    ('GLM Flash (latest) (Local Research)', 'GLM 5.3 Flash (latest alias, via opencode) (Local Research)'),
    ('GLM Flash (latest) (Business development)', 'GLM 5.3 Flash (latest alias, via opencode) (Business development)'),
    ('GLM Flash (via opencode) (Remote Sec)', 'GLM 5.3 Flash (latest alias, via opencode) (Remote Sec)'),
    ('GLM Flash (Remote Data)', 'GLM 5.3 Flash (latest alias, via opencode) (Remote Data)'),
    ('GLM Flash (Remote Scribe)', 'GLM 5.3 Flash (operator directive 2026-10-22, fleet-wide) (Remote Scribe)'),
    ('GLM Flash Latest (Remote Sibling)', 'GLM 5.3 Flash (operator directive 2026-10-22, fleet-wide) (Remote Sibling)'),
    ('GLM Flash Latest (Outward Voice)', 'GLM 5.3 Flash (operator directive 2026-10-22, fleet-wide) (Outward Voice)'),
    ('GLM Flash (Treasury &amp; strategy)', 'GLM 5.3 Flash (operator directive 2026-10-22, fleet-wide) (Treasury &amp; strategy)'),
    # latency-matrix / boot-log wake strings
    ('Loading GLM Flash (latest) config.', 'Loading GLM 5.3 Flash (latest alias) config.'),
    ('Initializing GLM Flash (latest) engine.', 'Initializing GLM 5.3 Flash (latest alias) engine.'),
]

def apply(path, pairs, expect_counts=None):
    p = pathlib.Path(path)
    src = p.read_text()
    report = []
    for old, new in pairs:
        n = src.count(old)
        if n == 0:
            report.append(f"MISS  {p.name}: {old[:80]!r}")
        else:
            src = src.replace(old, new)
            report.append(f"ok({n}) {p.name}: {old[:60]!r} -> {new[:60]!r}")
    p.write_text(src)
    return report

if __name__ == "__main__":
    all_reports = []
    all_reports += apply(FTX, ftx_old_new)
    all_reports += apply(BS, bs_old_new)
    misses = [r for r in all_reports if r.startswith("MISS")]
    for r in all_reports:
        print(r)
    if misses:
        print(f"\n{len(misses)} MISSES -- fix before proceeding", file=sys.stderr)
        sys.exit(1)
    print("\nAll replacements applied.")
