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

// onSpawn queues a deployment; pending returns its countdown while it is queued.
// CL-151: onLayout lays the standard test builds in front of the gate (laidOut: how many of them still stand).
// CU-123: onClearLayout takes that set away. The button shows only while some of it is still standing.
export function mountTrainingPanel({ doc = document, types = [], onSpawn = () => 0, onClear = () => 0, onClose = () => {}, alive = () => 0, pending = () => null, onLayout = null, onClearLayout = null, laidOut = () => 0 } = {}) {
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
  const callRow = el('div', 'tp-row');
  const toolRow = el('div', 'tp-row tp-tools');
  const spawnBtn = el('button', 'tp-spawn'); spawnBtn.type = 'button';
  const clearBtn = el('button', 'tp-clear', say('training.clear', {}, 'Clear all')); clearBtn.type = 'button';
  const closeBtn = el('button', 'tp-close', say('training.close', {}, 'Close')); closeBtn.type = 'button';
  const layoutBtn = onLayout ? el('button', 'tp-layout') : null;
  if (layoutBtn) layoutBtn.type = 'button';
  const clearLayoutBtn = onClearLayout ? el('button', 'tp-clear tp-clear-layout') : null;
  if (clearLayoutBtn) clearLayoutBtn.type = 'button';
  callRow.append(spawnBtn, closeBtn);
  toolRow.append(clearBtn, ...(layoutBtn ? [layoutBtn] : []), ...(clearLayoutBtn ? [clearLayoutBtn] : []));
  actions.append(callRow, toolRow);
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
    const queued = pending(), n = alive();
    spawnBtn.disabled = !pick || !!queued || n > 0;
    spawnBtn.title = n > 0 ? text('training.finishGroup') : '';
    clearBtn.textContent = say(queued ? 'training.cancelClear' : 'training.clear', {}, queued ? 'Cancel / clear all' : 'Clear all zombies');
    if (layoutBtn) {
      const laid = laidOut();
      layoutBtn.textContent = laid ? say('training.layoutAgain', {}, 'Rebuild the test builds') : say('training.layout', {}, 'Lay out test builds');
      layoutBtn.title = say('training.layoutHint', {}, 'A barricade, sandbags, three walls, wire and a light turret in front of the gate');
      if (clearLayoutBtn) {
        clearLayoutBtn.hidden = laid <= 0;
        clearLayoutBtn.textContent = say('training.layoutClear', {}, 'Clear test defenses');
      }
    }
    status.textContent = queued ? text('training.queued', { seconds: queued.seconds, count: queued.count }) : n ? say('training.alive', { count: n }, '{count} in the build room') + ' · ' + text('training.finishGroup') : say('training.none', {}, 'The build room is empty.');
  }
  function show() { if (open) return; open = true; root.hidden = false; render(); spawnBtn.focus({ preventScroll: true }); }
  function hide() { if (!open) return; open = false; root.hidden = true; onClose(); }
  spawnBtn.addEventListener('click', () => { if (!pick || pending() || alive() > 0) { render(); return; } onSpawn(pick, count); hide(); });
  clearBtn.addEventListener('click', () => { onClear(); render(); });
  if (layoutBtn) layoutBtn.addEventListener('click', () => { onLayout(); render(); });
  if (clearLayoutBtn) clearLayoutBtn.addEventListener('click', () => { onClearLayout(); render(); });
  closeBtn.addEventListener('click', hide);
  root.addEventListener('keydown', (e) => { if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); hide(); } });
  return { open: show, close: hide, isOpen: () => open, render, element: root, pick: (k, n) => { if (k) pick = k; if (n) count = n; render(); },
    dispose() { root.remove(); } };
}

// The strip at the top: where he is, the targets he's dropped, and what's loose in the build room.
// CL-144: and the score: this string's, the best of the visit's strings, and each hit's points as it lands (a pop
// under the strip: the zone, its points, the lane's multiplier, the total).
export function mountTrainingHud({ doc = document } = {}) {
  const el = doc.createElement('div'); el.id = 'trainingHud'; el.hidden = true;
  const name = doc.createElement('b'); name.textContent = say('training.title', {}, 'Training Ground');
  const stats = doc.createElement('span');
  const score = doc.createElement('span'); score.className = 'training-score';
  el.append(name, stats, score);
  const pop = doc.createElement('div'); pop.id = 'trainingScorePop'; pop.hidden = true; pop.setAttribute('aria-live', 'polite');
  let popId = 0;
  const countdown = doc.createElement('div'); countdown.id = 'trainingCountdown'; countdown.hidden = true;
  countdown.setAttribute('role','status'); countdown.setAttribute('aria-live','polite'); countdown.setAttribute('aria-atomic','true');
  const label=doc.createElement('b');label.textContent=text('training.countdownTitle');
  const number=doc.createElement('strong'), detail=doc.createElement('span');
  countdown.append(label,number,detail);
  (doc.getElementById('hud') || doc.body).append(el,countdown,pop);
  return {
    element: el,
    show(on) { el.hidden = !on; if(!on){countdown.hidden=true;pop.hidden=true;} },
    setDeployment(plan) {
      countdown.hidden=!plan||el.hidden;
      if(!plan)return;
      number.textContent=String(plan.seconds);
      detail.textContent=text('training.countdownDetail',{count:plan.count,kind:say('enemy.'+plan.kind+'.name',{},plan.kind)});
    },
    set({ hits = 0, alive = 0, score: pts = null, best = 0, last = null } = {}) {
      const t = say('training.hudHits', { count: hits }, 'Targets down {count}') + (alive ? ' · ' + say('training.hudAlive', { count: alive }, '{count} zombies loose') : '');
      if (stats.textContent !== t) stats.textContent = t;
      const st = pts == null ? '' : say('training.hudScore', { score: pts }, 'Score {score}') + (best ? ' · ' + say('training.hudBest', { score: best }, 'Best {score}') : '');
      if (score.textContent !== st) score.textContent = st;
      if (last && last.id !== popId && !el.hidden) {
        popId = last.id;
        const zone = say('training.zone.' + last.zone, {}, ({ head: 'Head ring', bull: 'Bullseye', ring: 'Chest ring', plate: 'Plate' })[last.zone] || last.zone);
        pop.textContent = '+' + last.total + '  ' + zone + ' ' + last.points + (last.mult !== 1 ? ' × ' + last.mult : '');
        pop.dataset.zone = last.zone;
        pop.hidden = false; pop.classList.remove('on'); void pop.offsetWidth; pop.classList.add('on');
      }
    }
  };
}
