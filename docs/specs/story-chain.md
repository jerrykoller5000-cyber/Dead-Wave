# The story chain: the day missions as one story, day by day (CL-263)

Claude, 2026-10-24, for Jerry's notes N24, N7 and N21 (`docs/jerry/2026-10-24-playthrough-notes.md`), under D-88
("Design and build, I play it after") and `docs/quest-design.md` (every quest answers the five questions here, before
it is built). The story it tells is `docs/story.md` (v3); nothing here contradicts it, and what it never says
(story.md §12) stays unsaid.

- **N24:** "All the day missions ... should not be available right off the rip ... They should chain together in one
  elegant story that plays out and becomes available day by day. One thing we want is for players to never feel bored
  or like there is nothing to do."
- **N7:** "I do not really understand how the Fieldwork and relay panel on alarm control work ... A few of my friends
  accidentally clicked Sound alarm when I told them to try day missions." Draw players in some other way than the
  alarm panel.
- **N21:** "Give the hikers actual names instead of just 'hiker', and pictures as well."

## 1. The idea: the twelve's unfinished business

The twelve of FOB Threshold had four quiet days (Ridgeline line 2: "Wall up, look around, report"). They spent them
looking round the valley, and each of them left a thread half-pulled: their field notes are already in the world,
signed (story.md §6). The marine is the thirteenth. **He picks up their threads, one a day, in the order the valley
gives them to him.** Each thread is a day mission; each one done hands him the next. That is the chain.

This answers the 12 rules at the level of the whole:
- **The spine (1):** the tone, and the orders card: "Get the relay up. Hold Threshold. Bring ours home."
- **Cause and effect (2):** every lead opens because of something he just did or found, never "because it's day 5".
- **Independent stories (3):** each thread is a small story with its own people (a fuel log, a drowned bag, a search
  that failed, an old man who knew).
- **Overlapping threads (4):** the twelve, the hikers, the rangers and the trapper run through each other: the hikers'
  bolt cutters open Clarke's toolbox, the rangers searched for the hikers, the trapper ran the rangers off, Okafor hid
  in the trapper's cellar.
- **Unequal knowledge (5):** the twelve knew tactics, the rangers knew the trails, the hikers knew the ghost stories,
  the trapper knew iron, Ridgeline knows the file. Nobody knows all of it.
- **Converging storylines (11):** the two threads (Threshold's and the valley's) both end at the iron mine, and the
  iron mine is the way into the Hollows.
- **Earned payoff (12):** iron. Seen on day 1 (horseshoes, banded coffins), explained by the trapper on day 8, and it
  turns out to be why Okafor lived, and why the Hush works.

## 2. The way in: off the alarm panel (N7)

The alarm panel becomes only the alarm: "Alarm control" with the threat report and **Sound alarm**. Its Fieldwork and
Relay tabs come off it. The day missions come to him three ways instead, none of them next to the alarm switch:

1. **The lead card at dawn.** The morning sequence that shows the night's name shows, when a lead opens, a second card:
   "NEW LEAD · The generator" and one line in the voice of whoever left it ("Generator's dry. Fuel's in the sheds.
   — Price"). Then the lead's marker appears on the map and the objective tracker (the existing diamonds; a site
   with no open lead shows no marker at all).
2. **The duty board.** A physical cork board on the HQ's outside wall beside the wall of tags: the twelve's own duty
   board (story.md §11 has its first two lines), their cards in their hands, the valley map with string. Every lead is
   a card pinned to it: open leads with a red pin, done ones with a pencil tick (Hale's tally hand). E — Duty board
   opens it big: each card's line, where it is, and "Track". This replaces the Fieldwork tab (the restocks and the
   day bounties move here too, as cards).
3. **The radio.** Ridgeline's morning lines, Tonight's call and the word (the secret) move from the alarm panel's
   Relay tab to the HQ's radio set (E — Radio), the thing that talks. After the relay is up, Ridgeline's line is
   what opens several leads.

## 3. The chain

Two threads after the relay: **Threshold's** (what the twelve left on the road) and **the valley's** (who came before
them). One new lead a dawn, from day 2. A lead opens at the first dawn after the lead before it is done (its
"because"); a lead left undone for two dawns lets the next one open anyway, so he is never stuck, and never more than
two are open at once.

