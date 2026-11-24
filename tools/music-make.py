#!/usr/bin/env python3
# tools/music-make.py - CL-275 (D-97, docs/audio/music-1.2.md step 4): the score's fight kits as layers.
#
# For every Hellshot kit the cue sheet (docs/audio/music/score.json) names - the nights, the Training Ground's motifs,
# the specials - its stems are summed into three layers that play together in sync and add up to the kit:
#   drums   kick, snare, hats, ride, the looped crash, and the bass guitar   (the edge of a fight)
#   rhythm  the rhythm guitars                                                 (the dead close in)
#   lead    the lead guitars and synths                                        (they're on him; the peak)
# The kit's FX stems (risers, impacts, hits, transitions, sirens, gunshots, noise) stay out of the loops: they are
# one-shots, and some would sound like the game's own sounds (D-94).
# Each stem is decoded at 48 kHz stereo (32-bit float), tiled to the kit's longest whole-bar length, and any tail past
# its last bar is wrapped onto its start, so the loop has no seam. The kit's sum is measured (EBU R128) and one gain
# brings it to the moment's target (fights -16 LUFS) with its peak at most -1 dBFS; the same gain goes on all three
# layers, so the layers keep the kit's own balance and add up to it. Written as OGG Vorbis (q4, 48 kHz):
#   assets/soundtrack/gh/gh-<pack>-<kit>-<layer>.ogg     (git-ignored: Ghosthack's licence, never on a server)
# and docs/audio/music/made.json (each kit's bpm, bars, loop seconds, gain, loudness, and its files).
#
# Runs where F:\Music is (Jerry's PC; the WSL/VM mount). Needs ffmpeg (libvorbis, ebur128) and numpy.
# Usage: python3 tools/music-make.py --music <F:\Music's mount> [--only <kit name part>] [--dry] [--force] [--budget s]
import argparse, json, os, re, shutil, subprocess, sys
import numpy as np

SR = 48000
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, 'assets', 'soundtrack', 'gh')
MADE = os.path.join(REPO, 'docs', 'audio', 'music', 'made.json')
FFMPEG = shutil.which('ffmpeg') or (r'C:\Program Files\Win Movie Maker\ffmpeg.exe' if os.path.exists(r'C:\Program Files\Win Movie Maker\ffmpeg.exe') else 'ffmpeg')

FX = re.compile(r'fx|riser|impact|hit|transition|siren|gunshot|alarm|noise|vinyl|downlifter|drop|sweep|glitch|laser|heartbeat|atmosphere|ambience|texture|stab|metallic', re.I)
def role(name):
    n = name.lower()
    if 'crash looped' in n: return 'drums'
    if FX.search(n): return None
    if 'bass' in n: return 'drums'
    if re.search(r'kick|snare|hat|ride|crash|tom|perc|cymbal', n): return 'drums'
    if 'rhythm' in n: return 'rhythm'
    if re.search(r'lead|synth|pad|string|choir|key|piano', n): return 'lead'
    return None

def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def pack_of(kitpath):
    p = kitpath.split('/')[0]
    m = re.search(r'Hellshot( \d)?', p)
    return ('hs' + (m.group(1) or '').strip()) if m else slug(p.replace('Ghosthack - ', ''))[:12]

