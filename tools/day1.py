"""Dead-Wave · Day 1 fight song, "First Blood" (CL-35).

Jerry: aggressive but simple for the first day. Heavy. Slow. Adrenaline. Chiptune. 4-5 minutes,
and it loops. The reference he gave is how Hotline Miami's music made that game.

So: 96 bpm with a half-time drum feel (slow and heavy), under a bass that never stops pulsing
16th notes (the adrenaline), a kick that pumps everything else down like a sidechain, and one
simple lead hook in E minor you can hum after one wave. Built from 8-bit voices: band-limited
pulse waves, a stepped-triangle sub, LFSR-noise drums.

The form (108 bars, 4:30), so a long wave never sits on one idea:
   0 intro      8  the engine starts filtered and opens up; a heartbeat kick
   8 drop A    16  half-time drums, the engine, offbeat stabs; the hook from bar 12
  24 riff B    16  the menace: E minor to F (phrygian); the hook answers higher
  40 break      8  drums out, a long pad, the hook as an echo; a riser
  48 drop A'   16  the drop again, the hook an octave up, arps
  64 bridge    16  Am C Em B: kick on every beat, quarter-note stabs, a long climbing line
  80 build      8  E pedal, the filter opens, snare rolls tighten, riser
  88 climax    16  everything: driving drums, the hook high with a harmony, arps
 104 turn       4  back down to the filtered engine, which is where bar 0 starts: the loop
The whole song is rendered as a circle (every tail that runs past the end is folded back onto
the start), so the loop point is inaudible.

CL-42 (Jerry: "make the music for day 1 as good as possible"): the song is also cut into
sections the game moves between as the wave goes (core/audio.js, the section player):
  stalk   8  the new opener: the engine low and filtered, a heartbeat kick, the hook's first
             three notes far off in the echo. Plays while the horde is still out of sight.
  dropA  16  the drop, the moment they're on you, then riffB, dropA2, bridge in rotation while
             the fight is on; break (8) when it goes quiet between groups; climax (16) for the
             last few. Every section is its own circle, so it loops without a seam, and they are
             all at one tempo, so the game can cut between them on any bar line.
The whole song (the old 108-bar form) is still rendered as the fallback for a browser where the
section player can't run.

  python3 day1.py out/  ->  out/fight_day01.wav, out/fight_day01.mid,
                            out/fight_day01_sections.wav, out/fight_day01_sections.json
"""
import sys, os
import numpy as np
import scipy.signal as sg
from synth import SR, adsr, lowpass, highpass, bandpass, reverb, stereo_delay, add_at, midi_to_hz, write_wav
from chip import pulse, tri_stepped, lfsr_noise

BPM = 96.0
SPB = 60.0 / BPM            # seconds per beat
S16 = SPB / 4               # seconds per 16th
BARS = 108
BAR_S = 4 * SPB
N = int(round(BARS * BAR_S * SR))
TAIL = int(6 * SR)

def smp(bar, step=0.0):
    return int(round((bar * 16 + step) * S16 * SR))

# --------------------------------------------------------------------- harmony
# Bass roots (midi) and chord tones per chord name.
ROOT = {'Em': 40, 'F': 41, 'G': 43, 'Am': 45, 'B': 35, 'C': 36, 'D': 38}
TONES = {'Em': (0, 7, 12, 15), 'F': (0, 7, 12, 16), 'G': (0, 7, 12, 16), 'Am': (0, 7, 12, 15),
         'B': (0, 7, 12, 16), 'C': (0, 7, 12, 16), 'D': (0, 7, 12, 16)}

