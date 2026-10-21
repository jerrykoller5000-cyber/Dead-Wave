// GB-177: replace one exact contiguous block in index.html (must match once); re-read before write; keeps CRLF, no BOM.
import fs from 'node:fs';
const [s] = JSON.parse(fs.readFileSync(new URL('./idxspec.json', import.meta.url), 'utf8'));
const before = fs.readFileSync(s.file, 'utf8');
if (before.charCodeAt(0) === 0xfeff) throw new Error('BOM');
const eol = before.includes('\r\n') ? '\r\n' : '\n', lines = before.split(eol);
const hits = []; for (let i = 0; i + s.oldBlock.length <= lines.length; i++) if (s.oldBlock.every((l, k) => lines[i + k] === l)) hits.push(i);
if (hits.length !== 1) { console.error('block matches', hits.length); process.exit(1); }
lines.splice(hits[0], s.oldBlock.length, ...s.new);
if (fs.readFileSync(s.file, 'utf8') !== before) { console.error('changed under us'); process.exit(1); }
fs.writeFileSync(s.file, lines.join(eol), 'utf8'); console.log('patched', s.file, 'at line', hits[0] + 1);
