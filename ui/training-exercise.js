import { normalizeTrainingOptions, normalizeTrainingWave, TRAINING_WAVE_LIMIT } from './training-wave.js';

const displayedSeconds = remaining => Math.ceil(Math.max(0, remaining - 1e-8));

const expand = rows => rows.flatMap(({ kind, count }) => Array(count).fill(kind));

function rowsFromKinds(kinds) {
  const counts = new Map();
  for (const kind of kinds) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  return Array.from(counts, ([kind, count]) => ({ kind, count }));
}

// The Training update supplies active simulation time and reports when all previous enemies are gone.
export function createTrainingExercise({ allowedKinds, onChange = () => {} }) {
  let active = null;

  function read() {
    if (!active || active.waitingForClear) return null;
    const { kinds, remaining } = active;
    const rows = rowsFromKinds(kinds);
    const plan = rows.length === 1 ? rows[0] : { rows, count: kinds.length };
    return { ...plan, remaining, seconds: displayedSeconds(remaining) };
  }

  function status() {
    return active ? { round: active.round, waitingForClear: active.waitingForClear, settings: { ...active.settings } } : null;
  }

  function emit() { onChange(read()); }

  function start(batches, options, { replay } = {}) {
    if (active || !Array.isArray(batches) || batches.length !== 1) return false;
    const wave = normalizeTrainingWave(batches[0], allowedKinds);
    if (!wave?.total) return false;

    const settings = normalizeTrainingOptions(options);
    const cursor = replay ? replayCursor(replay.rows) : null;
    const first = cursor ? expand(cursor.next()) : expand(wave.rows);
    active = {
      first, kinds: first.slice(), settings, replay: cursor, round: 1,
      remaining: settings.countdown, waitingForClear: false
    };
    emit();
    return true;
  }

  function startNextRound() {
    const { first, replay, round, settings } = active;
    let next = replay?.hasMore() ? expand(replay.next()) : null;
    if (!replay && settings.release === 'endless') {
      const size = Math.min(TRAINING_WAVE_LIMIT, first.length + round);
      next = Array.from({ length: size }, (_, i) => first[i % first.length]);
    }
    if (!next) { active = null; emit(); return; }

    active.round++;
    active.kinds = next.slice();
    active.remaining = settings.countdown;
    active.waitingForClear = false;
    emit();
  }

  function tick(dt, alive) {
    if (!active || !Number.isFinite(dt) || dt <= 0) return null;
    if (active.waitingForClear) {
      if (alive === 0) startNextRound();
      return null;
    }

    const previousSeconds = displayedSeconds(active.remaining);
    active.remaining = Math.max(0, active.remaining - dt);
    if (active.remaining >= 1e-8) {
      if (displayedSeconds(active.remaining) !== previousSeconds) emit();
      return null;
    }

    const trickle = !active.replay && active.settings.release === 'trickle';
    const count = trickle ? 1 : active.kinds.length;
    const kinds = active.kinds.splice(0, count);
    active.waitingForClear = active.kinds.length === 0;
    active.remaining = active.waitingForClear ? 0 : active.settings.interval;
    emit();
    return { rows: rowsFromKinds(kinds), settings: { ...active.settings }, round: active.round };
  }

  function cancel() {
    if (!active) return false;
    active = null;
    emit();
    return true;
  }

  const isActive = () => active !== null;
  function hasFutureRelease() {
    if (!active) return false;
    return !active.waitingForClear ||
      (active.replay ? active.replay.hasMore() : active.settings.release === 'endless');
  }

  return { start, read, status, tick, cancel, isActive, hasFutureRelease };
}

const REPLAY_KEY = 'tt_training_last_night_v1';
const positiveCount = value => Number.isSafeInteger(value) && value > 0;
const kindKey = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(value);

// Only campaign's own successful wave spawns call add. The matching dawn is the commit point.
export function createTrainingReplay({ storage } = {}) {
  let current = null;

  function parse(data) {
    if (data?.version !== 1 || !positiveCount(data.day) || !Array.isArray(data.rows) || !data.rows.length) return null;
    if (data.rows.some(row => !kindKey(row?.kind) || !positiveCount(row.count))) return null;
    const counts = new Map();
    for (const { kind, count } of data.rows) counts.set(kind, (counts.get(kind) ?? 0) + count);
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    if (!Number.isSafeInteger(total)) return null;
    return { day: data.day, rows: Array.from(counts, ([kind, count]) => ({ kind, count })) };
  }

  function read() {
    try { return parse(JSON.parse(storage.getItem(REPLAY_KEY))); }
    catch { return null; }
  }

  function begin(day) {
    current = positiveCount(day) ? { day, counts: new Map() } : null;
  }

  function add(kind) {
    if (!current || !kindKey(kind)) return;
    current.counts.set(kind, (current.counts.get(kind) ?? 0) + 1);
  }

  function finish(day) {
    if (!current || day !== current.day) return false;
    const data = { version: 1, day, rows: Array.from(current.counts, ([kind, count]) => ({ kind, count })) };
    current = null;
    if (!parse(data)) return false;
    try { storage.setItem(REPLAY_KEY, JSON.stringify(data)); return true; }
    catch { return false; }
  }

  function reset() { current = null; }

  return { begin, add, finish, reset, read };
}

function replayCursor(rows) {
  let index = 0, remaining = rows[0]?.count ?? 0;
  const hasMore = () => index < rows.length;
  function next() {
    const batch = [];
    let space = TRAINING_WAVE_LIMIT;
    while (space && hasMore()) {
      const count = Math.min(space, remaining);
      batch.push({ kind: rows[index].kind, count });
      space -= count;
      remaining -= count;
      if (remaining === 0) remaining = rows[++index]?.count ?? 0;
    }
    return batch;
  }
  return { hasMore, next };
}

export function prepareTrainingReplay(record, allowedKinds) {
  if (!record) return null;
  const rows = [], skipped = [];
  let total = 0;
  for (const { kind, count } of record.rows) {
    if (kind === 'caveguard' || !allowedKinds.has(kind)) skipped.push({ kind, count });
    else { rows.push({ kind, count }); total += count; }
  }
  return { day: record.day, rows, total, skipped,
    batchCount: Math.ceil(total / TRAINING_WAVE_LIMIT), firstBatch: replayCursor(rows).next() };
}
