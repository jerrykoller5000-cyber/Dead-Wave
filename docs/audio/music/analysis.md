# 1.2 score — catalogue analysis (MU-3, D-97 step 2)

Numbers only, measured read-only on `F:\Music` by `tools/music-analyze.py`. No audio was copied, converted or uploaded (Ghosthack licence, `docs/audio/music-1.2.md`).

## Method

- **Loudness:** integrated loudness (LUFS, BS.1770) via pyloudnorm on the full file as decoded by libsndfile (`soundfile`). **True peak:** 4x oversampling (`scipy.signal.resample_poly`, chunked), reported in dBTP; sample peak kept alongside.
- **Named tempo/key:** parsed from the kit folder name first, then the file name (`170bpm Fmin`, `Am 70Bpm`, `Cmaj_90bpm`, `Dmin`, ...). Mode is only recorded when the name carries it (`The Anomaly D# 70Bpm` carries a root and no mode).
- **Measured tempo / downbeat:** spectral-flux onset envelope (2048-sample Hann frames, hop 512, positive magnitude differences), tempo from the autocorrelation peak in 40-240 BPM with parabolic refinement, beat phase from a comb sum at that period, downbeat = strongest of the four 4/4 rotations of the beat grid. Short and one-shot files (< 2 s or no periodicity) record no measured tempo.
- **Bars/loop:** bar = 4 beats on the kit grid: the named tempo when the names carry one (the grid the maker will cut and loop on), else the measured tempo; the tempo actually used is recorded per file (`tempo_used_for_bars`). A file is a whole number of bars when its length is within 0.02 bars of an integer and at least one bar long. `tempo_conf` (normalised autocorrelation peak, 0..1) is recorded with every measured tempo: low values mean no clear beat (pads, drones), so treat those reads as indicative.
- **Role:** from the stem name (kick, snare, hats, drums, bass, rhythm guitar, lead, synth, fx, full mix; anything else is `other` with the named detail kept). Where the name is unclear, and as a check where it is not, the spectrum speaks: centroid (energy-weighted mean frequency of the average magnitude spectrum) and low-end share (energy below 120 Hz). Spectral disagreements use fixed thresholds, listed with the code.
- Files that failed to decode are recorded with `error` and counted below, never skipped silently.

## Catalogue: 2017 files, 0 unreadable

## Summary per pack

### Ghosthack - Anomaly — 281 files
- Loudness: median -14.69 LUFS-I (min -29.35, max -8.01)
- Names: 281 carry a tempo+key name; of the 281 with both a name and a measurement, 35 agree (within 3.5% at a 0.5x/1x/2x octave).
- Loops: 91 of 281 measurable files are a whole number of bars.
- Roles: other 121, fx 112, synth 17, drums 14, full mix 5, lead 4, rhythm guitar 3, kick 3, bass 2.

### Ghosthack - Cinematic Orchestra Volume 2 — 343 files
- Loudness: median -13.78 LUFS-I (min -39.56, max -6.27)
- Names: 193 carry a tempo+key name; of the 193 with both a name and a measurement, 86 agree (within 3.5% at a 0.5x/1x/2x octave).
- Loops: 140 of 273 measurable files are a whole number of bars.
- Roles: other 147, synth 91, kick 41, drums 35, hats 10, snare 10, fx 5, full mix 3, bass 1.

### Ghosthack - Hellshot - Argent Metal — 271 files
- Loudness: median -20.15 LUFS-I (min -48.91, max -7.14)
- Names: 271 carry a tempo+key name; of the 173 with both a name and a measurement, 75 agree (within 3.5% at a 0.5x/1x/2x octave).
- Loops: 189 of 271 measurable files are a whole number of bars.
- Roles: hats 89, kick 50, snare 50, bass 25, rhythm guitar 25, lead 13, synth 12, drums 7.

### Ghosthack - Hellshot 2 - Argent Metal — 320 files
- Loudness: median -23.37 LUFS-I (min -44.35, max -15.6)
- Names: 320 carry a tempo+key name; of the 236 with both a name and a measurement, 89 agree (within 3.5% at a 0.5x/1x/2x octave).
- Loops: 249 of 320 measurable files are a whole number of bars.
- Roles: hats 72, fx 57, snare 51, kick 50, bass 25, rhythm guitar 25, synth 14, lead 12, drums 9, other 5.

### Ghosthack - Hellshot 3 - Argent Metal — 354 files
- Loudness: median -24.02 LUFS-I (min -42.54, max -10.7)
- Names: 315 carry a tempo+key name; of the 228 with both a name and a measurement, 86 agree (within 3.5% at a 0.5x/1x/2x octave).
- Loops: 236 of 346 measurable files are a whole number of bars.
- Roles: hats 72, fx 61, kick 50, snare 50, bass 49, rhythm guitar 40, lead 25, drums 3, other 2, synth 2.

### Ghosthack - Mystery Nightfall - Trailer SFX — 448 files
- Loudness: median -13.73 LUFS-I (min -28.42, max -2.9)
- Names: 142 carry a tempo+key name; of the 142 with both a name and a measurement, 118 agree (within 3.5% at a 0.5x/1x/2x octave).
- Loops: 195 of 353 measurable files are a whole number of bars.
- Roles: drums 141, other 134, fx 106, synth 57, kick 6, hats 4.

## Where name and measurement disagree

### Tempo: 764 files

