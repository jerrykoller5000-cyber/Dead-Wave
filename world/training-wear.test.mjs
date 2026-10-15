// world/training-wear.test.mjs - GB-159: the Training Ground's wear is there, out of the way, and the place still builds.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../tools/tests/fakethree.mjs';
import { TRAINING, buildTrainingGround } from './training.js';
import { WEAR, dressTrainingWear } from './training-wear.js';

test('every kind of wear Jerry asked for is built', () => {
  const tg = buildTrainingGround(T);
  const p = new Set(tg.wear.parts);
  for (const k of ['wear-floor', 'wear-line-chips', 'wear-backstop', 'wear-far-wall', 'wear-wall-px', 'wear-wall-nx', 'wear-vent',
    'wear-locker-dented', 'wear-monitor-cracked', 'wear-monitor-tape', 'wear-rack-missing-hook', 'wear-cot-sagging', 'wear-mattress-stained',
    'wear-flicker-strip', 'wear-dead-strip', 'wear-sign-ears', 'wear-sign-muzzle', 'wear-sign-cease', 'wear-sign-forward', 'wear-days-board'])
    assert.ok(p.has(k), k);
  assert.equal(tg.wear.dead.length, WEAR.DEAD.length);
  assert.equal(tg.wear.flicker.name, 'training-wear-flicker', 'the flickering strip keeps its own mesh (not baked)');
});

test('visual only: rooms, targets and stations unchanged, decals are not solids', () => {
  const tg = buildTrainingGround(T);
  const O = TRAINING.ORIGIN;
  assert.equal(tg.walk.length, 3); assert.equal(tg.targets.length, 5);
  assert.ok(Math.abs(tg.walk[0].minX - (O.x + TRAINING.RANGE.minX + 0.42)) < 1e-9);
  // No solid sits on the firing line's spot behind lane 3 where he spawns.
  const s = tg.spawn;
  assert.ok(!tg.solids.some((b) => !b.wall && s.x > b.minX && s.x < b.maxX && s.z > b.minZ && s.z < b.maxZ && b.minY < O.y + 1.8), 'spawn clear');
  // Bed and its stand clear of the cot.
  assert.ok(!tg.solids.some((b) => b.prop !== false && !b.wall && tg.bed.stand.x > b.minX && tg.bed.stand.x < b.maxX && tg.bed.stand.z > b.minZ && tg.bed.stand.z < b.maxZ && b.minY < O.y + 1.5), 'wake stand clear');
});

test('the strip flickers only now and then, and goes out with the lights', () => {
  const tg = buildTrainingGround(T);
  const m = tg.wear.flicker.material;
  let offs = 0, frames = 0;
  for (let t = 0; t < 60; t += 1 / 60) { tg.update(1 / 60); frames++; if (m.emissiveIntensity < 0.1) offs++; }
  assert.ok(offs > 0, 'it flickered in a minute');
  assert.ok(offs / frames < 0.15, 'mostly on (' + offs + '/' + frames + ')');
  tg.setLights(false); tg.update(1 / 60);
  assert.equal(m.emissiveIntensity, 0);
  tg.setLights(true);
});

test('the lanes are not all used alike: one heavy, one barely touched', () => {
  const u = WEAR.LANE_USE;
  assert.equal(u.length, 5);
  assert.ok(Math.max(...u) >= 0.9 && Math.min(...u) <= 0.15, 'a favourite and a neglected lane');
  assert.equal(new Set(u).size, 5, 'no two lanes alike');
});

test('GB-160: every wear canvas draws without throwing (a stand-in 2D context), and the walls are drawn fine enough', () => {
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (/^create(Radial|Linear)Gradient$/.test(k) ? () => grad : (k === 'measureText' ? () => ({ width: 10 }) : () => {}))), set: (o, k, v) => { o[k] = v; return true; } });
  const sizes = [];
  const texture = (w, h, draw) => { assert.ok(w > 0 && h > 0 && w <= 4096 && h <= 4096, 'canvas size ' + w + 'x' + h); sizes.push([w, h]); draw(ctx, w, h); return {}; };
  const obj = () => ({ position: { set() {} }, rotation: { set() {}, x: 0, y: 0, z: 0 }, name: '' });
  const geo = class { constructor() { this.attributes = {}; } };
  const Tm = { PlaneGeometry: geo, BoxGeometry: geo, Group: class { constructor() { Object.assign(this, obj(), { add() {}, traverse() {} }); } } };
  const w = dressTrainingWear(Tm, { R: TRAINING.RANGE, B: TRAINING.BUILD, bedAt: { x: TRAINING.BUILD.minX + 3.15, z: TRAINING.BUILD.minZ + 2 },
    root: { add() {} }, add: obj, box: obj, std: () => ({ color: { copy() {}, setHex() {} } }), texture, lampMat: { color: {}, emissiveIntensity: 0.8 } });
  assert.ok(sizes.length >= 7, 'canvases drawn: ' + sizes.length);
  assert.ok(WEAR.WALL_PX >= 64, 'the backstop at 64 px a metre or more');
  assert.ok(w.parts.includes('wear-backstop') && w.parts.includes('wear-far-wall'));
});

