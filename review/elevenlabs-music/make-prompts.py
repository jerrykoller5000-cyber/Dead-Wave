# CL-163: the ElevenLabs music batch (run from review/elevenlabs-music: python make-prompts.py). One source of truth for every music slot the game plays:
# writes review/elevenlabs-music/manifest-music.json (the batch tool's input), z-music/PROMPTS-MUSIC.md (to read),
# and z-music/<group>/<track>/_prompt.txt + _now-playing.txt. Style (Jerry): a metal / chiptune hybrid, "Doom 1 brought
# up to the modern age". No artist, band or game names go in a prompt (ElevenLabs rejects them, and we want our own).
import json, os, math, hashlib

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')   # the game folder
TOOL = OUT + '/review/elevenlabs-music'
ZM = OUT + '/z-music'

STYLE = ("an instrumental metal and chiptune hybrid in the style of early-1990s PC shooter soundtracks brought up to "
         "date: drop-tuned palm-muted rhythm guitars and a modern heavy mix, with a bright FM-synthesis lead (the sound "
         "of an old PC sound card) and 8-bit square-wave arpeggios")
NO_VOX = "No vocals."
G_POS = ["instrumental metal and chiptune hybrid", "1990s PC shooter soundtrack, modern production",
         "FM synthesis lead, old sound card tone", "8-bit square-wave arpeggios",
         "drop-tuned palm-muted rhythm guitars", "tight punchy drums, heavy mix"]
G_NEG = ["vocals", "singing", "lyrics", "spoken word", "choir", "orchestral strings", "lo-fi hiss"]

T = []  # every track

def prompt_track(folder, title, seconds, prompt, now, use, loop=False, start=False):
    assert 3 <= seconds <= 600 and len(prompt) <= 1200, folder
    T.append(dict(folder=folder, title=title, mode='prompt', seconds=seconds, loop=loop, start=start,
                  prompt=prompt, nowPlaying=now, usedFor=use))

# ---------- calm (plays between fights; loops) ----------
prompt_track('calm/menu', 'Title theme', 120,
    f"Title-screen theme for a zombie-survival game set in a dark forest ringed by mountains, {STYLE}. 72 BPM, D dorian. "
    "Opens on a lone FM-synth melody over a low drone; a clean guitar answers, then the distorted guitars and drums land "
    "for a big, memorable hook in the middle; it winds back down to the drone so it can loop. Ominous, proud, unhurried. " + NO_VOX,
    'menu_theme (pool "menu")', 'Title screen', loop=True)
prompt_track('calm/day', 'Day prep', 150,
    f"Daytime building-and-scavenging music for a zombie-survival game, {STYLE}, but laid back: clean and lightly "
    "overdriven guitars, a walking bass, soft square-wave arpeggios and a gentle FM lead. 96 BPM, G dorian. Hopeful but "
    "uneasy, never fully relaxed. Mid-tempo groove that stays in the background, steady from start to end so it loops. " + NO_VOX,
    'calm_day (pool "day")', 'Day, between fights', loop=True)
prompt_track('calm/dawn-prep', 'Morning', 120,
    f"Early-morning music after surviving the night, {STYLE}, quiet version: a slow FM-synth melody, chiming "
    "square-wave arpeggios, a clean guitar with long delay, sparse soft drums. 84 BPM, E minor. Tired relief with a "
    "little dread underneath. Even level throughout so it loops. " + NO_VOX,
    'calm_day (pool "dawnprep")', 'Morning, the first hour of the day', loop=True)
prompt_track('calm/dusk', 'Dusk', 120,
    f"Dusk music: the light is going and the horde is coming, {STYLE}. 80 BPM, A phrygian. A low, slow palm-muted chug "
    "under a mournful FM lead, a ticking hi-hat, eerie square-wave pulses, the tension slowly building but never "
    "exploding. Steady level so it loops. " + NO_VOX,
    'night pool ("dusk")', 'Evening, before night falls', loop=True)