| file | named BPM | measured BPM |
| --- | ---: | ---: |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/Ghosthack-A_Kit 01_Safe Zone_Am 70Bpm.wav | 70 | 93.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Ambient Pad_Am 70Bpm (DRY).wav | 70 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Ambient Strings_Am 70Bpm (DRY).wav | 70 | 165.9 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Chug Guitar_Am 70Bpm (DRY).wav | 70 | 93.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Crash Cymbals_Am 70Bpm (DRY).wav | 70 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Dark Drone FX_Am 70Bpm (DRY).wav | 70 | 206.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Distant Bells_Am 70Bpm (DRY).wav | 70 | 234.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Granular Glass FX_Am 70Bpm (DRY).wav | 70 | 233.3 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Hats_Am 70Bpm (DRY).wav | 70 | 93.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Low Piano Hit_Am 70Bpm (DRY).wav | 70 | 234.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Male Choir Riser_Am 70Bpm (DRY).wav | 70 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Rain FX_Am 70Bpm (DRY).wav | 70 | 242.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Reverse FX_Am 70Bpm (DRY).wav | 70 | 245.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Reverse Metallic FX_Am 70Bpm (DRY).wav | 70 | 56.9 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Reverse Perc Hit_Am 70Bpm (DRY).wav | 70 | 229.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Reverse Piano_Am 70Bpm (DRY).wav | 70 | 217.2 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Scraping Metal FX_Am 70Bpm (DRY).wav | 70 | 224.2 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Synth Bend_Am 70Bpm (DRY).wav | 70 | 170.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Tama Kit_Am 70Bpm (Dry Only).wav | 70 | 93.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Top Lead Pad_Am 70Bpm (DRY).wav | 70 | 187.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/DRY/Ghosthack-A_Kit 01_Violin_Am 70Bpm (DRY).wav | 70 | 214.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Ambient Pad_Am 70Bpm (WET).wav | 70 | 252.0 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Ambient Strings_Am 70Bpm (WET).wav | 70 | 208.3 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Chug Guitar_Am 70Bpm (WET).wav | 70 | 93.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Crash Cymbals_Am 70Bpm (WET).wav | 70 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Dark Drone FX_Am 70Bpm (WET).wav | 70 | 235.9 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Distant Bells_Am 70Bpm (WET).wav | 70 | 237.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Granular Glass FX_Am 70Bpm (WET).wav | 70 | 233.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Hats_Am 70Bpm (WET).wav | 70 | 93.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Low Piano Hit_Am 70Bpm (WET).wav | 70 | 235.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Male Choir Riser_Am 70Bpm (WET).wav | 70 | 200.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Rain FX_Am 70Bpm (WET).wav | 70 | 240.2 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Reverse FX_Am 70Bpm (WET).wav | 70 | 244.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Reverse Metallic FX_Am 70Bpm (WET).wav | 70 | 208.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Reverse Perc Hit_Am 70Bpm (WET).wav | 70 | 93.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Reverse Piano_Am 70Bpm (WET).wav | 70 | 93.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Scraping Metal FX_Am 70Bpm (WET).wav | 70 | 232.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Synth Bend_Am 70Bpm (WET).wav | 70 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Top Lead Pad_Am 70Bpm (WET).wav | 70 | 197.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm/STEMS/WET/Ghosthack-A_Kit 01_Violin_Am 70Bpm (WET).wav | 70 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Atmos Drone_Cm 65Bpm (DRY).wav | 65 | 110.0 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Bassline Slap_Cm 65Bpm (DRY).wav | 65 | 235.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Cello_Cm 65Bpm (DRY).wav | 65 | 227.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Explosion FX_Cm 65Bpm (DRY).wav | 65 | 225.3 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Geiger Counter_Cm 65Bpm (DRY).wav | 65 | 100.0 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Ghostly FX_Cm 65Bpm (DRY).wav | 65 | 200.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Glistening FX_Cm 65Bpm (DRY).wav | 65 | 250.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Granular Flute_Cm 65Bpm (DRY).wav | 65 | 171.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Kick Loop_Cm 65Bpm (DRY).wav | 65 | 86.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Male Solo Choir Intro_Cm 65Bpm (DRY).wav | 65 | 232.2 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Male Solo Choir Outro_Cm 65Bpm (DRY).wav | 65 | 254.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Metallic Hits FX_Cm 65Bpm (DRY).wav | 65 | 208.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Mid Drone_Cm 65Bpm (DRY).wav | 65 | 154.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Radio FX_Cm 65Bpm (DRY).wav | 65 | 229.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Random Pluck FX_Cm 65Bpm (DRY).wav | 65 | 40.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Rattling Drum FX_Cm 65Bpm (DRY).wav | 65 | 236.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Sparkle Drone_Cm 65Bpm (DRY).wav | 65 | 243.9 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_String Ensemble_Cm 65Bpm (DRY).wav | 65 | 256.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_WaterPhone FX_Cm 65Bpm (DRY).wav | 65 | 168.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Whisper Riser FX_Cm 65Bpm (DRY).wav | 65 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Whistle Bend FX_Cm 65Bpm (DRY).wav | 65 | 237.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/DRY/Ghosthack-A_Kit 02_Wind Shaker_Cm 65Bpm (DRY).wav | 65 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Atmos Drone_Cm 65Bpm (WET).wav | 65 | 86.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Bassline Slap_Cm 65Bpm (WET).wav | 65 | 86.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Cello_Cm 65Bpm (WET).wav | 65 | 233.9 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Explosion FX_Cm 65Bpm (WET).wav | 65 | 242.9 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Geiger Counter_Cm 65Bpm (WET).wav | 65 | 156.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Ghostly FX_Cm 65Bpm (WET).wav | 65 | 206.9 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Glistening FX_Cm 65Bpm (WET).wav | 65 | 251.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Granular Flute_Cm 65Bpm (WET).wav | 65 | 187.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Kick Loop_Cm 65Bpm (WET).wav | 65 | 86.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Male Solo Choir Intro_Cm 65Bpm (WET).wav | 65 | 182.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Male Solo Choir Outro_Cm 65Bpm (WET).wav | 65 | 177.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Metallic Hits FX_Cm 65Bpm (WET).wav | 65 | 205.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Mid Drone_Cm 65Bpm (WET).wav | 65 | 86.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Radio FX_Cm 65Bpm (WET).wav | 65 | 229.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Random Pluck FX_Cm 65Bpm (WET).wav | 65 | 86.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Rattling Drum FX_Cm 65Bpm (WET).wav | 65 | 236.0 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Sparkle Drone_Cm 65Bpm (WET).wav | 65 | 86.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_String Ensemble_Cm 65Bpm (WET).wav | 65 | 225.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_WaterPhone FX_Cm 65Bpm (WET).wav | 65 | 237.9 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Whisper Riser FX_Cm 65Bpm (WET).wav | 65 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Whistle Bend FX_Cm 65Bpm (WET).wav | 65 | 225.0 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm/STEMS/WET/Ghosthack-A_Kit 02_Wind Shaker_Cm 65Bpm (WET).wav | 65 | 250.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/Ghosthack-A_Kit 03_The Anomaly D# 70Bpm.wav | 70 | 93.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/DRY/Ghosthack-A_Kit 03_Big Drum Hits_D# 70Bpm (DRY).wav | 70 | 39.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/DRY/Ghosthack-A_Kit 03_Broken Radio FX_D# 70Bpm (DRY).wav | 70 | 243.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/DRY/Ghosthack-A_Kit 03_Cymbal FX_D# 70Bpm (DRY).wav | 70 | 207.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/DRY/Ghosthack-A_Kit 03_Dark Drone FX_D# 70Bpm (DRY).wav | 70 | 201.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/DRY/Ghosthack-A_Kit 03_Detuned FX_D# 70Bpm (DRY).wav | 70 | 249.3 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/DRY/Ghosthack-A_Kit 03_Interference FX_D# 70Bpm (DRY).wav | 70 | 186.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/DRY/Ghosthack-A_Kit 03_Metal Hammer_D# 70Bpm (DRY).wav | 70 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/DRY/Ghosthack-A_Kit 03_Metallic Slam FX_D# 70Bpm (DRY).wav | 70 | 233.0 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/DRY/Ghosthack-A_Kit 03_Pearl Drum Kit_D# 70Bpm (Dry Only).wav | 70 | 93.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/DRY/Ghosthack-A_Kit 03_Radio Chatter FX_D# 70Bpm (DRY).wav | 70 | 237.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/DRY/Ghosthack-A_Kit 03_Sinister Riser FX_D# 70Bpm (DRY).wav | 70 | 237.0 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/DRY/Ghosthack-A_Kit 03_Strings_D# 70Bpm (DRY).wav | 70 | 238.0 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/DRY/Ghosthack-A_Kit 03_Transmitter FX_D# 70Bpm (DRY).wav | 70 | 203.3 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/DRY/Ghosthack-A_Kit 03_Warm Strings_D# 70Bpm (DRY).wav | 70 | 244.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/DRY/Ghosthack-A_Kit 03_Wasteland Ambience_D# 70Bpm (DRY).wav | 70 | 151.9 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/WET/Ghosthack-A_Kit 03_Big Drum Hits_D# 70Bpm (WET).wav | 70 | 39.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/WET/Ghosthack-A_Kit 03_Broken Radio FX_D# 70Bpm (WET).wav | 70 | 244.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/WET/Ghosthack-A_Kit 03_Cymbal FX_D# 70Bpm (WET).wav | 70 | 207.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/WET/Ghosthack-A_Kit 03_Detuned FX_D# 70Bpm (WET).wav | 70 | 248.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/WET/Ghosthack-A_Kit 03_Interference FX_D# 70Bpm (WET).wav | 70 | 188.2 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/WET/Ghosthack-A_Kit 03_Metal Hammer_D# 70Bpm (WET).wav | 70 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/WET/Ghosthack-A_Kit 03_Metallic Slam FX_D# 70Bpm (WET).wav | 70 | 223.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/WET/Ghosthack-A_Kit 03_Radio Chatter FX_D# 70Bpm (WET).wav | 70 | 235.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/WET/Ghosthack-A_Kit 03_Sinister Riser FX_D# 70Bpm (WET).wav | 70 | 240.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/WET/Ghosthack-A_Kit 03_Strings_D# 70Bpm (WET).wav | 70 | 236.3 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/WET/Ghosthack-A_Kit 03_Toms_D# 70Bpm (WET).wav | 70 | 93.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/WET/Ghosthack-A_Kit 03_Transmitter FX_D# 70Bpm (WET).wav | 70 | 202.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/WET/Ghosthack-A_Kit 03_Warm Strings_D# 70Bpm (WET).wav | 70 | 236.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm/STEMS/WET/Ghosthack-A_Kit 03_Wasteland Ambience_D# 70Bpm (WET).wav | 70 | 93.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/Ghosthack-A_Kit 04_The Brain Scorcher_Em 70Bpm.wav | 70 | 93.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/DRY/Ghosthack-A_Kit 04_Bass Guitar_Em 70Bpm (Dry Only).wav | 70 | 93.3 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/DRY/Ghosthack-A_Kit 04_Brass Swell_Em 70Bpm (DRY).wav | 70 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/DRY/Ghosthack-A_Kit 04_Choir_Em 70Bpm (DRY).wav | 70 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/DRY/Ghosthack-A_Kit 04_Chug Guitar_Em 70Bpm (Dry Only).wav | 70 | 93.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/DRY/Ghosthack-A_Kit 04_Deep Drone_Em 70Bpm (DRY).wav | 70 | 62.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/DRY/Ghosthack-A_Kit 04_Didgeridoo_Em 70Bpm (DRY).wav | 70 | 243.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/DRY/Ghosthack-A_Kit 04_Forest Ambience_Em 70Bpm (DRY).wav | 70 | 129.9 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/DRY/Ghosthack-A_Kit 04_Horns_Em 70Bpm (DRY).wav | 70 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/DRY/Ghosthack-A_Kit 04_Orchestral Hits_Em 70Bpm (DRY).wav | 70 | 92.3 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/DRY/Ghosthack-A_Kit 04_Pad Blast FX_Em 70Bpm (DRY).wav | 70 | 239.3 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/DRY/Ghosthack-A_Kit 04_Pearl Drum Kit_Em 70Bpm (Dry Only).wav | 70 | 93.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/DRY/Ghosthack-A_Kit 04_Solo Violin_Em 70Bpm (DRY).wav | 70 | 248.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/DRY/Ghosthack-A_Kit 04_String Section_Em 70Bpm (DRY).wav | 70 | 248.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/DRY/Ghosthack-A_Kit 04_Strum Acc Guitar_Em 70Bpm (Dry Only).wav | 70 | 93.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/DRY/Ghosthack-A_Kit 04_Warped Lead_Em 70Bpm (DRY).wav | 70 | 104.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/DRY/Ghosthack-A_Kit 04_Wind FX_Em 70Bpm (DRY).wav | 70 | 225.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/WET/Ghosthack-A_Kit 04_Brass Swell_Em 70Bpm (WET).wav | 70 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/WET/Ghosthack-A_Kit 04_Choir_Em 70Bpm (WET).wav | 70 | 147.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/WET/Ghosthack-A_Kit 04_Deep Drone_Em 70Bpm (WET).wav | 70 | 232.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/WET/Ghosthack-A_Kit 04_Didgeridoo_Em 70Bpm (WET).wav | 70 | 242.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/WET/Ghosthack-A_Kit 04_Forest Ambience_Em 70Bpm (WET).wav | 70 | 176.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/WET/Ghosthack-A_Kit 04_Horns_Em 70Bpm (WET).wav | 70 | 228.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/WET/Ghosthack-A_Kit 04_Orchestral Ensemble_Em 70Bpm (WET).wav | 70 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/WET/Ghosthack-A_Kit 04_Orchestral Hits_Em 70Bpm (WET).wav | 70 | 92.0 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/WET/Ghosthack-A_Kit 04_Pad Blast FX_Em 70Bpm (WET).wav | 70 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/WET/Ghosthack-A_Kit 04_Solo Violin_Em 70Bpm (WET).wav | 70 | 248.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/WET/Ghosthack-A_Kit 04_String Section_Em 70Bpm (WET).wav | 70 | 248.2 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/WET/Ghosthack-A_Kit 04_Warped Lead_Em 70Bpm (WET).wav | 70 | 103.2 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher/STEMS/WET/Ghosthack-A_Kit 04_Wind FX_Em 70Bpm (WET).wav | 70 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/DRY/Ghosthack-A_Kit 05_Acc Guitar_Am 65Bpm (DRY).wav | 65 | 86.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/DRY/Ghosthack-A_Kit 05_Cello_Am 65Bpm (DRY).wav | 65 | 227.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/DRY/Ghosthack-A_Kit 05_Forest Ambience_Am 65Bpm (DRY).wav | 65 | 235.0 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/DRY/Ghosthack-A_Kit 05_Ghostly Riser FX_Am 65Bpm (DRY).wav | 65 | 209.2 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/DRY/Ghosthack-A_Kit 05_Interference FX_Am 65Bpm (DRY).wav | 65 | 233.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/DRY/Ghosthack-A_Kit 05_Low Static FX_Am 65Bpm (DRY).wav | 65 | 200.3 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/DRY/Ghosthack-A_Kit 05_Nature Ambience_Am 65Bpm (DRY).wav | 65 | 140.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/DRY/Ghosthack-A_Kit 05_Orch Drums_Am 65Bpm (Dry Only).wav | 65 | 43.2 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/DRY/Ghosthack-A_Kit 05_Shimmering FX_Am 65Bpm (DRY).wav | 65 | 185.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/DRY/Ghosthack-A_Kit 05_Soft Strings_Am 65Bpm (DRY).wav | 65 | 246.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/DRY/Ghosthack-A_Kit 05_Upright Bass_Am 65Bpm (Dry Only).wav | 65 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/DRY/Ghosthack-A_Kit 05_Warm Strings_Am 65Bpm (DRY).wav | 65 | 246.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/DRY/Ghosthack-A_Kit 05_Wind FX_Am 65Bpm (DRY).wav | 65 | 236.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/DRY/Ghosthack-A_Kit 05_Wooden Hits FX_Am 65Bpm (DRY).wav | 65 | 152.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/WET/Ghosthack-A_Kit 05_Acc Guitar_Am 65Bpm (WET).wav | 65 | 86.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/WET/Ghosthack-A_Kit 05_Cello_Am 65Bpm (WET).wav | 65 | 226.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/WET/Ghosthack-A_Kit 05_Forest Ambience_Am 65Bpm (WET).wav | 65 | 174.9 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/WET/Ghosthack-A_Kit 05_Ghostly Riser FX_Am 65Bpm (WET).wav | 65 | 206.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/WET/Ghosthack-A_Kit 05_Interference FX_Am 65Bpm (WET).wav | 65 | 203.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/WET/Ghosthack-A_Kit 05_Low Static FX_Am 65Bpm (WET).wav | 65 | 200.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/WET/Ghosthack-A_Kit 05_Nature Ambience_Am 65Bpm (WET).wav | 65 | 140.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/WET/Ghosthack-A_Kit 05_Shimmering FX_Am 65Bpm (WET).wav | 65 | 240.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/WET/Ghosthack-A_Kit 05_Soft Strings_Am 65Bpm (WET).wav | 65 | 231.2 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/WET/Ghosthack-A_Kit 05_Warm Strings_Am 65Bpm (WET).wav | 65 | 226.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/WET/Ghosthack-A_Kit 05_Wind FX_Am 65Bpm (WET).wav | 65 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm/STEMS/WET/Ghosthack-A_Kit 05_Wooden Hits FX_Am 65Bpm (WET).wav | 65 | 194.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Alone Fm 65Bpm (DRY).wav | 65 | 162.2 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Complex Cm 75Bpm (DRY).wav | 75 | 244.9 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Distant Cry Gm 65Bpm (DRY).wav | 65 | 240.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Environmental Problems Am 65Bpm (DRY).wav | 65 | 113.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Facility Am 75Bpm (DRY).wav | 75 | 207.9 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_First Light Cm 60Bpm (DRY).wav | 60 | 244.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Ghost Signal Am 60Bpm (DRY).wav | 60 | 75.0 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Isolation Fm 80Bpm (DRY).wav | 80 | 215.3 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Junk Yard Gm 70Bpm (DRY).wav | 70 | 183.3 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Last Transmission Bm 80Bpm (DRY).wav | 80 | 232.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Meter Reading Em 65Bpm (DRY).wav | 65 | 68.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Radiation Zone Fm 80Bpm (DRY).wav | 80 | 134.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Resolution Am 65Bpm (DRY).wav | 65 | 207.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Revolving Cm 65Bpm (DRY).wav | 65 | 244.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_The Anomaly Fm 60Bpm (DRY).wav | 60 | 76.0 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_The Last Train Cm 60Bpm (DRY).wav | 60 | 245.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Tinnitus Gm 60Bpm (DRY).wav | 60 | 110.5 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY/Ghosthack-A_Wasteland Am 75Bpm (DRY).wav | 75 | 207.3 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/WET/Ghosthack-A_Alone Fm 65Bpm (WET).wav | 65 | 225.0 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/WET/Ghosthack-A_Complex Cm 75Bpm (WET).wav | 75 | 244.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/WET/Ghosthack-A_Distant Cry Gm 65Bpm (WET).wav | 65 | 239.8 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/WET/Ghosthack-A_Environmental Problems Am 65Bpm (WET).wav | 65 | 161.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/WET/Ghosthack-A_Facility Am 75Bpm (WET).wav | 75 | 140.9 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/WET/Ghosthack-A_First Light Cm 60Bpm (WET).wav | 60 | 213.7 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/WET/Ghosthack-A_Ghost Signal Am 60Bpm (WET).wav | 60 | 102.2 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/WET/Ghosthack-A_Isolation Fm 80Bpm (WET).wav | 80 | 233.4 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/WET/Ghosthack-A_Junk Yard Gm 70Bpm (WET).wav | 70 | 183.9 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/WET/Ghosthack-A_Last Transmission Bm 80Bpm (WET).wav | 80 | 232.1 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/WET/Ghosthack-A_Meter Reading Em 65Bpm (WET).wav | 65 | 68.6 |
| Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/WET/Ghosthack-A_Radiation Zone Fm 80Bpm (WET).wav | 80 | 134.2 |
| ... and 564 more (in analysis.json: `tempo_name_agree: false`) | | |

