// tcb293 - CB-293 (ChatGPT's GP-20078 sweep: "military alone has motif:null and track:null"): the military's Training alarm
// plays a motif now. music.json names none for it, so core/audio.js motifTrackFor gives it the shambler's (MOTIF_LIKE); every
// other type keeps its own; a type that is not a zombie asks for nothing. Without the gh files here nothing plays, nothing breaks.
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
    A.setScore(true);
    ok(!('military' in ms().score.motifs), 'music.json names no motif for the military (so the stand-in is what plays): ' + Object.keys(ms().score.motifs).length + ' motifs');
    const n = D.spawn('military', 1);
    ok(n >= 1, 'a military called out (' + n + ')');
    const m = ms().score.motif;
    ok(m && m.kind === 'military', 'its motif is asked for: ' + JSON.stringify(m));
    ok(m && m.track === ms().score.motifs.shambler, 'it is the shambler\'s track: ' + (m && m.track) + ' vs ' + ms().score.motifs.shambler);
    ok(!!A.trainingMotif && A.trainingMotif('military') === true, 'trainingMotif(military) answers true');
    D.clear();
    await until(() => !ms().score.motif, 12000);
    // every other type still has its own, untouched by the stand-in
    for (const k of ['feral', 'brute', 'drowned', 'demon']) {
      await until(() => D.state().active && !D.state().wake, 3000);
      const spawned = D.spawn(k, 1);
      const mk = ms().score.motif;
      ok(spawned >= 1 && mk && mk.kind === k && mk.track === ms().score.motifs[k], k + ' keeps its own motif: ' + spawned + ' out, ' + (mk && mk.track));
      D.clear(); await until(() => !ms().score.motif, 12000);
    }
    ok(A.trainingMotif('not-a-type') === false, 'a type with no motif at all asks for nothing');
    ok(errs.length === 0, 'no page errors ' + errs.join('|'));
    D.leave && D.leave();
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
