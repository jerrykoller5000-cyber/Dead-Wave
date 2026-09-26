# Dead-Wave: the roadmap to 1.0 (2026-09-26)

This is the plan for finishing the game. It started as 30 suggestions from Jerry and five agents, merged
and checked against the code (`feature/Phis-changes` at `fa95ccb`). Then came Jerry's order of 2026-09-26:
- make the reaction tool (D-42, done as CL-65);
- turn the board into the roadmap;
- make the calls he'd left open, for fun and for the story (D-44 to D-56).

The work is six phases, R1 to R6. Items are P-1 to P-99; every one is a task on `crew/BOARD.md` (the table
at the end maps P-ids to task ids). A phase ends when Jerry has played it. Paths are relative to the repo
root.

## At a glance

| Phase | Items | What it gets the player | Jerry's play at the end |
| --- | --- | --- | --- |
| R1 · Trust the loop, and feel it | P-1 to P-15, P-70 to P-77 | Skulls reach the bag, building says what it does, the dead react when they're hit, and the marine gets knocked around. | A fresh run to night 5, and his notes in the motion lab. |
| R2 · The night has a shape | P-16 to P-33 | One breather and a surge you can hear. Plates, screamers and bomber chains. Streaks heal. The best run is saved. The first catch can be escaped. | Night 5 fresh, then 10 and 13 from the debug start. |
| R3 · The day feeds the night | P-34 to P-49 | The relay, then one call a day. Caches restock, drums burn, you vault your walls. Guns arrive by act at fixed prices, one mod each. | Days 1-10 fresh. |
| R4 · The way out | P-50 to P-55, P-78, P-86 | The boat at night 20, a victory screen and badges. The relay tells the story. | A run to the boat, and a win. |
| R5 · Named nights and bigger systems | P-56 to P-68, P-94 to P-98 | Fog Night, the siege, the day colossus, survivors, the guardian boss on its rig, and the secret. | Nights 12-20 from the debug start, and the secret. |
| R6 · Finish (1.0) | P-79 to P-93, P-99 | Balance from medians, the first hour teaching itself, sound, readability, green tests, the budgets, the package. | Three full runs, then the release. |

Every item is a task on the board; the table at the end maps them. Most are one agent session.

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

## Where you all agreed

| Theme | Suggestions | Sources | Delivered by |
| --- | --- | --- | --- |
| Weapon feel and weapon roles | S9 (+S10, S21) | 4 (A, B, C, E) + 1 + 1 | P-6, P-7, P-13, P-26 to P-29, P-48, P-49, D-51 |
| Make the cave guardian fair | S5 | 3-4 (B, D, E; A's movement idea cites it) | P-11, P-12, P-32, P-33, P-68, D-46 |
| Special nights | S16 (+S17) | 3 (B, D, E) + 1 | P-39, P-56 to P-60, D-54 |
| A record that lasts between runs | S18 | 3 (B, D, E) | P-31, P-54, P-55 |
| Collecting skulls | S3, S4 | 2 (B, D) + Jerry | P-1, P-2 |
| The day needs one real decision | S14 (+S23, S24, S17) | 2 (C, D) + 1 + 1 + 1 | P-36 to P-42, D-53 |
| Survivors at the camps | S20 (+ part of S15) | 2-3 (C, E; B) | P-63 to P-66, D-47 |
| Events in the breathers | S15 | 2 (B, C) | P-35, P-45 |
| Traps in the world | S12 | 2 (A, B) | P-43 |
| Moving around your own builds | S8 (+S7) | 2 (B, C) + 1 | P-3, P-4, P-5, P-44 |
| A real ending | S19 | 2 (C, E) | P-50 to P-54, D-45 |
| The guardian's animation | S6 | 2 (Jerry, D) | CL-62 (queued, on your go), P-67, P-68 |

Single-source items are still in the plan: S1, S2 (Jerry), S7, S10, S11, S13, S21, S22, S25, S26, S27, S28 (Jerry), S29, S30.

## The phases

**Sizes.**
- **S:** one agent session (one check-in, one handoff, roughly under 150 changed lines, one owner).
- **M:** two or three sessions, or two owners with a contract.
- **L:** a new system across several sessions and owners.
- **XL:** several days, and a design call from Jerry first.

Almost every item below is one owner and S. Each item's "Done when" also includes rule 7: `npm test` no worse, before-and-after `tools/shoot.mjs` shots for anything visible, fps no worse, and a handoff note. Test numbers are taken at check-in (the next free one is t84), so the items say "tNN".

**Carried over:** CL-62 (the rest of the guardian through the studio) goes on in R2. GB-58 and GB-59 were
parked when the board was cleared; GB-59, the fog cull, comes back in R2 as the frame-budget lever (48 zombies
run at 50-54 fps on the 5080 against a 60 fps budget, `handoffs/2026-09-25-cursor-CU-38.md:4`).

**Playing to strengths.** Each agent's tasks fit what its model does well (the board's "Who does what"):
- **Grokbot:** combat systems inside `index.html`, and headless sims.
- **ChatGPT:** pure, unit-tested modules in `ui/`, the words and the economy.
- **Claude:** the world, the studio and the reactions, the music, the story, the reviews.
- **Cursor:** tools, measurement, integration plumbing, player physics and commits.
- **Antigravity:** eyes on Jerry's GPU: every visible change, full runs, timings.

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

