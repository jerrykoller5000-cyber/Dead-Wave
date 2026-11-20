# Task: AG-341 (J167) — Whole LIVE 12-zombie roster on RTX 5080 (incl. Body7 landed 460d1acf)

- **Owner:** antigravity
- **Date:** 2026-11-17
- **Model:** Gemini 4 Carbon
- **Status:** DONE
- **Goal:** Capture the live tree as-is (zero review copies, zero swaps, zero edits) on RTX 5080 WebGPU across all 12 requested `ZOMBIE_TYPES` (`shambler, brute, feral, screamer, military, bomber, spitter, spider, demon, colossus, guardian, caveguard`) — `front`, `3/4 front-left`, `side (left)`, `back` in `noon` and `night` plus a `noon` `head` close-up (`9` PNGs/type = `108` PNGs + `12` labelled contact sheets + `summary.json`). Also satisfies ChatGPT 2's J167 Body7 landed `460d1acf` 5080 look (`sheet-guardian.jpg` & `sheet-caveguard.jpg`).

Changed:
- Capture and sheet generation artifacts only (zero game code modified):
  - `qa/2026-11-17-AG-341-roster/capture-ag341.mjs`
  - `qa/2026-11-17-AG-341-roster/build_ag341_sheets.py`
  - `review/AG-341/<type>/<type>-{noon-{front,3q,side,back,head},night-{front,3q,side,back}}.png` (`108` PNGs across `12` directories)
  - `review/AG-341/sheet-<type>.jpg` (`12` labelled sheets)
  - `review/AG-341/summary.json`

Tests:
- `node crew/crew.mjs slot run antigravity AG-341 --minutes 15 --checks "AG-341 LIVE 12-zombie roster 108 5080 shots" -- node qa/2026-11-17-AG-341-roster/capture-ag341.mjs`: exited `0`, `108/108` unique `1200x1200` `WebGPUBackend` PNGs (`0` page errors, `0` inspector errors), `buildError: null` and `settledStand: true` for all `12/12` types.
- `python qa/2026-11-17-AG-341-roster/build_ag341_sheets.py`: exited `0`, verified `9/9` unique pixel hashes per type and built all 12 sheets (`sheet-shambler.jpg`..`sheet-caveguard.jpg`).

Not verified:
- Additional `ZOMBIE_TYPES` keys (`leaper`, `drowned`) exist in `index.html:44213-44224` (`14` total keys), while `AG-341` captured the exact `12` listed types per CLAUDE DIRECTOR's prompt.
- `spider` wide stance uses `90.0%` width clamping (`43.8%..56.0%` height fill) so its six outstretched limbs do not clip off the left/right edges; upright types (`shambler, brute, feral, screamer, military, bomber, spitter, demon, colossus, guardian, caveguard`) frame at `84.9%..85.0%` height fill.

## Served Live File MD5s (`review/AG-341/summary.json`)
- `index.html`: `9311196f`
- `studio/zombie-guardian-detail.js`: `460d1acf` (Body7 landed)
- `world/cave-guardian.js`: `d3cd4dfc`
- `studio/zombie-concepts.js`: `7a178a93`
- `studio/zombie-detail.js`: `1b90fa9d`
- `studio/zombie-humanoids.js`: `3d96fdb9`
- `studio/zombie-brute.js`: `7e4e2fa3`
- `studio/zombie-brute-anatomy.js`: `7071c3d8`
- `studio/zombie.js`: `0e074950`
- Motion & gameplay zombie files: `game/shambler-motion.js` (`3f410861`), `game/feral-motion.js` (`bd6536c0`), `game/spider-motion.js` (`c26a6572`), `game/spitter-motion.js` (`f2db5914`), `game/leaper-motion.js` (`f6252825`), `game/drowned-motion.js` (`3fb1af63`), `game/zombie-abilities.js` (`1baafee8`), `game/zombie-ability-visuals.js` (`c6d12f75`), `game/zombie-clips.js` (`df607378`), `game/zombie-feet.js` (`e116eace`), `game/zombie-headshots.js` (`7a81679f`), `game/zombie-limits.js` (`e51526d5`), `game/zombie-falls.js` (`316d4179`), `game/zombie-react.js` (`fa14c0aa`).

## Sheet Visual Summary
- **Shambler, Brute, Feral, Military, Bomber, Spitter, Screamer, Spider, Demon, Colossus** (`statue` mode, standing idle): all 10 built cleanly on `1200x1200` studio ground; glow eyes, emissive boils/veins/embers/fist flames read clearly across noon and night; head close-ups center cleanly on face/jaw/teeth/tongue/horns/mandibles. Note `screamer` includes its translucent outer scream aura (`boundsH = 2.76 m`); `spider` (`0.92 m` tall) clamps to `90%` width so all six planted tips remain inside the frame.
- **Guardian & Cave Guard** (`live` mode settled idle via `guardianBossDbg.update` with forward `+Z` gaze): `Body7` (`460d1acf`) pelvis and proximal thigh armor/rocky plates render cleanly (`meshes=5` on `guardian`, `meshes=3` on `caveguard`) across all noon and night angles and head close-ups.

## Outputs
- [`review/AG-341/summary.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-341/summary.json)
- [`review/AG-341/sheet-shambler.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-341/sheet-shambler.jpg) · [`sheet-brute.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-341/sheet-brute.jpg) · [`sheet-feral.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-341/sheet-feral.jpg) · [`sheet-screamer.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-341/sheet-screamer.jpg)
- [`review/AG-341/sheet-military.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-341/sheet-military.jpg) · [`sheet-bomber.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-341/sheet-bomber.jpg) · [`sheet-spitter.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-341/sheet-spitter.jpg) · [`sheet-spider.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-341/sheet-spider.jpg)
- [`review/AG-341/sheet-demon.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-341/sheet-demon.jpg) · [`sheet-colossus.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-341/sheet-colossus.jpg) · [`sheet-guardian.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-341/sheet-guardian.jpg) · [`sheet-caveguard.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-341/sheet-caveguard.jpg)
