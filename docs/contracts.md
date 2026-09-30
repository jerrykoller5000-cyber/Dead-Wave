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
- `'hud-state'` `{ dt, active, nearWindow, skulls, pendingDeposit }`: ChatGPT's HUD only. GP-51
  (P-30, 2026-09-27) adds, additive and read-only: `day, phase, cash, hp, maxHp, medkits, building,
  hasPair` (the current gun has a second) and `akimbo`.
- `'alarm-request'` and `'alarm-started'`: ChatGPT's HQ briefing (GP-5, GP-7).
- `'build-hit'` `{ x, z, kind, id, frac, broke }` (CU-50, P-23, 2026-09-27). `kind` is the
  piece (`wall`, `turret`, …); `id` is that build's stable number. `frac` is hp/maxHp after
  the hit, or 0 when `broke` is true. At most one event per build every 2 s, plus one on the
  break even inside that window. The player's own shots do not publish it.
- `'enemy-first-seen'` `{ kind, day }` (GB-111, P-120, 2026-09-29): once a run per zombie kind (`kind` is the
  `ZOMBIE_TYPES` key: `shambler`, `brute`, `demon`, …), the first time one of that kind is within 60 m of the
  marine (co-op: of any player, once `nearestPlayer` lands with CU-63). The cave guardian of the scripted grab
  never counts. A new run starts the list again. For GP-80's first-use cards.
- `'dw-cave-warn'` and `'dw-log'` are separate window events (see caveWarn and waterAt above).

## Repair helpers (approved D-11, 2026-09-23)

Owner: Grokbot. Caller: ChatGPT's prep checklist (`ui/prep-repairs.js`, through dependency
injection, never `window.TT`). From `handoffs/2026-09-23-grokbot-REQ-gp7-repair-complete.md`:

- `getRepairTarget()` → the damaged build T would repair (damaged builds only, the same reach
  as T), or `null`.
- Since GB-63 (P-4, 2026-09-27) "the same reach as T" is storey-bound: T, X and `getRepairTarget()`
  only consider a build whose height overlaps his storey band (`storeyBand`) and that nothing he
  built blocks from his chest (`segmentHitsBuild`; railings and wire excepted). From the ground the
  damaged deck overhead is `null`; from a deck the wall under his feet is `null`. The return shape is
  unchanged and `reachable` stays `true`. Test: t88.
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

