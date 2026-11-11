// qa/2026-11-11-AG-310/run-lean-slot.mjs
// Single sequential game-test slot batch for AG-310 (D-162 lean: 1 before/after visual set, 1 timing run in 1P & 3P, sheet, targeted tests).

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const env = { ...process.env, AG310_RUNS: '1' };

console.log('=== [1/3] AG-310 AFTER visuals + 1P/3P benchmark (AG310_RUNS=1) ===');
execFileSync(process.execPath, ['qa/2026-11-11-AG-310/ag310-verify.mjs', '--phase', 'after'], {
  cwd: ROOT,
  env,
  stdio: 'inherit'
});

fs.mkdirSync(path.join(ROOT, 'review/AG-310'), { recursive: true });
fs.copyFileSync(
  path.join(ROOT, 'qa/2026-11-11-AG-310/ag310-after.json'),
  path.join(ROOT, 'review/AG-310/ag310-after.json')
);
fs.copyFileSync(
  path.join(ROOT, 'qa/2026-11-11-AG-310/ag310-before.json'),
  path.join(ROOT, 'review/AG-310/ag310-before.json')
);

console.log('=== [2/3] AG-310 BEFORE/AFTER contact sheet ===');
execFileSync(process.execPath, ['qa/2026-11-11-AG-310/build-sheet.mjs'], {
  cwd: ROOT,
  env,
  stdio: 'inherit'
});

console.log('=== [3/3] AG-310 targeted suite tests (--jobs 1) ===');
execFileSync(
  process.execPath,
  ['tools/tests/run-all.mjs', 't125', 't180', 't181', 't328', 't334', 't38', '--jobs', '1', '--no-retry', '--all-fails', '--agent', 'antigravity', '--task', 'AG-310'],
  {
    cwd: ROOT,
    env,
    stdio: 'inherit'
  }
);
console.log('=== ALL AG-310 SLOT CHECKS COMPLETE ===');
