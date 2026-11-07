import fs from 'node:fs';
const p = 'qa/2026-11-07-GB-298/shots.mjs';
let t = fs.readFileSync(p, 'utf8');
const nl = t.includes('\r\n') ? '\r\n' : '\n';
const before = t;
const reps = [
  [
    /const hip = await page\.screenshot\(\{ format: 'png' \}\);\r?\n\s*fs\.writeFileSync\(path\.join\(OUT, `fp-\$\{gun\}-hip\.png`\), Buffer\.from\(hip, 'base64'\)\);/,
    "await page.screenshot(path.join(OUT, `fp-${gun}-hip.png`));"
  ],
  [
    /const ads = await page\.screenshot\(\{ format: 'png' \}\);\r?\n\s*fs\.writeFileSync\(path\.join\(OUT, `fp-\$\{gun\}-ads\.png`\), Buffer\.from\(ads, 'base64'\)\);/,
    "await page.screenshot(path.join(OUT, `fp-${gun}-ads.png`));"
  ],
  [
    /const fire = await page\.screenshot\(\{ format: 'png' \}\);\r?\n\s*fs\.writeFileSync\(path\.join\(OUT, `fp-\$\{gun\}-fire\.png`\), Buffer\.from\(fire, 'base64'\)\);/,
    "await page.screenshot(path.join(OUT, `fp-${gun}-fire.png`));"
  ],
];
let n = 0;
for (const [re, to] of reps) {
  if (!re.test(t)) { console.error('missing pattern', re); process.exit(1); }
  t = t.replace(re, to);
  n++;
}
if (nl === '\r\n') t = t.replace(/\r?\n/g, '\r\n');
fs.writeFileSync(p, t);
console.log('fixed', n, 'calls; bytes', Buffer.byteLength(t));
