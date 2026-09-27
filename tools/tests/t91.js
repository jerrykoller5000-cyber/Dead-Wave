// t91 - GB-66 (P-71 with P-7; D-42): deaths fall the way they were hit. A zombie with a reacting body dies
// through body.kill: shot in the back it pitches forward, lies within 0.35 m of the ground and has settled
// (its joints' matrices frozen) within 4 s. A close shell kill throws the body 1-2 m back, and the small zombie
// behind it goes down as by a crush. With bodies off (or the pool full) today's topple plays, slides 1-2 m on a
// close shell, knocks the zombie behind down, and freezes once it has landed. 18 settled corpses cost no more
// per frame than 18 of today's toppling ones.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (+v).toFixed(2);
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message || e.error).slice(0, 600)));
  try {
    await startMatch(T, 'Corpses');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    T.runDevCommand('godmode');
    const px = 10, pz = 10;
    const hold = () => T.player.position.set(px, T.sampleHeight(px, pz), pz);
    T.levelGroundRect(px - 20, pz - 20, px + 20, pz + 20, T.sampleHeight(px, pz), 6);
    hold(); await wait(200); hold();
    const put = (kind, x, z, hp = 5000) => {
      const zz = T.spawnZombie(x, z, kind, true, true);
      zz.mesh.position.set(x, T.sampleHeight(x, z), z);
      zz.hp = hp; zz.maxHp = Math.max(hp, 24); zz.riseT = 0; zz.speed = 0; zz.baseSpeed = 0;
      return zz;
    };
    // While rounds land nothing comes off (a legless zombie crawls, and a crawler gets today's topple).
    const steady = (fn) => { const rnd = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = rnd; } };
    const until = async (cond, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (cond()) return true; await wait(30); } return cond(); };
    const corpseOf = (mesh) => T.getCorpses().find((c) => c.mesh === mesh);
    // Where the body's own points lie (studio/motion.js simulates them; the joints are posed from them).
    const pt = (c, name) => { const p = c.body.points()[name]; return { x: p[0], y: p[1] - T.sampleHeight(p[0], p[2]), z: p[2] }; };
    const hipsUp = (c) => c.body ? pt(c, 'pelvis') : { x: c.mesh.position.x, y: 9, z: c.mesh.position.z };
    const frozenJoints = (c) => { let n = 0, all = 0; c.mesh.traverse((o) => { if (o !== c.mesh) { all++; if (!o.matrixAutoUpdate) n++; } }); return all > 0 && n === all; };
    const shellAt = (z, dist = 1.5) => {
      hold();
      const zx = z.mesh.position.x, zz = z.mesh.position.z;
      T.fireShellDbg(zx, z.mesh.position.y + 1.0, zz - dist, 0, 0, 1);
      steady(() => { for (let i = 0; i < 6; i++) T.stepProjectilesDbg(1 / 60); });
    };

    // (1) Shot in the back with a rifle: it pitches forward, lies low, settles and freezes within 4 s.
    {
      const z = put('shambler', px, pz - 5, 5);
      await wait(250);   // it turns to face him (+z)
      const mesh = z.mesh, x0 = mesh.position.x, z0 = mesh.position.z;
      const face = Math.cos(mesh.rotation.y);
      const stillBefore = (() => { let n = 0; mesh.traverse((o) => { if (o !== mesh && !o.matrixAutoUpdate) n++; }); return n; })();
      steady(() => { T.fireRoundDbg(x0, mesh.position.y + 1.0, z0 - 3, 0, 0, 1, 27, 100, 0); for (let i = 0; i < 6; i++) T.stepProjectilesDbg(1 / 60); });
      const c = corpseOf(mesh);
      ok(!z.alive && !!c && !!c.body && c.body.state === 'dead', 'an AK round in the back: it dies on its body (' + (c ? (c.body ? c.body.state : 'topple') : 'no corpse') + ', facing z ' + f2(face) + ')');
      const t0 = performance.now();
      const settled = await until(() => c && c.frozen, 4500);
      const secs = (performance.now() - t0) / 1000;
      const h = c ? hipsUp(c) : { y: 9, z: 0 };
      ok(settled && secs <= 4.2 && h.y <= 0.35, 'it lies within 0.35 m of the ground and has settled in ' + f2(secs) + ' s (' + (c && c.frozenBy) + ', hips ' + f2(h.y) + ' m up, frozen ' + !!(c && c.frozen) + ')');
      const hz = c && c.body ? pt(c, 'crown').z : -9;
      ok(hz - h.z > 0.1, 'shot in the back, it pitched forward (head ' + f2(hz - h.z) + ' m past the hips along the shot, hips moved ' + f2(h.z - z0) + ' m; ' + (c && c.frozenBy) + ')');
      ok(c && frozenJoints(c) && c.body.sleeping, 'settled: its joints stop updating and the body sleeps');
      ok(T.getMotionStats().active === 0, 'its pool slot is back (' + T.getMotionStats().active + ')');
      T.clearZombies(); await wait(100);
      // (Far zombies freeze their own joints too, setZombieRenderLod; only the corpse's freeze is judged here.)
      let flagged = 0, still = 0; mesh.traverse((o) => { if (o.userData._corpseFrozen) flagged++; if (o !== mesh && !o.matrixAutoUpdate) still++; });
      ok(flagged === 0 && still <= stillBefore, 'a cleared corpse hands the pooled mesh back with its joints live again (' + still + ' still, ' + stillBefore + ' before it died)');
    }

    // (A weak rifle kill from the front can still fold forward, the way a shambler leans; a hard one throws it
    // back, which (2) checks: that zombie faces him and goes over away from him.)

    // (2) A close shell kill throws the body 1-2 m back, into the zombie behind.
    {
      const z = put('shambler', px, pz + 4, 50);
      const b = put('shambler', px, pz + 5.1);
      b.mesh.position.x += 0.6;   // behind it, off the shell's line
      await wait(150);
      const mesh = z.mesh, x0 = mesh.position.x, z0 = mesh.position.z;
      shellAt(z);
      const c = corpseOf(mesh);
      ok(!!c && !!c.body && c.throwP >= 5, 'a close shell kill: the body takes it (' + (c ? f2(c.throwP) : '-') + ' m/s)');
      // The one behind is judged just after the body reaches it (a body that went down is up again 2.2 s later).
      await until(() => c && c.shoved, 1500); await wait(150);
      const bDown = b.knockT > 0 || T.motionDown(b), bState = b.body ? b.body.state : 'knockT ' + f2(b.knockT || 0);
      await until(() => c && c.frozen, 4500);
      const h = c ? hipsUp(c) : { x: x0, z: z0 };
      const d = Math.hypot(h.x - x0, h.z - z0);
      ok(d >= 1 && d <= 2.6 && h.z > z0, 'the body ends ' + f2(d) + ' m back (1-2 m, its pelvis)');
      ok(c && c.shoved === b && bDown, 'the zombie behind is knocked down by it (' + bState + ')');
      T.clearZombies(); await wait(100);
    }
    // The first pellet kills it: the rest of the pull still counts toward the throw.
    {
      const z = put('shambler', px, pz + 4, 1);
      await wait(100);
      const mesh = z.mesh;
      shellAt(z);
      const c = corpseOf(mesh);
      ok(!!c && c.throwP >= 5, 'killed by the first pellet, thrown by the whole shell (' + (c ? f2(c.throwP) : '-') + ' m/s)');
      T.clearZombies(); await wait(100);
    }
    // A rifle kill doesn't throw anyone.
    {
      const z = put('shambler', px, pz + 4, 5);
      const b = put('shambler', px + 0.3, pz + 5.0);
      await wait(100);
      const mesh = z.mesh;
      steady(() => { T.fireRoundDbg(mesh.position.x, mesh.position.y + 1.0, mesh.position.z - 3, 0, 0, 1, 27, 100, 0); for (let i = 0; i < 6; i++) T.stepProjectilesDbg(1 / 60); });
      const c = corpseOf(mesh);
      await wait(1200);
      ok(!!c && !c.shoved && !(b.knockT > 0) && !T.motionDown(b), 'an AK kill throws nobody (' + (c ? f2(c.throwP) : '-') + ' m/s)');
      T.clearZombies(); await wait(100);
    }

    // (3) Today's topple (bodies off, as when the pool is full): slides on a close shell, knocks, freezes.
    T.setMotionEnabledDbg(false);
    {
      const z = put('shambler', px, pz + 4, 50);
      const b = put('shambler', px + 0.6, pz + 5.1);
      await wait(150);
      const mesh = z.mesh, x0 = mesh.position.x, z0 = mesh.position.z;
      shellAt(z);
      const c = corpseOf(mesh);
      ok(!!c && !c.body && c.slide >= 1, 'bodies off: today\'s topple, with a slide (' + (c ? f2(c.slide || 0) : '-') + ' m)');
      await wait(500);
      const d = Math.hypot(mesh.position.x - x0, mesh.position.z - z0);
      ok(d >= 1 && d <= 2.1, 'it slides ' + f2(d) + ' m back');
      ok(c && c.shoved === b && b.knockT > 0, 'the zombie behind gets knockT (' + f2(b.knockT || 0) + ')');
      const fr = await until(() => c.frozen, 1500);
      ok(fr && frozenJoints(c), 'once landed, the topple freezes too');
      T.clearZombies(); await wait(100);
    }

    // (4) 18 corpses: settled ones cost no more a frame than 18 of today's toppling ones.
    const cost = () => {
      const cs = T.getCorpses();
      const t0 = performance.now();
      for (let k = 0; k < 200; k++) { T.updateCorpsesDbg(0); for (const c of cs) c.mesh.updateMatrixWorld(); }
      return (performance.now() - t0) / 200;
    };
    const ring = (hp) => { const zs = []; for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2, r = 6 + (i % 2) * 2.5; zs.push(put('shambler', px + Math.cos(a) * r, pz + Math.sin(a) * r, hp)); } return zs; };
    const killAll = (zs) => steady(() => { for (const z of zs) if (z.alive) T.damageZombie(z, 40, { kind: 'bullet', dir: { x: 0, z: 1 }, hitY: z.mesh.position.y + 1.0 }); for (let i = 0; i < 2; i++) T.stepProjectilesDbg(1 / 60); });
    // Today's topple, measured in the frame they die (dt 0 keeps them toppling).
    const oldZs = ring(5); await wait(150);
    killAll(oldZs);
    const nOld = T.getCorpses().length, oldCost = cost();
    T.clearZombies(); await wait(100);
    T.setMotionEnabledDbg(true);
    // On their bodies, a few at a time (the pool is 8), then settled.
    const newZs = ring(5); await wait(150);
    // The pool takes 8 at a time; the corpses already down are held back from sinking away while the rest settle.
    for (let i = 0; i < 18; i += 8) { killAll(newZs.slice(i, i + 8)); await until(() => T.getMotionStats().active === 0, 4500); for (const c of T.getCorpses()) if (c.frozen) c.t = Math.min(c.t, 4.5); }
    const cs = T.getCorpses();
    const bodies = cs.filter((c) => c.body).length, allFrozen = cs.every((c) => c.frozen);
    const newCost = cost();
    out.push('corpses: ' + nOld + ' toppling ' + oldCost.toFixed(3) + ' ms a frame; ' + cs.length + ' settled (' + bodies + ' on bodies) ' + newCost.toFixed(3) + ' ms');
    ok(nOld === 18 && cs.length === 18 && bodies >= 12 && allFrozen && newCost <= oldCost * 1.1 + 0.02, '18 settled corpses (' + nOld + ' old, ' + cs.length + ' new, ' + bodies + ' on bodies, all frozen ' + allFrozen + ') cost ' + newCost.toFixed(3) + ' ms a frame, 18 toppling ones ' + oldCost.toFixed(3) + ' ms');
    ok(T.getMotionStats().active === 0, 'all their slots are back (' + T.getMotionStats().active + ')');
    T.clearZombies(); await wait(100);
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()