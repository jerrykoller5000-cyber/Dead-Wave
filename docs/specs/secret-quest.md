# The secret: silencing the signal (D-56)

Owner: Claude (CL-79, P-94, P-69). For Jerry to read and say yes to, and for the builders: Claude (CL-80 the world
side, CL-100 the words below), ChatGPT (GP-70 the radio and the ending), Grokbot (GB-92 the fight), Antigravity (AG-26).
Written 2026-09-30 from D-44 (the story), D-56, D-67 (the Hollows) and Jerry's answer to Q-4 (the fight is deep in
the chalk heart, behind the rune doors).

## The short version

- The tone that raises the dead has a shape: a **word of five glyphs**, drawn from the eight carved stones round the
  Pit. It changes every run.
- Three ways to learn it: **the relay's static** says how long it is (from line 14); **the stones pulse the word at
  night**, seen only from the top of the watchtower; and **rune shards** from the Hollows' strongboxes each give one
  letter of it.
- He **enters the word at the HQ radio**, one try a day. Right, and the tone stops until the next dawn: a
  **silenced day**. That night the dead come without the tone's pull: half the pushes, and no guardian night.
- On a silenced day, the **rune door** at the back of any warren he has cleared opens onto a tunnel down to **the
  chalk heart**, where the guardian sits over the source. There, and only there, it can be killed.
- Kill it and the tone dies for good: every dead on the island drops, the lake goes quiet, and the run ends in the
  **true ending**. Lose, and it's the cave death: the run is over, as any caught-below is (Q-4).
- Nothing in the world moves, and no step of it enters a grab zone: the stones sit inside the Pit's reach
  (`LAKE_HOLE.grabR`), and every clue is read from outside it.

## 1. The word

- At the start of a run, five of the eight stones are drawn in order, no stone twice (`quest.order`, five indices
  0-7, from the run's own dice, never the world's: rule 10). A new run, a new word.
