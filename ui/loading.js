import { text } from './strings.js';

const STAGES = ['terrain', 'world', 'zombies', 'shaders'];
const STATES = new Set(['waiting', 'active', 'complete', 'failed']);

// Counts belong to each stage. They are never added into a made-up overall percentage.
export function loadingView(snapshot) {
  const state = ['ready', 'failed'].includes(snapshot?.state) ? snapshot.state : 'loading';
  const rows = STAGES.map(id => {
    const stage = snapshot?.stages?.[id];
    const status = STATES.has(stage?.state) ? stage.state : 'waiting';
    const total = stage?.totalUnits, completed = stage?.completedUnits;
    const measured = Number.isSafeInteger(total) && total > 0 &&
      Number.isSafeInteger(completed) && completed >= 0 && completed <= total;
    return { id, label: text(`loading.stage.${id}`), state: status,
      status: text(status === 'failed' ? 'loading.error' : status === 'waiting' ? 'loading.pending' : `loading.${status}`),
      units: measured ? text('loading.units', { completed, total, unit: '' }).trim() : '',
      completed: measured ? completed : null, total: measured ? total : null };
  });
  const activeStep = snapshot?.steps?.find(step => step.state === 'active');
  const activeId = activeStep?.stageId || rows.find(row => row.state === 'active')?.id;
  return { state, rows, headline: text(state === 'ready' ? 'loading.ready' :
    state === 'failed' ? 'loading.failed' : STAGES.includes(activeId) ? `loading.${activeId}` : 'loading.unknown') };
}

// One channel belongs to one page load. A stale event cannot switch this subscription
// to another load or rewind it; retry creates a fresh page/channel under the core contract.
export function observeLoading(channel, render) {
  const loadId = channel.loadId;
  let sequence = -1, terminal = false;
  return channel.subscribe(snapshot => {
    if (!snapshot || snapshot.loadId !== loadId || terminal ||
        !Number.isSafeInteger(snapshot.sequence) || snapshot.sequence <= sequence) return;
    sequence = snapshot.sequence;
    render(loadingView(snapshot));
    terminal = snapshot.state === 'ready' || snapshot.state === 'failed';
  });
}

export function mountLoading({ root, host, retry, channel, document: doc = root.ownerDocument }) {
  root.dataset.loadUi = 'true';
  const panel = doc.createElement('section'); panel.className = 'dw-load-stages';
  const headline = doc.createElement('p'); headline.className = 'dw-load-headline';
  headline.setAttribute('role', 'status'); headline.setAttribute('aria-live', 'polite');
  const list = doc.createElement('ul'); panel.append(headline, list);
  const nodes = STAGES.map(id => {
    const row = doc.createElement('li'); row.dataset.stage = id;
    const label = doc.createElement('span'), status = doc.createElement('span');
    status.className = 'dw-load-state';
    const meter = doc.createElement('progress'); meter.setAttribute('aria-label', text(`loading.stage.${id}`));
    row.append(label, status, meter); list.append(row); return { row, label, status, meter };
  });
  host.insertBefore(panel, retry);
  retry.textContent = text('loading.retry');
  let current = loadingView(null);
  const render = view => {
    current = view; panel.dataset.state = view.state;
    panel.setAttribute('aria-busy', String(view.state === 'loading'));
    if (headline.textContent !== view.headline) headline.textContent = view.headline;
    view.rows.forEach((data, i) => {
      const { row, label, status, meter } = nodes[i];
      row.dataset.state = data.state; label.textContent = data.label;
      status.textContent = data.units ? `${data.status} · ${data.units}` : data.status;
      meter.hidden = data.state !== 'active';
      if (data.total !== null) { meter.max = data.total; meter.value = data.completed; }
      else meter.removeAttribute('value');
    });
    if (view.state === 'failed') retry.hidden = false;
  };
  render(current);
  let unsubscribe = () => {}, connected = false;
  const connect = source => {
    if (connected || !source?.subscribe) return;
    connected = true; unsubscribe = observeLoading(source, render);
  };
  if (channel) connect(channel);
  return { connect, fail() { if (current.state === 'loading') render({ ...current, state: 'failed', headline: text('loading.failed') }); },
    disconnect() { unsubscribe(); },
    dispose() { unsubscribe(); panel.remove(); delete root.dataset.loadUi; } };
}

// Presentation-only adapter: the core still owns boot, retry and the video/menu gate.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const root = document.getElementById('opening');
  const host = root?.querySelector('.opening-load');
  const retry = document.getElementById('openingRetry');
  if (root && host && retry) {
    const ui = mountLoading({ root, host, retry, channel: window.DWLoad });
    const connect = () => ui.connect(window.DWLoad);
    window.addEventListener('dw-load', connect);
    const fail = event => { if (event.type !== 'error' || event.error || event.target?.type === 'module') ui.fail(); };
    window.addEventListener('error', fail, true);
    window.addEventListener('unhandledrejection', fail);
    window.addEventListener('dw-opening-complete', () => {
      window.removeEventListener('dw-load', connect);
      window.removeEventListener('error', fail, true);
      window.removeEventListener('unhandledrejection', fail);
      ui.disconnect();
      // Keep the last Ready frame in place while the opening dissolves.
    }, { once: true });
  }
}
