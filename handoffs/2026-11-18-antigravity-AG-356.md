# Antigravity AG-356 Handoff — SPITTER Restyle Plan Sheet (Review-Only)

**Worker:** Antigravity (`Gemini 4 Carbon`)  
**Task:** `AG-356` — SPITTER restyle plan sheet (J168 + D-190 shapes first, review-only; parked/wrapped cleanly ahead of `AG-357 PRIORITY`)  
**Verdict:** Done (review-only; zero game or studio source files modified).

## Changed
- None in game or studio source (`0` edits to `index.html`, `game/spitter-*.js`, `studio/*`).
- Review-only deliverables written to `review/AG-356/` and `qa/2026-11-18-AG-356/`.

## Deliverables (`review/AG-356/`)
- `review/AG-356/01-spitter-restyle-plan-sheet.jpg` — 3x5 comparison sheet (`OURS NOW` / `TRIPO REF` / `PROPOSED` blockout) at `front`, `3q`, `side`, `back` (`85%` body fill) + `head` close-up (`62%` head fill), normalized `H = 1.966 m` (`scale 1.05`), WebGPU Noon light.
- `review/AG-356/02-spitter-vs-bomber-side-by-side.jpg` — True-scale side-by-side against current neutral `bomber` (`1.988 m`) vs current & proposed `spitter` (`1.966 m`), including `BEFORE` and `AFTER` black-on-white silhouette comparisons.
- `review/AG-356/spitter-restyle-plan.md` — One-page shape change table, acid readability plan (mouth/throat spit source + chin drool + mesh-conforming chest streaks), bomber separation summary, and preserved runtime hooks.
- Orthographic silhouette overlays:
  - `review/AG-356/spitter-ours-vs-tripo-overlay.jpg`
  - `review/AG-356/spitter-ours-vs-proposed-overlay.jpg`
  - `review/AG-356/spitter-tripo-vs-proposed-overlay.jpg`

## Key Measured Findings (`qa/2026-11-18-AG-356/`)
- Current neutral `spitter.glb` (`5128` tris, `1.966 m`) vs `Claude outputs/J168/tripo/spitter/Spitter.glb` (look-only, scaled to `1.966 m`):
  - Shoulders: `0.913 m` -> `0.568 m` Tripo / `0.553 m` Proposed (`-38%` to `-39%`)
  - Waist: `0.553 m` -> `0.293 m` Tripo / `0.214-0.282 m` Proposed (`-47%+`)
  - Chest depth (side): `0.557 m` -> `0.275 m` Tripo / `0.286 m` Proposed (`-49%` to `-51%`)
  - Hips: `0.561 m` -> `0.443 m` Tripo / `0.433 m` Proposed (`-21%` to `-23%`)
  - Forearm / wrist: `0.144 / 0.074 m` -> `0.094 / 0.030 m` Tripo / `0.074 / 0.046 m` Proposed
  - Shin (`10% H`): `0.162 m` (boots) -> `0.059 m` Tripo / `0.079 m` Proposed (bare ankles)
- Current `bomber` (`1.988 m`) measures `1.094 m` shoulders, `0.802 m` waist, `1.266 m` belly width (`60% H`), `0.977 m` belly depth (`50% H`); switching Spitter to the gaunt frame creates an unmistakable silhouette split.

## Tests
- Slot run (`review/J168/export-glb.mjs --mode statue --neutral --types spitter --out qa/2026-11-18-AG-356/ours-neutral`): exited `0`.
- Slot run (`node qa/2026-11-18-AG-356/capture-ag356.mjs` on `WebGPUBackend`): exited `0`, `22` PNG frames + `qa/2026-11-18-AG-356/proposed-spitter.glb` (`[0.697, 1.9418, 0.4396]` unnormalized -> scaled to `1.9662 m`) + `qa/2026-11-18-AG-356/capture-report.json`.
- Measurements & sheets (`measure_glb.py`, `build_ag356_sheets.py`): exited `0`; all 4 output JPEGs visually inspected via `read_file`.
- Source verification: no edits to any game or studio files; Tripo `.glb` loaded read-only for comparison renders and never copied into `review/`.

## Not verified
- Live in-game runtime spit animation / `prepareSpitterJaw` vertex-cut test in `index.html` (out of scope for this review-only plan sheet).
