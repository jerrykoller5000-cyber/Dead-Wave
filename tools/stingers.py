"""Dead-Wave chiptune stingers and cues (CL-36), in the voices of the day-1 fight song.

  python3 stingers.py out/   ->  sting_*.wav and cue_*.wav
Each one is a short, finished phrase: it plays alone (the director cuts all music first).
The alarm ends on E, where the day-1 song begins.

CL-43 (Jerry: "make the stingers for day 1 as good as possible"), with D-28 the sky following
the loop:
  alarm  is now the nightfall too: exactly two bars of the song's tempo (5.0 s) while the sky
         goes dark over the alarm's five seconds, the siren in the first bar, the night coming
         down in the second (the hook's notes falling E-D-C-B over the engine waking), and the
         band's hit on E landing on the downbeat of bar three, the moment night is down.
  clear  is now the dawn too: the finisher's slow motion and the sky's turn to morning both run
         for exactly its length (7.5 s, three bars at 76). The hook, slowed, lifts from E minor
         to E major while a pad swells up under it like the light, and it ends on a ringing E
         major chord with a sunrise arpeggio on top.
  dawn   is now a short cue (2.6 s): the dawn card's chime (GP-34).
"""
import sys, os
import numpy as np
from synth import SR, adsr, lowpass, highpass, bandpass, reverb, stereo_delay, add_at, midi_to_hz, write_wav
from chip import pulse, tri_stepped, lfsr_noise
import day1 as D


def buf(sec):
    return np.zeros((2, int(sec * SR)))


def at(t):
    return int(t * SR)


def lead(b, t, m, dur, g=1.0, pan=0.0, dark=0.0, sends=None):
    sig = D.v_lead(m, int(dur * SR) + int(0.08 * SR), dark)
    add_at(b, sig, at(t), g, pan)
    if sends is not None:
        add_at(sends, sig, at(t), g * 0.5, pan)


def arp(b, t, m, dur, g=0.7, pan=0.0):
    add_at(b, D.v_arp(m, int(dur * SR)), at(t), g, pan)


def bass(b, t, m, dur, g=0.8, bright=0.7):
    add_at(b, D.v_bass(m, int(dur * SR), bright), at(t), g, 0)


def kick(b, t, g=1.0):
    add_at(b, D.d_kick(), at(t), g, 0)


def snare(b, t, g=1.0, big=True):
    add_at(b, D.d_snare(big), at(t), 0.7 * g, 0)


def crash(b, t, g=0.6):
    add_at(b, D.d_crash(), at(t), g, -0.2)


def chord(b, t, root, ivs, dur, g=0.5, duty=0.5, fc=2600):
    n = int(dur * SR)
    x = np.zeros(n)
    for iv in ivs:
        f = midi_to_hz(root + iv)
        x += pulse(f, n, duty) + 0.5 * pulse(f * 2 ** (8 / 1200), n, duty)
    x = lowpass(x, fc) * adsr(n, 0.004, 0.25, 0.6, min(0.9, dur * 0.45)) / len(ivs)
    add_at(b, x, at(t), g, 0)


def finish(dry, sends, rev_wet=0.5, dly=None, target_db=-13.0):
    out = dry.copy()
    if dly:
        out += stereo_delay(sends, dly, fb=0.35, wet=0.7, damp=3600)
    out += reverb(sends + dry * 0.25, size=0.95, damp=3200, wet=rev_wet)
    n = out.shape[1]
    fo = int(0.25 * SR)
    out[:, -fo:] *= np.linspace(1, 0, fo)
    out = out / (np.max(np.abs(out)) + 1e-9) * 0.7
    out = np.tanh(out * 1.2) / np.tanh(1.2)
    return D.level(out, target_db=target_db)

E3, E4, G4, A4, B4, C5, D5, E5, Fs5, G5, B5, E6 = 52, 64, 67, 69, 71, 72, 74, 76, 78, 79, 83, 88


