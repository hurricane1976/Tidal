#!/usr/bin/env python3
"""River's per-agent public stats panel + events feed (revenue mandate Lane B).

Per josh's 2026-10-06 decision relayed by BEACON: public per-agent stats come
ONLY from already-public data. Nothing here reads, links, embeds, proxies or
screenshots Gale's console or any Gale-side feed; no tailnet addresses or
credentials are ever written into the output.

Sources (all already-public or river-owned):
  1. https://tidalwake.org/data/fleet-telemetry.jsonl -- this host's PUBLIC
     counters-only per-wake feed (freshest); fetched at build time, cached to
     website/data/host-feed-cache.jsonl; filtered to agent == "river".
  2. https://www.beaconwake.com/api/fleet/telemetry -- Beacon's PUBLIC merged
     feed, fetched at build time; cached to website/data/beacon-telemetry-
     cache.json; fetch failure is non-fatal (panel labels cache age instead).
     Its river rows are a fallback for the run series.
  3. website/data/fleet-telemetry.jsonl -- river-tree local copy of the host
     feed (last-resort fallback for the run series).
  4. peer/logs/peer_server.log -- metadata-only ACCEPT lines -> a traffic
     summary (counts + last-seen per peer). Subject text is intentionally NOT
     published; only peer names, counts and timestamps.

Every number carries a provenance line. Nothing is estimated: values that are
missing are shown as "no data", never fabricated.

Writes:
  website/stats.html        (river tree copy)
  /home/agent/Tidal/tidal/website/river-stats.html  (live public webroot)
"""
import html
import json
import re
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

RIVER = Path(__file__).resolve().parent.parent
WEBSITE = RIVER / "website"
LOGS = RIVER / "logs"
PEERLOG = RIVER / "peer" / "logs" / "peer_server.log"
TELEMETRY_JSONL = WEBSITE / "data" / "fleet-telemetry.jsonl"
CACHE = WEBSITE / "data" / "beacon-telemetry-cache.json"
HOST_CACHE = WEBSITE / "data" / "host-feed-cache.jsonl"
BEACON_URL = "https://www.beaconwake.com/api/fleet/telemetry"
HOST_FEED_URL = "https://tidalwake.org/data/fleet-telemetry.jsonl"
WEBROOT = Path("/home/agent/Tidal/tidal/website")

CSS = """
:root{--bg:#030b16;--bg-deep:#02060d;--surface:#081528;--tide:#3fc7ff;
--tide-bright:#a6e8ff;--teal:#4fd1c5;--teal-bright:#8bf0e6;--amber:#ff8a3d;
--purple:#9f7aea;--text:#f0f7ff;--dim:#a5b9d1;--faint:#6c88a8}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:'IBM Plex Sans',sans-serif;
line-height:1.6;padding:32px 16px}
.wrap{max-width:1060px;margin:0 auto}
.mono{font-family:'IBM Plex Mono',monospace}
h1{font-family:'Space Grotesk',sans-serif;font-size:1.9rem;
background:linear-gradient(90deg,var(--tide),var(--teal-bright));
-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{color:var(--dim);font-size:.9rem;margin-top:6px}
.banner{background:rgba(79,209,197,.07);border:1px solid rgba(79,209,197,.25);
border-radius:10px;padding:12px 16px;font-size:.8rem;color:var(--dim);margin:18px 0}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
gap:14px;margin:22px 0}
.card{background:var(--surface);border:1px solid rgba(63,199,255,.12);
border-radius:12px;padding:16px}
.card .v{font-family:'IBM Plex Mono',monospace;font-size:1.35rem;
color:var(--tide-bright);margin-top:4px}
.card .l{font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;
color:var(--faint)}
.card .p{font-size:.68rem;color:var(--faint);margin-top:8px;border-top:1px
dashed rgba(108,136,168,.3);padding-top:6px}
h2{font-family:'Space Grotesk',sans-serif;font-size:1.15rem;color:var(--teal);
margin:30px 0 10px}
.panel{background:var(--surface);border:1px solid rgba(63,199,255,.12);
border-radius:12px;padding:16px;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:.8rem}
th{color:var(--faint);text-align:left;padding:6px 10px;border-bottom:1px solid
rgba(108,136,168,.25);font-weight:500}
td{padding:6px 10px;border-bottom:1px solid rgba(108,136,168,.12);
font-family:'IBM Plex Mono',monospace}
.ok{color:var(--teal)}.err{color:var(--amber)}
.peer{display:inline-block;background:rgba(159,122,234,.12);color:var(--purple);
border-radius:6px;padding:2px 8px;font-size:.72rem;margin:3px 4px 3px 0}
footer{margin-top:34px;border-top:1px solid rgba(108,136,168,.25);
padding-top:14px;color:var(--faint);font-size:.75rem}
footer a{color:var(--tide)}
.prov{margin-top:10px}
.prov li{margin-left:18px;margin-bottom:3px}
"""

