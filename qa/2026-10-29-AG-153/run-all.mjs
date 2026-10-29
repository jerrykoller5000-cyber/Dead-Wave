import { spawnSync } from 'node:child_process';

console.log('=== Step 1: Running realtest on t301, t131, t147, t160 ===');
const t1 = spawnSync(process.execPath, ['tools/realtest.mjs', 't301', 't131', 't147', 't160', '--all'], { stdio: 'inherit' });
if (t1.status !== 0) {
  console.error('realtest failed with exit code', t1.status);
  process.exit(t1.status || 1);
}

console.log('\n=== Step 2: Capturing screenshots and telemetry ===');
const t2 = spawnSync(process.execPath, ['qa/2026-10-29-AG-153/capture.mjs'], { stdio: 'inherit' });
if (t2.status !== 0) {
  console.error('capture.mjs failed with exit code', t2.status);
  process.exit(t2.status || 1);
}

console.log('\n=== AG-153 verification passed completely ===');
