// GP-66: Ridgeline's morning dispatches, independent of the wave seed.
import { text } from './strings.js';

const validDay = day => Number.isSafeInteger(day) && day > 0;
export function createRelayStory() {
  let runId = null, lastMorning = 0, next = 1, current = null, delved = false, delvePending = false;
  function reset(id) { runId = id; lastMorning = 0; next = 1; current = null; delved = false; delvePending = false; }
  function morning({ runId: id, day, repaired = false } = {}) {
    if (id !== runId || !validDay(day) || day <= lastMorning) return null;
    lastMorning = day;
    if (!repaired || day > 20) return null;
    const numbers = [];
    if (day >= 18) {
      numbers.push(day); // The boat lines stay tied to mornings 18–20.
      next = 21;
    } else if (next <= 17) {
      // Catch up whenever the unheard pre-boat lines exceed the mornings left.
      const count = (18 - next) > (18 - day) ? 2 : 1;
      for (let i = 0; i < count && next <= 17; i++) numbers.push(next++);
    }
    if (!numbers.length) return null;
    const lines = numbers.reverse().map(number => ({ number, line: text(number === 8 && delved ? 'story.relay.delve' : `story.relay.${number}`) }));
    if (delvePending && next > 8 && !numbers.includes(8)) lines.unshift({ number: null, line: text('story.relay.delve') });
    if (numbers.includes(8) || next > 8) delvePending = false;
    current = { number: lines[0].number, day, line: lines[0].line, lines };
    return { ...current, lines: lines.map(item => ({ ...item })) };
  }
  function read(repaired = false) {
    if (!repaired) return { status: 'silent', line: text('story.relay.silent'), number: null };
    if (!current) return { status: 'awaiting', line: text('story.relay.awaiting'), number: null };
    return { status: 'heard', ...current, lines: current.lines.map(item => ({ ...item })) };
  }
  function firstDelve(id) {
    if (id !== runId || delved) return false;
    delved = true; delvePending = true; return true;
  }
  return { reset, morning, read, firstDelve };
}
