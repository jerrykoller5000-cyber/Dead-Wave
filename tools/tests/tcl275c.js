// tcl275c - CL-275 (D-97): the Training Ground's motifs. With the score on, a type called out to practise brings its
// own kit (the feral's is Frenzy), from its drums; it goes when the practice is cleared. Without the gh files here,
// nothing plays and nothing breaks.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(100); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const D = T.trainingDbg, A = T.AudioSys, ms = () => A.musicState();
  try {
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl && !nameEl.value) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    await until(() => D.state().active, 8000);
    if (A.setMuted) A.setMuted(false);
    if (!ms().playing && A.startMusic) A.startMusic();
    await until(() => ms().score && Object.keys(ms().score.motifs || {}).length > 0, 10000);
    ok(ms().score.motifs.feral === 'gh/motif-feral' && ms().score.motifs.guardians === 'gh/motif-guardians', 'the twelve motifs are in the score (' + Object.keys(ms().score.motifs).length + ')');
    A.setScore(true);
    const n = D.spawn('feral', 1);
    ok(n >= 1, 'a feral called out (' + n + ')');
    ok(ms().score.motif && ms().score.motif.kind === 'feral', 'its motif is asked for: ' + JSON.stringify(ms().score.motif));
    const started = await until(() => (ms().score.motif && ms().score.motif.started) || !ms().score.motif, 20000);
    if (ms().score.motif && ms().score.motif.started) {
      ok(ms().score.kit === 'frenzy' && ms().score.track === 'gh/motif-feral', 'the feral\'s kit plays: ' + ms().score.track + '/' + ms().score.kit);
      ok(ms().score.layers && ms().score.layers.drums === 1, 'from its drums ' + JSON.stringify(ms().score.layers));
      D.clear();
      const gone = await until(() => !ms().score.motif, 12000);
      ok(gone, 'the practice cleared: the motif goes');
    } else ok(started && ms().score.failed.includes('gh/motif-feral') || !ms().score.motif, 'no gh files on this machine: nothing plays, nothing breaks');
    D.clear();
    A.setScore(false);
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
    D.leave && D.leave();
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
