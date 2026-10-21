/**
 * Machine-wide game-test queue.
 *
 * The state and mutex live in the OS temp directory, not in the repository, so
 * a cloud workspace and Jerry's PC do not block each other.  Every official
 * game/browser launcher must either run through this CLI or validate the
 * DW_GAME_TEST_TOKEN that the CLI gives its child process.
 */
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { watch as watchFs } from 'node:fs';
import {
  appendFile,
  copyFile,
  mkdir,
  open,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(TOOLS_DIR, '..');
const STATE_VERSION = 1;
const MAX_EVENTS = 80;
const LOCK_RETRY_MS = 40;
const LOCK_WAIT_MS = 15_000;
const RECONCILE_MS = 5_000;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeMachineName(value) {
  return String(value || 'unknown-computer').replace(/[^a-zA-Z0-9_.-]+/g, '-');
}

function defaultStateDir(machine = os.hostname()) {
  const user = createHash('sha256')
    .update(`${os.homedir()}\0${process.getuid?.() ?? ''}`)
    .digest('hex')
    .slice(0, 10);
  return path.join(os.tmpdir(), `dead-wave-game-test-slot-${user}-${safeMachineName(machine)}`);
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function quoteCommandPart(part) {
  const value = String(part);
  if (/^[a-zA-Z0-9_./:\\=@+-]+$/.test(value)) return value;
  return `"${value.replaceAll('"', '\\"')}"`;
}

export function formatCommand(parts = process.argv) {
  return parts.map(quoteCommandPart).join(' ');
}

export function processLiveness(pid) {
  if (!Number.isInteger(Number(pid)) || Number(pid) <= 0) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') return false;
    if (error?.code === 'EPERM') return true;
    return null;
  }
}

function emptyState(machine, clock) {
  return {
    version: STATE_VERSION,
    computer: machine,
    updatedAt: nowIso(clock),
    holder: null,
    queue: [],
    events: [],
  };
}

function publicProcess(entry) {
  return {
    pid: entry.pid,
    role: entry.role,
    registeredAt: entry.registeredAt,
  };
}

function isGameProcessRole(role) {
  return /(?:browser|chrome|edge)/i.test(String(role || ''));
}

function publicRequest(entry, position) {
  return {
    id: entry.id,
    position,
    agent: entry.agent,
    task: entry.task,
    checks: entry.checks,
    minutes: entry.minutes,
    pid: entry.waitPid || null,
    command: entry.command,
    queuedAt: entry.queuedAt,
    ready: Boolean(entry.waitPid),
    priority: entry.priority || 'normal',
  };
}

export function publicState(state) {
  return {
    version: state.version,
    computer: state.computer,
    updatedAt: state.updatedAt,
    holder: state.holder
      ? {
          id: state.holder.id,
          agent: state.holder.agent,
          task: state.holder.task,
          checks: state.holder.checks,
          minutes: state.holder.minutes,
          pid: state.holder.controllerPid,
          command: state.holder.command,
          queuedAt: state.holder.queuedAt,
          startedAt: state.holder.startedAt,
          priority: state.holder.priority || 'normal',
          processes: (state.holder.processes || []).map(publicProcess),
          reservation: state.holder.gameReservation
            ? {
                pid: state.holder.gameReservation.pid,
                role: state.holder.gameReservation.role,
                reservedAt: state.holder.gameReservation.reservedAt,
              }
            : null,
        }
      : null,
    queue: state.queue.map((entry, index) => publicRequest(entry, index + 1)),
    events: (state.events || []).map(({ token: _token, ...entry }) => entry),
  };
}

export class GameTestSlot {
  constructor({
    stateDir = process.env.DW_GAME_TEST_STATE_DIR || defaultStateDir(),
    machine = os.hostname(),
    repoRoot = REPO_ROOT,
    clock = Date.now,
    isProcessAlive = processLiveness,
    isLockOwnerAlive = processLiveness,
    writeCrewLog = process.env.DW_GAME_TEST_NO_LOG !== '1',
  } = {}) {
    this.stateDir = stateDir;
    this.machine = machine;
    this.repoRoot = repoRoot;
    this.clock = clock;
    this.isProcessAlive = isProcessAlive;
    this.isLockOwnerAlive = isLockOwnerAlive;
    this.writeCrewLog = writeCrewLog;
    this.stateFile = path.join(stateDir, 'state.json');
    this.backupFile = path.join(stateDir, 'state.backup.json');
    this.lockFile = path.join(stateDir, 'state.lock');
  }

  async #ensureDir() {
    await mkdir(this.stateDir, { recursive: true });
  }

  async #readRawState() {
    let lastError = null;
    for (const candidate of [this.stateFile, this.backupFile]) {
      try {
        const parsed = JSON.parse(await readFile(candidate, 'utf8'));
        if (parsed?.version !== STATE_VERSION || parsed?.computer !== this.machine) {
          throw new Error(`unsupported game-test state in ${candidate}`);
        }
        parsed.queue ||= [];
        parsed.events ||= [];
        return parsed;
      } catch (error) {
        if (error?.code !== 'ENOENT') lastError = error;
      }
    }
    if (lastError) throw lastError;
    return emptyState(this.machine, this.clock);
  }

  async #writeRawState(state) {
    state.updatedAt = nowIso(this.clock);
    const temp = `${this.stateFile}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await copyFile(this.stateFile, this.backupFile).catch(error => {
      if (error?.code !== 'ENOENT') throw error;
    });
    if (process.platform !== 'win32') {
      await rename(temp, this.stateFile);
      return;
    }
    // Windows cannot replace an existing destination with rename. Keep the last
    // complete generation as a recovery journal, then install the complete temp.
    await unlink(this.stateFile).catch(error => {
      if (error?.code !== 'ENOENT') throw error;
    });
    let lastError;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        await rename(temp, this.stateFile);
        return;
      } catch (error) {
        lastError = error;
        if (!['EACCES', 'EPERM'].includes(error?.code)) throw error;
        await delay(LOCK_RETRY_MS);
      }
    }
    throw lastError;
  }

  async #readLockOwner() {
    try {
      return JSON.parse(await readFile(this.lockFile, 'utf8'));
    } catch {
      return null;
    }
  }

  async #acquireLock() {
    await this.#ensureDir();
    const started = Date.now();
    for (;;) {
      try {
        const handle = await open(this.lockFile, 'wx');
        const token = randomUUID();
        await handle.writeFile(
          `${JSON.stringify({ pid: process.pid, token, createdAt: nowIso(this.clock) })}\n`,
          'utf8',
        );
        return { handle, token };
      } catch (error) {
        if (!['EEXIST', 'EPERM', 'EACCES'].includes(error?.code)) throw error;
        const owner = await this.#readLockOwner();
        if (owner?.pid && (await this.isLockOwnerAlive(Number(owner.pid))) === false) {
          const stale = `${this.lockFile}.stale.${owner.token || randomUUID()}`;
          await rename(this.lockFile, stale)
            .then(() => unlink(stale))
            .catch(reclaimError => {
              if (!['ENOENT', 'EEXIST'].includes(reclaimError?.code)) throw reclaimError;
            });
          continue;
        }
        if (Date.now() - started >= LOCK_WAIT_MS) {
          const detail = owner?.pid
            ? `owner PID ${owner.pid} is still alive or cannot be disproved`
            : 'lock owner is unknown';
          throw new Error(`game-test queue lock is busy: ${detail}`);
        }
        await delay(LOCK_RETRY_MS);
      }
    }
  }

  async #releaseLock(lock) {
    if (!lock) return;
    await lock.handle.close();
    const owner = await this.#readLockOwner();
    if (owner?.pid === process.pid && owner?.token === lock.token) {
      await unlink(this.lockFile).catch(error => {
        if (error?.code !== 'ENOENT') throw error;
      });
    }
  }

  #addEvent(state, type, data = {}) {
    const event = {
      id: randomUUID(),
      at: nowIso(this.clock),
      type,
      ...data,
    };
    state.events.push(event);
    if (state.events.length > MAX_EVENTS) {
      state.events.splice(0, state.events.length - MAX_EVENTS);
    }
    return event;
  }

  async #isDefinitelyAlive(pid) {
    return (await this.isProcessAlive(Number(pid))) === true;
  }

  async #reconcile(state, newEvents) {
    if (state.holder) {
      const processes = state.holder.processes?.length
        ? [...state.holder.processes]
        : [{ pid: state.holder.controllerPid, role: 'controller' }];
      if (state.holder.gameReservation) processes.push(state.holder.gameReservation);
      let anyAliveOrUnknown = false;
      for (const owned of processes) {
        const alive = await this.isProcessAlive(Number(owned.pid));
        if (alive !== false) anyAliveOrUnknown = true;
      }
      if (!anyAliveOrUnknown) {
        const prior = state.holder;
        state.holder = null;
        newEvents.push(
          this.#addEvent(state, 'RECLAIM', {
            agent: prior.agent,
            task: prior.task,
            message: `reclaimed after every recorded owner PID was proven gone`,
          }),
        );
      }
    }
    for (const request of state.queue) {
      if (!request.waitPid) continue;
      if ((await this.isProcessAlive(Number(request.waitPid))) === false) {
        request.waitPid = null;
        newEvents.push(
          this.#addEvent(state, 'DORMANT', {
            agent: request.agent,
            task: request.task,
            requestId: request.id,
            message: `${request.agent} ${request.task} waiter ended; request is prepared for resume`,
          }),
        );
      }
    }
  }

  async #promote(state, newEvents) {
    if (state.holder) return;
    let selectedIndex = -1;
    for (let index = 0; index < state.queue.length; index += 1) {
      const request = state.queue[index];
      if (request.waitPid && (await this.#isDefinitelyAlive(request.waitPid))) {
        selectedIndex = index;
        break;
      }
    }
    if (selectedIndex < 0) return;
    const [request] = state.queue.splice(selectedIndex, 1);
    const startedAt = nowIso(this.clock);
    state.holder = {
      ...request,
      controllerPid: request.waitPid,
      startedAt,
      processes: [
        {
          pid: request.waitPid,
          role: 'controller',
          registeredAt: startedAt,
        },
      ],
    };
    delete state.holder.waitPid;
    newEvents.push(
      this.#addEvent(state, 'GRANT', {
        agent: request.agent,
        task: request.task,
        requestId: request.id,
        message: `${request.agent} ${request.task} automatically granted the game-test slot`,
      }),
    );
  }

  async #appendCrewEvents(events) {
    if (!this.writeCrewLog || events.length === 0) return;
    const logPath = path.join(this.repoRoot, 'crew', 'LOG.md');
    try {
      await stat(logPath);
    } catch {
      return;
    }
    const lines = events.map(event => {
      const actor = event.agent || 'cursor';
      const detail = event.message || `${event.task || ''}`.trim();
      return `- ${event.at.replace(/:\d\d\.\d{3}Z$/, 'Z')} · ${actor} · SLOT_${event.type} · ${detail}\n`;
    });
    await appendFile(logPath, lines.join(''), 'utf8');
  }

  async #mutate(change, { prePromote = true } = {}) {
    const lock = await this.#acquireLock();
    const newEvents = [];
    let value;
    let snapshot;
    try {
      const state = await this.#readRawState();
      await this.#reconcile(state, newEvents);
      if (prePromote) await this.#promote(state, newEvents);
      value = await change(state, newEvents);
      await this.#promote(state, newEvents);
      await this.#writeRawState(state);
      snapshot = publicState(state);
    } finally {
      await this.#releaseLock(lock);
    }
    await this.#appendCrewEvents(newEvents);
    return { value, state: snapshot, events: newEvents };
  }

  async status({ reconcile = true } = {}) {
    if (reconcile) {
      return (await this.#mutate(() => undefined)).state;
    }
    await this.#ensureDir();
    return publicState(await this.#readRawState());
  }

  async request({
    agent,
    task,
    checks = '',
    minutes = null,
    command = '',
    waitPid = null,
    priority = null,
  }) {
    agent = String(agent || '').trim().toLowerCase();
    task = String(task || '').trim();
    if (!agent || !task) throw new Error('agent and task are required');
    const effectivePriority = priority || (agent === 'jerry' ? 'jerry' : 'normal');
    const numericPid = waitPid ? Number(waitPid) : null;
    const result = await this.#mutate(async (state, events) => {
      if (state.holder?.agent === agent) {
        throw new Error(
          `${agent} already holds the game-test slot for ${state.holder.task}; nested launches are blocked`,
        );
      }
      const existing = state.queue.find(entry => entry.agent === agent);
      if (existing) {
        if (existing.task !== task) {
          throw new Error(
            `${agent} is already queued for ${existing.task}; cancel it before queueing ${task}`,
          );
        }
        if (
          numericPid &&
          existing.waitPid &&
          existing.waitPid !== numericPid &&
          (await this.#isDefinitelyAlive(existing.waitPid))
        ) {
          throw new Error(`${agent} already has a live waiter for ${task}`);
        }
        if (numericPid) existing.waitPid = numericPid;
        if (command) existing.command = command;
        if (checks) existing.checks = checks;
        if (minutes !== null) existing.minutes = Number(minutes);
        events.push(
          this.#addEvent(state, 'READY', {
            agent,
            task,
            requestId: existing.id,
            message: `${agent} ${task} queue request is ready to resume`,
          }),
        );
        return { id: existing.id, token: existing.token, reused: true };
      }
      const queuedAt = nowIso(this.clock);
      const entry = {
        id: randomUUID(),
        token: randomUUID(),
        agent,
        task,
        checks: String(checks || ''),
        minutes: minutes === null ? null : Number(minutes),
        command: String(command || ''),
        queuedAt,
        waitPid: numericPid,
        priority: effectivePriority,
      };
      if (effectivePriority === 'jerry') {
        const afterJerry = state.queue.findLastIndex?.(item => item.priority === 'jerry') ?? -1;
        state.queue.splice(afterJerry + 1, 0, entry);
      } else {
        state.queue.push(entry);
      }
      events.push(
        this.#addEvent(state, 'QUEUE', {
          agent,
          task,
          requestId: entry.id,
          message: `${agent} ${task} joined the game-test queue`,
        }),
      );
      return { id: entry.id, token: entry.token, reused: false };
    }, { prePromote: false });
    return { ...result.value, state: result.state };
  }

  async cancel({ agent, id }) {
    agent = String(agent || '').trim().toLowerCase();
    const result = await this.#mutate((state, events) => {
      const index = state.queue.findIndex(entry => entry.id === id);
      if (index < 0) throw new Error(`queued request ${id} was not found`);
      if (state.queue[index].agent !== agent && agent !== 'jerry') {
        throw new Error(`${agent} cannot cancel ${state.queue[index].agent}'s request`);
      }
      const [removed] = state.queue.splice(index, 1);
      events.push(
        this.#addEvent(state, 'CANCEL', {
          agent: removed.agent,
          task: removed.task,
          requestId: removed.id,
          message: `${removed.agent} ${removed.task} canceled its queued checks`,
        }),
      );
      return removed;
    });
    return result.value;
  }

  async waitForGrant(token, { signal, reconcileMs = RECONCILE_MS } = {}) {
    const check = async () => {
      const granted = (
        await this.#mutate(state =>
          state.holder?.token === token ? publicState(state).holder : null,
        )
      ).value;
      if (granted) return granted;
      const raw = await this.#readRawState();
      if (!raw.queue.some(entry => entry.token === token)) {
        throw new Error('game-test request was canceled or no longer exists');
      }
      return null;
    };
    const safeCheck = async () => {
      try {
        return await check();
      } catch (error) {
        if (/queue lock is busy/i.test(error.message)) return null;
        throw error;
      }
    };
    const immediate = await safeCheck();
    if (immediate) return immediate;
    await this.#ensureDir();
    return new Promise((resolve, reject) => {
      let settled = false;
      let probing = false;
      let watcher;
      let timer;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        watcher?.close?.();
        watcher?.return?.();
        clearInterval(timer);
        signal?.removeEventListener('abort', onAbort);
        if (error) reject(error);
        else resolve(value);
      };
      const probe = async () => {
        if (settled || probing) return;
        probing = true;
        try {
          const value = await safeCheck();
          if (value) finish(null, value);
        } catch (error) {
          finish(error);
        } finally {
          probing = false;
        }
      };
      const onAbort = () => finish(signal.reason || new Error('waiting canceled'));
      try {
        watcher = watchFs(this.stateDir, (_event, filename) => {
          if (!filename || String(filename) === path.basename(this.stateFile)) probe();
        });
        watcher.on('error', error => finish(error));
      } catch (error) {
        finish(error);
      }
      timer = setInterval(probe, reconcileMs);
      timer.unref?.();
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  async assertHeld(token = process.env.DW_GAME_TEST_TOKEN) {
    if (!token) {
      throw new Error(
        'Game/browser launch blocked: no machine-wide game-test lease. Run it through ' +
          '`node tools/game-test-slot.mjs run <agent> <task> --checks "<batch>" -- <command>`.',
      );
    }
    const result = await this.#mutate(state => {
      if (!state.holder || state.holder.token !== token) {
        throw new Error('Game/browser launch blocked: the supplied game-test lease is not active');
      }
      return {
        id: state.holder.id,
        agent: state.holder.agent,
        task: state.holder.task,
        startedAt: state.holder.startedAt,
      };
    });
    return result.value;
  }

  async registerProcess(token, pid, role = 'game/browser', reservationId = null) {
    pid = Number(pid);
    if (!Number.isInteger(pid) || pid <= 0) throw new Error(`invalid process PID: ${pid}`);
    const result = await this.#mutate(async state => {
      if (!state.holder || state.holder.token !== token) {
        throw new Error('cannot register a process without the active game-test lease');
      }
      if (isGameProcessRole(role)) {
        const reservation = state.holder.gameReservation;
        if (
          !reservation ||
          reservation.pid !== process.pid ||
          reservation.id !== reservationId
        ) {
          throw new Error('game/browser process was not reserved by this launcher');
        }
        for (const owned of state.holder.processes) {
          if (
            owned.pid !== pid &&
            isGameProcessRole(owned.role) &&
            (await this.isProcessAlive(Number(owned.pid))) !== false
          ) {
            throw new Error(
              `one game instance already exists: ${owned.role} PID ${owned.pid}`,
            );
          }
        }
        state.holder.gameReservation = null;
      }
      const existing = state.holder.processes.find(entry => entry.pid === pid);
      if (existing) {
        existing.role = role;
      } else {
        state.holder.processes.push({
          pid,
          role,
          registeredAt: nowIso(this.clock),
        });
      }
      return publicProcess(
        state.holder.processes.find(entry => entry.pid === pid),
      );
    });
    return result.value;
  }

  async reserveGameProcess(token, role = 'game/browser', pid = process.pid) {
    pid = Number(pid);
    const result = await this.#mutate(async state => {
      if (!state.holder || state.holder.token !== token) {
        throw new Error('cannot reserve a game/browser process without the active lease');
      }
      const prior = state.holder.gameReservation;
      if (prior) {
        if (prior.pid === pid) {
          throw new Error(`another game launch is already reserved by PID ${prior.pid}`);
        }
        if ((await this.isProcessAlive(Number(prior.pid))) !== false) {
          throw new Error(`another game launch is already reserved by PID ${prior.pid}`);
        }
      }
      for (const owned of state.holder.processes) {
        if (
          isGameProcessRole(owned.role) &&
          (await this.isProcessAlive(Number(owned.pid))) !== false
        ) {
          throw new Error(`one game instance already exists: ${owned.role} PID ${owned.pid}`);
        }
      }
      const reservationId = randomUUID();
      state.holder.gameReservation = {
        id: reservationId,
        pid,
        role: `${role} reservation`,
        reservedAt: nowIso(this.clock),
      };
      return reservationId;
    });
    return result.value;
  }

  async releaseGameReservation(token, pid = process.pid) {
    pid = Number(pid);
    const result = await this.#mutate(state => {
      if (!state.holder || state.holder.token !== token) return false;
      if (state.holder.gameReservation?.pid !== pid) return false;
      state.holder.gameReservation = null;
      return true;
    });
    return result.value;
  }

  async unregisterProcess(token, pid) {
    pid = Number(pid);
    const result = await this.#mutate(state => {
      if (!state.holder || state.holder.token !== token) return false;
      const before = state.holder.processes.length;
      state.holder.processes = state.holder.processes.filter(entry => entry.pid !== pid);
      return state.holder.processes.length !== before;
    });
    return result.value;
  }

  async adoptController(token, pid = process.pid, role = 'controller') {
    pid = Number(pid);
    const result = await this.#mutate(state => {
      if (!state.holder || state.holder.token !== token) {
        throw new Error('cannot adopt an inactive game-test lease');
      }
      const priorControllerPid = state.holder.controllerPid;
      state.holder.controllerPid = pid;
      state.holder.processes = state.holder.processes.filter(
        entry => entry.pid !== priorControllerPid,
      );
      const existing = state.holder.processes.find(entry => entry.pid === pid);
      if (existing) existing.role = role;
      else {
        state.holder.processes.push({
          pid,
          role,
          registeredAt: nowIso(this.clock),
        });
      }
      return true;
    });
    return result.value;
  }

  async release(token, { pid = process.pid, reason = 'checks complete' } = {}) {
    pid = Number(pid);
    const result = await this.#mutate(async (state, events) => {
      if (!state.holder || state.holder.token !== token) return false;
      if (state.holder.controllerPid !== pid) {
        throw new Error(
          `only controller PID ${state.holder.controllerPid} may release this game-test lease`,
        );
      }
      for (const owned of state.holder.processes) {
        if (owned.pid === pid) continue;
        const alive = await this.isProcessAlive(Number(owned.pid));
        if (alive !== false) {
          throw new Error(
            `cannot release while owned ${owned.role} PID ${owned.pid} is alive or unproven`,
          );
        }
      }
      if (state.holder.gameReservation) {
        const alive = await this.isProcessAlive(Number(state.holder.gameReservation.pid));
        if (alive !== false) {
          throw new Error(
            `cannot release while ${state.holder.gameReservation.role} PID ` +
              `${state.holder.gameReservation.pid} is alive or unproven`,
          );
        }
      }
      const prior = state.holder;
      state.holder = null;
      events.push(
        this.#addEvent(state, 'RELEASE', {
          agent: prior.agent,
          task: prior.task,
          requestId: prior.id,
          message: `${prior.agent} ${prior.task} released the game-test slot: ${reason}`,
        }),
      );
      return true;
    });
    return result.value;
  }

  async rawStateForTests() {
    await this.#ensureDir();
    return this.#readRawState();
  }
}

