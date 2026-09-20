"""Generative soundtrack for Tiny Trek.

Each track is a real arrangement: a key and chord progression, a song form built
from sections (intro / verse / chorus / break / climax / outro) that add and drop
layers, a motif-based lead line, and a drum kit whose pattern depends on the
section. Everything is rendered offline with synth.py and written as WAV; the
runner encodes to mp3.
"""
import sys
import numpy as np
from synth import *  # noqa

SCALES = {
    'minor': [0, 2, 3, 5, 7, 8, 10],
    'dorian': [0, 2, 3, 5, 7, 9, 10],
    'phrygian': [0, 1, 3, 5, 7, 8, 10],
    'harm_minor': [0, 2, 3, 5, 7, 8, 11],
    'aeolian_b5': [0, 2, 3, 5, 6, 8, 10],
    'major': [0, 2, 4, 5, 7, 9, 11],
    'lydian': [0, 2, 4, 6, 7, 9, 11],
    'mixolydian': [0, 2, 4, 5, 7, 9, 10],
}


class Key:
    def __init__(self, root_midi, scale):
        self.root = root_midi
        self.scale = SCALES[scale]

    def deg(self, d, octave=0):
        """Scale degree (any int) -> midi note."""
        o, i = divmod(d, 7)
        return self.root + 12 * (o + octave) + self.scale[i]

    def chord(self, degree, n=3, octave=0):
        return [self.deg(degree + 2 * k, octave) for k in range(n)]

    def nearest_deg(self, midi):
        """Nearest scale degree index for a midi note."""
        best, bd = 0, 99
        for d in range(-21, 42):
            m = self.deg(d)
            if abs(m - midi) < bd:
                best, bd = d, abs(m - midi)
        return best


# ----------------------------------------------------------------- instruments
def ks_pluck(freq, n, bright=0.6, decay=0.996, vel=1.0):
    """Karplus-Strong string via chunk recursion (chunk = period)."""
    N = max(2, int(round(SR / freq)))
    rng = np.random.default_rng(int(freq * 13) % 9973)
    burst = rng.uniform(-1, 1, N)
    burst = lowpass(burst, 1200 + 6000 * bright)
    out = np.zeros(n + N)
    out[:N] = burst
    prev = out[:N].copy()
    for s in range(N, n + N, N):
        e = min(N, n + N - s)
        blend = 0.5 * (prev[:e] + np.concatenate([prev[-1:], prev[:-1]])[:e])
        out[s:s + e] = decay * blend
        prev = out[s:s + N] if s + N <= n + N else np.concatenate([out[s:], np.zeros(N - (n + N - s))])
    return out[:n] * vel


def inst_pad(freq, n, fc=1400, a=0.5, r=1.4, s=0.85, width=1.0, shimmer=0.0, sub=0.35):
    env = adsr(n, a, 0.6, s, r)
    outs = []
    for ch, det in enumerate([(-9, 4, 12), (-4, 9, -12)]):
        x = np.zeros(n)
        for d in det:
            x += osc_saw(freq, n, det[0] * 0 + d * width, phase=(d % 7) / 7)
        x /= 3
        if sub > 0:
            x += osc_square(freq / 2, n, pw=0.5, phase=0.1) * sub * 0.5
        if shimmer > 0:
            x += osc_tri(freq * 2, n, phase=0.3) * shimmer
        x = lowpass(x, fc)
        outs.append(x * env)
    return np.stack(outs)


def inst_choir(freq, n, a=0.8, r=1.6):
    env = adsr(n, a, 0.8, 0.9, r)
    outs = []
    for ch in range(2):
        x = np.zeros(n)
        for d in [-6, 0, 7] if ch == 0 else [-3, 3, 9]:
            x += osc_saw(freq, n, d, phase=(d % 5) / 5)
        f1 = bandpass(x, 600, 900) * 1.2
        f2 = bandpass(x, 1100, 1500) * 0.7
        f3 = lowpass(x, 500) * 0.6
        outs.append((f1 + f2 + f3) * env / 3)
    return np.stack(outs)


def inst_bass(freq, n, fc_lo=140, fc_hi=1200, a=0.004, d=0.16, s=0.55, r=0.07, drv=1.4, sub=0.3):
    env = adsr(n, a, d, s, r)
    x = osc_saw(freq, n) * 0.7 + osc_square(freq, n, pw=0.45, phase=0.25) * 0.3
    fenv = np.exp(-t_axis(n) * 9.0)
    x = filt_env_mix(x, fc_lo, fc_hi, fenv)
    x = drive(x, drv)
    x += osc_sine(freq, n) * sub
    return x * env


def inst_bass_soft(freq, n, r=0.12):
    env = adsr(n, 0.01, 0.3, 0.6, r)
    x = osc_tri(freq, n) * 0.6 + osc_sine(freq, n) * 0.6
    return lowpass(x, 500) * env


def inst_arp(freq, n, fc_lo=500, fc_hi=4200, r=0.08, wave='square'):
    env = adsr(n, 0.003, 0.09, 0.45, r)
    x = osc_square(freq, n, pw=0.38) if wave == 'square' else osc_saw(freq, n)
    fenv = np.exp(-t_axis(n) * 22.0)
    x = filt_env_mix(x, fc_lo, fc_hi, fenv)
    return x * env


def inst_lead(freq, n, fc=3800, vib=14, a=0.02, r=0.25, s=0.75):
    env = adsr(n, a, 0.12, s, r)
    x = additive_saw(freq, n, max_h=20, roll=1.1, vib_cents=vib) * 0.8
    x += additive_saw(freq * 2 ** (7 / 1200), n, max_h=12, roll=1.2, vib_cents=vib) * 0.35
    x = lowpass(x, fc)
    x = drive(x, 1.2)
    return x * env


