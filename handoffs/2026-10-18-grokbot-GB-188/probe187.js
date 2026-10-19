const zz = (ms) => new Promise((r) => setTimeout(r, ms));
const VV = () => T.aimTarget.clone().set(0, 0, 0);
const out = [];
T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
const pin = () => { const p = T.player.position; T.aimTarget.set(p.x, T.sampleHeight(p.x, p.z) + 1.25, p.z + 10); };
const aimer = setInterval(pin, 5); pin();
for (const w of ['m4', 'shotgun', 'launcher']) {
  for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
  await zz(3500);
  for (const z of [false, true]) {
    T.setZoomHeldDbg(z); await zz(1500);
    const g = T.weaponMeshes[w]; g.updateMatrixWorld(true);
    const fwd = VV().set(0, 0, 1).transformDirection(g.matrixWorld), muz = g.localToWorld(g.userData.muzzleLocal.clone());
    const ang = (p) => (Math.acos(Math.max(-1, Math.min(1, fwd.dot(VV().subVectors(p, muz).normalize())))) * 180 / Math.PI).toFixed(2);
    const D = T.getShoulderDbg(), wp = T.getWeaponAimDbg();
    out.push(w + (z ? ' zoom' : ' hip') + ': vs aimTarget ' + ang(T.aimTarget) + ', vs weaponAim ' + ang(wp) + ', vs its aimT ' + ang(D.aimT) + ', ads ' + D.ads.toFixed(2) + ', aimF.fwd ' + fwd.dot(D.aimF).toFixed(4) + ', wp-at ' + wp.distanceTo(T.aimTarget).toFixed(3));
  }
  T.setZoomHeldDbg(false);
}
clearInterval(aimer);
return out.join('\n');
