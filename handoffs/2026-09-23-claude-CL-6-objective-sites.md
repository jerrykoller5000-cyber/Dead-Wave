# Claude — CL-6 ChatGPT's seven objective sites, checked — 2026-09-23

Changed:          Checked all seven proposed objective sites against the world as it stands.
                  Six are approved as proposed. Medical-convoy is approved 0.8 m further from
                  the wreck, off the sign's collider. Each site has an id, a centre with Y
                  resampled, an approach point where the player stands, and the direction to
                  face.
Files:            none changed. This note; handoffs/requests.md (to ChatGPT).
Tests:            A read-only probe in my harness on index.html at mtime 1790199270415. It
                  sampled a 3.2 x 3.2 m square round each centre (0.4 m grid) for slope, rise
                  and water; measured edge clearance to every body-height solid, live tree
                  trunk and rock; and checked decks and the cave yards.
Screenshots:      n/a.
Not verified:     Route reachability from the HQ: the flow field isn't built on the title
                  screen, where the probe ran. Every site is dry, gentle and on open ground
                  next to its landmark, so I expect no trouble, but no walked route was
                  tested. Also: how each prop reads at night, and whether any vanishes in tall
                  grass (foliage chunks aren't colliders, so the probe can't see them).
Requests:         ChatGPT: use these ids and points (below). Nothing is placed yet; placing the
                  props is Phase 2 world work, after your design handoff.
Contract changes: none yet. Place ids follow the world-ID scheme in requests.md:
                  objective:<name>.

## The seven

Coordinates are world metres (x, y, z). The approach point is where the player stands to
interact. The facing is the yaw from the approach point to the prop.

| id | anchor + offset | centre | clearance | approach | facing |
| --- | --- | --- | --- | --- | --- |
| objective:radio-repair | mast + (3.5, 3.0) | (-149.87, 0.38, -1.15) | 3.76 m | (-149.29, 0.39, 0.23) | -2.75 |
| objective:medical-convoy | wreck 0 + **(4.8, 4.8)** | (-112.85, -0.17, 50.77) | 2.71 m | (-111.79, -0.18, 51.83) | -2.36 |
| objective:ranger-cache | camp 0 + (-5.0, 4.0) | (30.52, -5.27, -19.24) | 3.35 m | (31.09, -5.24, -17.85) | -2.75 |
| objective:hikers-cache | camp 1 + (4.0, 4.0) | (2.02, 0.89, -77.68) | 2.66 m | (3.41, 0.88, -78.26) | -1.18 |
| objective:trapper-cache | camp 2 + (-4.0, 4.0) | (-37.49, 0.41, 47.81) | 4.01 m | (-38.06, 0.41, 46.42) | 0.39 |
| objective:fuel-depot | shed 2 + (4.0, -2.0) | (-44.13, -3.12, -18.34) | 2.70 m | (-43.07, -3.11, -17.28) | -2.36 |
| objective:wreck-salvage | wreck 1 + (4.0, -4.0) | (-95.91, -0.14, -45.77) | 4.18 m | (-96.97, -0.12, -46.83) | 0.79 |

- **Every site:** no water within 1.6 m, and the steepest slope in the square is at most
  0.15. None is on a deck or in a cave yard.
- **Medical-convoy moved.** At (4.0, 4.0) it was 1.66 m from a sign's collider, which leaves
  too little room once the player stands at a 0.65 m case. Moving it 0.8 m out gives 2.71 m.
  It sits on a trail (path wear 0.75), which is fine: it's easy to find.
- **Ranger-cache** is in a dry hollow 1.9 m below the lake's level. The ground rises about 1 m
  across the 3.2 m square. That's fine for a small case, but keep the case under 0.65 m, as
  proposed.
