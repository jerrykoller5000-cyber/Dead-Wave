import { text } from './strings.js';

export function supplyNoticeText(event) {
  if (event?.type !== 'supply-drop' || !Number.isFinite(event.x) || !Number.isFinite(event.z)) return '';
  if (event.phase === 'inbound') {
    const title = text(event.breather ? 'supply.breatherInbound' : 'supply.inbound');
    return typeof event.bearing === 'string' && event.bearing
      ? title + ' · ' + text('supply.bearingShort', { bearing: event.bearing }) : title;
  }
  if (event.phase === 'landed') return text('supply.landed');
  if (event.phase === 'expired') return text('supply.expired');
  if (event.phase !== 'claimed') return '';
  const parts = [];
  if (event.ammoOffered) parts.push(text(event.rounds > 0 ? 'supply.ammoRestocked' : 'supply.ammoFull'));
  if (event.medpensOffered) parts.push(event.pens > 0 ? text('supply.medpens', { count: event.pens }) : text('supply.medpensFull'));
  if (event.grenades > 0) parts.push(text('supply.grenades', { count: event.grenades }));
  if (event.blueprint) parts.push(text('supply.blueprintFound'));
  return text('supply.title') + ' · ' + (parts.length ? parts.join(' · ') : text('supply.full'));
}

export function mountSupplyNotice({ doc = document, bus = window } = {}) {
  const element = doc.createElement('aside');
  element.id = 'supplyNotice'; element.hidden = true;
  element.setAttribute('role', 'status'); element.setAttribute('aria-live', 'polite');
  (doc.getElementById('hudNotices') || doc.body).append(element);
  let timer = 0;
  const onEvent = ({ detail }) => {
    if (detail?.type === 'run-reset') { clearTimeout(timer); element.textContent = ''; element.hidden = true; return; }
    const message = supplyNoticeText(detail);
    if (!message) return;
    element.textContent = message; element.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => { element.hidden = true; element.textContent = ''; }, 3800);
  };
  bus.addEventListener('dw-game', onEvent);
  return { element, destroy() { clearTimeout(timer); bus.removeEventListener('dw-game', onEvent); element.remove(); } };
}

if (typeof document !== 'undefined') mountSupplyNotice();
