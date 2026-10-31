// CU-184: a function of index.html in 82d75118 (git show) against the working tree: identical, or the diff.
//   node qa/2026-10-31-CU-184/fn-diff.mjs sceneCull cullLiveSet ...
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const oldL = execFileSync('git', ['show', '82d75118:index.html'], { maxBuffer: 1 << 28 }).toString('utf8').replace(/\r/g, '').split('\n');
const newL = fs.readFileSync('index.html', 'utf8').replace(/\r/g, '').split('\n');
const get = (L, name) => {
  const re = new RegExp('^    (async )?function ' + name + '\\(');
  const s = L.findIndex((l) => re.test(l));
  if (s < 0) return null;
  let e = s + 1;
  while (e < L.length && !/^    \}\s*$/.test(L[e])) e++;
  return { at: s + 1, text: L.slice(s, e + 1).join('\n') + '\n' };
};
for (const name of process.argv.slice(2)) {
  const o = get(oldL, name), n = get(newL, name);
  if (!o || !n) { console.log(`=== ${name}: ${!o ? 'not in old ' : ''}${!n ? 'not in new' : ''}`); continue; }
  console.log(`=== ${name}: old line ${o.at}, new line ${n.at}${o.text === n.text ? ', IDENTICAL' : ''}`);
  if (o.text === n.text) continue;
  const a = path.join(os.tmpdir(), `fo-${name}.js`), b = path.join(os.tmpdir(), `fn-${name}.js`);
  fs.writeFileSync(a, o.text); fs.writeFileSync(b, n.text);
  try { execFileSync('git', ['diff', '--no-index', '--no-color', '-U1', a, b], { encoding: 'utf8' }); }
  catch (e) { console.log((e.stdout || '').split('\n').slice(4).join('\n').slice(0, 5000)); }
}
