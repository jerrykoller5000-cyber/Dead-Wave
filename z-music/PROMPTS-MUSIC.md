# Music prompts (CL-163)

Every music slot the game plays, as one ElevenLabs Music prompt each. Style: an instrumental metal / chiptune hybrid (early-1990s PC shooter soundtracks brought up to date). The batch tool (`review/elevenlabs-music`) sends these and saves each take into its folder here. Night songs are sent as a composition plan: seven sections whose lengths are whole bars at the song's tempo, matching the game's section director (stalk, drop A, riff B, break, drop A2, bridge, climax).

45 tracks, 96.0 minutes per full take. Estimated ~1000 credits a minute.

## Calm music (between fights; loops)

**1. `calm/menu`** · Title theme · 2:00 · LOOP
Used for: Title screen. Replaces: menu_theme (pool "menu").
```
Title-screen theme for a zombie-survival game set in a dark forest ringed by mountains, an instrumental metal and chiptune hybrid in the style of early-1990s PC shooter soundtracks brought up to date: drop-tuned palm-muted rhythm guitars and a modern heavy mix, with a bright FM-synthesis lead (the sound of an old PC sound card) and 8-bit square-wave arpeggios. 72 BPM, D dorian. Opens on a lone FM-synth melody over a low drone; a clean guitar answers, then the distorted guitars and drums land for a big, memorable hook in the middle; it winds back down to the drone so it can loop. Ominous, proud, unhurried. No vocals.
```

**2. `calm/day`** · Day prep · 2:30 · LOOP
Used for: Day, between fights. Replaces: calm_day (pool "day").
```
Daytime building-and-scavenging music for a zombie-survival game, an instrumental metal and chiptune hybrid in the style of early-1990s PC shooter soundtracks brought up to date: drop-tuned palm-muted rhythm guitars and a modern heavy mix, with a bright FM-synthesis lead (the sound of an old PC sound card) and 8-bit square-wave arpeggios, but laid back: clean and lightly overdriven guitars, a walking bass, soft square-wave arpeggios and a gentle FM lead. 96 BPM, G dorian. Hopeful but uneasy, never fully relaxed. Mid-tempo groove that stays in the background, steady from start to end so it loops. No vocals.
```

**3. `calm/dawn-prep`** · Morning · 2:00 · LOOP
Used for: Morning, the first hour of the day. Replaces: calm_day (pool "dawnprep").
```
Early-morning music after surviving the night, an instrumental metal and chiptune hybrid in the style of early-1990s PC shooter soundtracks brought up to date: drop-tuned palm-muted rhythm guitars and a modern heavy mix, with a bright FM-synthesis lead (the sound of an old PC sound card) and 8-bit square-wave arpeggios, quiet version: a slow FM-synth melody, chiming square-wave arpeggios, a clean guitar with long delay, sparse soft drums. 84 BPM, E minor. Tired relief with a little dread underneath. Even level throughout so it loops. No vocals.
```

**4. `calm/dusk`** · Dusk · 2:00 · LOOP
Used for: Evening, before night falls. Replaces: night pool ("dusk").
```
Dusk music: the light is going and the horde is coming, an instrumental metal and chiptune hybrid in the style of early-1990s PC shooter soundtracks brought up to date: drop-tuned palm-muted rhythm guitars and a modern heavy mix, with a bright FM-synthesis lead (the sound of an old PC sound card) and 8-bit square-wave arpeggios. 80 BPM, A phrygian. A low, slow palm-muted chug under a mournful FM lead, a ticking hi-hat, eerie square-wave pulses, the tension slowly building but never exploding. Steady level so it loops. No vocals.
```

**5. `calm/night`** · Night prep · 2:30 · LOOP
Used for: Night, between waves. Replaces: night pool ("night").
```
Night-time waiting music between attacks, an instrumental metal and chiptune hybrid in the style of early-1990s PC shooter soundtracks brought up to date: drop-tuned palm-muted rhythm guitars and a modern heavy mix, with a bright FM-synthesis lead (the sound of an old PC sound card) and 8-bit square-wave arpeggios, dark and restrained: a deep drone, slow heavy guitar swells, a lonely FM-synth melody and a faint square-wave heartbeat pulse, half-time drums that come and go. 84 BPM, G minor. Watchful, cold, menacing. Even level throughout so it loops. No vocals.
```

