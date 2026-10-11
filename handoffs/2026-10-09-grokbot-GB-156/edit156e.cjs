// GB-156 pass 5: the crouch spot is taken from the tube (the root is pushed back out of the baseplate's footprint by a
// varying amount, so an offset from the root left the round out of reach of the muzzle); the Watchman's hands are
// solved again once the root has settled; its step-in and step-off are slower (0.38 s -> 0.6 s; release eased at half
// the rate), so hands and feet never race.
const fs = require('fs'), crypto = require('crypto');
const files = { 'index.html': [], 'game/watchman-mg.js': [] };
const eolOf = (s) => (s.includes('\r\n') ? '\r\n' : '\n');
const rep = (f, name, a, b) => files[f].push({ name, a, b });
rep('index.html', 'kneel-const',
`    const MORTAR_KNEEL = { side: 0.52, fwd: 0.9, yaw: 0.6, inS: 0.75, outS: 0.62, lean: 0.36, leaveS: 0.55 };`,
`    const MORTAR_KNEEL = { side: 0.5, back: -0.22, yaw: 0.8, inS: 0.75, outS: 0.62, lean: 0.42, leaveS: 0.55 };`);
rep('index.html', 'kneel-spot',
`      const kx = rs * MORTAR_KNEEL.side * W, kz = MORTAR_KNEEL.fwd * W;
      let ox = c * kx + s * kz, oz = -s * kx + c * kz;`,
`      // The crouch spot, in the tube's own frame (his right of it, a little behind its centre), whatever the root did.
      const kx = rs * MORTAR_KNEEL.side, kz = MORTAR_KNEEL.back;
      let ox = (m.x + c * kx + s * kz - player.position.x) * W, oz = (m.z - s * kx + c * kz - player.position.z) * W;`);
rep('index.html', 'wm-late-store',
`          watchmanHands(e, right, left, w, w);
        }`,
`          watchmanHands(e, right, left, w, w);
          _watchman.late = [e, right, left, w];   // GB-156: solved again once the root has settled (crewLateFeet)
        }`);
rep('index.html', 'wm-late-use',
`      if (w > 0.001 && !mortarCarried && !playerSwimming) crewFeet(u, CREW_STANCE.m240, w, dt, _watchman.plant);
      else _watchman.plant.feet = null;`,
`      if (w > 0.001 && !mortarCarried && !playerSwimming) crewFeet(u, CREW_STANCE.m240, w, dt, _watchman.plant);
      else _watchman.plant.feet = null;
      const H = _watchman.late; _watchman.late = null;
      if (H && mortarMounted?.type === 'm240' && H[3] > 0.001) watchmanHands(H[0], H[1], H[2], H[3], H[3]);`);
rep('index.html', 'wm-release',
`      _watchman.weight = f ? f.weight : _watchman.weight * Math.exp(-14 * dt);`,
`      _watchman.weight = f ? f.weight : _watchman.weight * Math.exp(-7 * dt);   // GB-156: let go at half the rate (-14), no hand snap`);
rep('game/watchman-mg.js', 'mountS',
`  mountS: 0.38, carryS: 0.58,`,
`  mountS: 0.6, carryS: 0.58,   // GB-156: 0.38 s raced his hands and feet onto the gun`);
const WRITE = process.argv.includes('--write');
const plan = [];
let bad = 0;
for (const [f, eds] of Object.entries(files)) {
  const src = fs.readFileSync(f, 'utf8'), eol = eolOf(src), h0 = crypto.createHash('sha1').update(src).digest('hex');
  let out = src;
  for (const e of eds) { const a = e.a.replace(/\r?\n/g, eol), b = e.b.replace(/\r?\n/g, eol); const n = out.split(a).length - 1; if (n !== 1) { console.log('MATCH', f, e.name, n); bad++; continue; } out = out.replace(a, () => b); }
  plan.push({ f, out, h0 });
}
if (bad) { console.log('not written'); process.exit(1); }
console.log('edits ok');
if (WRITE) for (const p of plan) { if (crypto.createHash('sha1').update(fs.readFileSync(p.f, 'utf8')).digest('hex') !== p.h0) { console.log('changed:', p.f); process.exit(2); } fs.writeFileSync(p.f, p.out, 'utf8'); console.log('written', p.f); }
