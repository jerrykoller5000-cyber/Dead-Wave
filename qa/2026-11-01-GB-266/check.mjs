import fs from 'fs';
const [, , file, out] = process.argv;
const s = fs.readFileSync(file, 'utf8');
const m = [...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
let best = null; for (const x of m) if (!best || x[1].length > best[1].length) best = x;
fs.writeFileSync(out, best[1]);
const lines = best[1].split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('//'));
const seen = new Map(); let dup = 0;
for (let i = 0; i + 3 < lines.length; i++) { const k = lines.slice(i, i + 4).join('\u0001'); if (k.length < 60) continue; if (seen.has(k)) dup++; else seen.set(k, 1); }
console.log(file + ': scripts ' + m.length + ', inline chars ' + best[1].length + ', 4-line duplicate windows ' + dup + ', GB-266 marks ' + (best[1].match(/GB-266/g) || []).length);
