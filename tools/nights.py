"""Dead-Wave · a song for every night (CL-128).

Jerry, after his first full run (2026-10-06): "Better Music deserving special attention each night." His reference is a
chiptune mix ("BEST OF CHIPTUNE MIX", Final Discovery, youtube.com/watch?v=zjyQWpJc6qk), and what he likes in it is
"everything": the bright square-wave leads you can hum, the arpeggios racing under them, the bouncing bass, the noise
drums, and the way every track is its own tune.

Before this, nights 2 to 20 were one song, First Blood's, re-keyed and sped up (tools/hordes.py): the same hook every
night. Now every night has its own: its own hook and answer, its own riff, its own bridge line, its own chords, key,
mode, tempo, groove, bass line, arpeggio and lead voice, written for what that night is (its plan in index.html
NIGHT_PLAN). Night 1 is still First Blood (tools/day1.py); Fog Night (14) keeps its own song (tools/fog.py). The run
climbs from 108 bpm on night 2 to 152 on night 20 (the guardian and brute nights slower and heavier), and night 20, the last stand, comes home to First Blood's key and chords, and its climax
sings First Blood's hook over the new drums.

Every song is built on day1.py's 8-bit voices (band-limited pulses, a stepped triangle, LFSR-noise drums) and its
sections (stalk, dropA, riffB, break, dropA2, bridge, climax), each its own circle, so the game's section player
(core/audio.js) follows each night's wave the same way it follows night 1's.

The tunes are composed here, not drawn at random: a seeded hand on a few rules that make a chiptune hook stick.
  - The hook is a two-bar call and a two-bar answer. The answer starts the way the call did (you hear it come back)
    and ends on a long note on the tonic or the fifth.
  - Notes on the beat are chord tones; the ones between step along the scale (the chord's own notes win over the
    mode's where they differ, so a raised leading tone in a dominant is sung, not fought).
  - The line follows a contour (a rise, a fall, an arch) and leaps no more than a sixth.
  - The riff is a one-bar figure carried through the riff's chords (a sequence), with a run in the fourth bar.
  - The bridge is long notes on chord tones, climbing, ending a step from home.

  python3 nights.py out/ [fight_night02 ...]   ->  out/<name>_sections.wav and .json (all the songs, or the named ones)
  python3 nights.py --list                     ->  the table
"""
import sys, os, json, time
import numpy as np
import day1 as D
from synth import SR, write_wav

MODES = {
    'aeolian': [0, 2, 3, 5, 7, 8, 10], 'dorian': [0, 2, 3, 5, 7, 9, 10], 'phrygian': [0, 1, 3, 5, 7, 8, 10],
    'harmonic': [0, 2, 3, 5, 7, 8, 11], 'ionian': [0, 2, 4, 5, 7, 9, 11], 'mixolydian': [0, 2, 4, 5, 7, 9, 10],
}
NUMERAL = {'I': 0, 'II': 2, 'III': 4, 'IV': 5, 'V': 7, 'VI': 9, 'VII': 11}
BASS = {
    'engine': None,   # First Blood's: root and octave in a 16th pulse
    'octave8': [0, None, 12, None, 0, None, 12, None, 0, None, 12, None, 0, None, 12, None],
    'gallop': [0, None, 0, 0, 0, None, 0, 0, 0, None, 0, 0, 0, None, 12, 12],
    'walk': [0, None, 7, None, 12, None, 7, None, 0, None, 7, None, 12, None, 7, 12],
    'syncop': [0, None, None, 0, None, None, 12, None, 0, None, 0, None, 12, None, 0, None],
    'pulse16': [0] * 16,
}
ARP = {'updown': None, 'octave': [0, 2, 0, 2, 1, 2, 0, 4], 'ripple': [0, 2, 1, 3, 2, 4, 3, 2],
       'broken': [0, 3, 1, 2, 0, 3, 1, 4], 'triad8': [0, 3, 1, 3, 0, 3, 1, 3]}
