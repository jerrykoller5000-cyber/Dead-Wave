# AG-310b Exact Root-Cause & Fix Plan (Prepared 2026-11-11)

All remaining `> 50 ms` actions in `review/AG-310/ag310-after.json` trace to three exact causes (verified against `diag.renders`, `syncMs`, `game/viewmodel.js`, `world/bake.js`, and `index.html`):

1. **`armoryPics.r` (`400x200`) Cold Pipelines in Shared Dawn WebGPU GPU Process (`buy` & `mod` stalls: `launcher` 433.4 ms, `revolver` 133–150 ms, `sniper` 66–83 ms, `shotgun` 66.7 ms, `m4`/`chainsaw` 50.1–66.9 ms)**
   - `warmArmoryPics()` only warmed `carryGunCopy('pistol')` + an indexed `BoxGeometry` with `m81`.
   - Fix: In `warmArmoryPics()` behind Training blackout, stage `carryGunCopy(wk)` for all 12 `WEAPON_ORDER` weapons (`frustumCulled = false`), folded `makeOptic('rmr')`/`prism`/`acog`, and non-indexed `BoxGeometry.toNonIndexed()` meshes for `m81` paint + `MOD_LOOK_MAT` + `MOD_LOOK_RING` in one `400x200` render + `onSubmittedWorkDone()`. Reuse one `400x200` 2D snapshot canvas on serialized `armoryPics.queue`.

2. **`syncGunModLooks()` + `dressGuns()` Sync CPU & Material Version Invalidation (`pistol` mod 166.6–183.2 ms [`syncMs` 81–98.2 ms], `pistol` close 83.2–100.0 ms)**
   - First `fitArmoryMod` runs `syncGunModLooks()` twice across all 24 weapon/offhand meshes (`gunExtLook` + `gunHeavyLook` + `registerGunFurniture`) AND `dressGuns(wardrobeState)` sets `mat.needsUpdate = true` unconditionally across all 12 guns (`mat.version++`).
   - Also in `1P`, `viewmodel.js` (`|vm281`, `setupModelViewProjection = vmMVP`, `fog: false`) had no static non-indexed mesh warmed with `map != null`.
   - Fix:
     - `dressGuns(state, onlyKind = null)`: set `mat.needsUpdate = true` ONLY when `!!mat.map !== !!nextMap || !!mat.emissiveMap !== !!nextEmissiveMap`.
     - `syncGunModLooks(onlyW = null)`: scope to `onlyW` when passed (`fitWeaponMod(w)` / `fitArmoryMod(w)`), avoid duplicate call on `ext`/`heavy`, only call `registerGunFurniture` when new `tubeExt`/`heavyLook`/`fittedOptic` is added, and pre-run `syncGunModLooks()` once inside `trainingWarmCompile()` behind blackout (never on cold title load so `t38` cold mesh count stays untouched at 274).
     - In `trainingWarmCompile()`, temporarily paint one non-held gun (`uzi`) with `m81` before `viewmodel.prepareWarmup()` + `compileForLiveTarget()` and restore in `finally`, warming both `1P` `|vm281` painted and `3P` `castShadow:true, receiveShadow:false` non-indexed painted pipelines.

3. **Cold `3P` `carryRig` & Non-Indexed `rackGunCopy` Pipelines + Rack Geometry Cloning on `close` (`shotgun` close 133.3 ms, `revolver` close 133.3 ms, `sniper` close 100–116.7 ms, `m4` close 66.7 ms, `minigun`/`uzi` close 50.0–50.1 ms)**
   - In `3P`, `applyCarryPlan` first shows `rig.shells`, `rig.bandolier`, `fitWeaponSling` (`shotgun`) and `fitCarryHolster`, `h.shell`, `rig.harness` (`revolver`), plus `rounds40`/`belt40`/`boxes`/`tanks`.
   - On `training.copies.rack`, `rackGunCopy` uses non-indexed geometry (`g.index === null`) with `castShadow: false, receiveShadow: false` (`position+normal+uv` for `glassMat`/painted/artwork, `position+normal+uv+color+foldRM` for gun `foldStatic`, and `position+normal+color+foldRM` for folded `RACK_PEG`s), whereas `paintWarmGeo` in AG-310 used indexed `BoxGeometry`.
   - `_rkCache` also cloned `p.geo.clone()` and re-ran `Box3.setFromObject(g)` for every shelf gun on every close (`syncMs` growing to 31–36 ms at 11 guns).
   - Fix:
     - Share `_rkShared` `BufferGeometry` + cache `Box3` bounds on `_rkCache` (`close` `syncMs` -> `< 4 ms`).
     - Warm `carryRig` (`shotgun`/`launcher`/`revolver`/`uzi` + instanced pouches/shells/rounds40/boxes/tanks, restored in `finally`), `carriedMortarMesh`/`carriedM240Mesh`, folded `rmr`/`prism`/`acog`, and non-indexed rack keepers in `trainingWarmCompile()`.
