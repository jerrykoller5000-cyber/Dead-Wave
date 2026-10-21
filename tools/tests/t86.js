// t86 - GB-61 (P-2): from night 2 a skull within 4 m zips into the bag; skulls last 45 s instead of
// 30; a big drop (100 or more) still needs the walk; day 1 is unchanged (walk over it).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(30); } return cond(); };
  const pickups = [];
  window.addEventListener('dw-game', (e) => { if (e.detail && e.detail.type === 'skull-pickup') pickups.push({ ...e.detail }); });
  try {
    ok(typeof T.getSkullLife === 'function', 'GB-61 hook exported');
    const L = T.getSkullLife();
    ok(L.life === 45 && L.zipR === 4 && L.zipMax === 100, 'skulls keep 45 s, zip within 4 m, not from 100 up (' + JSON.stringify(L) + ')');
    await startMatch(T, 'SkullZip');
    T.runDevCommand('godmode');
    T.setDay(4); T.startPrep();
    await wait(300);
    ok(T.getDay() === 5, 'day 5 (' + T.getDay() + ')');
    const px = 12, pz = 18;   // open ground south-east of the HQ
    const stand = () => T.player.position.set(px, T.sampleHeight(px, pz), pz);
    stand();
    const newDrop = (fn) => { const before = new Set(T.cashDrops); fn(); return T.cashDrops.find((c) => !before.has(c) && c.skull); };
    const at = (d, v, kind) => newDrop(() => T.awardCash(px + d, pz, v, kind || 'shambler'));
    const bag0 = T.getSkullBag().count, p0 = pickups.length;
    // 3 m: zips in within 1 s.
    const near = at(3, 20);
    const t0 = Date.now();
    const zipped = await until(() => near && near.taken, 1500);
    const took = Date.now() - t0;
    ok(!!near && zipped && took <= 1000, 'a skull 3 m away is in the bag in ' + (took / 1000).toFixed(2) + ' s (want under 1 s)');
    const ev = pickups.slice(p0).find((e) => e.value === 20);
    ok(!!ev && ev.zipped === true && !ev.recalled, 'its pickup says zipped:true (not recalled)');
    ok(T.getSkullBag().count === bag0 + 1, 'the bag grew by one');
    // 10 m: stays where it is.
    const far = at(10, 20);
    // A 120-value skull 3 m away: worth the walk, stays.
    stand();
    const big = at(-3, 120, 'brute');
    await wait(1500);
    ok(!!far && !far.taken && !far.fly, 'a skull 10 m away stays on the ground');
    ok(!!big && !big.taken && !big.fly, 'a 120-value skull 3 m away stays (big drops need the walk)');
    // 45 s life: alive at 40 s, gone by 46 s.
    far.age = 39.8;
    await wait(300);
    ok(T.cashDrops.includes(far) && !far.taken, 'alive at 40 s (age ' + far.age.toFixed(1) + ')');
    far.age = 45.8;
    await wait(400);
    ok(!T.cashDrops.includes(far), 'gone by 46 s');
    // Walking over the big one still picks it up (unchanged).
    T.player.position.set(big.mesh.position.x, T.sampleHeight(big.mesh.position.x, big.mesh.position.z), big.mesh.position.z);
    ok(await until(() => big.taken, 1500), 'walking over the big one picks it up');
    // Day 1: no zip.
    T.setDay(0); T.startPrep();
    await wait(300);
    stand();
    const d1 = at(3, 1);
    await wait(1200);
    ok(T.getDay() === 1 && !!d1 && !d1.taken && !d1.fly, 'day 1: a skull 3 m away does not zip (day ' + T.getDay() + ')');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()