// qa/2026-10-15-AG-80/run-slot-checks.mjs
// Runs inside `node crew/crew.mjs slot run antigravity AG-80` (Rule 16: single game instance, --jobs 1).
import { spawnSync } from 'node:child_process';

function run(cmd, args) {
  console.log(`\n>>> Running: ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });
  if (res.status !== 0) {
    throw new Error(`Command failed with exit code ${res.status}: ${cmd} ${args.join(' ')}`);
  }
}

try {
  // 1. Start inspector camera with --show (per tools/CAMERA.md: prevents off-screen swapchain black frames on Windows)
  run(process.execPath, ['tools/camera.mjs', 'start', '--inspect', '--show', '--agent', 'antigravity', '--task', 'AG-80']);

  // 2. Run the 24-variant contact sheet job (all 8 buildables x 3 tiers)
  run(process.execPath, ['tools/camera.mjs', 'job', 'qa/2026-10-15-AG-80/after-job.json', '--agent', 'antigravity', '--task', 'AG-80']);

  // 3. Stop the camera cleanly (Rule 16)
  run(process.execPath, ['tools/camera.mjs', 'stop', '--agent', 'antigravity', '--task', 'AG-80']);
} finally {
  spawnSync(process.execPath, ['tools/camera.mjs', 'stop', '--agent', 'antigravity', '--task', 'AG-80'], {
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });
}
