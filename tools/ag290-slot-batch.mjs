// tools/ag290-slot-batch.mjs
// Coordinated sequential slot runner for AG-290 range retake (one instance at a time, --jobs 1):
// 1) Run tools/realtest.mjs tag290 (verify all 42 unit & live WebGPU assertions pass)
// 2) Run tools/ag290-capture.mjs (18 verified WebGPU renders in Training Ground range across 4 lights, 1P & 3P, cooling)
// 3) Build review/AG-290/sheet.jpg and review/AG-290/heat-strips.jpg via tools/build-ag290-sheets.py

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_REV = path.join(ROOT, 'review/AG-290');
const OUT_QA = path.join(ROOT, 'qa/2026-11-10-AG-290');
fs.mkdirSync(OUT_REV, { recursive: true });
fs.mkdirSync(OUT_QA, { recursive: true });

function writeRetry(filePath, data, retries = 30, delay = 150) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.' + process.pid + '.' + Math.random().toString(36).slice(2) + '.tmp';
  fs.writeFileSync(tmp, data);
  for (let i = 0; i < retries; i++) {
    try {
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
      fs.renameSync(tmp, filePath);
      return;
    } catch (e) {
      if (i === retries - 1) {
        try { fs.copyFileSync(tmp, filePath); fs.unlinkSync(tmp); return; } catch {}
        throw e;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
    }
  }
}

console.log('========================================================================');
console.log('[AG-290 Batch] Step 1/3: Running tools/realtest.mjs tag290...');
console.log('========================================================================');
const testOut = execFileSync(
  process.execPath,
  [path.join(ROOT, 'tools/realtest.mjs'), 'tag290'],
  { cwd: ROOT, env: process.env, encoding: 'utf8' }
);
console.log(testOut);
writeRetry(path.join(OUT_REV, 'test-tag290.log'), testOut);
writeRetry(path.join(OUT_QA, 'test-tag290.log'), testOut);

if (testOut.includes('FAIL')) {
  throw new Error('tag290 tests reported failures!');
}

console.log('========================================================================');
console.log('[AG-290 Batch] Step 2/3: Capturing WebGPU range shots in 4 lights...');
console.log('========================================================================');
execFileSync(
  process.execPath,
  [path.join(ROOT, 'tools/ag290-capture.mjs')],
  { cwd: ROOT, env: process.env, stdio: 'inherit' }
);

console.log('========================================================================');
console.log('[AG-290 Batch] Step 3/3: Building composite review sheets with PIL...');
console.log('========================================================================');
execFileSync(
  'python',
  [path.join(ROOT, 'tools/build-ag290-sheets.py')],
  { cwd: ROOT, env: process.env, stdio: 'inherit' }
);

console.log('[AG-290 Batch] Complete! tag290 green, range captures verified, and review sheets built.');
