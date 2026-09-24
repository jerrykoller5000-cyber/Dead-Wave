// t60 — CL-24/25: the music director, Jerry's rhythm. One piece of music at a time: the alarm
// cuts the music and its sting plays alone; one second later the fight track loops at 60%,
// 70% with a zombie within 100 m, full at 15 m; the last kill fades it out fast and the
// relief sting plays alone; then the calm music fades back in slowly. Day fights pick a
// track by horde size. The briefing board halves the music.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const A = T.AudioSys;
  const ms = () => A.musicState();
  const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
  const fire = (type) => window.dispatchEvent(new CustomEvent('dw-game', { detail: { type, day: T.getDay ? T.getDay() : 1 } }));
  try {
    const s0 = ms();
    const all = Object.values(s0.pools).flat();
    ok(!all.some((n) => /^fight_(breach|wire|ash_wind|run_the_line|teeth)$/.test(n)), 'the compose.py fight tracks are out of the pools');

    await startMatch(T, 'Music');
    if (!ms().playing) A.startMusic();
    await until(() => ms().stage === 'calm' && ms().deckTrack, 3000);
    const s1 = ms();
    ok(s1.pools.fight.length === 1 && s1.pools.fight[0] === 'fight_1a', 'every fight loops Tier 1 for now: ' + JSON.stringify(s1.pools.fight));
    ok(s1.gains.fight_1a >= 2.5 && s1.gains.sting_alarm >= 2.5, 'Jerry\'s tracks are boosted: ' + s1.gains.fight_1a);
    ok(s1.stage === 'calm' && !!s1.deckTrack, 'calm music in prep: ' + s1.deckTrack);

    // The briefing board halves the music, and closing it brings it back.
    fire('briefing-open');
    await until(() => ms().briefDuck < 0.56, 5000);
    ok(ms().briefDuck < 0.56, 'the briefing halves the music: ' + ms().briefDuck.toFixed(2));
    fire('briefing-closed');
    await until(() => ms().briefDuck > 0.94, 5000);
    ok(ms().briefDuck > 0.94, 'closing it restores the music: ' + ms().briefDuck.toFixed(2));

    // The alarm: the music is cut and the sting plays alone.
    fire('alarm-started');
    await wait(300);
    const s2 = ms();
    ok(s2.stage === 'alarm' && s2.sting === 'alarm', 'the alarm sting plays: ' + s2.stage + '/' + s2.sting);
    ok(!s2.deckTrack, 'nothing else plays under it: ' + s2.deckTrack);
    ok(s2.lastCue && s2.lastCue.played === true, 'the sting had a file');
    setTimeout(() => T.beginWave(), 5000);   // the wave begins five seconds after the alarm, as in the game
    await until(() => ms().stage !== 'alarm', 12000);
    ok((ms().stage === 'gap' || ms().stage === 'fight') && !ms().sting, 'then straight into the fight: ' + ms().stage);
    const tGap = Date.now();
    await until(() => ms().stage === 'fight', 4000);
    const gap = (Date.now() - tGap) / 1000;
    ok(ms().stage === 'fight' && ms().deckTrack === 'fight_1a', 'then Tier 1: ' + ms().deckTrack);
    ok(gap < 0.5, 'the moment the sting ends (CL-26): ' + gap.toFixed(1) + ' s');
    ok(T.getPhase() === 'wave', 'the wave is on');

    // Proximity: the floor with nobody near, louder as one closes in.
    T.clearZombies && T.clearZombies();
    await wait(1500);
    ok(Math.abs(ms().prox - 0.4) < 0.03, 'Tier 1 at 40% with nobody within 150 m: ' + ms().prox.toFixed(2));
    const p = T.player.position;
    const far = T.spawnZombie(p.x + 42, p.z + 42, 'shambler', true, true);   // ~60 m
    await wait(2500);
    ok(ms().prox > 0.72 && ms().prox < 0.9, 'at about 60 m it has climbed to ~80%: ' + ms().prox.toFixed(2));
    T.clearZombies && T.clearZombies();
    T.spawnZombie(p.x + 3, p.z + 3, 'shambler', true, true);
    await wait(2500);
    ok(ms().prox > 0.97, 'full within 20 m: ' + ms().prox.toFixed(2));

    // The last kill: the fight fades out fast, then the relief sting plays alone.
    T.clearZombies && T.clearZombies();
    T.startPrep();
    await wait(100);
    ok(ms().stage === 'release', 'the fight fades out fast first: ' + ms().stage);
    await wait(600);
    const s3 = ms();
    ok(s3.stage === 'relief' && s3.sting === 'clear', 'then the relief sting: ' + s3.stage + '/' + s3.sting);
    ok(!s3.deckTrack, 'with nothing under it: ' + s3.deckTrack);
    await until(() => ms().stage !== 'relief', 11000);
    const s4 = ms();
    ok(s4.stage === 'calm' && !!s4.deckTrack && s4.deckTrack !== 'aftermath', 'then the regular calm music, not the aftermath: ' + JSON.stringify({stage: s4.stage, t: s4.deckTrack, m: s4.mood, n: s4.nextMood}));
    await wait(2000);
    ok(ms().deckLevel > 0.05 && ms().deckLevel < 0.3, 'fading back in slowly: ' + ms().deckLevel.toFixed(2));

    // A day fight: no alarm, the track follows the horde's size, and ends like a wave.
    T.spawnZombie(p.x + 10, p.z + 10, 'shambler', true, true);
    await until(() => ms().stage === 'dayfight' && ms().deckTrack, 3000);
    ok(ms().deckTrack === 'day_skirmish_b', 'one zombie in daylight: day skirmish B: ' + ms().deckTrack);
    for (let i = 0; i < 5; i++) T.spawnZombie(p.x + 12 + i, p.z + 10, 'shambler', true, true);
    await until(() => ms().deckTrack === 'day_skirmish_a', 3000);
    ok(ms().deckTrack === 'day_skirmish_a', 'six: steps up to day skirmish A: ' + ms().deckTrack);
    for (let i = 0; i < 5; i++) T.spawnZombie(p.x + 12 + i, p.z + 14, 'shambler', true, true);
    await until(() => ms().deckTrack === 'fight_1a', 3000);
    ok(ms().deckTrack === 'fight_1a', 'eleven: Tier 1: ' + ms().deckTrack);
    T.clearZombies && T.clearZombies();
    await until(() => ms().stage === 'relief', 3000);
    ok(ms().stage === 'relief' && ms().sting === 'clear', 'the day fight ends with the relief sting too');

    ok(ms().overlapFrames === 0, 'never a sting and music at once: ' + ms().overlapFrames + ' frames');
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
