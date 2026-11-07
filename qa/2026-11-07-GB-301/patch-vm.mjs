import fs from 'node:fs';
const file = 'game/viewmodel.js';
let t = fs.readFileSync(file, 'utf8');
const nl = t.includes('\r\n') ? '\r\n' : '\n';
function rep(from, to, label) {
  from = from.replace(/\n/g, nl); to = to.replace(/\n/g, nl);
  if (!t.includes(from)) throw new Error('missing ' + label);
  const p = t.split(from);
  if (p.length !== 2) throw new Error('not unique ' + label + ' ' + (p.length - 1));
  t = p[0] + to + p[1];
}
rep(
`      gun.bolt.updateMatrix();
      const grab = (VM_SOCKETS.sniper && VM_SOCKETS.sniper.boltKnob)
        ? null
        : null;
      // Prefer the live bolt part's grab (moves with lift/pull); fall back to authored boltKnob in gun space.
      const _bat = _pat, _bz = _pz, _by = _py;
      if (gun.bolt) {
        _bat.set(-0.075, 0.012, 0.02).applyMatrix4(gun.bolt.matrix);
      } else {
        _bat.set(-0.13, 0.067, -0.16);
      }`,
`      gun.bolt.updateMatrix();
      // Live bolt part grab (moves with lift/pull).
      const _bat = _pat, _bz = _pz, _by = _py;
      _bat.set(-0.075, 0.012, 0.02).applyMatrix4(gun.bolt.matrix);`,
'clean grab');
rep(
`      if (FOL) follow(WL, eL);
      else if (REL) rel(WL, REL.l, eL);
      twistToward(arms.l, WL, eL); info.handPlace = 'fore';
    }`,
`      if (FOL) follow(WL, eL);
      else if (REL) rel(WL, REL.l, eL);
      twistToward(arms.l, WL, eL); info.handPlace = boltW > 0 ? 'bolt' : 'fore';
    }`,
'handPlace bolt keep');
fs.writeFileSync(file, t);
console.log('patched ok');
