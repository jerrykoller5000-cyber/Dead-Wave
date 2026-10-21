// core/takes.test.mjs — CL-148: reading where a take belongs, the folder list, levels, and the bank with a fake context.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TAKE_FOLDERS, takeFolderFor, groupTakes, levelFor, createTakeBank, PLANNED_FOLDERS_3, OPT_IN, NOT_WIRED, usesTakes, isWired, takeTarget, WIRED_3, LAYERED, LAYER_TAKE_V, ORIGINAL_ONLY } from './takes.js';

test('the folder list is z-sounds/: 112 folders, each once', () => {
  assert.equal(TAKE_FOLDERS.length, 112);
  assert.equal(new Set(TAKE_FOLDERS).size, 112);
});

test('a take is placed by its folders, in either layout', () => {
  assert.equal(takeFolderFor('zombies/shambler/idle/ElevenLabs_2026-10-10.mp3'), 'zombies/shambler/idle');
  assert.equal(takeFolderFor('footsteps/shuffle/take 1.wav'), 'footsteps/shuffle');
  assert.equal(takeFolderFor('build-attacks/metal-break/x.ogg'), 'build-attacks/metal-break');
  // Jerry's 01 - Current Voices layout, copied in as a folder
  assert.equal(takeFolderFor('04 - New Voices/Bomber/Hit Reaction/Bomber_Hit_Reaction_01.wav'), 'zombies/bomber/hurt');
  assert.equal(takeFolderFor('04 - New Voices/Cave Guardian/Idle/a.mp3'), 'zombies/caveguard/idle');
  assert.equal(takeFolderFor('New Voices/Leaper/Movement/a.mp3'), 'zombies/leaper/move');
  assert.equal(takeFolderFor('New Voices/Colossus/Footstep/a.mp3'), 'zombies/colossus/step');
  assert.equal(takeFolderFor('zombies/spider/acid-splash/1.mp3'), 'zombies/spider/acid-splash');
  assert.equal(takeFolderFor('zombies/shambler/idle/old/1.mp3'), 'zombies/shambler/idle', 'a subfolder inside is fine');
  // not takes
  assert.equal(takeFolderFor('zombies/shambler/idle/_prompt.txt'), null);
  assert.equal(takeFolderFor('zombies/shambler/idle/.hidden.mp3'), null);
  assert.equal(takeFolderFor('zombies/shambler/a.mp3'), null, 'no state');
  assert.equal(takeFolderFor('zombies/feral/charge/a.mp3'), null, 'only the demon charges');
  assert.equal(takeFolderFor('PROMPTS.md'), null);
});

test('grouping and levels', () => {
  const g = groupTakes(['zombies/feral/idle/b.mp3', 'zombies/feral/idle/a.mp3', 'x.mp3', 'horde/distant/1.wav']);
  assert.deepEqual([...g.keys()].sort(), ['horde/distant', 'zombies/feral/idle']);
  assert.deepEqual(g.get('zombies/feral/idle'), ['zombies/feral/idle/a.mp3', 'zombies/feral/idle/b.mp3']);
  const L = { zombies: 0.8, 'zombies/brute': 1.3, 'footsteps/shuffle/': 0.5 };
  assert.equal(levelFor('zombies/brute/idle', L), 1.3);
  assert.equal(levelFor('zombies/feral/idle', L), 0.8);
  assert.equal(levelFor('footsteps/shuffle', L), 0.5);
  assert.equal(levelFor('impacts/headshot', L), 1);
  assert.equal(levelFor('zombies/bruteforce/idle', { 'zombies/brute': 2 }), 1, 'a prefix is a whole folder name');
});

// A pretend Web Audio context: enough for the bank to decode, even and play.
function fakeCtx() {
  const started = [];
  const node = () => ({ connect() {}, disconnect() {}, gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {} }, frequency: { value: 0 }, Q: { value: 0 } });
  return {
    started, currentTime: 0, sampleRate: 48000,
    createBuffer(ch, n, sr) { const d = Array.from({ length: ch }, () => new Float32Array(n)); return { numberOfChannels: ch, length: n, sampleRate: sr, getChannelData: (i) => d[i] }; },
    decodeAudioData(ab, res) { const b = this.createBuffer(2, 4800, 48000); for (let c = 0; c < 2; c++) b.getChannelData(c).fill(ab.level); res(b); },
    createGain: node, createBiquadFilter: node,
    createBufferSource() { const s = { ...node(), playbackRate: { value: 1 }, addEventListener() {}, stop() {}, start(t) { started.push({ s, t }); } }; return s; },
  };
}