SECTIONS = [
    # name,     bars, progression (cycled per bar)   (the full song, the fallback)
    ('intro',     8, ['Em', 'Em', 'C', 'D']),
    ('dropA',    16, ['Em', 'Em', 'C', 'D']),
    ('riffB',    16, ['Em', 'F', 'Em', 'D']),
    ('break',     8, ['Em', 'Em', 'C', 'D']),
    ('dropA2',   16, ['Em', 'Em', 'C', 'D']),
    ('bridge',   16, ['Am', 'C', 'Em', 'B']),
    ('build',     8, ['Em', 'Em', 'Em', 'Em']),
    ('climax',   16, ['Em', 'Em', 'C', 'D']),
    ('turn',      4, ['Em', 'Em', 'C', 'D']),
]
assert sum(s[1] for s in SECTIONS) == BARS
# The game's sections (CL-42), in the order they sit in fight_day01_sections.
GAME_SECTIONS = [
    ('stalk',     8, ['Em', 'Em', 'C', 'D']),
    ('dropA',    16, ['Em', 'Em', 'C', 'D']),
    ('riffB',    16, ['Em', 'F', 'Em', 'D']),
    ('break',     8, ['Em', 'Em', 'C', 'D']),
    ('dropA2',   16, ['Em', 'Em', 'C', 'D']),
    ('bridge',   16, ['Am', 'C', 'Em', 'B']),
    ('climax',   16, ['Em', 'Em', 'C', 'D']),
]
SEC_LEN = {nm: n for nm, n, _ in SECTIONS + GAME_SECTIONS}

def bars_of(sections):
    out = []   # per bar: (section, index in section, chord)
    for name, n, prog in sections:
        for i in range(n):
            out.append((name, i, prog[i % len(prog)]))
    return out
bar_info = bars_of(SECTIONS)

# ------------------------------------------------------------------- the hook
# (step, length, midi, velocity) over two bars; step in 16ths from the phrase start.
E4, Fs4, G4, A4, B4, C5, D5, E5, F5, D4, Fs5, G5, B5 = 64, 66, 67, 69, 71, 72, 74, 76, 77, 62, 78, 79, 83
HOOK_A = [(0, 3, E4, 1.0), (3, 3, G4, .85), (6, 2, B4, .9), (8, 2, A4, .8), (10, 2, G4, .8), (12, 4, Fs4, .9),
          (16, 3, E4, 1.0), (19, 3, G4, .85), (22, 2, B4, .9), (24, 3, D5, 1.0), (27, 2, C5, .85), (29, 3, B4, .9)]
HOOK_A2 = [(0, 3, C5, 1.0), (3, 3, B4, .85), (6, 2, G4, .85), (8, 6, A4, .95), (14, 2, B4, .8),
           (16, 3, A4, .95), (19, 3, Fs4, .85), (22, 2, D4, .85), (24, 4, Fs4, .9), (28, 4, A4, .9)]
# Riff B, four bars: the menace (E to F), answered higher.
RIFF_B = [(0, 2, E5, 1.0), (2, 1, E5, .7), (3, 1, D5, .75), (4, 4, E5, .95), (8, 4, B4, .85), (12, 4, G4, .85),
          (16, 2, F5, 1.0), (18, 1, F5, .7), (19, 1, E5, .75), (20, 4, F5, .95), (24, 4, C5, .85), (28, 4, A4, .85),
          (32, 2, E5, 1.0), (34, 1, E5, .7), (35, 1, D5, .75), (36, 4, E5, .95), (40, 4, B4, .85), (44, 4, G5, .9),
          (48, 4, Fs5, 1.0), (52, 2, E5, .85), (54, 2, D5, .85), (56, 4, C5, .9), (60, 4, B4, .95)]
# The bridge's climbing line (over Am C Em B): long notes, the last one the leading tone.
BRIDGE_LINE = [(0, 8, A4, .9), (8, 8, C5, .9), (16, 8, C5, .85), (24, 8, E5, .95),
               (32, 8, B4, .9), (40, 8, E5, .9), (48, 6, Fs5, 1.0), (54, 2, E5, .8), (56, 8, 75, 1.0)]  # D#5

# E natural minor, for the harmony a third below the hook in the climax.
SCALE = [4, 6, 7, 9, 11, 12, 14]   # E F# G A B C D  (pitch classes from C)
def third_below(m):
    pcs = sorted(set(p % 12 for p in SCALE))
    cand = [x for x in range(m - 5, m - 2) if x % 12 in pcs]
    return cand[-1] if cand else m - 3

# --------------------------------------------------------------------- voices
_cache = {}
def v_bass(m, n, bright):
    """The engine: a 25% pulse with a stepped-triangle sub an octave down, filtered, driven."""
    key = ('b', m, n, round(bright, 2))
    if key in _cache: return _cache[key]
    f = midi_to_hz(m)
    x = 0.75 * pulse(f, n, duty=0.25) + 0.55 * tri_stepped(f / 2, n)
    fc = 280 + 2600 * bright ** 1.6
    x = lowpass(x, fc)
    e = adsr(n, 0.002, 0.06, 0.55, 0.02)
    y = np.tanh(1.8 * x * e) / np.tanh(1.8)
    _cache[key] = y
    return y

