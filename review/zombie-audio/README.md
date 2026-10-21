# GP-175 — individual zombie voices

Open `index.html` to audition idle, attack, hit reaction and death for all 14 types. The WAV samples come from the real AudioSys mixer; they are review assets, not files loaded by the game.

Added complete hollow/gravel voices for guardian and nasal/fluttering voices for caveguard, distinct charge/slam bellows for demon and colossus, and brittle pain/unraveling death clicks for spider. The nine established walker voice definitions and existing special idle sounds remain in the original renderer.

First-hit reactions no longer depend on a 30% random chance. Separate ambient, attack and pain limits keep idle chatter from swallowing combat feedback while bounding the horde's audio work. Surviving hits trigger pain; fatal hits retain the flesh impact and trigger the death cry. Unrewarded kills (including self-detonating bombers) also have a death sound. Training allows the three zombie voice APIs while retaining its existing muted world ambience and cinematic announcements.

## Proof

- `node --test ui/zombie-audio.test.mjs ui/training-audio.test.mjs`: 9 passed, 0 failed.
- `node review/zombie-audio/render.mjs`: 56 audible, finite and unclipped samples; 14 different waveform signatures per state; 27 before/after comparisons with identical established walker voice definitions; all four guardian states audible in Training; no browser errors. See `render-proof.json`. Random procedural variation means the rendered waveforms need not be bit identical.
- `node review/zombie-audio/gameplay.mjs`: all 14 actual first-hit, fatal-hit and unrewarded-death paths pass; eight actual attack mechanics pass; mute remains effective; zero page errors. With 48 mixed bodies, 60.07 FPS muted and 59.66 FPS voiced. See `gameplay-proof.json`.
- `node review/zombie-audio/load.mjs`: title-load comparison serves the old/new audio source in the same browser, without editing production files. See `load-proof.json`.
- `npm test -- t23 t24 t210 t220 t215 --jobs 1`: did not execute tests; existing preflight stops at `index.html:1872 sceneCull` reading `player.position`. Owner notified; guard not changed.

No models, zombie damage/AI rules, weapon mix, music score, public AudioSys signatures or world seeds changed. Human listening review has been requested from Antigravity; automated signal checks cannot establish subjective sound quality.
