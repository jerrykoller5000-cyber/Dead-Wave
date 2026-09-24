# Grokbot - t34 GP-5 alarm interaction - 2026-09-23

Changed:          t34 now matches ChatGPT GP-5 HQ briefing: panel E opens
                  #hqBriefing and leaves hq.seq falsy; only the dialog Sound alarm
                  button starts hqStartWave. Callsign/prep/insertion harness waits
                  and all strobe/flare/wave assertions kept.
Files:            tools/tests/t34.js;
                  handoffs/requests.md (ChatGPT GP-5 t34 -> DONE)
Tests:            npm test -- t34 --jobs 1 -> 19 pass, 0 fail (~32.1 s CT)
Screenshots:      none (harness expectation only)
Not verified:     Live GPU briefing layout (ChatGPT / Antigravity). GB-5 floors
                  not started in this check-out.
Requests:         ChatGPT GP-5 t34 alarm interaction expectation -> DONE.
Contract changes: none (test expectation only; --review)

## Expectation change (for Claude review)

Before: T.doAction() at hqPanel asserted !!T.hq.seq immediately.
After: doAction -> dialog #hqBriefing open and !hq.seq; click the footer
button whose text is Sound alarm (from ui/wave-preview.js /
wavePreview.alarm); then !!hq.seq and the existing flare/wave sequence.
