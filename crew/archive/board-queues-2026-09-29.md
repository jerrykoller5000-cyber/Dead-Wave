# Board queues archived 2026-09-29

Finished tasks cleared from `crew/BOARD.md` by Claude on 2026-09-29 (Jerry: "clear the Board of all
completed tasks"). Each one's report is in `handoffs/`. Grouped by agent, then by phase.

## Cursor — integration, git, tools, engine core (Grok 4.7)

- [x] **CU-46** **First. The studio renders scenes (D-41).** After CL-63. `node tools/studio.mjs scene
  <scene.json>` into `review/<scene name>/vN/`: every actor drawn (the marine as the `marine` rig, not the scale
  post), the camera following the scene's middle so the travel shows, a strip of side-on tiles plus a top-down row
  (the path and where each actor is), and the video (real speed, quarter speed; side, then the game's camera). Mark
  a tile red where `studio/scene.js` flags a check (hold gap, foot slide, speed out of range) and put the worst of
  each in `stats.json`. The player does the maths (`createScene`, `seek`, the `checks` it returns); the renderer
  only draws. Unchanged scene, no new version.
### R1 · Trust the loop, and feel it

- [x] **CU-47** **R1 · P-76.** Review the notes hook in tools/serve.mjs (D-42) and render `zombie-reactions` and
  `marine-knocked` into review folders on Jerry's GPU; fix the headless video step if it's small. Details:
  `docs/roadmap.md` P-76.
- [x] **CU-48** **R1 · P-13.** Nightsim: `--repeat N`, melee counted per kill, crowd seconds, signature-kind peaks,
  streak heals: medians, not one run. Details: `docs/roadmap.md` P-13.
- [x] **CU-49** **R1 · P-14.** Three stale lines in docs/gameplay.md made true (prep clock, drops, window climbing).
  Details: `docs/roadmap.md` P-14.
- [x] **CU-50** **R1 · P-23.** Builds report their damage: a `build-hit` event (throttled) for the HUD and the cue.
  Moved from Grokbot to spread the load (integration plumbing). Details: `docs/roadmap.md` P-23.

## Grokbot — combat

### R1 · Trust the loop, and feel it

- [x] **GB-60** **R1 · P-1.** Skulls you earn reach the bag, every night: the last kill pulls them in; none land in a
  grab zone. Claude's rule-10 OK is given (roadmap, lead calls). Details: `docs/roadmap.md` P-1.
- [x] **GB-61** **R1 · P-2.** A skull within 4 m zips to you; skulls last 45 s; big drops still need the walk. After
  GB-60. Details: `docs/roadmap.md` P-2.
- [x] **GB-62** **R1 · P-3.** Build refusals say why while you aim; no turret under your feet on a deck. Details:
  `docs/roadmap.md` P-3.
- [x] **GB-63** **R1 · P-4.** T and X act on your own storey only, never through a floor. After GB-62. Details:
  `docs/roadmap.md` P-4.
- [x] **GB-64** **R1 · P-5.** A mortar at a deck's rim keeps you on the deck; folding stairs won't fold from under
  you. After GB-63. Details: `docs/roadmap.md` P-5.
- [x] **GB-65** **R1 · P-70, P-6.** The dead react in the game (D-42): adopt each zombie as the `zombie` rig, one body
  through a pool of 8, a shell's pellets summed into one hit, the AI waits while it's down. The engine, presets and
  lab are in (CL-65). docs/studio.md §10 and docs/contracts.md (Reactions). Details: `docs/roadmap.md` P-70, P-6.
- [x] **GB-66** **R1 · P-71, P-7.** Deaths fall the way they were hit: `body.kill` replaces the corpse topple; settled
  corpses freeze. After GB-65. Details: `docs/roadmap.md` P-71, P-7.
- [x] **GB-67** **R1 · P-72.** The marine gets knocked around (your GB-50 order, through D-42): swipes rock him, a
  brute's blow staggers him, a bomber puts him down. After GB-65. Details: `docs/roadmap.md` P-72.
- [x] **GB-68** **R1 · P-73.** Zombies' feet on the ground: check the 0.2 m sink (studio/zombie.js note) and fix it if
  it's a bug. Details: `docs/roadmap.md` P-73.
- [x] **GB-69** **R1 · P-8.** The laser does what the kiosk sells: spread ×0.8 while it's on. Details:
  `docs/roadmap.md` P-8.
- [x] **GB-70** **R1 · P-75.** Reaction presets tuned to Jerry's lab notes (studio/motion/*: bump version, answer with
  crew.mjs review). Ongoing through R2, whenever a motion-* review folder has a waiting note. Details:
  `docs/roadmap.md` P-75.
  Closed by Jerry's call, 2026-09-27: "the motion looks good for now"; the v2 presets stand, tweaks later.
### R2 · The night has a shape

- [x] **GB-59** **R2.** Brought back: the fog cull (CU-42). Skip drawing and animating zombies past the fog's far
  distance (never a threat, a spit holder with a line, or the guardian); measure on the GPU with qa/run-cu42.mjs. The
  frame-budget lever for R2 and D-50.
- [x] **GB-74** **R2 · P-22.** Streaks heal: from 5 kills, 1 HP a kill (2 from 20), up to 70% (D-52). Details:
  `docs/roadmap.md` P-22.

## ChatGPT — what the player reads and decides (GPT-ASTRA 6, High)

### R1 · Trust the loop, and feel it

- [x] **GP-45** **R1 · P-9.** Build mode's HUD: each key beside its word, no Reload row while R rotates. After GB-62.
  Details: `docs/roadmap.md` P-9.
- [x] **GP-46** **R1 · P-10.** "Cabin" becomes "HQ" everywhere the player reads it (the landmark cabins stay cabins).
  After GB-62. Details: `docs/roadmap.md` P-10.
- [x] **GP-47** **R1 · P-12.** One-time lines for the first cave poke and the first swim toward the pit. After CL-66.
  Details: `docs/roadmap.md` P-12.
### R2 · The night has a shape

- [x] **GP-48** **R2 · P-24.** The minimap shows hurt builds (amber, red, flashing) and rim pips for the ones out of
  range. Details: `docs/roadmap.md` P-24.
- [x] **GP-49** **R2 · P-25.** One panned cue when a far build fails; an optional "West wall failing" line. After
  CU-50; after GP-48. Details: `docs/roadmap.md` P-25.
- [x] **GP-51** **R2 · P-30.** First-use cards: B to build, Y for two guns, H for a MedPen; the tree-felling tip.
  After GP-45. Details: `docs/roadmap.md` P-30.
- [x] **GP-52** **R2 · P-31.** The best run on the death card and the title (`tt_best_run`, a lifetime record like
  D-31). Details: `docs/roadmap.md` P-31.
### R3 · The day feeds the night

- [x] **GP-54** **R3 · P-36.** The relay, once repaired, can be called once each prep (a per-day `callable` state).
  Details: `docs/roadmap.md` P-36.
- [x] **GP-55** **R3 · P-37.** Tonight's call: three cards on the HQ board, one pick, gone at the alarm (D-53). After
  GP-54. Details: `docs/roadmap.md` P-37.
- [x] **GP-58** **R3 · P-41.** From day 2, two of the five caches restock with something new. Details:
  `docs/roadmap.md` P-41.
- [x] **GP-59** **R3 · P-42.** The board lists what restocked; the minimap marks it after you've read the board. After
  GP-58. Details: `docs/roadmap.md` P-42.
### R4 · The way out

- [x] **GP-65** **R4 · P-55.** About 12 lifetime badges on the death card and the title (store, then the UI). After
  GP-52. Details: `docs/roadmap.md` P-55.
### R6 · Finish (1.0)

- [x] **GP-71** **R6 · P-81.** The first hour teaches itself: every key's first-use card; the controls page matches
  the game. After GP-51. Details: `docs/roadmap.md` P-81.

## Antigravity — the crew's eyes (Gemini 3.1 Pro)

### R1 · Trust the loop, and feel it

- [x] **AG-20** **R1 · P-15.** A fresh run to night 5 on Jerry's GPU: night lengths, lost skulls, the skull-at-dawn
  report, accidental pokes, fps with 48, the Ways to Die padlocks. Do it again when GB-61 is in. Details:
  `docs/roadmap.md` P-15.
- [x] **AG-21** **R1 · P-77.** The motion lab and both reaction folders on the GPU, then reactions in the game: shots
  and fps. After CU-47. Again for the game when GB-67 is in. Details: `docs/roadmap.md` P-77.

## Claude — lead; the world, the studio and the reactions (Opus 5.5)

- [x] **CL-63** **First. Scenes (D-41): the format, the marine rig, the scene player.** `docs/studio.md` §9 (the
  `dw-scene/1` format), the marine registered as a rig (`studio/marine.js`: a stand-in built with the game marine's
  joint offsets, plus `adopt` for the game's own marine), and `studio/scene.js`: actors on paths with keyed speed,
  holds (reach, tow, lift), stride-matched clip rates, per-frame checks (hold gap, planted-foot slide, speed), seek
  for the renderer. Unit tests. A demo scene the renderer can use until CL-64's.
- [x] **CL-64** **The guardian's grab and drag as the first scene; the game plays it.** After CU-46. The catch in
  beats you can see (pounce, catch, pull down) instead of all in 0.45 s; the hand held on the marine's real ankle;
  a heavy haul at a believable speed with the steps matched to it; the marine towed on his back, his leg lifted by
  the hand. Jerry (04:40Z): it lunges and grabs **facing him**, aiming for the leg whichever way he lies, then turns
  round (stepping, not spinning on planted feet) and heads for the cave dragging him. That needs facing that changes
  over time in the scene format (keyed `face`, or face an actor), which this task adds.
  `review/guardian-grab-drag/`, then the game's cave drag switched from its hand code to the scene.
  Then Jerry's notes.
- [x] **CL-65** **Reactions: light active ragdolls (D-42; Jerry: "similar to Euphoria, light enough for this game").**
  `studio/motion.js`, bodies for the marine and the zombies, presets (`studio/motion/`), scenes with hits, the motion
  lab with Jerry's notes into `review/motion-*`. 38/0 studio tests. `handoffs/2026-09-26-claude-CL-65.md`.
### R1 · Trust the loop, and feel it

- [x] **CL-66** **R1 · P-11.** A `pit-near` event once a run, before the arms can reach (contract line). Details:
  `docs/roadmap.md` P-11.
- [x] **CL-67** **R1 · P-74.** The held body flops: `hold` on a reacting body, and the guardian's drag victim uses it.
  CL-65's first intent. Details: `docs/roadmap.md` P-74.
- [x] **CL-68** **R1 · P-75.** Engine fixes from Jerry's lab notes (studio/motion.js, studio/bodies.js); new bodies
  when a creature needs one. Ongoing. Details: `docs/roadmap.md` P-75.
