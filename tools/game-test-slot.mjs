/**
 * Machine-wide game-test queue.
 *
 * CL-347 (Jerry, 10 Nov 2026: "If the bottleneck is available test slots I give you guys the authority to open as many
 * as you think is feasible without cooking the machine"): on a computer with a graphics card it can read, more than one
 * lease at a time, each still one game and one worker. The first lease is granted as before; a further one only while
 * fewer than the computer's slots are in use, no lease is Jerry's or exclusive and the next in line is neither (his own
 * game and the timing benches have the computer alone, and nothing new starts while he waits), the last start was over
 * staggerSec ago (a game's load is its peak), and the computer has the room right then (free memory, the cores, the
 * graphics card's free memory and its temperature, measured at the grant). A reclaimed lease (its processes died without
 * releasing: a crash or a killed session) puts the computer back to one at a time for backoffMin.
 * tools/game-test-slot.config.json overrides any of SLOT_DEFAULTS; DW_GAME_TEST_SLOTS overrides the count.
 *
 * The state and mutex live in the OS temp directory, not in the repository, so
 * a cloud workspace and Jerry's PC do not block each other.  Every official
 * game/browser launcher must either run through this CLI or validate the
 * DW_GAME_TEST_TOKEN that the CLI gives its child process.
 */
import { execFile, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, watch as watchFs } from 'node:fs';
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
const WRITE_ATTEMPTS = 20;
const WRITE_RETRY_MS = 250;
const RETRYABLE_WRITE = new Set(['EACCES', 'EPERM', 'EBUSY', 'UNKNOWN']);

// CL-347: how many at once, and the room each start needs (see the header).
export const SLOT_DEFAULTS = Object.freeze({
  slots: 'auto',        // a number, or 'auto': from this computer's memory, cores and graphics card, never over hardMax
  hardMax: 3,
  reserveGB: 8,         // memory kept for Windows, Jerry's programs and the agents' own apps
  perGameGB: 5,         // one game instance (headless, software-rendered: 4-5 GB measured, CL-334)
  keepFreeGB: 4,        // never start one that would leave less memory free than this
  cpusPerGame: 4,
  perGameVramGB: 2.5,
  keepFreeVramGB: 1.5,
  maxGpuTempC: 80,      // no new start while the graphics card is this hot
  maxCpuBusy: 0.75,     // or while the cores are this busy
  staggerSec: 30,
  backoffMin: 20,
  sampleSec: 10,
});
const SLOT_CONFIG = path.join('tools', 'game-test-slot.config.json');

export function loadSlotLimits(repoRoot = REPO_ROOT, env = process.env) {
  let file = {};
  try {
    file = JSON.parse(readFileSync(path.join(repoRoot, SLOT_CONFIG), 'utf8')) || {};
  } catch {
    file = {};
  }
  const limits = { ...SLOT_DEFAULTS };
  for (const key of Object.keys(SLOT_DEFAULTS)) {
    if (file[key] === undefined) continue;
    limits[key] = key === 'slots' && file[key] === 'auto' ? 'auto' : Number(file[key]);
  }
  if (env.DW_GAME_TEST_SLOTS) {
    limits.slots = env.DW_GAME_TEST_SLOTS === 'auto' ? 'auto' : Number(env.DW_GAME_TEST_SLOTS);
  }
  return limits;
}

function nvidiaSmi(timeout = 4000) {
  return new Promise(resolve => {
    try {
      execFile(
        'nvidia-smi',
        ['--query-gpu=name,memory.total,memory.used,temperature.gpu', '--format=csv,noheader,nounits'],
        { timeout, windowsHide: true },
        (error, stdout) => {
          if (error) return resolve(null);
          const first = String(stdout).split(/\r?\n/).find(line => line.trim());
          if (!first) return resolve(null);
          const [name, total, used, temp] = first.split(',').map(part => part.trim());
          const totalMB = Number(total);
          const usedMB = Number(used);
          if (!Number.isFinite(totalMB) || totalMB <= 0 || !Number.isFinite(usedMB)) return resolve(null);
          return resolve({
            name,
            vramTotalGB: totalMB / 1024,
            vramFreeGB: (totalMB - usedMB) / 1024,
            tempC: Number.isFinite(Number(temp)) ? Number(temp) : null,
          });
        },
      );
    } catch {
      resolve(null);
    }
  });
}

