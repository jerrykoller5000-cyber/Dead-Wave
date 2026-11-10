// CL-347 (Jerry, 10 Nov 2026: "If the bottleneck is available test slots I give you guys the authority to open as many
// as you think is feasible without cooking the machine"): more than one lease at a time, each still one game, and only
// while the computer has the room. Mocked processes and a mocked computer; no browser.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { GameTestSlot, SLOT_DEFAULTS, autoSlots, loadSlotLimits } from '../game-test-slot.mjs';

const RTX = { name: 'NVIDIA GeForce RTX 5080', vramTotalGB: 16, vramFreeGB: 14, tempC: 52 };

async function fixture(t, { slots = 3, limits = {}, machine, room } = {}) {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), 'dw-slot-multi-'));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  const alive = new Map();
  const clock = { now: Date.parse('2026-11-10T18:00:00.000Z') };
  const computer = {
    machine: machine || { totalGB: 64, cpus: 24, gpu: RTX },
    room: room || { freeGB: 40, cpuBusy: 0.2, gpu: { ...RTX } },
    samples: 0,
  };
  const slot = new GameTestSlot({
    stateDir,
    machine: 'jerry-pc',
    clock: () => (clock.now += 1),
    isProcessAlive: pid => (alive.has(pid) ? alive.get(pid) : false),
    writeCrewLog: false,
    slots,
    limits: { staggerSec: 0, sampleSec: 0, ...limits },
    probe: {
      machine: async () => computer.machine,
      sample: async () => {
        computer.samples += 1;
        return computer.room;
      },
    },
  });
  const ask = async (agent, task, pid, extra = {}) => {
    alive.set(pid, true);
    return slot.request({ agent, task, waitPid: pid, ...extra });
  };
  return { slot, alive, clock, computer, ask, stateDir };
}

const holding = state => state.holders.map(h => h.agent);

test('with room, up to the slots run at once; the next waits in line', async t => {
  const { slot, ask } = await fixture(t);
  await ask('chatgpt', 'GP-1', 101);
  await ask('chatgpt2', 'GT-1', 102);
  await ask('claude3', 'CC-1', 103);
  const fourth = await ask('antigravity', 'AG-1', 104);
  assert.deepEqual(holding(fourth.state), ['chatgpt', 'chatgpt2', 'claude3']);
  assert.equal(fourth.state.holder.agent, 'chatgpt', 'holder is the first lease, for older readers');
  assert.deepEqual(fourth.state.queue.map(q => q.agent), ['antigravity']);
  assert.match(fourth.state.slots.next.why, /3 of 3 in use/);
  assert.equal(JSON.stringify(fourth.state).includes(fourth.token), false, 'no lease token is public');
});

test('a release frees a slot for the next in line, and each lease checks only its own token', async t => {
  const { slot, ask } = await fixture(t, { slots: 2 });
  const a = await ask('chatgpt', 'GP-1', 101);
  const b = await ask('chatgpt2', 'GT-1', 102);
  const c = await ask('claude3', 'CC-1', 103);
  assert.equal((await slot.assertHeld(b.token)).agent, 'chatgpt2');
  await assert.rejects(slot.assertHeld(c.token), /not active/);
  assert.equal(await slot.release(a.token, { pid: 101 }), true);
  const state = await slot.status();
  assert.deepEqual(holding(state), ['chatgpt2', 'claude3']);
  assert.equal((await slot.assertHeld(c.token)).task, 'CC-1');
});

test('each lease may run its own game, and still only one', async t => {
  const { slot, ask, alive } = await fixture(t, { slots: 2 });
  const a = await ask('chatgpt', 'GP-1', 101);
  const b = await ask('chatgpt2', 'GT-1', 102);
  alive.set(201, true);
  alive.set(202, true);
  const ra = await slot.reserveGameProcess(a.token, 'Chrome', process.pid);
  await slot.registerProcess(a.token, 201, 'Chrome', ra);
  const rb = await slot.reserveGameProcess(b.token, 'Chrome', process.pid);
  await slot.registerProcess(b.token, 202, 'Chrome', rb);
  await assert.rejects(slot.reserveGameProcess(a.token, 'Chrome', process.pid), /one game instance already exists/);
  const state = await slot.status();
  assert.deepEqual(state.holders.map(h => h.processes.map(p => p.pid)), [[101, 201], [102, 202]]);
});

