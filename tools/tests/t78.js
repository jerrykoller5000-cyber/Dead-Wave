// t78 - GB-53 (Jerry, item 1): nights 1 to 20 as fun as they can be. Every night has its own plan
// (NIGHT_PLAN): the horde sizes stay, but the mix, the caves, the trick and the pacing change night
// to night. Days 1-3 teach, 4-10 build, 11-20 test; rest nights are lighter than the nights either
// side; the boss heads the last push; a night comes in pushes with a breather between them.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(40); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    const P = T.NIGHT_PLAN;
    ok(Array.isArray(P) && P.length === 21 && typeof T.nightPlanFor === 'function', 'NIGHT_PLAN has nights 1 to 20');
    const TOT = [0, 15, 50, 100, 130, 220, 213, 300, 350, 390, 430, 470, 418, 560, 600, 640, 680, 720, 631, 810, 850];
    const badTot = [];
    for (let d = 1; d <= 20; d++) if (P[d].total !== TOT[d]) badTot.push(d + ':' + P[d].total);
    ok(badTot.length === 0, 'every night keeps its horde size (15, 50, 100 ... 850) ' + badTot.join(' '));
    ok(new Set(P.slice(1).map((p) => p.trick)).size === 20, 'twenty nights, twenty different tricks');
    let actOk = true;
    for (let d = 1; d <= 20; d++) if (P[d].act !== (d <= 3 ? 'teach' : d <= 10 ? 'build' : 'test')) actOk = false;
    ok(actOk, 'days 1-3 teach, 4-10 build, 11-20 test');

    await startMatch(T, 'Nights');
    await until(() => T.getPoiGuards().zombies.length > 0, 8000);
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.setHp(1e6);
    const nCaves = T.POI.caves.length;
    const chalk = T.POI.caves.findIndex((c) => c.theme === 'chalk');
    const share = [], fails = [];
    const bad = (d, m) => fails.push('n' + d + ' ' + m);
    for (let d = 1; d <= 20; d++) {
      T.setDay(d - 1); T.startPrep();
      const pv = T.getWavePreview(); const p = P[d];
      if (!pv || pv.day !== d) { bad(d, 'no preview'); continue; }
      const boss = (d >= 6 && d % 6 === 0) ? 'guardian' : (d % 5 === 0 ? 'colossus' : null);
      const c = {}; for (const k of pv.queue) c[k] = (c[k] || 0) + 1;
      if (pv.total !== p.total + (boss ? 1 : 0)) bad(d, 'total ' + pv.total);
      for (const k of Object.keys(p.kinds)) if ((c[k] || 0) !== p.kinds[k]) bad(d, k + ' ' + (c[k] || 0) + '/' + p.kinds[k]);
      if (boss && c[boss] !== 1) bad(d, 'boss ' + boss);
      if (!boss && (c.colossus || c.guardian)) bad(d, 'unplanned boss');
      if (pv.bloodMoon !== (d >= 4 && d % 4 === 0)) bad(d, 'bloodMoon ' + pv.bloodMoon);
      if (pv.surround !== (p.caves === 'all')) bad(d, 'surround ' + pv.surround);
      const wantCaves = boss === 'guardian' ? 1 : p.caves === 'all' ? nCaves : Math.min(p.caves, nCaves);
      if (pv.caveIndices.length !== wantCaves) bad(d, 'caves ' + pv.caveIndices.length + '/' + wantCaves);
      if (boss === 'guardian' && pv.caveIndices[0] !== chalk) bad(d, 'guardian not chalk');
      const gr = pv.groundRisers || 0;
      if (d === 1 ? (gr < 7 || gr > 8) : gr !== (p.ground || 0)) bad(d, 'ground ' + gr);
      const pushes = pv.night && pv.night.pushes;
      if (!pushes || pushes.reduce((a, b) => a + b, 0) !== pv.total || pushes.length !== (p.pushes || 1)) bad(d, 'pushes ' + JSON.stringify(pushes));
      if (!pv.night || pv.night.trick !== p.trick) bad(d, 'trick');
      if (boss && pushes) {
        const bi = pv.queue.indexOf(boss), lastStart = pv.total - pushes[pushes.length - 1];
        if (!(bi >= lastStart && bi < pv.total - 1)) bad(d, 'boss at ' + bi + ' (last push from ' + lastStart + ')');
      }
      share[d] = (pv.total - (c.shambler || 0) - (boss ? 1 : 0)) / p.total;
      if (d === 8) { let run = 0, best = 0; for (const k of pv.queue) { if (k === 'bomber') { run++; best = Math.max(best, run); } else run = 0; } if (best < 10) bad(d, 'bomber pack ' + best); }
      if (d === 9) { let run = 0, packs = 0; for (const k of pv.queue.concat('x')) { if (k === 'feral') run++; else { if (run >= 10) packs++; run = 0; } } if (packs < 8) bad(d, 'feral packs ' + packs); }
    }
    ok(fails.length === 0, 'each night plays its plan: kinds, boss, Ember Night, caves, ground, pushes, trick ' + fails.slice(0, 6).join('; '));
    const pct = (d) => Math.round(share[d] * 100);
    const restOk = [7, 11, 14, 17].every((d) => share[d] < share[d - 1] && share[d] < share[d + 1]);
    ok(restOk, 'rest nights are lighter than either side: ' + [6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((d) => d + ':' + pct(d) + '%').join(' '));
    const avg = (a, b) => { let s = 0; for (let d = a; d <= b; d++) s += share[d]; return s / (b - a + 1); };
    ok(avg(1, 3) < avg(4, 10) && avg(4, 10) < avg(11, 20) && share[20] >= Math.max(...share.slice(1, 20)), 'the specialist share climbs: teach ' + Math.round(avg(1, 3) * 100) + '%, build ' + Math.round(avg(4, 10) * 100) + '%, test ' + Math.round(avg(11, 20) * 100) + '%, night 20 ' + pct(20) + '%');

    // Pacing: night 2 comes in two pushes. The first push, then a breather: nothing spawns while the
    // field is full; once it's down to 5 the breather runs its lull and the second push comes.
    const st = () => T.getWaveDirectorState();
    T.setDay(1); T.startPrep();
    const pv2 = T.getWavePreview();
    T.skipGrace && T.skipGrace(); T.beginWave();
    T.clearZombies();
    T.player.position.set(0, T.sampleHeight(0, 0), 0);
    let i = 0;
    for (; i < 3000 && !(st().pace && st().pace.inLull); i++) T.spawnWaveBatch(0.25);
    const s0 = st().waveSpawned;
    ok(st().pace && st().pace.inLull && s0 === pv2.night.pushes[0], 'night 2: push 1 is ' + s0 + ' of ' + pv2.total + ', then a breather');
    for (let k = 0; k < 40; k++) T.spawnWaveBatch(0.25);
    ok(st().waveSpawned === s0 && st().pace.inLull, 'no spawns in the breather while ' + T.zombies.filter((z) => z.alive).length + ' are still up');
    T.clearZombies();
    let steps = 0;
    while (st().pace.inLull && steps < 400) { T.spawnWaveBatch(0.25); steps++; }
    const lull = pv2.night.lull;
    ok(steps * 0.25 >= lull - 0.3 && steps * 0.25 <= lull + 0.6, 'field cleared: the breather lasts ' + (steps * 0.25) + ' s (lull ' + lull + ' s)');
    for (let k = 0; k < 60; k++) T.spawnWaveBatch(0.25);
    ok(st().waveSpawned > s0 && st().pace.push === 1, 'push 2 comes (' + st().waveSpawned + ' out)');
    // A camper doesn't hold the night up: night 3's first breather ends after 30 s regardless.
    T.clearZombies();
    T.setDay(2); T.startPrep(); T.skipGrace && T.skipGrace(); T.beginWave();
    for (i = 0; i < 3000 && !(st().pace && st().pace.inLull); i++) T.spawnWaveBatch(0.25);
    steps = 0;
    while (st().pace.inLull && steps < 400) { T.spawnWaveBatch(0.25); steps++; }
    ok(steps * 0.25 >= 29.5 && steps * 0.25 <= 30.5, 'a full field waits at most 30 s: ' + (steps * 0.25) + ' s');
    T.clearZombies();
    // Day 1 is D-29's: one push of 15, the old burst pacing, no breather.
    T.setDay(0); T.startPrep();
    const pc = st().pace;
    ok(pc && pc.pushes === 1 && T.getWavePace().burst[0] === 5 && T.getWavePace().burst[1] === 9 && st().waveTotal === 15, 'day 1: one push of 15, bursts 5-9 as before');
    // Past 20 the test nights come round again, on the old day curve.
    T.setDay(22); T.startPrep();
    ok(st().waveTotal === 980 && T.nightPlanFor(23).endless === true, 'night 23: ' + st().waveTotal + ' (the old curve), plan ' + T.nightPlanFor(23).trick);
    ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
