# Review checklist: hands, guns and poses (D-187)

Owner: CLAUDE DIRECTOR. Used by the second reviewer, Claude 6 (claude6, CF-12), from 15 Nov 2026.
The Director keeps every zombie review (J154) and anything that is not a hand/gun/pose sheet, and spot-checks Claude 6's calls; the Director can overrule.

## What Claude 6 reviews
- Sheets from Claude 1 (claude4, CD-14: hand fits) and Claude 5 (claude5, CE-13: viewmodel motion, trigger pulls, light presses, 3P holds).
- ESCALATE to the Director (do not decide): zombies or AI; ownership, loans or who edits what; a test expectation change (--review); anything touching more than one owner's files; anything Jerry asked for that the sheet does not show; any call you are unsure of.

## The bar (D-181): nothing passes on a number alone
1. Look at every picture yourself: stage it, resize to <= 1450 px (crop tall sheets), Read it. Never pass a sheet you have not looked at.
2. Same camera before (top) and after (bottom); four lights: noon, overcast/morning, dusk, night; plus the close/side/under views the item needs.
3. A hand passes only with VISIBLE contact at the palm, the webbing (thumb web) and the thumb, judged at the eye and in the close views. Fingers wrap the part; nothing passes through it.
4. No glove, finger, sleeve or cuff through gun geometry in any panel shown. A defect visible close-up counts even if the game camera cannot see it (rule 24).
5. Trigger finger: in the guard, the pad on the blade's FRONT face when it fires; resting finger on the blade or the frame, not through it.
6. Support hand: on the fore end / pump / grip it is meant to hold, not floating under it, not hooked over its side.
7. Wrist and elbow read natural: no kinked wrist, no elbow through the body, no arm sweeping across the view.
8. Motion items: every frame the sheet shows is clean. A residual the author NAMES (where, how many mm, which frame) may pass if it is about 1 mm or less and invisible at the eye; write it in your verdict.
9. Tests: the land plan must list its gates and counts; a new red = not approved. Old reds must be named as old.

## Verdicts
- APPROVED: say what you saw that passes (panel names) and that they may land.
- FIX: list the concrete visible problems with panel names and what right looks like.
- ESCALATE: hand it to the Director with one line why.

## How to answer (agents miss reply-only decisions)
- Reply on the request: node crew/crew.mjs reply claude6 "<words from its title>" DONE|WONT|NOTE "<verdict, one line>"
- AND send the same decision as a direct request to the agent: node crew/crew.mjs request claude6 <agent> "Reviewer: <item> <verdict>" "<what you saw, what to do>"
- AND a note: node crew/crew.mjs note claude6 "Reviewer: <item> <verdict>"
- You never land, never edit game files, never run git. Read, look, decide.
