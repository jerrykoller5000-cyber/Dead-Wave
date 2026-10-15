import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createUI } from '../../../studio/inspector/ui.js';

class Element extends EventTarget {
  constructor(tag) { super(); this.tagName = tag.toUpperCase(); this.nodeType = 1; this.children = []; this.attrs = {}; this.dataset = {}; this.className = ''; this._text = ''; this.value = ''; this.style = {}; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'value') this.value = String(v); if (k === 'hidden') this.hidden = true; if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(v); }
  removeAttribute(k) { delete this.attrs[k]; }
  append(...kids) { for (const k of kids) { this.children.push(k); k.parent = this; } }
  prepend(k) { this.children.unshift(k); k.parent = this; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((k) => k !== this); }
  get textContent() { return this._text + this.children.map((k) => k.textContent || '').join(''); }
  set textContent(v) { this.children = []; this._text = String(v); }
  get options() { return this.children.filter((k) => k.tagName === 'OPTION'); }
  matches(selector) { return selector[0] === '.' ? this.className.split(/\s+/).includes(selector.slice(1)) : selector[0] === '[' ? Object.hasOwn(this.attrs, selector.slice(1, -1)) : this.tagName === selector.toUpperCase(); }
  querySelectorAll(selector) { return this.children.flatMap((k) => [...(k.matches && k.matches(selector) ? [k] : []), ...(k.querySelectorAll ? k.querySelectorAll(selector) : [])]); }
  closest(selector) { for (let k = this; k; k = k.parent) if (k.matches(selector)) return k; return null; }
  get classList() { const el = this; return { add(c) { this.toggle(c, true); }, remove(c) { this.toggle(c, false); }, toggle(c, force) { const a = new Set(el.className.split(/\s+/).filter(Boolean)); const on = force ?? !a.has(c); on ? a.add(c) : a.delete(c); el.className = [...a].join(' '); return on; } }; }
  scrollIntoView() {}
  focus() { document.activeElement = this; }
  blur() { document.activeElement = null; }
  click() { this.dispatchEvent(new Event('click')); }
}
class V3 { set() { return this; } project() { return this; } }
const tick = () => new Promise((r) => setImmediate(r));

function fixture() {
  const elements = [], storage = new Map([['dwi.collapsed', '{'], ['dwi.marineTab', 'gone']]); let now = 0, loop = true, getCount = 0;
  globalThis.document = { createElement: (tag) => { const e = new Element(tag); elements.push(e); return e; }, createTextNode: (t) => { const e = new Element('text'); e.textContent = t; return e; }, getElementById: () => null, head: new Element('head'), body: new Element('body'), activeElement: null };
  globalThis.localStorage = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async () => {} } } });
  globalThis.performance = { now: () => now };
  const entry = { id: 'marine', name: 'Marine', group: 'Marine', kind: 'marine' }, flags = new Map();
  const M = {
    MOVE_CATS: ['Test'], MOVES: [{ id: 'walk', name: 'Walk', cat: 'Test' }], move: null,
    get loop() { return loop; }, setLoop: (v) => { loop = v; }, stop: () => { M.move = null; }, home() {},
    unarmed: () => false, current: () => 'm4',
    state: () => ({ blade: 'knife', running: false, loop }), play: async (id) => { M.move = M.MOVES.find((m) => m.id === id); },
  };
  const ix = {
    T: { camera: {}, renderer: { domElement: { clientWidth: 1200, clientHeight: 800 }, info: {} } }, version: 'test', host: {}, THREE: { Vector3: V3 },
    GROUPS: ['Marine'], catalog: [entry], entry, marine: M,
    orbit: { attach() {}, state: () => ({ yaw: 0, pitch: 0, dist: 3 }), follow: () => false, fov: () => 35, view() {} },
    stage: { BACKDROPS: { studio: {} }, LIGHTS: { game: {} }, backdrop: () => 'studio', light: () => 'game', overlays: { get: (k) => { getCount++; return flags.get(k) || false; }, set: (k, v) => flags.set(k, v) } },
    clock: { paused: false, speed: () => 1 }, recorder: { frames: 0, span: () => 0, scrubbing: false }, scrubBack: () => 0,
    show: async () => {}, api: { cancel() {}, note: async () => ({ ok: true, file: 'notes.md' }) },
  };
  const subject = { info: () => ({ tris: 10, meshes: 1, materials: 1 }), focus: () => ({ center: {}, size: { x: 1, y: 2, z: 1 }, yaw: 0 }), entry };
  ix.subject = subject; const ui = createUI(ix); ui.subjectShown(entry, subject);
  return { ix, ui, M, elements, storage, advance: (ms) => { now += ms; }, gets: () => getCount };
}

