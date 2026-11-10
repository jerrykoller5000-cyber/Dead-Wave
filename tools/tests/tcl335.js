// tcl335 - CL-335 (J102, Jerry 10 Nov): the Training Ground's music. "Alarm is triggered. Music slowly starts to fade in
// and reaches full volume as door is all the way open. It stays looping while you are fighting the zombies until they are
// killed where it fades back out upon last zombie kill." With the score on: low at the alarm, up through the 5 s countdown,
// full with the door open, still playing with the type out in the arena (it used to stop 3 s after the alarm), and out
// over 3 s from the last kill. Without the gh files here, nothing plays and nothing breaks.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const D = T.trainingDbg, A = T.AudioSys, ms = () => A.musicState();
  const r3 = (v) => +(+v).toFixed(3);
  try {
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl && !nameEl.value) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    await until(() => D.state().active, 8000);
    if (A.setMuted) A.setMuted(false);
    if (!ms().playing && A.startMusic) A.startMusic();
    await until(() => ms().score && Object.keys(ms().score.motifs || {}).length > 0, 10000);
    A.setScore(true);
    // the feral's kit decoded first (a practice before this one), so the countdown is the music's and not the disk's
    if (D.spawn('feral', 1) >= 1) {
      await until(() => (ms().score.motif && ms().score.motif.started) || ms().score.failed.includes('gh/motif-feral'), 20000);
      D.clear(); await until(() => !ms().score.motif && D.state().deployment && !D.state().deployment.read(), 12000);
      await wait(3600);
    }
    if (ms().score.failed.includes('gh/motif-feral') || !ms().score.motifs.feral) {
      ok(true, 'no gh files on this machine: nothing plays, nothing breaks');
    } else {
      const n = D.spawn('feral', 1);
      ok(n >= 1, 'a feral called out (' + n + ')');
      const t0 = performance.now(), samples = [];
      const sample = () => { const p = D.state().deployment.read(); samples.push({ t: +((performance.now() - t0) / 1000).toFixed(2), rem: p ? r3(p.remaining) : null, v: r3(ms().volume), m: !!ms().score.motif }); };
      while (D.state().deployment.read()) { sample(); await wait(250); }
      for (let i = 0; i < 6; i++) { sample(); await wait(250); }
      const cd = samples.filter((s) => s.rem != null);
      const full = samples[samples.length - 1].v;
      const early = cd.filter((s) => s.rem > 4).map((s) => s.v), mid = cd.filter((s) => s.rem < 2.8 && s.rem > 2.2).map((s) => s.v);
      ok(full > 0.05, 'the motif is up with the door open: ' + full);
      ok(early.length && Math.max(...early) < full * 0.25, 'at the alarm it starts low (the first second ' + JSON.stringify(early) + ' of ' + full + ')');
      ok(mid.length && Math.max(...mid) > full * 0.2 && Math.min(...mid) < full * 0.85, 'half way through the countdown it is coming up ' + JSON.stringify(mid));
      let rising = true; for (let i = 1; i < cd.length; i++) if (cd[i].v < cd[i - 1].v - 0.01) rising = false;
      ok(rising, 'it only rises through the countdown');
      // J102's failure: silent once they were in the arena. Four seconds of practice, still playing.
      await wait(4000);
      ok(!!(ms().score.motif && ms().score.motif.started) && ms().volume > full * 0.9,
        'four seconds into the fight it still plays: ' + r3(ms().volume) + ' (' + JSON.stringify(ms().score.motif) + ')');
      ok(ms().sectionLoop && ms().sectionLoop.loop, 'looping ' + JSON.stringify(ms().sectionLoop));
      // the last kill: out over 3 s
      D.clear();
      const gone = await until(() => !ms().score.motif, 2000);
      ok(gone, 'the last one down: the motif goes within the second');
      ok(ms().lastStop && ms().lastStop.fade === 3 && ms().lastStop.track === 'gh/motif-feral', 'over three seconds: ' + JSON.stringify(ms().lastStop));
      out.push('INFO samples ' + JSON.stringify(samples));
    }
    D.clear();
    A.setScore(false);
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
    D.leave && D.leave();
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