def v_sub(m, n):
    key = ('s', m, n)
    if key in _cache: return _cache[key]
    y = tri_stepped(midi_to_hz(m) / 2, n) * adsr(n, 0.004, 0.2, 0.8, 0.08)
    _cache[key] = y
    return y

def v_stab(root, n):
    key = ('st', root, n)
    if key in _cache: return _cache[key]
    x = np.zeros(n)
    for iv, g in ((0, 1.0), (7, 0.8), (12, 0.7)):
        f = midi_to_hz(root + 24 + iv)
        x += g * (pulse(f, n, 0.5) + 0.6 * pulse(f * 2 ** (9 / 1200), n, 0.5))
    x = lowpass(x, 2600) * adsr(n, 0.002, 0.09, 0.25, 0.05)
    y = np.tanh(1.4 * x / 3)
    _cache[key] = y
    return y

def v_lead(m, n, dark=0.0):
    key = ('l', m, n, dark)
    if key in _cache: return _cache[key]
    f = midi_to_hz(m)
    a = pulse(f, n, 0.25, vib_hz=5.2, vib_cents=16, vib_delay=0.22)
    b = pulse(f * 2 ** (7 / 1200), n, 0.125, vib_hz=5.0, vib_cents=14, vib_delay=0.25)
    x = 0.65 * a + 0.45 * b
    x = lowpass(x, 5200 - 3600 * dark)
    x = np.tanh(1.3 * x) * adsr(n, 0.006, 0.12, 0.8, 0.09)
    _cache[key] = x
    return x

def v_arp(m, n):
    key = ('a', m, n)
    if key in _cache: return _cache[key]
    x = pulse(midi_to_hz(m), n, 0.125)
    t = np.arange(n) / SR
    y = lowpass(x, 6000) * np.exp(-t * 18)
    _cache[key] = y
    return y

def v_pad(chord, n):
    x = np.zeros(n)
    r = ROOT[chord] + 24
    for iv in (0, 7, 12, 15 if chord in ('Em', 'Am') else 16):
        f = midi_to_hz(r + iv)
        x += pulse(f, n, 0.5) + pulse(f * 2 ** (6 / 1200), n, 0.5)
    t = np.arange(n) / SR
    x = lowpass(x, 900) * (0.85 + 0.15 * np.sin(2 * np.pi * 5.5 * t))
    return x * adsr(n, 0.6, 0.5, 0.8, 0.9) / 8

def d_kick(heavy=1.0):
    key = ('k', heavy)
    if key in _cache: return _cache[key]
    n = int(0.42 * SR); t = np.arange(n) / SR
    f = 42 + 190 * np.exp(-t * 30)
    ph = (0.25 + np.cumsum(f / SR)) % 1.0
    body = (1 - 4 * np.abs(ph - 0.5)) * np.exp(-t * (6.5 / heavy))
    click = highpass(lfsr_noise(n, rate=26000), 2000) * np.exp(-t * 260) * 0.5
    y = np.tanh(2.2 * (body * 1.1 + click)) / np.tanh(2.2)
    _cache[key] = y
    return y

def d_snare(big=True):
    key = ('sn', big)
    if key in _cache: return _cache[key]
    n = int((0.5 if big else 0.2) * SR); t = np.arange(n) / SR
    nz = bandpass(lfsr_noise(n, rate=15000), 700, 9000) * np.exp(-t * (7.5 if big else 22))
    f = 185 * np.exp(-t * 10) + 150
    ph = np.cumsum(f / SR) % 1.0
    tone = (1 - 4 * np.abs(ph - 0.5)) * np.exp(-t * 26)
    y = np.tanh(1.6 * (nz * 1.0 + tone * 0.8))
    _cache[key] = y
    return y

def d_hat(open_=False):
    key = ('h', open_)
    if key in _cache: return _cache[key]
    n = int((0.28 if open_ else 0.045) * SR); t = np.arange(n) / SR
    y = highpass(lfsr_noise(n, short=True, rate=32000), 6500) * np.exp(-t * (11 if open_ else 150)) * 0.8
    _cache[key] = y
    return y

