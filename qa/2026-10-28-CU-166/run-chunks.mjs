// CU-166: run the suite in chunks of 25. A chunk that never starts is rerun.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'));
const root = path.resolve(dir, '..', '..');
const chunks = fs.readdirSync(dir).filter((f) => /^chunk-\d+\.txt$/.test(f)).sort();

function startedOk(text) {
  if (!/GRANT/.test(text)) return false;
  return /ok {3}/.test(text) || /FAIL {2}/.test(text) || /info {2}/.test(text);
}

function runChunk(name) {
  const tests = fs.readFileSync(path.join(dir, name + '.txt'), 'utf8').trim().split(/\s+/);
  const logPath = path.join(dir, name + '.log');
  const args = [
    path.join(root, 'crew', 'crew.mjs'), 'slot', 'run', 'cursor', 'CU-166',
    '--checks', name, '--minutes', '75', '--',
    process.execPath, path.join(root, 'tools', 'tests', 'run-all.mjs'),
    ...tests, '--jobs', '1', '--all-fails',
  ];
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: root, windowsHide: false });
    const out = [];
    const take = (d) => { out.push(d); process.stdout.write(d); };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('error', (err) => {
      const text = Buffer.concat(out).toString('utf8') + '\n' + err.stack;
      fs.writeFileSync(logPath, text);
      resolve({ code: 1, started: false, text });
    });
    child.on('exit', (code) => {
      const text = Buffer.concat(out).toString('utf8');
      fs.writeFileSync(logPath, text);
      resolve({ code: code ?? 1, started: startedOk(text), text });
    });
  });
}

for (const file of chunks) {
  const name = file.replace(/\.txt$/, '');
  if (fs.existsSync(path.join(dir, name + '.log')) && startedOk(fs.readFileSync(path.join(dir, name + '.log'), 'utf8'))) {
    console.log(`\n=== ${name} already ran ===\n`);
    continue;
  }
  let attempt = 0;
  let result;
  do {
    attempt++;
    console.log(`\n=== ${name} attempt ${attempt} ===\n`);
    result = await runChunk(name);
    if (!result.started) console.log(`\n=== ${name} did not start (exit ${result.code}); rerun ===\n`);
  } while (!result.started && attempt < 3);
  if (!result.started) console.log(`\n=== ${name} FAILED TO START after 3 tries ===\n`);
}
console.log('\n=== ALL CHUNKS DONE ===\n');
