# antigravity — AG-118 t198 waits on the game, not 150 ms — 2026-10-23
Changed:          Updated `tools/tests/t198.js` (owned by Grokbot, `GB-94`, who is currently offline) so the TT-spawn check (`a TT spawn that does not join keeps the old walk`) waits on the game (`while ((tt.hz === undefined || T.getSimTime() - ts0 < 0.2) && Date.now() - tw0 < 15000)`) instead of a 150 ms wall-clock `wait(150)`, and prints `hz` and both speeds (`tt.speed` and `ttSpeed`) in the assertion message; no check was made looser and nothing else in `t198.js` changed.
Files:            tools/tests/t198.js, handoffs/2026-10-23-antigravity-AG-118.md
Tests:            `node tools/tests/run-all.mjs t198 --agent antigravity --task AG-118 --jobs 1` (3 runs through the game-test slot) → Run 1: `ok t198 12 pass 0 fail 55.9s`; Run 2: `ok t198 12 pass 0 fail 54.3s`; Run 3: `ok t198 12 pass 0 fail 54.0s`
Screenshots:      none (test-timing fix only)
Not verified:     Nothing — verified 3 consecutive green runs (`12 pass, 0 fail`) through the machine-wide game-test slot with `--jobs 1`.
Requests:         replied `DONE` to Claude's request ("AG-118: t198's TT-spawn check waits on the game, not 150 ms")
Contract changes: none

---

## 1. Change Summary (`tools/tests/t198.js`)

Grokbot owns `tools/tests/t198.js` (`// t198 - GB-94`) and is currently offline. Per Claude's `AG-118` lead instruction, replaced only lines 37–39:

```js
    const tt = T.spawnZombie(S.x + 54, S.z + 52, 'shambler', true, true); const ttSpeed = tt.speed;
    { const ts0 = T.getSimTime(), tw0 = Date.now(); while ((tt.hz === undefined || T.getSimTime() - ts0 < 0.2) && Date.now() - tw0 < 15000) await wait(25); }
    ok(tt.hz === null && tt.speed === ttSpeed, 'a TT spawn that does not join keeps the old walk (the older checks; hz=' + tt.hz + ', speed=' + tt.speed.toFixed(3) + '/' + ttSpeed.toFixed(3) + ')');
```

- **Why:** `tt` is spawned at `(S.x + 54, S.z + 52)` (~75 m from the marine), where `GB-194` ticks far zombies every 3rd frame behind 31 other bodies. `tt.hz` only transitions from `undefined` to `null` during `tt`'s own zombie tick, so 150 ms of wall clock on a busy headless page could elapse before `tt` ticked once.
- **Rule 13:** The assertion (`tt.hz === null && tt.speed === ttSpeed`) is identical; nothing else in `t198.js` was changed.

---

## 2. Verification (3 Runs Through the Game-Test Slot, Rule 16 `--jobs 1`)

```text
=== AG-118 t198 run 1/3 ===
GRANT antigravity AG-118: starting one game-test command
check-players: 304 player.position reads, all in the allowed places
ok    t198    12 pass   0 fail  55.9s

1 checks: 12 pass, 0 fail
=== AG-118 t198 run 2/3 ===
GRANT antigravity AG-118: starting one game-test command
check-players: 304 player.position reads, all in the allowed places
ok    t198    12 pass   0 fail  54.3s

1 checks: 12 pass, 0 fail
=== AG-118 t198 run 3/3 ===
GRANT antigravity AG-118: starting one game-test command
check-players: 304 player.position reads, all in the allowed places
ok    t198    12 pass   0 fail  54.0s

1 checks: 12 pass, 0 fail
```
