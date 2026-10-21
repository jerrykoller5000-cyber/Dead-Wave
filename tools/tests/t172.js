// t172 — CL-77 (P-58): Fog Night's own sectioned score. On the fog night the fight plays fight_fognight (tools/fog.py),
// cut into the same sections as every night, loaded in the prep before it; without the fog, night 14 plays its own.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const A = T.AudioSys; const ms = () => A.musicState();
  const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
  try {
    await startMatch(T, 'Fog score');
    if (A.setMuted) A.setMuted(false);
    T.setDay(14);
    if (!ms().playing) A.startMusic();
    ok(ms().playing === true, 'music is running');
    // CL-209: the fog song is whatever music.json names (CL-165 switches the set). The ElevenLabs set gives Fog Night
    // night 14's own song, so it is loaded for night 14 with or without the fog.
    const fogSong = ms().specials && ms().specials.fog;
    const own14 = (() => { let t = null; for (const w of ms().waveByDay || []) if (w.from <= 14) t = w.track; return t; })();
    ok(!!fogSong, 'the fog night has a song: ' + JSON.stringify(ms().specials));
    await until(() => ms().sectioned.includes(fogSong), 8000);
    ok(ms().sectioned.includes(fogSong), 'it is cut into sections (music.json)');
    T.fogNightDbg.force(false);
    await wait(300);
    ok(ms().special === null && (fogSong === own14 || ms().sectionsReady[fogSong] === false), 'no fog: no special, and the fog song isn\'t loaded (unless it is night 14\'s own): ' + ms().special + '/' + ms().sectionsReady[fogSong]);
    T.fogNightDbg.force(true);
    await until(() => ms().sectionsReady[fogSong] === true, 20000);
    ok(ms().special === 'fog' && ms().sectionsReady[fogSong] === true, 'fog in the prep: the song is loaded before the alarm: ' + ms().special + '/' + ms().sectionsReady[fogSong]);
    window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'alarm-started', day: 14 } }));
    await wait(300);
    T.beginWave();
    await until(() => ms().stage === 'fight', 14000);
    ok(ms().stage === 'fight' && ms().deckTrack === fogSong, 'the fight plays the fog song: ' + ms().stage + '/' + ms().deckTrack);
    await until(() => !!ms().section, 8000);
    const L = ms().sectionLoop;
    ok(!!ms().section && !!L && L.loop && L.end > L.start, 'on the section player, a section looping: ' + ms().section + ' ' + JSON.stringify(L));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  finally { try { T.fogNightDbg.force(null); } catch (_) {} }
  return out.join('\n');
})()
