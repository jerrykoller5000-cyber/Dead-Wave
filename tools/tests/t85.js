// t85 - GB-60 (P-1): the skulls you earn reach the bag, every night. At the last kill of any night
// the skulls still on the field fly into the bag (it was day 1 only), and they are counted on the
// dawn banner. No skull lands where he'd die reaching it: one that falls in a cave mouth's grab band
// (or the tunnel behind it) or over the sinkhole is set down where he can walk or swim to it.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(40); } return cond(); };
  const pickups = [];
  window.addEventListener('dw-game', (e) => { if (e.detail && e.detail.type === 'skull-pickup') pickups.push({ ...e.detail, at: Date.now() }); });
  try {
    ok(typeof T.skullSafeSpot === 'function', 'GB-60 hook exported');
    await startMatch(T, 'SkullRecall');
    T.runDevCommand('godmode');
    T.setDay(2); T.startPrep();
    await wait(300);
    ok(T.getDay() === 3, 'night 3 (day ' + T.getDay() + ')');
    const hqx = -5.9, hqz = -2.2;
    T.player.position.set(hqx, T.sampleHeight(hqx, hqz), hqz);
    const skulls = () => T.cashDrops.filter((c) => c.skull && !c.taken);
    const newDrop = (fn) => { const before = new Set(T.cashDrops); fn(); return T.cashDrops.find((c) => !before.has(c) && c.skull); };

    // (1) The sinkhole: a skull dropped over the hole ends outside the arms' reach.
    const H = T.LAKE_HOLE;
    const dh = newDrop(() => T.awardCash(H.x + 2, H.z - 1.5, 20, 'drowned'));
    const hd = dh ? Math.hypot(dh.mesh.position.x - H.x, dh.mesh.position.z - H.z) : -1;
    ok(!!dh && hd > H.grabR + 1.16, 'a skull over the sinkhole is set down ' + hd.toFixed(1) + ' m from its centre (arms reach ' + H.grabR + ' m, pickup 1.16 m)');

    // (2) Every cave mouth: a skull in the grab band and one in the tunnel behind it end where he
    // can stand to pick them up without being in the band (the same test the game uses).
    const frame = (c, x, z) => {
      const dx = x - c.x, dz = z - c.z;
      return { lx: dx * Math.cos(c.yaw) - dz * Math.sin(c.yaw), lz: dx * Math.sin(c.yaw) + dz * Math.cos(c.yaw),
        skew: c.design ? c.design.skew * 1.2 : 0, half: c.mouthHalf || 2.15 };
    };
    const at = (c, lx, lz) => ({ x: c.x + lx * Math.cos(c.yaw) + lz * Math.sin(c.yaw), z: c.z - lx * Math.sin(c.yaw) + lz * Math.cos(c.yaw) });
    const inBand = (c, x, z) => { const f = frame(c, x, z); return f.lz < 0.55 && f.lz > -3.5 && Math.abs(f.lx - f.skew) < f.half; };
    let caves = 0, bad = [];
    for (const c of T.POI.caves) {
      const sk = c.design ? c.design.skew * 1.2 : 0;
      for (const lz of [-1.5, 0.3, -6]) {
        const p = at(c, sk, lz);
        const d = newDrop(() => T.awardCash(p.x, p.z, 20, 'shambler', c.gy));   // a body at the mouth's height
        if (!d) { bad.push(c.index + '@' + lz + ' no drop'); continue; }
        const f = frame(c, d.mesh.position.x, d.mesh.position.z);
        // Standing anywhere within pickup reach of it (1.16 m) must be outside the band.
        let reachFree = true;
        for (let a = 0; a < 8; a++) { const q = { x: d.mesh.position.x + Math.cos(a * Math.PI / 4) * 1.1, z: d.mesh.position.z + Math.sin(a * Math.PI / 4) * 1.1 }; if (inBand(c, q.x, q.z)) reachFree = false; }
        if (!reachFree || f.lz < 0.55) bad.push((c.index != null ? c.index : caves) + '@' + lz + ' lz ' + f.lz.toFixed(2));
      }
      caves++;
    }
    ok(caves >= 1 && bad.length === 0, caves + ' cave mouths: skulls in the band and in the tunnel end outside it ' + (bad.length ? '(' + bad.slice(0, 4).join(', ') + ')' : ''));
    // One on the hill over a mouth (the ground well above the mouth) is not in it and stays put.
    {
      const c = T.POI.caves[0], sk = c.design ? c.design.skew * 1.2 : 0, q = at(c, sk, -6), hy = T.sampleHeight(q.x, q.z);
      if (hy - c.gy > 3) { const d = newDrop(() => T.awardCash(q.x, q.z, 20, 'shambler', hy)); ok(!!d && Math.hypot(d.mesh.position.x - q.x, d.mesh.position.z - q.z) < 0.4, 'a skull on the hill over a mouth (' + (hy - c.gy).toFixed(1) + ' m up) stays where it fell'); }
      else ok(true, 'no hill over cave 0 to test (' + (hy - c.gy).toFixed(1) + ' m)');
    }
    // A skull out in the open is left where it fell.
    const open = newDrop(() => T.awardCash(hqx + 20, hqz + 5, 20, 'shambler'));
    ok(!!open && Math.hypot(open.mesh.position.x - (hqx + 20), open.mesh.position.z - (hqz + 5)) < 0.4, 'a skull in the open stays where it fell');

    // (3) Night 3: the last kill calls every loose skull in, including one left 30 m out.
    for (const z of T.zombies.filter((z) => z.alive && z.poiGuard)) T.damageZombie(z, 9999, { kind: 'bullet' });
    T.hqStartWave();
    await until(() => T.getPhase() === 'wave' && !T.getLoopCine(), 15000);
    ok(T.getPhase() === 'wave', 'night 3 is on');
    T.player.position.set(hqx, T.sampleHeight(hqx, hqz), hqz);
    T.clearZombies && T.clearZombies();
    const p = T.player.position;
    const far = newDrop(() => T.awardCash(p.x + 30, p.z, 20, 'shambler'));
    ok(!!far, 'a skull left 30 m out');
    const loose0 = skulls().length;
    const bag0 = T.getSkullBag().count;
    const last = T.spawnZombie(p.x + 4, p.z + 4, 'shambler', true, true);
    T.drainWavePlanDbg();
    const nightPick0 = pickups.length;
    const t0 = Date.now();
    T.killZombie(last, true, { kind: 'bullet', dir: { x: 1, z: 0 } });
    ok(!!T.getWaveFinisher(), 'the last kill starts the finisher');
    ok(T.getSkullRecall() > performance.now() - 50, 'and arms the recall on night 3 (it was day 1 only)');
    const inBag = await until(() => far && far.taken, 4000);
    const took = Date.now() - t0;
    const ev = pickups.slice(nightPick0).find((e) => e.recalled);
    ok(inBag && took <= 2600, 'the 30 m skull is in the bag in ' + (took / 1000).toFixed(2) + ' s (want 2.5 s)');
    ok(!!ev && ev.recalled === true, 'its pickup says recalled:true');
    const allIn = await until(() => skulls().length === 0, 4000);
    ok(allIn, 'no loose skull left on the field (' + skulls().length + ' of ' + loose0 + ')');
    const bagged = T.getSkullBag().count - bag0;
    ok(bagged >= loose0, 'the bag took all ' + loose0 + ' (+' + bagged + ')');
    // Counted at dawn: the banner's skull number includes the recalled ones.
    await until(() => T.getPhase() === 'prep', 15000);
    const card = document.getElementById('dawnCard');
    await until(() => card && card.open === true, 6000);
    const shown = card ? Number((card.querySelector('[data-stat="skulls"]') || {}).textContent) : NaN;
    const nightPicks = pickups.slice(nightPick0).reduce((n, e) => n + (e.count || 0), 0);
    ok(!!card && card.open === true && shown >= nightPicks && nightPicks >= loose0, 'the dawn banner counts them: ' + shown + ' skulls (recalled ' + nightPicks + ')');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()