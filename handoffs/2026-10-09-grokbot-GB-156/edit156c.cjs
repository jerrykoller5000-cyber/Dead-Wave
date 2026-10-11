// GB-156 pass 3: the player's own matrix brought up to date before the body offset (it was a frame stale on the mount
// frame, so the body jumped), the hands give with the tube's kick instead of riding its instant 16 cm drop.
const fs = require('fs'), crypto = require('crypto');
const F = 'index.html', WRITE = process.argv.includes('--write');
const read = () => fs.readFileSync(F, 'utf8');
const src = read(), h0 = crypto.createHash('sha1').update(src).digest('hex');
const eol = src.includes('\r\n') ? '\r\n' : '\n', fix = (s) => s.replace(/\r?\n/g, eol);
const edits = [], rep = (name, a, b) => edits.push({ name, a: fix(a), b: fix(b) });
rep('stale',
`      const par = marine.parent;
      par.updateMatrixWorld(true);`,
`      const par = marine.parent;
      player.updateMatrixWorld(true);`);
rep('kick',
`      const onTube = (y, out) => tube.localToWorld(out.set(0, y, 0)).addScaledVector(toMe, 0.135);`,
`      // The tube's kick drops it 16 cm in a frame and eases it back (updateMortar); the hands give a quarter of that.
      const kick = Math.max(0, 0.62 - tube.position.y) * 0.75;
      const onTube = (y, out) => tube.localToWorld(out.set(0, y, 0)).addScaledVector(toMe, 0.135).addScaledVector(_crew.ay, kick);`);
let out = src, bad = 0;
for (const e of edits) { const n = out.split(e.a).length - 1; if (n !== 1) { console.log('MATCH', e.name, n); bad++; continue; } out = out.replace(e.a, () => e.b); }
if (bad) { console.log('not written'); process.exit(1); }
console.log('edits ok:', edits.length);
if (WRITE) { if (crypto.createHash('sha1').update(read()).digest('hex') !== h0) { console.log('changed; not written'); process.exit(2); } fs.writeFileSync(F, out, 'utf8'); console.log('written'); }
