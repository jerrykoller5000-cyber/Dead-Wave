# antigravity — AG-117 The suite after the balance pass (D-86) — 2026-10-23
Changed:          Waited for ChatGPT's `GP-19956` `DONE` line in `crew/LOG.md`, then ran the full test suite through the game-test slot (`--jobs 1`) in chunks (`0a`, `0b`, `A`, `B`, `C`, `D`, `E`, `F` on the test page: 265 checks including `t272` & `t273`, 4,070 pass, 5 held red checks `t71, t77, t90, t155, t198`; plus `R` on the real renderer via `tools/realtest.mjs`: 21 checks including `t272`, 735 pass, 8 held red checks `t187, t188, t189, t195, t222, t224, t228, t229`), reran each red once, and routed the held reds to their owners (`chatgpt` and `grokbot`) without modifying any test files.
Files:            qa/2026-10-23-AG-117/*, handoffs/2026-10-23-antigravity-AG-117.md
Tests:            Test page (`tools/tests/run-all.mjs`, 265 checks across chunks `0a..F`) → 4,070 pass, 9 initial fail assertions + 1 timeout across 10 checks (`t71, t77, t90, t93, t155, t198, t222, t225, t226, t264`), 5 held red checks on rerun (`t71`: 1 fail, `t77`: 1 fail, `t90`: 1 fail, `t155`: 1 fail, `t198`: 1 fail; `t93, t222, t225, t226, t264` passed on rerun; `t273` passed 13/13); Real renderer (`tools/realtest.mjs`, 21 checks in `R`) → 735 pass, 41 initial fail assertions across 8 checks (`t187, t188, t189, t195, t222, t224, t228, t229`), 8 held red checks on rerun (`43` fail assertions; `t272` passed 14/14)
Screenshots:      none (test-suite verification task; all raw chunk and rerun logs/JSONs saved in `qa/2026-10-23-AG-117/`)
Not verified:     Nothing — all 265 test-page checks and 21 real-renderer checks were executed through the machine-wide game-test slot with `--jobs 1`.
Requests:         request to `chatgpt` ("AG-117 suite after D-86 balance pass: held reds in t71, t77, t90, t155"); request to `grokbot` ("AG-117 suite after D-86 balance pass: held reds in t198 (test page) and t187..t229 (real renderer)"); FYI to `claude` ("FYI: AG-117 full suite totals after D-86 balance pass (CL-244 + GP-19955)")
Contract changes: none

---

## 1. Per-Chunk Summary (`qa/2026-10-23-AG-117/`)

All runs were executed strictly one browser instance at a time (`--jobs 1`) through the machine-wide game-test slot (Rule 16) after `GP-19956` logged `DONE`. No test files were modified.

| Chunk | Range | Checks | Initial Summary Line | Initial Reds | Cleared on Rerun | Held Reds |
| --- | --- | ---: | --- | --- | --- | --- |
| **`0a`** | `t0..t33` (incl. `t6a`) | 35 | `35 checks: 342 pass, 0 fail, 8 reported no assertions` | *(none)* | — | **0** |
| **`0b`** | `tfish, t34..t67` | 35 | `35 checks: 632 pass, 0 fail` | *(none)* | — | **0** |
| **`A`** | `t68..t99` | 32 | `32 checks: 437 pass, 4 fail` | `t71, t77, t90, t93` | `t93` (`11 pass, 0 fail`) | **`t71`, `t77`, `t90`** |
| **`B`** | `t100..t131` | 31 | `31 checks: 386 pass, 0 fail` | *(none)* | — | **0** |
| **`C`** | `t132..t163` | 32 | `32 checks: 469 pass, 1 fail` | `t155` | — | **`t155`** |
| **`D`** | `t164..t195` | 32 | `32 checks: 750 pass, 0 fail` | *(none)* | — | **0** |
| **`E`** | `t196..t229` | 34 | `34 checks: 603 pass, 3 fail, 1 could not run` | `t198, t222, t225, t226` | `t222` (`8/0`), `t225` (`21/0`), `t226` (`17/0`) | **`t198`** |
| **`F`** | `tinspect, t240..t273` | 34 | `34 checks: 451 pass, 1 fail, 2 reported no assertions` | `t264` | `t264` (`22 pass, 0 fail`) | **0** *(incl. `t273` `13/0`)* |
| **Test Page Total** | **All 265 checks** | **265** | **4,070 pass, 9 initial fail, 1 timeout** | **10 checks** | **5 cleared (`t93, t222, t225, t226, t264`)** | **5 (`t71, t77, t90, t155, t198`)** |
| **`R`** (realtest) | `t12..t272` (21 checks) | 21 | `21 checks: 735 pass, 41 fail (real renderer)` | `t187, t188, t189, t195, t222, t224, t228, t229` | — *(note: `t272` `14/0` green)* | **8 (`t187, t188, t189, t195, t222, t224, t228, t229`)** |

---

## 2. Held Reds & Their Owners

### A. Test Page (`tools/tests/run-all.mjs`) — 5 Held Reds

1. **`t71`** (`15 pass, 1 fail`, held on rerun) — **Owner: ChatGPT / Grokbot** (`// t71 - GB-42 (GP-A1, GB-A3)`, D-86 balance interaction from `GP-19955`):
   - Initial (`63.2s`): `FAIL streak fractions carry: 8 kills pay 18 in 8 skulls (want 9)`
   - Rerun (`61.1s`): `FAIL streak fractions carry: 8 kills pay 18 in 8 skulls (want 9)`
   - **Cause:** `GP-19955` raised the shambler's skull payout from `1` to `2` (`D-86`), so 8 quick shambler kills (`4 at x1 + 4 at x1.25`) now pay `2 * 9 = 18` in 8 skulls while `t71.js:26` still asserts `sum === 9`.

2. **`t77`** (`16 pass, 1 fail`, held on rerun) — **Owner: ChatGPT / Grokbot** (`// t77 - GB-52`, touched in `GP-19955`):
   - Initial (`55.6s`): `FAIL and it cuts again once restarted (fuel -0.70, heat 0.44->0.46, w chainsaw, paused ?, d dead,dead,1.1,2.2,1.1,2.3,1.1,dead phase prep zl 5)`
   - Rerun (`55.0s`): `FAIL and it cuts again once restarted (fuel -0.75, heat 0.44->0.45, w chainsaw, paused ?, d dead,dead,1.1,2.0,1.1,2.0,1.1,dead phase prep zl 5)`
   - **Cause:** The 3 brutes in the front chainsaw arc (`ring[0]`, `ring[1]`, `ring[7]`) died (`dead,dead,...,dead`, `zl 5`) before the overheat/restart check at `t77.js:107`.

3. **`t90`** (`5 pass, 1 fail`, held on rerun) — **Owner: ChatGPT / Claude** (`// t90 - hits still flinch, stagger and knock down`, D-86 balance interaction from `GP-19955`):
   - Initial (`47.6s`): `FAIL a shell at 1.5 m 0.00 m/s and down; an AK round 2.70 m/s and up`
   - Rerun (`45.9s`): `FAIL a shell at 1.5 m 0.00 m/s and down; an AK round 2.70 m/s and up`
   - **Cause:** `t90.js:23` sets `zz.hp = 5000; zz.maxHp = 5000;` on a shambler so a close shotgun shell won't kill it while testing stagger/knockdown. `GP-19955` changed `damageZombie` so tagged hits scale by `z.maxHp` (`listedBodyDamage(info.hitWeapon, z.typeKey, info.pelletOf, z.maxHp)`), causing the shotgun (`270%` of `z.maxHp`) to deal `13,500` damage and kill the `5000 HP` shambler immediately (`z.alive = false`, so `knockT = 0` and `stagger = 0`).

4. **`t155`** (`1 pass, 1 fail`, held on rerun) — **Owner: ChatGPT / Claude** (`// t155`, D-86 balance interaction from `GP-19955`):
   - Initial (`40.2s`): `FAIL a close shell knocks it down (knockT 0.00) with no reacting body`
   - Rerun (`41.7s`): `FAIL a close shell knocks it down (knockT 0.00) with no reacting body`
   - **Cause:** Same as `t90` (`t155.js:19` sets `z.hp = 5000; z.maxHp = 5000;` on a shambler and fires `T.fireShellDbg`, which now deals `270%` of `z.maxHp` and kills the shambler instead of knocking it down).

5. **`t198`** (`11 pass, 1 fail`, held on rerun) — **Owner: Grokbot** (`// t198 - GB-94`):
   - Initial (`52.0s`): `FAIL a TT spawn that does not join keeps the old walk (the older checks)`
   - Rerun (`55.5s`): `FAIL a TT spawn that does not join keeps the old walk (the older checks)`
   - **Cause:** `t198.js:37-39` spawns `tt` at `(S.x + 54, S.z + 52)` (~75 m away, where `GB-194` ticks far zombies every 3rd frame), waits `150 ms` of wall-clock time (`await wait(150)`), and checks `tt.hz === null`.

*(Flaky checks that failed once on the initial chunk run and passed on rerun: `t93` (`10/1` -> `11/0`), `t222` (`7/1` -> `8/0`), `t225` (`20/1` -> `21/0`), `t226` (180 s timeout -> `17/0` in `55.6s`), `t264` (`21/1` -> `22/0`).)*

---

### B. Real Renderer (`tools/realtest.mjs`) — 8 Held Reds (43 FAIL assertions on rerun)

1. **`t187`** (`97 pass, 2 fail`, held on rerun) — **Owner: Grokbot** (`// t187 - GB-129`, zoomed aim alignment):
   - `FAIL shotgun: zoomed, on the aim (2.26 deg)`
   - `FAIL launcher: zoomed, on the aim (3.05 deg)`

2. **`t188`** (`119 pass, 2 fail`, held on rerun) — **Owner: Grokbot** (`// t188 - GB-130`, weapon hand anchors):
   - `FAIL chainsaw: firing hand on the grip anchor (0.203)`
   - `FAIL chainsaw: support hand on its anchor (0.353)`

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

5. **`t222`** (`0 pass, 1 fail` initial CDP timeout; `8 pass, 1 fail` on rerun) — **Owner: Grokbot** (`// t222 - GB-193 / GB-207`, real-renderer chest aim bar):
   - `FAIL pointing at a chest lands in the body: body 23, head 7 (bar 80 %, no miss; a head only where the head covers the chest from up here)`

6. **`t224`** (`35 pass, 10 fail` initial; `34 pass, 11 fail` on rerun) — **Owner: Grokbot / Claude** (`// t224 - GB-148 / CL-160`, stowed sidearm pack fit after `GB-200` + wheelTick audio):
   - `FAIL m4/ak/uzi/revolver revolver+: snug on the pack, air 0.040 m, clipping 0.000 m (250 of 250 points over the pack)`
   - `FAIL m4/ak/uzi/revolver revolver-: snug on the pack, air 0.037 m, clipping 0.000 m (250 of 250 points over the pack)`
   - `FAIL ak/m4/revolver/pistol revolver+: snug on the pack, air 0.081 m, clipping 0.000 m (250 of 250 points over the pack)`
   - `FAIL ak/m4/revolver/pistol pistol+: snug on the pack, air 0.040 m, clipping 0.000 m (472 of 472 points over the pack)`
   - `FAIL ak/m4/revolver/pistol revolver-: snug on the pack, air 0.069 m, clipping 0.000 m (250 of 250 points over the pack)`
   - `FAIL minigun/m4/uzi/revolver revolver+: snug on the pack, air 0.040 m, clipping 0.000 m (250 of 250 points over the pack)`
   - `FAIL minigun/m4/uzi/revolver revolver-: snug on the pack, air 0.037 m, clipping 0.000 m (250 of 250 points over the pack)`
   - `FAIL shotgun/aa12/revolver/ revolver+: snug on the pack, air 0.026 m, clipping 0.000 m (250 of 250 points over the pack)`
   - `FAIL shotgun/aa12/revolver/ revolver-: snug on the pack, air 0.026 m, clipping 0.000 m (250 of 250 points over the pack)`
   - `FAIL a quick run of ticks is softer (0.81 of a lone tick)`
   - `FAIL a fast sweep: 0 ticks in 1069 ms of audio clock (at most one per 50 ms)`

7. **`t228`** (`88 pass, 7 fail`, held on rerun) — **Owner: Grokbot / Cursor** (`// t228 - CU-100 / GB-191`, support fist foregrip alignment & chainsaw hands):
   - `FAIL launcher standing: the support fist along its foregrip (180 deg)`
   - `FAIL launcher walking: the support fist along its foregrip (180 deg)`
   - `FAIL flamer standing: the support fist along its foregrip (180 deg)`
   - `FAIL flamer walking: the support fist along its foregrip (180 deg)`
   - `FAIL chainsaw standing: the firing hand closes on the grip (22.1 cm)`
   - `FAIL chainsaw standing: the support hand on its anchor (1.6 cm)`
   - `FAIL chainsaw walking: the support hand on its anchor (1.6 cm)`

8. **`t229`** (`71 pass, 4 fail` initial; `70 pass, 5 fail` on rerun) — **Owner: Grokbot** (`// t229 - GB-151`, revolver/akimbo grip & wrist stability):
   - `FAIL revolver: support fist on the support side round the firing fingers (-0.045,-0.023,0.021, 0.055 m from the firing fist)`
   - `FAIL revolver aiming up: support fist on the support side round the firing fingers (-0.045,-0.023,0.021, 0.055 m from the firing fist)`
   - `FAIL revolver aiming down: support fist on the support side round the firing fingers (-0.045,-0.023,0.020, 0.054 m from the firing fist)`
   - `FAIL revolver: no pop leaving or rejoining the grip (1.55 m/s at most)`
   - `FAIL akimbo: wrists firm, guns in line with the forearms (1.30, 1.30 rad)`
