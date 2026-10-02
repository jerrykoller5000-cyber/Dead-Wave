// t168 - GB-107 (P-138): fighting below. In the iron warren: the sleepers lie in their alcoves until a shot is heard,
// he walks up to one or his light holds on one; a woken one wakes its neighbours, gets up, walks the warren (never
// into its rock) and swings at him; a nest sends one of its own and stops once blown; the mine crew comes once, when
// he steps into the Deep; never more than 24 awake; the Deep is cleared with the crew dead and the box open; coming
// up takes the warren's dead away and leaves topside's as they were.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const events = []; window.addEventListener('dw-game', (e) => { const d = e.detail || {}; if (d.type === 'hollow' || d.type === 'hollow-nest') events.push(d); });
  try {
    await startMatch(T, 'Below');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.runDevCommand('godmode'); T.skipGrace && T.skipGrace();
    const D = T.belowDbg;
    ok(!!D, 'the debug handle is there');
    // One topside body, to see it is left alone.
    const p = T.player.position;
    const top = T.spawnZombie(p.x + 30, p.z + 30, 'shambler', true, true);
    const topAt = top ? { x: top.mesh.position.x, z: top.mesh.position.z } : null;
    const built = T.enterHollow({ theme: 'iron', cave: 0 });
    ok(!!built && T.hollowState().below, 'he is down in the iron warren');
    const F = D.fight();
    const below = () => T.zombies.filter((z) => z.below && z.alive);
    const sleepers = built.points.sleepers;
    ok(F && F.sleepers.length === sleepers.length && below().length === sleepers.length && below().every((z) => z.sleeping && z.mesh.rotation.x < -1),
      'every alcove has its sleeper, lying down (' + below().length + ' of ' + sleepers.length + ')');
    ok(below().every((z) => z.caveTheme === 'iron'), 'each takes the iron cave role');
    // Skull pay below (GP-83): the warren's roster, its sleepers and its set piece, pays half the day's night between them.
    const st = D.state('iron');
    const sum = (a) => a.reduce((n, v) => n + v, 0);
    ok(!!st && st.night === D.nightValue(T.getDay()) && st.night > 0 && sum(st.pay) === Math.floor(st.night / 2) && st.pay.length === sleepers.length + 5,
      'the roster pays half the night between them (' + (st && sum(st.pay)) + ' of ' + (st && st.night) + ', ' + (st && st.pay.length) + ' bodies)');
    ok(below().every((z) => z.cashDrop === st.pay[z.belowSleeper]), 'each sleeper carries its share');
    const nav = D.nav();
    const open = (x, z) => { const a = Math.floor((x - nav.ox) / nav.cell), b = Math.floor((z - nav.oz) / nav.cell); return a >= 0 && b >= 0 && a < nav.w && b < nav.h && !!nav.walkable[b * nav.w + a]; };
    // (1) a suppressed-radius shot far off wakes nobody; the pistol heard among them wakes those inside its radius.
    const stand = (x, z) => p.set(x, built.groundAt(x, z), z);
    stand(built.entry.x, built.entry.z);
    await wait(300);
    ok(below().every((z) => z.sleeping), 'at the mouth, nobody stirs');
    // the sleeper nearest the mouth, and a spot 2 m from it toward its chamber's middle
    const s0 = F.sleepers.slice().sort((a, b) => Math.hypot(a.x - built.entry.x, a.z - built.entry.z) - Math.hypot(b.x - built.entry.x, b.z - built.entry.z))[0];
    const cx = Math.floor((s0.x - nav.ox) / 6) * 6 + 3 + nav.ox, cz = Math.floor((s0.z - nav.oz) / 6) * 6 + 3 + nav.oz;
    const ux = (cx - s0.x) / Math.hypot(cx - s0.x, cz - s0.z), uz = (cz - s0.z) / Math.hypot(cx - s0.x, cz - s0.z);
    const zs0 = below().find((z) => z.belowSleeper === s0.id);
    const nbrs = F.sleepers.filter((s) => s !== s0 && Math.hypot(s.x - s0.x, s.z - s0.z) <= 4).map((s) => s.id);
    stand(s0.x + ux * 2.0, s0.z + uz * 2.0);
    const t0 = Date.now(); let wokeAt = null;
    while (Date.now() - t0 < 3000) { await wait(50); stand(s0.x + ux * 2.0, s0.z + uz * 2.0); if (wokeAt === null && !zs0.sleeping) wokeAt = Date.now() - t0; }
    ok(wokeAt !== null && wokeAt < 800, 'walking within 2.5 m of one wakes it (after ' + wokeAt + ' ms)');
    ok(Math.abs(zs0.mesh.rotation.x) < 0.05, 'and it gets up');
    const nAwake = nbrs.filter((id) => { const z = below().find((q) => q.belowSleeper === id); return z && !z.sleeping; }).length;
    ok(nbrs.length === 0 || nAwake === nbrs.length, 'its neighbours within 4 m wake too (' + nAwake + ' of ' + nbrs.length + ')');
    // (2) awake, it comes to him and swings; never into the rock.
    let swung = false, inRock = 0, n = 0;
    const t1 = Date.now();
    while (Date.now() - t1 < 4000 && zs0.alive) {
      await wait(50); stand(s0.x + ux * 2.0, s0.z + uz * 2.0);
      if (zs0.attackCd > 0.9) swung = true;
      n++; if (!open(zs0.mesh.position.x, zs0.mesh.position.z)) inRock++;
    }
    ok(swung, 'it closes and swings at him');
    ok(inRock === 0, 'it never stands in the rock (' + inRock + ' of ' + n + ' samples)');
    for (const z of below()) if (!z.sleeping) T.killZombie(z, false);
    // (3) the gun light: held on a sleeper from 4.5-7.5 m off, it wakes after about 1.5 s; the pistol's shot wakes those within 35 m.
    const asleep = F.sleepers.filter((s) => s.state === 'asleep');
    const s1 = asleep[asleep.length - 1];
    const lightSpot = (() => { for (const r of [6, 5.5, 6.5, 5, 7, 4.5, 7.5]) for (let k = 0; k < 32; k++) { const a = k * Math.PI / 16, x = s1.x + Math.cos(a) * r, z = s1.z + Math.sin(a) * r; if (open(x, z)) return { x, z, r }; } return null; })();
    if (lightSpot) {
      const f = F.tick.bind(F);
      const lit = { on: true, x: lightSpot.x, z: lightSpot.z, dx: s1.x - lightSpot.x, dz: s1.z - lightSpot.z };
      // straight to the model with the frames he would give it: 1.4 s does not, 1.6 s does (the cap leaves room)
      let woke = false; for (let t = 0; t < 1.4; t += 0.1) woke = woke || f(0.1, { x: lightSpot.x, z: lightSpot.z, light: lit, awake: 0 }).wake.includes(s1.id);
      const early = woke || s1.state !== 'asleep';
      for (let t = 0; t < 0.3; t += 0.1) f(0.1, { x: lightSpot.x, z: lightSpot.z, light: lit, awake: 0 });
      ok(!early && s1.state !== 'asleep', 'the gun light held on one ' + lightSpot.r + ' m off wakes it after 1.5 s, not 1.4 s');
    } else ok(false, 'no open spot 6 m from a sleeper');
    const quiet = F.sleepers.filter((s) => s.state === 'asleep');
    stand(built.entry.x, built.entry.z);
    D.heard('pistol');
    await wait(400);
    const heardR = T.shotHearingRadius('pistol');
    const inR = quiet.filter((s) => Math.hypot(s.x - p.x, s.z - p.z) <= heardR), outR = quiet.filter((s) => Math.hypot(s.x - p.x, s.z - p.z) > heardR);
    ok(inR.every((s) => s.state !== 'asleep') && outR.every((s) => s.state === 'asleep'), 'his pistol shot wakes the ' + inR.length + ' within ' + heardR + ' m and not the ' + outR.length + ' beyond');
    // (4) never more than 24 awake: wake every one, watch for 2 s.
    F.noise(p.x, p.z, 999);
    let most = 0; const t2 = Date.now();
    while (Date.now() - t2 < 2000) { await wait(50); stand(built.entry.x, built.entry.z); most = Math.max(most, D.awake()); }
    ok(most <= 24, 'never more than 24 awake (' + most + ' at most, ' + F.sleepers.length + ' sleepers)');
    for (const z of below()) T.killZombie(z, false);
    // (5) a nest sends one of its own while he is near; rounds and a blast take its 400 HP; blown, it stops.
    const nest = F.nests[0];
    ok(!!nest && D.nests().length === F.nests.length, 'the warren has its nests (' + F.nests.length + ')');
    stand(nest.x + 2.5, nest.z); if (!open(nest.x + 2.5, nest.z)) stand(nest.x, nest.z + 2.5);
    nest.timer = 0.05;
    await wait(300);
    const kids = below().filter((z) => z.belowNest === nest.id);
    ok(kids.length === 1, 'near it, the nest sends one of its own (' + kids.length + ')');
    ok(kids.length === 1 && kids[0].cashDrop === 0, "a nest's dead pay nothing (they keep coming)");
    const shot = { prev: { x: nest.x - 3, y: nest.y + 0.6, z: nest.z }, pos: { x: nest.x + 3, y: nest.y + 0.6, z: nest.z }, damage: 150 };
    ok(D.nestRound(shot) === true && nest.hp === 250, 'a round into it stops there and takes 150 of its 400 (' + nest.hp + ' left)');
    D.blast(nest.x, nest.y + 0.5, nest.z, 4.5, 130);
    await wait(200);
    ok(!nest.alive && !D.nests().some((m) => m.userData.nest === nest.id && m.parent), 'a grenade on it, weak to blasts, blows it (and it is gone)');
    ok(events.some((e) => e.type === 'hollow-nest' && e.phase === 'blown'), 'the nest-blown event goes out');
    for (const z of below()) T.killZombie(z, false);
    nest.timer = 0.05; await wait(400);
    ok(below().filter((z) => z.belowNest === nest.id).length === 0, 'blown, it sends no more');
    // (6) the mine crew, once, when he steps into the Deep.
    const set = built.points.set;
    stand(set.x, set.z);
    await wait(400);
    const crew = below().filter((z) => z.belowSet);
    ok(crew.length === 5 && crew.filter((z) => z.typeKey === 'brute').length === 1 && crew.filter((z) => z.typeKey === 'military').length === 4,
      'stepping into the Deep brings the mine crew: a brute foreman and four soldiers (' + crew.map((z) => z.typeKey).join(', ') + ')');
    ok(events.filter((e) => e.type === 'hollow' && e.phase === 'set-piece').length === 1, 'one set-piece event');
    ok(sum(crew.map((z) => z.cashDrop)) === sum(st.pay.slice(sleepers.length)), 'the crew carries the rest of the pay (' + sum(crew.map((z) => z.cashDrop)) + ')');
    stand(built.entry.x, built.entry.z); await wait(200); stand(set.x, set.z); await wait(300);
    ok(below().filter((z) => z.belowSet).length === 5, 'stepping in again brings no second crew');
    // (7) the clear: the crew dead and the strongbox open.
    for (const z of below()) T.killZombie(z, false);
    await wait(200);
    ok(!T.hollowState().cleared, 'the crew dead, the box shut: not yet cleared');
    const box = built.points.strongbox;
    T.claimHollowHere(box.x, box.y, box.z);
    await wait(300);
    ok(T.hollowState().cleared && events.some((e) => e.type === 'hollow' && e.phase === 'cleared'), 'the box open too: the Deep is cleared');
    // (8) coming up: the warren's dead go; topside's stood frozen where it was the whole delve.
    ok(!top || (top.alive && Math.hypot(top.mesh.position.x - topAt.x, top.mesh.position.z - topAt.z) < 0.01), 'topside\'s body stood where it was while he was below');
    const sleeping = below().length;
    T.leaveHollow('mouth');
    await wait(200);
    ok(T.zombies.every((z) => !z.below) && D.fight() === null && D.nests().length === 0, 'coming up takes the warren\'s dead away (' + sleeping + ' were still lying there)');
    ok(!top || (top.alive && T.zombies.includes(top)), 'and is still there after');
    // (9) a second delve the same run: what he killed stays dead, and the crew does not come again.
    const again = T.enterHollow({ theme: 'iron', cave: 0 });
    stand(again.points.set.x, again.points.set.z);
    await wait(400);
    ok(T.zombies.filter((z) => z.below).length === 0 && D.fight().sleepers.every((q) => q.state === 'dead'), 'down again the same run: the dead he killed stay dead, the crew does not come back');
    T.leaveHollow('mouth');
    // (10) every Deep has its set piece: the shale flankers from two sides, the drowned out of the pool, the barrow
    // king (a colossus) with his court; the root knot only when the box opens, and it drops to the floor.
    const want = { shale: [8, 'feral,feral,feral,feral,shambler,shambler,shambler,shambler'], wet: [6, 'drowned,drowned,drowned,drowned,drowned,drowned'], hill: [5, 'colossus,military,military,shambler,shambler'] };
    for (const th of Object.keys(want)) {
      const b2 = T.enterHollow({ theme: th, cave: 0 });
      stand(b2.points.set.x, b2.points.set.z);
      await wait(1600);
      const got = T.zombies.filter((z) => z.below && z.belowSet).map((z) => z.typeKey).sort().join(',');
      ok(got === want[th][1], 'the ' + th + ' Deep: ' + got);
      if (th === 'shale') {
        const lying = T.zombies.filter((z) => z.below && z.sleeping);
        if (lying.length) T.killZombie(lying[0], false);
        T.leaveHollow('mouth');
        T.enterHollow({ theme: th, cave: 0 });
        const back = T.zombies.filter((z) => z.below && z.sleeping).length;
        ok(lying.length > 0 && back === lying.length - 1, 'one sleeper killed in the shale warren: down again, the other ' + back + ' still lie there');
      }
      if (th === 'wet') ok(T.zombies.filter((z) => z.belowSet).every((z) => Math.abs(z.mesh.position.y - b2.groundAt(z.mesh.position.x, z.mesh.position.z)) < 0.05 || !z.alive), 'the drowned have risen to the floor');
      T.leaveHollow('mouth');
    }
    const r = T.enterHollow({ theme: 'root', cave: 0 });
    stand(r.points.set.x, r.points.set.z);
    await wait(500);
    ok(T.zombies.filter((z) => z.below && z.belowSet).length === 0, 'the root Deep: nothing comes when he walks in');
    T.claimHollowHere(r.points.strongbox.x, r.points.strongbox.y, r.points.strongbox.z);
    await wait(1500);
    const knot = T.zombies.filter((z) => z.below && z.belowSet);
    ok(knot.length === 6 && knot.every((z) => !z.alive || Math.abs(z.mesh.position.y - r.groundAt(z.mesh.position.x, z.mesh.position.z)) < 0.05), "the box opened, the climbers' knot drops and lands (" + knot.length + ')');
    T.leaveHollow('mouth');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