async function cpuBusyOver(ms) {
  const before = os.cpus().map(cpu => cpu.times);
  await delay(ms);
  let idle = 0;
  let total = 0;
  os.cpus().forEach((cpu, index) => {
    const prior = before[index];
    if (!prior) return;
    for (const key of Object.keys(cpu.times)) total += cpu.times[key] - (prior[key] || 0);
    idle += cpu.times.idle - prior.idle;
  });
  return total > 0 ? Math.max(0, Math.min(1, 1 - idle / total)) : 0;
}

export const machineProbe = {
  async machine() {
    return { totalGB: os.totalmem() / 2 ** 30, cpus: os.cpus().length, gpu: await nvidiaSmi() };
  },
  async sample() {
    const [cpuBusy, gpu] = await Promise.all([cpuBusyOver(500), nvidiaSmi()]);
    return { freeGB: os.freemem() / 2 ** 30, cpuBusy, gpu };
  },
};

export function autoSlots(limits, machine) {
  if (typeof limits.slots === 'number' && Number.isFinite(limits.slots)) {
    return Math.max(1, Math.min(6, Math.floor(limits.slots)));
  }
  // No graphics card we can read (a cloud box, a VM: software rendering): one at a time.
  if (!machine?.gpu) return 1;
  const byMemory = Math.floor((machine.totalGB - limits.reserveGB) / limits.perGameGB);
  const byCores = Math.floor(machine.cpus / limits.cpusPerGame);
  const byVram = Math.floor((machine.gpu.vramTotalGB - limits.keepFreeVramGB) / limits.perGameVramGB);
  return Math.max(1, Math.min(limits.hardMax, byMemory, byCores, byVram));
}

function isExclusive(entry) {
  return Boolean(entry) && (entry.priority === 'jerry' || entry.exclusive === true);
}

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

export async function installStateFile(temp, dest, backup, ops = {}) {
  const renameOp = ops.rename || rename;
  const unlinkOp = ops.unlink || unlink;
  const copyOp = ops.copyFile || copyFile;
  const wait = ops.delay || delay;
  const windows = ops.windows ?? process.platform === 'win32';
  const attempts = ops.attempts ?? WRITE_ATTEMPTS;
  const waitMs = ops.waitMs ?? WRITE_RETRY_MS;
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if (backup) {
        await copyOp(dest, backup).catch(error => {
          if (error?.code !== 'ENOENT') throw error;
        });
      }
      // Windows cannot replace an existing file with rename, so the live file goes first.
      // The backup above is the last complete generation if that delete succeeds and the
      // rename then fails.
      if (windows) {
        await unlinkOp(dest).catch(error => {
          if (error?.code !== 'ENOENT') throw error;
        });
      }
      await renameOp(temp, dest);
      return;
    } catch (error) {
      lastError = error;
      if (!RETRYABLE_WRITE.has(error?.code) || attempt === attempts - 1) break;
      await wait(waitMs);
    }
  }
  await unlinkOp(temp).catch(() => {});
  throw lastError;
}

function emptyState(machine, clock) {
  return {
    version: STATE_VERSION,
    computer: machine,
    updatedAt: nowIso(clock),
    holder: null,
    holders: [],
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
    exclusive: isExclusive(entry),
  };
}

function publicHolder(holder) {
  if (!holder) return null;
  return {
    id: holder.id,
    agent: holder.agent,
    task: holder.task,
    checks: holder.checks,
    minutes: holder.minutes,
    pid: holder.controllerPid,
    command: holder.command,
    queuedAt: holder.queuedAt,
    startedAt: holder.startedAt,
    priority: holder.priority || 'normal',
    exclusive: isExclusive(holder),
    processes: (holder.processes || []).map(publicProcess),
    reservation: holder.gameReservation
      ? {
          pid: holder.gameReservation.pid,
          role: holder.gameReservation.role,
          reservedAt: holder.gameReservation.reservedAt,
        }
      : null,
  };
}

