import { text } from './strings.js';

export const RECORDS_KEY = 'tt_best_run';
const FIELDS = ['day', 'kills', 'streak', 'headshots', 'skulls'];
const valid = value => Number.isSafeInteger(value) && value >= 0;
const empty = () => ({ version: 1, day: 0, kills: 0, streak: 0, headshots: 0, skulls: 0, runs: 0, evacuated: 0, escapeNight: 0, hotEscapeNight: 0, trueEndings: 0, trueEndingDay: 0 });

// Records only: no game state can be restored from this store.
export function createRecords({ load = () => null, save = () => {} } = {}) {
  let best = empty(); const finished = new Set();
  try {
    const value = JSON.parse(load());
    if (value?.version === 1 && [...FIELDS, 'runs', 'evacuated'].every(k => valid(value[k])) &&
        value.evacuated <= value.runs && (value.escapeNight === undefined || valid(value.escapeNight)) &&
        (value.hotEscapeNight === undefined || valid(value.hotEscapeNight)) &&
        (value.hotEscapeNight || 0) <= (value.escapeNight || 0) &&
        (value.trueEndings === undefined || valid(value.trueEndings) && value.trueEndings <= value.runs) &&
        (value.trueEndingDay === undefined || valid(value.trueEndingDay)))
      best = { ...empty(), ...Object.fromEntries([...FIELDS, 'runs', 'evacuated'].map(k => [k, value[k]])),
        escapeNight: value.escapeNight || 0, hotEscapeNight: value.hotEscapeNight || 0, trueEndings: value.trueEndings || 0, trueEndingDay: value.trueEndingDay || 0 };
  } catch { /* corrupt or denied storage cannot prevent play */ }
  return {
    read: () => ({ ...best }),
    finish(runId, result) {
      if ((typeof runId !== 'string' && !Number.isSafeInteger(runId)) || runId === '' || finished.has(runId) ||
          !result || !FIELDS.every(k => valid(result[k])) || result.day < 1 || typeof result.evacuated !== 'boolean' || (result.trueEnding !== undefined && typeof result.trueEnding !== 'boolean') || (result.trueEnding && result.evacuated)) return null;
      finished.add(runId);
      const newFields = FIELDS.filter(k => result[k] > best[k]);
      if (result.evacuated && result.day > best.escapeNight) newFields.push('escapeNight');
      for (const k of FIELDS) best[k] = Math.max(best[k], result[k]);
      best.runs = Math.min(Number.MAX_SAFE_INTEGER, best.runs + 1);
      if (result.evacuated) best.evacuated = Math.min(best.runs, best.evacuated + 1);
      if (result.evacuated) best.escapeNight = Math.max(best.escapeNight, result.day);
      if (result.evacuated && result.hot) best.hotEscapeNight = Math.max(best.hotEscapeNight, result.day);
      if (result.trueEnding === true) {
        best.trueEndings = Math.min(best.runs, best.trueEndings + 1);
        best.trueEndingDay = result.day; newFields.push('trueEndingDay');
      }
      try { save(JSON.stringify(best)); } catch { /* retain session record */ }
      return { best: { ...best }, newFields };
    }
  };
}

export function bestRecordParts(best, newFields = []) {
  if (!best || !valid(best.runs) || !best.runs) return [];
  const parts = ['day', 'kills', 'streak'].map(key => ({ key,
    text: text('records.' + key, { count: best[key].toLocaleString('en-US') }),
    isNew: newFields.includes(key) }));
  if (best.escapeNight) parts.push({ key: 'escapeNight', text: text('story.ending.boat', { night: best.escapeNight }) +
    (best.hotEscapeNight === best.escapeNight ? ' ' + text('records.hotExtraction') : ''), isNew: newFields.includes('escapeNight') });
  if (best.trueEndings) parts.push({key:'trueEndingDay',text:text('records.trueEnding',{day:best.trueEndingDay}),isNew:newFields.includes('trueEndingDay')});
  return parts;
}

export function renderBestRecord(el, best, newFields = []) {
  const parts = bestRecordParts(best, newFields); el.replaceChildren(); el.hidden = !parts.length;
  if (!parts.length) return;
  const doc = el.ownerDocument, title = doc.createElement('span'); title.textContent = text('records.best'); el.append(title);
  for (const [index, part] of parts.entries()) {
    const value = doc.createElement('span'); value.textContent = (index ? ' · ' : ' ') + part.text;
    if (part.isNew) { const badge = doc.createElement('strong'); badge.className = 'record-new'; badge.textContent = text('records.new'); value.append(' ', badge); }
    el.append(value);
  }
}