def s_alarm():
    """The alarm and the nightfall: two bars at 96 (5.0 s) and the hit's ring. 6.3 s."""
    spb = 60 / 96
    L = 6.3
    b, s = buf(L), buf(L)
    # bar 1: the siren, a pitch-swept pulse wailing E up to B and back, twice
    n = at(2.5); t = np.arange(n) / SR
    f = midi_to_hz(64) * 2 ** ((7 * (0.5 - 0.5 * np.cos(2 * np.pi * t / 1.25))) / 12)
    ph = np.cumsum(f / SR) % 1.0
    sir = np.where(ph < 0.25, 1.0, -1.0) + 0.55 * np.where((ph * 2.0 + 0.1) % 1 < 0.125, 1.0, -1.0)
    sir = lowpass(sir, 4200) * np.minimum(1, t / 0.12) * (1 - 0.35 * (t / 2.5))
    add_at(b, sir * 0.34, 0, 1.0, -0.2); add_at(s, sir * 0.22, 0, 1.0, 0.2)
    # the march under it: snare 8ths, kick on the beats, tightening into bar 2
    for k in range(8):
        snare(b, k * spb / 2, 0.22 + 0.03 * k, big=False)
    for k in range(4):
        kick(b, k * spb, 0.55 + 0.05 * k)
    # bar 2: night comes down. The hook's notes fall E-D-C-B over the engine waking in 16ths.
    b2 = 4 * spb
    for k in range(16):
        g = 0.35 + 0.45 * k / 15
        bass(b, b2 + k * spb / 4, 40 if k % 4 else 40, spb / 4 * 0.9, g=g, bright=0.25 + 0.55 * k / 15)
    for i, m in enumerate([E5, D5, C5, B4]):
        lead(b, b2 + i * spb, m, spb * 0.92, g=0.62 - 0.04 * i, dark=0.2 + 0.1 * i, sends=s)
    for k in range(8):
        snare(b, b2 + 2 * spb + k * spb / 4, 0.3 + 0.07 * k, big=False)
    kick(b, b2, 0.8); kick(b, b2 + 2 * spb, 0.85)
    # a riser into the hit
    n2 = at(4 * spb); tt = np.arange(n2) / n2
    ris = (highpass(lfsr_noise(n2, rate=30000), 3000) * tt ** 2.2) * 0.35
    add_at(b, ris, at(b2), 1.0, 0.0)
    # bar 3, beat 1: the hit on E, as the night is fully down
    th = 8 * spb
    kick(b, th, 1.2); snare(b, th, 1.0); crash(b, th, 0.75)
    chord(b, th, 40, (0, 7, 12, 19, 24), 1.25, g=0.95, duty=0.25, fc=3200)
    bass(b, th, 28, 1.2, g=0.95, bright=0.9)
    lead(b, th, E5, 1.1, g=0.55, sends=s)
    return finish(b, s, rev_wet=0.42, target_db=-13.0)


def s_clear():
    """CL-50 (Jerry, 2026-09-25): the last kill, short and hard to match the 3 s finisher. A hit on
    the kill (the band's E power chord, kick and crash) while time all but stops, three quick
    notes of the hook climbing out of it, and a ringing E major chord with a sparkle on top. 2.6 s
    (the Night N Complete card's chime follows it)."""
    L = 2.6
    b, s = buf(L), buf(L)
    kick(b, 0.0, 1.25); crash(b, 0.0, 0.55); snare(b, 0.0, 0.7)
    chord(b, 0.0, 40, (0, 7, 12, 19), 0.55, g=0.7, duty=0.25, fc=2200)
    bass(b, 0.0, 28, 0.5, g=0.9, bright=0.8)
    for t, m, ln in [(0.36, 64, 0.16), (0.53, 67, 0.16), (0.70, 71, 0.2)]:
        lead(b, t, m, ln, g=0.62, sends=s)
    lead(b, 0.92, 68, 1.45, g=0.66, sends=s)                 # G#: the major third, the relief
    chord(b, 0.92, 52, (0, 7, 12, 16), 1.6, g=0.5)
    bass(b, 0.92, 40, 0.9, g=0.6, bright=0.4); kick(b, 0.92, 0.8)
    for i in range(6):
        arp(b, 1.0 + i * 0.07, [76, 80, 83, 88, 92, 95][i], 0.14, g=0.26 + 0.02 * i, pan=0.35 * np.sin(i))
    return finish(b, s, rev_wet=0.5, dly=0.21, target_db=-13.0)


def s_camp():
    """CL-52 (Jerry): a camp cleared in daylight. Two seconds, soft, played while the fight music
    fades out under it: a rising B-E, a small E major chord and a glint on top."""
    L = 2.0
    b, s = buf(L), buf(L)
    lead(b, 0.0, 71, 0.22, g=0.5, sends=s); lead(b, 0.22, 76, 0.9, g=0.52, sends=s)
    chord(b, 0.22, 52, (0, 7, 12, 16), 1.3, g=0.34, duty=0.5, fc=1600)
    bass(b, 0.22, 40, 0.6, g=0.42, bright=0.3)
    for i, m in enumerate([83, 88, 92]):
        arp(b, 0.42 + i * 0.08, m, 0.14, g=0.22, pan=0.3 * np.sin(i + 1))
    return finish(b, s, rev_wet=0.45, dly=0.18, target_db=-16.5)