- CL-66 (P-11, 2026-09-26): the pit warns before it takes him. Swimming within `LAKE_HOLE.grabR + 8` m of
  the hole publishes `dw-game` `{ type: 'pit-near', x, z, dist, grabR }` once a run (reset with the cave
  warning, on day 1's prep), with a hard pit rumble; the grab itself is unchanged at `grabR`. The coach
  turns the event into its one-time card (P-12); nothing else reads it yet.

- GB-78 (P-32, D-46, 2026-09-29): **kick free.** The run's first guardian catch can be escaped while it hauls him to
  the mouth (the `guardian-grab-drag` scene or the old drag; never the walk-in snatch, the pit or a second catch):
  five presses of E (Space, Enter and Esc still skip to the death). Freed, he stands at least 2 m outside the lip,
  loses 50 HP (never below 1) and his unbanked skull bag. `cave-guardian` gains `phase: 'escape'` with
  `{ state, presses, need }`: `state` is `'open'` as the haul starts (it can be kicked free), `'press'` on each press
  (`presses` of `need`, 5), `'free'` when he breaks loose, `'closed'` if the haul reaches the lip first. Once free:
  `dw-game` `{ type: 'guardian-kick-free', day, receiptId, lostCount, lostValue }` (`receiptId` is
  `'kick-free:<runId>:<day>'`, once a run). Callers: ChatGPT's "Kick free! (E)" prompt and "It took your skulls" (GP-53).

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
  - `order` (GB-82, P-39): `null`, or `'blackout'` once the Lights out dare is picked in this prep (see "Tonight's call").
    The one field that can change after the freeze; nothing else in the plan moves.
- Past night 20 the test nights (13-20) come round again, grown to the old day curve; the same fields apply.
- The full table of the twenty nights is in `docs/specs/difficulty.md`.
- GB-71 (P-16, 2026-09-29): **one breather and a surge on test nights** (`act: 'test'`, 11 on). The early pushes run
  straight on into each other; the only breather is the one before the last push, and it waits for the field to thin
  (as `lull` above) or `LULL_MAX_SURGE` (45 s) at most. The cave eyes dim to level 1 for that breather and go back to
  2 as the surge starts. Teach and build nights keep a breather between every push (at most `LULL_MAX_WAIT`, 30 s).
  `getWaveDirectorState().pace.straight` is `true` on a test night.
- `dw-game` `{ type: 'wave-push', day, push, pushes, last, lull }` once per push, as it starts (the first as the wave
  begins). `push` is 0-based (as `pace.push`); `last` is `true` on the final push (the surge); `lull` is the seconds of
  breather just before it, one decimal, 0 when the push ran straight on (and for the first). Callers: the music's surge
  (Claude), the HUD's "they're coming" line (ChatGPT).

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

## Tonight's call: the relay's daily pick (GP-54, GP-55; D-53; approved by Claude 2026-09-27)

Owner of the offer and the pick: ChatGPT (`ui/radio-call.js`, `game/objectives.js` `radioCall`).
Consumers: Grokbot (GB-81 crates, GB-82 the dare), ChatGPT itself (Field Intel).

- Objective snapshot gains `radioCall { day, repaired, callable, receipt }`: `callable` is re-armed at
  each prep once the relay is repaired; `claimed` stays terminal; a run reset clears it (P-36).
- The cards: `ammo`, `medical`, `hardware`, `intel`, `blackout` (`blackout` from night 4). Three are
  offered when three are eligible; **fewer is fine** (two, or one) when the rest are owned, and with
  none the panel says there is nothing to call in tonight. No third card is invented and there is no
  reroll. Drawn with `Math.random`, never the world seed.
- The pick publishes `dw-game` `'radio-call'` `{ card, day, runId, receiptId }` once; a repeat of the
  same card and day returns the same receipt and publishes nothing. Gone at the alarm.
- Delivery: `ammo`, `medical`, `hardware` are Grokbot's crates (GB-81, P-38: the plane over the mast,
  20-40 m out, a guard pack, waits for the alarm; `hardware` is the cheapest turret blueprint not
  owned, decided at draw time and named in the event as `blueprint`); `blackout` is GB-82's at
  `beginWave` (P-39); `intel` is ChatGPT's own kiosk state, granted on the pick. Until a consumer
  lands, the event simply has no listener: the pick still shows on the board and the receipt holds.
- GB-82 (P-39, 2026-09-29): **the Lights out dare is live.** A `blackout` pick for this run and day, in prep, sets
  `getWavePreview(day).night.order = 'blackout'`; `beginWave` commits it: the HQ yard lamp (`house.hqLight`) stays at 0
  the whole wave and every kill pays x1.25 skull value (`DARE_PAY_MUL`), and with the blood moon's x1.5 the two
  together are capped at x1.75 (`DARE_PAY_CAP`). The next `startPrep` and a new run clear it. For the dawn line (P-40):
  `getWaveDirectorState().dare = { order, active, earned, last }`: `earned` is the extra skull value the dare has paid
  tonight (whole, rounded), and `last` is `{ day, earned }` for the night just ended (null when it had no dare), set
  at `startPrep` before the dawn card shows.

## The boat call: extraction (GB-85, P-50; D-45; proposed by Grokbot 2026-09-29, for Claude's review)

Owner of the state: Grokbot (index.html, the wave director). Consumers: ChatGPT (GP-63, P-51: the "Call the boat" button,
the relay-down line and the dock blink), Claude (CL-73, P-52: the boat comes in on `due`), Grokbot (GB-86, P-53: boarding).

- **State**, live on `getWavePreview(day).night.extraction` and `getWaveDirectorState().extraction.state`: `'offered'`
  in prep from night 20 (`EXTRACTION_NIGHT`) with the relay up (`radioCall.repaired`); `'called'` once he calls it;
  `'due'` from the moment tonight's last push starts; `null` otherwise. Nothing is offered before night 20 or with the
  relay down. A run reset clears it.
- **The call.** `dw-game` `'extraction-request'` `{ runId, day }`, sent like `'alarm-request'`: from the open briefing, at
  the panel, in prep, with no alarm under way. When the boat is `'offered'` it publishes `'extraction'`
  `{ phase: 'called', day }` and sounds the alarm (`hqStartWave`): the normal night, the same `NIGHT_PLAN`. Any other
  request (another day or run, briefing shut, not offered) does nothing.
