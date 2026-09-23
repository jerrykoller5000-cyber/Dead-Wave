# Splitting index.html into modules — the plan

Cursor owns this. It is Phase 0 step 5 and it has **not started**: `index.html` is still one
file, and the split freeze (AGENTS.md rule 5) has **not** been called. Nobody needs to stop
working yet. This document exists so that when the freeze does start it is short, and so the
carve is reviewable rather than a 37,000-line shuffle nobody can check.

Regenerate every number here with:

```
node tools/inventory.mjs             declarations and cross-area references
node tools/inventory.mjs --sections  the file's own section banners, with line ranges
node tools/inventory.mjs --json x.json
```

## What we are cutting

The module script inside `index.html` is **36,926 lines** with **1,267 top-level
declarations**, and **766 of those names are used outside the area that declares them**. That
last number is the real size of the job: every one of them becomes an export in
`docs/contracts.md`, or gets moved so it stops crossing.

The file is banner-commented throughout, and **146 sections are 40 lines or longer**. Those
banners, not identifier names, are the unit of the move: a section is a contiguous range of
lines with one job. The thirty largest:

| line | lines | section | proposed owner |
| ---: | ---: | --- | --- |
| 35163 | 1482 | Player physics | game |
| 21685 | 1401 | Pillars | combat |
| 17288 | 1317 | Armor pool | combat |
| 10003 | 1090 | Ambient wildlife (birds / rabbits / frogs) | life |
| 14744 | 917 | Weapons (shared mats) | combat |
| 181 | 765 | Audio (Web Audio: BGM + SFX) | core (engine) / ui (cues) |
| 28319 | 761 | Dressing | combat |
| 34138 | 749 | Spitter acid | combat |
| 33390 | 748 | Zombie pathfinding: flow fields | combat |
| 31313 | 732 | Spread | combat |
| 32672 | 718 | Knockdown | combat |
| 5369 | 682 | POI construction | world |
| 6704 | 643 | Cave mouths | world |
| 23405 | 614 | Seeing the marine under a roof | core (colliders/vis) |
| 25130 | 579 | Type gear | combat |
| 3369 | 485 | Points of interest | world |
| 24019 | 465 | Mortar | combat |
| 27891 | 428 | Remains | combat |
| 21146 | 417 | Tiered materials | combat |
| 29892 | 416 | Shot line-of-sight | combat |
| 13409 | 397 | Rocks | world |
| 9252 | 389 | Foliage chunks | world |
| 14371 | 373 | Merged canopies | world |
| 29086 | 369 | Radial wheels (weapons, builds) | ui |
| 19361 | 362 | Upgrades | combat |
| 9641 | 362 | Bees & butterflies | life |
| 7444 | 351 | Turf over the lip | world |
| 15688 | 349 | Beveled box geometry | core |
| 4809 | 345 | The water surface | world |
| 30308 | 340 | Weapon hold | combat |

## The seams, in order of how much they hurt

These are the names most used from outside their own area. Each is either an export in the
contracts or a sign the boundary is in the wrong place.

| name | declared in | outside uses |
| --- | --- | ---: |
| `player` | game | 414 |
| `AudioSys` | core | 295 |
| `sampleHeight` | world | 198 |
| `scene` | core | 194 |
| `recoilKick` | combat | 174 |
| `POI` | world | 119 |
| `rmesh` / `rbox` | core | 121 / 87 |
| `gameStarted` / `gameOver` / `won` | game | 95 / 75 / 75 |
| `camera` | core | 88 |
| `smoothstep01` | core | 76 |

Three of those set the shape of the whole split:

1. **`player` (414 uses).** Almost everything reaches into the player object. It cannot be an
   import from `game/*` into `combat/*` without making `combat` depend on `game` everywhere. It
   belongs in `core/` as the one shared entity, with `game/*` owning the rules about it.
2. **`scene`, `camera`, `renderer`, `AudioSys`, `rmesh`, `rbox`, `mergeParts`, `smoothstep01`.**
   The engine surface. These go in `core/` and everyone imports them. Getting this list right
   first makes the rest of the carve mechanical.
3. **`sampleHeight` and `POI` (317 uses between them).** The world's read-only query surface.
   Everything asks the ground how high it is and where things are. `world/terrain.js` exports
   them; nothing outside `world/*` may write them.

## Order of the carve

Each step is a commit, each keeps the game running from the folder, and each ends with
`npm test` plus the affected `tools/shoot.mjs` views.

1. `core/math.js` — `mulberry32`, noise, `smoothstep01`, `smoothBand`, `distPointToSeg`, axes.
   No dependencies, ~40 names, proves the pattern end to end.
2. `core/geometry.js` — `rbox`, `rmesh`, `mergeParts`, `addCast`, `boxProjectUV`, the beveled
   box kit.
3. `core/audio.js` — the Web Audio engine. The music *director* (pools, cueing) goes to
   `ui/audio-cues.js`, which is ChatGPT's; the synthesis and buses stay in core.
4. `core/boot.js` + `core/loader.js` — renderer, scene, camera, the frame loop, `loadMark`, the
   shot hook, the error card. This is where the background-tab loader fix lands (item 2).
5. `world/*` — terrain, water, caves, flora, POIs, sky and weather. Claude's, and the biggest
   single area; it is also the one with the cleanest boundary (`sampleHeight`, `POI`).
6. `life/*` — wildlife. Small and nearly self-contained already.
7. `combat/*` — zombies, waves, weapons, builds, the scripted deaths. Largest by declarations.
   Grokbot then gets fast loops.
8. `ui/*` and `game/*` — HUD, menus, shop, wheels, strings; then session, economy, objectives.

## Done means

- The 25 `tools/shoot.mjs` views match the pre-split baseline in
  `Claude outputs/shots/pre-split/`, checked with

  ```
  node tools/shoot.mjs --out "Claude outputs/shots/post-split"
  node tools/shoot.mjs --compare "Claude outputs/shots/pre-split" "Claude outputs/shots/post-split"
  ```

  Not by hash: the world animates, so two runs of the *same* build differ. Measured on this
  build, the noise floor is **0.34-0.54% mean pixel difference** (the busier the canopy and
  wildlife in frame, the higher). Treat under 1% as unchanged, 1-3% as worth looking at, and
  over 3% as a regression to explain.
- `npm test` gives the same counts as before the split: 215 pass, 58 fail, 9 cannot run.
- A day-1 play-through by hand: insertion, bank skulls at the window, buy from the kiosk,
  build, survive a wave, die and read the death screen.
- Load time no worse than the numbers in `handoffs/2026-09-23-cursor-load-time.md`.
- Every crossing name listed in `docs/contracts.md` with its owner.

## Risks worth naming

- **The declaration order matters.** The script runs top to bottom with `await`s in the middle
  (`loadMark` yields between stages). Moving code into modules changes evaluation order unless
  the boot sequence is kept explicit. `core/boot.js` has to call the stages in the same order.
- **`window.TT`** is one 365-key object assembled in the frame loop. After the split each area
  contributes its own slice, or the tests and both tools break — they are all written against
  it.
- **Four agents, one freeze.** The carve is worth doing in one sitting, not spread over days.
