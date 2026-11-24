# antigravity3 — AI-1 Survivors complete overhaul — 2026-11-24

Changed:          Overhauled all three canon survivors (Cpl. Dana Okafor, Sgt. Eli Brandt, Spc. Evan Pike) end-to-end: upgraded to D-243 realistic proportions with fitted role gear, relocated roof posts clear of HQ machinery with Military-family post props, built grounded procedural animations across day/night/valley-rescue states, wired role-specific combat targeting + reload cycles + Okafor combat med-drop + Pike dawn maintenance, and implemented canonical Fourth-Pool reactive dialogue (docs/story.md §5) with role-badged talk card UI.
Files:            studio/survivor-models.js (new), game/survivor-anim.js (new), game/survivor-behavior.js (new), game/survivor-dialogue.js (new), game/survivor-system.test.mjs (new), ui/survivors.js, ui/survivors.css, index.html (imports, makeMarine playerShape option, survivor section & prompts), qa/AI-1/capture-survivors.mjs (new), crew/crew.mjs (registered antigravity3 / AI), crew/status/antigravity3.md (new)
Tests:            node --test game/survivor-system.test.mjs ui/survivors.test.mjs → 12 pass, 0 fail (new tests: game/survivor-system.test.mjs — 7 tests); targeted browser batch via game-test slot (--jobs 1): tcl285a 11/11 pass, t123 6/6 pass, t148 23/23 pass, t149 16/16 pass, t159 10/10 pass (re-verified post-final edit), t215 4/4 pass (re-verified post-final edit, UTF-8 clean), t304 8/8 pass, t305 9/9 pass, t156 33/33 survivor assertions pass (1 unrelated fakethree.mjs error in game/zombie-ability-visuals.js:416 — reported to claude). Real RTX 5080 WebGPU run (qa/AI-1/capture-survivors.mjs): 0 page errors.
Screenshots:      qa/AI-1/01-lineup-front-noon.png, qa/AI-1/02-lineup-back-noon.png, qa/AI-1/02b-lineup-front-dusk.png, qa/AI-1/02c-lineup-front-dawn.png, qa/AI-1/03-okafor-closeup.png, qa/AI-1/04-brandt-closeup.png, qa/AI-1/05-pike-closeup.png, qa/AI-1/06-roof-overview-day.png, qa/AI-1/07-roof-okafor-day.png, qa/AI-1/08-roof-brandt-day.png, qa/AI-1/09-roof-pike-day.png, qa/AI-1/10-roof-combat-okafor-night.png, qa/AI-1/11-roof-combat-brandt-night.png, qa/AI-1/12-roof-combat-pike-night.png, qa/AI-1/13-okafor-meddrop.png, qa/AI-1/14-survivor-talk-ui.png (all rendered on RTX 5080 WebGPU across 3 iterative visual passes)
Not verified:     Full coordinated integration suite (per AGENTS.md Rule 16 / D-135, full suites run in Claude's cloud before commit); live valley rescue animation shots were verified via unit tests and t148/tcl285a rather than separate valley WebGPU renders.
Requests:         Sent to claude: fakethree.mjs crash in game/zombie-ability-visuals.js:416 (`sackMesh.morphTargetInfluences[0] = 1` undefined when spawnBounties spawns a Colossus during t156). Coordinated with antigravity2 (AH-15) who released ui/survivors.js and index.html (survivors) to AI-1; sent --fyi to claude on AI-1 check-in.
Contract changes: None. Preserved all existing window.TT / dw-game / roofDbg / survivorDbg / survivorHelpDbg / ui/survivors.js contracts (makeMarine gained an optional defaulted `playerShape = !legacyBody && !liteHead` parameter; survivorTalkCard retained its exact 3-child DOM structure `[title, line, close]`).

## Summary of Fixes & Features

1. **Models, Proportions & Bespoke Kit (`studio/survivor-models.js`)**
   - Upgraded survivors to D-243 realistic proportions (`playerShape: true`) + `PLAYER_HEAD_SIZE = 0.90` while keeping `liteHead: true` geometry budget.
   - **Cpl. Dana Okafor**: 360° fitted white-and-crimson medic armband (`survivor-medic-armband`), rear-right hip trauma IFAK (`survivor-aid-bag`) with tourniquet & shears (replaced old oversized floating forearm box), snug back-slung M4 (`survivor-rifle`, `z = -0.218`) + dedicated combat hand-held M4 (`survivor-held-rifle`).
   - **Sgt. Eli Brandt**: contoured 15-round 7.62mm NATO bandolier (`survivor-ammo-belt`) hugging the plate carrier, chest binoculars (`survivor-binoculars`), rear 7.62 belt pouch, boonie/aviators/beard/pads.
   - **Spc. Evan Pike**: sculpted combination wrench (`survivor-wrench`) in leather belt holster, duct-tape roll, multitool pouch, H-harness radio, cap-mounted headlamp (`survivor-headlamp`), backwards cap, bare hands.
   - Applied `HAND_POSES.hang` + inward-facing wrists (`[0.05, ±1.15, 0]`) matching the player marine, and marked wrist meshes `noRigSkin = true` so combat grip/hang/wave finger curls deform live on GPU.

2. **HQ Roof Post Relocation & Tactical Props (`studio/survivor-models.js`)**
   - Moved Okafor from `(-4.1, 4.1)` (impaled by NW whip antenna/dish/exhaust stacks) to North deck `(-0.4, 4.1, yaw 0)` and Brandt from `(4.1, 4.1)` (inside NE steel HVAC air handler) to East deck `(4.0, 1.2, yaw +π/2)`, keeping Pike at SE corner `(4.0, -4.0, yaw 3π/4)`.
   - Built Military-family post props (`buildRoofPostProps`): sandbags, lofted bedrolls clear of resting boots, Okafor's stenciled triage footlocker + pulsing green ready-heal chem-light + lantern, Brandt's stacked olive 7.62 ammo cans + spent brass + notebook/mug/lantern, Pike's red steel mechanic toolbox + oil can + lamp, plus `buildMedPouchDrop`.

3. **Procedural Animations (`game/survivor-anim.js`)**
   - Grounded 2-bone trig leg crouching (`applyGroundedLegs`) keeping boots on the roof/terrain with anatomically clamped joints.
   - **Roof Combat**: Okafor & Pike unsling M4s into bladed overwatch stances tracking targets over the parapet with recoil & 3-stage tactical reloads; Brandt orbits behind his M240B (`standBack = 0.48`) in a braced gunner crouch with cyclic shudder and animated hinged `feedCover` belt reloads.
   - **Roof Day**: Grounded non-clipping resting/watch/toolbox-tinkering poses (`r.awake = false` preserved for `t156`), 3.0 m player-proximity head-turn/rise/wave, and Okafor's two-handed IFAK patch-up gesture.
   - **Valley Rescue**: Hunkered cover crouch while guards live, rising + beckoning wave when cleared & approached, grateful nod + brisk jog-away departure fadeout on rescue.

4. **Combat AI, Tactical Utility & Canonical Fourth-Pool Dialogue (`game/survivor-behavior.js`, `game/survivor-dialogue.js`, `ui/survivors.js`, `ui/survivors.css`)**
   - Role-specific target selection: Brandt prioritizes heavies/bosses/clusters, Okafor protects the player & targets Spitters/Ferals, Pike prioritizes Bombers & structure attackers; added mag/belt ammo tracking, reloads, M4 brass ejection, and throttled directional threat callouts.
   - Added Okafor's 1x/night combat med-pouch toss (`+35 HP` when player drops < 35% HP within 24 m of HQ, leaving `regenCapFrac === 0.4` untouched) and Pike's dawn field-maintenance (patches up to 20% wear on up to 3 damaged structures near HQ, leaving `PIKE_REPAIR_MUL === 0.75` untouched).
   - Wired full Fourth-Pool dialogue from `docs/story.md §5` (specific dog tags Sato/Hale/Clarke/Price/Kowalski, All 9 Tags, Night 18 Siege, Night 6 passed, Named Nights, low-HP nudges, camaraderie rotation, active combat barks) into `survivorTalkCard` with CSS `::before` role badges and color-coded accent borders.

## Art & Animation Verification (AGENTS.md Rules 18, 19, 24, 25)
- **Art family**: Military (olive drab, muted khaki, dark gunmetal, crimson cross, reserved green chem-light solely for ready-heal & med-drop beacon).
- **Lighting verified**: Noon (`01`, `02`, `03-09`), Dawn/cool (`02c`), Dusk (`02b`), Night combat (`10-13`).
- **Asset scores (0–5)**: Silhouette 5 · Proportions 5 · Materials 4 · Grounding/Zero-clipping 5 · Context/Readability 5.
- **Animation scores (0–5)**: Weight & Grounding 5 · Silhouette & Readability 5 · Anticipation & Follow-through 4 · Secondary Motion & Breathing 4 · Anatomy & Joint Limits 5.

## Game-Test Slot Record (AGENTS.md Rule 16)
All browser regression batches (`t123 t148 t149 t156 t159 t215 t304 t305 tcl285a`, `t156` stack probe, final `t159 t215`) and all 3 RTX 5080 WebGPU visual capture runs (`qa/AI-1/capture-survivors.mjs`) ran sequentially with `--jobs 1` through `tools/game-test-slot.mjs` (`crew.mjs slot run antigravity3 AI-1` / `run-all.mjs --agent antigravity3 --task AI-1 --jobs 1`).
