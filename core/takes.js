import { isZombieDeathTake, scheduleDeathCryFade } from '../ui/zombie-death-envelope.js';
// core/takes.js — CL-148: Jerry's recorded zombie sounds (ElevenLabs takes) in z-sounds/.
//
// Drop the takes for a sound into its folder under z-sounds/ (the folders and their prompts: z-sounds/PROMPTS.md) and
// the game plays them in place of its own synthesized sound; a folder with no takes keeps the synthesized one. File
// names don't matter. Jerry's own layout from Z-Sounds\01 - Current Voices (Bomber\Hit Reaction, Cave Guardian\Idle,
// Leaper\Movement, Colossus\Footstep ...) is understood too, so that whole folder can be copied in as it is.
//
// Where the list of files comes from: the game's local servers answer /__zsounds (tools/serve.py, tools/serve.mjs);
// a packaged copy can carry z-sounds/index.json instead (node tools/zsounds-index.mjs writes it). Optional per-folder
// loudness: z-sounds/levels.json, e.g. { "zombies": 1, "footsteps/shuffle": 0.7 } (the longest matching prefix wins).
//
// The pure parts (the folder list, reading a path, levels) are tested in core/takes.test.mjs; the bank plays through
// whatever context and output core/audio.js hands it.

import { TAKE_LEVELS, BEDS } from './take-levels.js';   // CL-161: where each folder's own sound measured, so a recording comes in at its level

const VOICE_STATES = ['idle', 'chase', 'attack', 'hurt', 'death'];
const TYPES = ['shambler', 'feral', 'leaper', 'spider', 'drowned', 'military', 'brute', 'spitter', 'screamer', 'bomber',
  'demon', 'colossus', 'guardian', 'caveguard'];
