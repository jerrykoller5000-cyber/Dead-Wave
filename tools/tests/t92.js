// t92 - GB-67 (P-72; Jerry's GB-50 order through D-42): the marine gets knocked around. He is adopted as the
// studio's `marine` rig (marine/marine) on his first hit. A shambler's swipe rocks him and he stays up; a brute's
// blow staggers him a step and he doesn't fall; a bomber going off 1 m away puts him down, he's up (recovered)
// within 1.5 s of lying down, and walking works again. While he's down, keys don't move him and he can't fire.
// GB-50's slide and thrown aim still play on top; his body's stagger replaces GB-50's knee.
(async () => {
  const T = window.TT; const out = [];
  T.setMotionEnabledDbg(true);   // Claude 2026-09-27: reactions are a Settings toggle, off by default
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
    if (!T.getHitStumble) throw new Error('TT.getHitStumble missing');

    // (1) Claude 2026-09-27: his body plays knockdowns only. A shambler's swipe is let go the moment it
    // isn't one (his mesh used to step away from the capsule the camera follows): GB-50's stumble plays,
    // his body is back to its animation at once, and he never goes down.
    await stand();
    const h0 = T.getMarineHits();
    T.damagePlayer(6, 'shambler', fake(1, 0));
    const h1 = T.getMarineHits();
    ok(!!T.marineBody() && h1.taken === h0.taken && h1.skipped === h0.skipped + 1, 'a swipe: his body lets it go (taken ' + h1.taken + ', skipped ' + (h1.skipped - h0.skipped) + ')');
    ok(T.marineBody().state === 'animated' && T.getHitStumble().stumbleT > 0, 'GB-50\'s stumble plays and his body stays on its animation (' + T.marineBody().state + ')');
    let w = await watch(600);
    ok(w.maxW === 0 && !w.seen.has('fall') && !T.marineDown(), 'his body never takes over (weight ' + f2(w.maxW) + ') and he stays up (' + [...w.seen].join(' ') + ')');

    // (2) A brute's blow: not a knockdown either, so GB-50's knee answers it (the knee is for when his body doesn't).
    await stand(); await wait(3000);   // past GB-50's knee cooldown
    const b0 = { x: p.x, z: p.z };
    T.damagePlayer(16, 'brute', fake(0, 1, { brute: true }));
    const kneeNow = T.getHitStumble().kneeT > 0;
    let saw = new Set(); let fell = false;
    const tb = performance.now();
    const nb = evs().length; while (performance.now() - tb < 1600) { const all = evs(); for (const e of all.slice(Math.min(nb, 40) - 1)) saw.add(e); if (T.marineDown()) fell = true; await wait(20); }
    const pushed = b0.z - p.z;
    ok(!saw.has('fall') && !fell && T.marineBody().state === 'animated', 'a brute\'s blow: no fall and his body let go (' + [...saw].join(' ') + '), back ' + f2(pushed) + ' m along it');
    ok(kneeNow, 'GB-50\'s knee answers the heavy blow his body does not play');

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

    // (4) A tap (0.05 m/s) does nothing to him at all: not a knockdown, so his body lets it go and his
    // animation carries on (GB-67 follow-up's snapshot keeps the pose apart from the body's either way).
    await stand(); await wait(2500);
    T.marineHitDbg('blade', 0.05, 1, 0, 1.25);
    const tapStates = new Set(); const tt0 = performance.now();
    while (performance.now() - tt0 < 800) { tapStates.add(T.marineBody().state); await wait(20); }
    ok(!tapStates.has('fall') && !tapStates.has('down') && T.marineBody().state === 'animated', 'a 0.05 m/s tap: he stays up and on his animation (' + [...tapStates].join(' ') + ')');

    // (5) The toggle: off (the default), a bomber blast never wakes his body; GB-50 alone answers.
    T.setMotionEnabledDbg(false);
    await stand(); await wait(600);
    const s0 = T.getMarineHits().skipped;
    T.bomberBlast(p.x + 1, p.y, p.z);
    await wait(300);
    ok(T.marineBody().state === 'animated' && T.getMarineHits().skipped > s0 && !T.marineDown(), 'Ragdoll off: the blast is skipped by his body (' + T.marineBody().state + ') and he keeps his feet');
    T.setMotionEnabledDbg(true);

    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()