prompt_track('calm/night', 'Night prep', 150,
    f"Night-time waiting music between attacks, {STYLE}, dark and restrained: a deep drone, slow heavy guitar swells, "
    "a lonely FM-synth melody and a faint square-wave heartbeat pulse, half-time drums that come and go. 84 BPM, "
    "G minor. Watchful, cold, menacing. Even level throughout so it loops. " + NO_VOX,
    'night pool ("night")', 'Night, between waves', loop=True)
prompt_track('calm/aftermath', 'Aftermath', 90,
    f"Aftermath music right after a wave is beaten, {STYLE}, quiet and slow: ringing guitar feedback fading, a soft "
    "FM-synth chorale melody, slow chiptune arpeggios, no full drums. 70 BPM, C minor. Exhausted, grim relief. "
    "Steady level so it loops. " + NO_VOX,
    'aftermath_hold (pool "aftermath")', 'Just after a wave', loop=True)

# ---------- day fights (a track per horde size; loop) ----------
DAY = [('horde-1', 'Skirmish (1-3 zombies)', 112, 'E minor', 'light and nimble: chugging guitar, bouncy square-wave bass, a playful FM hook, half the band'),
       ('horde-2', 'Skirmish (4-8 zombies)', 120, 'A minor', 'the full band but restrained: tight riff, driving eighth-note bass, the FM lead and chiptune arpeggios trading'),
       ('horde-3', 'Fight (9-15 zombies)', 130, 'D minor', 'a real fight: galloping riff, double-kick bursts, the FM hook doubled by guitar'),
       ('horde-4', 'Big fight (16-25 zombies)', 140, 'C# minor', 'heavy and fast: thrash riff, constant double-kick, screaming FM lead and racing 8-bit arpeggios'),
       ('horde-5', 'Horde (26+ zombies)', 152, 'F# minor', 'all-out: relentless thrash riff, blast-beat bursts, the FM lead and guitar in harmony at full power')]
for slug, title, bpm, key, feel in DAY:
    prompt_track('day-fights/' + slug, title, 120,
        f"Daytime combat music for a zombie-survival game, {STYLE}. {bpm} BPM, {key}. {feel[0].upper() + feel[1:]}. "
        "Starts straight in at full energy (no long intro), keeps the same energy for the whole track and ends where it "
        "began so it loops seamlessly. " + NO_VOX,
        ['chip_skirmish_b', 'chip_skirmish_a', 'chip_fight_1', 'chip_fight_2', 'chip_fight_3'][DAY.index((slug, title, bpm, key, feel))] + ' (dayFight)',
        'Fights in daylight, picked by horde size', loop=True)

# ---------- nights: one song each, in the game's seven sections (CL-42 sections) ----------
SECTIONS = [('Stalk', 'stalk', 8), ('Drop A', 'dropA', 16), ('Riff B', 'riffB', 16), ('Break', 'break', 8),
            ('Drop A2', 'dropA2', 16), ('Bridge', 'bridge', 16), ('Climax', 'climax', 16)]
