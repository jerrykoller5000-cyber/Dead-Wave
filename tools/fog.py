"""Dead-Wave · Fog Night's own score (CL-77, P-58).

Night 14 is Fog Night (GB-87): the mist rolls in at the alarm and you can't see past 30 m. Its score is the run's own
song (First Blood's family, tools/hordes.py) on night 14's tier, D minor, a little slower (112 bpm), heard through
the fog: the same sections and the same arc, so the director scores it like every other night.

  stalk   all but drowned: the band far off behind a wall of mist (low cutoff, long wet tail), a foghorn on the
          first bar, the mist breathing over it
  break   the same: they've gone back into the fog
  dropA, riffB, dropA2, bridge   the fight comes out of the fog: clearer every section, the mist thinner
  climax  almost clear: the last few, close enough to see

Every section stays a circle: the filter, the reverb (circular convolution) and the horn's tail wrap round its own
loop, so the section player loops it with no seam. Levels are the hordes' (day1.SECTION_DB).

  python3 fog.py out/            ->  out/fight_fognight_sections.wav and .json
  python3 fog.py out/ --cached   (reuse out/fight_fognight_raw.npz, the band before the fog)
"""
import sys, os, json, time
import numpy as np
import day1 as D
import hordes as Hd
from synth import SR, write_wav, midi_to_hz

NAME = 'fight_fognight'
BPM, TRANSPOSE, DRIVE = 112, -2, 2          # night 14's key (D minor), drive 2, a touch slower

# How deep in the fog each section sits: 1 = all but drowned, 0 = clear.
DEPTH = {'stalk': 1.0, 'break': 0.9, 'dropA': 0.62, 'riffB': 0.55, 'dropA2': 0.48, 'bridge': 0.42, 'climax': 0.22}
HORN = {'stalk': 1.0, 'break': 0.8, 'dropA': 0.35, 'bridge': 0.3}   # the foghorn on bar 1, and how loud
LEVEL_DB = {'stalk': -21.5, 'break': -19.5}   # a little quieter than the hordes' (it's far off); others as day1


def lowpass_circle(y, cutoff, order=2):
    """A smooth low-pass done in the frequency domain, so it is circular (loops stay seamless)."""
    n = y.shape[1]
    f = np.fft.rfftfreq(n, 1 / SR)
    h = 1 / np.sqrt(1 + (f / cutoff) ** (2 * order))
    return np.fft.irfft(np.fft.rfft(y, axis=1) * h, n=n, axis=1)


def fog_ir(seconds=3.6, seed=7):
    """A soft, dark tail: decaying noise, darker as it goes, the two sides decorrelated."""
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    env = np.exp(-t * 6.9 / seconds) * np.minimum(1, t / 0.03)
    ir = rng.standard_normal((2, n)) * env
    # darker with time: blend toward a low-passed copy
    dark = lowpass_circle(np.pad(ir, ((0, 0), (0, n))), 1800)[:, :n]
    k = np.minimum(1, t / seconds * 1.6)
    ir = ir * (1 - k) + dark * k
    return ir / np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))


def reverb_circle(y, ir):
    n = y.shape[1]
    irp = np.zeros_like(y)
    m = min(n, ir.shape[1])
    irp[:, :m] = ir[:, :m]
    return np.fft.irfft(np.fft.rfft(y, axis=1) * np.fft.rfft(irp, axis=1), n=n, axis=1)


def mist(n, bar_s, depth, seed):
    """The mist: soft filtered noise swelling over two bars at a time."""
    rng = np.random.default_rng(seed)
    w = rng.standard_normal((2, n))
    f = np.fft.rfftfreq(n, 1 / SR)
    band = np.exp(-((np.log2(np.maximum(f, 1) / 700)) ** 2) / 1.2)   # a soft hump round 700 Hz
    w = np.fft.irfft(np.fft.rfft(w, axis=1) * band, n=n, axis=1)
    t = np.arange(n) / SR
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / (2 * bar_s) - np.pi / 2)   # whole number of swells per section
    w = w * swell / (np.sqrt(np.mean(w ** 2)) + 1e-12)
    return w * depth