| Day (earliest) | Lead | Thread | Opened by | Site, mission | Left by |
| --- | --- | --- | --- | --- | --- |
| 1 | (none) | | | Orders: the drop, Threshold, the first dead (D-32), the field notes in the world | |
| 2 | **The generator** | Threshold | The HQ's lights died in the night | Fuel depot: fill the can, carry it home (GB-197) | Price |
| 3 | **The relay** | the spine | The generator powers the HQ radio: only the tone on every channel | The mast: breakers, tuning, the lever, the reboot, the vault (CL-183 to CL-257) | Sato |
| 4 | **The medical run** | Threshold | Ridgeline's first morning: "Supply's thin. Threshold's own stores went off the road at the bend." | Convoy: jack the ambulance (GP-19965) | Hale |
| 5 | **The missing** | the valley | The ambulance's radio log: a hiker search on the ranger band; the trailhead posters get their names | Hikers' kit: the bag in the tree (GB-196) | Pike |
| 6 | **Clarke's truck** | Threshold | The hikers' camera clip: the mine, a rope, a pair of bolt cutters | Utility truck: the cutters from the mine mouth, the chain, the car alarm (CL-216) | Clarke |
| 7 | **The search** | the valley | The posters: "If you saw them on the trail, tell the rangers." | Ranger cache: the three-digit code (CL-217) | B. (Brandt) |
| 8 | **The old man** | the valley | The rangers' search log, last line: "Old man at the trapper's ran us off. Horseshoes on everything. Said iron." | Trapper's safe path (AG-93, AG-124) | Okafor |
| 9 on | **Below** | both converge | The trapper's cellar is iron; Okafor's "they walk straight past"; the Hush in hand | The Hollows: the five warrens, one a dawn as the Hush charges (CL-259) | (the twelve's tags) |

After day 9 there is always something: a warren a day while the Hush charges once a dawn (nine tags, five shards),
the survivors on the roof, the restocks and the day bounties on the duty board, the colossus by day, Tonight's call,
and the word for whoever has the shards (`docs/specs/secret-quest.md`). Day 1 has no lead on purpose (Jerry: not "right
off the rip"); it has the drop, the first dead by the HQ, the first skulls, the terminal and the world to read.

**The Hush (N30's "how you get it").** The relay's vault: the first time its lift comes up it carries, with its day's
tier, the relay's **spare board**, the one Ridgeline talks him through the next morning (story.md §4). E at the HQ
table: he wires it, and the Hush is his from the next dawn (it charges at the HQ). Before that, no Hush. CL-259 builds
the Hollows round it.

## 4. Each lead and the five questions

### Day 2 · The generator (Price; fuel depot, GB-197)
- **Why it exists:** three weeks unattended; the HQ's generator ran dry in the night and the floodlights died. Price's
  fuel log: "Day 4: topped off everything, nowhere to drive it."
- **Why care:** a dark FOB on night 2; the lights help him see the dead coming. The carry is tense: the can leaks a
  trail the dead follow.
- **How it connects:** the twelve (Price, Pike's bunkmate); the HQ; the radio needs power, so it leads to the relay.
- **What changes:** the FOB's lamps come on at dusk for the rest of the run (sodium amber, the art direction's pool of
  light), the generator hums, and the HQ radio wakes: static, and under it, the tone. Ignored: a dark HQ, and the
  relay lead still opens after two dawns (the radio runs on its battery, barely).
- **Memorable:** walking home in the evening with the can sloshing and something following the drips.

### Day 3 · The relay (Sato; the mast, CL-183 to CL-257)
- **Why:** the radio hears only the tone: "RELAY · SILENT" on the board. Sato's maintenance tag on the cabinet: he
  pulled the fuse at 02:14.
- **Why care:** the main goal of the orders card; Ridgeline, Tonight's call and the vault are behind it; Sato's corner
  is a small horror scene (his stool, his hat, the claw marks, the drag marks to the cave).
- **Connects:** the spine (the tone), Sato's tag in the iron warren ("IT'S A WORD"), the Hush's spare board.
- **Changes:** the mast's light blinks at night; Ridgeline speaks every morning after; the vault; the mast plays the
  code until he takes the vault.
- **Memorable:** pulling the lever and the siren calling every dead in the valley to the mast.

### Day 4 · The medical run (Hale; the convoy, GP-19965)
- **Why:** Ridgeline's first morning: supply is thin; Threshold's own medical stores went off the road at the bend.
  Hale's note: "Threshold's stores. Signed for: twelve. Need: fewer every night."
- **Why care:** medpens; the jack's beat; the sleeper in the cab.
- **Connects:** the twelve (Hale, the captain); the bend (Clarke's truck ran dry there too); the ambulance's radio log
  (the next lead).
- **Changes:** the ambulance stays jacked, its doors open; the cooler's gone; the radio in its cab, now reachable,
  plays its last log: a hiker search on the ranger band.
- **Memorable:** the spitter that wakes up when you fumble the jack.

### Day 5 · The missing (Pike; the hikers' kit, GB-196)
- **Why:** the ambulance's radio log, and the trailhead's posters now with six names and faces (N21, §5).
- **Why care:** six people; their camp is intact and empty; Pike's note: "Six tents, six packs, nobody. Camera's last
  clip: the mine, a rope, everyone laughing."
- **Connects:** the hikers opened the mine (the cause of everything since); the rangers searched for them; their bolt
  cutters (next lead); Pike hid beyond their camp.
- **Changes:** the bag comes down (or drifts to the pool); in it, Maya's camera: E plays its eight seconds (story.md
  §6), whose last frame shows the bolt cutters at the mine mouth. The posters at the trailhead get a pencil line under
  each name as he learns about them. If Pike is still out there (night 3 on), he's found here (§6).
- **Memorable:** the camera clip, and the one holding it going quiet and turning toward the lake.

### Day 6 · Clarke's truck (Clarke; the utility truck, CL-216)
- **Why:** the camera's last frame: bolt cutters at the mine. Clarke's door: "RAN DRY AT THE BEND. WALKED." Her toolbox
  is chained shut.
- **Why care:** ammo; the walk to the mine mouth and back; the car alarm.
- **Connects:** Threshold (Clarke, the driver; her ring is in the wet warren); the hikers' cutters; the mine.
- **Changes:** the toolbox open; the truck's battery lives again: its headlights, left on, light the bend at night.
- **Memorable:** the alarm going off and the dead coming down the road toward the light.

### Day 7 · The search (Brandt's note; the ranger cache, CL-217)
- **Why:** the posters: "If you saw them on the trail, tell the rangers." The rangers' camp has their search board.
- **Why care:** the code hunt (searching, not guessing); the rangers' last transmission on the dash (story.md §6).
- **Connects:** the hikers (the search); B.'s note ("We've found none of them"); Brandt hid in the rangers' truck.
- **Changes:** the lockbox open; the search log readable: its last entry opens the next lead. If Brandt is still out
  there, he's found in the truck (§6).
- **Memorable:** the transmission: plate numbers read slower and slower, then a dog, then nothing.

### Day 8 · The old man (Okafor's note; the trapper's safe path, AG-93, AG-124)
- **Why:** the rangers' log: the trapper ran them off: "Horseshoes on everything. Said iron."
- **Why care:** the bear traps and the horseshoe rows: a puzzle you can feel with your feet; the cellar at the end.
- **Connects:** the settlers (iron); the trapper (never explained, story.md §12); Okafor hid in his cellar; iron is
  why the Hush and the banded coffins work.
- **Changes:** the safe path stays marked; the cellar hatch is open; in the iron-lined cellar, if Okafor is still out
  there, she's found (§6): "Iron walls. They walk straight past. Took me three weeks to believe it."
- **Memorable:** standing in the cellar while the dead walk past overhead.

### Day 9 on · Below (the Hollows, CL-259)
- **Why:** both threads end at the iron mine (the hikers' rope, the cut bars, Clarke's cutters' twin); the trapper's
  iron and Okafor say what keeps them off; the Hush is in hand.
- **Why care:** the nine tags (bring ours home), the five shards (the word), the dread of the warrens.
- **Connects:** everything above; the heart.
- **Changes:** a tag on the wall each morning after; Ridgeline's Marrow line; the word's marks on the radio.
- **Memorable:** the husks with a hiker's boot through one of them.

## 5. The hikers (N21)

Six friends from the city on a ghost-town trip, early autumn. Five went into the mine; one stayed out. Names, ages and
one line each, for the posters, the board and their camp (GP-19968: pictures, in the art direction's settler family:
photocopied poster portraits, slightly washed out). Three posters exist (24, 31, 27); they become six.

| Name | Age | One line (the poster's "last seen wearing", the camp's trace) |
| --- | --- | --- |
| **Maya Costa** | 27 | Planned the trip; writes a ghost-town blog. Her camera is in the bag. |
| **Theo Marsh** | 31 | Climber; brought the rope. "Last seen wearing a red shell jacket." |
| **Sam Marsh** | 22 | Theo's brother, along for the laugh; the laugh on the clip is his. |
| **Priya Raman** | 24 | Geology student; wanted to see the white rock under the lake. |
| **Jonas Weber** | 29 | Brought the bolt cutters: "It's just an old gate." |
| **Ellis Byrne** | 34 | Bad knee; waited at the camp, then walked out to the rangers. He came back with the search. |

None of them is ever found alive. A husk in the iron warren wears Theo's red shell (story.md §8's "a hiker's boot
through the skin of one"). Ellis is never found at all.

## 6. The survivors, found at the end of their thread

The three survivors (story.md §5) are found where they hid, as the thread that leads there ends, rather than by a camp
bounty that appears on its own: Pike beyond the hikers' camp (day 5's lead), Brandt in the rangers' truck (day 7's),
Okafor in the trapper's cellar (day 8's). Each still needs night 3 passed (three weeks plus two nights is when they'd
risk it) and the camp's dead cleared; found before, they come back to the roof by morning as now. A survivor whose
thread is done before night 3 is found by the camp's bounty from night 3, as today. (Grokbot: the survivors are
GB-90's; the hook is the bounty's spawn condition.)

