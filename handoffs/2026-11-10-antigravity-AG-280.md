# Antigravity — AG-280 J121: the chainsaw's effects (sparks on metal, splinters on wood, extra blood from zombies; blood on the chainsaw and on him that fades) — 2026-11-10

Changed: Addressed Jerry's playtest note J121 (`docs/jerry/2026-11-09-playtest-notes.md`: "Chainsaw effects. Sparks when hitting metal, splinters when cutting wood, and more blood from zombies. There should be blood on the chainsaw and on him that fades."):
  1. Wood Splinters & Sawdust:
     - Extended `updateDebris(dt)` to support non-uniform scaling (`d.sx, d.sy, d.sz`) on instances in `debrisInst`.
     - Implemented `spawnSplinters(x, y, z, dirX, dirZ, count)` emitting elongated sharp wood slivers (`sx: 0.22..0.34, sy: 2.2..4.0, sz: 0.22..0.34`) textured with authentic lumber palette colors (`0xd6b27e, 0xb88648, 0x8e5a32, 0xd4ad78, 0x5c3a1e`), accompanied by floating sawdust motes (`dustMat`) drifting along the cut direction.
     - In `chainsawTick()`, cutting trees or stumps emits wood splinters and sawdust along the blade heading.
     - In `chainsawTick()`, hitting wooden player structures (barricades, floors, stairs) and wooden landmark solids (cabins, sheds, timber fences) emits splinters.
  2. Metal Sparks FX:
     - Implemented `spawnSawSparks(x, y, z, dirX, dirZ, count, power)` emitting high-velocity sparks curving under ballistic gravity (gravity 8.5, drag 1.2, speed 3.2..8.4 * power) using `emberMat`.
     - In `chainsawTick()`, hitting metal player builds (wire, railing, Tier 2 steel floor/barricade) and metal world solids (wrecks, barrels, mast) emits sparks.
     - In `trainingMelee()`, hitting metal target plates with the chainsaw chain capsule (`bl`) emits directional sparks at `hit.point`.
     - In `trainingMelee()`, cutting the steel dented locker door emits sparks at the blade contact.
     - In `damageZombie()`, chainsaw bites on armored brute plates (`z.typeKey === 'brute' && z.armored`) or military zombie helmets (`militaryZone === 'helmet'`) emit metal sparks and play `AudioSys.bulletImpact('metal')`.
  3. Extra Gore & Blood from Zombies:
     - In `damageZombie()`, when `kind === 'chainsaw'`, blood droplet spray increased to 26 droplets with 1.6x velocity force, emitted at exact world contact `info.hitPoint` (from CB-251's chain bite).
     - Emits `spawnBloodMist(hitX, hitYPos, hitZ, dx, dz)` and 4 flesh chunks via `spawnFleshChunks` at the contact point.
     - Triggers heavy screen spatter overlay via `splatScreen(1.0)`.
  4. Blood on the Chainsaw and Marine That Fades:
     - Added blood state tracking: `sawBloodLevel` and `playerBloodLevel`, decaying per second by `SAW_BLOOD_FADE` (0.045/s) and `PLAYER_BLOOD_FADE` (0.035/s).
     - Created `attachChainsawBloodOverlays(gun)`: adds dual-sided blood splatter quads and nose plates onto the guide bar with `sawBloodMat` (dark crimson gore `0x5a0202`, transparent, double-sided).
     - Added `attachArmBloodOverlays(arm)` and `attachMarineBloodOverlays(m)`: installs blood spatter quads onto marine sleeves, gloves, and chest.
     - Created `updateChainsawBloodMesh(gun, blood)`: updates overlay opacity up to 0.95 and dynamically lerps guide bar and chain cutter teeth toward `BLOOD_GORE_COLOR` (0x4a0101). When blood fades to 0, original metallic and steel colors are completely restored.
     - Created `updatePlayerBloodMesh(m, vm, blood)`: smoothly drives player blood decals and keeps blood screen spatter active in first person.
     - Hooked `updateChainsawBlood(dt)` into the main frame update loop next to `updateBlood(dt)`.
     - Updated `updateBloodScreen(dt)` to sustain HUD blood spatter while `playerBloodLevel > 0` and fade out smoothly as player blood decays.
  5. Debug Hooks & Test Coverage:
     - Registered `window.TT.sawEffectsDbg` with inspection and control methods (`blood`, `setBlood`, `sparks`, `splinters`, `step`, `sawMat`, `playerMat`, `bloodScreenOpacity`).
     - Authored `tools/tests/tag280.js` with 24 assertions covering splinters, sparks, gore, armor sparks, blood overlay visibilities, and smooth decay restoration to clean baseline.

Files:
  - `index.html` (splinters, sparks, extra chainsaw gore, chainsaw and marine blood overlays, decay update loop, debug hook)
  - `tools/tests/tag280.js` (24 assertions verifying chainsaw FX, gore, sparks, splinters, and blood fading)
  - `handoffs/2026-11-10-antigravity-AG-280.md`

Tests:
  - `node crew/crew.mjs slot run antigravity AG-280 --checks "tag280 tcb251 tcb251b t77" -- node tools/tests/run-all.mjs tag280 tcb251 tcb251b t77 --jobs 1`:
    - `tag280`: 24 pass, 0 fail (33.9s)
    - `tcb251`: 30 pass, 0 fail (49.0s)
    - `tcb251b`: 8 pass, 0 fail (44.7s)
    - `t77`: 17 pass, 0 fail (55.5s)
    - Total: 79 pass, 0 fail.

Not verified:
  - Full game multi-day survival playtest (chainsaw fuel balance over long campaigns).

Requests: None.

Contract changes: none.
