# Showcase review: 2026-09-25

Reviewed `feature/Phis-changes` at `05f2b69`, which includes `d78e7b3`, the only recent commit that
changes game code. The commits before it are QA and test tools. The base has since moved to `3e41ed1`,
which adds GP-43's bounty-board modules (`317971f`); row 1 accounts for that. This branch merges
cleanly onto it. Scope: anything that could break or
embarrass the game in a 20-minute demo. No features were added.

Branch `cloud/showcase-review`. It has two one-line fixes, each in its own commit, plus this file.
Pull request: https://github.com/jerrykoller5000-cyber/Dead-Wave/pull/1 (into `feature/Phis-changes`, not merged).

## Since the review: base at `c65ae3e` (2026-09-26)

The base moved on after this review. Commit `37ef95b` landed the bounty board adapter (GP-43), a spider
fix (GB-58) and CL-56. CL-56 makes the alarm one shot on the HQ with no sky pan. It also replaces the
Night N Complete card with a small banner, and the morning now comes on its own. These notes come from
reading the new base's code only. Nothing was re-run on it.

- **Row 1: resolved on the base.** `briefing-open` now carries `bounties: getBounties()`.
- **Row 2: still present on the base.** The `body.loopcine` rule at line 320 is unchanged. Fix `33fcf33` still applies.
- **Row 3: still present on the base.** `endGame` still doesn't clear `hq.seq`, and `updateHQSequence` still calls `beginWave()`. Fix `7d15468` still applies.
- **Row 4: still present,** and probably more visible. `expireBounties('alarm')` still runs on `alarm-started`, and the alarm shot now holds on the HQ instead of turning to the sky.
- **Row 5: GB-58 targets it.** The `37ef95b` commit message reports t80 13/0 on Jerry's machine. Not re-run here.
- **Rows 6 to 9:** not re-checked.
- **"Checked and fine" → The loop:** the Night Complete card results no longer apply, because CL-56 replaced the card.

The two fixes merge cleanly onto `c65ae3e`. The next step is to merge them, then re-run t60, t72 and t79
(re-based by CL-56), plus t61 and t83.

## Found

Likelihood means the chance of hitting it in a 20-minute demo.