test('the real UI boots with corrupted persisted groups and a removed tab', () => {
  const f = fixture(); assert.ok(f.elements.some((e) => e.className.includes('dwi-move')));
  const items = f.elements.filter((e) => e.className.includes('dwi-item')); assert.equal(items.length, 1); assert.equal(items[0].tagName, 'BUTTON');
  assert.equal(f.elements.find((e) => e.className.includes('dwi-group')).attrs['aria-expanded'], 'true');
});
test('loop checkbox keeps the real false readback after a refresh', async () => {
  const f = fixture(); const box = f.elements.find((e) => e.tagName === 'INPUT' && e.attrs.type === 'checkbox');
  box.checked = false; box.dispatchEvent(new Event('change')); await tick(); f.advance(200); f.ui.frame(0);
  assert.equal(f.M.loop, false); assert.equal(box.checked, false); assert.equal(box.disabled, false);
});
test('rebuilding View repeatedly does not retain obsolete refresh callbacks', async () => {
  const f = fixture();
  for (let n = 0; n < 100; n++) f.ui.key({ key: 'b', code: 'KeyB' });
  const box = f.elements.filter((e) => e.tagName === 'INPUT' && e.attrs.type === 'checkbox').at(-1);
  box.checked = true; box.dispatchEvent(new Event('change')); await tick(); f.advance(200); const start = f.gets(); f.ui.frame(0);
  assert.ok(f.gets() - start < 20, 'one live view refresh, rather than 100 obsolete panels: ' + (f.gets() - start));
});
test('a failed note and failed clipboard preserve the author’s text', async () => {
  const f = fixture(); f.ix.api.note = async () => { throw new Error('server unavailable'); }; navigator.clipboard.writeText = async () => { throw new Error('denied'); };
  const area = f.elements.find((e) => e.tagName === 'TEXTAREA'); area.value = 'left cuff clips';
  const save = f.elements.find((e) => e.tagName === 'BUTTON' && e.textContent === 'Save note (ctrl+Enter)'); save.click(); await tick();
  assert.equal(area.value, 'left cuff clips'); assert.ok(f.elements.find((e) => e.className.includes('dwi-toast')).textContent.includes('your text is still here'));
});
test('duplicate ctrl+Enter notes issue one save, and batch Escape cancels without a pose change', async () => {
  const f = fixture(); let resolve, calls = 0, cancelled = 0; f.ix.api.note = () => { calls++; return new Promise((r) => { resolve = r; }); }; f.ix.api.cancel = () => { cancelled++; };
  const area = f.elements.find((e) => e.tagName === 'TEXTAREA'); area.value = 'inspect this';
  const enter = () => { const event = new Event('keydown'); event.key = 'Enter'; event.ctrlKey = true; area.dispatchEvent(event); };
  enter(); enter(); assert.equal(calls, 1); resolve({ ok: true, file: 'notes.md' }); await tick();
  f.ix.busy = { label: 'Checking 5/10' }; f.ui.key({ key: ']', code: 'BracketRight' }); assert.equal(f.M.move, null);
  f.ui.key({ key: 'Escape', code: 'Escape' }); assert.equal(cancelled, 1);
});

