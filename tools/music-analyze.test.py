#!/usr/bin/env python3
"""Regression checks for tools/music-analyze.py (MU-3).

Run: .venv/bin/python tools/music-analyze.test.py
Covers the tempo hang class (an unbounded parabolic step could make the
period zero/negative and spin the downbeat wrap forever), a known-tempo
click track, and the name parsing the cue sheet will rely on.
"""
import importlib.util
import numpy as np

spec = importlib.util.spec_from_file_location('ma', 'tools/music-analyze.py')
ma = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ma)


def test_click_track():
    fps = 48000 / 512
    flux = np.zeros(int(fps * 20))
    step = int(round(fps * 60 / 120))  # 120 BPM clicks
    flux[::step] = 1.0
    bpm, first, down, conf, note = ma.tempo_and_beats(flux, fps, 20.0)
    assert bpm is not None and abs(bpm - 120) <= 6, bpm
    assert 0.0 <= down < 4 * 60 / bpm + 1e-9, down
    print(f'click track: {bpm} BPM, downbeat {down}s, conf {conf}')


def test_adversarial_flux_terminates():
    # Seeded noise + sparse spikes: shapes that made the parabolic step
    # overshoot before the clamp. Must return promptly, in range.
    rng = np.random.default_rng(7)
    fps = 44100 / 512
    for trial in range(30):
        flux = rng.random(4000).astype(np.float64) ** 8
        flux[rng.integers(0, 4000, 12)] = 1.0
        bpm, first, down, conf, note = ma.tempo_and_beats(flux, fps, 46.0)
        if bpm is not None:
            assert 30.0 <= bpm <= 300.0, (trial, bpm)
            assert 0.0 <= down < 4 * 60 / bpm + 1e-9, (trial, down)
    print('adversarial flux: 30 trials in range, no hang')


def test_names():
    bpm, key, _, _ = ma.name_tempo_key(
        'Ghosthack - Hellshot 3 - Argent Metal/x/Construction Kits/'
        'Abyss 170bpm Fmin/Stems/Ghosthack-HS3_Abyss_Kick Drum_170bpm.wav')
    assert (bpm, key) == (170, 'Fm'), (bpm, key)
    bpm, key, _, mode = ma.name_tempo_key(
        'Ghosthack - Anomaly/x/Kit 01 - Safe Zone - Am 70Bpm/'
        'Ghosthack-A_Kit 01_Piano_Am 70Bpm (DRY).wav')
    assert (bpm, key) == (70, 'Am'), (bpm, key)
    role, _, _ = ma.name_role('p/Kit/Stems/Ghosthack-HS_Kick Drum_150bpm.wav')
    assert role == 'kick', role
    bpm, _, _, _ = ma.name_tempo_key(
        'Ghosthack - Mystery Nightfall - Trailer SFX/Loops/Pulses/'
        'Ghosthack-MN_Pulse Loop 80_Flare Star_E.wav')
    assert bpm == 80, bpm
    print('names: tempo/key/role parsing ok')


if __name__ == '__main__':
    test_click_track()
    test_adversarial_flux_terminates()
    test_names()
    print('PASS music-analyze.test.py')