STABS = {'off8': None, 'push': (0, 3, 6, 10, 12), 'quarters': (0, 4, 8, 12), 'none': ()}
# One-bar rhythms for the hook, (start, length) in 16ths.
RHYTHM = {
    'first': [(0, 3), (3, 3), (6, 2), (8, 2), (10, 2), (12, 4)],
    'drive8': [(0, 2), (2, 2), (4, 2), (6, 2), (8, 3), (11, 3), (14, 2)],
    'synco': [(0, 3), (3, 3), (6, 4), (10, 2), (12, 2), (14, 2)],
    'gallop': [(0, 2), (2, 1), (3, 1), (4, 2), (6, 1), (7, 1), (8, 4), (12, 2), (14, 2)],
    'call': [(0, 2), (2, 2), (4, 4), (8, 2), (10, 2), (12, 4)],
    'run16': [(0, 1), (1, 1), (2, 1), (3, 1), (4, 2), (6, 2), (8, 2), (10, 2), (12, 4)],
    'long': [(0, 6), (6, 2), (8, 6), (14, 2)],
    'skip': [(0, 2), (3, 1), (4, 2), (7, 1), (8, 2), (11, 1), (12, 4)],
}
CADENCE = [(0, 2), (2, 2), (4, 4), (8, 8)]
RIFFS = {
    'stab': [(0, 2), (2, 1), (3, 1), (4, 4), (8, 4), (12, 4)],          # First Blood's: hit, hit-hit, then down
    'pump': [(0, 1), (1, 1), (2, 2), (4, 1), (5, 1), (6, 2), (8, 2), (10, 2), (12, 4)],
    'hook3': [(0, 3), (3, 3), (6, 2), (8, 3), (11, 3), (14, 2)],
    'climb': [(0, 2), (2, 2), (4, 2), (6, 2), (8, 2), (10, 2), (12, 2), (14, 2)],
}
FB_HOOK = (list(D.HOOK_A), list(D.HOOK_A2))   # First Blood's hook, E minor, for night 20's climax
GAME_LENGTHS = [('stalk', 8), ('dropA', 16), ('riffB', 16), ('break', 8), ('dropA2', 16), ('bridge', 16), ('climax', 16)]

