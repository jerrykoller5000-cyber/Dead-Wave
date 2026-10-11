// GB-154: runs tools/tests checks on the real renderer (real-test.mjs), two at a time, one fresh page each:
// the test page (run-all.mjs) can't boot right now (index.html's sceneCull uses THREE.Frustum, which the three stub
// lacks) and its check-players preflight fails on reads that aren't ours. Results in results/<t>.txt and .log.
//   node handoffs/2026-10-09-grokbot-GB-154/batch.mjs t214 t218 ...
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..');
const tests = process.argv.slice(2), res = path.join(HERE, 'results'); fs.mkdirSync(res, { recursive: true });
const one = (t) => new Promise((ok) => {
  const log = fs.openSync(path.join(res, t + '.log'), 'w');
  const p = spawn(process.execPath, [path.join(HERE, 'real-test.mjs'), t, path.join(res, t + '.txt')], { cwd: ROOT, stdio: ['ignore', log, log] });
  p.on('exit', (c) => { const txt = fs.existsSync(path.join(res, t + '.txt')) ? fs.readFileSync(path.join(res, t + '.txt'), 'utf8') : '';
    const n = (k) => (txt.match(new RegExp('^' + k, 'gm')) || []).length;
    console.log(`${t}: ${n('PASS')} pass, ${n('FAIL')} fail, ${n('SKIP')} skip${txt ? '' : ' (no result, see log)'} [exit ${c}]`); ok(); });
});
const q = tests.slice();
await Promise.all([0, 1].map(async () => { while (q.length) await one(q.shift()); }));