## 7. Who builds what

| Piece | Owner | Task |
| --- | --- | --- |
| The chain's rules (`game/story-chain.js`: the leads, their causes, the dawn rule, at most two open, the two-dawn fallback; node tests) and the glue: a site whose lead is closed is hidden and `locked`; the dawn event `story-lead` | Claude | CL-263 (this spec, then the build) |
| The alarm panel trimmed to the alarm; the dawn lead card; the duty board's panel (cards, Track, the restocks and bounties); Ridgeline, Tonight's call and the word on the radio's panel; every string (lead lines, hikers) | ChatGPT | GP-19969 (new), with GP-19968 the hikers' names and pictures |
| The duty board prop by the HQ door (cork, cards, string, pins; the art direction's military family with the twelve's handwriting), the radio set's prop, the six posters | Antigravity | AG-125 (new) |
| The leads' world changes: the FOB lamps (fuel), the ambulance's cab radio (convoy), the camera in the bag (hikers), the truck's headlights (truck), the search log's last line (ranger), the open cellar (trapper) | each mission's owner | small follow-ups, after CL-263's rules land |
| The survivors found at their thread's end | Grokbot | GB-232 (new), after CL-263 |
| The Hush from the vault's spare board, wired at the HQ table | Claude | CL-259 |

Tests: the chain's node tests (each lead opens by its cause, the earliest days hold, the two-dawn fallback, at most
two open, a run reset); a t-test that plays days 1-9 by dev commands (`story` dev command: `story open <lead>`, `story
done <lead>`, `story dawn`) and checks the markers, the board and the alarm panel's tabs.

## 8. Calls made here (Jerry can overrule)

- The order: generator, relay, medical run, the missing, Clarke's truck, the search, the old man; then below.
- One new lead a dawn from day 2; none on day 1; at most two open; the two-dawn fallback.
- The alarm panel keeps only the alarm; the board and the radio take the rest.
- The hikers' names and lines above; Ellis is never found.
- The Hush comes from the vault's spare board.
- The survivors are found at their thread's end.
