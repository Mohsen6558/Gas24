#!/usr/bin/env bash
# Builds apps/landing once and publishes it to src/<province>/ for every province in
# apps/landing/src/provinces.json (served as <province>.gas24.ir and gas24.ir/<province>/),
# then refreshes sitemap.xml / robots.txt and runs the site checks.
# Usage: tools/deploy_landings.sh
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO/apps/landing"
npm ci --no-audit --no-fund
npx tsc --noEmit
npm run build

python3 "$REPO/tools/publish_landings.py"
python3 "$REPO/tools/generate_sitemap.py"
python3 "$REPO/tools/check_site.py"
echo "province landings updated from apps/landing"
