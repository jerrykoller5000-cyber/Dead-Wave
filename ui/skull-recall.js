import { text } from './strings.js';

// The combat producer reports each arriving skull separately. A wave-last-kill
// event identifies the batch; only its recalled pickups belong to this notice.
export function createSkullRecallFeedback({ onCount = () => {}, onChime = () => {}, onClear = () => {} } = {}) {
  let armed = false;
  let count = 0;
  let runId = null;
  return {
    handle(event) {
      if (!event || typeof event.type !== 'string') return;
      if (event.type === 'run-reset' || event.type === 'alarm-started') {
        armed = false; count = 0; runId = null; onClear();
      } else if (event.type === 'wave-last-kill') {
        armed = true; count = 0; runId = event.runId ?? null; onClear();
      } else if (event.type === 'skull-pickup' && armed && event.recalled === true &&
          (runId === null || event.runId === runId) &&
          Number.isSafeInteger(event.count) && event.count > 0) {
        const first = count === 0;
        count += event.count;
        if (first) onChime();
        onCount(count);
      }
    },
    read: () => ({ armed, count, runId })
  };
}

export function mountSkullRecallFeedback({ doc = document, bus = window, audio } = {}) {
  const skullCount = doc.getElementById('skulls');
  if (!skullCount) throw new Error('Skull HUD is missing');
  const notice = doc.createElement('span');
  notice.id = 'skullRecallNotice';
  notice.hidden = true;
  // The ordinary HUD is hidden during the last-kill camera, so this brief
  // notice lives above its cinematic layer until the skulls finish landing.
  doc.body.append(notice);
  let timer = 0;
  const clearTimer = () => { if (timer) clearTimeout(timer); timer = 0; };
  const feedback = createSkullRecallFeedback({
    onChime: () => audio?.skullPickup(),
    onCount: count => {
      notice.textContent = text('hud.skullRecall', { count });
      notice.hidden = false;
      clearTimer();
      timer = setTimeout(() => { notice.hidden = true; timer = 0; }, 2600);
    },
    onClear: () => { clearTimer(); notice.hidden = true; notice.textContent = ''; }
  });
  const listener = event => feedback.handle(event.detail);
  bus.addEventListener('dw-game', listener);
  return { element: notice, feedback, dispose() { bus.removeEventListener('dw-game', listener); clearTimer(); notice.remove(); } };
}
