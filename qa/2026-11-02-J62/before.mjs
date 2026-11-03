// J62 before: swap in the untouched launcher builder, run the probe on the test page, put the new one back.
import { spawnSync } from 'node:child_process'; import fs from 'node:fs';
const f = 'studio/weapon-heavy.js', keep = fs.readFileSync(f); fs.copyFileSync('qa/2026-11-02-J62/weapon-heavy.before.js', f);
try { const r = spawnSync(process.execPath, ['tools/tests/run-all.mjs', 'tj62', '--jobs', '1', '--all-fails'], { stdio: 'inherit' }); console.log('=== exit ' + r.status); }
finally { fs.writeFileSync(f, keep); console.log('restored ' + f); }