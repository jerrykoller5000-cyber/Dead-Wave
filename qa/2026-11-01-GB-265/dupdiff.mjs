import fs from 'node:fs';
function dups(file) { const s = fs.readFileSync(file, 'utf8'); const lines = s.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('//'));
  const seen = new Map(), out = new Set(); for (let i = 0; i + 3 < lines.length; i++) { const k = lines.slice(i, i + 4).join('\u0001'); if (k.length < 60) continue; if (seen.has(k)) out.add(k); else seen.set(k, 1); } return out; }
const a = dups('qa/2026-11-01-GB-265/inline.before.mjs'), b = dups('qa/2026-11-01-GB-265/inline.after.mjs');
for (const k of b) if (!a.has(k)) console.log('NEW:\n  ' + k.split('\u0001').join('\n  '));