def c_dawn():
    """The dawn card's chime: an E major arpeggio, a soft bell. 2.6 s."""
    b, s = buf(2.6), buf(2.6)
    for i, m in enumerate([64, 68, 71, 76, 80]):
        arp(b, i * 0.11, m + 12, 0.45, g=0.42, pan=0.3 * np.sin(i))
        add_at(s, D.v_arp(m + 12, int(0.45 * SR)), at(i * 0.11), 0.3, 0)
    chord(b, 0.5, 52, (0, 7, 12, 16), 1.8, g=0.32, duty=0.5, fc=1500)
    lead(b, 0.55, 88, 1.2, g=0.28, dark=0.35, sends=s)
    return finish(b, s, rev_wet=0.6, dly=0.33, target_db=-17.0)


def s_dawn():
    """Morning: a slow major arpeggio rising out of a held low note, a soft hook quote. 8 s."""
    b, s = buf(8.0), buf(8.0)
    root = 52   # E3 -> E major
    chord(b, 0, root, (0, 7, 12, 16), 7.0, g=0.35, duty=0.5, fc=1400)
    notes = [64, 68, 71, 76, 71, 76, 80, 83, 80, 83, 88]
    for i, m in enumerate(notes):
        arp(b, 0.4 + i * 0.42, m, 0.5, g=0.45, pan=0.25 * np.sin(i * 0.8))
        add_at(s, D.v_arp(m, int(0.5 * SR)), at(0.4 + i * 0.42), 0.3, 0)
    lead(b, 5.0, 76, 1.2, g=0.35, dark=0.4, sends=s); lead(b, 6.1, 80, 1.6, g=0.35, dark=0.4, sends=s)
    return finish(b, s, rev_wet=0.6, dly=0.42 * 1.5, target_db=-14.5)


def s_night():
    """Night falls: a descending minor line over a low pulsing E, the engine waking. 8 s."""
    b, s = buf(8.0), buf(8.0)
    spb = 60 / 96
    for k in range(int(7.2 / (spb / 2))):
        g = 0.25 + 0.5 * k / (7.2 / (spb / 2))
        bass(b, k * spb / 2, 40 if k % 4 else 40, spb / 2 * 0.9, g=g, bright=0.25 + 0.4 * k / 24)
    for i, (t, m, ln) in enumerate([(0.2, 76, 1.2), (1.4, 74, 1.2), (2.6, 72, 1.2), (3.8, 71, 2.4), (6.2, 64, 1.6)]):
        lead(b, t, m, ln, g=0.5, dark=0.5, sends=s)
    kick(b, 3.8, 0.7); kick(b, 6.2, 0.9)
    chord(b, 6.2, 40, (0, 7, 12, 15), 1.7, g=0.5, fc=1200)
    return finish(b, s, rev_wet=0.55, dly=spb * 0.75)


def s_ember():
    """Ember Night: the phrygian menace (E to F) hammered on stabs, a wailing lead, fire noise. 8 s."""
    b, s = buf(8.0), buf(8.0)
    spb = 60 / 96
    for bar in range(3):
        for st in range(16):
            root = 40 if (bar * 16 + st) // 8 % 2 == 0 else 41
            bass(b, (bar * 16 + st) * spb / 4, root, spb / 4 * 0.9, g=0.8 if st % 4 == 0 else 0.6, bright=0.8)
        kick(b, bar * 4 * spb); kick(b, (bar * 4 + 1.5) * spb, 0.8); snare(b, (bar * 4 + 2) * spb)
        for st in (2, 6, 10, 14):
            chord(b, (bar * 16 + st) * spb / 4, 52 if st < 8 else 53, (0, 7, 12), spb / 4 * 1.5, g=0.35, duty=0.25)
    for t, m, ln in [(0, 76, 0.9), (0.95, 77, 0.9), (1.9, 76, 0.45), (2.4, 74, 0.45), (2.9, 76, 2.0), (5.0, 77, 1.0), (6.0, 88, 1.8)]:
        lead(b, t, m, ln, g=0.65, sends=s)
    n = at(8.0); t = np.arange(n) / SR
    fire = bandpass(lfsr_noise(n, rate=12000), 400, 3000) * (0.1 + 0.1 * np.sin(2 * np.pi * 3 * t) ** 2) * np.minimum(1, t)
    add_at(b, fire, 0, 0.5, 0.3)
    crash(b, 6.0, 0.6); kick(b, 6.0, 1.1)
    chord(b, 6.0, 40, (0, 1, 7, 12), 1.8, g=0.6, duty=0.25)
    return finish(b, s, rev_wet=0.45)