SEC_TEXT = {
    'stalk':  "tense intro without full drums: a low drone, muted palm-muted chugs, a ticking hi-hat; the FM lead hints at the hook",
    'dropA':  "the band slams in: the main riff on drop-tuned guitars doubled by a square-wave line, {groove} drums, the FM lead states the hook",
    'riffB':  "a second, more syncopated riff; chiptune arpeggios race over the chugs; the guitar and the FM lead call and answer",
    'break':  "a breather, still in tempo: drums drop to toms and ride, bass and a lone square-wave melody, eerie and sparse",
    'dropA2': "the main riff returns heavier: an extra guitar layer, double-kick, the hook an octave higher",
    'bridge': "new chords and a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo",
    'climax': "everything at once: the hook on guitar and FM lead in harmony, full double-kick, ending on one big final hit that rings out",
}
NIGHTS = [
 (1,  'First Blood', 96,  'E minor', 'heavy half-time', 'the first night: dread turning into a fight, a hook to remember'),
 (2,  'Runners', 108, 'A minor (aeolian)', 'd-beat', 'fast zombies sprinting out of the trees, urgent and jittery'),
 (3,  'The Lake Wakes', 104, 'D dorian', 'shuffle', 'drowned dead rising from the lake, murky and rolling'),
 (4,  'Two Fronts', 116, 'F phrygian', 'four-on-the-floor with a gallop riff', 'burning zombies from two sides at once, hot and frantic'),
 (5,  'The First Nest', 112, 'C# harmonic minor', 'breakbeat', 'a nest of crawling things, creepy and skittering'),
 (6,  'Chalk', 92,  'C harmonic minor', 'crushing half-time', 'a towering guardian marches out of the chalk caves, slow and huge'),
 (7,  'Treeline', 114, 'G dorian', 'breakbeat with a shuffle riff', 'the horde pours out of the forest edge, rolling and relentless'),
 (8,  'Fuse', 122, 'E phrygian', 'four-on-the-floor', 'exploding zombies, a ticking fuse feel, sharp stabs'),
 (9,  'Eight Packs', 128, 'B minor (aeolian)', 'd-beat', 'eight packs at once, fast and chaotic'),
 (10, 'Brute Force', 100, 'D harmonic minor', 'half-time with a gallop riff', 'hulking brutes smashing the walls, heavy and stomping'),
 (11, 'Every Cave', 124, 'A dorian', 'breakbeat', 'zombies from every cave mouth, echoing and restless'),
 (12, 'Red Guardian', 104, 'F# phrygian', 'half-time with a gallop riff', 'a burning guardian, molten and menacing'),
 (13, 'Artillery', 120, 'G minor (aeolian)', 'military march snare', 'mortar shells falling, a war march'),
 (14, 'Fog Night', 112, 'D minor', 'half-time that opens into a gallop', 'thick fog, shapes you only hear, cold and ghostly'),
 (15, 'Brood', 132, 'A# harmonic minor', 'breakbeat with a blast-beat bridge', 'spiders and their brood, fast, crawling, venomous'),
 (16, 'Demon Night', 136, 'F phrygian', 'four-on-the-floor with a gallop riff', 'a demon leads the fire horde, infernal and furious'),
 (17, 'Swarm', 148, 'C# minor (aeolian)', 'blast beat', 'a swarm too big to count, overwhelming speed'),
 (18, 'The Siege', 110, 'G harmonic minor', 'gallop', 'the guardian lays siege to the base, epic and grinding'),
 (19, 'The Gauntlet', 144, 'F# minor (aeolian)', 'd-beat', 'every type of zombie in a row, a gauntlet run'),
 (20, 'Last Stand', 152, 'E minor (aeolian)', 'four-on-the-floor with a d-beat riff', 'the final night, heroic and desperate, the biggest song of all'),
]
NOW_NIGHT = {1: 'fight_day01_sections', 14: 'fight_fognight_sections (specials.fog)'}
def plan_track(folder, title, bpm, key, groove, story, now, use, start=False, sec_override=None):
    bar = 240.0 / bpm
    chunks = []
    for i, (label, name, bars) in enumerate(SECTIONS):
        ms = int(round(bars * bar * 1000))
        text = SEC_TEXT[name].format(groove=groove)
        if sec_override and name in sec_override: text = sec_override[name]
        # the first chunk carries the full style (~7 styles, as the API guide suggests), the rest a shorter one plus the night's mood
        pos = G_POS + [f"{bpm} BPM, {key}", story] if i == 0 else G_POS[:4] + [f"{bpm} BPM, {key}", story.split(',')[0]]
        chunks.append(dict(text=f"[{label}] {{{text}}}", duration_ms=ms, positive_styles=pos,
                           negative_styles=list(G_NEG)))
        assert 3000 <= ms <= 120000 and len(chunks[-1]['text']) <= 200, (folder, name, len(chunks[-1]['text']))
    secs = sum(c['duration_ms'] for c in chunks) / 1000
    T.append(dict(folder=folder, title=title, mode='plan', seconds=round(secs, 2), loop=False, start=start,
                  bpm=bpm, key=key, groove=groove, story=story,
                  sections=[dict(name=n, bars=b, ms=c['duration_ms']) for (l, n, b), c in zip(SECTIONS, chunks)],
                  plan=dict(chunks=chunks), nowPlaying=now, usedFor=use))