### Role (spectrum contradicts the name): 5 files

| file | named role | centroid Hz | low-end share | finding |
| --- | --- | ---: | ---: | --- |
| Ghosthack - Cinematic Orchestra Volume 2/Ghosthack - Cinematic Orchestra Volume 2/Drum One Shots/Kick Impacts/GH_FS III_Kick Impact_4_.wav | kick (kick) | 2207 | 0.0491 | named kick but low-end share < 8% |
| Ghosthack - Cinematic Orchestra Volume 2/Ghosthack - Cinematic Orchestra Volume 2/Drum One Shots/Kick Impacts/GH_FS III_Kick Impact_7_.wav | kick (kick) | 1304 | 0.0472 | named kick but low-end share < 8% |
| Ghosthack - Cinematic Orchestra Volume 2/Ghosthack - Cinematic Orchestra Volume 2/Drum One Shots/Kick Impacts/GH_FS III_Kick Impact_9_.wav | kick (kick) | 777 | 0.0567 | named kick but low-end share < 8% |
| Ghosthack - Cinematic Orchestra Volume 2/Ghosthack - Cinematic Orchestra Volume 2/Drum One Shots/Kicks/GH_FS III_Kicks_ 6.wav | kick (kick) | 8528 | 0.061 | named kick but low-end share < 8% |
| Ghosthack - Mystery Nightfall - Trailer SFX/Ghosthack - Mystery Nightfall - Trailer SFX/One Shots/Perc/Ghosthack-MN_Perc_Blind_Hats.wav | hats (hats) | None | None | named hats but spectral centroid < 1800 Hz |

