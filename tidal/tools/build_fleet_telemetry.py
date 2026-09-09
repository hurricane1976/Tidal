#!/usr/bin/env python3
"""
Regenerates website/data/fleet-telemetry.jsonl with real, live fleet-telemetry/v1
data for co-located agents (Tidal, River, Creek, Stream).
Conforms to the locked fleet-telemetry/v1 specifications.
"""
import os
import re
import json
import sys
import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Add the directory containing this script to sys.path to allow importing instrument_logs
sys.path.append(str(Path(__file__).resolve().parent))

try:
    import instrument_logs
    instrument_logs.main()
except Exception as e:
    print(f"Warning: Failed to import or run instrument_logs: {e}")

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "website" / "data"
TELEMETRY_FILE = DATA_DIR / "fleet-telemetry.jsonl"

AGENTS_CONFIG = {
    "Tidal": {
        "notes": ROOT / "NOTES.md",
        "logs": ROOT / "logs",
        "family": "gemini",
        "model": "gemini-1.5-pro",
    },
    "River": {
        "notes": Path("/home/agent/River/NOTES.md"),
        "logs": Path("/home/agent/River/logs"),
        "family": "gemini",
        "model": "gemini-1.5-pro",
    },
    "Creek": {
        "notes": Path("/home/agent/Creek/NOTES.md"),
        "logs": Path("/home/agent/Creek/logs"),
        "family": "deepseek",
        "model": "deepseek-v4-pro",
    },
    "Stream": {
        "notes": Path("/home/agent/Stream/NOTES.md"),
        "logs": Path("/home/agent/Stream/logs"),
        "family": "deepseek",
        "model": "deepseek-v4-pro",
    }
}

TS_RE = re.compile(r"^(\d{8}T\d{6}Z)\.json$")

def parse_notes_waking_counts(agent_name: str, notes_path: Path) -> list:
    """Parses NOTES.md to get a chronological list of dates and waking counts."""
    wakes = []
    if not notes_path.exists():
        return wakes
    try:
        content = notes_path.read_text(encoding="utf-8")
    except Exception:
        return wakes

    # Sort rules: Stream writes oldest-to-newest, others write newest-to-oldest.
    pattern = r"^(##\s+.*?)$"
    matches = list(re.finditer(pattern, content, re.MULTILINE))
    
    for match in matches:
        header = match.group(1).strip()
        header_text = header.replace("##", "").strip()
        
        # Check if contains a waking count like "(Waking 161)" or "(first waking)"
        waking_count = None
        w_match = re.search(r"\(Waking\s+(\d+)\)", header_text)
        if w_match:
            waking_count = int(w_match.group(1))
        else:
            word_match = re.search(r"\((first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth)\s+waking\)", header_text, re.IGNORECASE)
            if word_match:
                word = word_match.group(1).lower()
                mapping = {
                    "first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5,
                    "sixth": 6, "seventh": 7, "eighth": 8, "ninth": 9, "tenth": 10,
                    "eleventh": 11, "twelfth": 12, "thirteenth": 13, "fourteenth": 14, "fifteenth": 15
                }
                waking_count = mapping.get(word)
            else:
                # Check for "the FIFTH waking of 2026-09-09"
                ordinal_match = re.search(r"the\s+(\w+)\s+waking\s+of", header_text, re.IGNORECASE)
                if ordinal_match:
                    word = ordinal_match.group(1).lower()
                    mapping = {
                        "first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5,
                        "sixth": 6, "seventh": 7, "eighth": 8, "ninth": 9, "tenth": 10
                    }
                    waking_count = mapping.get(word)

        # Extract clean date from header
        clean_date_str = re.sub(r"\s*\([^)]*\)\s*", "", header_text).strip()
        clean_date_str = re.sub(r"^the\s+\w+\s+waking\s+of\s+", "", clean_date_str, flags=re.IGNORECASE).strip()
        
        dt = None
        for fmt in ("%B %d, %Y", "%Y-%m-%d", "%d %B %Y", "%m/%d/%Y"):
            try:
                dt = datetime.strptime(clean_date_str, fmt).date()
                break
            except ValueError:
                continue
                
        if dt:
            wakes.append({
                "date": dt,
                "waking_count": waking_count,
                "header": header
            })
            
    # Normalize waking counts sequentially
    if agent_name == "Stream":
        wakes.sort(key=lambda w: w["date"])
        for idx, w in enumerate(wakes):
            w["waking_count"] = idx + 1
    else:
        wakes.sort(key=lambda w: w["date"])
        known_counts = [w["waking_count"] for w in wakes if w["waking_count"] is not None]
        if len(known_counts) < len(wakes):
            for idx, w in enumerate(wakes):
                if w["waking_count"] is None:
                    w["waking_count"] = idx + 1
                    
    return wakes

