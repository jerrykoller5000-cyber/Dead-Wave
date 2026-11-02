# Antigravity — AG-197 tcl275d (the score's calm) on the PC — 2026-11-02

Changed: Executed comprehensive real-hardware verification on NVIDIA GeForce RTX 5080 WebGPU hardware under the shared game-test slot for Claude's CL-275 score calm pools (`tcl275d`) alongside the full audio regression suite (`t73`, `t60`, `t61`, `tcl275a`):

1. **`tcl275d` (The Score's Calm Pools): PASS 7 / 0 FAIL (Backend: WebGPU)**
   - Score calm pools verified registered in score definition:
     - `menu`: `gh/gh-place-menu`
     - `dawnprep`: `gh/gh-place-dawn`
     - `day`: `gh/gh-place-hq`, `gh/gh-place-menu`
     - `dusk`: `gh/gh-place-dusk`
     - `night`: `gh/gh-place-dusk`
     - `aftermath`: `gh/gh-place-hq`
     - `dawn`: `gh/gh-place-dawn`
     - `fallen`: `gh/gh-place-fallen`
   - With score OFF: Old calm pool verified (`calm_day`).
   - With score ON: Day pool switches cleanly to score's place tracks (`gh/gh-place-hq`, `gh/gh-place-menu`).
   - Place audio playback verified on real hardware: calm plays `gh/gh-place-dawn` (`gh-place-dawn.ogg`).
   - Audibility verified: `volume > 0.01` (`0.012`, level `0.15`, `calm/dawnprep/gh/gh-place-dawn`, `err null`).
   - Seamless reversion: Turning score OFF immediately restores the old day pool (`calm_day`).
   - Zero page errors.

2. **`t73` (Day 1 Wave Sections & Sectioned Audio Player): PASS 12 / 0 FAIL (Backend: WebGPU)**
   - Day 1 sections preloaded and decoded before the wave.
   - Fight starts on Day 1 song (`fight/elevenlabs/night-01`).
   - Out-of-sight horde triggers stalk section, looping sample-accurately on 8 bars (`{"start":0,"end":20,"loop":true}`).
   - Zombie within 45 m dynamically drops into `dropA` on bar line (`{"start":20,"end":60,"loop":true}`).
   - Lull triggers break section; resumed combat transitions to `riffB`; 3 zombies remaining brings `climax`.
   - Verified audible (`volume: 0.132`), zero overlap frames between stings and music.

3. **`t60` (Music Director Jerry's Rhythm Suite): PASS 43 / 0 FAIL (Backend: WebGPU)**
   - Legacy compose.py fight tracks confirmed removed from pools.
   - 20 distinct night songs confirmed across waves 1-20 (CL-128); all 20 decoded as section songs.
   - Night curve verified (CL-70): +0 dB on nights 1-2, scaling monotonically to +2.5 dB by night 19; floor scales from 70% to 85%.
   - Briefing board ducking confirmed: halves music (`0.56`), closing restores music (`0.95`).
   - Jerry's metal alarm sting (`sting_alarm_metal`) triggers solo over klaxon with 3.0 s camera shake; switches cleanly into fight music with gapless loop and build.
   - Proximity attenuation verified: 73% at >150 m, 87% at 60 m, 97% within 20 m.
   - Wave clear relief sting plays solo; calm music smoothly fades back in.
   - Day fight skirmish escalation and camp clear stinger pass with zero overlap frames.

4. **`t61` (Wave Finisher & Red Pulse Mechanics): PASS 22 / 0 FAIL (Backend: WebGPU)**
   - Night 9 song (`fight/elevenlabs/night-09`) plays after alarm.
   - Last kill triggers wave finisher: 2.4 s finisher shot, 3.0 s slow motion, color drain, red pulse confirmed.
   - Fight music cut dead; relief sting plays solo with all other SFX muted.
   - Camera orbit (137 degrees) tracks smoothly around zombie corpse (2.2-4.0 m distance, never clipping terrain).
   - Calm music (`night_embers`) and environmental audio fade back in after finisher ends.

5. **`tcl275a` (CL-275 Dynamic Multi-Track Layered Score on GPU): PASS 12 / 0 FAIL (Backend: WebGPU)**
   - All 20 nights present in score definition, inactive until opted into.
   - `setScore(true)` opts into `gh/night-01`, Scarecrow kit plays via HTTP asset server, loops on 16 bars at 105 bpm sample-accurately (`{"start":0,"end":36.5714375,"loop":true}`).
   - Real-time layer attenuation verified on GPU:
     - Distant horde: drums + bass alone (`{"drums":1,"rhythm":0,"lead":0}`).
     - Zombie within 45 m: rhythm guitars dynamically activate (`{"drums":1,"rhythm":0.937,"lead":0}`).
     - Zombie within 20 m: leads dynamically activate (`{"drums":1,"rhythm":1,"lead":0.953}`).
   - Zero sting collisions (0 frames), clean restoration on `setScore(false)`.

Files:
- `qa/2026-11-02-AG-197/ag197-telemetry.json` (Structured telemetry for all 5 suites)
- `qa/2026-11-02-AG-197/run-ag197.mjs` (Benchmarking driver script)
- Visual captures: `tcl275d.png`, `t73.png`, `t60.png`, `t61.png`, `tcl275a.png`.

Tests: Real-GPU test suite `run-ag197.mjs` executed under game-test slot (exit code 0). 96 PASS / 0 FAIL across `tcl275d` (7/0), `t73` (12/0), `t60` (43/0), `t61` (22/0), and `tcl275a` (12/0).

Not verified: Audio performance on non-WebGPU software backends (tested on hardware RTX 5080 WebGPU as ordered).

Requests: Answered Claude's "AG-197: tcl275d (the score's calm) on the PC" with DONE.

Contract changes: None.
