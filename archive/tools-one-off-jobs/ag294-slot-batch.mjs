// tools/ag294-slot-batch.mjs
// Single sequential batch runner under the game-test slot for AG-294 (J129 / D-144)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, desc) {
  console.log(`\n========================================================================`);
  console.log(`[AG-294 BATCH] STEP: ${desc}`);
  console.log(`Command: ${cmd} ${args.join(' ')}`);
  console.log(`========================================================================\n`);

  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
    shell: true
  });

  if (res.status !== 0) {
    console.error(`[AG-294 BATCH ERROR] ${desc} failed with exit code ${res.status}`);
    process.exit(res.status || 1);
  }
}

console.log(`[AG-294 BATCH] Starting AG-294 automated verification & capture pipeline on RTX 5080...`);

// Step 1: Automated captures for all 4 guns across eye poses, factory/M81, 4 lights & rack
run('node', ['tools/ag294-capture.mjs'], 'Revised Guns WebGPU Captures (Shotgun, KR-7, Revolver, Wasp)');

// Step 2: Composite review sheets generation and GPU visual diagnostic
run('python', ['tools/build-ag294-sheets.py'], 'Composite Review Sheets Generation & GPU Diagnostic');

console.log(`\n========================================================================`);
console.log(`[AG-294 BATCH COMPLETE] All steps executed successfully!`);
console.log(`========================================================================\n`);
