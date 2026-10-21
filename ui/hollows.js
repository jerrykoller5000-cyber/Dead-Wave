import { text, hasText } from './strings.js';

// GP-84: projections of the owners' snapshots. Never infer a clearance or grant loot.
const themes = ['root', 'shale', 'iron', 'wet', 'hill'];
const clamp = (n, max) => Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
const named = (key, fallback) => text(hasText(key) ? key : fallback);
const warrenName = theme => named('hollow.theme.' + theme, 'hollow.title');
export function buildHollowHUD({ active, hollow, hush, stir } = {}) {
  if (!active || !hollow?.below) return null;
  const seconds = Math.ceil(clamp(hush?.battery, 480));
  const meter = Math.round(clamp(stir?.stir, 100));
  const phase = ['warning', 'grab'].includes(stir?.phase) ? stir.phase : meter >= 70 ? 'rising' : 'calm';
  return {
    title: hollow.place === 'heart' ? text('hollow.heart') : warrenName(hollow.theme),
    depth: text('hollow.depth', { depth: [1, 2, 3].includes(hollow.depth) ? hollow.depth : 1,
      name: text('hollow.depth.' + ([1, 2, 3].includes(hollow.depth) ? hollow.depth : 1)) }),
    battery: seconds ? text('hollow.battery', { time: Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') }) : text('hollow.flat'),
    meter, stir: text('hollow.stir', { amount: meter }), phase,
    warning: text('hollow.stir.' + phase, { seconds: Math.ceil(clamp(stir?.left, 10)) })
  };
}

export function buildHollowBoard({ hollow, hush } = {}) {
  if (!hollow || !Array.isArray(hollow.warrens)) return null;
  const rows = hollow.warrens.filter(row => themes.includes(row?.theme));
  return { title: text('hollow.title'),
    charge: text(!hush?.owned ? 'hollow.notOwned' : hush.charged ? 'hollow.charged' : 'hollow.spent'),
    rows: rows.map(row => ({ name: warrenName(row.theme),
      status: text(row.cleared ? 'hollow.cleared' : 'hollow.uncleared'),
      passage: row.passage?.open ? text('hollow.passageOpen', {
        to: warrenName(rows.find(other => other.cave === row.passage.to)?.theme) }) : text('hollow.passageShut') })),
    marrow: text('hollow.marrowSealed') };
}

export function hollowPickupNote(receipt, quest) {
  if (!receipt) return null;
  if (receipt.kind === 'tag') {
    const key = 'hollow.tag.' + String(receipt.id).replace(':', '.');
    return hasText(key + '.name') ? { title: text(key + '.name'), lines: [text(key + '.line')] } : null;
  }
  const lines = [];
  if (receipt.kind === 'box') {
    const p = receipt.prize;
    if (p?.kind === 'blueprint') lines.push(text('hollow.prize.blueprint', { name: named('build.' + p.id + '.name', 'hollow.gear') }));
    else if (p?.kind === 'gun') lines.push(text('hollow.prize.gun', { name: named('weapon.' + p.id + '.name', 'hollow.gear') }));
    else if (p?.kind === 'mod') lines.push(text('hollow.prize.mod', {
      name: named('hollow.mod.' + p.id, 'hollow.gear'), gun: named('weapon.' + p.gun + '.name', 'hollow.gear') }));
    else if (p?.kind === 'camo') lines.push(text('hollow.prize.camo'));
    const place = receipt.shard;
    // Only the already-learned public view may reveal a glyph, including glyph zero.
    const glyph = Number.isInteger(place) && place >= 0 && place < 5 ? quest?.known?.[place] : null;
    if (Number.isInteger(glyph) && glyph >= 0 && glyph < 8)
      lines.push(text('hollow.shard', { glyph: text('quest.glyph.' + glyph), place: text('hollow.place.' + place) }));
    else if (Number.isInteger(place) && place >= 0 && place < 5) lines.push(text('haul.shard'));
    return lines.length ? { title: text('haul.strongbox'), lines } : null;
  }
  if (receipt.kind === 'crate') {
    for (const item of receipt.items || []) {
      if (!Number.isSafeInteger(item?.qty) || item.qty <= 0) continue;
      if (item.id === 'medkit' || item.id === 'grenade') lines.push(text('hollow.crate.' + item.id, { count: item.qty }));
      else if (typeof item.id === 'string' && /^ammo:[a-zA-Z0-9.]+$/.test(item.id))
        lines.push(text('hollow.crate.ammo', { caliber: item.id.slice(5), count: item.qty }));
    }
    return lines.length ? { title: text('hollow.supplies'), lines } : null;
  }
  return null;
}

export function renderHollowBoard(parent, data, doc) {
  const view = buildHollowBoard(data); if (!view) return;
  const section = doc.createElement('section'); section.className = 'briefing-hollows';
  const line = (tag, value, host = section) => { const el = doc.createElement(tag); el.textContent = value; host.append(el); };
  line('h3', view.title); line('p', view.charge);
  for (const row of view.rows) {
    const article = doc.createElement('article'); section.append(article);
    line('h4', row.name + ' · ' + row.status, article); line('p', row.passage, article);
  }
  line('p', view.marrow); parent.append(section);
}

export function mountHollows({ doc = document, host = window, getState }) {
  const root = doc.createElement('section'); root.id = 'hollowsHUD'; root.hidden = true;
  root.setAttribute('aria-label', text('hollow.title'));
  const make = (tag, parent = root) => { const el = doc.createElement(tag); parent.append(el); return el; };
  const title = make('strong'), depth = make('p'), battery = make('p'), stir = make('p'), meter = make('meter'), warning = make('p');
  meter.min = 0; meter.max = 100; meter.low = 30; meter.high = 70; meter.optimum = 0; meter.setAttribute('aria-label', text('hollow.stirLabel'));
  warning.className = 'hollow-warning'; warning.setAttribute('role', 'status');
  const card = doc.createElement('aside'); card.id = 'hollowPickup'; card.hidden = true;
  card.setAttribute('role', 'status'); card.setAttribute('aria-live', 'polite');
  const noteTitle = make('strong', card), noteBody = make('p', card);
  const hud = doc.getElementById?.('hud') || doc.body;
  (doc.getElementById?.('hudNotices') || hud).append(root);
  hud.append(card);
  const put = (el, value) => { if (el.textContent !== value) el.textContent = value; };
  let poll = 0, remaining = 0, pending = [], seen = new Set(), lastRun;
  const hide = () => { root.hidden = card.hidden = true; remaining = 0; pending = []; };
  const showNext = () => {
    const note = pending.shift(); if (!note) { card.hidden = true; return; }
    put(noteTitle, note.title); put(noteBody, note.lines.join('\n')); card.hidden = false; remaining = 12;
  };
  function update(dt = 0, force = false) {
    const elapsed = clamp(dt, 1); poll -= elapsed;
    if (!force && poll > 0) return;
    const passed = 0.2 - poll; poll = 0.2;
    const state = getState();
    if (state.runId !== lastRun) { hide(); seen.clear(); lastRun = state.runId; }
    const view = buildHollowHUD(state);
    if (!view) { root.hidden = card.hidden = true; return; }
    root.hidden = false;
    put(title, view.title); put(depth, view.depth); put(battery, view.battery); put(stir, view.stir);
    if (meter.value !== view.meter) meter.value = view.meter;
    root.dataset.phase = view.phase; put(warning, view.warning);
    if (remaining > 0) { remaining -= Math.max(0, passed); card.hidden = false; }
    if (remaining <= 0) showNext();
  }
  const receive = ({ detail: e }) => {
    if (e?.type === 'run-reset') { hide(); seen.clear(); lastRun = e.runId; return; }
    if (e?.type === 'hollow' && e.phase === 'leave') { hide(); return; }
    if (e?.type !== 'hollow-pickup') return;
    const state = getState();
    if (!state.active || !state.hollow?.below) return;
    if (state.runId !== lastRun) { hide(); seen.clear(); lastRun = state.runId; }
    const id = e.receiptId || (e.kind === 'tag' ? 'tag:' + e.id : null);
    if (id && seen.has(id)) return;
    const note = hollowPickupNote(e, state.quest); if (!note) return;
    if (id) seen.add(id); pending.push(note);
    if (card.hidden || remaining <= 0) showNext();
  };
  host.addEventListener('dw-game', receive);
  return { update, hide, destroy() { hide(); host.removeEventListener('dw-game', receive); root.remove(); card.remove(); } };
}
