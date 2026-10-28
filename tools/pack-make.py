#!/usr/bin/env python3
# tools/pack-make.py — CL-272 (D-94): make the game's takes from Jerry's sound packs.
#
# A picks file (docs/audio/packs/<family>.json) names, for each z-sounds folder, the pack files to use:
#   { "zombies/guardian/roar": { "hp": 45, "takes": [ { "src": "F:\\Sound_Effects\\...wav", "start": 0.15, "end": 4.0,
#     "why": "one line" } ] } }
# or, in docs/audio/packs.md's short form, the folder's list of takes alone ({ "ui/click": [ { "src", "start", "end" } ] }).
# --route from=to files a folder's picks in another folder; --skip leaves a folder's picks unmade (wired nowhere yet).
# A bed's take gives "loop": seconds (and "xfade", default 2): it's made to loop without a seam, no fades.
# Each take is cut (start/end, seconds), high-passed (hp Hz: below it a pack's sub only eats the level the game evens
# to), faded in and out, folded to mono (anything placed in the world; "stereo": true keeps two channels for the UI),
# resampled to 48 kHz, levelled (the part that sounds at -20 dBFS RMS, the peak at most -1 dBFS) and written as
# OGG Vorbis to z-sounds/<folder>/pk-<pack>-<name>.ogg. The game evens every take to its folder's level anyway
# (core/takes.js), so this level is only for the listen page's "as recorded".
#
# The pack files are licensed for the game, not for a server: pk-* is git-ignored (.gitignore) and ships only inside
# the builds (tools/package.mjs). Needs ffmpeg (with libvorbis) and numpy.
#
# Usage: python3 tools/pack-make.py <picks.json> --src-root F:\Sound_Effects=<where the packs are> --out <repo>/z-sounds
#        [--pack ocular] [--only <folder>] [--dry]
import argparse, json, os, re, subprocess, sys, tempfile, wave
import numpy as np

SR = 48000

