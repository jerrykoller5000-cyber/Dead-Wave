import fs from 'fs';
const p = process.argv[2], o = process.argv[3];
const s = fs.readFileSync(p, 'utf8');
const m = [...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
let best = ''; for (const x of m) if (x[1].length > best.length) best = x[1];
if (o) fs.writeFileSync(o, best);
const lines = best.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('//'));
const seen = new Set(); let dup = 0;
for (let i = 0; i + 3 < lines.length; i++) { const k = lines.slice(i, i + 4).join('\u0001'); if (k.length < 60) continue; if (seen.has(k)) dup++; else seen.add(k); }
console.log(p, 'chars', best.length, 'dup', dup);
