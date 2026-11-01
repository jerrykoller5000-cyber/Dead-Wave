# The HQ's utilities (1.2)

CL-289. Jerry's idea, D-106: "the generator unlocks electricity might be fun for one to unlock plumbing" ("Getting a lot
of my ideas from MYST"); "Yes. Let's integrate it." Each mini-game of the story chain switches one of the HQ's utilities
back on. The rules: game/utilities.js (pure, tested). The story map's mini-games table has the column; the woods plan
(https://claude.ai/artifact/V5AumdfFujtfV13hPy85aR) has "The HQ comes back to life".

## The rule that makes it Myst

A utility coming on is seen and heard in the world, never only a number: lights come on, water rises in a tank, a siren
goes up on the roof. Some need another first (the pump, the bench and the siren run on the generator's power), and the
HQ shows what is waiting: a dead pump with a tag on it, a bench with no power. Every one has a sound for coming on.

## The eight

| Utility | Its lead | Sets up | What he sees and gets | Owner |
| --- | --- | --- | --- | --- |
| Power | the generator | by itself | the HQ's lights, the radio, the radio drawer (Sato's key), the floodlight glow over the trees at dusk | Claude (the glow, W3) |
| Communications | the relay | by itself | calls out of the valley, supply drops into the clearings, the mast's red light as the beacon | Claude (relay, CL-183's) |
| The infirmary | the medical run | by itself | the HQ's aid station: a bed that heals him to full once a night, medpens restocked each dawn | ChatGPT (convoy, GP-19965's) |
| Plumbing | the missing | E at the HQ's pump, with power | the hikers' water pump from the kit fitted; the water tower fills (its level rising over a minute); a fire hose at the HQ that puts out burning things; the sink | Grokbot (the pump in the kit, GB-196's; the hose), Antigravity (the tower) |
| The workshop | Clarke's truck | E at the bench, with power | the truck's battery on the workbench: repairs at the bench faster | Claude (truck, CL-216's), Cursor (the bench) |
| The alarm | the search | E at the roof's siren, with power | the rangers' siren on the HQ roof sounds from the side the dead come in at the alarm | Claude (ranger, CL-217's; the sound) |
| Iron | the old man | by itself | four horseshoe sets to hang over gaps: closed to the dead, not to him (W2's navigation) | Antigravity (the look, trapper AG-93's), Grokbot (the dead) |
| The Hush | below | as now | the ending's tool | as now |

## When

After CL-285 part C (the gates hang on the same lead-done moments) and with the woods: the glow and the beacon are W3's,
the supply drops land in W1's clearings, iron is W2's. Each owner gets a task when their part can start; the page-side
hookup (leadDone from STORY_DONE, the install prompts, save and reset) is Claude's.
