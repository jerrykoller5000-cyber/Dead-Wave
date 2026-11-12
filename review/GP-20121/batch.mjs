import { spawnSync } from 'node:child_process';
for (let i = 1; i <= 3; i++) {
  const label = `${process.argv[2]}-${i}`;
  const run = spawnSync(process.execPath, ['review/GP-20121/profile.mjs', label], { stdio: 'inherit' });
  if (run.status !== 0) process.exit(run.status || 1);
}
