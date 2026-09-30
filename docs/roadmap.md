# Dead-Wave: the roadmap

The plan for finishing the game: seven stages, R1 to R7. R6 is 1.0; R7 (co-op) comes after it. Each stage ends
when Jerry has played it. Every item here (P-1, P-2, ...) is one task on `crew/BOARD.md`; the table at the end maps
them. **The Crew Panel's Roadmap box shows how far each stage has got, live.** Paths are relative to the repo root.

## Where we are

```
  R1 ✓ ──── R2 ▶ ──── R3 ──── R4 ──── R5 ──── R6 = 1.0 ──── R7
  the loop   the night  the day  the way  named    finish       co-op
  feels      has a      feeds    out      nights,  (release)    (up to 4
  right      shape      the               the                   players)
                        night             Hollows
```

| Stage | Status | What the player gets | Jerry plays at the end | Items |
| --- | --- | --- | --- | --- |
| **R1 · Trust the loop, and feel it** | ✓ Done (2026-09-27) | Skulls reach the bag, building says what it does, the dead react when they're hit, and the marine gets knocked around. | A fresh run to night 5, and his notes in the motion lab. | P-1 to P-15, P-70 to P-77 |
| **R2 · The night has a shape** | ▶ Next | One breather and a surge you can hear. Plates, screamers and bomber chains. Streaks heal. The best run is saved. The first catch can be escaped. | Night 5 fresh, then 10 and 13 from the debug start. | P-16 to P-33, P-101 to P-103, P-117, P-118, P-147, P-148 |
| **R3 · The day feeds the night** | Later | The relay, then one call a day. Caches restock, drums burn, you vault your walls. Guns arrive by act at fixed prices, one mod each. | Days 1-10 fresh. | P-34 to P-49, P-104 to P-109, P-110 to P-116, P-119 to P-121, P-125 to P-128 |
| **R4 · The way out** | Later | The boat at night 20, a victory screen and badges. The relay tells the story. | A run to the boat, and a win. | P-50 to P-55, P-78, P-86, P-130 to P-133 |
| **R5 · Named nights and bigger systems** | Later | Fog Night, the siege, the day colossus, survivors, the guardian boss on its rig, the secret, and the Hollows under the caves by day. | Nights 12-20 from the debug start, and the secret. | P-56 to P-68, P-94 to P-98, P-122 to P-124, P-129, P-134 to P-146 |
| **R6 · Finish (1.0)** | Later | Balance from medians, the first hour teaching itself, sound, readability, green tests, the budgets, the package. | Three full runs, then the release. | P-79 to P-93, P-99 |
| **R7 · Co-op (after 1.0)** | After 1.0 | Up to 4 players, one hosting (D-58). | A night with friends. | Written when R6 closes |

A task can start as soon as its own "after" is met, so the lanes keep moving; a stage is closed when Jerry has
played it. How the game got here (the 30 suggestions, the fact-checks, the first calls) is in
`docs/archive/roadmap-history.md`. Every decision in full: `docs/decisions.md`.

## How to read a stage

**Sizes.**
- **S:** one agent session (one check-in, one handoff, roughly under 150 changed lines, one owner).
- **M:** two or three sessions, or two owners with a contract.
- **L:** a new system across several sessions and owners.
- **XL:** several days, and a design call from Jerry first.

Almost every item below is one owner and S. Each item's "Done when" also includes rule 7: `npm test` no worse, before-and-after `tools/shoot.mjs` shots for anything visible, fps no worse, and a handoff note. Test numbers are taken at check-in (the next free one in `tools/tests/`), so the items say "tNN".

**Columns.** *What the player gets* is the change as Jerry will feel it. *How it's built* names the code to reuse.
*Needs* is what must land first. *Done when* is the proof the handoff shows.

**Shared parts of `index.html`.** Items that touch the same part go in this order, and never with two agents checked in on it at once. Name the part in `--touch`.

| Part | Order |
| --- | --- |
| Skull drops (`18733-18945`), finisher recall (`26550`) | P-1, P-2 |
| Build placement, banner, repair and sell, mortar and stairs (`21408-24356`) | P-3, P-9, P-10, P-4, P-5, P-23 |
| `damageZombie`, knockdown, corpses, spread (`26873-26990`, `32104`, `32432-32459`, `33380-33470`, `34677-34815`) | P-70 (with P-6), P-71 (with P-7), P-72, P-8, P-26, P-28, P-48 |
| Wave director and `startPrep` (`26160-28240`, `27509-27713`) | GB-59, P-16, P-17, P-18, P-39, P-45, P-50, P-56, P-59 |
| Supply drops and radio defenders (`27236-27370`, `28243-28610`) | P-34, P-38, P-45 |
| Cave pokes and scripted kills (`29781-30894`) | CL-62, P-11, P-32, P-68 |
| Minimap (`7589-7738`) | P-10 (labels), P-24, P-51 |
| Death card and title (`850-858`, `30898-30960`) | P-31, P-54, P-55 |
| Audio state (`38071-38107`) and `core/audio.js` | P-19, P-20, P-21, P-57 |
| Bounties (`27925-28056`) | P-61, P-64 |

**Contracts (rule 9, each approved by Claude, landed together with its first consumer):**
- `pit-near` (P-11)
- `wave-push` (P-16)
- `build-hit` (P-23)
- `hud-state.medkits` (P-30)
- `tt_best_run` (P-31; Cursor reviews)
- `cave-guardian` gains an `escape` phase (P-32)
- `spawnSupplyDrop({x,z,contents,source})` plus a `supply-drop` event (P-34)
- the radio's `callable` state and a `radio-call` event (P-36, P-37)
- `wavePreview.night` gains `order` (P-39), `extraction` (P-50) and `mod` (P-56), as additive fields in the "Night shape" section
- `equipmentStocked` (P-46)
- `mod:heavy:<w>` and `weaponMods()` (P-48)
- bounties gain a `wanderer` kind (P-61) and a `survivor` field (P-64)
- Reactions (D-42) are already in `docs/contracts.md`; P-74 adds a body `hold`

## The stages

### R1 · Trust the loop, and feel it · ✓ done

Closed 2026-09-27 (23 of 23 tasks; Jerry played to night 5 and left his notes in the motion lab). Skulls reach
the bag, building says what it does, the dead react when they're hit and the marine gets knocked around. Its items
(P-1 to P-15, P-70 to P-77) are in `docs/archive/roadmap-history.md`, and its tasks in
`crew/archive/board-queues-2026-09-29.md`.

### R2 · The night has a shape · ▶ next

Goal: late nights build to a surge you can hear and see, each weapon has a job, and one surprise leaves
something behind.

