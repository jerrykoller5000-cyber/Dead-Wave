// GP-13 presentation only. Combat owns eligibility, playback and restoration.
import {text} from './strings.js';

export function mountDeathReplays({panel,again,list,canReplay,begin,isPlaying,doc=panel.ownerDocument}) {
  const card=again.parentElement,watch=doc.createElement('button'),status=doc.createElement('p');
  watch.type='button';watch.id='watchAgain';watch.textContent=text('replay.watchAgain');watch.hidden=true;
  status.className='replay-status';status.setAttribute('role','status');status.hidden=true;
  card.insertBefore(watch,again);card.insertBefore(status,again);
  let cause=null,victory=false,returnFocus=null,busy=false,oldInert=false,oldAgainDisabled=false;
  function message(key){status.textContent=key?text(key):'';status.hidden=!key;}
  function start(id,source) {
    if(busy||!canReplay(id)){message('replay.unavailable');return;}
    returnFocus=source;message(null);
    const result=begin(id);
    if(!result?.ok){message(result?.reason==='busy'?'replay.busy':'replay.unavailable');returnFocus=null;}
  }
  watch.addEventListener('click',()=>{const row=list().find(r=>r.causeKey===cause);if(row)start(row.id,watch);});
  function update(next) {
    if(next){cause=next.cause;victory=next.victory===true;message(null);}
    const rows=list(),current=rows.find(r=>r.causeKey===cause);
    watch.hidden=!!victory||!current?.unlocked||!canReplay(current.id)||busy;
    watch.disabled=busy;
    if(current)watch.setAttribute('aria-label',text('replay.watchNamed',{name:text(current.labelKey)}));
    for(const tile of panel.querySelectorAll('[data-death-cause]')) {
      const row=rows.find(r=>r.causeKey===tile.dataset.deathCause);
      if(!row)continue;
      if(!row.unlocked){tile.title=text('replay.locked');continue;}
      let button=tile;
      if(tile.tagName!=='BUTTON') {
        button=doc.createElement('button');button.type='button';button.className=tile.className+' replay-tile';
        button.dataset.deathCause=tile.dataset.deathCause;button.dataset.replay=row.id;
        const name=doc.createElement('span');name.textContent=tile.textContent;
        const verb=doc.createElement('span');verb.className='replay-verb';verb.textContent=text('replay.watch');
        button.append(name,verb);button.addEventListener('click',()=>start(row.id,button));tile.replaceWith(button);
      }
      button.title=text(row.descriptionKey);button.setAttribute('aria-label',text('replay.watchNamed',{name:text(row.labelKey)}));
      button.disabled=busy||victory||!canReplay(row.id);
    }
  }
  function onEvent({detail:d}) {
    if(d?.type!=='scripted-death-replay')return;
    if(d.phase==='start') {
      if(!busy){oldInert=panel.inert;oldAgainDisabled=again.disabled;}
      busy=true;panel.inert=true;panel.classList.add('replay-active');again.disabled=true;update();
    } else if(d.phase==='end'||d.phase==='abort') {
      busy=false;panel.inert=oldInert;panel.classList.remove('replay-active');again.disabled=oldAgainDisabled;update();
      if(panel.classList.contains('show')&&returnFocus?.isConnected&&!returnFocus.hidden&&!returnFocus.disabled)returnFocus.focus({preventScroll:true});
      returnFocus=null;
    }
  }
  // Native buttons retain Enter/Space activation without feeding the game controls.
  const guard=e=>{if(e.target.closest('#watchAgain, .replay-tile'))e.stopPropagation();};
  for(const type of ['keydown','keyup','pointerdown','pointerup','mousedown','mouseup','click'])panel.addEventListener(type,guard);
  window.addEventListener('dw-game',onEvent);
  if(isPlaying())onEvent({detail:{type:'scripted-death-replay',phase:'start'}});
  return {update,destroy(){window.removeEventListener('dw-game',onEvent);for(const type of ['keydown','keyup','pointerdown','pointerup','mousedown','mouseup','click'])panel.removeEventListener(type,guard);watch.remove();status.remove();}};
}