export const TAKE_FOLDERS = Object.freeze([
  ...TYPES.flatMap((t) => VOICE_STATES.map((s) => `zombies/${t}/${s}`)),
  'zombies/leaper/move', 'zombies/demon/charge', 'zombies/colossus/step',
  'zombies/screamer/call', 'zombies/spider/spit', 'zombies/spider/acid-splash', 'zombies/bomber/burst',
  'zombies/guardian/roar', 'zombies/guardian/slam',
  'zombies/caveguard/growl', 'zombies/caveguard/screech', 'zombies/caveguard/cave-groan', 'zombies/caveguard/in-walls',
  ...['shuffle', 'barefoot', 'waterlogged', 'boots', 'hop', 'crawl', 'heavy', 'huge'].map((k) => 'footsteps/' + k),
  ...['flesh-hit', 'flesh-hit-heavy', 'headshot', 'gore-small', 'gore-big', 'body-fall'].map((k) => 'impacts/' + k),
  'horde/emerge', 'horde/groan-near', 'horde/distant',
  ...['wood', 'stone', 'sand', 'wire', 'metal', 'turret'].flatMap((m) => [`build-attacks/${m}-hit`, `build-attacks/${m}-break`]),
]);
// CL-155: the rest of the game's sounds (z-sounds/PROMPTS-2.md): folders Jerry can fill now; each is wired into the game
// when its takes are in (until then the game keeps its own sound and the listen page shows them as not wired yet).
export const PLANNED_FOLDERS = Object.freeze([
  ...["footstep-dirt", "footstep-run-dirt", "footstep-wood", "footstep-water", "footstep-tile", "jump", "land", "dodge-roll", "vault", "ladder-climb", "swim-stroke", "hurt", "hurt-heavy", "death", "breath-tired", "heartbeat-low", "armor-hit", "armor-don", "medpen", "nvg-on", "nvg-off", "nvg-hum", "flashlight-click", "chute-land", "burial-dig", "burial-chisel", "burial-heave"].map((k) => 'player/' + k),
  ...["mag-out", "mag-in", "mag-slap", "mag-release", "mag-drop", "slide-back", "slide-forward", "charging-handle", "bolt-cycle", "pump-back", "pump-forward", "shell-insert", "cylinder-open", "cylinder-spin", "drum-out", "drum-in", "belt-feed", "launcher-open", "launcher-shell", "dry-fire", "brass", "brass-concrete", "weapon-switch", "wheel-tick", "grenade-pin", "grenade-bounce", "knife-swing", "knife-hit", "machete-swing", "machete-chop", "chainsaw-start", "chainsaw-idle", "chainsaw-rev", "chainsaw-cut", "chainsaw-stop"].map((k) => 'weapon-foley/' + k),
  ...["pistol", "revolver", "smg", "carbine", "rifle", "shotgun", "auto-shotgun", "sniper", "machine-gun", "rotary-gun", "rotary-spin", "grenade-launcher", "mortar-launch", "explosion", "flamethrower"].map((k) => 'weapons/' + k),
  ...["dirt", "rock", "metal", "wood", "water", "sand", "ricochet", "leaves"].map((k) => 'bullet-impacts/' + k),
  ...["place-wood", "place-sandbag", "place-metal", "place-wire", "place-turret", "upgrade", "repair", "sell", "invalid", "door-open", "door-close", "stairs-fold", "mine-beep", "spike-snap", "lure"].map((k) => 'builds/' + k),
  ...["light-turret-fire", "heavy-turret-fire", "servo", "mortar-mount", "mortar-round-drop", "mortar-incoming", "mortar-dismount", "machine-gun-mount"].map((k) => 'turrets/' + k),
  ...["alarm-klaxon", "alarm-rumble", "flare-launch", "flare-burst", "kiosk-shutter-open", "kiosk-shutter-close", "kiosk-buy", "kiosk-tab", "cash", "skull-pickup", "bag-throw", "hq-machine", "hq-ding", "pickup", "crate-land", "radio-call", "radio-off", "armory-bench", "cif-locker"].map((k) => 'hq/' + k),
  ...["wind-day", "wind-night", "crickets-night", "river", "lake-shore", "rain", "thunder", "lightning-strike", "birds-day", "owl", "campfire", "fire-burning", "tree-fall", "tree-thud", "rock-break", "big-splash", "surface-gasp", "rabbit-screech", "cave-mouth", "pit-rumble", "barrel-explode"].map((k) => 'world/' + k),
  ...["warren-ambience", "drip", "rock-groan"].map((k) => 'below/' + k),
  ...["cargo-plane-flyover", "cargo-plane-interior", "chute-open", "floatplane-approach", "floatplane-landing", "floatplane-idle", "floatplane-takeoff"].map((k) => 'vehicles/' + k),
  ...["click", "hover", "back", "map-open", "map-close", "wave-start", "streak", "day-cleared", "game-over", "victory", "objective"].map((k) => 'ui/' + k),
  ...["target-hit", "target-fall", "target-rise", "wall-impact", "ventilation", "light-switch", "panel-beep", "gate-open", "clear-all", "infirmary-wake"].map((k) => 'training/' + k),
]);
// CL-161: batch 3 (z-sounds/PROMPTS-3.md): folders ready for takes. The roof crew's, the burial's and the new screens'
// wait for those to be built; the rest are wired the way batch 2's were when their takes come in.
export const PLANNED_FOLDERS_3 = Object.freeze([
  ...["megaphone-squawk", "truck-horn", "flare-distant", "mud-emerge", "mud-step", "ladder-raise", "hatch-pry", "hatch-slam", "kettle-whistle", "tea-pour", "biscuit-tin", "belt-rattle", "gun-cleaning", "med-bag", "bandage-wrap", "ratchet", "engine-crank", "roof-step", "crate-sit", "sleeping-bag"].map((k) => 'crew/' + k),
  ...["shovel-fill", "marker-hammer", "dog-tag-hang"].map((k) => 'burial/' + k),
  ...["the-tone", "tone-swell", "tone-silenced", "relay-spark", "relay-power-up", "fuse-pull", "hush-on", "hush-hum", "hush-dying", "rune-door-hum", "rune-door-open", "rune-shard", "stones-pulse", "dog-tag", "field-note", "heart-beat", "heart-fall", "lake-breath", "iron-bars", "coffin-creak"].map((k) => 'story/' + k),
  ...["missing-in-action", "deja-vu", "badge", "dawn-card", "expand"].map((k) => 'ui/' + k),
  ...["frogs-night", "fog-wind", "underwater", "graveyard-ambience", "chapel-choir", "heavenly-choir", "holy-blast", "tree-crown-fire", "trunk-bump"].map((k) => 'world/' + k),
  ...["footstep-metal", "footstep-stone", "footstep-mud", "footstep-leaves", "medkit", "grenade-throw", "drowning", "ammo-pickup"].map((k) => 'player/' + k),
  ...["chainsaw-dry-pull", "suppressor-on", "laser-click", "shotgun-hull"].map((k) => 'weapon-foley/' + k),
  ...["pistol-suppressed", "carbine-suppressed", "machine-gun-shot", "rotary-gun-loop"].map((k) => 'weapons/' + k),
  ...["alarm", "pa-chime", "keypad-press", "keypad-accept", "keypad-deny", "hangar-door"].map((k) => 'training/' + k),
  ...["sample-window", "terminal-boot", "generator"].map((k) => 'hq/' + k),
  ...["light-turret-shot", "heavy-turret-shot"].map((k) => 'turrets/' + k),
]);
// CL-161: batch 2 folders the game doesn't play: their prompts recorded bursts or a loop, which can't play round by round
// (batch 3 has single shots for them). They can still be heard on the listen page.
export const NOT_WIRED = Object.freeze(['weapons/machine-gun', 'weapons/rotary-gun', 'weapons/rotary-spin', 'weapons/flamethrower',
  'turrets/light-turret-fire', 'turrets/heavy-turret-fire', 'vehicles/cargo-plane-interior']);   // (the drop-in has no scene inside the plane)
