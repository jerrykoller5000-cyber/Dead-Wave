// t152 - GB-106 (P-135, D-67; docs/specs/hollows.md A1): the Hush. Owned from the dawn after the relay is repaired and
// charged at each prep. At a cave mouth in prep: E lights it (the walk-in grab at that mouth then lets him in) and a
// second E goes down ('hollow' 'enter', the charge spent); below, the battery counts and the alarm can't be called;
// 'hollow' 'leave' brings him up. The chalk mouth refuses, a spent charge reads flat, the alarm reads no time.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(50); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const ev = []; window.addEventListener('dw-game', ({ detail }) => { if (detail && /^(hush-state|hollow|alarm-started)$/.test(detail.type)) ev.push(detail); });
  const of = (type) => ev.filter((e) => e.type === type);
  const key = (type) => document.dispatchEvent(new KeyboardEvent(type, { code: 'KeyE', key: 'e', bubbles: true }));   // on a Node (ui/prep-checklist.js reads e.target.contains)
  const pressE = async () => { key('keydown'); await wait(120); key('keyup'); await wait(250); };
  const H = () => T.getHushState(); const D = () => T.hushDbg;
  // A spot `d` m out in front of a mouth (the mouth faces along its yaw; the grab zone is from 0.55 m out to 3.5 m in).
  const front = (m, d) => { const x = m.x + Math.sin(m.yaw) * d, z = m.z + Math.cos(m.yaw) * d; T.player.position.set(x, T.sampleHeight(x, z), z); };
  try {
    await startMatch(T, 'Hush');
    T.clearZombies(); T.skipGrace && T.skipGrace();
    const mouths = D().mouths().filter(Boolean);
    const open = mouths.find((m) => m.theme !== 'chalk'), chalk = mouths.find((m) => m.theme === 'chalk');
    ok(mouths.length >= 2 && !!open && !!chalk, mouths.length + ' mouths (' + mouths.map((m) => m.theme).join(', ') + ')');
    T.setRelayUpDbg(false);
    T.setDay(1); T.startPrep(); await wait(200);
    ok(!H().owned && !H().charged, 'no relay: not owned');
    front(open, 3); await wait(250);
    ok(D().prompt() && D().prompt().key === 'hush.flat' && !D().prompt().act, 'no relay: the mouth reads flat, and E does nothing there');
    // Repaired today: not yet; the next dawn: owned and charged.
    T.setRelayUpDbg(true); await wait(100);
    ok(!H().owned, 'repaired today: not yet');
    const s0 = of('hush-state').length;
    T.setDay(2); T.startPrep(); await wait(200);
    ok(H().owned && H().charged && !H().lit && H().battery === D().SECONDS && D().SECONDS === 480, 'the dawn after: owned, charged, 480 s');
    ok(of('hush-state').slice(s0).some((e) => e.owned && e.charged), 'hush-state says so');
    // At a mouth: light it.
    front(open, 3); await wait(250);
    ok(D().prompt() && D().prompt().key === 'hush.light' && D().prompt().act && T.actionTarget() === 'hush', 'at the ' + open.theme + ' mouth: "Light the Hush"');
    await pressE();
    ok(H().lit && H().cave === open.i && H().charged && !H().below, 'E lights it (cave ' + H().cave + '), still charged');
    // Lit, the walk-in grab lets him in.
    front(open, -1); await wait(1200);
    ok(!D().grabbing() && !D().over(), 'lit: walking into the mouth, nothing takes him');
    front(open, 3); await wait(250);
    ok(D().prompt() && D().prompt().key === 'hush.goDown', 'the mouth now says "Go down"');
    const h0 = of('hollow').length;
    await pressE();
    const enter = of('hollow').slice(h0);
    ok(enter.length === 1 && enter[0].phase === 'enter' && enter[0].cave === open.i && enter[0].how === 'mouth', 'the second E goes down: hollow {enter, cave ' + (enter[0] && enter[0].cave) + ', mouth}');
    ok(H().below && !H().charged && H().lit && H().cave === open.i, 'below: the charge is spent');
    const a0 = of('alarm-started').length;
    T.hqStartWave(); await wait(400);
    ok(T.getPhase() === 'prep' && !D().alarm() && of('alarm-started').length === a0, 'below: the alarm cannot be called');
    const b0 = H().battery; await wait(1500);
    const b1 = H().battery;
    ok(b1 < b0 && b1 > b0 - 5, 'the battery counts while below (' + b0.toFixed(1) + ' -> ' + b1.toFixed(1) + ')');
    D().surface(); await wait(200);
    ok(!H().below && !H().lit && H().cave === -1 && !H().charged, 'hollow leave: up again, the Hush flat');
    front(open, 3); await wait(250);
    const hb = of('hollow').length;
    ok(D().prompt() && D().prompt().key === 'hush.flat', 'the same day: "flat"');
    await pressE();
    ok(of('hollow').length === hb && !H().lit, 'flat: E does nothing');
    // Next dawn: charged again. The chalk mouth refuses.
    T.setDay(3); T.startPrep(); await wait(200);
    ok(H().charged, 'next dawn: charged again');
    front(chalk, 3); await wait(250);
    ok(D().prompt() && D().prompt().key === 'hush.chalk' && !D().prompt().act, 'the chalk mouth: "Too close to the source"');
    await pressE();
    ok(!H().lit && H().charged, 'the chalk mouth: E does nothing');
    // Lit, then walking away puts it out, charge kept.
    front(open, 3); await wait(250); await pressE();
    ok(H().lit, 'lit again at the ' + open.theme + ' mouth');
    front(open, D().LIT_R + 4); await wait(400);
    ok(!H().lit && H().charged, 'walking away puts it out; the charge is kept');
    // The alarm sounding: no time.
    T.player.position.set(-5.9, T.sampleHeight(-5.9, -2.2), -2.2);
    T.hqStartWave(); await wait(300);
    front(open, 3); await wait(250);
    ok(D().alarm() && D().prompt() && D().prompt().key === 'hush.noTime' && !D().prompt().act, 'the alarm is sounding: "No time. Tomorrow."');
    await until(() => T.getPhase() === 'wave', 25000);
    T.clearZombies();
    // The control: unlit, the same spot in the mouth is a grab (so the lit check above meant something).
    ok(!H().lit, 'unlit now');
    front(open, -1);
    ok(await until(() => D().grabbing() || D().over(), 4000), 'unlit: the same spot in the mouth takes him');
    // A run reset forgets it.
    T.setRelayUpDbg(null); T.resetGame(); await wait(300);
    ok(!H().owned && !H().charged && !H().lit && !H().below, 'reset: not owned');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
