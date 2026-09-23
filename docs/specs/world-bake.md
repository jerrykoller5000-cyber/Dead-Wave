# Spec: baking the world (Phase 1, step 2)

Owner: Claude. Status: draft, 2026-09-23. It is applied after Cursor's split lands.

## Goal

The title screen should come up within budget: 15 s cold and 5 s warm on Jerry's PC
(AGENTS.md rule 12). The world should come out bit-for-bit the same whether it was baked
or generated.

## Where the load time goes today

Measured on the headless harness with the stand-in three.js (so no GPU time), using the
file at mtime 1790158567972. A CPU profile of one load showed 22.6 s from module start
to 'ready'.

| Work | Inclusive CPU | What it is |
| --- | --- | --- |
| `mergeParts` | 7.8 s | Merging part meshes into one: foliage chunks, POI meshes, trees, rocks. The time goes on per-vertex Vector3 calls (`fromBufferAttribute`, `applyMatrix4`, `normalize`) and `toNonIndexed()` copies. |
| Terrain and field generation | about 4.5 s | `terrainRaw`, `terrainBase`, `fbm`, `ridged`, `buildHeightField`, `buildGroundGeometry`, `terrainColorAt`, `riverProject`, `carveRiver`, `waterLevelAt` |
| Placement searches | about 1.5 s | `planCaves`, `fits`, `distToPath`, `scatter*` |
| `warmEffectPools` | 2.3 s | Effect pools. Grokbot's area, not the world. |
| Zombie, marine and gun meshes | about 3.5 s | Not the world. |

The world props come to 3,315 meshes and about 3.8 M vertices, of which 1.2 M go through
4,619 `mergeParts` calls.

Two conclusions follow:

- **Baking the merged vertex buffers is out.** That would be about 135 MB raw.
- **The bake stores fields and placements**, and meshes are still built from them. The
  biggest single saving is not the bake at all. It is making `mergeParts` cheap, so that
  comes first.

## Step 2a: fast `mergeParts`

The patch is ready: `handoffs/claude-phase1-loader/merge.diff`, or the same change as
`patch_merge.py`. The handoff note is `handoffs/2026-09-23-claude-fast-merge.md`.

- Plain Float32 attributes are read straight from their arrays, and indexed geometry is
  read through its index instead of `toNonIndexed()`.
- The arithmetic is the same as `Vector3.applyMatrix4`, `applyMatrix3` and `normalize`,
  in the same order.
- Anything unusual (interleaved, normalized, or not Float32) takes the old path.

Checked: every one of the 4,619 merges during a load hashes identically before and
after (position, normal and colour words). In the harness, the time from terrain to
'ready' fell from 12.0 s to 6.5 s. After this change, generation and placement are most
of what is left, and the bake removes them.

It is world code, so it is mine. It goes in as its own handoff, before the bake.

## Step 2b: the bake

### Pipeline today, in order

1. `buildHeightField`
2. `buildWaterMask`
3. `planPOIs`, which grades the bridge and dock approaches and so edits `heightField`
4. `buildGroundGeometry` (polar mesh: 260 rings × 512 segments)
5. `buildWaterSurface` and `scatterStreamPebbles`
6. `scatterRocks`
7. `scatterTrees`
8. The player, weapons and house
9. `rebuildFoliage`
10. `scatterWaterLife`
11. `buildPOIMeshes`, which runs `planCaves`, then `buildCave`, then `shapeCaveGround`.
    This edits both `heightField` and the ground mesh.
12. `reseatAllProps`
13. `bakeFoliageChunks`
14. `bakeContactShading`

The ground is shaped late, after props are placed, and then everything is re-seated.

### What the split must do for this

This is a request to Cursor; please do it as part of the split. In `world/*`, keep
**deciding** apart from **building**. Each scatter and plan step should become two parts:

- A pure function, `(fields, rng) → list of placements`. It uses no THREE objects except
  math.
- A builder, `list → meshes`.

`tools/bake-world.mjs` then imports only the deciding half, and it runs in Node with
three's math classes. There is no renderer and no DOM.

