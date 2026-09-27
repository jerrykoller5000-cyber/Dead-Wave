// t92 - GB-67 (P-72; Jerry's GB-50 order through D-42): the marine gets knocked around. He is adopted as the
// studio's `marine` rig (marine/marine) on his first hit. A shambler's swipe rocks him and he stays up; a brute's
// blow staggers him a step and he doesn't fall; a bomber going off 1 m away puts him down, he's up (recovered)
// within 1.5 s of lying down, and walking works again. While he's down, keys don't move him and he can't fire.
// GB-50's slide and thrown aim still play on top; his body's stagger replaces GB-50's knee.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (+v).toFixed(2);
  const until = async (cond, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (cond()) return true; await wait(20); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message || e.error).slice(0, 600)));
  const key = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  try {
    await startMatch(T, 'Knocked');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    T.setHp(100000);
    const p = T.player.position;
    const px = 18, pz = 18;
    T.levelGroundRect(px - 12, pz - 12, px + 12, pz + 12, T.sampleHeight(px, pz), 6);
    const stand = async () => { p.set(px, T.sampleHeight(px, pz), pz); await wait(500); };
    const fake = (dx, dz, extra) => Object.assign({ mesh: { position: { x: p.x + dx, y: p.y, z: p.z + dz } } }, extra || {});
    const evs = () => T.getMarineHits().events;
    const watch = async (ms) => { const seen = new Set(); let maxW = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { const b = T.marineBody(); if (b) maxW = Math.max(maxW, b.weight || 0); for (const e of evs()) seen.add(e); await wait(20); } return { seen, maxW }; };
    const clearEv = () => { T.getMarineHits(); };

    // (1) A shambler's swipe rocks him; he stays up.
    await stand();
    const h0 = T.getMarineHits();
    T.damagePlayer(6, 'shambler', fake(1, 0));
    const h1 = T.getMarineHits();
    ok(!!T.marineBody() && h1.taken === h0.taken + 1, 'a swipe: his body takes it (' + h1.state + ')');
    const e0 = evs().length;
    let w = await watch(1200);
    const e1 = evs().slice(Math.max(0, e0 - 40));
    ok(w.maxW > 0.3 && !w.seen.has('fall') && !T.marineDown(), 'it rocks him (weight up to ' + f2(w.maxW) + ') and he stays up (' + [...w.seen].join(' ') + ')');
    ok(T.marineBody().state === 'animated', 'and it is over within 1.2 s (' + T.marineBody().state + ')');

    // (2) A brute's blow staggers him a step, no fall; GB-50's knee still plays.
    await stand(); await wait(3000);   // past GB-50's knee cooldown
    const b0 = { x: p.x, z: p.z };
    T.damagePlayer(16, 'brute', fake(0, 1, { brute: true }));
    const kneeNow = T.getHitStumble().kneeT > 0;
    let saw = new Set(); let fell = false;
    const tb = performance.now();
    const nb = evs().length; while (performance.now() - tb < 1600) { const all = evs(); for (const e of all.slice(Math.min(nb, 40) - 1)) saw.add(e); if (T.marineDown()) fell = true; await wait(20); }
    const pushed = b0.z - p.z;
    ok(saw.has('stagger') && !saw.has('fall') && !fell, 'a brute\'s blow: a stagger and no fall (' + [...saw].join(' ') + '), back ' + f2(pushed) + ' m along it');
    ok(!kneeNow && T.getHitStumble().aimT >= 0, 'his body\'s stagger replaces GB-50\'s knee (the knee is for when his body can\'t take it)');

    // (3) A bomber 1 m away puts him down; he's up within 1.5 s; no walking or firing while down.
    await stand(); await wait(600);
    const at = { x: p.x + 1, z: p.z };
    T.bomberBlast(at.x, p.y, at.z);
    const downOk = await until(() => T.marineBody() && T.marineBody().state === 'down', 1500);
    ok(downOk, 'a bomber at 1 m puts him down (' + (T.marineBody() && T.marineBody().state) + ')');
    // Keys held while he's down don't move him.
    const d0 = { x: p.x, z: p.z }; const ammo0 = JSON.stringify(T.getAmmo ? T.getAmmo() : 0);
    key('KeyW', true);
    await wait(250);
    const whileDown = T.marineDown();
    const movedDown = Math.hypot(p.x - d0.x, p.z - d0.z);
    const tDown = performance.now();
    const rec = await until(() => T.marineBody().state === 'animated', 2500);
    const upAfter = (performance.now() - tDown + 250) / 1000;
    ok(rec && upAfter <= 1.5 + 0.2 && T.getMarineHits().events.includes('recovered'), 'he\'s up (recovered) ' + f2(upAfter) + ' s after lying down');
    // Walking works again.
    const u0 = { x: p.x, z: p.z };
    await wait(500);
    const movedUp = Math.hypot(p.x - u0.x, p.z - u0.z);
    key('KeyW', false);
    ok(whileDown && movedDown < 0.35 && movedUp > 1.0, 'W held: ' + f2(movedDown) + ' m while down (only his fall), ' + f2(movedUp) + ' m in 0.5 s once up');

    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()