**6. `calm/aftermath`** · Aftermath · 1:30 · LOOP
Used for: Just after a wave. Replaces: aftermath_hold (pool "aftermath").
```
Aftermath music right after a wave is beaten, an instrumental metal and chiptune hybrid in the style of early-1990s PC shooter soundtracks brought up to date: drop-tuned palm-muted rhythm guitars and a modern heavy mix, with a bright FM-synthesis lead (the sound of an old PC sound card) and 8-bit square-wave arpeggios, quiet and slow: ringing guitar feedback fading, a soft FM-synth chorale melody, slow chiptune arpeggios, no full drums. 70 BPM, C minor. Exhausted, grim relief. Steady level so it loops. No vocals.
```

## Day fights (picked by horde size; loop)

**7. `day-fights/horde-1`** · Skirmish (1-3 zombies) · 2:00 · LOOP
Used for: Fights in daylight, picked by horde size. Replaces: chip_skirmish_b (dayFight).
```
Daytime combat music for a zombie-survival game, an instrumental metal and chiptune hybrid in the style of early-1990s PC shooter soundtracks brought up to date: drop-tuned palm-muted rhythm guitars and a modern heavy mix, with a bright FM-synthesis lead (the sound of an old PC sound card) and 8-bit square-wave arpeggios. 112 BPM, E minor. Light and nimble: chugging guitar, bouncy square-wave bass, a playful FM hook, half the band. Starts straight in at full energy (no long intro), keeps the same energy for the whole track and ends where it began so it loops seamlessly. No vocals.
```

**8. `day-fights/horde-2`** · Skirmish (4-8 zombies) · 2:00 · LOOP
Used for: Fights in daylight, picked by horde size. Replaces: chip_skirmish_a (dayFight).
```
Daytime combat music for a zombie-survival game, an instrumental metal and chiptune hybrid in the style of early-1990s PC shooter soundtracks brought up to date: drop-tuned palm-muted rhythm guitars and a modern heavy mix, with a bright FM-synthesis lead (the sound of an old PC sound card) and 8-bit square-wave arpeggios. 120 BPM, A minor. The full band but restrained: tight riff, driving eighth-note bass, the FM lead and chiptune arpeggios trading. Starts straight in at full energy (no long intro), keeps the same energy for the whole track and ends where it began so it loops seamlessly. No vocals.
```

**9. `day-fights/horde-3`** · Fight (9-15 zombies) · 2:00 · LOOP
Used for: Fights in daylight, picked by horde size. Replaces: chip_fight_1 (dayFight).
```
Daytime combat music for a zombie-survival game, an instrumental metal and chiptune hybrid in the style of early-1990s PC shooter soundtracks brought up to date: drop-tuned palm-muted rhythm guitars and a modern heavy mix, with a bright FM-synthesis lead (the sound of an old PC sound card) and 8-bit square-wave arpeggios. 130 BPM, D minor. A real fight: galloping riff, double-kick bursts, the FM hook doubled by guitar. Starts straight in at full energy (no long intro), keeps the same energy for the whole track and ends where it began so it loops seamlessly. No vocals.
```

**10. `day-fights/horde-4`** · Big fight (16-25 zombies) · 2:00 · LOOP
Used for: Fights in daylight, picked by horde size. Replaces: chip_fight_2 (dayFight).
```
Daytime combat music for a zombie-survival game, an instrumental metal and chiptune hybrid in the style of early-1990s PC shooter soundtracks brought up to date: drop-tuned palm-muted rhythm guitars and a modern heavy mix, with a bright FM-synthesis lead (the sound of an old PC sound card) and 8-bit square-wave arpeggios. 140 BPM, C# minor. Heavy and fast: thrash riff, constant double-kick, screaming FM lead and racing 8-bit arpeggios. Starts straight in at full energy (no long intro), keeps the same energy for the whole track and ends where it began so it loops seamlessly. No vocals.
```

