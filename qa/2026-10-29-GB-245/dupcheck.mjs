import fs from 'fs';
const s = fs.readFileSync('qa/2026-10-29-GB-245/inline.check.mjs', 'utf8');
// duplicate-block scan: any 4-line window that appears more than once
const lines = s.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('//'));
const seen = new Map(); const dup = [];
for (let i = 0; i + 3 < lines.length; i++) {
  const key = lines.slice(i, i + 4).join('\u0001');
  if (key.length < 60) continue;
  if (seen.has(key)) dup.push([seen.get(key), lines[i].slice(0, 90)]); else seen.set(key, lines[i].slice(0, 90));
}
console.log('4-line duplicates: ' + dup.length);
for (const d of dup.slice(0, 8)) console.log('  ' + d[0] + '  ||  ' + d[1]);
// the new hip-path line must appear exactly once
const n = (s.match(/off\.x \+= \(rl\.side \|\| 0\) \* rw/g) || []).length;
console.log('new hip-path line count: ' + n);
const n2 = (s.match(/const rl = fpReloadSet\(\), rw = fpReloadLiftW;/g) || []).length;
console.log('its own local count: ' + n2);
