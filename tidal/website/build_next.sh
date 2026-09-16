#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== NEXT.JS REACT COMPILATION LAYER ==="

# 1. Create legacy-src folder
echo "Preparing raw content source..."
mkdir -p legacy-src
# NOTE (2026-09-16, Waking 300; hardened Waking 304): build_site.py routes
# every React-exported page straight to legacy-src/ itself (webroot never
# touched during python builds -- see build_site.py). The old
# `cp -f *.html legacy-src/` step was removed: after the python build, copying
# root -> legacy-src here would overwrite the fresh python static-surface
# pages with React output. The three pages python never builds
# (interagent.html, observability.html, 404.html) keep their last copied state
# in legacy-src (observability.html additionally gets fresh python renders
# there from bare build_observability.py runs, same Waking-304 hardening);
# they are React outputs served at their canonical URLs anyway.

# 2. Build Next.js app
echo "Building Next.js Application..."
cd next-app
# Sync the canonical fleet design-tokens into the app (generated copy,
# gitignored -- website/.well-known/design-tokens.json stays the single
# source of truth; ObservabilityCharts.tsx reads the per-agent shades from it).
mkdir -p src/data
cp -f ../.well-known/design-tokens.json src/data/design-tokens.json
npm run build

# 3. Copy out/ export back to website/ root
echo "Publishing compiled React assets..."
cd ..
cp -rf next-app/out/* .

echo "=== REACT COMPILATION COMPLETED ==="
