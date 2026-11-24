// tools/ag286-slot-batch.mjs
// Single batch runner for AG-286 inside one game-test slot claim:
// Step 1: Capture 54 high-fidelity WebGPU screenshots (9 weapons x 6 lighting/pose conditions)
// Step 2: Build composite review sheets (sheet.jpg, hands-detail.jpg)

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

function runStep(label, cmd, args) {
  console.log('\n' + '='.repeat(72));
  console.log(`[AG-286 Batch] ${label}`);
  console.log('='.repeat(72));
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: process.env });
  if (res.status !== 0) {
    console.error(`Step failed with code ${res.status}: ${cmd} ${args.join(' ')}`);
    process.exit(res.status || 1);
  }
}

const extraArgs = process.argv.slice(2);
console.log('[AG-286 Batch] Starting sequential execution under slot...');
runStep('Step 1/2: Capturing WebGPU screenshots in 4 lights on RTX 5080...', 'node', ['tools/ag286-capture.mjs', ...extraArgs]);
runStep('Step 2/2: Building composite review sheets with PIL...', 'python', ['tools/build-ag286-sheets.py']);
console.log('\n[AG-286 Batch] Complete! All captures and composite sheets built.');
