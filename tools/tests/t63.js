(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    ok(!!T.BLADE_STATS && !!T.BLADE_STATS.knife, 'BLADE_STATS exported');
    const k = T.BLADE_STATS.knife;
    // GB-52: the recovery went from 0.42 to 0.55 s (Jerry: still a bit too strong).
    ok(k.dmg === 22 && k.cd === 0.55 && k.reach === 2.4 && k.arc === 0.40 && k.maxHits === 2,
      'knife stats nerfed (dmg/cd/reach/arc/maxHits) got ' + JSON.stringify(k));

    await startMatch(T, 'Knife');
    const hold = () => {
      const x = 10, z = 10;
      T.player.position.set(x, T.sampleHeight(x, z), z);
    };
    hold(); await wait(80); hold();
    const px = () => T.player.position.x, pz = () => T.player.position.z;
    T.setAimYawDbg(0);

    const s = T.spawnZombie(px(), pz() + 2.0, 'shambler', true, true);
    if (s) { s.mesh.position.set(px(), T.sampleHeight(px(), pz() + 2.0), pz() + 2.0); s.hp = 24; s.maxHp = 24; }
    hold(); await wait(30);
    if (T.setKnifeCd) T.setKnifeCd(0);
    hold(); T.knifeAttack(); await wait(20); hold();
    ok(!!s && s.alive && s.hp < 24 && s.hp > 0, 'first swing wounds shambler (hp=' + (s && s.hp) + ')');
    if (T.setKnifeCd) T.setKnifeCd(0);
    hold(); T.knifeAttack(); await wait(20);
    ok(!!s && !s.alive, 'second swing kills shambler');

    const pack = [];
    for (let i = 0; i < 8; i++) {
      const ang = -0.7 + (i / 7) * 1.4;
      const x = px() + Math.sin(ang) * 2.0;
      const z = pz() + Math.cos(ang) * 2.0;
      const zom = T.spawnZombie(x, z, 'shambler', true, true);
      if (zom) {
        zom.mesh.position.set(x, T.sampleHeight(x, z), z);
        zom.hp = 24; zom.maxHp = 24;
        pack.push(zom);
      }
    }
    hold(); await wait(30);
    if (T.setKnifeCd) T.setKnifeCd(0);
    hold(); T.knifeAttack(); await wait(25); hold();
    const hit = pack.filter(z => !z.alive || z.hp < 23.5).length;
    ok(hit > 0 && hit <= 2, 'one swing hits at most 2 (hit=' + hit + ')');
    pack.forEach(z => { if (z.alive) T.killZombie(z, true, { kind: 'bullet', dir: { x: 0, z: 1 } }); });

    hold(); await wait(40); hold();
    T.setAimYawDbg(0);
    const fx = px(), fz = pz() + 1.8;
    const f = T.spawnZombie(fx, fz, 'feral', true, true);
    if (f) {
      f.mesh.position.set(fx, T.sampleHeight(fx, fz), fz);
      f.hp = 15; f.maxHp = 15;
    }
    hold(); await wait(20);
    if (T.setKnifeCd) T.setKnifeCd(0);
    hold();
    const d = f ? Math.hypot(f.mesh.position.x - px(), f.mesh.position.z - pz()) : -1;
    T.knifeAttack(); await wait(20);
    ok(!!f && !f.alive, 'feral still one-shot (d=' + d.toFixed(2) + ' hpLeft=' + (f && f.hp) + ')');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
