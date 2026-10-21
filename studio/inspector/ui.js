// studio/inspector/ui.js — the inspector's panels (CL-196). Claude's (studio/*).
//
// Left: every subject, by group, with a search. Right: the subject (what it is, where its builder lives, its numbers,
// its own switches; the marine's moves, kit, wardrobe and holds), the view (backdrop, light, overlays) and notes for
// its owner. Bottom: the clock (play, pause, step, speed, the rewind scrubber), the views and pictures.
// The canvas is under a transparent layer that takes the mouse for the camera, so the game never aims or fires from
// the mouse while inspecting ("Drive" gives it back). Keys: see HELP below (and "?" in the inspector).
import { MARINE_KEYS, MODEL_KEYS, MARINE_VIEWS, VIEWS } from './orbit.js';
import { CAP_STYLES, EYEWEAR_STYLES, SLEEVES, TROUSER_CUTS, BOOT_COLOURS, RUBBER_COLOURS, BODY_CHOICES } from '../../game/wardrobe.js';
import { CAMO_KEYS } from '../../core/camo.js';

export const HELP = [
  ['Mouse', 'drag: round the subject · right-drag or shift-drag: slide · wheel: closer / further (ctrl: faster) · double-click: orbit round that spot'],
  ['Space', 'play / pause the game'],
  [', .', 'one frame back / forward (shift: ten). Back walks the rewind: the last few seconds, exactly as the game posed them'],
  ['- =', 'slower / faster (0.05x to 2x)'],
  ['[ ]', 'previous / next move (the marine) or subject; shift+[ ]: previous / next subject'],
  ['1 – 7', 'views (the marine: full, three-quarter, head, torso, hands, back, boots; others: three, front, left, back, right, top, low)'],
  ['F · 0', 'frame the subject · back to the first view'],
  ['Arrows · PgUp PgDn', 'round / up and down · closer / further'],
  ['B J X W G', 'bounds and size · joints · axes · wireframe · grid'],
  ['T', 'turntable (models)'],
  ['P', 'drive the marine yourself (the game\'s keys and mouse); Esc to stop'],
  ['S · shift+S', 'save a picture · a turnaround sheet (8 views)'],
  ['N', 'write a note for the subject\'s owner (saved with a picture to review/inspect-<subject>/)'],
  ['H · ?', 'hide the panels · this help'],
  ['M', 'sound on / off'],
  ['F5', 'after a change to the game: reload it, back on the same subject'],
  ['Save / Load setup', 'View panel: save the subject, kit, camera and lighting as JSON. Loading restarts the active move; a setup is not a simulation checkpoint.']
];

const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
};
// A damaged browser setting must never prevent inspection from starting.
export function readListSetting(raw, allowed) {
  try { const values = JSON.parse(raw || '[]'); return Array.isArray(values) ? [...new Set(values.filter((v) => typeof v === 'string' && allowed.includes(v)))] : []; }
  catch (_) { return []; }
}
export function readChoiceSetting(raw, allowed, fallback) { return allowed.includes(raw) ? raw : fallback; }

const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : '—');
const human = (k) => String(k).replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/^./, (m) => m.toUpperCase());

