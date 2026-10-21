# Firing range drills — GP-19901

60 drills across the twelve existing weapons. No permanent weapon or upgrade grants.

Walk to the wall console behind the yellow line and press E. Browse weapons, then select a drill to start. All targets lower before the eight-second countdown. Stay behind the line, use the selected gun, and do not throw grenades.

Scoring reuses the existing rings and lane multipliers. Top ten local results are separate for each drill, full drill configuration and fitted loadout. Ties: higher score, shorter time, higher accuracy/contact efficiency, earlier timestamp, then stable run ID. Invalid runs are VOID and never saved.

## Pistol

- **Bullseye Circuit** — Clear five plates by hitting only their body bullseyes.
- **Call Sign** — Alternate called head and bullseye shots, one plate at a time.
- **Pop Patrol** — Follow an unpredictable left-to-right pop-up patrol; quick hits earn a speed bonus.
- **Twelve Clean** — Clear twelve plates with twelve rounds. Every wasted shot costs an opportunity.
- **Quickdraw Countdown** — Twelve reaction rounds; each exposure gets shorter. Base semi-auto is enough.

## Wasp SMG

- **Three Taps** — Put three scoring hits on each plate before it folds. Short controlled bursts win.
- **Crossfire** — Two opposing plates rise together. Transition rapidly between lanes.
- **One Magazine** — Clear plates with two hits each using only 32 rounds.
- **Blink** — Sixteen brief single-plate exposures reward fast acquisition.
- **Swarm Control** — Groups grow from one plate to five. Land two hits on each plate.

## GW-4 Carbine

- **Near / Far** — Alternate nearby and distant plates; balance acquisition speed with ring placement.
- **Identify / Fire** — Read the changing head, bullseye or chest-ring call before firing.
- **Priority Order** — Five plates rise together. Shoot the called lane first; each clear reveals the next priority.
- **Controlled Pairs** — Two scoring hits per plate. Select semi or auto before starting.
- **Five Wide** — Clear a full five-lane wave inside each exposure window.

## KR-7 Rifle

- **Four Count** — Four scoring hits per plate with the rifle’s own firing rhythm.
- **Heavy Beat** — Clear paired plates across alternating near and far lanes.
- **Torso Ladder** — Growing groups accept chest-ring and bullseye hits only.
- **Two-Mag Discipline** — Three hits per plate, sixty rounds total. Reload carefully.
- **Reset / Read** — A deliberate pause precedes each changing head or bullseye call.

## Shotgun

- **Seven on Steel** — Place as many of the seven pellets as possible on each close plate.
- **Pump Rhythm** — Clear sequential plates at a pace that respects the pump cycle.
- **Double Door** — Close paired plates invite careful spread placement across both silhouettes.
- **Eight Shells** — Eight exposures, eight shells. Maximize pellet placement without waste.
- **Center Mass** — Read the bullseye or chest-ring call and keep your pellet pattern centered.

## Breacher-12

- **Breach Wave** — Clear three close plates per wave with the faster Breacher.
- **Five-Pellet Focus** — Chest rings only; each additional legitimate pellet earns a placement bonus.
- **Drum Discipline** — Twenty shells for twelve close plates. Keep your fire controlled.
- **Switchback** — Rapidly alternate distant left and right plates.
- **Stairwell** — Close groups grow from one plate to five, then repeat.

## Revolver

- **Six Certainties** — Six plates, six deliberate rounds. Make each discharge count.
- **Triple Stack** — Three aligned plates can be pierced by one correctly placed shot.
- **Keyhole** — Only the small head rings count. Clear the five-lane bank.
- **Duel** — Two opposing plates rise together; clear both quickly.
- **Ring Reader** — Cycle through head, bullseye and chest-ring calls.

## Sniper

- **Long Glass** — Distant body bullseyes only. Take precise shots across the full range.
- **Four Deep** — Four aligned plates reward the rifle’s existing penetration.
- **Hold Your Breath** — Brief long-range exposures are separated by a deliberate recovery beat.
- **Head / Body Echo** — Alternate distant head and bullseye calls.
- **Five-Round Test** — Five distant targets and five rounds; maximize precision and efficiency.

