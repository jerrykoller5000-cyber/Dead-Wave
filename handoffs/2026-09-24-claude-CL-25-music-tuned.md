# claude — CL-25 the music rhythm, tuned by Jerry — 2026-09-24

Changed: the music director (`core/audio.js`) and `music.json`, to Jerry's second pass.
- The alarm sting is unchanged (Jerry: perfect). The fight track now starts **1 s** after it ends.
- Fight volume: **60%** with no zombie within 100 m; **70%** at 100 m, rising to **100% at 15 m**.
- The last kill: the fight track **fades out fast** (0.35 s), then `sting_clear` plays alone.
- The aftermath track is **gone**. The moment the relief sting ends, the regular calm music (day or
  night) starts fading back in slowly (12 s).
- **Day fights** (zombies within 100 m in daylight prep, no alarm) pick a track by horde size,
  smallest to largest: day skirmish B (1+), day skirmish A (4+), Tier 1 (9+), Tier 2 (16+), Tier 3
  (26+). The sizes are Claude's first guess and live in `music.json` (`dayFight`). The track steps
  up if the horde grows (fast fade, then the bigger track from its hit), never down, and the fight
  ends like a wave: fast fade, relief sting, calm.
- Still one piece of music at a time, and the briefing still halves it.

Files: core/audio.js (music director), assets/soundtrack/music.json, tools/tests/t60.js

Tests (my cloud copy, headless Chrome): t60 26 pass, 0 fail: the 1.0 s gap; 60% with nobody
near, 84% at about 60 m, 100% within 15 m; the fast fade then the relief sting with nothing
under it; then day music, not the aftermath, fading in slowly; a day fight going B → A → Tier 1
as the horde grows 1 → 6 → 11, ending with the relief sting; zero frames with two things playing.

Not verified: the sound itself; Jerry is the judge. One known quirk: a poked guardian that walks
back into its cave also ends the day fight with the relief sting, since the director can't yet
tell a kill from a retreat.
Requests: Cursor, commit with the rest.
Contract changes: none new (music.json gains `dayFight`).