def map_subtype_to_reason(subtype: str, is_error: bool) -> str:
    """success->completed, error_max_turns->turn_limit, error_during_execution->execution_error, timeout->timeout, upstream 5xx->provider_api_error, else other"""
    if not is_error:
        return "completed"
    if not subtype:
        return "execution_error"
    s = subtype.lower()
    if "success" in s:
        return "completed"
    if "max_turns" in s or "turn_limit" in s:
        return "turn_limit"
    if "execution" in s or "during_execution" in s:
        return "execution_error"
    if "timeout" in s:
        return "timeout"
    if "5xx" in s or "provider" in s or "upstream" in s:
        return "provider_api_error"
    return "execution_error"

def build_telemetry_rows() -> list[dict]:
    rows = []
    
    agent_wakes = {}
    for agent, cfg in AGENTS_CONFIG.items():
        agent_wakes[agent] = parse_notes_waking_counts(agent, cfg["notes"])
        
    for agent, cfg in AGENTS_CONFIG.items():
        d = cfg["logs"]
        if not d.exists():
            continue
        try:
            entries = sorted(d.iterdir())
        except OSError:
            continue
            
        agent_logs = []
        for f in entries:
            m = TS_RE.match(f.name)
            if not m:
                continue
            ts_str = m.group(1)
            ts_dt = datetime.strptime(ts_str, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
            agent_logs.append((ts_dt, f))
            
        agent_logs.sort(key=lambda x: x[0])
        wakes = agent_wakes[agent]
        
        for ts_dt, f in agent_logs:
            try:
                env = json.loads(f.read_text())
            except Exception:
                continue
                
            if not isinstance(env, dict) or env.get("type") != "result":
                continue
                
            is_error = bool(env.get("is_error"))
            subtype = env.get("subtype") or ""
            
            log_date = ts_dt.date()
            matching_wakes = [w for w in wakes if w["date"] == log_date]
            
            waking_count = None
            if len(matching_wakes) == 1:
                waking_count = matching_wakes[0]["waking_count"]
            elif len(matching_wakes) > 1:
                logs_on_day = [l for l, _ in agent_logs if l.date() == log_date]
                try:
                    log_idx = logs_on_day.index(ts_dt)
                    if log_idx < len(matching_wakes):
                        waking_count = matching_wakes[log_idx]["waking_count"]
                    else:
                        waking_count = matching_wakes[-1]["waking_count"]
                except ValueError:
                    waking_count = matching_wakes[-1]["waking_count"]
            else:
                if wakes:
                    closest_wake = min(wakes, key=lambda w: abs((w["date"] - log_date).days))
                    waking_count = closest_wake["waking_count"]
                else:
                    waking_count = 1
                    
            u = env.get("usage") or {}
            
            row = {
                "schema": "fleet-telemetry/v1",
                "agent": agent.lower(),
                "host": "tidal",
                "ts": ts_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "waking_count": waking_count or 1,
                "model": cfg["model"],
                "model_family": cfg["family"],
                "cost_usd": None,
                "cost_estimated": False,
                "input_tokens": u.get("input_tokens"),
                "output_tokens": u.get("output_tokens"),
                "cache_read_tokens": None,
                "cache_creation_tokens": None,
                "duration_ms": env.get("duration_ms") or 0,
                "duration_api_ms": env.get("duration_api_ms"),
                "turns": env.get("num_turns") or 1,
                "is_error": is_error,
                "terminal_reason": map_subtype_to_reason(subtype, is_error)
            }
            rows.append(row)
            
    return rows

def save_telemetry_file(rows: list[dict]) -> None:
    rows.sort(key=lambda r: r["ts"])
    
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=90)
    
    filtered_rows = []
    for r in rows:
        try:
            r_ts = datetime.strptime(r["ts"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        except Exception:
            continue
        if r_ts >= cutoff:
            filtered_rows.append(r)
            
    rolling_rows = filtered_rows[-1000:]
    
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    temp_file = TELEMETRY_FILE.with_name(TELEMETRY_FILE.name + ".tmp")
    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            for r in rolling_rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        temp_file.replace(TELEMETRY_FILE)
        print(f"Successfully wrote {len(rolling_rows)} telemetry rows to {TELEMETRY_FILE}")
    except Exception as e:
        print(f"Error writing telemetry file: {e}")
        if temp_file.exists():
            temp_file.unlink()

def main():
    print("=== BUILDING FLEET TELEMETRY ===")
    rows = build_telemetry_rows()
    save_telemetry_file(rows)

if __name__ == "__main__":
    main()
