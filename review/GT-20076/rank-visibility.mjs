import {visiblePieces,enclosedArtwork,artworkFingerprint} from '../../tools/tests/weapon-seating.js';
import * as S from '../../studio/weapon-sidearms.js';
import * as L from '../../studio/weapon-longarms.js';
import * as H from '../../studio/weapon-heavy.js';
import {makeOptic} from '../../studio/weapon-optics.js';
import {surfaceCrossings} from './surface-crossings.mjs';
import {visibilityBuffer} from './visibility-buffer.mjs';

const builders={pistol:S.makePistolModel,revolver:S.makeRevolverModel,uzi:S.makeUziModel,
  m4:L.makeM4Model,ak:L.makeAkModel,aa12:L.makeAa12Model,shotgun:L.makeShotgunModel,sniper:L.makeSniperModel,
  minigun:H.makeMinigunModel,launcher:H.makeLauncherModel,flamer:H.makeFlamerModel,chainsaw:H.makeChainsawModel};

function currentModel(T,id) {
  const ctx={...T.inspectHost().builders.weaponContext(),finishGun:g=>g,mergeRigidMeshes:()=>{}};
  const gun=builders[id](ctx);
  gun.visible=true; gun.scale.copy(T.weaponMeshes[id].scale);
  if(id==='sniper') {
    const issued=T.weaponMeshes.sniper.getObjectByName('optic.nx8');
    gun.getObjectByName('scope').visible=false;
    const scope=makeOptic('nx8'); scope.position.copy(issued.position); gun.add(scope);
  }
  const u=gun.userData;
  return visiblePieces(gun,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean));
}

function projection(points,scale) {
  const [p,x,y,z]=points;
  return v=>p.map((t,i)=>t + (x[i]-t)*v.x/scale[0] + (y[i]-t)*v.y/scale[1] + (z[i]-t)*v.z/scale[2]);
}

function pixelSummary(pixels,width) {
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,sumX=0,sumY=0;
  for(const index of pixels) {
    const x=index%width, y=Math.floor(index/width);
    minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    sumX+=x;sumY+=y;
  }
  const cx=sumX/pixels.length,cy=sumY/pixels.length;
  const dist=index=>(index%width-cx)**2+(Math.floor(index/width)-cy)**2;
  const best=pixels.reduce((a,b)=>dist(a)<dist(b)?a:b);
  return {pixels:pixels.length,at:[best%width,Math.floor(best/width)],bounds:[minX,minY,maxX,maxY]};
}

export async function rankViews(T,id,folder='visibility',audit='catalog-chain-skin') {
  const path='/review/GT-20076/'+folder+'/'+id+'/';
  const get=async p=>{const response=await fetch(p,{cache:'no-store'});if(!response.ok)throw Error(response.status+' '+p);return response;};
  const data=(await (await get('/review/GT-20076/'+audit+'/audit.json')).json())[id];
  const cameras=await (await get(path+'cameras.json')).json();
  const parts=currentModel(T,id);
  const fingerprint=artworkFingerprint(parts);
  if(data.artworkFingerprint && fingerprint!==data.artworkFingerprint)throw Error(id+' artwork changed since strict catalog');
  if(parts.length!==data.parts) throw Error(id+' strict audit count mismatch '+parts.length+' vs '+data.parts);
  const indices=new Map(parts.map((p,i)=>[p.label,i]));
  const pairs=(data.rawOverlaps||data.overlaps).map(({a,b},index)=>{
    const ia=indices.get(a),ib=indices.get(b);
    if(ia===undefined || ib===undefined)throw Error(id+' stale labels '+a+' '+b);
    const segments=surfaceCrossings(parts[ia],parts[ib]);
    let enclosed;
    if (!segments.length) for(const [inner,outer] of [[ia,ib],[ib,ia]]) {
      const proof=enclosedArtwork(parts[inner],parts[outer]);
      if(proof){enclosed={inner:parts[inner].label,outer:parts[outer].label,maximum:proof.maximum};break;}
    }
    return {index,a,b,ia,ib,segments,enclosed,views:{}};
  });
  const coverage={};
  for(const [view,camera] of Object.entries(cameras)){
    const {width,height,points}=camera;
    const mask=new Uint8Array(await (await get(path+view+'-mask.bin')).arrayBuffer());
    if(mask.length!==width*height)throw Error('Changed screenshot size');
    if(camera.glassHidden && camera.pixels===0) {coverage[view]={glassOnly:true,maskPixels:0};continue;}
    const buffer=visibilityBuffer(parts,projection(points,data.metresPerLocalUnit),width,height);
    const depth=camera.actualDepth ? new Float32Array(await new Response((await get(path+view+'-depth.gz')).body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()) : null;
    if(depth && depth.length!==width*height)throw Error('Inconsistent posed depth dimensions');
    let projected=0,both=0,matched=0;
    for(let i=0;i<mask.length;i++) if(buffer.labels[i]>=0){projected++;both+=mask[i];if(mask[i] && depth && Math.abs(buffer.depths[i]-depth[i])<=buffer.depths[i]*.00035)matched++;}
    coverage[view]={projected,maskPixels:camera.pixels,overlapPixels:both,depthMatched:depth?matched:null};
    if(depth && matched<100)throw Error(id+' '+view+' actual posed depths fail alignment '+matched);
    if(projected<100 || !both)throw Error(id+' '+view+' projected mask does not meet visible artwork');
    for(const pair of pairs) {
      const pixels=buffer.witnessed(pair.segments,pair.ia,pair.ib,mask,depth);
      if(pixels.length) pair.views[view]=pixelSummary(pixels,width);
    }
  }
  const rows=pairs.map(({index,a,b,segments,enclosed,views})=>({index,a,b,segments:segments.length,enclosed,views,
    peakPixels:Math.max(0,...Object.values(views).map(s=>s.pixels))}));
  rows.sort((a,b)=>b.peakPixels-a.peakPixels || a.index-b.index);
  return {id,fingerprint,strictFingerprint:data.artworkFingerprint||null,rawPairs:rows.length,crossingPairs:rows.filter(r=>r.segments).length,
    screenCandidates:rows.filter(r=>r.peakPixels).length,coverage,rows};
}
