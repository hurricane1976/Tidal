#!/usr/bin/env bash
# Lightweight between-wakings health watchdog. Runs on a tight cron interval
# (independent of wake.sh's LLM sessions) and messages Josh via Telegram
# ONLY when something is wrong -- or once when a prior problem clears.
#
# Checks: public HTTPS 200s (via --resolve to local nginx), one real
# external probe (true DNS + public routing), TLS days-to-expiry, core
# systemd services, root disk usage, and a stuck reboot-required flag.
#
# State is a single signature line in .watchdog_state: "ok" when healthy,
# otherwise a sorted list of the current anomaly keys. An alert is sent
# only when that signature changes, so a persistent problem pings once,
# not every 20 minutes.
set -euo pipefail

# KIT NOTE: this script assumes you've since stood up a public website for
# your agent (nginx + TLS) and, optionally, a custom API service. Neither
# is part of this starter kit -- see SETUP_GUIDE.md, "Optional: giving
# Beacon a public website." Until you have, don't cron this one: it will
# alert on every run because HOST below won't resolve to your box and the
# "beacon-api" service won't exist. Once you do have a site, change HOST
# and edit the `for svc in ...` line a few sections down to match whatever
# systemd services you actually run.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

STATE_FILE="$SCRIPT_DIR/.watchdog_state"
LOG_FILE="$SCRIPT_DIR/logs/watchdog.log"
mkdir -p "$SCRIPT_DIR/logs"

# Detect host and scheme dynamically from agent.json manifest if possible,
# falling back to defaults if missing or if the manifest is unreadable.
MANIFEST_URL=""
MANIFEST_FILE="website/.well-known/agent.json"
if [[ -f "$MANIFEST_FILE" ]]; then
    MANIFEST_URL="$(python3 -c "import json; print(json.load(open('$MANIFEST_FILE')).get('url', ''))" 2>/dev/null || true)"
fi

HOST="www.yourdomain.example"
SCHEME="https"

if [[ -n "$MANIFEST_URL" ]]; then
    HOST="$(python3 -c "from urllib.parse import urlparse; print(urlparse('$MANIFEST_URL').netloc)" 2>/dev/null || true)"
    SCHEME="$(python3 -c "from urllib.parse import urlparse; print(urlparse('$MANIFEST_URL').scheme)" 2>/dev/null || true)"
fi

HOST="${HOST:-www.yourdomain.example}"
SCHEME="${SCHEME:-https}"

TLS_WARN_DAYS=15      # certbot auto-renews at 30d; under this means renewal is failing
DISK_WARN_PCT=90
UPTIME_STUCK_HOURS=36 # auto-reboot runs daily; reboot-required past this is stuck

anomalies=()   # short keys, used for the change-signature
details=()     # human-readable lines for the alert body

# --- public HTTP/HTTPS reachability ---------------------------------------------
for path in / /status.html /api/; do
    if [[ "$SCHEME" == "https" ]]; then
        code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
            --resolve "${HOST}:443:127.0.0.1" "https://${HOST}${path}" || echo 000)"
    else
        code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
            --resolve "${HOST}:80:127.0.0.1" "http://${HOST}${path}" || echo 000)"
    fi
    if [[ "$code" != "200" ]]; then
        anomalies+=("http:${path}")
        details+=("HTTP ${path} -> ${code} (expected 200)")
    fi
done

# --- external probe: real DNS resolution + public routing ---------------
# The loop above pins the connection to 127.0.0.1, so it confirms nginx is
# serving locally but is blind to a DNS/registrar breakage or a
# public-routing / firewall outage. This one request uses real resolution
# so those failure modes surface. Retry once to ride out a transient blip.
ext_code=000
for _ in 1 2; do
    ext_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 \
        "${SCHEME}://${HOST}/" || echo 000)"
    [[ "$ext_code" == "200" ]] && break
    sleep 5
done
if [[ "$ext_code" != "200" ]]; then
    anomalies+=("http:external")
    details+=("external ${SCHEME^^} ${SCHEME}://${HOST}/ -> ${ext_code} (real DNS+routing; local HTTP checks may still be green)")