export const defaultGameTestSlot = new GameTestSlot();

export async function assertGameTestSlot(token) {
  return defaultGameTestSlot.assertHeld(token);
}

export async function registerGameTestProcess(
  pid,
  role,
  token = process.env.DW_GAME_TEST_TOKEN,
  reservationId = null,
) {
  if (!token) throw new Error('cannot register a game process without DW_GAME_TEST_TOKEN');
  return defaultGameTestSlot.registerProcess(token, pid, role, reservationId);
}

export async function reserveGameTestProcess(
  role = 'game/browser',
  token = process.env.DW_GAME_TEST_TOKEN,
) {
  if (!token) throw new Error('cannot reserve a game process without DW_GAME_TEST_TOKEN');
  return defaultGameTestSlot.reserveGameProcess(token, role, process.pid);
}

export async function releaseGameTestReservation(token = process.env.DW_GAME_TEST_TOKEN) {
  if (!token) return false;
  return defaultGameTestSlot.releaseGameReservation(token, process.pid);
}

export async function unregisterGameTestProcess(pid, token = process.env.DW_GAME_TEST_TOKEN) {
  if (!token) return false;
  return defaultGameTestSlot.unregisterProcess(token, pid);
}

export async function adoptGameTestController(
  pid = process.pid,
  role = 'controller',
  token = process.env.DW_GAME_TEST_TOKEN,
) {
  if (!token) throw new Error('cannot adopt the game-test lease without DW_GAME_TEST_TOKEN');
  return defaultGameTestSlot.adoptController(token, pid, role);
}

