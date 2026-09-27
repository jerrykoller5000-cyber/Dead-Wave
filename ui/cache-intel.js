import { text } from './strings.js';
import { projectScoutCave } from './scouting.js';
const NAMES=Object.freeze({'objective:medical-convoy':'cache.medicalConvoy','objective:ranger-cache':'world.ranger',
  'objective:hikers-cache':'world.hikers','objective:trapper-cache':'world.trapper','objective:wreck-salvage':'world.wreck'});
const open=s=>['available','ready-to-claim'].includes(s.state);
export function restockRows(snapshot,day) {
  if(!Number.isSafeInteger(day)||day<2)return [];
  return (snapshot?.sites||[]).filter(s=>NAMES[s.id]&&s.restockDay===day&&s.state!=='unavailable').map(s=>{
    const reward=s.remaining||s.reward;let label='';
    try { label=text(reward.key,reward.params); } catch { return null; }
    return {id:s.id,day,name:text(NAMES[s.id]),reward:label,collected:s.state==='claimed',
      x:s.position?.x,z:s.position?.z};
  }).filter(Boolean);
}
export function createCacheIntel() {
  let runId=null,readDay=0;const known=new Set();
  return {
    receive(event) {
      if(event?.type==='run-reset'){runId=event.runId;readDay=0;known.clear();return;}
      if(event?.type!=='briefing-open'||runId===null||event.runId!==runId||!Number.isSafeInteger(event.day)||event.day<2)return;
      readDay=event.day;known.clear();
      for(const row of event.restocks||[])if(NAMES[row.id]&&row.day===readDay&&!row.collected)known.add(row.id);
    },
    markers({runId:currentRun,day,sites=[]}={}) {
      if(currentRun!==runId||day!==readDay)return [];
      return sites.filter(s=>known.has(s.id)&&s.restockDay===day&&open(s)&&Number.isFinite(s.position?.x)&&Number.isFinite(s.position?.z))
        .map(s=>({id:s.id,x:s.position.x,z:s.position.z}));
    }
  };
}
export const cacheIntel=createCacheIntel();
if(typeof window!=='undefined')window.addEventListener('dw-game',({detail})=>cacheIntel.receive(detail));
export function drawCacheMarks(ctx,markers,projection) {
  for(const marker of markers){
    const p=projectScoutCave(marker,projection);if(!p)continue;
    ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#101b16';ctx.strokeStyle='#a7d3ad';ctx.lineWidth=2;
    ctx.fillRect(-5,-5,10,10);ctx.strokeRect(-5,-5,10,10);
    ctx.beginPath();ctx.moveTo(-3,0);ctx.lineTo(3,0);ctx.moveTo(0,-3);ctx.lineTo(0,3);ctx.stroke();ctx.restore();
  }
}
