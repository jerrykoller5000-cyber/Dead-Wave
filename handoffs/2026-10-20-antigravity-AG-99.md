# antigravity — AG-99 The last two missions' look on Jerry's GPU — 2026-10-20
Changed:          Ran `t264` (`22/22 pass`) and `t267` (`24/24 pass`) through the slot on both headless and real WebGPU (verifying `GB-199` gun-hide while carrying the can and gun-restore on drop), captured 19 real-GPU shots across every step of `~ site hikers` and `~ site fuel` in `qa/2026-10-20-AG-99/`, and measured `59.7 fps` mean (`59.5 fps` 1% low) while carrying the leaking fuel can.
Files:            qa/2026-10-20-AG-99/run-ag99.mjs, qa/2026-10-20-AG-99/ag99-summary.json, qa/2026-10-20-AG-99/01-hikers-hanging-overview.png, qa/2026-10-20-AG-99/02-hikers-hanging-closeup.png, qa/2026-10-20-AG-99/03-hikers-cut-falling-fray.png, qa/2026-10-20-AG-99/04-hikers-floating-river.png, qa/2026-10-20-AG-99/04b-hikers-floating-closeup.png, qa/2026-10-20-AG-99/05-hikers-in-reach-prompt.png, qa/2026-10-20-AG-99/06-hikers-grabbed-claimed.png, qa/2026-10-20-AG-99/07-hikers-dry-ground.png, qa/2026-10-20-AG-99/08-fuel-at-pump.png, qa/2026-10-20-AG-99/08b-fuel-pump-closeup.png, qa/2026-10-20-AG-99/09-fuel-filling-hold-e.png, qa/2026-10-20-AG-99/10-fuel-carried-overview.png, qa/2026-10-20-AG-99/10b-fuel-carried-closeup.png, qa/2026-10-20-AG-99/11-fuel-put-down-and-drip-trail.png, qa/2026-10-20-AG-99/11b-fuel-drip-trail-closeup.png, qa/2026-10-20-AG-99/12-fuel-fire-sets-it-off.png, qa/2026-10-20-AG-99/13-fuel-at-hq-generator.png, qa/2026-10-20-AG-99/13b-fuel-hq-generator-closeup.png, qa/2026-10-20-AG-99/14-fuel-poured-complete.png
Tests:            `node tools/tests/run-all.mjs t264 t267 --agent antigravity --task AG-99 --all-fails` → 2 checks: 46 pass, 0 fail (`t264` 22/22 in 51.6s, `t267` 24/24 in 77.3s); also verified 46/46 pass on real WebGPU (`index.html?debug=1&raf=timer`); new tests: none
Screenshots:      qa/2026-10-20-AG-99/01-hikers-hanging-overview.png, qa/2026-10-20-AG-99/02-hikers-hanging-closeup.png, qa/2026-10-20-AG-99/03-hikers-cut-falling-fray.png, qa/2026-10-20-AG-99/04-hikers-floating-river.png, qa/2026-10-20-AG-99/05-hikers-in-reach-prompt.png, qa/2026-10-20-AG-99/06-hikers-grabbed-claimed.png, qa/2026-10-20-AG-99/07-hikers-dry-ground.png, qa/2026-10-20-AG-99/08-fuel-at-pump.png, qa/2026-10-20-AG-99/09-fuel-filling-hold-e.png, qa/2026-10-20-AG-99/10-fuel-carried-overview.png, qa/2026-10-20-AG-99/11-fuel-put-down-and-drip-trail.png, qa/2026-10-20-AG-99/12-fuel-fire-sets-it-off.png, qa/2026-10-20-AG-99/13-fuel-at-hq-generator.png, qa/2026-10-20-AG-99/14-fuel-poured-complete.png
Not verified:     None
Requests:         FYI to grokbot (hikers tree-crown occlusion of hanging pouch, stiff 0.63m vertical `ropeB` stub on floating/ground bag, diagonal trunk rope staying visible after claim; fuel depot red barrel perched on back-right shed roof corner, slight outboard offset of carried jerrycan); FYI to chatgpt (`ui/prep-checklist.js:116` `e.target instanceof Node` guard)
Contract changes: none

## Rule 16 (Game-test slot)
All runs were executed exclusively through the machine-wide game-test slot (`node tools/tests/run-all.mjs t264 t267 --agent antigravity --task AG-99 --all-fails` and `node crew/crew.mjs slot run antigravity AG-99 --checks "AG-99 real GPU visual shots and FPS of site hikers and site fuel" -- node qa/2026-10-20-AG-99/run-ag99.mjs`) with one instance at a time (`--jobs 1`).

## Summary of Findings (`qa/2026-10-20-AG-99/ag99-summary.json`)

### 1. Test Runs (`t264` & `t267`)
- **Slot `run-all.mjs`**:
  - `check-players: 303 player.position reads, all in the allowed places`
  - `ok    t264    22 pass   0 fail  51.6s`
  - `ok    t267    24 pass   0 fail  77.3s`
  - `2 checks: 46 pass, 0 fail`
