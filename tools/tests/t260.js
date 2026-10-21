// t260 - GB-183 (docs/specs/secret-quest.md 4): the night after a silenced day. A right send in the prep (the quest's
// 'silenced') plans the coming night again: every push at half size, no guardian night, no Ember Night (Blood Moon),
// the named night keeps its name. The next dawn plans a whole night again.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const st = () => T.getWaveDirectorState();
  const silence = () => { const q = T.getQuestState(); q.unlocked = true; q.triedDay = q.day; q.silencedDay = q.day; q.silenced = true; return T.restoreQuestDbg(q); };
  try {
    await startMatch(T, 'Silence');
    T.runDevCommand('godmode'); T.clearZombies();
    // Night 6: a guardian night.
    T.setDay(5); T.startPrep(); await wait(100);
    const g0 = st(), sizes0 = g0.wavePreview.night.pushes.slice(), label0 = g0.wavePreview.night.label;
    ok(g0.day === 6 && g0.guardianNight === true && T.getQuestState().day === 6, 'night 6 is a guardian night (' + g0.day + ', ' + g0.guardianNight + ')');
    ok(silence() === true, 'the right send: the quest is silenced today');
    await wait(100);
    const g1 = st(), sizes1 = g1.wavePreview.night.pushes;
    ok(g1.guardianNight === false && !g1.waveQueue.includes('guardian') && g1.wavePreview.hasGuardian === false, 'no guardian night after a silenced day');
    ok(sizes1.length === sizes0.length && sizes1.every((n, i) => Math.abs(n - Math.ceil(sizes0[i] / 2)) <= 1), 'every push at half size (' + sizes0.join('/') + ' -> ' + sizes1.join('/') + ')');
    ok(g1.waveTotal === g1.waveQueue.length && g1.waveTotal <= Math.ceil(g0.waveTotal / 2) + sizes0.length, 'the night total halves (' + g0.waveTotal + ' -> ' + g1.waveTotal + ')');
    ok(g1.wavePreview.night.label === label0 && g1.wavePreview.night.silenced === true, 'the named night keeps its name, marked silenced');
    // Night 8: Ember Night (Blood Moon) - not carried over from day 6.
    T.setDay(7); T.startPrep(); await wait(100);
    const e0 = st();
    out.push('INFO night 8: day ' + e0.day + ' bloodMoon ' + e0.bloodMoon + ' preview.bloodMoon ' + e0.wavePreview.bloodMoon + ' silenced ' + e0.wavePreview.night.silenced + ' quest ' + JSON.stringify(T.getQuestState()).slice(0, 200) + ' total ' + e0.waveTotal);
    ok(e0.day === 8 && e0.bloodMoon === true && !e0.wavePreview.night.silenced, 'night 8 is Ember Night, and yesterday\'s silence does not carry over (day ' + e0.day + ', ' + e0.bloodMoon + ', silenced ' + e0.wavePreview.night.silenced + ', quest ' + JSON.stringify(T.getQuestState()).slice(0, 160) + ')');
    silence(); await wait(100);
    ok(st().bloodMoon === false && st().wavePreview.bloodMoon === false, 'no Ember Night after a silenced day');
    // The next dawn: a whole night.
    const before = st().waveTotal;
    T.startPrep(); await wait(100);
    const n9 = st();
    ok(n9.day === 9 && !n9.wavePreview.night.silenced && n9.waveTotal > before, 'the next dawn plans a whole night (' + n9.waveTotal + ')');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})();
