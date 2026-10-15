import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { GameTestSlot } from '../game-test-slot.mjs';

async function fixture(t, { machine = 'test-pc' } = {}) {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), 'dw-slot-test-'));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  const alive = new Map();
  let now = Date.parse('2026-10-15T07:00:00.000Z');
  const slot = new GameTestSlot({
    stateDir,
    machine,
    clock: () => (now += 1000),
    isProcessAlive: pid => (alive.has(pid) ? alive.get(pid) : false),
    writeCrewLog: false,
  });
  return { slot, alive, stateDir };
}

test('grants live waiters in FIFO order and wakes the next waiter on release', async t => {
  const { slot, alive } = await fixture(t);
  alive.set(101, true);
  alive.set(102, true);

  const first = await slot.request({
    agent: 'chatgpt',
    task: 'GP-1',
    waitPid: 101,
    command: 'node first.mjs',
  });
  const second = await slot.request({
    agent: 'grokbot',
    task: 'GB-1',
    waitPid: 102,
    command: 'node second.mjs',
  });
  assert.equal(first.state.holder.agent, 'chatgpt');
  assert.deepEqual(second.state.queue.map(item => item.agent), ['grokbot']);

  const waiting = slot.waitForGrant(second.token, { reconcileMs: 20 });
  await slot.release(first.token, { pid: 101 });
  const grant = await waiting;
  assert.equal(grant.agent, 'grokbot');
  assert.equal(grant.task, 'GB-1');
});

test('Jerry enters ahead of queued agents but never preempts a live holder', async t => {
  const { slot, alive } = await fixture(t);
  for (const pid of [101, 102, 103, 104]) alive.set(pid, true);
  const holder = await slot.request({ agent: 'cursor', task: 'CU-1', waitPid: 101 });
  await slot.request({ agent: 'chatgpt', task: 'GP-1', waitPid: 102 });
  await slot.request({ agent: 'antigravity', task: 'AG-1', waitPid: 103 });
  const jerry = await slot.request({ agent: 'jerry', task: 'MANUAL', waitPid: 104 });

  assert.equal(jerry.state.holder.agent, 'cursor');
  assert.deepEqual(jerry.state.queue.map(item => item.agent), [
    'jerry',
    'chatgpt',
    'antigravity',
  ]);
  await slot.release(holder.token, { pid: 101 });
  assert.equal((await slot.status()).holder.agent, 'jerry');
});

test('Jerry keeps priority when his request also reclaims a dead holder', async t => {
  const { slot, alive } = await fixture(t);
  alive.set(101, true);
  alive.set(102, true);
  alive.set(103, true);
  await slot.request({ agent: 'cursor', task: 'CU-1', waitPid: 101 });
  await slot.request({ agent: 'grokbot', task: 'GB-1', waitPid: 102 });
  alive.set(101, false);

  const jerry = await slot.request({ agent: 'jerry', task: 'MANUAL', waitPid: 103 });
  assert.equal(jerry.state.holder.agent, 'jerry');
  assert.deepEqual(jerry.state.queue.map(item => item.agent), ['grokbot']);
});

test('blocks same-agent nested and concurrent requests', async t => {
  const { slot, alive } = await fixture(t);
  alive.set(101, true);
  alive.set(102, true);
  await slot.request({ agent: 'cursor', task: 'CU-1', waitPid: 101 });
  await assert.rejects(
    slot.request({ agent: 'cursor', task: 'CU-2', waitPid: 102 }),
    /already holds/,
  );

  await slot.request({ agent: 'chatgpt', task: 'GP-1', waitPid: 102 });
  alive.set(103, true);
  await assert.rejects(
    slot.request({ agent: 'chatgpt', task: 'GP-1', waitPid: 103 }),
    /live waiter/,
  );
  await assert.rejects(
    slot.request({ agent: 'chatgpt', task: 'GP-2', waitPid: 103 }),
    /already queued/,
  );
});

test('prepared requests retain FIFO metadata and can be activated later', async t => {
  const { slot, alive } = await fixture(t);
  const prepared = await slot.request({
    agent: 'grokbot',
    task: 'GB-7',
    checks: 'weapons contact sheet',
    minutes: 12,
    command: 'node tools/camera.mjs shot weapons',
  });
  assert.equal(prepared.state.holder, null);
  assert.equal(prepared.state.queue[0].ready, false);
  assert.equal(prepared.state.queue[0].checks, 'weapons contact sheet');
  assert.equal(prepared.state.queue[0].minutes, 12);

  alive.set(222, true);
  const activated = await slot.request({
    agent: 'grokbot',
    task: 'GB-7',
    waitPid: 222,
    command: 'node tools/camera.mjs shot weapons',
  });
  assert.equal(activated.id, prepared.id);
  assert.equal(activated.state.holder.agent, 'grokbot');
  assert.equal(activated.state.holder.pid, 222);
});