// CL-161: the gunfire was Jerry's to compare (the TRY prompts): a recorded gun played only once he switched it on.
// CL-164: he has picked and replaced the gun takes himself (2026-10-11), so the guns play like everything else now. Only
// the single shots that were never generated stay opt-in. Any folder can still be switched off on the listen page.
export const OPT_IN = Object.freeze(['weapons/machine-gun-shot', 'weapons/rotary-gun-loop', 'turrets/light-turret-shot', 'turrets/heavy-turret-shot']);
// CL-168 (Jerry: "layer the original ... sounds with the [new] ones. For HQ, Skull pickup, UI, And gunshots. Not reloads or
// chainsaw, launcher, ect. Just the firearms that fire bullets. The original sounds had more ass"): these folders play their take
// together with the game's own synthesized sound instead of in its place. Only folders whose sound had an original are here
// (the radio, the armory bench, the menu click, hover and map have none). LAYER_TAKE_V: the take's level when it is layered.
export const LAYERED = Object.freeze([
  ...['pistol', 'revolver', 'smg', 'carbine', 'rifle', 'shotgun', 'auto-shotgun', 'sniper', 'pistol-suppressed', 'carbine-suppressed', 'machine-gun-shot'].map((k) => 'weapons/' + k),
  ...['cash', 'pickup', 'crate-land', 'kiosk-buy', 'kiosk-tab', 'kiosk-shutter-open', 'kiosk-shutter-close',
    'hq-machine', 'hq-ding', 'bag-throw', 'skull-pickup', 'cif-locker'].map((k) => 'hq/' + k),
  ...['victory', 'game-over', 'streak', 'wave-start', 'expand', 'day-cleared', 'badge', 'objective'].map((k) => 'ui/' + k)
]);
export const LAYER_TAKE_V = 0.8;
// CL-172 (Jerry: "I like the old HQ Alarm and Flares better. Please switch just that back."): these play only the game's
// original synthesized sound, never a take (even one switched on at the listen page). Their takes stay on disk.
export const ORIGINAL_ONLY = Object.freeze(['hq/alarm-klaxon', 'hq/alarm-rumble', 'hq/flare-launch', 'hq/flare-burst']);
const FOLDER_SET = new Set([...TAKE_FOLDERS, ...PLANNED_FOLDERS, ...PLANNED_FOLDERS_3]);
export const AUDIO_FILE = /\.(mp3|wav|ogg|oga|opus|m4a|aac|flac|webm)$/i;

const TYPE_WORD = Object.fromEntries([...TYPES.map((t) => [t, t]), ['cave guardian', 'caveguard'], ['cave guard', 'caveguard']]);
const STATE_WORD = {
  idle: 'idle', chase: 'chase', attack: 'attack', hurt: 'hurt', hit: 'hurt', 'hit reaction': 'hurt', pain: 'hurt',
  death: 'death', die: 'death', dying: 'death', move: 'move', movement: 'move', leap: 'move', charge: 'charge',
  step: 'step', footstep: 'step', footsteps: 'step', call: 'call', spit: 'spit', 'acid splash': 'acid-splash',
  burst: 'burst', roar: 'roar', slam: 'slam', growl: 'growl', screech: 'screech', 'cave groan': 'cave-groan',
  'in walls': 'in-walls',
};
const GROUP_WORD = { footsteps: 'footsteps', impacts: 'impacts', horde: 'horde', 'build attacks': 'build-attacks',
  ...Object.fromEntries([...new Set([...PLANNED_FOLDERS, ...PLANNED_FOLDERS_3].map((f) => f.split('/')[0]))].map((g) => [g.replace(/-/g, ' '), g])) };
