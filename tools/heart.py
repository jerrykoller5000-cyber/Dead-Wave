"""Dead-Wave · the guardian's last fight, in the heart under the Marrow (CL-85, P-99).

The run's own song (First Blood's family, tools/hordes.py) for the one fight that ends it: C# minor, 92 bpm, every drop
driving (DRIVE 3), played in the heart's big round cave: a long stone tail on everything, the cave's heartbeat under it
(a low double thump on every bar, "lub-dub", harder as the fight goes on), and the source's cold high ring (the Pit's
glyphs, its blue light) over the quiet parts.

The director (core/audio.js) plays it by the fight's phase, not the wave's: phase 1 the drops (dropA, riffB), phase 2
the second drop and the bridge (dropA2, bridge), phase 3, the columns coming down, the climax; while the Hush is flat
and nothing hurts it, the break. The stalk is the way in, before it comes.

  python3 heart.py out/            ->  out/fight_heart_sections.wav and .json
  python3 heart.py out/ --cached   (reuse out/fight_heart_raw.npz, the band before the cave)
"""
import sys, os, json, time
import numpy as np
import day1 as D
import hordes as Hd
from synth import SR, write_wav, midi_to_hz
from fog import lowpass_circle, reverb_circle

NAME = 'fight_heart'
BPM, TRANSPOSE, DRIVE = 92, -3, 3

BEAT = {'stalk': 0.55, 'dropA': 0.7, 'riffB': 0.7, 'break': 0.5, 'dropA2': 0.85, 'bridge': 0.9, 'climax': 1.1}
RING = {'stalk': 1.0, 'break': 1.0, 'bridge': 0.35}
WET = {'stalk': 0.38, 'break': 0.42, 'dropA': 0.24, 'riffB': 0.24, 'dropA2': 0.22, 'bridge': 0.26, 'climax': 0.2}


def cave_ir(seconds=4.6, seed=29):
    """A big round stone room: early reflections off the walls, then a long, slightly bright tail."""
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal((2, n)) * np.exp(-t * 6.9 / seconds)
    for k, (d, g) in enumerate([(0.023, 0.6), (0.041, 0.5), (0.067, 0.42), (0.089, 0.35), (0.121, 0.3)]):
        i = int(d * SR)
        ir[k % 2, i] += g * 3
        ir[(k + 1) % 2, i + int(0.003 * SR)] += g * 2
    ir = lowpass_circle(np.pad(ir, ((0, 0), (0, n))), 5200)[:, :n]
    return ir / np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))


def heartbeat(n, bar_s, level):
    """The cave's heartbeat: a low lub-dub on every bar (the dub a sixteenth and a half after), wrapping round the loop."""
    out = np.zeros((2, n))
    L = int(0.32 * SR); t = np.arange(L) / SR
    for off, amp, f0 in [(0.0, 1.0, 52), (bar_s / 16 * 1.5, 0.7, 47)]:
        f = f0 * (1 + 0.9 * np.exp(-t * 30))
        ph = 2 * np.pi * np.cumsum(f) / SR
        thump = np.sin(ph) * np.exp(-t * 9) * np.minimum(1, t / 0.004)
        bars = int(round(n / (bar_s * SR)))
        for b in range(bars):
            i0 = int(round((b * bar_s + off) * SR))
            idx = (np.arange(L) + i0) % n
            out[0, idx] += thump * amp
            out[1, idx] += thump * amp
    return out / (np.sqrt(np.mean(out ** 2)) + 1e-12) * level


def source_ring(n, root_midi, level, seed):
    """The source: a cold glassy ring, two high partials a hair apart, slowly breathing."""
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    sec = n / SR
    for k, (m, a) in enumerate([(root_midi + 36, 1.0), (root_midi + 43, 0.6), (root_midi + 48, 0.35)]):
        f = midi_to_hz(m)
        f = round(f * sec) / sec            # a whole number of cycles in the loop, so it wraps cleanly
        df = 1.0 / sec * (2 + k)            # and a slow beat between the sides, also whole
        out[0] += a * np.sin(2 * np.pi * f * t)
        out[1] += a * np.sin(2 * np.pi * (f + df) * t)
    swell = 0.6 + 0.4 * np.sin(2 * np.pi * t / sec * 2)
    out *= swell
    return out / (np.sqrt(np.mean(out ** 2)) + 1e-12) * level


def heart_section(y, name, bar_s, root, ir, seed):
    base = np.sqrt(np.mean(y ** 2))
    wet = reverb_circle(lowpass_circle(y, 6000), ir)
    wet *= base / (np.sqrt(np.mean(wet ** 2)) + 1e-12)
    m = WET[name]
    z = y * (1 - m) + wet * m
    hb = heartbeat(y.shape[1], bar_s, base * 0.42 * BEAT[name])
    z = z + hb + reverb_circle(hb, ir) * 0.25
    if name in RING:
        r = source_ring(y.shape[1], root, base * 0.16 * RING[name], seed)
        z = z + reverb_circle(r, ir) * 0.6 + r * 0.4
    return z


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
    root = 40 + TRANSPOSE   # E2 moved to the key: C#2
    ir = cave_ir()
    parts, a = [], 0
    for i, sec in enumerate(table):
        b = a + int(round(sec['bars'] * bar_s * SR))   # as day1.render lays each circle
        y = heart_section(z[:, a:b], sec['name'], bar_s, root, ir, seed=31 + i)
        y = D.level(y, target_db=D.SECTION_DB[sec['name']])
        parts.append(y); a = b
    y = np.concatenate(parts, axis=1)
    assert y.shape[1] == z.shape[1]
    write_wav(os.path.join(out, NAME + '_sections.wav'), y)
    json.dump({'bpm': BPM, 'barSeconds': bar_s, 'sections': table}, open(os.path.join(out, NAME + '_sections.json'), 'w'), indent=1)
    print(f'{NAME}: {y.shape[1] / SR:.1f}s at {BPM} bpm, {time.time() - t0:.0f}s', flush=True)


if __name__ == '__main__':
    main()
