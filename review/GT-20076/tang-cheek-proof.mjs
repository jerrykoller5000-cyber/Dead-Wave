import {makePistolModel} from '../../studio/weapon-sidearms.js';
import {makeSniperModel} from '../../studio/weapon-longarms.js';
import {makeOptic} from '../../studio/weapon-optics.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {exteriorSamples} from './stock-mount-proof.mjs';

// Exact triangle-plane intersection within each ray, sampled on a half-unit-mm grid.
function sideSkin(G,parts){
  const tris=[];
  for(const mesh of parts){
    const p=mesh.geometry.attributes.position,ix=mesh.geometry.index;
    for(let i=0;i<(ix?ix.count:p.count);i+=3){
      const [a,b,c]=[0,1,2].map(j=>new G.Vector3().fromBufferAttribute(p,ix?ix.getX(i+j):i+j).add(mesh.position));
      const den=(b.y-c.y)*(a.z-c.z)+(c.z-b.z)*(a.y-c.y);
      if(Math.abs(den)<1e-13)continue;
      tris.push({a,b,c,den,z0:Math.min(a.z,b.z,c.z),z1:Math.max(a.z,b.z,c.z),y0:Math.min(a.y,b.y,c.y),y1:Math.max(a.y,b.y,c.y)});
    }
  }
  return (z,y)=>{
    let x=-Infinity;
    for(const {a,b,c,den,z0,z1,y0,y1} of tris){
      if(z<z0||z>z1||y<y0||y>y1)continue;
      const u=((b.y-c.y)*(z-c.z)+(c.z-b.z)*(y-c.y))/den,v=((c.y-a.y)*(z-c.z)+(a.z-c.z)*(y-c.y))/den;
      if(u>=-1e-9&&v>=-1e-9&&u+v<=1+1e-9)x=Math.max(x,u*a.x+v*b.x+(1-u-v)*c.x);
    }return x;
  };
}
export function checkTangCheek(T,id,baseline,pictures=false){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),kit=ctx.gunKit(new G.Group());
  const model=(id==='pistol'?makePistolModel:makeSniperModel)({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{}});
  let part,host,original,originalHost;
  if(id==='pistol'){
    part=model.getObjectByName('pistol rear tang');host=model.getObjectByName('pistol dust cover');
    originalHost=kit.slab([[-.0875,.006],[.294,.006],[.298,0],[.294,-.020],[.112,-.020],[.104,-.016],[.04,-.016],[.026,-.030],[-.004,-.036],[-.022,-.020],[-.07,-.012],[-.0875,-.004]],.044,host.material,{bevel:.007,segs:3}).geometry;
    original=kit.slab([[-.060,.006],[-.085,.005],[-.097,.003],[-.100,.002],[-.100,-.002],[-.096,-.006],[-.084,-.009],[-.073,-.013],[-.062,-.020],[-.048,-.014],[-.036,-.008],[-.026,-.002]],.040,part.material,{bevel:.004,segs:3}).geometry;
  }else{
    const optic=makeOptic('nx8');optic.position.copy(T.weaponMeshes.sniper.getObjectByName(optic.name).position);
    model.getObjectByName('scope').visible=false;model.add(optic);
    const stock=model.userData.fpStock;host=stock.children[0];part=stock.children[4];
    original=kit.slab([[-.32,.058],[-.535,.058],[-.535,.122],[-.37,.128],[-.32,.106]],.054,part.material,{bevel:.009,segs:3}).geometry;
  }
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);
  const edited=part.geometry,editedHost=host.geometry,u=model.userData,ignore=[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean);
  const show=phase=>{part.geometry=phase==='before'?original:edited;if(originalHost)host.geometry=phase==='before'?originalHost:editedHost;model.updateMatrixWorld(true);};
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,ignore));show('after');
  if(hash!==baseline)throw Error('Unexpected baseline '+id+' '+hash+' / '+baseline);
  if(pictures)return {model,show,hash};
  const pieces=visiblePieces(part),gap=visibleSurfaceGap(part,host,1.8/1.655);
  const supports=visiblePieces(host),renderScale=1.8/1.655;
  const closedAtScale=[...visiblePieces(part,renderScale),...visiblePieces(host,renderScale)].every(p=>p.closed);
  const validSeat=pieces.length===1&&pieces[0].closed&&supports.length===1&&supports[0].closed&&closedAtScale&&!gap.penetrating&&gap.upperMm<=.5;
  if(id==='sniper'&&!validSeat)throw Error('Invalid seat '+JSON.stringify({id,gap,closed:pieces.map(p=>p.closed)}));
  if(id==='sniper')return {hash,gap,upper:exteriorSamples(part,original,1,1,.085),stock:model.userData.fpStock.position.toArray()};
  show('before');const old=sideSkin(G,[part,host]);show('after');const current=sideSkin(G,[part,host]);
  const profile={samples:0,lost:0,added:0,widestLoss:0,widestExpansion:0},zStart=-.10117,yStart=-.02117;
  for(let i=0;i<156;i++)for(let j=0;j<58;j++){
    const z=zStart+i*.0005,y=yStart+j*.0005,a=old(z,y),b=current(z,y);
    if(!Number.isFinite(a)&&!Number.isFinite(b))continue;profile.samples++;
    if(!Number.isFinite(b)){profile.lost++;continue;}
    if(!Number.isFinite(a)){profile.added++;continue;}
    if(a-b>profile.widestLoss){profile.widestLoss=a-b;profile.deepestAt=[z,y,a,b];}
    if(b-a>profile.widestExpansion){profile.widestExpansion=b-a;profile.expandedAt=[z,y,a,b];}
  }
  if(!validSeat){
    const solids=visiblePieces(host,1.8/1.655);
    function badEdges(parts){
      return parts.map(p=>{
        const edges=new Map(),local=v=>p.mesh.worldToLocal(v.clone());
        for(const f of p.faces)for(let j=0;j<3;j++){
          const key=[f.ids[j],f.ids[(j+1)%3]].sort((a,b)=>a-b).join(',');
          const pair=edges.get(key)||{n:0,ends:[f.p[j],f.p[(j+1)%3]].map(v=>local(v).toArray().map(x=>+x.toFixed(8)))};
          pair.n++;edges.set(key,pair);
        }
        const bad=[...edges.values()].filter(row=>row.n!==2);
        return {vertices:p.vertices.length,faces:p.faces.length,open:bad.length,first:bad.slice(0,5)};
      });
    }
    const probe=new G.Vector3(-.01194,-.01192,-.04517),cross=new G.Vector3(),q=new G.Vector3();
    let angle=0,d=Infinity;
    for(const mesh of solids)for(const f of mesh.faces){
      const [a,b,c]=f.p.map(p=>p.clone().sub(probe));
      d=Math.min(d,f.tri.closestPointToPoint(probe,q).distanceTo(probe));
      angle+=2*Math.atan2(a.dot(cross.crossVectors(b,c)),a.length()*b.length()*c.length()+a.dot(b)*c.length()+b.dot(c)*a.length()+c.dot(a)*b.length());
    }
    throw Error('Invalid pistol seat '+JSON.stringify({gap,profile,tangEdges:badEdges(visiblePieces(part)),coverEdges:badEdges(visiblePieces(host)),winding:angle/(4*Math.PI),distance:d}));
  }
  if(profile.lost||profile.added||profile.widestExpansion>1e-6||profile.widestLoss>.0015)throw Error('Frame side envelope changed '+JSON.stringify(profile));
  return {hash,gap,profile,tail:exteriorSamples(part,original,2,-1,.0973,true),coverFront:exteriorSamples(host,originalHost,2,1,.04,true),triangles:[edited,editedHost].map(g=>g.attributes.position.count/3)};
}