test('the bank: lists, decodes ahead, evens loudness, keeps a zombie\'s pitch, falls back when it has nothing', async () => {
  const ctx = fakeCtx(), routed = [];
  const listing = { files: ['zombies/shambler/idle/a.mp3', 'zombies/shambler/idle/b.mp3', 'zombies/brute/death/a.mp3'] };
  const bank = createTakeBank({
    getCtx: () => ctx, connect: (g, pan) => routed.push({ g, pan }),
    fetchJson: async (u) => { if (u === '__zsounds') return listing; if (u.endsWith('levels.json')) return { 'zombies/shambler': 0.5 }; throw new Error('404'); },
    fetchBytes: async (u) => ({ level: u.includes('/a.mp3') ? 0.5 : 0.05 }),
  });
  assert.equal(bank.play('zombies/shambler/idle'), false, 'before the list: the synth plays');
  await bank.init();
  assert.equal(bank.has('zombies/shambler/idle'), true);
  assert.equal(bank.has('footsteps/shuffle'), false);
  assert.equal(bank.play('footsteps/shuffle'), false, 'no takes: the synth plays');
  assert.equal(bank.play('zombies/brute/death'), false, 'not decoded ahead: this once the synth plays...');
  await bank.load('zombies/brute/death'); await bank.load('zombies/shambler/idle');
  assert.equal(bank.play('zombies/brute/death'), true, '...then the take');
  // evened: both shambler takes come out at the same loudness (target 0.11) times levels.json's 0.5
  const z = {};
  for (let i = 0; i < 6; i++) bank.play('zombies/shambler/idle', 1, 0.2, 0, z);
  const gains = routed.slice(1).map((r) => +(r.g.gain.value * (r.g === routed[1].g ? 1 : 1)).toFixed(3));
  const loud = routed.slice(1).map((r, i) => r.g.gain.value * (ctx.started[i + 1].s.buffer.getChannelData(0)[0]));
  for (const x of loud) assert.ok(Math.abs(x - 0.055) < 1e-3, 'evened to 0.11 x 0.5, got ' + x + ' ' + gains);
  const rates = ctx.started.slice(1).map((s) => s.s.playbackRate.value);
  assert.ok(Math.max(...rates) - Math.min(...rates) < 0.04, 'one zombie, one voice');
  assert.equal(bank.state().plays['zombies/shambler/idle'], 6);
  assert.equal(routed[1].pan, 0.2);
});

test('refresh: takes dropped in while the game runs are picked up, changed folders decoded again', async () => {
  const ctx = fakeCtx();
  let listing = { files: ['zombies/feral/idle/a.mp3'] };
  let decodes = 0;
  const bank = createTakeBank({
    getCtx: () => ctx, connect: () => {},
    fetchJson: async (u) => { if (u === '__zsounds') return listing; throw new Error('404'); },
    fetchBytes: async () => { decodes++; return { level: 0.3 }; },
  });
  await bank.init(); await bank.load('zombies/feral/idle');
  assert.equal(decodes, 1);
  listing = { files: ['zombies/feral/idle/a.mp3', 'zombies/brute/idle/a.mp3'] };
  await bank.refresh();
  assert.equal(bank.has('zombies/brute/idle'), true, 'the new folder is found');
  await bank.load('zombies/feral/idle');
  assert.equal(decodes, 1, 'an unchanged folder is not decoded again');
  listing = { files: ['zombies/feral/idle/a.mp3', 'zombies/feral/idle/b.mp3'] };
  await bank.refresh();
  assert.equal(bank.has('zombies/brute/idle'), false, 'emptied: back to the synth');
  await bank.load('zombies/feral/idle');
  assert.equal(decodes, 3, 'a changed folder is decoded again (two takes)');
});

test('CL-155: the rest of the game\'s sounds have folders too, read the same way', async () => {
  const { PLANNED_FOLDERS } = await import('./takes.js');
  assert.equal(PLANNED_FOLDERS.length, 179);
  assert.equal(new Set([...TAKE_FOLDERS, ...PLANNED_FOLDERS]).size, 112 + 179, 'no folder twice');
  assert.equal(takeFolderFor('player/footstep-dirt/ElevenLabs_1.mp3'), 'player/footstep-dirt');
  assert.equal(takeFolderFor('weapon-foley/mag-in/a.wav'), 'weapon-foley/mag-in');
  assert.equal(takeFolderFor('bullet-impacts/metal/a.mp3'), 'bullet-impacts/metal');
  assert.equal(takeFolderFor('impacts/headshot/a.mp3'), 'impacts/headshot', 'the zombie impacts are still theirs');
  assert.equal(takeFolderFor('player/footstep-moon/a.mp3'), null);
});

