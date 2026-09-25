# cursor — CU-27 day-1 audit — 2026-09-25
Changed:          audit only, no code changed. 9 problems: 1 S1, 5 S2, 3 S3.
Files:            handoffs/audit-day1/cursor.md
Tests:            `npm test` → 72 checks, 890 pass, 35 fail (t60 21, t61 13, t50 1), 16 probes. `node tools/loadtime.mjs --headless --cold` → title 8.5 s. `--headless --runs 2` → 8.2 s, 8.0 s. A headless day-1 run (fresh profile, Play, prep, alarm, 25 s of wave, day 2, death, Play again) → 0 page errors.
Screenshots:      none
Not verified:     anything on Jerry's GPU (no screen control tonight; every number here is headless SwiftShader). The death screen after a real death. A real reload between days.
Requests:         none (the audit goes to Claude)
Contract changes: none

## Top 5

1. CU-A1: 34 of the 35 test failures are one cause: the splash is still up when t60/t61 start the music.
2. CU-A4: the morning save is written every day and nothing a player does ever reads it.
3. CU-A5: the ways-to-die collection is wiped on every new game, so it can never grow past one run.
4. CU-A3: the title is 8 s warm against a 5 s budget, before the splash video is counted.
5. CU-A6: day-1 frame rate on a real GPU is not measured yet; headless is 3.9 fps with 16 zombies and render-bound.

## S1

