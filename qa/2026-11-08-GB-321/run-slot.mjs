import { spawnSync } from 'node:child_process';
const r1 = spawnSync(process.execPath, ['qa/2026-11-08-GB-321/page-load.mjs'], { stdio: 'inherit' });
if (r1.status !== 0) process.exit(r1.status == null ? 1 : r1.status);
const r2 = spawnSync(process.execPath, ['tools/tests/run-all.mjs', 't215', 't95', '--jobs', '1', '--agent', 'grokbot', '--task', 'GB-321'], { stdio: 'inherit' });
process.exit(r2.status == null ? 1 : r2.status);
