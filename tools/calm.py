"""Dead-Wave · day 1's calm music in First Blood's voices (CL-47).

Jerry's orders: chiptune is the way, and day 1's music as good as it can be. The fights and the
stings were already chip; the menu and the prep music were the older synth tracks, so day 1
changed sound four times a day. These three are made from the same pulse, triangle and noise
voices as First Blood (tools/day1.py), in its key, around its hook, so the whole day is one
piece of music:

  menu_theme    72 bpm, 20 bars. The hook as a slow theme over a pad and a heartbeat: the
                title screen tells you the tune you'll be fighting to.
  calm_morning  84 bpm, 24 bars, G major (the hook's relative major). Prep after the dawn:
                bright arps, a walking triangle bass, a soft kick and hats, the hook turned
                hopeful.
  calm_day      90 bpm, 24 bars, E minor. The long afternoon of prep: the engine idling low,
                the hook's shape in the arps, space to think, and the last four bars leaning
                toward the alarm.
Each is a circle (its tails folded onto its start), so the pool's repeats sit cleanly.

  python3 calm.py out/  ->  out/menu_theme.wav, out/calm_morning.wav, out/calm_day.wav
"""
import sys, os
import numpy as np
import scipy.signal as sg
from synth import SR, adsr, lowpass, highpass, reverb, stereo_delay, add_at, midi_to_hz, write_wav
from chip import pulse, tri_stepped, lfsr_noise
import day1 as D

E3, G3, A3, B3, C4, D4, E4, Fs4, G4, A4, B4, C5, D5, E5, Fs5, G5, A5, B5 = 52, 55, 57, 59, 60, 62, 64, 66, 67, 69, 71, 72, 74, 76, 78, 79, 81, 83


class Track:
    def __init__(self, bpm, bars):
        self.bpm = bpm; self.spb = 60.0 / bpm; self.bars = bars
        self.N = int(round(bars * 4 * self.spb * SR)); self.TAIL = int(6 * SR)
        L = self.N + self.TAIL
        self.dry = np.zeros((2, L)); self.rev = np.zeros((2, L)); self.dly = np.zeros((2, L))
        self.kicks = []
    def t(self, bar, beat=0.0):
        return int(round((bar * 4 + beat) * self.spb * SR))
    def lead(self, bar, beat, m, beats, g=0.5, dark=0.3, echo=0.6, pan=0.08):
        n = int(beats * self.spb * SR * 0.95) + int(0.1 * SR)
        sig = D.v_lead(m, n, dark)
        add_at(self.dry, sig, self.t(bar, beat), g, pan)
        add_at(self.dly, sig, self.t(bar, beat), g * echo, pan)
        add_at(self.rev, sig, self.t(bar, beat), g * 0.4, pan)
    def arp(self, bar, beat, m, beats, g=0.35, pan=0.0, rev=0.3):
        sig = D.v_arp(m, int(beats * self.spb * SR))
        add_at(self.dry, sig, self.t(bar, beat), g, pan); add_at(self.dly, sig, self.t(bar, beat), g * 0.5, pan)
        add_at(self.rev, sig, self.t(bar, beat), g * rev, pan)
    def pad(self, bar, root, ivs, bars=1.0, g=0.35, fc=900):
        n = int(bars * 4 * self.spb * SR * 1.05)
        x = np.zeros(n)
        for iv in ivs:
            f = midi_to_hz(root + iv)
            x += pulse(f, n, 0.5) + pulse(f * 2 ** (6 / 1200), n, 0.5)
        tt = np.arange(n) / SR
        x = lowpass(x, fc) * (0.88 + 0.12 * np.sin(2 * np.pi * 4.8 * tt)) * adsr(n, 0.8, 0.6, 0.85, 1.2) / (2 * len(ivs))
        add_at(self.dry, x, self.t(bar), g, -0.25); add_at(self.dry, x, self.t(bar), g, 0.25)
        add_at(self.rev, x, self.t(bar), g * 0.6, 0)
    def bass(self, bar, beat, m, beats, g=0.45, tri=True):
        n = int(beats * self.spb * SR * 0.92)
        f = midi_to_hz(m)
        x = (tri_stepped(f, n) if tri else 0.6 * pulse(f, n, 0.25) + 0.5 * tri_stepped(f / 2, n))
        x = lowpass(x, 900) * adsr(n, 0.01, 0.2, 0.7, 0.08)
        add_at(self.dry, x, self.t(bar, beat), g, 0)
    def kick(self, bar, beat, g=0.5):
        add_at(self.dry, D.d_kick(1.2), self.t(bar, beat), g, 0); self.kicks.append((self.t(bar, beat), g))
    def hat(self, bar, beat, g=0.12, open_=False, pan=0.3):
        add_at(self.dry, D.d_hat(open_), self.t(bar, beat), g, pan)
    def render(self, target_db):
        L = self.dry.shape[1]
        pump = np.ones(L); tt = np.arange(int(0.3 * SR)) / SR; shape = 1 - 0.3 * np.exp(-tt / 0.09)
        for pos, g in self.kicks:
            e = min(L, pos + len(shape)); pump[pos:e] = np.minimum(pump[pos:e], 1 - (1 - shape[:e - pos]) * g)
        mix = self.dry * pump
        dl = stereo_delay(self.dly * 0.5, self.spb * 0.75, fb=0.42, wet=0.8, damp=3000)
        rv = reverb(self.rev * 0.5 + dl * 0.3, size=1.0, damp=3000, wet=0.6)
        mix = mix + dl + rv
        loop = mix[:, :self.N].copy(); loop[:, :self.TAIL] += mix[:, self.N:self.N + self.TAIL]
        b, a = sg.butter(2, 32 / (SR / 2), 'high')
        n = loop.shape[1]
        z = sg.filtfilt(b, a, np.concatenate([loop, loop, loop], axis=1), axis=1)[:, n:2 * n]
        return D.level(z, target_db=target_db)


