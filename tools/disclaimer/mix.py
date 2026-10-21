# CL-191: the disclaimer's sound, mixed once into one track (no runtime scheduling, nothing to drift).
# python3 mix.py SRC_DIR OUT.wav   (SRC_DIR holds Jerry's clips under the names in timeline.json)
import json, subprocess, sys, numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
SR = 48000
src, out = sys.argv[1].rstrip('/') + '/', sys.argv[2]
import os
T = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'timeline.json')))
DROP = T['drop']

def load(name, start=None, dur=None):
    cmd = ['ffmpeg', '-v', 'error']
    if start is not None: cmd += ['-ss', f'{start:.6f}']
    if dur is not None: cmd += ['-t', f'{dur:.6f}']
    cmd += ['-i', src + name, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)

def db(x): return 10 ** (x / 20)
def lufs_ish(x):   # K-weighting is close enough to plain RMS for relative gains between these clips; final level is measured by ffmpeg
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)

def ramp(n, a, b, kind='lin'):
    t = np.linspace(0, 1, n)
    if kind == 'cos': t = 0.5 - 0.5 * np.cos(np.pi * t)
    return a + (b - a) * t

def place(bus, clip, at, gain=1.0):
    i = int(round(at * SR))
    if i < 0: clip = clip[-i:]; i = 0
    n = min(len(clip), len(bus) - i)
    if n > 0: bus[i:i + n] += clip[:n] * gain

def impulse(sec, decay, bright=4000, seed=1):
    rng = np.random.default_rng(seed)
    n = int(sec * SR); t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-t / decay)[:, None]
    sos = butter(2, bright, 'low', fs=SR, output='sos')
    ir = sosfilt(sos, ir, axis=0)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt(np.sum(ir ** 2))

shot_at = DROP + T['lines'][-1]['voiceAt'] + T['lines'][-1]['shotAt']
total = shot_at + T['tail']   # picture and sound end together; the shot's ring-out is faded into the last black frames
N = int(total * SR)
music = np.zeros((N, 2)); voice = np.zeros((N, 2)); fx = np.zeros((N, 2))

# Siren: Jerry's file, from the first frame of light; its tail is pulled down into the drop.
siren = load('siren.mp3')
siren *= db(-16 - lufs_ish(siren))   # the file is hot (about -4 LUFS); the cold open, as loud as the voices
place(fx, siren, T['sirenAt'])
a, b = T['sirenFade']
ia, ib = int(a * SR), int(b * SR)
env = np.ones(N); env[ia:ib] = ramp(ib - ia, 1, 0, 'cos'); env[ib:] = 0
fx *= env[:, None]

# Song: the dance excerpt's beat 0 on the drop, with its quiet lead-in rising under the siren.
S = T['song']; lead = S['leadIn']
song = load(S['file'], S['sourceAtDrop'] - lead, lead + (shot_at - DROP) + 0.1)
song *= db(-21 - lufs_ish(song[int(lead * SR):]))
g = np.ones(len(song))
fa, fb = (S['leadFade'][0] - (DROP - lead)), (S['leadFade'][1] - (DROP - lead))
ia, ib = int(fa * SR), int(fb * SR)
g[:ia] = 0; g[ia:ib] = ramp(ib - ia, 0, 1, 'cos')
song *= g[:, None]
place(music, song, DROP - lead)

# Voices, and the duck under them.
duck = np.ones(N)
def chirp_chain(x):
    x = sosfilt(butter(2, 380, 'high', fs=SR, output='sos'), x, axis=0)
    x = sosfilt(butter(2, 1700, 'low', fs=SR, output='sos'), x, axis=0)
    m = x.mean(1); pan = -0.55; th = (pan + 1) * np.pi / 4
    x = np.stack([m * np.cos(th), m * np.sin(th)], 1)
    y = x.copy()
    dark = butter(1, 1100, 'low', fs=SR, output='sos')
    for k, (dt, gk) in enumerate([(0.19, 0.42), (0.38, 0.2), (0.57, 0.09)]):
        tap = sosfilt(dark, x, axis=0) * gk
        tap = tap[:, ::-1] if k % 2 == 0 else tap   # the echo comes back off the other side
        y = np.concatenate([y, np.zeros((int(dt * SR), 2))]) if len(y) < len(x) + int(dt * SR) else y
        pad = np.zeros_like(y); n0 = int(dt * SR); pad[n0:n0 + len(tap)] = tap[: len(y) - n0]
        y += pad
    wet = fftconvolve(y, impulse(1.3, 0.35, 2500, 3), axes=0)
    y = np.concatenate([y, np.zeros((len(wet) - len(y), 2))]) + wet * 0.5
    return y
