#!/usr/bin/env python3
"""MU-6/MU-8: consistency check for the 1.2 cue sheet (D-97 step 3).

Reads docs/audio/music/score.json against catalogue.json and analysis.json
(all read-only; /mnt/f/Music is never touched — paths are checked against
the catalogue, not the disk). Two classes of result (MU-8):

Mistakes (exit 1): files missing from the catalogue; keys/tempos
disagreeing inside a suite (kits not sharing the suite key, a stem whose
named tempo/key differs from its kit's, a kit outside its night's band
without a borrow flag); a kit used by two nights; LUFS targets outside
the plan's range (fights -20..-14, places -22..-16, cues -15..-9; the
sting family sits at about -12 LUFS, docs/sound-principles.md SS3).

INFO (exit stays 0): `trim` — a loop not whole bars from its downbeat is
an instruction for step 4's maker, not a sheet mistake: head trim to the
first downbeat, tail cut at downbeat + whole bars, written per stem to
docs/audio/music/trims.json (path, trim_head_s, bars, cut_s). Place beds
loop on duration and get no trims. `borrow` — a kit flagged
"borrow": true outside its suite's band (Jerry's ear judges at the
listen page).

Usage: .venv/bin/python tools/music-score-check.py [--score PATH]
Prints one summary line per moment, then mistakes/INFO, then a total.
"""
import argparse, json, statistics, sys

LUFS_RANGE = {'night': (-20.0, -14.0), 'motif': (-20.0, -14.0),
              'special': (-20.0, -14.0), 'place': (-22.0, -16.0),
              'cue': (-15.0, -9.0)}
BAR_TOL = 0.02


def med(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.median(xs), 1) if xs else None


