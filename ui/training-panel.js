// CL-115 (Jerry, 2026-10-02): the Training Ground's HQ panel. In the main game the panel starts the night; here it
// calls zombies into the build room through the gate, as many of one kind as he asks for, and clears them again.
// Also the little strip at the top of the screen that says where he is. The words are ChatGPT's to word
// (hasText keys with English fallbacks until then).
import { text, hasText } from './strings.js';

const say = (key, params, fallback) => {
  if (!hasText(key)) return String(fallback).replace(/\{(\w+)\}/g, (_, k) => (params && params[k] != null ? params[k] : ''));
  try { return text(key, params || {}); } catch (_) { return fallback; }
};

export const TRAINING_COUNTS = Object.freeze([1, 3, 5, 10]);

// types: [{ key, name }]; onSpawn(key, count) -> number spawned; onClear() -> number cleared; onClose()
export function mountTrainingPanel({ doc = document, types = [], onSpawn = () => 0, onClear = () => 0, onClose = () => {}, alive = () => 0 } = {}) {
  const el = (tag, cls, txt) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const root = el('section'); root.id = 'trainingPanel'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-labelledby', 'trainingPanelTitle');
  const card = el('div', 'tp-card');
  const head = el('header', 'tp-head');
  const eyebrow = el('p', 'tp-eyebrow', say('training.panelEyebrow', {}, 'Training Ground · HQ panel'));
  const title = el('h2', null, say('training.panelTitle', {}, 'Call in zombies')); title.id = 'trainingPanelTitle';
  const hint = el('p', 'tp-hint', say('training.panelHint', {}, 'They come through the gate and stay in the build room.'));
  head.append(eyebrow, title, hint);
  const typeGrid = el('div', 'tp-types'); typeGrid.setAttribute('role', 'radiogroup');
  const countRow = el('div', 'tp-counts');
  const status = el('p', 'tp-status'); status.setAttribute('aria-live', 'polite');
  const actions = el('div', 'tp-actions');
  const spawnBtn = el('button', 'tp-spawn'); spawnBtn.type = 'button';
  const clearBtn = el('button', 'tp-clear', say('training.clear', {}, 'Clear all')); clearBtn.type = 'button';
  const closeBtn = el('button', 'tp-close', say('training.close', {}, 'Close')); closeBtn.type = 'button';
  actions.append(spawnBtn, clearBtn, closeBtn);
  card.append(head, el('h3', null, say('training.kind', {}, 'Kind')), typeGrid, el('h3', null, say('training.count', {}, 'How many')), countRow, status, actions);
  root.append(card);
  doc.body.append(root);

  let pick = types[0] ? types[0].key : null, count = TRAINING_COUNTS[1], open = false;
  function render() {
    typeGrid.replaceChildren();
    for (const t of types) {
      const b = el('button', t.key === pick ? 'on' : '', t.name); b.type = 'button'; b.dataset.kind = t.key;
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(t.key === pick));
      b.addEventListener('click', () => { pick = t.key; render(); });
      typeGrid.append(b);
    }
    countRow.replaceChildren();
    for (const n of TRAINING_COUNTS) {
      const b = el('button', n === count ? 'on' : '', String(n)); b.type = 'button'; b.dataset.count = String(n);
      b.setAttribute('aria-pressed', String(n === count));
      b.addEventListener('click', () => { count = n; render(); });
      countRow.append(b);
    }
    const name = (types.find((t) => t.key === pick) || {}).name || '';
    spawnBtn.textContent = say('training.spawn', { count, kind: name }, 'Send in {count} · {kind}');
    spawnBtn.disabled = !pick;
    const n = alive();
    status.textContent = n ? say('training.alive', { count: n }, '{count} in the build room') : say('training.none', {}, 'The build room is empty.');
  }
  function show() { if (open) return; open = true; root.hidden = false; render(); spawnBtn.focus({ preventScroll: true }); }
  function hide() { if (!open) return; open = false; root.hidden = true; onClose(); }
  spawnBtn.addEventListener('click', () => { if (pick) onSpawn(pick, count); hide(); });
  clearBtn.addEventListener('click', () => { onClear(); render(); });
  closeBtn.addEventListener('click', hide);
  root.addEventListener('keydown', (e) => { if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); hide(); } });
  return { open: show, close: hide, isOpen: () => open, render, element: root, pick: (k, n) => { if (k) pick = k; if (n) count = n; render(); },
    dispose() { root.remove(); } };
}

// The strip at the top: where he is, the targets he's dropped, and what's loose in the build room.
export function mountTrainingHud({ doc = document } = {}) {
  const el = doc.createElement('div'); el.id = 'trainingHud'; el.hidden = true;
  const name = doc.createElement('b'); name.textContent = say('training.title', {}, 'Training Ground');
  const stats = doc.createElement('span');
  el.append(name, stats);
  (doc.getElementById('hud') || doc.body).append(el);
  return {
    element: el,
    show(on) { el.hidden = !on; },
    set({ hits = 0, alive = 0 } = {}) {
      const t = say('training.hudHits', { count: hits }, 'Targets down {count}') + (alive ? ' · ' + say('training.hudAlive', { count: alive }, '{count} zombies loose') : '');
      if (stats.textContent !== t) stats.textContent = t;
    }
  };
}
