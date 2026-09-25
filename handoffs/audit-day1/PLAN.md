# The day-1 plan (CL-40) — 2026-09-25

Claude read all five audits (`claude.md`, `cursor.md`, `chatgpt.md`, `grokbot.md`,
`antigravity.md`): 46 problems. After merging duplicates and dropping the two that didn't
hold up, **35 are left**. This file is the merged list and the plan. It goes on the board as
tasks once Jerry agrees.

## What the audit says, in one paragraph

Day 1 runs without errors, and on Jerry's RTX 5080 it holds about 60 fps, even with the
flamethrower. What's wrong is the **flow**, not the frame rate:
- the horde can come at 10 in the morning, while the player can spend most of the day
  exploring in the dark;
- after the alarm there's about a minute with nothing to shoot;
- the first seven kills show no skull;
- shooting the horde as it comes out of its cave calls out the guardian and kills you;
- the first night ends with a banner that's gone before the finisher camera is.

Two to four agents found each of these on their own.

## Jerry's answers (02:25Z) and what changed

Jerry: "Fix all the other issues you guys found. Also try to make the stingers and music for day 1 as good as possible."
1. The sky follows the loop: yes (D-28).
2. Day 1: **15 zombies, half pop out of the ground and half come from the cave** (D-29). This replaces
   "gentle first night": speed and damage stay, and the ground half fixes the dead minute.
3. No saves (D-30). The morning save comes out.
4. Ways to die carry over between runs (D-31).

Everything above, the "Later" list included, is now on the board as the mission **Fix day 1**
(29 tasks), with the music and stingers as CL-42, CL-43 and CL-47.

## Decisions for Jerry

1. **Night and the horde.** Tie the sky to the loop: the clock runs during prep and stops at
   dusk, the alarm brings the night on, and clearing the wave brings the dawn. (CL-A1)
   *Claude recommends yes.*
2. **How hard day 1 is.** Keep the 20 bodies. Make the first night gentle:
   - GB-29's day-1 rows: slower, less damage, arriving in two or three groups;
   - no cave roles on days 1 and 2, so one pistol body shot kills a shambler;
   - spawn 70 to 90 m out, so contact comes 15 to 25 s after the alarm, not 60.
   (GB-A2, GB-A4, GB-A5, CL-A2) *Claude recommends yes.*
3. **The morning save.** It's written every morning and nothing ever reads it. Either put a
   **Continue** button on the menu when one exists, or remove it, so every Play is a fresh run.
   (CU-A4, GP-A4, AG-A2) *Claude recommends Continue.*
4. **Ways to die.** It says "n / 21 found", but it's wiped at every new game. Keep it across
   runs (a lifetime collection), or keep it per run as now? (CU-A5, AG-A1) *Claude recommends
   keeping it across runs, but CU-24 cleared it on purpose after Jerry's note, so this is his call.*

Claude's calls, which Jerry can overrule:
- a small **dawn card** after the finisher (kills, skulls, one tip, Continue), pulled forward
  from phase 3;
- **two or three shamblers at the nearest POI on day 1**, so the first kill, the first skull
  and the first bank all happen before the first alarm;
- the **first cave poke of a run is a warning** (a screech and the eyes), and the second one
  comes for you. This revises D-26.

## Step 1 · Fix what's broken (starts now, needs no decision)

