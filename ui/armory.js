import { createArmoryPreview } from './armory-preview.js';
import { createArmory, slotType } from '../game/armory.js';
import { text, hasText } from './strings.js';

// GP-78 presents a per-player armory beside the CIF. CU-65 connects the
// selected loadout to the game wheel and purchases through these callbacks.
// CL-113 (Jerry, 2026-10-01): the Armory shows the real guns on its shelves, each with the attachments it wears, and
// its workbench is where attachments go on and come off (they are bought at the kiosk). The game supplies:
//   getMods(kind)        -> [{ id, name, desc, slot, owned, fitted }]   what this gun takes
//   onFit(kind, id, on)  -> boolean                                     put one on or take it off
//   picture(kind)        -> Promise<dataURL | null>                     the real gun as it looks now
//   icon(kind)           -> svg markup (24x24 paths)                    a stand-in until the picture comes
//   describe(kind)       -> string                                      its ammo as it stands
// CL-114 (Jerry, 2026-10-02): a gun's camo is chosen here too, not in the CIF.
//   getFinishes(kind)    -> { current, list: [{ key, name, locked, hint, swatch }] }   key '' is the factory finish
//   onFinish(kind, key)  -> boolean                                     paint it
// GP-141 (Claude approved 2026-10-06): preview(kind, {yaw,pitch}) -> Promise<dataURL|null>.
// Called only for a visible workbench and an interaction/refresh; angles are radians.
export function mountArmory({ doc = document, bus = window, cif = doc.getElementById('cif'),
  getPhase = () => 'prep', getOwned = () => [], onApply = () => {}, onReset = null, armory: shared = null,
  getMods = () => [], onFit = () => false, picture = async () => null, icon = () => '', describe = () => '',
  getFinishes = () => null, onFinish = () => false, preview = null } = {}) {
  if (!cif?.querySelector('.card > .modes')) throw new Error('CIF window is missing');
  // A line ChatGPT hasn't written yet falls back to its English (CL-113: the strings are hers to word).
  const t = (key, params, fallback) => {
    if (!hasText(key)) return String(fallback).replace(/\{(\w+)\}/g, (_, k) => (params && params[k] != null ? params[k] : ''));
    try { return text(key, params || {}); } catch (_) { return fallback; }
  };
  let armory = shared || createArmory(), selected = { type: 'primary', index: 0 }, bench = null, open = false, showLocked = false;
  const button = doc.createElement('button');
  button.type = 'button'; button.id = 'armoryOpen'; button.textContent = text('armory.open');
  cif.querySelector('.card > .modes').prepend(button);
  const el = (tag, cls, txt) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const panel = doc.createElement('section');
  panel.id = 'armoryPanel'; panel.hidden = true; panel.setAttribute('aria-labelledby', 'armoryTitle');
  const head = el('header', 'armory-head');
  const eyebrow = el('p', 'armory-eyebrow', t('armory.eyebrow', {}, 'HQ · Weapons locker'));
  const heading = el('h2', null, text('armory.title')); heading.id = 'armoryTitle';
  const hint = el('p', 'hint', t('armory.hint2', {}, 'Pick a slot, then a gun from the shelves. Attachments bought at the kiosk go on at the workbench.'));
  head.append(eyebrow, heading, hint);
  const body = el('div', 'armory-body');
  const left = el('div', 'armory-left');
  const carryTitle = el('h3', null, t('armory.carried', {}, 'Carried'));
  const slotGrid = el('div', 'armory-slots');
  const hip = el('div', 'armory-hip');
  const shelfTitle = el('h3', null, text('armory.shelf'));
  const shelf = el('div', 'armory-shelf');
  left.append(carryTitle, slotGrid, hip, shelfTitle, shelf);
  const benchEl = el('aside', 'armory-bench'); benchEl.setAttribute('aria-live', 'polite');
  // GP-141 stays on the still picture until its owner supplies the renderer and catalogue copy.
  const previewKeys = ['label','hint','left','right','unavailable'];
  const previewer = typeof preview === 'function' && previewKeys.every(key=>hasText('armory.preview.'+key))
    ? createArmoryPreview({doc, render:preview, labels:{
      hint:text('armory.preview.hint'), left:text('armory.preview.left'), right:text('armory.preview.right'),
      front:text('cif.menu.front'), unavailable:text('armory.preview.unavailable')
    }}) : null;
  body.append(left, benchEl);
  const actions = el('div', 'armory-actions');
  const stow = el('button', null, text('armory.stow')); stow.type = 'button';
  const done = el('button', null, text('armory.done')); done.type = 'button';
  actions.append(stow, done); panel.append(head, body, actions); cif.append(panel);

  // The second of an akimbo pair is its own gun in the Armory (GP-78); say so.
  const labelGun = gun => /:second$/.test(gun.id) ? t('armory.pair', { gun: text(`weapon.${gun.kind}.name`) }, '{gun} · pair') : text(`weapon.${gun.kind}.name`);
  const detailGun = gun => {
    const parts = [];
    if (gun.loaded !== null && gun.kind !== 'chainsaw') parts.push(text('armory.loaded', { count: gun.loaded }));
    if (gun.magazines.length) parts.push(text('armory.magazines', { count: gun.magazines.length }));
    if (gun.rounds) parts.push(text('armory.rounds', { count: gun.rounds }));
    return parts.join(' · ');
  };
  const modsOf = kind => { try { return getMods(kind) || []; } catch (_) { return []; } };
  // The gun's picture: the stand-in icon at once, the real gun when it's drawn (and again when its look changes).
  const pics = new Map();
  function gunPicture(kind, cls = 'armory-pic') {
    const box = el('span', cls); box.dataset.pic = kind;
    const svg = icon(kind);
    if (svg) box.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + svg + '</svg>';
    const want = pics.get(kind);
    if (want) setPic(box, want);
    Promise.resolve().then(() => picture(kind)).then(url => {
      if (!url) return;
      pics.set(kind, url);
      for (const b of panel.querySelectorAll(`[data-pic="${kind}"]`)) setPic(b, url);
    }).catch(() => {});
    return box;
  }
  function setPic(box, url) {
    let img = box.querySelector('img');
    if (img && img.getAttribute('src') === url) return;
    box.replaceChildren(); img = doc.createElement('img'); img.alt = ''; img.src = url; box.append(img); box.classList.add('real');
  }
  function chips(kind) {
    const wrap = el('span', 'armory-chips');
    for (const m of modsOf(kind)) if (m.fitted) wrap.append(el('i', null, m.name));
    return wrap;
  }
  function syncOwned() {
    for (const gun of getOwned() || []) if (!armory.has(gun.id)) armory.buy(gun);
  }
  function benchKind() {
    if (bench) return bench;
    const gun = armory.read().slots[selected.type][selected.index];
    return gun ? gun.kind : null;
  }
  function renderBench() {
    const kind = benchKind();
    benchEl.replaceChildren();
    benchEl.append(el('h3', null, t('armory.bench', {}, 'Workbench')));
    if (!kind) {
      previewer?.hide();
      benchEl.append(el('p', 'armory-bench-empty', t('armory.benchEmpty', {}, 'Pick a gun to see its attachments.')));
      return;
    }
    const pic = previewer ? previewer.element : gunPicture(kind, 'armory-pic big');
    if (previewer) previewer.show(kind, text('armory.preview.label',{gun:text('weapon.'+kind+'.name')}));
    const name = el('p', 'armory-bench-name', text(`weapon.${kind}.name`));
    const ammo = el('p', 'armory-bench-ammo', describe(kind) || '');
    benchEl.append(pic, name, ammo);
    const mods = modsOf(kind);
    if (!mods.length) { benchEl.append(el('p', 'armory-bench-empty', t('armory.noMods', {}, 'This gun takes no attachments.'))); renderFinishes(kind); return; }
    const list = el('ul', 'armory-mods');
    for (const m of mods) {
      const li = el('li', m.fitted ? 'fitted' : (m.owned ? 'owned' : 'missing'));
      li.dataset.mod = m.id;
      const txt = el('div', 'armory-mod-text');
      txt.append(el('strong', null, m.name), el('small', null, m.desc || ''));
      const state = el('span', 'armory-mod-state', m.fitted ? t('armory.fitted', {}, 'Fitted') : m.owned ? t('armory.inStore', {}, 'In the locker') : t('armory.atKiosk', {}, 'Buy it at the supply terminal'));
      const b = el('button', null, m.fitted ? t('armory.remove', {}, 'Take off') : t('armory.fit', {}, 'Put on')); b.type = 'button';
      b.disabled = !m.owned;
      b.addEventListener('click', () => { if (onFit(kind, m.id, !m.fitted)) render(); });
      li.append(txt, state, b);
      list.append(li);
    }
    benchEl.append(list);
    renderFinishes(kind);
  }
  // CL-114: the gun's finish (camo), a row of swatches; the ones still to earn fold away.
  function renderFinishes(kind) {
    let data = null;
    try { data = getFinishes(kind); } catch (_) { data = null; }
    if (!data || !data.list || !data.list.length) return;
    const wrap = el('section', 'armory-finish');
    const cur = data.list.find((f) => f.key === (data.current || '')) || data.list[0];
    const head = el('div', 'armory-finish-head');
    head.append(el('h4', null, t('armory.finish', {}, 'Finish')), el('span', 'armory-finish-current', cur ? cur.name : ''));
    wrap.append(head);
    const grid = el('div', 'armory-finish-grid');
    const locked = data.list.filter((f) => f.locked);
    for (const f of data.list) {
      if (f.locked && !showLocked) continue;
      const b = el('button', 'armory-swatch' + (f.key === (data.current || '') ? ' on' : '') + (f.locked ? ' locked' : '')); b.type = 'button';
      b.dataset.finish = f.key; b.title = f.locked ? f.name + (f.hint ? ' · ' + f.hint : '') : f.name;
      b.setAttribute('aria-label', b.title); b.setAttribute('aria-pressed', String(f.key === (data.current || '')));
      if (f.swatch) { const img = doc.createElement('img'); img.alt = ''; img.src = f.swatch; b.append(img); }
      else b.append(el('span', 'armory-swatch-plain'));
      if (f.locked) b.disabled = true;
      b.addEventListener('click', () => { if (!f.locked && onFinish(kind, f.key)) render(); });
      grid.append(b);
    }
    wrap.append(grid);
    if (locked.length) {
      const more = el('button', 'armory-finish-more', showLocked ? t('armory.finishHide', {}, 'Hide the ones to earn') : t('armory.finishMore', { count: locked.length }, 'Show {count} to earn'));
      more.type = 'button'; more.dataset.finishMore = '';
      more.addEventListener('click', () => { showLocked = !showLocked; render(); });
      wrap.append(more);
    }
    benchEl.append(wrap);
  }
  function render() {
    button.disabled = getPhase() !== 'prep';
    if (!open) return;
    const state = armory.read();
    slotGrid.replaceChildren(); shelf.replaceChildren(); hip.replaceChildren();
    for (const type of ['primary', 'secondary']) for (let index = 0; index < 2; index++) {
      const gun = state.slots[type][index];
      const on = selected.type === type && selected.index === index;
      const tile = el('button', (on ? 'selected' : '') + (gun ? '' : ' empty')); tile.type = 'button'; tile.dataset.slot = `${type}:${index}`;
      tile.setAttribute('aria-pressed', String(on));
      const name = el('strong', null, text(type === 'primary' ? 'armory.primary' : 'armory.secondary', { number: index + 1 }));
      const value = el('span', 'armory-name', gun ? labelGun(gun) : text('armory.empty'));
      const detail = el('small', null, gun ? detailGun(gun) : '');
      tile.append(name, gun ? gunPicture(gun.kind) : el('span', 'armory-pic none'), value, detail);
      if (gun) tile.append(chips(gun.kind));
      tile.addEventListener('click', () => { selected = { type, index }; bench = null; render(); });
      slotGrid.append(tile);
    }
    // The hip pistol: always carried; it has its own attachments.
    const hipBtn = el('button', 'armory-hip-tile' + (bench === 'pistol' ? ' selected' : '')); hipBtn.type = 'button'; hipBtn.dataset.hip = 'pistol';
    hipBtn.append(gunPicture('pistol', 'armory-pic small'), el('span', null, text('armory.hip', { gun: text('weapon.pistol.name') })), chips('pistol'));
    hipBtn.addEventListener('click', () => { bench = 'pistol'; render(); });
    hip.append(hipBtn);
    // The storage shelves: a plank every row.
    for (const gun of state.shelf) {
      const item = el('div', 'armory-item' + (bench === gun.kind ? ' benched' : ''));
      const tile = el('button'); tile.type = 'button'; tile.dataset.gun = gun.id;
      tile.disabled = slotType(gun.kind) !== selected.type;
      tile.title = tile.disabled ? t('armory.wrongSlot', {}, 'Pick a matching slot first') : t('armory.carryThis', {}, 'Carry this one');
      tile.append(gunPicture(gun.kind), el('strong', 'armory-name', labelGun(gun)), el('small', null, detailGun(gun)), chips(gun.kind));
      tile.addEventListener('click', () => { armory.take(gun.id, selected.type, selected.index); bench = null; render(); });
      const tune = el('button', 'armory-tune', t('armory.tune', {}, 'Workbench')); tune.type = 'button'; tune.dataset.bench = gun.id;
      tune.addEventListener('click', () => { bench = gun.kind; render(); });
      item.append(tile, tune);
      shelf.append(item);
    }
    if (!state.shelf.length) shelf.append(el('p', null, text('armory.shelfEmpty')));
    stow.disabled = !state.slots[selected.type][selected.index];
    renderBench();
  }
  function close() {
    if (!open) return;
    previewer?.hide();
    open = false; panel.hidden = true; cif.classList.remove('armory-show');
    onApply(armory.loadout(), armory.read());
    button.focus({ preventScroll: true });
  }
  button.addEventListener('click', () => {
    if (getPhase() !== 'prep' || !cif.classList.contains('show')) return;
    syncOwned(); open = true; panel.hidden = false; cif.classList.add('armory-show'); render();
    panel.querySelector('button')?.focus({ preventScroll: true });
  });
  stow.addEventListener('click', () => { armory.stow(selected.type, selected.index); render(); });
  done.addEventListener('click', close);
  const observer = new MutationObserver(() => {
    if (!cif.classList.contains('show')) close();
    else render();
  });
  observer.observe(cif, { attributes: true, attributeFilter: ['class'] });
  const listener = event => {
    if (event.detail?.type === 'run-reset') {
      armory = (typeof onReset === 'function' ? onReset() : null) || createArmory(); selected = { type: 'primary', index: 0 }; bench = null; close();
    }
  };
  bus.addEventListener('dw-game', listener);
  return { get armory() { return armory; }, element: panel, open: () => button.click(), close, render,
    bench: (kind) => { bench = kind; render(); },
    dispose() { bus.removeEventListener('dw-game', listener); observer.disconnect(); close(); previewer?.dispose(); panel.remove(); button.remove(); } };
}