def d_crash():
    n = int(1.8 * SR); t = np.arange(n) / SR
    return highpass(lfsr_noise(n, rate=30000), 3500) * np.exp(-t * 2.4)

def fx_riser(nbars):
    """Noise that brightens and swells, with a pulse sweeping up under it."""
    n = int(nbars * BAR_S * SR); t = np.arange(n) / n
    x = lfsr_noise(n, rate=30000)
    lo = lowpass(x, 1200); hi = highpass(x, 4000)
    nz = lo * (1 - t) + hi * t
    ph = np.cumsum((70 + 700 * t ** 2) / SR) % 1.0
    tone = lowpass(np.where(ph < 0.5, 1.0, -1.0), 2500) * 0.3
    return (nz * 0.8 + tone) * t ** 1.8


def fx_impact():
    n = int(2.4 * SR); t = np.arange(n) / SR
    f = 30 + 70 * np.exp(-t * 7)
    ph = (0.25 + np.cumsum(f / SR)) % 1.0
    boom = np.tanh(2 * (1 - 4 * np.abs(ph - 0.5)) * np.exp(-t * 1.8))
    cr = np.zeros(n); c = d_crash(); cr[:len(c)] = c
    return boom + cr * 0.5


# --------------------------------------------------------------------- MIDI log
NOTES = []   # (track, start_sample, length_samples, midi, velocity) - for export_midi()
def note(track, pos, n, m, v):
    NOTES.append((track, int(pos), int(n), int(m), float(v)))


