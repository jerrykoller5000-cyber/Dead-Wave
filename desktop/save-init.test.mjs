// CU-149: a reload must not put the launch snapshot back over newer localStorage values.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('./src-tauri/src/save-init.js', import.meta.url), 'utf8');

function boot(localData, sessionData, seed) {
  const invokes = [];
  function Storage(data) { this._data = data; }
  Storage.prototype.getItem = function (k) { return this._data.has(String(k)) ? this._data.get(String(k)) : null; };
  Storage.prototype.setItem = function (k, v) { this._data.set(String(k), String(v)); };
  Storage.prototype.removeItem = function (k) { this._data.delete(String(k)); };
  Storage.prototype.clear = function () { this._data.clear(); };
  const localStorage = new Storage(localData);
  const sessionStorage = new Storage(sessionData);
  const window = {
    __TAURI_INTERNALS__: { invoke: (cmd, args) => { invokes.push({ cmd, args }); return null; } },
    addEventListener() {},
  };
  vm.runInContext(src.replace('__DW_SEED__', JSON.stringify(seed)), vm.createContext({
    window, Storage, localStorage, sessionStorage,
  }));
  return { localStorage, invokes };
}

test('a reload keeps newer values and a removed key', () => {
  const local = new Map();
  const session = new Map();
  const launch = { tt_a: 'old', tt_b: 'keep' };
  const first = boot(local, session, launch);
  assert.equal(first.localStorage.getItem('tt_a'), 'old');
  assert.equal(first.localStorage.getItem('tt_b'), 'keep');
  assert.equal(session.get('dw_desktop_booted'), '1');
  assert.equal(first.invokes.length, 0);

  first.localStorage.setItem('tt_a', 'new');
  first.localStorage.setItem('tt_c', 'fresh');
  first.localStorage.removeItem('tt_b');
  assert.deepEqual(first.invokes.map((c) => c.cmd), ['save_set', 'save_set', 'save_remove']);

  const reloaded = boot(local, session, launch);
  assert.equal(reloaded.localStorage.getItem('tt_a'), 'new');
  assert.equal(reloaded.localStorage.getItem('tt_c'), 'fresh');
  assert.equal(reloaded.localStorage.getItem('tt_b'), null);
  assert.equal(reloaded.invokes.length, 0);
});

test('a new window seeds from the profile file again', () => {
  const local = new Map([['tt_a', 'stale'], ['tt_extra', 'webview']]);
  const session = new Map();
  const opened = boot(local, session, { tt_a: 'fromfile' });
  assert.equal(opened.localStorage.getItem('tt_a'), 'fromfile');
  assert.equal(opened.localStorage.getItem('tt_extra'), null);
  assert.equal(session.get('dw_desktop_booted'), '1');
});
