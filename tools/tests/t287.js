// t287 - CL-258 (Jerry's N2): "Very difficult to interact with mini-game menus. For instance the puzzles like the breaker
// in 3rd person but especially 1st person." In first person a device's panel now holds the view still (the mouse no
// longer turns him while it is up) and lets go of the pointer so it can be clicked; on a desktop-sized screen the
// panel is drawn larger.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const key = (type, code = 'KeyE', k = 'e') => document.dispatchEvent(new KeyboardEvent(type, { code, key: k, bubbles: true }));
  const tap = async (code = 'KeyE', k = 'e') => { key('keydown', code, k); await wait(60); key('keyup', code, k); await wait(60); };
  const move = (dx) => window.dispatchEvent(new MouseEvent('mousemove', { movementX: dx, movementY: 0, bubbles: true }));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Panels');
    T.clearZombies(); T.runDevCommand('godmode');
    const D = T.relayDbg, cab = T.getObjectiveProps().props['objective:radio-repair'], A = cab.approach;
    T.player.position.set(A.x, A.y, A.z); await wait(300);
    T.setViewFirstDbg(true);
    ok(await until(() => T.otsDbg().on, 12000), 'first person');
    const yaw0 = T.otsDbg().yaw; move(120); await wait(50);
    ok(Math.abs(T.otsDbg().yaw - yaw0) > 0.01, 'in first person the mouse turns him (' + (T.otsDbg().yaw - yaw0).toFixed(3) + ')');
    T.player.position.set(A.x, A.y, A.z); await wait(200);
    await tap(); await wait(200);
    const panel = document.getElementById('relayPanel');
    ok(D.relay.mode === 'breakers' && panel.classList.contains('on'), 'E at the cabinet opens the breakers in first person');
    const yaw1 = T.otsDbg().yaw; move(160); move(-40); await wait(80);
    ok(Math.abs(T.otsDbg().yaw - yaw1) < 1e-6, 'with the panel up the mouse no longer turns him');
    ok(!T.otsDbg().locked, 'and the pointer is free to click the panel');
    const tr = getComputedStyle(panel).transform;
    const sc = (() => { const m = /matrix\(([^,]+),/.exec(tr); return m ? +m[1] : 1; })();
    ok(innerWidth < 900 || innerHeight < 640 || sc >= 1.3, 'on a ' + innerWidth + 'x' + innerHeight + ' screen it is drawn at ' + sc.toFixed(2) + 'x');
    const b = panel.querySelector('.brk'); if (b) b.click(); await wait(100);
    ok(D.state().on.some((v) => v) || D.state().lockout > 0 || D.state().trips > 0, 'a click on a breaker throws it');
    await tap(); await wait(200);
    ok(!D.relay.mode, 'E leaves');
    const yaw2 = T.otsDbg().yaw; move(120); await wait(50);
    ok(Math.abs(T.otsDbg().yaw - yaw2) > 0.01, 'panel closed: the mouse turns him again');
    T.setViewFirstDbg(false);
    T.runDevCommand('godmode off');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