fi

# --- TLS certificate expiry ----------------------------------------------
if [[ "$SCHEME" != "https" ]]; then
    # Skip TLS certificate check if scheme is not HTTPS or if we are using a placeholder/IP without TLS setup
    echo "TLS: HTTP mode or placeholder host, skipping certificate expiry checks" >/dev/null
else
    end_date="$(echo | openssl s_client -servername "$HOST" -connect 127.0.0.1:443 2>/dev/null \
        | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || true)"
    if [[ -z "$end_date" ]]; then
        anomalies+=("tls:unreadable")
        details+=("TLS: could not read certificate expiry")
    else
        end_epoch="$(date -d "$end_date" +%s 2>/dev/null || echo 0)"
        now_epoch="$(date +%s)"
        days_left=$(( (end_epoch - now_epoch) / 86400 ))
        if (( end_epoch == 0 )); then
            anomalies+=("tls:parsefail")
            details+=("TLS: could not parse expiry date '$end_date'")
        elif (( days_left < TLS_WARN_DAYS )); then
            anomalies+=("tls:expiring")
            details+=("TLS cert expires in ${days_left}d (${end_date}) -- auto-renew may be broken")
        fi
    fi
fi

# --- core services ------------------------------------------------------
# Add your own service names here (e.g. a custom API you run behind nginx).
for svc in nginx fail2ban cron tidal-agora beacon-peer; do
    if ! systemctl is-active --quiet "$svc"; then
        state="$(systemctl is-active "$svc" 2>/dev/null || true)"
        anomalies+=("svc:${svc}")
        details+=("service ${svc} is ${state:-inactive}")
    fi
done

# --- third-party sibling monitor -----------------------------------------
# Monitors our sibling agent Beacon's public availability
beacon_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
    "https://www.beaconwake.com/" || echo 000)"
if [[ "$beacon_code" != "200" ]]; then
    anomalies+=("thirdparty:beacon")
    details+=("Third-Party Sibling: https://www.beaconwake.com/ -> ${beacon_code} (expected 200)")
fi

# --- root disk usage -----------------------------------------------------
disk_pct="$(df --output=pcent / | tail -1 | tr -dc '0-9')"
if [[ -n "$disk_pct" ]] && (( disk_pct >= DISK_WARN_PCT )); then
    anomalies+=("disk:${disk_pct}")
    details+=("root disk ${disk_pct}% full (warn at ${DISK_WARN_PCT}%)")
fi

# --- stuck reboot-required --------------------------------------------
if [[ -f /var/run/reboot-required ]]; then
    up_hours=$(( $(cut -d. -f1 /proc/uptime) / 3600 ))
    if (( up_hours > UPTIME_STUCK_HOURS )); then
        anomalies+=("reboot:stuck")
        details+=("reboot-required set and uptime is ${up_hours}h -- daily auto-reboot did not fire")
    fi
fi

# --- decide whether to alert ------------------------------------------
ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
prev="$(cat "$STATE_FILE" 2>/dev/null || echo ok)"

if (( ${#anomalies[@]} > 0 )); then
    sig="$(printf '%s\n' "${anomalies[@]}" | sort | tr '\n' ',' )"
    if [[ "$sig" != "$prev" ]]; then
        body="$(printf '%s\n' "${details[@]}")"
        ./notify.sh "beacon watchdog: ${#anomalies[@]} issue(s) at ${ts}
${body}"
        echo "$ts ALERT sent: $sig" >> "$LOG_FILE"
    else
        echo "$ts still-bad (quiet): $sig" >> "$LOG_FILE"
    fi
    echo "$sig" > "$STATE_FILE"
else
    if [[ "$prev" != "ok" ]]; then
        ./notify.sh "beacon watchdog: all clear at ${ts} -- prior issue resolved (${prev})"
        echo "$ts RECOVERED (was: $prev)" >> "$LOG_FILE"
    else
        echo "$ts ok" >> "$LOG_FILE"
    fi
    echo "ok" > "$STATE_FILE"
fi
