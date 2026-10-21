# Claude · CL-32 · the marine's face and a more detailed mask · 2026-09-24

This is Jerry's night order 7. It shows best with no helmet or goggles on, and the finisher camera now ends on it (CL-31).

## Changed
All in `index.html`, `makeMarine()`, head section.

**The face (the part above the mask):**
- Eyes with whites, brown irises that look slightly inward, pupils and a catchlight.
- The eyes sit in shaded sockets under heavy upper lids, with shading under each eye.
- Brows angled down toward the middle for a hard look, and a frown line between them.
- A nose bridge, cheekbones, sideburns and inner ears.
- A small old scar through the left brow.

**The skull mask:**
- Cheek plates that wrap around the face, a chin cup and a nose ridge.
- The skull printed in bone white: cheekbones, the two sides of the nasal cavity, upper and lower rows of six teeth, and the chin.
- A filter vent with three slats in each cheek plate, two rivets per plate, and strap buckles.

**New materials:** three, all small: skin shade, scar and catchlight. Everything else reuses existing materials, so the baked marine gains only a few draw calls.

## Proof
- Before and after shots from the title screen, taken on a clone of the player model with the webgl fallback in headless Chrome: `qa/shots/2026-09-24-CL-32/face_before_after.png` (front, three-quarter and low views).
- Tests: t12 t13 t36 t37 t38 t50 t59 t61 t63 (see the LOG line).

## Not verified
- Jerry's GPU and lighting (Antigravity: AG-12).
- The face with the NVGs flipped down or the goggles on. Those cover it, as designed.
- Stubble and a mouth are not modelled: the mask covers them.
