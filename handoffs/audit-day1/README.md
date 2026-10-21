# The day-1 audit (Jerry, 2026-09-25)

Every agent audits **day 1 of Dead-Wave** and turns the results in to Claude. Claude reads all
five reports, merges them into one list, makes the plan, and takes it to Jerry. Then the fixes
go on the board as tasks.

**This is an audit, not a fix.** Don't change game code while you audit: other agents are
looking at the same build, and a fix now makes their findings stale. The fixes come after the
plan. The only file you write is your own report (and Antigravity's screenshots).

## What "day 1" means

From double-clicking `Play Dead-Wave.bat` on a **fresh profile** (clear `localStorage` first),
through to the day-2 briefing:

1. the splash, the menu, the loading screen;
2. the tutorial / coach and the day-1 briefing;
3. day 1 itself: moving, scavenging, POIs and caches, the kiosk, building, objectives;
4. dusk and the prep timer;
5. the alarm, the day-1 wave, its music and stingers;
6. the last zombie, the finisher camera, dawn, the summary and the day-2 briefing.

Also: dying on day 1 and pressing Play again; quitting to the menu and coming back.

## What to look for

Anything that is broken, wrong, confusing, ugly, unfair, slow, or simply not fun. Go deepest in
your own area (your task on the board says where), but report anything you see anywhere.
Measure against:
- **Flow** (`docs/plan.md`): does each small loop feel good, and do they lead into each other?
- **The budgets** (AGENTS.md rule 12): title within 15 s cold and 5 s warm, 60 fps with 48
  zombies.
- **The decisions** on `crew/BOARD.md`. A decided thing is only a problem if it doesn't work as
  decided, or if you think the decision is hurting the game. Then say why.

## How to write each problem

One block per problem. Number them with your prefix (`CL-A1`, `CU-A1`, `GP-A1`, `GB-A1`, `AG-A1`, ...).

```
### GB-A3 · S2 · combat · Day-1 zombies spawn in plain view behind the HQ
- Where:    index.html (wave director, spawnWave), or a screenshot path
- Steps:    fresh profile, Play, walk to the HQ window, wait for the alarm
- Expected: they come out of the treeline, out of sight
- Seen:     three pop in 15 m away, in view (qa/shots/2026-09-25-AG-15/07-spawn.png)
- Owner:    Grokbot (who you think should fix it)
- Fix idea: one line, if you have one
- Proof:    the command and its output, line numbers, a screenshot, or "not verified: why"
```

**Severity:**
- **S1 · broken.** A crash, an error, stuck, can't finish day 1, lost progress, or under 30 fps
  on Jerry's GPU in a normal day-1 moment.
- **S2 · wrong.** It works, but it plays, reads or sounds wrong: it hurts the fun or the flow,
  confuses a new player, or the balance is off.
- **S3 · polish.** Small visual, text or sound things.

A problem with no proof still goes in, marked `Proof: not verified (why)`. Never guess and call
it fact.

## Your report

`handoffs/audit-day1/<you>.md` (`claude.md`, `cursor.md`, `chatgpt.md`, `grokbot.md`,
`antigravity.md`). Start it with the handoff header, so the panel can read it:

```
# <agent> — <task id> day-1 audit — 2026-09-25
Changed:          audit only, no code changed. <n> problems: <x> S1, <y> S2, <z> S3.
Files:            handoffs/audit-day1/<you>.md (+ screenshots)
Tests:            <what you ran, with the numbers>
Screenshots:      <folder, or none>
Not verified:     <what you couldn't check, and why>
Requests:         none (the audit goes to Claude)
Contract changes: none
```

Then a **Top 5**: the five problems you would fix first, one line each, by id. Then every
problem, S1 first.

## Turning it in

1. `node crew/crew.mjs out <you> --report handoffs/audit-day1/<you>.md --done`
2. `node crew/crew.mjs request <you> claude "audit turned in" "handoffs/audit-day1/<you>.md: <n> problems (<x> S1)"`
3. **Stop there.** Your other tasks wait for the plan (CL-40). `crew.mjs next` will say so.
