# The road to 1.0

Claude, 2026-10-15 (Jerry: "It is up to your discretion how we get there"). This replaces R6's open-ended "Jerry's
direct work" with five short stages. Every task for them is on `crew/BOARD.md`; this page says why.

## The bar

A feature is 1.0 when it **works start to finish**, **nothing about it reads as a mistake or a placeholder**, and it
**stays inside its frame budget**. "It could look better" is 1.x. New polish ideas go on the board's **1.x list**; they
are not lost, they wait.

Visual polish of models (guns, zombies, the marine, buildables) is **frozen for 1.0**, except for bugs (a gap, a
clip, something broken) and budget cuts.

## Where the game stands (the survey, 2026-10-15)

The run is more finished than it feels:
- All 20 nights are defined and play: a night plan in `index.html` (`NIGHT_PLAN`), every enemy type appears, Fog,
  Swarm, siege, Ember Nights, guardians on 6/12/18, colossi on 5/10/15/20. Night 20 calls Heron and wins the run.
- The day loop is all wired: the relay and its one call a day, caches, drops, survivors, the kiosk, the Armory,
  the dressing room, the Hollows.
- Settings, graphics presets, the error card and the WebGL fallback exist. No mid-run saves, by design (D-30).

What is missing or wrong:
1. **The story doesn't tell itself.** Nothing tells a new player the goal (night 20, Heron) until relay line 12. The
   orders card at the drop, the v3 relay lines, the burial by the survivors, the wall of tags, "driven back" instead
   of "defeated", night names: none are in. Old v1 words remain ("Cabin", "Wave Day", "DAY N — HORDE INBOUND").
2. **Winning has a hidden condition.** Heron only comes if the relay was repaired; nothing says so.
3. **The secret's silenced night** (half pushes, no guardian) isn't in the director.
4. **The first hour** has no guide: the coach is hidden (Jerry's HUD trim, CL-182, which stands), so the drop's
   orders card and a first-run pointer to the Training Ground do that job instead.
5. **The desktop build would not boot**: `tools/package.mjs` leaves out `combat/`, the training .wavs and Jerry's
   z-sounds.
6. **The frame rate is unproven** after a week of heavier models: the last GPU numbers (CU-56) were 60 fps on night 5
   and 53 fps with 48 shamblers, before the upgrades.
7. **Four days of the crew's work were not in git**, and the suite's reds have no owners.

## The stages

1. **Steady the ground (now).** Full suite, every red owned, everything committed and pushed (CL-202); frame budgets
   per owner from real numbers (CL-203, with Cursor's bench and Antigravity's GPU run). From then on a commit at the
   end of every working day.
2. **Finish the run.** The story's words in one pass (ChatGPT), then its scenes (Claude: the orders card, the
   burial, the wall of tags, the true ending's walk); the relay/Heron condition said out loud and the silenced night
   (Grokbot); one name for the night everywhere.
3. **The first hour.** The orders card is the goal; a first-run pointer to the Training Ground; the pause Tips
   without the dev cheats; the words a new player reads checked once.
4. **Night packs: Jerry plays in short sessions.** No full runs needed. Each pack is 20-30 minutes, from home:
   - Pack 1: a fresh run, nights 1-3.
   - Pack 2: `~` then `night 6` (the first guardian).
   - Pack 3: `night 10` to 12 (brutes, rest night, guardian + Ember).
   - Pack 4: `night 14` and 15 (Fog, the nest).
   - Pack 5: `night 18` to 20, with `relay skip` first so Heron can come.
   His notes after each pack become the next tasks. Balance comes from these, not from simulations.
5. **Ship.** The desktop build fixed and tested on a clean Windows profile, version 1.0.0, frame budgets met on
   Jerry's PC, a green full suite, the tag.

## After 1.0 (1.x)

The model and animation polish lanes; story v3 waves 2-4 (the tally, 02:14, the valley getting worse, crate slips,
Report, the Cordon fence, the hikers' camera); key rebinding; co-op (R7, D-58).
