# CC-352 (claude3): the note-20 sweep's breach, the pack handgun stations (Director's pick (b))

NOT LANDED: the live files are untouched. The change is staged here as exact-text patches, for the
CLAUDE DIRECTOR's call on the trade-off below.

- `cc352-index.json` (13 hunks, index.html carry part), `cc352-carry.json` (5 hunks, studio/marine-carry.js),
  `cc352-t224.json` (3 hunks, tools/tests/t224.js's pack rows re-aimed at the new station, same strictness):
  `python3 review/CC-352/apply.py <file> review/CC-352/<hunks>.json` (each old text must occur once; CRLF kept).
  Built against index 04c16975 (04:09Z), marine-carry f847f8fa, t224 as of 04:09Z.
- What it does: rig.placeStation/seatStation 'pack+'/'pack-' put the gun on the pack's BACK face, low corner on its side:
  flat on the face, muzzle down, the grip in toward his spine, the whole gun in to |x| <= .165 (his sleeve swings back
  to |x| .19), tried at a few heights/tips/turns (PACK_BACK) for the least air; pack- rests on pack+ where they cross.
  fitCarriedGuns seats the pack guns first, then the slung guns over them (seatOnBack opt.hinge: the slung gun tips about
  its across axis to rest on them; opt.noSlide for the first). The pack strap (rig.harness) runs across the face behind them.
- Probes (cloud, in the repl of review/CC-350/repl.mjs): lib2.js (triangle clip sweep, both ways, ray-parity confirmed),
  sweep.js + runsweep.sh + cf.js (13 loadouts x stand/walk/run/crouch/crouch-walk/aim x 5 frames), before.json /
  afterA.json (+ .txt summaries), modeBefore.js / modeB.js (in-page emulation of the old side stations and of the
  "handguns over the slung guns" alternative), seatinfo per variant in seatinfo.txt.