def slug(s): return ''.join(c if c.isalnum() else '-' for c in s.lower()).strip('-').replace('--', '-')
for n, title, bpm, key, groove, story in NIGHTS:
    over = None
    if n == 15: over = {'bridge': "new chords over a blast beat; a shredding guitar solo traded bar for bar with a fast 8-bit arpeggio solo"}
    if n == 20: over = {'climax': "the biggest moment of the game: the hook on guitar and FM lead in harmony, full double-kick, a triumphant last chord that rings out"}
    plan_track(f'nights/night-{n:02d}-{slug(title)}', f'Night {n}: {title}', bpm, key, groove, story,
               NOW_NIGHT.get(n, f'fight_night{n:02d}_sections'), f'The wave on night {n}' + (' (the fog night)' if n == 14 else ''),
               start=(n == 20))
plan_track('specials/heart-guardian-finale', "The heart: the guardian's last fight", 92, 'C minor',
           'crushing half-time that doubles up in the climax', "the guardian's final fight deep in its lair, colossal and dreadful",
           'fight_heart_sections', "The guardian's last fight in the heart (plays by phase)")

# ---------- endings (play once) ----------
prompt_track('endings/game-over', 'Game over', 60,
    f"Game-over music, {STYLE}, slow and mournful: 66 BPM, A minor. A single heavy guitar chord left to feed back, a sad "
    "FM-synth melody, slow square-wave arpeggios dying away, one last drum hit, then silence. Plays once, does not loop. " + NO_VOX,
    'end_fallen (pool "fallen")', 'You died')
prompt_track('endings/victory', 'Victory', 90,
    f"Victory music for surviving the final night, {STYLE}: triumphant and huge, 120 BPM, G major then E minor. A heroic "
    "riff, the FM lead and guitar playing a soaring melody in harmony, bright chiptune arpeggios, big drums, building to "
    "a final held chord. Plays once, does not loop. " + NO_VOX,
    'end_dawn (pool "dawn")', 'You won')

# ---------- stings (short; play once over everything) ----------
STINGS = [
 ('wave-alarm', 'alarm', 'sting_alarm', 6, "the horde is coming: a blaring FM-synth alarm figure over a heavy drop-tuned guitar chord stab and a crash, ends ringing", True),
 ('wave-cleared', 'clear', 'sting_clear', 5, "the wave is beaten: a victorious guitar and FM-synth flourish rising to a bright final chord", False),
 ('dawn', 'dawn', 'sting_dawn', 6, "the sun comes up after a night: a hopeful major-key FM-synth phrase with chiming square-wave arpeggios and a soft guitar chord", False),
 ('night-falls', 'night_falls', 'sting_night_falls', 7, "night falls: a low, ominous guitar swell, a falling FM-synth line and one deep drum hit", False),
 ('ember-night', 'ember', 'sting_ember', 6, "a fire horde is coming: a fast, hot guitar riff burst with a rising square-wave run and a crash", False),
 ('guardian-night', 'guardian', 'sting_guardian', 6, "a giant boss approaches: two crushing slow guitar chords and a menacing low FM-synth growl", False),
 ('camp-cleared', 'camp', 'sting_camp', 4, "a zombie camp is cleared: a short punchy guitar and chiptune fanfare", False),
 ('achievement', 'achievement', 'cue_achievement', 4, "an achievement unlocked: a bright, catchy 8-bit jingle topped with one heavy guitar chord", False),
 ('airdrop', 'airdrop', 'cue_airdrop', 4, "a supply airdrop is incoming: a quick ascending FM-synth signal over a palm-muted chug", False),
 ('objective', 'objective', 'cue_objective', 3, "an objective is done: a short, satisfying square-wave arpeggio and a guitar stab", False),
 ('poi-cleared', 'poi_cleared', 'cue_poi_cleared', 4, "a place is cleared: a short triumphant chiptune phrase with a power chord", False),
]
for slugs, cue, now, sec, what, start in STINGS:
    prompt_track('stings/' + slugs, slugs.replace('-', ' ').capitalize(), sec,
        f"A {sec}-second instrumental music sting for a game, metal and chiptune hybrid (early-1990s PC game soundtrack "
        f"sound with modern production): {what}. Starts instantly, no build-up. " + NO_VOX,
        f'{now} (stings.{cue})', 'A short cue: ' + what.split(':')[0], start=start)

