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
- `getCaveChase()` → `{ caveIndex, t, speed, playerRun, x, z, dist }` or null; `abortCaveChase()` removes a
  running chase (`abortScriptedKill()` also does).
- `getCavePokeState()` → `{ dayCount, used }`: once per cave per day, cleared by `startPrep`.
- Gone with D-22: the fightable poked guardian, its 75-cash drop, and the `emerge`, `retreat` and
  `death` phases. Sounds bind to `aggro` (CL-22); `grab` is free for a sound if Claude wants one.

## Wave finisher (CL-26, 2026-09-24)

Owner: Claude. The last kill of a wave (the plan spent, nobody left alive) runs the finisher in the
page: red pulse, slow motion for the relief sting's length, a kill cam on the body.
- `dw-game` `{ type: 'wave-last-kill', x, z, typeKey, duration }`: the music director cuts the
  fight, plays `sting_clear` alone and silences every other sound until it ends.
- `AudioSys.cueLength(name)` → seconds (0 until it's known); the finisher uses it for its length.
- Test hooks: `TT.getWaveFinisher()`, `TT.getSlowMo()`, `TT.drainWavePlanDbg()`.
