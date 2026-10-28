# GP-19970 — military limb pad fit plan

Family: military kit worn by an infected soldier. Reference: AG-138 §3 rank 3 and the native `military-chest-after/noon-{front,side}.png` and `walk-side.png`. The rounded olive shin and tapered forearm are the contact surfaces; their camo pattern and the four-pocket chest read stay as accepted by AG-142.

The shin's olive ellipsoid is centered at local y -0.10 with height 0.25 and depth 0.18. The current steel plate at y -0.025 has height 0.14, placing its top at +0.045, above the olive surface's +0.025 end. Lower and shorten the plate to about y -0.055, height 0.11, center z 0.075 and depth 0.045; its back then intersects the rounded shin while its top stays inside the leg mass. The old wrist cuff extends about 2–3 cm beyond the forearm width. Narrow/recenter its leather oval and dark binding on the forearm without changing the hand or finger geometry.

Validation: `node --check studio/zombie-concepts.js`, native `camera.mjs check zombie.military`, front/side at noon, overcast, dusk and night, plus side/back walk and 8 m gameplay scale. Compare with `military-chest-after/` and ask Antigravity for scoped Construction/Integration. The full suite is Cursor's CU-166 batch. At 2026-10-28 03:08 UTC, its chunk 01 holds the shared game-test slot and Windows refuses source writes, so the source edit and new captures wait until the chunk releases.

2026-10-28 03:36 UTC: the source edit is now applied after re-reading the same SHA-256. The plate center is y -0.055, z 0.075 with 0.15 × 0.11 × 0.045 dimensions; the leather cuff is 0.12 × 0.11 × 0.075 at z 0.025, and the dark binding is 0.12 × 0.025 × 0.07 at y -0.33. `node --check` exits 0. Native validation is queued behind CU-166's next chunk; no visual result is claimed yet.

Later native result: `military-pads-after/check/check.json` reports 1 subject, 0 broken. Twelve final four-light, walk, gameplay and close PNGs are nonblank. The black plate is shorter, but its close side attachment is under AG review; no independent 4/5 score is claimed yet. Camera stopped and shared slot released.
