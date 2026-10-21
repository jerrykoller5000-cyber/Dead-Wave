# GP-164 revolver pack-contact review

The unchanged real-renderer t224 remains **41 pass / 1 fail**. Its only failure is the shotgun/AA12 loadout's positive-side revolver: sparse vertex sampling reports 16.480 mm air against the unchanged 15 mm limit. This is a sampling-sensitive result, not a worsened physical gap. No model, rig anchor, test, or expectation was changed.

- Same exported transform and body triangles, sampled: baseline **9.340 mm**, current **16.480 mm**. This reproduces the test's 0.009 / 0.016 m results.
- Every visible vertex: baseline **9.340 mm**, current **3.528 mm**; current contact is closer.
- Current continuous triangle surface nearest the old best contact: **9.706 mm** air, only **0.658 mm** from the old vertex.
- Opposite side dense clipping: **12.298 -> 11.732 mm**, both below 15 mm. Ordinary loadout dense air: **7.300 -> 4.988 mm** positive side and **6.620 -> 4.308 mm** negative side.

One camera eval exported a fresh marine with the exact carryPreview loadouts and both revolver holsters; the original torso ray direction and model transforms were retained. CPU comparison uses actual Three, the saved baseline constructor, current constructor, and exported body triangles. Proof: `node review/weapon-fidelity/sidearms-fit-compare.mjs` exited 0; full contacts, source triangles, barycentrics and counts are in `sidearms-fit-comparison.json`.

- Export written (UTC): 2026-10-09T11:41:40.478Z
- Export SHA-256: `d69fff37e67769a98ef2ddd17c0032705885662ea0c7f896cde75859c12ec074`
- Frozen production SHA-256 (studio/weapon-sidearms.js): `9fb3936f9ee16f1373dedc07df53a4a05c067579a734f9d4fed3e72991d26be6`