### Silent or near-silent (sample peak below -50 dBFS): 1 files

- Ghosthack - Cinematic Orchestra Volume 2/Ghosthack - Cinematic Orchestra Volume 2/Instrument Loops/Piano _ Organ Loops/Piano Loops - 120bpm/GH_FS III_Piano Loops_ 10_Abm_120bpm.wav (-138.47 dBFS, 16.0 s)

## Kits that do not loop on a bar

A kit is listed when at least one of its files that is at least one bar long (stems, loops and full mixes; one-shots excluded) is not a whole number of bars.

18 kits:

### Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 01 - Safe Zone - Am 70Bpm — 30 file(s) off the bar
- Ghosthack-A_Kit 01_Reverse Perc Hit_Am 70Bpm (DRY).wav: 2.5 bars (8.571 s at 70 BPM)
- Ghosthack-A_Kit 01_Reverse Piano_Am 70Bpm (DRY).wav: 2.5 bars (8.571 s at 70 BPM)
- Ghosthack-A_Kit 01_Gritty Bass Guitar_Am 70Bpm (Dry Only).wav: 16.125 bars (55.286 s at 70 BPM)
- Ghosthack-A_Kit 01_Strumming Guitar_Am 70Bpm (DRY).wav: 32.5 bars (111.429 s at 70 BPM)
- Ghosthack-A_Kit 01_Distant Bells_Am 70Bpm (WET).wav: 17.25 bars (59.143 s at 70 BPM)
- Ghosthack-A_Kit 01_Granular Glass FX_Am 70Bpm (WET).wav: 5.75 bars (19.714 s at 70 BPM)
- Ghosthack-A_Kit 01_Hats_Am 70Bpm (WET).wav: 16.25 bars (55.714 s at 70 BPM)
- Ghosthack-A_Kit 01_Low Piano Hit_Am 70Bpm (WET).wav: 2.75 bars (9.429 s at 70 BPM)
- Ghosthack-A_Kit 01_Reverse FX_Am 70Bpm (WET).wav: 3.25 bars (11.143 s at 70 BPM)
- Ghosthack-A_Kit 01_Reverse Metallic FX_Am 70Bpm (WET).wav: 4.25 bars (14.571 s at 70 BPM)
- Ghosthack-A_Kit 01_Reverse Perc Hit_Am 70Bpm (WET).wav: 3.5 bars (12.0 s at 70 BPM)
- Ghosthack-A_Kit 01_Reverse Piano_Am 70Bpm (WET).wav: 4.25 bars (14.571 s at 70 BPM)
- Ghosthack-A_Kit 01_Violin_Am 70Bpm (DRY).wav: 10.25 bars (35.143 s at 70 BPM)
- Ghosthack-A_Kit 01_Ambient Pad_Am 70Bpm (WET).wav: 35.25 bars (120.857 s at 70 BPM)
- Ghosthack-A_Kit 01_Safe Zone_Am 70Bpm.wav: 90.5 bars (310.286 s at 70 BPM)
- Ghosthack-A_Kit 01_Ambient Strings_Am 70Bpm (DRY).wav: 44.25 bars (151.714 s at 70 BPM)
- Ghosthack-A_Kit 01_Chug Guitar_Am 70Bpm (DRY).wav: 16.125 bars (55.286 s at 70 BPM)
- Ghosthack-A_Kit 01_Male Choir Riser_Am 70Bpm (DRY).wav: 2.5 bars (8.571 s at 70 BPM)
- Ghosthack-A_Kit 01_Melody Guitar_Am 70Bpm (DRY).wav: 36.312 bars (124.5 s at 70 BPM)
- Ghosthack-A_Kit 01_Piano_Am 70Bpm (DRY).wav: 8.25 bars (28.286 s at 70 BPM)
- Ghosthack-A_Kit 01_Top Lead Pad_Am 70Bpm (WET).wav: 10.5 bars (36.0 s at 70 BPM)
- Ghosthack-A_Kit 01_Crash Cymbals_Am 70Bpm (DRY).wav: 16.5 bars (56.571 s at 70 BPM)
- Ghosthack-A_Kit 01_Chug Guitar_Am 70Bpm (WET).wav: 16.25 bars (55.714 s at 70 BPM)
- Ghosthack-A_Kit 01_Dark Drone FX_Am 70Bpm (WET).wav: 89.5 bars (306.857 s at 70 BPM)
- Ghosthack-A_Kit 01_Dark Drums_Am 70Bpm (WET).wav: 37.25 bars (127.714 s at 70 BPM)
- Ghosthack-A_Kit 01_Male Choir Riser_Am 70Bpm (WET).wav: 3.75 bars (12.857 s at 70 BPM)
- Ghosthack-A_Kit 01_Melody Guitar_Am 70Bpm (WET).wav: 37.062 bars (127.071 s at 70 BPM)
- Ghosthack-A_Kit 01_Piano_Am 70Bpm (WET).wav: 10.5 bars (36.0 s at 70 BPM)
- Ghosthack-A_Kit 01_Rain FX_Am 70Bpm (WET).wav: 85.75 bars (294.0 s at 70 BPM)
- Ghosthack-A_Kit 01_Violin_Am 70Bpm (WET).wav: 11.5 bars (39.429 s at 70 BPM)

### Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 02 - Dark Valley - Cm 65Bpm — 32 file(s) off the bar
- Ghosthack-A_Kit 02_Cello_Cm 65Bpm (DRY).wav: 1.25 bars (4.615 s at 65 BPM)
- Ghosthack-A_Kit 02_Explosion FX_Cm 65Bpm (DRY).wav: 1.0 bars (3.692 s at 65 BPM)
- Ghosthack-A_Kit 02_Geiger Counter_Cm 65Bpm (DRY).wav: 5.5 bars (20.308 s at 65 BPM)
- Ghosthack-A_Kit 02_Ghostly FX_Cm 65Bpm (DRY).wav: 3.25 bars (12.0 s at 65 BPM)
- Ghosthack-A_Kit 02_Granular Flute_Cm 65Bpm (DRY).wav: 8.25 bars (30.462 s at 65 BPM)
- Ghosthack-A_Kit 02_Male Solo Choir Intro_Cm 65Bpm (DRY).wav: 8.25 bars (30.462 s at 65 BPM)
- Ghosthack-A_Kit 02_String Ensemble_Cm 65Bpm (DRY).wav: 16.5 bars (60.923 s at 65 BPM)
- Ghosthack-A_Kit 02_WaterPhone FX_Cm 65Bpm (DRY).wav: 1.5 bars (5.538 s at 65 BPM)
- Ghosthack-A_Kit 02_Whisper Riser FX_Cm 65Bpm (DRY).wav: 1.0 bars (3.692 s at 65 BPM)
- Ghosthack-A_Kit 02_Geiger Counter_Cm 65Bpm (WET).wav: 6.5 bars (24.0 s at 65 BPM)
- Ghosthack-A_Kit 02_Ghostly FX_Cm 65Bpm (WET).wav: 5.25 bars (19.385 s at 65 BPM)
- Ghosthack-A_Kit 02_Radio FX_Cm 65Bpm (DRY).wav: 1.0 bars (3.692 s at 65 BPM)
- Ghosthack-A_Kit 02_Random Pluck FX_Cm 65Bpm (DRY).wav: 2.75 bars (10.154 s at 65 BPM)
- Ghosthack-A_Kit 02_String Ensemble_Cm 65Bpm (WET).wav: 17.5 bars (64.615 s at 65 BPM)
- Ghosthack-A_Kit 02_WaterPhone FX_Cm 65Bpm (WET).wav: 3.25 bars (12.0 s at 65 BPM)
- Ghosthack-A_Kit 02_Whisper Riser FX_Cm 65Bpm (WET).wav: 2.75 bars (10.154 s at 65 BPM)
- Ghosthack-A_Kit 02_Radio FX_Cm 65Bpm (WET).wav: 2.25 bars (8.308 s at 65 BPM)
- Ghosthack-A_Kit 02_Random Pluck FX_Cm 65Bpm (WET).wav: 4.25 bars (15.692 s at 65 BPM)
- Ghosthack-A_Kit 02_Sparkle Drone_Cm 65Bpm (WET).wav: 29.75 bars (109.846 s at 65 BPM)
- Ghosthack-A_Kit 02_Glistening FX_Cm 65Bpm (WET).wav: 3.5 bars (12.923 s at 65 BPM)
- Ghosthack-A_Kit 02_Granular Flute_Cm 65Bpm (WET).wav: 11.25 bars (41.538 s at 65 BPM)
- Ghosthack-A_Kit 02_Male Solo Choir Intro_Cm 65Bpm (WET).wav: 9.25 bars (34.154 s at 65 BPM)
- Ghosthack-A_Kit 02_Male Solo Choir Outro_Cm 65Bpm (DRY).wav: 16.5 bars (60.923 s at 65 BPM)
- Ghosthack-A_Kit 02_Picked Guitar_Cm 65Bpm (DRY).wav: 32.75 bars (120.923 s at 65 BPM)
- Ghosthack-A_Kit 02_Whistle Bend FX_Cm 65Bpm (DRY).wav: 2.75 bars (10.154 s at 65 BPM)
- Ghosthack-A_Kit 02_Wind Shaker_Cm 65Bpm (DRY).wav: 1.25 bars (4.615 s at 65 BPM)
- Ghosthack-A_Kit 02_Atmos Drone_Cm 65Bpm (WET).wav: 104.5 bars (385.846 s at 65 BPM)
- Ghosthack-A_Kit 02_Bassline Slap_Cm 65Bpm (WET).wav: 32.5 bars (120.0 s at 65 BPM)
- Ghosthack-A_Kit 02_Male Solo Choir Outro_Cm 65Bpm (WET).wav: 17.5 bars (64.615 s at 65 BPM)
- Ghosthack-A_Kit 02_Metallic Hits FX_Cm 65Bpm (WET).wav: 2.75 bars (10.154 s at 65 BPM)
- ... and 2 more

### Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 03 - The Anomaly D# 70Bpm — 24 file(s) off the bar
- Ghosthack-A_Kit 03_Interference FX_D# 70Bpm (DRY).wav: 1.5 bars (5.143 s at 70 BPM)
- Ghosthack-A_Kit 03_Pearl Drum Kit_D# 70Bpm (Dry Only).wav: 9.625 bars (33.0 s at 70 BPM)
- Ghosthack-A_Kit 03_The Anomaly D# 70Bpm.wav: 46.75 bars (160.286 s at 70 BPM)
- Ghosthack-A_Kit 03_Big Drum Hits_D# 70Bpm (DRY).wav: 16.75 bars (57.429 s at 70 BPM)
- Ghosthack-A_Kit 03_Cymbal FX_D# 70Bpm (DRY).wav: 1.5 bars (5.143 s at 70 BPM)
- Ghosthack-A_Kit 03_Distorted Pluck_D# 70Bpm (DRY).wav: 16.75 bars (57.429 s at 70 BPM)
- Ghosthack-A_Kit 03_Poly Bassline_D# 70Bpm (Dry Only).wav: 16.25 bars (55.714 s at 70 BPM)
- Ghosthack-A_Kit 03_Sinister Riser FX_D# 70Bpm (DRY).wav: 2.75 bars (9.429 s at 70 BPM)
- Ghosthack-A_Kit 03_Soft Lead_D# 70Bpm (DRY).wav: 8.75 bars (30.0 s at 70 BPM)
- Ghosthack-A_Kit 03_Metal Hammer_D# 70Bpm (WET).wav: 8.25 bars (28.286 s at 70 BPM)
- Ghosthack-A_Kit 03_Radio Chatter FX_D# 70Bpm (WET).wav: 3.25 bars (11.143 s at 70 BPM)
- Ghosthack-A_Kit 03_Sinister Riser FX_D# 70Bpm (WET).wav: 3.25 bars (11.143 s at 70 BPM)
- Ghosthack-A_Kit 03_Strings_D# 70Bpm (DRY).wav: 17.75 bars (60.857 s at 70 BPM)
- Ghosthack-A_Kit 03_Toms_D# 70Bpm (DRY).wav: 16.75 bars (57.429 s at 70 BPM)
- Ghosthack-A_Kit 03_Warm Strings_D# 70Bpm (DRY).wav: 18.25 bars (62.571 s at 70 BPM)
- Ghosthack-A_Kit 03_Soft Lead_D# 70Bpm (WET).wav: 10.25 bars (35.143 s at 70 BPM)
- Ghosthack-A_Kit 03_Strings_D# 70Bpm (WET).wav: 19.25 bars (66.0 s at 70 BPM)
- Ghosthack-A_Kit 03_Toms_D# 70Bpm (WET).wav: 17.25 bars (59.143 s at 70 BPM)
- Ghosthack-A_Kit 03_Wasteland Ambience_D# 70Bpm (DRY).wav: 42.75 bars (146.571 s at 70 BPM)
- Ghosthack-A_Kit 03_Big Drum Hits_D# 70Bpm (WET).wav: 16.75 bars (57.429 s at 70 BPM)
- Ghosthack-A_Kit 03_Broken Radio FX_D# 70Bpm (WET).wav: 5.5 bars (18.857 s at 70 BPM)
- Ghosthack-A_Kit 03_Dark Drone FX_D# 70Bpm (WET).wav: 41.75 bars (143.143 s at 70 BPM)
- Ghosthack-A_Kit 03_Interference FX_D# 70Bpm (WET).wav: 2.5 bars (8.571 s at 70 BPM)
- Ghosthack-A_Kit 03_Warm Strings_D# 70Bpm (WET).wav: 18.75 bars (64.286 s at 70 BPM)

### Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 04 - The Brain Scorcher — 23 file(s) off the bar
- Ghosthack-A_Kit 04_Orchestral Ensemble_Em 70Bpm (DRY).wav: 4.5 bars (15.429 s at 70 BPM)
- Ghosthack-A_Kit 04_Orchestral Hits_Em 70Bpm (DRY).wav: 8.25 bars (28.286 s at 70 BPM)
- Ghosthack-A_Kit 04_Brass Swell_Em 70Bpm (DRY).wav: 9.25 bars (31.714 s at 70 BPM)
- Ghosthack-A_Kit 04_Horns_Em 70Bpm (DRY).wav: 8.5 bars (29.143 s at 70 BPM)
- Ghosthack-A_Kit 04_Lead Guitar_Em 70Bpm (DRY).wav: 16.25 bars (55.714 s at 70 BPM)
- Ghosthack-A_Kit 04_Piano_Em 70Bpm (DRY).wav: 44.25 bars (151.714 s at 70 BPM)
- Ghosthack-A_Kit 04_Solo Violin_Em 70Bpm (DRY).wav: 16.5 bars (56.571 s at 70 BPM)
- Ghosthack-A_Kit 04_String Section_Em 70Bpm (DRY).wav: 16.5 bars (56.571 s at 70 BPM)
- Ghosthack-A_Kit 04_Bass Guitar_Em 70Bpm (Dry Only).wav: 16.25 bars (55.714 s at 70 BPM)
- Ghosthack-A_Kit 04_Brass Swell_Em 70Bpm (WET).wav: 11.5 bars (39.429 s at 70 BPM)
- Ghosthack-A_Kit 04_Choir_Em 70Bpm (WET).wav: 10.25 bars (35.143 s at 70 BPM)
- Ghosthack-A_Kit 04_Deep Drone_Em 70Bpm (WET).wav: 60.75 bars (208.286 s at 70 BPM)
- Ghosthack-A_Kit 04_Didgeridoo_Em 70Bpm (WET).wav: 16.25 bars (55.714 s at 70 BPM)
- Ghosthack-A_Kit 04_Forest Ambience_Em 70Bpm (WET).wav: 60.75 bars (208.286 s at 70 BPM)
- Ghosthack-A_Kit 04_Horns_Em 70Bpm (WET).wav: 8.75 bars (30.0 s at 70 BPM)
- Ghosthack-A_Kit 04_Lead Guitar_Em 70Bpm (WET).wav: 19.25 bars (66.0 s at 70 BPM)
- Ghosthack-A_Kit 04_Orchestral Hits_Em 70Bpm (WET).wav: 8.75 bars (30.0 s at 70 BPM)
- Ghosthack-A_Kit 04_Radar Alarm_Em 70Bpm (WET).wav: 25.25 bars (86.571 s at 70 BPM)
- Ghosthack-A_Kit 04_Warped Lead_Em 70Bpm (DRY).wav: 32.25 bars (110.571 s at 70 BPM)
- Ghosthack-A_Kit 04_Solo Violin_Em 70Bpm (WET).wav: 16.75 bars (57.429 s at 70 BPM)
- Ghosthack-A_Kit 04_String Section_Em 70Bpm (WET).wav: 17.75 bars (60.857 s at 70 BPM)
- Ghosthack-A_Kit 04_Warped Lead_Em 70Bpm (WET).wav: 34.25 bars (117.429 s at 70 BPM)
- Ghosthack-A_Kit 04_Wind FX_Em 70Bpm (WET).wav: 60.5 bars (207.429 s at 70 BPM)