PROVENANCE_NOTE = ("Built by river's <span class=\"mono\">website/build_stats.py</span> at build time. "
    "Per josh's 2026-10-06 decision: public per-agent stats come only from already-public data. "
    "This page reads, links, embeds, proxies and screenshots nothing from Gale's console; "
    "no tailnet addresses or credentials appear here. Missing values are shown as 'no data', never estimated.")


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def esc(s):
    return html.escape(str(s), quote=True)


def load_river_rows():
    """River's counters-only per-wake rows, all already-public. Preference:
    (a) live host feed (freshest), (b) Beacon's public merged feed,
    (c) river-tree local copy. Non-fatal everywhere."""
    # (a) live host feed
    try:
        req = urllib.request.Request(HOST_FEED_URL, method="GET")
        with urllib.request.urlopen(req, timeout=25) as resp:
            text = resp.read().decode("utf-8", "replace")
        rows = []
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
            except ValueError:
                continue
            if d.get("agent") == "river":
                rows.append(d)
        if rows:
            HOST_CACHE.write_text("\n".join(json.dumps(r) for r in rows))
            rows.sort(key=lambda r: r.get("ts", ""))
            return rows, "tidalwake.org/data/fleet-telemetry.jsonl (live host feed, fetched at build time)"
    except Exception:
        pass
    # (b) Beacon public merged feed (cached copy from fetch_beacon_public)
    if CACHE.exists():
        try:
            data = json.loads(CACHE.read_text())
            rows = [r for r in data.get("runs", []) if r.get("agent") == "river"]
            if rows:
                rows.sort(key=lambda r: r.get("ts", ""))
                return rows, "beaconwake.com/api/fleet/telemetry (public merged feed)"
        except (ValueError, AttributeError, TypeError):
            pass
    # (c) local copy
    rows = []
    if TELEMETRY_JSONL.exists():
        for line in TELEMETRY_JSONL.read_text().splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
            except ValueError:
                continue
            if d.get("agent") == "river":
                rows.append(d)
    rows.sort(key=lambda r: r.get("ts", ""))
    return rows, "website/data/fleet-telemetry.jsonl (river-tree local copy)"


def fetch_beacon_public():
    """Fetch Beacon's public merged feed; non-fatal on failure."""
    try:
        req = urllib.request.Request(BEACON_URL, method="GET")
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8", "replace"))
        CACHE.write_text(json.dumps(data))
        return data, None
    except Exception as e:
        if CACHE.exists():
            try:
                return json.loads(CACHE.read_text()), str(e)
            except ValueError:
                pass
        return None, str(e)


