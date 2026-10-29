#!/usr/bin/env python3
"""MU-3 (D-97 step 2): numbers-only analysis of the F:\\Music catalogue.

Reads every WAV named in docs/audio/music/catalogue.json (read-only, under
--music-root, default /mnt/f/Music) and writes numbers only:
  docs/audio/music/analysis.json  one record per file, keyed by catalogue path
  docs/audio/music/analysis.md    method, per-pack summary, disagreements,
                                  kits that do not loop on a bar

No audio is copied, converted or uploaded (Ghosthack licence: numbers only).

Per file: integrated loudness (LUFS, BS.1770 via pyloudnorm) and true peak
(dBTP, 4x oversampled); tempo/key carried by folder and file names; measured
tempo and first downbeat offset from a spectral-flux onset envelope; bar
length at the measured tempo (4/4) and whether the file is a whole number
of bars; stem role from its name, with a spectral check (centroid, low-end
share) where the name is unclear or contradicts the spectrum.

Usage:
  .venv/bin/python tools/music-analyze.py [--music-root /mnt/f/Music]
      [--catalogue docs/audio/music/catalogue.json]
      [--out-json docs/audio/music/analysis.json]
      [--out-md docs/audio/music/analysis.md]
      [--only SUBSTR] [--limit N] [--jobs N] [--resume] [--report-only]

Environment: project .venv (uv venv .venv; uv pip install --python
.venv/bin/python numpy soundfile pyloudnorm scipy). librosa is not needed:
the onset envelope, tempo and spectrum are computed directly.

--resume skips paths already present in the out-json. --report-only rebuilds
analysis.md from an existing analysis.json without touching audio.
"""
import argparse, json, math, os, re, sys
from collections import Counter, defaultdict

import numpy as np
import soundfile as sf
import pyloudnorm as pyln
from scipy.signal import resample_poly

# ---------------------------------------------------------------- names ----
BPM_RE = re.compile(r'(\d{2,3})\s*[Bb]pm')
KEY_RE = re.compile(r'\b([A-G])([#b]?)\s*(maj|min|m)?\b')
KEY_TOKEN_RE = re.compile(r'^([A-G])([#b]?)(maj|min|m)$')

def norm_key(root, acc, mode):
    if not root:
        return None, None, None
    root = root.upper() + (acc or '')
    if mode in ('m', 'min'):
        m = 'minor'
    elif mode == 'maj':
        m = 'major'
    else:
        m = None
    return (root + ('m' if m == 'minor' else 'maj' if m == 'major' else '')), root, m

def name_tempo_key(path):
    """Tempo/key carried by the names: nearest kit folder first, then file."""
    parts = path.split('/')
    bpm, key, kroot, kmode = None, None, None, None
    # scan folder components from nearest (deepest) to shallowest, then file
    for comp in reversed(parts[:-1]):
        if bpm is None:
            m = BPM_RE.search(comp)
            if m:
                bpm = int(m.group(1))
        if key is None:
            for tok in re.split(r'[\s_\-]+', comp):
                km = KEY_TOKEN_RE.match(tok)
                if km:
                    key, kroot, kmode = norm_key(km.group(1), km.group(2), km.group(3))
                    break
            if key is None and ('min' in comp or 'maj' in comp):
                km = KEY_RE.search(comp.replace(' ', ''))
                if km and km.group(3):
                    key, kroot, kmode = norm_key(km.group(1), km.group(2), km.group(3))
    fname = parts[-1]
    if bpm is None:
        m = BPM_RE.search(fname) or re.search(r'(?:Loop|Pulse)s?\s+(\d{2,3})(?!\d)', fname)
        if m:
            bpm = int(m.group(1))
    if key is None:
        for tok in re.split(r'[\s_\-]+', fname.replace('.wav', '')):
            km = KEY_TOKEN_RE.match(tok)
            if km:
                key, kroot, kmode = norm_key(km.group(1), km.group(2), km.group(3))
                break
    if key is None:
        # bare root with no mode carried, e.g. "The Anomaly D# 70Bpm"
        for comp in list(reversed(parts[:-1])) + [fname]:
            for tok in re.split(r'[\s_\-]+', comp.replace('.wav', '')):
                km = re.match(r'^([A-G])([#b])$', tok)
                if km:
                    key, kroot, kmode = norm_key(km.group(1), km.group(2), None)
                    break
            if key:
                break
    return bpm, key, kroot, kmode

