import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'));
if (html[0] === 0xEF) throw new Error('BOM');
const t = html.toString('utf8');
const m = t.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!m) throw new Error('no module script');
const inline = path.join(ROOT, 'qa/2026-11-07-GB-317/inline.check.mjs');
fs.writeFileSync(inline, m[1]);
const chk = spawnSync(process.execPath, ['--check', inline], { encoding: 'utf8' });
console.log('node --check', chk.status === 0 ? 'PASS' : 'FAIL', 'chars', m[1].length);
if (chk.status !== 0) { console.log(chk.stderr || chk.stdout); process.exit(1); }
// duplicate 6-line blocks (non-trivial)
const lines = t.split(/\r?\n/);
const map = new Map();
for (let i = 0; i + 5 < lines.length; i++) {
  const block = lines.slice(i, i + 6).join('\n');
  if (block.replace(/\s+/g, '').length < 60) continue;
  const arr = map.get(block) || [];
  arr.push(i + 1);
  map.set(block, arr);
}
const dups = [...map.values()].filter((a) => a.length > 1);
console.log('dup 6-line blocks', dups.length);
console.log('BOM none; CRLF', (t.match(/\r\n/g) || []).length);