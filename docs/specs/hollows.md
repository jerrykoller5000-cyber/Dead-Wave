# The Hollows: underground by day (D-67)

Owner: Claude (CL-98, P-134). For Jerry to read and say yes to, and for the builders: Grokbot (GB-106 the Hush, GB-107
fighting below, GB-108 the stir), Cursor (CU-71 the runtime, CU-72 passages, CU-73 measured), ChatGPT (GP-83 the haul,
GP-84 the words), Claude (CL-99 the warrens, CL-100 what they say, CL-101 the sound), Antigravity (AG-29).
Written 2026-09-30 from D-67 (Cursor's plan at Jerry's order), Jerry's three answers (Q-4) and `index.html` as it
stands after R4.

## The short version

- Five of the six caves (root, shale, iron, wet, hill) have a **warren** under them: three depths of dark tunnels
  and chambers, a set piece at the bottom, and loot. The chalk cave has none: it is the guardian's, over the source.
- The way in is **the Hush**: a box built from the relay's spare board that plays the signal back out of step, so the
  guardian can't hear the man carrying it. He has it from the morning after the relay is repaired; the HQ charges it
  once each dawn. **One delve a day, by day only.**
- Down there: **sleepers** that wake to noise and light, **nests** to blow up, each cave's own kind of dead, and a
  **set piece** in each Deep. No building. The gun light and the NVG earn their keep.
- **The stir.** Noise fills a meter. The Hush holds it down for about eight minutes. When it fills, or the Hush runs
  flat, the guardian comes through the rock after a ten-second warning. A **bolt-hole** or the way out saves him; the
  run's one kick-free still applies (D-46); otherwise it is the cave death, and **the run ends** (Jerry, Q-4).
- **The haul:** skulls (banked at the HQ as always), supply crates, one **strongbox** per warren per run (a blueprint,
  an early gun, a mod, a camo or a rune shard), and the twelve **dog tags** of convoy Medic-4. A full delve pays about
  half a night, so the nights stay the main road.
- **The same layout every run** (Jerry, Q-4): a warren can be learned. Clearing a Deep opens a **passage** to the next
  cave round the compass for the rest of the run.
- The secret's final fight happens **deep in the chalk heart, behind the rune doors** (Jerry, Q-4): the rune door at
  the bottom of every warren hums toward it. It opens only on the silenced night (the secret, CL-79).

## 1. The Hush (GB-106)

**What it is.** A battered field radio with a crank and a red lamp, strapped to his pack. It appears on the HQ board
("THE HUSH · CHARGED") from the dawn after the relay is repaired (`radioCall.repaired`); the relay's line that day says
where it came from (CL-100).