**11. `day-fights/horde-5`** · Horde (26+ zombies) · 2:00 · LOOP
Used for: Fights in daylight, picked by horde size. Replaces: chip_fight_3 (dayFight).
```
Daytime combat music for a zombie-survival game, an instrumental metal and chiptune hybrid in the style of early-1990s PC shooter soundtracks brought up to date: drop-tuned palm-muted rhythm guitars and a modern heavy mix, with a bright FM-synthesis lead (the sound of an old PC sound card) and 8-bit square-wave arpeggios. 152 BPM, F# minor. All-out: relentless thrash riff, blast-beat bursts, the FM lead and guitar in harmony at full power. Starts straight in at full energy (no long intro), keeps the same energy for the whole track and ends where it began so it loops seamlessly. No vocals.
```

## Nights (one song per night, in the game's seven sections)

**12. `nights/night-01-first-blood`** · Night 1: First Blood · 4:00
Used for: The wave on night 1. Replaces: fight_day01_sections.
96 BPM, E minor, heavy half-time; the first night: dread turning into a fight, a hook to remember.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (20.0 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, heavy half-time drums, the FM lead states the hook}  (40.0 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (40.0 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (20.0 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (40.0 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (40.0 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (40.0 s)
```

**13. `nights/night-02-runners`** · Night 2: Runners · 3:33
Used for: The wave on night 2. Replaces: fight_night02_sections.
108 BPM, A minor (aeolian), d-beat; fast zombies sprinting out of the trees, urgent and jittery.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (17.8 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, d-beat drums, the FM lead states the hook}  (35.6 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (35.6 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (17.8 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (35.6 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (35.6 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (35.6 s)
```

**14. `nights/night-03-the-lake-wakes`** · Night 3: The Lake Wakes · 3:42
Used for: The wave on night 3. Replaces: fight_night03_sections.
104 BPM, D dorian, shuffle; drowned dead rising from the lake, murky and rolling.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (18.5 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, shuffle drums, the FM lead states the hook}  (36.9 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (36.9 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (18.5 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (36.9 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (36.9 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (36.9 s)
```

**15. `nights/night-04-two-fronts`** · Night 4: Two Fronts · 3:19
Used for: The wave on night 4. Replaces: fight_night04_sections.
116 BPM, F phrygian, four-on-the-floor with a gallop riff; burning zombies from two sides at once, hot and frantic.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (16.6 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, four-on-the-floor with a gallop riff drums, the FM lead states the hook}  (33.1 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (33.1 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (16.6 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (33.1 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (33.1 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (33.1 s)
```

**16. `nights/night-05-the-first-nest`** · Night 5: The First Nest · 3:26
Used for: The wave on night 5. Replaces: fight_night05_sections.
112 BPM, C# harmonic minor, breakbeat; a nest of crawling things, creepy and skittering.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (17.1 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, breakbeat drums, the FM lead states the hook}  (34.3 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (34.3 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (17.1 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (34.3 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (34.3 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (34.3 s)
```

**17. `nights/night-06-chalk`** · Night 6: Chalk · 4:10
Used for: The wave on night 6. Replaces: fight_night06_sections.
92 BPM, C harmonic minor, crushing half-time; a towering guardian marches out of the chalk caves, slow and huge.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (20.9 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, crushing half-time drums, the FM lead states the hook}  (41.7 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (41.7 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (20.9 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (41.7 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (41.7 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (41.7 s)
```

**18. `nights/night-07-treeline`** · Night 7: Treeline · 3:22
Used for: The wave on night 7. Replaces: fight_night07_sections.
114 BPM, G dorian, breakbeat with a shuffle riff; the horde pours out of the forest edge, rolling and relentless.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (16.8 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, breakbeat with a shuffle riff drums, the FM lead states the hook}  (33.7 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (33.7 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (16.8 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (33.7 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (33.7 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (33.7 s)
```

**19. `nights/night-08-fuse`** · Night 8: Fuse · 3:09
Used for: The wave on night 8. Replaces: fight_night08_sections.
122 BPM, E phrygian, four-on-the-floor; exploding zombies, a ticking fuse feel, sharp stabs.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (15.7 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, four-on-the-floor drums, the FM lead states the hook}  (31.5 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (31.5 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (15.7 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (31.5 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (31.5 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (31.5 s)
```

**20. `nights/night-09-eight-packs`** · Night 9: Eight Packs · 3:00
Used for: The wave on night 9. Replaces: fight_night09_sections.
128 BPM, B minor (aeolian), d-beat; eight packs at once, fast and chaotic.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (15.0 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, d-beat drums, the FM lead states the hook}  (30.0 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (30.0 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (15.0 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (30.0 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (30.0 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (30.0 s)
```

**21. `nights/night-10-brute-force`** · Night 10: Brute Force · 3:50
Used for: The wave on night 10. Replaces: fight_night10_sections.
100 BPM, D harmonic minor, half-time with a gallop riff; hulking brutes smashing the walls, heavy and stomping.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (19.2 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, half-time with a gallop riff drums, the FM lead states the hook}  (38.4 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (38.4 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (19.2 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (38.4 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (38.4 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (38.4 s)
```

**22. `nights/night-11-every-cave`** · Night 11: Every Cave · 3:06
Used for: The wave on night 11. Replaces: fight_night11_sections.
124 BPM, A dorian, breakbeat; zombies from every cave mouth, echoing and restless.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (15.5 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, breakbeat drums, the FM lead states the hook}  (31.0 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (31.0 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (15.5 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (31.0 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (31.0 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (31.0 s)
```

**23. `nights/night-12-red-guardian`** · Night 12: Red Guardian · 3:42
Used for: The wave on night 12. Replaces: fight_night12_sections.
104 BPM, F# phrygian, half-time with a gallop riff; a burning guardian, molten and menacing.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (18.5 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, half-time with a gallop riff drums, the FM lead states the hook}  (36.9 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (36.9 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (18.5 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (36.9 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (36.9 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (36.9 s)
```

**24. `nights/night-13-artillery`** · Night 13: Artillery · 3:12
Used for: The wave on night 13. Replaces: fight_night13_sections.
120 BPM, G minor (aeolian), military march snare; mortar shells falling, a war march.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (16.0 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, military march snare drums, the FM lead states the hook}  (32.0 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (32.0 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (16.0 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (32.0 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (32.0 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (32.0 s)
```

**25. `nights/night-14-fog-night`** · Night 14: Fog Night · 3:26
Used for: The wave on night 14 (the fog night). Replaces: fight_fognight_sections (specials.fog).
112 BPM, D minor, half-time that opens into a gallop; thick fog, shapes you only hear, cold and ghostly.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (17.1 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, half-time that opens into a gallop drums, the FM lead states the hook}  (34.3 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (34.3 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (17.1 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (34.3 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (34.3 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (34.3 s)
```

**26. `nights/night-15-brood`** · Night 15: Brood · 2:55
Used for: The wave on night 15. Replaces: fight_night15_sections.
132 BPM, A# harmonic minor, breakbeat with a blast-beat bridge; spiders and their brood, fast, crawling, venomous.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (14.5 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, breakbeat with a blast-beat bridge drums, the FM lead states the hook}  (29.1 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (29.1 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (14.5 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (29.1 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (29.1 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (29.1 s)
```

**27. `nights/night-16-demon-night`** · Night 16: Demon Night · 2:49
Used for: The wave on night 16. Replaces: fight_night16_sections.
136 BPM, F phrygian, four-on-the-floor with a gallop riff; a demon leads the fire horde, infernal and furious.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (14.1 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, four-on-the-floor with a gallop riff drums, the FM lead states the hook}  (28.2 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (28.2 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (14.1 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (28.2 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (28.2 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (28.2 s)
```

**28. `nights/night-17-swarm`** · Night 17: Swarm · 2:36
Used for: The wave on night 17. Replaces: fight_night17_sections.
148 BPM, C# minor (aeolian), blast beat; a swarm too big to count, overwhelming speed.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (13.0 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, blast beat drums, the FM lead states the hook}  (25.9 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (25.9 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (13.0 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (25.9 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (25.9 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (25.9 s)
```

**29. `nights/night-18-the-siege`** · Night 18: The Siege · 3:29
Used for: The wave on night 18. Replaces: fight_night18_sections.
110 BPM, G harmonic minor, gallop; the guardian lays siege to the base, epic and grinding.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (17.5 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, gallop drums, the FM lead states the hook}  (34.9 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (34.9 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (17.5 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (34.9 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (34.9 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (34.9 s)
```

**30. `nights/night-19-the-gauntlet`** · Night 19: The Gauntlet · 2:40
Used for: The wave on night 19. Replaces: fight_night19_sections.
144 BPM, F# minor (aeolian), d-beat; every type of zombie in a row, a gauntlet run.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (13.3 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, d-beat drums, the FM lead states the hook}  (26.7 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (26.7 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (13.3 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (26.7 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (26.7 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (26.7 s)
```

**31. `nights/night-20-last-stand`** · Night 20: Last Stand · 2:32 · ★ test
Used for: The wave on night 20. Replaces: fight_night20_sections.
152 BPM, E minor (aeolian), four-on-the-floor with a d-beat riff; the final night, heroic and desperate, the biggest song of all.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (12.6 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, four-on-the-floor with a d-beat riff drums, the FM lead states the hook}  (25.3 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (25.3 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (12.6 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (25.3 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (25.3 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (25.3 s)
```

## Special fights

**32. `specials/heart-guardian-finale`** · The heart: the guardian's last fight · 4:10
Used for: The guardian's last fight in the heart (plays by phase). Replaces: fight_heart_sections.
92 BPM, C minor, crushing half-time that doubles up in the climax; the guardian's final fight deep in its lair, colossal and dreadful.
```
[Stalk] {tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook}  (20.9 s)
[Drop A] {the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, crushing half-time that doubles up in the climax drums, the FM lead states the hook}  (41.7 s)
[Riff B] {a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer}  (41.7 s)
[Break] {a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse}  (20.9 s)
[Drop A2] {the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher}  (41.7 s)
[Bridge] {new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo}  (41.7 s)
[Climax] {everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out}  (41.7 s)
```

## Endings (play once)

**33. `endings/game-over`** · Game over · 1:00
Used for: You died. Replaces: end_fallen (pool "fallen").
```
Game-over music, an instrumental metal and chiptune hybrid in the style of early-1990s PC shooter soundtracks brought up to date: drop-tuned palm-muted rhythm guitars and a modern heavy mix, with a bright FM-synthesis lead (the sound of an old PC sound card) and 8-bit square-wave arpeggios, slow and mournful: 66 BPM, A minor. A single heavy guitar chord left to feed back, a sad FM-synth melody, slow square-wave arpeggios dying away, one last drum hit, then silence. Plays once, does not loop. No vocals.
```

**34. `endings/victory`** · Victory · 1:30
Used for: You won. Replaces: end_dawn (pool "dawn").
```
Victory music for surviving the final night, an instrumental metal and chiptune hybrid in the style of early-1990s PC shooter soundtracks brought up to date: drop-tuned palm-muted rhythm guitars and a modern heavy mix, with a bright FM-synthesis lead (the sound of an old PC sound card) and 8-bit square-wave arpeggios: triumphant and huge, 120 BPM, G major then E minor. A heroic riff, the FM lead and guitar playing a soaring melody in harmony, bright chiptune arpeggios, big drums, building to a final held chord. Plays once, does not loop. No vocals.
```

## Stings and cues (a few seconds; play once)

**35. `stings/wave-alarm`** · Wave alarm · 0:06 · ★ test
Used for: A short cue: the horde is coming. Replaces: sting_alarm (stings.alarm).
```
A 6-second instrumental music sting for a game, metal and chiptune hybrid (early-1990s PC game soundtrack sound with modern production): the horde is coming: a blaring FM-synth alarm figure over a heavy drop-tuned guitar chord stab and a crash, ends ringing. Starts instantly, no build-up. No vocals.
```

**36. `stings/wave-cleared`** · Wave cleared · 0:05
Used for: A short cue: the wave is beaten. Replaces: sting_clear (stings.clear).
```
A 5-second instrumental music sting for a game, metal and chiptune hybrid (early-1990s PC game soundtrack sound with modern production): the wave is beaten: a victorious guitar and FM-synth flourish rising to a bright final chord. Starts instantly, no build-up. No vocals.
```

**37. `stings/dawn`** · Dawn · 0:06
Used for: A short cue: the sun comes up after a night. Replaces: sting_dawn (stings.dawn).
```
A 6-second instrumental music sting for a game, metal and chiptune hybrid (early-1990s PC game soundtrack sound with modern production): the sun comes up after a night: a hopeful major-key FM-synth phrase with chiming square-wave arpeggios and a soft guitar chord. Starts instantly, no build-up. No vocals.
```

**38. `stings/night-falls`** · Night falls · 0:07
Used for: A short cue: night falls. Replaces: sting_night_falls (stings.night_falls).
```
A 7-second instrumental music sting for a game, metal and chiptune hybrid (early-1990s PC game soundtrack sound with modern production): night falls: a low, ominous guitar swell, a falling FM-synth line and one deep drum hit. Starts instantly, no build-up. No vocals.
```

**39. `stings/ember-night`** · Ember night · 0:06
Used for: A short cue: a fire horde is coming. Replaces: sting_ember (stings.ember).
```
A 6-second instrumental music sting for a game, metal and chiptune hybrid (early-1990s PC game soundtrack sound with modern production): a fire horde is coming: a fast, hot guitar riff burst with a rising square-wave run and a crash. Starts instantly, no build-up. No vocals.
```

**40. `stings/guardian-night`** · Guardian night · 0:06
Used for: A short cue: a giant boss approaches. Replaces: sting_guardian (stings.guardian).
```
A 6-second instrumental music sting for a game, metal and chiptune hybrid (early-1990s PC game soundtrack sound with modern production): a giant boss approaches: two crushing slow guitar chords and a menacing low FM-synth growl. Starts instantly, no build-up. No vocals.
```

**41. `stings/camp-cleared`** · Camp cleared · 0:04
Used for: A short cue: a zombie camp is cleared. Replaces: sting_camp (stings.camp).
```
A 4-second instrumental music sting for a game, metal and chiptune hybrid (early-1990s PC game soundtrack sound with modern production): a zombie camp is cleared: a short punchy guitar and chiptune fanfare. Starts instantly, no build-up. No vocals.
```

**42. `stings/achievement`** · Achievement · 0:04
Used for: A short cue: an achievement unlocked. Replaces: cue_achievement (stings.achievement).
```
A 4-second instrumental music sting for a game, metal and chiptune hybrid (early-1990s PC game soundtrack sound with modern production): an achievement unlocked: a bright, catchy 8-bit jingle topped with one heavy guitar chord. Starts instantly, no build-up. No vocals.
```

**43. `stings/airdrop`** · Airdrop · 0:04
Used for: A short cue: a supply airdrop is incoming. Replaces: cue_airdrop (stings.airdrop).
```
A 4-second instrumental music sting for a game, metal and chiptune hybrid (early-1990s PC game soundtrack sound with modern production): a supply airdrop is incoming: a quick ascending FM-synth signal over a palm-muted chug. Starts instantly, no build-up. No vocals.
```

**44. `stings/objective`** · Objective · 0:03
Used for: A short cue: an objective is done. Replaces: cue_objective (stings.objective).
```
A 3-second instrumental music sting for a game, metal and chiptune hybrid (early-1990s PC game soundtrack sound with modern production): an objective is done: a short, satisfying square-wave arpeggio and a guitar stab. Starts instantly, no build-up. No vocals.
```

**45. `stings/poi-cleared`** · Poi cleared · 0:04
Used for: A short cue: a place is cleared. Replaces: cue_poi_cleared (stings.poi_cleared).
```
A 4-second instrumental music sting for a game, metal and chiptune hybrid (early-1990s PC game soundtrack sound with modern production): a place is cleared: a short triumphant chiptune phrase with a power chord. Starts instantly, no build-up. No vocals.
```

