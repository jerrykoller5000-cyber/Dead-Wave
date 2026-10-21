import { COUNTER } from '../game/weaknesses.js';
import { text } from './strings.js';

export function createEnemyCounterCards({ onView = () => {} } = {}) {
  let runId = null;
  const seen = new Set();
  const queue = [];
  let current = null;
  const notify = () => onView(current && {
    kind: current,
    title: text('counter.firstSeen', { enemy: text(`enemy.${current}.name`) }),
    line: text(`counter.${current}`)
  });
  return {
    handle(event) {
      if (!event || typeof event.type !== 'string') return;
      if (event.type === 'run-reset') {
        runId = event.runId ?? null;
        seen.clear(); queue.length = 0; current = null; notify();
        return;
      }
      if (event.type !== 'enemy-first-seen') return;
      if (runId === null) runId = event.runId ?? null;
      if (runId !== null && event.runId !== runId) return;
      const kind = event.kind;
      if (typeof kind !== 'string' || !Object.hasOwn(COUNTER, kind) || seen.has(kind)) return;
      seen.add(kind);
      queue.push(kind);
      if (!current) { current = queue.shift(); notify(); }
    },
    advance() {
      if (!current) return;
      current = queue.shift() || null;
      notify();
    },
    read: () => ({ runId, current, queued: queue.slice(), seen: [...seen] })
  };
}

export function mountEnemyCounterCards({ doc = document, bus = window } = {}) {
  const card = doc.createElement('div');
  card.id = 'enemyCounterCard'; card.hidden = true;
  card.setAttribute('role', 'status'); card.setAttribute('aria-live', 'polite');
  const title = doc.createElement('strong'), line = doc.createElement('span');
  card.append(title, line); doc.body.append(card);
  let timer = 0;
  const clearTimer = () => { if (timer) clearTimeout(timer); timer = 0; };
  const cards = createEnemyCounterCards({ onView: view => {
    clearTimer();
    card.hidden = !view;
    card.dataset.kind = view?.kind || '';
    title.textContent = view?.title || '';
    line.textContent = view?.line || '';
    if (view) timer = setTimeout(() => { cards.advance(); timer = 0; }, 4900);
  } });
  const listener = event => cards.handle(event.detail);
  bus.addEventListener('dw-game', listener);
  return { element: card, cards, dispose() { bus.removeEventListener('dw-game', listener); clearTimer(); card.remove(); } };
}
