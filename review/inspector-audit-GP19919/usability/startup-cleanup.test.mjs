import assert from 'node:assert/strict';
import test from 'node:test';
import { Engine } from '../../../tools/camera.mjs';
import { boot, clearFailedBootState } from '../../../studio/inspector/inspector.js';

// Evaluate the real exported class with lexical IO collaborators replaced. No source branch or assertion is rewritten.
function engineFixture(failAt, failClose = false) {
  const closed = { server: 0, browser: 0 };
  const server = { close: async () => { closed.server++; } };
  const browser = { newPage: async () => { if (failAt === 'page') throw Error('page startup failed'); return {}; }, close: async () => { closed.browser++; if (failClose) throw Error('browser already gone'); } };
  const serve = async () => { if (failAt === 'server') throw Error('server startup failed'); return server; };
  const launch = async () => { if (failAt === 'browser') throw Error('browser startup failed'); return browser; };
  const FixtureEngine = new Function('serve', 'launch', 'ROOT', 'sizeOf', 'sleep', 'return (' + Engine.toString() + ')')(serve, launch, '.', (value) => new Engine({ size: value }).size, async () => {});
  const engine = new FixtureEngine({ soft: true }); engine.load = async () => { if (failAt === 'load') throw Error('load startup failed'); };
  return { engine, closed };
}
for (const [stage, expected] of [['server', { server: 0, browser: 0 }], ['browser', { server: 1, browser: 0 }], ['page', { server: 1, browser: 1 }], ['load', { server: 1, browser: 1 }]]) test('camera closes only owned resources after ' + stage + ' startup failure', async () => {
  const { engine, closed } = engineFixture(stage);
  await assert.rejects(engine.open(), new RegExp(stage + ' startup failed')); assert.deepEqual(closed, expected);
  assert.equal(engine.browser, null); assert.equal(engine.server, null); assert.equal(engine.page, null);
  await engine.close(); assert.deepEqual(closed, expected, 'caller retry/finally cannot close ownership twice');
});
test('a failed browser close does not mask the startup error or prevent server cleanup', async () => {
  const { engine, closed } = engineFixture('load', true);
  await assert.rejects(engine.open(), /load startup failed/); assert.deepEqual(closed, { server: 1, browser: 1 });
});
test('successful camera startup retains resources until explicit close', async () => {
  const { engine, closed } = engineFixture(null); assert.equal(await engine.open(), engine); assert.deepEqual(closed, { server: 0, browser: 0 });
  await engine.close(); assert.deepEqual(closed, { server: 1, browser: 1 });
});

class Element {
  constructor() { this.children = []; this.attrs = {}; this.classList = { add() {} }; }
  append(...nodes) { for (const node of nodes) { this.children.push(node); node.parent = this; } }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key] ?? null; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((node) => node !== this); }
}
function dom() {
  const body = new Element(), head = new Element();
  const nodes = (node) => [node, ...node.children.flatMap(nodes)];
  return { body, head, createElement: () => new Element(), getElementById: (id) => [...nodes(body), ...nodes(head)].find((node) => node.id === id) || null, find: (id) => nodes(body).filter((node) => node.id === id) };
}
test('validated boot retry removes the prior failure panel and stale error before initializing', async () => {
  const doc = dom(); globalThis.document = doc; globalThis.window = { TT: {}, addEventListener() {}, removeEventListener() {} };
  await assert.rejects(boot(null), /needs game host/); const oldRoot = doc.getElementById('dwi'); assert.ok(oldRoot); assert.ok(window.DWInspectError);
  const host = { version: 1, THREE: {}, scene: {}, builders: {}, data: {}, attach() {}, training: () => ({}), placePlayer() {}, render() {}, loop() {}, enterTraining() {
    assert.equal(window.DWInspectError, undefined); assert.equal(doc.getElementById('dwi'), null);
    throw Error('new initialization failure');
  } };
  await assert.rejects(boot(host), /new initialization failure/);
  assert.equal(doc.find('dwi').length, 1); assert.notEqual(doc.getElementById('dwi'), oldRoot); assert.match(window.DWInspectError, /new initialization failure/);
});
test('failure cleanup does not remove a healthy live inspector or an unowned root', () => {
  const doc = dom(), healthy = new Element(); healthy.id = 'dwi'; healthy.setAttribute('data-dwi-startup-error', 'true'); doc.body.append(healthy);
  const page = { DWInspect: { ready: true }, DWInspectError: 'keep until an explicit new lifecycle' };
  assert.equal(clearFailedBootState(doc, page), false); assert.equal(doc.getElementById('dwi'), healthy); assert.ok(page.DWInspectError);
  page.DWInspect.ready = false; healthy.attrs = {}; clearFailedBootState(doc, page); assert.equal(doc.getElementById('dwi'), healthy); assert.equal(page.DWInspectError, undefined);
});
