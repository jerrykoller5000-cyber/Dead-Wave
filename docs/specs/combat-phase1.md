# Combat Phase 1 — wave preview, cave roles, builds

Owner: Grokbot (`combat/*` after split). Phase 0 deliverable while Cursor splits `index.html`.
Ground truth mined from `/workspace/tiny-trek/index.html` (READ ONLY), `docs/gameplay.md`, `AGENTS.md`, `handoffs/requests.md`.
Do not treat this file as live code; symbols below are greppable names in the monolith today.

Performance budget (AGENTS.md §12): **60 fps @ 48 zombies** (`MAX_ZOMBIES = 48`).

---

## 1. Wave data model (`combat/waves.js`)

### Current day / prep / wave / night (as implemented)

There is no separate `night` phase symbol. The loop is:

| Symbol | Role |
| --- | --- |
| `day` | Integer day counter; incremented at the start of prep |
| `phase` | `'idle'` → `'prep'` → `'wave'` → (clear) → `'prep'`… |
| `PREP_TIME` | `120` (or `AUTO_SKIP_PREP_S = 5` when `tt_skip_prep`) |
| `prepTimer` | Set in `startPrep()`; HUD no longer auto-counts down — wave starts when the player sounds the HQ alarm |
| `startPrep()` | `day += 1`, `phase = 'prep'`, builds `waveQueue`, picks `waveBearings` / `waveSurround`, sets `bloodMoon` |
| `beginWave()` | `phase = 'wave'`; called after `hq.seq` strobe finishes (HQ panel `E`) |
| `spawnWaveBatch(dt)` | Drains `waveQueue` into `spawnZombie`; picks cave **at spawn time** |
| `waveComposition(dayNum)` + `swellWithFodder` / `HORDE_MULT = 10` | Ordered type keys for the wave |
| `zombiesForDay(n)` | Base specialist-ish count before swell (day 5+ path) |
| `bloodMoon` | `day >= 4 && day % 4 === 0`; set in `startPrep` |
| Colossus | `day % 5 === 0` → `waveQueue.push('colossus')` after composition |

Gameplay.md’s “night” / “coming night” language = the **wave** that follows the current **prep**. Preview is for that wave.

**Gap today:** cave mouths for non-drowned spawns are chosen inside `spawnWaveBatch` from `waveBearings` / surround / ambush — **not** frozen when prep starts. UI can only show bearings (`waveBearings` → minimap rim arcs), not per-type / per-cave counts. That is what `getWavePreview(day)` fixes.

### When the preview is decided

- **Decide once in `startPrep()`** (same moment as today’s `waveQueue = waveComposition(day)` + bearing pick).
- Store on the director as `wavePreview` (immutable for that day).
- **`beginWave` / `spawnWaveBatch` must consume that plan exactly** — same type order and same cave assignment. No re-roll of cave at spawn (except documented exceptions below).
- Re-entering prep for a new day rebuilds a new preview; never mutate yesterday’s.

### Proposed `getWavePreview(day)` return shape

Aggregates for ChatGPT’s panel **plus** the authoritative spawn plan Grokbot keeps.

```js
/**
 * @typedef {'shambler'|'feral'|'leaper'|'spider'|'drowned'|'military'|'brute'|'spitter'|'screamer'|'bomber'|'demon'|'colossus'} ZombieTypeKey
 * // caveguard is ZOMBIE_TYPES-only / scripted; never in wave preview
 *
 * @typedef {Object} WavePreviewBucket
 * @property {ZombieTypeKey} typeKey
 * @property {number} count
 * @property {number} caveIndex   // index into POI.caves; -1 = lake hole (drowned)
 * @property {string|null} caveTheme  // 'root'|'shale'|'iron'|'wet'|'hill'|'chalk' or null
 * @property {string|null} caveName   // caveLocationName / c.name — display only
 *
 * @typedef {Object} WavePreview
 * @property {number} day
 * @property {boolean} bloodMoon
 * @property {boolean} surround      // waveSurround
 * @property {boolean} hasColossus
 * @property {number} total          // === waveTotal / queue.length
 * @property {number[]} caveIndices  // unique caves used (POI.caves indices); empty if surround-all
 * @property {number[]} bearings     // c.ang for rim arcs (same role as waveBearings)
 * @property {WavePreviewBucket[]} byTypeAndCave  // UI table
 * @property {ZombieTypeKey[]} queue // authoritative spawn order (today's waveQueue)
 * @property {number[]} caveByIndex  // parallel to queue: POI.caves index or -1
 */

/** @returns {WavePreview} */
function getWavePreview(day) { /* plan for that day; during prep, day === director.day */ }
```

