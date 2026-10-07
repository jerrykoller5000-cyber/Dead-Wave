# Board queues archived 2026-10-06

Finished tasks moved off crew/BOARD.md (`node crew/crew.mjs tidy`). Each one's report is in handoffs/.

<!-- crew.mjs tidy, 2026-10-06T05:12Z: 18 finished -->

## Cursor — integration, git, tools, engine core

### Now

- [x] **CU-84** **First: the tests boot again.** Since GP-106 and GP-131 no test page boots: `tools/tests/fakethree.mjs`
  lacks `Shape`, `ExtrudeGeometry` (a box round the shape's bounds is enough) and `CatmullRomCurve3.getPointAt` (= getPoint;
  add getTangent and getTangentAt). `ui/survivors.test.mjs`'s run-record fixture needs a `training` state since CL-115
  (ChatGPT's GP-131 finding). Claude's two requests of 2026-10-02 have the details. (CU-83 is closed: its checkpoint
  went up at 2026-10-02 06:33Z, and Claude set your card idle in the board clear.)
- [x] **CU-85** **Commit and push what's waiting.** Everything checked out since the checkpoint (2026-10-02 06:33Z): CL-116
  to CL-118, GB-125 to GB-130, GP-123 to GP-137, and this board. One full `npm test` first, then the integration looks
  ChatGPT asked for in `handoffs/requests.md` (GP-97 to GP-137: one pass over them, not one each). A failure goes to its
  owner with `crew.mjs request` (t80 is GB-131, t167 is CL-119); don't fix it here. After CU-84.
- [x] **CU-86** **R5 · P-141 · for GP-84.** The Hollows' snapshot and pickup receipts (ChatGPT's request, 2026-10-02):
  `core/hollow.js` `state()` gives the live depth from where the player stands (not `warren.entry`) and every warren's
  and passage's clearance for the run; `claimHollowHere`'s tag and prize or shard receipts go out as an event the UI can
  hear, instead of being dropped in doAction. Propose it in `docs/contracts.md` for Claude's yes (rule 9).
- [x] **CU-72** **R5 · P-143.** Passages: a cleared warren's Deep opens a tunnel to the next cave round the compass,
  for the run. Details: `docs/roadmap.md` P-143.
- [x] **CU-87** **R6 · found in CU-81.** While he is on the M240 (the Watchman MG), updateMortarArc still runs (it has no
  type check), so the mortar's dotted arc shows. Gate it to the mortar.

### Later · R6 (1.0)

- [x] **CU-55** **R6 · P-87.** Every test green: 29 older checks are on startMatch (handoffs/2026-10-01-cursor-CU-55.md); left: t1, t3,
  t36, t37 and the dump probes; then `npm test` twice, the same. (No long runs: D-71.) Details: `docs/roadmap.md` P-87.
- [x] **CU-56** **R6 · P-88.** One quick check on Jerry's GPU: the title loads in about 15 s cold, 5 s warm; a night
  with 48 holds about 60 fps. A single look, not a measurement campaign (D-71). Details: `docs/roadmap.md` P-88.
- [x] **CU-57** **R6 · P-89.** The 1.0 package as a desktop app (D-57): a Tauri or Electron shell round the folder
  (a custom protocol for the module imports, saves in a real folder, an icon, fullscreen, an installer), a version
  on the title, and the browser build kept for the crew. After CU-55; after CU-56. Details: `docs/roadmap.md` P-89.

## Grokbot — combat

### Now

- [x] **GB-131** **R6 · P-87.** t80's two spider lines (round the house; the corner-grazing line) watch 12 s and 10 s of
  wall clock, so they fail when the PC is busy (Cursor's CU-55 suite; Grokbot's reply, 2026-10-01). Move those windows to
  game time as Grokbot offered: the same thresholds, nothing weakened. t80 alone, twice, in the handoff.

### Waiting

- [x] **GB-94** **R6 · P-79.** Balance by Jerry's notes (D-71): he plays, says which nights or prices feel off, and
  Grokbot tunes skull value and packs (never horde size). No medians, no long sims. Parked until Jerry has a list; then it
  goes back to [ ].

## Antigravity — the crew's eyes

### Now

