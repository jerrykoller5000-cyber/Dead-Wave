// CL-115 (Jerry, 2026-10-02): the Training Ground's HQ panel. In the main game the panel starts the night; here it
// calls zombies into the build room through the gate, as many of one kind as he asks for, and clears them again.
// Also the little strip at the top of the screen that says where he is. The words are ChatGPT's to word
// (hasText keys with English fallbacks until then).
import { text, hasText } from './strings.js';
import {
  createTrainingWaveSaves, isDefaultTrainingOptions, normalizeTrainingOptions, normalizeTrainingWave,
  trainingPresetSample, TRAINING_WAVE_LIMIT
} from './training-wave.js';
import { prepareTrainingReplay } from './training-exercise.js';
import { trainingRecordKey } from './training-results.js';

const say = (key, params, fallback) => {
  if (!hasText(key)) return String(fallback).replace(/\{(\w+)\}/g, (_, k) => (params && params[k] != null ? params[k] : ''));
  try { return text(key, params || {}); } catch (_) { return fallback; }
};

export function mountTrainingPanel({
  doc = document, types = [], onSpawn = () => 0, onWave = () => 0,
  onExercise = () => 0, exercise = () => null, readReplay = () => null,
  readResults = () => ({}), readBest = () => null,
  onClear = () => 0, onClose = () => {}, alive = () => 0, pending = () => null,
  onLayout = null, onClearLayout = null, laidOut = () => 0, nights = [], storage
} = {}) {
  const catalogue = new Map(types.filter(type => type.key !== 'caveguard').map(type => [type.key,type]));
  const labels = new Map([...catalogue].map(([key,type]) => [key,say('enemy.'+key+'.name',{},type.name)]));
  const allowed = new Set(labels.keys());
  const defaultKind = allowed.has('shambler') ? 'shambler' : labels.keys().next().value;
  const saves = createTrainingWaveSaves({storage, allowedKinds:allowed});
  let wave = normalizeTrainingWave(defaultKind ? [{kind:defaultKind,count:3}] : [],allowed);
  let settings = normalizeTrainingOptions();
  let replay = null;
  let preset = null;
  let shownClear = 0;
  let tab = 'wave';
  let open = false;
  let replace = null;
  let notice = '';
  function element(tag, className, textValue) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (textValue != null) node.textContent = textValue;
    return node;
  }
  function button(className, label, action) {
    const node = element('button',className,label);
    node.type = 'button';
    node.addEventListener('click',action);
    return node;
  }
  function setWave(rows, savedSettings, selectedPreset = null) {
    const next = normalizeTrainingWave(rows,allowed);
    if (!next) return false;
    wave = next;
    replay = null;
    preset = selectedPreset;
    if (preset) kind.value = next.rows[0]?.kind || defaultKind;
    if (savedSettings !== undefined) settings = normalizeTrainingOptions(savedSettings);
    replace = null;
    notice = '';
    render();
    return true;
  }
  const root = element('section'); root.id = 'trainingPanel'; root.hidden = true;
  root.setAttribute('role','dialog');
  root.setAttribute('aria-modal','true');
  root.setAttribute('aria-labelledby','trainingPanelTitle');
  const card = element('div','tp-card tp-wave-card');
  const head = element('header','tp-head');
  const title = element('h2',null,text('training.panelTitle')); title.id='trainingPanelTitle';
  head.append(element('p','tp-eyebrow',text('training.panelEyebrow')),title);
  const tabs = element('div','tp-wave-tabs');
  tabs.setAttribute('role','tablist');
  tabs.setAttribute('aria-label',text('training.exerciseTabs'));
  const waveTab = button('tp-wave-chip',text('training.waveTab'),()=>showTab('wave'));
  const optionsTab = button('tp-wave-chip',text('training.optionsTab'),()=>showTab('options'));
  const resultsTab = button('tp-wave-chip',text('training.resultsTab'),()=>showTab('results'));
  const body = element('div','tp-wave-body');
  const optionsBody = element('div','tp-wave-body tp-option-body');
  const resultsBody = element('div','tp-wave-body tp-results-body');
  const panes = { wave: [waveTab,body], options: [optionsTab,optionsBody], results: [resultsTab,resultsBody] };
  for (const [key,[control,pane]] of Object.entries(panes)) {
    control.id='trainingTab-'+key;
    control.setAttribute('role','tab');
    control.setAttribute('aria-controls','trainingPane-'+key);
    pane.id='trainingPane-'+key;
    pane.setAttribute('role','tabpanel');
    pane.setAttribute('aria-labelledby',control.id);
    tabs.append(control);
  }
  const keys = Object.keys(panes);
  function showTab(key, focus = false) {
    tab=key;
    for (const [id,[control,pane]] of Object.entries(panes)) {
      const selected=id===key;
      pane.hidden=!selected;
      control.tabIndex=selected?0:-1;
      control.setAttribute('aria-selected',String(selected));
    }
    if (key==='results') renderResults();
    if (focus) panes[key][0].focus({preventScroll:true});
  }
  tabs.addEventListener('keydown',event=>{
    const index=keys.indexOf(tab);
    const key=event.key==='Home'?keys[0]:event.key==='End'?keys.at(-1):
      event.key==='ArrowLeft'?keys[(index+keys.length-1)%keys.length]:
      event.key==='ArrowRight'?keys[(index+1)%keys.length]:null;
    if (!key) return;
    event.preventDefault();
    showTab(key,true);
  });
  const left = element('div','tp-wave-left');
  const right = element('div','tp-wave-right');
  const rosterCard = element('section','tp-wave-box tp-wave-roster-box');
  const roster = element('ul','tp-wave-roster');
  roster.setAttribute('aria-label',text('training.waveRoster'));
  const kind = element('select');
  for (const [key,label] of labels) {
    const option = element('option',null,label);
    option.value = key;
    option.dataset.kind = key;
    kind.append(option);
  }
  const count = element('select');
  for (let n=1;n<=TRAINING_WAVE_LIMIT;n++) {
    const option = element('option',null,String(n));
    option.value = String(n);
    option.dataset.count = String(n);
    count.append(option);
  }
  const updateAdd = () => add.disabled = !kind.value || (wave?.total ?? 0)+Number(count.value)>TRAINING_WAVE_LIMIT;
  const add = button('tp-wave-chip',text('training.waveAdd'),() => {
    const rows = wave.rows;
    const n = Number(count.value);
    const row = rows.find(entry => entry.kind === kind.value);
    setWave(row ? rows.map(entry => entry===row ? {...entry,count:entry.count+n} : entry) : [...rows,{kind:kind.value,count:n}]);
  });
  count.addEventListener('change',updateAdd);
  kind.addEventListener('change',renderKind);
  const field = (key,input) => {
    const label = element('label','tp-wave-field');
    label.append(element('span',null,text(key)),input);
    return label;
  };
  const addRow = element('div','tp-wave-add');
  addRow.append(field('training.kind',kind),field('training.count',count),add);
  rosterCard.append(element('h3',null,text('training.waveRoster')),addRow,roster);

  const presetCard = element('section','tp-wave-box tp-wave-presets-box');
  const presetRow = element('div','tp-wave-preset');
  const presets = [
    ['training.waveNight1',trainingPresetSample(nights[1],8,allowed)],
    ['training.waveNight3',trainingPresetSample(nights[3],10,allowed)],
    ['training.waveHeavy',normalizeTrainingWave([{kind:'brute',count:4},{kind:'colossus',count:2},{kind:'bomber',count:2}],allowed)]
  ];
  for (const [key,stock] of presets) {
    const control = button('tp-wave-chip',text(key),()=>setWave(stock.rows,undefined,key));
    control.disabled = !stock;
    presetRow.append(control);
  }
  const replayNote = element('p','tp-wave-save-note');
  replayNote.setAttribute('aria-live','polite');
  const replayControl = button('tp-wave-chip',text('training.replayLastNight'),()=>{
    const next=prepareTrainingReplay(readReplay(),allowed);
    if (!next?.batchCount) return;
    wave=normalizeTrainingWave(next.firstBatch,allowed);
    replay=next;
    preset='replay';
    kind.value=wave.rows[0]?.kind || defaultKind;
    replace=null;
    notice='';
    render();
  });
  presetRow.append(replayControl);
  presetCard.append(element('h3',null,text('training.wavePresets')),presetRow,replayNote);
  const lastLink = button('tp-wave-chip tp-last-clear-link','',()=>showTab('results',true));
  left.append(rosterCard,presetCard,lastLink);

  const kindCard = element('section','tp-wave-box tp-kind-card');
  const kindName = element('h3');
  kindName.id = 'trainingKindTitle';
  kindCard.setAttribute('aria-labelledby',kindName.id);
  const kindDetail = element('div','tp-kind-detail');
  const kindImage = element('img','tp-kind-portrait');
  kindImage.alt = '';
  kindImage.width = 100;
  kindImage.height = 100;
  kindImage.decoding = 'async';
  const kindText = element('div','tp-kind-text');
  const kindBehavior = element('p','tp-wave-save-note');
  const kindFacts = element('dl','tp-kind-facts');
  function metric(container,label,value) {
    const box = element('div');
    box.append(element('dt',null,text(label)),element('dd',null,value));
    container.append(box);
  }
  const noValue = text('training.resultUnavailable');
  function renderKind() {
    const key = kind.value;
    const stats = catalogue.get(key);
    kindCard.hidden = !stats;
    if (!stats) return;
    const title = labels.get(key);
    kindName.textContent = title;
    kindBehavior.textContent = text('training.kind.'+key+'.behavior');
    const url = new URL('../assets/ui/training-portraits/'+key+'.webp',import.meta.url).href;
    if (kindImage.getAttribute('src') !== url) kindImage.src = url;
    kindFacts.replaceChildren();
    metric(kindFacts,'training.kindHealth',Number.isFinite(stats.hp)?String(stats.hp):noValue);
    metric(kindFacts,'training.kindPace',Number.isFinite(stats.speed)
      ?text('training.kindPaceValue',{value:Number(stats.speed.toFixed(2))}):noValue);
    metric(kindFacts,'training.kindDamage',Number.isFinite(stats.damage)?String(stats.damage):noValue);
    metric(kindFacts,'training.kindWeakSpot',text('training.kind.'+key+'.weak'));
  }
  kindText.append(kindBehavior,kindFacts);
  kindDetail.append(kindImage,kindText);
  kindCard.append(kindName,kindDetail);
  right.append(kindCard);

  const saveCard = element('section','tp-wave-box tp-wave-saves-box');
  const saveList = element('div','tp-wave-saves');
  const saveNotice = element('p','tp-wave-save-note');
  saveNotice.setAttribute('aria-live','polite');
  const confirmRow = element('div','tp-wave-preset');
  const saveConfirm = button('tp-wave-chip',text('training.waveReplace'),()=>{
    if (replace != null) saveSlot(replace,true);
  });
  const saveCancel = button('tp-wave-chip',text('training.waveKeep'),()=>{
    replace = null; notice = ''; renderSaves();
  });
  confirmRow.append(saveConfirm,saveCancel);
  saveCard.append(element('h3',null,text('training.waveSaved')),saveList,saveNotice,confirmRow);
  right.append(saveCard);
  body.append(left,right);
  function optionSection(id, key) {
    const section=element('section','tp-wave-box tp-option-group');
    const heading=element('h3',null,text(key));
    heading.id=id;
    section.setAttribute('aria-labelledby',id);
    section.append(heading);
    return section;
  }
  const releaseBox=optionSection('trainingReleaseTitle','training.releaseHeading');
  const practiceBox=optionSection('trainingPracticeTitle','training.practiceHeading');
  const optionFields = new Map();
  function appendOption(box,key,labelKey,values) {
    const select=element('select');
    for (const [value,label] of values) {
      const choice=element('option',null,label);
      choice.value=String(value);
      select.append(choice);
    }
    select.dataset.trainingOption=key;
    select.addEventListener('change',()=>{
      settings=normalizeTrainingOptions({...settings,[key]:values[select.selectedIndex]?.[0]});
      renderOptions();
    });
    const row=field(labelKey,select);
    optionFields.set(key,{select,row});
    box.append(row);
  }
  const labelsFor = pairs => pairs.map(([value,key])=>[value,text(key)]);
  const seconds = values => values.map(value=>[value,text('training.exerciseSeconds',{seconds:value})]);
  appendOption(releaseBox,'release','training.releaseMode',labelsFor([
    ['all','training.releaseAll'],['trickle','training.releaseTrickle'],['endless','training.releaseEndless']
  ]));
  appendOption(releaseBox,'interval','training.releaseInterval',seconds([1,2,3]));
  appendOption(releaseBox,'countdown','training.releaseCountdown',seconds([3,5,10]));
  appendOption(practiceBox,'speed','training.practiceSpeed',labelsFor([
    [.75,'training.speedSlow'],[1,'training.speedNormal'],[1.25,'training.speedFast']
  ]));
  appendOption(practiceBox,'toughness','training.practiceHealth',[[.5,'50%'],[1,'100%'],[2,'200%']]);
  const dummyField=element('div','tp-wave-field');
  const dummyTitle=element('span',null,text('training.practiceDummy'));
  dummyTitle.id='trainingDummyLabel';
  const dummyButtons=element('div','tp-wave-preset tp-dummy-buttons');
  dummyButtons.setAttribute('role','group');
  dummyButtons.setAttribute('aria-labelledby',dummyTitle.id);
  const dummyHint=element('p','tp-wave-save-note',text('training.practiceDummyHint'));
  dummyHint.id='trainingDummyHint';
  const dummyChoices=[false,true].map(on=>{
    const control=button('tp-wave-chip',text(on?'training.practiceOn':'training.practiceOff'),()=>{
      settings=normalizeTrainingOptions({...settings,dummy:on});
      renderOptions();
    });
    control.dataset.trainingDummy=String(on);
    dummyButtons.append(control);
    return control;
  });
  dummyButtons.setAttribute('aria-describedby',dummyHint.id);
  dummyField.append(dummyTitle,dummyButtons,dummyHint);
  practiceBox.append(dummyField);
  appendOption(practiceBox,'lights','training.practiceLights',labelsFor([
    ['keep','training.lightsKeep'],['on','training.practiceOn'],['off','training.practiceOff'],['alarm','training.lightsAlarm']
  ]));
  optionsBody.append(releaseBox,practiceBox);

  const resultBox = optionSection('trainingResultsTitle','training.lastClearHeading');
  const resultStatus = element('p','tp-wave-save-note');
  const resultFacts = element('dl','tp-result-facts');
  const previousAttempt = element('p','tp-wave-save-note');
  resultBox.append(resultStatus,resultFacts,previousAttempt);
  resultsBody.append(resultBox);
  const elapsed = seconds => {
    const tenths=Math.max(0,Math.round(seconds*10));
    return text('training.resultTime',{min:Math.floor(tenths/600),sec:String(Math.floor(tenths/10)%60).padStart(2,'0'),tenth:tenths%10});
  };
  const rate = ratio => ratio == null ? noValue : text('training.resultPercent',{value:Math.round(ratio*100)});
  const statusKeys = {cancelled:'training.resultCancelled',failed:'training.resultFailed',incomplete:'training.resultIncomplete'};
  function renderResults() {
    const {lastClear,lastAttempt} = readResults();
    lastLink.hidden = !lastClear;
    lastLink.textContent = lastClear
      ?text('training.resultLastLink',{time:elapsed(lastClear.seconds),kills:lastClear.kills}):'';
    resultFacts.replaceChildren();
    resultStatus.textContent = lastClear ? (lastClear.newBest?text('training.resultRecord'):'') : text('training.resultEmpty');
    resultStatus.hidden = !resultStatus.textContent;
    if (lastClear) {
      metric(resultFacts,'training.resultClearTime',elapsed(lastClear.seconds));
      metric(resultFacts,'training.resultKills',String(lastClear.kills));
      metric(resultFacts,'training.resultHeadshots',rate(lastClear.headshotRate));
      metric(resultFacts,'training.resultAccuracy',rate(lastClear.accuracy));
      metric(resultFacts,'training.resultHealthLost',String(Math.round(lastClear.healthLost)));
      if (lastClear.best != null) metric(resultFacts,'training.resultBest',elapsed(lastClear.best));
    }
    const selection = trainingRecordKey(preset,wave.rows,settings,replay);
    const selectionBest = readBest(selection);
    if (selectionBest != null && selection !== lastClear?.recordKey)
      metric(resultFacts,'training.resultSelectedBest',elapsed(selectionBest));
    const reason = lastAttempt && statusKeys[lastAttempt.status];
    const waves = lastAttempt?.endless ? text('training.resultEndless',{count:lastAttempt.waves}) : '';
    previousAttempt.textContent = [reason?text(reason):'',waves].filter(Boolean).join(' · ');
    previousAttempt.hidden = !previousAttempt.textContent;
  }

  function renderOptions() {
    for (const [key,{select}] of optionFields) select.value=String(settings[key]);
    const interval=optionFields.get('interval');
    interval.row.hidden=settings.release!=='trickle'||!!replay;
    interval.select.disabled=interval.row.hidden;
    optionFields.get('release').select.disabled=!!replay;
    for (const control of dummyChoices) control.setAttribute('aria-pressed',String(control.dataset.trainingDummy===String(settings.dummy)));
    dummyHint.hidden=!settings.dummy;
  }

  const status = element('p','tp-status');
  status.setAttribute('aria-live','polite');
  const actions = element('footer','tp-actions');
  const bar = element('div','tp-wave-bar');
  const tools = element('div','tp-wave-preset');
  const main = element('div','tp-wave-preset');
  const total = element('output','tp-wave-total');
  total.setAttribute('aria-live','polite');
  const clear = button('tp-clear',text('training.clear'),()=>{ onClear(); render(); });
  const layout = onLayout && button('tp-layout',text('training.layout'),()=>{ onLayout(); render(); });
  const clearLayout = onClearLayout && button('tp-clear tp-clear-layout',text('training.layoutClear'),()=>{ onClearLayout(); render(); });
  const send = button('tp-spawn','',()=> {
    if (!wave?.total || pending() || exercise() || alive()>0) return;
    let accepted;
    if (replay) accepted=onExercise([wave.rows],settings,{replay,preset});
    else if (!isDefaultTrainingOptions(settings)) accepted=onExercise([wave.rows],settings,{preset});
    else accepted=wave.rows.length===1
      ? onSpawn(wave.rows[0].kind,wave.rows[0].count,{preset})
      : onWave(wave.rows,{preset});
    if (accepted) hide(); else render();
  });
  const close = button('tp-close',text('training.close'),hide);
  close.setAttribute('aria-keyshortcuts','E Escape');
  for (const key of ['E','Esc']) close.append(element('kbd',null,key));
  tools.append(total,clear,...(layout?[layout]:[]),...(clearLayout?[clearLayout]:[]));
  main.append(send,close);
  bar.append(tools,main);
  actions.append(bar,element('p','tp-wave-save-note',text('training.waveLocks')));
  card.append(head,tabs,body,optionsBody,resultsBody,status,actions);
  root.append(card);
  doc.body.append(root);

  function saveSlot(index,confirmed) {
    const label=text('training.waveSlot',{number:index+1});
    const success = saves.save(index,{label,rows:wave.rows,settings},{replace:confirmed});
    replace = null;
    notice = text(success ? 'training.waveStored' : 'training.waveStoreFailed');
    renderSaves();
    saveList.children[index].lastElementChild.focus({preventScroll:true});
  }
  function renderSaves() {
    const saved = saves.read();
    saveList.replaceChildren(...saved.map((slot,index)=>{
      const box=element('div','tp-wave-slot');
      const number=index+1;
      const load=button('tp-wave-chip',slot?.label || text('training.waveEmpty'),()=>{
        if(slot && setWave(slot.rows,slot.settings??null,'slot'+number)) saveList.children[index].firstElementChild.focus({preventScroll:true});
      });
      load.disabled=!slot;
      load.setAttribute('aria-label',slot ? text('training.waveLoad',{label:slot.label}) : text('training.waveEmptySlot',{number}));
      const save=button('tp-wave-chip',text('training.waveSaveHere'),()=>{
        if (slot) {
          replace=index;
          notice=text('training.waveAskReplace',{label:slot.label});
          renderSaves();
          saveConfirm.focus({preventScroll:true});
        } else saveSlot(index,false);
      });
      save.disabled=!wave.total||!!replay;
      save.setAttribute('aria-label',text('training.waveSaveTo',{number}));
      box.append(load,save);
      return box;
    }));
    confirmRow.hidden = replace == null;
    saveNotice.textContent = notice;
    saveNotice.hidden = !notice;
  }
  function render() {
    const focused=doc.activeElement?.dataset.waveFocus;
    const {rows,total:n}=wave;
    roster.replaceChildren(...rows.map((row,index) => {
      const li = element('li');
      const name = labels.get(row.kind);
      function step(sign,delta,key) {
        const control = button('tp-wave-chip',sign,()=>{
          setWave(rows.map((item,i)=>i===index ? {...item,count:item.count+delta} : item));
        });
        control.dataset.waveFocus=row.kind+delta;
        control.setAttribute('aria-label',text(key,{kind:name}));
        return control;
      }
      const minus=step('−',-1,'training.waveLess');
      const plus=step('+',1,'training.waveMore');
      minus.disabled=row.count===1;
      plus.disabled=n===TRAINING_WAVE_LIMIT;
      const remove=button('tp-wave-chip',text('training.waveRemove'),()=>{
        setWave(rows.filter((_,i)=>i!==index));
        kind.focus({preventScroll:true});
      });
      remove.setAttribute('aria-label',text('training.waveRemoveKind',{kind:name}));
      li.append(element('span',null,name),minus,element('output',null,String(row.count)),plus,remove);
      return li;
    }));
    if(focused) {
      const next=[...roster.querySelectorAll('[data-wave-focus]')].find(item=>item.dataset.waveFocus===focused && !item.disabled);
      (next || kind).focus({preventScroll:true});
    }
    const last=prepareTrainingReplay(readReplay(),allowed);
    replayControl.disabled=!last?.batchCount;
    const replaySummary = replay ? text('training.replayBatches',{count:replay.total,batches:replay.batchCount}) : '';
    const skipped=(replay||last)?.skipped??[];
    const unsupported=skipped.length?text('training.replaySkipped',{names:skipped.map(({kind,count})=>{
      const label=hasText('enemy.'+kind+'.name')?text('enemy.'+kind+'.name'):text('training.replayUnknown');
      return text('training.replaySkippedKind',{count,kind:label});
    }).join(', ')}):'';
    replayNote.textContent=[last ? replaySummary : text('training.replayEmpty'),unsupported].filter(Boolean).join(' · ');
    replayNote.hidden=!replayNote.textContent;
    total.textContent=replaySummary||text('training.waveTotal',{count:n,cap:TRAINING_WAVE_LIMIT});
    renderOptions();
    renderSaves();
    renderKind();
    renderResults();
    updateAdd();
    const queued=pending(), active=exercise(), countAlive=alive();
    send.textContent=n ? text('training.waveSend',{count:replay?.total??n}) : text('training.waveSendIdle');
    send.disabled=!n || !!queued || !!active || countAlive>0;
    send.title=countAlive ? text('training.finishGroup') : '';
    clear.textContent=text(queued || active ? 'training.cancelClear' : 'training.clear');
    if (layout) {
      const placed=laidOut();
      layout.textContent=text(placed ? 'training.layoutAgain' : 'training.layout');
      layout.title=text('training.layoutHint');
      if (clearLayout) clearLayout.hidden=placed<=0;
    }
    status.textContent=queued ? text('training.queued',{seconds:queued.seconds,count:queued.count})
      : countAlive ? text('training.alive',{count:countAlive})+' · '+text('training.finishGroup')
      : active ? text('training.exerciseWaiting') : text('training.none');
  }
  function show() {
    if (open) return;
    open=true; root.hidden=false;
    const {lastClear} = readResults();
    const newClear = lastClear && lastClear.id !== shownClear;
    if (newClear) shownClear = lastClear.id;
    showTab(newClear?'results':'wave');
    render();
    (newClear?resultsTab:kind).focus({preventScroll:true});
  }
  function hide() {
    if (!open) return;
    open=false; root.hidden=true;
    replace=null; notice='';
    onClose();
  }
  root.addEventListener('keydown',event=>{
    if (event.code==='Escape' || (event.code==='KeyE' && !event.repeat)) {
      event.preventDefault(); event.stopPropagation(); hide();
    } else if(event.key==='Tab') {
      const options=[...root.querySelectorAll('button:not(:disabled), select:not(:disabled)')].filter(node=>node.tabIndex>=0&&!node.closest('[hidden]'));
      const edge=event.shiftKey?options[0]:options.at(-1);
      if(doc.activeElement===edge) {
        event.preventDefault();
        (event.shiftKey?options.at(-1):options[0]).focus();
      }
    }
  });
  return {
    open:show,close:hide,isOpen:()=>open,render,element:root,
    pick(k,n) {
      const pickKind=allowed.has(k)?k:wave.rows[0]?.kind || defaultKind;
      const requested=Number.isFinite(n) ? Math.trunc(n) : (wave.rows[0]?.count || 3);
      if (pickKind) {
        kind.value = pickKind;
        setWave([{kind:pickKind,count:Math.max(1,Math.min(TRAINING_WAVE_LIMIT,requested))}]);
      }
    },
    dispose(){ root.remove(); }
  };
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
      if (plan.rows) {
        detail.textContent=text('training.waveIncoming',{count:plan.count});
        return;
      }
      const singular = say('enemy.' + plan.kind + '.name', {}, plan.kind);
      const kind = plan.count === 1 ? singular : say('enemy.' + plan.kind + '.plural', {}, singular);
      detail.textContent = text('training.countdownIncoming', { count: plan.count, kind });
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
