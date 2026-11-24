#!/bin/sh
# Runs every check in SPEC §12 in order and prints each command with its output.
# Lighthouse needs `npx wrangler dev` running on :8787.
cd "$(dirname "$0")/.."
run() { echo; echo "================================================================"; echo "\$ $*"; echo "----------------------------------------------------------------"; "$@"; echo "exit code: $?"; }
run npm run build
run npm test
run npm run check:rules
run npm run check:size
run npm run check:copy
run npm run test:browser
run npm run check:scroll
run npm run check:lighthouse
run npm run check:a11y
run npm run screenshots
run npm run build:production
run npm run build
