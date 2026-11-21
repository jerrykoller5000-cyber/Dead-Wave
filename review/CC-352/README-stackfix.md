# CC-352 follow-up (claude3 #5, 14 Nov ~16:00Z): the gun stacks rest on triangles; the pack guns' real holster shells; thigh revolvers 4 mm out. NOT LANDED (for the Director's review)

REPLACES the 08:45Z files of this name (that cc352s-index.json had a bug: the thigh line's comment swallowed its rotation and scale; never apply it).

Patches (exact text, CRLF kept in index.html; on the landed CC-352: index carry part as at 13:35Z (md5 b75f945f), marine-carry.js md5 8af26064):
    python3 review/CC-352/apply.py index.html review/CC-352/cc352s-index.json          (8 hunks, index carry part)
    python3 review/CC-352/apply.py studio/marine-carry.js review/CC-352/cc352s-carry.json   (5 hunks)
OPTION (not in the above; the Director's call): `python3 review/CC-352/apply.py studio/marine-carry.js review/CC-352/cc352s-option-slide.json` after the carry patch.

## What it does
- marine-carry.js: gunTris (a gun's triangles in the torso frame, instanced parts placed; `root` = another part of the spot, its holster shell),
  rasterTris (triangles into a 1.5 cm depth map: cell centres + corners + edge points half a cell apart; 'min' back face, 'max' near face), mapPoints.
  seatOnBack: the slide search's best 6 re-ranked with both guns' triangles; the final seat lifted so its rasterised near face clears the gun
  under it (rasterised); returns `under` = its back face rasterised, for the next gun.
- index.html carry part: fitCarriedGuns passes seat.under to the next gun. rig.seatStation (pack handguns): its best 6 seats re-ranked on a pack
  gun with the lift off the gun under it counted as air (triangles taken once, moved per candidate); rig.packPts = its points + its back face
  rasterised + its fitted holster shell (marine-kit-fit fitCarryHolster, mouth to muzzle; none on an Uzi) rasterised, the leather taken in 2.5 mm
  (PACK_BACK.shell, the whole gun pushed out 8 mm, is gone -> PACK_BACK.leather: a gun on a shell lies 1.5 mm off the leather, 4 mm off steel).
  Thigh stations x .118 -> .122 (running, the trouser leg reached 2.8 mm into the shell's top front).

## Numbers (cloud, Training, standing, 13 loadouts cf.js, lib2.js triangle sweep, capped 30 mm): stack-before.txt / stack-after.txt
Gun into gun BEFORE: C3 AA-12/saw 29.8, C5 Uzi/saw 29.9, C1 minigun/flamer 19.6, C8 M4/saw 14.8, C9 launcher/flamer 8.1, C12 2.3 mm. AFTER: none.
Seat change (z of each slung gun, + = further off his back, cm): C0 m4 +0.2 shotgun +0.4 | C2 sniper -0.8 launcher +1.6 | C3 aa12 -0.2 saw +8.6 |
C4 m4 -0.9 ak -0.6 | C5 saw +5.1 minigun +4.3 | C6 ak -0.5 sniper -0.3 | C7 shotgun +1.3 | C8 m4 -0.7 | C9 launcher +3.0 flamer -15.5 |
C10 2nd Uzi 4.3 closer | C11 aa12 +8.5 m4 +22.6 | C12 sniper -0.6 saw -6.4.

## FINDING: C11 (AA-12 + M4 slung, a revolver on each side of the pack)
On the landed tree the AA-12's drum is 59 mm INSIDE the pack+ revolver's holster shell (pen.js: AA-12 near face vs the shell's back face,
rasterised). lib2 cannot see it: the shell is hollow, the drum sits in its cavity beside the revolver. With the real shell in the map the AA-12
rests on it (hinged to the 0.3 limit) and the M4 rests on the AA-12: 8.5 / 22.6 cm further off his back, like C4's stack over two Uzis but
taller. It reads floaty from the side (sheet-cc352s-c11-*). OPTION cc352s-option-slide.json: a first gun over the pack handguns may slide
(along its length, across) when they hold it more than 5 cm off his back: C11 AA-12 7.7 cm closer than landed, M4 still +14.2; but it also
re-seats C4 (m4 -4.0, ak +1.1), C6 (ak and sniper -10, slid), C7 (shotgun -1.0). stack-option-slide.txt, sheet-cc352s-option-*.
Tried and dropped: the hinge constrained by the rasterised near face (C11 unchanged, C5 saw +14 cm).

## Tests (cloud, tree of 13:35Z + these patches; the PC's index has moved since (90fdf80b at 16:30Z): both patches still apply exactly)
tcc347 36/0 (223 s; the landed tree 176 s in the same box: +27%; cloud runs need DW_CHECK_MS raised today, CB-243), t224 73/0, tcb299 9/0.
t189: the real t189 skips its gap rows on the cloud's time budget, so t189x (cloud-only copy: the two AK loadouts first, budget raised; not shipped):
  LANDED: ak@sling+ 6 mm PASS, ak@sling- 14 mm FAIL (bar 12), revolver@holster+ clip 51 mm FAIL, revolver@pair- clip 43 mm FAIL.
  FIX:    ak@sling+ 13 mm FAIL (bar 12), ak@sling- pass, revolver@holster+ clip 47 mm FAIL, revolver@pair- clip 39 mm FAIL.
  ak@sling+ is loadout m4/ak + uzi/revolver: the AK over the M4 and the pack Uzi; no holster shell under it, so the Director's (b) (the real
  shell, done) cannot move it; it now keeps 4 mm off the M4's real faces where it sank before. In the game (ak189.js, t189's own ray measure)
  the same row reads 8.1 mm. The revolver rows (hip stations read by a horizontal ray) fail on both trees.

## Unarmed hands vs thigh/hip handguns (to Claude 5): armsw.js, cloth re-bent (onBeforeRender on userData.liveShape meshes before measuring).

## Sheets (BEFORE = landed tree, AFTER = this fix; one camera set; 3P game camera crop + its direction zoomed, back, both sides, close back)
Four lights: Training holds its clock at noon (advanceSkyClock), so a CLOUD-ONLY override (window.__ttLight read there) set noon .42 /
overcast .5 + rain / dusk .74 / night .02; overcast reads like noon indoors. Night rows brightened x2.2 for the sheet. Cloud SwiftShader.

## LANDED 17:00Z (claude3 #6), with the slide option (Director OK 16:52Z)
index.html md5 a7634ad4 (carry part, 8 hunks, CRLF), studio/marine-carry.js md5 dc4eaa19 (carry 5 + option 3). Cloud on the landed tree:
tcc347 36/0 (170.6 s), t224 73/0, tcb299 9/0.
t189 ak@sling+ (m4/ak + uzi/revolver), cloud-only t189x = t189 on that loadout alone plus a dense probe of t189's own ray measure:
  LANDED (slide):      t189 6.6 mm PASS; every AK vertex 5.9; AK surface on a 3 mm grid 5.3; the slide moved this AK 6.8 cm in (x 22.3 -> 15.5 cm).
  fix without slide:   t189 13.1 mm FAIL; every AK vertex (46650, t189 samples 2643) 12.3; AK surface 3 mm grid 8.1; M4 surface cast outward 7.6 mm,
                       at torso [7, 39, -48] cm (by the M4's top); the nearest t189 sample is 12 mm from that point.
  Cause of the 13 mm: the measure, not a float: t189 reads stride-sampled vertices along a horizontal ray 35 deg off the back's normal, so it
  misses the contact; the seat's 4 mm is along the lift direction on its 1.5 cm raster (7.6-8.1 mm along t189's ray). No bar change.
  revolver@holster+ 47 mm / revolver@pair- 39 mm clip: fail on both trees (hip-row horizontal ray), unchanged.
