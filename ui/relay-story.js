// GP-66: Ridgeline's morning dispatches, independent of the wave seed.
import { text } from './strings.js';

const validDay = day => Number.isSafeInteger(day) && day > 0;
export function createRelayStory() {
  // CK-1 (Jerry's story playtest): the lines the story can't do without. 1 is first contact, 12 why Heron can't land yet,
  // 14 the rhythm that opens the secret (quest.hear). A late repair must never lose them.
  const KEY = [1, 12, 14];
  let runId = null, lastMorning = 0, next = 1, current = null, delved = false, delvePending = false, originHeard = false, heard = new Set();
  function reset(id) { runId = id; lastMorning = 0; next = 1; current = null; delved = false; delvePending = false; originHeard = false; heard = new Set(); }
  function morning({ runId: id, day, repaired = false, board = 'none' } = {}) {
    if (id !== runId || !validDay(day) || day <= lastMorning) return null;
    lastMorning = day;
    if (!repaired) return null;
    const numbers = [];
    const unheardKeys = () => KEY.filter(k => !heard.has(k) && !numbers.includes(k));
    if (day > 20) {
      // CK-1: a relay first repaired after the last boat morning still gets first contact and the call, once.
      if (heard.size) {   // CK-1 (D-20): staying gets a word now and then
        const k = [23, 26, 29].indexOf(day);
        if (k < 0) return null;
        const said = { number: null, line: text('story.relay.stay' + (k + 1)) };
        current = { number: null, day, line: said.line, lines: [said] };
        return { ...current, lines: [{ ...said }] };
      }
      numbers.push(1, 20);
      next = 21;
    } else if (day >= 18) {
      numbers.push(...unheardKeys()); // CK-1: a late repair still hears the key lines
      numbers.push(day); // The boat lines stay tied to mornings 18–20.
      next = 21;
    } else if (next <= 17) {
      // Catch up whenever the unheard pre-boat lines exceed the mornings left: as many a morning as it takes, at most
      // three (CK-1; it was two, and a repair on day 12 or later lost line 14 and with it the secret), and on the last
      // pre-boat morning the key lines the catch-up could not reach.
      const count = Math.min(3, Math.ceil((18 - next) / (18 - day)));
      for (let i = 0; i < count && next <= 17; i++) numbers.push(next++);
      if (day === 17) numbers.push(...unheardKeys());
    }
    if (!numbers.length) return null;
    numbers.sort((x, y) => x - y);
    for (const n of numbers) heard.add(n);
    const lines = numbers.reverse().map(number => ({ number, line: text(number === 8 && delved ? 'story.relay.delve' : `story.relay.${number}`) }));
    if (delvePending && next > 8 && !numbers.includes(8)) lines.unshift({ number: null, line: text('story.relay.delve') });
    if (!originHeard && (board === 'carried' || board === 'wired')) {
      lines.unshift({ number: null, line: text(board === 'wired' ? 'story.relay.hushOriginWired' : 'story.relay.hushOrigin') });
      originHeard = true;
    }
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
