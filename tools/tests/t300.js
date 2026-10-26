// t300 — CU-162: pooled eyes come back at their authored brightness, and a death fades from it.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const eyes = (z) => (z && z.mesh && z.mesh.userData.eyeMats) || [];
  try {
    await startMatch(T, 'Eyes');
    const p = T.player.position;
    const spawn = (type) => T.spawnZombie(p.x + 4, p.z + 2, type, true, true);
    const a = spawn('shambler');
    const mats = eyes(a);
    ok(!!a && mats.length > 0, 'a shambler has eyes (' + mats.length + ')');
    const id = a.mesh.uuid;
    for (const m of mats) { m.userData.baseEmissive = 0.9; m.emissiveIntensity = 0; }
    T.clearZombies();
    const b = spawn('shambler');
    ok(b.mesh.uuid === id, 'the same body came back from the pool');
    ok(eyes(b).every((m) => m.emissiveIntensity === 0.9), 'it came back at the authored 0.9, not 1.7');
    for (const m of eyes(b)) { delete m.userData.baseEmissive; m.emissiveIntensity = 0.2; }
    T.clearZombies();
    const c = spawn('shambler');
    ok(eyes(c).every((m) => Math.abs(m.emissiveIntensity - 1.7) < 1e-6), 'an eye with no baseline falls back to 1.7');
    for (const m of eyes(c)) { m.userData.baseEmissive = 1.8; m.emissiveIntensity = 0; }
    T.clearZombies();
    const d = spawn('shambler');
    ok(eyes(d).every((m) => m.emissiveIntensity === 1.8), 'Bluebell\'s 1.8 baseline stays 1.8');
    T.clearZombies();
    const s = spawn('screamer');
    const sm = eyes(s);
    ok(!!s && sm.length > 0, 'a screamer has eyes (' + sm.length + ')');
    const sid = s.mesh.uuid;
    const base = sm.map((m) => (m.userData.baseEmissive == null ? 1.7 : +m.userData.baseEmissive));
    for (const m of sm) m.emissiveIntensity = 0;
    T.clearZombies();
    const s2 = spawn('screamer');
    ok(s2.mesh.uuid === sid, 'the screamer\'s body came back from the pool');
    ok(eyes(s2).every((m, i) => m.emissiveIntensity === base[i]), 'the screamer came back at ' + base.join(',') + ', got ' + eyes(s2).map((m) => m.emissiveIntensity).join(','));
    const em = eyes(s2)[0];
    const start = em.emissiveIntensity;
    T.killZombie(s2, false);
    for (let i = 0; i < 30; i++) T.updateCorpsesDbg(0.1);
    ok(em.emissiveIntensity < start, 'the death fade starts from the authored brightness (' + start + ' -> ' + em.emissiveIntensity + ')');
    ok(em.emissiveIntensity >= 0 && em.emissiveIntensity <= start, 'the fade stays between 0 and that baseline');
  } catch (e) {
    ok(false, 'threw ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
