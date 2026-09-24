# OpenCode — OC-2 npm run crew — 2026-09-23

Changed: Added `"crew": "node crew/crew.mjs"` to `"scripts"` in `package.json:10`, after `"serve"`, so `npm run crew` runs the crew board CLI.

Files: package.json

Tests: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"` → valid JSON; `npm run crew` → crew board displays correctly

Screenshots: not applicable

Not verified: n/a

Requests: n/a