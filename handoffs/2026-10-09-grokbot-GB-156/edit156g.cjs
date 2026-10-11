// GB-156 pass 7: when the right hand cannot reach the hold over the muzzle, the body eases toward the tube by what it
// missed (a lean in, at most 30 cm, gone again once the round is down); the Watchman lets go linearly over 0.5 s.
const fs = require('fs'), crypto = require('crypto');
const F = 'index.html', WRITE = process.argv.includes('--write');
const src = fs.readFileSync(F, 'utf8'), h0 = crypto.createHash('sha1').update(src).digest('hex');
const eol = src.includes('\r\n') ? '\r\n' : '\n', fix = (s) => s.replace(/\r?\n/g, eol);
const edits = [], rep = (name, a, b) => edits.push({ name, a: fix(a), b: fix(b) });
rep('apply-fix',
`      if (fr && ea < 1) { ox += (fr.x - player.position.x) * (1 - ea); oz += (fr.z - player.position.z) * (1 - ea); }`,
`      if (fr && ea < 1) { ox += (fr.x - player.position.x) * (1 - ea); oz += (fr.z - player.position.z) * (1 - ea); }
      const fx = C.fix || (C.fix = new THREE.Vector3());
      ox += fx.x * W; oz += fx.z * W;`);
rep('apply-fixy',
`      marine.position.y -= CREW_STANCE.mortar.drop * W * (1 - MORTAR_KNEEL.rise * (C.rise || 0));`,
`      marine.position.y -= CREW_STANCE.mortar.drop * W * (1 - MORTAR_KNEEL.rise * (C.rise || 0));
      marine.position.y += fx.y * W;`);
rep('measure',
`      holdHand(u.armLG, u.elbowLG, _HAND_L, P.restL, axis, 1, _POLE_L, W, 1, W);`,
`      holdHand(u.armLG, u.elbowLG, _HAND_L, P.restL, axis, 1, _POLE_L, W, 1, W);
      // Out of reach of the hold: lean the body in by part of the miss each frame (applied from the next frame), back
      // out once the round has gone.
      {
        const wr = wristOf(u.elbowRG);
        if (wr && (ph === 'bring' || ph === 'ready') && W > 0.9) {
          player.updateMatrixWorld(true);
          const miss = wr.localToWorld(C.b.copy(wr.userData.grip || _HAND_R).sub(wr.position)).sub(hand).negate();
          fx.addScaledVector(miss, 0.25 * (ph === 'ready' ? 1 : lu));
          const hz = Math.hypot(fx.x, fx.z); if (hz > 0.3) { fx.x *= 0.3 / hz; fx.z *= 0.3 / hz; }
          fx.y = Math.max(-0.05, Math.min(0.15, fx.y));
        } else fx.multiplyScalar(Math.exp(-6 * dt));
      }`);
rep('release',
`      _watchman.weight = f ? f.weight : _watchman.weight * Math.exp(-7 * dt);   // GB-156: let go at half the rate (-14), no hand snap`,
`      _watchman.weight = f ? f.weight : Math.max(0, _watchman.weight - dt / 0.5);   // GB-156: let go evenly over 0.5 s (was exp(-14 dt), a hand snap)`);
let out = src, bad = 0;
for (const e of edits) { const n = out.split(e.a).length - 1; if (n !== 1) { console.log('MATCH', e.name, n); bad++; continue; } out = out.replace(e.a, () => e.b); }
if (bad) { console.log('not written'); process.exit(1); }
console.log('edits ok:', edits.length);
if (WRITE) { if (crypto.createHash('sha1').update(fs.readFileSync(F, 'utf8')).digest('hex') !== h0) { console.log('changed; not written'); process.exit(2); } fs.writeFileSync(F, out, 'utf8'); console.log('written'); }
