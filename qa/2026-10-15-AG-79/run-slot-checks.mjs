// qa/2026-10-15-AG-79/run-slot-checks.mjs
// Runs inside `node crew/crew.mjs slot run antigravity AG-79` (Rule 16: single game instance, --jobs 1).
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
  run(process.execPath, ['tools/camera.mjs', 'start', '--inspect', '--show', '--agent', 'antigravity', '--task', 'AG-79']);

  // 2. Run the 16-variant contact sheet job (skeletal marine, bone raft, wall 0-4, floor 0-2, barricade 0-2, sandbag 0-2)
  run(process.execPath, ['tools/camera.mjs', 'job', 'qa/2026-10-15-AG-79/after-job.json', '--agent', 'antigravity', '--task', 'AG-79']);

  // 3. Stop the camera cleanly (Rule 16)
  run(process.execPath, ['tools/camera.mjs', 'stop', '--agent', 'antigravity', '--task', 'AG-79']);
} finally {
  spawnSync(process.execPath, ['tools/camera.mjs', 'stop', '--agent', 'antigravity', '--task', 'AG-79'], {
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });
}