**Cave identity:** until Claude adds a stable `caveId`, use **`caveIndex` = index in `POI.caves`** after `planCaves()` (`THEME_BY_SIXTH = ['root','shale','iron','wet','hill','chalk']`). Theme is `c.theme`. “Barrow” in docs/flavor = `hill` design (`dome.mode: 'barrow'`), not a seventh theme.

### Planning algorithm (replace spawn-time cave pick)

1. Build `queue` exactly as today: `waveComposition(day)` then optional `'colossus'`.
2. Pick assault caves as today (`waveSurround` / one or two `POI.caves` → `waveBearings`).
3. For each entry in `queue`:
   - `'drowned'` → `caveIndex = -1` (spawn via `pickWaterSpawn` / `LAKE_HOLE`).
   - else → assign a cave from the assault set (round-robin or weighted by theme preference from §2). If `waveSurround`, distribute across all six.
4. Build `byTypeAndCave` by aggregating `(typeKey, caveIndex)`.
5. Freeze `queue` + `caveByIndex` on the director.

**Ambush:** today `spawnWaveBatch` can override cave to the mouth nearest the player (`ambushCd`, day ≥ 2). Phase 1 options (pick one in implementation handoff; default **A**):

- **A (recommended):** ambush only retargets to a cave **already in `caveIndices`** (preview totals stay honest; bearing arcs stay correct).
- **B:** bake ambush slots into the preview (flag `ambush: true` on those queue rows) — needs ChatGPT copy.
- **C:** disable ambush until Phase 2.

### Director state (proposed)

```js
/**
 * @typedef {Object} WaveDirectorState
 * @property {'idle'|'prep'|'wave'} phase
 * @property {number} day
 * @property {number} prepTimer
 * @property {boolean} bloodMoon
 * @property {boolean} surround
 * @property {ZombieTypeKey[]} waveQueue
 * @property {number[]} caveByIndex
 * @property {WavePreview|null} wavePreview
 * @property {number} waveTotal
 * @property {number} waveSpawned
 * @property {number} zombiesRemaining
 * @property {number[]} waveBearings
 * @property {number} spawnCd
 * @property {number} burstLeft
 * @property {number} ambushCd
 */
```

Live symbols today also include `MAX_ZOMBIES`, `HORDE_MULT`, `pickZombieType` (fallback only when queue empty — must not steal specialists; see comment at spawn peek/shift).

### Contract notes

**Grokbot exports** (for `docs/contracts.md` once Cursor lands modules):

| Export | Caller | Notes |
| --- | --- | --- |
| `getWavePreview(day?)` | ChatGPT UI | If omitted, return current prep/wave plan; throw/null if `phase === 'idle'` and no plan |
| `getWaveDirectorState()` | ChatGPT / tests | Read-only snapshot |
| `getActiveCaveIndices()` | ChatGPT minimap | Same as `wavePreview.caveIndices` |
| Events / hooks: `onPrepStarted(preview)`, `onWaveStarted(preview)` | ChatGPT | Fire from `startPrep` / `beginWave` |

**Grokbot calls:**

| Callee (owner) | When | Why |
| --- | --- | --- |
| Claude `caveWarn(caveIndex \| cave)` | Once per prep when caves are chosen; again at `beginWave` if Claude wants a pulse | Rim / world warn FX |
| Claude water / blocker APIs | Spawn + pathing for drowned / roles | See §5 |
| `POI.caves`, `caveNearestBearing`, `pickWaterSpawn` | Planning + spawn | World ground truth — do not relocate caves |

**ChatGPT consumes:** preview buckets + strings keys; does **not** invent counts. Spawn authority stays in Grokbot.

**Spawn match rule (acceptance):** for a fixed seed / forced plan, the sequence of `(typeKey, caveIndex)` from `spawnZombie` success path equals `wavePreview.queue` × `caveByIndex`. Field-full backoff may delay a spawn but must not drop or reorder the planned entry (today’s peek-before-shift comment at `spawnWaveBatch`).