def s_guardian():
    """The guardian: three low stabs, each a half-step up, and a screeching pulse. 4.4 s."""
    b, s = buf(4.4), buf(4.4)
    for k, (t, root) in enumerate([(0, 28), (0.9, 29), (1.8, 30)]):
        kick(b, t, 1.1); crash(b, t, 0.25)
        chord(b, t, root + 12, (0, 6, 12), 0.8, g=0.7, duty=0.25, fc=1800)
        bass(b, t, root, 0.8, g=0.9, bright=0.6)
    n = at(1.6); tt = np.arange(n) / SR
    f = 900 * 2 ** (tt * 1.5) * (1 + 0.03 * np.sin(2 * np.pi * 31 * tt))
    ph = np.cumsum(f / SR) % 1.0
    scr = lowpass(np.where(ph < 0.125, 1.0, -1.0), 7000) * np.minimum(1, tt / 0.05) * np.exp(-tt * 0.8)
    add_at(b, scr, at(2.6), 0.35, 0.2); add_at(s, scr, at(2.6), 0.4, 0.2)
    kick(b, 2.6, 1.2)
    return finish(b, s, rev_wet=0.5)


def c_achievement():
    b, s = buf(2.6), buf(2.6)
    for i, m in enumerate([64, 68, 71, 76]):
        arp(b, i * 0.09, m + 12, 0.25, g=0.6)
    chord(b, 0.4, 64, (0, 4, 7, 12), 1.6, g=0.45, duty=0.25, fc=4000)
    lead(b, 0.4, 88, 1.2, g=0.35, sends=s)
    for i in range(6):
        arp(b, 0.5 + i * 0.12, [95, 100, 95, 100, 103, 107][i], 0.12, g=0.2, pan=0.4 * (-1) ** i)
    return finish(b, s, rev_wet=0.4, dly=0.19, target_db=-16.0)


def c_airdrop():
    """CL-52 (Jerry): the airdrop is a sound effect now, not a stinger: a falling whistle and the
    crate's thump. 1.0 s."""
    L = 1.0
    b, s = buf(L), buf(L)
    n = at(0.62); t = np.arange(n) / SR
    f = 1900 * 2 ** (-t * 2.6)
    ph = np.cumsum(f / SR) % 1.0
    wh = lowpass(np.where(ph < 0.5, 1.0, -1.0), 4200) * np.minimum(1, t / 0.04) * (1 - t / 0.62) ** 0.6
    add_at(b, wh, 0, 0.22, 0.15); add_at(s, wh, 0, 0.15, 0.15)
    kick(b, 0.62, 1.0); add_at(b, D.d_snare(False), at(0.62), 0.25, 0)
    return finish(b, s, rev_wet=0.25, target_db=-17.0)


def c_objective():
    """CL-52 (Jerry): supplies collected, a sound effect: a bright double blip. 0.6 s."""
    L = 0.6
    b, s = buf(L), buf(L)
    arp(b, 0.0, 83, 0.09, g=0.55, pan=-0.1); arp(b, 0.085, 88, 0.2, g=0.55, pan=0.1)
    add_at(s, D.v_arp(88, int(0.2 * SR)), at(0.085), 0.2, 0)
    return finish(b, s, rev_wet=0.3, dly=0.12, target_db=-17.5)


def c_poi():
    b, s = buf(2.4), buf(2.4)
    for i, m in enumerate([64, 67, 71, 74, 76]):
        arp(b, i * 0.1, m + 12, 0.3, g=0.5, pan=0.3 * np.sin(i))
    chord(b, 0.5, 64, (0, 7, 12, 16), 1.5, g=0.4, duty=0.25)
    return finish(b, s, rev_wet=0.45, dly=0.2, target_db=-17.5)


ALL = {'sting_alarm': s_alarm, 'sting_clear': s_clear, 'sting_dawn': c_dawn, 'sting_night_falls': s_night,
       'sting_ember': s_ember, 'sting_guardian': s_guardian, 'cue_achievement': c_achievement,
       'cue_airdrop': c_airdrop, 'cue_objective': c_objective, 'cue_poi_cleared': c_poi, 'sting_camp': s_camp}

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'out'
    os.makedirs(out, exist_ok=True)
    for name in (sys.argv[2:] or ALL):
        y = ALL[name]()
        write_wav(os.path.join(out, name + '.wav'), y)
        print(f'{name}: {y.shape[1] / SR:.2f}s', flush=True)
