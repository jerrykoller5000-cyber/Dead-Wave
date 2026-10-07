import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildHollowHUD, buildHollowBoard, hollowPickupNote, mountHollows } from './hollows.js';
import { createHollow } from '../core/hollow.js';
import { createQuest } from './quest.js';
import { createHollowLoot, TAG_IDS } from '../game/hollows-loot.js';
import { text } from './strings.js';

const state = () => ({ active: true, runId: 1, hollow: { below: true, theme: 'root', depth: 1, place: 'warren' },
  hush: { owned: true, battery: 480 }, stir: { stir: 0, phase: 'calm', left: 0 } });

test('HUD reads live time, depth and warning; silence/heart/surface are distinct', () => {
  const s = state(); assert.match(buildHollowHUD(s).battery, /8:00/);
  s.hush.battery = 60.01; assert.match(buildHollowHUD(s).battery, /1:01/);
  s.hollow.depth = 2; assert.match(buildHollowHUD(s).depth, /2.*Narrows/);
  s.hollow.depth = 3; assert.match(buildHollowHUD(s).depth, /3.*Deep/);
  s.stir = { stir: 100, phase: 'warning', left: 4.1 };
  assert.match(buildHollowHUD(s).warning, /5s.*bolt-hole/);
  s.stir.phase = 'grab'; assert.equal(buildHollowHUD(s).phase, 'grab');
  s.hush.battery = 0; assert.match(buildHollowHUD(s).battery, /FLAT/);
  s.hollow.place = 'heart'; assert.match(buildHollowHUD(s).title, /Marrow/);
  assert.equal(buildHollowHUD({ ...s, active: false }), null);
  s.hollow.below = false; assert.equal(buildHollowHUD(s), null);
});

test('HQ follows real runtime clearances and passage destinations; a new run closes them', () => {
  const ring = ['wet', 'chalk', 'iron', 'root', 'hill', 'shale'].map((theme, cave) => ({ theme, cave })).filter(row => row.theme !== 'chalk');
  const h = createHollow({ ring: () => ring });
  let view = buildHollowBoard({ hollow: h.state(), hush: { owned: false } });
  assert.equal(view.rows.length, 5); assert.match(view.charge, /relay/);
  h.enter({ cave: 2, theme: 'iron' }, { groundAt: () => 0, dispose() {}, entry: { y: 0 } }); h.markCleared(); h.leave();
  view = buildHollowBoard({ hollow: h.state(), hush: { owned: true, charged: true } });
  assert.match(view.rows.find(r => r.name === 'Iron warren').passage, /Root warren/);
  assert.match(view.rows.find(r => r.name === 'Iron warren').status, /^Cleared$/);
  assert.match(view.charge, /charged/); assert.match(view.marrow, /sealed.*stone door/);
  h.reset(); view = buildHollowBoard({ hollow: h.state(), hush: { owned: true, charged: false } });
  assert(view.rows.every(r => r.status === 'Not cleared')); assert.match(view.charge, /Recharges/);
});