test('Save setup downloads one versioned JSON recipe', async () => {
  const f = fixture(), recipe = { schema: 'dw-inspector-session', schemaVersion: 1, subject: { id: 'marine' } };
  f.ix.api.session = () => recipe;
  f.elements.find((e) => e.tagName === 'BUTTON' && e.textContent === 'Save setup').click(); await tick();
  const downloads = f.elements.filter((e) => e.tagName === 'A' && e.attrs.download);
  assert.equal(downloads.length, 1); assert.match(downloads[0].attrs.download, /^marine-setup-.*\.json$/);
  assert.deepEqual(JSON.parse(decodeURIComponent(downloads[0].attrs.href.split(',')[1])), recipe);
});
test('Load setup rejects oversized or malformed files before changing the current stage', async () => {
  const f = fixture(); let restores = 0, reads = 0;
  f.ix.api.restore = async () => { restores++; };
  const picker = f.elements.find((e) => e.tagName === 'INPUT' && e.attrs.type === 'file');
  picker.files = [{ size: 65537, text: async () => { reads++; return '{}'; } }]; picker.dispatchEvent(new Event('change')); await tick();
  assert.equal(reads, 0); assert.equal(restores, 0);
  picker.files = [{ size: 1, text: async () => '{' }]; picker.dispatchEvent(new Event('change')); await tick();
  assert.equal(restores, 0); assert.equal(f.ix.entry.id, 'marine'); assert.equal(picker.value, '');
  assert.ok(f.elements.find((e) => e.className.includes('dwi-toast')).textContent.includes('not valid JSON'));
});
test('Load setup passes valid JSON to the validated restore API and permits reloading the same file', async () => {
  const f = fixture(), recipe = { schema: 'dw-inspector-session', schemaVersion: 1 }; const received = [];
  f.ix.api.restore = async (value) => { received.push(value); };
  const picker = f.elements.find((e) => e.tagName === 'INPUT' && e.attrs.type === 'file');
  picker.files = [{ size: 64, text: async () => JSON.stringify(recipe) }]; picker.value = 'same.json';
  picker.dispatchEvent(new Event('change')); await tick(); assert.equal(picker.value, '');
  picker.dispatchEvent(new Event('change')); await tick(); assert.deepEqual(received, [recipe, recipe]);
  assert.ok(f.elements.find((e) => e.className.includes('dwi-toast')).textContent.includes('move restarts'));
});

test('focused native toggle/select/range and transport controls cannot bypass a busy stage lock', async () => {
  const f = fixture(); let mutations = 0; const loopSetter = f.M.setLoop;
  f.M.setLoop = (v) => { mutations++; loopSetter(v); };
  f.ix.stage.backdrop = (v) => { if (v != null) mutations++; return 'studio'; };
  f.ix.orbit.fov = (v) => { if (v != null) mutations++; return 35; };
  f.ix.orbit.view = () => { mutations++; }; f.ix.speed = () => { mutations++; }; f.ix.scrub = () => { mutations++; };
  f.ix.busy = { label: 'Saving exact review frame' };
  const checkbox = f.elements.find((e) => e.tagName === 'INPUT' && e.attrs.type === 'checkbox'); checkbox.checked = false; checkbox.dispatchEvent(new Event('change'));
  const backdrop = f.elements.find((e) => e.tagName === 'SELECT' && e.parent.children[0].textContent === 'Backdrop'); backdrop.value = 'off'; backdrop.dispatchEvent(new Event('change'));
  const lens = f.elements.find((e) => e.tagName === 'INPUT' && e.attrs.type === 'range' && e.parent.children[0].textContent === 'Lens (degrees)'); lens.value = 80; lens.dispatchEvent(new Event('input'));
  const speed = f.elements.find((e) => e.tagName === 'SELECT' && e.attrs.title === 'Speed (- =)'); speed.value = .05; speed.dispatchEvent(new Event('change'));
  const scrub = f.elements.find((e) => e.className === 'dwi-scrub'); scrub.value = 0; scrub.dispatchEvent(new Event('input'));
  const view = f.elements.find((e) => e.className === 'dwi-view-picker'); view.value = 'head'; view.dispatchEvent(new Event('change'));
  await tick(); assert.equal(mutations, 0); assert.equal(checkbox.checked, true); assert.equal(backdrop.value, 'studio'); assert.equal(lens.value, 35); assert.equal(speed.value, '1'); assert.equal(view.value, 'full');
});

test('failed asynchronous select and slider setters restore actual control readbacks while focused', async () => {
  const f = fixture();
  f.ix.stage.backdrop = (v) => { if (v != null) return Promise.reject(new Error('cannot change backdrop')); return 'studio'; };
  const backdrop = f.elements.find((e) => e.tagName === 'SELECT' && e.parent.children[0].textContent === 'Backdrop');
  backdrop.focus(); backdrop.value = 'off'; backdrop.dispatchEvent(new Event('change')); await tick(); assert.equal(backdrop.value, 'studio'); assert.equal(backdrop.disabled, false);
  f.ix.orbit.fov = (v) => { if (v != null) return Promise.reject(new Error('cannot change lens')); return 35; };
  const lens = f.elements.find((e) => e.tagName === 'INPUT' && e.attrs.type === 'range' && e.parent.children[0].textContent === 'Lens (degrees)');
  lens.focus(); lens.value = 80; lens.dispatchEvent(new Event('input')); await tick(); assert.equal(lens.value, 35); assert.equal(lens.parent.children[2].textContent, '35°');
});
