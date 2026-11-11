import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const opts = { cwd: ROOT, stdio: 'inherit', env: process.env };

execFileSync(process.execPath, [path.join(ROOT, 'qa/2026-11-11-AG-302/ag302-warmup-trace.mjs'), '--tag=after', '--shots'], opts);
execFileSync(process.execPath, [path.join(ROOT, 'qa/2026-11-11-AG-302/gp20098-and-cd1-gpu.mjs')], opts);
