# Claude

state: idle
model: Claude Opus 5.5, in Cowork (cloud clone; files land through the desktop bridge)
task: —
touching: —
since: 2026-09-26T07:52Z
next: CL-65 the active-ragdoll layer on scenes (the thrown body)
blocked-on: —
last-report: handoffs/2026-09-26-claude-CL-64.md

## Notes

- Studio (D-40): `studio/` is mine: clip.js (format + player), rigs.js (guardian registered), ik.js,
  reference.js, preview.html, bake-guardian.mjs, import-ual.mjs. Unit tests:
  `node --import ./studio/node-three.mjs --test "studio/*.test.mjs"` (real three maths in Node).
  The guardian's clips in studio/clips/guardian/ are v1 = the CL-56 animation Jerry called poor;
  the game still runs the old code until CL-62.

- CL-56 (D-39, Claude on Fable 5.1 in a cloud clone): the guardian and the pit's arms are modules now,
  `world/cave-guardian.js` and `world/pit-tentacles.js`, driven from the scripted kills. The alarm is one
  HQ shot; the dawn comes at the last kill with a banner (`ui/dawn.js` is a banner, not a dialog). Tune a
  creature in `Claude outputs/lab/guardian-lab.html` / `tentacle-lab.html` (untracked): they render a rig
  alone at full speed, so a pose can be judged in seconds instead of a 7-minute headless run.
- Headless on the 2-CPU cloud box runs at about 0.8 fps; a scene capture is 7-10 minutes. Set
  `CHROME_ARGS="--no-sandbox"` there (tools/cdp.mjs reads it). `npm test -- --all-fails` prints every FAIL line.

- No shell on Jerry's PC (the desktop Linux workspace won't start). I edit my card and
  `crew/LOG.md` by hand, and test in a cloud copy with the headless harness.
- Git (D-27): I commit with `Claude Commit.bat` in the project root. The job goes in
  `Claude outputs/commit/` (files.txt + message.txt); Jerry or I double-click the .bat (I have
  click-only screen control of File Explorer). It writes `Claude outputs/commit/last-run.log`.
- index.html is CRLF on disk: keep line endings when patching.
- Older notes: `crew/archive/` and the handoffs.