test('dead waiter becomes resumable instead of remaining falsely ready', async t => {
  const { slot, alive } = await fixture(t);
  alive.set(101, true);
  alive.set(102, true);
  await slot.request({ agent: 'cursor', task: 'CU-1', waitPid: 101 });
  const queued = await slot.request({
    agent: 'grokbot',
    task: 'GB-7',
    waitPid: 102,
    command: 'mock-batch',
  });
  alive.set(102, false);

  const dormant = await slot.status();
  assert.equal(dormant.queue[0].id, queued.id);
  assert.equal(dormant.queue[0].ready, false);
  assert.equal(dormant.queue[0].pid, null);
});

test('does not reclaim on time or unknown liveness', async t => {
  const { slot, alive } = await fixture(t);
  alive.set(101, true);
  const holder = await slot.request({ agent: 'cursor', task: 'CU-1', waitPid: 101 });
  alive.set(101, null);

  for (let index = 0; index < 4; index += 1) {
    const state = await slot.status();
    assert.equal(state.holder.agent, 'cursor');
  }
  assert.equal((await slot.rawStateForTests()).holder.token, holder.token);
});

test('stale ownership is reclaimed only after every recorded PID is proven gone', async t => {
  const { slot, alive } = await fixture(t);
  alive.set(101, true);
  alive.set(201, true);
  alive.set(102, true);
  const first = await slot.request({ agent: 'cursor', task: 'CU-1', waitPid: 101 });
  const reservation = await slot.reserveGameProcess(first.token, 'Chrome');
  await slot.registerProcess(first.token, 201, 'Chrome', reservation);
  await slot.request({ agent: 'chatgpt', task: 'GP-1', waitPid: 102 });

  alive.set(101, false);
  assert.equal((await slot.status()).holder.agent, 'cursor');
  alive.set(201, false);
  assert.equal((await slot.status()).holder.agent, 'chatgpt');
});

test('release refuses while an owned browser PID is alive or unproven', async t => {
  const { slot, alive } = await fixture(t);
  alive.set(101, true);
  alive.set(201, true);
  const lease = await slot.request({ agent: 'cursor', task: 'CU-1', waitPid: 101 });
  const reservation = await slot.reserveGameProcess(lease.token, 'Chrome');
  await slot.registerProcess(lease.token, 201, 'Chrome', reservation);

  await assert.rejects(slot.release(lease.token, { pid: 101 }), /cannot release.*Chrome PID 201/);
  alive.set(201, false);
  assert.equal(await slot.release(lease.token, { pid: 101 }), true);
  assert.equal((await slot.status()).holder, null);
});

test('only the controller can release and only a valid token can register', async t => {
  const { slot, alive } = await fixture(t);
  alive.set(101, true);
  const lease = await slot.request({ agent: 'cursor', task: 'CU-1', waitPid: 101 });

  await assert.rejects(slot.release(lease.token, { pid: 999 }), /only controller PID 101/);
  await assert.rejects(slot.registerProcess('wrong-token', 201, 'Chrome'), /active game-test lease/);
  assert.equal(await slot.release(lease.token, { pid: 101 }), true);
});

test('one lease cannot reserve or register overlapping game instances', async t => {
  const { slot, alive } = await fixture(t);
  alive.set(101, true);
  alive.set(201, true);
  alive.set(202, true);
  alive.set(process.pid, true);
  const lease = await slot.request({ agent: 'cursor', task: 'CU-1', waitPid: 101 });
  const reservation = await slot.reserveGameProcess(lease.token, 'Chrome');
  await assert.rejects(
    slot.reserveGameProcess(lease.token, 'Edge'),
    /another game launch is already reserved/,
  );
  await slot.registerProcess(lease.token, 201, 'Chrome', reservation);

  await assert.rejects(
    slot.reserveGameProcess(lease.token, 'Edge', 999),
    /one game instance already exists/,
  );
  await assert.rejects(
    slot.registerProcess(lease.token, 202, 'Edge'),
    /was not reserved/,
  );
});

