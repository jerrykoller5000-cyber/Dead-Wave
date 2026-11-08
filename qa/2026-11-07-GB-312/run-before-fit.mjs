// qa/2026-11-07-GB-312/run-before-fit.mjs - before shots then fit in one slot turn (5 guns).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const node = process.execPath;
function run(script, args = []) {
  console.log('>>', script, args.join(' '));
  const r = spawnSync(node, [path.join(HERE, script), ...args], { stdio: 'inherit', cwd: path.resolve(HERE, '../..'), env: process.env });
  if (r.status) process.exit(r.status || 1);
}
run('shots.mjs', ['before']);
run('fit-fp.mjs');
console.log('before+fit DONE');