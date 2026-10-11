# GP-177 · Zombie character and variation

Open `index.html` to compare v2 with the revised voices. Each type has all five states plus four-call idle and attack reels. Those reels demonstrate four different performances from one individual, with its vocal identity held consistent. The gallery contains 131 working sound links and never autoplays.

## What changed

- Four authored performances for each of 73 type/state combinations: 292 phrase variations, with different pauses, stresses, breaths, mouth movements and endings. Shuffled bags exhaust the four choices before repeating and prevent repetition at the bag boundary.
- Individual zombies retain their own pitch, mouth resonance, tempo, breath, grit and body weight through idle, attacks, pain and death. Audio keeps an opaque emitter token in a WeakMap; it does not read or modify enemy state. Old callers without the token remain supported.
- Six cached glottal throat shapes plus a chest waveform replace the shared organic sawtooth pair. Organic fold contractions vary irregularly; pitch, loudness and mouth shapes now follow multiple phrase landmarks. Chest harmonics preserve audible bass on ordinary speakers, and reverb differs with the voice.
- Soldiers mutter uneven syllables; ferals vary clipped barks and torn cries; shamblers alternate dragging exhales and jaw-clenched growls. Guardians alternate guttural huffs and rising shrieks. Brutes snarl from the chest, colossi have slow separated breaths, and bombers use shifting throat-drone resonances.
- Spiders use dry split hisses; spitters use pressure churn, ruptures and spray. The approved leaper/drowned base voices remain, with different click clusters and gurgling accents. Demons retain their distinct charge pattern, screamers vary strained screams, and cave guardians gain a hollow organic throat.

Maximum authored phrase length is 2.576 seconds with five actions; small per-individual timing differences apply at playback. Existing global sound limits remain. No AI, damage, animation, world, weapon mix or music changes.

## Proof

`node --test ui/zombie-audio.test.mjs ui/training-audio.test.mjs` → 16 passed, 0 failed. This includes stable identities across states, all-four phrase coverage, no repeats at bag boundaries or across interleaved actors, structural character differences, finite source coefficients, bounded layering and immediate attack/pain onsets. Existing v2 expectations were retained.

`npm test -- t24 t210 t220 t215 --jobs 1` → four checks, 43 passed, 0 failed. Chrome used the approved offscreen launch on this host.

`node review/zombie-audio-v3/render.mjs` → 70 state samples, 28 four-call reels, three special cues, two horde mixes and four Training routes passed. All 112 reel calls selected the four structural choices, independently of randomized waveform detail. All samples audible, finite and unclipped; maximum peak 0.766081, no browser errors. All 131 gallery WAV links resolve and new clips have complete tails. See `render-proof.json`.

`node review/zombie-audio-v3/gameplay.mjs` → 14 actual first-hit/death/unrewarded-death paths and emitter identities passed, no extra fatal pain. Eight actual attack mechanics, leaper movement, colossus steps, Training sound and mute passed with zero page errors. The first run's fixture incorrectly counted its own intentional legacy no-emitter mute calls in the live-identity audit; separating that probe corrected the fixture, and the full rerun passed without production changes. See `gameplay-proof.json`.

`node review/zombie-audio-v3/performance.mjs` → v2 59.93 FPS, v3 59.22 FPS (1.18% lower short sample), with 48 mixed bodies and exactly 13 identical timed voice calls in each run. Median frame time 16.4/16.6 ms; worst frame 22.4/21.8 ms. Same RTX 5080 at 1440×900, no errors, production hashes unchanged. Engine Training load 17.606/13.438 seconds includes startup, waits and entering Training; it is not a title appearance measurement or proof of a load speedup. See `performance-proof.json`.

`node review/zombie-audio-v3/audit.mjs` → production hashes match the audio renders, all 13 emitter hooks survive concurrent index edits, all 14 live identity paths pass. `hooks-proof.json` contains the exact before/after call changes.

Full-suite integration, sustained standard-view 60 FPS acceptance and human judgment of character/balance are not established by these focused checks. Antigravity has been asked to audition this v3 gallery rather than the superseded v2 version.
