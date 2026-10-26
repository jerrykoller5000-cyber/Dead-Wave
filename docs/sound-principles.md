# Grave Shift sound principles

Claude, 2026-10-24 (CL-268, D-89), from what the game has already established (core/audio.js's mix, CL-24's music
rhythm, CL-161/168/172's takes, D-33 and its reversal), for Jerry's review. They govern every sound, music cue and
mix change; they sit beside `docs/art-direction.md`, whose families have sounds too. Approved by Jerry, 2026-10-26
(D-92), with his rule in place of the draft's first sentence.

**Jerry's rule (2026-10-26):** no sound unless it is
1. **immersive:** it puts him in the place (the wind, a creak, the river, the generator's hum, the tone at night), or
2. **impactful:** it hits (a shot, a blow, a sting, a threat he has to hear).

A sound that is neither goes. And the loudest things are the ones that can kill him.

## 1. The mix has an order (core/audio.js)

- **Weapons first:** guns, impacts, reloads, blades, explosions are lifted, and duck the rest for a moment each shot.
  The front of a shot is its punch (CL-134); nothing glues it flat.
- **Then the living and the dead:** zombies, the marine, the UI.
- **Then the world, pulled right down:** wind, rain, the river, insects, birds, thunder. Ambience is felt, not heard
  over anything.
- **Music separately:** one piece at a time, never two (CL-24); a sting plays alone; the briefing halves it.
- A limiter at the end keeps a grenade in a crowd from clipping. A new sound joins a bus; it never bypasses the mix.

## 2. Sound is information (gameplay first)

- **Every threat is heard before it's seen, from where it is:** distance in loudness, side in pan, a little reverb with
  distance (sndAt, the relay's broadcast). A zombie behind him is heard behind him.
- **Noise is a mechanic:** the alarm, the car alarm, the relay's siren and the fuel can's drip call the dead
  (`siteCallTheDead`). Whatever is loud in the game is loud in the world: a sound that calls the dead says so by being
  big.
- **The uncanny withdraws sound** (the art direction §2): near it the world thins, the Hush makes a hole in the tone.
  Silence is a sound the game uses on purpose (D-33's klaxon alone; the guardian's arrival).
- **Every important event has a sound that belongs only to it:** the tag's pickup, the relief sting, the alarm's metal
  sting (N31, CL-265: Jerry missed it the moment it was gone). Don't reuse a signature sound for something else.

## 3. Jerry's takes, the synth under them

- Jerry's recorded takes (z-sounds, CL-161) play when they've loaded; the synthesized sound stands in until then.
  LAYERED folders play both together (CL-168); a few play the original alone where his take didn't fit (CL-172:
  the HQ alarm, the flares).
- A take is levelled to its family's loudness before it's wired in (the stings at about -12 LUFS, CL-265), not by
  trusting its gain.
- Variety where it repeats: footsteps, shots and groans pick among takes and vary pitch slightly; nothing that
  repeats sounds identical twice in a row.

## 4. Music follows the night (CL-24 to CL-165)

- Calm between fights; the alarm cuts it; the alarm's sting over the klaxon; the fight fades in and climbs as the dead
  close in; the last kill cuts it dead for the relief sting; calm fades back slowly.
- Each night has its own song (CL-128, CL-165); special nights their own; the heart its own, by its phase.
- Music never fights a sound he needs: it ducks for the briefing, and a sting clears the field.

## 5. Families (with the art direction)

- **Military:** mechanical, exact, close: the click of a mag, the bolt, the radio's squelch, the generator's hum.
- **Settler and civil:** wood and weather: creaks, a sign in the wind, a door, a lantern's hiss.
- **Industrial:** hums, relays, alarms, the lift's motor: cyclic and electrical.
- **The uncanny:** low, close, breathing, out of step; the tone under everything at night, louder as the nights go.

## 6. Checking it

Every new sound passes Jerry's rule first: the handoff says which it is, immersive or impactful (or both).
Judged by ear on Jerry's speakers and headphones, in the game, not in an editor; at night 1 and night 20 (the mix
under load). Loudness measured (LUFS and peak) for every new take; a sound that calls the dead checked from 40 m.
Scores: Clarity (can he hear what matters), Placement (where it is), Character (its family), Mix (it sits under or over
the right things), Variety, Timing; 4 or more each. The handoff says what wasn't heard by a person.