| # | Problem | Where | Likelihood | Fix |
|---|---------|-------|------------|-----|
| 1 | **The HQ board can't see the bounties yet.** From night 2, 3 to 8 sleeping zombies are posted at a random landmark. GP-43's UI landed on the base in `317971f` after this review started, but its `index.html` adapter is still uncommitted (the commit says so). `briefing-open` carries no `bounties`, and nothing imports `ui/bounties.js`. So on the base today, the board says **"Day bounties · No open bounties posted."** while a post is live, and no minimap targets appear. | `index.html:20174` (`briefing-open`), `27687` (`bountiesDue`) | **High** if the demo reaches night 2 and the presenter opens the HQ board. Not a crash, but wrong on screen. | Land the GP-43 adapter (Cursor/ChatGPT), then check the board on night 2. Or turn bounties off for the demo: `bountiesDue = false` at line 27687 (1 line; Jerry's or the lead's call, so not changed here). |
| 2 | **Esc during a loop camera shot looked like a freeze.** `body.loopcine` hid every `#hud` child, including `#pause` and `#shop`. Esc during the alarm shot (about 5 s), the finisher, the Next Night shot or the morning shot paused the game behind an invisible menu. E at the kiosk during the finisher did the same with the shop, because the kiosk trades mid-wave. Reproduced in the test page: paused, with `#pause` at `visibility: hidden`. | `index.html:320` | Medium. Presenters press Esc to skip cutscenes, and the death scene teaches "Esc skips". | **Fixed in `33fcf33`**: `:not(#pause):not(#shop)` added to the rule. Re-run: the pause menu is visible. |
| 3 | **Dying during the alarm still started the wave on the death screen.** `endGame` left `hq.seq` set, and `updateHQSequence` keeps running after game over. About 5 s later `beginWave()` ran: the wave sting played over the burial, the caves pulsed and `phase` became `'wave'`. Reproduced in the test page, and in the real game (headless). | `index.html:20223`, `31170` | Low. Needs day-1 guards, or a cave or pit grab, during the alarm. | **Fixed in `7d15468`**: `hq.seq = null` in `endGame`. Re-run: phase stays `prep`, no page errors. |
| 4 | **Awake bounty guards blink out in plain view at the alarm.** `expireBounties('alarm')` removes them on the first frame of the alarm shot. The camera only turns to the sky about 0.8 s later. | `index.html:28053`, `28021` | Medium, if the presenter wakes a bounty and leads it back to the HQ. | Remove them at the shot's `sky` beat (`loopCineEvents`, `at('sky', 0.55)`). Or let awake ones join the wave and mark the post cleared. About 10 lines; Grokbot's. |
| 5 | **Test t80 fails here: "a spider on a line that grazes the corner takes one with room".** It failed 3 of 3 runs (in pairs and alone), with different numbers each time (end clearance 0.83, 0.86, then 0.00 m). It passed 9/0 on Jerry's machine in the last full suite. Probably timing-sensitive on a slower machine, but I couldn't rule out a real case of a spider parked behind the HQ corner. That would keep a night from ending. | `tools/tests/t80.js:101`, `index.html:36998` | Low. The 20-night headless sim (GB-56) had 0 stuck. | Grokbot: make the check tolerant of frame rate, or confirm on Jerry's GPU. Demo tip: if a night won't end, check the minimap for a spider behind the HQ and walk round the corner. |
| 6 | Dying during the last-kill finisher (for example a bomber's blast, acid or his own grenade) clears the finisher but leaves `slowMoT` set. The start of the burial plays at 0.32× speed for up to about 3 s. | `index.html:26601`-`26604` | Low | Add `slowMoT = 0;` in that game-over branch (1 line). |
| 7 | Bounty posts are picked with no distance check from the marine. They spawn in the first frames of prep, before the morning shot moves him to spawn at 1.7 s. If he ended the night at a landmark, 3 to 8 guards can appear around him already awake. | `index.html:27992` | Low | Add `&& Math.hypot(p.x - player.position.x, p.z - player.position.z) > 40` to the filter (1 line). |
| 8 | Test t41 fails here with "cave grab running". Not a game bug: it clicks Play and waits a fixed 2.5 s. On a slower machine the insertion hasn't reached `startMode`, so `beginScriptedKill` returns early. Same issue as GB-49's heads-up. | `tools/tests/t41.js:38` | None (test only) | Use `startMatch(T, 'Jerry')` from `lib.js` (Claude's test). |
| 9 | Debug hooks only: calling `skipPrep()` during the alarm runs `beginWave` twice (double sting and banner). Nights 21 and later reuse plans 13 to 20, so a guardian night there shows the wrong scouting tactic text. | `index.html:37720`, `ui/scouting.js` | None in a demo | Guard `skipPrep` with `if (hq.seq) return;` if it is ever wired to a key. |

## Checked and fine

- **Syntax.** `node --check` is clean on every inline script in `index.html`: the one classic script and the one module script (about 2 MB). It is also clean on all 265 tracked `.js`/`.mjs` files outside `vendor/`, and on the main module after the fixes.
- **Unit tests.** `node --test ui/*.test.mjs`: 99 pass, 0 fail.
- **Renames in `d78e7b3`.** `finGrade`, `poiPostList`, `placePostGuards`, `wakePoiGuards(reason, post)`, `weaponPrice` and `equipmentPrice` all resolve, with no stale callers.
- **Equipment prices.** `equipmentPrice` throws on a non-integer price or on night 0. Every price table is whole numbers, and the shop, the weapon wheel and the akimbo banner are only reachable with `day >= 1`.
- **The loop.** The Night Complete card runs each choice once. In the test page, two clicks and an Enter on Proceed to Morning moved day 1 to 2 with no alarm. The same on Next Night moved day 2 to 3 with exactly one alarm. `loopNextNight`, `loopMorning` and `hqStartWave` refuse while an alarm or a shot is running. `startPrep` advances the day by exactly 1. The finisher fires once and clears its classes and the canvas filter on game over and reset.
- **Restart.** Play again runs `resetGame` then `startMode`. It resets the alarm, the shots, the finisher, slow motion, the sky, the card, the bounties (`run-reset`), the briefing and pause. The real-game run saw day 0 and `idle` on the title, then a clean day 1.
- **Bounties.** Nothing can throw: missing landmarks, no candidates and zero guards are all handled. A bounty can't pay twice or pay after it expires. Guards are gone before the wave, so they can't stall a night.
- **Scouting.** `getWavePreview` is cheap and returns null for day 0 and for mismatched days. `POI.caves` has no holes. `buildScoutingReport` handles rest nights and unknown tricks. The minimap redraws at most 30 times a second.

## Browser tests

Chromium at `/opt/pw-browsers/chromium`. It had to run with `--no-sandbox` through a wrapper passed as
`CHROME=`, because the container runs as root; `tools/cdp.mjs` was not changed.

`node tools/tests/run-all.mjs t41 t60 t61 t72 t80 t81 t82 t83 --jobs 2`: 8 checks, 141 pass, 2 fail.
The two failures are t41 (row 8) and t80 (row 5). t60 37/0, t61 22/0, t72 26/0, t81 5/0, t82 4/0, t83 31/0.

After the fixes, the tests that touch the loop, the alarm and death:
`run-all.mjs t34 t37 t60 t61 t69 t70 t71 t72 t73 t74 t81 t82 t83 --jobs 2`: 13 checks, **246 pass, 0 fail**.

**The real game, headless.** Software rendering (WebGL2, about 1 fps) ran two runs:

- run 1: night 1, Proceed to Morning, night 2 with a bounty, Next Night, then death on night 3;
- Play again;
- run 2: night 1, double-clicked Proceed to Morning, night 2, Next Night.

**0 page errors.** The 6 console warnings are all WebGPU-unavailable or software-driver notes.

The runner rewrites `crew/tests.json`. That change was discarded and is not committed.

## Not verified

- **Anything on a real GPU.** The headless run used software rendering at about 1 fps, too slow for timing or visual checks.
- **Frame rate** with bounty guards in prep, from night 2, now that the flow field runs through prep.
- **The full `npm test` suite.** Only the tests listed above were run.