export function publicState(state) {
  const holders = (state.holders || (state.holder ? [state.holder] : [])).map(publicHolder);
  return {
    version: state.version,
    computer: state.computer,
    updatedAt: state.updatedAt,
    // The first lease, for readers from before CL-347; `holders` has them all.
    holder: holders[0] || null,
    holders,
    slots: state.slots ? JSON.parse(JSON.stringify(state.slots)) : null,
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
    // CL-347: 1 (one lease at a time, as before), a number, or 'config' (tools/game-test-slot.config.json, else
    // 'auto' from the computer: the CLI's default).
    slots = 1,
    limits = null,
    probe = machineProbe,
  } = {}) {
    this.stateDir = stateDir;
    this.machine = machine;
    this.repoRoot = repoRoot;
    this.clock = clock;
    this.isProcessAlive = isProcessAlive;
    this.isLockOwnerAlive = isLockOwnerAlive;
    this.writeCrewLog = writeCrewLog;
    this.slots = slots;
    this.limits = { ...SLOT_DEFAULTS, ...(limits || (slots === 'config' ? loadSlotLimits(repoRoot) : {})) };
    this.probe = probe;
    this.machineInfo = undefined;
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
        parsed.holders = Array.isArray(parsed.holders) ? parsed.holders : [];
        // CL-347: `holder` mirrors holders[0] for the copies of this tool from before it (a waiter started before the
        // change). Whatever such a copy did to `holder` wins: it released or reclaimed the lease we mirrored (gone),
        // granted itself (added), or registered its processes (that copy replaces ours).
        const legacy = parsed.holder || null;
        const mirrored = parsed.mirrorToken ?? null;
        if (mirrored && legacy?.token !== mirrored) {
          parsed.holders = parsed.holders.filter(entry => entry.token !== mirrored);
        }
        if (legacy) {
          const index = parsed.holders.findIndex(entry => entry.token === legacy.token);
          if (index >= 0) parsed.holders[index] = legacy;
          else parsed.holders.unshift(legacy);
        }
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
    state.holders ||= [];
    state.holder = state.holders[0] || null;
    state.mirrorToken = state.holder?.token ?? null;
    const temp = `${this.stateFile}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    // CU-193: ChatGPT's runner got EPERM renaming this temp (and slot status writes through here too).
    // The old retry covered only the rename, after the unlink, so an EPERM on deleting the live file
    // threw at once. installStateFile retries the backup, the delete and the rename, 20 times, 250 ms
    // apart, as run-all's tests.json write does.
    await installStateFile(temp, this.stateFile, this.backupFile);
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

  #slotsOf(state) {
    state.slots ||= {};
    return state.slots;
  }

  #holderOf(state, token) {
    return (state.holders || []).find(entry => entry.token === token) || null;
  }

  async #reconcile(state, newEvents) {
    const survivors = [];
    for (const holder of state.holders) {
      const processes = holder.processes?.length
        ? [...holder.processes]
        : [{ pid: holder.controllerPid, role: 'controller' }];
      if (holder.gameReservation) processes.push(holder.gameReservation);
      let anyAliveOrUnknown = false;
      for (const owned of processes) {
        const alive = await this.isProcessAlive(Number(owned.pid));
        if (alive !== false) anyAliveOrUnknown = true;
      }
      if (anyAliveOrUnknown) {
        survivors.push(holder);
        continue;
      }
      // CL-347: a lease whose processes all died without releasing is the sign of a crash (or a killed session):
      // back to one at a time for a while.
      const backoffUntil = new Date(this.clock() + (this.limits.backoffMin || 0) * 60_000).toISOString();
      this.#slotsOf(state).backoffUntil = backoffUntil;
      newEvents.push(
        this.#addEvent(state, 'RECLAIM', {
          agent: holder.agent,
          task: holder.task,
          message: `reclaimed after every recorded owner PID was proven gone`,
        }),
      );
    }
    state.holders = survivors;
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

  async #capacity(state) {
    const slots = this.#slotsOf(state);
    let cap;
    if (typeof this.slots === 'number') {
      cap = Math.max(1, Math.floor(this.slots));
    } else {
      if (this.machineInfo === undefined) {
        this.machineInfo = await this.probe.machine().catch(() => null);
      }
      cap = autoSlots(this.limits, this.machineInfo);
      const m = this.machineInfo;
      slots.machine = m
        ? {
            memoryGB: Math.round(m.totalGB),
            cores: m.cpus,
            gpu: m.gpu ? `${m.gpu.name} ${Math.round(m.gpu.vramTotalGB)} GB` : null,
          }
        : null;
    }
    slots.cap = cap;
    if (slots.backoffUntil && this.clock() < Date.parse(slots.backoffUntil)) return 1;
    return cap;
  }

  async #sample(state) {
    const slots = this.#slotsOf(state);
    const at = Date.parse(slots.sample?.at || '');
    if (slots.sample && Number.isFinite(at) && this.clock() - at < this.limits.sampleSec * 1000) return slots.sample;
    const raw = await this.probe.sample();
    slots.sample = {
      at: nowIso(this.clock),
      freeGB: Math.round(raw.freeGB * 10) / 10,
      cpuBusy: Math.round(raw.cpuBusy * 100) / 100,
      gpu: raw.gpu
        ? { vramFreeGB: Math.round(raw.gpu.vramFreeGB * 10) / 10, tempC: raw.gpu.tempC }
        : null,
    };
    return slots.sample;
  }

  async #admit(state, request) {
    const holders = state.holders;
    if (holders.length === 0) return { ok: true, why: 'free' };
    const alone = holders.find(isExclusive);
    if (alone) return { ok: false, why: `${alone.agent} ${alone.task} has the computer to itself` };
    if (isExclusive(request)) {
      return { ok: false, why: `${request.agent} ${request.task} waits for the running checks to end (it runs alone)` };
    }
    const cap = await this.#capacity(state);
    const slots = this.#slotsOf(state);
    if (holders.length >= cap) {
      const backoff = slots.backoffUntil && this.clock() < Date.parse(slots.backoffUntil);
      return {
        ok: false,
        why: `${holders.length} of ${cap} in use` + (backoff ? ` (one at a time after a reclaim, until ${slots.backoffUntil})` : ''),
      };
    }
    const L = this.limits;
    const last = Date.parse(slots.lastGrantAt || '');
    if (Number.isFinite(last) && this.clock() - last < L.staggerSec * 1000) {
      return { ok: false, why: 'the last game is still starting' };
    }
    const sample = await this.#sample(state);
    if (sample.freeGB - L.perGameGB < L.keepFreeGB) return { ok: false, why: `memory: ${sample.freeGB} GB free` };
    if (sample.cpuBusy > L.maxCpuBusy) return { ok: false, why: `cores ${Math.round(sample.cpuBusy * 100)}% busy` };
    if (sample.gpu) {
      if (sample.gpu.vramFreeGB - L.perGameVramGB < L.keepFreeVramGB) {
        return { ok: false, why: `graphics memory: ${sample.gpu.vramFreeGB} GB free` };
      }
      if (sample.gpu.tempC !== null && sample.gpu.tempC >= L.maxGpuTempC) {
        return { ok: false, why: `graphics card at ${sample.gpu.tempC} °C` };
      }
    }
    return {
      ok: true,
      why: 'room',
      detail:
        `${holders.length + 1} of ${cap}; ${sample.freeGB} GB free, cores ${Math.round(sample.cpuBusy * 100)}% busy` +
        (sample.gpu ? `, card ${sample.gpu.vramFreeGB} GB free at ${sample.gpu.tempC} °C` : ''),
    };
  }

  async #promote(state, newEvents) {
    for (;;) {
      let selectedIndex = -1;
      for (let index = 0; index < state.queue.length; index += 1) {
        const request = state.queue[index];
        if (request.waitPid && (await this.#isDefinitelyAlive(request.waitPid))) {
          selectedIndex = index;
          break;
        }
      }
      if (selectedIndex < 0) return;
      const decision = await this.#admit(state, state.queue[selectedIndex]);
      const slots = this.#slotsOf(state);
      slots.next = decision.ok
        ? null
        : { agent: state.queue[selectedIndex].agent, task: state.queue[selectedIndex].task, why: decision.why };
      if (!decision.ok) return;
      const [request] = state.queue.splice(selectedIndex, 1);
      const startedAt = nowIso(this.clock);
      const holder = {
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
      delete holder.waitPid;
      state.holders.push(holder);
      slots.lastGrantAt = startedAt;
      newEvents.push(
        this.#addEvent(state, 'GRANT', {
          agent: request.agent,
          task: request.task,
          requestId: request.id,
          message:
            `${request.agent} ${request.task} automatically granted the game-test slot` +
            (decision.detail ? ` (${decision.detail})` : isExclusive(request) && request.priority !== 'jerry' ? ' (alone)' : ''),
        }),
      );
    }
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
      // CL-347: how many this computer runs at once, for the status line
      return (await this.#mutate(state => this.#capacity(state).then(() => undefined))).state;
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
    exclusive = false,
  }) {
    agent = String(agent || '').trim().toLowerCase();
    task = String(task || '').trim();
    if (!agent || !task) throw new Error('agent and task are required');
    const effectivePriority = priority || (agent === 'jerry' ? 'jerry' : 'normal');
    const numericPid = waitPid ? Number(waitPid) : null;
    const result = await this.#mutate(async (state, events) => {
      const held = state.holders.find(entry => entry.agent === agent);
      if (held) {
        throw new Error(
          `${agent} already holds the game-test slot for ${held.task}; nested launches are blocked`,
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
        if (exclusive) existing.exclusive = true;
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
        exclusive: Boolean(exclusive),
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
          publicHolder(this.#holderOf(state, token)),
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
      const holder = this.#holderOf(state, token);
      if (!holder) {
        throw new Error('Game/browser launch blocked: the supplied game-test lease is not active');
      }
      return {
        id: holder.id,
        agent: holder.agent,
        task: holder.task,
        startedAt: holder.startedAt,
      };
    });
    return result.value;
  }

  async registerProcess(token, pid, role = 'game/browser', reservationId = null) {
    pid = Number(pid);
    if (!Number.isInteger(pid) || pid <= 0) throw new Error(`invalid process PID: ${pid}`);
    const result = await this.#mutate(async state => {
      const holder = this.#holderOf(state, token);
      if (!holder) {
        throw new Error('cannot register a process without the active game-test lease');
      }
      if (isGameProcessRole(role)) {
        const reservation = holder.gameReservation;
        if (
          !reservation ||
          reservation.pid !== process.pid ||
          reservation.id !== reservationId
        ) {
          throw new Error('game/browser process was not reserved by this launcher');
        }
        for (const owned of holder.processes) {
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
        holder.gameReservation = null;
      }
      const existing = holder.processes.find(entry => entry.pid === pid);
      if (existing) {
        existing.role = role;
      } else {
        holder.processes.push({
          pid,
          role,
          registeredAt: nowIso(this.clock),
        });
      }
      return publicProcess(
        holder.processes.find(entry => entry.pid === pid),
      );
    });
    return result.value;
  }

  async reserveGameProcess(token, role = 'game/browser', pid = process.pid) {
    pid = Number(pid);
    const result = await this.#mutate(async state => {
      const holder = this.#holderOf(state, token);
      if (!holder) {
        throw new Error('cannot reserve a game/browser process without the active lease');
      }
      const prior = holder.gameReservation;
      if (prior) {
        if (prior.pid === pid) {
          throw new Error(`another game launch is already reserved by PID ${prior.pid}`);
        }
        if ((await this.isProcessAlive(Number(prior.pid))) !== false) {
          throw new Error(`another game launch is already reserved by PID ${prior.pid}`);
        }
      }
      for (const owned of holder.processes) {
        if (
          isGameProcessRole(owned.role) &&
          (await this.isProcessAlive(Number(owned.pid))) !== false
        ) {
          throw new Error(`one game instance already exists: ${owned.role} PID ${owned.pid}`);
        }
      }
      const reservationId = randomUUID();
      holder.gameReservation = {
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
      const holder = this.#holderOf(state, token);
      if (!holder) return false;
      if (holder.gameReservation?.pid !== pid) return false;
      holder.gameReservation = null;
      return true;
    });
    return result.value;
  }

  async unregisterProcess(token, pid) {
    pid = Number(pid);
    const result = await this.#mutate(state => {
      const holder = this.#holderOf(state, token);
      if (!holder) return false;
      const before = holder.processes.length;
      holder.processes = holder.processes.filter(entry => entry.pid !== pid);
      return holder.processes.length !== before;
    });
    return result.value;
  }

  async adoptController(token, pid = process.pid, role = 'controller') {
    pid = Number(pid);
    const result = await this.#mutate(state => {
      const holder = this.#holderOf(state, token);
      if (!holder) {
        throw new Error('cannot adopt an inactive game-test lease');
      }
      const priorControllerPid = holder.controllerPid;
      holder.controllerPid = pid;
      holder.processes = holder.processes.filter(
        entry => entry.pid !== priorControllerPid,
      );
      const existing = holder.processes.find(entry => entry.pid === pid);
      if (existing) existing.role = role;
      else {
        holder.processes.push({
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
      const holder = this.#holderOf(state, token);
      if (!holder) return false;
      if (holder.controllerPid !== pid) {
        throw new Error(
          `only controller PID ${holder.controllerPid} may release this game-test lease`,
        );
      }
      for (const owned of holder.processes) {
        if (owned.pid === pid) continue;
        const alive = await this.isProcessAlive(Number(owned.pid));
        if (alive !== false) {
          throw new Error(
            `cannot release while owned ${owned.role} PID ${owned.pid} is alive or unproven`,
          );
        }
      }
      if (holder.gameReservation) {
        const alive = await this.isProcessAlive(Number(holder.gameReservation.pid));
        if (alive !== false) {
          throw new Error(
            `cannot release while ${holder.gameReservation.role} PID ` +
              `${holder.gameReservation.pid} is alive or unproven`,
          );
        }
      }
      const prior = holder;
      state.holders = state.holders.filter(entry => entry !== holder);
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

export const defaultGameTestSlot = new GameTestSlot({ slots: 'config' });

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
    else if (arg === '--exclusive') options.exclusive = true;
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
  const holders = state.holders || (state.holder ? [state.holder] : []);
  const slots = state.slots || {};
  const machine = slots.machine
    ? ` (this computer: ${slots.machine.memoryGB} GB, ${slots.machine.cores} cores, ${slots.machine.gpu || 'no graphics card read'})`
    : '';
  console.log(
    `Game-test slot on ${state.computer}` + (slots.cap ? ` · ${holders.length} of ${slots.cap} in use${machine}` : ''),
  );
  if (slots.backoffUntil && Date.parse(slots.backoffUntil) > Date.now()) {
    console.log(`BACKOFF one at a time until ${slots.backoffUntil} (a lease was reclaimed)`);
  }
  if (holders.length) {
    for (const holder of holders) {
      console.log(
        `HOLDER ${holder.agent} ${holder.task} · PID ${holder.pid} · since ${holder.startedAt}` +
          (holder.exclusive ? ' · alone' : ''),
      );
      console.log(`  ${holder.command || '(command not recorded)'}`);
    }
  } else {
    console.log('HOLDER none');
  }
  if (state.queue.length === 0) {
    console.log('QUEUE empty');
  } else {
    for (const item of state.queue) {
      console.log(
        `QUEUE ${item.position}. ${item.agent} ${item.task} · ${item.ready ? `PID ${item.pid}` : 'prepared; not waiting'} · ${item.queuedAt}` +
          (item.exclusive ? ' · alone' : ''),
      );
    }
    if (slots.next) console.log(`NEXT ${slots.next.agent} ${slots.next.task} waits: ${slots.next.why}`);
  }
}

async function waitForChild(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

async function runQueuedCommand({ agent, task, checks, minutes, command, requestId = null, exclusive = false }) {
  if (!command.length) throw new Error('a command is required after `--`');
  const commandText = formatCommand(command);
  const queued = await defaultGameTestSlot.request({
    agent,
    task,
    checks,
    minutes,
    command: commandText,
    waitPid: process.pid,
    exclusive,
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
      exclusive: Boolean(options.exclusive),
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
      exclusive: Boolean(options.exclusive),
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
      exclusive: Boolean(options.exclusive),
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
