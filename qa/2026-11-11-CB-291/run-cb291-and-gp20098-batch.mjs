// qa/2026-11-11-CB-291/run-cb291-and-gp20098-batch.mjs
// Runs inside ONE exclusive game-test slot (`--jobs 1`, one browser instance at a time):
//   1) GP-20098 exact R2 3P 4-light retrace + 5-step corridor cutaway stills (review/GP-20098/)
//   2) CB-291 3P marine body-table 4-light × 3-camera GPU look (review/CB-291/ag/)
//   3) AG-302 neighbor regression check (tools/tests/run-all.mjs tag296)

import { execFileSync } from 'node:child_process';

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';

function run(label, args) {
  console.log(`\n=== [SLOT BATCH] ${label} ===`);
  execFileSync(process.execPath, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env
  });
}

run('1/3 GP-20098 R2 3P 4-light retrace + cutaway stills', ['qa/2026-11-11-AG-302/gp20098-r2-retrace-and-stills.mjs']);
run('2/3 CB-291 3P marine 4-light GPU captures (bright + converged gameplay cam)', ['qa/2026-11-11-CB-291/cb291-marine-gpu.mjs']);
run('3/3 AG-302 neighbor regression check (tag296)', ['tools/tests/run-all.mjs', 'tag296', '--jobs', '1', '--agent', 'antigravity', '--task', 'AG-302']);
