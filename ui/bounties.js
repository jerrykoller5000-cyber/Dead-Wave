import { text } from './strings.js';
import { projectScoutCave } from './scouting.js';

const LABELS = new Set(['ranger','hikers','trapper','campsite','cabin','shed','wreck','tower','graveyard','mast'].map(k=>'world.'+k));
const KINDS = new Set(['campsite','cabin','shed','wreck','tower','graveyard','mast']);
const identity = b => `${b.day}:${b.kind}:${b.index}`;
const validPost = (b,day) => b && Number.isSafeInteger(day) && day>=2 && b.day===day &&
  KINDS.has(b.kind) && Number.isSafeInteger(b.index) && b.index>=0 && LABELS.has(b.labelKey) &&
  Number.isSafeInteger(b.reward) && b.reward>0 && Number.isSafeInteger(b.guards) && b.guards>0;

export function buildBountyBoard({day,phase,alarmActive=false,bounties=[]}={}) {
  if(phase!=='prep'||alarmActive||!Number.isSafeInteger(day)||day<2)return null;
  const rows=[],seen=new Set();
  for(const b of Array.isArray(bounties)?bounties:[]) {
    if(!validPost(b,day)||!['open','done'].includes(b.state)||seen.has(identity(b)))continue;
    seen.add(identity(b));
    const remaining=Number.isSafeInteger(b.alive)&&b.alive>=0&&b.alive<=b.guards?b.alive:b.guards;
    rows.push({id:identity(b),state:b.state,name:text(b.labelKey),
      guards:b.state==='open'?text('bounty.guards',{count:remaining}):text('bounty.collected'),
      reward:text('bounty.reward',{value:b.reward}),
      deadline:b.state==='open'?text('bounty.deadline'):null});
  }
  return {title:text('bounty.title'),rows,empty:text('bounty.empty'),note:text('bounty.bank'),legend:text('bounty.mapLegend')};
}

// Only identities actually presented by an opened board gain a mark. A later
// posting cannot reveal itself just because an empty board was opened earlier.
export function createBountyIntel() {
  let runId=null,readDay=null;const known=new Map();
  return {
    receive(event) {
      if(event?.type==='run-reset'){runId=event.runId;readDay=null;known.clear();return;}
      if(runId===null||event?.runId!==runId)return;
      if(event.type==='alarm-started'){known.clear();return;}
      if(event.type==='bounty-done'||event.type==='bounty-expired'){known.delete(identity(event));return;}
      if(event.type!=='briefing-open'||event.phase!=='prep'||event.alarmActive)return;
      known.clear();readDay=event.day;
      for(const b of Array.isArray(event.bounties)?event.bounties:[]) {
        if(validPost(b,event.day)&&b.state==='open'&&Number.isFinite(b.x)&&Number.isFinite(b.z))
          known.set(identity(b),{id:identity(b),x:b.x,z:b.z});
      }
    },
    markers({day,phase,alarmActive=false}={}) {
      return phase==='prep'&&!alarmActive&&day===readDay?[...known.values()]:[];
    }
  };
}

export const bountyIntel=createBountyIntel();
if(typeof window!=='undefined')window.addEventListener('dw-game',({detail})=>bountyIntel.receive(detail));

export function drawBountyMarks(ctx,markers,projection) {
  for(const marker of markers) {
    const p=projectScoutCave(marker,projection);if(!p)continue;
    ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle='#9ed7dc';ctx.fillStyle='#101b1e';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();
    ctx.moveTo(-10,0);ctx.lineTo(10,0);ctx.moveTo(0,-10);ctx.lineTo(0,10);ctx.stroke();ctx.restore();
  }
}
