# Claude · CL-19 tower railings, CL-20 the pit · 2026-09-24

## CL-19: the watchtower's railings stop the marine
- On the deck he can walk up to the rails but not through them. His body stops 0.96 m from the centre on each side.
- The ladder gap on the south side is still open: lined up with it, he can step through and off the edge, which is the way down.
- Jump higher than the rails (0.86 m above the deck) and you clear them, as before.
- Code: `TOWER_RAIL_IN`, `TOWER_RAIL_TOP` and `TOWER_GAP_HALF`, and a clamp in the frame's deck block, which runs before the edge-drop check.
- For tests, `TT.getTowerState()` and `TT.towerDeckDbg()`.
- Test: **t64** (new), 8/0. It checks each side and a corner hold him, the rail beside the gap holds, the gap lets him through and off, and a high jump clears the rails.

## CL-20: the pit
- **Bubbles.** A thin column of 22 bubbles rises out of the well over the hole. They pop on the surface as a small dome, sometimes with a ring. They only run while the marine is within 95 m; otherwise the pool sleeps, hidden. `TT.getPitBubbles()` reads their state.
- **Tentacles.** They are now hidden until the water bursts (t ≥ 0.05 s into the grab); before, they were created visible under the surface.
  - In the code, the tentacles exist only while the grab plays: they are built when it starts and disposed at its end, on abort and on reset.
  - So I could not reproduce "tentacles showing before the cutscene" from the code alone. If Jerry sees them again outside the grab, a screenshot would pin it down (AG-12).
- **The rumble** still comes with the sound work (CL-22).
- Test: **t65** (new), 7/0. It checks that the bubbles sleep when far, rise and pop when near, give no grab at 40 m, and that no arm shows before the burst.

## Tests
- t12, t36, t37, t59, t61, t64 and t65 all pass on my copy.
