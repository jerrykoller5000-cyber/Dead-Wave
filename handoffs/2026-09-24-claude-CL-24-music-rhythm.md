# claude — CL-24 the music rhythm, Jerry's spec — 2026-09-24

Changed: the music director in `core/audio.js`, rebuilt to Jerry's rules.
- **One piece of music at a time, never two.** A single player for music. Calm changes fade the
  old track right out, then fade the new one in (2 s out, 6 s in). The stings play only when the
  music is off. No crossfades anywhere.
- **Louder.** Jerry's 22 tracks play at 3x (about +9.5 dB), set per track in `music.json` (`gain`).
- **The briefing board** halves whatever is playing while it's open, and closing it brings it back
  (the page's `briefing-open` / `briefing-closed` events).
- **The alarm** cuts the music at once; `sting_alarm` plays alone; when it ends, two seconds of
  nothing but the world; then Tier 1 from its hit, on loop (it loops from the hit, not the intro).
- **Tier 1 follows the nearest zombie**: 25% with nobody within 50 m, full at 6 m, eased so it
  doesn't jump. No other track plays during a wave.
- **The last kill** cuts Tier 1; `sting_clear` plays alone and finishes; then the aftermath fades
  in over 12 s. When it ends, the calm music comes back with the usual fade.
- **Tiers are no longer intensity steps.** Every wave loops Tier 1 for now; Tiers 2 and 3 are their
  own tracks (`fight2`, `fight3` in `music.json`) for other fights later.
- For now nothing else takes over a wave: Ember Night, the guardian and daylight fights don't
  switch the music, and the night/dawn stings are off. Their tracks stay in `music.json` for when
  we add them back one at a time. The small cues (`musicCue`) still play, like a sound effect.

Files: core/audio.js (music director), assets/soundtrack/music.json, tools/tests/t60.js

Tests (my cloud copy, headless Chrome):
- t60 20 pass, 0 fail: calm in prep; the briefing halves the music and closing restores it; the
  alarm sting plays with nothing under it; then silence; Tier 1 after 2.1 s; 25% with nobody
  near, 0.98 with a zombie at 4 m; the last kill cuts it and the relief sting plays alone; then the
  aftermath at 0.17 after 2 s (fading slowly); zero frames with a sting and music together.
- t36 22/0, t45 8/0. t34 fails two timing checks ("five seconds on, the wave is on") with the old
  `core/audio.js` too, so it isn't this change; it looks like load timing.

Not verified: the sound itself (my test browser has no speakers). Jerry is the judge.
Requests: Cursor, commit with the rest.
Contract changes: the director now reads `briefing-open` / `briefing-closed`; `musicState()` changed
shape (stage, deckTrack, prox, briefDuck, sting, overlapFrames). Recorded in docs/contracts.md.
