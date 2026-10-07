import {text} from './strings.js';

// Stable UI ids are separate from world geometry, names, and objective discovery.
export function mapLandmarks(poi, hq, pit) {
  const rows = [];
  const add = (id, p, key, color = '#d7c6a4', always = false) => {
    if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) rows.push({id, x:p.x, z:p.z, key, color, always});
  };
  add('hq', hq, 'map.hq', '#7cdea0', true);
  for (const [kind,key] of [['tower','tower'],['graveyard','graveyard'],['mast','mast'],['dock','dock']]) add(kind,poi[kind],'map.'+key);
  for (const [kind,key] of [['cabins','cabin'],['bridges','bridge'],['sheds','shed'],['wrecks','wreck']])
    (poi[kind] || []).forEach((p,i)=>add(kind+':'+i,p,'map.'+key));
  (poi.campsites || []).forEach((p,i)=>add('camp:'+i,p,'map.'+(['ranger','hikers','trapper'].includes(p.style)?p.style:'campsite')));
  (poi.caves || []).forEach((p,i)=>add('cave:'+i,p,
    ['root','shale','iron','wet','hill'].includes(p.theme)?'hollow.theme.'+p.theme:p.theme==='chalk'?'map.marrow':'map.cave', '#e4b098'));
  add('pit',pit,'map.pit');
  return rows;
}

export function createMapLandmarkIntel({radius = 18} = {}) {
  const found = new Set();
  return {
    reset() { found.clear(); },
    observe(rows, player) {
      for (const row of rows) if (Math.hypot(row.x-player.x,row.z-player.z)<=radius) found.add(row.id);
    },
    labels(rows) { return rows.map(row=>({...row, discovered:row.always||found.has(row.id),
      label:text(row.always||found.has(row.id)?row.key:'map.undiscovered')})); }
  };
}

export function drawMapLandmarks(ctx, rows, toMap, {size, scale = 1, mini = false}) {
  ctx.save(); ctx.font = `600 ${Math.max(mini?14:11, 12*scale)}px sans-serif`;
  ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=3*scale;ctx.strokeStyle='#101910';
  const fontHeight=Math.max(mini?14:11,12*scale), used=[];
  for(const row of rows) {
    const p=toMap(row.x,row.z);if(!p)continue;
    ctx.fillStyle=row.discovered?row.color:'#d8dfd5';
    if(row.discovered)ctx.fillRect(p.x-2*scale,p.y-2*scale,4*scale,4*scale);
    const width=Math.min(size-16,ctx.measureText(row.label).width),half=width/2;
    const x=Math.max(8+half,Math.min(size-8-half,p.x));
    let y=Math.max(fontHeight,Math.min(size-fontHeight,p.y+(row.discovered?12*scale:0)));
    // Nearby structures keep their own labels; move text, never their markers.
    for(let attempt=0;attempt<6 && used.some(r=>Math.abs(r.x-x)<(r.width+width)/2+3&&Math.abs(r.y-y)<fontHeight+2);attempt++)
      y=Math.max(fontHeight,Math.min(size-fontHeight,p.y+(attempt%2?-1:1)*(Math.floor(attempt/2)+1)*(fontHeight+3)));
    ctx.textAlign='center';ctx.strokeText(row.label,x,y,size-16);ctx.fillText(row.label,x,y,size-16);
    used.push({x,y,width});
  }
  ctx.restore();
}

export function drawMapCamera(ctx, p, {yaw, halfFov, reach, scale = 1}) {
  const angle=-Math.PI/2-yaw;
  ctx.save();
  const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,reach);
  g.addColorStop(0,'rgba(94,221,255,.32)');g.addColorStop(1,'rgba(94,221,255,.02)');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(p.x,p.y);
  ctx.arc(p.x,p.y,reach,angle-halfFov,angle+halfFov);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#5eddff';ctx.lineWidth=1.5*scale;ctx.beginPath();ctx.moveTo(p.x,p.y);
  ctx.lineTo(p.x+Math.cos(angle)*reach,p.y+Math.sin(angle)*reach);ctx.stroke();ctx.restore();
}
