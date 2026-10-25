# Grave Shift art direction

Claude, 2026-10-24, at Jerry's suggestion ("establish a worldwide art-direction specification that sits above these
universal principles ... so your agents aren't simply generating individually good models. They're generating models
that look like they all belong to the same carefully designed world"). It turns `docs/world-design.md`'s look into
rules for every model, material, color and motion, and sits above `docs/asset-principles.md` (how a good asset is made)
and `docs/animation-principles.md` (how it moves). Lead calls under D-81; Jerry overrules any of it.

**The one sentence:** worn military realism collides with eerie folklore and decaying industrial mystery. Ordinary
things are built right and worn by use; the supernatural breaks those rules on purpose, and always in the same ways.

## 1. The four families

Every asset belongs to one family. Its shape language, materials, palette and wear come from that family; a handoff
names it.

| Family | What | Shape language | Materials | Palette (dominant / support / accent) | Wear |
| --- | --- | --- | --- | --- | --- |
| **Military** (PGB, FOB Threshold, the marine, the dead soldiers' kit) | Guns, crates, sandbags, the HQ, radios, vehicles, uniforms | Boxy, functional, chamfered; standard sizes repeated (ammo can, footlocker, jerrycan, pallet); straps, latches, stencils | Painted steel (dielectric paint, rough 0.6-0.75; bare metal at worn edges, metal 0.8-1, rough 0.35-0.5); canvas and webbing (rough 0.85-0.95); rubber (rough 0.9) | Olive drab and field green / cold blue-gray and gunmetal / faded institutional yellow, stencil white, a red only for danger | Handling: chipped edges, scuffed grips, mud to the knee and the wheel arch, sun-faded tops; maintained, not neglected: oiled actions, taped repairs |
| **Settler and civil** (Coldwater, the rangers, the hikers, the trapper, cabins, the church, the graveyard) | Timber, stone, iron fittings, tents, packs, tools, lamps | Hand-built and irregular: sagging ridgelines, uneven boards, rounded stone; nothing quite square | Weathered wood (rough 0.85-0.95, grain to scale), fieldstone (rough 0.9), enamel (rough 0.3 where unchipped), rusted iron (metal 0.3-0.5 as rust is mostly oxide, rough 0.7-0.85), wool and nylon | Mossy green and pine dark / rust and bark brown / amber lamp glow, one bright hiker color (orange, blue) per camp | Age and weather: moss on the north and shaded sides, rot at ground contact, rust running down from fixings, roofs worst; things left in a hurry |
| **Industrial and research** (the iron mine, the mast and relay, the fuel depot, the cordon, PGB research, Project Nightglass) | Lattice masts, cabinets, sheds, the vault, pumps, fences, signage | Engineered and repeated: lattices, ribs, corrugation, bolted plates; brutalist concrete where it's permanent | Galvanized steel (metal 0.9, rough 0.45-0.6), corrugated sheet, concrete (rough 0.9), cable insulation, glass with grime | Concrete and cold blue-gray / rust / sodium amber, hazard yellow-black, one LED red or green for state | Neglect, not use: streaks under every edge from rain, flaking paint on the weather side, debris and leaves banked against walls |
| **The uncanny** (the dead, the Hollows and the Marrow, the Pit, the first people's stones, the guardian, the heart, the tone) | Creatures, warrens, carved stones, relics, anomalies | Breaks the families above in three set ways (§2), quietly; never glowing magic or neon | Wet and organic where alive (rough 0.4-0.6, a little sheen), chalk and bone where old (rough 0.95, pale), iron as the one material it fears | Bone white, bruise purple-gray, deep water black-green / the families' colors drained grayer / cold pale green only for eyes and the tone's glow, never more than a point | Not wear but intrusion: growth through seams, things pushed out of shape from inside, too-clean patches where nothing grows |

## 2. How the uncanny breaks the rules (always these, consistently)

1. **Proportion, slightly.** One measure is wrong and the rest right: a limb a joint too long, a doorway a hand too
   narrow, a stone ring one stone too many. Never everything at once.
2. **Order, intruding.** Organic growth through manufactured things (roots through the HQ's sealed door, tendrils out
   of the lake bed), and made marks where nothing made them (the carved door in the Marrow, the five glyphs).
3. **Light and sound, withdrawn.** Near it, light goes duller and colder, color drains toward gray, sound thins (the
   Hush). The one exception is the cold green point of an eye or the tone.

Iron is the world's one rule the uncanny keeps: settlers banded coffins, nailed horseshoes over doors, lined cellars.
Iron near the uncanny shows it (rust blooms, a horseshoe turned over). Any new uncanny thing respects iron or the
handoff says why not.

## 3. Color means something (gameplay first)

These hues are reserved. A new asset doesn't use them for decoration.

| Color | Means | Where |
| --- | --- | --- |
| Gold/amber (#ffd24a family) | Something to take or press: supplies, prompts, the E key | Map supply markers, the prompt keycap, the objective diamonds |
| Red (saturated) | Danger, the dead, a locked state | Zombies on the map, LED locked, the blood moon (Ember) sky |
| Green (saturated) | Safe, home, ready | The HQ on the map, LED open, kiosk ready |
| Cold pale green, a point | The uncanny is looking | Eyes in caves, the tone |
| Sodium amber, a pool | People were here and left the light on | Lamps at the FOB, cabins, the mast at night |

Every reserved color is backed by shape or motion too (rule 35): a marker's shape, a blink, a sound.

**Distribution.** Places read 60/30/10: the forest's greens and the season's tone dominant, the family's materials
supporting, one accent at most per view (the amber lamp, the hiker's orange pack, the red LED).

**Saturation.** Natural and worn surfaces stay below about 45% saturation in the base color; only the reserved colors,
signage and the hikers' gear go above it.

## 4. Scale and detail by camera

- **The world's measure is the marine:** 1.8 m standing, a doorway 2.0-2.1 m by 0.9 m, a step 0.18 m, a table 0.75 m, a
  crate 0.6 m. A prop is checked against him in the shot.
- **Third person (the standard view, 6-9 m off):** silhouettes and the major forms carry it; nothing under ~5 cm is
  modeled unless it moves or is touched.
- **First person (his eyes, D-87):** the guns, his hands and gloves, and anything he interacts with (panels, keypads,
  notes, the jack, the boots) get the close-up treatment: real contact surfaces, bevels, legible markings.
- **Far (40 m and beyond):** only silhouette and value; landmarks (the mast, the church, the FOB) must read against the
  sky at dusk.

## 5. Light

The world is judged under four lights before a visual change is done: noon sun, overcast or rain, dusk, and night with
his flashlight and the FOB's lamps. Readability fails at night more often than by day; the value hierarchy (rule 27)
is checked in the night shot first.

## 6. Motion by family (with `docs/animation-principles.md`)

- **Military:** economical, drilled, weight-honest: guns recoil into the shoulder, kit bounces on straps, nothing flourishes.
- **Settler and civil:** what's left behind moves only with weather: flapping canvas, a creaking sign, swinging lamps.
- **Industrial:** mechanical and cyclic: the mast's light, the relay's needle, the lift, the generator's shudder.
- **The uncanny:** wrong timing rather than wrong poses: too still, then too fast; a head that turns after the body;
  breathing out of step with movement; never the same cycle twice in a crowd (vary every loop's phase and rate).

## 7. Checking it

Every visual handoff names its family, the four light conditions it was shot in (or why not), the gameplay camera it
was judged from, and the scores (asset or animation table, 4 or more each). "Looks fine in the code" counts for
nothing (Jerry's rule: render it and look).