def menu_theme():
    T = Track(72, 20)
    prog = ['Em', 'C', 'G', 'D'] * 5
    roots = {'Em': 40, 'C': 36, 'G': 43, 'D': 38, 'Am': 45, 'B': 35}
    for bar, ch in enumerate(prog):
        r = roots[ch]
        T.pad(bar, r + 24, (0, 7, 12, 15 if ch == 'Em' else 16), g=0.5 if bar < 16 else 0.4)
        T.bass(bar, 0, r, 3.5, g=0.4)
        if bar >= 4:
            T.kick(bar, 0, 0.35); T.kick(bar, 0.75, 0.22)          # the heartbeat
        if bar >= 8:
            for k in range(8):                                      # arps, the chord climbing
                tones = [r + 24, r + 31, r + 36, r + 39 if ch == 'Em' else r + 40]
                T.arp(bar, k * 0.5, tones[k % 4] + 12, 0.45, g=0.2 + 0.05 * (k % 4 == 0), pan=0.4 * np.sin(k + bar))
    # the hook as a slow theme, twice: bars 4-7 and 12-15 (an octave up the second time)
    hook = [(0, 1.5, E4), (1.5, 1.5, G4), (3, 1, B4), (4, 1, A4), (5, 1, G4), (6, 2, Fs4),
            (8, 1.5, E4), (9.5, 1.5, G4), (11, 1, B4), (12, 1.5, D5), (13.5, 1.5, C5), (15, 1, B4)]
    for oc, bar0, g in ((0, 4, 0.5), (12, 12, 0.42)):
        for bt, ln, m in hook:
            T.lead(bar0 + int(bt // 4), bt % 4, m + oc, ln, g=g, dark=0.35, echo=0.7)
    # bars 16-19: the hook's answer, falling home
    for bt, ln, m in [(0, 2, C5), (2, 2, B4), (4, 2, A4), (6, 2, Fs4), (8, 4, G4), (12, 4, E4)]:
        T.lead(16 + int(bt // 4), bt % 4, m, ln, g=0.4, dark=0.45, echo=0.8)
    return T.render(-18.5)


def calm_morning():
    T = Track(84, 24)
    prog = ['G', 'D', 'Em', 'C'] * 6
    roots = {'G': 43, 'D': 38, 'Em': 40, 'C': 36}
    third = {'G': 16, 'D': 16, 'Em': 15, 'C': 16}
    for bar, ch in enumerate(prog):
        r = roots[ch]
        T.pad(bar, r + 24, (0, 7, 12, third[ch]), g=0.32, fc=1300)
        # a walking triangle bass: root, fifth, octave, fifth
        for k, iv in enumerate((0, 7, 12, 7)):
            T.bass(bar, k, r + iv, 0.95, g=0.38)
        if bar >= 2:
            T.kick(bar, 0, 0.32); T.kick(bar, 2.5, 0.2)
            for k in range(8): T.hat(bar, k * 0.5, 0.09 + 0.04 * (k % 2 == 1), pan=0.35)
        # sixteenth arps, up and down the chord, bright
        tones = [r + 24, r + 24 + third[ch] - 12 + 12, r + 31, r + 36]
        for k in range(16):
            m = tones[[0, 1, 2, 3, 2, 1, 2, 3][k % 8]] + 12
            T.arp(bar, k * 0.25, m, 0.22, g=0.16 + 0.06 * (k % 4 == 0), pan=0.45 * np.sin(k * 0.7))
    # the hook turned hopeful (in G major), bars 8-15, and again brighter 16-23
    hook = [(0, 1, B4), (1, 1, D5), (2, 2, G5), (4, 1, Fs5), (5, 1, E5), (6, 2, D5),
            (8, 1, B4), (9, 1, D5), (10, 2, G5), (12, 1, A5), (13, 1, G5), (14, 2, Fs5)]
    for bar0, g in ((8, 0.4), (16, 0.44)):
        for bt, ln, m in hook:
            T.lead(bar0 + int(bt // 4), bt % 4, m, ln, g=g, dark=0.25, echo=0.55)
        for bt, ln, m in hook:
            T.lead(bar0 + 4 + int(bt // 4), bt % 4, m - 12 + (0 if bt < 8 else 0), ln, g=g * 0.7, dark=0.4, echo=0.6)
    return T.render(-17.5)


def calm_day():
    T = Track(90, 24)
    prog = ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'Am', 'B'] * 3
    roots = {'Em': 40, 'C': 36, 'D': 38, 'Am': 45, 'B': 35}
    for bar, ch in enumerate(prog):
        r = roots[ch]
        lean = bar >= 20                                     # the last four bars lean toward the alarm
        T.pad(bar, r + 24, (0, 7, 12, 15 if ch in ('Em', 'Am') else 16), g=0.34, fc=1000 + 400 * lean)
        # the engine, idling: an 8th-note pulse bass, filtered low
        for k in range(8):
            n = int(T.spb * 0.5 * SR * 0.9)
            x = D.v_bass(r + (12 if k % 4 == 3 else 0), n, 0.18 + 0.12 * lean)
            add_at(T.dry, x, T.t(bar, k * 0.5), 0.32 + 0.1 * (k % 4 == 0), 0)
        T.kick(bar, 0, 0.3 + 0.1 * lean)
        if bar % 2 == 1: T.kick(bar, 2.5, 0.2)
        T.hat(bar, 1, 0.08); T.hat(bar, 3, 0.1)
        if lean:
            for k in range(4): T.hat(bar, k + 0.5, 0.07, pan=-0.3)
        # the hook's shape in the arps, every other bar
        if bar % 2 == 0 and bar >= 4:
            for k, m in enumerate([E4, G4, B4, A4, G4, Fs4]):
                T.arp(bar, k * 0.5, m + 12, 0.45, g=0.22, pan=0.4 * np.sin(k + bar))
    # a lead phrase that answers, two times, sparse
    line = [(0, 2, B4), (2, 1, C5), (3, 1, B4), (4, 3, G4), (8, 2, A4), (10, 1, B4), (11, 1, A4), (12, 4, Fs4)]
    for bar0 in (8, 16):
        for bt, ln, m in line:
            T.lead(bar0 + int(bt // 4), bt % 4, m, ln, g=0.36, dark=0.45, echo=0.8)
    return T.render(-18.0)


ALL = {'menu_theme': menu_theme, 'calm_morning': calm_morning, 'calm_day': calm_day}

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'out'
    os.makedirs(out, exist_ok=True)
    for name in (sys.argv[2:] or ALL):
        y = ALL[name]()
        write_wav(os.path.join(out, name + '.wav'), y)
        print(f'{name}: {y.shape[1] / SR:.2f}s', flush=True)
