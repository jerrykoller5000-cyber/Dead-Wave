"""CL-34: chiptune fight loops for Dead-Wave, in the house style of tools/compose.py.

Each loop follows one of Jerry's Suno fight tracks: its tempo, key and drive, measured from
the audio (see extract.py). The arrangement is compose.py's engine with the instruments
swapped for 8-bit voices: pulse-wave lead and arps, a stepped triangle bass, LFSR-noise
drums. Every file is a seamless loop: the same sections are rendered once before and once
after the part we keep, so the reverb and echo tails that cross the seam are really there.

  python3 tools/chip.py <outdir> [name ...]
"""
import sys, os
import numpy as np
import compose as C
from synth import *  # noqa

# ----------------------------------------------------------------- 8-bit voices
def _blep(ph, dt):
    """PolyBLEP residual for a step at phase 0, for band-limited edges."""
    y = np.zeros_like(ph)
    m = ph < dt
    x = ph[m] / dt[m]; y[m] = x + x - x * x - 1
    m2 = ph > 1 - dt
    x = (ph[m2] - 1) / dt[m2]; y[m2] = x * x + x + x + 1
    return y


def pulse(freq, n, duty=0.25, vib_hz=0.0, vib_cents=0.0, vib_delay=0.12):
    """Band-limited pulse wave (PolyBLEP), so high notes don't alias into hash."""
    t = np.arange(n) / SR
    f = np.full(n, float(freq))
    if vib_cents:
        ramp = np.clip((t - vib_delay) / 0.2, 0, 1)
        f = f * 2 ** (vib_cents * ramp * np.sin(2 * np.pi * vib_hz * t) / 1200)
    dt = f / SR
    ph = np.cumsum(dt) % 1.0
    y = np.where(ph < duty, 1.0, -1.0)
    y += _blep(ph, dt)
    y -= _blep((ph - duty) % 1.0, dt)
    return y - (2 * duty - 1)


def tri_stepped(freq, n):
    """NES-style triangle: 32 steps per cycle, so it buzzes a little."""
    ph = (np.arange(n) * freq / SR) % 1.0
    tri = 1 - 4 * np.abs(ph - 0.5)
    return np.round(tri * 7.5) / 7.5


_lfsr_cache = {}
def lfsr_noise(n, short=False, rate=18000):
    key = (short, rate)
    if key not in _lfsr_cache:
        L = int(SR * 2)
        reg, out = 1, np.zeros(L)
        step = rate / SR
        acc, bit = 0.0, 1.0
        tap = 6 if short else 1
        for i in range(L):
            acc += step
            while acc >= 1:
                acc -= 1
                fb = (reg ^ (reg >> tap)) & 1
                reg = (reg >> 1) | (fb << 14)
                bit = 1.0 if reg & 1 else -1.0
            out[i] = bit
        _lfsr_cache[key] = out
    src = _lfsr_cache[key]
    reps = int(np.ceil(n / len(src)))
    return np.tile(src, reps)[:n]


def env(n, a, d, s, r):
    return adsr(n, a, d, s, r)


def chip_lead(freq, n, fc=3800, vib=14, a=0.02, r=0.25, s=0.75):
    x = pulse(freq, n, duty=0.25, vib_hz=5.5, vib_cents=vib * 1.4, vib_delay=0.14)
    x = 0.7 * x + 0.3 * pulse(freq * 2 ** (6 / 1200), n, duty=0.25)   # a hair of chorus, like two channels
    return lowpass(x, 7000) * env(n, 0.004, 0.12, 0.72, min(r, 0.12)) * 0.55


def chip_arp(freq, n, fc_lo=500, fc_hi=4200, r=0.08, wave='square'):
    x = pulse(freq, n, duty=0.125)
    return lowpass(x, 6500) * perc_env(n, 0.09 if n > SR * 0.1 else 0.06) * 0.5


def chip_bass(freq, n, **kw):
    x = tri_stepped(freq, n)
    return x * env(n, 0.002, 0.08, 0.9, 0.03) * 0.9


def chip_pad(freq, n, fc=1400, a=0.5, r=1.4, s=0.85, width=1.0, shimmer=0.0, sub=0.35):
    # A soft 50% square an octave down the chord, with slow tremolo: the "held channel".
    t = np.arange(n) / SR
    x = pulse(freq, n, duty=0.5) * (0.85 + 0.15 * np.sin(2 * np.pi * 6 * t))
    x = lowpass(x, 1800)
    e = adsr(n, min(a, 0.25), 0.4, 0.55, min(r, 0.6))
    y = x * e * 0.35
    return np.stack([y, y])


