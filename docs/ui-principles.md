# Grave Shift UI principles

Claude, 2026-10-24 (CL-268, D-89), from what the game has already established, for Jerry's review. Jerry: "Build the
principles based on what we have tried to establish already. UI might need some help to make it fit into the world
visually and aesthetically." They sit beside `docs/art-direction.md` (the world's look) and govern everything the
player reads and decides: the HUD, prompts, panels, menus, maps, cards. The words themselves stay ChatGPT's
(`ui/strings.js`, AGENTS.md rule 11).

**The one sentence:** the interface is the Branch's own kit: CRT field terminals, stencilled plates, typed and
handwritten paper a Gravewalker would carry or find, clear enough to read under fire, and never louder than the world.

## 0. The inspiration (Jerry, 2026-10-24)

"Soldier of Fortune 2: Double Helix, Dead Space, Fallout. Think CRT terminal. But our own unique spin on it. Readable
but inspired."

- **From Fallout:** the CRT terminal: phosphor text on black glass, a bezel, the hum of a machine that's been on for
  years.
- **From Dead Space:** the information on the thing itself: the device shows its own state; his health is on him, the
  vault's lock on the vault.
- **From Soldier of Fortune 2:** the military briefing: stencilled, ruled, numbered, the field kit's terse plates.
- **Our spin: the Branch's field terminals.** Every panel that is a machine (the supply terminal, the radio, the
  relay's cabinet, the duty board's typed cards, the alarm control) is a PGB terminal: **amber phosphor** (the world's
  sodium amber, art direction §3) on near-black glass, a worn olive bezel with a stencilled plate, faint scanlines and a
  soft glow, a cursor that blinks once when it opens. Communications (the radio, Ridgeline) run **green phosphor**, so
  a voice from outside reads differently from the FOB's own machines. Paper stays paper (notes, slips, the orders card).
- **Readable first:** scanlines under 8% and never over the words' strokes; no screen curvature or flicker on text he
  must read quickly; the glow a halo, not a blur; every terminal passes §6's 1280 x 720 and 390 px checks. The CRT is
  a frame round clear text, not a filter over it.

## 1. Where information lives (the order of preference)

1. **In the world.** If the world can say it, the world says it: the marker over the cabinet, the LED on the vault, the
   tags on the wall, the posters, the duty board, the mast's light. (CL-181: "the E prompts are floating text by what
   they belong to, not a yellow box.")
2. **On a thing he holds or stands at.** A panel is a device he's using: the relay's breakers, the radio, the keypad,
   the lockbox, the duty board. It looks like that device and opens only where it is.
3. **On the HUD,** only what he needs while moving and fighting: health, the gun and its rounds, the minimap, the
   current prompt, a notice for a moment. (CL-182: "condense the HUD as much as possible.")
4. **In a menu,** only what isn't play: settings, the pause, the briefing he chooses to read.

## 2. Never next to the alarm (N7)

A control with a big consequence stands alone. Sound alarm, Call Heron, Quit, anything that can't be undone: its own
panel or its own confirmation, never a tab beside browsing or reading. The friends who pressed Sound alarm looking for
the day missions are the rule's reason.

## 3. The look: the Branch's paper and plate

- **Terminals and plates (§0):** a panel that is a machine is a CRT terminal in its bezel; the HUD's plates are the same
  family made small (the bezel's olive edge, phosphor amber numbers for rounds and health, the danger red kept for loss).
- **Materials, as the art direction's military family:** dark field-green panels (`--panel-bg`), stencil and print
  (`--font-display` for titles, `--font-hud` for everything read), an angled cut corner (the clip-path plates), a thin
  olive rule. Handwriting only for what a person wrote (the twelve's notes, Brandt's notebook, the duty board's cards).
- **Colour:** the art direction's reserved colours mean the same here: gold/amber (`--accent`) for what to take or press
  and the key to press it, red (`--danger`) for danger and loss, green for safe and ready. Everything else is the ink
  (`--ink`, `--ink-dim`) on the panel. A colour is never the only signal: a keycap's shape, an icon, a word.
- **Scale and weight:** read at a glance at 1280 x 720 and at 390 px wide (GP-19967's check); nothing under 11 px; the
  prompt's key in a keycap.
- **Motion:** panels slide or fade in under 0.2 s and never bounce; a notice holds about 3.5 s; nothing on the HUD moves
  while nothing changed.
- **Diegetic where it can be:** a panel that is a device (the relay's breaker box, the keypad) draws that device; a
  paper (a note, a slip, the orders card) looks like paper, slightly worn, never a glossy card.

## 4. Words (with ChatGPT's voice)

- Short and concrete: a verb and a thing ("E — Pull the lever"). No tutorials in boxes; the world shows how.
- No brackets, no "press", no exclamation marks; the game never congratulates itself.
- The Branch may be funny on paper (story.md §11); the dead, the valley and the marine never.
- Numbers only where he decides with them (prices, rounds, the day).

## 5. Both views (D-87)

- Every prompt and notice reads in third person and in first person: in first person what floats over his head sits
  under the crosshair (CL-260), and a pickup is said there too.
- Every panel works with the mouse and with keys, and in first person frees the pointer and holds the view while it's
  up (CL-258).

## 6. Checking it

A UI change is judged in the game, not in its HTML: at 1280 x 720 and 390 px, in both views, by day and at night (the
HUD over a dark scene), with the real renderer's shot (rule 19's "render it and look"). The handoff names the shots.
Scores, as the asset table's: Readability, Hierarchy (what matters first), Consistency (with the rest of the UI and the
art direction), Placement (where it lives, §1), Safety (§2), Both views (§5); 4 or more each.
