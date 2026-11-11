import { createArmoryPreview } from './armory-preview.js';
import { createArmory, slotType } from '../game/armory.js';
import { text, hasText } from './strings.js';

// GP-78 presents a per-player armory beside the CIF. CU-65 connects the
// selected loadout to the game wheel and purchases through these callbacks.
// CL-113 (Jerry, 2026-10-01): the Armory shows the real guns on its shelves, each with the attachments it wears, and
// its workbench is where attachments are bought, put on and taken off. The game supplies:
//   getMods(kind)        -> [{ id, name, desc, slot, owned, fitted, price, affordable }]
//   onFit(kind, id, on)  -> boolean                                     put one on or take it off
//   onBuyMod(kind, id)   -> boolean                                     buy an attachment for this gun
//   onOpenCatalogue(panel) / onCloseCatalogue() -> void                 show the catalogue in this menu
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
  getMods = () => [], onFit = () => false, onBuyMod = () => false, getAmmoOffer = () => null, onBuyAmmo = () => false,
  getAmmoTypes = () => null, onBuyAmmoType = () => false, getCash = () => Infinity,
  getGunOffers = () => [], onBuyGun = () => false, getBuildOffers = () => [], onBuyBuild = () => false,
  onOpenCatalogue = () => {}, onCloseCatalogue = () => {}, picture = async () => null, icon = () => '', describe = () => '',
  getFinishes = () => null, onFinish = () => false, preview = null,
  getLaser = () => null, onLaser = () => false } = {}) {
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
  const hint = el('p', 'hint', t('armory.hint2', {}, 'Pick a slot, then a gun from the shelves. Buy and fit attachments at the workbench.'));
  head.append(eyebrow, heading, hint);
  const body = el('div', 'armory-body');
  const left = el('div', 'armory-left');
  const carryTitle = el('h3', null, t('armory.carried', {}, 'Carried'));
  const slotGrid = el('div', 'armory-slots');
  const hip = el('div', 'armory-hip');
  const shelfTitle = el('h3', null, text('armory.shelf'));
  const shelf = el('div', 'armory-shelf');
  const gunOffersTitle = el('h3', null, text('armory.gunOffers'));
  const gunOffers = el('div', 'armory-shelf armory-offers');
  const buildOffersTitle = el('h3', null, text('armory.buildOffers'));
  const buildOffers = el('div', 'armory-shelf armory-offers armory-build-offers');
  const carried = el('div', 'armory-carried');
  const locker = el('div', 'armory-locker');
  carried.append(carryTitle, slotGrid, hip);
  locker.append(shelfTitle, shelf, gunOffersTitle, gunOffers, buildOffersTitle, buildOffers);
  left.append(carried, locker);
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
  const catalogue = el('section', 'armory-catalogue'); catalogue.setAttribute('aria-label', text('armory.store.title'));
  actions.append(stow, done); panel.append(head, body, catalogue, actions); cif.append(panel);

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
  function gunIcon(kind, cls = 'armory-pic') {
    const box = el('span', cls);
    const svg = icon(kind);
    if (svg) box.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + svg + '</svg>';
    return box;
  }
  function gunPicture(kind, cls = 'armory-pic') {
    const box = gunIcon(kind, cls); box.dataset.pic = kind;
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
    for (const gun of getOwned() || []) if (!armory.has(gun.id)) armory.buy(gun, { store: true });
  }
  function gunKindOf(id) { return String(id || '').replace(/:second$/, ''); }
  // bench holds a gun id ('m4', 'pistol', 'pistol:second') so an akimbo pair can
  // wear a different laser colour from its mate. Callers that pass a kind still work.
  function benchGun() {
    if (bench) return { id: bench, kind: gunKindOf(bench) };
    const gun = armory.read().slots[selected.type][selected.index];
    return gun ? { id: gun.id, kind: gun.kind } : null;
  }
  function benchKind() {
    const g = benchGun();
    return g ? g.kind : null;
  }
  // J133: typed rounds are stock, not permanent attachments. The game owns counts and prices.
  function renderTypedAmmo(kind, stock) {
    const section = el('section', 'armory-typed');
    section.setAttribute('aria-label', text('armory.typed.title'));
    section.append(el('h4', null, text('armory.typed.title')),
      el('p', 'armory-typed-hint', text('armory.typed.hint')));
    const current = stock.loaded;
    if (current) section.append(el('p', 'armory-typed-loaded', text('armory.typed.loaded', {
      count: Math.max(0, Number(stock.inGun) || 0), type: text('ammo.type.' + current + '.name')
    })));
    const list = el('ul', 'armory-typed-list');
    for (const id of stock.order) {
      const row = stock.types?.[id];
      if (!row) continue;
      const name = text('ammo.type.' + id + '.name');
      const item = el('li', id === current ? 'loaded' : '');
      item.dataset.ammoType = id;
      const copy = el('div', 'armory-typed-copy');
      const carried = Math.max(0, Number(stock.carried?.[id]) || 0);
      copy.append(el('strong', null, name), el('small', null, row.cap == null
        ? text('armory.typed.carried', {count: carried})
        : text('armory.typed.carriedCap', {count: carried, cap: row.cap})));
      const full = row.canBuy === false || row.full === true;
      const buyN = row.buyN ?? row.pack, buyPrice = row.buyPrice ?? row.price;
      const shortfall = Math.max(0, buyPrice - getCash());
      const price = full ? text('armory.typed.full') : shortfall
        ? text('armory.store.shortfall', {price: buyPrice, amount: shortfall})
        : text('armory.typed.pack', {count: buyN, price: buyPrice});
      copy.append(el('small', 'armory-typed-price', price));
      const buy = el('button', null, text('armory.typed.buy', {type: name}));
      buy.type = 'button'; buy.dataset.buyAmmoType = id;
      buy.disabled = full || shortfall > 0;
      buy.addEventListener('click', () => { if (onBuyAmmoType(kind, id)) render(); });
      item.append(copy, buy); list.append(item);
    }
    section.append(list); benchEl.append(section);
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
    const typed = getAmmoTypes(kind);
    benchEl.append(pic, name);
    if (!typed?.order?.length) benchEl.append(el('p', 'armory-bench-ammo', describe(kind) || ''));
    if (typed?.order?.length) renderTypedAmmo(kind, typed);
    const offer = typed?.order?.length ? null : getAmmoOffer(kind);
    if (offer) {
      const refill = el('div', 'armory-ammo-offer');
      refill.append(el('span', null, offer.full ? t('armory.ammoFull', {}, 'Ammo full') : offer.affordable
        ? t('armory.ammoPrice', { price: offer.price }, 'Restock ammo · ${price} Cash')
        : t('armory.store.shortfall', { price: offer.price, amount: offer.shortfall }, '${price} Cash · Need {amount} more')));
      const buy = el('button', null, t('armory.ammoBuy', {}, 'Buy ammo')); buy.type = 'button'; buy.dataset.buyAmmo = kind;
      buy.disabled = offer.full || !offer.affordable;
      buy.addEventListener('click', () => { if (onBuyAmmo(kind)) render(); });
      refill.append(buy); benchEl.append(refill);
    }
    const mods = modsOf(kind).filter(m => !typed?.order?.length || !m.id.startsWith('load:'));
    if (!mods.length) { benchEl.append(el('p', 'armory-bench-empty', t('armory.noMods', {}, 'This gun takes no attachments.'))); renderFinishes(kind); renderLaser(benchGun()); return; }
    const list = el('ul', 'armory-mods');
    for (const m of mods) {
      const li = el('li', m.fitted ? 'fitted' : (m.owned ? 'owned' : 'missing'));
      li.dataset.mod = m.id;
      const txt = el('div', 'armory-mod-text');
      txt.append(el('strong', null, m.name), el('small', null, m.desc || ''));
      const state = el('span', 'armory-mod-state', m.fitted ? t('armory.fitted', {}, 'Fitted') : m.owned ? t('armory.inStore', {}, 'Owned · not fitted') : m.shortfall ? t('armory.store.shortfall', { price: m.price, amount: m.shortfall }, '${price} · Need {amount} more Cash') : t('armory.store.price', { price: m.price }, '${price} Cash'));
      const b = el('button', null, !m.owned ? t('armory.store.buy', {}, 'Buy') : m.fitted ? t('armory.remove', {}, 'Take off') : t('armory.fit', {}, 'Put on')); b.type = 'button';
      b.disabled = !m.owned && !m.affordable;
      b.addEventListener('click', () => {
        if (m.owned) { if (onFit(kind, m.id, !m.fitted)) render(); }
        else if (onBuyMod(kind, m.id)) { onFit(kind, m.id, true); syncOwned(); render(); }
      });
      li.append(txt, state, b);
      list.append(li);
    }
    benchEl.append(list);
    renderFinishes(kind);
    renderLaser(benchGun());
  }
  // CU-108: one colour per gun, including the second of an akimbo pair.
  function renderLaser(gun) {
    if (!gun) return;
    let data = null;
    try { data = getLaser(gun.id); } catch (_) { data = null; }
    if (!data || !data.list || !data.list.length) return;
    const wrap = el('section', 'armory-finish armory-laser');
    const cur = data.list.find((f) => f.id === data.current) || data.list[0];
    const head = el('div', 'armory-finish-head');
    head.append(el('h4', null, t('armory.laser', {}, 'Laser color')), el('span', 'armory-finish-current', cur ? cur.name : ''));
    wrap.append(head);
    const grid = el('div', 'armory-finish-grid');
    for (const f of data.list) {
      const b = el('button', 'armory-swatch' + (f.id === data.current ? ' on' : '') + (f.locked ? ' locked' : ''));
      b.type = 'button'; b.dataset.laser = f.id;
      b.title = f.locked ? f.name + (f.hint ? ' · ' + f.hint : '') : f.name;
      b.setAttribute('aria-label', b.title);
      b.setAttribute('aria-pressed', String(f.id === data.current));
      b.style.background = f.hex || '#ff2b2b';
      if (f.locked) b.disabled = true;
      b.addEventListener('click', () => { if (!f.locked && onLaser(gun.id, f.id)) render(); });
      grid.append(b);
    }
    wrap.append(grid);
    benchEl.append(wrap);
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
      if (f.swatch) { if (typeof f.swatch === 'string') { const img = doc.createElement('img'); img.alt = ''; img.src = f.swatch; b.append(img); } else b.append(typeof f.swatch === 'function' ? f.swatch(doc) : f.swatch); }
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
    slotGrid.replaceChildren(); shelf.replaceChildren(); hip.replaceChildren(); gunOffers.replaceChildren(); buildOffers.replaceChildren();
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
      const item = el('div', 'armory-item' + (bench === gun.id ? ' benched' : ''));
      // CL-139 (Jerry, 2026-10-09: "anything you can make better"): a gun for the other kind of slot is not a dead
      // button any more. Clicking it carries it in a free slot of its kind, or, with none free, picks that kind's
      // first slot so the next click swaps it in. Each stored gun says which kind of slot it goes in.
      const fits = slotType(gun.kind), here = fits === selected.type;
      const fitsName = t(fits === 'primary' ? 'armory.kindPrimary' : 'armory.kindSecondary', {}, fits === 'primary' ? 'Primary' : 'Secondary');
      const tile = el('button', here ? null : 'other-slot'); tile.type = 'button'; tile.dataset.gun = gun.id; tile.dataset.fits = fits;
      tile.title = here ? t('armory.carryThis', {}, 'Carry this one') : t('armory.carryOther', { slot: fitsName }, 'Carry this in a {slot} slot');
      tile.append(gunPicture(gun.kind), el('strong', 'armory-name', labelGun(gun)), el('small', null, detailGun(gun)), chips(gun.kind), el('em', 'armory-fits', fitsName));
      tile.addEventListener('click', () => {
        let moved;
        if (fits === selected.type) moved = armory.take(gun.id, selected.type, selected.index).ok;
        else {
          const free = state.slots[fits].findIndex((g) => !g);
          if (free >= 0) moved = armory.take(gun.id, fits, free).ok;
          selected = { type: fits, index: free >= 0 ? free : 0 };
        }
        if (moved) onApply(armory.loadout(), armory.read());
        bench = null; render();
      });
      const tune = el('button', 'armory-tune', t('armory.tune', {}, 'Workbench')); tune.type = 'button'; tune.dataset.bench = gun.id;
      tune.addEventListener('click', () => { bench = gun.id; render(); });
      item.append(tile, tune);
      shelf.append(item);
    }
    if (!state.shelf.length) shelf.append(el('p', null, text('armory.shelfEmpty')));
    for (const gun of getGunOffers()) {
      const item = el('div', 'armory-item armory-offer'); item.dataset.offerGun = gun.kind;
      const gunCost = gun.available && !gun.affordable
        ? t('armory.store.shortfall', { price: gun.price, amount: gun.shortfall }, '${price} Cash · Need {amount} more')
        : t('armory.store.price', { price: gun.price }, '${price} Cash') + (gun.available ? '' : ' · ' + t('armory.unlockNight', { night: gun.night }, 'Night {night}'));
      item.append(gunIcon(gun.kind), el('strong', 'armory-name', gun.name), el('small', null, gunCost));
      const buy = el('button', 'armory-offer-buy', t('armory.store.buy', {}, 'Buy')); buy.type = 'button'; buy.dataset.buyGun = gun.kind;
      buy.disabled = !gun.available || !gun.affordable;
      buy.addEventListener('click', () => { if (onBuyGun(gun.kind)) { syncOwned(); bench = gun.kind; render(); } });
      item.append(buy); gunOffers.append(item);
    }
    gunOffersTitle.hidden = gunOffers.hidden = !gunOffers.childElementCount;
    for (const plan of getBuildOffers()) {
      const item = el('div', 'armory-item armory-offer'); item.dataset.offerBuild = plan.kind;
      const graphic = el('span', 'armory-pic');
      if (plan.icon) graphic.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + plan.icon + '</svg>';
      const planCost = plan.owned ? t('armory.buildOwned', {}, 'Blueprint owned') : plan.affordable
        ? t('armory.store.price', { price: plan.price }, '${price} Cash')
        : t('armory.store.shortfall', { price: plan.price, amount: plan.shortfall }, '${price} Cash · Need {amount} more');
      item.append(graphic, el('strong', 'armory-name', plan.name), el('small', null, planCost));
      const buy = el('button', 'armory-offer-buy', plan.owned ? t('armory.buildOwned', {}, 'Owned') : t('armory.store.buy', {}, 'Buy'));
      buy.type = 'button'; buy.dataset.buyBuild = plan.kind; buy.disabled = plan.owned || !plan.affordable;
      buy.addEventListener('click', () => { if (onBuyBuild(plan.kind)) render(); });
      item.append(buy);
      if (plan.owned && plan.ammo) {
        if (!plan.ammo.full && !plan.ammo.affordable) item.append(el('small', null,
          t('armory.store.shortfall', { price: plan.ammo.price, amount: plan.ammo.shortfall }, '${price} Cash · Need {amount} more')));
        const refill = el('button', 'armory-offer-ammo', t('armory.ammoPack', { price: plan.ammo.price }, 'Ammo · ${price}'));
        refill.type = 'button'; refill.dataset.buyBuildAmmo = plan.kind; refill.disabled = plan.ammo.full || !plan.ammo.affordable;
        refill.addEventListener('click', () => { if (onBuyAmmo(plan.kind)) render(); });
        item.append(refill);
      }
      buildOffers.append(item);
    }
    stow.disabled = !state.slots[selected.type][selected.index];
    renderBench();
  }
  function close() {
    if (!open) return;
    previewer?.hide();
    open = false; panel.hidden = true; cif.classList.remove('armory-show');
    onCloseCatalogue();
    onApply(armory.loadout(), armory.read());
    button.focus({ preventScroll: true });
  }
  button.addEventListener('click', () => {
    if (getPhase() !== 'prep' || !cif.classList.contains('show')) return;
    syncOwned(); open = true; panel.hidden = false; cif.classList.add('armory-show'); render(); onOpenCatalogue(catalogue);
    panel.querySelector('button')?.focus({ preventScroll: true });
  });
  stow.addEventListener('click', () => {
    if (armory.stow(selected.type, selected.index).ok) onApply(armory.loadout(), armory.read());
    render();
  });
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
