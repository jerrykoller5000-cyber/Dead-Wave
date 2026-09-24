import { text, hasText, STRINGS } from './strings.js';
import { renderPrepRows } from './prep-checklist.js';

export const FIELD_INTEL_PRICE = 120;
const CAVE_KEYS = Object.keys(STRINGS).filter(key => key.startsWith('world.cave.'));
const COMPASS = ['n','ne','e','se','s','sw','w','nw'];
const validCount = n => Number.isSafeInteger(n) && n >= 0;
export function bearingLabel(angle) {
  if (!Number.isFinite(angle)) return text('wavePreview.unknownBearing');
  // The game's north is +z; east is -x. Preview bearings are atan2(z, x).
  const sector = Math.round(Math.atan2(-Math.cos(angle), Math.sin(angle)) / (Math.PI / 4));
  return text(`compass.${COMPASS[(sector + 8) % 8]}`);
}

// Pure projection of Grokbot's frozen plan. It neither reads TT nor consumes RNG.
export function buildBriefing({ preview, day, intelOwned = false } = {}) {
  const result = { title: validCount(day) && day > 0 ? text('wavePreview.title', { day }) : text('wavePreview.unavailable'),
    available: false, warnings: [], sources: [], total: null, note: text('wavePreview.unavailable') };
  if (!preview || preview.day !== day || !validCount(preview.total) || !Array.isArray(preview.byTypeAndCave)) return result;
  if (preview.bloodMoon) result.warnings.push(text('hud.bloodMoon'));
  if (preview.surround) result.warnings.push(text('wave.surround'));
  if (preview.hasColossus) result.warnings.push(text('wavePreview.colossus'));
  const groups = new Map(); let sum = 0;
  for (const row of preview.byTypeAndCave) {
    if (!row || !validCount(row.count) || !Number.isInteger(row.caveIndex) || row.caveIndex < -1 ||
        row.typeKey === 'caveguard' || !hasText(`enemy.${row.typeKey}.name`)) return result;
    sum += row.count;
    if (!Number.isSafeInteger(sum)) return result;
    if (!row.count) continue;
    const id = row.caveIndex >= 0 ? `cave:${row.caveIndex}` : row.typeKey === 'drowned' ? 'lake' : 'perimeter';
    let group = groups.get(id);
    if (!group) {
      const nameKey = CAVE_KEYS.find(key => STRINGS[key] === row.caveName);
      const i = Array.isArray(preview.caveIndices) ? preview.caveIndices.indexOf(row.caveIndex) : -1;
      group = { id, name: row.caveIndex >= 0 ? text(nameKey || 'wavePreview.unknownSource') : text(`wavePreview.${id}`),
        bearing: bearingLabel(i >= 0 ? preview.bearings?.[i] : undefined), total: 0, types: new Map() };
      groups.set(id, group);
    }
    group.total += row.count; group.types.set(row.typeKey, (group.types.get(row.typeKey) || 0) + row.count);
  }
  if (sum !== preview.total) return result;
  result.available = true;
  if (!sum) { result.note = text('wavePreview.empty'); return result; }
  const all = [...groups.values()].sort((a,b) => b.total - a.total || a.id.localeCompare(b.id));
  const largest = all.filter(group => group.total === all[0].total);
  const selected = intelOwned ? all : largest.slice(0, 2);
  result.sources = selected.map(group => {
    const types = [...group.types].sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return { id: group.id, heading: intelOwned ? group.name : text('wavePreview.largest', {source:group.name,bearing:group.bearing}),
      bearing: group.bearing,
      lines: intelOwned ? types.map(([key,count]) => text('wavePreview.row', {enemy:text(`enemy.${key}.name`),count})) :
        [text('wavePreview.mainThreat', {enemy:text(`enemy.${types[0][0]}.name`)})],
      total: intelOwned ? text('wavePreview.sourceTotal', {source:group.name,count:group.total}) : null };
  });
  result.total = intelOwned ? text('wavePreview.total', {count:sum}) : null;
  result.note = intelOwned ? '' : (largest.length > 2 ? text('wavePreview.multiple') + ' · ' : '') + text('wavePreview.locked');
  return result;
}

export function intelOffer(cash, owned) {
  const affordable = Number.isFinite(cash) && cash >= FIELD_INTEL_PRICE;
  return { enabled: !owned && affordable, label: text(owned ? 'shop.owned' : affordable ? 'shop.buy' : 'shop.shortfall',
    owned ? {} : affordable ? {price:FIELD_INTEL_PRICE} : {amount:FIELD_INTEL_PRICE - (Number.isFinite(cash) ? Math.max(0,cash) : 0)}) };
}