| Task | Owner | What | From |
|---|---|---|---|
| GB-39 | Grokbot | **S1.** Fighting the wave at its own cave mouth must not poke the cave: no poke from the wave's assault caves while it spawns, and a round that hits a zombie doesn't count. | GB-A1 |
| GB-40 | Grokbot | A marine standing at the mouth doesn't get zombies spawned on top of him (spawn deeper, or hold the burst). | GB-A7 |
| CU-28 | Cursor | **S1 for the suite.** The test page dismisses the splash, so t60 and t61 run again (34 of the 35 failures). | CU-A1 |
| CU-29 | Cursor | Profile the 373 ms stall on the day-1 last kill on Jerry's GPU; fix it with Claude. | AG-A6 |
| CU-30 | Cursor | Warm and cold title times on Jerry's GPU against the 5 s / 15 s budget. The favicon. Remove scratch files once each author says yes. | CU-A3, A7, A8 |
| GP-31 | ChatGPT | A tracked objective must not hide the kiosk or bank prompt on narrow screens. | GP-A2 |
| GP-32 | ChatGPT | Polish: kiosk guns in price order after the owned ones; the "???" death list as locked badges; the day-clear banner clear of the minimap; the menu footer at short heights; the menu clear of the roof wire. | GP-A7, A8, AG-A7, A8, A9 |
| CL-41 | Claude | The next prep starts when the finisher hands the camera back, not under it (the banner, `day += 1` and the save move with it). | CL-A5, GP-A3 |
| CL-42 | Claude | The day-1 song: re-formed so the first drop lands at contact and the climax comes by 2:00. Loop seams made clean, and the fight loops played through Web Audio. | CL-A3, CL-A4 |
| CL-43 | Claude | t50: 218 tree meshes against its limit; check it against CL-28. | CU-A2 |
| CL-44 | Claude | Review the 12 handoffs waiting on me; close stale requests (DONE, WONT or LATER). | CL-A10 |
| AG-16 | Antigravity | After step 1: re-shoot day 1. Also the day-1 assault cave at 22:00, with and without the NVGs. | CL-A8 |

## Step 2 · Make day 1 feel right (after Jerry's answers)

| Task | Owner | What | Decision |
|---|---|---|---|
| CL-45 + GB-41 | Claude, Grokbot | The sky follows the loop: prep is day, the alarm brings night, the clear brings dawn. | 1 |
| GB-42 | Grokbot | The gentle first night: GB-29's day-1 and day-2 rows, no cave roles on days 1 and 2, spawns at 70 to 90 m. Horde sizes unchanged. | 2 |
| GP-33 + GB-43 | ChatGPT, Grokbot | Day-1 skulls you can see and keep: a skull drops from the first kill on (no 8-value pool on day 1). At the wave's end the leftovers come to the marine instead of expiring, so the spec's "17 of 20 banked" holds. The streak bonus pays what it says. | 2 (GP-A1, GP-A5, GB-A3) |
| GP-34 + CL-46 | ChatGPT, Claude | The dawn card after the finisher: kills, skulls, best streak, one tip, then tomorrow's briefing. | Claude's call |
| GB-44 + GP-35 | Grokbot, ChatGPT | Day 1's first fight before the alarm: two or three shamblers at the nearest POI, plus one coach line pointing to it. | Claude's call (GP-A6, CL-A7) |
| CU-31 + GP-36 | Cursor, ChatGPT | Continue or no save; the Quit wording to match. The ways-to-die collection kept or per run. | 3, 4 |
| GB-45 | Grokbot | The first poke of a run is a warning; the chase goes round builds or crashes through them. | Claude's call (GB-A6, GB-A8) |

## Step 3 · Jerry plays day 1

Then Antigravity re-shoots it, and we audit day 2 the same way.

## Later (noted, not scheduled)

- The calm tracks and the chip fights: Jerry listens to one day-1 cycle and says whether they
  sit together. (CL-A9)
- Grokbot's seven probe-only checks get real assertions. (GB-A9)
- `ui/strings.js`: move the older screens' copy in, and retire `menu.studio` and
  `legacy.menu.tagline`. (GP-A9)
- The title menu runs at 45 fps on the 5080 (the live pre-roll). (AG, perf)
- CU-A9: recheck the death screen with a real death, not the dev `rip`.

## Dropped (didn't hold up)

- **AG-A3, "day 1 is capped at 8 zombies at once".** There's no `dayActiveCap` in the code.
  Claude's probe and Grokbot's both saw all 20 out within 6 to 12 s. The "6" on the overlay
  was the first burst.
- **AG-A5, "the build card overlaps the ammo box".** Antigravity's own shot `05` shows it
  sitting just above the box.
- **AG-A1 and AG-A2 as S1 "violations of Jerry's orders".** Orders 4 and 5 described bugs,
  which CU-24 and CU-25 fixed as Jerry asked. What's left of them is decisions 3 and 4 above.
- A note for Antigravity: "Not verified: none" can't be right for any audit. Say what you
  couldn't check.
