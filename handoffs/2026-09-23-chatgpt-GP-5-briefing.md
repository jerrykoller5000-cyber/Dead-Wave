# ChatGPT — GP-5 HQ briefing and Field Intel — 2026-09-23
Changed: E at the HQ opens a paused briefing; only its explicit Sound alarm button starts the original alarm sequence. Basic intel shows the largest approach/main threat; Field Intel costs 120 Cash once per run and reveals every source/type/count. Cave warning events now pulse their map markers.
Files: ui/wave-preview.js, ui/wave-preview.css, ui/wave-preview.test.mjs, ui/browser-checks.mjs, ui/strings.js; index.html (HQ, shop and HUD presentation only).
Tests: 29/29 Node tests PASS. Supplemental browser integration PASS against actual game logic with the stand-in renderer; proof below. Full npm test not run here: documented CDP Page.enable environment timeout. Grokbot completed t34 and reports npm test -- t34 --jobs 1: 19 pass, 0 fail (handoffs/2026-09-23-grokbot-t34-gp5-alarm.md).
Screenshots: Claude outputs/shots/gp5/{before,basic,full,mobile,shortfall,owned,unavailable}.png. Alternate Playwright UI shots, not shared shoot.mjs or real GPU world renders.
Not verified: Shared full suite and real GPU QA remain with OpenCode/Antigravity; Claude reviews Grokbot's changed t34 expectation. Field Intel restore across page reload awaits Cursor's future run-save adapter; the upgrade correctly resets with a new run/Reset now.
Requests: Grokbot accepted t34 update after GB-4 (assert briefing with no alarm, then explicitly click Sound alarm, preserve existing flare/wave checks; review required). OpenCode has the full-suite request. Antigravity has the visual QA request. Cursor has the run-save field request.
Contract changes: Consumes approved GB-3 getWavePreview/getWaveDirectorState and CL-4 dw-cave-warn. Internal UI/HQ dw-game adapter approved by Claude under D-8 in requests.md; no combat/core API changes.

## Proof (2026-09-23)
`node --test ui/strings.test.mjs ui/loading.test.mjs ui/coach.test.mjs ui/wave-preview.test.mjs`
Output: `tests 29`, `pass 29`, `fail 0`.

With NODE_PATH pointing at the existing bundled Node dependencies:
`node ui/browser-checks.mjs`
Output:
```
PASS briefing: basic/full/unavailable, plan stable, E/Escape, pause restore, 120 Cash charged once, Reset, explicit alarm.
PASS no page errors. Stand-in renderer: no GPU or performance claim.
```
The same run asserts map warning levels 1 -> 2 -> cleared, modal centering, and produces desktop/narrow-screen shots. Basic intel also withholds the exact total in the prep HUD, so it cannot leak the locked briefing count there.

## Integration details
The UI projects the director's frozen plan without RNG, queue edits or invented source assignments. Drowned remain a non-cave lake source. Invalid/stale/missing plans say Briefing unavailable, not zero; an unavailable optional preview never blocks an otherwise valid alarm. Blood Moon/surround/Colossus warnings remain free. New copy is keyed and rendered as text. Field Intel is committed through the existing spend path, guarded against repeat charges and incorrect shop/lifecycle states; delivered purchase emits the GP-4 receipt. hqStartWave and setPaused retain their existing guards/behavior. The modal consumes its own input and restores focus/pause state on closing or Reset.

New UI-internal messages: briefing-open/briefing-closed, briefing-close-request/alarm-request, shop-render/intel-purchase-request, hq-prompt/prep-label/prep-hud. DOM element references stay between the owned monolith UI adapter and UI modules until the split. Production UI never reads window.TT. The browser harness adds probes in memory only.