# --------------------------------------------------------------------- render
def render(sections=None, circle=True, master_mode='song'):
    sections = sections or SECTIONS
    bar_info = bars_of(sections)
    BARS = len(bar_info)
    N = int(round(BARS * BAR_S * SR))
    NOTES.clear()
    L = N + TAIL
    bus = {k: np.zeros((2, L)) for k in ('bass', 'sub', 'stab', 'lead', 'arp', 'pad', 'drums', 'fx')}
    send_rev = np.zeros((2, L)); send_dly = np.zeros((2, L))
    kicks = []   # sample positions, for the sidechain pump

    def kick(pos, g=1.0, heavy=1.0):
        add_at(bus['drums'], d_kick(heavy), pos, 0.95 * g, 0); kicks.append((pos, g)); note('drums', pos, int(0.1 * SR), 36, g)
    def snare(pos, g=1.0, big=True):
        s = d_snare(big)
        add_at(bus['drums'], s, pos, 0.62 * g, 0.02); note('drums', pos, int(0.1 * SR), 38 if big else 40, g)
        add_at(send_rev, s, pos, 0.35 * g, 0.02)
    def hat(pos, g=1.0, open_=False, pan=0.3):
        add_at(bus['drums'], d_hat(open_), pos, (0.22 if open_ else 0.2) * g, pan); note('drums', pos, int(0.05 * SR), 46 if open_ else 42, g)

    rng = np.random.default_rng(1)
    phrase_bar = {}
    for b, (sec, i, ch) in enumerate(bar_info):
        root = ROOT[ch]
        nxt_sec = bar_info[b + 1][0] if b + 1 < BARS else bar_info[0][0]
        last_of_sec = (b + 1 == BARS) or bar_info[b + 1][0] != sec
        sec_len = SEC_LEN[sec]

        # ---- bass engine
        if sec == 'stalk':
            bright = 0.22 + 0.06 * (i % 4 == 3)
        elif sec in ('intro', 'turn'):
            bright = (i + 1) / 8 * 0.55 if sec == 'intro' else 0.5 - (i / 4) * 0.4
        elif sec == 'build':
            bright = 0.35 + 0.65 * (i / 7)
        elif sec == 'break':
            bright = None
        else:
            bright = 0.8 if sec in ('climax', 'bridge') else 0.7
        n16 = int(S16 * SR)
        if bright is not None:
            pat = [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 12, 0, 12]
            for st, o in enumerate(pat):
                vel = 1.0 if st in (0, 8) else (0.8 if o else 0.72)
                add_at(bus['bass'], v_bass(root + o, int(n16 * 0.92), bright), smp(b, st), vel, 0); note('bass', smp(b, st), n16 * 0.92, root + o, vel)
        else:
            add_at(bus['bass'], v_bass(root, int(BAR_S * SR * 0.95), 0.25), smp(b), 0.9, 0); note('bass', smp(b), BAR_S * SR * 0.95, root, 0.9)
        # sub on the downbeats when the drums are in
        if sec not in ('intro', 'break', 'turn', 'stalk'):
            add_at(bus['sub'], v_sub(root, int(SPB * 2 * SR * 0.95)), smp(b, 0), 0.8, 0); note('sub', smp(b, 0), SPB * 2 * SR * 0.95, root - 12, 0.8)
            add_at(bus['sub'], v_sub(root, int(SPB * 2 * SR * 0.95)), smp(b, 8), 0.7, 0); note('sub', smp(b, 8), SPB * 2 * SR * 0.95, root - 12, 0.7)

        # ---- drums
        if sec == 'stalk':
            # a heartbeat, ba-dum, and a far tick on the 4; the last bar leans in
            kick(smp(b, 0), 0.75, heavy=1.3); kick(smp(b, 3), 0.5, heavy=1.3)
            hat(smp(b, 12), 0.35, pan=-0.4)
            if i == 7:
                for k, st in enumerate(range(12, 16)): snare(smp(b, st), 0.15 + 0.06 * k, big=False)
        elif sec == 'intro':
            kick(smp(b, 0), 0.8 if i < 4 else 0.95)
            if i >= 4:
                for st in range(0, 16, 2): hat(smp(b, st), 0.6 + 0.3 * (st % 4 == 0))
            if i == 7:
                for k, st in enumerate(range(8, 16)): snare(smp(b, st), 0.25 + 0.08 * k, big=False)
        elif sec == 'turn':
            kick(smp(b, 0), 0.8)
            if i < 2:
                for st in range(0, 16, 4): hat(smp(b, st), 0.5)
        elif sec == 'break':
            if i % 2 == 0: kick(smp(b, 0), 0.7, heavy=1.6)
            if i >= 6:
                steps = range(0, 16, 2) if i == 6 else range(0, 16)
                for k, st in enumerate(steps): snare(smp(b, st), 0.18 + 0.05 * k * (2 if i == 6 else 1), big=False)
        elif sec == 'build':
            kick(smp(b, 0), 1.0); kick(smp(b, 8), 0.9)
            div = 4 if i < 2 else (2 if i < 4 else 1)
            for k, st in enumerate(range(0, 16, div)):
                snare(smp(b, st), 0.22 + 0.5 * (i / 8) + 0.02 * k, big=False)
            if i == 7:
                for st in (0, 0.5, 1, 1.5):
                    pass
        elif sec in ('bridge', 'climax'):
            # driving: kick on every beat, backbeat snare, 8th hats, open hat on the "and" of 4
            for st in (0, 4, 8, 12): kick(smp(b, st), 1.0 if st in (0, 8) else 0.9)
            if sec == 'climax' and i % 4 == 3: kick(smp(b, 14), 0.75)
            snare(smp(b, 4), 0.95); snare(smp(b, 12), 1.0)
            for st in range(0, 16, 2): hat(smp(b, st), 0.75 if st % 4 == 2 else 0.5, open_=(st == 14))
            if sec == 'climax':
                for st in range(1, 16, 2): hat(smp(b, st), 0.28, pan=-0.3)
        else:
            # half-time: the heavy walk. Kick 1 and the "a" of 2 and "and" of 3, snare on 3.
            kick(smp(b, 0), 1.0); kick(smp(b, 6), 0.85); kick(smp(b, 10), 0.9)
            if i % 4 == 3: kick(smp(b, 14), 0.8); kick(smp(b, 15), 0.7)
            snare(smp(b, 8), 1.0)
            for st in range(0, 16, 2): hat(smp(b, st), 0.62 if st % 4 == 0 else 0.42, open_=(st == 14 and i % 2 == 1))
        # fills into the next section
        if last_of_sec and sec in ('dropA', 'riffB', 'dropA2', 'bridge', 'climax'):
            for k, st in enumerate(range(12, 16)): snare(smp(b, st), 0.55 + 0.12 * k, big=False)

        # impacts and crashes on the downbeat of the loud sections
        if i == 0 and sec in ('dropA', 'dropA2', 'climax', 'bridge', 'riffB'):
            add_at(bus['fx'], fx_impact(), smp(b), 0.7 if sec != 'riffB' else 0.45, 0)
        if sec == 'climax' and i % 4 == 0 and i > 0:
            add_at(bus['fx'], d_crash(), smp(b), 0.5, 0.25)
        if sec == 'climax':
            # the engine an octave down under the climax: the floor drops out of the world
            for st in (0, 8):
                add_at(bus['sub'], v_sub(root - 12, int(SPB * 2 * SR * 0.9)), smp(b, st), 0.35, 0)
        if sec == 'stalk' and i % 4 == 2:
            add_at(bus['fx'], fx_riser(1) * 0.5, smp(b, 8), 0.25, 0)
        # risers into the drops
        if sec == 'intro' and i == 6: add_at(bus['fx'], fx_riser(2), smp(b), 0.35, 0)
        if sec == 'break' and i == 4: add_at(bus['fx'], fx_riser(4), smp(b), 0.4, 0)
        if sec == 'build' and i == 4: add_at(bus['fx'], fx_riser(4), smp(b), 0.45, 0)

        # ---- stabs (offbeat 8ths in the drops, quarters in the bridge)
        if sec in ('dropA', 'dropA2', 'riffB', 'climax'):
            for st in (2, 6, 10, 14):
                add_at(bus['stab'], v_stab(root, int(S16 * SR * 1.6)), smp(b, st), 0.8, -0.25 if st % 8 == 2 else 0.25)
                for iv in (0, 7, 12): note('stabs', smp(b, st), S16 * SR * 1.6, root + 24 + iv, 0.8)
        elif sec == 'bridge':
            for st in (0, 4, 8, 12):
                add_at(bus['stab'], v_stab(root, int(S16 * SR * 3.2)), smp(b, st), 0.9, 0)
                for iv in (0, 7, 12): note('stabs', smp(b, st), S16 * SR * 3.2, root + 24 + iv, 0.9)

        # ---- pad (break and climax, and a thin one in riff B)
        if sec in ('break', 'climax', 'riffB', 'stalk') and (i % 1 == 0):
            p = v_pad(ch, int(BAR_S * SR * 1.05))
            for iv in (0, 7, 12, 15 if ch in ('Em', 'Am') else 16): note('pad', smp(b), BAR_S * SR * 1.05, ROOT[ch] + 24 + iv, 0.6)
            g = 0.9 if sec == 'break' else (0.45 if sec == 'climax' else (0.42 if sec == 'stalk' else 0.3))
            add_at(bus['pad'], p, smp(b), g, -0.2); add_at(bus['pad'], p, smp(b), g, 0.2)
            add_at(send_rev, p, smp(b), g * 0.5, 0)

        # ---- arps (drop A' and climax): 16ths of the chord, up and up
        if sec in ('dropA2', 'climax') or (sec == 'build' and i >= 4):
            tones = [root + 24 + t for t in TONES[ch]] + [root + 36]
            order = [0, 1, 2, 3, 4, 3, 2, 1]
            for st in range(16):
                m = tones[order[st % 8] % len(tones)] + (12 if sec == 'climax' and st % 8 >= 4 else 0)
                add_at(bus['arp'], v_arp(m, int(S16 * SR * 0.9)), smp(b, st), 0.8 if st % 4 == 0 else 0.55, 0.4 * np.sin(st)); note('arp', smp(b, st), S16 * SR * 0.9, m, 0.7)
                add_at(send_dly, v_arp(m, int(S16 * SR * 0.9)), smp(b, st), 0.25, 0)

    # ---- the lead, laid out by phrase
    def lay(events, bar0, octave=0, g=1.0, dark=0.0, harmony=False, echo=0.6):
        for st, ln, m, v in events:
            mm = m + 12 * octave
            n = int(ln * S16 * SR * 0.96) + int(0.08 * SR)
            pos = smp(bar0, st)
            sig = v_lead(mm, n, dark)
            add_at(bus['lead'], sig, pos, v * g, 0.08); note('lead', pos, ln * S16 * SR * 0.96, mm, v * g)
            add_at(send_dly, sig, pos, v * g * echo, 0.08)
            add_at(send_rev, sig, pos, v * g * 0.25, 0.08)
            if harmony:
                h = v_lead(third_below(mm), n, dark)
                add_at(bus['lead'], h, pos, v * g * 0.55, -0.3); note('harmony', pos, ln * S16 * SR * 0.96, third_below(mm), v * g * 0.55)

    def sec_starts(name):
        b, out = 0, []
        for nm, n, _ in sections:
            if nm == name: out.append(b)
            b += n
        return out
    for s in sec_starts('stalk'):
        # the hook's first three notes, far off in the echo, twice
        far = [(0, 3, E4, 0.9), (3, 3, G4, 0.8), (6, 6, B4, 0.85)]
        lay(far, s + 1, octave=1, g=0.32, dark=0.75, echo=1.2); lay(far, s + 5, octave=1, g=0.28, dark=0.8, echo=1.2)
    for s in sec_starts('dropA'):
        # the hook comes in with the drop in the game's cut (the song's intro is gone), bars 0-15
        start = 4 if master_mode == 'song' else 0
        for k in range(3 if start else 4):
            lay(HOOK_A, s + start + 4 * k); lay(HOOK_A2, s + start + 2 + 4 * k)
    for s in sec_starts('riffB'):
        for k in range(4):
            lay(RIFF_B, s + 4 * k, g=0.95 if k % 2 == 0 else 0.85)
    for s in sec_starts('break'):
        lay(HOOK_A, s, g=0.55, dark=0.7, echo=1.0); lay(HOOK_A2, s + 2, g=0.5, dark=0.7, echo=1.0)
    for s in sec_starts('dropA2'):
        for k in range(4):
            lay(HOOK_A, s + 4 * k, octave=1, g=0.8); lay(HOOK_A2, s + 2 + 4 * k, octave=1, g=0.8)
    for s in sec_starts('bridge'):
        for k in range(2):
            lay(BRIDGE_LINE, s + 8 * k, g=0.9, echo=0.8)
    for s in sec_starts('climax'):
        for k in range(4):
            lay(HOOK_A, s + 4 * k, octave=1, g=0.85, harmony=True); lay(HOOK_A2, s + 2 + 4 * k, octave=1, g=0.85, harmony=True)

    # ---- sidechain pump on the tonal buses
    pump = np.ones(L)
    tt = np.arange(int(0.35 * SR)) / SR
    shape = 1 - 0.55 * np.exp(-tt / 0.085)
    for pos, g in kicks:
        e = min(L, pos + len(shape))
        if pos < L:
            seg = 1 - (1 - shape[:e - pos]) * min(1.0, g)
            pump[pos:e] = np.minimum(pump[pos:e], seg)
    for k in ('bass', 'stab', 'pad', 'arp'):
        bus[k] *= pump

    # ---- mix
    G = {'bass': 0.5, 'sub': 0.42, 'stab': 0.24, 'lead': 0.44, 'arp': 0.12, 'pad': 0.5, 'drums': 0.62, 'fx': 0.4}
    mix = np.zeros((2, L))
    for k, v in bus.items():
        mix += v * G[k]
    dly = stereo_delay(send_dly * 0.5, SPB * 0.75, fb=0.38, wet=0.8, damp=3600)
    rev = reverb(send_rev * 0.45 + dly * 0.25, size=0.9, damp=3200, wet=0.5)
    mix += dly + rev
    # ---- fold the tail onto the start: the song is a circle
    loop = mix[:, :N].copy()
    if circle:
        loop[:, :TAIL] += mix[:, N:N + TAIL]
    return master(loop) if master_mode == 'song' else loop


