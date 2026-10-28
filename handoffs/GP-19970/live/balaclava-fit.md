# GP-19970 — balaclava nose fit

Family: military. Purpose: the always-worn fitted cloth hood must cover the lower face without skin penetrating it, preserve the eye opening and fit under the existing cap/helmet. Existing movement, facial geometry, wardrobe materials and waist are outside this correction.

## Observed defect

The completed native collection has88 original game captures, no inspector/page errors, in live/marine/report.json. In light-noon-head-standing.jpg and the full-kit close-ups, a skin-colored nose patch protrudes through the center of the brown face panel. This is a visible construction/integration defect (asset principles11 and39), not a reason to alter the face. Before: Construction3/5 and local Integration3/5 for that intersection; no full-model acceptance is implied.

The sampled flexible waist stays joined in the inspected crouch/turn close-ups. Those views do not certify every motion, hidden rear surface, foot contact or valley interaction.

## Reference and construction

Reference: [Helikon-Tex balaclava](https://helikon-tex.com/en/balaclavaen.html). The manufacturer's searchable description describes an anatomical stretch fit around the face and use under a hat or helmet. Full-page access returned403; no photograph or licensed asset was downloaded or imported. The game's actual sculpted nose is the fit reference for the local clearance, rather than a replacement face.

The current face panel's upper center lies behind the sculpted nose. Add a narrow upper-front ease of up to18mm, tapering across the face and down to zero above the lower panel. Use the same profile for the existing rolled hem. Eye-opening height, cheeks, collar and topology remain as authored. This serves construction and animation-readiness without a rigid nose clip or extra mesh. Preserve the existing mouth-lowering function used by the actual smoking action.

Source before: balaclava-before.js. Product change: ui/marine-face.js, balaclava cloth profile and its matching hem only. No motion, face, world, shader or new material changes. Parse and native after-validation pass.

## Verification

The first collection incorrectly attempted a review job inside Drive; retained failure-drive-first.json and corrected the collector to leave Drive before public capture jobs. The successful retry completed88 captures. Third-person context is the actual standard game camera, including its normal distance; first person verifies camera intrusion and intentionally hides the external head. All weapons are unlocked/carried in this inspector: pistol/no-armor is not a restricted light inventory. Night images use the inspector night preset, without claiming a valley flashlight/FOB-lamp sweep.

Completed after: live/marine-after/report.json has90 captures and3/3 real marine build checks. AG accepted local Construction5/5 and Integration5/5, while catching smoke state carrying between kits. The collector now resets the existing idle API between kits and asserts no smoke props in standing images. Final live/marine-after-clean/report.json passes90 captures,3 checks and all16 standing smoke-state assertions, errors[]. Inspected clean light/full standing, full crouch head and both smoking heads: nose covered when raised; existing lowering preserved. Retain live/marine/ as before evidence. No general full-marine/motion acceptance is claimed; full-suite/load/frame budgets remain the coordinated integration gate.
