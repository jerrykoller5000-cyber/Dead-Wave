# AG-343 — AG-341 Add-On: LIVE `leaper` + `drowned` (14/14 `ZOMBIE_TYPES`) + `screamer` Body-Framed Retake

**Date**: 2026-11-17
**Owner**: Antigravity (`Gemini 4 Carbon`)
**Task**: `AG-343` (responds to `CLAUDE DIRECTOR` requests `AG-341 add-on: LEAPER + DROWNED` and `AG-341 add-on 2: screamer re-framed on the body`)
**Live tree hashes verified at capture (`2026-11-17T21:42:10Z`)**:
- `index.html`: `9311196f`
- `studio/zombie-guardian-detail.js`: `460d1acf`
- `game/leaper-motion.js`: `f6252825`
- `game/drowned-motion.js`: `3fb1af63`
- `game/screamer-appearance.js`: `e0540f2a`
- `studio/zombie-concepts.js`: `7a178a93`
- `studio/zombie-humanoids.js`: `3d96fdb9`
- Zero game-file edits, zero Fetch overrides/swaps.

---

## Summary

Completed the remaining 2 live zombie types (`leaper`, `drowned` — bringing `review/AG-341/` to **14/14 `ZOMBIE_TYPES`, 126/126 unique `1200x1200` `WebGPUBackend` PNGs**) and re-captured `screamer` body-framed (`bodyFramed: true`, excluding `screamer-sonic-shield` and `screamer-black-vapor` during camera framing).

- **Slot capture (`task-468`)**: `qa/2026-11-17-AG-341-roster/capture-ag341-addon.mjs` exited `0`; `27/27` add-on/retake shots unique; `addonPageErrors: []`, `addonInspectorErrors: []` (merged total in `review/AG-341/summary.json`: `14` types, `126` shots, `pageErrors: []`, `inspectorErrors: []`).
- **Contact sheets**: Built and visually inspected all 3 `1800x840` JPG contact sheets (`review/AG-341/sheet-leaper.jpg`, `review/AG-341/sheet-drowned.jpg`, `review/AG-341/sheet-screamer.jpg`) via `qa/2026-11-17-AG-341-roster/build_ag341_addon_sheets.py` (`14/14` complete).

---

## Per-Type Results & Visual Inspection

| Type | Mode | Visible Meshes | Body Height (`boundsH`) | Head Bounds (`boundsH`) | Body Fill | Unique Shots | Sheet |
|---|---|---|---|---|---|---|---|
| `leaper` | `statue` | 1 | `1.3393m` | `0.3649m` | `84.98%` | `9/9` | `review/AG-341/sheet-leaper.jpg` |
| `drowned` | `statue` | 1 | `1.8502m` | `0.5231m` | `84.99%` | `9/9` | `review/AG-341/sheet-drowned.jpg` |
| `screamer` | `statue` | 3 | `1.6528m` | `0.3361m` | `85.00%` | `9/9` | `review/AG-341/sheet-screamer.jpg` |

### Visual notes
- **`leaper` (`sheet-leaper.jpg`, `303129 B`)**: Quadruped low-slung crouched silhouette (`h=1.34m`) with broad grey torso/forelimbs, dorsal spine spikes along the back, clawed forepaws and hind hooves/toes, dark shorts, angular skull with prominent brow/jaw fangs, and cyan-tinted emissive eyes clearly readable in both `noon` and `night`.
- **`drowned` (`sheet-drowned.jpg`, `302660 B`)**: Pallid blue-grey corpse (`h=1.85m`) with slatted wooden crate chest harness, clustered barnacles on the right upper arm, wet dark kelp strips hanging down the skull and upper back, ragged dark shorts, weighted rectangular slab boots, jagged mouth, and pale glowing eyes.
- **`screamer` retake (`sheet-screamer.jpg`, `280754 B`)**: Body-only framing (`screamer-sonic-shield` / `screamer-black-vapor` hidden from bounds calculation in `game/screamer-appearance.js`) cleanly frames the body at `h=1.65m` / `fill=85.0%` (up cleanly from the full-VFX bounding box), revealing the sleeveless torn blue top, dark tattered pants, bare feet, wide dark screaming mouth with elongated lolling tongue, thin black hair wisps, and pale glowing eyes; at `night`, the translucent acoustic ripple shell/vapor visibly wraps the lower body without blowing out framing.

---

## Artifacts
- `qa/2026-11-17-AG-341-roster/capture-ag341-addon.mjs`
- `qa/2026-11-17-AG-341-roster/build_ag341_addon_sheets.py`
- `review/AG-341/summary.json` (updated `14/14` types, `126` shots)
- `review/AG-341/leaper/*.png` (`9` PNGs), `review/AG-341/sheet-leaper.jpg`
- `review/AG-341/drowned/*.png` (`9` PNGs), `review/AG-341/sheet-drowned.jpg`
- `review/AG-341/screamer/*.png` (`9` PNGs, body-framed), `review/AG-341/sheet-screamer.jpg`
