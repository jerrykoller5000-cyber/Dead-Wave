import { createArmory, slotType } from '../game/armory.js';
import { text } from './strings.js';

// GP-78 presents a per-player armory beside the CIF. CU-65 connects the
// selected loadout to the game wheel and purchases through these callbacks.
export function mountArmory({ doc = document, bus = window, cif = doc.getElementById('cif'),
  getPhase = () => 'prep', getOwned = () => [], onApply = () => {}, onReset = null, armory: shared = null } = {}) {
  if (!cif?.querySelector('.card > .modes')) throw new Error('CIF window is missing');
  let armory = shared || createArmory(), selected = { type: 'primary', index: 0 }, open = false;
  const button = doc.createElement('button');
  button.type = 'button'; button.id = 'armoryOpen'; button.textContent = text('armory.open');
  cif.querySelector('.card > .modes').prepend(button);
  const panel = doc.createElement('section');
  panel.id = 'armoryPanel'; panel.hidden = true; panel.setAttribute('aria-labelledby', 'armoryTitle');
  const heading = doc.createElement('h2'); heading.id = 'armoryTitle'; heading.textContent = text('armory.title');
  const hint = doc.createElement('p'); hint.className = 'hint'; hint.textContent = text('armory.hint');
  const hip = doc.createElement('p'); hip.className = 'armory-hip';
  const slotGrid = doc.createElement('div'); slotGrid.className = 'armory-slots';
  const shelfTitle = doc.createElement('h3'); shelfTitle.textContent = text('armory.shelf');
  const shelf = doc.createElement('div'); shelf.className = 'armory-shelf';
  const actions = doc.createElement('div'); actions.className = 'armory-actions';
  const stow = doc.createElement('button'); stow.type = 'button'; stow.textContent = text('armory.stow');
  const done = doc.createElement('button'); done.type = 'button'; done.textContent = text('armory.done');
  actions.append(stow, done); panel.append(heading, hint, hip, slotGrid, shelfTitle, shelf, actions); cif.append(panel);
  const labelGun = gun => text(`weapon.${gun.kind}.name`);
  const detailGun = gun => {
    const parts = [];
    if (gun.loaded !== null && gun.kind !== 'chainsaw') parts.push(text('armory.loaded', { count: gun.loaded }));
    if (gun.magazines.length) parts.push(text('armory.magazines', { count: gun.magazines.length }));
    if (gun.rounds) parts.push(text('armory.rounds', { count: gun.rounds }));
    return parts.join(' · ');
  };
  function syncOwned() {
    for (const gun of getOwned() || []) if (!armory.has(gun.id)) armory.buy(gun);
  }
  function render() {
    button.disabled = getPhase() !== 'prep';
    if (!open) return;
    const state = armory.read();
    hip.textContent = text('armory.hip', { gun: text('weapon.pistol.name') });
    slotGrid.replaceChildren(); shelf.replaceChildren();
    for (const type of ['primary', 'secondary']) for (let index = 0; index < 2; index++) {
      const gun = state.slots[type][index];
      const tile = doc.createElement('button'); tile.type = 'button'; tile.dataset.slot = `${type}:${index}`;
      tile.className = selected.type === type && selected.index === index ? 'selected' : '';
      tile.setAttribute('aria-pressed', String(selected.type === type && selected.index === index));
      const name = doc.createElement('strong');
      name.textContent = text(type === 'primary' ? 'armory.primary' : 'armory.secondary', { number: index + 1 });
      const value = doc.createElement('span'); value.textContent = gun ? labelGun(gun) : text('armory.empty');
      const detail = doc.createElement('small'); detail.textContent = gun ? detailGun(gun) : '';
      tile.append(name, value, detail);
      tile.addEventListener('click', () => { selected = { type, index }; render(); });
      slotGrid.append(tile);
    }
    for (const gun of state.shelf) {
      const tile = doc.createElement('button'); tile.type = 'button'; tile.dataset.gun = gun.id;
      tile.disabled = slotType(gun.kind) !== selected.type;
      const name = doc.createElement('strong'); name.textContent = labelGun(gun);
      const detail = doc.createElement('small'); detail.textContent = detailGun(gun);
      tile.append(name, detail);
      tile.addEventListener('click', () => { armory.take(gun.id, selected.type, selected.index); render(); });
      shelf.append(tile);
    }
    if (!state.shelf.length) {
      const empty = doc.createElement('p'); empty.textContent = text('armory.shelfEmpty'); shelf.append(empty);
    }
    stow.disabled = !state.slots[selected.type][selected.index];
  }
  function close() {
    if (!open) return;
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
      armory = (typeof onReset === 'function' ? onReset() : null) || createArmory(); selected = { type: 'primary', index: 0 }; close();
    }
  };
  bus.addEventListener('dw-game', listener);
  return { get armory() { return armory; }, element: panel, open: () => button.click(), close,
    dispose() { bus.removeEventListener('dw-game', listener); observer.disconnect(); close(); panel.remove(); button.remove(); } };
}