---

## 2. Enemy roles per cave

### Cave list (code)

From `planCaves` / `CAVE_DESIGNS` / `THEME_BY_SIXTH`:

| Index | `theme` | Design flavor (comments in `CAVE_DESIGNS`) |
| --- | --- | --- |
| 0 | `root` | Ancient tree, roots frame mouth |
| 1 | `shale` | Tall narrow cleft, layered ridge (`mode: 'fin'`) |
| 2 | `iron` | Rust maw, iron-stained outcrop (`mode: 'crag'`) |
| 3 | `wet` | Dripping bank, moss curtain (`mode: 'bank'`) |
| 4 | `hill` | Barrow / turf mound (`dome.mode: 'barrow'`) |
| 5 | `chalk` | Bone arch, pale limestone (`mode: 'mesa'`) |

### Spawn assignment today

- Non-aquatic: mouth of a `POI.caves` entry (`spawnWaveBatch`).
- `drowned`: `pickWaterSpawn()` at `LAKE_HOLE` (not a cave theme).
- `caveguard`: scripted only (`beginScriptedKill`); not a horde type.

### Proposed data table → `combat/caveRoles.js` (or table inside `waves.js`)

Single table, no scattered `if (theme === …)` in AI. Runtime: `roleForCave(theme)` → trait mods applied when the zombie is spawned from that cave (and optionally stamped on the zombie as `z.caveTrait`).

| caveId / theme | trait key | mechanical effects (Phase 1 target) | preferred `ZOMBIE_TYPES` | notes / open questions for Claude |
| --- | --- | --- | --- | --- |
| `wet` | `douse` | Move speed ×~0.85; on contact / short radius, damp `groundFires` / reduce burn on self (`fireResist` bump while wet). Horde from this mouth should feel soggy. | `drowned`, `shambler`, `spitter` | Need Claude: water depth / “wetness” near mouth; is extinguish world-owned (`clearGroundFires` / rain path) or combat-owned? Prefer Claude exposes `douseFireAt(x,z,r)` or Grokbot calls existing ground-fire damp. |
| `iron` | `armoured` | Flat `armor` += ~0.08–0.12 on spawn (stack with type); slightly slower. Reads as scrap-plate horde. | `military`, `brute`, `shambler` | Visual scrap? Mesh still Grokbot; no world change required. Confirm iron cave apron is not already a blocker. |
| `root` | `climber` | Can crest **low** cover: `sandbag`, `wire`, `barricade` under ~1.1 m (`BUILD_RULES.*.height`) as walkable / vault; still blocked by full `wall` / gated openings. | `feral`, `leaper`, `spider` | Claude: pathing / flow-field must treat “climbable low edge” — today flow treats builds as walls. Need `caveWarn` + blocker API or a combat-side vault once adjacent. Window climb already hinted in `BUILD_BLURB.window`. |
| `shale` | `cleft` | Narrow-file spawn bias + slight speed up on slopes; prefer flanking (`tactics` lean `flank` / `leap`). Optional: reduced radius squeeze through 1-cell gaps. | `leaper`, `feral`, `screamer` | Tall fin mouth — confirm mouth half-width (`mouthHalf`) already constrains spawn jitter. Flow-field gap rules are Claude/core. |
| `chalk` | `bone` | Pale / brittle fantasy: +headshot vulnerability or −hp ~10%, +scream / fear pressure; prefer ranged annoyers. | `screamer`, `spider`, `shambler` | Flavor aligns with `caveBoneMat` / bone-arch design. Avoid overlapping `caveguard` scripted look. |
| `hill` (barrow) | `barrow` | Burial surge: denser fodder packs from this mouth; minor HP regen delay or “rise” spawn (`noRise` false always). Prefer slow tanks + fodder. | `shambler`, `brute`, `bomber` | `hill` theme === barrow dome. Colossus still day-scripted, not theme-locked. |

**Application rule:** trait applies when `caveByIndex` maps to that theme at spawn. Drowned (`caveIndex === -1`) keep aquatic behaviour only (existing `aquatic: true` / water speed — Claude). Surround days still tag each body with the mouth it actually used.