- **Real WebGPU (`index.html?debug=1&raf=timer`)**:
  - `t264`: `22 pass, 0 fail`
  - `t267`: `24 pass, 0 fail`, including real-renderer-only pose checks:
    - `PASS GB-199: his gun is put away while he carries the can`
    - `PASS GB-199: down, the gun is back in his hand`

### 2. FPS While Carrying the Can (`~ site fuel`)
- Measured across `210` frames (`3.5 s`) while walking from the pump toward HQ carrying the fuel can and spawning 9 glossy fuel drip puddles (`1920x1080`, WebGPU on NVIDIA GeForce RTX 5080):
  - **Mean FPS**: **`59.7 fps`** (`16.75 ms/frame`)
  - **1% Low FPS**: **`59.5 fps`**
  - **Min / Max FPS**: `58.9` / `60.5 fps`
  - **Draws / Triangles**: `302` (`741k` tris) at start of walk → `373` (`809k` tris) with drip puddles
  - **Carry state**: `moveSlow: 0.62`, `fireBlocked: true`, `gunShownWhileCarrying: false`.

### 3. `~ site hikers` (`GB-196` / `GB-199`) Visual Review
- **Props & grounding**:
  - The canvas medical pouch (`GB-199`) has a detailed flap, strap, buckle, and medical cross badge (not a placeholder box).
  - On dry ground (`07-hikers-dry-ground.png`), the dropped bag rests cleanly on the bank (`bag.y = -0.419`, `groundY = -0.659`, `+0.24 m`).
  - In the river (`04-hikers-floating-river.png`, `05-hikers-in-reach-prompt.png`), it splashes and floats down the current right at water level (`bag.y = -2.712`, `water.level = -2.662`, `-0.05 m`), shows `[E] GRAB THE KIT` within 2m, and awards `+1 MedPen` + Pike's field note (`06-hikers-grabbed-claimed.png`).
- **Visual polish notes (sent to `grokbot`)**:
  1. **Canopy occlusion of hanging pouch (`01-hikers-hanging-overview.png`)**: The hang point (`y = 4.81`, `5.32 m` above ground) and upper rope segment (`rope[1]`, `y = 5.11..5.79`) sit inside the dense opaque orange spherical foliage blobs of the broadleaf tree. From the normal overhead camera, the player sees the lower half of the diagonal tie-off rope (`rope[0]`) going into the lower foliage, while the hanging pouch itself is completely inside the tree crown until cut.
  2. **Stiff vertical `ropeB` stub (`0.63 m`) on dropped/floating bag (`04-hikers-floating-river.png`, `05-hikers-in-reach-prompt.png`)**: After cutting the rope, the lower rope piece (`ropeB` + `stub`) stays as a rigid vertical rod sticking straight up ~0.6m above the bag while it floats down the river or rests on the bank.
  3. **Diagonal trunk rope (`rope[0]`) remains after claim (`06-hikers-grabbed-claimed.png`)**: After cutting and claiming the kit, the taut diagonal line from `y = 1.11` on the trunk up into the canopy (`y = 5.79`) remains visible.

### 4. `~ site fuel` (`GB-197` / `GB-199`) Visual Review
- **Props & grounding**:
  - The depot shed, vintage red pump with white globe (`08-fuel-at-pump.png`), olive jerrycan, spill pallet with drums, and red/yellow framed HQ generator (`13-fuel-at-hq-generator.png`) read cleanly and sit grounded (`pumpGroundY = -2.990`, `genGroundY = -3.169`).
  - Holding `E` shows `FILLING...` (`09-fuel-filling-hold-e.png`), hides the marine's pistol (`gunShown: false`), and attaches the olive jerrycan (`10-fuel-carried-overview.png`).
  - Walking leaves dark glossy fuel puddle discs with a rainbow sheen ring (`11-fuel-put-down-and-drip-trail.png`), `E` puts the can down upright on the ground (`canMinusGroundY = +0.23m`) and restores the pistol, fire sets off the fuel chain (`THE FUEL WENT UP / Another can at the pump`, `12-fuel-fire-sets-it-off.png`), and `E` at the HQ generator pours the fuel (`14-fuel-poured-complete.png`).
- **Visual polish notes (sent to `grokbot` & `chatgpt`)**:
  1. **Floating barrel on back-right corner of shed roof (`08-fuel-at-pump.png`, `09-fuel-filling-hold-e.png`)**: A red-and-yellow 55-gallon drum is perched/floating above the back-right corner of the corrugated shed roof at the fuel depot.
  2. **Slight outboard offset on carried jerrycan (`10-fuel-carried-overview.png`, `13-fuel-at-hq-generator.png`)**: From the overhead camera, the carried olive jerrycan sits ~0.15–0.2m outboard to the left of the marine's left hand/hip.
  3. **`ui/prep-checklist.js:116` (`chatgpt`)**: Dispatching a `keydown` event on `window` throws `TypeError: Failed to execute 'contains' on 'Node': parameter 1 is not of type 'Node'` because `e.target` is `window`; needs an `e.target instanceof Node` check.
