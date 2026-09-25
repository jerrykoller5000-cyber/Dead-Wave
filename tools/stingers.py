"""Dead-Wave chiptune stingers and cues (CL-36), in the voices of the day-1 fight song.

  python3 stingers.py out/   ->  sting_*.wav and cue_*.wav
Each one is a short, finished phrase: it plays alone (the director cuts all music first).
The alarm ends on E, where the day-1 song begins.
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
    """A chip air-raid siren: the pulse lead wailing E-B-E up the octave over a snare march,
    then the band hits on E. 6.4 s."""
    b, s = buf(6.4), buf(6.4)
    # siren: a pitch-swept pulse, three wails
    n = at(4.2); t = np.arange(n) / SR
    f = midi_to_hz(64) * 2 ** ((7 + 5 * np.sin(2 * np.pi * t / 1.4 - np.pi / 2)) / 12)
    ph = np.cumsum(f / SR) % 1.0
    sir = np.where(ph < 0.25, 1.0, -1.0) + 0.6 * np.where((ph * 2.0 + 0.1) % 1 < 0.125, 1.0, -1.0)
    sir = lowpass(sir, 4000) * np.minimum(1, t / 0.3)
    add_at(b, sir * 0.35, 0, 1.0, -0.15); add_at(s, sir * 0.2, 0, 1.0, 0.15)
    # march: snare on every beat at 96 bpm, kick doubles in the last bar, tightening
    spb = 60 / 96
    for k in range(7):
        snare(b, k * spb, 0.35 + 0.08 * k, big=False)
        kick(b, k * spb, 0.5 + 0.05 * k)
    for k in range(8):
        snare(b, 7 * spb * 0.98 + k * spb / 4 * 0.6, 0.4 + 0.07 * k, big=False)
    # the hit on E: kick, crash, power chord, bass
    th = 4.45
    kick(b, th, 1.2); snare(b, th, 1.0); crash(b, th, 0.7)
    chord(b, th, 40, (0, 7, 12, 19, 24), 1.9, g=0.9, duty=0.25, fc=3200)
    bass(b, th, 28, 1.8, g=0.9, bright=0.9)
    lead(b, th, E5, 1.6, g=0.6, sends=s)
    return finish(b, s, rev_wet=0.45)


def s_clear():
    """The wave is over: the hook's first phrase, slowed, lifting from E minor to E major, and a
    long ringing chord. 7.2 s (the finisher's slow motion runs for exactly this long)."""
    b, s = buf(7.2), buf(7.2)
    spb = 60 / 76
    phrase = [(0, 1.5, E4), (1.5, 1.5, G4), (3, 1, B4), (4, 1, A4), (5, 1, G4), (6, 2, 68)]   # ends on G#: major
    for bt, ln, m in phrase:
        lead(b, bt * spb, m, ln * spb * 0.95, g=0.75, sends=s)
    for k, (bt, root, ivs) in enumerate([(0, 40, (0, 7, 12, 15)), (4, 36, (0, 7, 12, 16)), (6, 40, (0, 7, 12, 16, 19))]):
        chord(b, bt * spb, root + 12, ivs, (8 - bt) * spb + 1.2, g=0.45 if k < 2 else 0.55)
        bass(b, bt * spb, root, (2 if k < 2 else 3.2) * spb, g=0.6, bright=0.4)
    for i in range(8):   # sparkle arp over the final chord
        arp(b, 6 * spb + i * spb / 4, [64, 68, 71, 76, 80, 83, 88, 83][i] + 12, 0.18, g=0.35, pan=0.3 * np.sin(i))
    crash(b, 6 * spb, 0.35)
    return finish(b, s, rev_wet=0.55, dly=spb * 0.75)


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
    b, s = buf(2.2), buf(2.2)
    n = at(1.1); t = np.arange(n) / SR
    f = 1800 * 2 ** (-t * 2.2)
    ph = np.cumsum(f / SR) % 1.0
    wh = lowpass(np.where(ph < 0.5, 1.0, -1.0), 5000) * np.minimum(1, t / 0.05) * (1 - t / 1.1)
    add_at(b, wh, 0, 0.3, 0.2); add_at(s, wh, 0, 0.3, 0.2)
    kick(b, 1.1, 1.0); add_at(b, D.d_snare(True), at(1.1), 0.4, 0)
    chord(b, 1.1, 52, (0, 7, 12), 0.9, g=0.4, duty=0.25)
    return finish(b, s, rev_wet=0.4, target_db=-16.0)


def c_objective():
    b, s = buf(3.4), buf(3.4)
    lead(b, 0.0, 71, 0.28, g=0.6, sends=s); lead(b, 0.3, 76, 0.28, g=0.6, sends=s); lead(b, 0.6, 83, 1.1, g=0.6, sends=s)
    chord(b, 0.6, 52, (0, 7, 12, 16), 2.2, g=0.4)
    bass(b, 0.6, 40, 0.6, g=0.5, bright=0.5); kick(b, 0.6, 0.7)
    return finish(b, s, rev_wet=0.5, dly=0.3, target_db=-16.0)


def c_poi():
    b, s = buf(2.4), buf(2.4)
    for i, m in enumerate([64, 67, 71, 74, 76]):
        arp(b, i * 0.1, m + 12, 0.3, g=0.5, pan=0.3 * np.sin(i))
    chord(b, 0.5, 64, (0, 7, 12, 16), 1.5, g=0.4, duty=0.25)
    return finish(b, s, rev_wet=0.45, dly=0.2, target_db=-17.5)


ALL = {'sting_alarm': s_alarm, 'sting_clear': s_clear, 'sting_dawn': s_dawn, 'sting_night_falls': s_night,
       'sting_ember': s_ember, 'sting_guardian': s_guardian, 'cue_achievement': c_achievement,
       'cue_airdrop': c_airdrop, 'cue_objective': c_objective, 'cue_poi_cleared': c_poi}

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'out'
    os.makedirs(out, exist_ok=True)
    for name in (sys.argv[2:] or ALL):
        y = ALL[name]()
        write_wav(os.path.join(out, name + '.wav'), y)
        print(f'{name}: {y.shape[1] / SR:.2f}s', flush=True)