### Ghosthack - Anomaly/Ghosthack - Anomaly/Construction Kits/Kit 05 - Clear Sky - Am 65Bpm — 20 file(s) off the bar
- Ghosthack-A_Kit 05_Ghostly Riser FX_Am 65Bpm (DRY).wav: 1.0 bars (3.692 s at 65 BPM)
- Ghosthack-A_Kit 05_Interference FX_Am 65Bpm (DRY).wav: 1.25 bars (4.615 s at 65 BPM)
- Ghosthack-A_Kit 05_Low Static FX_Am 65Bpm (DRY).wav: 1.0 bars (3.692 s at 65 BPM)
- Ghosthack-A_Kit 05_Orch Drums_Am 65Bpm (Dry Only).wav: 24.25 bars (89.538 s at 65 BPM)
- Ghosthack-A_Kit 05_Piano_Am 65Bpm (DRY).wav: 20.25 bars (74.769 s at 65 BPM)
- Ghosthack-A_Kit 05_Shimmering FX_Am 65Bpm (DRY).wav: 8.75 bars (32.308 s at 65 BPM)
- Ghosthack-A_Kit 05_Soft Strings_Am 65Bpm (DRY).wav: 32.5 bars (120.0 s at 65 BPM)
- Ghosthack-A_Kit 05_Warm Strings_Am 65Bpm (DRY).wav: 8.75 bars (32.308 s at 65 BPM)
- Ghosthack-A_Kit 05_Wind FX_Am 65Bpm (DRY).wav: 47.75 bars (176.308 s at 65 BPM)
- Ghosthack-A_Kit 05_Low Static FX_Am 65Bpm (WET).wav: 1.75 bars (6.462 s at 65 BPM)
- Ghosthack-A_Kit 05_Piano_Am 65Bpm (WET).wav: 21.25 bars (78.462 s at 65 BPM)
- Ghosthack-A_Kit 05_Wooden Hits FX_Am 65Bpm (WET).wav: 3.25 bars (12.0 s at 65 BPM)
- Ghosthack-A_Kit 05_Shimmering FX_Am 65Bpm (WET).wav: 9.5 bars (35.077 s at 65 BPM)
- Ghosthack-A_Kit 05_Soft Strings_Am 65Bpm (WET).wav: 33.5 bars (123.692 s at 65 BPM)
- Ghosthack-A_Kit 05_Warm Strings_Am 65Bpm (WET).wav: 9.25 bars (34.154 s at 65 BPM)
- Ghosthack-A_Kit 05_Acc Guitar_Am 65Bpm (WET).wav: 33.25 bars (122.769 s at 65 BPM)
- Ghosthack-A_Kit 05_Cello_Am 65Bpm (WET).wav: 17.25 bars (63.692 s at 65 BPM)
- Ghosthack-A_Kit 05_Forest Ambience_Am 65Bpm (WET).wav: 49.75 bars (183.692 s at 65 BPM)
- Ghosthack-A_Kit 05_Acc Guitar_Am 65Bpm (DRY).wav: 33.25 bars (122.769 s at 65 BPM)
- Ghosthack-A_Kit 05_Cello_Am 65Bpm (DRY).wav: 15.75 bars (58.154 s at 65 BPM)

### Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/DRY — 14 file(s) off the bar
- Ghosthack-A_Alone Fm 65Bpm (DRY).wav: 30.25 bars (111.692 s at 65 BPM)
- Ghosthack-A_Complex Cm 75Bpm (DRY).wav: 10.25 bars (32.8 s at 75 BPM)
- Ghosthack-A_Creature Comforts Dm 70Bpm (DRY).wav: 15.75 bars (54.0 s at 70 BPM)
- Ghosthack-A_Ghost Signal Am 60Bpm (DRY).wav: 24.5 bars (98.0 s at 60 BPM)
- Ghosthack-A_Isolation Fm 80Bpm (DRY).wav: 5.5 bars (16.5 s at 80 BPM)
- Ghosthack-A_Junk Yard Gm 70Bpm (DRY).wav: 20.75 bars (71.143 s at 70 BPM)
- Ghosthack-A_Distant Cry Gm 65Bpm (DRY).wav: 3.25 bars (12.0 s at 65 BPM)
- Ghosthack-A_Environmental Problems Am 65Bpm (DRY).wav: 26.25 bars (96.923 s at 65 BPM)
- Ghosthack-A_First Light Cm 60Bpm (DRY).wav: 9.75 bars (39.0 s at 60 BPM)
- Ghosthack-A_The Last Train Cm 60Bpm (DRY).wav: 15.5 bars (62.0 s at 60 BPM)
- Ghosthack-A_Last Transmission Bm 80Bpm (DRY).wav: 23.5 bars (70.5 s at 80 BPM)
- Ghosthack-A_Meter Reading Em 65Bpm (DRY).wav: 19.5 bars (72.0 s at 65 BPM)
- Ghosthack-A_Radiation Zone Fm 80Bpm (DRY).wav: 20.75 bars (62.25 s at 80 BPM)
- Ghosthack-A_Resolution Am 65Bpm (DRY).wav: 16.5 bars (60.923 s at 65 BPM)

### Ghosthack - Anomaly/Ghosthack - Anomaly/Granular Underscores/WET — 17 file(s) off the bar
- Ghosthack-A_Frantic Fm 65Bpm (WET).wav: 8.5 bars (31.385 s at 65 BPM)
- Ghosthack-A_Ghost Signal Am 60Bpm (WET).wav: 25.5 bars (102.0 s at 60 BPM)
- Ghosthack-A_Junk Yard Gm 70Bpm (WET).wav: 21.5 bars (73.714 s at 70 BPM)
- Ghosthack-A_Distant Cry Gm 65Bpm (WET).wav: 4.25 bars (15.692 s at 65 BPM)
- Ghosthack-A_Environmental Problems Am 65Bpm (WET).wav: 26.75 bars (98.769 s at 65 BPM)
- Ghosthack-A_Facility Am 75Bpm (WET).wav: 32.75 bars (104.8 s at 75 BPM)
- Ghosthack-A_First Light Cm 60Bpm (WET).wav: 10.5 bars (42.0 s at 60 BPM)
- Ghosthack-A_Alone Fm 65Bpm (WET).wav: 30.75 bars (113.538 s at 65 BPM)
- Ghosthack-A_Complex Cm 75Bpm (WET).wav: 11.25 bars (36.0 s at 75 BPM)
- Ghosthack-A_Creature Comforts Dm 70Bpm (WET).wav: 16.25 bars (55.714 s at 70 BPM)
- Ghosthack-A_Revolving Cm 65Bpm (WET).wav: 10.25 bars (37.846 s at 65 BPM)
- Ghosthack-A_The Anomaly Fm 60Bpm (WET).wav: 23.75 bars (95.0 s at 60 BPM)
- Ghosthack-A_The Last Train Cm 60Bpm (WET).wav: 16.25 bars (65.0 s at 60 BPM)
- Ghosthack-A_Tinnitus Gm 60Bpm (WET).wav: 10.5 bars (42.0 s at 60 BPM)
- Ghosthack-A_Last Transmission Bm 80Bpm (WET).wav: 24.5 bars (73.5 s at 80 BPM)
- Ghosthack-A_Radiation Zone Fm 80Bpm (WET).wav: 21.5 bars (64.5 s at 80 BPM)
- Ghosthack-A_Resolution Am 65Bpm (WET).wav: 17.25 bars (63.692 s at 65 BPM)

### Ghosthack - Anomaly/Ghosthack - Anomaly/Impacts/DRY — 17 file(s) off the bar
- Ghosthack-A_Dark Zone Am 75Bpm (DRY).wav: 1.5 bars (4.8 s at 75 BPM)
- Ghosthack-A_Darkness Am 60Bpm (DRY).wav: 0.75 bars (3.0 s at 60 BPM)
- Ghosthack-A_Interference Em 65Bpm (DRY).wav: 1.75 bars (6.462 s at 65 BPM)
- Ghosthack-A_Metallic Am 60Bpm (DRY).wav: 1.25 bars (5.0 s at 60 BPM)
- Ghosthack-A_Mutation Cm 65Bpm (DRY).wav: 1.0 bars (3.692 s at 65 BPM)
- Ghosthack-A_Radiation Zone Dm 80Bpm (DRY).wav: 1.25 bars (3.75 s at 80 BPM)
- Ghosthack-A_Resistance Am 80Bpm (DRY).wav: 1.25 bars (3.75 s at 80 BPM)
- Ghosthack-A_Shattered Am 65Bpm (DRY).wav: 1.5 bars (5.538 s at 65 BPM)
- Ghosthack-A_Shocker Gm 65Bpm (DRY).wav: 1.25 bars (4.615 s at 65 BPM)
- Ghosthack-A_Signal Dm 75Bpm (DRY).wav: 1.5 bars (4.8 s at 75 BPM)
- Ghosthack-A_Technical Issue Fm 70Bpm (DRY).wav: 1.5 bars (5.143 s at 70 BPM)
- Ghosthack-A_Theory Fm 75Bpm (DRY).wav: 1.5 bars (4.8 s at 75 BPM)
- Ghosthack-A_Unforeseen Fm 80Bpm (DRY).wav: 1.75 bars (5.25 s at 80 BPM)
- Ghosthack-A_Aftershock Cm 75Bpm (DRY).wav: 1.75 bars (5.6 s at 75 BPM)
- Ghosthack-A_Backlight Am 60Bpm (DRY).wav: 1.25 bars (5.0 s at 60 BPM)
- Ghosthack-A_Bunker Fm 80Bpm (DRY).wav: 1.25 bars (3.75 s at 80 BPM)
- Ghosthack-A_Warning Fm 60Bpm (DRY).wav: 1.25 bars (5.0 s at 60 BPM)