// CL-161
function memStore() { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; }
function fakeCtx2() {
  const started = [], stopped = [];
  const param = () => ({ value: 1, setTargetAtTime(v) { this.value = v; }, cancelScheduledValues() {} });
  const node = () => ({ connect() {}, disconnect() {}, gain: param(), frequency: { value: 0 }, Q: { value: 0 } });
  return {
    started, stopped, currentTime: 0, sampleRate: 48000,
    createBuffer(ch, n, sr) { const d = Array.from({ length: ch }, () => new Float32Array(n)); return { numberOfChannels: ch, length: n, sampleRate: sr, getChannelData: (i) => d[i] }; },
    decodeAudioData(ab, res) { const b = this.createBuffer(1, 4800, 48000); b.getChannelData(0).fill(ab.level); res(b); },
    createGain: node, createBiquadFilter: node,
    createBufferSource() { const s = { ...node(), loop: false, playbackRate: param(), addEventListener() {}, start(t, off) { started.push({ s, t, off }); }, stop(t) { stopped.push({ s, t }); } }; return s; },
  };
}

test('CL-161: batch 3 has its folders, the guns are Jerry\'s to switch on, the bursts aren\'t wired', () => {
  assert.equal(PLANNED_FOLDERS_3.length, 84);
  assert.equal(new Set([...TAKE_FOLDERS, ...PLANNED_FOLDERS_3]).size, 112 + 84);
  assert.equal(takeFolderFor('crew/truck-horn/truck-horn-1.ogg'), 'crew/truck-horn');
  assert.equal(takeFolderFor('story/the-tone/a.mp3'), 'story/the-tone');
  // CL-164: Jerry picked the gun takes, so they play by default now; the never-generated single shots stay opt-in
  assert.equal(usesTakes('weapons/machine-gun-shot', {}), false, 'opt-in: off until he switches it on');
  assert.equal(usesTakes('weapons/machine-gun-shot', { 'weapons/machine-gun-shot': true }), true);
  assert.equal(usesTakes('player/jump', {}), true, 'the rest: on');
  assert.equal(usesTakes('player/jump', { 'player/jump': false }), false, '...unless he switches it off');
  assert.ok(!OPT_IN.includes('weapons/carbine') && !OPT_IN.includes('weapon-foley/mag-in'));
  assert.equal(isWired('weapons/rotary-gun'), false); assert.equal(isWired('crew/megaphone-squawk'), false); assert.equal(isWired('player/land'), true);
  assert.ok(NOT_WIRED.every((f) => takeFolderFor(f + '/a.ogg') === f));
  assert.equal(takeTarget('world/rain'), 0.05, 'a bed is evened to 0.05');
});

test('CL-161: a switched-off folder plays the synth; the switch is kept', async () => {
  const ctx = fakeCtx2(), store = memStore();
  const bank = createTakeBank({ getCtx: () => ctx, connect: () => {}, storage: store,
    fetchJson: async (u) => { if (u === '__zsounds') return { files: ['player/jump/a.ogg', 'weapons/machine-gun-shot/a.ogg'] }; throw new Error('404'); },
    fetchBytes: async () => ({ level: 0.2 }) });
  await bank.init(); await bank.load('player/jump');
  assert.equal(bank.play('player/jump'), true);
  bank.setUse('player/jump', false);
  assert.equal(bank.play('player/jump'), false, 'off: the synth');
  assert.equal(JSON.parse(store.getItem('tt.takeUse'))['player/jump'], false, 'kept in the browser');
  assert.equal(bank.play('weapons/machine-gun-shot'), false, 'an opt-in folder: off by default');
  bank.setUse('weapons/machine-gun-shot', true); await bank.load('weapons/machine-gun-shot');
  assert.equal(bank.play('weapons/machine-gun-shot'), true, 'on once switched on');
});