# ------------------------------------------------------------------------------------------------ the nights
# key: the tonic as a bass note (E2 = 40). prog: 'A' (the drops, the stalk, the break, the climax), 'B' (the riff), 'C'
# (the bridge), four chords each, a bar apiece. groove: the drops, the riff, the second drop, the bridge, the climax.
SONGS = [
    dict(name='fight_night02', night=2, title='Runners', story='the first ferals, in two packs', bpm=108, key=45, mode='aeolian',
         prog={'A': ['i', 'bVI', 'bIII', 'bVII'], 'B': ['i', 'iv', 'bVI', 'V'], 'C': ['iv', 'bVI', 'i', 'V']},
         groove=['dbeat', 'four', 'dbeat', 'four', 'four'], bass='octave8', arp='updown', arps=('dropA2', 'climax'),
         lead={'d1': 0.5, 'd2': 0.25, 'vib': 16}, stabs='off8', hook=('drive8', 'call'), riff='pump', contour=('up', 'arch'), seed=2),
    dict(name='fight_night03', night=3, title='The Lake Wakes', story='drowned from the sinkhole, the first leapers', bpm=104, key=38, mode='dorian',
         prog={'A': ['i', 'IV', 'i', 'bVII'], 'B': ['i', 'bVII', 'IV', 'i'], 'C': ['bIII', 'IV', 'v', 'i']},
         groove=['shuffle', 'half', 'shuffle', 'four', 'four'], bass='walk', arp='ripple', arps=('dropA', 'dropA2', 'climax'),
         lead={'d1': 0.125, 'd2': 0.25, 'vib': 24}, stabs='quarters', hook=('long', 'skip'), riff='hook3', contour=('arch', 'down'), seed=3),
    dict(name='fight_night04', night=4, title='Two Fronts', story='Ember Night: two caves at once, the first soldiers and brutes', bpm=116, key=41, mode='phrygian',
         prog={'A': ['i', 'bII', 'i', 'bVII'], 'B': ['i', 'bII', 'bIII', 'bII'], 'C': ['bVI', 'bVII', 'i', 'bII']},
         groove=['four', 'gallop', 'four', 'four', 'four'], bass='engine', arp='octave', arps=('dropA2', 'climax'),
         lead={'d1': 0.25, 'd2': 0.5, 'vib': 12}, stabs='push', hook=('gallop', 'first'), riff='stab', contour=('down', 'up'), seed=4),
    dict(name='fight_night05', night=5, title='The First Nest', story='the first spiders, and a colossus at the end', bpm=112, key=37, mode='harmonic',
         prog={'A': ['i', 'bVI', 'iv', 'V'], 'B': ['i', 'iv', 'V', 'i'], 'C': ['bVI', 'iv', 'V', 'V']},
         groove=['break', 'four', 'break', 'four', 'four'], bass='syncop', arp='broken', arps=('riffB', 'dropA2', 'climax'),
         lead={'d1': 0.25, 'd2': 0.125, 'vib': 10}, stabs='off8', hook=('skip', 'run16'), riff='climb', contour=('valley', 'up'), seed=5),
    dict(name='fight_night06', night=6, title='Chalk', story='Guardian night: it comes out of the chalk cave', bpm=92, key=36, mode='harmonic',
         prog={'A': ['i', 'bVI', 'i', 'V'], 'B': ['i', 'iv', 'bVI', 'V'], 'C': ['iv', 'V', 'bVI', 'V']},
         groove=['half', 'half', 'half', 'four', 'four'], bass='engine', arp='updown', arps=('dropA2', 'climax'),
         lead={'d1': 0.25, 'd2': 0.125, 'vib': 20}, stabs='off8', hook=('first', 'long'), riff='stab', contour=('arch', 'down'), seed=6),
    dict(name='fight_night07', night=7, title='Treeline', story='a rest night: forty claw up in the trees, the first bombers', bpm=114, key=43, mode='dorian',
         prog={'A': ['i', 'IV', 'bVII', 'i'], 'B': ['bIII', 'IV', 'i', 'i'], 'C': ['bIII', 'IV', 'bVII', 'v']},
         groove=['break', 'shuffle', 'break', 'four', 'four'], bass='octave8', arp='updown', arps=('dropA', 'dropA2', 'climax'),
         lead={'d1': 0.5, 'd2': 0.5, 'vib': 8}, stabs='quarters', hook=('synco', 'call'), riff='pump', contour=('up', 'arch'), seed=7),
    dict(name='fight_night08', night=8, title='Fuse', story='Ember Night: a bomber pack, the first screamers', bpm=122, key=40, mode='phrygian',
         prog={'A': ['i', 'bII', 'bVII', 'i'], 'B': ['i', 'bIII', 'bII', 'i'], 'C': ['bVI', 'bVII', 'i', 'bII']},
         groove=['four', 'four', 'four', 'dbeat', 'four'], bass='gallop', arp='octave', arps=('riffB', 'dropA2', 'climax'),
         lead={'d1': 0.125, 'd2': 0.25, 'vib': 14}, stabs='push', hook=('run16', 'gallop'), riff='stab', contour=('down', 'valley'), seed=8),
    dict(name='fight_night09', night=9, title='Eight Packs', story='runners from two caves: eight packs of ten ferals', bpm=128, key=35, mode='aeolian',
         prog={'A': ['i', 'bVII', 'bVI', 'bVII'], 'B': ['i', 'v', 'bVI', 'bVII'], 'C': ['bVI', 'bVII', 'i', 'i']},
         groove=['dbeat', 'dbeat', 'dbeat', 'four', 'four'], bass='octave8', arp='updown', arps=('dropA', 'dropA2', 'climax'),
         lead={'d1': 0.5, 'd2': 0.25, 'vib': 16}, stabs='off8', hook=('drive8', 'skip'), riff='climb', contour=('up', 'down'), seed=9),
    dict(name='fight_night10', night=10, title='Brute Force', story='brute night down one cave, and a colossus', bpm=100, key=38, mode='harmonic',
         prog={'A': ['i', 'i', 'bVI', 'V'], 'B': ['i', 'iv', 'bVI', 'V'], 'C': ['iv', 'V', 'i', 'V']},
         groove=['half', 'gallop', 'half', 'four', 'four'], bass='engine', arp='octave', arps=('dropA2', 'climax'),
         lead={'d1': 0.25, 'd2': 0.125, 'vib': 20}, stabs='quarters', hook=('long', 'first'), riff='stab', contour=('down', 'arch'), seed=10),
    dict(name='fight_night11', night=11, title='Every Cave', story='a rest night from every cave; the first demons', bpm=124, key=45, mode='dorian',
         prog={'A': ['i', 'IV', 'i', 'IV'], 'B': ['bVII', 'IV', 'i', 'v'], 'C': ['bIII', 'bVII', 'IV', 'i']},
         groove=['break', 'four', 'break', 'four', 'four'], bass='syncop', arp='ripple', arps=('dropA', 'riffB', 'dropA2', 'climax'),
         lead={'d1': 0.125, 'd2': 0.5, 'vib': 12}, stabs='push', hook=('synco', 'drive8'), riff='hook3', contour=('arch', 'up'), seed=11),
    dict(name='fight_night12', night=12, title='Red Guardian', story='the guardian on Ember Night, with demons', bpm=104, key=42, mode='phrygian',
         prog={'A': ['i', 'bII', 'bIII', 'bII'], 'B': ['i', 'bVII', 'bVI', 'bII'], 'C': ['iv', 'bVI', 'bVII', 'bII']},
         groove=['half', 'gallop', 'half', 'four', 'four'], bass='gallop', arp='octave', arps=('dropA2', 'climax'),
         lead={'d1': 0.25, 'd2': 0.25, 'vib': 20}, stabs='off8', hook=('gallop', 'long'), riff='stab', contour=('valley', 'down'), seed=12),
    dict(name='fight_night13', night=13, title='Artillery', story='twenty spitters behind a line of soldiers', bpm=120, key=43, mode='aeolian',
         prog={'A': ['i', 'v', 'bVI', 'iv'], 'B': ['i', 'bVII', 'bVI', 'v'], 'C': ['bIII', 'bVII', 'i', 'v']},
         groove=['march', 'march', 'four', 'march', 'four'], bass='octave8', arp='broken', arps=('dropA2', 'climax'),
         lead={'d1': 0.5, 'd2': 0.125, 'vib': 6}, stabs='quarters', hook=('call', 'first'), riff='climb', contour=('up', 'arch'), seed=13),
    dict(name='fight_night15', night=15, title='Brood', story='the nest: fifty spiders, a screamer pack, a colossus', bpm=132, key=34, mode='harmonic',
         prog={'A': ['i', 'bVI', 'iv', 'V'], 'B': ['i', 'i', 'bVI', 'V'], 'C': ['iv', 'V', 'i', 'V']},
         groove=['break', 'four', 'break', 'blast', 'four'], bass='syncop', arp='broken', arps=('dropA', 'riffB', 'dropA2', 'climax'),
         lead={'d1': 0.125, 'd2': 0.125, 'vib': 10}, stabs='push', hook=('run16', 'skip'), riff='pump', contour=('valley', 'up'), seed=15),
    dict(name='fight_night16', night=16, title='Demon Night', story='Ember Night: fourteen demons in two packs', bpm=136, key=41, mode='phrygian',
         prog={'A': ['i', 'bII', 'i', 'bVII'], 'B': ['i', 'bIII', 'bII', 'bVII'], 'C': ['bVI', 'bVII', 'bII', 'bII']},
         groove=['four', 'gallop', 'four', 'dbeat', 'four'], bass='gallop', arp='octave', arps=('riffB', 'dropA2', 'climax'),
         lead={'d1': 0.25, 'd2': 0.5, 'vib': 16}, stabs='push', hook=('gallop', 'drive8'), riff='stab', contour=('down', 'up'), seed=16),
    dict(name='fight_night17', night=17, title='Swarm', story='Swarm Night: the fast ones from every cave', bpm=148, key=37, mode='aeolian',
         prog={'A': ['i', 'bVI', 'bVII', 'i'], 'B': ['i', 'iv', 'bVII', 'bIII'], 'C': ['bVI', 'bVII', 'i', 'i']},
         groove=['blast', 'dbeat', 'blast', 'four', 'four'], bass='octave8', arp='updown', arps=('dropA', 'riffB', 'dropA2', 'climax'),
         lead={'d1': 0.5, 'd2': 0.25, 'vib': 18}, stabs='off8', hook=('run16', 'drive8'), riff='pump', contour=('up', 'down'), seed=17),
    dict(name='fight_night18', night=18, title='The Siege', story='Guardian night: brutes behind a bomber screen', bpm=110, key=43, mode='harmonic',
         prog={'A': ['i', 'bVI', 'iv', 'V'], 'B': ['i', 'iv', 'V', 'V'], 'C': ['iv', 'V', 'i', 'V']},
         groove=['gallop', 'gallop', 'half', 'four', 'four'], bass='gallop', arp='octave', arps=('dropA2', 'climax'),
         lead={'d1': 0.25, 'd2': 0.125, 'vib': 20}, stabs='quarters', hook=('gallop', 'first'), riff='stab', contour=('arch', 'down'), seed=18),
    dict(name='fight_night19', night=19, title='The Gauntlet', story='three caves and the treeline, short breathers', bpm=144, key=42, mode='aeolian',
         prog={'A': ['i', 'bVII', 'bVI', 'V'], 'B': ['i', 'bVI', 'bIII', 'bVII'], 'C': ['iv', 'bVI', 'bVII', 'V']},
         groove=['dbeat', 'four', 'dbeat', 'four', 'four'], bass='octave8', arp='updown', arps=('dropA', 'dropA2', 'climax'),
         lead={'d1': 0.5, 'd2': 0.25, 'vib': 16}, stabs='push', hook=('drive8', 'synco'), riff='climb', contour=('up', 'arch'), seed=19),
    dict(name='fight_night20', night=20, title='Last Stand', story='Ember Night, a colossus, three caves, the treeline and the lake; Heron waits on the water', bpm=152, key=40, mode='aeolian',
         prog={'A': ['i', 'i', 'bVI', 'bVII'], 'B': ['i', 'bII', 'i', 'bVII'], 'C': ['iv', 'bVI', 'i', 'V']},
         groove=['four', 'dbeat', 'four', 'four', 'four'], bass='engine', arp='updown', arps=('dropA', 'riffB', 'dropA2', 'climax'),
         lead=None, stabs='off8', hook=('call', 'run16'), riff='stab', contour=('up', 'arch'), seed=20, first_blood_climax=True),
]


