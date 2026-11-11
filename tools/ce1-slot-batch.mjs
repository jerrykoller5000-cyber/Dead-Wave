// tools/ce1-slot-batch.mjs
// Single batch runner for CE-1 inside one game-test slot claim:
// Step 1: Capture WebGPU action-cycle screenshots across 6 weapons in 4 lights on RTX 5080
// Step 2: Build composite review sheets and individual strips with PIL

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

function runStep(label, cmd, args) {
  console.log('\n' + '='.repeat(72));
  console.log(`[CE-1 Batch] ${label}`);
  console.log('='.repeat(72));
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: process.env });
  if (res.status !== 0) {
    console.error(`Step failed with code ${res.status}: ${cmd} ${args.join(' ')}`);
    process.exit(res.status || 1);
  }
}

const extraArgs = process.argv.slice(2);
console.log('[CE-1 Batch] Starting sequential execution under slot...');
runStep('Step 1/2: Capturing WebGPU action-cycle screenshots on RTX 5080...', 'node', ['tools/ce1-capture.mjs', ...extraArgs]);
runStep('Step 2/2: Building action strips and composite sheets with PIL...', 'python', ['tools/build-ce1-sheets.py']);
console.log('\n[CE-1 Batch] Complete! All CE-1 captures and composite sheets built.');
