// GB-156 pass 6: the 60 mm here is a long tube (muzzle ~1.1 m up), so he rises out of the crouch to bring the round up
// and hold it over the muzzle, and sinks back as he clears; the crouch spot is beside the tube's middle.
const fs = require('fs'), crypto = require('crypto');
const F = 'index.html', WRITE = process.argv.includes('--write');
const src = fs.readFileSync(F, 'utf8'), h0 = crypto.createHash('sha1').update(src).digest('hex');
const eol = src.includes('\r\n') ? '\r\n' : '\n', fix = (s) => s.replace(/\r?\n/g, eol);
const edits = [], rep = (name, a, b) => edits.push({ name, a: fix(a), b: fix(b) });
rep('const',
`    const MORTAR_KNEEL = { side: 0.5, back: -0.22, yaw: 0.8, inS: 0.75, outS: 0.62, lean: 0.42, leaveS: 0.55 };`,
`    const MORTAR_KNEEL = { side: 0.44, back: -0.06, yaw: 0.8, inS: 0.75, outS: 0.62, lean: 0.42, leaveS: 0.55, rise: 0.8 };`);
rep('dip',
`      marine.position.y -= CREW_STANCE.mortar.drop * W;`,
`      marine.position.y -= CREW_STANCE.mortar.drop * W * (1 - MORTAR_KNEEL.rise * (C.rise || 0));`);
rep('rise',
`      const lu = mortarLoadU(L), ph = L.phase;`,
`      const lu = mortarLoadU(L), ph = L.phase;
      // Up out of the crouch with the round, down again once it is gone (this frame's body height is set next frame).
      C.rise = ph === 'bring' ? lu : ph === 'ready' ? 1 : ph === 'clear' ? 1 - lu : 0;`);
let out = src, bad = 0;
for (const e of edits) { const n = out.split(e.a).length - 1; if (n !== 1) { console.log('MATCH', e.name, n); bad++; continue; } out = out.replace(e.a, () => e.b); }
if (bad) { console.log('not written'); process.exit(1); }
console.log('edits ok:', edits.length);
if (WRITE) { if (crypto.createHash('sha1').update(fs.readFileSync(F, 'utf8')).digest('hex') !== h0) { console.log('changed; not written'); process.exit(2); } fs.writeFileSync(F, out, 'utf8'); console.log('written'); }
