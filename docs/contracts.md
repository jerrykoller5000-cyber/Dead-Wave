# docs/contracts.md — Cross-owner exports and events

Every call or event that crosses from one owner's code into another's. To change one, its
owner proposes it, Claude approves, and every caller is updated in the same handoff
(AGENTS.md rule 9). Until the split (CU-4) everything here lives in `index.html`, in the
owner's part; after the split each entry names its module.

First drafted by OpenCode (OC-3); kept by Claude from 2026-09-23 (D-10, CL-13).

## Load channel (approved 2026-09-23)

Owner: Cursor (the loader shell). Callers: ChatGPT's loading screen. From `handoffs/2026-09-23-claude-loader.md`:

- `window.DWLoad.loadId` — string, new every page load
- `window.DWLoad.stageIds` — `['terrain','world','zombies','shaders']`
- `window.DWLoad.snapshot()` — returns `{ loadId, state: 'loading'|'ready'|'failed', sequence, errorCode, stages: { <stageId>: { state: 'waiting'|'active'|'complete'|'failed', completedUnits, totalUnits, startedAt, finishedAt } }, steps: [{ id, stageId, state, startedAt, finishedAt }] }`
- `window.DWLoad.subscribe(fn)` — `fn(snapshot, null)` at once, then `fn(snapshot, event)` for each event; returns unsubscribe function
- window `'dw-load'` event — `detail = event` where `event = { loadId, sequence, stageId, substageId, state: 'begin'|'end'|'error', completedUnits, totalUnits, unitId, at, startedAt?, finishedAt?, errorCode? }`
- Step ids (substageId/unitId): terrain `terrain`, world `rocks`, `trees`, zombies `actors`, world `foliage`, `pois`, `setup`, shaders `compile`, `loop`, `warmup`
- Stage events have `substageId: null`
- Sequence goes up by one for every event
- Ready: after the last step ends, `{ stageId: 'ready', state: 'end' }` fires and snapshot state becomes 'ready'
- Errors: uncaught error/rejection fails active step/stage (`errorCode: 'uncaught-error'`), then `{ stageId: 'load', state: 'error' }` fires
- Times (`at`, `startedAt`, `finishedAt`) are `performance.now()` milliseconds
- Later: when world bake lands, adds `bake` step to world stage, or `generate` step on fallback

## World ground exports (approved D-4)

Owner: Claude. Callers: everyone. From `crew/BOARD.md` D-4. Today these are functions in
`index.html`; after the split they are exports of `world/terrain.js`.

- `sampleHeight(x, z)` → ground height. Read-only: nobody writes the height field directly.
- `POI` → the points of interest (caves, landmarks, the lake). Read-only.
- `reshapeGround(...)` and `levelGroundRect(x0, z0, x1, z1, y, blend)` → the only ways to
  change the ground. Builds use them (`tryPlace`, `groundWorkFor`).

## caveWarn export (approved 2026-09-23)

Owner: Claude. Caller: Grokbot's wave director (1 at prep, 2 at `beginWave`, 0 when the wave ends; GB-4). From `handoffs/2026-09-23-claude-CL-4-cavewarn.md`:

- `caveWarn(cave, level)` → boolean
- `cave` can be: the `POI.caves` object, its index, or its id (`'cave:root'`, `'cave:shale'`, `'cave:iron'`, `'cave:wet'`, `'cave:hill'`, `'cave:chalk'`)
- Anything else returns `false`
- Idempotent: setting the level a cave already has does nothing and fires no event
- Levels hold until you set another
- Level 2 stops the blinking: the eyes stay open
- Fires window `'dw-cave-warn'` event: `{ id: 'cave:<theme>', index, level }`

## waterAt export and felled logs (approved 2026-09-23)

Owner: Claude. Callers: Grokbot's pathing (GB-9). From `handoffs/2026-09-23-claude-CL-5-water-logs.md`:

- `waterAt(x, z)` → `{ level, depth, wading, current: { x, z }, speed }`
- A felled tree lies for 120 s (was 22 s)
- While a log lies it is solid: a row of short colliders along the trunk
- Each log going down or away fires a `'dw-log'` event: `{ tree, state: 'down' | 'gone', solids }`
- Log solids in `worldSolids` carry `kind: 'log'` and `tree`

## Wave preview exports (approved 2026-09-23)

Owner: Grokbot. Callers: ChatGPT's HQ briefing (GP-5). From `handoffs/2026-09-23-grokbot-GB-3.md`:

