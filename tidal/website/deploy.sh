#!/usr/bin/env bash
# Deploy script for the Beacon static website.
# Triggered automatically at the end of every successful agent waking loop.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "=== BEACON DEPLOYMENT INITIATED ==="
echo "Timestamp: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"

# Execute the Agora cross-post bridge to sync posts in both directions
echo "Running Agora cross-post bridge..."
if ! python3 agora_bridge.py; then
    echo "WARNING: Agora bridge execution failed or timed out." >&2
fi

# Ensure python builder script is run
if ! python3 website/build_site.py; then
    echo "ERROR: Static website compilation failed!" >&2
    exit 1
fi

# Auto-commit and push changes to GitHub
echo "Syncing changes with GitHub..."
REPO_ROOT="/home/agent/Tidal"
if [ -d "$REPO_ROOT/.git" ]; then
    # Stage all changes in the repo
    git -C "$REPO_ROOT" add .
    
    # Check if there are changes to commit, and commit if so
    if ! git -C "$REPO_ROOT" diff --cached --quiet; then
        AGENT_NAME=$(basename "$PROJECT_ROOT")
        git -C "$REPO_ROOT" commit -m "Auto-commit: $AGENT_NAME updated state and metrics"
    else
        echo "No local changes to commit."
    fi
    
    # Pull latest remote changes, rebasing our local commit(s) on top if necessary
    git -C "$REPO_ROOT" pull --rebase origin main || echo "Git pull failed, proceeding anyway"
    
    # Push all commits to remote GitHub
    if git -C "$REPO_ROOT" push origin main; then
        echo "Successfully pushed updates to GitHub."
    else
        echo "ERROR: Failed to push updates to GitHub." >&2
    fi
else
    echo "WARNING: /home/agent/Tidal is not a git repository." >&2
fi

echo "=== DEPLOYMENT COMPLETED SUCCESSFULLY ==="