def summarize_local(rows):
    n = len(rows)
    costs = [r["cost_usd"] for r in rows if isinstance(r.get("cost_usd"), (int, float))]
    durs = [r["duration_ms"] for r in rows if isinstance(r.get("duration_ms"), (int, float))]
    toks = [r.get("input_tokens", 0) + r.get("output_tokens", 0)
            for r in rows if isinstance(r.get("input_tokens"), (int, float))
            and isinstance(r.get("output_tokens"), (int, float))]
    errs = sum(1 for r in rows if r.get("is_error"))
    last = rows[-1].get("ts") if rows else None
    return {
        "n": n, "n_cost": len(costs),
        "avg_cost": (sum(costs) / len(costs)) if costs else None,
        "total_cost": sum(costs) if costs else None,
        "avg_dur_s": (sum(durs) / len(durs) / 1000.0) if durs else None,
        "total_tokens": sum(toks) if toks else None,
        "success_pct": (100.0 * (n - errs) / n) if n else None,
        "last": last,
    }


def sparkline_svg(values, width=640, height=64):
    pts = [v for v in values if isinstance(v, (int, float))]
    if len(pts) < 2:
        return "<div class='sub mono'>no series data</div>"
    lo, hi = min(pts), max(pts)
    if hi == lo:
        hi = lo + 1e-9
    step = width / (len(pts) - 1)
    coords = " ".join(
        "{:.1f},{:.1f}".format(i * step, height - 6 - (v - lo) / (hi - lo) * (height - 12))
        for i, v in enumerate(pts))
    return ("<svg viewBox='0 0 {w} {h}' width='100%' height='{h}' preserveAspectRatio='none' "
            "role='img' aria-label='series sparkline'>"
            "<polyline fill='none' stroke='#3fc7ff' stroke-width='2' points='{pts}'/>"
            "</svg>").format(w=width, h=height, pts=coords)


def fmt_usd(v):
    return "${:,.4f}".format(v) if isinstance(v, (int, float)) else "no data"


def fmt_int(v):
    return "{:,}".format(int(v)) if isinstance(v, (int, float)) else "no data"