**Out of scope for the table:** Blood Moon global speed (`bloodMoon ? 1.2`), `ZOMBIE_PACE`, demon `fireResist` — stay global.

---

## 3. Build bug / stale-test list

### Harness status on this box

`/workspace/tiny-trek/tools/` is **not present**. Claude’s harness is requested to Cursor as `handoffs/claude-harness.zip` (not on disk here). Stale IDs below come from `handoffs/requests.md` (Claude → Grokbot):

> t11, t12, t13, t15, t17, t18, t21, t23, t24, t25, t29, t34 — placement, build wheel, pillars, turrets.

Until Cursor wires `tools/tests/` + `npm test`, treat the following as the inventory to run/fix, hypothesized from **current** build symbols (not from failing assertions we could execute).

### Systems to inventory when harness lands

| Area | Greppable symbols | gameplay.md / help text |
| --- | --- | --- |
| Costs / unlocks | `COST`, `BUILD_UNLOCK_PRICE`, `buildUnlocked` | Blueprints + Cash per place |
| Wheel | `BUILD_PAGES` (Structure · Defenses · Turrets), `BUILD_ORDER`, `pageOfBuild`, `wheelPage`, `openWheel` | Hold B paged wheel |
| Placement | `placeMode`, `resolveTarget`, `placeBuildAt`, `placeRefusal` / refusal strings, `BUILD_RULES`, `FLOOR_SPAN` | Lattice 2 m, `R` yaw |
| Pillar | `pillar`, `PILLAR_H`, `pillarBraced`, `pillarReaches`, `pillarTopFor`, slot `ptop` | Corner post; turret on cap |
| Turrets | `light` / `flame` / `heavy` / `mortar`, `tickingBuilds`, `updateTurrets` | Object slot on ground/platform/floor |
| Floors / stairs | `floor`, `stairs`, `floorSpanDepth`, `floorSpanY`, `dependentsOf` | Span ≤ 2; stairs ramp whole cell |
| Collapse | `removeBuild`, `dependentsOf`, `deckSupported` | Wall gone → decks/turrets fall |
| Bridges / cover (world + combat feel) | `POI.bridges`, `playerGroundY`, `BUILD_BLOCKS` | “Things work as they look” |

### Likely stale / open items (Phase 1 item 1)

| ID / topic | Hypothesized cause | Files likely involved (post-split) | Acceptance check |
| --- | --- | --- | --- |
| t11–t13 placement / refusal | **Test out of date** vs edge-slot walls + `BUILD_RULES.on` (walls are edges, not cell-centre posts) | `combat/builds.js`, harness expecting old centre footprints | Ghost + `resolveTarget` agree with `BUILD_RULES`; refusal strings match |
| t15 / t17 build wheel pages | **Test out of date** if still expecting flat `BUILD_ORDER` ring without `BUILD_PAGES` | `combat/builds.js` + UI wheel hooks ChatGPT may own visually | `BUILD_PAGES[0..2].keys` match Structure/Defenses/Turrets; unlock hides locked keys |
| t18 / t21 pillar | **Either:** tests still use cell-centre pillar **or** brace/reach regressions (`pillarReaches`, 4 vs 12 cells) | `combat/builds.js` | Pillar on corner; floor support; turret only on `ptop` |
| t23–t25 turrets | **Test out of date** (platform raised mid / `edgeH`) or **game:** turret on pillar / floor buried by later deck | `combat/turrets.js`, `BUILD_RULES.platform` | Place light/flame/heavy on ground, platform, floor, pillar cap; `updateTurrets` ticks |
| t29 / t34 collapse / sell | **Game risk:** `dependentsOf` + sell top-of-cell (`X`) vs stacked floor spans | `combat/builds.js` | Destroy wall under platform → platform+turret removed; sell refunds opening |
| Floors span | Open bug risk: span depth vs neighbour walls (`FLOOR_SPAN = 2`) | `floorSpanDepth` | Roof a 2-cell room; third cell refuses |
| Stairs / bridges | “Things work as they look”: marine + zombies climb stairs; bridge decks via `playerGroundY` | builds + world colliders (Claude/Cursor) | No hover/fall-through on stairs/bridge; horde uses stairs |
| COST drift | Tests hard-coded old prices vs `COST` map | harness + `COST` | Assert against live `COST` / `BUILD_UNLOCK_PRICE` |