def chip_drum(kind, variant=0):
    if kind in ('kick', 'kick_deep', 'kick_metal'):
        n = int(0.2 * SR); t = np.arange(n) / SR
        f = 45 + 170 * np.exp(-t * 38)
        ph = (0.25 + np.cumsum(f / SR)) % 1.0          # starts at zero, no click
        body = (1 - 4 * np.abs(ph - 0.5)) * np.exp(-t * 16)
        click = lfsr_noise(n, rate=24000) * np.exp(-t * 220) * 0.35
        return (body + click) * 1.1
    if kind in ('snare', 'snare_big', 'snare_metal', 'clap'):
        n = int(0.22 * SR); t = np.arange(n) / SR
        nz = lfsr_noise(n, rate=14000) * np.exp(-t * (15 if kind == 'snare_big' else 22))
        f = 220 * np.exp(-t * 12) + 150
        ph = np.cumsum(f / SR) % 1.0
        tone = np.where(ph < 0.5, 1.0, -1.0) * np.exp(-t * 40) * 0.35
        return (nz * 0.8 + tone) * 0.9
    if kind in ('hat', 'shaker', 'rim'):
        n = int(0.05 * SR); t = np.arange(n) / SR
        return highpass(lfsr_noise(n, short=True, rate=30000), 5000) * np.exp(-t * 140) * 0.4
    if kind in ('hat_open', 'ride', 'crash', 'china'):
        n = int(0.3 * SR); t = np.arange(n) / SR
        return lfsr_noise(n, short=kind != 'crash', rate=30000) * np.exp(-t * (9 if kind == 'crash' else 14)) * 0.45
    if kind in ('tom', 'tom_floor'):
        n = int(0.25 * SR); t = np.arange(n) / SR
        f0 = [110, 150, 200][variant % 3]
        f = f0 * (1 + 0.6 * np.exp(-t * 18))
        ph = (0.25 + np.cumsum(f / SR)) % 1.0
        return (1 - 4 * np.abs(ph - 0.5)) * np.exp(-t * 12) * 0.9
    if kind == 'boom':
        n = int(0.8 * SR); t = np.arange(n) / SR
        f = 36 + 80 * np.exp(-t * 9)
        ph = (0.25 + np.cumsum(f / SR)) % 1.0
        return (1 - 4 * np.abs(ph - 0.5)) * np.exp(-t * 4) * 0.8
    return np.zeros(10)


# Swap compose.py's voices for the chip ones (Track.render looks them up at call time).
C.inst_lead = chip_lead
C.inst_arp = chip_arp
C.inst_bass = chip_bass
C.inst_bass_soft = chip_bass
C.inst_pad = chip_pad
C.drum = chip_drum


# ----------------------------------------------------------------- loop renderer
class LoopTrack(C.Track):
    """Renders pre + body + post and keeps only the body: a seamless loop."""
    def render(self):
        body = self.sections
        spb = 60.0 / self.bpm
        body_bars = sum(s['bars'] for s in body)
        self.sections = [body[-1]] + body + [body[0]]
        pre_bars = body[-1]['bars']
        full = C.Track.render(self)
        self.sections = body
        a = int(round(pre_bars * 4 * spb * SR))
        b = a + int(round(body_bars * 4 * spb * SR))
        # Track.render faded the ends of the full render; the body is well inside them.
        y = full[:, a:b].copy()
        # The seam: what follows the body's last sample is full[b:]; what the body starts
        # with followed the pre-roll. Crossfade the one into the other over 12 ms at the
        # head, so the jump from the last sample back to the first is continuous.
        m = int(0.012 * SR)
        w = np.sin(np.linspace(0, np.pi / 2, m)) ** 2
        y[:, :m] = full[:, b:b + m] * (1 - w) + full[:, a:a + m] * w
        return y


LOOPS = {}


def loop(name, *a, **kw):
    LOOPS[name] = LoopTrack(name, *a, **kw)


S = C.S
Key = C.Key