def decode(path):
    r = subprocess.run([FFMPEG, '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True)
    if r.returncode: raise RuntimeError('decode ' + path + ': ' + r.stderr.decode()[:300])
    return np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, 2).copy()

def loudness(x):
    r = subprocess.run([FFMPEG, '-v', 'info', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       input=x.astype(np.float32).tobytes(), capture_output=True)
    t = r.stderr.decode(errors='replace')
    i = re.findall(r'I:\s+(-?[\d.]+|-inf) LUFS', t)
    pk = re.findall(r'Peak:\s+(-?[\d.]+|-inf) dBFS', t)
    I = float(i[-1]) if i and i[-1] != '-inf' else -99.0
    P = float(pk[-1]) if pk and pk[-1] != '-inf' else -99.0
    return I, P

def encode(x, path):
    tmp = path + '.part.ogg'
    r = subprocess.run([FFMPEG, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libvorbis', '-q:a', '4', tmp],
                       input=np.clip(x, -1, 1).astype(np.float32).tobytes(), capture_output=True)
    if r.returncode: raise RuntimeError('encode ' + path + ': ' + r.stderr.decode()[:300])
    os.replace(tmp, path)

def kit_stems(kitdir):
    sd = os.path.join(kitdir, 'Stems')
    out = []
    for f in sorted(os.listdir(sd)):
        if not f.lower().endswith('.wav'): continue
        name = re.sub(r'^Ghosthack-HS\d?_[^_]+_', '', f)
        name = re.sub(r'_\d+ ?bpm.*$', '', name, flags=re.I)
        out.append((name, role(name), os.path.join(sd, f)))
    return out

def make_kit(kitpath, bpm, target, music, dry):
    kitdir = os.path.join(music, kitpath)
    kitname = os.path.basename(kitpath)
    base = 'gh-' + pack_of(kitpath) + '-' + slug(re.sub(r'\s*\d+\s*bpm.*$', '', kitname, flags=re.I))
    stems = kit_stems(kitdir)
    used = [s for s in stems if s[1]]
    left = [s[0] for s in stems if not s[1]]
    bar = 240.0 / bpm
    if dry:
        return {'kit': kitpath, 'base': base, 'bpm': bpm, 'stems': {s[0]: s[1] for s in used}, 'left': left}
    audio = {}
    nbars = {}
    for name, rl, path in used:
        a = decode(path)
        n = len(a) / SR / bar
        nb = int(round(n))
        if nb < 1 or abs(n - nb) > 0.08:   # not whole bars: trim to the whole bars it has; the rest is a tail
            nb = max(1, int(np.floor(n + 1e-6)))
        audio[name] = a; nbars[name] = nb
    N = max(nbars.values())
    L = int(round(N * bar * SR))
    layers = {'drums': np.zeros((L, 2), np.float32), 'rhythm': np.zeros((L, 2), np.float32), 'lead': np.zeros((L, 2), np.float32)}
    for name, rl, path in used:
        a, nb = audio[name], nbars[name]
        seg = int(round(nb * bar * SR))
        body, tail = a[:seg], a[seg:]
        if len(body) < seg: body = np.vstack([body, np.zeros((seg - len(body), 2), np.float32)])
        loop = body.copy()
        if len(tail):   # the ring past the last bar comes back in at the top
            t = tail[:seg]; loop[:len(t)] += t
        reps = int(np.ceil(L / seg))
        layers[rl] += np.tile(loop, (reps, 1))[:L]
    total = layers['drums'] + layers['rhythm'] + layers['lead']
    I, P = loudness(total)
    gain_db = target - I
    if P + gain_db > -1.0: gain_db = -1.0 - P
    g = float(10 ** (gain_db / 20))
    files = {}
    for rl, x in layers.items():
        if not np.any(x): continue
        fn = base + '-' + rl + '.ogg'
        encode(x * g, os.path.join(OUT, fn))
        files[rl] = 'assets/soundtrack/gh/' + fn
    I2, P2 = loudness(total * g)
    return {'kit': kitpath, 'base': base, 'bpm': bpm, 'bars': N, 'loop_s': round(L / SR, 6), 'samples': L, 'gain_db': round(gain_db, 2),
            'lufs': round(I2, 1), 'peak_dbfs': round(P2, 1), 'files': files,
            'stems': {s[0]: s[1] for s in used}, 'left': left}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--music', required=True)
    ap.add_argument('--only', default='')
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--budget', type=float, default=0, help='stop starting new kits after this many seconds (a short shell)')
    a = ap.parse_args()
    score = json.load(open(os.path.join(REPO, 'docs', 'audio', 'music', 'score.json')))
    kits = {}
    for m in score['moments']:
        for k in m.get('kits') or []:
            if 'Hellshot' not in k['kit']: continue
            kits.setdefault(k['kit'], {'bpm': k['bpm'], 'target': m.get('target_lufs', -16), 'for': []})['for'].append(m['id'])
    os.makedirs(OUT, exist_ok=True)
    made = json.load(open(MADE)) if os.path.exists(MADE) else {'task': 'CL-275', 'kits': {}}
    import time; t0 = time.time()
    for kp, k in sorted(kits.items()):
        if a.budget and time.time() - t0 > a.budget: print('budget: stopping; run again for the rest'); break
        if a.only and a.only.lower() not in kp.lower(): continue
        if not a.force and not a.dry and kp in made['kits'] and all(os.path.exists(os.path.join(REPO, f)) for f in made['kits'][kp]['files'].values()):
            print('have', os.path.basename(kp)); continue
        r = make_kit(kp, k['bpm'], k['target'], a.music, a.dry)
        r['for'] = k['for']
        if a.dry:
            print(os.path.basename(kp), r['base'], r['stems'], 'left out:', r['left']); continue
        made['kits'][kp] = r
        tmp = MADE + '.part'
        json.dump(made, open(tmp, 'w'), indent=1); os.replace(tmp, MADE)
        print('made', r['base'], r['bars'], 'bars', r['loop_s'], 's', r['gain_db'], 'dB', r['lufs'], 'LUFS', r['peak_dbfs'], 'dBFS', ','.join(r['files']))
    print(len(kits), 'kits on the sheet')

if __name__ == '__main__' and not any(f in sys.argv for f in ('--manifest', '--places', '--cues', '--dayfights')):
    main()

# AH-11: unused Hellshot kits reserved for daylight skirmishes so 8-bit chiptune never interrupts the 1.2 score.
DAY_FIGHT_KITS = [
    ('dayfight-1', 'Ghosthack - Hellshot - Argent Metal/Ghosthack - Hellshot - Argent Metal/Construction Kits/Joker 107bpm Fmin', 107, 'chip_skirmish_b'),
    ('dayfight-2', 'Ghosthack - Hellshot 2 - Argent Metal/Ghosthack - Hellshot 2 - Argent Metal/Construction Kits/Nihility 135bpm A#min', 135, 'chip_skirmish_a'),
    ('dayfight-3', 'Ghosthack - Hellshot 3 - Argent Metal/Ghosthack - Hellshot 3 - Argent Metal/Construction Kits/Retribution 150bpm F#min', 150, 'chip_fight_1'),
]
def dayfights(music, force=False):
    os.makedirs(OUT, exist_ok=True)
    made = json.load(open(MADE)) if os.path.exists(MADE) else {'task': 'CL-275', 'kits': {}}
    made.setdefault('kits', {})
    for dfid, kp, bpm, _ in DAY_FIGHT_KITS:
        if not force and kp in made['kits'] and all(os.path.exists(os.path.join(REPO, f)) for f in made['kits'][kp]['files'].values()):
            print('have', dfid, os.path.basename(kp)); continue
        r = make_kit(kp, bpm, -16.0, music, False)
        r['for'] = [dfid]
        made['kits'][kp] = r
        tmp = MADE + '.part'
        json.dump(made, open(tmp, 'w'), indent=1); os.replace(tmp, MADE)
        print('made', dfid, r['base'], r['bars'], 'bars', r['loop_s'], 's', r['gain_db'], 'dB', r['lufs'], 'LUFS', ','.join(r['files']))

if __name__ == '__main__' and '--dayfights' in sys.argv:
    dayfights(sys.argv[sys.argv.index('--music') + 1], '--force' in sys.argv)

# --manifest: the score's nights into assets/soundtrack/music.json ("score": the layered suites, their nights, and
# a gain each so a night's full mix plays as loud as the night it replaces: the old song's loudness and gain, measured).
def manifest():
    mpath = os.path.join(REPO, 'assets', 'soundtrack', 'music.json')
    m = json.load(open(mpath, encoding='utf-8'))
    made = json.load(open(MADE))['kits']
    score = json.load(open(os.path.join(REPO, 'docs', 'audio', 'music', 'score.json')))
    layered, wave = {}, []
    for mo in score['moments']:
        if mo['kind'] != 'night': continue
        n = int(mo['night']); tid = 'gh/night-%02d' % n; old = 'elevenlabs/night-%02d' % n
        kits = []
        for k in mo['kits']:
            r = made.get(k['kit'])
            if not r: continue
            kits.append({'name': r['base'].split('-', 2)[2], 'bpm': r['bpm'], 'barS': round(240.0 / r['bpm'], 6), 'loopS': r['loop_s'],
                         'files': {l: f.replace('assets/soundtrack/', '') for l, f in r['files'].items()}})
        if not kits: continue
        layered[tid] = {'fallback': old if old in (m.get('sections') or {}) else None, 'kits': kits}
        wave.append({'from': n, 'track': tid})
        sec = (m.get('sections') or {}).get(old)
        if sec:
            rr = subprocess.run([FFMPEG, '-v', 'info', '-nostats', '-i', os.path.join(REPO, 'assets', 'soundtrack', sec['file']), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True)
            I = re.findall(r'I:\s+(-?[\d.]+) LUFS', rr.stderr.decode(errors='replace'))
            if I:
                g = float(m.get('gain', {}).get(old, 1)) * 10 ** ((float(I[-1]) - (-16.0)) / 20)
                m.setdefault('gain', {})[tid] = round(g, 3)
    # The specials (CL-275): the guardian (Hell Knight, then Wraith), the red sky (Flame), the colossus (Titan), the heart
    # (Doom), the wanderer (Rude). Each a layered track; its gain the nights' median, so a boss isn't louder than its night.
    gains = sorted(v for k, v in m.get('gain', {}).items() if k.startswith('gh/night-'))
    gmed = gains[len(gains) // 2] if gains else 1.0
    specials = {}
    groups = {'guardian': ['special-guardian', 'special-guardian-b'], 'redsky': ['special-red-sky'], 'colossus': ['special-colossus'], 'heart': ['special-heart'], 'wanderer': ['special-wanderer']}
    byid = {mo['id']: mo for mo in score['moments']}
    for key, ids in groups.items():
        kits = []
        for i in ids:
            for k in (byid.get(i) or {}).get('kits') or []:
                r = made.get(k['kit'])
                if r: kits.append({'name': r['base'].split('-', 2)[2], 'bpm': r['bpm'], 'barS': round(240.0 / r['bpm'], 6), 'loopS': r['loop_s'], 'files': {l: f.replace('assets/soundtrack/', '') for l, f in r['files'].items()}})
        if not kits: continue
        tid = 'gh/' + key
        layered[tid] = {'fallback': None, 'kits': kits}
        specials[key] = tid
        m.setdefault('gain', {})[tid] = round(gmed, 3)
    # AH-11: Day-fight layered Hellshot suites (small, medium, large daytime skirmishes - no 8-bit chiptune in the 1.2 score).
    day_fight_tracks = []
    for dfid, kp, bpm, fb in DAY_FIGHT_KITS:
        r = made.get(kp)
        if not r: continue
        tid = 'gh/' + dfid
        layered[tid] = {'fallback': fb, 'kits': [{'name': r['base'].split('-', 2)[2], 'bpm': r['bpm'], 'barS': round(240.0 / r['bpm'], 6), 'loopS': r['loop_s'],
                        'files': {l: f.replace('assets/soundtrack/', '') for l, f in r['files'].items()}}]}
        day_fight_tracks.append(tid)
        m.setdefault('gain', {})[tid] = round(gmed * 0.9, 3)
    # The Training Ground's motifs (CL-275): each type's kit, played when that type comes out to practise.
    motifs = {}
    for mo in score['moments']:
        if mo['kind'] != 'motif': continue
        kind = mo['id'].split('-', 1)[1]
        kits = []
        for k in mo.get('kits') or []:
            r = made.get(k['kit'])
            if r: kits.append({'name': r['base'].split('-', 2)[2], 'bpm': r['bpm'], 'barS': round(240.0 / r['bpm'], 6), 'loopS': r['loop_s'], 'files': {l: f.replace('assets/soundtrack/', '') for l, f in r['files'].items()}})
        if not kits: continue
        tid = 'gh/motif-' + kind
        layered[tid] = {'fallback': None, 'kits': kits}
        motifs[kind] = tid
        m.setdefault('gain', {})[tid] = round(gmed, 3)
    # The calm (CL-275, redesigned in AH-11): cohesive Ghosthack Anomaly survival tracks across the valley.
    def lufs_of(fp):
        rr = subprocess.run([FFMPEG, '-v', 'info', '-nostats', '-i', fp, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True)
        I = re.findall(r'I:\s+(-?[\d.]+) LUFS', rr.stderr.decode(errors='replace'))
        return float(I[-1]) if I else None
    pools = {}
    placesmade = (json.load(open(MADE)).get('places') or {})
    if placesmade:
        ref = None
        for cand in ['calm_day.mp3', 'calm_day.ogg']:
            fp = os.path.join(REPO, 'assets', 'soundtrack', cand)
            if os.path.exists(fp): ref = lufs_of(fp); break
        refg = float(m.get('gain', {}).get('calm_day', 1))
        for pid, r in placesmade.items():
            tid = 'gh/' + os.path.splitext(os.path.basename(r['file']))[0]
            L = lufs_of(os.path.join(REPO, r['file']))
            if ref is not None and L is not None: m.setdefault('gain', {})[tid] = round(max(0.4, min(1.8, refg * 10 ** ((ref - L) / 20))), 3)
        P = lambda pid: 'gh/gh-' + pid
        want = {
            'menu': ['place-menu'],
            'dawnprep': ['place-menu', 'place-hq', 'place-wilds'],
            'day': ['place-hq', 'place-wilds', 'place-menu', 'place-dusk'],
            'dusk': ['place-dusk', 'place-anomaly'],
            'night': ['place-dusk', 'place-anomaly'],
            'aftermath': ['place-hq', 'place-menu'],
            'dawn': ['place-dawn'],
            'fallen': ['place-fallen'],
            'place_graveyard': ['place-graveyard'],
            'place_relay': ['place-relay'],
            'place_hikers': ['place-hikers'],
        }
        for pool, ids in want.items():
            got = [P(i) for i in ids if i in placesmade]
            if got: pools[pool] = got
    # The cues (CL-275, audited and replaced by ear in AH-11): tight, grounded Ghosthack cues at consistent loudness.
    stings = {}
    cuesmade = (json.load(open(MADE)).get('cues') or {})
    if cuesmade:
        want = {'clear': 'last-kill', 'night_falls': 'night-fall', 'guardian': 'boss-entrance', 'ember': 'boss-entrance', 'objective': 'discovery',
                'achievement': 'discovery', 'airdrop': 'discovery', 'poi_cleared': 'mission-done', 'camp': 'mission-done', 'dawn': 'dawn'}
        ref_cue_fp = os.path.join(REPO, 'assets', 'soundtrack', 'sting_alarm_metal.mp3')
        ref_cue_lufs = lufs_of(ref_cue_fp) if os.path.exists(ref_cue_fp) else -12.0
        for sting, cue in want.items():
            if cue not in cuesmade: continue
            tid = 'gh/gh-cue-' + cue
            stings[sting] = tid
            Ln = lufs_of(os.path.join(REPO, cuesmade[cue]['file']))
            if Ln is not None:
                base = 1.85 if cue == 'last-kill' else (1.7 if cue in ('boss-entrance', 'night-fall') else 1.45)
                m.setdefault('gain', {})[tid] = round(max(0.6, min(2.2, base * 10 ** (((ref_cue_lufs or -12.0) - Ln) / 20))), 3)
    score_obj = {
        'about': 'CL-275 (D-97) / AH-11 (Jerry direct music cue & pacing overhaul): cohesive Ghosthack Anomaly world score, layered Hellshot night & day-fight suites, and ear-audited Mystery Nightfall / Anomaly cues.',
        'layered': layered, 'waveByDay': wave, 'specials': specials, 'motifs': motifs, 'pools': pools, 'stings': stings,
    }
    if day_fight_tracks:
        score_obj['dayFight'] = {'tracks': day_fight_tracks, 'sizes': [1, 5, 11][:len(day_fight_tracks)]}
    m['score'] = score_obj
    tmp = mpath + '.part'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f: json.dump(m, f, indent=2, ensure_ascii=False); f.write('\n')
    os.replace(tmp, mpath)
    print('music.json: score with', len(layered), 'layered suites,', len(pools), 'pools,', len(stings), 'cues')

if __name__ == '__main__' and '--manifest' in sys.argv:
    manifest()

# --places: the calm moments as whole tracks (CL-275, audited & redesigned in AH-11): cohesive Ghosthack Anomaly tracks,
# measured and brought to -18 LUFS (peak at most -1 dBFS), 48 kHz OGG, gh-place-<id>.ogg.
PLACE_FILES = {
    'place-menu': 'Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/Ghosthack-A_Kit 05_Clear Sky_Am 65Bpm.wav',
    'place-hq': 'Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/Ghosthack-A_Kit 01_Safe Zone_Am 70Bpm.wav',
    'place-wilds': 'Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/Ghosthack-A_Kit 04_The Brain Scorcher_Em 70Bpm.wav',
    'place-dusk': 'Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/Ghosthack-A_Kit 02_Dark Valley_Cm 65Bpm.wav',
    'place-anomaly': 'Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/Ghosthack-A_Kit 03_The Anomaly D# 70Bpm.wav',
    'place-dawn': 'Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/Ghosthack-A_Kit 05_Clear Sky_Am 65Bpm.wav',
    'place-fallen': 'Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Atmos Drone_Cm 65Bpm (WET).wav',
    'place-graveyard': 'Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Alone Fm 65Bpm (DRY).wav',
    'place-relay': 'Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Facility Am 75Bpm (DRY).wav',
    'place-hikers': 'Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Environmental Problems Am 65Bpm (DRY).wav',
    'place-alarm-build': 'Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/Ghosthack-A_Kit 03_The Anomaly D# 70Bpm.wav',
}
PLACE_START = {'place-dawn': 27.0}
PLACE_TILE = {}
def places(music, force=False):
    score = json.load(open(os.path.join(REPO, 'docs', 'audio', 'music', 'score.json')))
    byid = {m['id']: m for m in score['moments']}
    made = json.load(open(MADE)) if os.path.exists(MADE) else {'task': 'CL-275', 'kits': {}}
    made.setdefault('places', {})
    os.makedirs(OUT, exist_ok=True)
    for pid, path in PLACE_FILES.items():
        mo = byid.get(pid) or byid.get('place-coldwater' if pid == 'place-hikers' else 'cue-fallen') or {}
        if path is None:
            path = next((f['path'] for f in (mo.get('files') or []) if f.get('role') == 'full mix'), None)
        if not path: print('no file for', pid); continue
        fn = 'gh-' + pid + '.ogg'; dst = os.path.join(OUT, fn)
        prev = made['places'].get(pid)
        if os.path.exists(dst) and not force and prev and prev.get('src') == path and prev.get('start_s', 0) == PLACE_START.get(pid, 0):
            print('have', pid); continue
        a = decode(os.path.join(music, path))
        st = PLACE_START.get(pid, 0)
        if st > 0:
            a = a[int(st * SR):].copy()
            fi = min(int(1.5 * SR), len(a) // 4)
            if fi > 0: a[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)[:, None]
        if pid in PLACE_TILE: a = np.tile(a, (PLACE_TILE[pid], 1))
        target = -18.0
        I, P = loudness(a)
        g_db = target - I
        if P + g_db > -1.0: g_db = -1.0 - P
        encode(a * float(10 ** (g_db / 20)), dst)
        rec = {'src': path, 'file': 'assets/soundtrack/gh/' + fn, 'seconds': round(len(a) / SR, 2), 'gain_db': round(g_db, 2)}
        if st > 0: rec['start_s'] = st
        made['places'][pid] = rec
        tmp = MADE + '.part'; json.dump(made, open(tmp, 'w'), indent=1); os.replace(tmp, MADE)
        print('made', fn, round(len(a) / SR, 1), 's', round(g_db, 2), 'dB')

if __name__ == '__main__' and '--places' in sys.argv:
    places(sys.argv[sys.argv.index('--music') + 1], '--force' in sys.argv)

# --cues: the score's short cues (CL-275, audited and replaced by ear in AH-11), each trimmed cleanly with a smooth tail,
# brought to -12 LUFS with peak <= -1 dBFS, gh-cue-<name>.ogg. Jerry's alarm metal stinger and ui/* stingers stay untouched.
CUES = {
    'discovery': ('cue-discovery', 'Ghosthack - Mystery Nightfall - Trailer SFX/Ghosthack - Mystery Nightfall - Trailer SFX/One Shots/Tonal/Ghosthack-MN_Tonal_Endure_C.wav', 3.0),
    'mission-done': ('cue-mission-done', 'Ghosthack - Mystery Nightfall - Trailer SFX/Ghosthack - Mystery Nightfall - Trailer SFX/One Shots/Tonal/Ghosthack-MN_Tonal_Equilibrium_D.wav', 3.4),
    'last-kill': ('cue-last-kill', 'Ghosthack - Mystery Nightfall - Trailer SFX/Ghosthack - Mystery Nightfall - Trailer SFX/One Shots/Tonal/Ghosthack-MN_Tonal_Hope_C.wav', 5.0),
    'boss-entrance': ('cue-boss-entrance', 'Ghosthack - Mystery Nightfall - Trailer SFX/Ghosthack - Mystery Nightfall - Trailer SFX/One Shots/Braams/Ghosthack-MN_Braam_Hostile_C.wav', 3.0),
    'night-fall': ('cue-night-fall', 'Ghosthack - Mystery Nightfall - Trailer SFX/Ghosthack - Mystery Nightfall - Trailer SFX/One Shots/Drones/Ghosthack-MN_Drone_Scavenge_C.wav', 6.5),
    'dawn': (None, 'Ghosthack - Cinematic Orchestra Volume 2/Ghosthack - Cinematic Orchestra Volume 2/Melodic One Shots/String Chords/GH_FS III_String Chords_ 4_Am #13.wav', 3.2),
}
CUE_START = {}
def cues(music, force=False):
    score = json.load(open(os.path.join(REPO, 'docs', 'audio', 'music', 'score.json')))
    byid = {m['id']: m for m in score['moments']}
    made = json.load(open(MADE)) if os.path.exists(MADE) else {'task': 'CL-275', 'kits': {}}
    made.setdefault('cues', {})
    for name, (mid, path, secs) in CUES.items():
        if path is None: path = (byid[mid].get('files') or [{}])[0].get('path')
        fn = 'gh-cue-' + name + '.ogg'; dst = os.path.join(OUT, fn)
        prev = made['cues'].get(name)
        if os.path.exists(dst) and not force and prev and prev.get('src') == path and abs(prev.get('seconds', 0) - secs) < 0.6:
            print('have', name); continue
        a = decode(os.path.join(music, path))
        a = a[int(CUE_START.get(name, 0) * SR):]
        n = min(len(a), int(secs * SR)); a = a[:n].copy()
        f = min(int(1.2 * SR), n // 3)
        if f > 0: a[n - f:] *= np.linspace(1, 0, f, dtype=np.float32)[:, None]
        fi = min(int(0.015 * SR), n // 10)
        if fi > 0: a[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)[:, None]
        I, P = loudness(a); g_db = -12.0 - I
        if P + g_db > -1.0: g_db = -1.0 - P
        encode(a * float(10 ** (g_db / 20)), dst)
        made['cues'][name] = {'src': path, 'file': 'assets/soundtrack/gh/' + fn, 'seconds': round(n / SR, 2), 'gain_db': round(g_db, 2)}
        tmp = MADE + '.part'; json.dump(made, open(tmp, 'w'), indent=1); os.replace(tmp, MADE)
        print('made', fn, round(n / SR, 1), 's', round(g_db, 2), 'dB')

if __name__ == '__main__' and '--cues' in sys.argv:
    cues(sys.argv[sys.argv.index('--music') + 1], '--force' in sys.argv)
