# claude — CL-202 The full suite, every red sorted — 2026-10-15

Changed:          Nothing in the game. The whole tree as it was on Jerry's PC at 09:25Z (checkpoint e9c4612 is the same
                  work) ran through the full suite in Claude's cloud: one instance, `--jobs 1`, 6 h 40 min. 248 checks:
                  3608 pass, 187 fail in 71 files, 3 ran out of time (t189, t218, t226), 8 are probes with no
                  assertions. Every red is below with its likely cause and the task that owns it on the board.
Tests:            `node tools/tests/run-all.mjs --integration --agent claude --task CL-202 --jobs 1 --all-fails` (log
                  kept in Claude's cloud). Re-runs of t69, t111, t147, t160 alone: the same reds.
Not verified:     The cloud runs SwiftShader: about 1 fps in a full scene, the insertion takes 270 s of real time
                  instead of 9. Reds marked **(cloud?)** test timing and may pass on Jerry's PC; their owner re-runs
                  them through the slot before changing anything.

## Read this first: two reds that matter for 1.0

1. **Rounds don't land on zombies in the checks** (t69 "the round hit the shambler (26 -> 26)", t111, t222
   "pointing at a head is a headshot: 0/36 (was 17/64)", t211 "0 damage from 14 rounds", t248, t80, t63, t90,
   t91, t93's headshot line, t107, t119, t128, t155, t156, t164). The same reds were in the PC's own tests.json
   at 09:17, so it isn't the cloud. A probe in the cloud: a round fired through a standing shambler's chest left
   it at 24 of 24. The posed-surface hit test (game/zombie-headshots.js `zombieSurface`, GP-19885) does find 15
   candidate meshes per zombie, so the break is between the round and that test. Likely suspects, newest first:
   GP-19924 (the joins, `blendZombieJoins` inside `skinZombieMesh`), GP-19922 (the smoothing). If the real game
   has the same bug, nothing can be killed with a gun. **GB-185 (Grokbot), with ChatGPT.**
2. **Boarding Heron doesn't win the run in the checks** (t147: "held 2 s: aboard, the run is won", t160: "aboard:
   the run is won", the end card says "Try again?"). E-hold flows fail the same way (t55, t170's kick-free). Keys
   are ignored while `menuCamera.deploying`; check the checks wait for the landing before pressing E, and then the
   boarding itself. **GB-186 (Grokbot).**

## Every red, by owner

**Grokbot**
- GB-185, rounds land: t63, t69, t80, t90, t91, t93 (the headshot line), t107, t111, t119, t128, t155, t156,
  t164, t211, t222, t248.
- GB-186, E and boarding: t147, t160, t170 (13 reds, the stir and the kick-free), t55 (Cursor's CU-11 check: same
  E path; Grokbot looks first).
- GB-187, the builds and the horde: t1, t3 (the light and the turret on a deck: "cell taken"), t17 (the reticle
  looks through the roof), t112 (the drawn zombie heads for the turret), t74 (cloud?), t75 (cloud?), t76, t77,
  t96, t97 (cloud?), t168, t171 (cloud?), t85 (the dawn banner counts 0 skulls: the banner may be gone with
  CL-181's HUD trim, then the check is stale).
- GB-188, the guns: t187 (zoom: m4/ak/aa12/shotgun don't zoom all the way in; the head doesn't come back up),
  t188 (revolver and Uzi size and barrel on the reticle; AA-12 support anchor), t213, t214 (magazines: the full one
  isn't chosen), t223 (selector banks ring alike; the bolt), t224 (pistols on the pack: 0), t189 and t218 (timed
  out: shorten or split them).
- GB-181 (already on the board): t221, t252. GB-156: t244.

**Claude** (CL-209)
- The music since the ElevenLabs switch: t60, t61, t73, t172 (each night's own song and its sections), t106
  (cloud?).
- The HUD trim (CL-181, CL-182): t72 (the Night Complete card is gone by Jerry's order: update the check), t181
  (the stock card is one line now).
- The world: t39 (the fallen log lies 0.02 rad off its rest), t46 (cave eyes from 55 m), t50 (tree draws 404 for
  430 trees: the cells aren't batching), t176 (cloud?), t177 (a brute's eye glow at 25 m), t204 (the radio mast:
  0 dead called in).
- The marine: t183 (unarmed, the hands hang wrong: 0.26 m below the shoulder, 0.57 m to the side), t184 (the
  crouch), t195 (the knife hand at the cut), t208 (the walk's aim swing, 4.9 to 5.1 deg), t209 (the maimed dead
  reach), t182 (the Training Ground: three shamblers never called in), t226 (timed out).

**Cursor** (CU-154)
- t222 after GB-185 (the aiming checks need rounds that land), t225 (the grenade hold), t228 (the support hand in
  a reload), t241 (the gold glow at the parish cross), t246 (the M4 aim's shoulder pose), t255 (it was red on the
  09:25 copy; CU-147 landed after: re-run it).

**ChatGPT**
- With Grokbot on GB-185: the zombie bodies since GP-19922 and GP-19924 against the hit test.
- t93's feet (zombie-feet: a feral's foot 2 cm into the ground, 9 cm up after).

## Probes (no assertions, not reds)

t16, t20, t22, t26, t27, t28, t30, t32: they print numbers for whoever runs them. t27 says an empty world draws 4137
visible meshes, and the panel in a prep day near the HQ reads about 700 draws and 800 thousand triangles: CL-203
(the frame budgets) starts from those.