test('waiter observes a grant made during stale-holder reconciliation', async t => {
  const { slot, alive } = await fixture(t);
  alive.set(101, true);
  alive.set(102, true);
  await slot.request({ agent: 'cursor', task: 'CU-1', waitPid: 101 });
  const next = await slot.request({ agent: 'chatgpt', task: 'GP-1', waitPid: 102 });
  alive.set(101, false);

  const grant = await slot.waitForGrant(next.token, { reconcileMs: 20 });
  assert.equal(grant.agent, 'chatgpt');
  assert.equal(grant.task, 'GP-1');
});

test('controller transfer replaces the prior controller PID regardless of its role label', async t => {
  const { slot, alive } = await fixture(t);
  for (const pid of [101, 201, 301]) alive.set(pid, true);
  const lease = await slot.request({ agent: 'cursor', task: 'CU-1', waitPid: 101 });
  await slot.adoptController(lease.token, 201, 'camera daemon');
  await slot.adoptController(lease.token, 301, 'replacement daemon');

  const raw = await slot.rawStateForTests();
  assert.equal(raw.holder.controllerPid, 301);
  assert.deepEqual(raw.holder.processes.map(item => item.pid), [301]);
});

test('queued owner can cancel itself but cannot cancel another owner', async t => {
  const { slot, alive } = await fixture(t);
  alive.set(101, true);
  await slot.request({ agent: 'cursor', task: 'CU-1', waitPid: 101 });
  const queued = await slot.request({ agent: 'chatgpt', task: 'GP-1' });

  await assert.rejects(
    slot.cancel({ agent: 'grokbot', id: queued.id }),
    /cannot cancel chatgpt/,
  );
  const canceled = await slot.cancel({ agent: 'chatgpt', id: queued.id });
  assert.equal(canceled.task, 'GP-1');
  assert.equal((await slot.status()).queue.length, 0);
});

test('concurrent atomic requests are neither lost nor duplicated', async t => {
  const { slot, alive } = await fixture(t);
  const requests = Array.from({ length: 12 }, (_, index) => {
    const pid = 500 + index;
    alive.set(pid, true);
    return slot.request({
      agent: `agent-${index}`,
      task: `T-${index}`,
      waitPid: pid,
      command: `mock-job-${index}`,
    });
  });
  await Promise.all(requests);
  const state = await slot.status();
  assert.equal(1 + state.queue.length, 12);
  assert.equal(new Set([state.holder.id, ...state.queue.map(item => item.id)]).size, 12);
});

test('state is isolated per computer and exposes exact audit fields without lease tokens', async t => {
  const firstFixture = await fixture(t, { machine: 'jerry-pc' });
  const secondFixture = await fixture(t, { machine: 'claude-cloud' });
  firstFixture.alive.set(101, true);
  secondFixture.alive.set(201, true);

  const local = await firstFixture.slot.request({
    agent: 'cursor',
    task: 'CU-146',
    checks: 'mocked queue checks',
    minutes: 5,
    command: 'node --test tools/tests/game-test-slot.test.mjs',
    waitPid: 101,
  });
  const cloud = await secondFixture.slot.request({
    agent: 'claude',
    task: 'CL-198',
    checks: 'fabric inspector',
    minutes: 8,
    command: 'node tools/camera.mjs check marine',
    waitPid: 201,
  });

  assert.equal(local.state.computer, 'jerry-pc');
  assert.equal(cloud.state.computer, 'claude-cloud');
  assert.equal(local.state.holder.command, 'node --test tools/tests/game-test-slot.test.mjs');
  assert.equal(local.state.holder.checks, 'mocked queue checks');
  assert.equal(local.state.holder.pid, 101);
  assert.ok(local.state.holder.queuedAt);
  assert.ok(local.state.holder.startedAt);
  assert.equal(JSON.stringify(local.state).includes(local.token), false);
});

test('recovers the last complete state generation after a torn state write', async t => {
  const { slot, alive, stateDir } = await fixture(t);
  alive.set(101, true);
  await slot.request({ agent: 'cursor', task: 'CU-146', waitPid: 101 });
  await slot.status(); // creates the Windows recovery generation
  await writeFile(path.join(stateDir, 'state.json'), '{"version":', 'utf8');

  const recovered = await slot.status({ reconcile: false });
  assert.equal(recovered.holder.agent, 'cursor');
  assert.equal(recovered.holder.task, 'CU-146');
});
