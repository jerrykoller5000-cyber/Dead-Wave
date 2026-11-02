// CU-222 part 2: this tree only. Each toggle is ABBA (default, flag, flag, default).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cwd = 'C:/Users/Zero/Desktop/Tiny Trek';
const toggles = [
  ['woods', 'woods=0'],
  ['walls', 'quarterwalls=0&walls=0'],
  ['events', 'events=0&warnings=0&hqglow=0&skyline=0'],
  ['shortcuts', 'shortcuts=0&utilities=0&chaingates=0'],
];

function runOne(name, query) {
  return new Promise((resolve) => {
    const args = ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof-all'];
    if (query) args.push('--query', query);
    const out = fs.createWriteStream(path.join(here, name + '.log'));
    const child = spawn(process.execPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.pipe(out);
    child.stderr.pipe(out);
    child.on('exit', (code) => {
      out.end();
      console.log(name + ' exit ' + code);
      resolve(code ?? 1);
    });
  });
}

let failed = 0;
for (const [name, query] of toggles) {
  for (const [tag, q] of [['A1', ''], ['B1', query], ['B2', query], ['A2', '']]) {
    const code = await runOne(name + '-' + tag, q);
    if (code !== 0) failed++;
  }
}
console.log(failed ? 'CU-222 toggles finished with ' + failed + ' failures' : 'CU-222 toggles done');
process.exit(failed ? 1 : 0);
