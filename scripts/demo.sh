#!/usr/bin/env bash
# scripts/demo.sh — canonical entry for `npm run demo`.
#
# Modes:
#   1. npm run demo        (this script)
#   2. npx tsx src/index.ts --demo
#
# If you don't have node_modules yet, prefer mode 2.
#
# Project: Chasseur Onirique — (c) 2026 El-hadj Ousmane.

set -euo pipefail

if [ -f "./node_modules/.bin/tsx" ]; then
  echo "[demo] running with local tsx"
  exec ./node_modules/.bin/tsx src/index.ts --demo
fi

if command -v npx >/dev/null 2>&1; then
  echo "[demo] running via npx tsx src/index.ts --demo"
  exec npx --yes tsx src/index.ts --demo
fi

echo "[demo] neither local tsx nor npx found; falling back to compiled dist/"
if [ -f "./dist/index.js" ]; then
  exec node ./dist/index.js --demo
fi

cat >&2 <<'EOF'
[demo] Could not find a runtime. From the project root, run one of:

    npm install
    npm run demo

…or, with no install:

    npx --yes tsx src/index.ts --demo
EOF
exit 1
