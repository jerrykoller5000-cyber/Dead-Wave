# claude — CL-23 Jerry's music, in — 2026-09-24

Changed: all 22 of Jerry's Suno pieces are in the game.
- Converted from WAV (48 kHz, ~550 MB) to 192 kbps mp3 (48 MB), evened out in loudness (about
  -14.5 LUFS for fights, -14 for stings, Silent Night left quiet), peaks kept under -1 dB.
- Named after their slots in `assets/soundtrack/`: `fight_1a` (Tier 1), `fight_2a` (Tier 2),
  `fight_3a` (Tier 3), `fight_ember`, `boss_guardian`, `day_skirmish_a`/`_b`, `aftermath`,
  `fight_fog`, `fight_siege`, `fight_swarm`, `silent_drone`, six stings and four small cues.
- Hit points found from the audio (a sustained loud section, snapped to the nearest drum
  onset): Tier 1 at 15.7 s, Tier 2 at 2.9 s, Tier 3 from the top, Ember at 16.7 s, the guardian
  at 6.1 s, the day skirmishes at about 25 s. They live in `music.json`; anyone can change them.
- `music.json` puts each where it plays. Jerry's track leads its pool (the first fight of a
  session plays his), and the older `metal_*` tracks stay in rotation behind it for variety.

What plays when, now:
- The alarm: `sting_alarm` over the siren, and Tier 1 from its hit.
- Heavier fighting: Tier 2, then Tier 3.
- Ember Night: `sting_ember` when the horde arrives, then `fight_ember`.
- A guardian stepping out (planned, or poked out of a cave): `sting_guardian` and `boss_guardian`
  straight away.
- A fight in daylight with no alarm (a poke, later the guarded POIs): the day skirmish tracks.
- The last kill: `sting_clear`, then Jerry's aftermath.
- Night falling: `sting_night_falls`; dawn after a night: `sting_dawn`.
- Ready for later: Fog, Swarm, Siege and Silent nights play when the game names one
  (`state.special`, phase 3). The four small cues play through `AudioSys.musicCue('achievement' |
  'airdrop' | 'objective' | 'poi_cleared')` once those moments exist.

Files: assets/soundtrack/*.mp3 (22 new), assets/soundtrack/music.json, core/audio.js (music
director), index.html (the audio-direction block: `ember`, `guardian`, `special`), tools/tests/t60.js,
.gitignore (the WAV originals in `incoming/` stay out of git).

Also fixed: the director found the music relative to the page, so from a test page in
`tools/tests/` it looked in the wrong folder. It now resolves from `core/audio.js` itself.

Tests (my cloud copy, headless Chrome): t60 25 pass, 0 fail (the alarm, the wave, the clear,
music.json read, Jerry's tracks leading, the alarm sting with a file, the guardian's sting and
music in daylight, back to calm when it's gone, a day skirmish). t59 20/0, t45 8/0, t36 22/0.

Not verified: how it sounds. My test browser plays no audio. Jerry, you're the judge: sound the
alarm, kill the last one, poke a cave, wait for nightfall.
Requests: Cursor, commit these; don't commit `assets/soundtrack/incoming/*.wav` (now ignored).
Contract changes: `AudioSys.musicCue(name)`, and the audio-direction state gains `ember`,
`guardian`, `special`. Recorded in docs/contracts.md.