// "04 - New Voices" -> "new voices"; "Hit_Reaction" -> "hit reaction"; "acid-splash" -> "acid splash"
const words = (s) => String(s).toLowerCase().replace(/^\d+\s*[-_.]\s*/, '').replace(/[-_\s]+/g, ' ').trim();

// The folder a take belongs to ("zombies/bomber/hurt", "footsteps/shuffle" ...), from its path under z-sounds/, or null.
export function takeFolderFor(rel) {
  if (typeof rel !== 'string' || !AUDIO_FILE.test(rel)) return null;
  const parts = rel.split(/[\\/]+/).filter(Boolean);
  const file = parts.pop();
  if (!file || /^[._]/.test(file)) return null;
  const seg = parts.map(words);
  for (let i = 0; i + 1 < seg.length; i++) {
    const g = GROUP_WORD[seg[i]];
    if (g) { const id = g + '/' + seg[i + 1].replace(/ /g, '-'); if (FOLDER_SET.has(id)) return id; }
    const t = TYPE_WORD[seg[i]], s = t && STATE_WORD[seg[i + 1]];
    if (s && FOLDER_SET.has(`zombies/${t}/${s}`)) return `zombies/${t}/${s}`;
  }
  return null;
}

// files (paths under z-sounds/) -> Map(folder -> [paths]), sorted; anything that names no folder is left out.
export function groupTakes(files) {
  const out = new Map();
  for (const f of files || []) {
    const id = takeFolderFor(f);
    if (!id) continue;
    if (!out.has(id)) out.set(id, []);
    out.get(id).push(f);
  }
  for (const list of out.values()) list.sort();
  return out;
}

// levels.json: the longest key that is the folder or one of its parents ("zombies", "zombies/brute") wins.
export function levelFor(id, levels) {
  if (!levels || typeof levels !== 'object') return 1;
  let best = -1, v = 1;
  for (const [k, x] of Object.entries(levels)) {
    const key = String(k).replace(/\/+$/, '');
    if ((id === key || id.startsWith(key + '/')) && key.length > best && Number.isFinite(+x)) { best = key.length; v = Math.max(0, Math.min(4, +x)); }
  }
  return v;
}

// How loud each kind of take sits before the game's own distance (v): the RMS a take is evened to. The synthesized
// voices sit about here; Jerry's levels.json is the knob by ear. CL-161: the rest of the game's folders are evened to
// what the game's own synthesized sound measured at the same place in the mix (core/take-levels.js, measured in the
// camera), so a recording comes in where the sound it replaces was; a group default covers what had no sound.
const TARGET_RMS = { zombies: 0.11, footsteps: 0.05, impacts: 0.11, horde: 0.07, 'build-attacks': 0.1,
  player: 0.06, 'weapon-foley': 0.08, weapons: 0.2, 'bullet-impacts': 0.06, builds: 0.07, turrets: 0.1, hq: 0.07, world: 0.06,
  below: 0.05, vehicles: 0.07, ui: 0.05, training: 0.06, crew: 0.07, burial: 0.07, story: 0.07 };
