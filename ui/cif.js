// Presentation only. Wardrobe validation, saving and unlock ownership stay with their owners.
export function filterFinishes(entries) {
  return entries.filter(entry => !entry.locked);
}

export function availableCifItems(items, gear) {
  const required = {helmet:'helmet', carrier:'vest', pads:'pads'};
  return items.filter(id => gear == null || !Object.hasOwn(required,id) || gear[required[id]] === true);
}

export function createCifMenu({root, text, freeCamos, getGear=()=>null}) {
  const $ = id => root.querySelector('#' + id);
  const list = $('cifList'), options = $('cifOptions'), filters = $('cifFilters');
  let focus = null, selection = '';
  const countLabel = document.createElement('span');
  countLabel.className = 'cif-available-count'; filters.replaceChildren(countLabel);
  function applyFilter() {
    const entries = [...list.querySelectorAll('[data-camo]')].map(button => ({button, locked: button.disabled}));
    const visible = new Set(filterFinishes(entries).map(entry => entry.button));
    for (const {button} of entries) button.hidden = !visible.has(button);
    for (const heading of list.querySelectorAll('.cif-group')) {
      let sibling = heading.nextElementSibling, any = false;
      while (sibling && !sibling.classList.contains('cif-group')) {
        any ||= !sibling.hidden; sibling = sibling.nextElementSibling;
      }
      heading.hidden = !any;
    }
    countLabel.textContent = text('cif.menu.count', {label:text('cif.menu.available'), count:visible.size});
    $('cifEmpty').hidden = entries.length === 0 || visible.size > 0;
  }
  return {
    prepare() {
      const active = document.activeElement;
      focus = root.contains(active) ? {camo:active.dataset.camo, option:options.contains(active) ? active.textContent : null} : null;
      options.replaceChildren();
    },
    refresh({tab, item, current}) {
      const itemButtons = [...root.querySelectorAll('#cifItems [data-cif-item]')];
      const available = new Set(availableCifItems(itemButtons.map(b=>b.dataset.cifItem), getGear()));
      for (const button of itemButtons) button.hidden = !available.has(button.dataset.cifItem);
      // Reuse the owner's selection handler; never mutate wardrobe or unlock data here.
      if (itemButtons.some(button=>button.dataset.cifItem===item && button.hidden)) {
        const first = itemButtons.find(button=>!button.hidden);
        if (first) { first.click(); return; }
      }
      if (selection !== tab + ':' + item) root.querySelector('.cif-scroll').scrollTop = 0;
      selection = tab + ':' + item;
      const camos = [...list.querySelectorAll('[data-camo]')];
      for (const child of [...list.children]) {
        if (!child.dataset.camo && (camos.length === 0 || !child.classList.contains('cif-group'))) options.append(child);
      }
      options.hidden = !options.children.length;
      list.hidden = filters.hidden = camos.length === 0;
      $('cifSelection').textContent = tab === 'him' ? text('cif.tab.him') : tab === 'guns' ? text('weapon.' + item + '.name') : text('cif.item.' + item);
      $('cifCurrent').textContent = current ? text('cif.menu.current',{finish:text('cif.pattern.' + current)}) : text('cif.menu.' + (tab === 'guns' ? 'factory' : 'choose'));
      $('cifPreviewNote').textContent = text('cif.menu.' + (tab === 'guns' ? 'gunNote' : 'drag'));
      $('cifReset').textContent = text('cif.menu.reset',{category:text('cif.tab.' + tab)});
      for (const button of root.querySelectorAll('#cifTabs button, #cifItems button, #cifOptions button, #cifList button')) button.setAttribute('aria-pressed',String(button.classList.contains('on')));
      if (camos.length) {
        const heading = document.createElement('div');heading.className = 'cif-group';heading.textContent = text('cif.menu.patterns');list.prepend(heading);
        for (const button of camos) {
          const mark = button.querySelector('b');
          if (!button.disabled) mark.textContent = text('cif.menu.' + (button.classList.contains('on') ? 'equipped' : freeCamos.includes(button.dataset.camo) ? 'issued' : 'earned'));
          else {
            const lock = document.createElement('span');lock.className = 'cif-lock';lock.textContent = text('cif.menu.locked');button.insertBefore(lock,mark);
          }
          button.querySelector('canvas')?.setAttribute('aria-hidden','true');
        }
      }
      applyFilter();
      const target = focus?.camo ? camos.find(b=>b.dataset.camo===focus.camo) : focus?.option ? [...options.querySelectorAll('button')].find(b=>b.textContent===focus.option) : null;
      if (target && !target.hidden) target.focus({preventScroll:true});
    }
  };
}
