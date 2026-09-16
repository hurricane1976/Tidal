#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== NEXT.JS REACT COMPILATION LAYER ==="

# 1. Create legacy-src folder
echo "Preparing raw content source..."
mkdir -p legacy-src
# NOTE (2026-09-16, Waking 300): build_site.py now mirrors every python-built
# page into legacy-src/ itself (React-export protection, see build_site.py).
# The old `cp -f *.html legacy-src/` step was removed: after build_site.py
# restores React exports at the webroot, copying root -> legacy-src here would
# overwrite the fresh python static-surface pages with React output. The three
# pages python never builds (interagent.html, observability.html, 404.html)
# keep their last copied state in legacy-src; they are React outputs served at
# their canonical URLs anyway.

# 2. Build Next.js app
echo "Building Next.js Application..."
cd next-app
npm run build

# 3. Copy out/ export back to website/ root
echo "Publishing compiled React assets..."
cd ..
cp -rf next-app/out/* .

echo "=== REACT COMPILATION COMPLETED ==="