def master(x):
    """Bus glue on the circle: highpass, a slow compressor with 3 s of pre-roll taken from the
    loop's own end, gentle tanh, normalise."""
    pre = int(3 * SR)
    y = np.concatenate([x[:, -pre:], x], axis=1)
    b, a = sg.butter(2, 32 / (SR / 2), 'high')
    y = sg.filtfilt(b, a, y, axis=1)
    env = np.abs(y).max(0)
    bb, aa = sg.butter(1, 8 / (SR / 2))
    envf = sg.lfilter(bb, aa, env)
    thr = np.percentile(envf, 70)
    gain = np.where(envf > thr, (thr + (envf - thr) * 0.5) / np.maximum(envf, 1e-9), 1.0)
    y = y * gain
    y = y[:, pre:]
    return level(y, target_db=-14.0)


def level(y, target_db=-14.0, ceiling=0.95):
    """Scale to a target RMS, then round off only the peaks that would pass the ceiling."""
    rms = np.sqrt(np.mean(y ** 2)) + 1e-12
    y = y * (10 ** (target_db / 20) / rms)
    knee = 0.8
    over = np.abs(y) > knee
    y[over] = np.sign(y[over]) * (knee + (ceiling - knee) * np.tanh((np.abs(y[over]) - knee) / (ceiling - knee)))
    return y


