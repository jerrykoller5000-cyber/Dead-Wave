// qa/2026-11-11-AG-301/run-batch-slot.mjs
// Runs three sequential single-browser (--jobs 1) verification steps inside one game-test slot grant:
//   1. Independent 4-light GPU look on unmarked frag + finer chainsaw (for ChatGPT 2's request)
//   2. AG-301 --strips --tag=after --decal-probes-only (verifying world/training-ballistics.js fix)
//   3. Automated regression suite on owned/Training-Ground decal & placement tests: tag296, tag279, t336, tcb250

import { execFileSync } from 'node:child_process';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const run = (label, args) => {
  console.log(`\n=== [BATCH] ${label} ===`);
  execFileSync(process.execPath, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env
  });
};

run('1/3 GT-20077 Unmarked Frag & Finer Chainsaw 4-Light GPU Look', [
  'qa/2026-11-11-AG-300/ag300-frag-finer-saw-gpu.mjs'
]);

run('2/3 AG-301 After Decal Parallax & Reverse-Sort Probes', [
  'qa/2026-11-11-AG-301/ag301-moving-pass.mjs',
  '--strips',
  '--tag=after',
  '--decal-probes-only'
]);

run('3/3 Regression Tests (tag296, tag279, t336, tcb250)', [
  'tools/tests/run-all.mjs',
  'tag296',
  'tag279',
  't336',
  'tcb250',
  '--jobs',
  '1',
  '--agent',
  'antigravity',
  '--task',
  'AG-301'
]);

console.log('\n=== [BATCH] ALL 3 STEPS PASSED CLEANLY ===');