def pack_of(path):
    return path.split('/')[0]

def kit_of(path):
    """Construction-kit folder a file belongs to, or its parent folder."""
    parts = path.split('/')
    for i, comp in enumerate(parts):
        if comp == 'Construction Kits' and i + 1 < len(parts):
            return '/'.join(parts[:i + 2])
    # fall back: folder above the file, trimmed of Stems/One Shots levels
    return '/'.join(parts[:-1])

# ---------------------------------------------------------------- roles ----
# (keyword, role, detail). First match wins; order is deliberate.
ROLE_RULES = [
    (r'kick|808', 'kick', None),
    (r'snare', 'snare', None),
    (r'hi\s?hat|hihat|open hat|hats?\b', 'hats', None),
    (r'crash|cymbal', 'drums', 'crash/cymbal'),
    (r'clap', 'drums', 'clap'),
    (r'toms?\b', 'drums', 'tom'),
    (r'dark drums|drums?\b|percussion|perc\b', 'drums', None),
    (r'bass guitar|deep bass|bass\b', 'bass', None),
    (r'rhythm guitar|rhythm', 'rhythm guitar', None),
    (r'lead guitar|lead\b', 'lead', None),
    (r'chug guitar|guitars?\b', 'rhythm guitar', 'guitar (unspecified)'),
    (r'synth', 'synth', None),
    (r'fx|impact|braam|riser|whoosh|drone|transition|hit\b', 'fx', None),
    (r'ambient pad|pad\b', 'other', 'pad'),
    (r'strings|string\b', 'other', 'strings'),
    (r'piano|organ|keys|bells|musicbox|music box|harp', 'synth', 'keys/melodic'),
    (r'horn|tuba|woodwind|brass', 'other', 'orchestral winds/brass'),
    (r'pulse', 'other', 'pulse'),
    (r'underscore', 'other', 'underscore'),
    (r'melodic|melody|arp\b', 'synth', 'melodic'),
    (r'atmosphere|ambience|ambient', 'other', 'atmosphere'),
    (r'loop', 'other', 'loop'),
    (r'vocal|choir', 'other', 'vocal/choir'),
]

def stem_text(path):
    f = path.rsplit('/', 1)[-1].replace('.wav', '')
    f = re.sub(r'^(Ghosthack|GH)[-_ ]?(HS[23]?|MN|A|FS III)?[-_ ]?', '', f)
    f = re.sub(r'Songkits[-_ ]?', '', f)
    f = re.sub(r'[-_ ]?\d{2,3}\s*[Bb]pm', '', f)
    f = re.sub(r'\((DRY|WET)\)', '', f, flags=re.I)
    return f.strip(' _-')

def _norm_text(t):
    t = re.sub(r'(\d{2,3}\s*[Bb]pm|[A-G][#b]?(maj|min|m)?\b)', ' ', t)
    return re.sub(r'[^a-z0-9]+', ' ', t.lower()).strip()

def name_role(path):
    parts = path.split('/')
    fname = parts[-1]
    if any('One Shot' in comp for comp in parts):
        kind = 'one-shot'
    elif any(comp in ('Stems', 'STEMS', 'DRY', 'WET') for comp in parts[-3:]):
        kind = 'stem'
    elif 'Loops' in '/'.join(parts):
        kind = 'loop'
    else:
        kind = 'stem'
    # a file sitting directly in a kit folder whose name is just the kit's
    # own name (plus tempo/key) is the kit's full mix
    if kind == 'stem' and len(parts) > 2 and parts[-3] == 'Construction Kits':
        if _norm_text(stem_text(path)) == _norm_text(parts[-2]):
            return 'full mix', 'kit full mix', kind
    if re.search(r'full mix|main mix|\(mix\)', fname, re.I):
        return 'full mix', 'named full mix', kind
    text = stem_text(path)
    for pat, role, detail in ROLE_RULES:
        if re.search(pat, text, re.I):
            return role, detail or role, kind
    # folder-derived roles for SFX packs
    joined = '/'.join(parts)
    if 'Braams' in joined: return 'fx', 'braam', kind
    if 'Risers' in joined: return 'fx', 'riser', kind
    if 'Whooshes' in joined: return 'fx', 'whoosh', kind
    if 'Drones' in joined: return 'fx', 'drone', kind
    if 'Impacts' in joined: return 'fx', 'impact', kind
    if 'Pulses' in joined: return 'other', 'pulse', kind
    if 'Tonal' in joined: return 'other', 'tonal one-shot', kind
    if 'Atonal' in joined: return 'fx', 'atonal one-shot', kind
    if 'Perc' in joined: return 'drums', 'percussion', kind
    return 'other', 'unclear: ' + (text[:40] or fname), kind

