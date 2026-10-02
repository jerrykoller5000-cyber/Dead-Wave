import { renderQuestPanel } from './quest-panel.js';
import { text, hasText, STRINGS } from './strings.js';
import { renderPrepRows } from './prep-checklist.js';
import { buildScoutingReport, scoutingSpecialNight } from './scouting.js';
import { buildBountyBoard } from './bounties.js';
import { buildRadioCallView } from './radio-call.js';

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
    available: false, warnings: [], sources: [], total: null, earnings: null, note: text('wavePreview.unavailable') };
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
    const id = row.caveIndex >= 0 ? `cave:${row.caveIndex}` : row.ground === true ? 'ground' : row.typeKey === 'drowned' ? 'lake' : 'perimeter';
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
  const special = scoutingSpecialNight(preview.night);
  if (special) result.warnings.push(special.warning);
  if (!sum) { result.note = text('wavePreview.empty'); return result; }
  if (day === 1) result.earnings = text('economy.dayOne');
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

export function boatCallView({day,goalNight,phase,extraction,relayReady,alarmActive,disabled,canSoundAlarm}={}) {
 const goal=validCount(day)&&validCount(goalNight)&&goalNight>0&&day>=goalNight&&phase==='prep';
 const offered=goal&&extraction==='offered';
 return { offered, enabled:offered&&!alarmActive&&!disabled&&canSoundAlarm!==false,
  relayDown:goal&&extraction==null&&relayReady===false };
}

