LIVE 2026-10-12: Jerry approved the reservation override;12bomberhooks are APPLIED to fresh productionindex. Native live death/motion/pool/chain/text checks pass. Do not reapply the patch. See live-integration-proof.json, final-source-proof.json and handoffGP19884 for final evidence. The staged instructions below are historical.

# GP-19884 staged bomber integration

The actual game index is unchanged by this task. Source.txt and candidate are comparison artifacts only; NEVER copy either whole file over production.

Use the exported bomberPatch(source) from build-preview.mjs on the freshest UTF-8 index after the owner reservation is released or Jerry explicitly overrides it. Recheck source hash immediately before save. Twelve exact single-occurrence anchors fail loudly if the fresh source differs.

Changes: private helper import; bomber speed/radius; sculpt real post-concept rig; existing foot articulation; pooled reset; death reset; bomber-only explosive death visual; room-clear reset; per-frame restore; movement smoothing; final facing; final pose. Explosion damage/credit and once-only _detonated guard remain unchanged.

Verification: 8 motion units PASS; native six death kinds + projectile/burn/contact/headless/chain/repeat/reset PASS; t109 5PASS and t215 4PASS unchanged; 48 moving actors stay alive/~60FPS/503draws/719351triangles/errors[].

After integration: run the new unit tests and native death-check.mjs --live, then capture.mjs after. Full npm suite goes to Cursor under the documented runner limitation.
