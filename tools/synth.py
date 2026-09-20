"""Small offline synth used by compose.py — numpy only, chunk-recursive delays/reverb
so nothing needs a per-sample Python loop."""
import numpy as np
import scipy.signal as sg

SR = 44100


def midi_to_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def t_axis(n):
    return np.arange(n, dtype=np.float64) / SR


# ---------------------------------------------------------------- envelopes
def adsr(n, a, d, s, r, sr=SR):
    """Linear-attack, exponential-ish decay/release envelope of n samples; the note's
    'held' length is n - r*sr (release starts there)."""
    a_n, d_n, r_n = int(a * sr), int(d * sr), int(r * sr)
    env = np.zeros(n)
    hold_end = max(a_n + 1, n - r_n)
    # attack
    ae = min(a_n, n)
    if ae > 0:
        env[:ae] = np.linspace(0, 1, ae, endpoint=False)
    # decay to sustain
    de = min(hold_end, ae + d_n)
    if de > ae:
        k = np.linspace(0, 1, de - ae, endpoint=False)
        env[ae:de] = 1 + (s - 1) * (1 - np.exp(-4 * k)) / (1 - np.exp(-4))
    if hold_end > de:
        env[de:hold_end] = s
    # release
    if n > hold_end:
        start = env[hold_end - 1] if hold_end > 0 else s
        k = np.linspace(0, 1, n - hold_end)
        env[hold_end:] = start * np.exp(-5.5 * k)
    return env


def perc_env(n, decay, sr=SR, curve=6.0):
    k = np.linspace(0, 1, n)
    return np.exp(-curve * k / max(decay * sr / n, 1e-6) * 1.0) if False else np.exp(-k * n / (decay * sr) * 1.0)


# ---------------------------------------------------------------- oscillators
def osc_saw(freq, n, detune_cents=0.0, phase=0.0):
    f = freq * 2 ** (detune_cents / 1200)
    ph = (phase + np.cumsum(np.full(n, f / SR))) % 1.0
    return 2 * ph - 1


def osc_square(freq, n, pw=0.5, phase=0.0):
    ph = (phase + np.cumsum(np.full(n, freq / SR))) % 1.0
    return np.where(ph < pw, 1.0, -1.0)


def osc_tri(freq, n, phase=0.0):
    ph = (phase + np.cumsum(np.full(n, freq / SR))) % 1.0
    return 4 * np.abs(ph - 0.5) - 1


def osc_sine(freq, n, phase=0.0):
    return np.sin(2 * np.pi * (phase + np.cumsum(np.full(n, freq / SR))))


def osc_sine_fm(freq, n, ratio=2.0, index=1.5, index_env=None):
    t = t_axis(n)
    mod = np.sin(2 * np.pi * freq * ratio * t)
    idx = index if index_env is None else index * index_env
    return np.sin(2 * np.pi * freq * t + idx * mod)


def additive_saw(freq, n, max_h=24, roll=1.0, vib_hz=5.0, vib_cents=0.0, vib_delay=0.15):
    """Band-limited saw with optional delayed vibrato. Only for leads (few notes)."""
    t = t_axis(n)
    fmul = np.ones(n)
    if vib_cents > 0:
        ramp = np.clip((t - vib_delay) / 0.35, 0, 1)
        fmul = 2 ** (vib_cents / 1200 * np.sin(2 * np.pi * vib_hz * t) * ramp)
    ph = np.cumsum(freq * fmul / SR)
    out = np.zeros(n)
    K = int(min(max_h, 18000 / freq))
    for k in range(1, K + 1):
        out += np.sin(2 * np.pi * k * ph) / (k ** roll)
    return out * (2 / np.pi)


# ---------------------------------------------------------------- filters
def lowpass(x, fc, order=2, q=None):
    fc = float(np.clip(fc, 30, SR * 0.45))
    b, a = sg.butter(order, fc / (SR / 2))
    return sg.lfilter(b, a, x)


def highpass(x, fc, order=2):
    fc = float(np.clip(fc, 10, SR * 0.45))
    b, a = sg.butter(order, fc / (SR / 2), btype='high')
    return sg.lfilter(b, a, x)


def bandpass(x, lo, hi, order=2):
    lo = float(np.clip(lo, 20, SR * 0.44)); hi = float(np.clip(hi, lo + 10, SR * 0.45))
    b, a = sg.butter(order, [lo / (SR / 2), hi / (SR / 2)], btype='band')
    return sg.lfilter(b, a, x)


def filt_env_mix(x, fc_lo, fc_hi, env):
    """Cheap filter-envelope: crossfade a dark and a bright version by env (0..1)."""
    dark = lowpass(x, fc_lo)
    bright = lowpass(x, fc_hi)
    return dark + (bright - dark) * env


def drive(x, amount=1.0):
    return np.tanh(x * amount) / np.tanh(amount) if amount > 0 else x