def spectral_role(centroid_hz, low_share, peak_dbfs):
    if peak_dbfs is not None and peak_dbfs < -50:
        return 'silent/near-silent'
    if low_share is not None and low_share >= 0.55 and centroid_hz < 400:
        return 'bass-like (low, dark)'
    if centroid_hz >= 6000:
        return 'hats/fx-like (very bright)'
    if centroid_hz >= 3500:
        return 'bright (lead/synth-like)'
    if low_share is not None and low_share >= 0.30:
        return 'low-mid heavy (kick/drums-like)'
    return 'midrange (guitar/keys-like)'

def role_disagrees(role, centroid_hz, low_share):
    if role == 'bass' and low_share is not None and low_share < 0.05:
        return 'named bass but low-end share < 5%'
    if role == 'hats' and centroid_hz < 1800:
        return 'named hats but spectral centroid < 1800 Hz'
    if role == 'kick' and low_share is not None and low_share < 0.08:
        return 'named kick but low-end share < 8%'
    if role == 'lead' and centroid_hz < 900:
        return 'named lead but spectral centroid < 900 Hz'
    return None

# ------------------------------------------------------------ audio -------
def analyze_audio(fullpath):
    """All measured numbers for one WAV. Returns dict; raises on bad files."""
    info = sf.info(fullpath)
    sr, dur = info.samplerate, info.duration
    data, _ = sf.read(fullpath, dtype='float32', always_2d=True)

    # loudness (BS.1770 integrated) + sample peak. pyloudnorm needs more
    # than its 0.4 s block: shorter one-shots record no LUFS (peak only).
    meter = pyln.Meter(sr)
    mono_or_stereo = data.astype(np.float64)
    try:
        lufs = float(meter.integrated_loudness(mono_or_stereo))
    except ValueError:
        lufs = float('nan')
    sample_peak = float(np.max(np.abs(data))) if data.size else 0.0
    peak_dbfs = 20 * math.log10(sample_peak) if sample_peak > 0 else None

    # true peak: 4x oversampling, chunked with overlap to bound memory
    true_peak = sample_peak
    chunk = 1 << 18
    for start in range(0, data.shape[0], chunk):
        seg = data[max(0, start - 64):start + chunk + 64].astype(np.float64)
        if seg.shape[0] < 8:
            continue
        up = resample_poly(seg, 4, 1, axis=0)
        lo = 256 if start > 0 else 0
        hi = up.shape[0] - 256 if start + chunk < data.shape[0] else up.shape[0]
        if hi > lo:
            true_peak = max(true_peak, float(np.max(np.abs(up[lo:hi]))))
    true_peak_dbtp = 20 * math.log10(true_peak) if true_peak > 0 else None

    # mono mix for onset / spectrum work
    mono = data.mean(axis=1)
    del data

    # --- spectral flux onset envelope (hop 512, frame 2048) ---
    frame, hop = 2048, 512
    n = mono.shape[0]
    centroid_hz, low_share = None, None
    bpm_meas, first_beat_s, downbeat_s, tempo_conf = None, None, None, None
    onset_note = None
    if n >= frame * 2:
        window = np.hanning(frame).astype(np.float32)
        nframes = 1 + (n - frame) // hop
        # average magnitude spectrum (for centroid / low-end share)
        mag_sum = np.zeros(frame // 2 + 1)
        prev_mag = None
        flux = np.zeros(nframes)
        idx = np.arange(nframes)
        # process in slabs to bound memory
        slab = 4096
        for s0 in range(0, nframes, slab):
            s1 = min(nframes, s0 + slab)
            starts = (np.arange(s0, s1) * hop)[:, None]
            cols = starts + np.arange(frame)[None, :]
            seg = mono[cols] * window
            mag = np.abs(np.fft.rfft(seg, axis=1)).T  # (freq, frames)
            mag_sum += mag.sum(axis=1)
            if prev_mag is not None:
                flux[s0] = np.maximum(mag[:, 0] - prev_mag, 0).sum()
            if s0 + 1 < s1:
                flux[s0 + 1:s1] = np.maximum(np.diff(mag, axis=1), 0).sum(axis=0)
            prev_mag = mag[:, -1]
        freqs = np.fft.rfftfreq(frame, 1.0 / sr)
        total = mag_sum.sum()
        if total > 0:
            centroid_hz = float((freqs * mag_sum).sum() / total)
            low_share = float(mag_sum[freqs < 120].sum() / total)
        # normalise flux
        fmax = flux.max()
        if fmax > 0:
            flux = flux / fmax
        fps = sr / hop
        bpm_meas, first_beat_s, downbeat_s, tempo_conf, onset_note = tempo_and_beats(flux, fps, dur)
    else:
        onset_note = 'too short for onset analysis'

    return {
        'sr': sr, 'dur_s': round(dur, 3),
        'lufs_i': round(lufs, 2) if math.isfinite(lufs) else None,
        'true_peak_dbtp': round(true_peak_dbtp, 2) if true_peak_dbtp is not None else None,
        'sample_peak_dbfs': round(peak_dbfs, 2) if peak_dbfs is not None else None,
        'centroid_hz': round(centroid_hz) if centroid_hz else None,
        'low_share': round(low_share, 4) if low_share is not None else None,
        'measured_bpm': bpm_meas,
        'tempo_conf': tempo_conf,
        'first_beat_s': first_beat_s,
        'downbeat_s': downbeat_s,
        'onset_note': onset_note,
    }

def tempo_and_beats(flux, fps, dur):
    """Autocorrelation tempo + comb beat phase on a spectral-flux envelope.

    Returns (bpm, first_beat_s, downbeat_s, conf, note). 4/4 assumed for
    bars: the downbeat is the strongest of the four beat-grid rotations.
    conf is the normalised autocorrelation peak (corr[lag]/corr[0], 0..1):
    low values mark material with no clear beat (pads, drones, one-shots).
    The autocorrelation is FFT-based so long files stay cheap.
    """
    x = flux - flux.mean()
    if x.max() <= 0 or dur < 2.0:
        return None, None, None, None, 'too short or no onsets'
    n = len(x)
    nfft = 1 << int(np.ceil(np.log2(2 * n)))
    spec = np.fft.rfft(x, nfft)
    corr = np.fft.irfft(spec * np.conj(spec), nfft)[:n].real
    corr0 = float(corr[0]) if n else 0.0
    corr[:int(0.1 * fps)] = 0  # ignore < 100 ms lags
    # lag range for 40..240 BPM
    lo = int(fps * 60 / 240)
    hi = min(n - 1, int(fps * 60 / 40))
    if hi <= lo:
        return None, None, None, None, 'too short for tempo'
    conf = float(corr[lo + int(np.argmax(corr[lo:hi + 1]))] / corr0) if corr0 > 0 else 0.0
    lag = lo + int(np.argmax(corr[lo:hi + 1]))
    # parabolic refinement
    if 0 < lag < len(corr) - 1:
        a, b, c = corr[lag - 1], corr[lag], corr[lag + 1]
        denom = (a - 2 * b + c)
        if denom != 0:
            lag = lag + 0.5 * (a - c) / denom
    # keep the refined period inside the searched lag range: an unbounded
    # parabolic step can otherwise make it zero/negative and hang below
    period_frames = float(min(max(lag, lo), hi))
    bpm = 60.0 * fps / period_frames
    # beat phase: comb sum over one period of phases
    p = max(2, int(round(period_frames)))
    scores = np.zeros(p)
    for ph in range(p):
        scores[ph] = flux[ph::p].sum()
    phase = int(np.argmax(scores))
    first_beat = phase / fps
    # downbeat: strongest rotation of the 4-beat bar grid
    best_rot, best_score = 0, -1.0
    for rot in range(4):
        start = phase + rot * p
        s = flux[start::4 * p].sum() if start < len(flux) else 0.0
        if s > best_score:
            best_score, best_rot = s, rot
    # first downbeat inside the first bar (modulo, never an open-ended loop)
    bar_frames = 4.0 * period_frames
    downbeat = ((phase + best_rot * p) % bar_frames) / fps if bar_frames > 0 else 0.0
    note = None
    if corr[int(round(period_frames))] <= 0:
        note = 'weak periodicity'
    return round(bpm, 1), round(first_beat, 3), round(downbeat, 3), round(conf, 3), note

def octave_relation(measured, named):
    if not measured or not named:
        return None
    for factor in (0.5, 1.0, 2.0):
        if abs(measured - named * factor) <= 0.035 * named * factor:
            return factor
    return None

# ------------------------------------------------------------ records -----
def build_record(path, music_root):
    rec = {'pack': pack_of(path), 'kit': kit_of(path)}
    nb, nk, nkr, nkm = name_tempo_key(path)
    rec['name_bpm'] = nb
    rec['name_key'] = nk
    rec['name_key_root'] = nkr
    rec['name_key_mode'] = nkm
    role, detail, kind = name_role(path)
    rec['role'] = role
    rec['role_detail'] = detail
    rec['kind'] = kind
    full = os.path.join(music_root, path)
    try:
        a = analyze_audio(full)
        rec.update(a)
    except Exception as e:  # unreadable/corrupt: record the failure, keep going
        rec['error'] = f'{type(e).__name__}: {e}'
        return rec
    # Bars on the kit's grid: the named tempo when the names carry one (that
    # is the grid tools/music-make.py will cut and loop on), else measured.
    tempo_used = nb or rec.get('measured_bpm')
    rec['tempo_used_for_bars'] = tempo_used
    if tempo_used:
        bar_s = 4 * 60.0 / tempo_used
        rec['bar_s'] = round(bar_s, 4)
        bars = rec['dur_s'] / bar_s
        rec['bars'] = round(bars, 3)
        rec['whole_bars'] = abs(bars - round(bars)) <= 0.02 and rec['dur_s'] >= bar_s
    else:
        rec['bar_s'], rec['bars'], rec['whole_bars'] = None, None, None
    rel = octave_relation(rec.get('measured_bpm'), nb)
    rec['tempo_name_agree'] = (rel is not None) if (rec.get('measured_bpm') and nb) else None
    rec['tempo_octave'] = rel
    spec = spectral_role(rec.get('centroid_hz') or 0, rec.get('low_share'), rec.get('sample_peak_dbfs'))
    rec['spectral_role'] = spec
    rec['role_disagreement'] = role_disagrees(role, rec.get('centroid_hz') or 0, rec.get('low_share'))
    return rec

# ------------------------------------------------------------ report ------
def median(xs):
    xs = sorted(x for x in xs if x is not None)
    return xs[len(xs) // 2] if xs else None

def write_report(records, out_md):
    lines = []
    lines.append('# 1.2 score — catalogue analysis (MU-3, D-97 step 2)')
    lines.append('')
    lines.append('Numbers only, measured read-only on `F:\\Music` by `tools/music-analyze.py`. '
                 'No audio was copied, converted or uploaded (Ghosthack licence, `docs/audio/music-1.2.md`).')
    lines.append('')
    lines.append('## Method')
    lines.append('')
    lines.append('- **Loudness:** integrated loudness (LUFS, BS.1770) via pyloudnorm on the full file as '
                 'decoded by libsndfile (`soundfile`). **True peak:** 4x oversampling '
                 '(`scipy.signal.resample_poly`, chunked), reported in dBTP; sample peak kept alongside.')
    lines.append('- **Named tempo/key:** parsed from the kit folder name first, then the file name '
                 '(`170bpm Fmin`, `Am 70Bpm`, `Cmaj_90bpm`, `Dmin`, ...). Mode is only recorded when '
                 'the name carries it (`The Anomaly D# 70Bpm` carries a root and no mode).')
    lines.append('- **Measured tempo / downbeat:** spectral-flux onset envelope (2048-sample Hann '
                 'frames, hop 512, positive magnitude differences), tempo from the autocorrelation '
                 'peak in 40-240 BPM with parabolic refinement, beat phase from a comb sum at that '
                 'period, downbeat = strongest of the four 4/4 rotations of the beat grid. Short and '
                 'one-shot files (< 2 s or no periodicity) record no measured tempo.')
    lines.append('- **Bars/loop:** bar = 4 beats on the kit grid: the named tempo when the names carry '
                 'one (the grid the maker will cut and loop on), else the measured tempo; the tempo '
                 'actually used is recorded per file (`tempo_used_for_bars`). A file is a whole number '
                 'of bars when its length is within 0.02 bars of an integer and at least one bar long. '
                 '`tempo_conf` (normalised autocorrelation peak, 0..1) is recorded with every measured '
                 'tempo: low values mean no clear beat (pads, drones), so treat those reads as indicative.')
    lines.append('- **Role:** from the stem name (kick, snare, hats, drums, bass, rhythm guitar, lead, '
                 'synth, fx, full mix; anything else is `other` with the named detail kept). Where the '
                 'name is unclear, and as a check where it is not, the spectrum speaks: centroid '
                 '(energy-weighted mean frequency of the average magnitude spectrum) and low-end share '
                 '(energy below 120 Hz). Spectral disagreements use fixed thresholds, listed with the code.')
    lines.append('- Files that failed to decode are recorded with `error` and counted below, never skipped silently.')
    lines.append('')
    total = len(records)
    errors = {p: r for p, r in records.items() if r.get('error')}
    lines.append(f'## Catalogue: {total} files, {len(errors)} unreadable')
    lines.append('')
    packs = defaultdict(list)
    for p, r in records.items():
        packs[r['pack']].append((p, r))
    lines.append('## Summary per pack')
    for pack in sorted(packs):
        items = packs[pack]
        rs = [r for _, r in items]
        lufs = [r.get('lufs_i') for r in rs]
        named = sum(1 for r in rs if r.get('name_bpm'))
        agree = sum(1 for r in rs if r.get('tempo_name_agree'))
        both = sum(1 for r in rs if r.get('tempo_name_agree') is not None)
        whole = sum(1 for r in rs if r.get('whole_bars'))
        loopable = sum(1 for r in rs if r.get('whole_bars') is not None)
        roles = Counter(r.get('role') for r in rs)
        role_txt = ', '.join(f'{k} {v}' for k, v in roles.most_common())
        lines.append('')
        lines.append(f'### {pack} — {len(items)} files')
        lines.append(f'- Loudness: median {median(lufs)} LUFS-I '
                     f'(min {min((x for x in lufs if x is not None), default=None)}, '
                     f'max {max((x for x in lufs if x is not None), default=None)})')
        lines.append(f'- Names: {named} carry a tempo+key name; of the {both} with both a name and a '
                     f'measurement, {agree} agree (within 3.5% at a 0.5x/1x/2x octave).')
        lines.append(f'- Loops: {whole} of {loopable} measurable files are a whole number of bars.')
        lines.append(f'- Roles: {role_txt}.')
    # disagreements
    lines.append('')
    lines.append('## Where name and measurement disagree')
    lines.append('')
    tempo_bad, role_bad, silent = [], [], []
    for p, r in sorted(records.items()):
        if r.get('tempo_name_agree') is False:
            tempo_bad.append((p, r))
        if r.get('role_disagreement'):
            role_bad.append((p, r))
        if r.get('sample_peak_dbfs') is not None and r['sample_peak_dbfs'] < -50:
            silent.append((p, r))
    lines.append(f'### Tempo: {len(tempo_bad)} files')
    lines.append('')
    if tempo_bad:
        lines.append('| file | named BPM | measured BPM |')
        lines.append('| --- | ---: | ---: |')
        for p, r in tempo_bad[:200]:
            lines.append(f"| {p} | {r.get('name_bpm')} | {r.get('measured_bpm')} |")
        if len(tempo_bad) > 200:
            lines.append(f'| ... and {len(tempo_bad) - 200} more (in analysis.json: `tempo_name_agree: false`) | | |')
    else:
        lines.append('None.')
    lines.append('')
    lines.append(f'### Role (spectrum contradicts the name): {len(role_bad)} files')
    lines.append('')
    if role_bad:
        lines.append('| file | named role | centroid Hz | low-end share | finding |')
        lines.append('| --- | --- | ---: | ---: | --- |')
        for p, r in role_bad[:200]:
            lines.append(f"| {p} | {r.get('role')} ({r.get('role_detail')}) | {r.get('centroid_hz')} | "
                         f"{r.get('low_share')} | {r.get('role_disagreement')} |")
        if len(role_bad) > 200:
            lines.append(f'| ... and {len(role_bad) - 200} more (`role_disagreement` in analysis.json) | | | | |')
    else:
        lines.append('None.')
    lines.append('')
    lines.append(f'### Silent or near-silent (sample peak below -50 dBFS): {len(silent)} files')
    lines.append('')
    for p, r in silent[:100]:
        lines.append(f'- {p} ({r.get("sample_peak_dbfs")} dBFS, {r.get("dur_s")} s)')
    if len(silent) > 100:
        lines.append(f'- ... and {len(silent) - 100} more')
    if not silent:
        lines.append('None.')
    # kits that don't loop
    lines.append('')
    lines.append('## Kits that do not loop on a bar')
    lines.append('')
    lines.append('A kit is listed when at least one of its files that is at least one bar long '
                 '(stems, loops and full mixes; one-shots excluded) is not a whole number of bars.')
    lines.append('')
    kits = defaultdict(list)
    for p, r in records.items():
        if r.get('kind') != 'one-shot' and r.get('whole_bars') is False:
            kits[r['kit']].append((p, r))
    if kits:
        lines.append(f'{len(kits)} kits:')
        lines.append('')
        for kit in sorted(kits):
            bad = kits[kit]
            lines.append(f'### {kit} — {len(bad)} file(s) off the bar')
            for p, r in bad[:30]:
                lines.append(f"- {p.rsplit('/', 1)[-1]}: {r.get('bars')} bars "
                             f"({r.get('dur_s')} s at {r.get('tempo_used_for_bars')} BPM)")
            if len(bad) > 30:
                lines.append(f'- ... and {len(bad) - 30} more')
            lines.append('')
    else:
        lines.append('None — every kit loops on a bar.')
    if errors:
        lines.append('## Unreadable files')
        lines.append('')
        for p, r in sorted(errors.items()):
            lines.append(f'- {p}: {r["error"]}')
        lines.append('')
    with open(out_md, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines) + '\n')

# ------------------------------------------------------------ main --------
_MUSIC_ROOT = '/mnt/f/Music'

def _one(path):
    return path, build_record(path, _MUSIC_ROOT)

def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--music-root', default='/mnt/f/Music')
    ap.add_argument('--catalogue', default='docs/audio/music/catalogue.json')
    ap.add_argument('--out-json', default='docs/audio/music/analysis.json')
    ap.add_argument('--out-md', default='docs/audio/music/analysis.md')
    ap.add_argument('--only', default=None)
    ap.add_argument('--limit', type=int, default=None)
    ap.add_argument('--jobs', type=int, default=1)
    ap.add_argument('--resume', action='store_true')
    ap.add_argument('--report-only', action='store_true')
    args = ap.parse_args()

    if args.report_only:
        with open(args.out_json, encoding='utf-8') as f:
            records = json.load(f)
        write_report(records, args.out_md)
        print(f'report: {args.out_md} from {len(records)} records')
        return

    with open(args.catalogue, encoding='utf-8') as f:
        cat = json.load(f)
    paths = [e['path'] for e in cat]
    if args.only:
        paths = [p for p in paths if args.only in p]
    records = {}
    if args.resume and os.path.exists(args.out_json):
        with open(args.out_json, encoding='utf-8') as f:
            records = json.load(f)
        paths = [p for p in paths if p not in records]
    if args.limit:
        paths = paths[:args.limit]
    print(f'{len(paths)} files to analyse (root {args.music_root})', flush=True)
    global _MUSIC_ROOT
    _MUSIC_ROOT = args.music_root
    def save(i):
        with open(args.out_json, 'w', encoding='utf-8') as f:
            json.dump(records, f, indent=1, ensure_ascii=False)
        print(f'{i}/{len(paths)}', flush=True)
    if args.jobs > 1:
        import multiprocessing as mp
        done = 0
        with mp.Pool(args.jobs) as pool:
            for p, rec in pool.imap_unordered(_one, paths, chunksize=4):
                records[p] = rec
                done += 1
                if done % 50 == 0 or done == len(paths):
                    save(done)
    else:
        for i, p in enumerate(paths, 1):
            records[p] = build_record(p, args.music_root)
            if i % 50 == 0 or i == len(paths):
                save(i)
    with open(args.out_json, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=1, ensure_ascii=False)
    write_report(records, args.out_md)
    nerr = sum(1 for r in records.values() if r.get('error'))
    print(f'done: {len(records)} records, {nerr} errors -> {args.out_json}, {args.out_md}')

if __name__ == '__main__':
    main()


