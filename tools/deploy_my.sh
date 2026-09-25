#!/usr/bin/env bash
# Builds apps/gazyom and publishes the output to src/my (served as my.gas24.ir).
# Usage: tools/deploy_my.sh [--prune]
#   --prune  also delete files in src/my/assets that the new build no longer uses
#            (by default old hashed files are kept so already-open tabs keep working)
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
APP="$REPO/apps/gazyom"
OUT="$REPO/src/my"

cd "$APP"
npm ci --no-audit --no-fund
npx tsc --noEmit
# The bundle is public: never let a real key from .env.local end up in it.
GEMINI_API_KEY=PLACEHOLDER_API_KEY npm run build

if [[ "${1:-}" == "--prune" ]]; then
  for f in "$OUT"/assets/*; do
    name="$(basename "$f")"
    [[ -e "dist/assets/$name" || "$name" == "state.json" ]] || rm -v "$f"
  done
fi

# src/my keeps its own state.json, app/state.json and .well-known/ (not part of the build).
mkdir -p "$OUT/assets" "$OUT/app" "$OUT/icons"
cp -r dist/assets/. "$OUT/assets/"
cp -r dist/icons/. "$OUT/icons/"
cp dist/sw.js dist/workbox-*.js dist/manifest.webmanifest dist/pwa-icon.svg "$OUT/"
cp dist/app/index.html "$OUT/app/index.html"
cp dist/app/index.html "$OUT/index.html" # my.gas24.ir/ opens the app directly

python3 "$REPO/tools/update_sw_revisions.py"
python3 "$REPO/tools/check_site.py"
echo "src/my updated from apps/gazyom"
