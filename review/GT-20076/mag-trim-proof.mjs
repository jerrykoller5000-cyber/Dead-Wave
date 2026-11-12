import {makeM4Model,makeSniperModel} from '../../studio/weapon-longarms.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

function seat(a,b){
  const pieces=visiblePieces(a),gap=visibleSurfaceGap(a,b,1.8/1.655);
  if(pieces.length!==1||!pieces[0].closed||gap.penetrating||gap.upperMm>.5)throw Error('Unseated artwork '+JSON.stringify({pieces:pieces.length,closed:pieces[0].closed,gap}));
  return gap;
}
function tuples(mesh,keep){
  const {position:p,normal:n,uv:u}=mesh.geometry.attributes,keys=new Set();
  for(let i=0;i<p.count;i++)if(keep(p,i,n)){
    const xyz=[mesh.position.x+p.getX(i),mesh.position.y+p.getY(i),mesh.position.z+p.getZ(i)];
    keys.add([...xyz.map(v=>Math.round(v*1e8)),n.getX(i),n.getY(i),n.getZ(i),u.getX(i),u.getY(i)].join(','));
  }
  return keys;
}
function sameExterior(before,after,keep){
  const a=tuples(before,keep),b=tuples(after,keep);
  if(!a.size||a.size!==b.size||[...a].some(k=>!b.has(k)))throw Error('Surface tuples differ '+a.size+'/'+b.size);
  return a.size;
}
export function checkMagTrim(T,id){
  const ctx=T.inspectHost().builders.weaponContext(),G=T.THREE,priorKit=ctx.gunKit(new G.Group()),ribs=[];
  let base,original;
  const model=({m4:makeM4Model,sniper:makeSniperModel}[id])({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);
    return {...k,slab(p,w,m,o){
      const mesh=k.slab(p,w,m,o);
      if(id==='m4'&&p.length===8&&w===.002&&Math.abs(o?.x)===.019){
        const old=priorKit.slab(p,.003,m,{x:Math.sign(o.x)*.0185,bevel:0});
        ribs.push({old,mesh});
      }
      return mesh;
    },box(...args){
      const mesh=k.box(...args);
      if(id==='sniper'&&args[0]===.031&&args[1]===.014&&args[2]===.34){base=mesh;original=mesh.clone();original.geometry=mesh.geometry.clone();}
      return mesh;
    }};
  }});
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);model.updateMatrixWorld(true);
  if(id==='sniper'){
    const exterior=sameExterior(original,base,(p,i)=>p.getY(i)+base.position.y>.0720001);
    return {exterior,claddingGap:seat(base,model.children[112])};
  }
  if(ribs.length!==6)throw Error('Missing magazine side ribs '+ribs.length);
  const mag=model.userData.mag,rows=ribs.map(({old,mesh})=>{
    const side=Math.sign(mesh.position.x);
    return {side,exterior:sameExterior(old,mesh,(_p,i,n)=>side*n.getX(i)>.999999),gap:seat(mesh,mag.children[0])};
  });
  const marks=[];
  for(const first of [4,10])for(let j=0;j<3;j++){
    const mark=mag.children[first+j],band=mag.children[13+j];
    const gap=seat(mark,band);
    if(gap.upperMm>.01)throw Error('Mark misses the rounded band '+JSON.stringify({first,j,gap}));
    marks.push({index:first+j,band:13+j,gap});
  }
  return {ribs:rows,marks};
}
