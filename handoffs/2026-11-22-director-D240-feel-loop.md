# D-240 feel loop (card CF-FEEL) - standing, never closes

Jerry, 2026-11-22 ~19:12Z: "One thing I want you guys to look for and keep iterating on is making the gunplay and fighting as fun and fluid as possible."

## The loop (every round, ~ every few hours of crew time)
1. PLAY + MEASURE (ChatGPT, native, RTX): a fixed Training script plus free play: each gun, swaps, reloads under pressure, 10-of-a-kind waves, melee, sprint-to-fire, ADS. Keep a scorecard file review/CF-FEEL/scorecard.md with numbers per round:
   - press -> shot on screen (ms), press -> hit mark (ms)
   - gun swap: time with no gun on screen, time to first shot
   - reload: dropped presses at the end, time to fire again
   - recoil: time back on target after a 3-round burst
   - frames over 33 ms per minute in a 10-of-each fight
   - hit feedback: mark/sound/blood/reaction all within 1 frame of each other?
   - enemy reaction: % of hits that show a visible flinch/stagger
2. RANK the top 3 things that feel stiff, slow, unfair or unclear (with a short clip or frame strip each). Send to the Director + owners.
3. FIX by owners: review copy, sheet, Director LOOK, original gates. Never trade frame rate for feel (60 fps bar D-216). Never weaken tests.
4. MEASURE AGAIN on the landed build; update the scorecard; next round.

## Owners
- ChatGPT: loop lead (play, measure, rank), plus own-UI fixes (hit marks, ammo HUD).
- Claude 1: first-person gun feel (swap/raise CD-24 A+B+C, recoil and recovery, ADS in/out, sprint-to-fire).
- Claude 2: input path and fire buffers (CD-24 D), hitches during fights (CB-373), landings in index.html.
- Claude 5 + Claude 3: enemy hit reactions with variety, staggers, deaths that read (D-237 #7/#12).
- Claude 7 + Claude 10: impacts (dust, sparks, splinters, decals), destructibles reacting to rounds.
- Claude 9: third-person combat (ready -> aim, blades in 3P).

## Already done toward this (22 Nov)
GP-20232 clearer ammo, GP-20233 one hit mark per trigger, GP-20234/35 Armory/Guardian/Bomber hitches, CD-22 M4 slap, CI-3 low ready.