**Rule (AGENTS.md §13):** for each failure, fix game **or** update test — never delete/weaken. Combat-owned tests → Grokbot; harness wiring → Cursor.

---

## 4. Phase 1 ordered handoffs (checklist)

Jerry’s order. Owners / deps:

| # | Item | Owner | Depends on | Done when |
| --- | --- | --- | --- | --- |
| 1 | Fix stale build tests (t11–13,15,17,18,21,23–25,29,34) | **Grokbot** | Cursor lands harness under `tools/tests/` + `npm test` | Listed tests pass or retired with written reason; no silent deletes |
| 2 | `getWavePreview(day)` + spawn matches plan | **Grokbot** | Split `combat/waves.js` (or works in-monolith behind freeze: **spec only until freeze lifts**) | Prep freezes plan; spawn sequence equals preview; unit test on composition |
| 3 | `caveWarn` + ChatGPT minimap event | **Claude** (`caveWarn`) + **ChatGPT** (minimap pulse / panel) + **Grokbot** (emit / call at prep) | Preview cave indices stable | Prep shows which mouths; pulse on warn; strings via `ui/strings.js` |
| 4 | Enemy roles data table wired | **Grokbot** | Claude answers water / climb / douse questions in §5 | Table-driven mods on spawn; no theme `if` soup in AI |
| 5 | Things work as they look (floors / stairs / bridges / cover) + tests | **Grokbot** (builds) + **Claude** (bridge/world colliders if broken) | Item 1 harness green enough to add cases | Marine and horde path match visuals; regression tests for span/collapse/stairs |

### Phase 2 (brief)

After Phase 1: deepen role FX (VFX/audio), ambush policy B if needed, weapon/scripted-death polish already under Grokbot, and any leftover specialist tuning — **without** breaking the 60 fps @ 48 budget or deterministic cave layout (Claude sign-off).

---

## 5. Requests (draft for `handoffs/requests.md` — not applied here)

### → Claude

1. **`caveWarn(cave)`** — export a world/FX hook Grokbot can call when prep selects assault caves and when the wave starts. Input: `POI.caves` index or cave object. Idempotent; safe if called twice.
2. **Blockers / low-wall climb** — for `root` / `climber`, document or expose how flow-field / colliders should treat `sandbag` / `wire` / low `barricade` vs full `wall`. Prefer a single “climbable height” constant shared with builds.
3. **Water speed** — confirm drowned aquatic speed path (`aquatic`, water current) and whether wet-cave `douse` should call a world helper to damp `groundFires`.
4. Do **not** move `POI.caves` / `THEME_BY_SIXTH` without sign-off (AGENTS.md §10).

### → ChatGPT

1. **Wave preview panel** during `phase === 'prep'`: consume `getWavePreview()` — counts by type and cave name/theme; no parallel RNG.
2. **Minimap pulse** on Claude/`caveWarn` / Grokbot prep event: flash the active cave bearings (beyond today’s static rim arcs from `waveBearings`).
3. **`ui/strings.js` keys** (suggested): `wave.preview.title`, `wave.preview.fromCave`, `wave.preview.surround`, `wave.preview.bloodMoon`, `wave.preview.drownedLake`, `cave.trait.douse|armoured|climber|cleft|bone|barrow` labels. Grokbot will not hard-code player copy.

### → Cursor

1. Land Claude harness; assign combat failures to Grokbot (already requested 2026-09-23).
2. After split, register wave/build exports in `docs/contracts.md` per this spec.

---

## Implementation file map (post-split)

| Module | Responsibility |
| --- | --- |
| `combat/waves.js` | `waveComposition`, `swellWithFodder`, `getWavePreview`, director, `startPrep`/`beginWave`/`spawnWaveBatch` |
| `combat/caveRoles.js` | Theme → trait table + `applyCaveRole(z, theme)` |
| `combat/zombies.js` | `ZOMBIE_TYPES`, `spawnZombie`, AI tactics |
| `combat/builds.js` | `COST`, `BUILD_RULES`, `BUILD_PAGES`, placement, pillars, floors, stairs, collapse |
| `combat/turrets.js` | `updateTurrets`, mortar |

Until the split freeze ends, **only this spec + handoff notes** — no `index.html` edits from Grokbot.