function parseOptions(args) {
  const options = { positional: [], command: [] };
  let index = 0;
  while (index < args.length) {
    const arg = args[index];
    if (arg === '--') {
      options.command = args.slice(index + 1);
      break;
    }
    if (arg === '--json') options.json = true;
    else if (arg === '--checks') options.checks = args[++index];
    else if (arg === '--minutes') options.minutes = Number(args[++index]);
    else if (arg === '--token') options.token = args[++index];
    else if (arg.startsWith('--')) throw new Error(`unknown option: ${arg}`);
    else options.positional.push(arg);
    index += 1;
  }
  return options;
}

function printStatus(state, json = false) {
  if (json) {
    console.log(JSON.stringify(state, null, 2));
    return;
  }
  console.log(`Game-test slot on ${state.computer}`);
  if (state.holder) {
    console.log(
      `HOLDER ${state.holder.agent} ${state.holder.task} · PID ${state.holder.pid} · since ${state.holder.startedAt}`,
    );
    console.log(`  ${state.holder.command || '(command not recorded)'}`);
  } else {
    console.log('HOLDER none');
  }
  if (state.queue.length === 0) {
    console.log('QUEUE empty');
  } else {
    for (const item of state.queue) {
      console.log(
        `QUEUE ${item.position}. ${item.agent} ${item.task} · ${item.ready ? `PID ${item.pid}` : 'prepared; not waiting'} · ${item.queuedAt}`,
      );
    }
  }
}

