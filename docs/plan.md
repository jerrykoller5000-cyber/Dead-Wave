# Dead-Wave plan, from 2026-09-24

Jerry played the game and wrote his notes; he and Claude turned them into this. The board carries
the current phase as tasks; this file is the whole plan. Claude keeps it current.

## The test for every task

**Flow.** The game already has plenty in it. What it needs is for each small loop to be fun on its
own and for the loops to feed each other, so it's a game people want to come back to for the
gameplay, not only the look. No new systems until the ones we have work well. Before building
anything, ask: does this make one of our loops more fun, or connect two of them better?

## The daily rhythm (the target for phase 3)

- **Day: scavenge and skirmish.** The briefing works as a mission board with two or three targets
  for the day. Some POIs are guarded by a pack and a few zombies roam between them; clearing a
  guarded POI is how you earn its loot. Caches refill each day but pay out different things.
  Daytime fights are the carnage you can actually see.
- **Dusk: prepare.** The kiosk, building, repairs. Airdrops are earned (the radio repair calls one
  in), never random.
- **Night: the horde.** Dark and spooky on purpose (testers liked it), but you can always find your
  way: light at the HQ, lanterns at the camps, moonlight on the lake. Some nights are special.
- **Dawn: payoff.** A short summary of the night, achievements unlocked, and tomorrow's briefing.

## Special nights

Named in the briefing the day before, each with its own music:

- **Ember Night:** what used to be the Blood Moon, renamed.
- **Fog Night:** you can't see far.
- **Swarm Night:** fast runners.
- **Siege Night:** brutes that go for your walls.
- **Silent Night:** no alarm, so you have to watch for them yourself.
- **Guardian Night:** stays as it is (D-13).

## Progression

Start slow, like Call of Duty Zombies. Day 1 is a handful of slow shamblers, so the player learns
to shoot, loot and build before it ramps up. The economy is rebalanced against that curve, not
separately.

## Phases

After each phase Jerry plays it for real. That's the test that counts.

### Phase 1: make it feel right (on the board now)

- An honest FPS counter and a `megaswarm` benchmark (500 zombies), then measure the day-5 fight
  and the base-build hitch before fixing anything.
- Bugs:
  - cave mouths show as sharp black spots in fog, at night and during Ember Night;
  - half-circle puddles;
  - the tower railings don't stop you falling;
  - the ranger cache Search gets stuck;
  - the mortar camera freaks out when zoomed with the arc pointed at you;
  - the Ready panel overlaps the killstreak.
- Take out the death replay (D-20).
- Rename the Blood Moon to Ember Night.
- The pistol gets its own .45 ammo.
- A restock button next to each weapon's buy, plus Restock all.
- The pit: the tentacles stay hidden until the cutscene, and bubbles rise over the hole.
- Music, part 1: the fight music starts on the alarm with a sting, hits right away, stays until
  the last zombie dies, then plays a release cue. Uses Jerry's Suno tracks as they arrive
  (`docs/audio/cue-sheet.md`).
- A proposal only: what happens when you shoot into a cave. The guardian comes out after you.

### Phase 2: the first hour

- The slower wave curve and an economy pass.
- The kiosk sorted into tabs, with ammo for the guns you own first.
- The HUD tidied: the center of the screen kept clear.
- A tutorial day: offered on your first run only, with Skip, remembered, and replayable from the
  menu.

### Phase 3: flow

- The daily rhythm above: guarded POIs, day skirmishes, the mission-board briefing, caches that
  refill with something new each day, earned airdrops.
- The achievement board.
- The special nights.
- Night lighting that keeps it dark but readable (CL-11).
- The guardian's minimap marker (ChatGPT's request).

### Phase 4: showcase

- The guardian: new animation and the charge out of the cave.
- The tentacle: a new model and animation.
- Climbing the tower, animated.
- Music, part 2: the special nights, the guardian, day skirmishes and the small cues.
- Sound design: the screech, cave groans, the pit rumble.
