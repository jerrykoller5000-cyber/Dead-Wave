// t307 - GP-19987 (ChatGPT): with the story gate on, day 1 at the fuel pump does not fill, and opening
// the generator lead lets the same hold fill the can. The suite's other fuel check (t267) runs with the gate off.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const key = (type) => document.dispatchEvent(new KeyboardEvent(type, { code: 'KeyE', key: 'e', bubbles: true }));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    if (!T.fuelDbg || !T.runDevCommand) { ok(false, 'the fuel hooks are there'); return out.join('\n'); }
    await startMatch(T, 'Fuel gate');
    T.clearZombies && T.clearZombies();
    T.runDevCommand('story gate on');
    T.runDevCommand('site fuel');
    const F = T.fuelDbg, R = () => F.run();
    ok(await until(() => !!F.props() && R().phase === 'at-pump', 8000), 'at the pump (' + (R() && R().phase) + ')');
    await wait(200);
    ok(!F.prompt(), 'day 1, lead closed: no fill prompt (' + F.prompt() + ')');
    key('keydown'); { const s0 = T.getSimTime(); await until(() => T.getSimTime() - s0 >= 1.2, 20000); } key('keyup'); await wait(150);
    ok(R().phase === 'at-pump' && R().fill === 0, 'holding E does not fill (phase ' + R().phase + ', fill ' + R().fill + ')');
    T.runDevCommand('story open generator');
    await wait(300);
    ok(/fill/i.test(F.prompt() || ''), 'generator lead open: the fill prompt ("' + F.prompt() + '")');
    key('keydown'); { const s0 = T.getSimTime(); await until(() => T.getSimTime() - s0 >= 1.2, 20000); } key('keyup'); await wait(150);
    ok(R().fill > 0.3, 'the same hold now fills (' + R().fill.toFixed(2) + ' s)');
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) {
    ok(false, 't307 threw: ' + String((e && e.stack) || e).slice(0, 300));
  }
  return out.join('\n');
})()
