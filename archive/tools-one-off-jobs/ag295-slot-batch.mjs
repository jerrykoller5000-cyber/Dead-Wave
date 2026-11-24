// tools/ag295-slot-batch.mjs
// Single batch runner for AG-295 inside one game-test slot claim:
// Step 1: Capture 48 high-fidelity WebGPU screenshots (8 weapons x 6 lighting/pose conditions) on RTX 5080
// Step 2: Build composite review sheets (sheet.jpg, hands-detail.jpg, focus-checks.jpg)

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

function runStep(label, cmd, args) {
  console.log('\n' + '='.repeat(72));
  console.log(`[AG-295 Batch] ${label}`);
  console.log('='.repeat(72));
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: process.env });
  if (res.status !== 0) {
    console.error(`Step failed with code ${res.status}: ${cmd} ${args.join(' ')}`);
    process.exit(res.status || 1);
  }
}

const extraArgs = process.argv.slice(2);
console.log('[AG-295 Batch] Starting sequential execution under slot...');
runStep('Step 1/2: Capturing WebGPU screenshots in 4 lights on RTX 5080...', 'node', ['tools/ag295-capture.mjs', ...extraArgs]);
runStep('Step 2/2: Building composite review sheets with PIL...', 'python', ['tools/build-ag295-sheets.py']);
console.log('\n[AG-295 Batch] Complete! All captures and composite sheets built.');
