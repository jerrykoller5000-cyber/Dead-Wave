# chatgpt2 — GT-20106 armory-frame-bolts — 2026-11-13
Changed: Director-loaned two boltPoints Z values .89->.879, seating16 instanced bolt heads on the frame face at.870. Prototype below-floor report was a shim issue; native instances were all above floor, but had a real11mm air gap behind the heads.
Files: index.html (only the two boltPoints.push Z constants); review/GT-20106/armory-bolt-land.json; armory-bolts/{before,after}; armory-bolt-seat-four-lights.jpg.
Tests: Rule16 slots, one browser/worker. Native original t33629/0 (fittings-hardware-world.txt); actual instance matrices/geometry give lowest bolt573mm above floor.16 real triangle rays before11.000mm rear-face gap, after3.34e-9m (float roundoff), all within.5mm. Strict ray/instance and zero-page-error gate passed. Exact camera and fixed.25 inspection lamp asserted. Patch proof: only those2 constants, all other index bytes identical, CRLF70809 preserved, UTF8 no BOM. After shader error from late fixture lamp was retained in records-pipeline-error.json and rejected; explicit compileAsync warm-up followed by a fresh zero-error run.
Screenshots: Inspected armory-bolt-seat-four-lights.jpg, same native wall macro camera in noon/overcast/dusk/night, fixed task lamp. Dark first audit images retained with-dark suffix, superseded by illuminated BEFORE/AFTER. World-design transition contact and rule13 structural dependence served.
Not verified: No new broad full suite; final whole-card gates pending. World layout, seed, approach/collision/count/draw budget unchanged.
Requests: Director's exact named loan in handoffs/requests.md; C2 told landed with byte proof. Final Director review sent.
Contract changes: None. Same16 instances and one draw.
Art: Industrial/military fixture; material/color/shape unchanged, construction/support/readability4.
Commit: Ready to commit after Director review; no git, Jerry runs Director job.
