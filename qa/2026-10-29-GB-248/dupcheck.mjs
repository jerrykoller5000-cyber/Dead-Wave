import fs from 'fs';
function scan(path) {
  const s = fs.readFileSync(path, 'utf8');
  const m = [...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
  let best = ''; for (const x of m) if (x[1].length > best.length) best = x[1];
  const lines = best.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('//'));
  const seen = new Map(); let dup = 0;
  for (let i = 0; i + 3 < lines.length; i++) {
    const key = lines.slice(i, i + 4).join('\u0001');
    if (key.length < 60) continue;
    if (seen.has(key)) dup++; else seen.set(key, 1);
  }
  return { chars: best.length, lines: lines.length, dup };
}
const a = scan('qa/2026-10-29-GB-248/index.before.html');
const b = scan('index.html');
console.log('before  ' + JSON.stringify(a));
console.log('after   ' + JSON.stringify(b));
console.log('duplicates added: ' + (b.dup - a.dup));
