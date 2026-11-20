# CE-12 part 2 (a): the support hand on the magazines in third person (Claude 5 #4, 2026-11-14)

For the Director's review, NOT landed. Cloud tree: fresh PC tar 13:35Z (index a95f671f).
Diff: Claude outputs/CE-12/ce12d-index.diff (vs a95f671f, CRLF kept). Sheet: Claude outputs/CE-12/ce12d-sheet-*.jpg.

## What changed (index.html, 3P hold part only; first person and akimbo untouched)
- Part 2 v2 + the part 2 (a) wraps from session #3 (the cloud diff saved in the Project), re-applied on a95f671f.
- **The hand carries a magazine the way it seats it** (your 'carry it lined up from below'): foot in the palm, fingers up
  its front, thumb along its side, from the pouch to the well and back (tpGripOf, TP_POUCH: lips down in the pouch). The
  hand never changes hold on it, so the C <-> seat passes through the magazine are gone (were thumb 18-19 mm, palm 14),
  and the foot rides 15 mm from the hand's grip point (t218's 'in the palm' rows pass for the pistol and the Wasp).
  The C (TP_WRAP c/up/fwd/pose) stays for the drum.
- **The fits on the true shape** (tools/handfit/ce12/prism.mjs, sfit.mjs): the pen numbers of sessions #2-#3 were on the
  magazines' axis boxes; a raked magazine's box is ~3x deeper than the magazine (the pistol's: 93 mm for ~30), so the
  old '10 mm in' was air and the old '0.3' could be inside. Seats refitted (pistol, Wasp, GW-4, KR-7: foot point + pose).
- **The drum** (Breacher): held by its rim 45 deg round from its lower edge toward him. The lower edge's hold left the hand
  5 cm short of the well and 13 cm under it (the seated drum went 30-46 mm into the hand); now 0 at the well.
- **Off the seated magazine** (tpDepen): when the hand is on a magazine that is in the gun (seating, the clip's push
  home, leaving it) the hand is pushed out of the magazine's true shape by the deepest glove vertex and the arm solved
  again (2 passes, 3P reloads only). The palm also stops 2 mm short of the seated foot's plane (TP_SEAT_GAP).
- A seated or falling magazine is no longer drawn toward the hand (tpMagNotHeld): before, the hand's approach pulled the
  seated magazine 35% of the way out at u .06.
- The clip guns' hand steps 7 cm to his support side while the empty falls (TP_DROP_ASIDE; it fell through the hand,
  13-14 mm).
