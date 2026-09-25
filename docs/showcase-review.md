# Showcase review: 2026-09-25

Reviewed `feature/Phis-changes` at `05f2b69`, which includes `d78e7b3`, the only recent commit that
changes game code. The commits before it are QA and test tools. Scope: anything that could break or
embarrass the game in a 20-minute demo. No features were added.

Branch `cloud/showcase-review`. It has two one-line fixes, each in its own commit, plus this file.

## Found

Likelihood means the chance of hitting it in a 20-minute demo.

| # | Problem | Where | Likelihood | Fix |
|---|---------|-------|------------|-----|
| 1 | **Bounties have no player-facing UI yet.** From night 2, 3 to 8 sleeping zombies appear at a random landmark with no notice. Clearing them shows only the camp-cleared banner and one extra skull. At the alarm they silently vanish. GP-43, the HQ board list, is still open. Nothing in `ui/` listens for `bounty-posted`, `bounty-done` or `bounty-expired`. | `index.html:27687` (`bountiesDue`), `28007`-`28071` | **High** if the demo reaches night 2. Not a crash, but it looks unfinished. | Land GP-43 before the demo. Or turn bounties off for the demo: `bountiesDue = false` at line 27687 (1 line; Jerry's or the lead's call, so not changed here). Or tell the presenter. |
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
- **The loop.** From reading the code, the Night Complete card runs each choice once, even with a double click, Enter plus a click, or Esc. `loopNextNight`, `loopMorning` and `hqStartWave` refuse while an alarm or a shot is running. `startPrep` advances the day by exactly 1. The finisher fires once and clears its classes and the canvas filter on game over and reset.
- **Restart.** Play again runs `resetGame` then `startMode`. It resets the alarm, the shots, the finisher, slow motion, the sky, the card, the bounties (`run-reset`), the briefing and pause. The real-game run saw day 0 and `idle` on the title, then a clean day 1.
- **Bounties.** Nothing can throw: missing landmarks, no candidates and zero guards are all handled. A bounty can't pay twice or pay after it expires. Guards are gone before the wave, so they can't stall a night.
- **Scouting.** `getWavePreview` is cheap and returns null for day 0 and for mismatched days. `POI.caves` has no holes. `buildScoutingReport` handles rest nights and unknown tricks. The minimap redraws at most 30 times a second.

## Browser tests

Chromium at `/opt/pw-browsers/chromium`. It had to run with `--no-sandbox` through a wrapper passed as
`CHROME=`, because the container runs as root; `tools/cdp.mjs` was not changed.

`node tools/tests/run-all.mjs t41 t60 t61 t72 t80 t81 t82 t83 --jobs 2`: 8 checks, 141 pass, 2 fail.
The two failures are t41 (row 8) and t80 (row 5). t60 37/0, t61 22/0, t72 26/0, t81 5/0, t82 4/0, t83 31/0.

After the fixes: see the pull request description for the regression run.

The runner rewrites `crew/tests.json`. That change was discarded and is not committed.

## Not verified

- **Anything on a real GPU.** The headless run used software rendering at about 1 fps, too slow for timing checks. Its page-error count is still pending.
- **Frame rate** with bounty guards in prep, from night 2, now that the flow field runs through prep.
- **The full `npm test` suite.** Only the eight tests above, plus the regression set in the pull request.