| ID | What the player gets | How it's built (reuse) | Owner | Size | Needs | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| P-16 | On test nights the early pushes run straight on. Then comes one real breather, and the cave eyes dim. | In `spawnWaveBatch` (`28082-28100`, `28231-28234`), no pause between early pushes on nights 11-20. One breather before the last push lasts until `LULL_FIELD`, or 45 s at most. `warnActiveCaves` goes to 1 during it and back to 2 at the surge. Publishes `wave-push {push,pushes,last,lull}`. Totals unchanged. | Grokbot | S | GB-58 out; P-13 baseline | t78 or tNN: push sizes sum to the plan totals, no early breathers, exactly one before the last, and one `wave-push` per push. |
| P-17 | The last push comes from the caves and the treeline at once, 35-60 m out, so the night ends harder and sooner. | Move `plan.ground` risers (`27622-27631`) into the last push. Nights 13, 15, 16 and 17 get 30-60 ground shamblers taken from their own totals. Guardian nights (12, 18) skip it. | Grokbot | S | P-16, GB-59 (frame budget) | t78: every ground row falls in the last push. `nightsim --repeat 3`, nights 13-20: median length lower on each (target 1.5 min, not guaranteed) and no night hits the cap. Antigravity fps shot of night 13. |
| P-18 | On brute night six brutes leave one cave side by side. The demon and bomber packs arrive as set pieces. Night 19's "short breathers" come true. | `waveComposition` (`26225-26288`) puts the packs at the head of the push after the breather and holds the fodder until the pack is out. Night 19 keeps its pace lull 3 (`26193`), or ChatGPT changes its line (`ui/strings.js:1003`). | Grokbot | S | P-17 | t78: night 10's pack sits together at the head of its push, and night 19 never breathes longer than 5 s. nightsim medians for 10, 16 and 19. Antigravity shot. |
| P-19 | Each night has an arc you can hear: a break in the breather, then bridge and climax as the last push starts. | The music state reads `getWaveDirectorState().pace` (`27739`; missing at `38071-38107`). `secWant` (`core/audio.js:978-988`) cuts on bar lines and holds each section at least one section's length. | Claude | S | P-16 | t73: a forced breather switches to `break` within two bars and back; the last push plays `bridge` or `climax`. t61 passes. |
| P-20 | Night 19 sounds bigger than night 2. | A per-night gain in `waveByDay` (0 up to about +2.5 dB). `FIGHT_FLOOR` goes from 0.7 to about 0.85 late (`core/audio.js:858-862`). No new audio. | Claude | S | none | t60: the gain never drops from one night to the next. `overlapFrames` 0. Jerry listens. |
| P-21 | Nights 16 and 18 stop falling back to the songs of nights 4 and 6. | Render an Ember late tier (about 118 bpm, DRIVE 3) and a Guardian late tier (about 100 bpm, half-time) as sectioned songs with `tools/hordes.py`. Remap `waveByDay` (16: `fight_ember`, 18: `fight_guardian` today). Night 18 stays a guardian night on its guardian track (see P-59). Adds about 8-10 MB to the repo. | Claude | M | P-20 | t60 (`--review`): DRIVE and bpm never drop on 7-20, except the guardian's half-time. Jerry listens in night order. |
| P-22 | From a 5-kill streak each kill heals 1 HP (2 HP from 20), up to 70%. A hurt player has a reason to push. | `registerKill` (`26445`) gets `STREAK_HEAL_CAP_FRAC`. Turret and trap kills never call it (`27064`). The combo line (`26468-26470`) adds "kills heal". ChatGPT updates `streak.rampageHelp` and `tips.waves.streak` by request. Regen stays 40%. | Grokbot | S | D-52; P-13 counter | tNN: combo 4 to 5 heals HP 30 to 31; heals 2 at 20; nothing at 70%; nothing from a trap kill (t14's pattern); regen still stops at 40%. |
| P-23 | Nothing yet. The base reports its damage. | `damageBuild` (`23949-23965`) publishes `build-hit {x,z,type,frac,broke}`, at most once per build every 2 s, plus one on break. | Grokbot | S | none | tNN: one event at frac 0.4, then silence for 2 s. |
| P-24 | On the minimap, builds turn amber below 50% and red below 25%, and flash under attack. A hurt build out of range gets a rim pip. No new light. | `drawMapBlips` (`7603`) reads hp and maxHp as `repairSnapshotOf` does (`22272-22290`), plus `flashT`. Rim pips drawn like the scouting bearings (`ui/scouting.js:37-60`), at most 3. Pure logic in `ui/build-alerts.js`. | ChatGPT | S | none | `ui/build-alerts.test.mjs`. Browser tNN: a wall 60 m behind at 40% shows amber, with a pip within 15° of its bearing. Antigravity night shots. |
| P-25 | One cue, panned toward the wall, when a far build drops below 50% or breaks, beyond today's 40 m hit sound. Optional line "West wall failing". | Listens to `build-hit`. `compassName` (`7447-7452`). Copy in strings. | ChatGPT | S | P-23, P-24 | tNN: one hit to 40% plays one cue; a second hit within 2 s plays nothing. |
| P-26 | Brutes shrug off bullets but not fire or blasts. The flamer and the launcher have a job. | Read the unused `armored` flag (`24988`) in `damageZombie` (`34735`): 0.55 armour against bullets, pellets, blades and the saw; 0.1 against blasts and the flame's direct hit; burn stays full (`37011`). | Grokbot | S | P-6 | tNN: an AK round deals at most 0.45 of base, a launcher shell at least 0.9, a burn tick full, a shambler unchanged. nightsim nights 10, 18 and 20 before and after. |
| P-27 | "Kill the screamer first" is true: its howl pulls up to 3 far zombies up out of the ground near it. | When the cap is full (`36814`), it moves alive shamblers or ferals at least 60 m out with the `riseT` climb (`26361`). Never guards, bosses, spit holders or the guardian; never in view or within 25 m of the marine; moved zombies are un-culled (GB-59). If the screamer is within about 40 m of him, they rise on its far side; with no valid spot it only buffs. | Grokbot | S | GB-59 | tNN at 48 alive: 3 shamblers at 70 m end within 21 m of the screamer, the count stays 48, `waveSpawned` unchanged, none within 25 m of the marine. |
| P-28 | Shoot a bomber inside the crowd and the chain feeds his streak and pays in full. | Credit the blast to the marine when he killed the bomber (`33564`, `27064`), with a new `noPoke` flag so the blast can't poke a cave (`33551-33555`). | Grokbot | S | none | tNN: combo rises by the chain. t59 passes. |
| P-29 | The scouting report names the counter: "Brute packs · plates stop bullets; fire and blasts don't." "Screamers · kill them first." | One line per trick in `scouting.trick.*` (`ui/strings.js:988-1002`) and `ui/scouting.js`. | ChatGPT | S | P-26, P-27, P-28 | `ui/scouting.test.mjs`. Antigravity shot of the board. |
| P-30 | One-time cards: "Press B to build" (day-2 prep, at least 8 Cash, never built), "Press Y for two guns" (first pair), "Press H to jab a MedPen" (HP at or below 40% with a pen). The map key is named in the POI card. Tips gain a tree-felling line. | Existing coach (`ui/coach.js:1-40`) on `prep-state`, `purchase-delivered` and `player-damaged`. `hud-state` gains `medkits` (`20318-20320`). Key placeholders. The felled-tree line goes in `tips.building` (crushing at `34441-34449`). Stored per profile, so D-30 is untouched. | ChatGPT | S | P-9 | `ui/coach.test.mjs`: each card once, never on day 1, none while suppressed. Browser check: the build card is gone once B is pressed. Antigravity shots at 1280 and 390 px. |
| P-31 | The death card shows "Best: Night 9 · 1,204 kills · streak 31" with NEW on beaten numbers, plus "Skulls banked". The title shows his best run. | New `ui/records.js` in coach.js's style, key `tt_best_run {version,day,kills,streak,headshots,skulls,runs,evacuated}`. Written from `endGame` (`30898-30960`) and `quitToMenu` (`37613`). Labels (`30918`) move to `ui/strings.js:924-927`. `matchStats.skullsTurnedIn` reset in `resetGame` (`37773`). | ChatGPT | S | Claude's D-30 reading | `node --test ui/records.test.mjs` (maxima, NEW, corrupt or throwing storage). Browser: die on night 2, see Best with NEW; after a reload the title shows night 2. Antigravity shots at 1280 and 390 px. |
| P-32 | The first guardian catch of a run can be escaped: five E presses during the haul, at a cost of 50 HP and the unbanked skull bag. A second catch, a walk-in or the pit still kill. | Since CL-64 the drag is the studio scene `guardian-grab-drag` (`startGrabScene` / `updateGrabScene` / `endGrabScene` in index.html; the old procedural haul is only the fallback): count E while `sk.scene` hauls (and in the fallback haul), never Space (Space, Enter and Esc skip the scene). Break free with `endGrabScene` first (the scene's `dispose()` hands the guardian and marine back exactly as they were), then clean up as `abortScriptedKill` does. Zero `skullBag` with a receipt. `escape` phase. Line numbers moved with CL-64: find them by name. | Grokbot | S | D-46 | tNN: the escape leaves `scriptedKill` null, not game over, HP at least 1, the bag at 0 and `escape` published; a second catch ends as `caveguard`. t36, t37, t59 and t79 pass (`--review`). |
| P-33 | "Kick free! (E)" during the haul, then "It took your skulls." | Coach and prompt on the `escape` phase; copy in strings. | ChatGPT | S | P-32 | Unit test. Antigravity shot. |
| P-101 | Nothing yet (co-op groundwork, D-58). | `docs/coop.md`: what "a player" is and owns (position, health, armour, guns and ammo, skull bag, input, his rig and camera) and what is shared (Cash, the bank, builds, the night). The players-list API: `players`, `localPlayer`, `nearestPlayer(x, z, {alive})`, `playerById`. The three kinds of `player.position` read: the local view (camera, HUD, sound listener, fog cull, LOD) stays local; game logic (damage, pickups, triggers, AI targets, caves, objectives, scripted kills) goes through the list; his own movement stays. A first sketch of R7: the host runs the game, clients send input and shots, the host sends snapshots (positions quantised, 10-20 a second; animation and ragdolls stay cosmetic on each machine). | Claude | S | D-58 | Jerry reads it; Cursor can build CU-63 from it without questions. |
| P-102 | Nothing visible: the game plays exactly the same with one player. | `players = [localPlayer]` beside the existing `player`; about 528 `player.position` reads sorted by P-101's three kinds, the game-logic ones moved onto `players` / `nearestPlayer`. `tools/check-players.mjs` counts the direct reads outside the allowed places and fails if the count grows (run by `npm test`). `TT.addDummyPlayer(x, z)` adds a standing second marine to the list for tests (drawn as a plain marine, no input). | Cursor | M | P-101 | Every test green, unchanged. `check-players` passes and fails on a planted read. A tNN: a dummy player standing on a skull does not pick it up for the marine; one standing in a cave mouth trips its trigger. Antigravity: a night 5 run plays as before. |
| P-103 | Nothing visible with one player. With a dummy second one, the horde splits between them. | `updateFlowFields` seeds from every living player (a multi-source field); targeting (`tx, tz`), melee reach and `damagePlayer` take the player reached; the guardian's D-13 progress measures to the nearest; the director's distances to the nearest. | Grokbot | S | P-102 | A tNN with `TT.addDummyPlayer` 40 m away: zombies spawned beside each go for that one; one player alone plays as before (t98, t99, t100 unchanged). |
| P-147 | The gun flashlight comes with every weapon from the start: night stays dark, and he always has a light. | `GEAR`'s `flashlight` owned at a fresh start (`GEAR_NONE`), its kiosk row removed, L unchanged; strings. | Cursor | S | D-68 | A tNN: a fresh run has the light on L with no purchase; the kiosk has no flashlight row. |
| P-148 | Skulls the last kill pulls in make a sound as they reach the bag, so he knows he has them. | Where GB-60 pulls the skulls in: one collect chime as they land (not one per skull) and a short "+N skulls" line. | ChatGPT | S | none | A tNN: the pull plays the chime once and shows the count. |
| P-117 | Turrets stop winning the night on their own: what shoots at the horde gets the horde. | Threat memory in `updateZombies`: a zombie hit by a turret or trap targets that build for a while and pulls its pack (the `smash` tactic's target search, `builds`); brutes, demons and about a quarter of each push pick the nearest defence first (D-62); build damage from zombies up (the numbers in the handoff). The marine stays the target for the rest. | Grokbot | M | P-23 | A tNN: a turret that fires draws its target and neighbours within 2 s; a push with turrets up sends at least a quarter at the defences. nightsim with a turret base before and after (Jerry: "breeze through levels"). |
| P-118 | Nothing yet: the table of weaknesses (D-62). | `docs/weaknesses.md`: each kind (shambler, feral, leaper, spider, drowned, military, brute, spitter, screamer, bomber, demon, colossus, guardian) × bullet, pellet, fire, blast, blade, crush: a multiplier, one clear weakness and one resistance each, the counter in a line. P-26's plates as the first row; `fireResist` folded in. | Claude | S | D-62 | Jerry reads it; GB-104 and GP-80 build from it. |

### R3 · The day feeds the night · later

Goal: the relay becomes the day's goal, one pick a day pays off that night, and gear arrives with the acts.

Can run in parallel:
- Claude's P-43 and Cursor's P-44 alongside the radio chain (P-34 to P-40) and ChatGPT's caches (P-41, P-42);
- P-46 to P-49 once P-1, P-2, P-38 and P-108 (the economy without perks, D-59) have re-based the economy.
- The skills (P-104 to P-107) alongside the rest; P-105 after P-102 (the players list).

Jerry's play at the end: days 1-10 fresh.

| ID | What the player gets | How it's built (reuse) | Owner | Size | Needs | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| P-34 | Nothing yet. Every drop can land where the story wants it. | `spawnSupplyDrop({x,z,contents,source})` (`28483-28607`); no arguments behaves as today. A `supply-drop {phase,x,z,source,breather}` event. The unused `airdrop` cue plays (`core/audio.js:1179`). | Grokbot | S | none | tNN: a drop lands within 3 m of its target and grants once. t35 passes. |
| P-35 | Drop news comes as a small notice, not a hard-coded banner. | `#hudNotices` line on `supply-drop`, using the existing `supply.*` keys (`ui/strings.js:891-903`). Replaces the English at `28503` and `28607`. | ChatGPT | S | P-34 | Unit test for each phase's copy. |
| P-36 | After the one-time 6 s repair, the relay can be called once each prep. | In `game/objectives.js`, `claimed` stays terminal (`:39`). A new per-day `callable` state, re-armed at `startPrep`; receipts include the day (`index.html:27468-27470`). | ChatGPT | S | none | `ui/objectives-state.test.mjs`: not callable before the repair, once a day after, cleared by run-reset. |
| P-37 | **Tonight's call.** With the relay up, the HQ board offers three cards and he takes one: Ammo crate, Medical crate (2 MedPens and 2 grenades), Hardware crate (the cheapest turret blueprint he doesn't own), Scout's eye (Field Intel free), or, from night 4, the Lights out dare. One click; the offer is gone at the alarm. Each day the panel carries one line in the relay's voice. | Pure `drawCalls(rng, night, owned)` in a new `ui/radio-call.js`, on the pattern of `ui/bounties.js`. The pick is a `radio-call {card}` event. `Math.random`, never the world seed. Board only (D-37, GP-39), nothing on the dawn banner (D-39). Without the relay, one line says it is down. | ChatGPT | S | P-36, D-53 | Unit: 3 distinct cards, one pick a day, refused after the alarm, cleared on reset. Browser: cards appear only with the relay up. Antigravity shots at 1280 and 390 px. |
| P-38 | A crate pick brings the plane over the mast. The crate lands 20-40 m from it with a small guard pack, so collecting it is a daylight fight. It waits until the alarm. | P-34 with defenders from the radio's spawn (`27287-27368`), sized to the day. Once the relay is up, the random timer (`28513-28518`) stops. Before that it stays at one drop per night (D-49). | Grokbot | S | P-34, P-37, D-49 | tNN: with the relay down, at most one random drop a night and none by day. A Medical call lands within 40 m of the mast and grants once. A second call the same day is refused. The crate exists 120 s after landing. |
| P-39 | The Lights out dare: the HQ lamp stays dark tonight and kills pay 25% more skulls. | `wavePreview.night.order`, frozen at `startPrep`. `updateHQ` gates the lamp every frame (`20091`, `hqBlackout ? 0 : ...`), because a value set once at `beginWave` would be overwritten the next frame. Pay ×1.25 on the Ember line (`27066`), capped so Ember × dare is at most 1.75. | Grokbot | S | P-37 | Day-5 tNN: the lamp stays 0 through the wave; a shambler pays base ×1.25; nothing changes without the dare; cleared at the next prep. t78 passes. |
| P-40 | The dawn banner says what the dare earned. | One line in `ui/dawn.js` (text only, D-39). | ChatGPT | S | P-39 | Unit test. Antigravity shot. |
| P-41 | From day 2, two of the five caches restock with something new. | `restock(day, picks)` in `game/objectives.js` moves `claimed` back to `available`. A small table: 2 grenades, 2 MedPens, an ammo pack or a blueprint (`grantSupply` / `grantBuildBlueprint`). Validation (`:105-119`) accepts it. The day goes in the receipt. | ChatGPT | S | none | `ui/objectives-state.test.mjs`: restock works, day 1 never restocks, receipts differ per day. |
| P-42 | The board lists "Restocked: Hikers' camp · 2 grenades". The minimap marks it only after he has read the board. | `createBountyIntel`'s read-then-mark pattern (`ui/bounties.js:28-47`). | ChatGPT | S | P-41 | Browser: two rows at day-2 prep, marks only after reading, E grants the pack. |
| P-43 | Guarded wrecks and sheds have fuel drums that chain, back every morning. | Re-enable `buildBarrels` (`5513-5547`; commented out at `7132`) at the wrecks, sheds and mast only, at most 8, fixed seed. Keep 30 m from mouths, 35 m from the HQ and 8 m from objectives. Merge each drum into 1-2 draws. Restore at prep. Fix `barrelExplode`'s material and stub leak (`5596-5600`). Map drums pass `defense:true` (`33549`). | Claude | S | none | tNN: 6-10 drums in the same positions on two loads, none in an exclusion; a drum by a bounty pack hurts it and pokes nothing; no stubs pile up. `tools/bench.mjs megaswarm` no regression. Antigravity day shots. |
| P-44 | Space next to his own sandbag, wire, barricade or an unbarred window hops him over in about 0.5 s. Out over his line for skulls, back in for the push, never trapped in his own fort. | A shortened zombie window-climb (`23861-23887`) with `seekZombieWindow`'s landing checks (`23824-23858`). The barricade shove (`35204-35230`) is skipped during it. No firing; he keeps 70% of his speed. Walls, gates and doors can't be vaulted. ChatGPT adds the controls hint by request. | Cursor | S | Claude confirms the owner | tNN on a pad: at least 0.5 m past the far face within 0.8 s, grounded and overlapping nothing; walls give only a jump. A ring of barricades is escaped. t49, t64 and t75 unchanged. |
| P-45 | With the relay up, from night 3, one crate falls in the breather 28-40 m out toward tonight's caves. Run for it or hold the line. | Where `inLull` is set (`28233`), call P-34 aimed along `waveBearings[0]`. Receipt `breather:<day>:<push>`. At most one a night. | Grokbot | S | P-16, P-38 | tNN: exactly one drop in the breather on the right side; none on nights 1-2 or with the relay down; the receipt applies once. |
| P-46 | Equipment prices stop climbing each night. Better guns are stocked from a set night. | Drop the night markup for equipment (`game/economy.js:6-17`); add a pure `equipmentStocked(key, night)`. Illustrative, agreed with Grokbot: R4 night 4 about $180, AK night 5, AA-12 night 10 about $650, minigun night 14. Perks keep their per-rank climb. Re-run the model with P-1, P-2 and P-38. Trim late skull value if too much Cash goes unspent. | ChatGPT | S | D-48, P-2, P-38 | `ui/economy-progression.test.mjs` rewritten, including the twenty-night budget test. `--review`. |
| P-47 | An unstocked gun shows "Arrives night N". On arrival the dawn tip says "New at the kiosk: AA-12". | Kiosk render (`19098-19230`), weapon-wheel price (`16642`), dawn tip (`ui/dawn.js`). | ChatGPT | S | P-46 | `ui/economy-progression.browser.mjs` on nights 1, 4, 10 and 20. Antigravity kiosk shots. |
| P-48 | One mod per gun: the extended mag (more rounds, reload ×1.25), or a heavy barrel on the R4, AK, Uzi and minigun (half the climb, a 0.45 s swap, double the movement spread). | `startReload` (`31578-31580`); `WEAPON_RECOIL` (`32432-32438`); `SWAP_DUR` (`16677`). `weaponMods()` and `mod:heavy:<w>`. Today's extended mag becomes one choice of the slot, a nerf Claude signs off. | Grokbot | S | P-46, Claude's OK | tNN: AK reloads in 2.0 s bare and 2.5 s with the mag; barrel climb at most 55% of bare; fitting one un-fits the other. |
| P-49 | Both mods on the kiosk's Upgrades tab, with the fitted one marked and a free switch. | Upgrades tab (`19159-19187`); `shop.upgrade.*` strings. | ChatGPT | S | P-48 | Browser check of the rows and prices. Antigravity shot. |
| P-104 | Nothing yet: the spec for skills by doing (D-59). | `docs/skills.md`. Six skills, ranks 0-5, reset on a fresh start (D-30), one set per player (D-58). What counts: **Vitality** 2 XP a dawn survived, 1 for a comeback (under 25% HP, alive and above 50% within 30 s, once a night); +15 max HP a rank (was +20). **Stopping power** 1 XP a headshot kill, 1 a one-shot kill; +8% damage a rank (was +12%). **Quick hands** 1 XP a reload started at or under a quarter magazine with a zombie within 8 m; +10% a rank. **Fleet foot** 1 XP per 10 s running with a zombie within 15 m closing in, 1 per dodge roll within 1.5 m of an attack; +5% a rank, +25% at 5. **Scavenger** 1 XP per 10 skulls banked at the HQ; +6% skull value a rank, +30% at 5. **Grenadier** 1 XP an explosive kill of 3+, 2 for 5+ (grenade, launcher, drum); +1 grenade and +8% blast a rank; the free grenade each day from rank 1. Thresholds tuned so a good run reaches rank 3-4 in most by night 20. Streak boosts renamed (for example "light step" and "steady hands"). | Claude | S | D-59 | Jerry reads it; CU-62 and GB-101 build from it without questions. |
| P-105 | The Perks tab is gone; nothing else changes until the counters land. | Remove `PERKS`, `perkLevels`, `perkCost`, `resetPerks` and the shop rows (`index.html` about 19018-19045, 19456); a per-player `skills` store with `addSkillXp(player, key, n)`, `skillLvl(player, key)` and a `skill-up {player, key, rank}` event; the multipliers read skills; reset in `resetGame`. | Cursor | S | P-104, P-102 | t25 and the perk tests re-based; a tNN: 20 XP of Fleet foot gives the rank P-104 says and the speed with it, and a fresh start clears it. |
| P-106 | The marine gets better at what he does: headshots hit harder, reloads under pressure get faster, running from the horde makes him quicker. | The counters in combat and movement, each calling `addSkillXp`: kills (`damageZombie` headshot, one-shot), reloads (`startReload` with mag and nearest-zombie checks), running while chased and rolls (GP-75), blasts (the explosion kill count), dawns and comebacks. | Grokbot | M | P-105 | A tNN per skill: the action gives XP, the farm doesn't (reloading a full mag, running with nobody near, taking damage). nightsim medians before and after. |
| P-107 | A skills panel and a toast: "Fleet foot · rank 2". | Pause menu and death card rows (rank and progress), a toast on `skill-up`, the Perks tab removed from the kiosk, strings (and the streak boosts' new names). | ChatGPT | S | P-105 | Unit tests; Antigravity shots at 1280 and 390 px. |
| P-108 | Cash still matters without perks to buy. | The GP-41 table redone without perk spending (they were a large sink: 6 perks × 5 ranks); skull values or new sinks adjusted; feeds P-46 and P-47. | ChatGPT | S | P-104 | `ui/economy*.test.mjs`; the table in the handoff; nights 10-20 still have something worth saving for. |
| P-109 | Rain puts fires out (D-60). A burning zombie in a downpour goes out quickly and stops setting others alight; campfires drop to embers while it pours and come back after; the marine doesn't light up in the rain, a lit cigarette hisses out when a shower starts, and a dropped butt leaves no ember. | Burning zombies: `z.burnT -= dt` (`updateZombies`) runs down `1 + 1.8 × weather.intensity` times faster, as ground fires already do (`updateGroundFires`), and the spread to other zombies is scaled by `1 - intensity`. Campfires: `updateCampfires` scales flame, light and crackle by `1 - 0.8 × intensity`, with a steam puff as they drop. The cigarette: GP-74's idle (`studio/marine-idle.js` and its index.html hook) skips the smoke while `weather.intensity > 0.1`, puts out a lit one with a small puff, and `spawnGroundFire(..., cigarette)` returns early in the rain. | Grokbot | S | GP-74 | tNN: in full rain a burning shambler burns out at least twice as fast and lights nobody; a campfire's light drops and returns; `shower` mid-smoke ends the cigarette and no ember is left. nightsim on a rainy night, flamer kills before and after in the handoff. |
| P-110 | Nothing yet: the loadout spec (D-61). | `docs/loadout.md`: primaries (M4, AK, AA-12, shotgun, sniper, launcher, flamer, minigun, chainsaw) on the back, secondaries (Uzi, revolver, a second pistol) in the cross-draw holsters, the base pistol on the hip; blades outside the slots; akimbo as two of one secondary; the Armory's storage for the run; the magazine model (stow with R, drop with a double tap, lost at the next dawn or dusk, speed loaders, the round-by-round guns); the holster key; unarmed +10%, +30% in all with Fleet foot. | Claude | S | D-61 | Jerry reads it; CU-64 to CU-66 and GP-78 build from it. |
| P-111 | He can put the gun away: the pistol lives in his leg holster, and unarmed he moves faster. | The drop-leg holster already modelled (`index.html` marine build, "Holster on a drop leg rig") gets the pistol; a holster key puts away whatever is out; unarmed: no weapon, `speedMult` +10% under the combined cap. The swimming holster (`index.html` "Holster whatever gun is equipped while swimming") reuses it. | Cursor | S | P-110 | A tNN: holstered, no shot fires and the speed is ×1.10; with Fleet foot 5 it is capped at ×1.30. |
| P-112 | An Armory window at the HQ: four slots to fill before the day, and everything else kept. | A pure `game/armory.js` (slots, rules, storage, what the kiosk hands over) with unit tests, and the window beside the CIF window (CU-61). | ChatGPT | S | P-110 | `node --test game/armory.test.mjs`; Antigravity shots at 1280 and 390 px. |
| P-113 | The loadout is real: only four guns and the pistol go out; the rest waits in the Armory with its magazines. | `game/armory.js` wired into the weapons (`ammoByWeapon`, `reserveAmmo`, `buyWeapon`), the loadout applied before the day, the weapon wheel filtered to what he carries, purchases stored when the slots are full; per player (P-102). | Cursor | M | P-112, P-102 | A tNN: hand in the M4 with 4 mags, take it out next day with the same 4; the wheel shows 5 guns at most. |
| P-114 | Magazines: R stows the old one in the dump pouch with its rounds; a double tap drops it for a fast reload, and it's gone unless picked up by dawn or dusk. | Magazines as `{rounds}` per gun instead of one reserve count (`reserveAmmo` per caliber today); stow and drop reloads with their own times; a dropped magazine as a pickup; speed loaders for the revolver; the shotgun and launcher load round by round (D-61; `docs/loadout.md`); akimbo drops and stows both; restock sells magazines (GP-77). | Cursor | M | P-110 | tNN: a stow keeps the partial magazine; a double tap is faster and leaves a pickup that is gone at the next phase change; the shotgun still loads shell by shell; t25 and the ammo tests re-based. |
| P-115 | The HUD shows each magazine and how full it is; no more "spare". | Magazine icons with a fill level beside the ammo count (`ammoDetailEl`, "' spare'" today), shells and rounds for the round-by-round guns, strings. | ChatGPT | S | P-114 | Unit test; Antigravity shots. |
| P-116 | What he carries shows on him. | Studio parts on the marine rig: two slung primaries, cross-draw holsters, the hip pistol, mag pouches, grenades, a shell bandolier, a 40 mm belt, the backpack; each in 3-4 stages by what is left; the draw and holster moves as clips. | Claude | M | P-113 | Jerry's "good" in the studio review folder; Antigravity shots full and empty. |
| P-119 | Each kind needs its own answer. | P-118's table in `damageZombie` (`kind` × type), `fireResist` and the plates folded in. | Grokbot | S | P-118, P-26 | A tNN per row of the table; nightsim medians nights 5-20 before and after. |
| P-120 | The game tells you the counters. | `ui/scouting.js` and the first-use cards read P-118's table; strings. | ChatGPT | S | P-118 | Unit tests; Antigravity shot of the board. |
| P-121 | The M240B in the build menu beside the mortar (for Jerry's brother). Tripod only, belt-fed, 1,000 rounds, operated by the marine. Both come with half their maximum (the mortar already has its 60 mm shells). | A build like the mortar (its placement, carry and operate code, `mortarOnDeck`): mounted fire only, a belt of 1,000, a new model; the mortar's 60 mm reserve cap (`RESERVE_CAP_BASE`, 16 today) with half of it on purchase. | Cursor | M | none | A tNN: bought with 500 rounds; won't fire unmounted; carried and placed like the mortar; the mortar bought with half its shells. Antigravity video. |
| P-125 | The marine looks sharper: less bulky, a touch more stylized. No ear defenders until he has the helmet. His facemask is coyote brown, always on. | The marine build in `index.html` (the vest, pouches, radio, headset and helmet groups, `gearParts`): slimmer proportions and fewer, cleaner parts; the headset moves into `gearParts.helmet`; `maskDark` becomes coyote brown (#81613c). Every wearable item as its own part with its own material, ready for D-66. | Claude | M | none | Jerry's "good" in a studio review folder (front, side, back, in the field at night); t0 and the marine tests pass; the frame budget holds (P-88). |
| P-126 | The guns look sharper, and six of them can wear a suppressor that belongs on them. | Each gun's `make*` build trimmed to the same style as P-125; suppressor models for the M4, AK-47, pistol, sniper, Uzi and shotgun (a can shaped for each: rifle cans, a pistol can, a longer sniper can, a boxy shotgun can), hidden until fitted, the muzzle point (`userData.muzzleLocal`) and flash moved to the can's end when fitted. | Claude | M | none | Jerry's "good" on each gun with and without its can. |
| P-127 | A suppressor for each of the six guns in the kiosk's Upgrades. | Like the extended mag (`EXT_MAG_PRICE`, `buyExtMag`, `extMag`): a `suppressor` store per gun, prices set in the handoff, the can shown on both guns of an akimbo pair, reset on a fresh run. No gameplay change until P-129. | Cursor | S | P-126 | A tNN: bought, the can shows and the muzzle point moves; the AA-12 has no row; a fresh run clears it. |
| P-128 | A fire selector: semi-auto for the M4, AK-47 and AA-12 from the start; full auto for the pistol as an unlock, hard to control. | A per-gun `fireMode`; a key toggles it (proposed `K`: I, J, K, O, P and U are free); semi fires on the click only (`tryFire` already does this for the shotgun) with a tighter group; the pistol's auto sear bought in Upgrades: a fast rate with climb and bloom well past the Uzi's (`WEAPON_RECOIL`, `aimDirWithSpread`); the mode beside the ammo count; `docs/controls.md`. | Cursor | S | none | A tNN: semi fires once per click; the pistol on auto spreads wider than the Uzi after 10 rounds. |

### R4 · The way out · later

Goal: a run can be won, and the story is told.

| ID | What the player gets | How it's built (reuse) | Owner | Size | Needs | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| P-50 | From the goal night, with the relay up, the boat can be called for tonight. Declining is "stay": it is offered again each prep, and nights keep growing (`26196-26206`). | `startPrep` sets `night.extraction:'offered'`. An `extraction-request` (like `alarm-request`, `20182-20190`) starts the normal night flagged `called`, same `NIGHT_PLAN`. At the last push the flag becomes `due` and an `extraction {phase}` event goes out. | Grokbot | S | D-45, P-16, P-17, P-36 | tNN: offered only on the goal night with the relay up; the request starts the wave; the last push sets `due`. |
| P-51 | "Call the boat" sits beside "Sound the alarm". Without the relay one line says it is down. The dock blinks on the minimap once the boat is due. | `ui/wave-preview.js`, strings, one blink in `drawMapBlips`. The night starts only from the panel (D-39). | ChatGPT | S | P-50 | Browser check of the button, the relay-down line and the event. |
| P-52 | As the last push starts, flares go up at the dock, a horn sounds, and a boat with a lamp slides in. | The dock's rowboat (`4801-4816`) animates in over about 20 s. `launchFlare` at the dock (`20236-20262`) within the effect-light budget. Horn cue. No layout change. | Claude | S | P-50 | tNN: docked within 25 s of `due`. Antigravity night shots, fps with 48 no worse. |
| P-53 | He boards by holding E for 2 s on the deck. The boat waits from its arrival until he boards or sounds the next alarm. The last kill's dawn sweep and banner (D-39) run as usual and do not end the window. Boarding before the last kill is a "hot extraction" on the record. | CU-10 hold-E pattern (`docs/contracts.md:151`), then `endGame(true)` (`30898-30959`) after any finisher camera, because `won` freezes a lot. No death-log entry. The dock is roughly 115 m from the HQ on the drowned's shore: an estimate from `LAKE` (`1954`) and the dock placement (`2691-2699`), measured in this test. | Grokbot | S | P-52 | tNN: board during the surge and after the last kill both give `won === true`, `#win.show`, music mood `dawn`, and no new `tt_death_log` entry. The measured dock distance goes in the handoff. |
| P-54 | A win shows a closing line, nights survived, kills, headshots, best streak, skulls banked and the best-run line. | Victory copy moves to the unused `gameOver.win/.winHelp` (`ui/strings.js:917-919`; hard-coded at `30907`, `30916`). Records gain "Got out on night N". | ChatGPT | S | P-31, P-53 | Browser check of a forced win. Antigravity shots. |
| P-55 | About 12 lifetime badges on the death card and title: Relay online, Out on the boat, Kicked free, Survived Fog Night, 1,000 skulls banked. | Event-driven list stored beside `tt_best_run`; the reserved `achievement` cue (`core/audio.js:1179`). Badges only, never power (D-30). Two check-ins: store, then UI. | ChatGPT | M | P-31 | Unit tests for each trigger and storage tolerance. Antigravity shots. |
| P-78 | Nothing directly: a full run is timed. | A headless 20-night run with the boat called on 20 (`tools/nightsim.mjs --full`), and Antigravity's real run on the GPU. | Cursor, Antigravity | S each | P-53 | Both times in the handoffs. Over about 2 h triggers D-45's early boat. |
| P-86 | The relay speaks: one line each morning once it's up, the story a piece at a time. The camps' notes and the convoy's say one thing each. | `docs/story.md` (Claude: the bible, the relay's 20 lines, the survivors' lines, the props' notes), then the copy in `ui/strings.js` and a line on the board (ChatGPT). | Claude, then ChatGPT | S each | P-36 | `ui/strings.test.mjs` has all 20 lines; Antigravity shots of the board on nights 4, 10 and 16. |
| P-130 | Nothing yet: the dressing room spec (D-66). | `docs/wardrobe.md`: slots (helmet, facemask, trousers, holster, hat, gloves, shorts, backpack, armour and straps, boots, weapons), options (hats: 8-point, boonie, ballcap forwards or backwards; gloves; sleeves; shorts; boots black, brown or tan; hair, eyes, skin), what takes camo, the four base camos and the earning plan (days survived, kill streaks, badges), one wardrobe per player (D-58), the mask always on. | Claude | S | D-66 | Jerry reads it and picks the four base camos. |
| P-131 | The CIF becomes a dressing room: a 3D view of the marine you can turn 360, and each item dressed on its own. | The CIF panel (CU-61) grows item tabs and a turntable preview (a second small render of the marine rig), each item's pick applied live, saved to the profile beside `tt_camo`. | Cursor | M | P-130, P-125 | A tNN per item: the pick shows on the marine and survives a reload. Antigravity video of the turntable. |
| P-132 | Hats, gloves, sleeves, shorts, boots, hair, eyes and skin, and camo on the guns. | Parts on the marine rig for each option from P-130; camo as a texture per item and per gun (the shared camo tile of CU-61 becomes one per item). | Claude | M | P-125 | Jerry's "good" in the studio review folder for each option. |
| P-133 | Four camos to start; the rest earned. "dapper dan" unlocks everything. | `ui/unlocks.js` (pure, unit-tested) on the run events (`registerKill` streaks, dawns, badges) per P-130's plan, `tt_unlocks`, toasts, locked items in the dressing room, the console command. | ChatGPT | S | P-130 | Unit tests per rule; the cheat unlocks all; Antigravity shots. |

### R5 · Named nights and bigger systems · later

Goal: Fog Night, the siege, the wanderer, survivors, the guardian boss on its rig, the secret, and the Hollows
under the caves by day (D-67).

| ID | What the player gets | How it's built (reuse) | Owner | Size | Needs | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| P-56 | Night 14, the lake surge, is Fog Night, named the prep before. | An optional `mod` on `NIGHT_PLAN` entries (`26173-26195`), carried into `wavePreview.night.mod` and `getWaveDirectorState`, cleared at `startPrep` and run-reset. Totals and tricks untouched. | Grokbot | S | D-54, P-16 | tNN: `night.mod === 'fog'` on 14 and null elsewhere; t78 totals hold. |
| P-57 | On Fog Night he sees about 30 m, goggles on or off. The music still has its breather-and-surge arc. | Fog near about 6 m, far about 32 m during the wave, applied after `updateDayNight` and beating the NVG override (`1874-1881`). The night keeps its sectioned song (`fight_n14`), because `fight_fog` is a plain `.mp3` loop with no `_sections.ogg` in `assets/soundtrack/`. | Claude | S | P-56, P-19, P-24 | tNN: `fog.far` at most 35 with NVG on, restored at prep; `musicState().section` changes through the night; P-24's pips still draw. Antigravity shots NVG off and on, plus fps. |
| P-58 | Optional: Fog Night gets its own score without losing the arc. | Render a sectioned fog variant with `tools/hordes.py`; `special = 'fog'` (null today, `38098-38101`) routes to it in `startFight` (`core/audio.js:1206-1213`). | Claude | S | P-57 | t61 plays it; sections change; Jerry listens. |
| P-59 | Night 18's "siege" trick becomes real: brutes and soldiers go for his walls. It stays a guardian night on its guardian track (P-21), with no second music plan. | Brutes and soldiers spawn with the dormant `smash` tactic (`36505-36521`). With no walls they fall back to the marine. No `mod` needed; it is the existing trick. | Grokbot | S | Claude's D-13 call | tNN: spawned brutes carry `smash` and seek a placed wall; totals unchanged; the guardian's rules unchanged. |
| P-60 | The board warns "Fog Night" and "The siege · they'll go for your walls". | One warning and one scouting line each, in strings and `ui/scouting.js`. | ChatGPT | S | P-56, P-59 | `ui/scouting.test.mjs`. Antigravity shot. |
| P-61 | Some days from night 7, a colossus walks a trail between far POIs. Loot around it, or bring it down by day for a big payout. | A bounty variant with a moving post along `PATHS` (`2494-2495`). Wakes on the guard rules (`36474-36481`), re-paths when stuck (as D-13 does), leaves at the alarm. Never on `day%5==0` or a guardian night. `wanderer` kind. | Grokbot | S | none | tNN: moves at least 10 m in 20 s while unaware; a hit wakes it; a kill adds at least 120 to the bag with `bounty-done`; the alarm removes it with reason `alarm`. |
| P-62 | The board says "A colossus is walking the east trail". COLOSSUS DOWN reads from strings. | `ui/bounties.js` row; banner (`27074`) keyed. Reward tuned against D-38. | ChatGPT | S | P-61 | `ui/bounties.test.mjs`. Antigravity shot from 30 m. |
| P-63 | At a camp with a survivor bounty, an unarmed person sits by the fire, and is at the HQ next morning. | The marine rig without a weapon, idle, placed at the camp and later by the HQ. | Claude | S | D-47 | TT shows and hides the figure. Antigravity shots. |
| P-64 | From night 3, at most once per camp per run, a camp bounty holds a survivor. Clear the guards and press E. | Variant in `spawnBounties` (`28005-28027`) with a `survivor` field. Zombies never target them and nothing damages them. `getSurvivors()`. | Grokbot | S | P-63 | tNN: E does nothing before the guards die, then adds the survivor; reset clears. |
| P-65 | For the rest of the run: the hikers' medic lets regen reach 50%, the trapper cuts repairs by 25%, the ranger sets up a light turret by the HQ. | `REGEN_CAP_FRAC` (`16715`), `repairCostOf` (`22245-22247`), one free light turret. Capped with the other health levers (D-52). | Grokbot | S | P-64, D-52 | tNN for each perk; reset clears. |
| P-66 | The board says "Someone lit a fire at the trapper's camp". The victory screen counts "Survivors aboard: 2". | Board row and strings; a victory line. | ChatGPT | S | P-64, P-54 | Bounty tests; browser check of the victory line. |
| P-67 | The guardian you can fight on nights 6, 12 and 18 looks like the one in the cave, not a stretched zombie mesh (`25692-25700`). | The studio rig and clips from CL-62 on the boss. D-13's rules and D-25 stay. | Claude | M | D-55, CL-62 | P-12-style review gate (stats under 0.3 rad, Jerry's "good", t79); fps on a guardian night. |
| P-68 | P-32's escape gets a real let-go beat. | A studio clip in CL-62's review loop. | Claude | S | P-32, CL-62 drag clip | The review gate passes; t79 passes. |
| P-69 | Nothing yet: a spec for "the signal from the lake". The relay crackles, pit stones pulse in order seen from the tower at night, he enters the glyphs at the radio, and a rune variant of an existing gun is left on the dock. | `docs/specs/secret-quest.md`. Nothing in the world moves, and no step enters a grab zone (the stones sit inside `grabR`, `7066-7068`, `30885`). | Claude | S | D-56, after R4 | Jerry says yes or no. |
| P-94 | Nothing yet: the secret quest's spec. | `docs/specs/secret-quest.md`: the relay's pattern, the stones seen from the tower, the glyphs at the radio, the silenced night, the chalk-cave fight, the true ending and the rune gun. No world moves, no step in a grab zone (`7066-7068`, `30885`). | Claude | S | P-86 | Jerry says yes (or changes it). |
| P-95 | The world side: the stones pulse in order at night, seen from the tower; the lake goes quiet when the signal is silenced. | Pit runes (`world/`), the relay's pattern as data. | Claude | S | P-94 | TT shows the pulse order; Antigravity shots from the tower. |
| P-96 | The glyphs at the radio, the silenced night on the board, the true ending screen and the rune gun at the dock. | `ui/quest.js` (a pure model, on `ui/bounties.js`'s pattern), strings, the victory screen's second ending. | ChatGPT | M | P-94 | Unit tests: the right order silences, a wrong one doesn't; the ending shows. |
| P-97 | The fight: on a silenced night the guardian comes out of the chalk cave on its studio rig, and can be killed there and only then. (Jerry, Q-4: the fight moves underground, deep in the chalk heart behind the rune doors, D-67.) | The guardian night's fightable kind (D-13) on the P-67 rig; the true ending on its death. | Grokbot | M | P-96, P-67 | tNN: the kill only counts on a silenced night; the ending fires once. |
| P-98 | Swarm Night: night 17's runners from every cave, faster pushes, named the day before. | `mod: 'swarm'` like P-56; a board line. | Grokbot, ChatGPT | S each | P-56 plays well | tNN and a board line; Antigravity fps. |
| P-122 | Lightning in storms: 5 strikes a storm, a tree set burning now and then, zombies killed where it lands, and now and then a strike on the marine for 70 damage (a death if he's at 70 or less). Insulated boots hidden on the map make him immune. | A strike during a shower (`weather`): a flash, thunder, a bolt mesh; rolls 1/50 tree (`igniteTree`), 1/100 kill in a radius, 1/200 the marine (70 damage through `damagePlayer`, cause `lightning`), never under godmode. The boots: a hidden pickup (the spot in the handoff), worn for the run, visible on him, zero lightning damage. | Claude | S | D-60 | A tNN with the odds forced to 1: each outcome happens; 70 damage at 100 HP leaves 30; at 60 HP it ends the run as `lightning`; with the boots, no damage. Natural odds over 10,000 simulated strikes within 20% of the stated ones. |
| P-123 | A rabbit mound out of the way, with bones and a skull round it. Shoot it and a white rabbit takes the marine's head off, unless he has found the knockoff holy grenade: pull the pin, an angelic choir, and the rabbit is done. | One burrow (`burrows`) picked far from the paths, dressed with bones and a skull; a shot into it spawns the rabbit, a lunge and the head off (`lastDeathCause = 'rabbit'`). The grenade: a hidden pickup (the spot in the handoff), its own model, a choir cue on the pin pull (`core/audio.js`), the only thing that kills the rabbit. Our own models, names, sounds and words. | Claude | S | none | tNNs: a shot into that mound ends the run as `rabbit`; other mounds are harmless; with the grenade thrown at it the rabbit dies and the run goes on; the choir plays on the pin. Antigravity video. |
| P-124 | Two new deaths to collect on the tombstone (struck by lightning, and the rabbit), a badge for killing the rabbit, and names for the boots and the grenade. | `DEATH_WAYS` gains `lightning` and `rabbit`; lines in strings; the tombstone's unlock (D-31); the badge in `ui/badges.js` (P-55); pickup names and lines for the two hidden items. | ChatGPT | S | P-122, P-123 | Unit tests; Antigravity shot of each on the tombstone. |
| P-129 | Suppressed fire draws the horde less, but hits a little softer. | First the hearing rule the Not now row asked for: a shot draws zombies within a radius by gun (they turn and come); then suppressed shots are heard at a fraction of it and deal slightly less damage. | Grokbot | M | P-127 | tNNs: unsuppressed M4 fire draws a zombie at 40 m, suppressed not; suppressed damage lower by the handoff's figure. nightsim before and after. |

#### The Hollows: underground by day (D-67, Jerry 2026-09-29)

Jerry asked for a way past the cave guardian into an underground cave system: fought through by day only, for
extra Cash and finds (blueprints, weapons), no building, and part of the story. Planned by Cursor at his order;
nothing is built yet. The spec (P-134) comes first and needs Jerry's yes, because this is an XL system.

**How it works.**
- **Where.** Under five of the six caves: root, shale, iron, wet and hill. Each has its own *warren*. The chalk cave
  stays deadly: it's the guardian's home, over the source.
- **Getting past the guardian: the Hush.** It's a box built from the relay's spare board. It plays the signal back
  out of step, so the guardian can't hear the man carrying it.
  - He gets it the morning after the relay is repaired, so Act 1 still teaches "don't go in" and Act 2 opens the
    caves.
  - The HQ charges it once each dawn: one delve a day, like one call a day (D-53).
  - Lit at a mouth, it stops the walk-in grab, and E takes him down.
  - Without it, everything topside stays as it is: the poke chase (D-26), the walk-in grab and the first-catch escape
    (D-46).
- **Daytime only.** He goes down only in prep. The alarm panel is topside, so the night can't start while he's
  below. Nothing topside moves while he's under (prep has no clock), so a delve costs risk and supplies, not the
  day.
- **Down there.**
  - Three depths: the Mouth, the Galleries and the Deep, each darker than the last. The gun light and the NVG
    matter, which gives them a use by day.
  - Sleepers in alcoves wake to noise and light. Nests feed a chamber until blown up.
  - Each cave's role (`CAVE_ROLES`) applies to everything below it.
  - Each Deep has one set piece: a knot of climbers in the roots, flankers in the shale clefts, an armoured mine crew
    in the iron workings, the drowned in a flooded gallery, and the barrow king on his bier.
  - No building of any kind: no build mode, no shovel, no tripods.
- **The stir.**
  - Gunfire fills a meter below, suppressed fire much less (D-65) and blasts most. The Hush keeps it down.
  - When the meter fills, or the Hush runs flat (about 8 minutes), the walls answer: dust, a screech, ten seconds,
    then the guardian comes through the rock.
  - A bolt-hole or the way out saves him. The run's one kick-free still applies (D-46: it costs 50 HP and the bag).
  - Otherwise it's the cave death. Death below ends the run like anywhere else.
- **What he brings up.**
  - Skulls from the kills. The loop stays skulls, then bank at the HQ window, then Cash.
  - Supply crates: ammo and MedPens.
  - Each warren's Deep has one strongbox a run. It holds one of:
    - a blueprint he doesn't own;
    - a gun before its arrival night (D-48);
    - a weapon mod (P-48);
    - an earned camo (D-66);
    - a rune shard.
  - The convoy's dog tags.
  - A full delve's median pays about half the same day's night in skull value, so the nights stay the main road.
- **Passages.** Clearing a warren's Deep opens a tunnel to the next cave round the compass for the rest of the run.
  By day he can go in at one mouth and come out at the other.
- **The story.**
  - The convoy never arrived because the dead dragged it under. Its wreckage is in the Galleries, and twelve dog
    tags across the five warrens each carry a line.
  - The Hollows are old mine workings and barrows that the signal woke: the runes run through the rock from the pit,
    and the deeper he goes, the louder it sings.
  - Every Deep has a sealed rune door facing the lake, toward the chalk heart. It hums, and it stays shut.
  - Rune shards give pieces of the pit's order, a second way into the secret (D-56).
- **The rules it keeps.**
  - Topside nothing moves: seeds, the world's layout and the cave positions stay as they are (rule 10).
  - The warrens are laid out from their own dice with a fixed seed, from a fixed kit per theme: the same layout every run (Jerry, Q-4).
  - Cleared warrens stay cleared for the run, and there are no saves (D-30).
  - Co-op (D-58): the party goes down together; the details wait for R7. The runtime reads the players list from
    the start.
- **Jerry's answers (Q-4, 2026-09-29).**
  - Caught below ends the run.
  - The same layout every run, so the warrens can be learned.
  - The secret's final fight (D-56, P-97) happens deep in the chalk heart, behind the rune doors, not at the chalk mouth.

| ID | What the player gets | How it's built (reuse) | Owner | Size | Needs | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| P-134 | Nothing yet: the Hollows' spec. | `docs/specs/hollows.md` covers: the Hush and the mouth rule; the five warrens (theme, kit, set piece, strongbox); the three depths, their sizes and a delve's length (a full clear is about 8-10 minutes); the stir; the loot, with ChatGPT's numbers; the story beats; what topside does while he's below; the runtime contract agreed with Cursor (enter and leave, the ground and collider providers, the nav grid); co-op; and the answers to Jerry's three calls (Q-4). Rule 10 sign-off on the warrens' own dice. | Claude | M | D-67, P-86 | Jerry says yes. Cursor, Grokbot and ChatGPT can each start from it without questions. |
| P-135 | The Hush: from the dawn after the relay is repaired, one charge a day. Lit at a mouth, the walk-in grab doesn't fire, and E takes him down. The chalk mouth refuses: "Too close to the source." | A charged/lit state at the HQ, re-armed at `startPrep` once `radioCall.repaired`. The walk-in grab (`checkScriptedKillTriggers`) checks it; the poke chase (D-26) doesn't. Contract: `hush-state { charged, lit, cave, battery }`. | Grokbot | S | P-134, P-32 | tNN: without a charge the walk-in grab fires as today; with one, E at a non-chalk mouth takes him below and spends the charge; the chalk mouth refuses; a poke still starts the chase; one charge a day; a run reset clears it. |
| P-136 | Going down and coming up: a fade, and he stands in the warren's mouth tunnel. Nothing topside moves while he's below, only the warren is drawn, and building is refused with a line. | `core/hollow.js`: enter and leave; the topside frozen and hidden; the ground and collider providers switch (`sampleHeight`, `entityGroundY`, `worldSolids`, build solids) to the warren's; a nav grid from the kit's tiles for the zombies' flow field; build mode, placing, the shovel and tripods refused; the map shows the explored warren. Reads the players list (D-58). | Cursor | L | P-134, P-102 | tNN: enter, walk a scripted route with no fall-through, leave at the mouth he went in by; topside zombies and timers didn't tick; building is refused. fps in an empty warren within 5% of the topside HQ view. |
| P-137 | Five warrens that look like where they are: root (roots, glowing fungus), shale (narrow clefts), iron (mine rails, carts, timbering), wet (flooded, knee-deep), hill (barrow tombs). The convoy's wreckage in the Galleries, and a sealed rune door in each Deep. | `world/hollows.js`: a tile kit per theme (tunnels, chambers, shafts, drops). Three depths laid out from their own dice per run and cave. Dark, with a few lamps and glow; the gun light and the NVG matter. Nothing topside moves (rule 10). | Claude | L | P-134 | TT builds all five from a seed. A test finds every loot point and the exit reachable. Draws and triangles under the spec's budget. Antigravity shots of each. |
| P-138 | Fighting below: sleepers in alcoves wake to noise and light, nests feed a chamber until blown, and each Deep has its set piece (climbers, flankers, the mine crew, the drowned, the barrow king). | Spawns from the warren's points; `applyCaveRole` on everything below; nests as spawners with HP; set pieces from the existing kinds. At most 24 awake. Skulls drop as topside. The damage table (D-62) applies. | Grokbot | M | P-136, P-137, P-118 | tNN per theme: a shot within a sleeper's radius wakes it; a blown nest stops; the set piece spawns once; the cap holds. |
| P-139 | The stir: noise fills a meter, the Hush holds it down, and when it fills or the Hush runs flat, the guardian comes through the rock after a 10 s warning. A bolt-hole or the way out saves him; the run's one kick-free still applies. | A stir meter from GB-105's hearing rule (suppressed shots much less, D-65; blasts most). The warning (dust, a screech); the guardian's grab into the existing scripted death, `startGrabScene`; D-46's escape (P-32) reused. The Hush battery runs about 8 minutes. | Grokbot | M | P-138, P-135, P-129 | tNN: 30 unsuppressed shots in 20 s fill it and suppressed ones don't; the warning, then the grab; the kick-free leaves him below with 50 HP less and no bag; a second catch ends the run as `caveguard`; a flat Hush brings it too. |
| P-140 | The haul: skulls, supply crates, and one strongbox a warren a run. It holds a blueprint he doesn't own, a gun before its arrival night, a mod, an earned camo or a rune shard. And the convoy's twelve dog tags. | `game/hollows-loot.js` (pure): prize tables by depth and theme against the run's state (owned, the night, D-48's arrivals, D-66's camos). Skull value tuned so a full delve's median pays about half the same day's night. | ChatGPT | S | P-134, P-46 | Unit tests: every prize is valid for the run state, with no repeats, and the same for the same seed. A budget test: a delve a day doesn't break the twenty-night budget. |
| P-141 | The words and the HUD below: the Hush's battery and the stir; the depth; "No building down here"; the prize and tag pickups. On the board: the Hush charged, the warrens cleared and the passages open. The chalk mouth's refusal. | `ui/hollows.js` (pure, like `ui/bounties.js`), strings, the board row. | ChatGPT | M | P-139, P-140 | Unit tests; Antigravity shots at 1280 and 390 px. |
| P-142 | What the Hollows say: the convoy went under; twelve dog tags, a line each; the relay's lines learn where the signal is loudest; the rune doors hum; rune shards give pieces of the pit's order, a second way into the secret. | `docs/story.md`: the tags, the doors and the shards, beside the relay's twenty lines (P-86) and the secret (P-94). | Claude | S | P-134, P-94 | Jerry reads it; the lines go into strings with P-141. |
| P-143 | Passages: a cleared warren opens a tunnel to the next cave round the compass for the rest of the run; in at one mouth, out at the other, by day. | The runtime's exit at the Deep, linked to the neighbour's mouth. Cleared warrens are held for the run and reset with it. | Cursor | S | P-136, P-137 | tNN: a cleared warren's passage takes him out at the neighbouring mouth; an uncleared one doesn't; a run reset closes them. |
| P-144 | The Hollows sound alive: drips, the Hush's hum, the stir's rumble, the guardian in the walls, and an underground state for the music. | Short cues through the director and `core/audio.js`. | Claude | S | P-139 | t61 green; Jerry listens. |
| P-145 | Measured: fps below on Jerry's GPU with 24 awake and the lights, and a scripted delve per warren headless: time, deaths, and pay against the same day's night. | `tools/nightsim.mjs --hollow`, `tools/bench.mjs` below. | Cursor | S | P-139 | Numbers in the handoff; 60 fps holds. |
| P-146 | Eyes on it: each warren walked on the GPU, day entry to exit, shots of every depth, a video of the stir running out, fps. | Antigravity's runner. | Antigravity | S | P-141 | A report in `qa/` with shots, the video and fps. |

### R6 · Finish (1.0) · later

Goal: a full run is winnable in under 2 hours, holds 60 fps with 48 zombies on Jerry's GPU, shows no console
errors, and every test is green. The showcase build, then the release.

| ID | What the player gets | How it's built (reuse) | Owner | Size | Needs | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| P-79 | Balance from medians: every night between hard and fair. | `tools/nightsim.mjs --repeat 5` over 20 nights, skull value and pack sizes (not horde size). | Grokbot | M | R5 | The median table in the handoff; no night 3× its neighbours. |
| P-80 | The blades as D-51 says. | Measure, then the machete change if needed. | Grokbot | S | P-13 | t77 and t63 re-based with `--review` if changed. |
| P-81 | The first hour teaches itself: every key has its first-use card; the pause menu's controls page matches the game. | `ui/coach.js`, `docs/controls.md`, the tips. | ChatGPT | S | P-30 | A fresh-profile run by Antigravity finds building and banking unaided. |
| P-82 | One voice: every line read once, the same words for the same things. | A strings pass (the loop is always skulls, bank at the HQ window, Cash; AGENTS.md rule 11). | ChatGPT | S | R5 | `ui/strings.test.mjs` green; a list of changed keys. |
| P-83 | Credits: Jerry, the crew, Quaternius (CC0), the music. | A credits page from the title. | ChatGPT | S | none | Antigravity shot. |
| P-84 | The caves and the pit sound alive: the screech, cave groans, the pit's rumble (plan phase 4). | Short cues through the music director and `core/audio.js` (Claude's director, Cursor's engine). | Claude | S | none | t61 green; Jerry listens. |
| P-85 | Night stays dark but readable: the dangerous kinds, the attack sides and hurt builds can be picked out. | CL-11 answered (D-68): night stays dark. Rim light on threats and the build pips (P-24), never a brighter night. | Claude | S | Jerry on CL-11 | Antigravity night shots NVG on and off. |
| P-87 | Every test green, and the flaky ones made robust. | t41 and others onto `startMatch` (`tools/tests/lib.js`); `npm test` twice in a row, the same. | Cursor | S | none | Two identical full runs in the handoff. |
| P-88 | The budgets hold: title within 15 s cold and 5 s warm, 60 fps with 48 on Jerry's GPU. | `tools/loadtime.mjs`, `tools/bench.mjs`, GB-59's cull if not yet in. | Cursor | S | R5 | Numbers in the handoff, on the GPU. |
| P-89 | The 1.0 package as a desktop app (D-57, Jerry 2026-09-27): an `.exe` with an icon, no browser chrome, native fullscreen, an installer, saves in a real folder; a version on the title. | A Tauri (WebView2) or Electron (bundled Chromium) shell round the folder: a custom protocol serves the module imports and the import map (`file://` won't), localStorage moves to a save file, `tools/package.mjs` builds it without `qa/`, `review/`, `handoffs/`. The browser build stays for the crew. Pick Tauri for the download size, Electron if WebGPU under WebView2 gives trouble. | Cursor | M | P-87, P-88 | The installer runs on a second, clean machine (Jerry); the game plays the same as in the browser. |
| P-90 | Three full runs, played three ways (the turtle, the explorer, the rusher), and every bug on the board. | On Jerry's GPU, with the video. | Antigravity | M | P-89 | Three reports in `qa/` with times, deaths and bugs. |
| P-91 | The showcase shots and a short trailer's worth of clips. | `tools/shoot.mjs` views plus in-game captures. | Antigravity | S | P-90 | A folder Jerry can post. |
| P-92 | The last sweep: every open report reviewed, the docs true, the board cleared for after 1.0. | Claude reads every handoff since R1, answers `--review`s, updates `docs/`. | Claude | S | P-90 | The board's R6 all ticked. |
| P-93 | The marine's own animation through the studio (the walk, the run, the reload), now that the guardian's is done. | UAL references retargeted onto the marine rig; clips as data; review folders. | Claude | M | CL-62 | Jerry's "good" on each folder. |
| P-100 | The shotgun earns its place against spiders on a wall: a small, spider-only edge (a slightly tighter spread or more pellet damage on spiders), measured before and after. | Jerry's "use your best judgement" (2026-09-26, 23:01 CT) on Grokbot's open call. Pellet damage or spread is scaled for `spider` targets only, in the shotgun's hit path; nothing else changes. Numbers from nightsim: spiders killed per shell on nights 8-12 before and after. | Grokbot | S | GB-59 (the 48 cap, so the night-12 wall fight is real) | tNN: a shell at a wall spider does at least 20% more than today; a shell at a shambler does the same as today. t80 and t46 pass. |
| P-99 | The guardian's final fight has its own music. | A sectioned boss track through the director. | Claude | S | P-97 | t61; Jerry listens. |

### R7 · Co-op, up to 4 players (after 1.0)

Goal (D-58): friends join the host's game from the desktop app and fight the night together. The host's game
runs the zombies, the waves, Cash and the builds; the others send their movement and shots and draw what the host
sends back. Tasks are written when R6 closes, in this order: a second marine on the same machine as a test; two
machines in sync (the marines and the horde); shooting, damage, builds, Cash and the waves; hosting and joining
in the desktop app (by address or through a small relay); then the scripted moments (a catch, the boat) decided
one by one. The groundwork is P-101 to P-103 in R2.

## The story: The Signal (D-44)

The world's props already tell it: a medical convoy failed on the road
(`assets/world/landmark-details.js:395`), the camps went quiet, the mast carries a "silent emergency relay
station" (`:272-273`), and the dock is an "evacuation landing left in haste" (`:350-380`). The game only has to
say it out loud, a line at a time, and give the player a way out.

**The premise.** Three weeks ago the relay on the mast went silent. The convoy never arrived; the camps
stopped answering. One marine parachutes in to find out why, hold the cabin that is now his HQ, and get
the relay talking so a boat can come for him.

**What is happening.** The dead are answering a signal. The runes in the pit under the lake are a beacon, and
every night it sings louder: more of them come out of the six caves and up from the sinkhole. That is the
dead wave. Something in the caves guards the source, and it can't be killed while the signal sings.

**How a run tells it.**
- **Insertion.** He parachutes in (built). The relay is silent; its panel on the HQ board says so.
- **Act 1 · Boots on the ground (nights 1-3).**
  - Skulls, the HQ window, the kiosk.
  - The first poke into a cave, and the first swim toward the pit, each get a line: "Something in that
    cave woke up." "The water over the pit is moving." (P-11, P-12)
  - The dead react when he hits them: a flinch, a stagger, a shell that puts one down (D-42).
- **Act 2 · Get the relay talking (nights 4-10).**
  - Repairing the relay is the day's goal. From then on it speaks one line each morning (the story, piece by
    piece: P-86) and offers **Tonight's call**, one pick a day: a crate dropped at the mast, Scout's eye,
    or the Lights out dare (P-36 to P-40).
  - The supply planes fly in the new guns, so the kiosk stocks them by act, at fixed prices (P-46, P-47).
  - Caches restock (P-41, P-42), the wrecks' fuel drums go up (P-43), and he vaults his own barricades (P-44).
  - From night 3 a camp's bounty can hold a survivor who knows a piece of what happened (P-63 to P-66).
- **Act 3 · The wave (nights 11-20).**
  - Each night runs straight into one real breather, the cave eyes dim, and then the caves and the treeline
    surge together (P-16, P-17). The score builds with it (P-19 to P-21).
  - Fog Night when the lake surges (14), the siege (18), and a colossus that walks the trails by day (P-56 to P-62).
  - The relay's lines turn from where the dead come from to what the pit is.
- **The way out (night 20).**
  - He calls the boat from the board. Flares go up at the dock and the boat comes in during the last push.
  - He holds the dock and boards: "Got out on night 20. Survivors aboard: 2." (P-50 to P-54)
- **The secret, for players who look (D-56).**
  - The relay's static repeats a pattern, and from the tower at night the pit stones pulse in the same order.
  - Entered at the radio, the glyphs silence the signal for one night, and the guardian comes out of the chalk
    cave to fight: on the new studio rig, killable only then.
  - Beat it and the lake goes quiet: the true ending, and a rune variant of a gun on the dock for the next run
    (P-94 to P-97).
- **Between runs.**
  - The title shows his best run (P-31), lifetime badges (P-55) and the Ways to Die collection.
  - Every Play is still a fresh day 1 (D-30).

## Not now

| What | From | Why | What brings it back |
| --- | --- | --- | --- |
| New bloater and armoured kinds | S10 | They exist as the bomber and the brute (P-26 to P-28 give them jobs). New kinds add bodies to a frame over budget. | GB-59 plus 60 fps with 48. |
| Suppressor | S21 | Brought back by D-65 (Jerry, 2026-09-29): the cans in R3 (P-126, P-127), the hearing rule and balance in R5 (P-129). | - |
| Combat slide | S7 | Overlaps the roll and could make it pointless. | The vault (P-44) plays well. |
| Rock-slides at caves | S12 | They would block the only land spawns, and a blast there counts as a poke. Felled trees already crush and block lanes (P-30 hint). | A spawn redesign. |
| Oil lines you can light | S12 | New props plus ignition (M). | P-43's drums play well. |
| Loose-skull dots on the minimap | S3 | Small, but not needed if P-1 and P-2 work. | P-15's rerun still shows lost skulls. |
| A killable or fight-free cave guardian; losing gear instead of dying | S5 | Reverses D-25 and removes collectible deaths (D-31). | Jerry revisits D-25 (D-46 (c)). |
| Escort AI | S20 | New zombie targeting and pathing (L-XL). | D-47 (c). |
| Failing generator, supply truck under attack, distress flare, mid-night bounty | S15 | The HQ can't be lost; a crate or truck needs a new target kind; flares and bounties ride P-45's hook later. | P-45 and P-64 land well. |
| "Hold the crate" night order | S17 | Needs a combat target kind. | After P-45. |
| Auto-banking at dawn; "+1 grenade" boon; boons on the dawn banner | S24 | Breaks the bank loop; the grenade already exists; D-39 bans buttons on the banner. | Never, or a D-39 change. |
| Unlocks that change a new run | S18 | Clash with D-30. | Jerry revisits D-30. |
| A helicopter at a landing zone | S19 | New art (L). The dock and boat exist. | After P-52, if wanted. |
| Heavy-gun crate from the radio | S23 | Needs a `grantWeapon` contract and D-48. | After P-46. |
| Swarm Night, Silent Night, Blackout night | S16 | After Fog plays well; Silent removes the alarm shot (D-33, D-39). | D-54 (c) or a later S each. |
| Cutting totals or raising the 48 cap | S25 | Horde sizes stay; the frame is over budget. | D-50 (c) after GB-59. |
| Hit arc, per-push cave pulse, minimap dots for dangerous kinds, new night lights | S29 | Follow-ups after P-23 to P-25; lights wait on CL-11. | P-24 plays well; Jerry answers CL-11. |
| The full tutorial day | S30 | Its spec assumes saved runs, which D-30 removed. | P-30's hints prove not enough. |
| The ranger on the tower deck; a curve track for the pit's arms | S20, S6 | Later M and L. | After P-65 and CL-62. |

## On the board

Every item is a task in `crew/BOARD.md` (Queues). Tasks with no P-id: GB-59 (Brought back), CL-62 (The rest of the guardian through the studio), AG-22 (R2 on the GPU), AG-23 (R3 on the GPU), CU-54 (R5 measured), AG-25 (Fog Night and the siege on the GPU), AG-26 (Survivors, the wanderer and the secret quest walked through on the GPU).

| P-id | Task | Phase |
| --- | --- | --- |
| P-1 | GB-60 | R1 |
| P-2 | GB-61 | R1 |
| P-3 | GB-62 | R1 |
| P-4 | GB-63 | R1 |
| P-5 | GB-64 | R1 |
| P-6 | GB-65 | R1 |
| P-7 | GB-66 | R1 |
| P-8 | GB-69 | R1 |
| P-9 | GP-45 | R1 |
| P-10 | GP-46 | R1 |
| P-11 | CL-66 | R1 |
| P-12 | GP-47 | R1 |
| P-13 | CU-48, CU-51 | R1 |
| P-14 | CU-49 | R1 |
| P-15 | AG-20 | R1 |
| P-16 | GB-71 | R2 |
| P-17 | GB-72 | R2 |
| P-18 | GB-73 | R2 |
| P-19 | CL-69 | R2 |
| P-20 | CL-70, CL-102 | R2 |
| P-21 | CL-71 | R2 |
| P-22 | GB-74 | R2 |
| P-23 | CU-50 | R1 |
| P-24 | GP-48 | R2 |
| P-25 | GP-49 | R2 |
| P-26 | GB-75 | R2 |
| P-27 | GB-76 | R2 |
| P-28 | GB-77 | R2 |
| P-29 | GP-50 | R2 |
| P-30 | GP-51 | R2 |
| P-31 | GP-52 | R2 |
| P-32 | GB-78 | R2 |
| P-33 | GP-53 | R2 |
| P-34 | CU-58 | R3 |
| P-35 | GP-56 | R3 |
| P-36 | GP-54 | R3 |
| P-37 | GP-55 | R3 |
| P-38 | GB-81 | R3 |
| P-39 | GB-82 | R3 |
| P-40 | GP-57 | R3 |
| P-41 | GP-58 | R3 |
| P-42 | GP-59 | R3 |
| P-43 | CL-72 | R3 |
| P-44 | CU-52 | R3 |
| P-45 | GB-83 | R3 |
| P-46 | GP-60 | R3 |
| P-47 | GP-61 | R3 |
| P-48 | GB-84 | R3 |
| P-49 | GP-62 | R3 |
| P-50 | GB-85 | R4 |
| P-51 | GP-63 | R4 |
| P-52 | CL-73 | R4 |
| P-53 | GB-86 | R4 |
| P-54 | GP-64 | R4 |
| P-55 | GP-65, CU-77 (the event) | R4 |
| P-56 | GB-87 | R5 |
| P-57 | CL-76 | R5 |
| P-58 | CL-77 | R5 |
| P-59 | GB-88 | R5 |
| P-60 | GP-67 | R5 |
| P-61 | GB-89 | R5 |
| P-62 | GP-68 | R5 |
| P-63 | CL-75 | R5 |
| P-64 | GB-90 | R5 |
| P-65 | GB-91 | R5 |
| P-66 | GP-69 | R5 |
| P-67 | CL-78 | R5 |
| P-68 | CL-81 | R5 |
| P-69 | CL-79 | R5 |
| P-70 | GB-65 | R1 |
| P-71 | GB-66 | R1 |
| P-72 | GB-67 | R1 |
| P-73 | GB-68 | R1 |
| P-74 | CL-67 | R1 |
| P-75 | GB-70, CL-68 | R1 |
| P-76 | CU-47 | R1 |
| P-77 | AG-21 | R1 |
| P-78 | CU-53, AG-24 | R4 |
| P-79 | GB-94 | R6 |
| P-80 | GB-95 | R6 |
| P-81 | GP-71 | R6 |
| P-82 | GP-72 | R6 |
| P-83 | GP-73 | R6 |
| P-84 | CL-82 | R6 |
| P-85 | CL-83 | R6 |
| P-86 | GP-66, CL-74 | R4 |
| P-87 | CU-55 | R6 |
| P-88 | CU-56 | R6 |
| P-89 | CU-57 | R6 |
| P-90 | AG-27 | R6 |
| P-91 | AG-28 | R6 |
| P-92 | CL-86 | R6 |
| P-93 | CL-84 | R6 |
| P-94 | CL-79 | R5 |
| P-95 | CL-80 | R5 |
| P-96 | GP-70 | R5 |
| P-97 | GB-92 | R5 |
| P-98 | GB-93 | R5 |
| P-99 | CL-85 | R6 |
| P-100 | GB-96 | R2 |
| P-101 | CL-87 | R2 |
| P-102 | CU-63 | R2 |
| P-103 | GB-100 | R2 |
| P-104 | CL-88 | R3 |
| P-105 | CU-62 | R3 |
| P-106 | GB-101 | R3 |
| P-107 | GP-76 | R3 |
| P-108 | GP-77 | R3 |
| P-109 | GB-102 | R3 |
| P-110 | CL-89 | R3 |
| P-111 | CU-64 | R3 |
| P-112 | GP-78 | R3 |
| P-113 | CU-65 | R3 |
| P-114 | CU-66 | R3 |
| P-115 | GP-79 | R3 |
| P-116 | CL-90 | R3 |
| P-117 | GB-103 | R2 |
| P-118 | CL-91 | R2 |
| P-119 | GB-104 | R3 |
| P-120 | GP-80 | R3 |
| P-121 | CU-67 | R3 |
| P-122 | CL-92 | R5 |
| P-123 | CL-93 | R5 |
| P-124 | GP-81 | R5 |
| P-125 | CL-94 | R3 |
| P-126 | CL-95 | R3 |
| P-127 | CU-68 | R3 |
| P-128 | CU-69 | R3 |
| P-129 | GB-105 | R5 |
| P-130 | CL-96 | R4 |
| P-131 | CU-70 | R4 |
| P-132 | CL-97 | R4 |
| P-133 | GP-82 | R4 |
| P-134 | CL-98 | R5 |
| P-135 | GB-106 | R5 |
| P-136 | CU-71 | R5 |
| P-137 | CL-99 | R5 |
| P-138 | GB-107 | R5 |
| P-139 | GB-108 | R5 |
| P-140 | GP-83 | R5 |
| P-141 | GP-84 | R5 |
| P-142 | CL-100 | R5 |
| P-143 | CU-72 | R5 |
| P-144 | CL-101 | R5 |
| P-145 | CU-73 | R5 |
| P-146 | AG-29 | R5 |
| P-147 | CU-75 | R2 |
| P-148 | GP-85 | R2 |
