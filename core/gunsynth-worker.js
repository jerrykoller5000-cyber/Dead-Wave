// CL-134: builds the gun sound banks (core/gunsynth.js) off the main thread, one key per message, so the game never
// stalls while the sounds are made. In: { key, sr }. Out: { key, bank } with its arrays transferred, or { key, error }.
import { buildBank, defForKey } from './gunsynth.js';
self.onmessage = (e) => {
  const { key, sr } = e.data || {};
  try {
    const def = defForKey(key);
    if (!def) { self.postMessage({ key, error: 'unknown' }); return; }
    const b = buildBank(key, def, sr);
    const transfer = [];
    for (const a of b.dry) transfer.push(a.buffer);
    for (const [l, r] of b.tail) transfer.push(l.buffer, r.buffer);
    self.postMessage({ key, bank: b }, transfer);
  } catch (err) {
    self.postMessage({ key, error: String(err && err.message || err) });
  }
};
