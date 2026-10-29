import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';

const base = 'handoffs/GP-19970/screamer-face-after/screamer-noon-walk-head-side';
for (let attempt = 1; attempt <= 4; attempt++) {
  const result = spawnSync(process.execPath, ['tools/camera.mjs', 'shot', '--from', `${base}.json`, '--out', `${base}.png`, '--wait', '1600', '--inspect', '--agent', 'chatgpt', '--task', 'GP-19970'], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  const bytes = statSync(`${base}.png`).size;
  console.log(`walk capture ${attempt}: ${bytes} bytes`);
  if (bytes > 15000) process.exit(0);
}
process.exit(1);
