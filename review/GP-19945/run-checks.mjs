// GP-19945: one queued, sequential browser batch. The crew slot supplies DW_GAME_TEST_TOKEN.
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const jobs = [
  ['test-page', ['tools/tests/run-all.mjs', 't93', 't202', 't209', 't210', 't222', '--jobs', '1', '--agent', 'chatgpt', '--task', 'GP-19945', '--all-fails']],
  ['real-renderer', ['tools/realtest.mjs', 't93', 't202', 't209', 't210', 't222', 't270']],
  ['bench-after', ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof', '--cpu', '--census']],
];
let failed = false;
for (const [name, args] of jobs) {
  console.log(`GP-19945 ${name}: ${args.join(' ')}`);
  const log = createWriteStream(path.join(here, `${name}.log`), { encoding: 'utf8' });
  let output = '';
  const child = spawn(process.execPath, args, { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const [stream, destination] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
    stream.on('data', (data) => { output += data; destination.write(data); log.write(data); });
  }
  const code = await new Promise((resolve) => { child.on('error', (e) => { console.error(e); resolve(1); }); child.on('exit', (n) => resolve(n ?? 1)); });
  await new Promise((resolve) => log.end(resolve));
  if (code || /(?:^|\n)\s*FAIL\b/m.test(output)) failed = true;
  console.log(`GP-19945 ${name}: exit ${code}`);
}
process.exitCode = failed ? 1 : 0;
