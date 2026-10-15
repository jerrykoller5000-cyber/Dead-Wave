// GB-173: apply spec.json (exact-line replacements) to the files as they are on disk now; every anchor must match
// exactly once, and each file is re-read right before its write (unchanged-file check). Keeps EOL, no BOM.
import fs from 'node:fs';
const spec = JSON.parse(fs.readFileSync(new URL('./spec.json', import.meta.url), 'utf8'));
const byFile = {};
for (const s of spec) (byFile[s.file] ||= []).push(s);
let bad = 0; const out = {};
for (const [file, list] of Object.entries(byFile)) {
  const before = fs.readFileSync(file, 'utf8');
  if (before.charCodeAt(0) === 0xfeff) { console.error(file, 'has a BOM'); process.exit(1); }
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  let lines = before.split(eol);
  for (const s of list) {
    const hits = lines.map((l, i) => (l === s.old ? i : -1)).filter((i) => i >= 0);
    if (hits.length !== 1) { console.error(file, 'anchor x' + hits.length + ':', s.old.slice(0, 90)); bad++; continue; }
    lines.splice(hits[0], 1, ...s.new);
  }
  out[file] = { before, next: lines.join(eol) };
}
if (bad) { console.error(bad, 'anchors failed; nothing written'); process.exit(1); }
for (const [file, { before, next }] of Object.entries(out)) {
  if (fs.readFileSync(file, 'utf8') !== before) { console.error(file, 'changed under us; nothing written for it'); process.exit(1); }
  fs.writeFileSync(file, next, 'utf8'); console.log('patched', file);
}