chirps = {}
def chirp_for(name):   # the distant guy: each take through the same far-away chain, at the same level
    if name not in chirps:
        src = load(name); c = chirp_chain(src); c *= db(-34 - lufs_ish(src)); chirps[name] = c
    return chirps[name]
for L in T['lines']:
    v = load(L['voice'])
    v *= db(-17 - lufs_ish(v))
    at = DROP + L['voiceAt']
    place(voice, v, at)
    s0, s1 = int((at - 0.06) * SR), int((at + len(v) / SR + 0.12) * SR)
    duck[max(0, s0):s1] = np.minimum(duck[max(0, s0):s1], db(-6))
    for c in L.get('chirps', []): place(fx, chirp_for(c['file']), at + c['at'])
# Smooth the duck: fast down, slow up.
sm = np.empty_like(duck); cur = 1.0
att, rel = np.exp(-1 / (0.05 * SR)), np.exp(-1 / (0.28 * SR))
for i in range(N):
    tgt = duck[i]; k = att if tgt < cur else rel
    cur = tgt + (cur - tgt) * k; sm[i] = cur
music *= sm[:, None]

# The shot: the song stops dead on it, the rifle rings off the walls.
i = int(shot_at * SR); n = int(0.025 * SR)
music[i:i + n] *= ramp(n, 1, 0)[:, None]; music[i + n:] = 0
shot = load(T['shot']['file'])
shot *= db(3) / (np.max(np.abs(shot)) + 1e-9)   # hot: the limiter takes it to the ceiling, the loudest moment
tail = fftconvolve(shot, impulse(1.9, 0.55, 3200, 7), axes=0)
tail *= 0.22 / (np.max(np.abs(tail)) + 1e-9)
place(fx, shot, shot_at); place(fx, tail, shot_at + 0.01)
i0, i1 = int((shot_at + T['tail'] * 0.45) * SR), N
fx[i0:i1] *= ramp(i1 - i0, 1, 0, 'cos')[:, None]

mix = music + voice + fx
# Peak limiter (look-ahead 3 ms, release 80 ms) to -1 dBFS.
ceil = db(-1.0); la = int(0.003 * SR)
pk = np.max(np.abs(mix), 1)
need = np.minimum(1, ceil / np.maximum(pk, 1e-9))
g = np.empty(N); cur = 1.0; r = np.exp(-1 / (0.08 * SR))
# look-ahead min over the window
from scipy.ndimage import minimum_filter1d
need = minimum_filter1d(need, size=2 * la + 1, origin=0)
for i in range(N):
    t = need[i]; cur = t if t < cur else t + (cur - t) * r; g[i] = cur
mix *= g[:, None]
mix = np.clip(mix, -1, 1)
# Loudness to -17 LUFS integrated (the caracal intro is about -20; this one carries voice and a beat), measured the
# proper way by ffmpeg; the limiter above keeps the peaks at -1 dBFS, so the gain only ever comes down.
import tempfile, os, re, wave
def measure(x):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: name = f.name
    with wave.open(name, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes())
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', name, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    os.unlink(name)
    return float(re.findall(r'I:\s+(-?[0-9.]+) LUFS', r)[-1])
I = measure(mix)
mix *= min(1.0, db(-17 - I))
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print(json.dumps({'shotAt': round(shot_at, 4), 'end': round(total, 4), 'loudnessBefore': I, 'peak': round(float(np.max(np.abs(mix))), 3)}))
