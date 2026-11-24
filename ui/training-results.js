import { normalizeTrainingOptions } from './training-wave.js';

const BEST_KEY = 'tt_training_best_v1';
const acceptedNumber = value => Number.isFinite(value) && value > 0;

export function trainingRecordKey(preset, rows, options, replay) {
  const name = replay ? 'replay-'+replay.day : preset;
  const roster = replay?.rows ?? rows;
  const settings = normalizeTrainingOptions(replay ? {...options,release:'all'} : options);
  if (!name || !roster?.length || settings.release === 'endless') return null;
  return JSON.stringify([name, roster.map(({kind,count}) => [kind,count]), settings]);
}

function readBests(storage) {
  try {
    const stored = JSON.parse(storage.getItem(BEST_KEY));
    if (stored?.version === 1 && Array.isArray(stored.times)) {
      return new Map(stored.times.filter(entry =>
        Array.isArray(entry) && typeof entry[0] === 'string' && acceptedNumber(entry[1])));
    }
  } catch { /* The exercise is still playable without writable profile storage. */ }
  return new Map();
}

export function createTrainingResults({ storage } = {}) {
  let active = null;
  let lastClear = null;
  let lastAttempt = null;
  let nextId = 0;
  const bests = readBests(storage);

  function begin({recordKey = null, endless = false, eligible = true} = {}) {
    if (active) return 0;
    active = {
      id: ++nextId, recordKey:endless ? null : recordKey, endless, eligible, entered: false, completeRelease: true,
      seconds: 0, released: 0, defeated: 0, kills: 0, shots: 0, hits: 0,
      headHits: 0, healthLost: 0, waves: 0
    };
    return active.id;
  }

  function release(id, expected, spawned) {
    if (!active || active.id !== id) return;
    active.released += spawned;
    if (spawned !== expected) active.completeRelease = false;
  }

  function enter(id) {
    if (active && active.id === id) active.entered = true;
  }

  function tick(seconds, eligible = true) {
    if (!active) return;
    if (!eligible) active.eligible = false;
    if (active.entered && acceptedNumber(seconds)) active.seconds += seconds;
  }

  function fire() {
    if (!active?.entered) return null;
    active.shots++;
    return { id: active.id, hit: false, head: false };
  }

  function hit(shot, head) {
    if (!shot || shot.id !== active?.id) return;
    if (!shot.hit) { shot.hit = true; active.hits++; }
    if (head && !shot.head) { shot.head = true; active.headHits++; }
  }

  function death(id, credited) {
    if (!active || active.id !== id) return;
    active.defeated++;
    if (credited) active.kills++;
  }

  function hurt(amount) {
    if (active?.entered && acceptedNumber(amount)) active.healthLost += amount;
  }

  function roundCleared(round) {
    if (active?.completeRelease && active.entered && active.released === active.defeated) {
      active.waves = Math.max(active.waves,round);
    }
  }

  function finish(outcome) {
    if (!active) return null;
    const run = active;
    active = null;
    const clear = outcome === 'cleared' && run.entered && run.completeRelease &&
      run.seconds > 0 && run.released > 0 && run.released === run.defeated;
    const status = outcome === 'cleared' && !clear ? 'incomplete' : outcome;
    const key = run.recordKey;
    let best = key ? bests.get(key) ?? null : null;
    const newBest = !!(clear && run.eligible && !run.endless && key &&
      (best == null || run.seconds < best));
    if (newBest) {
      best = run.seconds;
      bests.set(key,best);
      try { storage.setItem(BEST_KEY,JSON.stringify({version:1,times:[...bests]})); } catch { /* Session best still works. */ }
    }
    lastAttempt = Object.freeze({
      id:run.id, status, endless:run.endless, seconds:run.seconds, kills:run.kills,
      shots:run.shots, hits:run.hits, headHits:run.headHits,
      accuracy:run.shots ? run.hits/run.shots : null,
      headshotRate:run.hits ? run.headHits/run.hits : null,
      healthLost:run.healthLost, waves:run.waves, eligible:run.eligible,
      best, newBest, recordKey:key
    });
    if (clear) lastClear = lastAttempt;
    return lastAttempt;
  }

  const id = () => active?.id ?? 0;
  const read = () => ({lastAttempt,lastClear});
  const bestFor = key => bests.get(key) ?? null;
  return {begin,release,enter,tick,fire,hit,death,hurt,roundCleared,finish,id,read,bestFor};
}