# Tempo and key from Jerry's tracks (extract.py): day skirmish B 112 bpm A major, day
# skirmish A 111 bpm A minor, fight 1A 126 bpm D major / B minor, fight 2A 143.5 bpm
# B major / G# minor, fight 3A 172 bpm E minor.
COMMON = dict(chord_oct=0, pad_oct=-1, bass_oct=-2, arp_oct=0, lead_lo=67, lead_hi=86, dly_beats=0.75,
              dly_fb=0.3, dly_wet=0.7, rev_size=0.7, rev_wet=0.22, pad_rev=0.2)


def G(**g):
    base = {'pad': 0.16, 'bass': 0.34, 'drums': 0.52, 'arp': 0.12, 'lead': 0.2}
    base.update(g)
    return base


loop('chip_skirmish_b', 112.35, Key(57, 'mixolydian'), [(0, 4), (4, 3), (6, 3), (3, 4), (0, 4), (4, 3), (5, 4), (4, 3)],
     [S(8, pad=1, bass='syncop', drums='four16', arp=1, energy=0.7),
      S(8, pad=1, bass='syncop', drums='four16', arp=1, lead=1, energy=0.85),
      S(8, pad=1, bass='roots8', drums='break', arp=1, lead=1, lead_density=1.0, energy=0.9)],
     seed=311, arp='sync', arp_rate=0.25, gains=G(), **COMMON)

loop('chip_skirmish_a', 111.25, Key(57, 'minor'), [(0, 4), (5, 4), (2, 4), (6, 3), (0, 4), (5, 4), (3, 4), (4, 3)],
     [S(8, pad=1, bass='roots8', drums='four16', arp=1, energy=0.7),
      S(8, pad=1, bass='syncop', drums='break', arp=1, lead=1, energy=0.85),
      S(8, pad=1, bass='drive16', drums='drive', arp=1, lead=1, lead_density=1.0, energy=0.95)],
     seed=317, arp='updown', arp_rate=0.25, gains=G(), **COMMON)

loop('chip_fight_1', 126.08, Key(59, 'minor'), [(0, 4), (0, 4), (5, 4), (6, 3), (0, 4), (0, 4), (3, 4), (4, 3)],
     [S(8, pad=1, bass='roots8', drums='four16', arp=1, energy=0.75),
      S(8, pad=1, bass='drive16', drums='drive', arp=1, lead=1, energy=0.9),
      S(8, pad=1, bass='syncop', drums='drive', arp=1, lead=1, lead_density=1.0, energy=1.0)],
     seed=331, arp='sync', arp_rate=0.25, gains=G(drums=0.55), **COMMON)

loop('chip_fight_2', 143.55, Key(56, 'harm_minor'), [(0, 4), (5, 4), (0, 4), (4, 3), (0, 4), (5, 4), (3, 4), (4, 3)],
     [S(8, pad=1, bass='drive16', drums='break', arp=1, energy=0.8),
      S(8, pad=1, bass='drive16', drums='drive', arp=1, lead=1, energy=0.95),
      S(8, pad=1, bass='syncop', drums='break', arp=1, lead=1, lead_density=1.0, energy=1.0)],
     seed=337, arp='wide', arp_rate=0.25, gains=G(drums=0.56), **COMMON)

loop('chip_fight_3', 172.27, Key(52, 'phrygian'), [(0, 4), (1, 3), (0, 4), (6, 3), (0, 4), (1, 3), (3, 4), (5, 4)],
     [S(8, pad=1, bass='roots8', drums='four', arp=1, energy=0.85),
      S(8, pad=1, bass='roots8', drums='drive', arp=1, lead=1, energy=1.0),
      S(8, pad=1, bass='syncop', drums='four', arp=1, lead=1, lead_density=1.0, energy=1.0)],
     seed=347, arp='down', arp_rate=0.25, gains=G(drums=0.58), **COMMON)


if __name__ == '__main__':
    import time
    out = sys.argv[1] if len(sys.argv) > 1 else 'out'
    only = sys.argv[2:] or list(LOOPS)
    os.makedirs(out, exist_ok=True)
    for name in only:
        t0 = time.time()
        y = LOOPS[name].render()
        write_wav(os.path.join(out, name + '.wav'), y)
        print(f'{name}: {y.shape[1] / SR:.3f}s ({LOOPS[name].bpm} bpm) rendered in {time.time() - t0:.1f}s', flush=True)
