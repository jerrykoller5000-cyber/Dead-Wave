// CU-224: night 20 High, third person, --prof --cpu. This tree against 1.1.0, two pairs.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const runs = [
  ['old-1', 'C:/Users/Zero/Desktop/dw-cu224-old'],
  ['new-1', 'C:/Users/Zero/Desktop/Tiny Trek'],
  ['old-2', 'C:/Users/Zero/Desktop/dw-cu224-old'],
  ['new-2', 'C:/Users/Zero/Desktop/Tiny Trek'],
];

function runOne(name, cwd) {
  return new Promise((resolve) => {
    const out = fs.createWriteStream(path.join(here, name + '.log'));
    const child = spawn(process.execPath, ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof', '--cpu'], {
      cwd, stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.pipe(out);
    child.stderr.pipe(out);
    child.on('exit', (code) => {
      out.end();
      console.log(name + ' exit ' + code);
      resolve(code ?? 1);
    });
  });
}

for (const [name, cwd] of runs) {
  const code = await runOne(name, cwd);
  if (code !== 0) process.exit(code);
}
console.log('CU-224 cpu pairs done');
