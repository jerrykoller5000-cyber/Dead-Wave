import fs from 'node:fs';
const f = 'qa/2026-11-07-GB-301/probe-after.mjs';
let t = fs.readFileSync(f, 'utf8');
t = t.replace(
  "fs.writeFileSync(path.join(OUT, 'after-shot-bolt.png'), await page.screenshot());",
  "await page.screenshot(path.join(OUT, 'after-shot-bolt.png'));"
);
t = t.replace(
  "fs.writeFileSync(path.join(OUT, 'after-reload-u75.png'), await page.screenshot());",
  "await page.screenshot(path.join(OUT, 'after-reload-u75.png'));"
);
fs.writeFileSync(f, t);
console.log('screenshot calls fixed');
