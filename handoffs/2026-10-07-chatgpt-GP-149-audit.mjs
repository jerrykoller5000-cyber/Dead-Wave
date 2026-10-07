import fs from 'node:fs';
import assert from 'node:assert/strict';

// Reuse CL-132's detector without launching the game or its full test runner.
const guard = fs.readFileSync('tools/tests/t215.js', 'utf8');
const pattern = guard.slice(guard.indexOf('  const CONT ='), guard.indexOf('  const scan ='));
assert(pattern.includes('const MOJI ='));
const moji = new Function(pattern + '; return MOJI;')();
const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e =>
  e.isDirectory() ? walk(dir+'/'+e.name) : [dir+'/'+e.name]);
const ui = walk('ui').filter(p => /\.(js|mjs|html|css|json)$/.test(p));
const fixtures = fs.readdirSync('handoffs').filter(n => /^2026-10-06-chatgpt-.*browser\.mjs$/.test(n)).map(n=>'handoffs/'+n);
const files = ['index.html', ...ui, ...fixtures], failures = [];
for (const path of files) {
  const source = new TextDecoder('utf-8', {fatal:true}).decode(fs.readFileSync(path));
  // Check literal text and escaped assertion strings, not just how the source prints.
  const decoded = source.replace(/\\u\{([0-9a-f]{1,6})\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/gi,
    (_,a,b,c)=>String.fromCodePoint(parseInt(a||b||c,16)));
  for (const [kind,text] of [['literal',source],['escaped',decoded]]) {
    moji.lastIndex=0;
    if (moji.test(text) || text.includes('\uFFFD')) failures.push({path,kind});
  }
}
assert.deepEqual(failures,[]);
console.log(`PASS UTF-8 + CL-132 detector: ${files.length} files; ${ui.length} UI files including ${ui.filter(p=>p.endsWith('.browser.mjs')).length} browser checks; ${fixtures.length} recent handoff fixtures; no broken literal/escaped expectations or replacement characters`);
