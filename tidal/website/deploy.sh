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

echo "=== DEPLOYMENT COMPLETED SUCCESSFULLY ==="