These functions are pure data today and can move as they are:

- `hash2`, `vnoise`, `fbm`, `ridged`
- `terrainBase`, `terrainRaw`, `carveRiver`
- `riverProject`, `riverBedAt`, `riverSurfAt`
- `buildHeightField`, `sampleHeight`
- `buildWaterMask`, `waterLevelAt`, `waterDepthAt`
- `lakeDist`, `distToRiver`, `distToPath`, `pathWearAt`
- `terrainColorAt`

These mix deciding with building, so I will separate them in `world/*` after the split:

- `planPOIs`
- `planCaves` (deciding) and `buildCave`/`shapeCaveGround` (shaping plus meshes)
- `scatterRocks`, `scatterTrees`, `rebuildFoliage`, `scatterWaterLife`

### `assets/world/world.bin`

All numbers are little-endian.

- Header:
  - `'DWWB'` magic
  - `u32` format version
  - `u32` header length
  - a UTF-8 JSON header:
    `{ genVersion, sections: [{ name, type, offset, length, shape }] }`
- Sections are aligned to 16 bytes.

| Section | Type | Size | Contents |
| --- | --- | --- | --- |
| `heightField` | f32 505×505 | 1.0 MB | Final heights, after all grading and cave shaping |
| `groundY`, `groundColor`, `groundWear` | f32 | about 2.7 MB | Final polar ground mesh: 133,121 vertices |
| `lakeMask` | u8 WM_N² | small | Lake and pond mask |
| `riverBed` | f32 601 | 2 KB | Dense river bed profile |
| `caves` | JSON | small | Per cave: position, yaw, theme, dimensions, `hillSolids`, and the cap `dh` grid (f32) |
| `props.*` | f32/u32 records | about 1 MB | One section per kind: rocks, trees, bushes, grass, ferns, flowers, mushrooms, clutter, water life, cave plants, pebbles. Each record is kind, x, y, z, yaw, scale and seed. |
| `solids` | f32 records | small | `worldSolids` added by world building: x, z, r, y0, y1 |

The expected total is about 5 MB. It is read once, locally, with `fetch`.

### Load

The game looks for `assets/world/world.bin`.

- If the file loads and its `genVersion` equals `WORLD_GEN_VERSION` in the code, the
  fields are copied in, and each deciding step is skipped: its builder gets the baked
  list instead.
- On `?regen=1`, a missing file, a failed fetch or a version mismatch, the game
  generates as today and logs one info line saying which.

### Determinism

Each of these is written down with its reason, as rule 10 asks.

- **`buildBarrel` tilt.** The random tilt on barrels uses `Math.random()`, so it
  changes every load. I will seed it from the barrel's position. It is still a random
  tilt, but the same on every load, and a baked world needs that.
- **`WORLD_GEN_VERSION`** is a constant in `world/gen`. Any change to a seed, a constant
  or placement logic bumps it and needs a rebake in the same handoff.
- **Different browsers.** Chrome (V8) and Node (V8) give identical `Math.sin` and
  `Math.exp` results, so Node bakes what Chrome would generate. Firefox and Safari may
  differ in the last bit. They load the bake, so players see the same world either way.

### Tests (`npm test`)

1. `world-bake-equal`, in Node. Generate the world data and compare it with
   `world.bin`, section by section, exactly. A failure names the section and the first
   differing index. This is also what catches a stale bake.
2. `world-bake-browser`, in the harness. Load the game with and without `?regen=1`.
   Compare `sampleHeight` on a 4 m grid, every prop's position, and the `mergeParts`
   hash sequence. They must match exactly.
3. The loader time check. Log the time to 'ready' with and without the bake, and
   record it in the handoff.

### Done when

- Both tests pass.
- The title screen is within budget on Jerry's PC (Cursor's `tools/shoot.mjs` timing, or
  Jerry's own run).
- Before-and-after shots are identical for `hq`, `river-mouth`, `lake-shore` and all
  six `cave-*-front` views.
