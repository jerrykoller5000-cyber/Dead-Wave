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

## Tree batches (CL-10, 2026-09-23)

Owner: Claude. Internal to the world: nobody else calls it. Listed so other owners know the
rule it relies on: **change a tree only through its own state and meshes** (the tree object,
`t.group`, `t.trunkMesh`, `t.canopyMeshes`), as every caller already does. Far trees draw from
merged copies; any change to a tree's state, visibility or position makes it draw itself
within two frames, and `restoreTree` lets it rejoin its copy. Don't set `visible` on a tree's
trunk or canopy mesh: the batches own that flag. Debug on `TT`: `treeBatchStats()`,
`getTreeBatches()`. `?trees=single` turns batching off.

## Math (CU-4 step 1, 2026-09-24)

Owner: Cursor. Callers: the world and combat, from `core/math.js`. Same functions as before,
moved out of `index.html` with no behaviour change. No Three and no game state.

- `hash2`, `vnoise`, `fbm`, `ridged` — 2-D value noise
- `hash3`, `vnoise3` — 3-D value noise
- `smoothstep01`, `smoothBand`, `distPointToSeg`
- `mulberry32(seed)` — returns a deterministic 0..1 function

