# The road to 1.1

Grave Shift 1.0.0 shipped on 2026-10-24 (v1.0.0, c6b27f63). The same day Jerry played it through and sent the sweeps,
the rules and 31 notes. This is the plan from here. Claude leads it (D-81 stands: Claude decides what would wait for
Jerry's yes).

- **What Jerry sent:** `docs/world-design.md` (the placement and transition sweeps, the 15 rules of spatial world design,
  the look), `docs/quest-design.md` (the 12 rules of quest and narrative design, the five questions),
  `docs/jerry/2026-10-24-playthrough-notes.md` (N1 to N31, in his words).
- **His calls (2026-10-24, D-88):** the sweeps lead and the notes go in parallel: Claude and Antigravity run the sweeps
  location by location while the rest of the crew fixes the notes in their own areas. The story chain, the Hollows,
  the new way into the day missions and the relay are designed and built without waiting for his review; he judges
  them when he plays.
- **Updates on itch:** Jerry wants the itch.io build updated as development goes on. When a stage lands, tested, it is a
  1.0.x build (1.0.1, 1.0.2 ...); Jerry uploads it (D-84). 1.1 is the Steam release with co-op (D-83, D-84).
- **The rules apply to everything:** a placement follows world-design.md; a quest answers quest-design.md's five
  questions in its spec before it's built. Model polish is no longer frozen: first person shows the guns, hands and
  reloads up close, so they are this road's work.

## Stage 1: the sweeps (Claude, Antigravity)

Every placed thing in the world, location by location: the placement sweep (blocking, distances, scale), then the
transition sweep (how things meet; floating, clipping, looks), judged against the 15 rules and the look.

- **CL-255** The sweep tool. `tools/sweep/`: a test-page script that lists every placed object with its world box,
  the ground under its footprint, what it overlaps, how far it floats or sinks, its size against the marine, and what
  stands within 2 m of every door, panel, ladder and prompt; a markdown report per location; and a shot list per
  location (the approach, first person at his eyes, from above, at night) for the real renderer.
- **CL-256** The sweep, location by location, after CL-255: findings in `docs/sweep/<location>.md` (each names the
  question or rule it breaks) and the fixes in the same task where the object is placed. Order: the HQ and the FOB,
  the relay mast and Sato's note (N3), the six supply sites, the landmarks (campsite, cabin, shed, wreck, tower,
  graveyard, chapel, dock, mine), the river and the bridge, the cave mouths and the warrens, the trails, the forest.
- **AG-122** The sweep's eyes on Jerry's GPU: CL-256's shot lists on the real renderer, location by location, and the
  props' look fixes the findings send her.
- **AG-123** The FOB overhaul (N19) with the generator moved where it belongs (N18), after CL-256's FOB findings.
- **AG-124** The trapper's path rebuilt (N28): away from the bridge, bigger, put together as a place (the trapper's
  yard, the fence, the stones, the cellar).

## Stage 2: what's broken

- **CL-257** The relay: the second run's open door and missing lift (N26); the lever that reboots it after the
  frequency (N4); the morse code on a loop after the reboot's alarm, panel open or not (N4); Sato's note reachable and
  its corner rebuilt (N3).
- **CL-258** Every mini-game panel usable in both views (N2): the pointer free while a panel is open, controls big
  enough to hit, the keys for every control; the breaker, the tuner, the keypads, the lockbox, the jack.
- **CL-259** The Hollows rebuilt (N30): the descent (the camera, the ground, popping up through it), and the Hush as a
  real part of the story (what it is, who made it, how he gets it), to quest-design.md's five questions.
- **GP-19965** The ambulance jack (N23): playable, readable and good-looking.
- **GB-227** The circle round the muzzle over water (N12).

## Stage 3: first person, the guns, the marine's movement

- **CL-260** First person: right-click while running shakes the camera (N5); what he picks up, and every prompt, shown
  in first person (N17); the first-person FOV (N8) with CU-159's slider.
- **GB-228** First-person sights true to each gun (N11), the hands on the guns without clipping (N13), the reloads up
  close (N11).
- **GB-229** Auto-reload on empty (N9).
- **CL-261** The marine's unarmed run (N6), the knife, machete and katana (N25, with Grokbot for the blades' holds),
  the ladder's hands and feet on the rungs (N20).
- **CU-159** Settings: brightness (N1), vibrancy (N27), first-person field of view (N8).

## Stage 4: the story chain

- **CL-263** The day missions as one story that opens day by day (N24), drawn in through the story instead of the alarm
  panel (N7), the missing hikers named with pictures (N21): `docs/specs/story-chain.md`, each mission's five answers,
  then each owner rebuilds their mission's hook. Never a day with nothing to do.
- **GP-19967** The supply terminal, simple (N29): fewer words and tabs, what's there at a glance, good to browse.
- **GP-19968** The missing hikers' names and pictures, after CL-263 (N21).
- **CL-264** The boots yank (N16).

## Stage 5: the world's weather, the night, the sound

- **CL-262** Storms half as often and none before day 3 (N14); wind that comes and goes like the storms (N15).
- **GB-230** Night 1 all at once (N10).
- **GP-19966** The birds (N22): real wings and motion, out of step.
- **CL-265** The alarm's metal stinger back (N31).

## After

- 1.0.x builds as stages land (Antigravity builds the installer; ChatGPT runs the commit job).
- Then co-op (D-83) and the Steam release (D-84): 1.1.