def foghorn(n, bar_s, root_midi, level):
    """A far foghorn on the first bar: a low reedy two-note call, swelling in and out (wraps round the loop)."""
    out = np.zeros((2, n))
    notes = [(0.0, 1.6, root_midi), (1.75, 2.6, root_midi - 5)]     # root, then the fourth below
    for st_beats, dur_beats, m in notes:
        st = st_beats * bar_s / 4 * 2.0
        dur = dur_beats * bar_s / 4 * 2.0
        L = int(dur * SR); t = np.arange(L) / SR
        f0 = midi_to_hz(m)
        ph = 2 * np.pi * f0 * t + 0.6 * np.sin(2 * np.pi * 0.35 * t)   # a slight sag in the pitch
        tone = sum((0.9 ** k) / k * np.sin(k * ph) for k in range(1, 9))   # reedy
        env = np.minimum(1, t / 0.45) * np.minimum(1, (dur - t) / 0.9)
        tone = tone * np.clip(env, 0, 1)
        i0 = int(st * SR)
        idx = (np.arange(L) + i0) % n
        out[0, idx] += tone * 0.95
        out[1, idx] += tone * 1.0
    out = lowpass_circle(out, 520, order=3)
    return out / (np.sqrt(np.mean(out ** 2)) + 1e-12) * level


def fog_section(y, name, bar_s, root_midi, ir, seed):
    d = DEPTH[name]
    n = y.shape[1]
    cutoff = 900 * (16000 / 900) ** (1 - d)          # 900 Hz drowned, ~16 kHz clear
    dry = lowpass_circle(y, cutoff)
    wet = reverb_circle(lowpass_circle(y, min(cutoff, 3500)), ir)
    wet *= np.sqrt(np.mean(dry ** 2)) / (np.sqrt(np.mean(wet ** 2)) + 1e-12)
    mix = 0.18 + 0.42 * d                              # how much of it is the fog's tail
    z = dry * (1 - mix) + wet * mix
    base = np.sqrt(np.mean(z ** 2))
    z = z + mist(n, bar_s, base * (0.05 + 0.22 * d), seed)
    if name in HORN:
        h = foghorn(n, bar_s, root_midi, base * 0.55 * HORN[name])
        z = z + reverb_circle(h, ir) * 0.7 + h * 0.3
    # the mono, centred stalk widens as the fog thins
    mid = (z[0] + z[1]) / 2; side = (z[0] - z[1]) / 2
    side *= 0.7 + 0.3 * (1 - d)
    return np.stack([mid + side, mid - side])


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'out'
    os.makedirs(out, exist_ok=True)
    raw_path = os.path.join(out, NAME + '_raw.npz')
    Hd.configure(BPM, TRANSPOSE, DRIVE)
    t0 = time.time()
    if '--cached' in sys.argv and os.path.exists(raw_path):
        r = np.load(raw_path, allow_pickle=True); z, table = r['z'], list(r['table'])
    else:
        z, table = D.render_sections()
        np.savez(raw_path, z=z, table=np.array(table, dtype=object))
    print(f'band: {z.shape[1] / SR:.1f}s, {time.time() - t0:.0f}s', flush=True)
    bar_s = D.BAR_S
    root = 38 + TRANSPOSE + 2      # the horn sits on the key's root, low (D2)
    ir = fog_ir()
    parts, a = [], 0
    for i, sec in enumerate(table):
        b = a + int(round(sec['bars'] * bar_s * SR))   # as day1.render lays each circle
        y = fog_section(z[:, a:b], sec['name'], bar_s, root, ir, seed=11 + i)
        y = D.level(y, target_db=LEVEL_DB.get(sec['name'], D.SECTION_DB[sec['name']]))
        parts.append(y); a = b
    y = np.concatenate(parts, axis=1)
    assert y.shape[1] == z.shape[1]
    write_wav(os.path.join(out, NAME + '_sections.wav'), y)
    json.dump({'bpm': BPM, 'barSeconds': bar_s, 'sections': table}, open(os.path.join(out, NAME + '_sections.json'), 'w'), indent=1)
    print(f'{NAME}: {y.shape[1] / SR:.1f}s at {BPM} bpm, {time.time() - t0:.0f}s', flush=True)


if __name__ == '__main__':
    main()
