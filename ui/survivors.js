import { text } from './strings.js';

export const SURVIVOR_IDS = Object.freeze(['okafor', 'brandt', 'pike']);
const camp = Object.freeze({okafor:'trapper', brandt:'ranger', pike:'hikers'});
export function aboardSurvivors(rows) {
  const have = new Set((Array.isArray(rows) ? rows : []).filter(p => p && SURVIVOR_IDS.includes(p.who)).map(p => p.who));
  return SURVIVOR_IDS.filter(who => have.has(who));
}
export function survivorDialogue(event, state) {
  if (!state?.active || event?.runId !== state.runId || event?.day !== state.day ||
      !SURVIVOR_IDS.includes(event?.who) || (event.style != null && event.style !== camp[event.who])) return null;
  const moment = event.type === 'survivor-talk' ? 'roof' : event.type === 'survivor-rescued' ? 'found' : null;
  if (!moment) return null;
  return {who:event.who, title:text(`story.survivor.${event.who}.name`), line:text(`story.survivor.${event.who}.${moment}`)};
}

// Nonmodal: the marine keeps moving/fighting while reading. No pause or focus capture.
export function mountSurvivorTalk({doc=document, host=window, getState, beforeShow=()=>{}, schedule=setTimeout, cancel=clearTimeout}) {
  const card=doc.createElement('aside'); card.id='survivorTalkCard'; card.className='prop-note-card survivor-talk-card';
  card.hidden=true; card.setAttribute('role','status'); card.setAttribute('aria-live','polite');
  const title=doc.createElement('strong'), line=doc.createElement('p'), close=doc.createElement('button');
  close.type='button'; close.textContent=text('survivor.close');
  card.append(title,line,close); doc.body.append(card);
  let timer=null;
  const hide=()=>{if(timer!==null)cancel(timer);timer=null;card.hidden=true;};
  close.addEventListener('click',hide);
  const receive=({detail})=>{
    if(detail?.type==='run-reset'){hide();return;}
    const state=getState();
    if(!state?.active){hide();return;}
    if(detail?.type==='player-damaged' && detail.runId===state.runId){hide();return;}
    const note=survivorDialogue(detail,state);if(!note)return;
    hide();beforeShow();title.textContent=note.title;line.textContent=note.line;
    card.dataset.who=note.who;card.hidden=false;timer=schedule(hide,12000);
  };
  host.addEventListener('dw-game',receive);
  host.DW_TALK_CARD=true;
  return {hide,destroy(){hide();host.removeEventListener('dw-game',receive);close.removeEventListener('click',hide);card.remove();host.DW_TALK_CARD=false;}};
}