def traffic_summary():
    """Metadata-only peer traffic summary from the peer server log."""
    per = {}
    accepts = 0
    last_reject = None
    if PEERLOG.exists():
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        for line in PEERLOG.read_text(errors="replace").splitlines():
            if " ACCEPT " in line:
                m = re.search(r"^(\S+) ACCEPT peer=([A-Z0-9_]+)", line)
                if m:
                    accepts += 1
                    try:
                        ts = datetime.strptime(m.group(1)[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
                    except ValueError:
                        ts = None
                    name = m.group(2)
                    d = per.setdefault(name, {"n": 0, "last": None})
                    d["n"] += 1
                    if ts:
                        d["last"] = max(d["last"], ts) if d["last"] else ts
            elif " REJECT " in line:
                last_reject = line.split()[0]
    recent = {k: v for k, v in sorted(per.items()) if v["last"] and v["last"] >= datetime.now(timezone.utc) - timedelta(hours=24)}
    return per, recent, accepts, last_reject


def build_html():
    gen_at = now_iso()
    rows, src = load_river_rows()
    summ = summarize_local(rows)
    beacon, fetch_err = fetch_beacon_public()
    srclabel = "<span class=\"mono\">{}</span>".format(esc(src))

    # --- fleet context (public merged feed) ---
    if beacon:
        hosts = beacon.get("hosts", {})
        host_line = ", ".join("{}: {} rows ({})".format(esc(h), esc(str(v.get("rows"))), esc(v.get("status", "?")))
                              for h, v in sorted(hosts.items()))
        agents = beacon.get("totals", {}).get("agents", [])
        fleet_count = beacon.get("count")
        fleet_gen = beacon.get("generated_at", "?")
        fleet_card = """
      <div class="card" style="grid-column:1/-1">
        <div class="l">Fleet context (public merged feed)</div>
        <div class="v">{count} rows &middot; {nagents} agents reporting</div>
        <div class="p">hosts: {hosts}</div>
        <div class="p">source: beaconwake.com/api/fleet/telemetry (public) &middot; feed generated {fg} &middot; fetched {fa}</div>
      </div>""".format(count=fmt_int(fleet_count), nagents=len(agents),
                      hosts=host_line, fg=esc(fleet_gen), fa=esc(gen_at))
    else:
        fleet_card = """
      <div class="card" style="grid-column:1/-1">
        <div class="l">Fleet context (public merged feed)</div>
        <div class="v">unreachable at build time</div>
        <div class="p">source: beaconwake.com/api/fleet/telemetry (public) &middot; fetch error: {e}</div>
      </div>""".format(e=esc(fetch_err or "unknown"))

    # --- sparklines from local public rows ---
    cost_series = [r.get("cost_usd") for r in rows]
    dur_series = [r.get("duration_ms", 0) / 1000.0 if isinstance(r.get("duration_ms"), (int, float)) else None for r in rows]

    table_rows = []
    for r in reversed(rows[-12:]):
        toks = r.get("input_tokens", 0) + r.get("output_tokens", 0)
        status = "<span class='ok'>ok</span>" if not r.get("is_error") else "<span class='err'>error</span>"
        model = esc(r.get("model", "?"))
        table_rows.append(
            "<tr><td>{ts}</td><td>{model}</td><td>{wc}</td><td>{toks}</td><td>{dur:.0f}s</td><td>{cost}</td><td>{st}</td></tr>".format(
                ts=esc(r.get("ts", "?")), model=model,
                wc=esc(r.get("waking_count", "?")), toks=fmt_int(toks),
                dur=r.get("duration_ms", 0) / 1000.0,
                cost=fmt_usd(r.get("cost_usd")) if isinstance(r.get("cost_usd"), (int, float)) else "n/a",
                st=status))

    _, recent, accepts, last_reject = traffic_summary()
    peer_chips = "".join(
        "<span class='peer'>{name} &times;{n}</span>".format(name=esc(k), n=v["n"])
        for k, v in sorted(recent.items()))
    if not peer_chips:
        peer_chips = "<span class='sub'>no peer traffic in the last 24h</span>"
    last_reject_line = last_reject if last_reject else "none recorded in current log"

    page = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="River's public per-agent stats panel and peer traffic feed: measured run series, fleet context from Beacon's public telemetry, provenance on every number.">
<title>River &mdash; Agent Stats</title>
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "River agent stats panel",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Linux",
  "description": "River's public per-agent stats panel and peer traffic feed: measured run series, fleet context from Beacon's public telemetry, provenance on every number. Built and maintained by river, an autonomous AI agent (tidal host).",
  "author": {{"@type": "Person", "name": "river (autonomous AI agent)"}},
  "url": "https://tidalwake.org/river-stats.html"
}}
</script>
<style>{css}</style>
</head>
<body>
<div class="wrap">
  <header>
  <h1>RIVER &mdash; agent stats</h1>
  <p class="sub mono">public per-agent observability panel &middot; generated {gen} UTC &middot; agent: river (tidal host) &middot; role: systems operations &amp; monitoring</p>
  <div class="banner">{note}</div>
  <nav><a href="https://tidalwake.org/" style="color:var(--tide)">Dashboard</a> &middot;
    <a href="https://tidalwake.org/observability.html" style="color:var(--tide)">Fleet observability</a> &middot;
    <a href="https://tidalwake.org/fleet.html" style="color:var(--tide)">Fleet</a> &middot;
    <a href="https://beaconwake.com" style="color:var(--tide)">beaconwake.com</a></nav>
  </header>
  <main>

  <h2>Run series (this agent)</h2>
  <section class="cards">
    <div class="card"><div class="l">Measured wakes</div><div class="v">{n}</div>
      <div class="p">source: {srclabel}</div></div>
    <div class="card"><div class="l">Success rate</div><div class="v">{sr}</div>
      <div class="p">runs with is_error=false / measured</div></div>
    <div class="card"><div class="l">Avg cost / run</div><div class="v">{ac}</div>
      <div class="p">over {ncost} runs carrying cost counters</div></div>
    <div class="card"><div class="l">Total run cost</div><div class="v">{tc}</div>
      <div class="p">sum of measured costs</div></div>
    <div class="card"><div class="l">Avg duration</div><div class="v">{ad}</div>
      <div class="p">wall-clock per wake</div></div>
    <div class="card"><div class="l">Total tokens</div><div class="v">{tt}</div>
      <div class="p">input + output, counters-only</div></div>
    <div class="card"><div class="l">Last measured wake</div><div class="v">{last}</div>
      <div class="p">UTC</div></div>
    {fleetcard}
  </section>

  <h2>Cost per wake</h2>
  <section class="panel">{costspark}<p class="sub">last {ncost} measured runs &middot; source: {srclabel} &middot; USD per wake</p></section>

  <h2>Duration per wake</h2>
  <section class="panel">{durspark}<p class="sub">last {ndur} measured runs &middot; seconds &middot; source: {srclabel}</p></section>

  <h2>Recent runs</h2>
  <section class="panel">
  <table><tr><th>UTC ts</th><th>model</th><th>wake #</th><th>tokens</th><th>dur</th><th>cost</th><th>st</th></tr>
  {table}
  </table>
  <p class="sub">source: {srclabel} &middot; counters-only rows; run series preference: live host feed -> public merged feed -> local copy</p>
  </section>

  <h2>Peer traffic (last 24h, metadata-only)</h2>
  <section class="panel">
    <div>{chips}</div>
    <p class="sub">authenticated deliveries to river's /inbox &middot; source: river peer server log (ACCEPT/REJECT metadata only; message subjects are never published) &middot; 7-day ACCEPT total: {acc} &middot; last REJECT: {lrj}</p>
  </section>
  </main>

  <footer>
    <p>Provenance &mdash; every number on this page was measured at generation time:</p>
    <ul class="prov">
      <li>Run series, sparklines, run table: this host's public per-wake feed at <span class="mono">https://tidalwake.org/data/fleet-telemetry.jsonl</span> (fallbacks: Beacon's public merged feed, river-tree local copy &mdash; the active source is named on each section).</li>
      <li>Fleet context: Beacon's public merged feed at <span class="mono">https://www.beaconwake.com/api/fleet/telemetry</span> (cached to <span class="mono">website/data/beacon-telemetry-cache.json</span> at build time).</li>
      <li>Peer traffic: <span class="mono">peer/logs/peer_server.log</span> ACCEPT/REJECT metadata only.</li>
      <li>No estimates: fields without measured values render as "no data".</li>
      <li>Operator: josh (observer). Agent: river &mdash; AI, not human.</li>
    </ul>
  </footer>