def export_midi(path):
    """A type-1 MIDI file, one track per part, 480 ticks per beat, for FL Studio."""
    import struct
    TPB = 480
    tick = lambda smp_: int(round(smp_ / SR / SPB * TPB))
    def vlq(v):
        out = [v & 0x7F]; v >>= 7
        while v: out.insert(0, (v & 0x7F) | 0x80); v >>= 7
        return bytes(out)
    def trk(events):
        data, last = b'', 0
        for t, msg in sorted(events, key=lambda e: (e[0], e[1][0] & 0xF0 == 0x90)):
            data += vlq(t - last) + msg; last = t
        data += b'\x00\xff\x2f\x00'
        return b'MTrk' + struct.pack('>I', len(data)) + data
    tempo = b'\x00\xff\x51\x03' + struct.pack('>I', int(60e6 / BPM))[1:] + b'\x00\xff\x58\x04\x04\x02\x18\x08'
    tracks = [b'MTrk' + struct.pack('>I', len(tempo) + 4) + tempo + b'\x00\xff\x2f\x00']
    order = ['lead', 'harmony', 'bass', 'sub', 'stabs', 'arp', 'pad', 'drums']
    for ch, name in enumerate(order):
        c = 9 if name == 'drums' else ch
        nm = name.encode()
        ev = [(0, b'\xff\x03' + vlq(len(nm)) + nm)]
        for tr, pos, n, m, v in NOTES:
            if tr != name: continue
            vel = max(1, min(127, int(v * 110)))
            ev.append((tick(pos), bytes([0x90 | c, m, vel])))
            ev.append((tick(pos + n), bytes([0x80 | c, m, 0])))
        tracks.append(trk(ev))
    with open(path, 'wb') as f:
        f.write(b'MThd' + struct.pack('>IHHH', 6, 1, len(tracks), TPB) + b''.join(tracks))


