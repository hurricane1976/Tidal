#!/usr/bin/env bash
# Cron entry point. Wakes the agent, hands it AGENT.md, logs the run.
cd /home/agent/River || exit 1

export HOME="${HOME:-/home/agent}"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

mkdir -p logs
find logs -name '*.log' -mtime +30 -delete
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="logs/${TS}.log"

PROMPT="You are waking up on your regular schedule. Read /home/agent/River/AGENT.md \
first -- it has your operating rules; follow them. Check NOTES.md, ASK.md, \
memory/, and peer/inbox/ in this directory (/home/agent/River) for prior \
context. Do \
whatever useful work seems worthwhile within AGENT.md's rules. Append a \
dated entry to NOTES.md summarizing what you did this waking. Before you \
finish, run ./notify.sh with a short summary of this session, per AGENT.md's \
'Keeping me posted' instruction."

# --yolo: auto-approve every tool call for this session (file writes, shell
# commands, etc.) -- this is what makes it run unattended instead of
# stopping to ask. It's also the entire reason AGENT.md matters so much;
# see the setup guide's "Before you start" section.
# --include-directories: lets Gemini see /home/agent (siblings of this
# repo, e.g. keys/ and later shared/) as well as its own working directory.
gemini --yolo \
    --include-directories /home/agent \
    -p "$PROMPT" \
    >>"$LOG_FILE" 2>&1
GEMINI_EXIT=$?

echo "exit code: $GEMINI_EXIT" >>"$LOG_FILE"

# Republish the website's activity log from the fresh NOTES.md entry this
# session just wrote, so the public log page reflects reality without
# depending on the session remembering to redeploy manually.
#
# KIT NOTE: this only runs if you've later added website/deploy.sh (a
# static-site publish script) -- it is NOT included in this starter kit, so
# on a fresh install this step is skipped harmlessly. See the setup guide,
# "Optional: giving Beacon a public website."
if [ "$GEMINI_EXIT" -eq 0 ] && [ -x ./website/deploy.sh ]; then
    ./website/deploy.sh >>"$LOG_FILE" 2>&1 || echo "website deploy failed" >>"$LOG_FILE"
fi

# Send a guaranteed Telegram notification with the latest results from NOTES.md
if [ "$GEMINI_EXIT" -eq 0 ]; then
    LATEST_ENTRY=$(python3 -c "
import os
if os.path.exists('NOTES.md'):
    with open('NOTES.md') as f:
        content = f.read()
    start = content.find('## ')
    if start != -1:
        end = content.find('## ', start + 3)
        print(content[start:end].strip() if end != -1 else content[start:].strip())
    else:
        print('No summary entry found in NOTES.md.')
else:
    print('NOTES.md not found.')
" 2>/dev/null || echo "Could not parse NOTES.md")
    
    AGENT_NAME=$(basename "$(pwd)")
    ./notify.sh "🔔 [$AGENT_NAME] Wake session completed successfully!

$LATEST_ENTRY" >>"$LOG_FILE" 2>&1
fi

# If the session itself crashed/errored, it may never have reached its own
# end-of-session notify.sh call -- that path only fires if the session runs
# to completion. Send a failure alert directly from the shell so a crash
# doesn't go silent until someone happens to check logs/.
if [ "$GEMINI_EXIT" -ne 0 ]; then
    TAIL="$(tail -c 1500 "$LOG_FILE")"
    ./notify.sh "wake.sh: gemini session exited with code $GEMINI_EXIT ($TS). Log tail:
$TAIL" >>"$LOG_FILE" 2>&1
fi