async function waitForChild(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

async function runQueuedCommand({ agent, task, checks, minutes, command, requestId = null }) {
  if (!command.length) throw new Error('a command is required after `--`');
  const commandText = formatCommand(command);
  const queued = await defaultGameTestSlot.request({
    agent,
    task,
    checks,
    minutes,
    command: commandText,
    waitPid: process.pid,
  });
  if (requestId && queued.id !== requestId) {
    throw new Error(`request ${requestId} does not match ${agent} ${task} (${queued.id})`);
  }
  const position = queued.state.queue.find(item => item.id === queued.id)?.position;
  if (position) console.log(`Game-test request ${queued.id} queued at position ${position}. Waiting...`);
  const holder = await defaultGameTestSlot.waitForGrant(queued.token);
  console.log(`GRANT ${holder.agent} ${holder.task}: starting one game-test command`);

  let child = null;
  let childPid = null;
  let interrupted = false;
  const forwardSignal = signal => {
    interrupted = true;
    if (child && child.exitCode === null && child.signalCode === null) {
      try {
        child.kill(signal);
      } catch {
        // The child may have exited between the check and signal.
      }
    }
  };
  const onSigint = () => forwardSignal('SIGINT');
  const onSigterm = () => forwardSignal('SIGTERM');
  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigterm);
  try {
    child = spawn(command[0], command.slice(1), {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DW_GAME_TEST_TOKEN: queued.token,
        DW_GAME_TEST_AGENT: agent,
        DW_GAME_TEST_TASK: task,
        DW_GAME_TEST_CHECKS: checks || '',
        DW_GAME_TEST_JOBS: '1',
        DW_GAME_TEST_CONTROLLER_PID: String(process.pid),
      },
      stdio: 'inherit',
      shell: false,
      windowsHide: false,
    });
    await new Promise((resolve, reject) => {
      child.once('spawn', resolve);
      child.once('error', reject);
    });
    childPid = child.pid;
    await defaultGameTestSlot.registerProcess(queued.token, childPid, 'test command');
    const outcome = await waitForChild(child);
    await defaultGameTestSlot.unregisterProcess(queued.token, childPid);
    try {
      await defaultGameTestSlot.release(queued.token, {
        reason: interrupted
          ? `command interrupted by ${outcome.signal || 'signal'}`
          : `command exited ${outcome.code ?? outcome.signal}`,
      });
    } catch (error) {
      if (/only controller PID/.test(error.message)) {
        console.log('Game-test lease transferred to the command daemon; it will release on shutdown.');
      } else {
        throw error;
      }
    }
    if (outcome.signal) process.exitCode = 1;
    else process.exitCode = outcome.code ?? 1;
  } catch (error) {
    if (childPid) await defaultGameTestSlot.unregisterProcess(queued.token, childPid).catch(() => {});
    await defaultGameTestSlot.release(queued.token, { reason: `command failed: ${error.message}` }).catch(
      releaseError => {
        console.error(`Slot remains held safely: ${releaseError.message}`);
      },
    );
    throw error;
  } finally {
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigterm);
  }
}