# Per-section loudness (dB RMS) for the game's cut: quiet while they're out of sight, the drops
# at the song's level, the climax a touch over it. A fixed gain per section (no compressor
# riding across the joins) keeps every loop seamless.
SECTION_DB = {'stalk': -20.5, 'dropA': -14.5, 'riffB': -14.5, 'break': -18.5, 'dropA2': -14.3,
              'bridge': -14.0, 'climax': -13.4}


def render_sections():
    """Each game section on its own circle, levelled, laid end to end on exact bar lines."""
    b, a = sg.butter(2, 32 / (SR / 2), 'high')
    parts, table, bar = [], [], 0
    for sec in GAME_SECTIONS:
        y = render([sec], circle=True, master_mode='section')
        # the 32 Hz highpass as a circle too: filter three copies and keep the middle one
        z = sg.filtfilt(b, a, np.concatenate([y, y, y], axis=1), axis=1)[:, y.shape[1]:2 * y.shape[1]]
        z = level(z, target_db=SECTION_DB[sec[0]])
        parts.append(z)
        table.append({'name': sec[0], 'bar': bar, 'bars': sec[1]})
        bar += sec[1]
    return np.concatenate(parts, axis=1), table


if __name__ == '__main__':
    import json, time
    out = sys.argv[1] if len(sys.argv) > 1 else 'out'
    os.makedirs(out, exist_ok=True)
    t0 = time.time()
    y = render()
    write_wav(os.path.join(out, 'fight_day01.wav'), y)
    export_midi(os.path.join(out, 'fight_day01.mid'))
    print(f'fight_day01: {y.shape[1] / SR:.2f}s, {BPM} bpm, {BARS} bars, rendered in {time.time() - t0:.1f}s', flush=True)
    t0 = time.time()
    z, table = render_sections()
    write_wav(os.path.join(out, 'fight_day01_sections.wav'), z)
    meta = {'bpm': BPM, 'beatsPerBar': 4, 'barSeconds': BAR_S, 'sections': table}
    json.dump(meta, open(os.path.join(out, 'fight_day01_sections.json'), 'w'), indent=1)
    print(f'fight_day01_sections: {z.shape[1] / SR:.2f}s, {sum(t["bars"] for t in table)} bars in {len(table)} sections, rendered in {time.time() - t0:.1f}s')