def inst_keys(freq, n, r=0.45):
    env = adsr(n, 0.004, 0.5, 0.35, r)
    ienv = np.exp(-t_axis(n) * 6.0)
    x = osc_sine_fm(freq, n, ratio=1.0, index=2.2, index_env=ienv) * 0.7
    x += osc_sine_fm(freq * 2, n, ratio=3.0, index=0.6, index_env=ienv) * 0.2
    x += osc_sine(freq, n) * 0.25
    return x * env


def inst_bell(freq, n, r=1.2):
    env = adsr(n, 0.003, 0.8, 0.3, r)
    ienv = np.exp(-t_axis(n) * 2.5)
    x = osc_sine_fm(freq, n, ratio=3.5, index=1.8, index_env=ienv) * 0.6
    x += osc_sine(freq * 2.0, n) * 0.15 * ienv
    return x * env


# ----------------------------------------------------------------- patterns
DRUM_STYLES = {
    # (kind, beat, velocity)
    'four': {
        'kick': [(0, 1), (1, 0.95), (2, 1), (3, 0.95)],
        'snare': [(1, 0.9), (3, 0.95)],
        'hat': [(i * 0.5, 0.55 if i % 2 == 0 else 0.35) for i in range(8)],
        'open': [(2.5, 0.35)],
    },
    'four16': {
        'kick': [(0, 1), (1, 0.95), (2, 1), (3, 0.95)],
        'snare': [(1, 0.9), (3, 0.95)],
        'hat': [(i * 0.25, [0.55, 0.22, 0.38, 0.22][i % 4]) for i in range(16)],
        'open': [(1.5, 0.3), (3.5, 0.32)],
    },
    'break': {
        'kick': [(0, 1), (1.5, 0.8), (2.5, 0.95), (3.75, 0.6)],
        'snare': [(1, 0.9), (3, 0.95), (3.5, 0.3)],
        'hat': [(i * 0.25, [0.5, 0.2, 0.35, 0.2][i % 4]) for i in range(16)],
        'open': [(0.5, 0.3)],
    },
    'drive': {
        'kick': [(0, 1), (0.5, 0.6), (1, 0.95), (2, 1), (2.5, 0.6), (3, 0.95)],
        'snare': [(1, 0.95), (3, 1.0)],
        'hat': [(i * 0.25, [0.5, 0.25, 0.4, 0.25][i % 4]) for i in range(16)],
        'open': [(3.75, 0.35)],
    },
    'half': {
        'kick': [(0, 1), (2.5, 0.7)],
        'snare_big': [(2, 1.0)],
        'hat': [(i * 0.5, 0.4 if i % 2 == 0 else 0.25) for i in range(8)],
        'open': [(1.5, 0.28)],
    },
    'doom': {
        'kick_deep': [(0, 1), (1.75, 0.7), (2.5, 0.9)],
        'snare_big': [(2, 1.0)],
        'tom': [(3.5, 0.6)],
        'ride': [(0, 0.35), (1, 0.28), (2, 0.35), (3, 0.28)],
    },
    'light': {
        'kick': [(0, 0.7), (2.5, 0.5)],
        'rim': [(1, 0.5), (3, 0.55)],
        'shaker': [(i * 0.5, 0.5 if i % 2 == 0 else 0.3) for i in range(8)],
    },
    'brush': {
        'kick': [(0, 0.55), (2, 0.45)],
        'shaker': [(i * 0.25, [0.45, 0.2, 0.3, 0.2][i % 4]) for i in range(16)],
        'rim': [(3, 0.4)],
    },
    'pulse': {
        'kick_deep': [(0, 0.8), (2, 0.6)],
        'open': [(3.5, 0.2)],
    },
    'heartbeat': {
        'kick_deep': [(0, 0.8), (0.6, 0.55)],
    },
}

