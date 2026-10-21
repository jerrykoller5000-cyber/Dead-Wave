# claude — CL-12 The seven objective props — 2026-09-24
Changed:          Built the seven Phase 2 objective props from ChatGPT's GP-8 design as a new file,
                  assets/world/objective-props.js, the same way campsites.js works: a plain script
                  that registers globals and touches nothing else. Each prop has one prebuilt mesh
                  per visual state (radio: broken/repaired with an amber/green light; fuel:
                  stocked/partial/empty; the five caches: closed/open/empty), handles by objective
                  id, the centre, the approach point and the facing. `stateFor()` maps GP-8's
                  state machine onto them. Not wired into the game yet: that waits for the split.
Files:            assets/world/objective-props.js (new), tools/tests/t52.js (new),
                  Claude outputs/shots/cl12/props-states-day.png, props-night-flashlight.png
Tests:            t52 (new): 15 pass. It loads the file into the running game and checks: the
                  sites match the CL-6 centres and approaches and GP-8's facings to 2 cm and
                  0.02 rad; seven props; two colliders (radio cabinet, fuel stand); two draws a
                  prop (three for the radio); every state within GP-8's sizes; nothing floats;
                  every approach point has 0.75 m clear of solids and trees; the state mapping.
                  1,612 triangles for all seven. t50 still passes. index.html is untouched (freeze).
Screenshots:      Claude outputs/shots/cl12/props-states-day.png (rows: first state, middle, last)
                  and props-night-flashlight.png. Rendered with the vendored three.js
                  (WebGPURenderer on its WebGL2 fallback, software GPU) on flat ground, in a row,
                  not in the world.
Not verified:     - In the world: how each reads at its site by day and night, and whether tall
                    grass hides the small ones (GP-8 asks Antigravity to walk all seven routes).
                  - Real GPU. The props use the plain vertex-colour material the landmarks use
                    (pass the game's poiMat as `material` so they share its pipeline).
                  - Small cases have no collider (under 0.33 m tall); the radio cabinet and fuel
                    stand do. Say if the small ones should block too.
                  - The radio's cover is a flap over the connector bay, lifted up and out, not a
                    full-height door: a door would swing into the approach or past the footprint.
Requests:         none new. Wiring after the split is CL-15 (world), then ChatGPT's objective
                  state machine drives setState through the contract.
Contract changes: none yet. Proposed for the objective contract (after the split):
                  buildObjectiveProps(THREE, { POI, height, solid, material }) ->
                  { group, props: { [id]: { id, centre, approach, facing, states, state,
                  exists, setState(name) } }, stateFor(objectiveState, id, remaining) }.
