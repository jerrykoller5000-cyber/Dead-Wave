import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const stage = process.argv[2];
if (!['before', 'after', 'final'].includes(stage)) throw new Error('stage must be before, after, or final');
const out = path.join(here, `${stage}.log`);
const log = fs.createWriteStream(out, { encoding: 'utf8' });
const child = spawn(process.execPath, ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(log, { end: false });
child.stderr.pipe(log, { end: false });
const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
await new Promise((resolve) => log.end(resolve));
console.log(`GP-19949 ${stage} bench: exit ${code}; ${out}`);
process.exitCode = code ?? 1;