# ---------------------------------------------------------------- chunked delays
def comb_feedback(x, delay_s, fb, damp_fc=None):
    """y[n] = x[n] + fb * lp(y[n-D]); chunk recursion (chunk = D)."""
    D = max(1, int(delay_s * SR))
    n = len(x)
    pad = (-n) % D
    xp = np.concatenate([x, np.zeros(pad)])
    y = np.zeros_like(xp)
    chunks = len(xp) // D
    zi = None
    if damp_fc is not None:
        b, a = sg.butter(1, float(damp_fc) / (SR / 2))
        zi = sg.lfilter_zi(b, a) * 0
    prev = np.zeros(D)
    for c in range(chunks):
        s = c * D
        fbk = prev
        if damp_fc is not None:
            fbk, zi = sg.lfilter(b, a, prev, zi=zi)
        y[s:s + D] = xp[s:s + D] + fb * fbk
        prev = y[s:s + D]
    return y[:n]


def allpass(x, delay_s, g=0.5):
    D = max(1, int(delay_s * SR))
    n = len(x)
    pad = (-n) % D
    xp = np.concatenate([x, np.zeros(pad)])
    y = np.zeros_like(xp)
    chunks = len(xp) // D
    xprev = np.zeros(D); yprev = np.zeros(D)
    for c in range(chunks):
        s = c * D
        xc = xp[s:s + D]
        y[s:s + D] = -g * xc + xprev + g * yprev
        xprev = xc; yprev = y[s:s + D]
    return y[:n]


def reverb(stereo, size=1.0, damp=3500, wet=0.25, predelay=0.02):
    """Schroeder reverb on a (2, n) buffer. Returns wet-only (2, n) signal."""
    combs = [0.0297, 0.0371, 0.0411, 0.0437, 0.0503, 0.0561]
    aps = [0.0050, 0.0017, 0.0113]
    out = np.zeros_like(stereo)
    pd = int(predelay * SR)
    for ch in range(2):
        x = stereo[ch]
        if pd > 0:
            x = np.concatenate([np.zeros(pd), x[:-pd]])
        acc = np.zeros_like(x)
        for i, d in enumerate(combs):
            dd = d * size * (1.0 + 0.011 * ch * (i % 2 * 2 - 1))  # slight L/R difference
            acc += comb_feedback(x, dd, 0.80 + 0.03 * (i % 3), damp_fc=damp)
        acc /= len(combs)
        for d in aps:
            acc = allpass(acc, d * (1.0 + 0.02 * ch), 0.5)
        out[ch] = acc
    return out * wet


