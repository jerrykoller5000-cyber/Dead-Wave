// qa/fps/launcher/run-all-launcher.mjs
// Batched test slot runner for AG-252: Launcher review set & GP-20039 four-light audit.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));

console.log('[AG-252-Launcher-Batch] Starting batched Launcher review run on WebGPU hardware...');

// 1. Capture Launcher Review Set & Four-Light Matrix
console.log('\n--- Step 1: Launcher Review Set & Four-Light Captures ---');
const launcherRes = spawnSync(process.execPath, [path.join(ROOT, 'qa/fps/launcher/run-launcher-review.mjs')], {
  stdio: 'inherit',
  env: process.env
});
if (launcherRes.status !== 0) {
  console.error('[AG-252-Launcher-Batch] Launcher review failed with exit code', launcherRes.status);
  process.exit(launcherRes.status || 1);
}

// 2. Build Contact Sheets & GIF Animation
console.log('\n--- Step 2: Contact Sheets & GIF Assembly ---');
const launcherPy = spawnSync('python', [path.join(ROOT, 'qa/fps/launcher/build-launcher-set.py')], {
  stdio: 'inherit'
});
if (launcherPy.status !== 0) {
  console.error('[AG-252-Launcher-Batch] Launcher build-launcher-set.py failed with exit code', launcherPy.status);
  process.exit(launcherPy.status || 1);
}

console.log('\n[AG-252-Launcher-Batch] Launcher review captures, contact sheets, and motion GIF complete!');