- `getWavePreview(day?)` — returns `{ day, bloodMoon, surround, hasColossus, total, caveIndices, bearings, byTypeAndCave:[{typeKey,count,caveIndex,caveTheme,caveName}], queue, caveByIndex }`
- `getWaveDirectorState()` — returns director state
- `getActiveCaveIndices()` — returns active cave indices
- Exported on `window.TT`: `getWavePreview`, `getWaveDirectorState`, `getActiveCaveIndices` (plus `spawnWaveBatch`/`beginWave` for tests)
- `nodead` clears the wave plan
- Wave plan frozen once in `startPrep()` as `wavePreview` + parallel `caveByIndex`
- `spawnWaveBatch` consumes that plan (same type order and cave assignment)
- Ambush option **A**: retarget only to a mouth already in `wavePreview.caveIndices`
- `byTypeAndCave` lists each type+cave combination: `{typeKey, count, caveIndex, caveTheme, caveName}`
- Sequence: surround days list all used mouths in `caveIndices` (usually all six) rather than leaving the array empty — `surround` flag is the UI signal
- GB-40 / D-29 (2026-09-25): day 1 is 15 shamblers, and 7 or 8 of them claw up out of the ground. The preview adds
  `groundByIndex` (booleans parallel to `queue`) and `groundRisers` (the count). Ground rows carry `caveIndex -1` in
  `caveByIndex`, and their `byTypeAndCave` bucket is `{ typeKey: 'shambler', caveIndex: -1, caveTheme: null, caveName: null,
  ground: true }`. The working `getWaveDirectorState().caveByIndex` uses -2 for a ground row. Each spawn is recorded in
  `getWaveSpawnLog()`: `{ tk, ci, ground, x, z, pd, hq, inView }`, cleared by `startPrep` (tests). Ground risers are
  flagged `z.groundRise`, with `caveIndex -1`. Day-1 zombies get no cave role.

## UI events: `'dw-game'` (approved D-8)

Owner of each event: whoever dispatches it. Listener: ChatGPT's UI (coach, briefing,
checklist). One `window` event, `'dw-game'`, with `detail = { type, ...details }`. The UI never
reaches into another owner's section. At the split these stay events; the names don't change.

- `'controls-ready'`: the insertion has ended and the player has control
  (`assets/intro/menu-camera.js`, OC-1).
- `'skull-pickup'` (after the bag grows), `'deposit-accepted'`, `'deposit-complete'` (after
  the Cash is credited): ChatGPT's economy and HQ window.
- `'purchase-delivered'` `{ itemId, cashSpent, source: 'build' | 'upgrade' | 'repair' | shop }`:
  after delivery, never on the click. Shop and kiosk: ChatGPT. Placed pieces, paid upgrades
  and repairs: Grokbot (GB-11, `reportPurchase`).
- `'hud-state'` `{ dt, active, nearWindow, skulls, pendingDeposit }`: ChatGPT's HUD only.
- `'alarm-request'` and `'alarm-started'`: ChatGPT's HQ briefing (GP-5, GP-7).
- `'dw-cave-warn'` and `'dw-log'` are separate window events (see caveWarn and waterAt above).

## Repair helpers (approved D-11, 2026-09-23)

Owner: Grokbot. Caller: ChatGPT's prep checklist (`ui/prep-repairs.js`, through dependency
injection, never `window.TT`). From `handoffs/2026-09-23-grokbot-REQ-gp7-repair-complete.md`:

- `getRepairTarget()` → the damaged build T would repair (damaged builds only, the same reach
  as T), or `null`.
- `getRepairSnapshot(id)` → that build now: `{ ..., cost, affordable }`. At full HP it is still
  returned, with `cost: 0` and `affordable: true`. `null` only when the build is gone.
- Ids: `type@gx,gz:slot:L{level}[:opening]`. Known gap, accepted: ids reuse the cell, so a
  build removed and rebuilt between two samples reads as the same target.
- A paid repair reports `purchase-delivered` with `source: 'repair'`.

## Guardian night (GB-14, approved D-13, 2026-09-24)

Owner: Grokbot. Callers: ChatGPT's briefing, HQ and economy. Spec: `docs/specs/combat-phase2.md`.

- `isGuardianNight(day?)` → true on day 6 and every 6th day after. Guardian nights replace
  surround and colossus; Blood Moon still stacks.
