# The day missions: the supply sites as mini-games (1.0)

Jerry, 2026-10-12: supply sites are opened by puzzles or mini-games, each its own, after the fun of the mast boots
climb. Jerry, 2026-10-19: the six still to do go into 1.0 (D-82). The radio mast was the first (CL-183 to CL-185).
The designs and the quoted comments are Jerry's; the numbers and the details marked *lead call* are Claude's
(Jerry can overrule any of them). Model polish stays frozen: new props for these are new work, not polish.

## The rules for all six

- **Where:** the seven sites stay where they are (assets/world/objective-props.js). Each mission is played at its
  site; the rewards are the site's own (game/objectives.js: the convoy 2 medpens, the hikers 1, the trapper a grenade,
  the ranger cache and the utility truck their ammo choice, the depot fuel).
- **Once a run** *(lead call)*: the mini-game opens the site the first time. After that, the site's restocks are a
  plain E search, as now, so day 15 isn't the same chore a fifth time.
- **The gate:** until its mission is done a site is `locked` in `objectiveReach` (the CL-183 pattern for the radio's
  vault), so the objective runtime, its states and its tests keep working as they are.
- **Words:** short floating prompts at the thing (Jerry, 2026-10-11), no menus, no tutorial text. Each task's strings
  in ui/strings.js under `// <task id>` (ChatGPT reads them once).
- **Noise calls the dead** through the day missions' spawner, `siteCallTheDead(centre, n, overCap, tag, near = 26,
  far = 40)` in index.html (beside the relay's; CL-216): from 26-40 m unless a mission asks for its own ring (the
  convoy uses 30-40), never by a cave mouth, the next day's mix, scaled by day by the mission.
- **Each mission** is a pure rules module in game/ (no DOM, no three) with node tests, glue in index.html (its own
  named part in `--touch`), and a t-test that plays it headless. A dev command to jump to it: `site convoy`, `site
  ranger`, `site hikers`, `site trapper`, `site fuel`, `site truck`.
- **Looks:** Antigravity builds or changes the props each one needs, on request from the mission's owner, and looks at
  every mission on Jerry's GPU when it lands. Then Jerry plays it (the relay took three rounds of his notes).

## 1. Medical convoy: jack up the truck (ChatGPT)

Threshold's overturned ambulance on the road (`wrecks.0`). The medical cooler is pinned under it.

- **The jack:** E at the jack starts it. Tap E on the beat: a soft pulse at the jack shows the beat, about one every
  0.75 s, a 0.18 s window *(lead call)*. Eight good pumps lift it enough to pull the cooler out. Each pump creaks loudly.
- **A miss** slips it back a notch, and something in the cab bangs to get out.
- **The sleeper:** a rare spitter (Jerry: "a different color or something") who loves to sleep in the ambulance. While
  you jack you hear his spitter idle sounds, faintly. Two misses in a row *(lead call; Jerry's "mess up the jacks")*:
  he opens the door, pukes all over you for **75% damage**, and closes the door. It can kill if you're already hurt:
  that's the risk *(lead call)*. A heavy thump from the cab comes half a second before the door, so it feels fair.
- **Can he die?** Only while the door is open. Then the convoy is quiet for the rest of the run.
- **Reward:** the cooler: 2 medpens.

## 2. Ranger cache: find the combination (Claude)

The rangers' lockbox at their camp (`campsites.0`), with the keypad from the Training Ground hangar (CL-146's look; the
entry is the relay panel's keypad mode, ui/relay-panel.js).

- **The code:** three digits, new each run, hidden round the camp, all within about 15 m of the box:
  the channel number on their radio (on the truck's bonnet, "CH 7"), a date on the search board ("SEARCH DAY 4",
  circled), and a number painted on the truck door ("UNIT 2").
- **Searching, not guessing** (Jerry: "make sure players have to search but it is not insanely difficult"): each clue
  has a quiet "E — Look" up close that shows it big and readable. The lockbox lid has three small pictures (a radio, a
  board, a truck) in the order of the digits *(lead call)*. Nothing on screen says "code" or "clue".
- **A wrong code** flashes WRONG, as the vault does. No penalty.
- **Reward:** the cache's ammo choice.
- **Built (CL-217, 2026-10-19):** rules in `game/ranger-cache.js`, the paintings in `ui/ranger-clues.js` (the same
  painters draw the world's small textures and the big "E — Look" views), the block in index.html after the utility
  truck's. The radio's display reads "CH n"; the search log is pinned over the board's lower right sheet, day 1 to n with
  the last ringed in red; "UNIT n" is stencilled on both doors. E at the lockbox opens the keypad (a second relay panel,
  `#rangerPanel`) with the lid's three pictures over its display; one, two and three pips under them give the order.
  Without the rangers' camp or truck the site is an ordinary cache. Dev: `site ranger` (`radio`, `board`, `door`,
  `code`). Test: t266.

