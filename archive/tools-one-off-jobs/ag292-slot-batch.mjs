// tools/ag292-slot-batch.mjs
// Single sequential batch runner under the game-test slot for AG-292 (J128 / D-140)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, desc) {
  console.log(`\n========================================================================`);
  console.log(`[AG-292 BATCH] STEP: ${desc}`);
  console.log(`Command: ${cmd} ${args.join(' ')}`);
  console.log(`========================================================================\n`);

  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
    shell: true
  });

  if (res.status !== 0) {
    console.error(`[AG-292 BATCH ERROR] ${desc} failed with exit code ${res.status}`);
    process.exit(res.status || 1);
  }
}

console.log(`[AG-292 BATCH] Starting AG-292 automated verification & capture pipeline...`);

// Step 1: Real WebGPU test suite execution
run('node', ['tools/realtest.mjs', 'tag292'], 'WebGPU Real Renderer Test Suite (tag292)');

// Step 2: Automated captures (Before/After pairs + 12 scene inspection plates)
run('node', ['tools/ag292-capture.mjs'], 'Prop Seating & Before/After WebGPU Captures');

// Step 3: Composite review sheets generation
run('python', ['tools/build-ag292-sheet.py'], 'Composite Review Sheets Generation');

console.log(`\n========================================================================`);
console.log(`[AG-292 BATCH COMPLETE] All steps executed successfully!`);
console.log(`========================================================================\n`);