- `getWavePreview()` adds `hasGuardian`, `guardianNight`, `guardianCaveIndex`,
  `guardianCaveTheme` and `guardianKeys` (ChatGPT's GP-10 string keys). Nothing is removed.
- `getGuardianState()` → `{ planned, alive, caveIndex, hp, maxHp, firstBloodDone }` or `null`.
- `dw-game` `{ type: 'guardian-first-blood', receiptId: 'guardian-night-first', ... }` fires once
  per run on the first player-credited guardian kill; ChatGPT's economy grants the reward
  (the mortar blueprint if not owned, else +80 skull value; never direct Cash).
  `'guardian-killed'` fires on every guardian kill.
- `caveWarn` on guardian nights as on any night: 1 at prep, 2 at `beginWave`, 0 at the end.
- A guardian that makes no progress towards the player for 60 s re-paths, then walks back out
  of the chalk mouth.

## Objectives, combat side (GB-16, approved D-16, 2026-09-24)

Owner: Grokbot. Callers: ChatGPT's objectives (GP-11) and economy (GP-12). On `TT` today;
after the split, exports of the combat modules.

- `spawnObjectiveDefenders({ siteId: 'objective:radio-repair', reset? })` →
  `{ spawned, deferred, reason, centre? }`. Also fires by itself, once a run, when the player
  first comes within 24 m of the radio: two Shamblers from nav-valid spots 8–12 m out, at
  least 8 m from the player and out of view; deferred when capped. `getRadioDefenderState()` →
  `{ siteId, fired, pending, spawned, alive, centre }`. `RADIO_DEFENDER` holds the numbers.
- `grantSupply({ receiptId, items: [{ id, qty }], source })` →
  `{ ok, receiptId, source, accepted: [{ id, qty }], remaining: [{ id, qty }], alreadyApplied }`.
  Ids: `medkit`, `grenade`, `ammo:<calibre>`, `ammo:chainsaw`. Capacity-aware; the same
  `receiptId` again returns the first answer with `alreadyApplied: true` and grants nothing.
  Saw fuel keeps fractions; ammo for a calibre with no owned weapon is refused (all remaining).
- `listOwnedAmmoPackChoices()` → `[{ id, caliber, packQty, cost, reserve, cap, weapons }]`, owned
  weapons only.
- `grantBuildBlueprint(id)` → `{ id, alreadyOwned, granted }`. Unlocks a build blueprint with no
  Cash and no purchase event (GP-12's mortar).
- `dw-game` `{ type: 'player-damaged', cause, amount, toHp, soaked, hp, armor, fatal }` on every
  hit that lands, armour soak included. Interrupts the radio's hold-E repair.
- `guardian-first-blood` (see Guardian night) fires only for a guardian from a guardian night's
  plan in an ordinary run, and carries the kill position `{ x, z }`.

## Objective interaction (CU-10, approved D-17, 2026-09-24)

Owner: Cursor. Caller: ChatGPT's objectives (GP-11).

- `getObjectiveInteraction(id)` → `null` for an unknown id or no props; else `{ id, approach,
  distance, reachable, blockedBy, ePressed, eHeld, holdSeconds, cancelled }`.
- `reachable`: within 1.6 m of the approach horizontally and 1.25 m vertically; no solid build
  between the player and the approach (the radio cabinet and fuel stand themselves don't
  count); no other E target (`blockedBy: 'busy'`); alive; no modal (paused, shop, place or
  build mode, the build wheel, the HQ briefing, a death cine, deploying).
- `blockedBy`: `null | 'distance' | 'height' | 'wall' | 'busy' | 'dead' | 'modal'`.
- `ePressed` is true on the frame E goes down; `eHeld` while it's down. `holdSeconds` counts
  gameplay seconds of holding E at a site that stays reachable. Only the site being held keeps a
  timer; any id can be asked at any time.
- `cancelled`: `null | 'released' | 'left' | 'damage' | 'death' | 'modal'` (damage is Grokbot's
  `player-damaged`); a cancel zeroes `holdSeconds`. ChatGPT sets the thresholds (the radio
  repair is 6 s). It changes nothing: no state, no spending, no movement.

## Tree batches (CL-10, 2026-09-23)

Owner: Claude. Internal to the world: nobody else calls it. Listed so other owners know the
rule it relies on: **change a tree only through its own state and meshes** (the tree object,
`t.group`, `t.trunkMesh`, `t.canopyMeshes`), as every caller already does. Far trees draw from
merged copies; any change to a tree's state, visibility or position makes it draw itself
within two frames, and `restoreTree` lets it rejoin its copy. Don't set `visible` on a tree's
trunk or canopy mesh: the batches own that flag. Debug on `TT`: `treeBatchStats()`,
`getTreeBatches()`. `?trees=single` turns batching off.

## Objective props and sites (CL-15, approved 2026-09-24)

Owner: Claude (the props and where they stand). Caller: ChatGPT's objectives (GP-11), which
own the state machine, rewards, receipts and the tracked-objective UI (GP-9). Design:
`docs/specs/objectives-phase2.md`. Sites: `handoffs/2026-09-23-claude-CL-6-objective-sites.md`.
Built at load by the world from `assets/world/objective-props.js`, before the minimap bake.

- `getObjectiveProps()` → `{ group, props, stateFor }`, or `null` if the file failed to load.
  - `props[id]` for each of the seven ids (`objective:radio-repair`, `objective:medical-convoy`,
    `objective:ranger-cache`, `objective:hikers-cache`, `objective:trapper-cache`,
    `objective:fuel-depot`, `objective:wreck-salvage`) is
    `{ id, kind, centre: {x,y,z}, approach: {x,y,z}, facing, states, state, exists, setState(name) }`.
  - `approach` is where the player stands to use it (0.75 m kept clear); `facing` is the
    player's yaw looking at it from there. Reachability of the approach is Cursor's to add.
  - `states`: radio `broken | repaired`; fuel `stocked | partial | empty`; the five caches
    `closed | open | empty`. `setState(name)` shows that state's prebuilt mesh (no rebuild)
    and returns false for an unknown name. The radio's light follows (amber, then green).
  - `stateFor(objectiveState, id, remaining)` maps GP-8's states onto those:
    undiscovered / available / active → the first state; ready-to-claim, or `remaining` → open
    (fuel: partial; radio: repaired); claimed → empty (radio: repaired). `unavailable` or an
    unknown id → `null`: leave the prop as it is.
  - `exists` is always true today. No prop can be destroyed yet; if that changes, it goes
    false and GP-8's `unavailable` path applies.
- The GP-9 snapshot takes each site's `position: {x, z}` from `centre`, and `reachable` from
  Cursor's interaction check at `approach`. Objective state lives with ChatGPT, not in the
  props, and is saved by Cursor's run save (CU-5); the props are redrawn from it on load.
- Two props have colliders (the radio cabinet and the fuel stand); the five small cases have
  none. Ground cover is cleared within 1.3 m of each prop.

## Math (CU-4 step 1, 2026-09-24)

Owner: Cursor. Callers: the world and combat, from `core/math.js`. Same functions as before,
moved out of `index.html` with no behaviour change. No Three and no game state.

- `hash2`, `vnoise`, `fbm`, `ridged` — 2-D value noise
- `hash3`, `vnoise3` — 3-D value noise
- `smoothstep01`, `smoothBand`, `distPointToSeg`
- `mulberry32(seed)` — returns a deterministic 0..1 function

## Geometry (CU-4 step 2, 2026-09-24)

Owner: Cursor. Callers: world props and the marine mesh. From `core/geometry.js`. Same code as before, now imported. Depends only on three.

- `mergeParts(parts, material, opts)` — bake small meshes into one vertex-coloured mesh
- `addCast(mesh)`, `rbox(w, h, d, r, seg)`, `rmesh(w, h, d, mat, r)` — beveled boxes
- `boxProjectUV(pos, uv)` — camo UVs at one repeat per 0.42 m

## Audio (CU-4 slice, 2026-09-24)

Owner: Cursor. Callers: the whole game, through `AudioSys` in `core/audio.js`. The engine only.
The music director (what plays when) stays in the page until the UI slice. No game state inside
the module; it reads `window.DWOpening` for the opening mute.

## Guardian position (GB-19, 2026-09-24)

Owner: Grokbot (zombies section). Caller: ChatGPT's minimap boss pip.

- `getGuardianAlive()` → `null` unless the wave plan has a guardian (`wavePreview.hasGuardian`)
  and one is alive; else `{ x, z, hp, hpMax, caveIndex }` from the live guardian. Read-only.

## Scripted-death replays: withdrawn (D-20, 2026-09-24)

The replay helpers and the `scripted-death-replay` event were removed by GB-22 (Jerry's call:
only two deaths have a cutscene). Nobody may call them. `tt_death_log` and the death catalogue stay.

## Pistol ammo (GB-23, 2026-09-24)

Owner: Grokbot (weapons). The pistol has its own calibre, `.45` (the Uzi keeps 9mm): pack
`{ n: 36, cost: 12 }`, reserve cap 168, and a new run starts with 50 rounds of it (GB-36: both x1.4;
every calibre cap is `RESERVE_CAP_BASE` x `SPARE_CAP_MULT` 1.4, rounded, with the ext-mag x1.5 on top). GB-36:
`buyWeapon(w)` delivers a loaded magazine and fills that calibre reserve to `reserveCap` (never lowers it). `grantSupply`
takes `ammo:.45`. UI text: `calibre.45` in `ui/strings.js` (ChatGPT, GP-19).

## Guardian first-blood reward (GP-12, 2026-09-24)

Owner: ChatGPT (`game/economy.js` and its listener in the page). Consumes `guardian-first-blood`
(D-16, GB-17): only `planned: true` with a finite `x, z`, once per run. Grants the mortar blueprint
through `grantBuildBlueprint`, or one 80-value skull drop at `x, z` if it's owned. No Cash, no
purchase event. No new export.

## Music director (CL-21, D-21, 2026-09-24)

Owner: Claude (the music director in `core/audio.js`); Cursor owns the engine around it.
- The director listens for `dw-game` `alarm-started` (published by the HQ alarm) and starts the
  fight on it. Whoever changes how a wave is started must keep publishing it.
- A wave ending (the phase going `wave` → `prep` with the run still on) is the last kill: the
  release cue fires there. Nothing else may flip the phase back to prep mid-wave.
- `assets/soundtrack/music.json` holds pools, hit points and stings; names are relative to
  `assets/soundtrack/`, without `.mp3`. Claude keeps it.
- The director also reads `briefing-open` and `briefing-closed` (the music halves while the
  briefing is open, CL-24). Keep publishing them.
- `AudioSys.musicState()` → `{ stage, mood, deckTrack, deckLevel, volume, prox, briefDuck, sting,
  overlapFrames, lastCue, pools, hits, stings, gains, ... }`, read-only, for tests and the overlay.
  `stage` is calm | alarm | gap | fight | relief | after | end.
- `AudioSys.musicCue(name)`: other owners say what happened ('achievement', 'airdrop',
  'objective', 'poi_cleared'); the director picks the sound (CL-23).
- The page's audio-direction state also carries `ember` (Ember Night), `guardian` (any guardian
  up) and `special` (phase 3's special night: 'fog', 'swarm', 'siegenight', 'silent', or null).

## Cave pokes: the immortal grab (GB-32, D-25; revised by GB-35, 2026-09-24; replaces GB-26/D-22)

Owner: Grokbot (combat). Callers: the gunfire and explosion code; Claude's sounds; tests.
- `noteCaveMouthHit(caveIndex, opts?)` → true when this hit brings the guardian out. GB-35: one
  shot into the mouth is enough (was three in 1.5 s), or `{ explosive: true }`. Not while the player is
  in the grab band.
- `triggerCavePoke(caveIndex)` → true when the chase started. It needs: prep or a wave, no modal open,
  no scripted kill or chase running, the player within 20 m (GB-35; was 45) with a clear line to the
  mouth, and outside the grab band. It publishes `dw-game` `{ type: 'cave-guardian', caveIndex, x, z,
  phase: 'aggro' }` and the guardian races out after him (27 m/s against a 11.8 m/s sprint: he cannot
  be outrun). It is an immortal prop, not a zombie.
- On the catch it publishes `phase: 'grab'` (GB-35, new) and calls
  `beginScriptedKill('cave', cave, { chase })`: the drag variant (`sk.drag`), where the camera follows
  it hauling him to the mouth, then the thrown-out cutscene. No crawl-in snatch on this path. The
  walk-in grab (`beginScriptedKill('cave', cave)`, no third argument) is unchanged.
- `getCaveChase()` → `{ caveIndex, t, speed, playerRun, x, z, ran, smashed, steered, dist }` or null; `abortCaveChase()` removes a
  running chase (`abortScriptedKill()` also does).
- `getCavePokeState()` → `{ warned, warning, grace, eyesFor, dayCount, used, hits, now }`: once per cave per
  day, cleared by `startPrep`; `warned` is once a run (GB-44), `warning` is
  `{ caveIndex, age, shake, eyes }` for the day's warning or null.
- Gone with D-22: the fightable poked guardian, its 75-cash drop, and the `emerge`, `retreat` and
  `death` phases. Sounds bind to `aggro` (CL-22); `grab` is free for a sound if Claude wants one.
- GB-39 (GB-A1, 2026-09-25): a player round that passes through a mouth is judged when it ends; if it
  hit a zombie on the way it does not count. During a wave `caveBusyWithWave(caveIndex)` is true for an
  assault cave (preview `caveIndices` or the plan) until the wave has fully spawned, and for any cave with
  a live zombie standing in its mouth; `noteCaveMouthHit` and `triggerCavePoke` return false for a busy
  cave. Test hook: `spawnPlayerRound(origin, dir, damage = 24)` fires one player round (t69).
- GB-44 (D-32, revises D-26, 2026-09-25): the first poke of a run is only a warning.
  `noteCaveMouthHit` / `triggerCavePoke` return true when a poke is taken, the warning or the chase
  (check `getCaveChase()` to tell them apart). The warning publishes the same `phase: 'aggro'` event
  with `warning: true` (every `cave-guardian` event now carries `warning`, false on the chase and the
  grab), so the screech plays; opens the cave's eyes with `caveWarn(cave, 2)` for 3 s and then puts
  back the director's level (so the minimap also sees a 3 s `dw-cave-warn` level 2); and nudges the
  camera. It does not spend the cave. Pokes within 2.5 s of it do nothing (the rest of the burst);
  after that the next poke of any cave brings the guardian out. `startPrep` on day 1 (a new run)
  clears the warning; later days keep it. The chase (GB-A8) steers round static props (trunks,
  stumps, rocks, landmark solids at its height) and smashes any build it runs into
  (`damageBuild` for all its hp, so what stood on it comes down), with a 0.14 s stumble.

## Wave finisher (CL-26, 2026-09-24)

Owner: Claude. The last kill of a wave (the plan spent, nobody left alive) runs the finisher in the
page: red pulse, slow motion for the relief sting's length, a kill cam on the body.
- `dw-game` `{ type: 'wave-last-kill', x, z, typeKey, duration }`: the music director cuts the
  fight, plays `sting_clear` alone and silences every other sound until it ends.
- `AudioSys.cueLength(name)` → seconds (0 until it's known); the finisher uses it for its length.
- Test hooks: `TT.getWaveFinisher()`, `TT.getSlowMo()`, `TT.drainWavePlanDbg()`.

## Skull value accumulator (GP-33, approved by Claude 2026-09-25)

Owner: ChatGPT, game/economy.js. Caller: Grokbot's kill reward settlement.
- createSkullValueAccumulator() returns an independent ledger with credit(raw), reset(), remainder().
- credit(raw) accepts a finite nonnegative number, returns whole skull value and carries the
  fractional remainder to subsequent rewards. Four credits of 1.25 return 1, 1, 1, 2.
- Invalid negative/nonfinite values throw TypeError before mutation; a total above the safe
  integer limit throws RangeError. Values within 1e-12 of a whole value are snapped to it
  to absorb decimal floating-point error. Zero is valid.
- reset() clears the remainder on a new run only. Day changes and broken streaks retain it.
- remainder() is a read-only diagnostic returning the unsettled fraction.
- Combat passes base skull value multiplied by its eligible streak/perk/Ember bonuses to
  credit(), then sends the returned integer through its existing skull-drop path. This
  ledger neither grants Cash nor changes player-versus-build kill attribution.
- Banking remains the only conversion of these skull rewards into Cash. No save contract:
  D-30 starts a fresh run on Play. Wired by Grokbot in GB-42 amend; GP-33 live UI verification passed.

## Night shape in the wave preview (GB-53, 2026-09-25; written down for GP-42 in GB-57)

Owner: Grokbot. Callers: ChatGPT's scouting report on the HQ board (GP-42, D-37), Claude's music (CL-38).
Read-only: reading never rerolls or changes the plan; it is frozen once in `startPrep()` like the rest of the preview.

- `getWavePreview(day).night` = `{ act, rest, trick, label, caves, pushes, lull, ground }`, from `nightPlanFor(day)`:
  - `act`: `'teach'` (nights 1-3), `'build'` (4-10) or `'test'` (11 on).
  - `rest`: `true` on the rest nights (7, 11, 14, 17 in the first twenty), which have a lighter mix and longer breathers.
  - `trick`: a stable id for what the night does: `claw-up`, `runners`, `lake`, `two-fronts`, `nest`, `guardian`,
    `woods`, `bomber-pack`, `runners-two-caves`, `brute-night`, `surround`, `guardian-ember`, `artillery`, `lake-surge`,
    `nest-colossus`, `demon-night`, `surround-fast`, `siege`, `gauntlet`, `last-stand`. Map it to your own short copy.
  - `label`: an English sentence for developers, not player copy. Past night 20 it starts "Night N: ".
  - `caves`: how many mouths the plan asked for: 1, 2 or 3, `'all'` (surround), or `'chalk'` on a guardian night.
    The mouths actually used are the preview's `caveIndices` (and `byTypeAndCave`); ground and lake rows are not caves
    (`caveIndex -1`, see Wave preview exports).
  - `pushes`: the push sizes in order (an array; its length is the number of pushes; the last is the peak).
  - `lull`: the breather between pushes in seconds, counted once the field has thinned (or after `LULL_MAX_WAIT`).
  - `ground`: how many claw up out of the treeline instead of coming from a cave.
- Past night 20 the test nights (13-20) come round again, grown to the old day curve; the same fields apply.
- The full table of the twenty nights is in `docs/specs/difficulty.md`.

## Bounties, combat side (GB-57, D-37 and D-38, 2026-09-25)

Owner: Grokbot. Callers: ChatGPT's HQ board, minimap mark and notice (GP-43). Events go out on `'dw-game'`
through `publishUI`, so each carries `runId`, `eventId`, `day` and `labelKey` (the same label rule as `poi-guards`).

- **When:** each prep from night 2, once the prep is really under way (not under the alarm, not while a card has the
  game paused). Nothing is posted on day 1 (that day has GB-43's guards). If the alarm is sounded before the prep has
  placed anything (Next Night straight from the card), nothing is posted that day.
- **Where:** one post on nights 2-7, two from night 8, at least 25 m apart. Never the POI nearest the HQ (day 1's),
  never one of yesterday's, never the dock. Candidates are the campsites, cabins, sheds, wrecks, the tower, the
  graveyard and the mast.
- **Guards:** in a ring 2.5-5 m round the post, asleep and facing out, like GB-43's, and awake the same way (the marine
  within 18 m, one of them hurt or killed), but each post wakes on its own. Nights 2-3: 3-4 shamblers; 4-7: 4-5;
  8-13: 5-6, one a brute; 14 on: 6-8, one a brute or a demon. Normal kills, normal skulls.
- **Reward (D-38):** per cleared post, skulls into the bag (it still has to be banked), on top of the guards' own
  skulls: nights 2-3 **25**, 4-7 **60**, 8-13 **150**, 14 and up **300**. It goes into the bag as one skull of that value.
- `bounty-posted` `{ kind, index, reward, guards, x, z, dist }`: once per post, when its guards are placed.
- `bounty-done` `{ kind, index, reward }`: when the post's last guard dies, right after that post's `poi-cleared`
  (GP-38's event fires for bounty posts too). The bag has already grown: a `skull-pickup` `{ count: 1, value: reward,
  carriedCount, carriedValue, bounty: true }` goes out just before it.
- `bounty-expired` `{ kind, index, reward, reason }`: an open bounty ends at the alarm (`reason: 'alarm'`, sent straight
  after `alarm-started`), or at a wave begun without the alarm (`reason: 'wave'`, tests and skips). Its guards, asleep or
  awake, go while the alarm's camera is up on the sky and join nobody: no reward, no `poi-cleared`, the wave keeps its
  own total.
- `getBounties()` (plain and on `window.TT`): today's posts as a fresh array, so a reopened board or a late listener
  misses nothing: `[{ kind, index, x, z, dist, reward, guards, day, state: 'open' | 'done' | 'expired', labelKey,
  alive, awake }]`. It is emptied by the next prep and by a new run (`run-reset`). `kind` + `index` are the POI's own
  (the same identity as `poi-guards` and `poi-cleared`), stable for the run.
- Test hooks on `TT`: `spawnBounties()`, `expireBounties(reason)`, `bountyRewardFor(day)`, `bountyGuardTypes(day)`,
  `bountyDbg()`. `getPoiGuards()` lists day-1 guards only. Test: t83.

## The guardian rig and the pit's arms (CL-56, D-39, 2026-09-25)

Owner: Claude (`world/cave-guardian.js`, `world/pit-tentacles.js`). Callers: the scripted kills
and the cave chase in `index.html` (Grokbot's beats drive them; the modules own the bodies).

- `makeCaveGuardianRig(design)` → a Group at the creature's hind feet, +Z forward, with
  `userData.rig` naming every joint (`pelvis`, `spine1`, `spine2`, `chest`, `neck`, `head`, `jaw`,
  `shoulderL/R`, `elbowL/R`, `wristL/R`, `handL/R`, `hipL/R`, `kneeL/R`, `ankleL/R`, `thumbL/R`),
  `rig.joints` (for damping), `rig.hands` (world positions to hang a carried thing off) and
  `rig.eyes`. `design` is a cave design (`rock`, `dark`, `moss`, `eyeTint`).
- Poses, each writing every joint for one frame: `guardianGallop(g, R, phase, run, t, look)`,
  `guardianStand`, `guardianRearGrab(g, R, t, side, ankle, reach, hold, look)`,
  `guardianDragWalk(g, R, t, side, ankle, phase, heave, look)`, `guardianCarryThrow(g, R, t, carry,
  wind, toss, look)`, `guardianWalkUpright(g, R, t, phase, hold, look)`. `g` is the rig root (it
  may be scaled and parented); targets are world points. `ikLimb` is the two-bone solver they use.
- `makePitTentacles({ cx, cz, floorY, ringR, count, glow, waterY })` → a Group with
  `userData.arms`; per arm `tentacleIdle(arm, t, rise)`, `tentacleReach(arm, t, target, coil, w)`
  (coil: `{ centre, axis, r, turns, len, start }`), `tentacleSettle(arm)`, then
  `tentacleUpdate(arm, t)` to rebuild the tube; `tentacleShow(arm, on)`, `tentacleTip(arm)`.
- Both are added to the scene by their caller and disposed with `disposeRigProp` (they carry
  `userData.mats`).

## The studio: clips, rigs and the player (CL-57 to CL-59, D-40, 2026-09-26)

Owner: Claude (`studio/*`, `assets/anim/*`). Callers: the renderer (`tools/studio.mjs`, Cursor's
CU-44) and, from CL-62, the game. The format is `docs/studio.md`; everyone imports `studio/index.js`:

- `loadClip(json)` (throws, listing every problem), `validateClip(json) → [sentences]`,
  `sampleClip`, `blendPoses`, `clipEvents`, `clipTime`, `applyPose(inst, pose, { targets, rootMotion })`,
  `createPlayer(inst)` → `play`, `crossfade`, `update(dt, { targets }) → events`, `poseAt(t, { targets })`.
- `rigs.get(name).create({ design, scale })` → `{ group, R, def }`; `rigs.def(name)` (chains, head,
  stage, budget); `rigCost(group) → { draws, triangles }`; `registerRig(name, def)`.
- `loadReference(json)`, `makeMannequin(ref)`, `poseReference(man, clip, t)` for the UAL reference.
- `ikLimb` moved from `world/cave-guardian.js` to `studio/ik.js` (re-exported from the guardian, so
  old callers still work).
- Scenes (CL-63, D-41; `docs/studio.md` §9): `validateScene(json) → [sentences]`, `loadScene(json,
  clipOf)` (throws, listing every problem), `createScene(scene, { parent, bodies })` → `update(dt) →
  { t, events, checks }`, `seek(t)`, `worst`, `actors`, `root`, `done`. The renderer (CU-46) and the game
  (CL-64) both play scenes through this; neither does hold, path or check maths itself.
- The marine rig: `rigs.get('marine').create()` (a stand-in on the game marine's joint offsets) or
  `create({ group })` to adopt the game's own marine (`adoptMarine`, from `makeMarine()`'s userData).
  `MARINE` in `studio/marine.js` copies makeMarine()'s offsets; `studio/scene.test.mjs` fails if
  index.html's change, so whoever changes the marine's joints updates both.
- `applyPose` takes `reach: { chain: { at, w } }`; `solveChain(inst, chain, target, w)` places one limb;
  `ikLimb(..., endLocal)` aims a limb whose end sits off the bone line. The guardian's clips are
  unchanged (the bake check still passes).
- CL-64: the game plays scenes. `index.html` imports `studio/index.js` (static) and loads
  `guardian-grab-drag` with `fetchScene`; the cave drag (`startGrabScene` / `updateGrabScene` /
  `endGrabScene`, next to `updateCaveDrag`) adopts the game's own guardian rig (`rigs.get('guardian')
  .create({ group: rigRoot })`) and marine, lays the haul path to the mouth, and hands both back with
  `sp.dispose()` at the cut. If the scene can't load, the old hand-coded drag still runs. New in the
  player: the clip channel `step`; `applyPose(..., { dt, free })`; `createScene` options `paths`,
  `ground`, `enter`; `sp.path()`, `sp.dispose()`; `fetchScene(name)`. The studio does its rotations
  through quaternions and world matrices only, so it gives the same answers on the test page's
  stand-in three (tools/tests/fakethree.mjs) as on real three.

## Reactions: bodies that get hit (D-42, Claude; approved 2026-09-26)

`studio/motion.js`, through `studio/index.js`. Claude owns the engine, the rigs' `body` specs and the lab;
the presets (`studio/motion/<rig>/<name>.json`) name their own `owner` (Grokbot for the zombies and the
marine). The full description is `docs/studio.md` §10.

| Export | Contract |
| --- | --- |
| `createMotionPool({ max })` | One per game. At most `max` bodies simulate; `pool.active`. |
| `createBody(inst, preset, { ground, pool })` | `inst` from `rigs.get('zombie' \| 'marine').create({ group })` (adopting the game's own body). `ground(x, z)` is the world height (`entityGroundY`). Throws in sentences on a wrong rig or a rig without `body`. |
| `body.follow()` | Every frame, after the host posed the animation. Cheap while the body only animates. |
| `body.hit({ at, dir, power, kind })` | `at`: a point name or `[x, y, z]` world; `dir` world; `power` m/s at the point; `kind` one of `bullet`, `pellet`, `blast`, `blade`, `crush`. Returns `false` when the pool is full of reacting bodies: the host plays its old reaction. One call per shot (a shell's pellets summed), not per pellet. |
| `body.kill({ ... })` | The same arguments; limp until `settled`, then asleep (the host can freeze the corpse). |
| `body.update(dt, { lod }) → events` | `[name, data?]`: `wake`, `hit`, `stagger`, `step {foot}`, `fall`, `land`, `down`, `getup { side, heading }`, `recovered`, `dead`, `settled`, `held`/`released { point }`, `lost { part }`. `lod` 0 full, 1 half rate, 2 the pose holds while its timers run (contract 4). |
| `getup { side, heading }`, `body.lying` | Contract 1. `side` `front`/`back`; `heading` the world yaw to turn the group to. A preset's `getup.front`/`getup.back` name clips for its rig; a host that plays clips turns to `heading` and plays `getup[side]` at `clip.length / getup.time`. |
| `body.hold(point, target, { strength, offset })`, `body.release(point?)`, `body.holding` | Contract 2. `target` a Vector3, `[x, y, z]` or a function. `strength` 1 pins, under 1 a spring. State `held`. `false` for a lost part. |
| `body.lose(part)`, `body.lost`, `BODY_PARTS` | Contract 3. `armL`, `armR`, `legL`, `legR`, `head` (the game's `partsLost` keys). A lost leg drops a standing body. `reset()` puts it back. |
| `body.shift(dx, dy, dz, { stop })` | The host moved the body's group itself: the whole body goes with it, planted feet included. `stop` is a wall: the speed into it goes. |
| `body.apply()` | Writes the pose onto the rig by `body.weight`; joints the host doesn't re-pose each frame are restored by the next `follow()`. |
| `body.state`, `body.awake`, `body.alive`, `body.weight`, `body.drift` | `drift` (world, m): where the reaction has moved the body; the host adds it to its own position while `awake` (feet while standing, hips once down). The AI does nothing of its own while `state` is `fall`, `down` or `getup`. |

Scenes take `motion`, `hits`, `kill` and `lose` on an actor, and a hold on an actor with `motion` is the body's
own (§10). `sceneClipRefs(json)` lists every clip a scene needs, get-ups included.

**The horde** (`studio/motion-horde.js`, §10.6), the game's only door to the bodies: `createHorde({ presets, max,
ground, lodFor, clips, solve, onEvent, move })`; `hit(z, h)` and `kill(z, h)` (false: refused, play the old
reaction); `beginFrame()` each frame before the host animates, after the pause's early return; `update(dt)` after
it has and every hit is in; `busy(z)` (the AI waits while true); `adopt(key, { rig, preset, group, move, ground })`
for the marine; `freeze`, `release`, `releaseAll`, `stats`. `solve(key, x, z) → { x, z }` is where the host's walls
let a group stand. Behind REACTIONS, off (D-57).

**Expectations** (contract 6, `studio/motion-expect.js`): a preset's `expect` is a list of `{ hit, from?, want,
note? }` with `hit` a battery name (`rifle`, `shotgun-far`, `shotgun-close`, `machete`, `brute-swing`, `grenade`,
`kill`) and `want` an outcome (`none`, `flinch`, `stagger`, `down`, `dead`). Changing one is changing what Jerry
approved: `--review` (rule 13).

**The write door** (contract 5): `tools/serve.mjs` hands every POST under `/__studio/` to
`studio/notes-endpoint.mjs`: `note { asset, text, context?, snapshot?, meta? }` (or the first form, `{ preset, text }`),
`scene { name, json }`, `notes { asset }` (read only) and `ping`. It writes only `review/<asset>/` and
`studio/scenes/lab-<name>.json`, and only for the studio's own pages (Host on this machine, the page's own Origin,
no cross-site request: 403 otherwise). Cursor reviews the hook (CU-47).

## Models as data (dw-model/1, Claude, 2026-09-26)

`studio/model.js` (docs/studio.md §11): `validateModel(json)` (problems as sentences), `buildModel(json)` →
`{ group, joints, parts, meshes, limbs, cost, over }`, `instanceModel(built)` (shared geometry and materials),
`rigFromModel(json)`, `disposeModel(built)`. The models are `studio/models/<kind>/<name>.json`, listed in
`studio/models/index.js`; a model that names a `rig` registers as a studio rig. The game builds nothing from
them yet: each one it adopts (the drums, P-43; the boat, P-52) is its owner's task.