### CU-A1 · S1 · tests · t60 and t61 fail because the splash never clears in the test page
- Where:    tools/tests/run-all.mjs (the page is `tools/tests/test.html`), tools/tests/t60.js line 23, t61.js line 16
- Steps:    `npm test`
- Expected: t60 and t61 pass (Claude had them at 31/0 and 19/0 before tonight's opening changes)
- Seen:     t60 21 fail, t61 13 fail. The first failure in both is `music is running (muted: false, opening: true)`. `core/audio.js` refuses to start music while `DWOpening.active` is true (lines 159 and 1209), so every music check after it fails.
- Owner:    Cursor (the harness)
- Fix idea: have run-all call `DWOpening.dismissForTesting()` once `window.TT` exists, the same way the other tools do since GP-27.
- Proof:    `npm test` output: `FAIL t61 5 pass 13 fail`, `FAIL t60 11 pass 21 fail`, first lines `FAIL music is running (muted: false, opening: true)`. Why the opening stays up only in the test page (the headless game page clears it by itself at 15.3 s) is not verified.

## S2

### CU-A2 · S2 · world · t50 draws more tree meshes than it allows
- Where:    tools/tests/t50.js, index.html (tree batches)
- Steps:    `npm test`
- Expected: t50 passes
- Seen:     `FAIL tree meshes drawn: 218 (own 116 + cells 102) for 430 trees`
- Owner:    Claude
- Fix idea: check it against CL-28 (the frozen static world) before changing the limit
- Proof:    `npm test`: `FAIL t50 17 pass 1 fail`

### CU-A3 · S2 · load · the warm title misses the 5 s budget
- Where:    index.html load stages (`tools/loadtime.mjs`)
- Steps:    `node tools/loadtime.mjs --headless --runs 2`
- Expected: title within 5 s warm (AGENTS.md rule 12)
- Seen:     8.2 s and 8.0 s warm, 8.5 s cold. The biggest stage is "post + pools + compile + warm frame" at 2.9 to 3.6 s, then "POIs + minimap + foliage chunks" at 1.1 to 1.4 s. The tool dismisses the splash, so a player also sits through the video and the 3.2 s intro before that.
- Owner:    Cursor
- Fix idea: measure it on Jerry's GPU first; headless SwiftShader compiles shaders slowly
- Proof:    loadtime output above. Not verified on a real GPU.

### CU-A4 · S2 · saves · the morning save is written but never used
- Where:    index.html `writeDayStart` (line 26948), `quitToMenu` (line 36520), the new-game reset (line 36688)
- Steps:    Play, reach day 2, quit to the menu or die, Play again
- Expected: a decision either way: a Continue that returns to the morning, or no save at all
- Seen:     `tt_day_start` is written each morning (day 1, then day 2 in the headless run). Play and Play again both clear it and start day 1, and quitting clears it too. Only tests call `loadDayStart`. Closing the browser mid-run loses the run with no way back.
- Owner:    Jerry decides; Cursor builds it
- Fix idea: a Continue button on the menu when a morning save exists, or remove the save
- Proof:    headless run: `tt_day_start after day-1 prep: 1`, `tt_day_start at day 2: 2`, `second run starts at day 1 bank 40`

### CU-A5 · S2 · saves · the ways-to-die collection is wiped on every new game
- Where:    index.html `clearDeathLog` in the new-game reset (line 36689), the death screen "Ways to die · n / 21 found"
- Steps:    die one way, Play again, die another way
- Expected: Jerry's note was that a *fresh playthrough* showed old unlocks. A collection counting "n / 21 found" reads like it should grow across runs.
- Seen:     every Play clears it, so it can only ever show this run's single death
- Owner:    Jerry decides; Cursor builds it
- Fix idea: keep the lifetime collection, and clear it only on a real fresh profile or a "reset progress" setting
- Proof:    code at line 36689; headless run `death log at new game: null`

### CU-A6 · S2 · performance · day-1 frame rate is not known on a real GPU
- Where:    the day-1 wave
- Steps:    Play, sound the alarm, profile 25 s of the wave
- Expected: 60 fps
- Seen:     headless: 3.1 to 4.1 fps with at most 16 zombies, worst frame 265.5 ms, 96 hitches in 25 s. The CPU profile was 90.8% idle: the frame waits on SwiftShader drawing, not on game code. Top game-side costs were `updateMatrixWorld` 1.1% and `_projectObject` 0.9%. Headless also slowed game time so much that the 9 s insertion took 62 s.
- Owner:    Antigravity (real-GPU numbers), then Claude
- Fix idea: run `node tools/bench.mjs --scenario day5` and a day-1 run on Jerry's GPU
- Proof:    headless run output. Not verified on a real GPU.

## S3

### CU-A7 · S3 · shell · no favicon, two 404s every load
- Where:    index.html `<head>`
- Seen:     the only failed requests in a day-1 load are `404 /favicon.ico`, twice
- Owner:    Cursor
- Fix idea: a small icon, or `<link rel="icon" href="data:,">`
- Proof:    Network log in a headless load

### CU-A8 · S3 · repo · scratch files left in the folder and in git
- Where:    repo root
- Seen:     untracked: 33 `crew/_gb16_*` files, `crew/_t53chalk.cjs`, `gen-ag9.mjs`, `gen-ag9.py`, `tools/_f1-4.txt`, `tools/_gb7_probe2.mjs`, `tools/tests/_print-fails.mjs`, `_run-dump.mjs`, `t12.js.bakprobe`, `t12probe.js` (which runs in every `npm test` as a probe), `handoffs/_harness_peek/`, `qa/probe-phase.mjs`, `Claude Commit.bat`. Tracked: `_gb20_patch.mjs` at the root, and `qa/probe-{batch,bench,build,spawn,wave}.mjs`.
- Owner:    each author; Cursor removes them once each says so (rule 3)
- Proof:    `git ls-files --others --exclude-standard`, `git ls-files`

### CU-A9 · S3 · saves · the death screen did not appear from the dev death command
- Where:    index.html `rip` dev command (line 19249), `endGame`
- Steps:    headless: reach day 2, `TT.runDevCommand('rip')`, wait 60 s for `#win.show`
- Seen:     `#win` never got `show` within 60 s. Play again still reset to the menu, and the next run started on day 1.
- Owner:    Cursor to recheck with a real death before anyone changes code
- Proof:    `death screen: false`. Not verified: headless runs game time slowly, and the burial cutscene may simply outlast 60 s.

## Console on a clean day-1 run (headless)

0 page errors. 9 console lines: 2× `404 favicon.ico`, and 7 headless-only renderer notes (no WebGPU adapter so WebGL2 is used, `powerPreference` ignored on Windows, one GL driver performance message). None come from game code.
