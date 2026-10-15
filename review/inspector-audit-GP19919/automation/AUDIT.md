# GP-19919 — inspector launcher and agent automation audit

Audit and fixes performed on 2026-10-14. This is a tooling audit; native model appearance is verified by the parent task's live inspector review.

## Fixed defects

- **P1: the BAT killed arbitrary port owners.** It called `taskkill /PID` for every process listening on 8975, then waited roughly one second rather than checking startup. The replacement launcher probes `/__inspect/health` for this checkout's resolved root and service identity, reuses that server, or starts a hidden owned Node server on a free port if 8975 belongs to something else. Checkout-specific state/log files and an exclusive launch lock avoid unrelated checkout interference. Missing/old Node and startup failures surface in the BAT instead of disappearing.
- **P1: malformed note JSON could terminate the local server.** `JSON.parse('null')` succeeds, followed by an uncaught `j.asset` or `j.preset` dereference in the request end handler. Invalid object shapes now return 400. Filesystem failures return 500 instead of terminating the server. Oversized UTF-8 payloads return 413.
- **P1: camera jobs accepted cross-origin/non-JSON requests.** The daemon can execute agent `eval` code and produce local artifacts, so a browser-origin boundary matters even on loopback. Jobs now require a local Host, a same-origin JSON POST (or the originless CLI), and a body no larger than 1 MiB. Non-object jobs cannot execute. The existing inbox remains the shared agent path.
- **P1: camera pictures reset the move being inspected.** `CamRig.target('marine')` called `DWInspect.show` on every shot, which stopped the live marine move. A shot of the current subject now reuses it if its variant/mode is unchanged; `--reset` explicitly requests rebuilding it.
- **P2: failed checks/batches could exit successfully.** `report()` set the failure exit code only when a top-level error string existed, and batches ignored contact-sheet failure. Failed results now produce a nonzero CLI exit code. Empty model checks are errors. Turnaround count and sheet dimensions are bounded.
- **P2: camera sessions and logs were shared across checkouts.** `%TEMP%/dead-wave-camera.json` and `.log` allowed a second checkout to hide the first checkout's running camera. These files now include a stable hash of the checkout root. The in-checkout inbox heartbeat path is unchanged.
- **P2: picture sidecars could not reproduce an inspection setup.** Sidecars now use `dw-camera-shot` schema version 2 and include `DWInspect.session()`. `--from` restores that recipe before applying the exact camera, avoiding an implicit target reselection. The PNG, contact-sheet thumbnail and session recipe are captured under the same frame hold.
- **P2: same-second note pictures overwrote each other.** The old image name truncated timestamps to the second. Picture names now retain milliseconds and add a random suffix; both notes retain their own images.

## Stable agent workflow

1. Run `node tools/camera.mjs start --inspect`; use `status` and `targets` for discovery.
2. Select the subject once, configure kit/display, then play the real move through `DWInspect.marine.play`. Subsequent same-target shots preserve the active move.
3. Keep a versioned inspector recipe with each shot. `shot --from <sidecar.json>` restores the inspection recipe and camera; active moves restart from the recipe, so this is reproducible setup rather than a saved simulation checkpoint.
4. Use unique inbox job filenames, write the complete JSON before exposing the final `.json` filename, and wait for the matching `.result.json`. The camera serializes jobs, but a shared last camera still belongs to the most recent job. Use explicit sidecars rather than an unrelated agent's implicit `move` state.
5. Treat nonzero CLI status, `{ok:false}`, broken check results and saved page errors as failures. Model smoke checks prove building/measuring/capturing, not anatomical motion correctness; review the resulting pictures and live motion.

## Evidence

Command: `node --test review/inspector-audit-GP19919/automation/automation.test.mjs review/inspector-audit-GP19919/automation/instance-bounds.test.mjs`

Final output: **51 tests, 51 pass, 0 fail, 0 cancelled, 0 skipped** (46 automation/HTTP cases plus 5 pinned-Three bounds parity cases). The tests cover native hidden Node server startup/readiness/reuse with a foreign port listener preserved, an absolute timeout for slowly streaming foreign listeners, checkout identity/isolation, malformed/oversized/cross-origin note and camera requests, filesystem failure survival, Unicode motion-lab compatibility, unique note pictures, failure exit codes, same-target animation preservation, versioned recipes, and a single held frame for PNG/thumbnail/metadata. Loopback fixture connections require execution outside this environment's network-restricted sandbox; the initial sandbox attempt reported `connect EACCES`, not a product failure.