- Thumbs refitted along the magazine (M4 t5 1.3: out in front, lying up the side; the drum's onto its face).
- slideRelease kept (your pick): in 3P the slide goes home off the slide stop.
- TT.tpWrapDbg (TP_WRAP, TP_SEAT, TP_POUCH, TP_RELOAD, x()) for probes.

## Numbers (cloud live page, pen by hand part against the magazine's true shape, mm in, max; + in, - clear)
| gun | carry | at the seat | worst transition |
|---|---|---|---|
| pistol | 0.5 | 0-0.3 | 1.5 (u .55); the slide 3.0 as the hand leaves (u .66) |
| Wasp | 0.4 | 0-0.4 | 11 at u .17/.50 (one beat each), 16 leaving (u .66-.68: the magazine's hull runs up inside the grip, the hand passes the grip's foot) |
| GW-4 | 0.3 | 2.5-3.2 | 7.4 (u .58), 4.9 (u .68 push home) |
| KR-7 | 0.3 | 0.6-1.2 | 9.7 one beat (u .64 push home) |
| Breacher drum | 0.3 | 0-0.7 | 3 (u .55); 6 leaving (u .80) |
Before (sessions #2-#3 on boxes; on the true shapes the C <-> seat changes were 10-19 mm, the drum at the well 30-46).

## Tests (cloud, one worker, this candidate WITHOUT the GP33 getter patch; a95f671f base in brackets)
tcb291 3/0 (3/0) · t187 99/0 (99/0) · t262 32/0 (32/0) · t229 75/1 (75/1 or 74/2: revolver aiming down 0.79, base; the
pistol's no-pop row passes, 3 of 3 runs) · t218 30/5 (34/1 per ChatGPT: aa12 midair u .52). t218's 5: pistol slide
(slideRelease), Wasp u .16/.52 (palm 0.040/0.022 vs 0.02: two transition beats), GW-4/KR-7 u .36-.48 (palm 0.028-0.030),
Breacher u .36-.48 (0.077, by its rim). The diff applies clean to today's PC index bcc2fcf7 (aim pin + training lines).

## Not done
- The Wasp's transitions (u .12-.17, .50-.55: 5-11 mm) and its leaving (16): its magazine sits inside the grip.
- The drum's thumb: on its face, but it reads stiff (sheet). The KR-7's thumb still stands up by the magazine (its first touch).
- t229's pistol fast first leg (ChatGPT's 1.66-3.15 m/s at .25-.28 s): not traced yet (the row passes in the cloud).
- CE-13; the unarmed hands into the thigh/hip guns (Claude 3's numbers not seen yet).

## For the Director
1. t218 'every visible magazine is seated or in the palm' (TOL 2 cm, foot to the hand's grip point): the GW-4/KR-7
   seats put the foot on the palm 2.8-3.0 cm from the grip point (the fit with the foot nearer loses the webbing's
   contact, 6-10 mm off); the drum is held by its rim (foot 7.7 cm). Proposal (--review): 'in the palm' = the foot within
   2 cm of the grip point OR the magazine touching the glove (glove-to-magazine gap under 2 mm on its true shape).
2. t218 'the hand on the slide as it racks' (pistol): slideRelease, your pick. Proposal (--review): in 3P, the slide
   home by u .8 and the support hand back on its hold (within 5 cm of the support fit's point).
3. GP33 getter patch: in the cloud it turns t187 'ak: butt stays in the shoulder aiming up' red (0.120 m, 3 runs);
   a95 alone 99/0, CE-12 without it 99/0. Not merged; told ChatGPT.


## Since the 17:15Z landing (Claude 5 #4)
- LANDED 17:46Z: drum v2 (TP_WRAP.aa12: fingers round the rim, thumb curled onto the face; Director OK). Incident: the first write
  sent a stale cached copy (a5d864a2) for ~3 min (17:43:19-~17:46Z); fixed, FYI'd. Since then: edits made in place on the PC
  with python (exact replacements, hash checked before/after), no staged file reused.
- LANDED ~18:40Z: the Wasp's magazine follows the hand after holdFreeShoulders (X.placed): its 'below' beats 11 -> 0.4-1.2 mm.
- FOR REVIEW / OK pending (script Claude outputs/CE-12/ce12g-land.py, the same as $HOME/c5/land3.py; dry run clean on 754dcb8c):
  TP_RELOAD.uzi.leave (the leave bowed round the grip foot, 16 -> 3.5 mm), TP_RELOAD.pistol.arc halved (Director's pick (a):
  3.0 -> 1.9 m/s), the KR-7 carry thumb (seat.carry, eased back before the line-up). Sheets ce12g-*.jpg, ce12f-sheet-kr7.jpg.
  Cloud gates on it: tcb291 3/0, t187 99/0, t218 36/0 (t229/t262 running at 20:04Z).
- Next: t229 (revolver aiming down 0.79, base), CE-13, the unarmed hands (Claude 3's numbers not seen).
- LANDED ~20:15Z: the Wasp's leave + the pistol arc x0.5 (5508acca -> d168ac44). LANDED 20:30Z: the KR-7 carry thumb
  (d168ac44 -> 99d7bdfb). CE-12 part 2 complete. Next (Director 20:26Z): t229 (revolver aiming down: 0.79 in the test, 0.74 in
  my probe, bar 0.75; base too), then CE-13.