### Ghosthack - Anomaly/Ghosthack - Anomaly/Impacts/WET — 13 file(s) off the bar
- Ghosthack-A_Backlight Am 60Bpm (WET).wav: 1.75 bars (7.0 s at 60 BPM)
- Ghosthack-A_Bunker Fm 80Bpm (WET).wav: 2.25 bars (6.75 s at 80 BPM)
- Ghosthack-A_Darkness Am 60Bpm (WET).wav: 1.75 bars (7.0 s at 60 BPM)
- Ghosthack-A_Hammer Cm 70Bpm (WET).wav: 2.25 bars (7.714 s at 70 BPM)
- Ghosthack-A_Metallic Am 60Bpm (WET).wav: 2.25 bars (9.0 s at 60 BPM)
- Ghosthack-A_Radiation Zone Dm 80Bpm (WET).wav: 2.5 bars (7.5 s at 80 BPM)
- Ghosthack-A_Resistance Am 80Bpm (WET).wav: 2.25 bars (6.75 s at 80 BPM)
- Ghosthack-A_Shocker Gm 65Bpm (WET).wav: 1.75 bars (6.462 s at 65 BPM)
- Ghosthack-A_Signal Dm 75Bpm (WET).wav: 1.75 bars (5.6 s at 75 BPM)
- Ghosthack-A_Technical Issue Fm 70Bpm (WET).wav: 2.75 bars (9.429 s at 70 BPM)
- Ghosthack-A_Tension Cm 70Bpm (WET).wav: 2.25 bars (7.714 s at 70 BPM)
- Ghosthack-A_Theory Fm 75Bpm (WET).wav: 2.25 bars (7.2 s at 75 BPM)
- Ghosthack-A_Unforeseen Fm 80Bpm (WET).wav: 2.5 bars (7.5 s at 80 BPM)

### Ghosthack - Cinematic Orchestra Volume 2/Ghosthack - Cinematic Orchestra Volume 2/Construction Kits/Blue Peace — 1 file(s) off the bar
- GH_FS III_Songkits_Blue Peace_Cmaj_90bpm.wav: 29.919 bars (79.785 s at 90 BPM)

### Ghosthack - Cinematic Orchestra Volume 2/Ghosthack - Cinematic Orchestra Volume 2/Construction Kits/Pressure — 9 file(s) off the bar
- GH_FS III_Songkits_Pressure_Em_150bpm.wav: 80.209 bars (128.335 s at 150 BPM)
- GH_FS III_Songkits_Pressure_Em_150bpm_ Fx.wav: 80.209 bars (128.335 s at 150 BPM)
- GH_FS III_Songkits_Pressure_Em_150bpm_ Harp.wav: 80.209 bars (128.335 s at 150 BPM)
- GH_FS III_Songkits_Pressure_Em_150bpm_ Horns Main.wav: 80.209 bars (128.335 s at 150 BPM)
- GH_FS III_Songkits_Pressure_Em_150bpm_ Marimba _ Flutes.wav: 80.209 bars (128.335 s at 150 BPM)
- GH_FS III_Songkits_Pressure_Em_150bpm_ String Tension.wav: 80.209 bars (128.335 s at 150 BPM)
- GH_FS III_Songkits_Pressure_Em_150bpm_ Strings PIzzicato.wav: 80.209 bars (128.335 s at 150 BPM)
- GH_FS III_Songkits_Pressure_Em_150bpm_ Strings.wav: 80.209 bars (128.335 s at 150 BPM)
- GH_FS III_Songkits_Pressure_Em_150bpm_ Tension Chords.wav: 80.209 bars (128.335 s at 150 BPM)

### Ghosthack - Cinematic Orchestra Volume 2/Ghosthack - Cinematic Orchestra Volume 2/Construction Kits/Unapreciated — 15 file(s) off the bar
- GH_FS III_Songkits_Unapreciated_Cm_140bpm_ White Noise Riser.wav: 69.847 bars (119.737 s at 140 BPM)
- GH_FS III_Songkits_Unapreciated_Cm_140bpm.wav: 69.847 bars (119.737 s at 140 BPM)
- GH_FS III_Songkits_Unapreciated_Cm_140bpm_ Big Kick.wav: 69.847 bars (119.737 s at 140 BPM)
- GH_FS III_Songkits_Unapreciated_Cm_140bpm_ Cello Solo.wav: 69.847 bars (119.737 s at 140 BPM)
- GH_FS III_Songkits_Unapreciated_Cm_140bpm_ Clap.wav: 69.847 bars (119.737 s at 140 BPM)
- GH_FS III_Songkits_Unapreciated_Cm_140bpm_ Clarinet.wav: 69.847 bars (119.737 s at 140 BPM)
- GH_FS III_Songkits_Unapreciated_Cm_140bpm_ Flute Smooth.wav: 69.847 bars (119.737 s at 140 BPM)
- GH_FS III_Songkits_Unapreciated_Cm_140bpm_ Impact.wav: 69.847 bars (119.737 s at 140 BPM)
- GH_FS III_Songkits_Unapreciated_Cm_140bpm_ Main Piano.wav: 69.847 bars (119.737 s at 140 BPM)
- GH_FS III_Songkits_Unapreciated_Cm_140bpm_ Piano High Notes.wav: 69.847 bars (119.737 s at 140 BPM)
- GH_FS III_Songkits_Unapreciated_Cm_140bpm_ Resampled Flute.wav: 69.847 bars (119.737 s at 140 BPM)
- GH_FS III_Songkits_Unapreciated_Cm_140bpm_ Strings Arco High.wav: 69.847 bars (119.737 s at 140 BPM)
- GH_FS III_Songkits_Unapreciated_Cm_140bpm_ Strings Arco.wav: 69.847 bars (119.737 s at 140 BPM)
- GH_FS III_Songkits_Unapreciated_Cm_140bpm_ Strings Arp.wav: 69.847 bars (119.737 s at 140 BPM)
- GH_FS III_Songkits_Unapreciated_Cm_140bpm_ Strings Staccato.wav: 69.847 bars (119.737 s at 140 BPM)

### Ghosthack - Cinematic Orchestra Volume 2/Ghosthack - Cinematic Orchestra Volume 2/Instrument Loops/Horns _ Metals/Sustained Tuba Loops — 10 file(s) off the bar
- GH_FS III_Sustained Tuba Loops_ 10_Em_140bpm.wav: 8.111 bars (13.904 s at 140 BPM)
- GH_FS III_Sustained Tuba Loops_ 1_Am_140bpm.wav: 8.111 bars (13.904 s at 140 BPM)
- GH_FS III_Sustained Tuba Loops_ 2_F#m_140bpm.wav: 8.111 bars (13.904 s at 140 BPM)
- GH_FS III_Sustained Tuba Loops_ 3_Emaj_140bpm.wav: 8.111 bars (13.904 s at 140 BPM)
- GH_FS III_Sustained Tuba Loops_ 4_Em_140bpm.wav: 8.111 bars (13.904 s at 140 BPM)
- GH_FS III_Sustained Tuba Loops_ 9_Ebmaj_140bpm.wav: 8.111 bars (13.904 s at 140 BPM)
- GH_FS III_Sustained Tuba Loops_ 5_C#m_140bpm.wav: 8.111 bars (13.904 s at 140 BPM)
- GH_FS III_Sustained Tuba Loops_ 6_Dmaj_140bpm.wav: 8.111 bars (13.904 s at 140 BPM)
- GH_FS III_Sustained Tuba Loops_ 7_Dm_140bpm.wav: 8.111 bars (13.904 s at 140 BPM)
- GH_FS III_Sustained Tuba Loops_ 8_Em_140bpm.wav: 8.111 bars (13.904 s at 140 BPM)

### Ghosthack - Cinematic Orchestra Volume 2/Ghosthack - Cinematic Orchestra Volume 2/Instrument Loops/Piano _ Organ Loops/Piano Loops - 140bpm — 10 file(s) off the bar
- GH_FS III_Piano Loops_ 10_F#m_140bpm.wav: 8.104 bars (13.893 s at 140 BPM)
- GH_FS III_Piano Loops_ 1_F#maj_140bpm.wav: 8.104 bars (13.893 s at 140 BPM)
- GH_FS III_Piano Loops_ 2_Gm_140bpm.wav: 8.104 bars (13.893 s at 140 BPM)
- GH_FS III_Piano Loops_ 3_Gmaj_140bpm.wav: 8.104 bars (13.893 s at 140 BPM)
- GH_FS III_Piano Loops_ 4_Em_140bpm.wav: 8.104 bars (13.893 s at 140 BPM)
- GH_FS III_Piano Loops_ 5_Dm_140bpm.wav: 8.104 bars (13.893 s at 140 BPM)
- GH_FS III_Piano Loops_ 6_Cm_140bpm.wav: 8.104 bars (13.893 s at 140 BPM)
- GH_FS III_Piano Loops_ 7_Bm_140bpm.wav: 8.104 bars (13.893 s at 140 BPM)
- GH_FS III_Piano Loops_ 8_Dm_140bpm.wav: 8.104 bars (13.893 s at 140 BPM)
- GH_FS III_Piano Loops_ 9_Dm_140bpm.wav: 8.104 bars (13.893 s at 140 BPM)

