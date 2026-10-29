// CU-173: a function's text in the old tree against the new tree (scratch trees outside the repo).
//   node fn-diff.mjs <name> [<name>...]   prints the line counts and a unified diff of each
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
const base = 'C:/Users/Zero/Desktop/dw-cu173';
const get = (tree, name) => {
  const L = fs.readFileSync(`${base}/${tree}/index.html`, 'utf8').replace(/\r/g, '').split('\n');
  const re = new RegExp(`^    (async )?function ${name}\\(`);
  const s = L.findIndex((l) => re.test(l));
  if (s < 0) return null;
  let e = s;
  if (!/\}\s*$/.test(L[s]) || !/^    function .*\{.*\}\s*$/.test(L[s])) { e = s + 1; while (e < L.length && !/^    \}\s*$/.test(L[e])) e++; }
  return { start: s + 1, text: L.slice(s, e + 1).join('\n') + '\n' };
};
for (const name of process.argv.slice(2)) {
  const o = get('old', name), n = get('new', name);
  if (!o || !n) { console.log(`=== ${name}: ${!o ? 'not in old ' : ''}${!n ? 'not in new' : ''}`); continue; }
  const lo = o.text.split('\n').length - 1, ln = n.text.split('\n').length - 1;
  console.log(`=== ${name}: old line ${o.start} (${lo} lines), new line ${n.start} (${ln} lines)${o.text === n.text ? ', identical' : ''}`);
  if (o.text === n.text) continue;
  const a = path.join(os.tmpdir(), `fn-old-${name}.js`), b = path.join(os.tmpdir(), `fn-new-${name}.js`);
  fs.writeFileSync(a, o.text); fs.writeFileSync(b, n.text);
  try { execFileSync('git', ['diff', '--no-index', '--no-color', '-U1', a, b], { encoding: 'utf8' }); }
  catch (e) { console.log((e.stdout || '').split('\n').slice(4).join('\n').slice(0, 6000)); }
}
