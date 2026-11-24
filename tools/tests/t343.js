// t343 - CD-21b (Director 22 Nov 00:28Z, after CD-21 / Jerry D-236: no arms in unarmed first person): a grenade thrown while
// unarmed shows ONLY the throwing (left) hand and arm while the throw runs, then nothing again. First person, unarmed, G held
// and let go: from the grab to the end of the way back the view draws the left arm (glove, sleeve) and the grenade while it is
// in the hand, never the view gun or the right arm; before the throw and after it the view draws nothing (CD-21), and his
// body's arms stay out of the eye the whole time. Drawing a gun afterwards brings the view gun and both arms back.
// budget: 200
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Unarmed');
    T.clearZombies && T.clearZombies(); T.setHp && T.setHp(100000); T.grantAllWeapons && T.grantAllWeapons();
    const vm = () => T.viewmodelDbg();
    const m = T.getMarine(), ud = m.userData;
    const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
    const under = (o, r) => { for (let x = o; x; x = x.parent) if (x === r) return true; return false; };
    const armMeshes = () => { const s = []; for (const a of [ud.armLG, ud.armRG]) if (a) a.traverse((o) => { if ((o.isMesh || o.isSkinnedMesh) && vis(o) && !(o.userData && o.userData.isLaser)) s.push(o); }); return s; };
    // what the view draws, by owner: l (the left arm), r (the right arm), gun (the view gun), other (the grenade, ...)
    const drawn = () => { const V = vm(), c = { l: 0, r: 0, gun: 0, other: 0 }; if (!V || !V.root || !vis(V.root)) return c;
      V.root.traverse((o) => { if (!o.isMesh || !vis(o)) return; if (V.arms && under(o, V.arms.l.root)) c.l++; else if (V.arms && under(o, V.arms.r.root)) c.r++; else if (V.gun && under(o, V.gun.root)) c.gun++; else c.other++; });
      return c; };
    const step = (n) => { for (let i = 0; i < n; i++) T.stepFrame(1 / 60); };
    const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { code: 'KeyG', key: 'g', bubbles: true }));
    T.flightHold(true);
    T.setViewFirstDbg(true);
    if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'm4'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('m4')); step(10); }
    step(120);
    T.setUnarmedDbg(true); step(150);
    ok(T.isUnarmed(), 'unarmed');
    T.setGrenadesDbg && T.setGrenadesDbg(3);
    const d0 = drawn();
    ok(d0.l + d0.r + d0.gun + d0.other === 0, 'unarmed before the throw: the view draws nothing (' + JSON.stringify(d0) + ')');
    // hold G: the grab and the cock; let go: the throw and the way back
    key('keydown');
    const seen = {}; let bad = [], bodyIn = 0, frames = 0;
    const look = () => { const g = T.grenadeAnimDbg ? T.grenadeAnimDbg() : {}, ph = g.phase || '', d = drawn(); frames++;
      if (ph) { seen[ph] = seen[ph] || { n: 0, l: 0 }; seen[ph].n++; if (d.l > 0) seen[ph].l++; }
      if (d.r || d.gun) bad.push(ph + ':' + JSON.stringify(d));
      bodyIn = Math.max(bodyIn, armMeshes().filter((o) => !vm().isEyeHidden(o)).length); return ph; };
    for (let i = 0; i < 60 && look() !== 'cocked'; i++) step(1);
    step(6); look();
    key('keyup');
    for (let i = 0; i < 120 && look(); i++) step(1);
    ok(!!seen.raise && seen.raise.l === seen.raise.n && !!seen.cocked && seen.cocked.l === seen.cocked.n && !!seen.throw && seen.throw.l === seen.throw.n,
      'the throw (raise, cocked, throw): the left arm drawn every frame (' + JSON.stringify(seen) + ')');
    ok(bad.length === 0, 'never the view gun or the right arm (' + bad.length + (bad.length ? ': ' + bad.slice(0, 3).join(' ') : '') + ')');
    ok(bodyIn === 0, 'his body arms stay out of the eye through the throw (' + bodyIn + ' in it)');
    step(30);
    const d1 = drawn();
    ok(d1.l + d1.r + d1.gun + d1.other === 0, 'after the throw: the view draws nothing again (' + JSON.stringify(d1) + ')');
    T.setUnarmedDbg(false); step(150);
    const d2 = drawn();
    ok(vm().info.active && d2.gun > 0 && d2.l > 0 && d2.r > 0, 'drawn again: the view gun and both arms are back (' + JSON.stringify(d2) + ')');
    T.flightHold(false);
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
