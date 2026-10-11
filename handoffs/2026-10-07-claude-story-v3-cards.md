# Story v3: the cards (draft for Jerry, 2026-10-07)

Claude, from the story audit (the audit doc, 2026-10-07) and Jerry's six decisions: the Branch can be funny; no
Threshold Protocol, the thing in the lake is why nothing lands before night 20; Gravewalker is the unit's name, the
twelve included; the survivors bury him; heavy and funny can share the game; no fence exists beyond the Cordon's gate.
The words are already in `docs/story.md` (v3: sections 1, 3, 4, 5, 6, 7, 9, 11, 12).

**Note (2026-10-09):** the ids below are placeholders and get renumbered when posted: CL-133 went to the smoothing and CL-134 to the weapon sounds, ChatGPT has used GP-150 to GP-155, and t216 to t220 are taken.

**Nothing below is on the board.** Jerry says go, and I post them as written, in four waves. Ids are the next free
ones per lane; tests are t216 up (none exist yet; each card writes its own). Sizes: S an afternoon, M a day or two,
L a week with a GPU walk. Cursor gets nothing (absent, D-78); Grokbot gets one.

## Wave 1 · the holes (everything that reads as a mistake)

| Card | Owner | What | Where | Test | Size |
| --- | --- | --- | --- | --- | --- |
| **GP-150** Night 20's reason, the guardian's wording, line 8's seed | ChatGPT | Ridgeline lines 8, 12, 15 as story.md §4 now reads; `reward.guardianFirstBlood` and the night-6/12/18 cards say "Guardian driven back" (unlocks unchanged); `scouting.trick.guardian` loses "Marrow guardian" as a kill. | `ui/strings.js`, the reward cards | t216: the three lines match story.md; no "defeated" on any guardian card | S |
| **CL-133** The orders card at the drop | Claude, ChatGPT for the card | In `beginMarineInsertion`, the card in his hand for ~4 s before the chute (story.md §3, five lines, the PGB stamp); afterwards pinned on the HQ board (a `story.orders` string, a board panel). Skippable. | `index.html` (cine), `ui/strings.js`, the HQ board | t217: the card shows in the drop, and on the board from day 1 | M |
| **CL-134** The survivors bury him | Claude | The burial cine: survivors rescued hold the shovels (one, two or three, their roof models); none rescued, no hands, the earth settles on its own. Recovered tags go into the grave; the rest stay on the wall (CL-137). The two marines are removed. | `index.html` (the burial cine, `GRAVE_PLOTS`) | t218: zero survivors → no diggers; three → three; the "two marines" mesh is gone | M |
| **GP-151** The Hush's origin | ChatGPT, Claude for the prop | Ridgeline's extra line the morning after the relay repair (story.md §4); the relay's spare board as a prop on the HQ table until the Hush is built (then gone); the board line stays. | `ui/strings.js`, the morning-line model, `index.html` (prop) | t219: the line plays once, that morning only; the board prop leaves when the Hush exists | M |
| **CL-135** Gravewalker is the unit's name | Claude (words), ChatGPT (strings) | Okafor's "Twelve walked in. You make thirteen." in her roof pool; the loading screen and game-over card keep "Gravewalker" but the first-time tip (GB-139's set) says what it means in one line. | `ui/strings.js`, the tips | folded into t216 | S |
| **CL-136** Three road notes, not one | Claude (world), ChatGPT (strings) | The convoy, the utility truck and the fuel sheds each get their own note and signature (story.md §6). | `world/history-props.js` or wherever the note ids live, `ui/strings.js` | t220: the three note strings differ and are signed | S |
| **GP-152** The v1 leftovers | ChatGPT | Survivor keys `reyes/voss/kettle` → `pike/brandt/okafor` (one set, every reader updated); `objectives.medicalConvoy/fuelDepot/wreckSalvage/hikersCache` reworded as Threshold's stores and the hikers' cache; `world.cabin` → FOB Threshold; `hud.wave.*` and `wavePreview.*` say "Night {day}" (the night's title when the scouting card has it, GP-153). The nine legacy cave names: check what GP-146 left and finish it. | `ui/strings.js`, `tools/check-players.mjs` if keys are listed | t221: no v1 key is read anywhere; no "Wave Day" on the HUD across a scripted 20-night run; no "defeated"; no note string used twice | M |

## Wave 2 · the free visuals

| Card | Owner | What | Where | Test | Size |
| --- | --- | --- | --- | --- | --- |
| **GP-153** The night's name on the scouting card | ChatGPT | The titles from `tools/nights.py` (one list, exported to a JS table so both agree) on the morning scouting card: "Night 6 · Red Guardian". The HUD line uses it when present. | `ui/strings.js`, the scouting card, `tools/nights.py` (export) | t222: every night 1–20 has a title and the card shows it | S |
| **CL-137** The wall of tags | Claude (world), ChatGPT (state) | Nine nails on the HQ's outside wall under the mural; each tag in `createTagCollection` hangs there the next morning, name outward; the victory card counts "Brought home: n of 9" on both endings. | `index.html` (HQ wall), `ui/quest.js` or the tag collection, the victory card | t223: tags in the collection → tags on the wall next dawn; the count on the card | M |
| **CL-138** The tally | Claude | Hale's four marks and the unfinished fifth on the HQ board; the marine's own marks beside them, one per night survived, a different hand. | `index.html` (the HQ board texture or decals) | t224: night n survived → n marks | S |
| **CL-139** 02:14 | Claude | The HQ clock (if there is one; else the board's time line) stops at 02:14 for one second every night, then runs on. | `index.html` | t225: the clock's text holds at 02:14 for ~1 s of sim time | S |
| **CL-140** The valley gets worse | Claude | Keyed to the night: the Pit's glow reach through the water, the stones' pulse brightness from the tower, the morning fog's height on the lake, crows on the Cordon wire (two on night 1, a line by night 12, none on night 20). All four read the same curve. | `index.html`, `world/heart.js`, `world/cordon-checkpoint.js` (crows), the fog | t226: the four values at nights 1, 12 and 20 are ordered as specified | M |
| **CL-141** Heron's contrail | Claude | From night 15, once at dawn, a contrail crossing high and not turning (line 15 says what it is, GP-150). | `index.html` (sky) | t227: no contrail before 15; one at each dawn from 15 | S |

## Wave 3 · the Branch's voice and the people

| Card | Owner | What | Where | Test | Size |
| --- | --- | --- | --- | --- | --- |
| **GP-154** Crate slips | ChatGPT | One drop in three carries a slip (story.md §11), E at the crate, no reward, no repeats in a run. | `ui/strings.js`, the drop/crate code | t228: over 20 drops ~7 slips, none twice | S |
| **GP-155** Report | ChatGPT | One button on the HQ radio, once a day; Ridgeline answers keyed to the day's state (story.md §11: the twenty answers and the default). | the HQ radio UI, `ui/strings.js` | t229: each state picks its answer; the default otherwise; once a day | M |
| **GP-156** The survivors' fourth pool | ChatGPT (strings and picking), Claude (the words, done: story.md §5) | The table in §5: a pool per survivor keyed to tags up, named nights, the twelve passed, the wall full, the siege; the standing line as fallback; heavy and light never on the same morning. | `ui/strings.js`, the roof-talk picker | t230: the keyed line plays the morning after its event; the fallback otherwise | M |
| **GP-157** Signs and the duty board | ChatGPT (strings), Claude (placing) | The Cordon's PGB sign with the marker line; the supply terminal's notice; the duty board's two lines under the tally. | `ui/strings.js`, `world/cordon-checkpoint.js`, the HQ | folded into t228 | S |
| **CL-142** The sealed HQ answers once | Claude | E on the HQ door knocks three times; on the fifth night only, three knocks back from inside, once per run. Never explained. | `index.html`, `core/audio.js` (two knock sounds) | t231: knocks back on night 5 only, once | S |
| **CL-143** Brandt's notebook | Claude (prop, words), ChatGPT (the quest hook) | Once Brandt is on the roof, the notebook on the HQ table: a page a night with the stones' order in his shorthand (the run's own word, glyphs drawn badly). A fourth way to the word. | `index.html` (prop, card), `ui/quest.js` | t232: the pages spell `quest.order` | M |

## Wave 4 · the long ones

| Card | Owner | What | Where | Test | Size |
| --- | --- | --- | --- | --- | --- |
| **CL-144** The Cordon | Claude (build), GB-144 (collision and paths), AG-53 (the walk) | A fence line from the gate over both ridges and out of sight: posts, wire, the state's sign every hundred metres; the player can walk it and never get through. Jerry: nothing exists beyond the gate today. | `world/cordon-checkpoint.js` → a new `world/cordon.js` | t233: the fence is closed (no gap on a walk round the rim) | L |
| **GB-144** The Cordon's collision and the dead's paths | Grokbot | The fence blocks the player and the dead; the dead's paths treat it as a wall; nothing spawns outside it. | the collision and nav of CL-144's fence | t234: no dead or player crosses the line in a scripted night | M |
| **AG-53** The Cordon and the wall of tags on the GPU | Antigravity | Walk the fence both ways at dawn and at night; the wall of tags with nine up; the photo of the twelve. Screens in `review/story-v3/`. | — | — | S |
| **CL-145** The rangers' truck radio | Claude (world), ChatGPT (audio cue) | E on the dash: the last transmission looping (story.md §6), a short clip built from the existing voice bits and static, no recorded voice. | `world/cordon-checkpoint.js` or wherever the truck lives, `core/audio.js` | t235: the loop plays on E and stops on the second E | M |
| **CL-146** The hikers' camera | Claude | In the hikers' cache: a camera, E for the eight-second clip (a small in-world screen: a tent, two laughs, the turn toward the lake, nothing shown). | `index.html`, the hikers' camp | t236: the clip plays once per E and ends | M |
| **CL-147** The twelve, in a photo | Claude (the picture), AG-53 (the look) | A group photo on the HQ wall: twelve at Threshold's gate, three circled in pencil, no names. Drawn, not real faces (D-74 holds). | `assets/`, `index.html` (HQ wall) | — | M |
| **CL-148** The first people above ground, and Coldwater's name | Claude | A cairn on the ridge with the ring of eight on its cap (or the hand-print in the Marrow cave's mouth); COLDWATER cast on the bell's crown and the mine's lintel. | `world/first-people.js`, `world/coldwater.js`, `world/mine-props.js` | t237: the props exist and sit on the ground | S |
| **CL-149** The old survey stake | Claude | One warren's Deep: a PGB survey stake of the old pattern, a date stamped before the Branch should exist. No card, no line. | the Hollows' props | folded into t237 | S |
| **CL-150** "Warm." | Claude (world), ChatGPT (the card) | After the true ending, E on a Pit stone from the shore: the card says "Warm." Nothing else, ever. | `index.html`, `ui/strings.js` | t238: the card only after `quest.done` | S |

## The audit's own test

| Card | Owner | What | Test | Size |
| --- | --- | --- | --- | --- |
| **CL-151** Story text guard | Claude | One test that reads every story string shown across a scripted twenty-night run and fails on any v1 name (Harbor Nine, Medic-4, Reyes, Voss, Kettle, island, the boat, the cabin), any "defeated" on a guardian card, any "Wave Day", any "Threshold Protocol", and any note text used twice. Keeps the audit from needing to happen again. | t239 | S |

## Order and time

Wave 1 first (a week, two lanes: ChatGPT GP-150/151/152, Claude CL-133/134/135/136). Wave 2 the week after, with
Wave 3's ChatGPT cards alongside. Wave 4 as lanes free up; the Cordon is its own week for Claude. Roughly four weeks
of crew time with everyone on a lane; Wave 1 alone fixes everything that reads as a mistake.

## What I'd ask Jerry before posting

1. A roadmap row for it? I'd add **R6s · Story v3: the charm** under R6 with these cards listed, so the panel counts them.
2. GP-152 touches every reader of the survivor keys; ChatGPT should do it in one commit with the test, while Cursor is
   away, so nothing half-renamed reaches git.
3. The photo (CL-147): drawn faces, not photographed ones (no real people, D-74's spirit). Yes?
