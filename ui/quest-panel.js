import { text } from './strings.js';
import { drawGlyph } from '../world/runes.js';
// Receives only the public quest view, never its unlearned word.
export function renderQuestPanel(parent, data, {doc, send}) {
  const q=data.quest;if(!q?.unlocked)return;
  const section=doc.createElement('section');section.className='quest-panel';parent.append(section);
  const line=(value,cls)=>{const p=doc.createElement('p');p.textContent=value;if(cls)p.className=cls;section.append(p);return p;};
  const glyph=(host,k)=>{const cv=doc.createElement('canvas');cv.width=cv.height=48;cv.setAttribute('aria-hidden','true');drawGlyph(cv.getContext('2d'),k,24,24,32);host.append(cv);};
  const marks=doc.createElement('div');marks.className='quest-marks';
  (q.known||[null,null,null,null,null]).forEach((k,i)=>{const span=doc.createElement('span');span.className='quest-mark';span.setAttribute('role','img');span.setAttribute('aria-label',text(k===null?'quest.empty':'quest.slot',{place:i+1,glyph:k===null?'':text('quest.glyph.'+k)}));if(k!==null)glyph(span,k);else span.textContent='—';marks.append(span);});section.append(marks);
  if(q.done){line(text('quest.done'));return;}
  if(q.silenced)line(text('quest.silenced'),'quest-success');
  if(data.day>=20){line(text('quest.extraction'));return;}
  const tried=q.triedDay===data.day;
  const locked=tried||data.phase!=='prep'||data.alarmActive||data.disabled||data.canSoundAlarm===false;
  const details=doc.createElement('details'),summary=doc.createElement('summary');summary.textContent=text('quest.tune');details.append(summary);details.open=tried;section.append(details);
  const hint=doc.createElement('p');hint.textContent=text('quest.hint');details.append(hint);
  const slots=doc.createElement('div');slots.className='quest-marks quest-entry'+(tried&&!q.silenced?' quest-entry-failed':'');details.append(slots);
  const ring=doc.createElement('div');ring.className='quest-ring';details.append(ring);
  const north=doc.createElement('span');north.className='quest-north';north.textContent=text('quest.north');ring.append(north);
  let selected=[];const buttons=[];
  const actions=doc.createElement('div');actions.className='quest-actions';const clear=doc.createElement('button'),submit=doc.createElement('button');clear.type=submit.type='button';clear.textContent=text('quest.clear');submit.textContent=text('quest.send');actions.append(clear,submit);details.append(actions);
  const repaint=()=>{
    slots.replaceChildren();for(let i=0;i<5;i++){const s=doc.createElement('span');s.className='quest-mark';s.setAttribute('role','img');s.setAttribute('aria-label',text(selected[i]===undefined?'quest.empty':'quest.slot',{place:i+1,glyph:selected[i]===undefined?'':text('quest.glyph.'+selected[i])}));if(selected[i]!==undefined)glyph(s,selected[i]);else s.textContent='—';slots.append(s);}
    for(let k=0;k<8;k++)buttons[k].disabled=locked||selected.length===5||selected.includes(k);
    clear.disabled=locked||!selected.length;submit.disabled=locked||selected.length!==5;
  };
  for(let k=0;k<8;k++){
    const b=doc.createElement('button');b.type='button';b.className='quest-glyph';b.dataset.glyph=String(k);b.setAttribute('aria-label',text('quest.glyph.'+k));b.title=text('quest.glyph.'+k);
    b.style.left=(50+37*Math.cos(k*Math.PI/4))+'%';b.style.top=(50-37*Math.sin(k*Math.PI/4))+'%';glyph(b,k);
    b.addEventListener('click',()=>{if(b.disabled)return;selected.push(k);repaint();if(selected.length===5)submit.focus();});buttons.push(b);ring.append(b);
  }
  clear.addEventListener('click',()=>{selected=[];repaint();buttons[0].focus();});
  submit.addEventListener('click',()=>{if(!submit.disabled){submit.disabled=true;send('quest-submit-request',{runId:data.runId,day:data.day,glyphs:[...selected]});}});
  if(tried){const p=doc.createElement('p');p.setAttribute('role','status');p.className=q.silenced?'quest-success':'quest-failed';p.textContent=text(q.silenced?'quest.right':'quest.wrong');details.append(p);}
  repaint();
}
