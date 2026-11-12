# AG-313: Training "insanely slow" (Antigravity, Claude Sonnet 5.5)

**Verdict: the Training Ground itself runs at a steady 60 fps on the 5080 once it is loaded; the slow parts are the entry and a few one-off 3P hitches. Nothing here explains "insanely slow" in steady play, so contention on the machine is the likely cause.**

## 1. Machine (read-only survey, 21:07 local)
No Chrome or Node left over from slot runs. Top processes were Edge/WebView2 (Jerry's) and the other agents' Codex node, all under 5 s CPU. GPU 3D engines idle. A tools/inspector-launch.mjs server (PID 17748, since 20:45) looks like Jerry's inspector; left alone.

## 2. One Training run, exclusive slot, RTX 5080 WebGPU, 1280x720 (qa/2026-11-11-AG-313/hitch-run.mjs, output in review/AG-313/hitch-run-output.txt)
Median frame 16.7 ms and p95 16.8 ms in every phase after entry. In-game overlay at the end: fps 60, low 59, worst 17 ms, 204 draws, 97k tris.

| Phase | Frames over 50 ms | Worst frame |
|---|---|---|
| Entry to blackout lifted (9.4 s) | 10 | 6950 ms (the compile block) |
| Idle 3P, 5 s | 2 | 400 ms |
| Weapon cycle 3P (all 12) | 2 | 367 ms (one render 167 ms) |
| Knife stab 3P | 0 | 17 ms |
| Armory open and close 3P | 2 | 317 ms |
| Switch to 1P | 0 | 33 ms |
| Idle 1P, 5 s | 0 | 17 ms |
| Weapon cycle 1P (all 12) | 0 | 17 ms |
| Armory open and close 1P | 0 | 17 ms |

First person was clean everywhere. In 3P there are single one-off hitches (a first equip at 167 ms, the first Armory open, one idle frame at 400 ms) and the 7 s main-thread block plus a 1.16 s and a 0.33 s frame at entry.

## 3. Cost and what to do
- Steady-state Training is not slow on this machine. A grenade, stairs and a firing-line run were not covered (no safe debug hooks were known); the stairs filmstrip is in Claude 2's CB-310.
- The entry is the real cost: about 9.4 s, 7 s of it one blocked frame (the pipeline compile), then the 1.16 s and 0.33 s frames right at the lift (the 3 missed pipelines from AG-309b item 1). That is AG-309b's work, parked until the usage window resets.
- If Jerry sees slowness while playing, the game-test slot allows 3 runs at once on his PC ("1 of 3 in use" on the board), so a crew test browser can share the GPU with his session. Suggest: no slot runs while a MANUAL-GAME lease is open (the pause rule already says so), and ask Jerry whether it was slow only at entry or throughout.

## Changed:
Nothing in the game. New qa/2026-11-11-AG-313/hitch-run.mjs and review/AG-313/hitch-run-output.txt.

## Tests:
None run (measurement only).

## Not verified:
Grenade, stairs and firing-line phases; a run while another browser is using the GPU; Jerry's own machine state while he played (02:35-03:03Z).
