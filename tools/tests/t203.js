// t203 - CU-88: charge the Hush, E at a cave mouth goes down for real, and the alarm still
// sounds once he is back up. Jerry: the second E did nothing and the alarm stayed stuck,
// because the enter event marked him below without moving him.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const ev = []; window.addEventListener('dw-game', ({ detail }) => { if (detail && detail.type === 'alarm-started') ev.push(detail); });
  const key = (type) => document.dispatchEvent(new KeyboardEvent(type, { code: 'KeyE', key: 'e', bubbles: true }));
  const pressE = async () => { key('keydown'); await wait(120); key('keyup'); await wait(250); };
  const H = () => T.getHushState(); const D = () => T.hushDbg;
  const front = (m, d) => { const x = m.x + Math.sin(m.yaw) * d, z = m.z + Math.cos(m.yaw) * d; T.player.position.set(x, T.sampleHeight(x, z), z); };
  try {
    await startMatch(T, 'Hush go down');
    T.clearZombies(); T.skipGrace && T.skipGrace();
    const open = D().mouths().filter(Boolean).find((m) => m.theme !== 'chalk');
    ok(!!open, open ? 'an open mouth: ' + open.theme : 'no open mouth');
    T.setRelayUpDbg(true);
    T.setDay(1); T.startPrep(); await wait(150);
    T.setDay(2); T.startPrep(); await wait(200);
    ok(H().owned && H().charged && !H().below, 'dawn after the relay: charged, still topside');
    front(open, 3); await wait(250);
    ok(D().prompt() && D().prompt().key === 'hush.light', 'at the mouth: Light the Hush');
    await pressE();
    ok(H().lit && H().charged && !H().below && T.hollowState().below === false, 'first E lights it and leaves him on the grass');
    const mouth = { x: T.player.position.x, y: T.player.position.y, z: T.player.position.z };
    await pressE();
    const st = T.hollowState();
    const p = T.player.position;
    const moved = Math.hypot(p.x - mouth.x, p.z - mouth.z);
    ok(st.below === true && st.place === 'warren' && st.cave === open.i, 'second E is in the warren (place ' + st.place + ', cave ' + st.cave + ')');
    ok(moved > 15, 'he left the mouth (' + moved.toFixed(1) + ' m)');
    ok(H().below && !H().charged, 'the charge is spent only once he is down');
    const alarms = ev.length;
    T.hqStartWave(); await wait(300);
    ok(T.getPhase() === 'prep' && ev.length === alarms && !D().alarm(), 'below: the alarm cannot be sounded');
    T.leaveHollow('mouth'); await wait(200);
    ok(T.hollowState().below === false && !H().below, 'back up: neither the warren nor the Hush still says below');
    ok(Math.hypot(T.player.position.x - open.x, T.player.position.z - open.z) < 20, 'and he is outside that cave');
    T.hqStartWave(); await wait(300);
    ok(D().alarm() && ev.length === alarms + 1, 'topside again: the alarm sounds');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
