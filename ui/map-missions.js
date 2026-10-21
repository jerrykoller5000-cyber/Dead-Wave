import {text} from './strings.js';
import {OBJECTIVE_SITES} from './objectives.js';
import {projectScoutCave} from './scouting.js';

const definitions = new Map(OBJECTIVE_SITES.map(site=>[site.id,site]));
const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const open = new Set(['available','active','ready-to-claim']);

// Navigation is independent of interaction reach. Read only owner state; never
// reveal a cache, grant a reward, complete an objective, or synthesize an E press.
export function mapMissionMarkers({active, snapshot, selected = [], player, skulls = 0, bank, extraction, dock} = {}) {
  if (!active || !point(player)) return [];
  const rows = [], ids = new Set();
  const add = (id, position, title, urgent = false) => {
    if (!point(position) || ids.has(id)) return;
    ids.add(id);rows.push({id,position:{x:position.x,z:position.z},title,selected:selected.includes(id),urgent});
  };
  if (extraction === 'due') add('mission:extraction',dock,text('map.mission.extraction'),true);
  for (const site of snapshot?.sites || []) {
    const def = definitions.get(site?.id);if (!def) continue;
    // Restoring the radio is the briefing's first destination. Other unknown
    // sites stay hidden until the owner discovers/reveals them.
    const radio = site.id === 'objective:radio-repair';
    if (!open.has(site.state) && !(radio && site.state === 'undiscovered')) continue;
    const key = radio && site.state === 'ready-to-claim' ? 'map.mission.radioSupplies' : def.titleKey;
    add(site.id,site.position,text(key));
  }
  if (skulls > 0) add('mission:bank',bank,text('map.mission.bank'));
  return rows.map((row,i)=>({...row,number:i+1,
    distance:Math.round(Math.hypot(row.position.x-player.x,row.position.z-player.z))}));
}

export function projectMapMissions(markers, toMap, projection) {
  return markers.flatMap(marker=>{
    const p=projection?projectScoutCave(marker.position,projection):toMap(marker.position.x,marker.position.z);
    return p && Number.isFinite(p.x) && Number.isFinite(p.y)?[{...marker,...p}]:[];
  });
}

export function drawMapMissions(ctx, markers, {scale = 1} = {}) {
  const k=Math.max(.85,scale),r=10*k;
  ctx.save();ctx.lineWidth=2*k;ctx.lineJoin='round';
  ctx.font=`bold ${12*k}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  for(const marker of markers) {
    const color=marker.urgent?'#baf3ff':marker.selected?'#fff3bd':'#efd07a';
    ctx.save();ctx.translate(marker.x,marker.y);
    if(marker.edge){
      // A separate outward chevron means this is a bearing, not a nearby site.
      ctx.save();ctx.rotate(marker.angle);ctx.strokeStyle=color;
      ctx.beginPath();ctx.moveTo(r+2,-4*k);ctx.lineTo(r+6,0);ctx.lineTo(r+2,4*k);ctx.stroke();ctx.restore();
    }
    ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r,0);ctx.lineTo(0,r);ctx.lineTo(-r,0);ctx.closePath();
    ctx.fillStyle='#16211b';ctx.fill();ctx.strokeStyle=color;ctx.stroke();
    if(marker.selected||marker.urgent){ctx.beginPath();ctx.arc(0,0,r+4*k,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle=color;ctx.fillText(String(marker.number),0,0);ctx.restore();
  }
  ctx.restore();
}

export function mapMissionLegend(markers) {
  return markers.length ? text('map.mission.legend',{missions:markers.map(m=>text('map.mission.item',
    {number:m.number,title:m.title,distance:m.distance})).join(' · ')}) : '';
}
