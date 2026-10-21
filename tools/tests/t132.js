// t132 - GB-87 (P-56, D-54): Fog Night. Night 14's plan carries mod 'fog'; it shows in wavePreview.night.mod and
// getWaveDirectorState().mod from night 14's prep (named the prep before the night) through its wave, and is null on
// every other night 1-40 but 17, GB-93's Swarm Night (the endless nights that reuse 14's base included), cleared by the next prep. Totals and
// tricks are untouched, and CU-77's night-cleared kind for 14 is now 'fog'.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const st = () => T.getWaveDirectorState();
  try {
    await startMatch(T, 'Fog');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    // The plan table.
    const bad = [];
    for (let d = 1; d <= 40; d++) { const m = T.nightPlanFor(d).mod || null; if ((d === 14) !== (m === 'fog') || (d !== 14 && d !== 17 && m !== null)) bad.push(d + ':' + m); }   // GB-93: 17 is Swarm Night (t166)
    ok(bad.length === 0, 'nightPlanFor: mod fog on 14 and null on every other night 1-40 but 17 (Swarm Night, t166) ' + bad.join(' '));
    const p14 = T.nightPlanFor(14);
    ok(p14.total === 600 && p14.trick === 'lake-surge' && p14.pushes === 5 && p14.rest === true, 'night 14 keeps its total 600, trick lake-surge, 5 pushes, rest');
    const p22 = T.nightPlanFor(22);
    ok(p22.endless === true && p22.trick === 'lake-surge' && p22.mod === null, 'night 22 reuses 14\'s trick without the fog');
    // Live: the prep of 13 says nothing, the prep of 14 names it, the wave keeps it, 15's prep clears it.
    T.setDay(12); T.startPrep();
    ok(st().day === 13 && T.getWavePreview(13).night.mod === null && st().mod === null, 'night 13 prep: no mod');
    T.startPrep();
    const pv = T.getWavePreview(14);
    ok(st().day === 14 && pv.night.mod === 'fog' && st().mod === 'fog', 'night 14 prep: named Fog Night (preview and director)');
    ok(pv.total === 600 && pv.night.trick === 'lake-surge' && pv.night.pushes.length === 5, 'night 14 preview: total 600, lake-surge, 5 pushes (' + pv.total + ')');
    T.beginWave(); T.clearZombies();
    ok(st().phase === 'wave' && st().mod === 'fog' && st().waveTotal === pv.total, 'through the wave it stays fog, total unchanged (' + st().waveTotal + ')');
    ok(T.nightKindForDay(14) === 'fog', 'night-cleared kind for 14 is fog (' + T.nightKindForDay(14) + ')');
    T.clearZombies(); T.startPrep();
    ok(st().day === 15 && st().mod === null && T.getWavePreview(15).night.mod === null, 'night 15 prep clears it');
    ok(T.nightKindForDay(13) !== 'fog' && T.nightKindForDay(15) !== 'fog', 'nights 13 and 15 are not fog');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
