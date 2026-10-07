// t210 - CL-130 (Jerry's playthrough 1: "We need unique sounds for the different zombies").
//  - Every walker kind has its own throat (core/audio.js DEAD_VOICES): no two kinds share the same pitch band and vowel,
//    and each has an idle, a hunting and a swinging voice. They all play without error.
//  - In the game the kinds that are near and hunting him speak in their own voice, and the dead are heard on their feet
//    close up: a shambler's scuff, a hopper's thump, a crawler's slap and drag.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'DeadVoices');
    T.clearZombies(); T.setHp(100000); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const A = T.AudioSys, V = A.DEAD_VOICES;
    const kinds = ['shambler', 'feral', 'leaper', 'drowned', 'military', 'brute', 'spitter', 'screamer', 'bomber'];
    ok(kinds.every((k) => V[k] && V[k].idle && V[k].chase && V[k].attack), 'each walker kind has an idle, a hunting and a swinging voice');
    const sig = (k) => { const s = V[k].idle; return Math.round((s.f[0] + s.f[1]) / 2 / 15) + s.vowel + (s.muffle ? 'm' : '') + Math.round(s.rough[1] / 10); };
    const sigs = kinds.map(sig);
    ok(new Set(sigs).size === kinds.length, 'no two kinds sound alike at rest (pitch band, vowel, mask, rasp): ' + kinds.map((k, i) => k + ' ' + sigs[i]).join(', '));
    const lo = kinds.reduce((m, k) => Math.min(m, V[k].idle.f[0]), 1e9), hi = kinds.reduce((m, k) => Math.max(m, V[k].idle.f[1]), 0);
    ok(V.brute.idle.f[1] < V.shambler.idle.f[0] && V.screamer.idle.f[0] > 3 * V.shambler.idle.f[1], 'the brute is under the shambler, the screamer far over it (' + lo + '-' + hi + ' Hz across the kinds)');
    A.unlock && A.unlock();
    let threw = null;
    for (const k of kinds) for (const st of ['idle', 'chase', 'attack']) { try { A.deadVoice(V[k][st], 0.5, 0); } catch (e) { threw = k + '/' + st + ': ' + e.message; } }
    ok(!threw, 'every throat plays' + (threw ? ' (' + threw + ')' : ''));
    // In the game: a feral hunting him speaks as a feral; the dead's steps are heard close up.
    const P = T.player.position;
    const c0 = { ...A.voiceCount }, s0 = { ...A.stepCount };
    const f = T.spawnZombie(P.x + 16, P.z, 'feral', true, true);
    const sh = T.spawnZombie(P.x - 12, P.z, 'shambler', true, true);
    const hp = T.spawnZombie(P.x, P.z + 12, 'shambler', true, true); T.dismemberDbg(hp, 'legL');
    const cr = T.spawnZombie(P.x, P.z - 10, 'shambler', true, true); T.dismemberDbg(cr, 'legL'); T.dismemberDbg(cr, 'legR');
    const t0 = Date.now(), sim0 = T.getSimTime ? T.getSimTime() : 0;
    const d = (k, o) => (o[k] || 0);
    // 12 s of game time (a loaded page runs slow; wall time alone sometimes gave the feral no turn to speak).
    while ((T.getSimTime ? T.getSimTime() - sim0 < 12 : Date.now() - t0 < 12000) && Date.now() - t0 < 45000) {
      await wait(200);
      if (d('feral', A.voiceCount) > d('feral', c0) && d('hop', A.stepCount) > d('hop', s0) && d('crawl', A.stepCount) > d('crawl', s0) && d('shambler', A.stepCount) > d('shambler', s0)) break;
    }
    ok(d('feral', A.voiceCount) > d('feral', c0), 'the feral hunting him speaks in its own voice (' + (d('feral', A.voiceCount) - d('feral', c0)) + ' times)');
    ok(d('shambler', A.stepCount) > d('shambler', s0), 'a shambler is heard on its feet (' + (d('shambler', A.stepCount) - d('shambler', s0)) + ' steps)');
    ok(d('hop', A.stepCount) > d('hop', s0), 'a hopper thumps (' + (d('hop', A.stepCount) - d('hop', s0)) + ')');
    ok(d('crawl', A.stepCount) > d('crawl', s0), 'a crawler slaps and drags (' + (d('crawl', A.stepCount) - d('crawl', s0)) + ')');
    T.clearZombies(); T.runDevCommand('godmode off');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
