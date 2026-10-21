import assert from 'node:assert/strict';
import { createHeldPresentation } from '../../../studio/inspector/inspector.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS ' + name); };
function fixture() {
  const order = [], children = [], created = [];
  const src = { width: 800, height: 600, getBoundingClientRect: () => ({ left: 12, top: 8, width: 400, height: 300 }) };
  const g = { fillRect() {}, drawImage(value) { assert.equal(value, src); order.push('copy'); }, getImageData(...rect) { assert.deepEqual(rect, [0, 0, 1, 1]); order.push('readback'); return {}; } };
  const doc = { body: { append(c) { children.push(c); order.push('append'); } }, createElement(tag) {
    assert.equal(tag, 'canvas');
    const c = { width: 0, height: 0, style: {}, attrs: {}, getContext(type, options) { assert.equal(type, '2d'); assert.equal(options.willReadFrequently, true); return g; }, setAttribute(k, v) { this.attrs[k] = v; }, remove() { const i = children.indexOf(this); if (i >= 0) children.splice(i, 1); } };
    created.push(c); return c;
  } };
  return { ...createHeldPresentation({ renderer: { domElement: src } }, doc), src, g, doc, order, children, created };
}
test('held surface reads the actual renderer canvas before appending beneath the inspector', () => {
  const f = fixture(), c = f.presentFrame(); assert.deepEqual(f.order, ['copy', 'readback', 'append']); assert.deepEqual([c.width, c.height], [800, 600]);
  assert.deepEqual(c.style, { position: 'fixed', left: '12px', top: '8px', width: '400px', height: '300px', pointerEvents: 'none', zIndex: '1' });
  assert.deepEqual(c.attrs, { 'data-dwi-held-frame': 'true', 'aria-hidden': 'true' }); assert.equal(f.children.length, 1); assert.equal(f.src.width, 800);
});
test('replace and clear remove the held DOM canvas and release its backing memory', () => {
  const f = fixture(), a = f.presentFrame(), b = f.presentFrame(); assert.equal(f.children.length, 1); assert.equal(f.children[0], b); assert.deepEqual([a.width, a.height], [0, 0]);
  f.clearPresentation(); f.clearPresentation(); assert.equal(f.children.length, 0); assert.deepEqual([b.width, b.height], [0, 0]); assert.equal(f.src.width, 800);
});
test('held allocation rejects excessive, empty or non-finite pixels before creating a canvas', () => {
  for (const [width, height] of [[32768, 32768], [0, 600], [800, NaN], [Infinity, 1], [1.5, 1]]) {
    const f = fixture(); Object.assign(f.src, { width, height }); assert.throws(() => f.presentFrame(), /million pixels/); assert.equal(f.created.length, 0);
  }
});
test('held placement rejects invisible and non-finite viewport rectangles', () => {
  for (const rect of [{ left: NaN, top: 0, width: 5, height: 5 }, { left: 0, top: 0, width: 0, height: 5 }, { left: 0, top: 0, width: 5, height: Infinity }]) {
    const f = fixture(); f.src.getBoundingClientRect = () => rect; assert.throws(() => f.presentFrame(), /visible renderer/); assert.equal(f.created.length, 0);
  }
});
test('failed GPU readback never publishes a stale surface and releases its memory', () => {
  const f = fixture(); f.g.getImageData = () => { throw Error('GPU copy unavailable'); }; assert.throws(() => f.presentFrame(), /GPU copy/);
  assert.equal(f.children.length, 0); assert.deepEqual([f.created[0].width, f.created[0].height], [0, 0]); f.clearPresentation();
});
console.log('RESULT ' + passed + ' held presentation checks passed');
