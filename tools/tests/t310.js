// t310 - CU-192 (J33): the Training Ground's warm frame is drawn while the loop is stopped.
// Noon has to be in place before that frame, or the blackout fades up on the title's light
// (morning, or night if that clock had run on).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  try {
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    T.setWorldTime(0.02);
    await wait(400);
    document.getElementById('modeTraining').click();
    ok(await until(() => T.trainingDbg.state().active, 20000), 'training started');
    const sun = () => T.sun.intensity;
    ok(Math.abs(T.getWorldTime() - 0.5) < 0.02 && sun() > 1.5, 'noon is already in when the room opens (time ' + T.getWorldTime().toFixed(2) + ', sun ' + sun().toFixed(2) + ')');
    const b = document.getElementById('trainingBlackout');
    ok(await until(() => !(b && b.classList.contains('on')), 15000), 'the blackout lifts');
    ok(Math.abs(T.getWorldTime() - 0.5) < 0.02 && sun() > 1.5, 'still noon after the blackout (sun ' + sun().toFixed(2) + ')');
    ok(!T.trainingDbg.state().lightsOff, 'the room switch is on');
  } catch (e) {
    ok(false, 't310 threw: ' + String((e && e.stack) || e).slice(0, 300));
  }
  return out.join('\n');
})()
