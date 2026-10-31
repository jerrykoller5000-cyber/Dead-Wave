// CU-188: the whole browser suite in chunks of about 25, one slot hold each (run-all.mjs queues itself), a fresh browser
// each, the slot free between chunks. A chunk that fails to start is rerun once. Logs: chunk-NN.log, names: chunk-NN.txt.
//   node qa/2026-10-31-CU-188/chunks.mjs [first chunk index] [last chunk index]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../..');
const tdir = path.join(root, 'tools', 'tests');
const all = fs.readdirSync(tdir).filter((f) => /^t[0-9a-z]+\.js$/.test(f)).map((f) => f.replace(/\.js$/, ''))
  .sort((a, b) => (Number(a.slice(1)) || 0) - (Number(b.slice(1)) || 0) || a.localeCompare(b));
const SIZE = 25;
const chunks = [];
for (let i = 0; i < all.length; i += SIZE) chunks.push(all.slice(i, i + SIZE));
const first = Number(process.argv[2] ?? 0), last = Number(process.argv[3] ?? chunks.length - 1);
const pad = (n) => String(n).padStart(2, '0');
fs.writeFileSync(path.join(dir, 'plan.txt'), `${all.length} checks in ${chunks.length} chunks of up to ${SIZE}\n` + chunks.map((c, i) => `chunk ${pad(i)}: ${c.join(' ')}`).join('\n') + '\n', 'utf8');
console.log(`CU-188: ${all.length} checks, ${chunks.length} chunks`);

function runChunk(i, attempt) {
  const names = chunks[i];
  fs.writeFileSync(path.join(dir, `chunk-${pad(i)}.txt`), names.join(' ') + '\n', 'utf8');
  return new Promise((resolve) => {
    const out = [];
    const child = spawn(process.execPath, [path.join(tdir, 'run-all.mjs'), ...names, '--jobs', '1', '--all-fails',
      '--agent', 'cursor', '--task', 'CU-188', '--checks', `full suite chunk ${i + 1}/${chunks.length} (CU-188)`, '--minutes', '40'],
      { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    const take = (b) => out.push(b);
    child.stdout.on('data', take); child.stderr.on('data', take);
    child.on('exit', (code) => {
      const text = Buffer.concat(out).toString('utf8');
      fs.writeFileSync(path.join(dir, `chunk-${pad(i)}${attempt > 1 ? `-try${attempt}` : ''}.log`), text, 'utf8');
      resolve({ code, text });
    });
  });
}

for (let i = first; i <= last && i < chunks.length; i++) {
  let res = await runChunk(i, 1);
  const finished = (t) => /\d+ checks?: \d+ pass, \d+ fail/.test(t);
  if (!finished(res.text)) {
    console.log(`CU-188 chunk ${pad(i)} did not finish (exit ${res.code}); rerunning once`);
    res = await runChunk(i, 2);
    if (finished(res.text)) fs.copyFileSync(path.join(dir, `chunk-${pad(i)}-try2.log`), path.join(dir, `chunk-${pad(i)}.log`));
  }
  const m = res.text.match(/(\d+) checks?: (\d+) pass, (\d+) fail(?:, (\d+) reported no assertions)?/);
  console.log(`CU-188 chunk ${pad(i)}/${pad(chunks.length - 1)}: ${m ? m[0] : 'NO SUMMARY (exit ' + res.code + ')'}`);
}
console.log('CU-188: all chunks done.');
