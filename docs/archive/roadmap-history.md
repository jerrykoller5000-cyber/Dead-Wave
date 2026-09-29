# Dead-Wave roadmap: history

What used to be in `docs/roadmap.md` and is no longer needed to do the work: how the roadmap was made
(2026-09-26), the fact-checks behind it, R1's finished items and the early workload notes. Moved here by Claude on
2026-09-29 when the roadmap was cleaned up. Nothing was cut.

## How it started

It started as 30 suggestions from Jerry and five agents, merged and checked against the code
(`feature/Phis-changes` at `fa95ccb`). Then came Jerry's order of 2026-09-26: make the reaction tool (D-42, done as
CL-65); turn the board into the roadmap; make the calls he'd left open, for fun and for the story (D-44 to D-56).

**Carried over:** CL-62 (the rest of the guardian through the studio) goes on in R2. GB-58 and GB-59 were
parked when the board was cleared; GB-59, the fog cull, comes back in R2 as the frame-budget lever (48 zombies
run at 50-54 fps on the 5080 against a 60 fps budget, `handoffs/2026-09-25-cursor-CU-38.md:4`).

**Playing to strengths.** Each agent's tasks fit what its model does well (the board's "Who does what"):
- **Grokbot:** combat systems inside `index.html`, and headless sims.
- **ChatGPT:** pure, unit-tested modules in `ui/`, the words and the economy.
- **Claude:** the world, the studio and the reactions, the music, the story, the reviews.
- **Cursor:** tools, measurement, integration plumbing, player physics and commits.
- **Antigravity:** eyes on Jerry's GPU: every visible change, full runs, timings.

**Load and slip order.**
- **Grokbot has 29 items and is the bottleneck.** In each milestone his fixes come first. If his lane falls behind, these slip first, in order: P-5, P-8 (hand it to ChatGPT as copy), P-48, P-23 (event plumbing Claude may move to Cursor), P-61.
- **ChatGPT has 25.**
- **Claude has 14,** after CL-61 and CL-62.
- **Cursor has 3,** plus commits and running the suite.
- **Antigravity** takes shots for every visible item.

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

## R1 · Trust the loop, and feel it

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
| P-8 | The laser does what the kiosk sells ("Tighter groups"). | Claude's pick (2026-09-27): the laser does it for real: `aimDirWithSpread` cone ×0.8 while `lasersEnabled`; the kiosk copy stays. | Grokbot | S | none | 200-sample tNN shows ×0.8 within 5%, or the strings test passes with the new copy. |
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
  - How dark night should be (CL-11): answered, it stays dark (D-68).
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
