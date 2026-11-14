# chatgpt2 — GT-20106 flamer gauge (J153 21) — 2026-11-13
Changed: Gauge starts FULL at lower right (-3PI/4), drains counter-clockwise through twelve to EMPTY at lower left (+3PI/4). Existing fuel driver,13 dial notches and needle easing stay; grips/trigger/tanks unchanged.
Files: studio/weapon-heavy.js (gauge mapping); review/GT-20106/fittings/flamer/{before,after}; flamer-{gauge,hip}-four-lights.jpg; fittings-native.json.
Tests: Rule16 slots, one browser/worker. Native full/half/empty fuel values drive all16 BEFORE/16 valid AFTER photos; opposite actual angles asserted. Native actual firing60->53.5 fuel in1s, angle-2.3562->-1.9056 monotonically toward empty. fittings-native.json; final original hardware t33316/0 (fittings-final-t333.txt). No test changes.
Screenshots: Inspected flamer-gauge-four-lights.jpg (full/half/empty pairs, noon/overcast/dusk/night) and native flamer-hip-four-lights.jpg. Same eye camera/view-space/exposure. Gauge macro is explicitly rotated eye-space inspection; hip retains hands. One unchanged-source capture from rejected atomic patch was archived/replaced, not accepted evidence.
Not verified: Separate note22 trigger target is being checked with C1; no blade movement made. Whole-card load/draw/full integration pending.
Requests: Director gauge review sent; C1/C5 know mapping, no hand contact moved.
Contract changes: gaugeFull/gaugeEmpty endpoints reverse as requested; same API/driver/easing.
Art: Military family. Construction/materials/color/style/readability/integration4; geometry unchanged.
Motion: Requested action/reference is Jerry's J15321 counter-clockwise dial, checked against actual native BEFORE. Key poses full/right,half/up,empty/left; existing damped needle settles/refills unchanged, actual fuel is causal driver. Timing4,staging4,arcs4,ease4,causality4,follow-through4,readability4; anatomy/contact not applicable to gauge. No new secondary motion.
Commit: Ready to commit after Director review/file release. No git, Jerry runs Director job.