- **Due.** As the last push starts (`wave-push` with `last: true`), a called night publishes `'extraction'`
  `{ phase: 'due', day }` once. CL-73 brings the boat in on it.
- **Stay.** Sounding the alarm without calling is "stay": an ordinary night, no event, and the next prep offers the
  boat again.
- **The wait.** A due boat waits through the dawn (P-53). The preview says `'due'` in the next prep, and it's not offered
  again. The next alarm sends it away: `'extraction'` `{ phase: 'gone', day, calledDay }`. Boarding (GB-86) ends it
  before that.
- **Boarding (GB-86, P-53; proposed by Grokbot 2026-09-30).** While the state is `'due'` and CL-73's boat is `'waiting'`,
  holding E for `BOARD_HOLD_S` (2 s) within `deck().r + 2.5` m of the boat's deck (the last metre or so of the dock)
  boards it. Letting go, walking off, a landed hit (`player-damaged`), death or a modal starts the hold again.
  Aboard: the state becomes `'boarded'`, `'extraction'` `{ phase: 'boarded', day, calledDay, hot }` is published, and
  `endGame(true)` follows once any finisher camera or scripted kill is over. There's no death-log entry; the music goes to
  'dawn'. `hot` (and `matchStats.hotExtraction`) is true when tonight still had zombies to spawn or kill (a "hot
  extraction"). The last kill's dawn doesn't close the window: the boat waits into the next prep. The HUD prompt reads
  "Hold E — Board the boat", then "Boarding… N%" (GB-114: keyed in ui/strings.js as `extraction.boardPrompt`, `extraction.boarding` {pct}, `extraction.win`, `extraction.winHot`). TT: `BOARD_HOLD_S`, `boardingDbg()`.
  Test: t147. The end of the dock is 112.6 m from the HQ on this map, and the berth 116.5 m.
- TT: `EXTRACTION_NIGHT`, `extractionFor(day)`, `requestExtraction(detail)`, `openHQBriefingDbg()`.

## The wandering colossus (GB-89, P-61; proposed by Grokbot 2026-09-30)

- `wandererAllowed(d)`: the odd nights from 7, never `d % 5 == 0` and never a guardian night (7, 9, 11, 13, 17, 19,
  21, ...). On those days `spawnBounties` adds one `'wanderer'` post after the ordinary bounties (they're unchanged: 1 or 2).
- The post is a GB-57 bounty with `kind: 'wanderer'`, `index` (the `PATHS` leg), `guards: 1` and
  `reward: wandererReward(d)` (`max(150, bountyRewardFor(d))`: 150 on nights 7-13, 300 from 14). Its x, z follow the colossus.
  `getBounties()` rows gain `wanderer: true|false`. `bounty-posted` carries `wanderer: true`.
- One colossus walks a stretch of worn trail (`wandererTrails()`: non-deck legs, points at least 45 m from the HQ and
  dry, a stretch of at least 20 m). It goes end to end and back at 0.6 of its speed (`WANDERER_PACE`). If it hasn't made 1 m of
  progress in 3 s, it turns back. It walks through the no-zombie grace while unaware and attacks nobody until it wakes.
- It wakes on the guard rules: a hit, the marine within 18 m, a heard shot (GB-105) or the alarm. Then it's an ordinary colossus.
  Its kill gives `poi-cleared`, then `bounty-done` with the reward into the skull bag, on top of its own skulls and the
  COLOSSUS DOWN banner. At the alarm an open one goes (`bounty-expired`, reason `'alarm'`).
- UI: `ui/bounties.js` shows only its known kinds today, so the board skips the wanderer until GP-68 (P-62) adds the row and the strings
  (`world.wanderer` is the enriched labelKey).
- TT: `spawnWanderer(d)`, `wandererAllowed`, `wandererTrails`, `wandererReward`, `WANDERER_PACE`. Test: t143.

## Survivor bounties (GB-90, P-64; proposed by Grokbot 2026-09-30)

- From night 3 (`SURVIVOR_FROM`), each campsite bounty that `spawnBounties` posts can hold a survivor: chance
  `survivorChance` (0.5), at most once per camp per run (a camp that has held one, rescued or not, never does again).
- `post.survivor` = `{ style, camp, day, state, x, z }`; `style` is the camp's (`ranger`, `hikers`, `trapper`), `state` is
  `'waiting'`, `'rescued'` or `'lost'`. `getBounties()` rows gain `survivor: { style, state } | null`; `bounty-posted` carries
  `survivor: true|false`.
- They wait 1.5 m from the fire, facing it: a stand-in figure (a bare `makeMarine()`, no gun) until CL-75's look. They're in no
  zombie, hit or target list, so nothing targets or damages them.
- E: `actionTarget()` returns `'survivor'` only within 2.2 m (`SURVIVOR_REACH`) and once none of the post's guards is alive, so E
  does nothing before that. Then E takes them in: the figure goes, `dw-game` `'survivor-rescued'` `{ style, camp, day, count }`,
  and `getSurvivors()` (plain and on `window.TT`) returns this run's `[{ style, camp, day }]`. Prompt key `survivor.rescue`
  (placeholder copy; ChatGPT's).
- The alarm, or the next day's posts, end a wait still at the fire: `'survivor-lost'` `{ style, camp, day, reason }` (reason
  `'alarm'` or `'new-day'`). A run reset clears the survivors and the used camps.
- TT: `getSurvivors`, `survivorDbg` (`setChance`, `allowed`, `inReach`, `waiting`, `campsUsed`). Test: t148.

## Survivors' help (GB-91, P-65, D-52; proposed by Grokbot 2026-09-30)

- The help follows the survivor's `style` from `getSurvivors()` and lasts for the run: a run reset ends it.
- `hikers` (the medic): regen reaches `MEDIC_REGEN_CAP_FRAC` (0.5) of max hp instead of `REGEN_CAP_FRAC` (0.4): `regenCapFrac()`.
- `trapper`: `repairCostOf(b)` is multiplied by `TRAPPER_REPAIR_MUL` (0.75), before rounding up; never under 1: `repairCostMul()`.
- `ranger`: one free light turret, once a run, through `placeBuildAt` on the free cell nearest (-(HQ_HALF + 4), 0), clear of
  the HQ by 2 m, dry and off the cabin. It's an ordinary build with `gift: 'ranger'`. Scrapping or selling it pays nothing back (GB-115); upgrades bought on it refund as usual. If no cell takes it, he tries again at the next prep.
- `dw-game` `'survivor-help'`: `{ style: 'hikers', help: 'regen', cap }`, `{ style: 'trapper', help: 'repairs', mul }`,
  `{ style: 'ranger', help: 'turret', id, x, z }`, fired when the survivor is taken in.
- TT: `survivorHelpDbg` (`grant(style)`, `regenCapFrac`, `repairCostOf`, `setHp`, `regen(dt)`, `giftTurret()`, `owed()`). Test: t149.

## The siege on night 18 (GB-88, P-59; proposed by Grokbot 2026-09-30)

- On a night whose plan has `trick: 'siege'` (night 18 today), `siegeNightNow` is set at
  the alarm (`beginWave`), next to CU-77's `nightKindNow`. A new run clears it. TT: `siegeNightDbg()`.
- Every brute and soldier (`SIEGE_SMASHERS`) the wave spawner makes that night gets `tactics: 'smash'`, and its own tactic is kept in
  `z.siegeFrom` ('tank' or 'weave'). This happens after the cave role, so a cave's role can't undo it.
- `'smash'` is the existing, formerly dormant targeting. Twice a second it picks the nearest placed wall or barricade. It walks to it
  when it's within 28 m, else comes for the marine. It hits any of his builds it bumps into. GB-103's defence seekers still override it.
- A sieging brute keeps its weight: `z.brute` for the heavy hit and the 2.2 heft on builds, and `siegeFrom === 'tank'` for the
  0.25 barricade shove. A sieging soldier drops its weave and rushes while it sieges.
- Unchanged: the total, the mix and the pushes (the plan's own), and the guardian ('boss', planned, D-13). Only one music plan is used
  (P-21). ChatGPT's board line is GP-67.
- Test: t140.

## The hearing rule and the suppressor's cost (GB-105, P-129, D-65; proposed by Grokbot 2026-09-30)

- Every gunshot is heard within `SHOT_HEARING[w]` metres of the marine: pistol and Uzi 35, M4 and shotgun 45,
  launcher 45, AK, revolver and AA-12 50, minigun 55, sniper 70. With a can fitted (`suppressor[w]`, CU-68), it's
  `SUPPRESSED_HEARING_MUL` (0.3) of that: the M4 goes to 13.5 m and the sniper to 21 m.
  `shotHearingRadius(w)` gives the live radius.
- A sleeping post guard (GB-43 and the GB-57 bounties) inside the radius wakes its whole post with `poiWake: 'shot'`,
  the same wake as the alarm, a hit or walking up (18 m). In a wave the horde is already coming, so the rule shows by
  day.
- A suppressed round (bullet or pellet) carries `SUPPRESSED_DAMAGE_MUL` (0.9) of the gun's damage
  (`suppressedDamageMul(w)`). The launcher, minigun, flamer and saw take no can.
- For P-139's stir meter: `heardShotDbg()` returns `{ shotsHeard, lastShotNoise: { x, z, r, w, suppressed, t } }`
  (TT). A stir meter can take the same radius per shot.
- Test: t139.

## The late payout trim (GB-113; ChatGPT's GP-60 request, approved by Claude 2026-09-29)

- From night `LATE_CASH_NIGHT` (11), a kill's skull value is the table's `cashDrop` x `LATE_CASH_FACTOR` (0.67),
  applied at the kill (`lateCashMul(day)`, on `window.TT`), before the streak, Scavenger, blood moon and dare
  multipliers. The table itself is unchanged. Nights 1-10, bounties, objectives, supply drops and the guardian's
  first-blood 80 are unchanged. Endless nights past 20 are trimmed too.
- For a budget model, nights 11+ bank x0.67. With that, GP-77's careful buyer ends night 20 on about 2,497 Cash (it was
  10,631).

## Weapon mods: one per gun (GB-84, P-48; proposed by Grokbot 2026-09-29, for Claude's review)

- Each gun has one mod slot. The two mods:
  - **Extended mag**: every gun in `EXT_MAG_PRICE`. As before, x1.5 magazine and the calibre's reserve cap. New:
    the reload takes `EXT_MAG_RELOAD_MUL` = x1.25 longer while it's fitted (the shotgun already pays shell by shell,
    so it's exempt). This is the roadmap's nerf that needs Claude's sign-off.
  - **Heavy barrel**: M4, AK, Uzi and minigun (`HEAVY_BARREL_PRICE`, same as their ext-mag prices, through
    `equipmentPrice`). Halves the recoil climb (`HEAVY_CLIMB_MUL`), doubles the movement term of the cone
    (`HEAVY_MOVE_SPREAD_MUL`), and the draw takes `HEAVY_SWAP_DUR` = 0.45 s, holding fire until the gun is up.
- A mod is bought once and fitted on purchase. Fitting one un-fits the other. Switching between owned mods is free
  and reports nothing. A refit never loses a round (Claude, 2026-09-29). The loaded magazine keeps what fits, and the rest
  is repacked into spare magazines of the new size. What the smaller spare cap can't hold goes back to the reserve over
  its cap: buys and pickups add nothing until it's spent back under.
- Reads: `weaponMods(w)` returns `{ fitted: 'ext' | 'heavy' | null, ext, heavy, canExt, canHeavy }` (`ext` and `heavy`
  mean owned). `weaponMods()` returns that for every gun that takes a mod. Actions: `buyExtMag(w)`, `buyHeavyBarrel(w)`,
  `fitWeaponMod(w, 'ext' | 'heavy' | null)`, which returns false for a mod that isn't owned. All are on `window.TT`.
- Purchases: `purchase-delivered` `{ itemId: 'magazine:<w>' }` for the ext mag (unchanged) and
  `{ itemId: 'mod:heavy:<w>' }` for the barrel, each once, at the time of purchase.
- The kiosk's ext-mag row now reads OWNED from "bought", not "fitted". The Upgrades rows (both mods, the fitted one
  marked, a free switch) are GP-62's. A delve strongbox mod (D-67) can use the same calls.
- A new run clears both. Test: t136.

## Lifetime badges: the milestone facts (GP-65; P-55; approved by Claude 2026-09-27)

Owner of the store and the awards: ChatGPT (`ui/badges.js`, `tt_badges`; badges only, never power, D-30).
The facts come from two places, and nothing else: the run record and four `dw-game` events.

- **The run record.** `recordFinishedRun` (index.html, GP-52's hook, called once from `endGame` and
  `quitToMenu`) is the one authoritative end-of-run summary: `{ day, kills, streak, headshots, skulls,
  evacuated }` plus, from now, `eligible`. The badges observe that same call: `night-five`, `night-ten`,
  `night-twenty` (`day` reached, so the nights before it were cleared), `thousand-kills`,
  `hundred-headshots`, `streak-twenty`, `thousand-skulls` (banked in that run), `out-on-the-boat`
  (`evacuated`, GB-86's boarding ends the run with it). Nothing is awarded from a live counter; a run
  that ends counts once.
- **`eligible`.** `true` unless a debug hook was used during the run. The shell keeps one flag,
  `debugTouched`, set by any `TT.*` hook that changes the run's state (the `*Dbg` setters,
  `loopNextNight`, `loopMorning`, `skipPrep`, `setAmmoDbg`, `setGearDbg`, the scripted-kill and cave
  hooks), reset at a fresh start; `recordFinishedRun` passes `eligible: !debugTouched`. Landed in CU-59:
  the flag wraps the `TT` hooks (the `*Dbg` setters, not the read-only ones, plus `loopNextNight`,
  `loopMorning`, `skipPrep` and the scripted-kill and cave hooks). A real play calls those functions
  directly, so it stays eligible.
- **Moment awards**, each from an existing or named event, awarded at once with the `achievement` cue:
  - `first-bank`: `dw-game` `'deposit-complete'` (existing).
  - `relay-online`: ChatGPT's own objective snapshot, `radioCall.repaired` turning true (existing).
  - `kicked-free`: `dw-game` `'guardian-kick-free'` `{ day, runId, receiptId }`, published once per escape
    by GB-78 (P-32/P-33; GP-53's "Kick free!" copy reads the same event). Named here so both sides build
    to it; until GB-78 lands the event has no publisher.
  - `fog-survivor`: `dw-game` `'night-cleared'` `{ day, kind, runId }` at dawn (`startPrep`, before
    the day number moves on), one per night, day 1 included. **Live (CU-77, 2026-09-29).** `kind` is
    one word, first match wins: `fog` (the night plan's `mod === 'fog'`, P-56), `siege` (night 18's
    trick), `guardian`, `colossus` (every fifth night that isn't a guardian night), `blood-moon` (Ember
    Night), `plain`. `TT.nightKindForDay(d)` gives it for any night. The badge is `kind === 'fog'` on the
    night 14 clear. `night-cleared` is also the fact behind `nightCleared`/`nightKind` in the adapter;
    the night-N badges stay on the run record. Night 14 says `plain` until Fog Night's `mod` lands
    (P-56, GB-87); then the fog badge has its source with no change here. **Live (GB-87, 2026-09-29):** night 14's plan has `mod: 'fog'`, also on `wavePreview.night.mod` and `getWaveDirectorState().mod` from night 14's prep; `null` on every other night, the endless ones included.
- The twelve ids and their criteria are fixed as proposed: `first-bank`, `relay-online`, `night-five`,
  `night-ten`, `night-twenty`, `fog-survivor`, `kicked-free`, `out-on-the-boat`, `thousand-skulls`,
  `thousand-kills`, `hundred-headshots`, `streak-twenty`. Debug-started runs (`eligible: false`) award
  none, moment awards included. A badge once earned is never taken back; the store holds only
  `{ version, unlocked[] }`.

## Reactions: bodies that get hit (D-42, Claude; approved 2026-09-26)

**In the game the reactions are a Settings toggle, "Ragdoll", off by default** (Jerry, 2026-09-27; `tt_reactions`
in localStorage, `TT.setMotionEnabledDbg(true)` in a test). Off, hits, deaths, the marine's blows and the cave
drag play the code that was there before D-42 landed: no body is created or updated. On, the marine's body
plays only a blow that puts him down (a stagger is GB-50's stumble and knee, as before), a live body is let go
after 8 s (the marine's after 6 s) whatever state it is in, a standing zombie's body comes along with its mesh
(`body.shift`), and the animation pose of every reacting zombie is kept and put back before `updateZombies`
writes again (GB-98). Tests that need a body turn it on themselves.

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
| `body.update(dt) → events` | `[name, data?]`: `wake`, `hit`, `stagger`, `step {foot}`, `fall`, `land`, `down`, `getup`, `recovered`, `dead`, `settled`. |
| `body.apply()` | Writes the pose onto the rig by `body.weight`; joints the host doesn't re-pose each frame are restored by the next `follow()`. |
| `body.hold(point, at \| null, w)` | CL-67. Every frame while held: the named body point (`footL`, `handR`, ...) goes to `at` (world), the rest hangs; `w` is the weight. `null` lets go. State `held`; events `held`, `released`. |
| `body.shift(dx, dy, dz)` | CL-67. The host moved the body itself: every simulated point, pin and step comes along, no push. |
| `body.state`, `body.awake`, `body.alive`, `body.weight`, `body.drift` | `drift` (world, m): where the reaction has moved the body; the host adds it to its own position while `awake` (feet while standing, hips once down). The AI does nothing of its own while `state` is `fall`, `down` or `getup`. |

In the game (GB-65, GB-66; Grokbot's, index.html): a zombie is adopted as the `zombie` rig on its first
hit and the marine as `marine` (GB-67); a body's `power` is the round's damage before armour (armour
soaks the wound, not the shove; the preset's `mass` decides who stays up); a crawler, a zombie climbing a
window, rising or leaping, and the spiders, colossus and guardian get no body and play the old reaction
(`getMotionStats().skipped`); a full pool or a refused body counts as `refused`. Deaths hand the body to
the corpse (`body.kill`), which freezes when `settled`. Adopt with the same build options the rig would be
built with (`create({ group, type })` for a zombie's kind) so its studio rest matches; `rigs.js` keeps one
reference rest per rig and options, so adopting costs no rebuild.

Scenes take `motion`, `hits` and `kill` on an actor, and `limp` on a hold (§10): `guardian-grab-drag`
hangs the marine from the guardian's hand from the yank on (CL-67), so the game's cave drag shows the
simulated body; `startGrabScene` needs nothing new (the scene makes the body on its adopted marine). The motion lab's notes come in through
`POST /__studio/note` on `tools/serve.mjs` (`studio/notes-endpoint.mjs`), which writes only under
`review/motion-*` (Cursor reviews the hook: CU-47).

## Supply drops: the call and the event (GP-88, P-34; approved by Claude 2026-09-29)

Owner: ChatGPT (moved from Cursor's CU-58). Consumers: Grokbot's crates (GB-81, GB-83), ChatGPT's notice (GP-56).

- **The call.** `spawnSupplyDrop({ x, z, contents, source })`, every field optional. With none it behaves as before
  (a landable spot 22-56 m from a living player, the old random crate). `x, z` place it; `contents` is `'ammo'`,
  `'medical'`, `'hardware'`, or `{ items: [{ id, qty }], ammo, medpens, grenades, blueprint }`; `source` says who
  called it (`'random'`, `'radio'`, `'breather'`, ...) and rides on every event.
- **The event.** `dw-game` `'supply-drop'` `{ phase, x, z, source, breather, runId, eventId }`, `phase` one of
  `inbound`, `landed`, `claimed`, `expired`, each once per crate. `claimed` adds what he got: `rounds`, `pens`,
  `grenades`, `blueprint`. Optional, for the notice's words (GP-56): `bearing` on `inbound` (where it is coming
  down, from him), `ammoOffered` and `medpensOffered` on `claimed` (what the crate held, so a medical-only crate
  never reads as "ammo full"). `phase`, `x`, `z`, `source` and `breather` are the required fields.
- The airdrop cue plays on `inbound`, as before. Nothing else publishes `supply-drop`.
- GB-81 (P-38, D-49, 2026-09-29): **drops are earned.** With the relay down, the random crate comes once a night, 40-180 s
  into the wave, never by day; once the relay is up (`radioCall.repaired`) the random timer stops. An `ammo`, `medical` or
  `hardware` `radio-call` for this run and day, in prep, calls `spawnSupplyDrop({ source: 'radio' })` 20-40 m from the
  mast (`hardware` carries the event's `blueprint`). One radio crate a day, and a repeated `receiptId` delivers nothing.
  On `landed` a guard pack claws up 6-10 m round it: 2 on nights 1-3, 3 on 4-6, 4 on 7-9, 5 from 10, one feral from
  night 4 and two from night 8 (`z.objectiveRole === 'crate-guard'`). A radio crate doesn't time out; it `expired`s at
  the alarm if it's still unclaimed. TT: `callRadioCrate`, `crateGuardPlan`, `relayUp`, `setRelayUpDbg`, `getSupplyTimer`.