let measured = { ...TAKE_LEVELS };
const BED_FOLDERS = new Set(BEDS);
export function setTakeTargets(map) { measured = map && typeof map === 'object' ? map : {}; }
export const takeTarget = (id) => (Number.isFinite(measured[id]) && measured[id] > 0 ? measured[id] : TARGET_RMS[id.split('/')[0]] || 0.1);
// Folders worth having decoded before the first night: what every night has, plus the Training Ground
// alarm so the first pull is Jerry's take (CU-119). The rest load the first time asked.
const EARLY = /^(zombies\/(shambler|feral)\/|footsteps\/|impacts\/|horde\/|build-attacks\/|player\/(footstep|jump|land|hurt)|weapon-foley\/(mag|slide|weapon-switch|dry-fire|brass$)|bullet-impacts\/(dirt|wood|rock|leaves)|training\/alarm$)/;
// Voices: the zombies' groups (CL-148) share 28, everything else (CL-161) its own 32, so a long burst into the rocks
// can't take a zombie's voice. A folder plays at most FOLDER_MAX at once: past that its oldest is cut short (a quick
// fade), so the newest round always sounds.
const Z_GROUPS = new Set(['zombies', 'footsteps', 'impacts', 'horde', 'build-attacks']);
const MAX_VOICES = 28, MAX_FX = 32;
const FOLDER_MAX = { weapons: 4, 'bullet-impacts': 4, 'weapon-foley': 3, 'weapon-foley/brass': 6, player: 3, ui: 2, turrets: 4 };
const folderMax = (id) => (Z_GROUPS.has(id.split('/')[0]) ? Infinity : FOLDER_MAX[id] || FOLDER_MAX[id.split('/')[0]] || 4);   // the zombies' as before
// CL-161: Jerry's on/off per folder, kept in this browser (the listen page and the game share it).
const USE_KEY = 'tt.takeUse';
const OPT_IN_SET = new Set(OPT_IN), NOT_WIRED_SET = new Set(NOT_WIRED);
export function readUse(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  try { const j = JSON.parse(storage && storage.getItem(USE_KEY) || '{}'); return j && typeof j === 'object' ? j : {}; } catch (_) { return {}; }
}
export function writeUse(map, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  try { if (storage) storage.setItem(USE_KEY, JSON.stringify(map)); } catch (_) {}
}
// Whether the game plays a folder's takes: Jerry's switch if he has set one, else on (off for the gunfire to compare).
export const usesTakes = (id, use) => (use && typeof use[id] === 'boolean' ? use[id] : !OPT_IN_SET.has(id));
// CL-162: the batch-3 folders the game plays (the rest wait for the roof crew, the burial, the story beats and the new screens)
export const WIRED_3 = Object.freeze(['story/hush-dying', 'story/heart-fall', 'ui/expand', 'world/graveyard-ambience', 'world/chapel-choir',
  'world/heavenly-choir', 'world/holy-blast', 'world/tree-crown-fire', 'world/trunk-bump', 'world/frogs-night', 'player/medkit',
  'player/grenade-throw', 'player/ammo-pickup', 'weapon-foley/chainsaw-dry-pull', 'weapon-foley/laser-click', 'weapon-foley/suppressor-on',
  'weapons/pistol-suppressed', 'weapons/carbine-suppressed', 'weapons/machine-gun-shot', 'turrets/light-turret-shot', 'turrets/heavy-turret-shot',
  'training/alarm', 'training/keypad-press', 'training/keypad-accept', 'training/keypad-deny', 'training/hangar-door',
  'ui/badge', 'ui/dawn-card']);   // CL-164: a badge earned; the dawn card sliding in
const WIRED_3_SET = new Set(WIRED_3);
export const isWired = (id) => !NOT_WIRED_SET.has(id) && FOLDER_SET.has(id) && (!PLANNED_FOLDERS_3.includes(id) || WIRED_3_SET.has(id));