def slug(path):
    base = os.path.splitext(os.path.basename(path.replace('\\', '/')))[0]
    name = base.split('-', 1)[1] if '-' in base else base
    name = re.split(r'_(?:Ocular|Puncture|Foundation|SINISTER|Aberration)', name)[0]
    return re.sub(r'^interface-', '', re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-'))

def local(src, roots):
    for frm, to in roots:
        if src.lower().startswith(frm.lower()):
            rest = src[len(frm):].replace('\\', '/').lstrip('/')
            return os.path.join(to, rest)
    return src.replace('\\', '/')

def decode(path, start, end, hp, stereo):
    af = []
    if hp: af += [f'highpass=f={hp}:poles=2', f'highpass=f={hp}:poles=2']   # 24 dB an octave
    cmd = ['ffmpeg', '-v', 'error']
    if start: cmd += ['-ss', str(start)]
    if end: cmd += ['-to', str(end)]
    cmd += ['-i', path]
    if af: cmd += ['-af', ','.join(af)]
    ch = 2 if stereo else 1
    cmd += ['-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, ch).copy()

def lead_trim(x):
    # the silence before the sound comes off (a UI click must speak on the frame it's asked for); 3 ms kept
    m = np.abs(x).max(axis=1)
    if not len(m) or m.max() <= 0: return x
    i = int(np.argmax(m > m.max() * 0.03))
    return x[max(0, i - int(SR * 0.003)):]

def make_loop(x, seconds, xfade):
    # a bed that loops without a seam: `seconds` long, its head crossfaded (equal power) with what follows its end
    n, f = int(SR * seconds), int(SR * xfade)
    if len(x) < n + f: raise SystemExit(f'loop: need {seconds + xfade:.1f} s, have {len(x) / SR:.1f} s')
    t = np.linspace(0, np.pi / 2, f, dtype=np.float32)[:, None]
    y = x[:n].copy()
    y[:f] = x[:f] * np.sin(t) + x[n:n + f] * np.cos(t)
    return y

def shape(x, fade_in, fade_out):
    n = len(x)
    a = min(n // 4, int(SR * fade_in))
    b = min(n // 3, int(SR * fade_out))
    if a > 0: x[:a] *= np.linspace(0, 1, a, dtype=np.float32)[:, None]
    if b > 0: x[n - b:] *= (np.linspace(1, 0, b, dtype=np.float32) ** 2)[:, None]
    return x

def level(x, rms_db=-20.0, peak_db=-1.0):
    m = np.abs(x).max(axis=1)
    peak = float(m.max()) if len(m) else 0.0
    if peak <= 0: return x, 0.0
    act = m > peak * 0.02   # the part that sounds, as the game's evening counts it
    rms = float(np.sqrt(np.mean(x[act] ** 2)))
    g = 10 ** (rms_db / 20) / max(rms, 1e-9)
    g = min(g, 10 ** (peak_db / 20) / peak)
    return x * g, 20 * np.log10(g)

def write_ogg(x, out):
    with tempfile.TemporaryDirectory() as d:
        w = os.path.join(d, 't.wav')
        pcm = np.clip(x, -1, 1)
        with wave.open(w, 'wb') as f:
            f.setnchannels(x.shape[1]); f.setsampwidth(2); f.setframerate(SR)
            f.writeframes((pcm * 32767).astype('<i2').tobytes())
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-c:a', 'libvorbis', '-q:a', '5', out], check=True)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('picks'); ap.add_argument('--out', required=True)
    ap.add_argument('--src-root', action='append', default=[], help='F:\\Sound_Effects=/path/to/packs')
    ap.add_argument('--pack', default='ocular'); ap.add_argument('--only'); ap.add_argument('--dry', action='store_true')
    ap.add_argument('--route', action='append', default=[], help='ui/kiosk-tab=hq/kiosk-tab')
    ap.add_argument('--skip', action='append', default=[])
    a = ap.parse_args()
    roots = [tuple(r.split('=', 1)) for r in a.src_root]
    picks = json.load(open(a.picks, encoding='utf-8'))
    route = dict(r.split('=', 1) for r in a.route)
    made, names_in = [], {}
    for folder, spec in picks.items():
        if folder.startswith('_') or folder in a.skip: continue
        if isinstance(spec, list): spec = { 'takes': spec }
        folder = route.get(folder, folder)
        if a.only and folder != a.only: continue
        hp, stereo = spec.get('hp', 0), spec.get('stereo', folder.startswith('ui/'))
        names = names_in.setdefault(folder, set())   # two routed folders may share one
        for t in spec['takes']:
            name = t.get('name') or slug(t['src'])
            while name in names: name += '-b'
            names.add(name)
            out = os.path.join(a.out, folder, f"pk-{t.get('pack', a.pack)}-{name}.ogg")
            src = local(t['src'], roots)
            if t.get('loop'):   # a bed: "loop": seconds, "xfade": seconds (default 2)
                xf = t.get('xfade', 2.0)
                x = make_loop(decode(src, t.get('start', 0), t.get('start', 0) + t['loop'] + xf + 0.05, t.get('hp', hp), stereo), t['loop'], xf)
            else:
                x = decode(src, t.get('start', 0), t.get('end'), t.get('hp', hp), stereo)
                if t.get('leadTrim', True): x = lead_trim(x)
                x = shape(x, t.get('fadeIn', 0.008), t.get('fadeOut', min(0.3, len(x) / SR * 0.2)))
            x, g = level(x)
            made.append((folder, os.path.basename(out), round(len(x) / SR, 2), round(g, 1)))
            if a.dry: continue
            os.makedirs(os.path.dirname(out), exist_ok=True)
            write_ogg(x, out)
    for m in made: print('%-28s %-44s %5.2fs %+5.1f dB' % m)
    print(f'{len(made)} takes' + (' (dry run)' if a.dry else ''))

if __name__ == '__main__':
    sys.exit(main())
