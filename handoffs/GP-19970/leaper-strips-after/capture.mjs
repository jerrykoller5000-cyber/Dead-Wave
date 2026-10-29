import { spawnSync } from 'node:child_process';

const checks = [
  ['tools/camera.mjs', 'check', 'zombie.leaper', '--out', 'handoffs/GP-19970/leaper-strips-after/check', '--agent', 'chatgpt', '--task', 'GP-19970'],
  ['tools/camera.mjs', 'job', 'handoffs/GP-19970/leaper-strips-after/job.json', '--inspect', '--agent', 'chatgpt', '--task', 'GP-19970'],
];
for (const args of checks) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