export function mountBriefing({ doc = document, bus = window } = {}) {
  const send = (type, details = {}) => bus.dispatchEvent(new CustomEvent('dw-game', {detail:{type,...details}}));
  const dialog = doc.createElement('dialog'); dialog.id = 'hqBriefing'; dialog.setAttribute('aria-labelledby','briefingTitle');
  const heading = doc.createElement('h2'); heading.id = 'briefingTitle';
  const content = doc.createElement('div'); content.className = 'briefing-content';
  const footer = doc.createElement('footer'), alarm = doc.createElement('button'), close = doc.createElement('button');
  alarm.type = close.type = 'button'; alarm.textContent = text('wavePreview.alarm'); close.textContent = text('common.close');
  const prep = doc.createElement('section'), prepHeading = doc.createElement('h3'), prepRows = doc.createElement('ul');
  prep.className = 'briefing-prep'; prepRows.className = 'prep-goals'; prep.hidden = true; prep.append(prepHeading,prepRows);
  footer.append(alarm,close); dialog.append(heading,content,prep,footer); doc.body.append(dialog);
  let returnFocus = null;
  const line = (parent, tag, value, cls) => { const el=doc.createElement(tag); el.textContent=value; if(cls)el.className=cls; parent.append(el); return el; };
  function render(data) {
    const view = buildBriefing(data); heading.textContent = view.title; content.replaceChildren();
    for (const warning of view.warnings) line(content,'p',warning,'briefing-warning');
    for (const source of view.sources) {
      const group=doc.createElement('section'); content.append(group); line(group,'h3',source.heading);
      if(data.intelOwned)line(group,'p',source.bearing,'briefing-muted');
      for(const label of source.lines)line(group,'p',label);
      if(source.total)line(group,'p',source.total,'briefing-muted');
    }
    if(view.note)line(content,'p',view.note,'briefing-muted');
    if(view.total)line(content,'p',view.total,'briefing-total');
    if(data.phase!=='prep')line(content,'p',text('wavePreview.inProgress'),'briefing-warning');
    if(data.disabled)line(content,'p',text('hq.disabled'),'briefing-warning');
    alarm.disabled = data.phase !== 'prep' || data.alarmActive || data.disabled;
    // Missing optional intelligence must never prevent a valid wave start.
  }
  function shut() {
    if(!dialog.open)return;
    dialog.close(); doc.body.classList.remove('briefing');
    if(returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  }
  alarm.addEventListener('click',()=>send('alarm-request'));
  close.addEventListener('click',()=>send('briefing-close-request'));
  dialog.addEventListener('cancel',e=>{e.preventDefault();send('briefing-close-request');});
  // Capture input before the game's global bindings. Native Tab/Enter and button clicks
  // still work; movement/build/fire never leaks into the paused game behind the dialog.
  const keys = e => {
    if(!dialog.open)return;
    e.stopImmediatePropagation();
    if(e.type==='keydown' && (e.code==='Escape'||e.code==='KeyE')) {
      e.preventDefault(); if(!e.repeat)send('briefing-close-request');
    }
  };
  bus.addEventListener('keydown',keys,true); bus.addEventListener('keyup',keys,true);
  for(const type of ['mousedown','mouseup','wheel','contextmenu'])bus.addEventListener(type,e=>{if(dialog.open)e.stopImmediatePropagation();},true);
  const receive = ({detail:data}) => {
    if(!data)return;
    if(data.type==='briefing-open') {
      render(data);
      if(!dialog.open){returnFocus=doc.activeElement;doc.body.classList.add('briefing');dialog.showModal();close.focus();}
    } else if(data.type==='prep-checklist-view') {
      prep.hidden = !data.view.visible; prepHeading.textContent = data.view.summary; renderPrepRows(prepRows,data.view,doc);
    } else if(data.type==='briefing-closed'||data.type==='run-reset') shut();
    else if(data.type==='hq-prompt') { if(data.element)data.element.textContent=text(data.alarm?'hq.alarmSounding':'wavePreview.prompt'); }
    else if(data.type==='prep-label') data.element.textContent=text(data.alarm?'prep.alarmSounding':data.intelOwned?'prep.day':'wavePreview.prepDay',{day:data.day,count:data.total});
    else if(data.type==='prep-hud') data.element.textContent=text(data.intelOwned?'wavePreview.hudFull':'wavePreview.hudBasic',{day:data.day,count:data.total});
    else if(data.type==='shop-render'&&data.tab==='upgrades') {
      const offer=intelOffer(data.cash,data.intelOwned), row=doc.createElement('div');row.className='perk';row.dataset.item='field-intel';
      line(row,'div',text('fieldIntel.name'),'name');line(row,'div',text('fieldIntel.description'),'desc');
      const buy=line(row,'button',offer.label);buy.type='button';buy.disabled=!offer.enabled;
      buy.addEventListener('click',()=>send('intel-purchase-request'));
      data.container.prepend(row);
    }
  };
  bus.addEventListener('dw-game',receive);
  return { dialog, render, close:shut };
}

if(typeof window!=='undefined' && typeof document!=='undefined') mountBriefing();
