// tools/ag290-slot-batch.mjs
// Master slot execution batch for AG-290 (Jerry, 10 Nov; J131, J132: barrel heat, smoke wisp, suppressor/barrel glow):
// Runs inside ONE --exclusive game-test slot (--jobs 1, strictly sequential):
// 1) Step 1: Run tools/realtest.mjs tag290 (all unit, contract, and live WebGPU checks)
// 2) Step 2: Run tools/ag290-capture.mjs (15 matched WebGPU renders in 4 lights)
// 3) Step 3: Build master comparison sheets via tools/build-ag290-sheets.py
// 4) Step 4: Run --exclusive 48-zombie Night 20 benchmark (tools/bench.mjs --night 20 --gfx high --seconds 20 --prof)

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_REV = path.join(ROOT, 'review/AG-290');
const OUT_QA = path.join(ROOT, 'qa/2026-11-10-AG-290');
fs.mkdirSync(OUT_REV, { recursive: true });
fs.mkdirSync(OUT_QA, { recursive: true });

console.log('========================================================================');
console.log('[AG-290 Batch] Step 1/4: Running tools/realtest.mjs tag290...');
console.log('========================================================================');
const testOut = execFileSync(
  process.execPath,
  [path.join(ROOT, 'tools/realtest.mjs'), 'tag290'],
  { cwd: ROOT, env: process.env, encoding: 'utf8' }
);
console.log(testOut);
fs.writeFileSync(path.join(OUT_REV, 'test-tag290.log'), testOut);
fs.writeFileSync(path.join(OUT_QA, 'test-tag290.log'), testOut);

if (testOut.includes('FAIL')) {
  throw new Error('tag290 tests reported failures!');
}

console.log('========================================================================');
console.log('[AG-290 Batch] Step 2/4: Capturing 15 WebGPU screenshots in 4 lights...');
console.log('========================================================================');
execFileSync(
  process.execPath,
  [path.join(ROOT, 'tools/ag290-capture.mjs')],
  { cwd: ROOT, env: process.env, stdio: 'inherit' }
);

console.log('========================================================================');
console.log('[AG-290 Batch] Step 3/4: Building composite review sheets with PIL...');
console.log('========================================================================');
execFileSync(
  'python',
  [path.join(ROOT, 'tools/build-ag290-sheets.py')],
  { cwd: ROOT, env: process.env, stdio: 'inherit' }
);

console.log('========================================================================');
console.log('[AG-290 Batch] Step 4/4: Running --exclusive Night 20 benchmark...');
console.log('========================================================================');
const benchOut = execFileSync(
  process.execPath,
  [path.join(ROOT, 'tools/bench.mjs'), '--night', '20', '--gfx', 'high', '--seconds', '20', '--prof'],
  { cwd: ROOT, env: process.env, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
);
console.log(benchOut);
fs.writeFileSync(path.join(OUT_REV, 'bench-night20.log'), benchOut);
fs.writeFileSync(path.join(OUT_QA, 'bench-night20.log'), benchOut);

console.log('[AG-290 Batch] Complete! All tests, captures, composite sheets, and bench logged.');
