import fs from 'fs';
const s = fs.readFileSync('index.html', 'utf8');
// the game's inline module script: the last <script type="module"> ... </script>
const m = [...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
console.log('scripts: ' + m.length);
let best = null;
for (const x of m) { if (!best || x[1].length > best[1].length) best = x; }
console.log('largest script chars: ' + best[1].length);
fs.writeFileSync('qa/2026-10-29-GB-248/inline.check.mjs', best[1]);