def stereo_delay(stereo, time_s, fb=0.35, wet=0.3, damp=4000, pingpong=True):
    n = stereo.shape[1]
    D = max(1, int(time_s * SR))
    pad = (-n) % D
    L = np.concatenate([stereo[0], np.zeros(pad)]); R = np.concatenate([stereo[1], np.zeros(pad)])
    yL = np.zeros_like(L); yR = np.zeros_like(R)
    b, a = sg.butter(1, float(damp) / (SR / 2))
    ziL = sg.lfilter_zi(b, a) * 0; ziR = ziL.copy()
    pL = np.zeros(D); pR = np.zeros(D)
    for c in range(len(L) // D):
        s = c * D
        fL, ziL = sg.lfilter(b, a, pL, zi=ziL)
        fR, ziR = sg.lfilter(b, a, pR, zi=ziR)
        if pingpong:
            yL[s:s + D] = L[s:s + D] * 0.5 + fb * fR
            yR[s:s + D] = R[s:s + D] * 0.5 + fb * fL
        else:
            yL[s:s + D] = L[s:s + D] + fb * fL
            yR[s:s + D] = R[s:s + D] + fb * fR
        pL = yL[s:s + D]; pR = yR[s:s + D]
    wetsig = np.stack([yL[:n], yR[:n]])
    # the "dry" part of the tap is already inside y; subtract to keep it wet-only
    wetsig -= stereo * (0.5 if pingpong else 1.0)
    return wetsig * wet


# ---------------------------------------------------------------- drums (cached)
_drum_cache = {}


def drum(kind, variant=0):
    key = (kind, variant)
    if key in _drum_cache:
        return _drum_cache[key]
    rng = np.random.default_rng(1000 + variant * 7 + hash(kind) % 97)
    if kind == 'kick':
        n = int(0.42 * SR); t = t_axis(n)
        f = 42 + 110 * np.exp(-t * 26)
        ph = np.cumsum(f / SR)
        body = np.sin(2 * np.pi * ph) * np.exp(-t * 7.5)
        click = highpass(rng.standard_normal(n), 1800) * np.exp(-t * 180) * 0.6
        x = drive(body * 1.4 + click, 1.6)
    elif kind == 'kick_deep':
        n = int(0.9 * SR); t = t_axis(n)
        f = 34 + 90 * np.exp(-t * 14)
        ph = np.cumsum(f / SR)
        body = np.sin(2 * np.pi * ph) * np.exp(-t * 3.6)
        thump = lowpass(rng.standard_normal(n), 220) * np.exp(-t * 18) * 0.8
        x = drive(body * 1.5 + thump, 1.8)
    elif kind == 'snare':
        n = int(0.28 * SR); t = t_axis(n)
        tone = (np.sin(2 * np.pi * 186 * t) + 0.5 * np.sin(2 * np.pi * 330 * t)) * np.exp(-t * 28)
        noise = bandpass(rng.standard_normal(n), 900, 7000) * np.exp(-t * 16)
        x = drive(tone * 0.9 + noise * 1.1, 1.3)
    elif kind == 'snare_big':
        n = int(0.5 * SR); t = t_axis(n)
        tone = (np.sin(2 * np.pi * 160 * t) + 0.6 * np.sin(2 * np.pi * 250 * t)) * np.exp(-t * 20)
        noise = bandpass(rng.standard_normal(n), 500, 6000) * np.exp(-t * 9)
        x = drive(tone + noise * 1.2, 1.5)
    elif kind == 'clap':
        n = int(0.3 * SR); t = t_axis(n)
        noise = bandpass(rng.standard_normal(n), 1200, 5000)
        env = np.zeros(n)
        for k, off in enumerate([0, 0.011, 0.022, 0.033]):
            i = int(off * SR)
            env[i:] = np.maximum(env[i:], np.exp(-(t[:n - i]) * (60 if k < 3 else 14)))
        x = noise * env
    elif kind == 'hat':
        n = int(0.07 * SR); t = t_axis(n)
        x = highpass(rng.standard_normal(n), 7000) * np.exp(-t * 90)
    elif kind == 'hat_open':
        n = int(0.32 * SR); t = t_axis(n)
        x = highpass(rng.standard_normal(n), 6500) * np.exp(-t * 11)
    elif kind == 'ride':
        n = int(0.6 * SR); t = t_axis(n)
        ping = np.sin(2 * np.pi * 5200 * t) * 0.3 + np.sin(2 * np.pi * 7900 * t) * 0.2
        x = (highpass(rng.standard_normal(n), 5000) * 0.6 + ping) * np.exp(-t * 6)
    elif kind == 'tom':
        n = int(0.5 * SR); t = t_axis(n)
        f0 = [95, 130, 170][variant % 3]
        f = f0 * (1 + 0.8 * np.exp(-t * 20))
        ph = np.cumsum(f / SR)
        x = np.sin(2 * np.pi * ph) * np.exp(-t * 6) + lowpass(rng.standard_normal(n), 600) * np.exp(-t * 30) * 0.4
        x = drive(x, 1.3)
    elif kind == 'shaker':
        n = int(0.09 * SR); t = t_axis(n)
        x = bandpass(rng.standard_normal(n), 4000, 11000) * np.exp(-t * 60)
    elif kind == 'boom':
        n = int(2.2 * SR); t = t_axis(n)
        f = 30 + 60 * np.exp(-t * 6)
        ph = np.cumsum(f / SR)
        x = np.sin(2 * np.pi * ph) * np.exp(-t * 1.6) + lowpass(rng.standard_normal(n), 140) * np.exp(-t * 4) * 1.2
        x = drive(x, 2.0)
    elif kind == 'rim':
        n = int(0.08 * SR); t = t_axis(n)
        x = (np.sin(2 * np.pi * 800 * t) * np.exp(-t * 90) + bandpass(rng.standard_normal(n), 2000, 6000) * np.exp(-t * 120)) * 0.8
    else:
        raise ValueError(kind)
    x = x / (np.max(np.abs(x)) + 1e-9)
    _drum_cache[key] = x
    return x


# ---------------------------------------------------------------- mix helpers
def add_at(buf, sig, start, gain=1.0, pan=0.0):
    """Add mono sig into stereo buf (2, n) at sample start with constant-power pan."""
    n = buf.shape[1]
    if start >= n or start + len(sig) <= 0:
        return
    s0 = max(0, start); s1 = min(n, start + len(sig))
    seg = sig[s0 - start:s1 - start]
    th = (pan + 1) * np.pi / 4
    buf[0, s0:s1] += seg * gain * np.cos(th)
    buf[1, s0:s1] += seg * gain * np.sin(th)


def add_stereo_at(buf, sig, start, gain=1.0):
    n = buf.shape[1]
    s0 = max(0, start); s1 = min(n, start + sig.shape[1])
    if s1 <= s0:
        return
    buf[:, s0:s1] += sig[:, s0 - start:s1 - start] * gain


def soft_master(stereo, ceiling=0.89, lp=15000):
    x = stereo.copy()
    x[0] = lowpass(x[0], lp); x[1] = lowpass(x[1], lp)
    x[0] = highpass(x[0], 36); x[1] = highpass(x[1], 36)
    # gentle bus compression: envelope follower on the sum, cap gain reduction
    env = np.abs(x).max(axis=0)
    b, a = sg.butter(1, 12 / (SR / 2))
    envf = sg.lfilter(b, a, env)
    gain = np.where(envf > 0.55, (0.55 + (envf - 0.55) * 0.45) / np.maximum(envf, 1e-9), 1.0)
    x *= gain
    x = np.tanh(x * 1.15) / np.tanh(1.15)
    peak = np.max(np.abs(x)) + 1e-9
    return x * (ceiling / peak)


def write_wav(path, stereo):
    import scipy.io.wavfile as w
    y = np.clip(stereo.T, -1, 1)
    w.write(path, SR, (y * 32767).astype(np.int16))