## 3. Hikers' first-aid kit: shoot it down (Grokbot)

The kit is in a backpack hung high in a tree, the way hikers keep food from bears.

- **Where:** a big tree on the river bank nearest the hikers' camp (`campsites.1`), within about 50 m. If no tree fits,
  a tree at the camp, and then there's no river.
- **The rope** runs from the trunk up over a branch to the bag, about 5 m up. Any round that hits the rope cuts it
  (right-click aim helps). The bag drops.
- **The river** *(lead call)*: on about half the runs (the run's seed) the bag swings out and lands in the water. It
  floats downstream with the river's flow; E grabs it from the bank or wading, within 2 m.
- **Too far** (Jerry: "if it floats too far it reaches some sort of zombie scenario"): if it isn't caught in about
  40 s, it snags in the pool under the waterfall, and the drowned are waiting there: 3 to 5 rise when he gets close
  *(lead call)*.
- **Reward:** the kit: 1 medpen.

## 4. Trapper's supplies: walk the safe path (Antigravity)

The trapper's cellar hatch at his camp (`campsites.2`) sits behind his own bear traps, hidden under leaves.
Jerry: "almost like a little platformer."

- **The path** *(lead call)*: six rows of two stepping stones in a bed of leaves, from his fence to the hatch. A
  fence runs down each side; each row has a post on each side, and a horseshoe is nailed to the post on the safe
  stone's side. A new pattern each run.
- **A wrong step**, or a step off the stones into the leaves: the trap snaps. 25 damage, held 3 s (he can still shoot),
  and the snap calls 4 to 6 dead *(lead call)*.
- **No way round:** brambles and the fence close the bed's sides.
- **Reward:** the cellar's grenade.

## 5. Fuel depot: carry it home (Grokbot, last)

Jerry: "Maybe have to rework this one a little bit." The rework *(lead call; Jerry can overrule)*:

- Hold E at the depot's pump to fill a jerrycan, then carry it back to the HQ, slowed as when carrying the mortar.
- **Only fire and acid set it off:** flames, a burning zombie, the flamer, or a spitter's hit. His own stray shots
  don't, so it never feels cheap.
- **It leaks:** a fuel trail drips behind him and the dead follow the smell. An escort run with him as the escort.
- **He can put it down** (E) to fight and pick it up again. It doesn't explode from being dropped.
- **At the HQ** E pours it into the generator. **Reward:** the depot's fuel.

## 6. Utility truck: a two-stop fetch (Claude)

Jerry: "This one is good."

- The truck's toolbox (`wrecks.1`) is chained shut. **E — Look:** "Chained."
- The bolt cutters lie at the mine mouth, by the cut iron bars. It's the hikers' pair, the one Pike's note is about
  ("Somebody cut the old bars off this mine. Recently. Bolt cutters.").
- With them, hold E at the chain (1.5 s). The truck's alarm goes off (a wailing car alarm for 20 s) and calls 6 to 10
  dead. Grab the supplies and get out.
- **Reward:** the toolbox's ammo choice.

## Order and owners (the board has the tasks)

Frame rate first: each owner finishes the cut they're on. Then:

| Mission | Owner | After | Task |
| --- | --- | --- | --- |
| Utility truck | Claude | the spec (CL-215) | CL-216 |
| Ranger cache | Claude | CL-216 | CL-217 |
| Trapper's safe path | Antigravity | AG-92 | AG-93 |
| Hikers' kit | Grokbot | GB-195 | GB-196 |
| Medical convoy | ChatGPT | GP-19936 | GP-19937 |
| Fuel depot | Grokbot | GB-196 | GB-197 |
