export const TRAINING_WAVE_LIMIT = 10;
export const TRAINING_WAVE_SLOT_COUNT = 3;
const SAVES_KEY = 'tt_training_waves_v1';

export const TRAINING_OPTIONS = Object.freeze({
  release: 'all', countdown: 5, interval: 2, speed: 1, toughness: 1, dummy: false, lights: 'keep'
});

export function normalizeTrainingOptions(value) {
  const options = value ?? {};
  const pick = (key, values) => values.includes(options[key]) ? options[key] : TRAINING_OPTIONS[key];
  return {
    release: pick('release', ['all', 'trickle', 'endless']),
    countdown: pick('countdown', [3, 5, 10]),
    interval: pick('interval', [1, 2, 3]),
    speed: pick('speed', [.75, 1, 1.25]),
    toughness: pick('toughness', [.5, 1, 2]),
    dummy: options.dummy === true,
    lights: pick('lights', ['keep', 'on', 'off', 'alarm'])
  };
}

export function isDefaultTrainingOptions(value) {
  const settings = normalizeTrainingOptions(value);
  return Object.entries(TRAINING_OPTIONS).every(([key, option]) => settings[key] === option);
}

export function normalizeTrainingWave(rows, allowedKinds) {
  if (!Array.isArray(rows) || rows.length > TRAINING_WAVE_LIMIT) return null;
  const counts = new Map();
  let total = 0;
  for (const row of rows) {
    if (!row || row.kind === 'caveguard' || !allowedKinds.has(row.kind) ||
        !Number.isSafeInteger(row.count) || row.count < 1 || row.count > TRAINING_WAVE_LIMIT) return null;
    total += row.count;
    if (total > TRAINING_WAVE_LIMIT) return null;
    counts.set(row.kind, (counts.get(row.kind) ?? 0) + row.count);
  }
  return { rows: Array.from(counts, ([kind, count]) => ({kind, count})), total };
}

export function trainingPresetSample(plan, count, allowedKinds) {
  if (!plan || !Number.isSafeInteger(plan.total) || plan.total < count ||
      !Number.isSafeInteger(count) || count < 1 || count > TRAINING_WAVE_LIMIT) return null;
  const kinds = Object.entries(plan.kinds ?? {});
  if (kinds.length >= count || kinds.some(([kind, n]) => kind === 'shambler' ||
      !allowedKinds.has(kind) || !Number.isSafeInteger(n) || n < 1 || n > plan.total)) return null;
  const shamblers = plan.total - kinds.reduce((total, [, n]) => total + n,0);
  if (shamblers < count - kinds.length) return null;
  // Show each of this night's featured kinds once and fill the sample with its fodder.
  return normalizeTrainingWave([
    {kind:'shambler',count:count-kinds.length},
    ...kinds.map(([kind]) => ({kind,count:1}))
  ],allowedKinds);
}

export function createTrainingWaveSaves({storage, allowedKinds}) {
  const readSlot = value => {
    const label = typeof value?.label === 'string' ? value.label.trim().slice(0,32) : '';
    const wave = normalizeTrainingWave(value?.rows,allowedKinds);
    if (!label || !wave?.total) return null;
    const slot = { label, rows: wave.rows };
    if (value.settings != null) slot.settings = normalizeTrainingOptions(value.settings);
    return slot;
  };
  function read() {
    let slots;
    try { slots = JSON.parse(storage.getItem(SAVES_KEY)); } catch { /* No accessible saves. */ }
    return Array.from({length:TRAINING_WAVE_SLOT_COUNT},(_,i) =>
      slots?.version === 1 && Array.isArray(slots.values) ? readSlot(slots.values[i]) : null);
  }
  function save(index, value, {replace = false} = {}) {
    if (!Number.isInteger(index) || index < 0 || index >= TRAINING_WAVE_SLOT_COUNT) return false;
    const slot = readSlot(value);
    if (!slot) return false;
    const values = read();
    if (values[index] && !replace) return false;
    values[index] = slot;
    try {
      storage.setItem(SAVES_KEY,JSON.stringify({version:1,values}));
      return true;
    } catch { return false; }
  }
  return {read, save};
}