Syntax checks: `node --check tools/inspector-launch.mjs`, `tools/serve.mjs`, `tools/camera.mjs`, `tools/camera-rig.js`, and `studio/notes-endpoint.mjs`.

Follow-up diagnostics used isolated headless browsers and closed only their own resources. Native browser/Edge launch fallback, GPU screenshots, inspector loading/FPS and actual pose replay are verified by the parent task separately. Temporary fixture artifacts remain under the OS temporary directory; the tests terminate only their own verified child server.

## Files and additive contracts

- `Open Marine Inspector.bat` → `tools/inspector-launch.mjs`.
- `tools/serve.mjs`: `GET /__inspect/health` responds with `{ok, service:'dead-wave-inspector', version:1, root, pid, fingerprint}`.
- `studio/notes-endpoint.mjs`: same success shapes and review paths; explicit 400/403/413/500 failure responses, distinct image filenames.
- `tools/camera.mjs`: sidecar schema version 2 with optional `inspect` recipe; old camera-only sidecars remain usable. Added `--reset`. Failed check/batch commands now exit nonzero. Session/log filenames are checkout-specific; existing old daemons should be stopped/restarted once after upgrading this tool.
- `tools/camera-rig.js`: same-subject inspection reuse unless `reset:true` or a different variant/mode is requested.

`DWInspect.session()` / `restore()` and their recipe schema are implemented by the parent task; these camera changes call that public API and do not depend on `_ix`.

## Full-suite startup diagnosis and verification follow-up

- Four retained baseline pages with normal intro preloads stayed at Connecting / 0% for 45 seconds, with no game-module load channel, no load event and no script error. The same pages with only their MP4 requests blocked booted in approximately 12 seconds.
- The buffered static server ignored byte ranges. Its full video responses occupied the browser's HTTP/1 connections, starving the module loads. `serve.mjs` now streams with 64 KiB buffers, handles single byte ranges (206 / Content-Range), invalid ranges (416), HEAD and disconnect cleanup; MIME/cache/root containment remain intact.
- The unchanged four baseline pages, with normal media restored, now reach the game in **15.7–16.4 seconds**, all with load events and TT, all eight video responses 206, and no script errors. Evidence: `parallel-boot-probe.json`, `parallel-boot-no-media.json`, `parallel-boot-after-range.json`.
- Original tinspect exposed two fake-renderer parity gaps: the missing `THREE.TSL` namespace (training containment reads it) and an empty `InstancedMesh.computeBoundingBox()` stub. The latter caused `Box3.copy(undefined)` at inspector stage.js:199. Both fake interfaces now match the pinned runtime; bounds are compared against real Three for translations, rotation, nonuniform/negative scale, changed matrices/count and empty instances. Existing test expectations were not changed. Before-fix evidence: `tinspect-probe.json`, `show-marine-probe.json`.
- Final original fixture command: `npm test -- tinspect t215 --jobs 1 --no-retry --all-fails` → **tinspect 22 pass / 0 fail (85.3s); t215 4 pass / 0 fail (35.2s); 26 pass / 0 fail total**. These are the unchanged repository tests, not rewritten inspector expectations.
- Server health now includes a fingerprint of the **loaded** serve/notes source. The launcher refuses a stale fingerprint and starts a fresh server on a free port while preserving the older listener; it cannot silently reuse pre-upgrade server code.

## Final screenshot input validation pass

Viewport strings and request arrays now validate **integer width/height 64–8192, at most 32 million pixels** in both the Engine constructor and the shot path, before any browser allocation. CLI numeric NaN/Infinity fail before JSON serialization can turn them into null/defaults. Framing, explicit camera coordinates/FOV, pan/zoom and HTTP request values are validated; negative angles and large finite world coordinates remain supported. Explicit zero check dimensions reach the API's rejection instead of being replaced by defaults.

Final command: `node --test review/inspector-audit-GP19919/automation/input.test.mjs review/inspector-audit-GP19919/automation/automation.test.mjs review/inspector-audit-GP19919/automation/instance-bounds.test.mjs` → **82 pass, 0 fail, 0 skipped**. This includes the subsequently added suppressor-target compatibility case. The held-shot mock reports the real viewport shape required by the new resize check; the sidecar fixture uses complete actual camera coordinates. Camera-operation assertions remain unchanged.
