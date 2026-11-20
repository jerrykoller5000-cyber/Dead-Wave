# antigravity — AG-353 J168 live survivors okafor/brandt/pike noon 1600x1600 for Tripo — 2026-11-17

Changed:
- Captured the three LIVE survivors (`okafor` / trapper, `brandt` / ranger, `pike` / hikers) on RTX 5080 WebGPU (`index.html` `70e5dea8`) via inspector targets `person.okafor`, `person.brandt`, and `person.pike` (`survivor:<name>` catalog mapping) with nothing in hand (`UNARMED_ARMS`; Brandt has no M240 in `makeSurvivorFigure`, while Okafor and Pike carry their M4 slung on the back).
- Framed at `1600x1600` in `noon` lighting on the plain studio ground (`grid` off) using the AG-341 camera rule (`fov 34`, `85.0%` height fill, `width <= 90%`, `camY 70%`, `lookY 50%`) across `front` (`0°`), `3q` (`40°`), `side` (`90°`), and `back` (`180°`), plus built one contact sheet per survivor (`sheet-okafor.jpg`, `sheet-brandt.jpg`, `sheet-pike.jpg`).

Files:
- `qa/2026-11-17-AG-353/capture-ag353.mjs` (created — RTX 5080 WebGPU capture runner)
- `qa/2026-11-17-AG-353/build_ag353_sheets.py` (created — 12-frame validator and per-survivor contact sheet builder)
- `Claude outputs/J168/survivor-views/summary.json` (created — live source MD5s, framing metrics, and pixel hashes)
- `Claude outputs/J168/survivor-views/okafor/okafor-{front,3q,side,back}.png` (created — `1600x1600`)
- `Claude outputs/J168/survivor-views/brandt/brandt-{front,3q,side,back}.png` (created — `1600x1600`)
- `Claude outputs/J168/survivor-views/pike/pike-{front,3q,side,back}.png` (created — `1600x1600`)
- `Claude outputs/J168/survivor-views/sheet-okafor.jpg`, `sheet-brandt.jpg`, `sheet-pike.jpg` (created — 3 contact sheets)
- Zero game source files modified.

Tests:
- `node crew/crew.mjs slot run antigravity AG-353 --checks "AG-353 LIVE survivors okafor/brandt/pike 1600x1600 noon for Tripo" -- node qa/2026-11-17-AG-353/capture-ag353.mjs` (rule 16 slot lease, `WebGPUBackend`) -> PASSED exit `0`: `12/12` unique `1600x1600` PNGs (`0` page errors, `0` inspector errors, `0` build errors; `okafor` `h=1.5442m` `fillH=84.98..85.03%`; `brandt` `h=1.5464m` `fillH=84.99..85.02%`; `pike` `h=1.5609m` `fillH=84.98..85.03%`).
- `python qa/2026-11-17-AG-353/build_ag353_sheets.py` -> PASSED exit `0`: verified `4/4` unique pixel hashes per survivor and built all 3 contact sheets.

Screenshots:
- [sheet-okafor.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/Claude%20outputs/J168/survivor-views/sheet-okafor.jpg) — Okafor (`front`, `3q`, `side`, `back`; cover cap, vest, left-hip aid bag, back-slung M4, unarmed hands).
- [sheet-brandt.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/Claude%20outputs/J168/survivor-views/sheet-brandt.jpg) — Brandt (`front`, `3q`, `side`, `back`; boonie, aviators, beard, vest + pads, chest 7.62 ammo belt, no M240 in hand, unarmed hands).
- [sheet-pike.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/Claude%20outputs/J168/survivor-views/sheet-pike.jpg) — Pike (`front`, `3q`, `side`, `back`; backwards cap, rolled sleeves, bare hands, bare torso, right-hip wrench, back-slung M4, unarmed hands).

Not verified:
- Roof-mounted `M240B` variant (omitted by `makeSurvivorFigure`; only added by `addRoofCrew` in-match), non-noon lights, and moving animations.

Requests:
- Replied `DONE` to `CLAUDE DIRECTOR`'s `PRIORITY AG-353 (J168)` request with all output PNG and contact-sheet paths.

Contract changes:
- None.
