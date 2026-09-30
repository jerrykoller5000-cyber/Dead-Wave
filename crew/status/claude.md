# Claude

state: active
model: Claude Opus 5.5 (High), in Cowork (cloud; files land through the desktop bridge)
task: CL-90 R3 · P-116 part 2. The draw and holster moves through the studio
touching: studio/, index.html (the carry rig block)
since: 2026-09-30T18:55Z
next: R5: CL-92 (lightning), CL-93 (the rabbit), CL-79 (the secret's spec), CL-98 (the Hollows' spec)
blocked-on: —
last-report: handoffs/2026-09-30-claude-CL-97.md

## Notes

- CL-97 (2026-09-30): dressParts/dressMarine sit just before makeMarine in index.html; makeMarine builds every variant in its own group (userData.dress: hats, eyes, sleeveDown/Rolled, legLong/Short, gloveOn, handBare, mats). Review sheet: marinesheet wardrobe-* views (they go last). My first pass (08:56-10:50Z) was lost with its cloud copy: keep work on Jerry's disk, and commit, before a session ends.

- CL-73 (2026-09-30): the boat is world/boat.js, wired in index.html by boatRig() and a 'dw-game' listener (GB-85's 'extraction' 'due'/'gone'). Review sheet: marinesheet boat-* views (they step boat.update). Test t145. Jerry's notes land in review/boat/notes.md; v2 is probably a proper hull with a pointed bow.

- CL-90 part 1 (2026-09-30): the carry rig is a block after takeOutGun in index.html (buildCarryRig, carryPlan, applyCarryPlan, updateCarriedGear). Review sheet: tools/marinesheet.mjs carry-* views on a fresh marine via TT.carryPreview. Part 2 = the draw/holster moves (studio clips). Jerry's notes land in review/marine-carry/notes.md.

- CL-94 (2026-09-30): the marine's review sheet is `node tools/marinesheet.mjs --out <dir>` (rows of fresh marines on a sky backdrop, heads, the field at dusk, night, day); on the cloud box set CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome and CHROME_ARGS=--no-sandbox, about 90 s a view. `userData.wardrobe` is the per-item contract for CU-70. Next version goes in review/marine-fidelity/v2 when Jerry writes notes.

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

- Board tools (2026-09-29): `crew.mjs newid <agent> "<what>"` for any new task id; `crew.mjs tidy` archives finished tasks (I run it). Decisions: one line on the board, full text in docs/decisions.md (add both).
- No shell on Jerry's PC (the desktop Linux workspace won't start). I edit my card and
  `crew/LOG.md` by hand, and test in a cloud copy with the headless harness.
- Git (D-27): I commit with `Claude Commit.bat` in the project root. The job goes in
  `Claude outputs/commit/` (files.txt + message.txt); Jerry or I double-click the .bat (I have
  click-only screen control of File Explorer). It writes `Claude outputs/commit/last-run.log`.
- index.html is CRLF on disk: keep line endings when patching.
- Older notes: `crew/archive/` and the handoffs.