**Claude's lead calls** are made: see the end of Decisions made.

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

### R1 · Trust the loop, and feel it

Goal: skulls, building, repairs and the shotgun work the way they look, and the dead react when they're hit
(D-42).

Jerry's play at the end: a fresh run to night 5, and his first notes in the motion lab.

| ID | What the player gets | How it's built (reuse) | Owner | Size | Needs | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| P-1 | Every night, the skulls still on the field fly into the bag at the last kill. No skull lands where he'd die reaching it. | Drop the `skullKeepDay()` gate on the recall (`index.html:26550`); `SKULL_KEEP_DAYS` keeps day 1's pooling. `spawnSkullDrop` (`18766-18781`) pushes drops out of a mouth's grab band (`30886-30893`) and outside `LAKE_HOLE.grabR` (`5613`), or flies them in. Claude asks Jerry once whether his skull had a ring. | Grokbot | S | Claude's rule-10 OK | Night-3 tNN: a skull left 30 m out is in the bag within 2.5 s with `recalled:true` and counted at dawn. Skulls spawned in a mouth or over the sinkhole end reachable or in the bag. t71, t34, t37, t72 and t74 pass. |
| P-2 | From night 2, a skull within 4 m zips into the bag. Skulls last 45 s instead of 30. Big drops (100 or more) still need the walk. | Start GB-42's fly branch (`18856-18881`) within 4 m, leaving out `c.rewardReceipt`. A new `SKULL_LIFE` separate from `CASH_LIFE` (`18742`). ChatGPT re-runs `ui/economy-balance.mjs` at about 95% banked. | Grokbot | S | P-1 | Day-5 tNN: 3 m flies within 1 s; 10 m stays; a 120-value skull stays; alive at 40 s, gone by 46 s. `tools/bench.mjs --scenario day5` within noise; if not, drop `castShadow` on skull parts. |
| P-3 | Refusals say why, while he aims: NOT ENOUGH CASH, "you are standing there", a tree, a rock, the HQ. No turret lands under his feet on a deck. | `tryPlace` (`22359`) puts the Cash branch before `ghostValid`. `placeRefusal` (`22180-22237`) checks the marine at every level, closing `22211`. `inTheWay` names the obstacle. Ids map to the unused `build.reason.*` keys (`ui/strings.js:690-721`) only when shown. ChatGPT adds `build.obstacle.tree/.rock/.hq` by request. | Grokbot | S | none | New tNN covers four cases, including t2's third trial now asserted. t1-t33, t49, t51 and t58 green. `--review`. |
| P-4 | T and X act only on his own storey, never through a floor. | `storeyBand`/`pickOnMyStorey` (`22041-22050`) and `segmentHitsBuild` (`34843`), as `objectiveReach` does, replace nearest-in-2D (`22256-22335`). A D-11 note so `getRepairTarget` follows. | Grokbot | S | P-3 | Two-storey tNN: from the ground T and X do nothing upstairs, and upstairs they work. t51 and t6 pass (`--review` if re-based). |
| P-5 | A mortar at a deck's rim keeps him on the deck. Folding stairs won't fold from under him. | Use the crew spot (`24204-24205`, `24347-24354`) only if it is on the tube's surface and clear, otherwise refuse with a strings line. `toggleStairs` refuses while he is on the ramp (`23331-23334`). Mortar banners (`24209`, `24222-24228`) move to strings. | Grokbot | S | P-4 | tNN: within 0.05 m of the deck through 3 s of sweeps, or refused; stairs refused on the ramp. t31, t33 and t58 pass. |
| P-6 | A point-blank shell shoves harder than an AK round and floors small kinds and demons. The shotgun gets the close crowd. | The pellets of one pull share a `shotId` (`33431-33436` to `32104`). `damageZombie` sums per shot for the stagger (`34796`) and `maybeKnockDown` (`34684`), which today can never fire. No double headshot bonus. Small `addShake`. | Grokbot | S | none | tNN in t77's style: a shell at 1.5 m gives at least 3.5 m/s and `knockT>0`, more than an AK round; a demon goes down; a brute, a soldier and a spider don't. |
| P-7 | A close shell kill throws the body 1-2 m back into the zombie behind it. | `beginCorpse` takes the hit's power; `updateCorpses` (`26873-26990`) slides the body about 0.3 s. It applies the existing `crush` knockdown (`34448`) to small kinds only. No physics engine. | Grokbot | S | P-6 | tNN: the body ends at least 1 m back and the zombie behind gets `knockT>0`. Antigravity `--compare` shots; 60 fps with 48 on Jerry's GPU. |
| P-8 | The laser does what the kiosk sells ("Tighter groups"). | `aimDirWithSpread` (`32446-32459`) cone ×0.8 while `lasersEnabled`, or ChatGPT rewrites `gear.laser.description` (`ui/strings.js:468`). | Grokbot (or ChatGPT) | S | Claude picks | 200-sample tNN shows ×0.8 within 5%, or the strings test passes with the new copy. |
| P-9 | In build mode each key sits beside its word. No "Reload · R" while R rotates. | `refreshPlaceBanner` (`21408-21427`) is built from the unused `build.message.*Controls` keys (`ui/strings.js:728-731`) as no-wrap DOM nodes. `updateReloadPrompt` (`31461-31474`) hides in build mode. The death panel's header (`30930`) is keyed. | ChatGPT | S | P-3 | `node ui/hud-prompts.browser.mjs` passes with the longest banner, the reload row and a coach card, at 1280×720, 1920×1080 and 390×844. Antigravity shots. |
| P-10 | His base is "HQ" everywhere. The landmark cabins say "CABIN", not "HUT". | Rewrite `tips.interaction.kiosk/.bank`, `shop.find` and `build.reason.cabin`. The kiosk banner (`19396`) uses `text('shop.find')`. The map uses `map.hq` (`7814`) and `map.cabin` (`7820`). | ChatGPT | S | P-3; Claude OKs the label | `ui/strings.test.mjs` gains a stray-"cabin" check. t1 and t13 unchanged. Antigravity shots of Tips and the Tab map. |
| P-11 | Swimming toward the pit, he is warned before the arms reach. | A world event `pit-near`, once a run, within `grabR + 8` m, beside the rumble (`30853-30866`). Contract line. | Claude | S | none | t65 extended: fires once; the tentacle death is still at `grabR`. |
| P-12 | The first poke of a run says "Something in that cave woke up. Don't shoot into the caves again." Near the pit: "The water over the pit is moving. Turn back." | `ui/coach.js` turns `cave-guardian {warning:true}` (`30527-30529`) and `pit-near` into one card each per run. Copy in strings. D-26 unchanged. | ChatGPT | S | P-11 (pit card only) | `ui/coach.test.mjs`: each card once per run. t59 still 48/0. |
| P-13 | Nothing directly. Balance calls rest on medians, not one run that snowballed. | `tools/nightsim.mjs`: `--repeat N` with a fresh page per run; melee counted per kill, not per swing (`211-213`); seconds with 5 or more zombies within 5 m; peak alive of the night's signature kind; screamer calls; HP healed by streaks. | Cursor (Grokbot reviews; he wrote it) | S | GB-58 out | The handoff has a `--repeat 3` table for nights 8-20: median and range of damage, deaths, length and melee share. |
| P-14 | Nothing directly. Agents stop reading wrong facts. | Fix `docs/gameplay.md:42` (no prep countdown, `index.html:27815`), `:69` (drops hold more than money) and `:210` (zombies do climb windows, `23819-23823`). | Cursor | S | none | Three lines match the code, with cites in the handoff. |
| P-15 | Nothing directly. The crew gets real-browser play numbers, not only sim numbers. | Play a fresh run to night 5 on Jerry's GPU. Log night lengths, deaths, lost skulls, any skull that can't be picked up at dawn (S4), accidental pokes (S5) and fps with 48. Confirm the Ways to Die padlocks. | Antigravity | S | none | Table and shots in `qa/`, with the path in the handoff. Repeat after P-1 and P-2. |
| P-70 | The dead react in the game: a rifle round jolts one, a shell staggers it or puts it down, a grenade throws it, and it gets up again. | Adopt each zombie as the `zombie` rig (`rigs.get('zombie').create({ group: z.mesh })`), one `createBody` per zombie through a `createMotionPool({ max: 8 })`. Shots call `body.hit` (a shell's pellets summed, P-6), blades and blasts too. The AI waits while the body is `fall`, `down` or `getup` (replaces `knockT` there), and `drift` moves `z.x`, `z.z`. A refused hit plays today's reaction. | Grokbot | M | D-42 | tNN: a close shell knocks a shambler down and it rises; a rifle round doesn't; 48 zombies with 8 reacting hold the frame (bench). |
| P-71 | A death falls the way it was hit: shot in the back, pitched forward; blown up, thrown. | `body.kill` replaces `beginCorpse`'s topple for bodies the pool takes (P-7); `settled` freezes the corpse (the shadow casters go, as today). `MAX_CORPSES` unchanged. | Grokbot | S | P-70 | tNN: a corpse lies within 0.35 m of the ground, settled within 4 s; fps with 18 corpses no worse. Antigravity shots. |
| P-72 | The marine gets knocked around (Jerry's GB-50 order): a swipe rocks him, a brute's blow staggers him a step, a bomber puts him down and he's up fast. | The marine adopted as the `marine` rig with `marine/marine`. Zombie melee is `crush` or `blade`, blasts `blast`. He keeps control while `react` (slowed), loses it for `fall` and `down` (short), and `drift` moves him. Never during a scripted kill or the insertion. | Grokbot | M | P-70 | tNN: a brute's blow gives `stagger` and no `fall`; a bomber at 1 m gives `down` then `recovered` within 1.5 s; input returns. Antigravity video. |
| P-73 | Nothing directly: the zombies' feet stand on the ground. | Check the 0.2 m sink (hips 0.55 + leg 0.74 at scale 1, `studio/zombie.js`) in a screenshot. If it's a bug, fix the hips height in `makeZombieMesh` and keep `studio/zombie.js` in step. | Grokbot | S | none | A side shot before and after; t-tests that measure hit heights unchanged or re-based (`--review`). |
| P-74 | The guardian's victim flops: arms trail, the head bounces, legs catch on the ground while he's hauled (CL-65's first intent). | A `hold` on a body: a point pinned to a moving target (the hand) with the rest simulated. Scenes give a held actor `motion`; `guardian-grab-drag` gets it. | Claude | M | D-42 | `motion.test.mjs`: a held body's grip point stays within 3 cm of the hand; nothing through the ground. The review folder's new version for Jerry. |
| P-75 | Reactions Jerry has approved: the presets tuned to his lab notes. | `studio/motion/*` versions bumped per note; `crew.mjs review answer`. Ongoing through R2. | Grokbot (presets), Claude (engine) | S each | Jerry's notes | His "good" on each preset's review folder. |
| P-76 | The lab and the reaction scenes checked on the GPU. | Cursor reviews `tools/serve.mjs`'s hook, renders `zombie-reactions` and `marine-knocked` into review folders (video works on the GPU), and fixes the headless video step if it is small. | Cursor | S | D-42 | Both folders at v1 with strip, video and stats; the hook reviewed in the handoff. |
| P-77 | Nothing directly: the crew sees reactions on Jerry's GPU. | The lab at 1280 and 1920; each weapon on each body; fps; then the game after P-70 to P-72. | Antigravity | S | P-76; P-72 | Shots and fps in `qa/`. |

### R2 · The night has a shape

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
| P-32 | The first guardian catch of a run can be escaped: five E presses during the haul, at a cost of 50 HP and the unbanked skull bag. A second catch, a walk-in or the pit still kill. | Count E in `setupCaveDrag`'s haul (`30768-30785`), never Space (Space, Enter and Esc skip the scene, `31235-31238`). Clean up as `abortScriptedKill` does (`30357-30364`). Zero `skullBag` (`20062-20066`) with a receipt. `escape` phase. Runs on today's procedural drag; the clip comes later (P-68). | Grokbot | S | D-46 | tNN: the escape leaves `scriptedKill` null, not game over, HP at least 1, the bag at 0 and `escape` published; a second catch ends as `caveguard`. t36, t37, t59 and t79 pass (`--review`). |
| P-33 | "Kick free! (E)" during the haul, then "It took your skulls." | Coach and prompt on the `escape` phase; copy in strings. | ChatGPT | S | P-32 | Unit test. Antigravity shot. |

### R3 · The day feeds the night

Goal: the relay becomes the day's goal, one pick a day pays off that night, and gear arrives with the acts.

Can run in parallel:
- Claude's P-43 and Cursor's P-44 alongside the radio chain (P-34 to P-40) and ChatGPT's caches (P-41, P-42);
- P-46 to P-49 once P-1, P-2 and P-38 have re-based the economy.

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

### R4 · The way out

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

### R5 · Named nights and bigger systems

Goal: Fog Night, the siege, the wanderer, survivors, the guardian boss on its rig, and the secret.

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
| P-97 | The fight: on a silenced night the guardian comes out of the chalk cave on its studio rig, and can be killed there and only then. | The guardian night's fightable kind (D-13) on the P-67 rig; the true ending on its death. | Grokbot | M | P-96, P-67 | tNN: the kill only counts on a silenced night; the ending fires once. |
| P-98 | Swarm Night: night 17's runners from every cave, faster pushes, named the day before. | `mod: 'swarm'` like P-56; a board line. | Grokbot, ChatGPT | S each | P-56 plays well | tNN and a board line; Antigravity fps. |

### R6 · Finish (1.0)

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
| P-85 | Night stays dark but readable: the dangerous kinds, the attack sides and hurt builds can be picked out. | CL-11's question answered by Jerry first; then rim light on threats and the build pips (P-24). | Claude | S | Jerry on CL-11 | Antigravity night shots NVG on and off. |
| P-87 | Every test green, and the flaky ones made robust. | t41 and others onto `startMatch` (`tools/tests/lib.js`); `npm test` twice in a row, the same. | Cursor | S | none | Two identical full runs in the handoff. |
| P-88 | The budgets hold: title within 15 s cold and 5 s warm, 60 fps with 48 on Jerry's GPU. | `tools/loadtime.mjs`, `tools/bench.mjs`, GB-59's cull if not yet in. | Cursor | S | R5 | Numbers in the handoff, on the GPU. |
| P-89 | The 1.0 package: a zip Jerry can hand over, a version on the title, "Play Dead-Wave.bat" that works on a clean PC. | `package.json` version, a `tools/package.mjs` zip without `qa/`, `review/`, `handoffs/`. | Cursor | S | P-87, P-88 | The zip runs on a second machine (Jerry). |
| P-90 | Three full runs, played three ways (the turtle, the explorer, the rusher), and every bug on the board. | On Jerry's GPU, with the video. | Antigravity | M | P-89 | Three reports in `qa/` with times, deaths and bugs. |
| P-91 | The showcase shots and a short trailer's worth of clips. | `tools/shoot.mjs` views plus in-game captures. | Antigravity | S | P-90 | A folder Jerry can post. |
| P-92 | The last sweep: every open report reviewed, the docs true, the board cleared for after 1.0. | Claude reads every handoff since R1, answers `--review`s, updates `docs/`. | Claude | S | P-90 | The board's R6 all ticked. |
| P-93 | The marine's own animation through the studio (the walk, the run, the reload), now that the guardian's is done. | UAL references retargeted onto the marine rig; clips as data; review folders. | Claude | M | CL-62 | Jerry's "good" on each folder. |
| P-99 | The guardian's final fight has its own music. | A sectioned boss track through the director. | Claude | S | P-97 | t61; Jerry listens. |

**Load and slip order.**
- **Grokbot has 29 items and is the bottleneck.** In each milestone his fixes come first. If his lane falls behind, these slip first, in order: P-5, P-8 (hand it to ChatGPT as copy), P-48, P-23 (event plumbing Claude may move to Cursor), P-61.
- **ChatGPT has 25.**
- **Claude has 14,** after CL-61 and CL-62.
- **Cursor has 3,** plus commits and running the suite.
- **Antigravity** takes shots for every visible item.

## Decisions made (D-45 to D-56, Claude for Jerry, 2026-09-26)

Jerry left these to Claude: "use your best discretion to make it fun and tell a fun narrative." Each is the
recommendation the review panel made, bent toward the story. Each stands unless Jerry overrides it.

- **D-45 · The run ends at the boat (D-45).**
  - From night 20, with the relay up, the boat can be called from the board. Boarding wins; not calling it is
    "stay", offered again each prep while the nights keep growing.
  - No early boat. Most players who took one would end at night 10 and never see Act 3.
  - A full run has to fit a sitting (D-30), so D-50 shortens the late nights. Antigravity times a full run (P-78).
  - If a run is still over about 2 hours after R2, an early boat at night 10 comes back with a lesser record line.
- **D-46 · The first catch can be escaped (D-46; revises D-26).**
  - The first time the guardian catches him in a run, five E presses during the haul kick him free. It costs
    50 HP and the unbanked skull bag ("It took your skulls").
  - A second catch, walking into a mouth, or the pit still kill.
  - The guardian stays immortal and can't be outrun (D-25, D-26), and both collectible deaths stay (D-31). The
    kick-free uses the marine's reacting body (D-42).
- **D-47 · Survivors, without an escort (D-47).**
  - From night 3, at most once per camp per run, a camp bounty holds a survivor. Clear the guards and press E;
    they are at the HQ next morning.
  - For the rest of the run:
    - the hikers' medic lets regen reach 50%;
    - the trapper cuts repairs by 25%;
    - the ranger sets up a light turret by the HQ.
  - Each survivor has one line of the story. The victory screen counts them.
  - No follower AI (L-XL); maybe later.
- **D-48 · Fixed prices; guns arrive by act (D-48; revises GP-41).**
  - The nightly equipment markup goes.
  - Guns are stocked from set nights ("flown in" by the supply planes: R4 from 4, AK from 5, AA-12 from 10,
    minigun from 14). An unstocked gun shows "Arrives night N".
  - Late Cash needs a sink: the lever is skull value, not horde size.
- **D-49 · Drops are earned (D-49).**
  - Until the relay is up, one random crate a night, so a player who never repairs it isn't starved.
  - After that, the random timer stops. The crate he picks by day (P-38) and the breather crate toward
    tonight's caves (P-45) replace it.
- **D-50 · Reshape the late nights first (D-50; horde sizes stay).**
  - One real breather, then a surge from the caves and the treeline, with the headline packs as set pieces
    (P-16 to P-18).
  - Then measure (P-13's medians). Raising the 48 cap for the surge comes only after GB-59 and 60 fps with 48.
- **D-51 · The blades are measured before they're touched (D-51).**
  - The sim's "knife" kills were the machete, counted per swing.
  - After P-13 counts kills exactly: if melee is still over 40% of kills on nights 13-20 (medians), the
    machete's reach goes from 3.8 m to 3.0 m with a narrower arc. The knife stays.
- **D-52 · Health comes from what he does (D-52).**
  - From a 5-kill streak each kill heals 1 HP (2 from 20), up to 70%.
  - The Medical crate (P-37) and the medic survivor (P-65) are the other levers. No dawn refill: regen stays 40%.
- **D-53 · One call a day (D-53).**
  - Tonight's call: one pick of three at the relay. No timer and no chore list.
  - The other day jobs stay open.
- **D-54 · Named nights (D-54).**
  - Fog Night on 14, the lake-surge night; its lighter mix pays for the fog.
  - Night 18's siege made real: brutes and soldiers go for his walls. D-13's guardian stacks, as Blood Moon
    already does.
  - Lights out stays an opt-in dare.
  - Swarm Night (17, runners from every cave) follows once Fog plays well (P-98).
  - Silent Night waits: it would remove the alarm shot (D-33, D-39).
  - How dark night should be (CL-11) is still Jerry's.
- **D-55 · The guardian boss on the new rig (D-55).**
  - After CL-62, the fightable guardian of nights 6, 12 and 18 (D-13) wears the studio rig and clips, so it
    looks like the thing in the cave. Its rules don't change.
- **D-56 · The secret quest is built (D-56).**
  - "The Signal": a spec first (P-94), Jerry reads it, then it's built in R5 (P-95 to P-97).
  - The final fight is the one exception to the immortal guardian: only while the signal is silenced, only at
    the chalk cave.
  - Nothing in the world moves (rule 10), and no step asks the player into a grab zone.

**Claude's lead calls the plan needed (made now):**
- Rule 10 sign-offs: P-1 reading the cave and pit geometry, P-43's drums back in the world, P-10's map label.
- Player physics for the vault (P-44) is Cursor's.
- The best-run record is a lifetime record like D-31, not a run save.
- The laser's code is fixed, not its copy (P-8).
- The extended-mag change (P-48) may nerf what players already buy: approved.
- The siege stacks on a guardian night (P-59).

## Fact-check notes

- **S1: outdated.**
  - The build card sits in `#hudNotices` at bottom 112 px (`ui/hud-layout.css:19-22`), above the ammo box at 18 px (`index.html:213-216`). It is about 40 px clear in `qa/shots/2026-09-25-AG-15/05-building-placement.png`, and about 3 px with the reload row showing (estimated, not measured).
  - GP-32 replaced the "????" with padlock badges (`index.html:30936-30943`).
  - The real, smaller problems go to P-9.
- **S2: confirmed.** "CABIN" on the map (`index.html:7814`), the kiosk banner (`19396`), the refusal (`22206`) and Tips (`ui/strings.js:1133-1134`). The landmark cabins (`POI.cabins`) must stay "Cabin".
- **S3: partly right.**
  - The 30 s life is real (`index.html:18742`).
  - After day 1 there is no $1 skull: small rewards pool into one drop of 8 or more (`18747`, `18760-18765`).
  - "30-45 m out" predates GB-42 and is unmeasured.
  - Pickup is a walk-over at about 1.16 m (`18915`).
- **S4: not reproduced** (`handoffs/2026-09-25-claude-CL-56.md:6`). Three code paths can still cause it:
  - no recall after day 1 (`26550`);
  - a skull dropped in a cave mouth's grab band (`30886-30893`);
  - a skull dropped inside the pit's `grabR` (`5613`, `30885`).
- **S5: partly right.**
  - A poke takes a miss into a mouth, from within 20 m, inside a frontal cone of about 70°, once per cave per day, and the run's first poke is only a warning (`index.html:30504-30537`, `30441`).
  - The chase can't be won by design: 27 m/s against 11.8 m/s (`30612`, `37492`; D-26).
  - Once caught, death is certain (`30344-30352`).
  - "Loses an hour" is unverified.
- **S6: confirmed.** The game doesn't use the studio yet (`docs/studio.md:173-174`); it is CL-62.
- **S7: speeds confirmed and deliberate.** A plain jump of about 1.73 m already clears sandbags and wire (`index.html:37497`, `35362`).
- **S8: partly right.**
  - The stair and bridge bugs named in code comments are fixed (`2524-2605`).
  - Reaching through floors is confirmed (`22256-22335`).
  - A turret on the marine's own cell on a deck is confirmed (`22211`).
  - "No room" shows when the real problem is Cash (`22365-22368`).
  - Slopes and getting trapped are unverified.
- **S9: partly right.**
  - Every gun already has its own recoil, sound and pose (`index.html:32432-32459`, `17031-17182`, `32239-32252`; `core/audio.js:234-294`).
  - The real gap: the last pellet sets the stagger (`34796`), and the pellet knockdown needs 26 damage while a pellet does at most 21.6 (`34684`).
  - The 16 shells were a sim spider strafing along a wall (`handoffs/2026-09-25-grokbot-GB-56.md:94`).
  - The 414 "knife" kills were machete kills, counted per swing.
- **S10: partly wrong.**
  - The bloater exists as the bomber (`index.html:25001-25004`).
  - The screamer exists, but the full cap blocks its call (`36814`).
  - Brute armour cuts every damage kind equally (`34735`), and its `armored` flag is never read (`24988`).
- **S11: partly wrong.**
  - A MedPen is $35, not $55 (`index.html:16714`).
  - There is no bleed.
  - Regen stops at 40% (`16715`), and health does not refill at dawn; only armour does (`27535`).
- **S12: partly right.**
  - Spike traps (`21212-21290`) and drums exist as builds.
  - The map drums are switched off (`7132`).
  - There are no rock-slides or oil lines.
- **S13: confirmed that nothing roams by day.** The colossus appears only at night (`27547`), and guards wake by distance, hit or alarm (`36474-36481`).
- **S14: outdated in part.**
  - There is no 2-minute wait: prep has no countdown (`27815`), and `docs/gameplay.md:42` is stale.
  - The scouting report and bounties exist (GP-42, GP-43).
  - Caches pay once per run (`game/objectives.js:39`).
- **S15: partly wrong.**
  - Random supply drops already fall mid-night (`index.html:28513-28518`).
  - Breathers are inert at the cap (GB-56:118).
  - The HQ can't be lost (`house.active = false`, `37762`).
- **S16: partly right.**
  - Only Ember Night changes the rules (`27536`, `36577`), but guardian, colossus and rest nights, and a named trick for every night, exist (`26173-26195`).
  - The fog, swarm, siege and silent tracks exist but are never played (`38098-38101`), and they are plain loops, not sectioned songs.
  - Night 18 is a guardian night (`27185-27188`).
- **S17: confirmed missing.** Nothing makes zombies target a crate (`36505-36521`).
- **S18: partly wrong.**
  - Besides settings, `tt_death_log` (`28745-28752`) and the coach's flags (`ui/coach.js:3`) persist.
  - The death card already shows Day, Kills, Headshots and Best streak (`index.html:30917-30924`).
  - `matchStats.skullsTurnedIn` is never reset (`20131`, `37773`).
- **S19: confirmed.**
  - No win is ever called.
  - Nights 13-20 loop, grown (`26196-26206`).
  - There is no helicopter. The dock and rowboat exist (`4801-4816`).
- **S20: confirmed.** There is no NPC or escort code; zombies target only the player or a lure (`36480-36500`).
- **S21: partly wrong.**
  - Extended mags exist, with no reload cost (`31578-31580`).
  - The laser only draws the beam (`16824` against `32174`, `32446-32459`).
  - Nothing hears gunfire except wildlife (`32148`).
- **S22: confirmed as new.** The pit stones sit inside the tentacle radius (`7066-7068`, `30885`). A guardian-fight ending conflicts with D-25 and D-26.
- **S23: confirmed.**
  - The radio repair happens once per run (`game/objectives.js:44-58`).
  - Drops are random (`index.html:28513-28518`).
  - There is no `grantWeapon` helper.
  - The `airdrop` cue is never called.
- **S24: partly right.**
  - The night plans are fixed, but the caves, bounties and drops are random each run.
  - "+1 grenade" already exists (`27709`).
  - "Bank at dawn" breaks `docs/contracts.md:340`.
- **S25: partly right.** Nights 13-20 run 11-15 minutes (sim medians). Night 13 is 560 zombies, not 600 or more (`26187`). The cap is full all night (GB-56:118).
- **S26: single-run numbers.** Across the seven sim runs (`qa/nightsim/run1-7.json`), the median damage taken is:
  - night 10: 2,081;
  - night 16: 464;
  - night 19: 2,941;
  - night 20: 1,966.

  Each night swings widely: night 20 ranges from 5 to 15,082. nightsim is unseeded (`tools/nightsim.mjs:38-48`), so a single run proves little. That is why P-13 comes first.
- **S27: confirmed.** +10 points of the base price per night, not compounding; the AA-12 goes from $380 to $1,030.
- **S28: partly right.**
  - A climb exists (96 to 120 bpm, `tools/hordes.py:8-15`).
  - Nights 16 and 18 fall back to `fight_ember` and `fight_guardian` (`assets/soundtrack/music.json` waveByDay).
  - The pace hook is never read (`index.html:38071-38107`).
- **S29: partly right.** Every build is the same cyan square on the minimap (`7603`), and the hit sound reaches only 40 m (`23949-23965`).
- **S30: confirmed.** There are four coach cards (`ui/coach.js:4`) and no tutorial (`docs/specs/tutorial.md:3`). "Never finds building" is unverified.
- **The brief's act ranges:** the code has build 4-10 and test 11-20 (`index.html:26156`, `26185`).
- **Rule 11 gaps found while checking:**
  - `endGame` labels and victory copy;
  - the death panel header;
  - the supply-drop banners;
  - COLOSSUS DOWN;
  - the mortar banners;
  - the build banner's English.

  Each is fixed inside the item that touches it.

## Not now

| What | From | Why | What brings it back |
| --- | --- | --- | --- |
| New bloater and armoured kinds | S10 | They exist as the bomber and the brute (P-26 to P-28 give them jobs). New kinds add bodies to a frame over budget. | GB-59 plus 60 fps with 48. |
| Suppressor | S21 | Nothing in the AI hears gunfire. | Day posts gain a hearing rule. |
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

## Coverage

| Suggestion | Sources | Where it landed |
| --- | --- | --- |
| S1 HUD collisions | A | P-9 (both claims outdated; smaller real fixes) |
| S2 Cabin to HQ | Jerry | P-10 |
| S3 Collecting cash mid-wave | B, D | P-2 (minimap dots Not now) |
| S4 Skulls stuck at dawn | Jerry via D | P-1, P-15 |
| S5 Fair cave guardian | B, D, E (A) | P-11, P-12, P-32, P-33, P-68, D-46 |
| S6 Guardian animation via studio | Jerry, D | CL-62 (queued, on your go), P-67, P-68, D-55 |
| S7 Vault and slide | A | P-44 (slide Not now) |
| S8 Movement round structures, placement | B, C | P-3, P-4, P-5, P-44 |
| S9 Weapon feel and roles | A, B, C, E | P-6, P-7, P-13, P-70, P-71, D-51; the reactions are D-42 |
| S10 Zombies that force weapon choices | B | P-26, P-27, P-28, P-29 |
| S11 Getting health back | D | P-22, D-52 |
| S12 Environmental traps | A, B | P-43, P-30 (tree hint) |
| S13 Daytime roaming elite | A | P-61, P-62 |
| S14 Daytime rhythm | C, D | P-41, P-42, D-53 |
| S15 Breather events and emergencies | B, C | P-45, P-35 |
| S16 Special nights | B, D, E | P-56 to P-60, D-54 |
| S17 Optional night orders | C | P-39, P-40 |
| S18 Results and records | B, D, E | P-31, P-55 |
| S19 Real ending | C, E | P-50 to P-54, D-45 |
| S20 Survivor rescues | C, E (B) | P-63 to P-66, D-47 |
| S21 Attachments | C | P-8, P-48, P-49 |
| S22 Secret quest | D | P-94 to P-97, D-56 |
| S23 Radio airdrops | D | P-34, P-36, P-38, D-49 |
| S24 Dawn boons | E | P-37 (Tonight's call) |
| S25 Late nights drag | E | P-16, P-17, D-50 |
| S26 Headline nights don't land | E | P-13, P-18 |
| S27 Equipment price climb | E | P-46, P-47, D-48 |
| S28 Music intensity | Jerry | P-19, P-20, P-21 |
| S29 Threat readability | C | P-23, P-24, P-25 |
| S30 Learning the controls | D | P-30 |
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
| P-20 | CL-70 | R2 |
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
| P-55 | GP-65 | R4 |
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
