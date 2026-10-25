# Claude

state: working
model: Claude Opus 5.5 (Cowork, cloud)
task: CL-261 The marine's moves as studio clips (N6, N25, N20)
touching: studio/ (import-cmu.py new, clips/marine/), assets/anim/reference/ (cmu.json new), index.html (the unarmed run, the blades, the ladder)
since: 2026-10-25T06:10Z
next: CL-261, then the uzi's first-person carry (CL-260 follow-up), CL-263's gate when GP-19969 lands
blocked-on: —
last-report: handoffs/2026-10-25-claude-CL-260-part2.md

## Notes

- 2026-10-25: headless Blender is installed in the cloud box (`pip install bpy`, 5.2 LTS): studio/import-cmu.py reads the CMU FBX clips (huggingface gbionics/cmu-fbx; credit mocap.cs.cmu.edu). The 2-core box's software renderer is slow with the gun in view in first person: give first-person eases 14-20 s in tests.

- 2026-10-19 01:47Z: t93: ChatGPT does the feet (contract in my 01:47Z request: game-time sampling, 5 cm floor, 0.20/0.30 m), Grokbot the headshot line after her. Cursor asked to commit (git's last commit 10-18 14:31Z; check .git/logs/HEAD by staging it). Night packs can start (board, Waiting on Jerry).

- 2026-10-19, D-81 (Jerry, in chat): "Cut me out of the loop for approval for the time being. Make decisions based on what seems best." Anything that would wait for his yes comes to me as a request; I decide, log it and give the reason. Still his: his files, money and accounts, publishing outside the repo (the 1.0.0 release), his own orders. Board orders, AGENTS.md rule 6, docs/decisions.md.

- 2026-10-19 board pass: frame time is 1.0's gap. Nights 31-35 fps on his 5080 whatever the draws (476-640); docs/budgets.md "2026-10-19". CU-156 (bench --prof) then AG-86 (his GPU) then CL-211. AG-85's report copied AG-82's megaswarm numbers: check Antigravity's numbers against the raw lines. Headshots in tests need headHit since GP-19885 (confirmedHead); t224's pistol check is stale since GP-19894's two handgun rows.

- CL-199 (2026-10-15): the crew board overhaul. Start a session with `node crew/crew.mjs me claude`. Lead-only: `reviewed --before <day>`, `settle` (requests), `archive --days 3` (log/requests; run it every few days), `tidy`. The panel's "Needs you" is Jerry's list: keep the board's queues and "Waiting on" current, it is drawn from them. Old board: crew/archive/board-2026-10-15.md.

- CL-198 (2026-10-15): fabric. studio/marine-cloth.js liveCloth (linear-blend skin: geometry in the root at the bind pose, weights per bone, bends before each draw). Legs: [lowerBody, legG, knee, ankle]; seat: [lowerBody, legL, legR]; sleeves: [torsoG, armG, elbowG]. Bare forearm ends exactly at ChatGPT's wrist bridge ring (elbow y -.18, .037/.036). t146 counts: sleeveRolled 2 per arm, legShort 2 per leg. Tests in the fake three never call onBeforeRender, so the cloth stays at bind pose there.


- 2026-10-15, Jerry's rule (every session): one game test at a time on his PC (AGENTS.md rule 16, Game-test slot at the top of the board). The queue is automatic now (CU-146): `node crew/crew.mjs slot run/status`. Claude's own headless runs are in the cloud workspace (a separate computer): one instance, one worker at a time, logged. Any test on Jerry's PC goes through the slot. Never close Jerry's windows or another agent's processes.


- CL-197 (2026-10-15): Jerry's marine model fixes. Hats are studio/marine-hats.js (buildMarineHats, called from makeMarine); ears/hair/seam in ui/marine-face.js (buildEar, weldSeam, headRadiusAt); marine-body.js sleeves/shoulders/elbows/forearms/seat. sleeveRolled must stay 2 groups per arm (t146). Not run: npm test. Needs Antigravity's eyes.


- CL-196 (2026-10-14): the inspector is studio/inspector/ (README.md), the game booted with ?inspect; index.html's part is the inspectHost() block before tick() and three lines in tick(). Real-renderer probes: /home/claude/b3/insp196.mjs, sheet196.mjs (contact sheet), moves196.mjs, feat196.mjs. Headless WebGPU boots fine but its canvas cannot be read or screenshotted: pictures on WebGL. pkill -f with a pattern that matches the shell kills the shell (exit 144): kill by PID.


- Test ids: check tools/tests for tNNN.js before naming a new one (I overwrote Grokbot's twice on 2026-10-05).


- Headless on the 2-CPU cloud box runs at about 0.8 fps; a scene capture is 7-10 minutes. Set
  `CHROME_ARGS="--no-sandbox"` there (tools/cdp.mjs reads it). `npm test -- --all-fails` prints every FAIL line.


- Board tools (2026-09-29): `crew.mjs newid <agent> "<what>"` for any new task id; `crew.mjs tidy` archives finished tasks (I run it). Decisions: one line on the board, full text in docs/decisions.md (add both).

- No shell on Jerry's PC (the desktop Linux workspace won't start). I edit my card and
  `crew/LOG.md` by hand, and test in a cloud copy with the headless harness.

- Git (D-27): I commit with `Claude Commit.bat` in the project root. The job goes in
  `Claude outputs/commit/` (files.txt + message.txt); Jerry or I double-click the .bat (I have
  click-only screen control of File Explorer). It writes `Claude outputs/commit/last-run.log`.

- index.html is LF on disk since 2026-10-25 00:45Z (it was CRLF): keep LF when patching; ui/strings.js is CRLF.

- Older notes: `crew/archive/` and the handoffs.