# ------------------------------------------------------------------------------------------------ harmony
def chord(sym, key):
    """'bVI' -> (label, bass midi, (0, 7, 12, third + 12), pitch classes)."""
    s = sym; flat = 0
    while s.startswith('b'): flat += 1; s = s[1:]
    minor = s.islower()
    semi = (NUMERAL[s.upper()] - flat) % 12
    bass = key + semi
    while bass > key + 5: bass -= 12
    while bass < key - 6: bass += 12
    third = 3 if minor else 4
    pcs = {bass % 12, (bass + third) % 12, (bass + 7) % 12}
    return sym, bass, (0, 7, 12, third + 12), pcs


class Song:
    def __init__(self, spec):
        self.s = spec
        self.key = spec['key']
        self.tonic_pc = self.key % 12
        self.scale_pcs = [(self.tonic_pc + iv) % 12 for iv in MODES[spec['mode']]]
        self.rng = np.random.default_rng(1000 + spec['seed'])
        self.chords = {}
        for part in ('A', 'B', 'C'):
            for sym in spec['prog'][part]:
                self.chords[sym] = chord(sym, self.key)
        # the lead sings round the tonic between C4 and C6: its tonic in the 4th octave
        self.mel_tonic = 60 + self.tonic_pc
        if self.mel_tonic > 67: self.mel_tonic -= 12
        self.lo, self.hi = self.mel_tonic - 3, self.mel_tonic + 17

    # The notes allowed over a chord: the mode, but the chord's own notes win where they differ by a semitone.
    def local_pcs(self, sym):
        cp = self.chords[sym][3]
        out = set(cp)
        for p in self.scale_pcs:
            if any(((p - c) % 12) in (1, 11) and c not in self.scale_pcs for c in cp): continue
            out.add(p)
        return out

    def pick(self, cur, target, pcs, strong, prev2):
        """The bridge's long notes: the chord tone nearest the line's target, no leap over a sixth."""
        cands = [m for m in range(self.lo, self.hi + 1) if m % 12 in pcs and abs(m - cur) <= 9] or \
                [m for m in range(self.lo, self.hi + 1) if m % 12 in pcs]
        return min(cands, key=lambda m: abs(m - target) + (m == cur) * 2 + self.rng.random() * 1.5)

    def contour_target(self, kind, u, base):
        span = 7
        if kind == 'up': return base - 2 + span * u
        if kind == 'down': return base + span - span * u
        if kind == 'arch': return base + span * np.sin(np.pi * u)
        if kind == 'valley': return base + span - span * np.sin(np.pi * u)
        return base

    def line(self, rhythm, sym, start_pitch, contour, base, end_tone=None):
        """One bar: (step, length, midi, velocity). A walk along the scale toward the contour: mostly steps, now and
        then a third or a leap to a chord tone, rarely a repeat; it keeps going the way it was going (no trills), and
        the notes on the beat land on the chord."""
        cp = self.chords[sym][3]
        pool = [m for m in range(self.lo, self.hi + 1) if m % 12 in self.local_pcs(sym)]
        idx = min(range(len(pool)), key=lambda i: abs(pool[i] - start_pitch))
        out, last_dir, prev, reps = [], 0, None, 0
        for k, (st, ln) in enumerate(rhythm):
            strong = st in (0, 8) or ln >= 4
            tgt = self.contour_target(contour, (st + ln / 2) / 16, base)
            if k == 0:
                j = idx
            else:
                d = np.sign(tgt - pool[idx])
                if d == 0 or abs(tgt - pool[idx]) < 1.5: d = last_dir or (1 if self.rng.random() < 0.5 else -1)
                if self.rng.random() < 0.18: d = -d
                r = self.rng.random()
                size = 0 if (r < 0.12 and reps == 0) else (1 if r < 0.62 else (2 if r < 0.88 else 3))
                j = int(np.clip(idx + d * size, 0, len(pool) - 1))
                # no trill: never straight back to the note before the last one by a step
                if prev is not None and pool[j] == prev and abs(pool[j] - pool[idx]) <= 2:
                    j = int(np.clip(idx + (last_dir or d), 0, len(pool) - 1))
            m = pool[j]
            if strong or (k == len(rhythm) - 1 and end_tone is not None):
                want = {(self.chords[sym][1] + end_tone) % 12} if (end_tone is not None and k == len(rhythm) - 1) else cp
                cands = [x for x in pool if x % 12 in want] or pool
                m = min(cands, key=lambda x: (abs(x - m), x == prev))
                j = pool.index(m) if m in pool else j
            reps = reps + 1 if out and m == out[-1][2] else 0
            if out: last_dir = int(np.sign(m - out[-1][2])) or last_dir
            vel = 1.0 if st == 0 else (0.92 if st == 8 else (0.85 if st % 4 == 0 else 0.78))
            prev = out[-1][2] if out else None
            out.append((st, ln, m, vel))
            idx = j
        return out

    def hook(self):
        rA, rB = (RHYTHM[r] for r in self.s['hook'])
        cA, cB = self.s['contour']
        P = self.s['prog']['A']
        base = self.mel_tonic + 2
        bar1 = self.line(rA, P[0], self.mel_tonic + 7, cA, base)
        bar2 = self.line(rB, P[1], bar1[-1][2], cB, base + 2, end_tone=None)
        # the answer comes back the way the call began: bar 1's first half again, fitted to its chord
        half = [n for n in bar1 if n[0] < 8]
        fit = []
        cur = half[0][2]
        for st, ln, m, v in half:
            if st == 0 or ln >= 4:
                pcs = self.chords[P[2]][3]
                m = min((x for x in range(m - 4, m + 5) if x % 12 in pcs), key=lambda x: abs(x - m))
            else:
                pcs = self.local_pcs(P[2])
                if m % 12 not in pcs: m = min((x for x in range(m - 2, m + 3) if x % 12 in pcs), key=lambda x: abs(x - m))
            fit.append((st, ln, m, v)); cur = m
        tail_r = [(st - 8, ln) for st, ln in rA if st >= 8]
        tail = self.line([(st, ln) for st, ln in tail_r], P[2], cur, cB, base)
        bar3 = fit + [(st + 8, ln, m, v) for st, ln, m, v in tail]
        # the cadence: home, or the fifth, held
        bar4 = self.line(CADENCE, P[3], bar3[-1][2], 'down', base, end_tone=None)
        last = bar4[-1]
        cp = self.chords[P[3]][3]
        want = [pc for pc in (self.tonic_pc, (self.tonic_pc + 7) % 12) if pc in cp] or list(cp)
        home = [m for m in range(self.lo, self.hi + 1) if m % 12 in want]
        m = min(home, key=lambda x: (abs(x - last[2]), x % 12 != self.tonic_pc))
        bar4[-1] = (last[0], last[1], m, 0.95)
        HOOK_A = bar1 + [(st + 16, ln, m, v) for st, ln, m, v in bar2]
        HOOK_A2 = bar3 + [(st + 16, ln, m, v) for st, ln, m, v in bar4]
        return HOOK_A, HOOK_A2

    def riff(self):
        P = self.s['prog']['B']
        R = RIFFS[self.s['riff']]
        up = 5
        first = self.line(R, P[0], self.mel_tonic + 7 + up, 'down', self.mel_tonic + up + 2)
        out = list(first)
        root0 = self.chords[P[0]][1]
        for bar in (1, 2):
            sym = P[bar]
            shift = self.chords[sym][1] - root0
            while shift > 6: shift -= 12
            while shift < -6: shift += 12
            # the figure carried to this chord, in the octave that stays in the lead's range and starts nearest
            # where the last bar ended
            prev_end = out[-1][2]
            opts = [sh for sh in (shift - 12, shift, shift + 12)
                    if all(self.lo <= m + sh <= self.hi + 5 for _, _, m, _ in first)] or [shift]
            shift = min(opts, key=lambda sh: abs(first[0][2] + sh - prev_end))
            pcs_all, cp = self.local_pcs(sym), self.chords[sym][3]
            for st, ln, m, v in first:
                mm = m + shift
                pcs = cp if (st in (0, 8) or ln >= 4) else pcs_all
                if mm % 12 not in pcs: mm = min((x for x in range(mm - 2, mm + 3) if x % 12 in pcs), key=lambda x: abs(x - mm))
                out.append((st + 16 * bar, ln, mm, v * (0.95 if bar == 2 else 1)))
        run = self.line(RIFFS['climb'], P[3], out[-1][2], 'up', self.mel_tonic + up + 4)
        out += [(st + 48, ln, m, v) for st, ln, m, v in run]
        return out

    def bridge(self):
        P = self.s['prog']['C']
        out, cur = [], self.mel_tonic + 3
        for k in range(8):
            sym = P[k // 2]
            tgt = self.mel_tonic + 2 + k * 1.6
            m = self.pick(cur, tgt, self.chords[sym][3], True, None)
            out.append((k * 8, 8 if k < 7 else 6, m, 0.9 + 0.02 * k))
            cur = m
        # a step from home at the end: the leading tone where the mode has one, else the second
        lead_pc = next((self.tonic_pc + d) % 12 for d in (-1, 1, 2, -2) if (self.tonic_pc + d) % 12 in self.local_pcs(P[3]))
        m = min((x for x in range(cur - 6, cur + 7) if x % 12 == lead_pc), key=lambda x: abs(x - cur))
        out.append((62, 2, m, 1.0))
        return out


def check(song, events, sym_of_bar):
    """The rules, as numbers: every note in its bar's allowed notes, on-beat notes chord tones, no leap over a sixth."""
    bad, prev = [], None
    for st, ln, m, v in events:
        sym = sym_of_bar(st // 16)
        if m % 12 not in song.local_pcs(sym): bad.append(('outside', st, m))
        if st % 16 in (0, 8) and m % 12 not in song.chords[sym][3]: bad.append(('offbeat-chord', st, m))
        # (a riff's figure carried to the next chord may start up to an octave and a third from where it ended)
        if prev is not None and abs(m - prev) > (14 if st % 16 == 0 else 9): bad.append(('leap', st, m - prev))
        prev = m
    return bad


def configure(spec):
    """Set day1.py's globals to this night's song."""
    song = Song(spec)
    D._cache.clear()
    D.BPM = float(spec['bpm']); D.SPB = 60.0 / D.BPM; D.S16 = D.SPB / 4; D.BAR_S = 4 * D.SPB
    D.DRIVE = 3
    D.ROOT.clear(); D.TONES.clear()
    for sym, (lab, bass, tones, pcs) in song.chords.items():
        D.ROOT[sym] = bass; D.TONES[sym] = tones
    P = spec['prog']
    progs = {'stalk': P['A'], 'dropA': P['A'], 'riffB': P['B'], 'break': P['A'], 'dropA2': P['A'], 'bridge': P['C'], 'climax': P['A']}
    D.GAME_SECTIONS = [(nm, n, progs[nm]) for nm, n in GAME_LENGTHS]
    D.SECTIONS = [(nm, n, progs.get(nm, P['A'])) for nm, n, _ in D.SECTIONS]
    hA, hA2 = song.hook()
    D.HOOK_A, D.HOOK_A2 = hA, hA2
    D.RIFF_B = song.riff()
    D.BRIDGE_LINE = song.bridge()
    D.SCALE = sorted(song.scale_pcs)
    D.E4, D.G4, D.B4 = hA[0][2], hA[1][2], hA[2][2]
    g = spec['groove']
    D.GROOVE = {'dropA': g[0], 'riffB': g[1], 'dropA2': g[2], 'bridge': g[3], 'climax': g[4]}
    D.BASS_PAT = BASS[spec['bass']]
    D.ARP_ORDER = ARP[spec['arp']]
    D.ARP_SECS = tuple(spec['arps'])
    D.LEAD = spec['lead']
    D.STAB_STEPS = STABS[spec['stabs']]
    D.CLIMAX_HOOK = None
    if spec.get('first_blood_climax'):
        # night 20 comes home: First Blood's hook (day1.py as written, E minor) over the last stand's climax
        shift = (spec['key'] - 40)
        D.CLIMAX_HOOK = ([(st, ln, m + shift, v) for st, ln, m, v in FB_HOOK[0]], [(st, ln, m + shift, v) for st, ln, m, v in FB_HOOK[1]], 1)
    # the rules, checked
    A, B, C = P['A'], P['B'], P['C']
    problems = check(song, hA, lambda b: A[b % 4]) + check(song, [(st + 32, ln, m, v) for st, ln, m, v in hA2], lambda b: A[b % 4]) \
        + check(song, D.RIFF_B, lambda b: B[b % 4]) + check(song, D.BRIDGE_LINE, lambda b: C[b % 4])
    return song, problems


def describe(spec):
    g = spec['groove']
    return f"{spec['name']}  night {spec['night']:>2}  {spec['bpm']:>3} bpm  {spec['title']:<16} {spec['mode']:<9} " \
           f"{' '.join(spec['prog']['A'])} | {' '.join(spec['prog']['B'])} | {' '.join(spec['prog']['C'])}  groove {g[0]}/{g[1]}  bass {spec['bass']}"


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--list':
        for s in SONGS: print(describe(s))
        sys.exit(0)
    out = sys.argv[1] if len(sys.argv) > 1 else 'out'
    os.makedirs(out, exist_ok=True)
    want = sys.argv[2:]
    for spec in SONGS:
        if want and spec['name'] not in want: continue
        t0 = time.time()
        song, problems = configure(spec)
        if problems: print('  rules:', spec['name'], problems[:6], flush=True)
        z, table = D.render_sections()
        write_wav(os.path.join(out, spec['name'] + '_sections.wav'), z)
        meta = {'bpm': spec['bpm'], 'barSeconds': D.BAR_S, 'sections': table, 'title': spec['title'], 'night': spec['night'],
                'hook': D.HOOK_A, 'answer': D.HOOK_A2}
        json.dump(meta, open(os.path.join(out, spec['name'] + '_sections.json'), 'w'), indent=1)
        print(f"{describe(spec)}  {z.shape[1] / SR:.1f}s  {time.time() - t0:.0f}s", flush=True)