test('all nine accepted tags show stamped identity and story without reward counters', () => {
  const titles = new Set();
  for (const id of TAG_IDS) {
    const note = hollowPickupNote({ kind: 'tag', id, count: 9, total: 9 });
    assert(note); titles.add(note.title); assert.match(note.title, /PGB$/);
    assert.equal(note.lines.length, 1); assert.doesNotMatch(note.lines[0], /\+1|9 \/ 9/);
  }
  assert.equal(titles.size, 9);
  assert.match(hollowPickupNote({ kind: 'tag', id: 'iron:0' }).lines[0], /IT'S A WORD/);
  assert.equal(hollowPickupNote({ kind: 'tag', id: '__proto__' }), null);
});

test('box clue comes from the learned public view, never the hidden word', () => {
  const q = createQuest(); q.reset({ runId: 1, seed: 71 });
  const receipt = { kind: 'box', prize: { kind: 'gun', id: 'm4' }, shard: 2 };
  assert.deepEqual(hollowPickupNote(receipt, q.view()).lines, ['Weapon recovered · GW-4 Carbine', 'Rune shard recovered']);
  const learned = q.learn(2);
  const note = hollowPickupNote(receipt, q.view());
  assert(note.lines[1].includes(text('quest.glyph.' + learned.glyph))); assert.match(note.lines[1], /third/);
  assert.match(hollowPickupNote({ ...receipt, shard: 0 }, { known: [0] }).lines[1], /Eye.*first/);
  assert.deepEqual(q.view().known.filter(n => n !== null), [learned.glyph]);
});

test('receipts report only accepted inventory; refused crates have no note', () => {
  let fits = false;
  const loot = createHollowLoot({ seed: 3, grant: () => fits });
  const args = { theme: 'root', index: 0, count: 3, ammo: [{ id: 'ammo:.45', qty: 36 }] };
  assert.equal(hollowPickupNote(loot.claimCrate(args)), null);
  fits = true; const receipt = loot.claimCrate(args);
  const note = hollowPickupNote({ kind: 'crate', ...receipt });
  assert.deepEqual(note.lines, ['.45 ammunition × 36', 'MedPens × 1', 'Grenades × 1']);
  assert.equal(loot.claimCrate(args), null);
  assert.equal(hollowPickupNote({ kind: 'crate', items: [{ id: 'bogus', qty: 1 }] }), null);
});

function fixture() {
  const listeners = new Map();
  const node = tag => ({ tag, children: [], dataset: {}, attrs: {}, hidden: false, textContent: '',
    append(...els) { this.children.push(...els); }, setAttribute(k, v) { this.attrs[k] = v; }, remove() { this.removed = true; } });
  const doc = { body: node('body'), createElement: node };
  const host = { addEventListener: (k, fn) => listeners.set(k, fn), removeEventListener: k => listeners.delete(k) };
  let current = state(); const ui = mountHollows({ doc, host, getState: () => current });
  return { ui, listeners, set: s => current = s, current, root: doc.body.children[0], card: doc.body.children[1],
    send: detail => listeners.get('dw-game')({ detail }) };
}

test('mounted HUD refreshes battery without an event and hides on pause, surface and death', () => {
  const f = fixture(); f.ui.update(0.2); assert.equal(f.root.hidden, false);
  f.current.hush.battery = 17; f.ui.update(0.2); assert.match(f.root.children[2].textContent, /0:17/);
  f.current.active = false; f.ui.update(0.2); assert(f.root.hidden);
  f.current.active = true; f.current.hollow.below = false; f.ui.update(0.2); assert(f.root.hidden);
  f.ui.destroy(); assert(f.root.removed); assert(f.card.removed); assert.equal(f.listeners.size, 0);
});

test('rapid pickups queue without replacing a tag; duplicates, reset and leave are safe', () => {
  const f = fixture(); f.ui.update(0.2);
  const tag = { type: 'hollow-pickup', kind: 'tag', id: 'iron:0' };
  f.send(tag); f.send(tag);
  f.send({ type: 'hollow-pickup', kind: 'crate', receiptId: 'crate:1', items: [{ id: 'medkit', qty: 1 }] });
  assert.match(f.card.children[0].textContent, /SATO/);
  for (let i = 0; i < 61; i++) f.ui.update(0.2);
  assert.equal(f.card.children[0].textContent, 'Supplies recovered');
  f.send({ type: 'hollow', phase: 'leave' }); assert(f.card.hidden); assert(f.root.hidden);
  f.send({ type: 'run-reset', runId: 2 }); f.current.runId = 2; f.send(tag); assert.equal(f.card.hidden, false);
  f.current.active = false; f.ui.update(0.2); assert(f.card.hidden);
});

test('actual accepted-pickup boundary publishes only successful grants', () => {
  const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const start = source.indexOf('    function publishHollowPickup('), end = source.indexOf('    function claimHollowHere(', start);
  const events = []; const ctx = { hollow: { state: () => ({ cave: 3, theme: 'iron', depth: 2 }) }, publishUI: (type, data) => events.push({ type, ...data }) };
  runInNewContext(source.slice(start, end), ctx);
  ctx.publishHollowPickup({ kind: 'box' }, null); assert.equal(events.length, 0);
  ctx.publishHollowPickup({ kind: 'box' }, { receiptId: 'box:1', prize: { kind: 'blueprint', id: 'wall' }, shard: { place: 0 } });
  assert.equal(events.length, 1); assert.equal(events[0].shard, 0);
  const note = hollowPickupNote(events[0], { known: [0] });
  assert.match(note.lines[0], /Wall/); assert.match(note.lines[1], /Eye.*first/);
});
