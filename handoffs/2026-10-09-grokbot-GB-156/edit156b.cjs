// GB-156 pass 2: the right hand's channel blends (no wrist flip between phases), the shin's 1 cm forward offset in the
// knee angle, a reach flag on each foot for the probe, the grab closes the fingers over its length.
const fs = require('fs'), crypto = require('crypto');
const F = 'index.html', WRITE = process.argv.includes('--write');
const read = () => fs.readFileSync(F, 'utf8');
const src = read(), h0 = crypto.createHash('sha1').update(src).digest('hex');
const eol = src.includes('\r\n') ? '\r\n' : '\n', fix = (s) => s.replace(/\r?\n/g, eol);
const edits = [], rep = (name, a, b) => edits.push({ name, a: fix(a), b: fix(b) });
rep('knee',
`        const L = legReach(t.x, t.y, t.z, _crew.leg);
        const turn`,
`        const L = legReach(t.x, t.y, t.z, _crew.leg);
        ft.reach = L.reach;
        const knee = L.knee + 0.04;   // the ankle sits 1 cm forward of the shin's line (studio/marine-body.js), 0.04 rad
        const turn`);
rep('knee2',
`        knees[i].quaternion.slerp(_crew.q.setFromAxisAngle(_crew.ax, L.knee), w);
        _crew.q.setFromAxisAngle(_crew.ax, -L.thigh - L.knee)`,
`        knees[i].quaternion.slerp(_crew.q.setFromAxisAngle(_crew.ax, knee), w);
        _crew.q.setFromAxisAngle(_crew.ax, -L.thigh - knee)`);
rep('channel',
`      const ch = ph === 'reach' || ph === 'grab' ? C.ch.set(0, -1, 0) : C.ch.copy(axis);`,
`      const toPack = ph === 'reach' ? lu : ph === 'grab' ? 1 : ph === 'bring' ? 1 - lu : 0;
      const ch = C.ch.copy(axis).lerp(C.c.set(0, -1, 0), toPack).normalize();`);
rep('curl',
`      const open = ph === 'clear' ? 1 - Math.min(1, L.t / 0.12) : ph === 'reach' ? 0.35 : 1;`,
`      const open = ph === 'clear' ? 1 - Math.min(1, L.t / 0.12) : ph === 'reach' ? 0.35 : ph === 'grab' ? 0.35 + 0.65 * lu : 1;`);
let out = src, bad = 0;
for (const e of edits) { const n = out.split(e.a).length - 1; if (n !== 1) { console.log('MATCH', e.name, n); bad++; continue; } out = out.replace(e.a, () => e.b); }
if (bad) { console.log('not written'); process.exit(1); }
console.log('edits ok:', edits.length);
if (WRITE) { if (crypto.createHash('sha1').update(read()).digest('hex') !== h0) { console.log('changed; not written'); process.exit(2); } fs.writeFileSync(F, out, 'utf8'); console.log('written'); }
