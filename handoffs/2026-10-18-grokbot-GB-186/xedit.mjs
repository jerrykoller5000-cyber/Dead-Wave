// exact-line edits keeping each line's own ending: node xedit.mjs <file> <edits.json>
import fs from 'fs'; import crypto from 'crypto';
const [file, ej] = process.argv.slice(2);
const buf0 = fs.readFileSync(file); const h0 = crypto.createHash('sha1').update(buf0).digest('hex');
const txt = buf0.toString('utf8'); if (txt.charCodeAt(0) === 0xFEFF) throw new Error('BOM present');
const parts = txt.split(/(\r?\n)/); const lines = [], ends = [];
for (let i = 0; i < parts.length; i += 2) { lines.push(parts[i]); ends.push(parts[i + 1] ?? ''); }
const edits = JSON.parse(fs.readFileSync(ej, 'utf8'));
for (const e of edits) {
  const idx = lines.map((l, i) => l === e.old ? i : -1).filter(i => i >= 0);
  if (idx.length !== 1) throw new Error(`line matched ${idx.length}x: ${e.old.slice(0, 90)}`);
  const end = ends[idx[0]] || '\r\n';
  lines.splice(idx[0], 1, ...e.new); ends.splice(idx[0], 1, ...e.new.map(() => end));
}
const h1 = crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');
if (h0 !== h1) throw new Error('file changed under us; aborting');
fs.writeFileSync(file, Buffer.from(lines.map((l, i) => l + ends[i]).join(''), 'utf8'));
console.log('ok', file, edits.length, 'edits');