BASS_STYLES = {
    'roots8': lambda b, root, fifth, octv: [(b + i * 0.5, 0.45, root if i not in (3, 7) else octv, 0.9 if i % 2 == 0 else 0.7) for i in range(8)],
    'drive16': lambda b, root, fifth, octv: [(b + i * 0.25, 0.22, root if i % 8 != 6 else fifth, 0.95 if i % 4 == 0 else 0.7) for i in range(16)],
    'syncop': lambda b, root, fifth, octv: [(b + 0, 0.7, root, 0.95), (b + 0.75, 0.45, root, 0.7), (b + 1.5, 0.45, octv, 0.75), (b + 2.5, 0.45, root, 0.9), (b + 3, 0.45, fifth, 0.7), (b + 3.5, 0.45, root, 0.7)],
    'slow': lambda b, root, fifth, octv: [(b + 0, 3.8, root, 0.9)],
    'halves': lambda b, root, fifth, octv: [(b + 0, 1.9, root, 0.9), (b + 2, 1.9, fifth if (b // 4) % 2 else root, 0.8)],
    'walk': lambda b, root, fifth, octv: [(b + 0, 0.9, root, 0.9), (b + 1, 0.9, root, 0.6), (b + 2, 0.9, fifth, 0.8), (b + 3, 0.9, octv, 0.6)],
    'doom': lambda b, root, fifth, octv: [(b + 0, 1.7, root, 1.0), (b + 2, 0.45, root, 0.8), (b + 2.5, 1.4, root - 12 if root > 36 else root, 0.9)],
}

ARP_PATTERNS = {
    'up': [0, 1, 2, 3, 4, 5, 6, 7],
    'updown': [0, 1, 2, 3, 4, 3, 2, 1],
    'sync': [0, 2, 1, 3, 2, 4, 3, 5],
    'wide': [0, 4, 2, 5, 1, 4, 3, 6],
    'down': [7, 6, 5, 4, 3, 2, 1, 0],
}

RHYTHMS = [
    [1, 1, 0.5, 0.5, 1], [0.5, 0.5, 1, 2], [1.5, 0.5, 1, 1], [2, 1, 1], [0.5, 0.5, 0.5, 0.5, 1, 1],
    [3, 1], [1, 0.5, 0.5, 1, 1], [0.5, 1, 0.5, 2], [1, 1, 2], [2, 0.5, 0.5, 1],
]


# ----------------------------------------------------------------- melody
def gen_melody(rng, key, chords_by_bar, bar0, bars, lo=64, hi=84, density=1.0, motif=None):
    """Returns (events, motif). events: (beat, dur_beats, midi, vel)."""
    events = []
    n_phr = bars // 2
    if motif is None:
        rhythm = rng.choice(len(RHYTHMS))
        r1 = RHYTHMS[rhythm]
        r2 = RHYTHMS[rng.choice(len(RHYTHMS))]
        steps = []
        for _ in range(len(r1) + len(r2) - 1):
            p = rng.random()
            steps.append(int(rng.choice([-1, 1])) if p < 0.62 else (int(rng.choice([-2, 2])) if p < 0.88 else int(rng.choice([-3, 3, 4]))))
        motif = (r1, r2, steps)
    r1, r2, steps = motif
    cur = None
    for p in range(n_phr):
        bar = bar0 + p * 2
        rh = list(r1) + list(r2)
        if p % 4 == 3:  # cadence: land on a long root/fifth
            rh = list(r1) + [4 - sum(r1) % 4 if sum(r1) % 4 else 4]
        if p % 4 == 1 and rng.random() < 0.5:  # variation: retrograde the second half rhythm
            rh = list(r1) + list(reversed(r2))
        chord = chords_by_bar[bar % len(chords_by_bar)]
        ctones = [c for c in chord]
        # start on a chord tone near the middle (or continue from last note)
        if cur is None or p % 2 == 0:
            target = (lo + hi) / 2 + rng.integers(-3, 4)
            cur = min([c + 12 * o for c in ctones for o in range(-1, 3)], key=lambda m: abs(m - target))
        beat = 0.0
        for i, d in enumerate(rh):
            if beat >= 8:
                break
            b_abs = (bar * 4) + beat
            this_bar = int(b_abs // 4)
            chord_now = chords_by_bar[this_bar % len(chords_by_bar)]
            if i > 0:
                st = steps[(i - 1 + p * 3) % len(steps)]
                deg = key.nearest_deg(cur) + st
                cur = key.deg(deg)
            strong = (beat % 4) in (0.0, 2.0)
            last = (i == len(rh) - 1)
            if strong or last or p % 4 == 3 and last:
                # snap to nearest chord tone
                cand = [c + 12 * o for c in chord_now for o in range(-1, 3)]
                cur = min(cand, key=lambda m: abs(m - cur))
            if p % 4 == 3 and last:
                cand = [chord_now[0] + 12 * o for o in range(-1, 3)] + [chord_now[2] + 12 * o for o in range(-1, 3)]
                cur = min(cand, key=lambda m: abs(m - cur))
            while cur < lo:
                cur += 12
            while cur > hi:
                cur -= 12
            if rng.random() < density or last:
                vel = 0.8 + 0.2 * rng.random() + (0.08 if strong else 0)
                events.append((b_abs, d * (0.95 if not last else 1.0), cur, min(1.0, vel)))
            beat += d
    return events, motif


# ----------------------------------------------------------------- the track builder
class Track:
    def __init__(self, name, bpm, key, progression, sections, seed, **opts):
        self.name = name
        self.bpm = bpm
        self.key = key
        self.progression = progression  # list of (degree, size) per bar, cycled
        self.sections = sections
        self.seed = seed
        self.opts = opts

    def render(self):
        rng = np.random.default_rng(self.seed)
        spb = 60.0 / self.bpm  # seconds per beat
        total_bars = sum(s['bars'] for s in self.sections)
        n = int((total_bars * 4 * spb + 4.0) * SR)
        o = self.opts
        chords_by_bar = []
        prog = self.progression
        for b in range(total_bars):
            deg, size = prog[b % len(prog)]
            chords_by_bar.append(self.key.chord(deg, size, o.get('chord_oct', 0)))

        layers = {k: np.zeros((2, n)) for k in ['pad', 'bass', 'drums', 'arp', 'lead', 'pluck', 'keys', 'choir', 'bell']}
        rev_send = np.zeros((2, n))
        dly_send = np.zeros((2, n))

        def smp(beat):
            return int(beat * spb * SR)

        def humanize(beat, amt=0.006):
            return beat + rng.normal(0, amt) / spb

        bar = 0
        lead_motif = None
        arp_pat = ARP_PATTERNS[o.get('arp', 'sync')]
        for si, sec in enumerate(self.sections):
            energy = sec.get('energy', 0.6)
            for bi in range(sec['bars']):
                b = bar + bi
                beat0 = b * 4
                chord = chords_by_bar[b]
                root = chord[0]
                last_bar_of_section = (bi == sec['bars'] - 1)
                fill_bar = last_bar_of_section and sec.get('drums') not in (None, 'pulse', 'heartbeat') and sec['bars'] >= 4

                # ---- pad (one chord per bar, tied when the chord repeats)
                if sec.get('pad'):
                    same_next = (b + 1 < total_bars) and chords_by_bar[b + 1] == chord and bi + 1 < sec['bars']
                    same_prev = b > 0 and chords_by_bar[b - 1] == chord and bi > 0
                    if not same_prev:
                        length = 1
                        while same_next and length < 2:
                            length += 1
                            same_next = (b + length < total_bars) and chords_by_bar[b + length] == chord and bi + length < sec['bars']
                        dur = length * 4
                        nn = smp(dur) + int(1.6 * SR)
                        fc = o.get('pad_fc', 900) + energy * o.get('pad_fc_energy', 1400)
                        voicing = list(chord) + ([chord[0] + 12] if len(chord) == 3 else [])
                        for k, m in enumerate(voicing):
                            mm = m + o.get('pad_oct', 0) * 12
                            gain = 0.55 if k == 0 else 0.42
                            if sec.get('choir'):
                                sig = inst_choir(midi_to_hz(mm), nn)
                            else:
                                sig = inst_pad(midi_to_hz(mm), nn, fc=fc, a=o.get('pad_a', 0.6), r=1.4, shimmer=o.get('pad_shimmer', 0.0), sub=o.get('pad_sub', 0.12) if k == 0 else 0)
                            add_stereo_at(layers['pad' if not sec.get('choir') else 'choir'], sig, smp(beat0), gain)

                # ---- bass
                bs = sec.get('bass')
                if bs:
                    bo = o.get('bass_oct', -2)
                    r = root + 12 * bo
                    fifth = chord[1 + (1 if len(chord) > 2 else 0)] + 12 * bo
                    fifth = chord[2] + 12 * bo if len(chord) > 2 else r + 7
                    for (beat, dur, m, vel) in BASS_STYLES[bs](beat0, r, fifth, r + 12):
                        nn = smp(dur) + int(0.12 * SR)
                        if o.get('bass_soft'):
                            sig = inst_bass_soft(midi_to_hz(m), nn)
                        else:
                            sig = inst_bass(midi_to_hz(m), nn, fc_lo=o.get('bass_fc_lo', 140), fc_hi=o.get('bass_fc_hi', 900) + energy * 900, drv=o.get('bass_drive', 1.4))
                        add_at(layers['bass'], sig, smp(humanize(beat, 0.003)), vel * (0.8 + 0.2 * energy), 0.0)

                # ---- drums
                ds = sec.get('drums')
                if ds:
                    pat = DRUM_STYLES[ds]
                    dv = 0.75 + 0.25 * energy
                    for kind, hits in pat.items():
                        for (beat, vel) in hits:
                            if fill_bar and kind in ('hat', 'shaker') and beat >= 3:
                                continue
                            dk = 'hat_open' if kind == 'open' else kind
                            var = int(rng.integers(0, 3)) if dk == 'tom' else 0
                            g = {'kick': 0.95, 'kick_deep': 1.0, 'snare': 0.72, 'snare_big': 0.85, 'hat': 0.34, 'hat_open': 0.26, 'clap': 0.5, 'ride': 0.34, 'tom': 0.6, 'shaker': 0.3, 'rim': 0.38, 'boom': 0.9}[dk]
                            pan = {'hat': 0.25, 'hat_open': 0.25, 'shaker': -0.3, 'ride': 0.35, 'rim': -0.2, 'tom': (var - 1) * 0.4}.get(dk, 0.0)
                            jitter = 0.0 if dk in ('kick', 'kick_deep') else 0.004
                            add_at(layers['drums'], drum(dk, var), smp(humanize(beat0 + beat, jitter)), g * vel * dv * (0.9 + 0.1 * rng.random()), pan)
                            if dk in ('snare', 'snare_big', 'clap'):
                                add_at(rev_send, drum(dk, var), smp(beat0 + beat), g * vel * dv * 0.35, pan)
                    if fill_bar and ds not in ('light', 'brush'):
                        # fill: snare 16ths ramping up, or a tom roll on heavier kits
                        if ds in ('half', 'doom'):
                            for i, beat in enumerate(np.arange(3.0, 4.0, 0.25)):
                                add_at(layers['drums'], drum('tom', 2 - min(2, i // 2)), smp(beat0 + beat), 0.5 + 0.12 * i, (1 - i) * 0.3)
                        else:
                            for i, beat in enumerate(np.arange(3.0, 4.0, 0.25)):
                                add_at(layers['drums'], drum('snare'), smp(beat0 + beat), 0.35 + 0.1 * i, 0)
                        if si + 1 < len(self.sections) and self.sections[si + 1].get('energy', 0) >= energy:
                            add_at(layers['drums'], drum('boom'), smp(beat0 + 4), 0.55, 0)
                    elif ds in ('half', 'doom', 'pulse') and bi % 4 == 0:
                        add_at(layers['drums'], drum('boom'), smp(beat0), 0.4 * dv, 0)

                # ---- arp
                if sec.get('arp'):
                    rate = sec.get('arp_rate', o.get('arp_rate', 0.5))
                    tones = sorted(set([c + 12 * oc for c in chord for oc in (0, 1)] + [chord[0] + 24]))
                    tones = [t + 12 * o.get('arp_oct', 0) for t in tones]
                    steps_per_bar = int(4 / rate)
                    for i in range(steps_per_bar):
                        idx = arp_pat[i % len(arp_pat)]
                        m = tones[idx % len(tones)]
                        nn = smp(rate * 0.9) + int(0.1 * SR)
                        sig = inst_arp(midi_to_hz(m), nn, fc_hi=2600 + 2200 * energy, wave=o.get('arp_wave', 'square'))
                        vel = (0.85 if i % 4 == 0 else 0.62) * (0.9 + 0.1 * rng.random())
                        pan = 0.35 * np.sin(i * 0.9)
                        add_at(layers['arp'], sig, smp(humanize(beat0 + i * rate, 0.002)), vel, pan)
                        add_at(dly_send, sig, smp(beat0 + i * rate), vel * 0.45, pan)

                # ---- pluck / keys: sparse chord tones (calm tracks)
                if sec.get('pluck') or sec.get('keys'):
                    inst = 'pluck' if sec.get('pluck') else 'keys'
                    pattern = o.get('pluck_beats', [0, 1.5, 2.5, 3])
                    tones = [c + 12 * o.get('pluck_oct', 0) for c in chord] + [chord[0] + 12 + 12 * o.get('pluck_oct', 0)]
                    for j, beat in enumerate(pattern):
                        if rng.random() > o.get('pluck_density', 0.85):
                            continue
                        m = tones[(j + bi) % len(tones)]
                        if inst == 'pluck':
                            nn = int(1.6 * SR)
                            sig = ks_pluck(midi_to_hz(m), nn, bright=0.7 + 0.3 * energy)
                        else:
                            nn = smp(1.4) + int(0.6 * SR)
                            sig = inst_keys(midi_to_hz(m), nn)
                        vel = 0.7 + 0.25 * rng.random()
                        pan = -0.3 + 0.6 * ((j + bi) % 3) / 2
                        add_at(layers[inst], sig, smp(humanize(beat0 + beat, 0.008)), vel, pan)
                        add_at(rev_send, sig, smp(beat0 + beat), vel * 0.5, pan)
                        add_at(dly_send, sig, smp(beat0 + beat), vel * 0.25, pan)

                # ---- bell accents (every other bar start)
                if sec.get('bell') and bi % 2 == 0:
                    m = chord[(bi // 2) % len(chord)] + 24 + 12 * o.get('bell_oct', 0)
                    nn = int(2.5 * SR)
                    sig = inst_bell(midi_to_hz(m), nn)
                    add_at(layers['bell'], sig, smp(beat0 + (0 if bi % 4 == 0 else 2)), 0.5, 0.4 if bi % 4 else -0.4)
                    add_at(rev_send, sig, smp(beat0), 0.5, 0)

            # ---- lead: a phrase across the whole section
            if sec.get('lead'):
                ev, lead_motif = gen_melody(rng, self.key, chords_by_bar, bar, sec['bars'], lo=o.get('lead_lo', 64), hi=o.get('lead_hi', 84), density=sec.get('lead_density', 0.95), motif=lead_motif if sec.get('lead') != 'new' else None)
                for (beat, dur, m, vel) in ev:
                    nn = smp(dur) + int(0.3 * SR)
                    sig = inst_lead(midi_to_hz(m + 12 * o.get('lead_oct', 0)), nn, fc=o.get('lead_fc', 3600), vib=o.get('lead_vib', 12))
                    add_at(layers['lead'], sig, smp(humanize(beat, 0.005)), vel, 0.05)
                    add_at(dly_send, sig, smp(beat), vel * 0.5, 0.05)
                    add_at(rev_send, sig, smp(beat), vel * 0.35, 0.05)
            bar += sec['bars']

        # ---- mix
        g = o.get('gains', {})
        G = {'pad': 0.24, 'bass': 0.26, 'drums': 0.5, 'arp': 0.2, 'lead': 0.26, 'pluck': 0.26, 'keys': 0.26, 'choir': 0.26, 'bell': 0.18}
        G.update(g)
        for k in ('arp', 'lead', 'pluck', 'keys'):
            G[k] *= 1.35
        G['bass'] *= 0.75
        mix = np.zeros((2, n))
        for k, buf in layers.items():
            mix += buf * G[k]
        rev_send += layers['pad'] * G['pad'] * o.get('pad_rev', 0.6)
        rev_send += layers['choir'] * G['choir'] * 0.8
        # delay bus: dotted eighth (or a plain quarter for slow tunes)
        dly_time = spb * o.get('dly_beats', 0.75)
        dly = stereo_delay(dly_send * (G['arp'] + G['lead'] + G['pluck']) / 3 * 2.2, dly_time, fb=o.get('dly_fb', 0.38), wet=o.get('dly_wet', 0.9), damp=3800)
        rev = reverb(rev_send * 0.5 + dly * 0.3, size=o.get('rev_size', 1.0), damp=o.get('rev_damp', 3200), wet=o.get('rev_wet', 0.5))
        mix += dly + rev
        # fade in/out
        fi = int(0.4 * SR); fo = int(2.5 * SR)
        mix[:, :fi] *= np.linspace(0, 1, fi)
        mix[:, -fo:] *= np.linspace(1, 0, fo)
        return soft_master(mix, ceiling=0.92)


# ----------------------------------------------------------------- catalogue
def S(bars, **kw):
    d = {'bars': bars}
    d.update(kw)
    return d


TRACKS = {}


def track(name, *a, **kw):
    TRACKS[name] = Track(name, *a, **kw)


# --- MENU -------------------------------------------------------------------
track('menu_treeline', 72, Key(50, 'dorian'), [(0, 4), (5, 4), (3, 4), (6, 3), (0, 4), (2, 4), (5, 4), (4, 3)],
      [S(4, pad=1, energy=0.2), S(8, pad=1, keys=1, energy=0.3), S(8, pad=1, keys=1, bell=1, bass='slow', energy=0.4),
       S(8, pad=1, keys=1, drums='pulse', bass='slow', energy=0.45), S(8, pad=1, keys=1, bell=1, drums='pulse', bass='halves', lead=1, lead_density=0.7, energy=0.5),
       S(8, pad=1, keys=1, bass='slow', energy=0.35), S(4, pad=1, energy=0.2)],
      seed=11, pad_fc=700, pad_fc_energy=900, pad_a=1.2, bass_soft=1, pluck_beats=[0, 2.5], lead_fc=2400, lead_vib=8, lead_lo=62, lead_hi=76,
      rev_size=1.4, rev_wet=0.7, dly_beats=1.0, dly_fb=0.42, gains={'keys': 0.2, 'lead': 0.12, 'bell': 0.12, 'drums': 0.35})

# --- PREP / DAY -------------------------------------------------------------
track('day_morning_watch', 96, Key(55, 'dorian'), [(0, 4), (3, 3), (5, 4), (6, 3), (0, 4), (3, 3), (1, 4), (4, 3)],
      [S(4, pad=1, pluck=1, energy=0.3), S(8, pad=1, pluck=1, bass='halves', drums='light', energy=0.45),
       S(8, pad=1, pluck=1, bass='walk', drums='light', arp=1, arp_rate=0.5, energy=0.55), S(8, pad=1, bass='walk', drums='brush', arp=1, lead=1, energy=0.65),
       S(8, pad=1, pluck=1, bass='halves', drums='light', energy=0.45), S(8, pad=1, pluck=1, bass='walk', drums='brush', arp=1, lead=1, lead_density=0.85, energy=0.7),
       S(8, pad=1, pluck=1, bass='halves', energy=0.4), S(4, pad=1, pluck=1, energy=0.25)],
      seed=23, pad_fc=1000, pad_a=0.8, bass_soft=1, pluck_beats=[0, 0.5, 1.5, 2, 3.5], pluck_oct=0, arp='updown', arp_wave='saw', arp_oct=0,
      lead_fc=2800, lead_vib=10, lead_lo=67, lead_hi=81, rev_size=1.1, rev_wet=0.5, gains={'pluck': 0.26, 'arp': 0.1, 'lead': 0.15, 'drums': 0.45})

track('day_riverside', 104, Key(57, 'mixolydian'), [(0, 4), (4, 3), (5, 3), (3, 4), (0, 4), (6, 3), (3, 4), (4, 3)],
      [S(4, pad=1, keys=1, energy=0.3), S(8, pad=1, keys=1, bass='halves', drums='brush', energy=0.45),
       S(8, pad=1, keys=1, bass='walk', drums='light', arp=1, energy=0.55), S(8, pad=1, keys=1, bass='walk', drums='light', arp=1, lead=1, energy=0.65),
       S(8, pad=1, pluck=1, bass='halves', energy=0.4), S(8, pad=1, keys=1, bass='walk', drums='brush', arp=1, lead=1, lead_density=0.8, energy=0.7),
       S(8, pad=1, keys=1, bass='halves', drums='brush', energy=0.45), S(4, pad=1, keys=1, energy=0.25)],
      seed=37, pad_fc=1200, pad_a=0.7, bass_soft=1, pluck_beats=[0, 1, 2.5, 3.5], arp='wide', arp_wave='saw', arp_rate=0.5,
      lead_fc=3000, lead_vib=9, lead_lo=64, lead_hi=79, rev_size=1.2, rev_wet=0.5, dly_beats=0.5, gains={'keys': 0.24, 'arp': 0.1, 'lead': 0.14, 'drums': 0.42})

track('day_open_ground', 92, Key(52, 'minor'), [(0, 4), (5, 4), (2, 4), (6, 3), (0, 4), (5, 4), (3, 4), (4, 3)],
      [S(4, pad=1, energy=0.25), S(8, pad=1, pluck=1, bass='slow', energy=0.35), S(8, pad=1, pluck=1, bass='halves', drums='light', bell=1, energy=0.45),
       S(8, pad=1, pluck=1, bass='walk', drums='brush', arp=1, energy=0.55), S(8, pad=1, keys=1, bass='walk', drums='brush', arp=1, lead=1, energy=0.65),
       S(8, pad=1, pluck=1, bass='halves', bell=1, energy=0.4), S(8, pad=1, pluck=1, bass='walk', drums='light', lead=1, lead_density=0.8, energy=0.6),
       S(6, pad=1, pluck=1, energy=0.3)],
      seed=41, pad_fc=900, pad_a=0.9, bass_soft=1, pluck_beats=[0, 1.5, 3], arp='up', arp_rate=0.5, lead_fc=2600, lead_vib=10, lead_lo=64, lead_hi=78,
      rev_size=1.3, rev_wet=0.55, gains={'pluck': 0.24, 'keys': 0.2, 'arp': 0.09, 'lead': 0.14, 'bell': 0.1, 'drums': 0.4})

# --- PREP / NIGHT -----------------------------------------------------------
track('night_lanterns', 80, Key(45, 'phrygian'), [(0, 4), (1, 3), (0, 4), (5, 4), (0, 4), (1, 3), (6, 3), (4, 3)],
      [S(4, pad=1, energy=0.25), S(8, pad=1, bass='slow', bell=1, energy=0.35), S(8, pad=1, bass='halves', drums='pulse', pluck=1, energy=0.45),
       S(8, pad=1, bass='syncop', drums='half', arp=1, energy=0.55), S(8, pad=1, bass='syncop', drums='half', arp=1, lead=1, lead_density=0.7, energy=0.6),
       S(8, pad=1, bass='slow', bell=1, pluck=1, energy=0.35), S(8, pad=1, bass='halves', drums='pulse', arp=1, energy=0.45), S(4, pad=1, energy=0.2)],
      seed=53, pad_fc=650, pad_fc_energy=700, pad_a=1.0, bass_fc_hi=500, bass_drive=1.1, pluck_beats=[0, 2.5], arp='sync', arp_rate=0.5, arp_oct=-1,
      lead_fc=2200, lead_vib=6, lead_lo=57, lead_hi=72, rev_size=1.5, rev_wet=0.7, dly_beats=0.75, gains={'arp': 0.1, 'lead': 0.12, 'bell': 0.12, 'pluck': 0.18, 'drums': 0.45})

track('night_embers', 84, Key(43, 'minor'), [(0, 4), (5, 4), (0, 4), (6, 3), (3, 4), (5, 4), (4, 3), (4, 3)],
      [S(4, pad=1, energy=0.2), S(8, pad=1, bass='slow', keys=1, energy=0.35), S(8, pad=1, bass='halves', drums='heartbeat', keys=1, energy=0.4),
       S(8, pad=1, bass='syncop', drums='half', arp=1, energy=0.55), S(8, pad=1, bass='syncop', drums='half', arp=1, lead=1, lead_density=0.75, energy=0.62),
       S(8, pad=1, bass='slow', keys=1, energy=0.35), S(8, pad=1, bass='halves', drums='heartbeat', keys=1, lead=1, lead_density=0.6, energy=0.45), S(4, pad=1, energy=0.2)],
      seed=59, pad_fc=600, pad_fc_energy=800, pad_a=1.1, bass_fc_hi=450, bass_drive=1.2, pluck_beats=[0, 3], arp='down', arp_rate=0.5, arp_oct=-1,
      lead_fc=2100, lead_vib=7, lead_lo=55, lead_hi=70, rev_size=1.6, rev_wet=0.7, gains={'keys': 0.18, 'arp': 0.1, 'lead': 0.12, 'drums': 0.45})

# --- COMBAT -----------------------------------------------------------------
track('fight_breach', 128, Key(52, 'minor'), [(0, 4), (0, 4), (5, 4), (6, 3), (0, 4), (0, 4), (3, 4), (4, 3)],
      [S(4, pad=1, arp=1, energy=0.5), S(8, pad=1, bass='roots8', drums='four', arp=1, energy=0.65),
       S(8, pad=1, bass='syncop', drums='four16', arp=1, lead=1, energy=0.8), S(8, pad=1, bass='roots8', drums='four', arp=1, energy=0.65),
       S(8, pad=1, bass='syncop', drums='drive', arp=1, lead=1, energy=0.9), S(8, pad=1, bass='slow', arp=1, energy=0.45),
       S(8, pad=1, bass='drive16', drums='drive', arp=1, lead=1, lead_density=1.0, energy=1.0), S(8, pad=1, bass='roots8', drums='four', arp=1, energy=0.7), S(4, pad=1, arp=1, energy=0.4)],
      seed=71, pad_fc=1100, pad_fc_energy=1600, arp='sync', arp_rate=0.25, arp_oct=0, bass_fc_hi=1100, bass_drive=1.6, lead_fc=3800, lead_vib=12, lead_lo=64, lead_hi=83,
      rev_size=0.9, rev_wet=0.4, gains={'arp': 0.14, 'lead': 0.2, 'drums': 0.6, 'bass': 0.32})

track('fight_run_the_line', 140, Key(57, 'minor'), [(0, 4), (5, 4), (3, 4), (6, 3), (0, 4), (5, 4), (2, 4), (4, 3)],
      [S(4, pad=1, drums='break', energy=0.55), S(8, pad=1, bass='syncop', drums='break', arp=1, energy=0.7),
       S(8, pad=1, bass='syncop', drums='break', arp=1, lead=1, energy=0.8), S(8, pad=1, bass='roots8', drums='four16', arp=1, energy=0.7),
       S(8, pad=1, bass='drive16', drums='drive', arp=1, lead=1, energy=0.95), S(8, pad=1, bass='slow', arp=1, drums='pulse', energy=0.4),
       S(8, pad=1, bass='syncop', drums='break', arp=1, lead=1, energy=0.9), S(8, pad=1, bass='drive16', drums='drive', arp=1, lead=1, lead_density=1.0, energy=1.0), S(4, pad=1, drums='break', energy=0.5)],
      seed=83, pad_fc=1200, pad_fc_energy=1500, arp='wide', arp_rate=0.25, arp_wave='saw', bass_fc_hi=1300, bass_drive=1.7, lead_fc=4000, lead_vib=14, lead_lo=62, lead_hi=81,
      rev_size=0.8, rev_wet=0.35, dly_beats=0.75, gains={'arp': 0.12, 'lead': 0.2, 'drums': 0.62, 'bass': 0.3})

track('fight_teeth', 150, Key(48, 'phrygian'), [(0, 4), (1, 3), (0, 4), (6, 3), (0, 4), (1, 3), (3, 4), (5, 4)],
      [S(4, pad=1, bass='roots8', energy=0.55), S(8, pad=1, bass='drive16', drums='drive', energy=0.75),
       S(8, pad=1, bass='drive16', drums='drive', arp=1, lead=1, energy=0.85), S(8, pad=1, bass='syncop', drums='half', arp=1, energy=0.7),
       S(8, pad=1, bass='drive16', drums='drive', arp=1, lead=1, energy=1.0), S(8, pad=1, bass='doom', drums='doom', energy=0.6),
       S(8, pad=1, bass='drive16', drums='drive', arp=1, lead=1, lead_density=1.0, energy=1.0), S(8, pad=1, bass='drive16', drums='four16', arp=1, energy=0.85), S(4, pad=1, bass='roots8', energy=0.5)],
      seed=97, pad_fc=1000, pad_fc_energy=1700, arp='down', arp_rate=0.25, arp_oct=0, bass_fc_lo=160, bass_fc_hi=1500, bass_drive=2.2, lead_fc=4200, lead_vib=16, lead_lo=60, lead_hi=79,
      rev_size=0.8, rev_wet=0.35, gains={'arp': 0.12, 'lead': 0.2, 'drums': 0.62, 'bass': 0.34, 'pad': 0.17})

track('fight_ash_wind', 118, Key(50, 'aeolian_b5'), [(0, 4), (0, 4), (5, 4), (3, 4), (0, 4), (0, 4), (6, 3), (4, 3)],
      [S(4, pad=1, arp=1, energy=0.45), S(8, pad=1, bass='syncop', drums='half', arp=1, energy=0.65),
       S(8, pad=1, bass='syncop', drums='half', arp=1, lead=1, energy=0.75), S(8, pad=1, bass='roots8', drums='four', arp=1, energy=0.75),
       S(8, pad=1, bass='drive16', drums='drive', arp=1, lead=1, energy=0.95), S(8, pad=1, bass='slow', arp=1, drums='pulse', energy=0.4),
       S(8, pad=1, bass='syncop', drums='half', arp=1, lead=1, lead_density=0.9, energy=0.8), S(8, pad=1, bass='drive16', drums='drive', arp=1, lead=1, energy=1.0), S(4, pad=1, arp=1, energy=0.4)],
      seed=101, pad_fc=900, pad_fc_energy=1500, pad_shimmer=0.15, arp='updown', arp_rate=0.25, arp_oct=-1, bass_fc_hi=1000, bass_drive=1.6, lead_fc=3400, lead_vib=12, lead_lo=62, lead_hi=81,
      rev_size=1.0, rev_wet=0.4, gains={'arp': 0.13, 'lead': 0.19, 'drums': 0.6, 'bass': 0.32})

track('fight_wire', 132, Key(54, 'harm_minor'), [(0, 4), (5, 4), (0, 4), (4, 3), (0, 4), (5, 4), (3, 4), (4, 3)],
      [S(4, pad=1, arp=1, drums='pulse', energy=0.5), S(8, pad=1, bass='roots8', drums='four', arp=1, energy=0.65),
       S(8, pad=1, bass='syncop', drums='break', arp=1, lead=1, energy=0.8), S(8, pad=1, bass='roots8', drums='four16', arp=1, energy=0.7),
       S(8, pad=1, bass='drive16', drums='drive', arp=1, lead=1, energy=0.95), S(8, pad=1, bass='halves', arp=1, energy=0.45),
       S(8, pad=1, bass='syncop', drums='break', arp=1, lead=1, lead_density=1.0, energy=0.9), S(8, pad=1, bass='drive16', drums='drive', arp=1, energy=1.0), S(4, pad=1, arp=1, energy=0.45)],
      seed=113, pad_fc=1100, pad_fc_energy=1500, arp='sync', arp_rate=0.25, arp_wave='saw', bass_fc_hi=1200, bass_drive=1.6, lead_fc=3800, lead_vib=12, lead_lo=63, lead_hi=82,
      rev_size=0.9, rev_wet=0.4, dly_beats=0.5, gains={'arp': 0.13, 'lead': 0.2, 'drums': 0.6, 'bass': 0.32})

# --- BLOOD MOON / BOSS ------------------------------------------------------
track('boss_red_sky', 100, Key(48, 'minor'), [(0, 4), (0, 4), (5, 4), (4, 3), (0, 4), (0, 4), (1, 3), (6, 3)],
      [S(4, pad=1, choir=1, drums='heartbeat', energy=0.4), S(8, pad=1, choir=1, bass='doom', drums='doom', energy=0.65),
       S(8, pad=1, choir=1, bass='doom', drums='doom', arp=1, lead=1, energy=0.8), S(8, pad=1, choir=1, bass='syncop', drums='half', arp=1, energy=0.75),
       S(8, pad=1, choir=1, bass='drive16', drums='drive', arp=1, lead=1, energy=1.0), S(8, pad=1, choir=1, bass='slow', drums='heartbeat', bell=1, energy=0.4),
       S(8, pad=1, choir=1, bass='doom', drums='doom', arp=1, lead=1, lead_density=0.9, energy=0.9), S(8, pad=1, choir=1, bass='drive16', drums='drive', arp=1, lead=1, energy=1.0), S(4, pad=1, choir=1, drums='heartbeat', energy=0.4)],
      seed=131, arp='down', arp_rate=0.5, arp_oct=-1, bass_fc_lo=120, bass_fc_hi=900, bass_drive=2.0, lead_fc=3000, lead_vib=10, lead_lo=57, lead_hi=76, lead_oct=0,
      rev_size=1.5, rev_wet=0.6, gains={'choir': 0.24, 'arp': 0.1, 'lead': 0.18, 'drums': 0.65, 'bass': 0.34, 'bell': 0.1})

track('boss_colossus', 90, Key(46, 'phrygian'), [(0, 4), (1, 3), (0, 4), (1, 3), (0, 4), (5, 4), (6, 3), (1, 3)],
      [S(4, pad=1, drums='heartbeat', bass='slow', energy=0.4), S(8, pad=1, choir=1, bass='doom', drums='doom', energy=0.65),
       S(8, pad=1, choir=1, bass='doom', drums='doom', lead=1, lead_density=0.8, energy=0.8), S(8, pad=1, bass='syncop', drums='half', arp=1, energy=0.7),
       S(8, pad=1, choir=1, bass='drive16', drums='drive', arp=1, lead=1, energy=1.0), S(8, pad=1, choir=1, bass='slow', drums='heartbeat', energy=0.4),
       S(8, pad=1, choir=1, bass='doom', drums='doom', arp=1, lead=1, energy=0.9), S(8, pad=1, choir=1, bass='drive16', drums='drive', arp=1, lead=1, lead_density=1.0, energy=1.0), S(4, pad=1, choir=1, drums='heartbeat', energy=0.35)],
      seed=137, arp='sync', arp_rate=0.5, arp_oct=-1, bass_fc_lo=110, bass_fc_hi=800, bass_drive=2.2, lead_fc=2800, lead_vib=9, lead_lo=55, lead_hi=74,
      rev_size=1.6, rev_wet=0.65, gains={'choir': 0.24, 'arp': 0.1, 'lead': 0.18, 'drums': 0.65, 'bass': 0.34})

# --- STINGERS ---------------------------------------------------------------
track('end_fallen', 66, Key(45, 'minor'), [(0, 4), (5, 4), (3, 4), (4, 3)],
      [S(4, pad=1, energy=0.2), S(8, pad=1, bell=1, bass='slow', energy=0.3), S(4, pad=1, energy=0.15)],
      seed=151, pad_fc=600, pad_fc_energy=400, pad_a=1.4, bass_soft=1, rev_size=1.7, rev_wet=0.8, gains={'bell': 0.14})

track('end_dawn', 84, Key(55, 'major'), [(0, 4), (3, 4), (5, 4), (4, 3)],
      [S(2, pad=1, energy=0.4), S(8, pad=1, keys=1, bass='halves', bell=1, drums='light', energy=0.55), S(4, pad=1, keys=1, energy=0.3)],
      seed=157, pad_fc=1300, pad_a=0.6, bass_soft=1, pluck_beats=[0, 1, 2, 3], rev_size=1.2, rev_wet=0.55, gains={'keys': 0.24, 'bell': 0.12, 'drums': 0.35})


if __name__ == '__main__':
    import os, time
    out = sys.argv[1] if len(sys.argv) > 1 else 'out'
    only = sys.argv[2:] or list(TRACKS)
    os.makedirs(out, exist_ok=True)
    for name in only:
        t0 = time.time()
        y = TRACKS[name].render()
        write_wav(os.path.join(out, name + '.wav'), y)
        print(f'{name}: {y.shape[1] / SR:.1f}s rendered in {time.time() - t0:.1f}s', flush=True)
