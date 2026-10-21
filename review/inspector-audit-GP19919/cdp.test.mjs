import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
// Execute the actual protocol class; no browser required to prove timer cleanup and disconnect behavior.
function fixture() {
  const source = fs.readFileSync('tools/cdp.mjs', 'utf8'), timers = new Map(); let next = 0;
  const Connection = vm.runInNewContext(source.slice(source.indexOf('class Connection {'), source.indexOf('\nclass Page {')) + '\nConnection;', {
    setTimeout: (f) => { timers.set(++next, f); return next; }, clearTimeout: (id) => timers.delete(id), JSON, Map, Error
  });
  const handlers = new Map(), socket = { addEventListener: (name, fn) => handlers.set(name, fn), send: (data) => { socket.last = JSON.parse(data); } };
  return { conn: new Connection(socket), socket, timers, emit: (name, data) => handlers.get(name)({ data: JSON.stringify(data) }) };
}
test('a successful CDP reply clears its long deadline and pending request', async () => {
  const f = fixture(), p = f.conn.send('Runtime.evaluate', {}, 'page', 3600000); assert.equal(f.timers.size, 1);
  f.emit('message', { id: f.socket.last.id, result: { ok: true } }); assert.deepEqual(await p, { ok: true }); assert.equal(f.timers.size, 0); assert.equal(f.conn.pending.size, 0);
});
test('protocol errors clear deadlines as well', async () => {
  const f = fixture(), p = f.conn.send('Page.captureScreenshot'); f.emit('message', { id: f.socket.last.id, error: { message: 'capture failed' } });
  await assert.rejects(p, /capture failed/); assert.equal(f.timers.size, 0);
});
test('disconnect rejects pending work and releases its timers', async () => {
  const f = fixture(), p = f.conn.send('Page.enable'), p2 = f.conn.send('Runtime.enable'); const a = assert.rejects(p, /connection closed/), b = assert.rejects(p2, /connection closed/);
  f.emit('close'); await Promise.all([a, b]); assert.equal(f.timers.size, 0); assert.equal(f.conn.pending.size, 0);
});
test('synchronous socket send failure cannot leave a timer or pending request', async () => {
  const f = fixture(); f.socket.send = () => { throw new Error('socket gone'); }; await assert.rejects(f.conn.send('Page.enable'), /socket gone/);
  assert.equal(f.timers.size, 0); assert.equal(f.conn.pending.size, 0);
});