export function mountBriefing({ doc = document, bus = window } = {}) {
  const send = (type, details = {}) => bus.dispatchEvent(new CustomEvent('dw-game', {detail:{type,...details}}));
  const dialog = doc.createElement('dialog'); dialog.id = 'hqBriefing'; dialog.setAttribute('aria-labelledby','briefingTitle');
  const header = doc.createElement('header'); header.className = 'briefing-header';
  const identity = doc.createElement('div'), station = doc.createElement('p'); station.className = 'briefing-station'; station.textContent = text('alarm.station');
  const heading = doc.createElement('h2'); heading.id = 'briefingTitle'; heading.textContent = text('alarm.title');
  const subtitle = doc.createElement('p'); subtitle.className = 'briefing-day';
  identity.append(station,heading,subtitle);
  const close = doc.createElement('button'); close.type = 'button'; close.className = 'briefing-close'; close.textContent = text('common.close');
  header.append(identity,close);
  const status = doc.createElement('p'); status.className = 'briefing-status'; status.setAttribute('role','status');
  const nav = doc.createElement('nav'); nav.className = 'briefing-nav'; nav.setAttribute('aria-label',text('alarm.title'));
  const content = doc.createElement('div'); content.className = 'briefing-content';
  const pages = {}, tabs = {};
  const select = key => { for(const id of Object.keys(pages)){pages[id].hidden=id!==key;tabs[id].setAttribute('aria-pressed',String(id===key));} content.scrollTop=0; };
  for(const key of ['report','fieldwork','relay']) {
    const tab = doc.createElement('button'); tab.type='button'; tab.textContent=text('alarm.'+key); tabs[key]=tab;
    const page = doc.createElement('div'); page.className='briefing-page'; page.id='briefing-'+key; pages[key]=page;
    tab.setAttribute('aria-controls',page.id); tab.addEventListener('click',()=>select(key)); nav.append(tab); content.append(page);
  }
  const footer = doc.createElement('footer'), actions = doc.createElement('div'), alarm = doc.createElement('button'), boat = doc.createElement('button');
  actions.className='briefing-actions'; alarm.className='briefing-alarm'; boat.className='briefing-extraction';
  alarm.type = boat.type = 'button'; alarm.textContent = text('wavePreview.alarm'); boat.textContent = text('wavePreview.callBoat'); boat.hidden = true;
  const consequence=doc.createElement('p'); consequence.className='briefing-consequence'; consequence.textContent=text('alarm.consequence');
  const prep = doc.createElement('details'), prepHeading = doc.createElement('summary'), prepRows = doc.createElement('ul');
  prep.className = 'briefing-prep'; prepRows.className = 'prep-goals'; prep.hidden = true; prep.append(prepHeading,prepRows);
  actions.append(alarm,boat); footer.append(consequence,actions); dialog.append(header,status,nav,content,prep,footer); doc.body.append(dialog);
  select('report');
  let returnFocus = null, currentData = null;
  const line = (parent, tag, value, cls) => { const el=doc.createElement(tag); el.textContent=value; if(cls)el.className=cls; parent.append(el); return el; };
  function render(data) {
    currentData = data;
    const view = buildBriefing(data); subtitle.textContent = view.title;
    for(const page of Object.values(pages))page.replaceChildren();
    const reportPage=pages.report, fieldPage=pages.fieldwork, relayPage=pages.relay;
    const state=data.disabled?'locked':data.alarmActive?'active':data.phase!=='prep'?'inProgress':data.canSoundAlarm===false?'remote':'ready';
    status.textContent=text('alarm.'+state); status.dataset.state=state;
    if(data.relayStory?.line) {
      const relay=doc.createElement('section');relay.className='briefing-relay';relayPage.append(relay);
      line(relay,'h3',text('story.relay.title'));
      const dispatches = data.relayStory.lines?.length ? data.relayStory.lines : [{ line: data.relayStory.line }];
      for (const dispatch of dispatches) line(relay,'p',dispatch.line,'relay-story-line');
      renderQuestPanel(relay,data,{doc,send});
    }
    const scouting = view.available ? buildScoutingReport(data) : null;
    if(scouting) {
      const report=doc.createElement('section');report.className='briefing-scouting';reportPage.append(report);
      line(report,'h3',scouting.title);
      if(scouting.rest)line(report,'p',scouting.rest,'briefing-rest');
      line(report,'p',scouting.caves);line(report,'p',scouting.pushes,'briefing-pushes');
      line(report,'p',scouting.trick,'briefing-trick');line(report,'p',scouting.legend,'briefing-muted');
      if(scouting.counters.length) {
        line(report,'h4',text('scouting.counters'));
        for(const counter of scouting.counters)line(report,'p',`${counter.name} · ${counter.line}`,'briefing-counter');
      }
    }
    const radio = buildRadioCallView(data.radioCall);
    if (radio) {
      const section=doc.createElement('section');section.className='briefing-radio';relayPage.append(section);
      line(section,'h3',radio.title);
      const status=line(section,'p',radio.note,'radio-call-status');status.setAttribute('role','status');
      const cards=doc.createElement('div');cards.className='radio-call-cards';section.append(cards);
      for(const card of radio.cards) {
        const button=doc.createElement('button');button.type='button';button.className='radio-call-card';button.dataset.card=card.id;
        button.disabled=!card.enabled || data.disabled === true || data.canSoundAlarm === false;line(button,'strong',card.name);line(button,'span',card.description);
        button.addEventListener('click',()=>send('radio-call-request',{card:card.id,day:data.day,runId:data.runId}));
        cards.append(button);
      }
    }
    if(data.restocks?.length) {
      const caches=doc.createElement('section');caches.className='briefing-restocks';fieldPage.append(caches);
      line(caches,'h3',text('cache.title'));
      for(const row of data.restocks)line(caches,'p',text('cache.row',{
        site:row.name,reward:row.collected?text('cache.collected'):row.reward}));
      if(data.restocks.some(row=>!row.collected))line(caches,'p',text('cache.mapLegend'),'briefing-muted');
    }
    const bounties = buildBountyBoard(data);
    if(bounties) {
      const board=doc.createElement('section');board.className='briefing-bounties';fieldPage.append(board);
      line(board,'h3',bounties.title);
      if(!bounties.rows.length)line(board,'p',bounties.empty,'briefing-muted');
      for(const row of bounties.rows) {
        const post=doc.createElement('article');post.className='bounty-post';post.dataset.state=row.state;post.dataset.bounty=row.id;board.append(post);
        line(post,'h4',row.name);line(post,'p',row.guards);line(post,'p',row.reward,'bounty-reward');
        if(row.survivor)line(post,'p',row.survivor,'briefing-warning');
        if(row.deadline)line(post,'p',row.deadline,'briefing-muted');
      }
      if(bounties.rows.length)line(board,'p',bounties.note,'briefing-muted');
      if(bounties.rows.some(row=>row.state==='open'))line(board,'p',bounties.legend,'briefing-muted');
    }
    for (const warning of view.warnings) line(reportPage,'p',warning,'briefing-warning');
    for (const source of view.sources) {
      const group=doc.createElement('section'); reportPage.append(group); group.className='briefing-source'; line(group,'h3',source.heading);
      if(data.intelOwned)line(group,'p',source.bearing,'briefing-muted');
      for(const label of source.lines)line(group,'p',label);
      if(source.total)line(group,'p',source.total,'briefing-muted');
    }
    if(view.note)line(reportPage,'p',view.note,'briefing-muted');
    if(view.total)line(reportPage,'p',view.total,'briefing-total');
    if(view.earnings)line(reportPage,'p',view.earnings,'briefing-earnings');
    if(data.phase!=='prep')line(reportPage,'p',text('wavePreview.inProgress'),'briefing-warning');
    if(data.disabled)line(reportPage,'p',text('hq.disabled'),'briefing-warning');
    if(data.canSoundAlarm === false)line(reportPage,'p',text('wavePreview.atHQ'),'briefing-muted');
    alarm.disabled = data.phase !== 'prep' || data.alarmActive || data.disabled || data.canSoundAlarm === false;
    const boatView=boatCallView(data);
    boat.hidden=!boatView.offered;boat.disabled=!boatView.enabled;
    if(boatView.relayDown)line(reportPage,'p',text('wavePreview.relayDown'),'briefing-warning');
    if(!fieldPage.childElementCount)line(fieldPage,'p',text('alarm.fieldworkEmpty'),'briefing-empty');
    if(!relayPage.childElementCount)line(relayPage,'p',text(data.relayReady?'alarm.relayQuiet':'alarm.relaySilent'),'briefing-empty');
    // Missing optional intelligence must never prevent a valid wave start.
  }
  function shut() {
    if(!dialog.open)return;
    dialog.close(); currentData=null; doc.body.classList.remove('briefing');
    if(returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  }
  alarm.addEventListener('click',()=>send('alarm-request'));
  boat.addEventListener('click',()=>{if(currentData)send('extraction-request',{runId:currentData.runId,day:currentData.day});});
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
      const cardHadFocus = dialog.open && doc.activeElement?.classList.contains('radio-call-card');
      if(!dialog.open)select('report');
      render(data);
      if(cardHadFocus)close.focus();
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