// ---- GB-161
const fitCtx = () => {
  const grad = { addColorStop() {} }, drawn = [];
  const o = { font: '10px x', drawn };
  return new Proxy(o, { get: (t, k) => (k in t ? t[k] : k === 'measureText' ? (s) => ({ width: String(s).length * (parseFloat(/(\d+)px/.exec(t.font)?.[1]) || 10) * 0.6 })
    : k === 'fillText' ? (s, x) => drawn.push({ s, x, w: String(s).length * (parseFloat(/(\d+)px/.exec(t.font)?.[1]) || 10) * 0.6 })
    : /^create(Radial|Linear)Gradient$/.test(k) ? () => grad : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
};
const standIn = (tex) => {
  const obj = () => ({ position: { set() {} }, rotation: { set() {}, x: 0, y: 0, z: 0 }, name: '', add() {}, traverse() {} });
  const geo = class { constructor() { this.attributes = {}; } };
  return dressTrainingWear({ PlaneGeometry: geo, BoxGeometry: geo, Group: class { constructor() { Object.assign(this, obj()); } } },
    { R: TRAINING.RANGE, B: TRAINING.BUILD, bedAt: { x: TRAINING.BUILD.minX + 3.15, z: TRAINING.BUILD.minZ + 2 }, root: { add() {} },
      add: obj, box: obj, std: () => ({ color: { copy() {}, setHex() {} } }), texture: tex, lampMat: { color: {}, emissiveIntensity: 0.8 } });
};

test('GB-161: every line on the printed signs fits inside its margins (DANGER included)', () => {
  const ctx = fitCtx(); let sheet = null;
  standIn((w, h, draw) => { draw(ctx, w, h); if (w === 1024 && h === 1024) sheet = ctx; return {}; });
  assert.ok(sheet, 'the printed sheet was drawn');
  const long = ctx.drawn.find((d) => d.s === 'NO PERSONNEL FORWARD');
  assert.ok(long, 'the DANGER line is drawn');
  for (const d of ctx.drawn.filter((d) => ['CAUTION', 'WARNING', 'NOTICE', 'DANGER', 'EYE AND EAR', 'PROTECTION REQUIRED', 'KEEP MUZZLE', 'POINTED DOWNRANGE', 'CEASE FIRE', 'ON COMMAND', 'NO PERSONNEL FORWARD', 'OF FIRING LINE'].includes(d.s))) {
    const cell = Math.floor(d.x / 256) * 256;
    assert.ok(d.x - d.w / 2 >= cell + WEAR.SIGN_MARGIN - 0.5 && d.x + d.w / 2 <= cell + 256 - WEAR.SIGN_MARGIN + 0.5, d.s + ' fits (' + d.w.toFixed(0) + ' px)');
  }
});

test('GB-161: the locker bank blocks him, and the door swings when bumped, shot or cut, then settles ajar (never shut)', () => {
  const tg = buildTrainingGround(T), O = TRAINING.ORIGIN;
  const b = tg.solids.find((s) => s.block);
  assert.ok(b, 'a blocking solid for the bank');
  const mid = { x: (b.minX + b.maxX) / 2, y: O.y, z: (b.minZ + b.maxZ) / 2 };
  const k = tg.keepOut(mid, 0.35);
  assert.ok(k.moved && (k.z >= b.maxZ + 0.35 - 1e-9 || k.x <= b.minX - 0.35 + 1e-9 || k.x >= b.maxX + 0.35 - 1e-9), 'pushed out of the lockers');
  const away = tg.keepOut({ x: O.x, y: O.y, z: O.z }, 0.35); assert.equal(away.moved, false, 'nothing at the spawn');
  const d = tg.wear.door, D = WEAR.DOOR;
  const settle = () => { for (let i = 0; i < 60 * 8; i++) tg.update(1 / 60); };
  const swing = (fn) => { settle(); const a0 = d.angle; fn(); let peak = 0; for (let i = 0; i < 60; i++) { tg.update(1 / 60); peak = Math.max(peak, Math.abs(d.angle - a0)); } return peak; };
  // bump: walk him into the leaf's middle from the room side
  const tip = (f) => ({ x: O.x + d.hx + Math.cos(d.angle) * d.w * f, z: O.z + d.hz + Math.sin(d.angle) * d.w * f });
  assert.ok(swing(() => { const p = tip(0.6); tg.keepOut({ x: p.x + 0.4, y: O.y, z: p.z + 0.4 }, 0.35); tg.keepOut({ x: p.x + 0.1, y: O.y, z: p.z + 0.15 }, 0.35); }) > 0.05, 'bumped: it swings');
  assert.ok(swing(() => { const p = tip(0.7); tg.wear.hitDoor({ x: p.x, y: O.y + 1, z: p.z }, { x: 0, z: -1 }); }) > 0.1, 'shot: it swings');
  assert.ok(swing(() => { assert.ok(tg.wear.cutDoor({ x: O.x - 5.6, z: O.z - 10.6 }, { x: -0.3, z: -1 }, 1.2), 'the blade reaches it'); }) > 0.05, 'cut: it swings');
  let lo = Infinity; tg.wear.kickDoor(-40); for (let i = 0; i < 120; i++) { tg.update(1 / 60); lo = Math.min(lo, d.angle); }
  assert.ok(lo >= D.min - 1e-9, 'slammed, it stops short of shut');
  settle(); assert.ok(Math.abs(d.angle - D.rest) < 0.02, 'it comes to rest ajar');
  assert.ok(Math.abs(tg.wear.doorSolid.minX - (O.x + Math.min(d.hx, d.hx + Math.cos(d.angle) * d.w) - 0.03)) < 1e-6, 'its solid follows it');
  // the round tracer finds it
  const p = tip(0.5), s = tg.wear.doorSolid;
  assert.ok(p.x > s.minX && p.x < s.maxX && p.z > s.minZ && p.z < s.maxZ, 'the leaf inside its solid');
});

test('the range back wall keeps its tile when the camera goes behind it', () => {
  const tg = buildTrainingGround(T), O = TRAINING.ORIGIN;
  const st = () => tg.cutaway.state().find((e) => e.side === 'rangeSouth');
  assert.ok(st(), 'a rangeSouth entry in the cutaway');
  const player = { x: O.x, y: O.y, z: O.z - 6 };
  for (let i = 0; i < 60; i++) tg.cutaway.update({ x: O.x, y: O.y + 9, z: O.z - 18 }, player, 1 / 60);
  assert.ok(!st().hidden && st().opacity > 0.99, 'solid from behind the wall');
  for (let i = 0; i < 60; i++) tg.cutaway.update({ x: O.x, y: O.y + 3, z: O.z + 4 }, player, 1 / 60);
  assert.ok(!st().hidden && st().opacity > 0.99, 'solid from in front');
  let doorFades = false; tg.group.traverse((o) => { if (o.name === 'training-wear-locker-door' && o.parent && o.parent === tg.group) doorFades = true; });
  assert.ok(doorFades, 'the door stays in the room group (registered with the cutaway by name)');
});

test('GB-163: the lockers and their door are steel (sparks, no holes)', () => {
  const tg = buildTrainingGround(T);
  const metal = tg.solids.filter((s) => s.metal);
  assert.ok(metal.length >= 2, 'the bank and the door are metal (' + metal.length + ')');
  assert.ok(tg.wear.doorSolid.metal, 'the door');
  assert.ok(!tg.solids.some((s) => s.metal && (s.target != null || s.wall)), 'no target or wall marked steel');
});

test('the range back wall does not swap while the camera jitters on it', () => {
  const tg = buildTrainingGround(T), O = TRAINING.ORIGIN;
  const st = () => tg.cutaway.state().find((e) => e.side === 'rangeSouth');
  const player = { x: O.x, y: O.y, z: O.z - 8 };
  for (let i = 0; i < 40; i++) tg.cutaway.update({ x: O.x, y: O.y + 4, z: O.z - 14 }, player, 1 / 60);
  assert.ok(!st().hidden && st().opacity > 0.99, 'still the tile with the camera behind the wall');
  let flips = 0, last = st().hidden;
  for (let i = 0; i < 240; i++) {
    const cz = O.z - 12 + 0.6 + (i % 2 ? 0.08 : -0.08);
    tg.cutaway.update({ x: O.x, y: O.y + 4, z: cz }, player, 1 / 60);
    const h = st().hidden; if (h !== last) flips++; last = h;
  }
  assert.equal(flips, 0, 'no swap as the camera turns against the wall');
  assert.ok(st().opacity > 0.99, 'the tile stays');
});
