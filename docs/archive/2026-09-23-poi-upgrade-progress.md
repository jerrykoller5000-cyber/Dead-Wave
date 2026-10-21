# Landmark upgrade completion — September 23, 2026

This pass owns `assets/world/landmark-details.js`, its small construction hooks in
`index.html`, and `tools/verify-landmarks.cjs`. It does not own caves, water,
terrain generation, or other agents' uncommitted work. No commits or pushes.

- [x] Mortar interaction: require the marine and mortar to be on the same level;
  validate both the prompt search and the mount operation. Browser check passed.
- [x] Swarm: exclude the scripted Cave Guardian. Browser check spawned 100 regular
  zombies, no guardian.
- [x] Abandoned cabins and sheds: separate aid, supply, repair, food and generator
  stories; siding, roofing, frames and contents. Initial visual review passed.
- [x] Graveyard: varied markers, broken entrance, grave edging and visitor details.
  Keep the death cinematic's reserved burial plots clear.
- [x] Watchtower and radio mast: construction detail and abandoned service equipment.
  Open tower rails retain a ladder gap; fitted mast bracing, dish and service rack.
- [x] Bridges and dock: repairs, hardware, mooring equipment and open boat hull.
  Deck centre lines remain clear. The boat sits beside the outer dock, with raised
  interior boards, benches and an oar. Water code is unchanged.
- [x] Truck wrecks: hollow cabs, exposed engines, proper wheels and spilled cargo.
  Medical convoy and stripped utility truck variants; wheel heights follow terrain.
- [x] Campsites: extend the existing Ranger, Hikers and Trapper identities.
  Search board, abandoned hiking equipment, and a curing frame with stored traps.
- [x] Perimeter: reinforce the quarantine story without changing the boundary.
  Buttresses, coping, wire, repairs and warning signs at 42 dry-land stations;
  avoid cave mouths, water crossings and the existing river arch.
- [x] Final visual, collision and destruction/reset checks; recommendations.

## Verification

- `tools/verify-landmarks.cjs`: passes module parsing, mortar selection/mounting
  above and below the marine, same-level mounting, and a 100-zombie Swarm without
  cave guardians. All 16 dressed sites and 42 wall stations have finite geometry.
- Browser screenshots reviewed for all landmark types. Bridge and dock centre
  lines, the tower ladder approach, and reserved graveyard burial approach remain
  clear. Cabin, shed, graveyard, campsite and tower meshes and owned colliders
  disappear on destruction and return on Reset. No browser runtime errors.
- `tools/verify-campsites.cjs`: passes all three camp variants, collider bounds
  and destruction behavior.
- `tools/verify-insertion-commands.cjs`: passes live insertion animation,
  Night Ops, Shower and Reset.
- Broader combat regression: 20/21 checks pass. The existing tree-flame check
  still reports "tree has no flames"; tree effects were not changed in this pass.
- Marine movement regression passes its hit and recoil assertions, then cannot
  find an eligible unobstructed test slope. The same failure reproduces against
  the saved index from before the landmark dressing. No terrain or movement code
  was changed to make that unrelated test pass.

The added art is baked into the existing landmark meshes; perimeter stations
each use one separately culled mesh. No extra dynamic lights or per-frame prop
animation loops. Real-device frame-time benchmarking remains a separate task.
Other agents' edits were preserved; nothing was committed or pushed.

## My recommended next improvements

1. **Give each landmark a reason to visit.** The radio mast could provide a
   repair-and-transmit objective; the medical convoy could supply rare treatment;
   the ranger camp could reveal a supply location. Small optional objectives would
   turn exploration into decisions about distance, risk and time before a wave.
2. **Make the first minute teach the resource loop.** Guide the first skull pickup,
   first HQ deposit and first useful purchase through brief contextual prompts.
   A new player should understand what they earned and what to do with it without
   reading a long menu description.
3. **Make enemy attacks easier to read and base assaults more deliberate.** Give
   dangerous attacks distinct anticipation, sound and recovery. Let enemy types
   have recognizable jobs around defenses, with clear signs of an impending
   breach, so smart preparation feels more valuable than simply adding turrets.
4. **Make floors, cover and interactions consistently trustworthy.** Extend the
   same-level interaction rule to other equipment, test bridge and staircase
   transitions, and verify that visible cover reliably blocks the attacks it
   appears to block. This would remove deaths and interruptions that feel unfair.
5. **Protect combat readability and smoothness as detail grows.** Test crowded
   waves on ordinary hardware, reduce distant prop/shadow cost where needed, and
   keep enemies, attack warnings and usable objects distinct from scenery. Then
   add restrained location-specific ambient sound to strengthen the new stories.