export function createTakeBank({ getCtx, connect, track = () => {}, fetchJson, fetchBytes, root = 'z-sounds/', listUrls = null, storage }) {
  let listed = null, listing = null, levels = {};
  const files = new Map(), bufs = new Map(), loads = new Map(), last = new Map(), plays = {};
  const rates = new WeakMap();
  const playing = new Map();   // folder -> [{ src, g, at }] oldest first
  let active = 0, activeFx = 0, failed = 0;
  let use = readUse(storage);
  const urlFor = (rel) => root + rel.split(/[\\/]+/).map(encodeURIComponent).join('/');

  function init() {
    if (listing) return listing;
    listing = (async () => {
      let list = null;
      for (const u of listUrls || ['__zsounds', root + 'index.json']) {
        try { const j = await fetchJson(u); if (j && Array.isArray(j.files)) { list = j.files; break; } } catch (_) { /* next */ }
      }
      try { const l = await fetchJson(root + 'levels.json'); if (l && typeof l === 'object') levels = l; } catch (_) { levels = {}; }
      // a fresh look (refresh): a folder whose takes changed is decoded again; one emptied goes back to the synth
      const next = groupTakes(list || []);
      for (const id of [...files.keys()]) if (!next.has(id) || next.get(id).join('\n') !== files.get(id).join('\n')) { files.delete(id); bufs.delete(id); loads.delete(id); }
      for (const [id, fs] of next) files.set(id, fs);
      listed = { folders: files.size, takes: [...files.values()].reduce((n, l) => n + l.length, 0), source: list ? 'ok' : 'none' };
      use = readUse(storage);
      for (const id of files.keys()) if (EARLY.test(id) && usesTakes(id, use)) load(id);
      return listed;
    })();
    return listing;
  }

  // Decode every take of a folder, folded to mono (the game pans it), each evened to the folder's target loudness.
  function load(id) {
    if (loads.has(id)) return loads.get(id);
    const ctx = getCtx(), all = files.get(id);
    if (!ctx || !all) return Promise.resolve(null);
    // a bed loops one take for minutes: two are variety enough, and a decoded 10 s take is 2 MB
    const fs = BED_FOLDERS.has(id) ? all.slice(0, 2) : all;
    const p = Promise.all(fs.map(async (rel) => {
      try {
        const ab = await fetchBytes(urlFor(rel));
        const buf = await new Promise((res, rej) => { const q = ctx.decodeAudioData(ab, res, rej); if (q && q.catch) q.catch(rej); });
        return evened(ctx, buf, takeTarget(id));
      } catch (_) { failed++; return null; }
    })).then((list) => { const ok = list.filter(Boolean); bufs.set(id, ok.length ? ok : null); return bufs.get(id); });
    loads.set(id, p);
    return p;
  }

  function evened(ctx, buf, target) {
    const n = buf.length, ch = buf.numberOfChannels;
    const mono = ctx.createBuffer(1, n, buf.sampleRate), m = mono.getChannelData(0);
    for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) m[i] += d[i] / ch; }
    let peak = 0;
    for (let i = 0; i < n; i++) { const a = Math.abs(m[i]); if (a > peak) peak = a; }
    // RMS over the part that sounds (above 2% of the peak), so a short hit with a long tail isn't over-raised
    let sum = 0, cnt = 0; const floor = peak * 0.02;
    for (let i = 0; i < n; i++) { const a = Math.abs(m[i]); if (a > floor) { sum += m[i] * m[i]; cnt++; } }
    const rms = cnt ? Math.sqrt(sum / cnt) : 0;
    let gain = rms > 1e-5 ? target / rms : 1;
    gain = Math.max(0.003, Math.min(8, gain));   // CL-161: was 0.15, but a footstep's measured level asks for ~0.02
    if (peak * gain > 0.98) gain = 0.98 / peak;
    return { buf: mono, gain, seconds: n / buf.sampleRate };
  }

  // The takes of `id`, ready to play, or undefined (asked for: loading now) / null (none, or switched off).
  function ready(id) {
    if (!listed) { init(); return undefined; }
    if (!files.has(id) || !usesTakes(id, use)) return null;
    const list = bufs.get(id);
    if (list === undefined) { load(id); return undefined; }
    return list;
  }
  function pick(id, list) {
    let k = Math.floor(Math.random() * list.length);
    if (list.length > 1 && k === last.get(id)) k = (k + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
    last.set(id, k);
    return list[k];
  }

  // Play a take of `id`. True if one played (the caller then skips its own sound). v: the game's distance/volume,
  // pan, when (s from now), emitter: the zombie, so each one keeps its own pitch; rev: a send to the game's reverb;
  // rate: the caller's pitch (a heavier gun's reload is lower), on top of the take's own small variation.
  function play(id, v = 1, pan = 0, when = 0, emitter = null, rev = 0, rate = 1) {
    const list = ready(id);
    if (!list) return false;
    const ctx = getCtx();
    const z = Z_GROUPS.has(id.split('/')[0]);
    if (!ctx || (z ? active >= MAX_VOICES : activeFx >= MAX_FX)) return !!ctx;   // over the cap: drop it rather than fall back to the synth
    const t = pick(id, list);
    const src = ctx.createBufferSource(); src.buffer = t.buf;
    let r;
    if (emitter && typeof emitter === 'object' && id.startsWith('zombies/')) {
      if (!rates.has(emitter)) rates.set(emitter, 0.92 + Math.random() * 0.16);
      r = rates.get(emitter) * (0.985 + Math.random() * 0.03);
    } else r = 0.95 + Math.random() * 0.1;
    src.playbackRate.value = r * (rate > 0 ? rate : 1);
    const g = ctx.createGain();
    g.gain.value = t.gain * levelFor(id, levels) * Math.max(0, Math.min(1.5, v));
    let head = src;
    if (v < 0.55) {   // far off: the top falls away, as it does for the synthesized voices' distance
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900 + 14000 * v * v; f.Q.value = 0.5;
      src.connect(f); head = f;
    }
    head.connect(g);
    connect(g, pan, rev);
    // this folder's oldest goes if it already has its fill
    let mine = playing.get(id);
    if (!mine) playing.set(id, mine = []);
    while (mine.length >= folderMax(id)) {
      const o = mine.shift();
      try { o.g.gain.setTargetAtTime(0, ctx.currentTime, 0.012); o.src.stop(ctx.currentTime + 0.06); } catch (_) {}
    }
    const rec = { src, g };
    mine.push(rec);
    if (z) active++; else activeFx++;
    src.addEventListener('ended', () => {
      if (z) active--; else activeFx--;
      const i = mine.indexOf(rec); if (i >= 0) mine.splice(i, 1);
      try { g.disconnect(); } catch (_) {}
    });   // track() takes onended
    const start = ctx.currentTime + Math.max(0, when || 0);
    const deathEnd = isZombieDeathTake(id) ? scheduleDeathCryFade(g.gain, start, t.seconds / src.playbackRate.value, g.gain.value) : null;
    src.start(start);
    if (deathEnd != null) src.stop(deathEnd + .02);
    track(src);
    plays[id] = (plays[id] || 0) + 1;
    return true;
  }

  // CL-161: a looping take (a bed: wind, rain, an engine). Null until the folder is ready (asking starts it loading).
  // The handle: set(v, tc) its level (v as for play), rate(r, tc), stop(fade s). One take, picked at random, loops.
  function loop(id, { pan = 0, rev = 0, bus = null, v = 0 } = {}) {
    const list = ready(id);
    if (!list) return null;
    const ctx = getCtx(); if (!ctx) return null;
    const t = pick(id, list);
    const src = ctx.createBufferSource(); src.buffer = t.buf; src.loop = true;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(g);
    connect(g, pan, rev, bus);
    const base = t.gain * levelFor(id, levels);
    const now = ctx.currentTime;
    src.start(now, Math.random() * Math.max(0, t.seconds - 0.1));   // start anywhere in it, so two beds of one folder don't phase
    if (v > 0) g.gain.setTargetAtTime(base * v, now, 0.3);
    plays[id] = (plays[id] || 0) + 1;
    let stopped = false;
    return {
      id, take: t,
      set(level, tc = 0.4) { if (stopped) return; try { g.gain.setTargetAtTime(Math.max(0, base * Math.min(2, level)), ctx.currentTime, tc); } catch (_) {} },
      rate(r, tc = 0.1) { if (stopped) return; try { src.playbackRate.setTargetAtTime(Math.max(0.25, Math.min(4, r)), ctx.currentTime, tc); } catch (_) {} },
      level: () => g.gain.value / (base || 1),
      stop(fade = 0.3) {
        if (stopped) return; stopped = true;
        const t0 = ctx.currentTime;
        try { g.gain.setTargetAtTime(0, t0, Math.max(0.005, fade / 3)); src.stop(t0 + fade + 0.05); } catch (_) {}
        setTimeout(() => { try { g.disconnect(); } catch (_) {} }, (fade + 0.2) * 1000);
      },
      get stopped() { return stopped; },
    };
  }

  return {
    init, load, play, loop,
    // Look again (entering the Training Ground does): takes dropped in while the game runs are picked up.
    refresh: () => { listing = null; return init(); },
    has: (id) => files.has(id),
    // ready to play now (loaded and switched on); asking starts the loading
    ready: (id) => !!ready(id),
    preload: (ids) => { for (const id of ids || files.keys()) if (files.has(id)) load(id); },
    // Jerry's switch for a folder (true, false, or null for the default); kept in this browser
    setUse(id, on) { use = readUse(storage); if (on === null || on === undefined) delete use[id]; else use[id] = !!on; writeUse(use, storage); if (on) load(id); return usesTakes(id, use); },
    uses: (id) => usesTakes(id, use),
    state: () => ({ listed, loaded: [...bufs].filter(([, b]) => b).map(([id, b]) => [id, b.length]), failed, active, activeFx, plays: { ...plays }, levels, use: { ...use } }),
  };
}