## Launcher

- **Blast School** — Clear a five-plate cluster with legal 40 mm launcher rounds.
- **Split Clusters** — Paired clusters change position each wave. Aim for useful blast placement.
- **Six in the Drum** — Six launcher rounds for six full cluster waves. Throwable grenades remain prohibited.
- **Moving Orders** — Short, changing single-plate calls test flight-time judgment.
- **Collateral** — Clusters grow from one to five. Extra targets from one blast earn a large bonus.

## Rotary Gun

- **Spin / Win** — Spin up and land three hits on every plate in a full wave.
- **Hose the Line** — Follow rapidly changing single targets; three hits clear a plate.
- **Belt Economy** — Ninety rounds total. Four hits per plate reward disciplined bursts.
- **Rolling Thunder** — Clear rotating pairs with three hits each. Preserve your spin between targets.
- **Last Stand** — Growing waves demand four hits on every plate. Reload before the next swarm.

## Flamethrower

- **Hot Contact** — Maintain 0.7 seconds of flame contact on each sequential close plate.
- **Sweep the Room** — Sweep all five close plates; each needs 0.6 seconds of contact.
- **Pilot Pulses** — Short contact bursts alternate with cooling pauses.
- **Fuel Saver** — Paired plates require 0.55 seconds of contact, using only 48 fuel units.
- **Double Burn** — Keep flame contact on each close pair long enough to clear both.

## Chainsaw

- **First Bite** — Stay behind the line and cut each nearby plate for 0.45 seconds.
- **Wide Cut** — Work across five close plates; each needs 0.5 seconds of cutting contact.
- **Stop / Start** — Short cutting bursts alternate with pauses. Release between exposures.
- **Deep Teeth** — Hold 1.1 seconds of contact on each plate, then cool before the next bite.
- **Cooling Ladder** — Growing nearby groups reward controlled cutting and heat management.

## Tuning and integration

- ui/range-drills.js: patterns, durations, exposures, gaps, target layouts, budgets, hit/contact caps and bonuses.
- ui/range-session.js: lifecycle, 8-second clock, line tolerance, scoring and attack-origin validation.
- ui/range-targets.js: reused metal plates/hinges, temporary layouts and range-only contact adapters.
- ui/range-console.js, ui/range-drills.css and ui/strings.js: interface and all copy.
- ui/range-records.js: local top-ten persistence and deterministic ties.
- ui/range-feature.js: coordination, target release and borrowed equipment restoration.
- review/range-GP19901/patches.json: exact integration hunks, applied to fresh live files with Jerry's approval on 2026-10-13. applied.json records the hashes; focused-changes.diff contains only the focused changes. Never restore the staged index over the live file.

Scoring is capped per target activation. Shotgun pellets remain separate, penetration and blast count distinct plates, and continuous contact uses elapsed time with one contact union per frame. Bonuses and penalties are printed in the console before starting. A completed timed run may leave uncleared targets and earns its actual score; it does not require a perfect clear.

Drills temporarily use a single gun and preserve fitted mods. Keep mode/upgrades unchanged to keep records comparable; changes abort the run. Ammo, reserves, chainsaw fuel/heat, holster and paired-gun state are restored at exit. Reload through the normal controls. Launcher 40 mm rounds are legal in launcher drills. Close saw plates remain beyond the yellow line and inside the unchanged 3.1m reach. Flame plates fit the actual stream range.

The existing dw-game event receives range-drill phases, weapon/drill/run identifiers, wave/called zone/priority, countdown and score for a future PA voice layer. Existing cues cover countdown/start/end/VOID; synthesized PA speech is not added.

Live verification: 34 pure checks, twelve actual weapon firing paths, both-phase VOID rules, eight-second folded-target countdown, a complete legal chainsaw drill, flame contact, four-plate sniper penetration, exact equipment restoration and real page-reload records passed. Screenshots and live-*-proof.json files are in this folder. Shared suite and independent visual review remain with the crew. A slower 48-zombie heavy-loadout/re-entry case also reproduces in the exact pre-integration baseline; its raw before/live samples are in reentry-perf-proof.json and Cursor has the reproduction.