export function createUI(ix) {
  const { T } = ix;
  if (!document.getElementById('dwiCss')) document.head.append(el('link', { id: 'dwiCss', rel: 'stylesheet', href: new URL('./inspector.css?v=' + ix.version, import.meta.url).href }));
  const root = el('div', { id: 'dwi', class: 'dwi' });
  // Nothing the inspector's panels or stage hear goes on to the game's own listeners on the window (its idle clock,
  // its mouse aim, its audio unlock): stopped here, at the inspector's root.
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'mousedown', 'mousemove', 'mouseup', 'click', 'dblclick', 'wheel', 'contextmenu', 'keydown', 'keyup', 'touchstart', 'touchmove'])
    root.addEventListener(ev, (e) => { if (ev === 'pointerdown' && ix.host.audio && ix.host.audio.unlock) { try { ix.host.audio.unlock(); } catch (_) {} } e.stopPropagation(); });
  const stage = el('div', { class: 'dwi-stage', title: '' });
  const labels = el('div', { class: 'dwi-labels' });
  const left = el('aside', { class: 'dwi-panel dwi-left' });
  const right = el('aside', { class: 'dwi-panel dwi-right' });
  const bar = el('footer', { class: 'dwi-bar' });
  const toastEl = el('div', { class: 'dwi-toast' });
  const help = el('div', { class: 'dwi-help', hidden: true },
    el('div', { class: 'dwi-help-card' }, el('h2', { text: 'Inspector · keys and mouse' }),
      el('table', {}, HELP.map(([k, v]) => el('tr', {}, el('th', { text: k }), el('td', { text: v })))),
      el('p', { class: 'dwi-dim', html: 'Agents: <code>DWInspect.help()</code> in the page, or <code>node tools/camera.mjs start --inspect</code> (tools/CAMERA.md). The guide: studio/inspector/README.md.' }),
      el('button', { class: 'dwi-btn', 'data-dwi-safe': true, text: 'Close', onclick: () => { help.hidden = true; } })));
  const driveBanner = el('div', { class: 'dwi-drive', hidden: true, text: 'Driving the marine: the game\'s keys and mouse. Esc gives the camera back.' });
  root.append(stage, labels, left, right, bar, toastEl, help, driveBanner);
  document.body.append(root);
  ix.orbit.attach(stage);

  const busyLabel = () => typeof ix.busy === 'string' ? ix.busy : ix.busy && ix.busy.label || 'Working';
  function canMutate() { if (!ix.busy) return true; toast(busyLabel() + ' · wait or Cancel', true); return false; }
  for (const event of ['pointerdown', 'pointermove', 'wheel', 'click', 'dblclick']) root.addEventListener(event, (e) => {
    if (!ix.busy || e.target.closest && e.target.closest('[data-dwi-safe]')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (event !== 'pointermove') toast(busyLabel() + ' · wait or Cancel', true);
  }, true);
  let toastT = 0;
  function toast(msg, bad = false) { toastEl.textContent = msg; toastEl.className = 'dwi-toast on' + (bad ? ' bad' : ''); toastT = performance.now() + (bad ? 6000 : 2600); }

  // --- left: the subjects ---------------------------------------------------------------------------------------
  const search = el('input', { class: 'dwi-search', type: 'search', placeholder: 'Find a subject…  (zombie, m4, rabbit, wall…)' });
  const list = el('div', { class: 'dwi-list' });
  const counts = el('div', { class: 'dwi-dim dwi-count' });
  left.append(el('header', { class: 'dwi-head' }, el('b', { text: 'INSPECTOR' }), el('span', { class: 'dwi-dim', text: ' v' + ix.version + ' · the game, live' }),
    el('button', { class: 'dwi-icon', 'data-dwi-safe': true, title: 'Keys, guide and agent commands (?)', text: '?', onclick: () => { help.hidden = !help.hidden; } })), search, counts, list);
  const collapsed = new Set(readListSetting(localGet('dwi.collapsed'), ix.GROUPS));
  const itemEls = new Map(), broken = new Map();
  function localGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function localSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  function renderList() {
    const q = search.value.trim().toLowerCase();
    list.textContent = ''; itemEls.clear();
    let n = 0;
    for (const g of ix.GROUPS) {
      const items = ix.catalog.filter((e) => e.group === g && (!q || (e.name + ' ' + e.id + ' ' + (e.source || '')).toLowerCase().includes(q)));
      if (!items.length) continue;
      const open = q || !collapsed.has(g);
      const head = el('button', { type: 'button', class: 'dwi-group' + (open ? ' open' : ''), 'aria-expanded': String(!!open), onclick: () => { if (collapsed.has(g)) collapsed.delete(g); else collapsed.add(g); localSet('dwi.collapsed', JSON.stringify([...collapsed])); renderList(); } },
        el('span', { text: (open ? '▾ ' : '▸ ') + g }), el('span', { class: 'dwi-dim', text: String(items.length) }));
      list.append(head);
      if (!open) continue;
      for (const e of items) {
        n++;
        const it = el('button', { type: 'button', class: 'dwi-item' + (ix.entry === e ? ' on' : '') + (broken.has(e.id) ? ' bad' : ''), title: e.id + (broken.has(e.id) ? '\n' + broken.get(e.id) : '') + '\n' + (e.source || ''),
          onclick: () => show(e.id) }, el('span', { text: e.name }), el('span', { class: 'dwi-owner', text: e.owner || '' }));
        list.append(it); itemEls.set(e.id, it);
      }
    }
    counts.textContent = ix.catalog.length + ' subjects' + (q ? ' · ' + n + ' match' : '') + (broken.size ? ' · ' + broken.size + ' broken' : '');
  }
  search.addEventListener('input', renderList);
  search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const first = [...itemEls.keys()][0]; if (first) show(first); search.blur(); } if (e.key === 'Escape') { search.value = ''; renderList(); search.blur(); } });
  async function show(id, o) {
    if (!canMutate()) return;
    try { await ix.show(id, o); } catch (e) { toast(id + ': ' + (e.message || e), true); }
  }

  // --- right: the subject ---------------------------------------------------------------------------------------
  const subjTitle = el('h2', { class: 'dwi-title' }), subjId = el('code', { class: 'dwi-id', title: 'Click to copy (the camera and the API call it this)' });
  const subjSource = el('div', { class: 'dwi-dim dwi-source' }), subjNotes = el('div', { class: 'dwi-note' }), subjInfo = el('div', { class: 'dwi-info' });
  const subjBody = el('div', { class: 'dwi-body' });
  async function copyText(text) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard unavailable; select and copy the text');
    await navigator.clipboard.writeText(text);
  }
  subjId.tabIndex = 0; subjId.setAttribute('role', 'button');
  const copyId = async () => { try { await copyText(subjId.textContent); toast('Copied ' + subjId.textContent); } catch (err) { toast(err.message || String(err), true); } };
  subjId.addEventListener('click', copyId);
  subjId.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.code === 'Space') { e.preventDefault(); copyId(); } });
  const viewBox = el('section', { class: 'dwi-sec' });
  const notesBox = el('section', { class: 'dwi-sec' });
  right.append(el('div', { class: 'dwi-subj' }, subjTitle, subjId, subjSource, subjNotes, subjInfo), subjBody, viewBox, notesBox);

  const sec = (title, ...kids) => el('section', { class: 'dwi-sec' }, el('h3', { text: title }), ...kids);
  const btn = (text, onclick, o = {}) => el('button', { class: 'dwi-btn' + (o.on ? ' on' : '') + (o.cls ? ' ' + o.cls : ''), text, title: o.title, onclick: async (e) => { if (!canMutate()) return; const b = e.currentTarget; b.disabled = true; b.setAttribute('aria-busy', 'true'); try { await onclick(e); } catch (err) { if (err.name !== 'AbortError') toast(text + ': ' + (err.message || err), true); } finally { b.disabled = false; b.removeAttribute('aria-busy'); refreshSoon(); } } });
  const toggle = (label, get, set) => {
    const box = el('input', { type: 'checkbox' }); box.checked = !!safe(get);
    box.addEventListener('change', async () => { if (!canMutate()) { box.checked = !!safe(get); return; } box.disabled = true; try { await set(box.checked); } catch (err) { toast(label + ': ' + (err.message || err), true); box.checked = !!safe(get); } finally { box.disabled = false; refreshSoon(); } });
    addRefresher(() => { box.checked = !!safe(get); });
    return el('label', { class: 'dwi-toggle' }, box, el('span', { text: label }));
  };
  const select = (label, options, get, set) => {
    const s = el('select', {}, options.map((o) => el('option', { value: typeof o === 'object' ? o.key : o, text: typeof o === 'object' ? o.name : human(o) })));
    s.value = safe(get) ?? '';
    s.addEventListener('change', async () => { if (!canMutate()) { s.value = safe(get) ?? ''; return; } s.disabled = true; try { await set(s.value); } catch (err) { s.value = safe(get) ?? ''; toast(label + ': ' + (err.message || err), true); } finally { s.disabled = false; refreshSoon(); } });
    addRefresher(() => { const v = safe(get); if (v != null && document.activeElement !== s) s.value = v; });
    return el('label', { class: 'dwi-field' }, el('span', { text: label }), s);
  };
  const slider = (label, min, max, step, get, set, fmtv = (v) => fmt(+v, 2)) => {
    const r = el('input', { type: 'range', min, max, step }), out = el('span', { class: 'dwi-dim' });
    r.value = safe(get) ?? min; out.textContent = fmtv(r.value);
    const readBack = () => { r.value = safe(get) ?? min; out.textContent = fmtv(r.value); };
    r.addEventListener('input', async () => { if (!canMutate()) { readBack(); return; } out.textContent = fmtv(r.value); try { await set(+r.value); } catch (err) { readBack(); toast(label + ': ' + (err.message || err), true); } });
    addRefresher(() => { const v = safe(get); if (v != null && document.activeElement !== r) { r.value = v; out.textContent = fmtv(v); } });
    return el('label', { class: 'dwi-field dwi-slider' }, el('span', { text: label }), r, out);
  };
  function safe(f) { try { return f(); } catch (_) { return null; } }
  // the controls' read-backs, refreshed after a change; the marine's tab pane marks its own so a redraw drops them
  let refreshers = [], refreshAt = 0, drawingPane = false, refreshScope = 'subject', moveStatus = null;
  const addRefresher = (f) => { f.pane = drawingPane; f.scope = drawingPane ? 'pane' : refreshScope; refreshers.push(f); };
  const refreshSoon = () => { refreshAt = performance.now() + 120; };

  function marineBody() {
    const M = ix.marine, wrap = el('div');
    const tabs = ['Moves', 'Kit', 'Wardrobe', 'Holds'];
    let tab = readChoiceSetting(localGet('dwi.marineTab'), tabs, 'Moves');
    const tabBar = el('div', { class: 'dwi-tabs' }), pane = el('div');
    const draw = () => {
      moveStatus = null;
      tabBar.textContent = ''; for (const t of tabs) tabBar.append(el('button', { class: 'dwi-tab' + (t === tab ? ' on' : ''), text: t, onclick: () => { tab = t; localSet('dwi.marineTab', t); draw(); } }));
      pane.textContent = ''; refreshers = refreshers.filter((f) => !f.pane); drawingPane = true;
      const add = (...n) => pane.append(...n);
      if (tab === 'Moves') {
        const loop = toggle('Loop the move', () => M.loop, (v) => M.setLoop(v));
        moveStatus = el('div', { class: 'dwi-move-status dwi-dim', role: 'status', 'aria-live': 'polite' });
        add(el('div', { class: 'dwi-row' }, loop, btn('Stop / clear holds', () => M.stop()), btn('Stage centre', () => M.home())), moveStatus);
        for (const cat of M.MOVE_CATS) {
          add(el('h4', { text: cat }));
          const g = el('div', { class: 'dwi-moves' });
          for (const mv of M.MOVES.filter((m) => m.cat === cat)) g.append(el('button', { class: 'dwi-move' + (M.move && M.move.id === mv.id ? ' on' : ''), 'data-move': mv.id, text: mv.name, onclick: async (e) => { if (!canMutate()) return; const b = e.currentTarget; b.disabled = true; b.setAttribute('aria-busy', 'true'); try { await playMove(mv.id); } finally { b.disabled = false; b.removeAttribute('aria-busy'); } } }));
          add(g);
        }
      } else if (tab === 'Kit') {
        const guns = el('div', { class: 'dwi-grid' });
        guns.append(btn('Unarmed', () => M.weapon('none'), { on: M.unarmed() }));
        for (const k of (T.WEAPON_ORDER || [])) guns.append(btn(M.GUN_NAME[k] || human(k), () => M.weapon(k), { on: !M.unarmed() && M.current() === k }));
        add(sec('In his hands', guns,
          select('Blade (F)', ['knife', 'machete', 'katana'], () => M.state().blade, (v) => M.blade(v)),
          el('div', { class: 'dwi-row' }, ['pistol', 'uzi', 'revolver'].map((k) => btn('Akimbo ' + M.GUN_NAME[k], () => M.akimbo(k))), btn('One gun', () => M.akimbo(null)))));
        const w = M.current(), mods = safe(() => M.mods(w)) || [];
        add(sec('Fitted to the ' + (M.GUN_NAME[w] || w) + ' (the armory\'s mods)', mods.length ? el('div', {}, mods.map((m) => toggle(m.name || m.id, () => (M.mods(w).find((x) => x.id === m.id) || {}).fitted, (on) => M.fit(m.id, on, w)))) : el('div', { class: 'dwi-dim', text: 'No mods for this gun.' })));
        add(sec('Gear', el('div', { class: 'dwi-grid2' }, M.GEAR_IDS.map((g) => toggle(human(g), () => M.gear(g), (on) => M.gear(g, on)))),
          el('div', { class: 'dwi-row' }, btn('NVG up / down (1)', () => M.press('Digit1')), btn('Flashlight (2)', () => M.press('Digit2')), btn('Laser (3)', () => M.press('Digit3'))),
          el('div', { class: 'dwi-row' }, Object.entries(M.PRESETS).map(([k, p]) => btn(p.name, () => M.preset(k))))));
      } else if (tab === 'Wardrobe') {
        const D = ix.host.data.DRESS || {};
        const cam = (CAMO_KEYS || []).slice();
        add(sec('Uniform (the CIF\'s own choices; nothing is saved in here)',
          select('Camo, all of it', cam, () => M.camo(), (v) => M.camo(v)),
          el('div', { class: 'dwi-dim', text: 'The cap shows with the helmet off (Kit: gear), the eyewear with the NVG up.' }),
          select('Cap', CAP_STYLES, () => safe(() => T.getWardrobe().items.cap.style), (v) => M.item('cap', { style: v })),
          select('Eyewear', EYEWEAR_STYLES, () => safe(() => T.getWardrobe().items.eyewear.style), (v) => M.item('eyewear', { style: v })),
          select('Sleeves', SLEEVES, () => safe(() => T.getWardrobe().items.shirt.sleeves), (v) => M.item('shirt', { sleeves: v })),
          select('Trousers', TROUSER_CUTS, () => safe(() => T.getWardrobe().items.trousers.cut), (v) => M.item('trousers', { cut: v })),
          toggle('Gloves', () => safe(() => T.getWardrobe().items.gloves.worn), (on) => M.item('gloves', { worn: on })),
          select('Boots', BOOT_COLOURS, () => safe(() => T.getWardrobe().items.boots.colour), (v) => M.item('boots', { colour: v })),
          el('div', { class: 'dwi-row' }, btn('Put on the insulated boots', () => M.insulated(true))),
          select('Insulated boots\' rubber', RUBBER_COLOURS, () => safe(() => T.getWardrobe().items.boots.rubber), (v) => M.item('boots', { rubber: v }))));
        add(sec('Him', select('Hair', BODY_CHOICES.hair, () => safe(() => T.getWardrobe().body.hair), (v) => M.body({ hair: v })),
          select('Eyes', BODY_CHOICES.eyes, () => safe(() => T.getWardrobe().body.eyes), (v) => M.body({ eyes: v })),
          select('Skin', BODY_CHOICES.skin.map((k) => ({ key: String(k), name: 'Tone ' + (k + 1) })), () => String(safe(() => T.getWardrobe().body.skin)), (v) => M.body({ skin: +v }))));
        const w = M.current(), fins = safe(() => M.finishes(w)) || [];
        add(sec('The ' + (M.GUN_NAME[w] || w) + '\'s finish', fins.length ? select('Finish', [{ key: '', name: 'Factory' }, ...fins], () => safe(() => T.getWardrobe().guns[w]) || '', (v) => M.finish(v, w)) : el('div', { class: 'dwi-dim', text: 'No finishes for this gun.' })));
      } else if (tab === 'Holds') {
        add(el('p', { class: 'dwi-dim', text: 'The game\'s own holds pin a move at one point of it (0 to 1). Let go to play on.' }));
        add(sec('Walk and run cycle (standing)', slider('Walk', 0, 1, 0.01, () => M.holdState('walk') ?? 0, (u) => M.hold('walk', u)), slider('Run', 0, 1, 0.01, () => M.holdState('run') ?? 0, (u) => M.hold('run', u)), btn('Let go', () => { M.hold('walk', null); })));
        add(sec('Reload', el('div', { class: 'dwi-row' }, btn('Start a reload', () => M.reload())), slider('Point in the reload', 0, 1, 0.01, () => M.holdState('reload') ?? 0, (u) => M.hold('reload', u)), btn('Let go', () => M.hold('reload', null))));
        add(sec('Blade swing', slider('Point in the swing', 0, 1, 0.01, () => M.holdState('knife') ?? 0, (u) => M.hold('knife', u)), btn('Let go', () => M.hold('knife', null))));
        add(sec('Draw / holster', el('div', { class: 'dwi-row' }, btn('Draw or holster (4)', () => M.press('Digit4'))), slider('Seconds in', 0, 1.2, 0.01, () => M.holdState('draw') ?? 0, (u) => M.hold('draw', u)), btn('Let go', () => M.hold('draw', null))));
        let gph = 'raise';
        add(sec('Grenade', select('Phase', ['grab', 'raise', 'cocked', 'throw', 'back'], () => (M.holdState('grenade') || [gph])[0], (v) => { gph = v; M.hold('grenade', [gph, 0]); }), slider('Seconds in', 0, 0.6, 0.01, () => (M.holdState('grenade') || [gph, 0])[1], (t) => M.hold('grenade', [(M.holdState('grenade') || [gph])[0], t])), btn('Let go', () => M.hold('grenade', null))));
      }
      drawingPane = false;
    };
    draw();
    wrap.append(tabBar, pane);
    ix._redrawMarine = draw;
    return wrap;
  }
  async function playMove(id) {
    if (!canMutate()) return;
    try { await ix.marine.play(id); } catch (e) { if (e.name !== 'AbortError') toast(e.message || String(e), true); }
    for (const b of right.querySelectorAll('.dwi-move')) b.classList.toggle('on', b.dataset.move === (ix.marine.move && ix.marine.move.id));
  }
  function zombieBody(s) {
    const z = () => s.z, D = (fn) => () => { const q = z(); if (!q || !q.alive) throw new Error('it is not alive (Respawn)'); return fn(q); };
    const hit = (zone) => () => ix.api.zombie.hit(zone);
    return el('div', {},
      sec('How', el('div', { class: 'dwi-row' },
        btn('Live', () => show(s.entry.id, { mode: 'live', view: false }), { on: s.mode === 'live', title: 'Spawned and run by the game; it goes for the marine' }),
        btn('Walking', () => show(s.entry.id, { mode: 'walk', view: false }), { on: s.mode === 'walk', title: 'Live, and the marine keeps stepping away so it keeps walking' }),
        btn('Rising', () => show(s.entry.id, { mode: 'rise', view: false }), { on: s.mode === 'rise', title: 'Live, clawing up out of the floor' }),
        btn('Statue', () => show(s.entry.id, { mode: 'statue' }), { on: s.mode === 'statue', title: 'The body at rest (makeZombieMesh), nothing moving it' })),
        el('div', { class: 'dwi-dim', text: 'Godmode is on: it can hit the marine, nothing comes of it.' })),
      s.mode === 'statue' ? null : sec('Do', el('div', { class: 'dwi-grid2' },
        btn('Hit the body', hit('body')), btn('Hit the head', hit('head')), btn('Hit the legs', hit('legs')),
        btn('Kill', D((q) => T.killZombie(q))), btn('Lose the left arm', D((q) => T.dismemberDbg(q, 'armL'))), btn('Lose the right arm', D((q) => T.dismemberDbg(q, 'armR'))),
        btn('Lose a leg', D((q) => T.dismemberDbg(q, 'legL'))), btn('Lose the head', D((q) => T.dismemberDbg(q, 'head'))), btn('Respawn', () => s.respawn()))));
  }
  function modelBody(s) {
    const kids = [];
    if (ix.variants && ix.variants.length > 1) kids.push(sec('Which', select('Variant', ix.variants, () => ix.variant, (v) => show(s.entry.id, { variant: v, view: false }))));
    const c = s.controls || [];
    if (c.length) kids.push(sec('Its switches (the game\'s own)', c.map((x) => x.type === 'toggle' ? toggle(x.label, x.get, x.set) : x.type === 'select' ? select(x.label, x.options, x.get, x.set) : btn(x.label, x.run))));
    kids.push(sec('Turn it', el('div', { class: 'dwi-row' }, btn('Still', () => { s.turntable = 0; s.holder.rotation.y = 0; }), btn('Turntable', () => { s.turntable = 0.6; }), btn('Fast', () => { s.turntable = 1.8; }))));
    return el('div', {}, kids);
  }
  const setupFile = el('input', { type: 'file', accept: '.json,application/json', hidden: true, 'aria-label': 'Load inspector setup JSON' });
  root.append(setupFile);
  let loadingSetup = false;
  async function saveSetup() {
    const recipe = ix.api.session();
    download('data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(recipe, null, 2)), (ix.entry ? ix.entry.id : 'inspector') + '-setup-' + stamp() + '.json');
    toast('Setup saved: subject, kit, view and light');
  }
  async function loadSetup() {
    const file = setupFile.files && setupFile.files[0];
    if (!file || loadingSetup) return;
    loadingSetup = true;
    try {
      if (!canMutate()) return;
      if (!Number.isFinite(file.size) || file.size > 65536) throw new Error('setup must be at most 64 KB');
      const text = await file.text();
      if (new TextEncoder().encode(text).length > 65536) throw new Error('setup must be at most 64 KB');
      let recipe; try { recipe = JSON.parse(text); } catch (_) { throw new Error('setup is not valid JSON'); }
      if (!canMutate()) return;
      await ix.api.restore(recipe);
      toast('Setup loaded; its move restarts from the beginning');
    } catch (e) { toast(e.name === 'AbortError' ? 'Load setup cancelled' : 'Load setup: ' + (e.message || e), e.name !== 'AbortError'); }
    finally { loadingSetup = false; setupFile.value = ''; }
  }
  setupFile.addEventListener('change', loadSetup);
  function viewSection() {
    refreshers = refreshers.filter((f) => f.scope !== 'view');
    const previousScope = refreshScope; refreshScope = 'view';
    viewBox.textContent = '';
    const st = ix.stage;
    viewBox.append(el('h3', { text: 'View' }),
      select('Backdrop', Object.keys(st.BACKDROPS).map((k) => ({ key: k, name: k === 'off' ? 'Off (the Training Ground)' : human(k) })), () => st.backdrop(), (v) => st.backdrop(v)),
      select('Light', Object.keys(st.LIGHTS).map((k) => ({ key: k, name: k === 'game' ? 'The game\'s (as it is in here)' : human(k) })), () => st.light(), (v) => st.light(v)),
      el('div', { class: 'dwi-grid2' }, [['bounds', 'Bounds and size (B)'], ['stick', '1.8 m stick'], ['joints', 'Joints (J)'], ['axes', 'Axes (X)'], ['wire', 'Wireframe (W)'], ['grid', 'Grid (G)']]
        .map(([k, n]) => toggle(n, () => st.overlays.get(k), (on) => st.overlays.set(k, on)))),
      toggle('Follow it when it moves', () => ix.orbit.follow(), (on) => ix.orbit.follow(on)),
      slider('Lens (degrees)', 15, 80, 1, () => ix.orbit.fov(), (v) => ix.orbit.fov(v), (v) => Math.round(v) + '°'),
      el('div', { class: 'dwi-row' }, btn('Save setup', saveSetup, { title: 'Download a versioned JSON review recipe' }), btn('Load setup', () => { setupFile.value = ''; setupFile.click(); }, { title: 'Load a local JSON recipe; the active move starts again' })),
      el('div', { class: 'dwi-dim', text: 'Setup = subject, kit, view and light. Loading restarts a move.' }));
    refreshScope = previousScope;
  }
  // --- notes for the owner --------------------------------------------------------------------------------------
  const noteText = el('textarea', { class: 'dwi-notes', rows: 3, placeholder: 'What looks wrong? It goes to the owner with a picture of this view and where it happened.' });
  const noteList = el('div', { class: 'dwi-notelist' });
  const notes = [];
  let savingNote = false;
  async function saveNote() {
    const text = noteText.value.trim();
    if (!text) { toast('Write the note first', true); return; }
    if (savingNote || !canMutate()) return;
    savingNote = true;
    const e = ix.entry, ctx = context(), line = '[' + e.id + '] ' + text + ' — ' + ctx;
    let saved = null, copied = false;
    try {
      try { saved = await ix.api.note(text, { context: ctx }); }
      catch (err) {
        if (err.name === 'AbortError') { toast('Note cancelled; your text is still here'); return; }
        try { await copyText(line); copied = true; }
        catch (_) {}
        toast('Not saved to review/ (' + (err.message || err) + ')' + (copied ? ': copied to clipboard' : ': your text is still here'), true);
      }
      if (!saved && !copied) return;
      notes.push({ line, file: saved && saved.file });
      noteList.prepend(el('div', { class: 'dwi-noteitem' }, el('span', { text }), el('span', { class: 'dwi-dim', text: saved ? ' → ' + saved.file : ' (copied)' })));
      if (noteText.value.trim() === text) noteText.value = '';
      if (saved) toast('Saved for ' + (e.owner || 'the owner') + ': ' + saved.file);
    } finally { savingNote = false; }
  }
  function context() {
    const s = ix.subject, c = ix.orbit.state(), m = ix.marine && ix.marine.move;
    const t = ix.recorder.scrubbing ? ' at ' + fmt(-(ix.recorder.timeAt(0) - ix.recorder.timeAt(ix.scrubBack())), 2) + ' s back' : '';
    return [ix.variant ? 'variant ' + ix.variant : null, s && s.mode ? 'mode ' + s.mode : null, s && s.entry.kind === 'marine' ? 'gun ' + (ix.marine.unarmed() ? 'none' : ix.marine.current()) + (m ? ', move ' + m.id : '') : null,
      'speed ' + ix.clock.speed() + 'x' + (ix.clock.paused ? ' paused' : '') + t, 'view yaw ' + Math.round(c.yaw) + ' pitch ' + Math.round(c.pitch) + ' dist ' + fmt(c.dist, 2), 'light ' + ix.stage.light()].filter(Boolean).join(', ');
  }
  noteText.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveNote(); } if (e.key === 'Escape') noteText.blur(); });
  notesBox.append(el('h3', { text: 'A note for the owner' }), noteText, el('div', { class: 'dwi-row' }, btn('Save note (ctrl+Enter)', saveNote), btn('Copy all', async () => { await copyText(notes.map((n) => n.line).join('\n')); toast('Copied ' + notes.length + ' note(s)'); })), noteList);

  // --- bottom: the clock, the views, pictures -------------------------------------------------------------------
  const playBtn = el('button', { class: 'dwi-btn dwi-play', title: 'Play / pause (Space)', onclick: () => { if (canMutate()) ix.clock.paused ? ix.play() : ix.pause(); } });
  const speeds = [0.05, 0.1, 0.25, 0.5, 1, 2];
  const speedSel = el('select', { title: 'Speed (- =)' }, speeds.map((k) => el('option', { value: k, text: k + 'x' })));
  speedSel.value = '1'; speedSel.addEventListener('change', () => { if (!canMutate()) { timeChanged(); return; } try { ix.speed(+speedSel.value); } catch (e) { timeChanged(); toast(e.message || String(e), true); } });
  const scrub = el('input', { type: 'range', class: 'dwi-scrub', min: 0, max: 1, step: 1, value: 1, title: 'The rewind: drag back through the last few seconds (paused)' });
  scrub.addEventListener('input', () => { if (!canMutate()) { timeChanged(); return; } try { const n = ix.recorder.frames; ix.scrub(n - 1 - (+scrub.value)); } catch (e) { timeChanged(); toast(e.message || String(e), true); } });
  const timeLbl = el('span', { class: 'dwi-time' });
  const views = el('div', { class: 'dwi-views' });
  const viewPicker = el('select', { class: 'dwi-view-picker', title: 'View (1–7)', 'aria-label': 'Camera view' });
  viewPicker.addEventListener('change', () => { if (!canMutate()) { viewPicker.value = ix.orbit.followState?.().bookmark || viewPicker.dataset.view; return; } try { ix.orbit.view(viewPicker.value); viewPicker.dataset.view = viewPicker.value; } catch (e) { viewPicker.value = viewPicker.dataset.view; toast(e.message || String(e), true); } });
  function drawViews() {
    views.textContent = ''; viewPicker.textContent = '';
    const marine = ix.entry && ix.entry.kind === 'marine', keys = marine ? MARINE_KEYS : MODEL_KEYS;
    const short = { threeQ: '¾', three: '¾', full: 'Full' };
    keys.forEach((k, i) => viewPicker.append(el('option', { value: k, text: (i + 1) + ': ' + human(k) })));
    viewPicker.value = viewPicker.dataset.view = keys[0];
    keys.forEach((k, i) => views.append(el('button', { class: 'dwi-btn dwi-view', text: short[k] || human(k), title: (i + 1) + ': ' + human(k), onclick: () => { if (!canMutate()) return; viewPicker.value = viewPicker.dataset.view = k; ix.orbit.view(k); } })));
    views.append(el('button', { class: 'dwi-btn dwi-view', text: 'Frame', title: 'F: frame it from here', onclick: () => { if (canMutate()) ix.orbit.view({ yaw: ix.orbit.state().yaw - ((ix.subject && ix.subject.focus().yaw) || 0) * 57.2958, pitch: ix.orbit.state().pitch }); } }));
  }
  const operation = el('span', { class: 'dwi-operation', role: 'status', 'aria-live': 'polite', hidden: true });
  const cancelBtn = el('button', { class: 'dwi-btn', 'data-dwi-safe': true, text: 'Cancel', hidden: true, title: 'Cancel the current check or capture (Esc)', onclick: () => ix.api && ix.api.cancel && ix.api.cancel() });
  const driveBtn = el('button', { class: 'dwi-btn', text: 'Drive (P)', title: 'Play him yourself with the game\'s keys and mouse; Esc gives the camera back', onclick: () => { if (canMutate()) ix.setDrive(!ix.drive); } });
  const muteBtn = el('button', { class: 'dwi-btn', text: 'Sound', title: 'Sound on / off (M)', onclick: () => { const A = ix.host.audio; if (A && A.toggleMute) A.toggleMute(); muteBtn.classList.toggle('on', !(A && A.isMuted && A.isMuted())); } });
  bar.append(
    el('div', { class: 'dwi-transport' }, el('button', { class: 'dwi-btn', text: '◀', title: 'One frame back (,)', onclick: () => { if (canMutate()) ix.step(-1); } }), playBtn,
      el('button', { class: 'dwi-btn', text: '▶', title: 'One frame on (.)', onclick: () => { if (canMutate()) ix.step(1); } }), speedSel, scrub, timeLbl),
    views, viewPicker, operation, cancelBtn,
    el('div', { class: 'dwi-pics' }, el('button', { class: 'dwi-btn', text: 'Picture (S)', onclick: () => savePicture() }), el('button', { class: 'dwi-btn', text: 'Sheet (⇧S)', onclick: () => saveSheet() }), driveBtn, muteBtn,
      el('button', { class: 'dwi-btn', 'data-dwi-safe': true, text: 'Hide (H)', onclick: () => root.classList.toggle('bare') })));

  function download(dataUrl, name) { const a = el('a', { href: dataUrl, download: name }); document.body.append(a); a.click(); a.remove(); }
  const stamp = () => new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  async function savePicture() {
    if (!canMutate()) return;
    root.classList.add('shooting');
    try { download(await ix.api.shot(), (ix.entry ? ix.entry.id : 'inspector') + '-' + stamp() + '.png'); toast('Picture saved to your downloads'); }
    catch (e) { toast('Picture: ' + (e.message || e), true); }
    finally { root.classList.remove('shooting'); }
  }
  async function saveSheet(n = 8) {
    if (!canMutate()) return;
    try { download(await ix.api.sheetData({ n }), (ix.entry ? ix.entry.id : 'inspector') + '-turnaround-' + stamp() + '.jpg'); toast('Turnaround sheet saved to your downloads'); }
    catch (e) { toast(e.name === 'AbortError' ? 'Sheet cancelled' : 'Sheet: ' + (e.message || e), e.name !== 'AbortError'); }
  }

  // --- what happens when ------------------------------------------------------------------------------------------
  function subjectShown(entry, s) {
    for (const [id, it] of itemEls) it.classList.toggle('on', id === entry.id);
    const it = itemEls.get(entry.id); if (it) it.scrollIntoView({ block: 'nearest' });
    broken.delete(entry.id);
    subjTitle.textContent = entry.name; subjId.textContent = entry.id;
    subjSource.textContent = (entry.source || '') + (entry.owner ? ' · owner: ' + entry.owner : '');
    subjNotes.textContent = entry.notes || '';
    refreshers = [];
    subjBody.textContent = '';
    subjBody.append(entry.kind === 'marine' ? marineBody() : entry.kind === 'zombie' ? zombieBody(s) : modelBody(s));
    viewSection(); drawViews();
  }
  function subjectFailed(entry, e) {
    broken.set(entry.id, String(e && e.message || e));
    subjTitle.textContent = entry.name; subjId.textContent = entry.id; subjSource.textContent = entry.source || '';
    subjNotes.textContent = ''; subjBody.textContent = '';
    subjBody.append(el('div', { class: 'dwi-error', text: 'It did not build: ' + (e && e.message || e) }));
    renderList();
  }
  function timeChanged() {
    playBtn.textContent = ix.clock.paused ? '▶ Play' : '❚❚ Pause';
    playBtn.classList.toggle('on', !ix.clock.paused);
    const n = ix.recorder.frames; scrub.max = Math.max(1, n - 1); scrub.value = Math.max(0, n - 1 - ix.scrubBack());
    scrub.disabled = n < 2;
    const currentSpeed = String(ix.clock.speed());
    if (!Array.from(speedSel.options).some((option) => option.value === currentSpeed)) {
      for (const old of speedSel.querySelectorAll('[data-custom-speed]')) old.remove();
      speedSel.append(el('option', { value: currentSpeed, 'data-custom-speed': true, text: currentSpeed + 'x' }));
    }
    if (currentSpeed !== speedSel.value) speedSel.value = currentSpeed;
  }
  function driveChanged(on) {
    root.classList.toggle('driving', on); driveBanner.hidden = !on; driveBtn.classList.toggle('on', on);
    toast(on ? 'Driving: WASD, mouse aim, the game\'s keys. Esc stops.' : 'The camera is back');
  }
  // dimension label above the box, joint names, the numbers line; DOM work at ~10 Hz
  let slow = 0, fps = 60, lastNow = performance.now(), lastDraws = null;
  const _v = new ix.THREE.Vector3();
  function project(x, y, z) {
    _v.set(x, y, z).project(T.camera);
    if (_v.z > 1) return null;
    const c = T.renderer.domElement; return { x: (_v.x + 1) / 2 * c.clientWidth, y: (1 - _v.y) / 2 * c.clientHeight };
  }
  function frame(dt, focus) {
    operation.hidden = cancelBtn.hidden = !ix.busy;
    if (ix.busy) { const label = busyLabel(); if (operation.textContent !== label) operation.textContent = label; }
    const now = performance.now(), d = now - lastNow; lastNow = now; fps += ((1000 / Math.max(1, d)) - fps) * 0.05;
    if (toastT && now > toastT) { toastEl.className = 'dwi-toast'; toastT = 0; }
    if (refreshAt && now > refreshAt) { refreshAt = 0; for (const f of refreshers) { try { f(); } catch (_) {} } if (ix.entry && ix.entry.kind === 'marine' && ix._redrawMarine && /Kit|Wardrobe/.test(localGet('dwi.marineTab') || '')) ix._redrawMarine(); }
    if ((slow -= d) > 0) return; slow = 100;
    const s = ix.subject;
    if (moveStatus && ix.entry && ix.entry.kind === 'marine') {
      const M = ix.marine, state = M.state();
      const message = M.move ? M.move.name + (state.running ? ' · running' : state.loop ? ' · looping' : ' · once') : state.error ? 'Stopped: ' + state.error : 'Choose a move · Space pauses · , / . step frames';
      if (moveStatus.textContent !== message) moveStatus.textContent = message;
      for (const b of right.querySelectorAll('.dwi-move')) b.classList.toggle('on', b.dataset.move === (M.move && M.move.id));
    }
    const sb = ix.stage.frame ? null : null; void sb;
    let box = null; try { box = (ix.stage.overlays.get('bounds') || ix.stage.overlays.get('stick')) && s ? (s.bounds ? s.bounds() : ix.stage.measure(s.rig())) : null; } catch (_) {}
    // the labels after the draw, when the camera is where the picture was taken from (this runs before the shot view)
    queueMicrotask(() => {
      labels.textContent = '';
      if (box && ix.stage.overlays.get('bounds') && ix.stage.overlays.get('labels')) {
        const p = project(box.center.x, box.max.y, box.center.z);
        if (p) labels.append(el('div', { class: 'dwi-dims', style: `left:${p.x}px;top:${p.y}px`, text: fmt(box.size.x) + ' × ' + fmt(box.size.y) + ' × ' + fmt(box.size.z) + ' m' }));
      }
      if (s && ix.stage.overlays.get('joints') && s.joints) for (const j of s.joints().slice(0, 40)) { j.obj.getWorldPosition(_v); const p = project(_v.x, _v.y, _v.z); if (p) labels.append(el('div', { class: 'dwi-joint', style: `left:${p.x}px;top:${p.y}px`, text: j.name })); }
    });
    const inf = s ? s.info() : null, R = lastDraws;
    queueMicrotask(() => { const I = T.renderer.info && T.renderer.info.render; lastDraws = I ? { drawCalls: I.drawCalls, triangles: I.triangles } : null; });   // after the draw
    const size = focus ? fmt(focus.size.x) + ' × ' + fmt(focus.size.y) + ' × ' + fmt(focus.size.z) + ' m' : '';
    subjInfo.textContent = inf ? inf.tris.toLocaleString() + ' triangles · ' + inf.meshes + ' meshes · ' + inf.materials + ' materials · ' + size : '';
    const sc = ix.recorder.scrubbing, back = sc ? ix.recorder.timeAt(0) - ix.recorder.timeAt(ix.scrubBack()) : 0;
    timeLbl.textContent = (sc ? '−' + fmt(back, 2) + ' s' : ix.clock.paused ? 'paused' : 'live') + ' · ' + fmt(ix.recorder.span(), 1) + ' s kept · ' + Math.round(fps) + ' fps' + (R ? ' · ' + (R.drawCalls ?? 0) + ' draws' : '');
    timeChanged();
  }
  // --- keys (orbit mode; the inspector's filter calls this) -------------------------------------------------------
  function cycleSubject(dir) {
    const visible = [...itemEls.keys()], ids = visible.length ? visible : ix.catalog.map((e) => e.id);
    const i = ids.indexOf(ix.entry && ix.entry.id), next = ids[((i < 0 ? 0 : i + dir) % ids.length + ids.length) % ids.length];
    show(next);
  }
  function cycleMove(dir) {
    const M = ix.marine, ids = M.MOVES.map((m) => m.id), i = ids.indexOf(M.move && M.move.id);
    playMove(ids[((i < 0 ? (dir > 0 ? 0 : ids.length - 1) : i + dir) % ids.length + ids.length) % ids.length]);
  }
  function key(e) {
    const k = e.key, o = ix.orbit, st = ix.stage.overlays, marine = ix.entry && ix.entry.kind === 'marine';
    if (ix.busy && !['KeyH', 'Slash'].includes(e.code) && k !== '?') {
      if (e.code === 'Escape' && ix.api && ix.api.cancel) ix.api.cancel();
      else toast(busyLabel() + ' · wait or Cancel', true);
      return true;
    }
    if (!help.hidden && (k === 'Escape' || k === '?')) { help.hidden = true; return true; }
    switch (true) {
      case e.code === 'Space': ix.clock.paused ? ix.play() : ix.pause(); return true;
      case k === ',' || k === '<': ix.step(e.shiftKey ? -10 : -1); return true;
      case k === '.' || k === '>': ix.step(e.shiftKey ? 10 : 1); return true;
      case k === '-' || k === '_': { const lower = speeds.filter((k) => k < ix.clock.speed()); ix.speed(lower.length ? lower[lower.length - 1] : speeds[0]); toast('Speed ' + ix.clock.speed() + 'x'); return true; }
      case k === '=' || k === '+': { ix.speed(speeds.find((k) => k > ix.clock.speed()) ?? speeds[speeds.length - 1]); toast('Speed ' + ix.clock.speed() + 'x'); return true; }
      case k === '[' || k === '{': (marine && !e.shiftKey) ? cycleMove(-1) : cycleSubject(-1); return true;
      case k === ']' || k === '}': (marine && !e.shiftKey) ? cycleMove(1) : cycleSubject(1); return true;
      case /^Digit[1-7]$/.test(e.code): { const keys = marine ? MARINE_KEYS : MODEL_KEYS; viewPicker.value = viewPicker.dataset.view = keys[+e.code.slice(5) - 1]; o.view(viewPicker.value); return true; }
      case e.code === 'Digit0': viewPicker.value = viewPicker.dataset.view = marine ? 'full' : 'three'; o.view(viewPicker.value); return true;
      case e.code === 'KeyF': o.view({ yaw: o.state().yaw - ((ix.subject && ix.subject.focus().yaw) || 0) * 57.2958, pitch: o.state().pitch }); return true;
      case e.code === 'ArrowLeft': o.orbitBy(e.shiftKey ? 5 : 15, 0); return true;
      case e.code === 'ArrowRight': o.orbitBy(e.shiftKey ? -5 : -15, 0); return true;
      case e.code === 'ArrowUp': o.orbitBy(0, e.shiftKey ? 3 : 10); return true;
      case e.code === 'ArrowDown': o.orbitBy(0, e.shiftKey ? -3 : -10); return true;
      case e.code === 'PageUp': o.dolly(0.8); return true;
      case e.code === 'PageDown': o.dolly(1.25); return true;
      case e.code === 'KeyB': st.set('bounds', !st.get('bounds')); viewSection(); return true;
      case e.code === 'KeyJ': st.set('joints', !st.get('joints')); viewSection(); return true;
      case e.code === 'KeyX': st.set('axes', !st.get('axes')); viewSection(); return true;
      case e.code === 'KeyW': st.set('wire', !st.get('wire')); viewSection(); return true;
      case e.code === 'KeyG': st.set('grid', !st.get('grid')); viewSection(); return true;
      case e.code === 'KeyT': if (ix.subject && ix.subject.holder) { ix.subject.turntable = ix.subject.turntable ? 0 : 0.6; } return true;
      case e.code === 'KeyP': ix.setDrive(!ix.drive); return true;
      case e.code === 'KeyS': e.shiftKey ? saveSheet() : savePicture(); return true;
      case e.code === 'KeyN': noteText.focus(); return true;
      case e.code === 'KeyH': root.classList.toggle('bare'); return true;
      case k === '?' || e.code === 'Slash': help.hidden = !help.hidden; return true;
      case e.code === 'KeyM': muteBtn.click(); return true;
      case e.code === 'Escape': if (ix.marine.move) ix.marine.stop(); return true;
    }
    return false;
  }
  renderList(); timeChanged();
  return { root, stage, toast, frame, key, subjectShown, subjectFailed, timeChanged, driveChanged, renderList, markBroken: (id, err) => { if (err) broken.set(id, err); else broken.delete(id); renderList(); }, cameraMoved: () => {} };
}
