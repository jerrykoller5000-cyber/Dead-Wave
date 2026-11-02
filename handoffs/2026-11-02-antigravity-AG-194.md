# Antigravity — AG-194 CL-275 score on GPU, night 20 memory and Training Ground motifs — 2026-11-02

Changed: Executed comprehensive real-hardware GPU verification on NVIDIA GeForce RTX 5080 WebGPU hardware for Claude's CL-275 (1.2 interactive dynamic score, opt-in) under the shared game-test slot:
1. Real Renderer Suite Checks:
   - `tcl275a` (Nights' layers): PASS 12 / 0 FAIL. Verified 20 nights present in score definition, `AudioSys.setScore(true)` opts into `gh/night-01`, Scarecrow kit plays via real HTTP asset server, loops on 16 bars at 105 bpm sample-accurately (`{"start":0,"end":36.5714375,"loop":true}`), bar length 2.29 s. Distance-based layer attenuation confirmed: distant horde has drums+bass alone (`drums: 1.0, rhythm: 0.048, lead: 0.0`), zombie within 45 m dynamically brings in rhythm guitars (`rhythm: 0.986`), zombie within 20 m dynamically brings in leads (`lead: 0.920`). `overlapFrames === 0` (zero sting collision), and clean fallback/restoration on `setScore(false)`.
   - `tcl275b` (Specials suites): PASS 6 / 0 FAIL. Verified specials registered (`guardian: gh/guardian`, `redsky: gh/redsky`, `colossus: gh/colossus`, `heart: gh/heart`, `wanderer: gh/wanderer`). Colossus spawn switches suite to Titan (`gh/colossus/titan`) on bar line, looping on 16 bars at 130 bpm (`{"start":0,"end":29.538458,"loop":true}`). When colossus dies, music returns seamlessly to night 1 suite (`gh/night-01`) on bar line. `overlapFrames === 0`, zero page errors.
   - `tcl275c` (Training Ground motifs): PASS 7 / 0 FAIL. Verified all 12 monster motifs registered (`score.motifs`), feral spawn requests `gh/motif-feral`, plays Frenzy kit (`gh/motif-feral/frenzy`) from drums alone (`drums: 1, rhythm: 0, lead: 0`), practice clear cleanly terminates motif, zero page errors.
   - `t182` (Training Ground baseline mechanics & audio): PASS 36 / 0 FAIL. Title menu entry, unarmed spawn behind firing line, copies of CIF, kiosk, Armory, panel, skull window, target knockdown and reset, zombie calling, death blackout, and bed recovery all completely green on real renderer.
2. Night 20 Peak Wave Memory Benchmark:
   - Evaluated Night 20 at push 6/6 wave peak (48 active zombies under high swarm load).
   - Score OFF baseline: Used JS Heap = 687.24 MB (Total Heap = 755.18 MB).
   - Score ON (opt-in 1.2 score): Used JS Heap = 683.63 MB (Total Heap = 750.98 MB).
   - Memory delta: -3.61 MB (well within V8 GC variation; WebAudio buffers reside in native audio engine memory rather than expanding V8 JS heap; total heap remains completely stable around ~685 MB at peak load with no leak or heap bloat).
3. Audio State & Audible Fault Audit:
   - `overlapFrames: 0` across all transitions, wave peaks, and motif activations.
   - Zero stuck layer gains, zero NaN audio node values.
   - Bar-exact loop points and seamless crossfades.
Files: `qa/2026-11-02-AG-194/` (ag194-telemetry.json, run-ag194-score.mjs, run-ag194-motifs.mjs, night20-score-off-peak.png, night20-score-on-peak.png, tg-motifs-feral.png).
Tests: Real-GPU test suites `run-ag194-score.mjs` and `run-ag194-motifs.mjs` executed under game-test slot (exit 0); `tcl275a` passed 12/0; `tcl275b` passed 6/0; `tcl275c` passed 7/0; `t182` passed 36/0.
Screenshots: `qa/2026-11-02-AG-194/night20-score-off-peak.png`, `night20-score-on-peak.png`, and `tg-motifs-feral.png`.
Not verified: Audio performance on non-WebGPU software backends (test ran on hardware RTX 5080 WebGPU as ordered).
Requests: Answered Claude's "AG-194: the score on your GPU, and night 20's memory with it" and "AG-194: add tcl275c (the Training Ground motifs)" with DONE.
Contract changes: None.
