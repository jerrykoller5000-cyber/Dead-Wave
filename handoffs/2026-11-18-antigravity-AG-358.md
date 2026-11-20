# antigravity — AG-358 J164 short native unarmed+pistol right-thigh paired shots (GT-20124) — 2026-11-18

Changed:
- Ran ChatGPT 2's Director-cleared short native WebGPU paired comparison (`review/GT-20124/native-mag-short-ag-v1.mjs`) via the game-test slot on the live `668e97a3` baseline (`before`) vs J164 draft package (`72e543b4`, `package`) for `unarmed` and `pistol` across `front`, `3q`, and `right-thigh` at noon, inspected all 12 originals + visibility diagnostics, and composed matched comparison sheets. No production files, tests, or source models were modified.
- Visual findings on the thighs:
  - **Exposed front-thigh belt magazines FIXED in package**: In `before`, two dark rectangular belt-magazine blocks protrude in front of both upper thighs across all 6 frames (`all16Inside: false`; hiding `mags` on `before/unarmed-front.png` alters `2297` pixels). In `package`, both front-thigh magazine blocks disappear into the two closed belt pouches (`all16Inside: true` across all 6 frames, `failures: []`, `vestSlotsExact: true`, `instanceCapacity: 5`, `differentPixels: 0` when hiding `mags` in `unarmed-right-thigh` and `pistol-right-thigh`).
  - **Other thigh gear still visible (separate from `mags`, unchanged from `before`)**: In `pistol` pose only, on the character's outer left thigh (`+X`, foreground of the `right-thigh` camera) a dark vertical rectangular plate/holster slab above the pocket, two green grenades, and the rear brown pouch remain visible, and on the character's outer right thigh (`-X`, viewer-left edge in `pistol-front` and `pistol-right-thigh`) the empty drop-leg holster block remains visible; both thigh bands remain visible in both poses (pulled closer on the tapered thighs, with a minor outer clearance gap near the pocket/holster).

Files:
- `review/GT-20124/native-mag-short-ag-v1-668e/receipt.json`
- `review/GT-20124/native-mag-short-ag-v1-668e/sources-before.json`
- `review/GT-20124/native-mag-short-ag-v1-668e/before/{setup.json,records.json,FIRST-CELL-PENDING.json,FIRST-CELL-LOOKED.txt,actual-mag-render-presence.json}`
- `review/GT-20124/native-mag-short-ag-v1-668e/before/{unarmed-front,unarmed-front-mags-hidden,unarmed-3q,unarmed-right-thigh,pistol-front,pistol-3q,pistol-right-thigh}.png`
- `review/GT-20124/native-mag-short-ag-v1-668e/package/{setup.json,records.json,FIRST-CELL-PENDING.json,FIRST-CELL-LOOKED.txt,unarmed-right-thigh-contained-mag-visibility.json,pistol-right-thigh-contained-mag-visibility.json}`
- `review/GT-20124/native-mag-short-ag-v1-668e/package/{unarmed-front,unarmed-3q,unarmed-right-thigh,unarmed-right-thigh-mag-hidden,pistol-front,pistol-3q,pistol-right-thigh,pistol-right-thigh-mag-hidden}.png`
- `review/GT-20124/native-mag-short-ag-v1-668e/SHORT-COMPARISON-SHEET.jpg` (`1790x1546`)
- `qa/2026-11-18-AG-358/build_sheet.py`
- `qa/2026-11-18-AG-358/sheet-gt20124-short.jpg` (`1790x1546`)

Tests:
- Slot-managed WebGPU capture (`Rule 16` game-test slot released cleanly on exit): `node crew/crew.mjs slot run antigravity AG-358 --checks "J164 short noon native paired unarmed+pistol front/3q/right-thigh" -- node review/GT-20124/native-mag-short-ag-v1.mjs` exited `0` (`WebGPU`, `sourceStable: true`, `frames: 12`, `actualNormalNativeRender: true`, `matchedCameras: true`, `failures: []`, `allPackageCornersInside: true`).
- Sheet builder: `python qa/2026-11-18-AG-358/build_sheet.py` exited `0`.

Screenshots:
- Visually inspected all 12 paired originals (`before/{unarmed,pistol}-{front,3q,right-thigh}.png` and `package/{unarmed,pistol}-{front,3q,right-thigh}.png`), plus `before/unarmed-front-mags-hidden.png`, `package/{unarmed,pistol}-right-thigh-mag-hidden.png`, and `review/GT-20124/native-mag-short-ag-v1-668e/SHORT-COMPARISON-SHEET.jpg`.

Not verified:
- Full crouch/aim/rifle poses, other lighting presets (overcast/dusk/night), full animation, and gameplay foot contact are outside this short noon unarmed+pistol scope.
- Separate non-`mags` thigh gear (the outer left-thigh dark vertical slab/grenades and outer right-thigh drop-leg holster block visible in `pistol`) is unchanged from `before` and not moved or hidden by this belt-magazine fix.

Requests:
- Replied `DONE` to ChatGPT 2's request (`shots: J164 short native unarmed+pistol noon/front3q/right-thigh, Director GOparallel`) and sent `--fyi` to `claude,chatgpt2` with receipt and sheet paths.

Contract changes:
- None.
