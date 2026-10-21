// t245 - CU-106 (Jerry: corpses all sprawl the same way). Ten death poses, chosen from how
// he died: a chest shot sprawls on his back, a shot in the back lands him on his face, a
// low hit reaches, a headshot kneels or snaps the head back, a shell flings him or spreads
// him, a blade rolls him onto his side or twists him, fire curls him up. Two of one kind
// still differ a little, and the settled limbs of a sprawl are not a star's.
(async () => {
  const T = window.TT, out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const TEN = ['sprawl', 'facedown', 'reach', 'crumple', 'snap', 'flung', 'star', 'side', 'twist', 'fetal'];
  try {
    await startMatch(T, 'Deaths');
    T.clearZombies && T.clearZombies();
    const px = 14, pz = -6;
    T.levelGroundRect(px - 16, pz - 16, px + 16, pz + 16, T.sampleHeight(px, pz), 6);
    T.player.position.set(px, T.sampleHeight(px, pz), pz);
    await wait(200);
    let n = 0;
    const kill = (info, setup) => {
      const rnd = Math.random;
      const z = T.spawnZombie(px + (n % 5) * 2.2, pz + 4 + Math.floor(n / 5) * 2.2, 'shambler', true, true);
      n++;
      z.mesh.rotation.y = 0;
      z.hp = 30; z.maxHp = 30; z.riseT = 0;
      if (setup) setup(z);
      const mesh = z.mesh;
      Math.random = () => info._r == null ? 0 : info._r;
      try { T.killZombie(z, false, info); }
      finally { Math.random = rnd; }
      return T.corpses.find((c) => c.mesh === mesh);
    };
    const got = {};
    const expect = (info, pose, setup) => {
      const c = kill(info, setup);
      got[c && c.pose] = 1;
      ok(!!c && c.pose === pose, (info.kind || 'generic') + (info.headshot ? ' head' : '') + (info._why ? ' ' + info._why : '') + ' → ' + (c && c.pose) + ' (wanted ' + pose + ')');
      return c;
    };
    expect({ kind: 'bullet', dir: { x: 0, z: 1 }, _r: 0 }, 'sprawl');
    expect({ kind: 'bullet', dir: { x: 0, z: -1 }, _r: 0, _why: 'from behind' }, 'facedown');
    const low = expect({ kind: 'bullet', dir: { x: 0, z: 1 }, hitY: -100, _r: 0, _why: 'low' }, 'reach');
    ok(!!low, 'low shot made a corpse');
    expect({ kind: 'bullet', dir: { x: 0, z: 1 }, headshot: true, _r: 0 }, 'crumple');
    expect({ kind: 'bullet', dir: { x: 0, z: 1 }, headshot: true, _r: 0.9 }, 'snap');
    expect({ kind: 'pellet', dir: { x: 0, z: 1 }, _r: 0 }, 'flung');
    expect({ kind: 'pellet', dir: { x: 0, z: 1 }, _r: 0.9 }, 'star');
    expect({ kind: 'melee', dir: { x: 1, z: 0 }, _r: 0 }, 'side');
    expect({ kind: 'melee', dir: { x: 1, z: 0 }, _r: 0.9 }, 'twist');
    expect({ kind: 'generic', dir: { x: 0, z: 1 }, _r: 0 }, 'fetal', (z) => { z.burnT = 2; });
    expect({ kind: 'crush', dir: { x: 0, z: 1 }, _r: 0 }, 'facedown');
    ok(TEN.every((k) => got[k]), 'all ten poses showed up (' + TEN.filter((k) => !got[k]).join(', ') + ')');
    const side = T.corpses.find((c) => c.pose === 'side');
    const fetal = T.corpses.find((c) => c.pose === 'fetal');
    await wait(1400);
    const lean = (c) => c && c.mesh.userData.torso && c.mesh.userData.torso.rotation.x;
    ok(side && fetal && Math.abs(lean(fetal) - lean(side)) > 0.3, 'a burned corpse curls up instead of lying like a blade kill (torso ' + (lean(side) || 0).toFixed(2) + ' / ' + (lean(fetal) || 0).toFixed(2) + ')');
    const back = T.corpses.find((c) => c.pose === 'sprawl'), face = T.corpses.find((c) => c.pose === 'facedown'), rolled = T.corpses.find((c) => c.pose === 'side');
    ok(back && face && rolled && back.fallWay === 'back' && face.fallWay === 'forward' && rolled.fallWay === 'side', 'they tip onto the back, the face, or a side');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
