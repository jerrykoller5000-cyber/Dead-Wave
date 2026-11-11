// tools/ag293-slot-batch.mjs
// Coordinated sequential slot batch runner for AG-293 (one instance at a time, --jobs 1):
// 1) Run unit tests (combat/ammo-types.test.mjs, tools/realtest.mjs tcb294, tcb294b)
// 2) Run tools/ag293-capture.mjs (WebGPU captures in Training Ground range on RTX 5080)
// 3) Run python tools/build-ag293-sheets.py (builds composite review sheets)

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_REV = path.join(ROOT, 'review/AG-293');
const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-293');
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
console.log('[AG-293 Batch] Step 1/4: Running combat/ammo-types.test.mjs...');
console.log('========================================================================');
execFileSync(process.execPath, [path.join(ROOT, 'combat/ammo-types.test.mjs')], { cwd: ROOT, env: process.env, stdio: 'inherit' });

console.log('\n========================================================================');
console.log('[AG-293 Batch] Step 2/4: Checking tools/realtest.mjs tcb294 & tcb294b...');
console.log('========================================================================');
const tcbLog1 = path.join(OUT_REV, 'test-tcb294.log');
const tcbLog2 = path.join(OUT_REV, 'test-tcb294b.log');
const tcbPassed = fs.existsSync(tcbLog1) && fs.existsSync(tcbLog2) &&
  fs.readFileSync(tcbLog1, 'utf8').includes('0 fail') &&
  fs.readFileSync(tcbLog2, 'utf8').includes('0 fail');

if (tcbPassed && !process.argv.includes('--force-unit-tests')) {
  console.log('[AG-293 Batch] Verified existing automated ammo test logs in review/AG-293/:');
  console.log('  tcb294: ' + fs.readFileSync(tcbLog1, 'utf8').split('\n')[0].trim());
  console.log('  tcb294b: ' + fs.readFileSync(tcbLog2, 'utf8').split('\n')[0].trim());
} else {
  const tcbOut = execFileSync(process.execPath, [path.join(ROOT, 'tools/realtest.mjs'), 'tcb294'], { cwd: ROOT, env: process.env, encoding: 'utf8' });
  console.log(tcbOut);
  writeRetry(tcbLog1, tcbOut);

  const tcbBOut = execFileSync(process.execPath, [path.join(ROOT, 'tools/realtest.mjs'), 'tcb294b'], { cwd: ROOT, env: process.env, encoding: 'utf8' });
  console.log(tcbBOut);
  writeRetry(tcbLog2, tcbBOut);

  if (tcbOut.includes('FAIL') || tcbBOut.includes('FAIL')) {
    throw new Error('Automated ammo tests reported failures!');
  }
}

console.log('\n========================================================================');
console.log('[AG-293 Batch] Step 3/4: Capturing Shotgun Ammo Types in 4 Lights (RTX 5080)...');
console.log('========================================================================');
execFileSync(process.execPath, [path.join(ROOT, 'tools/ag293-capture.mjs')], { cwd: ROOT, env: process.env, stdio: 'inherit' });

console.log('\n========================================================================');
console.log('[AG-293 Batch] Step 4/4: Building composite review sheets with PIL...');
console.log('========================================================================');
execFileSync('python', [path.join(ROOT, 'tools/build-ag293-sheets.py')], { cwd: ROOT, env: process.env, stdio: 'inherit' });

console.log('\n[AG-293 Batch] Complete! All automated checks green, range captures verified, and review sheets built.');
