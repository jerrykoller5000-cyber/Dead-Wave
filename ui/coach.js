import { text } from './strings.js';

export const COACH_STORAGE_KEY = 'dw.coach.v1';
const FLAGS = ['pickupShown', 'bankShown', 'purchaseShown', 'banked', 'purchased'];

// An observer of committed actions: this module never awards skulls/Cash or starts a wave.
export function createCoach({ load = () => null, save = () => {} } = {}) {
  let stored;
  try { stored = JSON.parse(load()); } catch { /* denied or old storage: session only */ }
  const profile = Object.fromEntries(FLAGS.map(key => [key, stored?.version === 1 && stored[key] === true]));
  let runId = null, ready = false, carried = 0, processing = false;
  let pickupSeen = false, purchasePending = false, card = null, remaining = 0, visible = false;
  const persist = () => { try { save(JSON.stringify({ version: 1, ...profile })); } catch { /* play still works */ } };
  function handle(event = {}) {
    if (event.type === 'controls-ready') { ready = true; return; }
    if (event.type === 'run-reset') {
      runId = event.runId; carried = 0; processing = false; pickupSeen = false;
      purchasePending = false; card = null; visible = false; return;
    }
    if (event.runId != null && runId != null && event.runId !== runId) return;
    if (event.type === 'skull-pickup' && event.count > 0) {
      pickupSeen = true;
      if (Number.isSafeInteger(event.carriedCount)) carried = event.carriedCount;
    } else if (event.type === 'deposit-accepted' && event.count > 0) {
      carried = 0; processing = true;
      if (card === 'pickup' || card === 'bank') card = null;
    } else if (event.type === 'deposit-complete' && event.count > 0 && event.value > 0) {
      processing = false; profile.banked = true; persist();
      if (card === 'pickup' || card === 'bank') card = null;
    } else if (event.type === 'purchase-delivered' && event.cashSpent > 0 &&
        ['kiosk', 'build', 'upgrade', 'repair'].includes(event.source)) {
      profile.purchased = true; purchasePending = !profile.purchaseShown; persist();
    }
  }
  function show(id, seconds) {
    card = id; remaining = seconds; profile[`${id}Shown`] = true;
    if (id === 'purchase') purchasePending = false;
    persist();
  }
  function tick(frame = {}) {
    if (Number.isSafeInteger(frame.skulls) && frame.skulls >= 0) carried = frame.skulls;
    if (typeof frame.pendingDeposit === 'boolean') processing = frame.pendingDeposit;
    if ((card === 'pickup' || card === 'bank') && (!carried || processing || profile.banked)) card = null;
    if (card === 'bank' && !frame.nearWindow) card = null;
    visible = ready && frame.active === true;
    if (!visible) return null;
    if (carried > 0 && !processing && frame.nearWindow && !profile.banked && !profile.bankShown) show('bank', Infinity);
    if (!card && carried > 0 && !processing && pickupSeen && !profile.banked && !profile.bankShown && !profile.pickupShown) show('pickup', 8);
    if (!card && purchasePending && !profile.purchaseShown) show('purchase', 6);
    const view = read();
    if (card && Number.isFinite(frame.dt) && frame.dt > 0) {
      remaining -= Math.min(frame.dt, 1);
      if (remaining <= 0) card = null;
    }
    return view;
  }
  function read() {
    if (!visible || !card) return null;
    return { id: card, title: text(`coach.${card}`),
      body: card === 'pickup' ? text('coach.return') : card === 'purchase' ? text('coach.loop') : '' };
  }
  return { handle, tick, profile: () => ({ ...profile }), read };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const hud = document.getElementById('hud');
  if (hud) {
    const coach = createCoach({ load: () => localStorage.getItem(COACH_STORAGE_KEY), save: value => localStorage.setItem(COACH_STORAGE_KEY, value) });
    const panel = document.createElement('aside'); panel.id = 'firstMinuteCoach'; panel.hidden = true;
    panel.setAttribute('role', 'status'); panel.setAttribute('aria-live', 'polite'); panel.setAttribute('aria-atomic', 'true');
    const title = document.createElement('strong'), body = document.createElement('span'); panel.append(title, body); hud.append(panel);
    const suppressed = () => document.hidden || ['opening','frontend','deploying','cine'].some(c => document.body.classList.contains(c)) ||
      !!document.querySelector('#pause.show, #shop.show, #win.show, #bigBanner.show, #devConsole.show');
    let frame = { active: false }, lastId = null;
    function render(view) {
      panel.hidden = !view;
      if (view && lastId !== view.id) { title.textContent = view.title; body.textContent = view.body; body.hidden = !view.body; }
      lastId = view?.id || null;
    }
    window.addEventListener('dw-game', ({ detail }) => {
      if (!detail) return;
      if (detail.type === 'hud-state') {
        frame = detail;
        render(coach.tick({ ...frame, active: frame.active && !suppressed() }));
      } else { coach.handle(detail); render(suppressed() ? null : coach.read()); }
    });
    // Pause/menu changes can stop gameplay ticks: hide the card immediately as well.
    const refresh = () => render(coach.tick({ ...frame, dt: 0, active: frame.active && !suppressed() }));
    const observer = new MutationObserver(refresh);
    for (const target of [document.body, ...document.querySelectorAll('#pause, #shop, #win, #bigBanner, #devConsole')]) observer.observe(target, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', refresh);
  }
}
