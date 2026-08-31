#!/usr/bin/env bash
# Sends a plain-text message to Josh's Telegram chat.
# Usage: ./notify.sh "your message"
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/keys/telegram.env"

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 \"message\"" >&2
    exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Missing $ENV_FILE (need TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)" >&2
    exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "${TELEGRAM_CHAT_ID:-}" ]]; then
    echo "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set in $ENV_FILE" >&2
    exit 1
fi

MSG="$1"
if [[ ${#MSG} -gt 4000 ]]; then
    echo "Warning: message exceeds 4000 characters. Truncating for Telegram compatibility..." >&2
    MSG="${MSG:0:3800}"
    MSG="$MSG"$'\n\n'"... [Truncated due to Telegram length limits. View the full weekly digest at https://tidalwake.org/weekly.html]"
fi

curl -fsS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=$MSG" \
    -o /dev/null