- The eight stones already carry eight different glyphs (the pit's rune strip, glyphs 0-7). The radio shows the same
  eight, in the same drawing (CL-80 puts the glyph paths in one module both use: `world/runes.js`).

## 2. The clues

**The static (from relay line 14).** Line 14 already says the tone has a rhythm, "almost a word". From that morning,
the relay panel on the HQ board shows the static as a strip of **five marks** under the line (GP-70), and the radio
gets its **Tune** row (section 3). This tells him the word is five long, and that the radio is where it goes.

**The stones, from the tower (CL-80).** At night, from the watchtower's platform only, the Pit's stones pulse the word:
each stone of the word flares bright for 0.9 s in turn, 0.4 s apart, then all dark for 4 s, and again. From the ground
or the water they glow as they do today. The stones are under the lake at the Pit's rim, so the flare is a bloom of cold light through the
water, big enough to read from the tower with the NVG or without it (CL-80 checks it from the platform on Jerry's GPU).
(Seen from the tower means no step comes near the Pit: its grab stays where it is.)

**The rune shards (the Hollows, CL-100, GP-83).** Five exist, one in each warren's strongbox table. Each gives one
letter: "The third is ◇" (the shard's picture shows the glyph and three notches for the third place). All five
spell the word without the tower. They are for this run only (the word changes).

**The old notes.** One of the props' notes (story.md §4, the ranger post) gains a line in pencil: "Count them from the
tower. Five."

## 3. Entering it (GP-70)

- The HQ radio, from the morning of line 14: **Tune**. The eight glyphs in a ring (the stones' layout round the Pit,
  north up), and five slots. He taps five glyphs in order and **Send**.
- **One try a day** (a try spends the day's). Wrong: a shriek of feedback, the slots flash red and clear, "The tone
  swallows it. Tomorrow." Right: the static stops, the board's relay panel goes still, "The tone stops. The lake
  holds its breath." and today is a **silenced day**.
- The last try day is day 19: a word sent on the morning of day 20 stays the boat's day (the boat and the secret
  don't mix).
- Nothing tells him which letters were right. The shards and the tower are the way.

## 4. The silenced day and night

- From the right send until the next dawn the tone is off: the Pit's glow dims to nothing, the lake's surface goes
  flat, and the music drops its low drone (CL-101's underground state has the same bed).
- **The night after:** the dead come without the pull: every push at half size, no guardian night (the stack of
  D-13 and the siege's stacking skip it), no Blood Moon. Named nights keep their name but at half strength.
- **The rune doors open** (section 5) for the silenced day's delve.
- A silenced day can happen more than once a run (another right send on a later morning); the word stays the same.

## 5. The chalk heart (GB-92, CL-99, CU-71)

- **The way in.** On a silenced day, the rune door at the back of a warren's Deep stands open if that warren is
  cleared this run (D-67: the set piece dead, the strongbox open). He needs the day's Hush charge to go down, as for
  any delve; through the door, a long tunnel slopes down toward the lake (a fade after 20 m), and he is in the heart.
  The rune door of an uncleared warren stays shut ("It's open. Somewhere.").
- **The heart.** One cave, big, round, under the chalk cave: the Pit's roots come through the ceiling as rune-cut
  columns of chalk; in the middle, the source, a shaft of cold light going down toward the Pit. No sleepers, no nests:
  the guardian and the dead it calls.
- **The fight** (GB-92): the guardian on its studio rig and clips (CL-78, D-55), fightable here and only here. It
  grabs as it does everywhere (the one kick-free of the run applies, D-46); between its lunges it calls the dead up
  out of the source (at most 12 awake). It has three phases by its health (full, two-thirds, a third): its reach
  grows, and in the last it pulls the chalk columns down. Its health is set so a well-armed marine with ammunition
  to spare kills it in about three minutes (Grokbot tunes it with nightsim's medians).
- **The stir** doesn't run in the heart: there's no hiding from it here. The Hush's battery still counts down: when
  it runs flat, the source roars and the guardian can't be hurt until he's out (the tunnel back). He can come back up
  the way he came (the rune door, then his warren's mouth) and try again on another silenced day.
- **Caught** (no kick-free left): the cave death. The run ends.

## 6. The true ending (GP-70, CL-80)

- The guardian dies: the source goes dark, a long falling note, and the tone dies for good. **Topside**, every dead on
  the island drops where it stands. He comes up at the warren's mouth into a quiet island: the lake flat and clear,
  the Pit's stones dark, birdsong.
- **The victory screen's second ending**, "The lake is quiet." with the run's numbers and the day it happened; the
  relay's last line: "Harbor Nine. Your tone's gone. Everyone's tone is gone. We're coming to get you. Walk to the
  dock." The run is won (a win for the records and GP-52's best run) and marked as the true ending.
- **For good** (the profile): a lifetime badge, "Silence" (GP-65's list), and a **rune finish** in the dressing room's
  Guns tab: gun furniture etched with the pit's glyphs, faintly glowing (CL-97's gun camo, one more camo key, `rune`).
- **The rune gun at the dock:** from the next run, a rune-etched pistol lies on the dock planks by day (E to take it).
  It is the pistol, as good as the pistol: a keepsake, not a power-up.

## 7. What the words say (CL-100 writes them into story.md; GP-70 into strings)

The five marks and the Tune row, the right and wrong sends, the silenced day's board line, the rune door's lines
(shut, open, "It's open. Somewhere."), the shards, the pencil note, the heart's first sight, the ending and the relay's
last line. Every line here is a first draft for Jerry's red pen.

## 8. State (the contract, `quest-state`)

| Field | Meaning | Written by |
| --- | --- | --- |
| `order` | the word: five stone indices 0-7 | the run start (GP-70's model, `ui/quest.js`) |
| `unlocked` | the Tune row shows (from line 14's morning) | GP-70 |
| `triedDay` | the day of the last send (one a day) | GP-70 |
| `known` | the places learned from shards (`[false, true, ...]`) | GP-83's haul calls `quest.learn(place)` |
| `silencedDay` | the day of the last right send, or -1 | GP-70 |
| `silenced` | true from a right send until the next dawn | GP-70; the director, the Pit and the doors read it |
| `heart` | `null` or `{ entered, phase, guardianHp }` | GB-92 |
| `done` | the true ending happened | GB-92 sets it; GP-70 shows it |

Events on `'dw-game'`: `'quest'` `{ kind: 'sent', ok }`, `{ kind: 'silenced' }`, `{ kind: 'dawn' }` (the tone back),
`{ kind: 'heart', phase }`, `{ kind: 'ending' }`.

## 9. The order of work

1. **CL-79** this spec (Jerry says yes).
2. **GP-70** the radio's Tune, the model and the ending screen, **CL-80** the stones' pulse from the tower and the
   silenced lake, **`world/runes.js`** (CL-80) so both draw the same glyphs.
3. The heart (CL-99 lays it out with the warrens; CU-71 goes into it like any warren) and **GB-92** the fight, after
   CL-78 (the guardian on its studio rig).
4. **CL-100** the words, **AG-26** walked through on the GPU.

Jerry plays the secret to close it.