test('Jerry has the computer alone: nothing new starts while he waits, and he waits only for what runs', async t => {
  const { slot, ask } = await fixture(t);
  const a = await ask('chatgpt', 'GP-1', 101);
  const b = await ask('chatgpt2', 'GT-1', 102);
  const jerry = await ask('jerry', 'MANUAL-GAME', 900);
  const after = await ask('claude3', 'CC-1', 103);
  assert.deepEqual(holding(after.state), ['chatgpt', 'chatgpt2']);
  assert.deepEqual(after.state.queue.map(q => q.agent), ['jerry', 'claude3']);
  assert.match(after.state.slots.next.why, /jerry MANUAL-GAME waits for the running checks/);
  await slot.release(a.token, { pid: 101 });
  assert.deepEqual(holding(await slot.status()), ['chatgpt2'], 'a freed slot is not given to the agent behind Jerry');
  await slot.release(b.token, { pid: 102 });
  let state = await slot.status();
  assert.deepEqual(holding(state), ['jerry']);
  assert.match(state.slots.next.why, /jerry MANUAL-GAME has the computer to itself/);
  await slot.release(jerry.token, { pid: 900 });
  state = await slot.status();
  assert.deepEqual(holding(state), ['claude3']);
});

test('an exclusive lease (a timing bench) waits for the others and then runs alone', async t => {
  const { slot, ask } = await fixture(t);
  const a = await ask('chatgpt', 'GP-1', 101);
  const bench = await ask('antigravity', 'AG-158', 104, { exclusive: true });
  await ask('chatgpt2', 'GT-1', 102);
  let state = await slot.status();
  assert.deepEqual(holding(state), ['chatgpt']);
  assert.equal(state.queue[0].exclusive, true);
  await slot.release(a.token, { pid: 101 });
  state = await slot.status();
  assert.deepEqual(holding(state), ['antigravity']);
  assert.equal(state.holders[0].exclusive, true);
  await slot.release(bench.token, { pid: 104 });
  assert.deepEqual(holding(await slot.status()), ['chatgpt2']);
});

test('no second start without the room: memory, cores, the card\'s memory and its heat', async t => {
  const { slot, ask, computer } = await fixture(t);
  await ask('chatgpt', 'GP-1', 101);
  const cases = [
    [{ freeGB: 8, cpuBusy: 0.2, gpu: { ...RTX } }, /memory: 8 GB free/],
    [{ freeGB: 40, cpuBusy: 0.9, gpu: { ...RTX } }, /cores 90% busy/],
    [{ freeGB: 40, cpuBusy: 0.2, gpu: { ...RTX, vramFreeGB: 3 } }, /graphics memory: 3 GB free/],
    [{ freeGB: 40, cpuBusy: 0.2, gpu: { ...RTX, tempC: 84 } }, /graphics card at 84 °C/],
  ];
  computer.room = cases[0][0];
  await ask('chatgpt2', 'GT-1', 102);
  for (const [room, why] of cases) {
    computer.room = room;
    const state = await slot.status();
    assert.deepEqual(holding(state), ['chatgpt'], `held back by ${why}`);
    assert.match(state.slots.next.why, why);
  }
  computer.room = { freeGB: 40, cpuBusy: 0.2, gpu: { ...RTX } };
  const state = await slot.status();
  assert.deepEqual(holding(state), ['chatgpt', 'chatgpt2']);
  assert.ok(state.slots.sample.freeGB === 40);
});

test('starts are staggered: one new game per staggerSec', async t => {
  const { slot, ask, clock } = await fixture(t, { limits: { staggerSec: 30 } });
  await ask('chatgpt', 'GP-1', 101);
  await ask('chatgpt2', 'GT-1', 102);
  let state = await slot.status();
  assert.deepEqual(holding(state), ['chatgpt']);
  assert.match(state.slots.next.why, /still starting/);
  clock.now += 31_000;
  state = await slot.status();
  assert.deepEqual(holding(state), ['chatgpt', 'chatgpt2']);
});

test('a reclaimed lease (a crash) puts the computer back to one at a time for backoffMin', async t => {
  const { slot, ask, alive, clock } = await fixture(t, { limits: { backoffMin: 20 } });
  await ask('chatgpt', 'GP-1', 101);
  await ask('chatgpt2', 'GT-1', 102);
  alive.set(101, false);
  await ask('claude3', 'CC-1', 103);
  let state = await slot.status();
  assert.deepEqual(holding(state), ['chatgpt2'], 'the dead lease is gone; the computer is down to one');
  assert.ok(state.slots.backoffUntil);
  assert.match(state.slots.next.why, /one at a time after a reclaim/);
  clock.now += 21 * 60_000;
  state = await slot.status();
  assert.deepEqual(holding(state), ['chatgpt2', 'claude3']);
});

test('one lease per agent, as before', async t => {
  const { slot, ask } = await fixture(t);
  await ask('chatgpt', 'GP-1', 101);
  await assert.rejects(ask('chatgpt', 'GP-2', 111), /already holds the game-test slot for GP-1/);
});

