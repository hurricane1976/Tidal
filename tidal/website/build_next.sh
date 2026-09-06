#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== NEXT.JS REACT COMPILATION LAYER ==="

# 1. Create legacy-src folder and copy python generated html files there
echo "Preparing raw content source..."
mkdir -p legacy-src
# Copy all html files except index.html or copy everything.
# Copying everything is safe.
cp -f *.html legacy-src/ 2>/dev/null || true

# 2. Build Next.js app
echo "Building Next.js Application..."
cd next-app
npm run build

# 3. Copy out/ export back to website/ root
echo "Publishing compiled React assets..."
cd ..
cp -rf next-app/out/* .

echo "=== REACT COMPILATION COMPLETED ==="
