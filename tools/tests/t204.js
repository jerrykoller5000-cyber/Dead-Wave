// t204 - CL-127 (Jerry's playthrough 1, 2026-10-06): the radio mast. "Make it more obvious how to repair it, the repair
// bar more noticeable while repairing, and the supply pickup at the radio mast in a separate place from the repair."
//  - An amber marker over the cabinet while the radio is down; the main prompt says "Hold E - Repair the radio".
//  - Holding E shows the big bar (#radioRepairBar) filling over the 6 s; letting go says "interrupted".
//  - The supplies wait in a locker at least 7 m from the cabinet: locked (red) until the repair, then open with a green
//    marker; the cabinet no longer hands them out; the tracker's marker moves to the locker; E at the locker takes them.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const key = (type) => document.dispatchEvent(new KeyboardEvent(type, { code: 'KeyE', key: 'e', bubbles: true }));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'RadioMast');
    T.clearZombies(); T.setHp(100000); T.runDevCommand('godmode');
    const R = () => T.radioCuesDbg();
    await until(() => !!R().locker && !!R().runtime, 4000);
    const props = T.getObjectiveProps().props, cab = props['objective:radio-repair'];
    const L = R().locker;
    ok(!!L && !!R().marks, 'the locker and the two markers are built');
    const apart = Math.hypot(L.centre.x - cab.centre.x, L.centre.z - cab.centre.z);
    ok(apart >= 7, 'the locker stands ' + apart.toFixed(1) + ' m from the cabinet (at least 7)');
    ok(L.state === 'locked' && L.shut.visible && !L.open.visible, 'before the repair the locker is shut (' + L.state + ')');
    // Walk up to the cabinet.
    const P = T.player.position, A = cab.approach;
    const stand = (x, y, z) => { P.set(x, y, z); T.clearZombies(); };
    stand(A.x, A.y, A.z);
    await wait(300);
    ok(R().marks.cabinet.visible && !R().marks.locker.visible, 'amber marker over the cabinet, none over the locker');
    ok(/repair the radio/i.test(R().prompt || '') && /hold e/i.test(R().prompt || ''), 'the main prompt: "' + R().prompt + '"');
    ok(document.getElementById('kioskPrompt').textContent === R().prompt, 'and it is the one on screen');
    // Near but not at it: the prompt says where to go.
    stand(cab.centre.x + 6, P.y, cab.centre.z + 6); P.y = T.sampleHeight(P.x, P.z);
    await wait(200);
    ok(/cabinet/i.test(R().prompt || ''), 'a few metres off: "' + R().prompt + '"');
    // Hold E for 2 s, let go: the bar fills, then "interrupted".
    stand(A.x, A.y, A.z); await wait(150);
    key('keydown');
    await wait(2000); T.clearZombies(); P.set(A.x, A.y, A.z);
    const bar = document.getElementById('radioRepairBar');
    const fill = bar && parseFloat(bar.querySelector('.rrb-fill').style.width);
    ok(!!bar && bar.classList.contains('on') && fill > 3 && fill < 70, 'holding E: the big bar is up at ' + fill + '%');
    const rect = bar.getBoundingClientRect();
    ok(rect.width >= 300 && bar.querySelector('.rrb-track').getBoundingClientRect().height >= 14, 'and it is big: ' + Math.round(rect.width) + ' px wide, a ' + Math.round(bar.querySelector('.rrb-track').getBoundingClientRect().height) + ' px track');
    ok(/keep holding/i.test(R().prompt || ''), 'the prompt while holding: "' + R().prompt + '"');
    key('keyup'); await wait(250);
    ok(bar.classList.contains('interrupted') && R().state !== 'ready-to-claim', 'let go early: "' + bar.querySelector('.rrb-label').textContent + '"');
    // Hold the full 6 s.
    await wait(1800);
    stand(A.x, A.y, A.z); await wait(150);
    key('keydown');
    const done = await until(() => { T.clearZombies(); P.set(A.x, A.y, A.z); return R().state === 'ready-to-claim'; }, 30000);   // 6 s of game time; a loaded box runs slow
    key('keyup');
    ok(done, 'held 6 s: repaired (' + R().state + ')');
    await wait(300);
    ok(bar.classList.contains('restored') && /signal restored/i.test(bar.querySelector('.rrb-label').textContent), 'the bar says "' + bar.querySelector('.rrb-label').textContent + '"');
    ok(L.state === 'open' && L.open.visible && L.goods.visible, 'the locker is open, the supplies in it');
    ok(!R().marks.cabinet.visible && R().marks.locker.visible, 'the amber marker is gone; a green one over the locker');
    ok(/locker/i.test(R().prompt || ''), 'at the cabinet now: "' + R().prompt + '"');
    // E at the cabinet takes nothing.
    key('keydown'); await wait(200); key('keyup'); await wait(250);
    ok(R().state === 'ready-to-claim', 'E at the cabinet takes nothing (' + R().state + ')');
    const snap = R().runtime.snapshot(), site = snap && snap.sites.find((s) => s.id === 'objective:radio-repair');
    ok(site && Math.hypot(site.position.x - L.centre.x, site.position.z - L.centre.z) < 0.01, 'the tracker marks the locker, not the cabinet');
    // At the locker.
    let sx = L.centre.x + (cab.centre.x - L.centre.x) / apart * 1.25, sz = L.centre.z + (cab.centre.z - L.centre.z) / apart * 1.25;
    stand(sx, T.sampleHeight(sx, sz), sz); await wait(300);
    ok(/take the radio supplies/i.test(R().prompt || ''), 'at the locker: "' + R().prompt + '"');
    key('keydown'); await wait(200); key('keyup');
    const took = await until(() => R().state === 'claimed', 2000);
    ok(took && L.state === 'empty' && !L.goods.visible && !R().marks.locker.visible, 'E at the locker takes them: ' + R().state + ', locker ' + L.state);
    T.runDevCommand('godmode off');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
