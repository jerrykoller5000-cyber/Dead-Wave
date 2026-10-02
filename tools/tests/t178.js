// t178 - CL-85 (P-99): the guardian's last fight has its own music. A silenced day below loads it; through the rune door
// the heart's song plays (not the calm, not a day fight), by the fight's phase: the drops, then the second drop and the
// bridge, then the climax as the columns come down; the break while the Hush is flat; when it dies the song falls away
// and the long falling note plays alone; back up the tunnel, the calm again.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(100); } return !!f(); };
  const A = T.AudioSys, ms = () => A.musicState(), H = T.heartDbg;
  try {
    await startMatch(T, 'HeartScore');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    if (A.setMuted) A.setMuted(false);
    if (!ms().playing) A.startMusic();
    T.setPitSilenced(true);
    T.enterHollow({ theme: 'iron', cave: 0 });
    for (const z of T.zombies.filter((q) => q.below)) T.killZombie(z, false);
    H.markCleared();
    await until(() => ms().sectionsReady.fight_heart === true, 20000);
    ok(ms().sectionsReady.fight_heart === true, 'a silenced day below: the heart\'s song is loaded before the door');
    H.enter();
    await until(() => ms().stage === 'heart' && !!ms().section, 10000);
    ok(ms().stage === 'heart' && ms().deckTrack === 'fight_heart', 'through the door: the heart\'s song (' + ms().stage + '/' + ms().deckTrack + ')');
    ok(['dropA', 'riffB'].includes(ms().section), 'phase 1: the drops (' + ms().section + ')');
    const f = H.fight();
    f.damage(f.read().maxHp * 0.4);
    await until(() => ['dropA2', 'bridge'].includes(ms().section), 12000);
    ok(f.read().phase === 2 && ['dropA2', 'bridge'].includes(ms().section), 'phase 2: the second drop and the bridge (' + ms().section + ')');
    f.damage(f.read().maxHp * 0.35);
    await until(() => ms().section === 'climax', 12000);
    ok(f.read().phase === 3 && ms().section === 'climax', 'phase 3, the columns: the climax (' + ms().section + ')');
    H.hushBattery(0);
    await until(() => ms().section === 'break', 15000);
    ok(f.read().flat && ms().section === 'break', 'the Hush flat, nothing hurts it: the break (' + ms().section + ')');
    H.back();
    await until(() => ms().stage === 'calm', 8000);
    ok(ms().stage === 'calm', 'back up the tunnel: the calm again (' + ms().stage + ')');
    H.hushBattery();
    H.enter();
    await until(() => ms().stage === 'heart', 8000);
    const falls = ms().heartFalls, f2 = H.fight();
    f2.damage(1e9);
    await until(() => ms().stage === 'heartend', 5000);
    ok(ms().stage === 'heartend' && ms().heartFalls === falls + 1, 'it dies: the song falls away, the long falling note (' + ms().stage + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