test('CL-161: a folder past its fill cuts its oldest; the rate is the caller\'s; a loop is a handle', async () => {
  const ctx = fakeCtx2();
  const bank = createTakeBank({ getCtx: () => ctx, connect: () => {}, storage: memStore(),
    fetchJson: async (u) => { if (u === '__zsounds') return { files: ['bullet-impacts/dirt/a.ogg', 'world/rain/a.ogg', 'zombies/feral/idle/a.ogg'] }; throw new Error('404'); },
    fetchBytes: async () => ({ level: 0.1 }) });
  await bank.init(); await bank.load('bullet-impacts/dirt'); await bank.load('world/rain'); await bank.load('zombies/feral/idle');
  for (let i = 0; i < 6; i++) bank.play('bullet-impacts/dirt', 1, 0, 0, null, 0, 0.5);
  assert.equal(ctx.stopped.length, 2, 'four at once: the two oldest cut');
  assert.ok(ctx.started.every((x) => x.s.playbackRate.value < 0.56), 'half speed, give or take the take\'s own');
  for (let i = 0; i < 6; i++) bank.play('zombies/feral/idle');
  assert.equal(ctx.stopped.length, 2, 'the zombies are not cut (as before)');
  const h = bank.loop('world/rain', { v: 0 });
  assert.ok(h && ctx.started.at(-1).s.loop === true, 'a loop');
  h.set(1); assert.ok(Math.abs(h.level() - 1) < 1e-6);
  h.stop(0.2); assert.ok(h.stopped);
  assert.equal(bank.loop('world/wind-day'), null, 'no takes: no bed');
});

test('CL-162: batch-3 folders the game plays are wired; the ones waiting for their feature are not', () => {
  for (const id of WIRED_3) { assert.ok(PLANNED_FOLDERS_3.includes(id), id); assert.equal(isWired(id), true, id); }
  assert.equal(isWired('training/keypad-press'), true); assert.equal(isWired('world/frogs-night'), true);
  assert.equal(isWired('crew/megaphone-squawk'), false); assert.equal(isWired('story/the-tone'), false);
  assert.equal(takeFolderFor('training/keypad-deny/keypad-deny-2.ogg'), 'training/keypad-deny');
});

test('CL-164: Jerry\'s picked guns play by default; the badge and dawn card are wired', () => {
  for (const g of ['weapons/pistol', 'weapons/revolver', 'weapons/smg', 'weapons/shotgun', 'weapons/carbine', 'weapons/rifle', 'weapons/sniper',
    'weapons/mortar-launch', 'weapons/explosion', 'weapons/pistol-suppressed', 'weapons/carbine-suppressed']) {
    assert.equal(usesTakes(g, {}), true, g); assert.equal(isWired(g), true, g);
  }
  assert.equal(usesTakes('weapons/pistol', { 'weapons/pistol': false }), false, 'still switchable off');
  for (const id of ['ui/badge', 'ui/dawn-card']) { assert.ok(WIRED_3.includes(id)); assert.equal(isWired(id), true, id); }
  assert.equal(isWired('ui/missing-in-action'), false, 'no MIA screen yet'); assert.equal(isWired('ui/deja-vu'), false, 'no deja vu yet');
});

test('CL-168: the bullet guns, HQ, the skull pickup and the UI play with their original sound under them', () => {
  for (const id of LAYERED) assert.equal(isWired(id), true, id);
  for (const g of ['pistol', 'revolver', 'smg', 'carbine', 'rifle', 'shotgun', 'auto-shotgun', 'sniper', 'pistol-suppressed', 'carbine-suppressed'])
    assert.ok(LAYERED.includes('weapons/' + g), g);
  for (const id of ['hq/skull-pickup', 'hq/cash', 'hq/hq-machine', 'ui/wave-start', 'ui/streak']) assert.ok(LAYERED.includes(id), id);
  for (const id of ['weapons/grenade-launcher', 'weapons/mortar-launch', 'weapons/explosion', 'weapons/flamethrower', 'weapons/rotary-gun-loop'])
    assert.ok(!LAYERED.includes(id), id + ' is not a bullet');
  assert.ok(!LAYERED.some((id) => /reload|chainsaw|weapon-foley\//.test(id)), 'no reloads or chainsaw');
  for (const id of ['hq/radio-call', 'ui/click', 'ui/hover', 'hq/armory-bench']) assert.ok(!LAYERED.includes(id), id + ' has no original');
  assert.ok(LAYER_TAKE_V > 0 && LAYER_TAKE_V <= 1);
});

test('CL-172: the HQ alarm and the flares are the original sound alone', () => {
  for (const id of ['hq/alarm-klaxon', 'hq/alarm-rumble', 'hq/flare-launch', 'hq/flare-burst']) {
    assert.ok(ORIGINAL_ONLY.includes(id), id); assert.ok(!LAYERED.includes(id), id + ' is not layered');
  }
  assert.ok(LAYERED.includes('hq/skull-pickup') && LAYERED.includes('hq/hq-machine'), 'the rest of HQ stays layered');
});
