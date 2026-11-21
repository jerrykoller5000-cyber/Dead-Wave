import fs from 'node:fs';
import path from 'node:path';

const idx = fs.readFileSync('index.html', 'utf8').split(/\r?\n/);

console.log('=== STARS / STARFIELD IN INDEX.HTML OR WORLD/ ===');
idx.forEach((l, i) => {
  if (/(PointsMaterial|PointsNodeMaterial|new THREE\.Points\b|starGeo|starMat|makeStars)/i.test(l)) {
    console.log(`index.html:${i + 1}: ${l.trim().slice(0, 150)}`);
  }
});

for (const dir of ['world', 'core', 'ui']) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!/\.(js|css)$/.test(f)) continue;
    const lines = fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/);
    lines.forEach((l, i) => {
      if (/(PointsMaterial|PointsNodeMaterial|new THREE\.Points\b|25AE|\\25ae|▮|text-overflow:\s*ellipsis)/i.test(l)) {
        console.log(`${dir}/${f}:${i + 1}: ${l.trim().slice(0, 150)}`);
      }
    });
  }
}
