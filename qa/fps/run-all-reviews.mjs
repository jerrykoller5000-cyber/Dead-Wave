// qa/fps/run-all-reviews.mjs
// Batched test slot runner for AG-252: Pistol reshoot & Wasp SMG review set.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

console.log('[AG-252-Batch] Starting batched review run on WebGPU hardware...');

// 1. Pistol Review Set
console.log('\n--- Step 1: Pistol Review Reshoot ---');
const pistolRes = spawnSync(process.execPath, [path.join(ROOT, 'qa/fps/pistol/run-pistol-review.mjs')], {
  stdio: 'inherit',
  env: process.env
});
if (pistolRes.status !== 0) {
  console.error('[AG-252-Batch] Pistol review failed with exit code', pistolRes.status);
  process.exit(pistolRes.status || 1);
}

// 2. Pistol Contact Sheet & GIF Assembly
console.log('\n--- Step 2: Pistol Contact Sheet & GIF Assembly ---');
const pistolPy = spawnSync('python', [path.join(ROOT, 'qa/fps/pistol/build-pistol-set.py')], {
  stdio: 'inherit'
});
if (pistolPy.status !== 0) {
  console.error('[AG-252-Batch] Pistol build-pistol-set.py failed with exit code', pistolPy.status);
  process.exit(pistolPy.status || 1);
}

// 3. Wasp SMG Review Set
console.log('\n--- Step 3: Wasp SMG Review Set ---');
const waspRes = spawnSync(process.execPath, [path.join(ROOT, 'qa/fps/wasp/run-wasp-review.mjs')], {
  stdio: 'inherit',
  env: process.env
});
if (waspRes.status !== 0) {
  console.error('[AG-252-Batch] Wasp review failed with exit code', waspRes.status);
  process.exit(waspRes.status || 1);
}

// 4. Wasp Contact Sheet & GIF Assembly
console.log('\n--- Step 4: Wasp Contact Sheet & GIF Assembly ---');
const waspPy = spawnSync('python', [path.join(ROOT, 'qa/fps/wasp/build-wasp-set.py')], {
  stdio: 'inherit'
});
if (waspPy.status !== 0) {
  console.error('[AG-252-Batch] Wasp build-wasp-set.py failed with exit code', waspPy.status);
  process.exit(waspPy.status || 1);
}

console.log('\n[AG-252-Batch] Both Pistol and Wasp weapon reviews captured and assembled successfully!');