- [x] **AG-50** **The eyes pass on 2026-10-01/02's work**, one sweep on Jerry's GPU (shots, no timed runs: D-71). Every
  request to Antigravity in `handoffs/requests.md` since 2026-10-01, grouped: the deaths and cards (GP-81, GP-95, GP-98,
  GP-99); the HQ (GP-100 to GP-104, CU-82's lockdown, CL-113's window, wheel and rack); the marine and the survivors
  (GP-105, GP-106, GP-123, GP-124, GP-130, GP-131, GP-134; CU-81's guns in his hands); the valley's places (GP-107 to
  GP-122; CL-83's dangerous kinds at night); the Armory (GP-97, GP-125, GP-126, GP-132); the Training Ground (CL-115,
  GP-133 to GP-137) and CL-117/CL-118's perf HUD at the HQ and in the Training Ground, before and after. One report in
  `qa/` with a shot per item; each finding goes to its owner with `crew.mjs request`.

### Later · R6 (1.0)

- [x] **AG-28** **R6 · P-91.** The showcase shots and a trailer's worth of clips. After CU-57. Details:
  `docs/roadmap.md` P-91.

## Claude — lead; the world, the studio and the reactions

### Now

- [x] **CL-119** **The review pile.** The handoffs of 2026-10-01/02 waiting on the panel (`crew.mjs reviewed` on each), and
  the questions to Claude in `handoffs/requests.md`: the rig (GB-124, GB-125, GB-129, GB-130: the forearm doesn't roll to
  the grip, the knife arm, the flamer's support hand 2.6 cm short); t180's rack (GP-125); `docs/controls.md` and D-65 for
  auto by default and the new keys (GB-127, GB-128); t167's motto, which left the HQ wall for GP-100's mural (settle it
  with ChatGPT); GP-84's contract when CU-86 proposes it.
- [x] **CL-120** **The crouch: no clipping through the ground** (Jerry, through Antigravity, 2026-10-02). GB-125's crouch
  leg IK is in Claude's player rig; GP-106 found the ground misaligned in the crouch. Before and after in a review folder.
  Done 2026-10-05: each boot stands on the ground under it on a slope, standing, walking and crouched (t193); review/crouch-slope.
- [x] **CL-84** **R6 · P-93.** Done 2026-10-06 (Jerry's "good"): the walk, the run and the reload are in the game (review/marine-gait, t199). The marine's own animation through the studio: walk, run, reload. The walk and the run are in review
  (review/marine-walk, review/marine-run; handoffs/2026-10-01-claude-CL-84-part1.md) and go in the game on Jerry's "good";
  the reload is left, now that the Armory is in (CL-113). Details: `docs/roadmap.md` P-93.
  The reload is in (part 2, 2026-10-05: review/marine-reload, t194). Waits on Jerry's "good" on all three, then done.
- [x] **CL-122** **R6 · the hands (from the CL-119 review).** Done 2026-10-05: review/marine-hands, t195; the slung rifle on the left and the hip pistol still sit past his reach (handoff). The arm IK puts the hand on each gun's anchor but doesn't roll the
  forearm, so the palm's angle is loose: roll it onto the grip. The left arm gets a knife swing of its own. The flamer's
  support hand reaches its front grip (2.6 cm short). The draw and holster moves reach for the fitted stowed guns, the
  fixed Uzi and revolver mounts included, not the spot origins. GB-130, GP-128, GP-130; checks t187, t188, t189.
- [x] **CL-123** **R6 · a first-use hitch (from GP-135).** Done 2026-10-05: the carried gear's instanced shadows (tools/training-warm-probe.mjs). After the Training Ground's warm-up two ShadowMaterial programs
  still compile on first use; warm them with the rest (trainingWarmCompile).

### Waiting

- [x] **CL-121** **The marine right-handed, if Jerry says so (Q-6).** Jerry: keep him left-handed (D-75); nothing to change. Grokbot found the gun arm is the marine's anatomical
  left, so the stock sits in his left shoulder (GB-129). If Jerry wants him mirrored: swap armRG and armLG and everything
  keyed to them (holsters, the draw's reach, the reload pouch, ChatGPT's carry), keeping GB-129's side-agnostic hold.
  Parked until Jerry answers; then it goes back to [ ].

<!-- crew.mjs tidy, 2026-10-06T05:26Z: 2 finished -->

## ChatGPT — what the player reads and decides

### Now

- [x] **GP-72** **R6 · P-82.** One voice: every line read once, the same words for the same things. R5's words are all in now: story v2 (GP-94),
  Jerry's renames (GB-120 to GB-122: Gravewalker, no real brands) and the new HQ, Armory and Training Ground text.
  A list of changed keys. Details: `docs/roadmap.md` P-82. Unblocked: t182 is green (Cursor, 02:52Z) and AG-51 looked at it.

## Claude — lead; the world, the studio and the reactions

### Now

- [x] **CL-86** **R6 · P-92.** The last sweep: every report reviewed, the docs true, the board ready for after 1.0.
  After CU-57. Details: `docs/roadmap.md` P-92.

