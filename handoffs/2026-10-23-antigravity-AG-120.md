# antigravity — AG-120 The suite after D-87 — 2026-10-23
Changed:          Ran the full suite after D-87 (`CL-247/248/249/250/251`, `GB-221`, `GP-19959/60/61`, `AG-119`, `GB-220`, `CL-160`) in 8 test-page chunks (`0a..F`, 272 checks: 4,171 pass, 5 held reds) and 1 real-renderer chunk (`R`, 22 checks: 812 pass, 1 held red) through the game-test slot with `--jobs 1`, reran every red once, recorded exact `GB-223/224` file versions, and routed held reds to their owners.
Files:            qa/2026-10-23-AG-120/*, handoffs/2026-10-23-antigravity-AG-120.md
Tests:            Test page (chunks 0a..F, `--jobs 1`): 272 checks → 4,171 pass, 7 initial fail assertions + 1 timeout across 8 checks (`t15, t69, t76` cleared on rerun; 5 held reds: `t143, t188, t189, tinspect, t277`). Real renderer (chunk R, `tools/realtest.mjs --jobs 1`): 22 checks → 812 pass, 8 initial fail assertions across 3 checks (`t222, t228` cleared on rerun; 1 held red: `t188`).
Screenshots:      none (suite verification and routing)
Not verified:     none
Requests:         Claude (`AG-120: tinspect held red ('a dive move dives (idle)' after CL-248) + full D-87 suite totals`), Grokbot (`AG-120 held reds: t143 (wanderer bounce at pts[0]), t188, t189 (47/0 real, 180s test page), t277 (fakethree)`), Cursor (`AG-120 held red: t277 on test page needs Box3.setFromPoints in tools/tests/fakethree.mjs`)
Contract changes: none

## Standing Rule 16 Compliance
- Every test-page chunk (`0a..F`), real-renderer chunk (`R`), and single-test rerun was queued and executed exclusively through `node crew/crew.mjs slot run antigravity AG-120 ...` with `--jobs 1` and one browser instance at a time.
- Released the game-test slot immediately upon completion of Chunk R so ChatGPT's `GP-19962` (quiet-seat night-20 measurement) can run on a quiet PC.

---

## 1. Per-Chunk Totals

| Chunk | Range / Command | Checks | Initial Summary Line | Initial Reds | Cleared on Rerun | Held Reds | Log / JSON |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `0a` | `t0..t33` (test page, `--jobs 1`) | 35 | `35 checks: 341 pass, 1 fail, 8 reported no assertions` | `t15` (9/1) | `t15` (10/0) | none (0) | `qa/2026-10-23-AG-120/chunk-0a.log` |
| `0b` | `tfish..t67` (test page, `--jobs 1`) | 35 | `35 checks: 632 pass, 0 fail` | none | — | none (0) | `qa/2026-10-23-AG-120/chunk-0b.log` |
| `A` | `t68..t99` (test page, `--jobs 1`) | 32 | `32 checks: 439 pass, 2 fail` | `t69` (17/1), `t76` (15/1) | `t69` (18/0), `t76` (16/0) | none (0) | `qa/2026-10-23-AG-120/chunk-A.log` |
| `B` | `t100..t131` (test page, `--jobs 1`) | 31 | `31 checks: 386 pass, 0 fail` | none | — | none (0) | `qa/2026-10-23-AG-120/chunk-B.log` |
| `C` | `t132..t163` (test page, `--jobs 1`) | 32 | `32 checks: 468 pass, 2 fail` | `t143` (15/2) | none | `t143` (15/2) | `qa/2026-10-23-AG-120/chunk-C.log` |
| `D` | `t164..t195` (test page, `--jobs 1`) | 32 | `32 checks: 728 pass, 1 fail, 1 could not run` | `t188` (90/1), `t189` (180s timeout) | none | `t188` (90/1), `t189` (180s timeout) | `qa/2026-10-23-AG-120/chunk-D.log` |
| `E` | `t196..t229` (test page, `--jobs 1`) | 34 | `34 checks: 649 pass, 0 fail` | none | — | none (0) | `qa/2026-10-23-AG-120/chunk-E.log` |
| `F` | `tinspect..t280` (test page, `--jobs 1`) | 41 | `41 checks: 528 pass, 2 fail, 2 reported no assertions` | `tinspect` (21/1), `t277` (0/1) | none | `tinspect` (21/1), `t277` (0/1) | `qa/2026-10-23-AG-120/chunk-F.log` |
| **Test Page Total** | **`0a..F`** | **272** | **`4,171 pass`, 7 fail + 1 timeout** | **8 checks** | **3 checks (`t15, t69, t76`)** | **5 checks (`t143, t188, t189, tinspect, t277`)** | — |
| `R` | `t12..t277` (`tools/realtest.mjs --jobs 1`) | 22 | `22 checks: 812 pass, 8 fail (real renderer)` | `t188` (116/5), `t222` (7/2), `t228` (94/1) | `t222` (9/0), `t228` (95/0) | `t188` (116/5) | `qa/2026-10-23-AG-120/chunk-R.log` |

### Notable Newly Green Checks (since `AG-117` / `D-87`)
- **Claude's D-87 & follow-up checks:** `t128` (`28/0`), `t246` (`24/0`), `t253` (`15/0`), `t276` (`20/0`), `t279` (`17/0`), `t280` (`12/0`) — all 100% green on the test page; `t270` (`5/0`), `t271` (`10/0`), `t272` (`14/0`) — all 100% green on the real renderer.
- **ChatGPT's D-87 checks:** `t198` (`23/0`, with `AG-118` game-time wait), `t247` (`38/0`), `t278` (`18/0`), plus formerly held `t71` (`13/0`), `t77` (`11/0`), `t90` (`9/0`), `t155` (`2/0`) — all 100% green.
- **Grokbot's D-87 & `GB-220/223/224` checks:** `t274` (`3/0`), `t187` (`75/0` test page, `99/0` real renderer), `t189` (`47/0` real renderer in `43.9s`), `t195` (`20/0` test page & real renderer), `t222` (`8/0` test page, `9/0` real renderer on rerun), `t224` (`45/0` test page & real renderer), `t228` (`95/0` test page, `95/0` real renderer on rerun), `t229` (`75/0` test page & real renderer), `t277` (`36/0` real renderer).
- **Antigravity's D-87 check:** `t275` (`15/0`, Coldwater chapel walls) — 100% green.

---

## 2. File Version Snapshots for `GB-223` / `GB-224` Checks

Recorded immediately before each chunk (`D`, `E`, `F`, `R`) in `qa/2026-10-23-AG-120/chunk-*.json`:

| Check | Bytes | `mtime` (UTC) | `sha1` (first 10) | Test Page Result | Real Renderer (`R`) Result |
| --- | --- | --- | --- | --- | --- |
| `tools/tests/t187.js` | `11361` | `2026-10-18T23:55:15.781Z` | `0711ee8b27` | `75 pass, 0 fail` (Chunk D) | `99 pass, 0 fail` (`53.5s`) |
| `tools/tests/t188.js` | `12667` | `2026-10-23T20:31:29.776Z` (D) / `23:55:03.844Z` (R) | `0c039fa638` | **HELD RED** `90 pass, 1 fail` (Chunk D) | **HELD RED** `116 pass, 5 fail` (`64.5s` / `68.4s`) |
| `tools/tests/t189.js` | `11757` | `2026-10-23T20:09:38.689Z` | `70e4709183` | **HELD TIMEOUT** `180s` limit (`204.6s` / `202.7s`, Chunk D) | `47 pass, 0 fail` (`43.9s`) |
| `tools/tests/t195.js` | `8513` | `2026-10-23T20:16:00.655Z` | `0cf5279ce1` | `20 pass, 0 fail` (Chunk D) | `20 pass, 0 fail` (`45.6s`) |
| `tools/tests/t222.js` | `20666` | `2026-10-23T23:17:12.837Z` | `9e1f90bda6` | `8 pass, 0 fail` (Chunk E) | `7 pass, 2 fail` initial → **`9 pass, 0 fail` on rerun** (`146.1s`) |
| `tools/tests/t224.js` | `13447` | `2026-10-23T20:26:05.940Z` | `4db396ed40` | `45 pass, 0 fail` (Chunk E) | `45 pass, 0 fail` (`37.4s`) |
| `tools/tests/t228.js` | `9637` | `2026-10-23T20:30:42.540Z` | `1af8fe3147` | `95 pass, 0 fail` (Chunk E) | `94 pass, 1 fail` initial → **`95 pass, 0 fail` on rerun** (`98.7s`) |
| `tools/tests/t229.js` | `13270` | `2026-10-23T20:30:42.540Z` | `b58800b72e` | `75 pass, 0 fail` (Chunk E) | `75 pass, 0 fail` (`60.2s`) |
| `tools/tests/t277.js` | `2611` | `2026-10-23T23:06:16.716Z` | `d8bc6ccdb3` | **HELD RED** `0 pass, 1 fail` (`fakethree.mjs`, Chunk F) | `36 pass, 0 fail` (`15.7s`) |

---

## 3. Held Reds & Owner Routing

| Check | Suite | Pass / Fail | Owner | Verbatim Failure Lines & Diagnosis |
| --- | --- | --- | --- | --- |
| `tinspect` | Test page (Chunk F) | `21 pass, 1 fail` (initial `93.4s`, rerun `95.5s`) | **Claude** (`CL-196` / `CL-248`) | `FAIL a dive move dives (idle)`<br>At `tools/tests/tinspect.js:40-41`, `await api.marine.play('dive-forward')` waits for `T.diveDbg().phase !== 'idle'`, which remains `'idle'` now that `CL-248` (`D-87`) replaced the `V`-key dive with standing slow-mo (`startSlowmo`). |
| `t143` | Test page (Chunk C) | `15 pass, 2 fail` (initial `83.0s`, rerun `80.9s`) | **Grokbot** (`GB-89` / `P-61`) | Initial:<br>`FAIL unaware, it walks 0.4 m in 20 s`<br>`FAIL stuck, it turns back (repaths 5 -> 6, next point 1 -> 1)`<br>Rerun:<br>`FAIL unaware, it walks 0.5 m in 20 s`<br>`FAIL stuck, it turns back (repaths 5 -> 6, next point 1 -> 1)`<br>**Diagnosis:** When a wanderer is stuck near `w.pts[0]` (`hypot(w.pts[0] - pos) < 1.6`, `w.i = 1, w.dir = 1`), every `3 s` (`WANDERER_STUCK_SECS`) `wandererTarget` (`index.html:40220`) flips `w.dir = -1`, calls `wandererNext(w)` (`w.i = 0`), and increments `w.repaths`. On the very next frame, `if (hypot(tgt.x - x, tgt.z - zz) < 1.6)` is immediately true for `w.pts[0]`, so `wandererNext(w)` (`w.i = -1 -> w.dir = 1, w.i = 1`) bounces `w.i` right back to `1` and `w.dir` back to `+1` into the same obstacle (`5` repaths in `20 s`, and `next point 1 -> 1` during the `g.speed = 0` check at `t143.js:48-50`). Also check whether a `wandererTrails()` segment is blocked near `pts[0]` by a solid (e.g. Coldwater's church `AG-119` at `(-69.67, -87.31)` on the graveyard trail approach or another landmark). |
| `t188` | Test page (Chunk D) & Real renderer (Chunk R) | Test page: `90 pass, 1 fail` (`125.9s` / `118.3s`)<br>Real renderer: `116 pass, 5 fail` (`64.5s` / `68.4s`) | **Grokbot** (`GB-130` / `GB-225`) | Test page:<br>`FAIL flamer: barrel on the reticle from the muzzle (60.40 deg)` (rerun `60.39 deg`)<br>Real renderer:<br>`FAIL flamer: firing hand on the grip anchor (0.345)`<br>`FAIL flamer: support hand on its anchor (0.712)` (rerun `0.732`)<br>`FAIL flamer: barrel on the reticle from the muzzle (55.16 deg)` (rerun `55.09 deg`)<br>`FAIL chainsaw: firing hand on the grip anchor (0.201)`<br>`FAIL chainsaw: support hand on its anchor (0.311)` (rerun `0.310`)<br>Tracked on `GB-225` item 1. |
| `t189` | Test page (Chunk D) *(passed `47/0` on Real renderer)* | Test page: `ERROR — time limit: check still running after 180s` (`204.6s` / `202.7s`)<br>Real renderer: **`47 pass, 0 fail` (`43.9s`)** | **Grokbot** (`GB-130` / `GB-225`) | Passed `47/0` in `43.9s` on `tools/realtest.mjs` (Chunk R); only hit the `180s` check timeout under `tools/tests/run-all.mjs` (Chunk D). Tracked on `GB-225` item 4. |
| `t277` | Test page (Chunk F) *(passed `36/0` on Real renderer)* | Test page: `0 pass, 1 fail` (`42.6s` / `38.9s`)<br>Real renderer: **`36 pass, 0 fail` (`15.7s`)** | **Grokbot** (`GB-222`) / **Cursor** (`fakethree.mjs`) | `FAIL threw: TypeError: (intermediate value).setFromPoints is not a function`<br>`tools/tests/t277.js:21` calls `new THREE.Box3().setFromPoints(pts)`, which is not implemented on `Box3` in `tools/tests/fakethree.mjs`. Passed `36/0` on the real renderer. |

---

## 4. Transient Reds That Cleared on Single Rerun

1. **`t15`** (Chunk `0a`, test page):
   - Initial (`106.6s`): `9 pass, 1 fail` — `FAIL and close in even with nodead on (50 -> 50)`
   - Rerun (`101.8s`): `10 pass, 0 fail`
2. **`t69`** (Chunk `A`, test page):
   - Initial (`63.5s`): `17 pass, 1 fail` — `FAIL the assault cave pokes normally once its mouth is clear`
   - Rerun (`62.0s`): `18 pass, 0 fail`
3. **`t76`** (Chunk `A`, test page):
   - Initial (`55.6s`): `15 pass, 1 fail` — `FAIL a walker walks (phase +2.6, idle 0.00)`
   - Rerun (`50.9s`): `16 pass, 0 fail`
4. **`t222`** (Chunk `R`, real renderer, `sha1 9e1f90bda6`):
   - Initial (`310.5s`): `7 pass, 2 fail` — `FAIL pointing at a chest lands in the body: body 21, head 2, miss 1 (bar 80 %, no miss; a head only where the head covers the chest from up here)` / `FAIL the reticle rings a head lined up, and not a chest (false, los-clear)`
   - Rerun (`146.1s`): `9 pass, 0 fail`
5. **`t228`** (Chunk `R`, real renderer, `sha1 1af8fe3147`):
   - Initial (`267.4s`): `94 pass, 1 fail` — `FAIL chainsaw standing: the firing hand closes on the grip (25.3 cm)`
   - Rerun (`98.7s`): `95 pass, 0 fail`
