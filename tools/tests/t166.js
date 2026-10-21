// t166 - GB-93 (P-98): Swarm Night. Night 17's plan carries mod 'swarm': its runners from every cave (the plan's own
// 'all' caves and kinds, total unchanged), with faster pushes than a rest night's (shorter gaps between bodies, bigger
// bursts, shorter breathers). It's named the prep before (wavePreview.night.mod, getWaveDirectorState().mod), kept
// through the wave, cleared by the next prep; null on every other night 1-40 but 14 (fog), endless nights included.
// CU-77's night-cleared kind for 17 is 'swarm'.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const st = () => T.getWaveDirectorState();
  try {
    await startMatch(T, 'Swarm');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const bad = [];
    for (let d = 1; d <= 40; d++) {
      const m = T.nightPlanFor(d).mod || null;
      const want = d === 14 ? 'fog' : d === 17 ? 'swarm' : null;
      if (m !== want) bad.push(d + ':' + m);
    }
    ok(bad.length === 0, 'nightPlanFor: swarm on 17, fog on 14, null on every other night 1-40 ' + bad.join(' '));
    const p17 = T.nightPlanFor(17);
    ok(p17.total === 720 && p17.caves === 'all' && p17.pushes === 6 && p17.trick === 'surround-fast' && p17.kinds.feral === 90, 'night 17 keeps its total 720, every cave, 6 pushes, its 90 runners');
    const R = T.NIGHT_TIER.rest, pc0 = p17.pace;
    ok(!!pc0 && pc0.gap[0] < R.gap[0] && pc0.gap[1] < R.gap[1] && pc0.burst[0] > R.burst[0] && pc0.burst[1] > R.burst[1] && pc0.lull < R.lull,
      'faster pushes than a rest night: gap ' + JSON.stringify(pc0 && pc0.gap) + ' vs ' + JSON.stringify(R.gap) + ', burst ' + JSON.stringify(pc0 && pc0.burst) + ' vs ' + JSON.stringify(R.burst) + ', lull ' + (pc0 && pc0.lull) + ' vs ' + R.lull);
    ok(T.nightPlanFor(25).trick === 'surround-fast' && T.nightPlanFor(25).mod === null, 'night 25 reuses 17\'s plan without the swarm');
    T.setDay(15); T.startPrep();
    ok(st().day === 16 && T.getWavePreview(16).night.mod === null && st().mod === null, 'night 16 prep: no mod');
    T.startPrep();
    const pv = T.getWavePreview(17);
    ok(st().day === 17 && pv.night.mod === 'swarm' && st().mod === 'swarm', 'night 17 prep: named Swarm Night (preview and director)');
    T.beginWave(); T.clearZombies();
    const pc = T.getWavePace();
    ok(st().phase === 'wave' && st().mod === 'swarm' && st().waveTotal === pv.total, 'through the wave it stays swarm, total unchanged (' + st().waveTotal + ')');
    ok(!!pc && pc.day === 17 && pc.gap[1] === pc0.gap[1] && pc.burst[1] === pc0.burst[1] && pc.lull === pc0.lull, 'the live pace is the swarm pace');
    ok(T.nightKindForDay(17) === 'swarm' && T.nightKindForDay(14) === 'fog' && T.nightKindForDay(18) === 'siege', 'night-cleared kinds: 17 swarm, 14 fog, 18 siege');
    T.clearZombies(); T.startPrep();
    ok(st().day === 18 && st().mod === null && T.getWavePreview(18).night.mod === null, 'night 18 prep clears it');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
