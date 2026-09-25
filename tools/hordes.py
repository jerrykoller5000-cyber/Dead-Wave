"""Dead-Wave · the horde soundtrack for nights 2 to 20 (CL-38, Jerry 2026-09-25: "perfecting the
soundtrack for hordes 1-20").

Night 1 is First Blood (tools/day1.py). The later nights are First Blood's own family: the same
voices, the same form and the same hook, so the whole run is one piece of music, but each tier
is faster, in a higher or darker key, and pushes harder:

  fight_n02  nights 2-3    100 bpm  F# minor  the walk as it was
  fight_n04  nights 5, 7    104 bpm  G minor   ghost 16ths and pickup kicks (DRIVE 1)
  fight_n07  nights 9-10   108 bpm  A minor   DRIVE 1
  fight_n10  nights 11, 13   112 bpm  B minor   riff B and the second drop drive (DRIVE 2)
  fight_n14  nights 14,15,17  116 bpm  D minor   DRIVE 2, a key lower and heavier
  fight_n18  nights 19-20  120 bpm  E minor   home key for the finale, every drop drives (DRIVE 3)
  fight_ember     Ember Nights (4, 8, 16)       110 bpm  F minor, every drop drives
  fight_guardian  Guardian Nights (6, 12, 18)   90 bpm   C minor, slow and heavy
Which night plays which is waveByDay in assets/soundtrack/music.json (GB-53's table:
docs/specs/difficulty.md).

Each is cut into the game's sections (stalk, dropA, riffB, break, dropA2, bridge, climax), every
section a circle and levelled like First Blood's, so the music director (core/audio.js) follows
each night's wave the same way: quiet while they're out of sight, the drops at contact, the
climax for the last few.

  python3 hordes.py out/ [name ...]  ->  out/<name>_sections.wav and .json
"""
import sys, os, json, time
import numpy as np
import day1 as D
from synth import SR, write_wav

TIERS = [
    ('fight_n02', 100, 2, 0),
    ('fight_ember', 110, 1, 3),       # Ember Nights 4, 8, 16: F minor, every drop drives
    ('fight_guardian', 90, -4, 2),    # Guardian Nights 6, 12, 18: C minor, slow and heavy
    ('fight_n04', 104, 3, 1),
    ('fight_n07', 108, 5, 1),
    ('fight_n10', 112, 7, 2),
    ('fight_n14', 116, -2, 2),
    ('fight_n18', 120, 0, 3),
]
BASE = {k: getattr(D, k) for k in ('HOOK_A', 'HOOK_A2', 'RIFF_B', 'BRIDGE_LINE', 'SCALE', 'E4', 'G4', 'B4')}
BASE_ROOT = dict(D.ROOT)


def configure(bpm, tr, drive):
    D.BPM = float(bpm); D.SPB = 60.0 / D.BPM; D.S16 = D.SPB / 4; D.BAR_S = 4 * D.SPB
    D.DRIVE = drive
    D.ROOT.clear(); D.ROOT.update({k: v + tr for k, v in BASE_ROOT.items()})
    for k in ('HOOK_A', 'HOOK_A2', 'RIFF_B', 'BRIDGE_LINE'):
        setattr(D, k, [(st, ln, m + tr, v) for st, ln, m, v in BASE[k]])
    D.SCALE = [p + tr for p in BASE['SCALE']]
    for k in ('E4', 'G4', 'B4'):
        setattr(D, k, BASE[k] + tr)


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'out'
    os.makedirs(out, exist_ok=True)
    want = sys.argv[2:]
    for name, bpm, tr, drive in TIERS:
        if want and name not in want: continue
        t0 = time.time()
        configure(bpm, tr, drive)
        z, table = D.render_sections()
        write_wav(os.path.join(out, name + '_sections.wav'), z)
        json.dump({'bpm': bpm, 'barSeconds': D.BAR_S, 'sections': table}, open(os.path.join(out, name + '_sections.json'), 'w'), indent=1)
        print(f'{name}: {z.shape[1] / SR:.1f}s at {bpm} bpm (transpose {tr:+d}, drive {drive}), {time.time() - t0:.0f}s', flush=True)