### Ghosthack - Cinematic Orchestra Volume 2/Ghosthack - Cinematic Orchestra Volume 2/Instrument Loops/Woodwind Loops — 10 file(s) off the bar
- GH_FS III_Woodwind Loops_ 8_Dm_120bpm.wav: 8.024 bars (16.048 s at 120 BPM)
- GH_FS III_Woodwind Loops_ 9_Em_120bpm.wav: 8.024 bars (16.048 s at 120 BPM)
- GH_FS III_Woodwind Loops_ 10_Em_120bpm.wav: 8.024 bars (16.048 s at 120 BPM)
- GH_FS III_Woodwind Loops_ 1_Am_120bpm.wav: 8.024 bars (16.048 s at 120 BPM)
- GH_FS III_Woodwind Loops_ 2_C#m_120bpm.wav: 8.024 bars (16.048 s at 120 BPM)
- GH_FS III_Woodwind Loops_ 3_Ebm_120bpm.wav: 8.024 bars (16.048 s at 120 BPM)
- GH_FS III_Woodwind Loops_ 4_Fm_120bpm.wav: 8.024 bars (16.048 s at 120 BPM)
- GH_FS III_Woodwind Loops_ 5_Am_120bpm.wav: 8.024 bars (16.048 s at 120 BPM)
- GH_FS III_Woodwind Loops_ 6_Em_120bpm.wav: 8.024 bars (16.048 s at 120 BPM)
- GH_FS III_Woodwind Loops_ 7_Dm_120bpm.wav: 8.024 bars (16.048 s at 120 BPM)

### Ghosthack - Hellshot 3 - Argent Metal/Ghosthack - Hellshot 3 - Argent Metal/Bonus Shots/Bass Guitar — 24 file(s) off the bar
- Ghosthack-HS3_Bass Guitar Shot_10_A3.wav: 6.686 bars (6.857 s at 234.0 BPM)
- Ghosthack-HS3_Bass Guitar Shot_11_A#3.wav: 5.894 bars (6.857 s at 206.3 BPM)
- Ghosthack-HS3_Bass Guitar Shot_12_B3.wav: 5.54 bars (6.857 s at 193.9 BPM)
- Ghosthack-HS3_Bass Guitar Shot_13_C4.wav: 4.286 bars (6.857 s at 150.0 BPM)
- Ghosthack-HS3_Bass Guitar Shot_14_C#4.wav: 5.554 bars (6.857 s at 194.4 BPM)
- Ghosthack-HS3_Bass Guitar Shot_15_D4.wav: 4.423 bars (6.857 s at 154.8 BPM)
- Ghosthack-HS3_Bass Guitar Shot_16_D#4.wav: 2.109 bars (6.857 s at 73.8 BPM)
- Ghosthack-HS3_Bass Guitar Shot_17_E4.wav: 5.908 bars (6.857 s at 206.8 BPM)
- Ghosthack-HS3_Bass Guitar Shot_18_F4.wav: 3.814 bars (6.857 s at 133.5 BPM)
- Ghosthack-HS3_Bass Guitar Shot_19_F#4.wav: 2.466 bars (6.857 s at 86.3 BPM)
- Ghosthack-HS3_Bass Guitar Shot_1_C3.wav: 7.034 bars (6.857 s at 246.2 BPM)
- Ghosthack-HS3_Bass Guitar Shot_20_G4.wav: 5.94 bars (6.857 s at 207.9 BPM)
- Ghosthack-HS3_Bass Guitar Shot_21_G#4.wav: 2.506 bars (6.857 s at 87.7 BPM)
- Ghosthack-HS3_Bass Guitar Shot_22_A4.wav: 2.686 bars (6.857 s at 94.0 BPM)
- Ghosthack-HS3_Bass Guitar Shot_23_A#4.wav: 3.166 bars (6.857 s at 110.8 BPM)
- Ghosthack-HS3_Bass Guitar Shot_24_B4.wav: 4.371 bars (6.857 s at 153.0 BPM)
- Ghosthack-HS3_Bass Guitar Shot_2_C#3.wav: 5.914 bars (6.857 s at 207.0 BPM)
- Ghosthack-HS3_Bass Guitar Shot_3_D3.wav: 7.028 bars (6.857 s at 246.0 BPM)
- Ghosthack-HS3_Bass Guitar Shot_4_D#3.wav: 6.72 bars (6.857 s at 235.2 BPM)
- Ghosthack-HS3_Bass Guitar Shot_5_E3.wav: 6.42 bars (6.857 s at 224.7 BPM)
- Ghosthack-HS3_Bass Guitar Shot_6_F3.wav: 6.711 bars (6.857 s at 234.9 BPM)
- Ghosthack-HS3_Bass Guitar Shot_7_F#3.wav: 5.666 bars (6.857 s at 198.3 BPM)
- Ghosthack-HS3_Bass Guitar Shot_8_G3.wav: 7.04 bars (6.857 s at 246.4 BPM)
- Ghosthack-HS3_Bass Guitar Shot_9_G#3.wav: 5.894 bars (6.857 s at 206.3 BPM)

### Ghosthack - Hellshot 3 - Argent Metal/Ghosthack - Hellshot 3 - Argent Metal/Bonus Shots/Guitar — 7 file(s) off the bar
- Ghosthack-HS3_Guitar Shot_Dissonance E.wav: 2.271 bars (2.5 s at 218.0 BPM)
- Ghosthack-HS3_Guitar Shot_Octave Chord G#.wav: 3.608 bars (3.519 s at 246.1 BPM)
- Ghosthack-HS3_Guitar Shot_Open F#.wav: 1.071 bars (2.984 s at 86.1 BPM)
- Ghosthack-HS3_Guitar Shot_Power Chord A.wav: 2.599 bars (2.5 s at 249.5 BPM)
- Ghosthack-HS3_Guitar Shot_Tritone E.wav: 1.791 bars (2.5 s at 171.9 BPM)
- Ghosthack-HS3_Guitar Shot_Bend F#.wav: 3.365 bars (3.651 s at 221.2 BPM)
- Ghosthack-HS3_Guitar Shot_Bend G.wav: 3.46 bars (3.374 s at 246.1 BPM)

### Ghosthack - Mystery Nightfall - Trailer SFX/Ghosthack - Mystery Nightfall - Trailer SFX/Loops/Perc Construction Kits — 24 file(s) off the bar
- Ghosthack-MN_Stem_120_Blind_SFX.wav: 5.78 bars (8.0 s at 173.4 BPM)
- Ghosthack-MN_Stem_120_Infiltrate_SFX.wav: 8.61 bars (8.0 s at 258.3 BPM)
- Ghosthack-MN_Stem_120_Infiltrate_Tom.wav: 7.783 bars (8.0 s at 233.5 BPM)
- Ghosthack-MN_Stem_120_Revolt_SFX.wav: 8.153 bars (8.0 s at 244.6 BPM)
- Ghosthack-MN_Stem_120_Revolt_Toms.wav: 7.947 bars (8.0 s at 238.4 BPM)
- Ghosthack-MN_Stem_120_Tensions_Hats.wav: 2.667 bars (8.0 s at 80.0 BPM)
- Ghosthack-MN_Stem_120_Tensions_Kicks.wav: 2.67 bars (8.0 s at 80.1 BPM)
- Ghosthack-MN_Stem_120_Tensions_Main.wav: 2.67 bars (8.0 s at 80.1 BPM)
- Ghosthack-MN_Stem_120_Tensions_Rims.wav: 8.153 bars (8.0 s at 244.6 BPM)
- Ghosthack-MN_Stem_120_Tensions_SFX.wav: 7.473 bars (8.0 s at 224.2 BPM)
- Ghosthack-MN_Stem_80_Crawl_SFX.wav: 9.73 bars (12.0 s at 194.6 BPM)
- Ghosthack-MN_Stem_80_Counting Down_SFX.wav: 11.29 bars (12.0 s at 225.8 BPM)
- Ghosthack-MN_Stem_80_Crawl_Small Perc_2.wav: 11.96 bars (12.0 s at 239.2 BPM)
- Ghosthack-MN_Stem_80_Crawl_Tom.wav: 10.7 bars (12.0 s at 214.0 BPM)
- Ghosthack-MN_Stem_80_Enrage_Whoosh.wav: 12.615 bars (12.0 s at 252.3 BPM)
- Ghosthack-MN_Stem_80_Voids_Whooshes.wav: 12.23 bars (12.0 s at 244.6 BPM)
- Ghosthack-MN_Stem_90_Case Files_Toms.wav: 10.414 bars (10.667 s at 234.3 BPM)
- Ghosthack-MN_Stem_90_Clockwork_Impact.wav: 10.618 bars (10.667 s at 238.9 BPM)
- Ghosthack-MN_Stem_90_Clockwork_SFX.wav: 9.836 bars (10.667 s at 221.3 BPM)
- Ghosthack-MN_Stem_90_Disturbance_High Perc.wav: 10.414 bars (10.667 s at 234.3 BPM)
- Ghosthack-MN_Stem_90_Disturbance_Low Boom.wav: 9.574 bars (10.667 s at 215.4 BPM)
- Ghosthack-MN_Stem_90_Disturbance_SFX.wav: 10.871 bars (10.667 s at 244.6 BPM)
- Ghosthack-MN_Stem_90_Searching_Rims.wav: 9.134 bars (10.667 s at 205.5 BPM)
- Ghosthack-MN_Stem_90_Case Files_SFX.wav: 10.871 bars (10.667 s at 244.6 BPM)