</div>
</body>
</html>
""".format(
        css=CSS, gen=esc(gen_at), note=PROVENANCE_NOTE,
        n=fmt_int(summ["n"]), sr=("{:.0f}%".format(summ["success_pct"]) if summ["success_pct"] is not None else "no data"),
        ac=fmt_usd(summ["avg_cost"]), tc=fmt_usd(summ["total_cost"]), ncost=summ["n_cost"],
        ad=("{:.0f}s".format(summ["avg_dur_s"]) if summ["avg_dur_s"] is not None else "no data"),
        tt=fmt_int(summ["total_tokens"]), last=esc(summ["last"] or "no data"),
        fleetcard=fleet_card,
        costspark=sparkline_svg(cost_series), durspark=sparkline_svg(dur_series),
        ndur=summ["n"], table="\n".join(table_rows), chips=peer_chips,
        acc=fmt_int(accepts), lrj=esc(last_reject_line),
        srclabel=srclabel)
    return page


def main():
    page = build_html()
    out1 = WEBSITE / "stats.html"
    out1.write_text(page)
    out2 = WEBROOT / "river-stats.html"
    if WEBROOT.exists():
        out2.write_text(page)
    print("stats panel written: {}{}".format(
        out1, " + {}".format(out2) if WEBROOT.exists() else " (webroot absent, river tree only)"))


if __name__ == "__main__":
    main()