# ---------- manifest ----------
for i, t in enumerate(T, 1): t['n'] = i
CREDITS_PER_MIN = 1000  # estimate (CL-163 research: ~670-900/min); actual charges are shown by ElevenLabs
manifest = dict(schema='grave-shift-elevenlabs-music-v1', source='CL-163 gen.py', model='music_v2_5',
                outputFormat='mp3_44100_192', creditsPerMinute=CREDITS_PER_MIN, variants=4, tracks=T)
src = json.dumps(manifest, sort_keys=True)
manifest['sourceSha256'] = hashlib.sha256(src.encode()).hexdigest()
os.makedirs(TOOL, exist_ok=True)
json.dump(manifest, open(TOOL + '/manifest-music.json', 'w'), indent=2)

# ---------- z-music tree ----------
GROUPS = {'calm': 'Calm music (between fights; loops)', 'day-fights': 'Day fights (picked by horde size; loop)',
          'nights': 'Nights (one song per night, in the game\'s seven sections)', 'specials': 'Special fights',
          'endings': 'Endings (play once)', 'stings': 'Stings and cues (a few seconds; play once)'}
md = ["# Music prompts (CL-163)", "",
      "Every music slot the game plays, as one ElevenLabs Music prompt each. Style: an instrumental metal / chiptune hybrid "
      "(early-1990s PC shooter soundtracks brought up to date). The batch tool (`review/elevenlabs-music`) sends these and "
      "saves each take into its folder here. Night songs are sent as a composition plan: seven sections whose lengths are "
      "whole bars at the song's tempo, matching the game's section director (stalk, drop A, riff B, break, drop A2, bridge, climax).", "",
      f"{len(T)} tracks, {sum(t['seconds'] for t in T)/60:.1f} minutes per full take. Estimated ~{CREDITS_PER_MIN} credits a minute.", ""]
for g, gname in GROUPS.items():
    md += [f"## {gname}", ""]
    for t in [x for x in T if x['folder'].startswith(g + '/')]:
        mm, ss = divmod(round(t['seconds']), 60)
        md.append(f"**{t['n']}. `{t['folder']}`** · {t['title']} · {mm}:{ss:02d}" + (' · LOOP' if t['loop'] else '') + (' · ★ test' if t['start'] else ''))
        md.append(f"Used for: {t['usedFor']}. Replaces: {t['nowPlaying']}.")
        if t['mode'] == 'prompt':
            md += ["```", t['prompt'], "```", ""]
        else:
            md.append(f"{t['bpm']} BPM, {t['key']}, {t['groove']}; {t['story']}.")
            md.append("```")
            for c in t['plan']['chunks']: md.append(f"{c['text']}  ({c['duration_ms']/1000:.1f} s)")
            md += ["```", ""]
        d = f"{ZM}/{t['folder']}"; os.makedirs(d, exist_ok=True)
        if t['mode'] == 'prompt': p = t['prompt']
        else: p = (f"{t['title']} - {t['bpm']} BPM, {t['key']}, {t['groove']}. {t['story']}.\n\nSent as a composition plan "
                   "(instrumental, styles: " + ', '.join(G_POS) + "):\n" +
                   '\n'.join(f"{c['text']}  ({c['duration_ms']/1000:.1f} s)" for c in t['plan']['chunks']))
        open(d + '/_prompt.txt', 'w', newline='').write((p + '\n').replace('\n', '\r\n'))
        open(d + '/_now-playing.txt', 'w', newline='').write(
            (f"{t['title']}\nUsed for: {t['usedFor']}\nThe game plays now: assets/soundtrack/{t['nowPlaying']}\n").replace('\n', '\r\n'))
open(ZM + '/PROMPTS-MUSIC.md', 'w').write('\n'.join(md) + '\n')
tot = sum(t['seconds'] for t in T) / 60
print(len(T), 'tracks', round(tot, 1), 'min per take ~', round(tot * CREDITS_PER_MIN), 'credits;',
      'nights', round(sum(t['seconds'] for t in T if t['mode'] == 'plan') / 60, 1), 'min')
for t in T:
    if t['mode'] == 'plan': print(t['folder'], t['seconds'])