export async function main(args = process.argv.slice(2)) {
  const [commandName = 'status', ...rest] = args;
  const options = parseOptions(rest);
  if (commandName === 'status') {
    printStatus(await defaultGameTestSlot.status(), options.json);
    return;
  }
  if (commandName === 'request') {
    const [agent, task] = options.positional;
    const queued = await defaultGameTestSlot.request({
      agent,
      task,
      checks: options.checks,
      minutes: options.minutes,
      command: options.command.length ? formatCommand(options.command) : '',
    });
    console.log(
      `Queued ${agent} ${task} as ${queued.id}. Run the prepared command with:\n` +
        `node tools/game-test-slot.mjs run ${agent} ${task} --checks ${quoteCommandPart(options.checks || '')} -- <command>`,
    );
    printStatus(queued.state, false);
    return;
  }
  if (commandName === 'run') {
    const [agent, task] = options.positional;
    await runQueuedCommand({
      agent,
      task,
      checks: options.checks || '',
      minutes: options.minutes,
      command: options.command,
    });
    return;
  }
  if (commandName === 'wait') {
    const [agent, task, requestId] = options.positional;
    await runQueuedCommand({
      agent,
      task,
      requestId,
      checks: options.checks || '',
      minutes: options.minutes,
      command: options.command,
    });
    return;
  }
  if (commandName === 'hold') {
    const [agent = 'jerry', task = 'MANUAL'] = options.positional;
    const queued = await defaultGameTestSlot.request({
      agent,
      task,
      checks: options.checks || 'manual game/Inspector session',
      minutes: options.minutes,
      command: 'manual hold',
      waitPid: process.pid,
      priority: agent.toLowerCase() === 'jerry' ? 'jerry' : 'normal',
    });
    await defaultGameTestSlot.waitForGrant(queued.token);
    console.log(`GRANT ${agent} ${task}. Hold remains active until Ctrl+C.`);
    await new Promise(resolve => {
      process.once('SIGINT', resolve);
      process.once('SIGTERM', resolve);
    });
    await defaultGameTestSlot.release(queued.token, { reason: 'manual hold ended' });
    return;
  }
  if (commandName === 'cancel') {
    const [agent, id] = options.positional;
    const canceled = await defaultGameTestSlot.cancel({ agent, id });
    console.log(`Canceled ${canceled.agent} ${canceled.task} (${canceled.id}).`);
    return;
  }
  if (commandName === 'release') {
    const token = options.token || process.env.DW_GAME_TEST_TOKEN;
    if (!token) throw new Error('release needs --token or DW_GAME_TEST_TOKEN');
    const released = await defaultGameTestSlot.release(token);
    console.log(released ? 'Game-test slot released.' : 'Lease was already inactive.');
    return;
  }
  throw new Error(`unknown game-test-slot command: ${commandName}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch(error => {
    console.error(`game-test-slot: ${error.message}`);
    process.exitCode = 1;
  });
}
