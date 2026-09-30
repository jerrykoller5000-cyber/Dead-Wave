import { text } from './strings.js';

// The combat scene owns the escape window and its cost. This observer only
// presents the committed phase and receipt to the player.
export function createGuardianEscapeFeedback({ onView = () => {} } = {}) {
  let runId = null;
  let view = { mode: 'hidden', presses: 0, need: 0, lostCount: 0 };
  const receipts = new Set();
  const show = next => { view = next; onView({ ...view }); };
  return {
    handle(event) {
      if (!event || typeof event.type !== 'string') return;
      if (event.type === 'run-reset') {
        runId = event.runId ?? null;
        receipts.clear();
        show({ mode: 'hidden', presses: 0, need: 0, lostCount: 0 });
        return;
      }
      if (event.type !== 'cave-guardian' && event.type !== 'guardian-kick-free') return;
      if (runId === null) runId = event.runId ?? null;
      if (runId !== null && event.runId !== runId) return;
      if (event.type === 'cave-guardian') {
        if (event.phase !== 'escape') return;
        if ((event.state === 'open' || event.state === 'press') &&
            Number.isSafeInteger(event.need) && event.need > 0 &&
            Number.isSafeInteger(event.presses) && event.presses >= 0) {
          show({ mode: 'escape', presses: Math.min(event.presses, event.need), need: event.need, lostCount: 0 });
        } else if (event.state === 'free' || event.state === 'closed') {
          show({ mode: 'hidden', presses: 0, need: 0, lostCount: 0 });
        }
      } else if (typeof event.receiptId === 'string' && event.receiptId && !receipts.has(event.receiptId)) {
        receipts.add(event.receiptId);
        show({ mode: 'result', presses: 0, need: 0,
          lostCount: Number.isSafeInteger(event.lostCount) && event.lostCount > 0 ? event.lostCount : 0 });
      }
    },
    clearResult() {
      if (view.mode === 'result') show({ mode: 'hidden', presses: 0, need: 0, lostCount: 0 });
    },
    read: () => ({ ...view, runId })
  };
}

export function mountGuardianEscapeFeedback({ doc = document, bus = window } = {}) {
  const panel = doc.createElement('div');
  panel.id = 'guardianEscapeNotice';
  panel.hidden = true;
  panel.setAttribute('role', 'status');
  panel.setAttribute('aria-live', 'polite');
  const title = doc.createElement('strong');
  const detail = doc.createElement('span');
  panel.append(title, detail);
  doc.body.append(panel);
  let timer = 0;
  const clearTimer = () => { if (timer) clearTimeout(timer); timer = 0; };
  const feedback = createGuardianEscapeFeedback({ onView: view => {
    clearTimer();
    panel.hidden = view.mode === 'hidden';
    panel.dataset.mode = view.mode;
    if (view.mode === 'escape') {
      title.textContent = text('guardian.escape.prompt');
      detail.textContent = text('guardian.escape.coach', { presses: view.presses, need: view.need });
    } else if (view.mode === 'result') {
      title.textContent = text(view.lostCount > 0 ? 'guardian.escape.lostSkulls' : 'guardian.escape.free');
      detail.textContent = '';
      timer = setTimeout(() => { feedback.clearResult(); timer = 0; }, 3800);
    } else {
      title.textContent = '';
      detail.textContent = '';
    }
  } });
  const listener = event => feedback.handle(event.detail);
  bus.addEventListener('dw-game', listener);
  return { element: panel, feedback, dispose() { bus.removeEventListener('dw-game', listener); clearTimer(); panel.remove(); } };
}