test('the default is one at a time: a slot made without slots never asks the computer', async t => {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), 'dw-slot-multi-'));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  let asked = 0;
  const alive = new Map([[101, true], [102, true]]);
  const slot = new GameTestSlot({
    stateDir,
    machine: 'test-pc',
    isProcessAlive: pid => alive.get(pid) ?? false,
    writeCrewLog: false,
    probe: { machine: async () => (asked++, { totalGB: 64, cpus: 24, gpu: RTX }), sample: async () => (asked++, {}) },
  });
  await slot.request({ agent: 'chatgpt', task: 'GP-1', waitPid: 101 });
  const second = await slot.request({ agent: 'chatgpt2', task: 'GT-1', waitPid: 102 });
  assert.deepEqual(holding(second.state), ['chatgpt']);
  assert.equal(asked, 0);
});

test('auto slots come from the computer and never pass hardMax; no readable graphics card means one', () => {
  const L = { ...SLOT_DEFAULTS };
  assert.equal(autoSlots(L, { totalGB: 64, cpus: 24, gpu: RTX }), 3);
  assert.equal(autoSlots(L, { totalGB: 32, cpus: 16, gpu: RTX }), 3);
  assert.equal(autoSlots(L, { totalGB: 16, cpus: 16, gpu: RTX }), 1, 'memory-bound');
  assert.equal(autoSlots(L, { totalGB: 64, cpus: 8, gpu: RTX }), 2, 'core-bound');
  assert.equal(autoSlots(L, { totalGB: 64, cpus: 24, gpu: { ...RTX, vramTotalGB: 6 } }), 1, 'card-bound');
  assert.equal(autoSlots(L, { totalGB: 64, cpus: 24, gpu: null }), 1);
  assert.equal(autoSlots(L, null), 1);
  assert.equal(autoSlots({ ...L, slots: 2 }, { totalGB: 8, cpus: 2, gpu: null }), 2, 'a number is used as given');
  assert.equal(autoSlots({ ...L, slots: 40 }, null), 6, 'but never over six');
});

test('the config file and DW_GAME_TEST_SLOTS override the defaults', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dw-slot-cfg-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.deepEqual(loadSlotLimits(root, {}), { ...SLOT_DEFAULTS });
  await import('node:fs/promises').then(fs => fs.mkdir(path.join(root, 'tools')));
  await writeFile(path.join(root, 'tools', 'game-test-slot.config.json'), '{"slots": 2, "maxGpuTempC": 75}');
  const L = loadSlotLimits(root, {});
  assert.equal(L.slots, 2);
  assert.equal(L.maxGpuTempC, 75);
  assert.equal(loadSlotLimits(root, { DW_GAME_TEST_SLOTS: '1' }).slots, 1);
  assert.equal(loadSlotLimits(root, { DW_GAME_TEST_SLOTS: 'auto' }).slots, 'auto');
});

test('a waiter from before CL-347 (one `holder`) and this copy share the state', async t => {
  const { slot, ask, alive, stateDir } = await fixture(t);
  const a = await ask('chatgpt', 'GP-1', 101);
  const b = await ask('chatgpt2', 'GT-1', 102);
  await ask('claude3', 'CC-1', 103);
  const file = path.join(stateDir, 'state.json');
  // the old copy releases the lease it sees (holders[0]): `holder` goes null, the rest is kept as it was
  let raw = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(raw.holder.token, a.token);
  raw.holder = null;
  await writeFile(file, JSON.stringify(raw));
  let state = await slot.status({ reconcile: false });
  assert.deepEqual(holding(state), ['chatgpt2', 'claude3']);
  // in one change, the old copy releases what it sees and grants its own waiter: the one gone, the other added
  await slot.status();
  raw = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(raw.holder.token, b.token);
  alive.set(150, true);
  raw.holder = { ...raw.holder, id: 'old', token: 'old-token', agent: 'claude2', task: 'CB-1', controllerPid: 150, processes: [{ pid: 150, role: 'controller' }] };
  await writeFile(file, JSON.stringify(raw));
  state = await slot.status();
  assert.deepEqual(holding(state), ['claude2', 'claude3']);
  // and what the old copy registers on its lease is kept
  raw = JSON.parse(await readFile(file, 'utf8'));
  raw.holder.processes.push({ pid: 151, role: 'Chrome' });
  alive.set(151, true);
  await writeFile(file, JSON.stringify(raw));
  state = await slot.status();
  assert.deepEqual(state.holders[0].processes.map(p => p.pid), [150, 151]);
});
