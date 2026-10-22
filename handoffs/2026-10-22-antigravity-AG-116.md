# antigravity — AG-116 The full suite before Jerry's playthrough — 2026-10-22
Changed:          Ran the full test suite through the game-test slot (`--jobs 1`) in chunks (`0a`, `0b`, `A`, `B`, `C`, `D`, `E`, `F` on the test page: 264 checks, 4,089 pass, 2 held red checks `t74` and `t80`; plus `R` + `t272` on the real renderer via `tools/realtest.mjs`: 21 checks, 740 pass, 7 held red checks `t187, t188, t189, t195, t224, t228, t229`), reran every red once, converted four wall-clock-timed checks (`t75`, `t206`, `t207`, `t254`) from `Date.now()` / fixed `wait(ms)` to `T.getSimTime()` / frame `until`, and queued the held reds to their owners.
Files:            qa/2026-10-22-AG-116/*, tools/tests/t75.js, tools/tests/t206.js, tools/tests/t207.js, tools/tests/t254.js, handoffs/2026-10-22-antigravity-AG-116.md
Tests:            Test page (`tools/tests/run-all.mjs`, 264 checks across chunks `0a..F` + `t272`) → 4,089 pass, 9 initial fail assertions across 7 checks (`t74, t75, t76, t80, t206, t207, t248, t254`), 2 held red checks after rerun and game-time fixes (`t74`: 1 fail, `t80`: 2 fails on rerun); Real renderer (`tools/realtest.mjs`, 21 checks in `R` + `t272`) → 740 pass, 44 initial fail assertions across 9 checks (`t187, t188, t189, t195, t222, t224, t228, t229, t262`), 7 held red checks on rerun (`t187, t188, t189, t195, t224, t228, t229`: 42 fail assertions; `t222`, `t262`, and `t272` green)
Screenshots:      none (test-suite verification task; all raw chunk and rerun logs/JSONs saved in `qa/2026-10-22-AG-116/`)
Not verified:     Nothing — all 264 test-page checks and 21 real-renderer checks were executed through the machine-wide game-test slot with `--jobs 1`.
Requests:         request to `grokbot` ("AG-116 full suite: held reds in t74, t80 (test page) and t187, t188, t189, t195, t224, t228, t229 (real renderer)"); FYI to `cursor` ("AG-116 FYI: t248 terrain-slope edge case (passed on rerun)"); FYI to `claude` ("AG-116 done: full test suite (test page + real renderer) + 4 wall-clock test fixes")
Contract changes: none

---

## 1. Per-Chunk Summary (`qa/2026-10-22-AG-116/`)

All runs were executed strictly one browser instance at a time (`--jobs 1`) through the machine-wide game-test slot (Rule 16).

| Chunk | Range | Checks | Initial Summary Line | Initial Reds | Rerun / Fix Outcome | Held Reds |
| --- | --- | ---: | --- | --- | --- | --- |
| **`0a`** | `t0..t33` (incl. `t6a`) | 35 | `35 checks: 342 pass, 0 fail, 8 reported no assertions` | *(none)* | — | **0** |
| **`0b`** | `tfish, t34..t67` | 35 | `35 checks: 632 pass, 0 fail` | *(none)* | — | **0** |
| **`A`** | `t68..t99` | 32 | `32 checks: 437 pass, 4 fail` | `t74, t75, t76, t80` | `t75, t76` passed on rerun (`t75` also converted to `T.getSimTime()`) | **`t74`, `t80`** |
| **`B`** | `t100..t131` | 31 | `31 checks: 385 pass, 0 fail` | *(none)* | — | **0** |
| **`C`** | `t132..t163` | 32 | `32 checks: 465 pass, 0 fail` | *(none)* | — | **0** |
| **`D`** | `t164..t195` | 32 | `32 checks: 748 pass, 0 fail` | *(none)* | — | **0** |
| **`E`** | `t196..t229` | 34 | `34 checks: 642 pass, 2 fail` | `t206, t207` | `t207` passed on rerun; `t206` & `t207` converted to game time (`T.getSimTime()` / frame `until`) and verified `0 fail` | **0** |
| **`F`** | `tinspect, t240..t271` | 32 | `32 checks: 438 pass, 3 fail, 1 reported no assertions` | `t248, t254` | Both passed on rerun (`t254` also converted to `T.getSimTime()`) | **0** |
| **`t272`** (page) | `t272` (`CL-241`) | 1 | `1 checks: 0 pass, 0 fail, 1 reported no assertions` | *(none — `SKIP no SkinnedMesh`)* | — | **0** |
| **Test Page Total** | **All 264 checks** | **264** | **4,089 pass, 9 initial fail** | **8 checks** | **6 cleared (`t75, t76, t206, t207, t248, t254`)** | **2 (`t74`, `t80`)** |
| **`R`** (realtest) | `t12..t271` (20 checks) | 20 | `20 checks: 726 pass, 44 fail (real renderer)` | `t187, t188, t189, t195, t222, t224, t228, t229, t262` | `t222` (30/30) and `t262` (11/11) passed on rerun | **`t187, t188, t189, t195, t224, t228, t229`** |
| **`t272`** (realtest) | `t272` (`CL-241`) | 1 | `1 checks: 14 pass, 0 fail (real renderer)` | *(none)* | — | **0** |
| **Realtest Total** | **All 21 checks** | **21** | **740 pass, 44 initial fail** | **9 checks** | **2 cleared (`t222, t262`)** | **7 (`t187, t188, t189, t195, t224, t228, t229`)** |

---

## 2. Wall-Clock Timing Fixes Applied (`tools/tests/`)

Per instructions ("If it's a test that times things on the wall clock rather than game time, fix it yourself"):

1. **[`tools/tests/t206.js`](file:///c:/Users/Zero/Desktop/Tiny%20Trek/tools/tests/t206.js#L34-L54) (`// t206 - GB-140: a grenade off a wall comes back with a thunk`):**
   - **Cause:** Held red on Chunk E rerun (`FAIL the grenade bounces back toward the thrower, not through the wall (bounced=false)`). The bounce watch loop polled `while (Date.now() - c0 < 4000)`, which under headless single-worker load could advance less than 0.6 s of game simulation time before the 4 s wall-clock timeout expired.
   - **Fix:** Replaced the wall-clock `4000 ms` loop and `400 ms` key-hold with `T.getSimTime()` (`4.0 s` and `0.4 s` of simulation time, with a 25 s wall-clock safety cap).
   - **Verification:** `ok   t206    19 pass   0 fail  17.5s`

2. **[`tools/tests/t75.js`](file:///c:/Users/Zero/Desktop/Tiny%20Trek/tools/tests/t75.js#L65-L75) (`// t75 - GB-45 (D-36): five zombies in contact take turns on the ring`):**
   - **Cause:** Failed on initial Chunk A (`FAIL five in contact spread round the ring rather than stacking on one bearing (closest pair 0.00 rad, 4 bearings >= 0.45 rad apart)`) because the 3.5 s ring-settle loop ran on `while (Date.now() - t1 < 3500)`.
   - **Fix:** Replaced `Date.now() - t1 < 3500` with `T.getSimTime() - s1 < 3.5` (with a 25 s wall-clock safety cap).
   - **Verification:** `ok   t75     16 pass   0 fail  22.7s`

3. **[`tools/tests/t207.js`](file:///c:/Users/Zero/Desktop/Tiny%20Trek/tools/tests/t207.js#L49-L56) (`// t207 - CL-138: the CIF camera zooms in and out with the wheel and the +/- keys`):**
   - **Cause:** Failed on initial Chunk E (`FAIL the - button pulls the camera back out (5.60 vs 5.60)`) because `await wait(900)` after clicking `#cifZoomOut` / `#cifZoomIn` waited 900 ms of wall-clock time without guaranteeing enough rendered CIF frames for the smooth zoom spring (`camZoomSpan`) to settle.
   - **Fix:** Waited for CIF render frames via `await until(() => D().frame >= zf0 + 30, 6000)` before sampling `D().span`.
   - **Verification:** `ok   t207    20 pass   0 fail  13.8s`

4. **[`tools/tests/t254.js`](file:///c:/Users/Zero/Desktop/Tiny%20Trek/tools/tests/t254.js#L32-L34) (`// t254 - CU-120: closing the CIF leaves the marine in his idle stance`):**
   - **Cause:** Failed on initial Chunk F (`FAIL idle has taken over after closing the CIF (idleWeight 0)` and `FAIL left knee bends with the idle breathing (0.0000 rad range)`) because `await wait(300)` after `closeCIF()` was wall-clock time rather than 1.9 s of game simulation time (`T.getSimTime()`).
   - **Fix:** Waited for `T.getSimTime() - s0 >= 1.9` after `closeCIF()` before sampling `idleWeight` and the knee breathing cycle.
   - **Verification:** `ok   t254     8 pass   0 fail  20.1s`

---

## 3. Held Reds & Their Owners

### A. Test Page (`tools/tests/run-all.mjs`) — 2 Held Reds

1. **`t74`** — **Owner: Grokbot** (`// t74 - GB-43 (D-32)`, POI guards waking and coming for the marine):
   - Initial (`17 pass, 1 fail, 42.1s`):
     - `FAIL and come for him (10.7 -> 11.2 m)`
   - Rerun (`17 pass, 1 fail, 37.8s`):
     - `FAIL and come for him (12.9 -> 14.4 m)`

2. **`t80`** — **Owner: Grokbot** (`// t80 - GB-56`, spider steering around the HQ house):
   - Initial (`13 pass, 1 fail, 40.3s`):
     - `FAIL a spider on a line that grazes the corner takes one with room (start 0.29 m clear, end 0.10 m; tight 14% of the time after 3 s; closest 6.0 m)`
   - Rerun (`12 pass, 2 fail, 38.2s`):
     - `FAIL it comes round until the house is out of the line (clear after 5.7 s, in the line 55% of the time after; still behind the house)`
     - `FAIL a spider on a line that grazes the corner takes one with room (start 0.29 m clear, end 0.00 m; tight 37% of the time after 3 s; closest 6.0 m)`

*(Note on `t248` (`// t248 - CU-116`, Cursor): failed 1 assertion on initial Chunk F (`FAIL the raised turret, with a clear line, does hit (hp 28/28)`) and passed `12 pass, 0 fail` on the Chunk F rerun. Because the raised turret is at `(hx, gz)` with muzzle height ~2.9 m at `z = +0.75 m`, the wall is at `(hx, gz+2)` (`z = +4.0 m`, height `2.0 m`), and `z2` is at `(hx, gz+4)` (`z = +8.0 m`, torso height `0.80 m`), the sight line crosses `z = 4.0 m` at `y = 1.96 m` above flat ground, so ~4 cm of terrain slope between `(hx, gz)` and `(hx, gz+4)` can cause `block` to intercept `turretSees(gun, z2)`. Sent an FYI to `cursor`.)*

### B. Real Renderer (`tools/realtest.mjs`) — 7 Held Reds (42 FAIL assertions)

1. **`t187`** (`97 pass, 2 fail`, held on rerun) — **Owner: Grokbot** (`// t187 - GB-129`, zoomed aim alignment):
   - `FAIL shotgun: zoomed, on the aim (2.26 deg)`
   - `FAIL launcher: zoomed, on the aim (3.05 deg)`

2. **`t188`** (`119 pass, 2 fail`, held on rerun) — **Owner: Grokbot** (`// t188 - GB-130`, weapon hand anchors):
   - `FAIL chainsaw: firing hand on the grip anchor (0.203)`
   - `FAIL chainsaw: support hand on its anchor (0.354)`

3. **`t189`** (`35 pass, 12 fail`, held on rerun) — **Owner: Grokbot** (`// t189 - GB-130`, stowed gun `CARRY_FIT` gaps/clipping after `GB-200`):
   - `FAIL m4@sling+: snug, gap 0.000 m, clipping 0.044 m`
   - `FAIL aa12@sling+: snug, gap 0.038 m, clipping 0.000 m`
   - `FAIL shotgun@sling-: snug, gap 0.000 m, clipping 0.039 m`
   - `FAIL launcher@sling-: snug, gap 0.000 m, clipping 0.021 m`
   - `FAIL flamer@sling+: snug, gap 0.035 m, clipping 0.000 m`
   - `FAIL chainsaw@sling-: snug, gap 0.062 m, clipping 0.000 m`
   - `FAIL ak@sling+: snug, gap 0.026 m, clipping 0.000 m`
   - `FAIL m4@sling-: snug, gap 0.046 m, clipping 0.000 m`
   - `FAIL shotgun@sling+: snug, gap 0.000 m, clipping 0.038 m`
   - `FAIL aa12@sling-: snug, gap 0.067 m, clipping 0.000 m`
   - `FAIL chainsaw@sling+: snug, gap 0.015 m, clipping 0.000 m`
   - `FAIL flamer@sling-: snug, gap 0.023 m, clipping 0.000 m`

4. **`t195`** (`17 pass, 3 fail`, held on rerun) — **Owner: Grokbot / Claude** (`// t195 - CL-122 (GB-130, GP-128)`, wrist/hand roll on grip):
   - `FAIL m4: the gun hand rolled onto the grip (176 -> 180 deg)`
   - `FAIL pistol: the gun hand rolled onto the grip (180 -> 180 deg)`
   - `FAIL pistol: the support hand rolled onto the gun (180 -> 180 deg)`

5. **`t224`** (`35 pass, 10 fail`, held on rerun) — **Owner: Grokbot / Claude** (`// t224 - GB-148 / CL-160`, stowed sidearm pack fit after `GB-200` + wheelTick sweep):
   - `FAIL m4 + pistol: pistol snug on the pack, air 0.056 m, in 0.000 m`
   - `FAIL ak + revolver: revolver snug on the pack, air 0.055 m, in 0.000 m`
   - `FAIL pistol + revolver: revolver snug on the pack, air 0.055 m, in 0.000 m`
   - `FAIL revolver + pistol: pistol snug on the pack, air 0.056 m, in 0.000 m`
   - `FAIL shotgun + pistol + ak: pistol snug on the pack, air 0.056 m, in 0.000 m`
   - `FAIL pistol + m4 + revolver: revolver snug on the pack, air 0.055 m, in 0.000 m`
   - `FAIL launcher + revolver + aa12: revolver snug on the pack, air 0.055 m, in 0.000 m`
   - `FAIL akimbo + pistol: pistol snug on the pack, air 0.081 m, in 0.000 m`
   - `FAIL pistol + akimbo: akimbo snug on the pack, air 0.026 m, in 0.000 m`
   - `FAIL a fast sweep: 0 ticks in 821 ms of audio clock (at most one per 50 ms)`

6. **`t228`** (`88 pass, 7 fail`, held on rerun) — **Owner: Grokbot / Cursor** (`// t228 - CU-100 / GB-191`, support fist foregrip alignment & chainsaw hands):
   - `FAIL launcher standing: the support fist along its foregrip (180 deg)`
   - `FAIL launcher walking: the support fist along its foregrip (180 deg)`
   - `FAIL flamer standing: the support fist along its foregrip (180 deg)`
   - `FAIL flamer walking: the support fist along its foregrip (180 deg)`
   - `FAIL chainsaw standing: the firing hand closes on the grip (16.4 cm)`
   - `FAIL chainsaw standing: the support hand on its anchor (1.6 cm)`
   - `FAIL chainsaw walking: the support hand on its anchor (1.6 cm)`

7. **`t229`** (`69 pass, 6 fail`, held on rerun) — **Owner: Grokbot** (`// t229 - GB-151`, pistol/revolver/akimbo grip & wrist stability):
   - `FAIL pistol: no pop leaving or rejoining the grip (1.55 m/s at most)`
   - `FAIL revolver: support fist on the support side round the firing fingers (-0.045,-0.023,0.021, 0.055 m from the firing fist)`
   - `FAIL revolver aiming up: support fist on the support side round the firing fingers (-0.045,-0.023,0.021, 0.055 m from the firing fist)`
   - `FAIL revolver aiming down: support fist on the support side round the firing fingers (-0.045,-0.023,0.020, 0.054 m from the firing fist)`
   - `FAIL revolver: no pop leaving or rejoining the grip (1.52 m/s at most)`
   - `FAIL akimbo: wrists firm, guns in line with the forearms (1.30, 1.30 rad)`
