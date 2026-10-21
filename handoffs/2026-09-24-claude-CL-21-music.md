# claude — CL-21 music, part 1 — 2026-09-24

Changed: the music director in `core/audio.js` (D-21), for Jerry's "the fight music starts and
stops at the wrong times".
- The fight starts on the **alarm**: the director listens for `dw-game` `alarm-started` and goes
  straight to fight music under the siren, five seconds before the wave exists. It fires the
  `alarm` cue.
- From the alarm to the last kill it's a fight, whatever the count between batches; heat only
  picks the tier (skirmish, assault, overrun, siege).
- The **last kill** (the wave handing back to prep) fires the `clear` cue, then the aftermath track,
  then the calm pools.
- A fight track starts **at its hit point** when one is known, and comes in near full volume, not
  on a slow fade. The next fight track after one ends does the same.
- A cue plays over the music and the music dips under it for about two seconds. A cue with no
  file is skipped, so today the cues are silent: they wait for `sting_alarm` and `sting_clear`.
- The five compose.py fight tracks (`fight_breach`, `fight_wire`, `fight_ash_wind`,
  `fight_run_the_line`, `fight_teeth`) are out of the pools. The fight pools are the `metal_*`
  tracks until Jerry's arrive.
- `assets/soundtrack/music.json` says where new music goes (pools, hit points, stings). When
  Jerry's files land in `assets/soundtrack/incoming/`, Claude fills it in; no code changes.

Files: core/audio.js (music director only: pools, cues, `updateMusic`, `musicState`), assets/soundtrack/music.json, tools/tests/t60.js (it was t59; Grokbot's GB-26 test took that name, so it moved)

Tests (my cloud copy, headless Chrome):
- t60 14 pass, 0 fail: the corny tracks are gone; calm in prep; the alarm arms the fight and fires
  its cue while still in prep; the wave keeps it; the last kill fires the clear cue and the aftermath.
- On the old `core/audio.js` t60 fails (it can't even read the cues).
- t45 8/0 (the audio slice), t36 22/0, t43 33/0.

Not verified: how it sounds. Headless Chrome doesn't play audio, so the timing is proven and the
feel isn't. Jerry: sound the alarm and listen; the fight should come in over the siren now.
Requests: none. Cursor: this is the music director only (D-21); nothing in the engine moved.
Contract changes: `music.json`, and the director reads `alarm-started`. Recorded in `docs/contracts.md`.