**The state** (contract `hush-state`, Grokbot's):

| Field | Meaning |
| --- | --- |
| `owned` | from the dawn after the relay is repaired, for the rest of the run |
| `charged` | true at each `startPrep` once owned; spent when he goes below |
| `lit` | true while it is on at a mouth or below |
| `cave` | the cave index he went down at, or -1 |
| `battery` | seconds left, from `HUSH_SECONDS` (480, eight minutes), counting only while he is below |

**At a mouth.** In prep, within 5 m of a non-chalk mouth, with a charge: the prompt "E · Light the Hush". Lit, the
walk-in grab (`checkScriptedKillTriggers`, the cave branch) skips him at that mouth, and a second E takes him down (a
one-second fade, CU-71). Unlit, the mouth kills as it does today. The poke chase (D-26) is untouched: the Hush is for
going in, not for standing in front of a cave making noise.

**The chalk mouth refuses.** With a charge, near the chalk mouth: "Too close to the source." No prompt to go down.

**No charge** (already used today, or before the relay): the mouth prompt reads "The Hush is flat. Tomorrow." and
nothing else changes.

**Night.** He can only go down in prep. While he is below, the prep clock stops (it holds where it was, and the
alarm can't sound), so a delve never costs the day's building time. Surfacing starts it again where it stopped.

## 2. Going down and coming up (CU-71, the runtime)

**Down.** A fade to black and the sound of the Hush's hum; he stands in the warren's mouth tunnel, facing in, with
the daylight behind him. **Up.** Walking out of the mouth tunnel, or through a bolt-hole, or a passage (section 8):
a fade, and he stands a few metres out from that cave's mouth, facing away from it, in the same prep.

**Topside while he is below.** Frozen and hidden: the day clock, the prep clock, every zombie, the water, the
wildlife, the builds and the turrets stop, and none of it is drawn. Only the warren is. Anything topside that was
mid-air (a thrown grenade, a supply crate falling) finishes on the frame he comes back.

**The providers switch** (the runtime's job, `core/hollow.js`): `sampleHeight` and `entityGroundY` answer the
warren's floor; `worldSolids` and the build solids are the warren's walls; the zombies' flow field uses the warren's
nav grid. Build mode, placing, the shovel, the tripods and the mortar are refused with "No building down here." The
map (Tab) shows only the explored part of this warren, cell by cell.

**Where it lives.** Each warren is its own group far below the island (y around -400) with its own lights and fog;
only one is ever built at a time, when he goes down, and thrown away when he comes up. It takes under a second to
build (CL-99's budget).

**The contract.** `core/hollow.js` (Cursor) calls `world/hollows.js` (Claude):

```
buildWarren(theme, seed) -> {
  group,                        // the meshes, lights and glow, to add below
  cells,                        // [{ i, j, depth, kind: 'tunnel' | 'chamber' | 'shaft' | 'drop' | 'deep', open: [n,e,s,w] }]
  groundAt(x, z) -> y,          // the floor under a point, or null outside
  solids,                       // wall boxes for the colliders and the rounds
  nav,                          // { cell: 1.5, w, h, ox, oz, walkable: Uint8Array } for the flow field
  entry: { x, y, z, yaw },      // where he stands on the way in
  exits: { mouth, boltHoles: [{ x, y, z, r }], deep: { x, y, z, r } },
  points: { sleepers: [...], nests: [...], crates: [...], strongbox, tags: [...], set: { kind, x, z } },
  doors: { rune: { x, y, z, yaw } },
  dispose()
}
```

`hollowState()` → `{ below, cave, theme, depth, explored, cleared }`. Events on `'dw-game'`: `'hollow'`
`{ phase: 'enter' | 'leave', cave, how: 'mouth' | 'bolt' | 'passage' | 'grab' }`. It reads the players list (D-58):
everyone goes down together (section 10).

## 3. The five warrens (CL-99)

**Three depths**, laid out on a grid of 6 m cells:

| Depth | Name | Size | What it is |
| --- | --- | --- | --- |
| 1 | The Galleries | 10-12 cells | wide tunnels and two chambers; the convoy's wreckage; sleepers, crates |
| 2 | The Narrows | 8-10 cells | tighter, a nest or two, a side pocket with a tag, the first bolt-hole |
| 3 | The Deep | 5-7 cells | one big chamber: the set piece, the strongbox, the rune door, the passage |

Between depths: a **drop** (one way down, a short fall with no damage) and a **ladder or scramble** beside it for the
way back. Each depth has at least one bolt-hole: a crack of daylight in the rock he can squeeze out of in two
seconds (hold E), which brings him up at the mouth. A full clear, killing everything and opening the strongbox, is
about 8 to 10 minutes: the Hush's battery.

**The same every run.** Each warren has its own dice: `hash('hollows', theme)`, never the run's seed, so the layout
is fixed and can be learned (Jerry, Q-4). What's in the strongbox is rolled per run (section 6). The world topside,
its seeds and the caves don't change (rule 10; signed off here for the warrens' own dice).

**Each warren looks like where it is** (a tile kit per theme: tunnel, bend, T, cross, chamber, shaft, drop, dead end):

| Theme | Looks | Its dead (the cave role) | The set piece in the Deep |
| --- | --- | --- | --- |
| Root | roots through the ceiling, glowing fungus, soft earth | climbers: they come over ledges | **The climbers' knot:** a ball of climbers drops from the roots when he takes the strongbox |
| Shale | narrow clefts, slate that rings, blades of rock | cleft: they flank | **The shale flankers:** two groups come out of side clefts at once |
| Iron | an old mine: rails, carts, timbering, a winch | armoured | **The mine crew:** soldiers in hard hats with a brute foreman, round a cart |
| Wet | flooded, knee-deep (slower), dripping | douse: they put fires out | **The drowned:** they rise out of the water in the Deep's pool |
| Hill | barrow tombs, carved slabs, bones | barrow: tougher | **The barrow king:** a colossus-sized dead on a stone bier, with his court |

**Light.** Dark by default: a few oil lamps from whoever was here before, the fungus's glow in the root warren,
the red glow of each rune door. The gun light and the NVG matter. Nothing emits a real light but the lamps (one
shared pool, the same as topside's effect lights).

## 4. Fighting below (GB-107)

- **Sleepers.** In alcoves, 2 to 5 per chamber, lying down. One wakes when a noise reaches it (a shot's hearing
  radius, GB-105's rule, suppressed shots much less), when the gun light holds on it for a second and a half within
  8 m, or when he walks within 2.5 m. Woken, it wakes its neighbours within 4 m after a moment.
- **Nests.** A pulsing mass in a chamber (HP 400, weak to fire and blasts): while he is within 20 m it wakes a new
  dead every 12 s, at most 3 of its own at once. Blown, it stops, and pays a crate.
- **At most 24 awake** at once below. Every dead below takes its warren's cave role (`applyCaveRole`) and the
  damage table (D-62). Skulls drop as topside.
- **The set piece** spawns once a run, when he steps into the Deep's chamber (the root knot: when he opens the
  strongbox). The Deep is **cleared** when the set piece is dead and the strongbox open.
- **Dying below** from a wound is death as topside: the burial, the run over.

## 5. The stir (GB-108)

A meter from 0 to 100 on his HUD below (GP-84), with a low rumble that rises with it (CL-101).

| Noise | Stir |
| --- | --- |
| A shot, unsuppressed | +3.5 (scaled by the gun's hearing radius against the rifle's) |
| A shot, suppressed | +0.9 |
| A grenade, a launcher round, a nest blown | +10 |
| A dead waking | +1.5 |
| Running (not walking) | +0.3 a second |
| Quiet (nothing for 3 s) | -2 a second while the Hush has battery |

So 30 unsuppressed rifle shots in 20 seconds fill it; a careful, suppressed clear never does. **When the Hush runs
flat** the quiet stops helping and the meter climbs 1.5 a second on its own: about a minute to get out.

**When it fills:** dust falls, the rock screeches, and the HUD counts ten seconds. Then the guardian comes through
the nearest wall (its studio rig and grab, `startGrabScene`) unless he is standing in a bolt-hole's circle or the
mouth tunnel, in which case he is out, surfacing at the mouth, and the delve is over for today. If it catches him:
the run's one kick-free (D-46, P-32) if he still has it, and then the meter drops to 50 and the guardian goes back
into the rock; otherwise the cave death, and the run ends (Jerry, Q-4).

## 6. The haul (GP-83, ChatGPT's numbers)

- **Skulls** from the dead, carried up and banked at the HQ as always. Tuned so a full delve's median pays about
  **half the same day's night** (ChatGPT's budget test).
- **Supply crates:** 3 to 5 a warren, like topside's (ammunition for what he carries, a med pack, a grenade).
- **The strongbox:** one per warren per run, at the back of the Deep. One prize, rolled for the run from what he
  doesn't have yet, by depth and theme (`game/hollows-loot.js`, pure and seeded): a build blueprint he doesn't own; a
  gun before its arrival night (D-48); a mod for a gun he carries; an earned camo he hasn't got (D-66, the unlock kept
  for good); or a **rune shard** (section 7). Never a repeat in a run.
- **The dog tags:** twelve, Medic-4's crew and escort, spread over the five warrens (root 2, shale 2, iron 3, wet 3,
  hill 2), each in a fixed place. **Kept for good** once picked up (the profile, like the badges); the board shows
  "Tags 5 / 12"; all twelve is a lifetime badge ("Brought them home", GP-65's list). Each tag has its line (CL-100).

## 7. What the Hollows say (CL-100, in `docs/story.md`)

- **The convoy went under.** Medic-4 never reached the camps because the dead dragged it down: its wreckage (a
  crumpled ambulance, stretchers, medical crates, a radio) lies in the Galleries of every warren, as if pulled apart.
- **Twelve tags,** a line each: who they were and a last thing about them. The last one is the doctor's, and it isn't
  there: the doctor got out (the survivors, R5).
- **The relay learns.** From the first delve, one of Harbor Nine's morning lines changes: the tone is loudest "under
  the chalk".
- **The rune doors.** A sealed slab at the back of each Deep, carved like the Pit's stones, humming toward the lake.
  E on one: "It's warm. It's singing." They open on the silenced night only (the secret).
- **Rune shards.** Five exist, one per warren's strongbox table. Each shows one glyph of the Pit's order; collect them
  and the order can be read without the tower (the second way into the secret, D-56, CL-79).

## 8. Passages (CU-72)

Clearing a warren's Deep opens a tunnel at its far end to the **next cave round the compass** (root → shale → iron →
wet → hill → root; the chalk is skipped), for the rest of the run. Walking it (a fade) brings him up at the next
cave's mouth by day. It doesn't need the Hush. A new run closes them all.

## 9. What topside owes the Hollows

- The HQ board: "THE HUSH · CHARGED / FLAT", the tags, the warrens cleared and the passages open (GP-84).
- A cave's mouth shows a small chalk mark once its warren is cleared this run (CL-99).
- The alarm can't sound while he is below (section 1). If the prep clock is already under 20 s, the mouth says
  "No time. Tomorrow." (nobody gets trapped by a delve they start at the last second).

## 10. Co-op (D-58; details in R7)

Everyone goes down together: the host's Hush, one lit mouth, and the party is taken below when every player is
within 5 m of it and the host presses E. The stir is shared. The one who's grabbed is the one the guardian reaches
first. Nobody can stay topside while the others are below (topside is frozen).

## 11. The numbers in one place

| Name | Value | Owner |
| --- | --- | --- |
| `HUSH_SECONDS` | 480 | Grokbot |
| Mouth prompt range | 5 m | Grokbot |
| Last-second refusal | prep clock under 20 s | Grokbot |
| Cell | 6 m | Claude |
| Depth sizes | 10-12, 8-10, 5-7 cells | Claude |
| Bolt-holes | at least one a depth; 2 s hold | Claude, Cursor |
| Awake cap | 24 | Grokbot |
| Sleeper wake | noise; light 1.5 s within 8 m; 2.5 m touch; neighbours 4 m | Grokbot |
| Nest | HP 400; one every 12 s within 20 m; 3 of its own | Grokbot |
| Stir | the table in section 5; warning 10 s; after a kick-free, 50 | Grokbot |
| Strongbox | one a warren a run | ChatGPT |
| Tags | 12 (2, 2, 3, 3, 2), kept for good | ChatGPT |
| Pay | a full delve about half the same day's night (median) | ChatGPT |

## 12. The order of work

1. **CL-98** this spec (Jerry says yes).
2. In parallel: **GB-106** the Hush, **CU-71** the runtime (a test warren of four cells is enough to start),
   **CL-99** the five warrens, **GP-83** the haul.
3. Then **GB-107** fighting below (after CU-71 and CL-99), **CU-72** passages.
4. Then **GB-108** the stir, **GP-84** the words and HUD, **CL-100** what they say, **CL-101** the sound.
5. **CU-73** measured (fps below with 24 awake, a scripted delve per warren), **AG-29** each warren on the GPU.

Jerry plays a delve in each warren to close it.