def main():
    ap = argparse.ArgumentParser(description='Check the 1.2 cue sheet')
    ap.add_argument('--score', default='docs/audio/music/score.json')
    ap.add_argument('--catalogue', default='docs/audio/music/catalogue.json')
    ap.add_argument('--analysis', default='docs/audio/music/analysis.json')
    ap.add_argument('--trims', default='docs/audio/music/trims.json')
    args = ap.parse_args()

    score = json.load(open(args.score, encoding='utf-8'))
    cat = {e['path'] for e in json.load(open(args.catalogue, encoding='utf-8'))}
    ana = json.load(open(args.analysis, encoding='utf-8'))
    moments = score['moments']
    findings = []          # mistakes: (moment_id, kind, text)
    infos = []             # INFO: (moment_id, kind, text)
    trims = []             # maker records for trims.json
    night_kits = {}        # kit path -> [night ids]

    for m in moments:
        mid, kind = m['id'], m['kind']
        kits = m.get('kits', [])
        files = list(m.get('files', []))
        for k in kits:
            files += [dict(s, _kit=k) for s in k['stems'].values()]

        # 1. missing from catalogue
        for f in files:
            if f['path'] not in cat:
                findings.append((mid, 'missing', f"not in catalogue: {f['path']}"))

        # 2. keys / tempos inside one suite
        if kind == 'night':
            keys = {k['key'] for k in kits}
            if len(keys) > 1:
                findings.append((mid, 'suite-key', f'kits span keys {sorted(keys)}'))
            lo, hi = m.get('bpm_band') or (None, None)
        for k in kits:
            if kind == 'night' and lo and not (lo <= (k['bpm'] or 0) <= hi):
                short = k['kit'].split('Construction Kits/')[-1].split('/')[0]
                if k.get('borrow'):
                    infos.append((mid, 'borrow',
                                  f"kit {short} at {k['bpm']} BPM outside band {lo}-{hi}, "
                                  f"flagged borrow (band fragments by key; Jerry's ear at the listen page)"))
                else:
                    findings.append((mid, 'suite-tempo',
                                     f"kit {short} at {k['bpm']} BPM "
                                     f"outside band {lo}-{hi} (no borrow flag)"))
            for role, s in k['stems'].items():
                a = ana.get(s['path'], {})
                if a.get('name_bpm') and k['bpm'] and a['name_bpm'] != k['bpm']:
                    findings.append((mid, 'stem-tempo',
                                     f"{role} stem named {a['name_bpm']} BPM in a "
                                     f"{k['bpm']} BPM kit: {s['path'].rsplit('/', 1)[-1]}"))
                if a.get('name_key') and k['key'] and a['name_key'] != k['key']:
                    findings.append((mid, 'stem-key',
                                     f"{role} stem named key {a['name_key']} in a "
                                     f"{k['key']} kit: {s['path'].rsplit('/', 1)[-1]}"))
            # trim class (INFO): every kit stem gets a maker record —
            # head at its first downbeat, tail at downbeat + whole bars
            for role, s in k['stems'].items():
                a = ana.get(s['path'], {})
                if a.get('downbeat_s') is None or not k['bpm']:
                    infos.append((mid, 'trim', f"{role} stem has no downbeat to trim to: "
                                               f"{s['path'].rsplit('/', 1)[-1]}"))
                    continue
                bar = 4 * 60.0 / k['bpm']
                eff = (a['dur_s'] - a['downbeat_s']) / bar
                bars = int(round(eff)) if abs(eff - round(eff)) <= BAR_TOL else int(eff)
                trims.append({'path': s['path'], 'moment': mid, 'role': role,
                              'trim_head_s': a['downbeat_s'], 'bars': bars,
                              'cut_s': round(a['downbeat_s'] + bars * bar, 3)})
                if abs(eff - round(eff)) > BAR_TOL:
                    infos.append((mid, 'trim',
                                  f"{role} loop is {eff:.3f} bars from its downbeat "
                                  f"({a['dur_s']}s, downbeat {a['downbeat_s']}s): "
                                  f"{s['path'].rsplit('/', 1)[-1]}"))
        # places loop on duration (beds, crossfades): no trims, say so
        if kind == 'place' and files:
            infos.append((mid, 'duration',
                          f"{len(files)} bed files loop on duration, not bars — no trims"))

        # 3. kit in two nights
        if kind == 'night':
            for k in kits:
                night_kits.setdefault(k['kit'], []).append(mid)

        # 5. LUFS target in the plan's range
        t = m.get('target_lufs')
        rng = LUFS_RANGE.get(kind)
        if t is None:
            findings.append((mid, 'lufs', 'no target_lufs'))
        elif rng and not (rng[0] <= t <= rng[1]):
            findings.append((mid, 'lufs', f'target {t} LUFS outside {rng[0]}..{rng[1]} for {kind}'))
        for k in kits:
            if k.get('stem_level_lufs') is None:
                findings.append((mid, 'lufs', f"kit has no stem_level_lufs: {k['kit']}"))

    for kit, ids in night_kits.items():
        if len(ids) > 1:
            findings.append((ids[0], 'dup-kit',
                             f"kit in {len(ids)} nights ({', '.join(ids)}): {kit}"))

    # ---- trims for step 4's maker (written either way) ----
    with open(args.trims, 'w', encoding='utf-8') as f:
        json.dump({'version': 1, 'task': 'MU-8: maker trims from MU-3 downbeats',
                   'source': 'docs/audio/music/score.json + analysis.json',
                   'rule': 'numbers and catalogue paths only; no audio copied or moved',
                   'records': trims}, f, indent=1, ensure_ascii=False)

    # ---- report ----
    by_moment, info_by_moment = {}, {}
    for mid, kind, text in findings:
        by_moment.setdefault(mid, []).append((kind, text))
    for mid, kind, text in infos:
        info_by_moment.setdefault(mid, []).append((kind, text))
    print(f"score {args.score}: {len(moments)} moments "
          f"({sum(1 for m in moments if m['kind'] == 'night')} nights, "
          f"{sum(len(m.get('kits', [])) for m in moments)} kit records, "
          f"{sum(len(m.get('files', [])) for m in moments)} loose files)")
    for m in moments:
        kits = m.get('kits', [])
        nfiles = len(m.get('files', [])) + sum(len(k['stems']) for k in kits)
        head = (f"{m['id']}: {m['kind']}, {len(kits)} kits, {nfiles} files, "
                f"target {m.get('target_lufs')} LUFS")
        got = by_moment.get(m['id'], [])
        goti = info_by_moment.get(m['id'], [])
        print(f"{'OK  ' if not got else 'FIND'} {head}")
        for kind, text in got:
            print(f"     [{kind}] {text}")
        for kind, text in goti:
            if kind != 'trim':
                print(f"     [INFO {kind}] {text}")
        tcount = sum(1 for k2, _ in goti if k2 == 'trim')
        if tcount:
            print(f"     [INFO trim] {tcount} stems trimmed at downbeat "
                  f"(records in {args.trims})")
    kinds, ikinds = {}, {}
    for _, kind, _ in findings:
        kinds[kind] = kinds.get(kind, 0) + 1
    for _, kind, _ in infos:
        ikinds[kind] = ikinds.get(kind, 0) + 1
    print(f"total: {len(moments)} moments, {len(findings)} mistakes {kinds or ''}, "
          f"{len(infos)} INFO {ikinds or ''}; trims: {len(trims)} records -> {args.trims}")
    return 1 if findings else 0


if __name__ == '__main__':
    sys.exit(main())
