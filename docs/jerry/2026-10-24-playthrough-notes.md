# Jerry's 1.0 playthrough notes (2026-10-24)

Jerry's notes from playing Grave Shift 1.0, in his words, numbered so tasks can point at them (N1 to N31). The task
that takes each one is in brackets; `docs/road-to-1.1.md` has the order. With them came the sweeps and the rules:
`docs/world-design.md` (placement, transitions, the 15 rules, the look) and `docs/quest-design.md` (the 12 rules, the
five questions).

## Settings and controls

- **N1** Need a brightness setting in the menu. [CU-159]
- **N27** The world seems a little dull colour-wise. It would be cool to have an option in the menu for vibrancy. [CU-159]
- **N8** First person could use some polish. A first-person FOV slider would be nice. [CU-159, CL-260]
- **N9** Instead of having the player reload, let's have them auto-reload on empty. "I've heard that complaint too many
  times from players." [GB-229]
- **N2** It's very difficult to interact with mini-game menus, for instance the puzzles like the breaker, in third
  person but especially in first person. [CL-258]

## First person and the guns

- **N5** Right-click and run while in first person makes the camera rapidly shift up and down. [CL-260]
- **N17** In first person you can't see the information you usually do in third person. For instance, if you grab
  something out of an airdrop you have no idea what you just collected. [CL-260]
- **N11** First-person weapon sights are not FPS-accurate. They need a lot of work, and so do the animations now that
  players can see the reloads and the weapon models. [GB-228]
- **N13** Hands on weapons are obviously not in the right position and clip through weapons now that first person is
  available. [GB-228]
- **N12** There's a visual artifact when the muzzle of a weapon is viewed over water: a circle appears around the muzzle
  and the water disappears inside it. [GB-227]

## The marine's movement

- **N6** The player model's motions, especially the arm and body movements while running unarmed, look pretty goofy.
  [CL-261]
- **N25** The knife animations and body movement with the knife, machete and katana suck. We need to fix that. [CL-261,
  with Grokbot for the blades' holds]
- **N20** Ladder climbing still doesn't land the hands and feet on the actual rungs. [CL-261]

## The relay

- **N3** Some weird collision around the place where you find the breaker note. It's hard to reach the note. That area
  needs a little more attention to detail and design. [CL-257, in the sweep]
- **N4** The relay's sequence needs polishing. After you get the frequency right, you should have to pull a lever to
  reboot the relay. After the reboot's alarm is done, the morse code should play on a loop whether or not the player has
  the panel open. [CL-257]
- **N26** A glitch on the second playthrough of the relay: after rebooting the relay, the door to the storage facility
  was already open without using the keypad. After typing the correct code on the keypad, the elevator did not come up.
  [CL-257]
- **N16** Collecting the boots off the skeleton is one of the funniest things ever. The player should have to yank the
  boots by pressing E; the skeleton jerks every time he presses E as he yanks; when they finally come off, the skeleton
  falls off the tower and faceplants. [CL-264]

## The day missions and the story

- **N7** "I do not really understand how the Fieldwork and relay panel on alarm control work. I think other players do
  not either. A few of my friends accidentally clicked Sound alarm when I told them to try day missions." We need some
  interesting way to tell a story and draw players into the day missions, perhaps removing them from the alarm panel
  and integrating them some other way. [CL-263]
- **N24** All the day missions need better integration and should not be available right off the rip. They all need
  serious work. They should chain together in one elegant story that plays out and becomes available day by day.
  "One thing we want is for players to never feel bored or like there is nothing to do." [CL-263, then each mission's
  owner]
- **N21** Give the hikers actual names instead of just "hiker", and pictures as well. [CL-263, GP-19968]
- **N23** Jacking up the ambulance is literally impossible right now and looks pretty bad. [GP-19965]
- **N28** The bear trap game is a fun idea, but it's right next to the bridge, a little too small and not put together
  visually well. [AG-124]
- **N29** Simplify the Supply Terminal menu: too many words, too many tabs; it doesn't convey what is there easily or
  make it accessible or interesting to browse. [GP-19967]
- **N30** The Hollows are completely broken. How you get the Hush isn't specified: what it is, how it ties into the
  story. None of that is a game element yet. Going down into the Hollows is busted: the camera freaks out and clips
  rapidly in and out of the ground, nothing of the Hollows is seen, and the player pops back up through the ground when
  walking around. "The entire thing is busted." [CL-259]

## The world

- **N18** The generator sits smack in front of the armory. Find another place for it where it looks like it belongs.
  [AG-123, in the sweep]
- **N19** The FOB could use an overhaul, making sure all its elements visually make sense and are improved. [AG-123, in
  the sweep]
- **N22** The big birds flying around are a bit of an eyesore: you can clearly see where their wings join the basic
  shapes, and they all flap at exactly the same time. They need more realistic motion. [GP-19966]
- **N14** Storms and rain happen a bit too often: about half as often. A grace period with no storms until day 3.
  [CL-262]
- **N15** Environmental effects are one of the coolest parts of the game. Add wind and windy elements to the world that
  flow in and out like the storms. [CL-262]

## The night

- **N10** Night 1's waves are too staggered. They should all come at once. [GB-230]

## Sound

- **N31** The metal stinger for the alarm that he used to have is missing. He'd like it back. [CL-265]
