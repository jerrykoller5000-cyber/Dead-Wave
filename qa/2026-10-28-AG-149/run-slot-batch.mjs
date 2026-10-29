import { execFileSync } from 'node:child_process';

const run = (args) => {
  console.log(`\n>>> node ${args.join(' ')}`);
  execFileSync(process.execPath, args, { stdio: 'inherit', env: process.env });
};

try {
  run(['tools/camera.mjs', 'start']);
  run(['tools/camera.mjs', 'job', 'review/sweep/jobs/trapper-frame.json']);
  run(['tools/camera.mjs', 'job', 'review/sweep/jobs/tower-trail.json']);
  run(['tools/camera.mjs', 'job', 'review/sweep/jobs/cave-4-cheek.json']);
  run(['tools/camera.mjs', 'job', 'review/sweep/jobs/cave-mouths.json']);
  run(['tools/camera.mjs', 'job', 'qa/2026-10-28-AG-149/night-spots.json']);
} finally {
  try {
    run(['tools/camera.mjs', 'stop']);
  } catch (e) {
    console.error('camera stop error:', e.message);
  }
}

run(['tools/realtest.mjs', 't167', 't268', 't215', '--all']);