export function inspectFrameMeshes(T){
  const ctx=T.inspectHost().builders.weaponContext(),model=makePistolModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{}});
  const geometry=(name)=>Object.fromEntries(['position','normal','uv'].map(k=>[k,Array.from(model.getObjectByName(name).geometry.attributes[k].array)]));
  return {tang:geometry('pistol rear tang'),cover:geometry('pistol dust cover')};
}
export function inspectFramePartition(T){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();
  const model=makePistolModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{}});
  const tang=model.getObjectByName('pistol rear tang'),cover=model.getObjectByName('pistol dust cover'),grip=model.getObjectByName('pistol grip');
  const a=sideSkin(G,[tang]),b=sideSkin(G,[cover]),c=sideSkin(G,[grip]);
  const rows=[],coords=[[],[]];
  for(let i=0;i<159;i++)for(let j=0;j<60;j++){
    const z=-.10117+i*.0005,y=-.02117+j*.0005,ta=a(z,y),co=b(z,y),gr=c(z,y);
    if(!Number.isFinite(ta)&&!Number.isFinite(co))continue;
    rows.push({z,y,ta,co,gr});
  }
  for(const slope of [0,-.5,-1,-1.5,-2,-2.5,-3,-4,-6]){
    for(let k=0;k<100;k++){
      const seam=-.096+k*.0007,stats={slope,seam,lost:0,skinLoss:0,maxLoss:0,lossAt:null};
      for(const {z,y,ta,co,gr} of rows){
        const prev=Math.max(ta,co,gr),next=Math.max(z<seam+y*slope?ta:co,gr);
        if(!Number.isFinite(next)){stats.lost++;stats.skinLoss+=prev;continue;}
        const loss=prev-next;
        stats.skinLoss+=loss;
        if(loss>stats.maxLoss){stats.maxLoss=loss;stats.lossAt=[z,y,prev,next];}
      }
      coords[slope===0?0:1].push(stats);
    }
  }
  const shortlist=coords.map(items=>items.sort((x,y)=>x.lost-y.lost||x.skinLoss-y.skinLoss).slice(0,8));
  const geometry=o=>Object.fromEntries(['position','normal','uv'].map(k=>[k,Array.from(o.geometry.attributes[k].array)]));
  return {count:rows.length,shortlist,cover:geometry(cover),tang:geometry(tang),grip:geometry(grip)};
}
