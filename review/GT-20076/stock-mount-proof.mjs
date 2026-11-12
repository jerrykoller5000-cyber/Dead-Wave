import {makeLauncherModel,makeFlamerModel} from '../../studio/weapon-heavy.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

function checkJoin(mesh,host){
  const pieces=visiblePieces(mesh),gap=visibleSurfaceGap(mesh,host,1.8/1.655);
  if(pieces.length!==1||!pieces[0].closed||gap.penetrating||gap.upperMm>.5)
    throw Error('Bad visible join '+JSON.stringify({mesh:mesh.name,pieces:pieces.length,closed:pieces[0]?.closed,gap}));
  return gap;
}
export function exteriorSamples(mesh,original,axis,sign,limit,refined=false){
  function samples(geometry){
    const {position:p,normal:n,uv}=geometry.attributes,keys=new Set();
    for(let i=0;i<p.count;i++){
      const xyz=[p.getX(i),p.getY(i),p.getZ(i)];
      if(sign*(xyz[axis]+mesh.position.toArray()[axis])<=limit+.000001)continue;
      keys.add([...xyz,n.getX(i),n.getY(i),n.getZ(i),uv.getX(i),uv.getY(i)].map(v=>Math.round(v*1e7)).join(','));
    }
    return keys;
  }
  const before=samples(original),after=samples(mesh.geometry);
  if(before.size<3||[...before].some(k=>!after.has(k)))throw Error('Original exposed samples changed '+before.size+'/'+after.size);
  const extra=[...after].filter(key=>!before.has(key));
  if(extra.length&&!refined)throw Error('Unexpected exterior vertices '+extra.length);
  if(extra.length){
    // Verify the position, normal and UV of every extra boundary subdivision against its original triangle.
    const {position:p,normal:n,uv}=original.attributes,index=original.index,triangles=[];
    for(let i=0;i<(index?index.count:p.count);i+=3){
      triangles.push([0,1,2].map(j=>{
        const k=index?index.getX(i+j):i+j;
        return [p.getX(k),p.getY(k),p.getZ(k),n.getX(k),n.getY(k),n.getZ(k),uv.getX(k),uv.getY(k)];
      }));
    }
    for(const key of extra){
      const v=key.split(',').map(Number).map(x=>x/1e7);
      const match=triangles.some(([a,b,c])=>{
        const A=b.map((n,i)=>n-a[i]),B=c.map((n,i)=>n-a[i]),P=v.map((n,i)=>n-a[i]);
        const dot=(u,w)=>u[0]*w[0]+u[1]*w[1]+u[2]*w[2];
        const aa=dot(A,A),ab=dot(A,B),bb=dot(B,B),ap=dot(A,P),bp=dot(B,P),det=aa*bb-ab*ab;
        if(det<1e-24)return false;
        const u=(ap*bb-bp*ab)/det,w=(bp*aa-ap*ab)/det;
        return u>=-.0002&&w>=-.0002&&u+w<=1.0002&&P.every((x,i)=>Math.abs(x-u*A[i]-w*B[i])<(i<3?2e-7:.00015));
      });
      if(!match)throw Error('Extra sample differs from original surface '+key);
    }
  }
  return before.size;
}
export function stockMountProof(T,id,baseline,pictures=false){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),old=new Map();
  function remember(mesh){old.set(mesh,mesh.geometry.clone());return mesh;}
  const model=({launcher:makeLauncherModel,flamer:makeFlamerModel}[id])({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,box(...args){
      const m=k.box(...args);
      return id==='flamer'&&((args[0]===.054&&args[1]===.024&&args[2]===.115)||(args[0]===.0015&&args[2]===.025&&args[7]===.22))?remember(m):m;
    },slab(points,w,mat,options){
      const m=k.slab(points,w,mat,options);
      return id==='flamer'&&((w===.036&&points[0][1]===-.032)||(w===.003&&Math.abs(options?.x)===.018&&points[0][1]===-.052&&points[0][0]<0))?remember(m):m;
    }};
  }});
  const stock=model.userData.fpStock;
  if(id==='launcher'){
    const kit=ctx.gunKit(new G.Group());
    old.set(stock.children[0],kit.lathe([[0,-.46],[.024,-.46],[.024,-.25],[0,-.25]],ctx.gunDark,{y:.04,seg:12}).geometry);
  }
  if(id==='flamer'){
    const affected=new Set(model.children.slice(54,64));
    for(const mesh of old.keys())if(!affected.has(mesh))old.delete(mesh);
  }
  if(old.size!==(id==='launcher'?1:10))throw Error('Incorrect source set '+id+' '+old.size);
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);model.updateMatrixWorld(true);
  const u=model.userData,originals=[...old].map(([mesh,original])=>({mesh,original,revised:mesh.geometry}));
  function show(phase){for(const {mesh,original,revised} of originals)mesh.geometry=phase==='before'?original:revised;}
  show('before');
  const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  show('after');
  if(hash!==baseline)throw Error('Prior complete artwork differs '+id+' '+hash+' / '+baseline);
  if(pictures)return {model,hash,show};
  if(id==='flamer'){
    const part=i=>model.children[i],checks=[],outer=[];
    for(const [i,j,axis,sign,limit] of [[54,0,1,-1,.035],[55,54,1,-1,.046],
      ...[-1,1].flatMap((s,k)=>Array.from({length:4},(_,j)=>[56+4*k+j,j?56+4*k:55,0,s,j?.0195:.018]))]){
      const m=part(i);outer.push(exteriorSamples(m,old.get(m),axis,sign,limit,i===54));checks.push(checkJoin(m,part(j)));
    }
    const tailSamples=exteriorSamples(part(54),old.get(part(54)),2,-1,.170401,true);
    const mount=part(54),p=old.get(mount).attributes.position,upperTail=new Set();
    for(let i=0;i<p.count;i++)if(p.getZ(i)+mount.position.z<-.170401 && p.getY(i)+mount.position.y>-.034999)
      upperTail.add([p.getX(i),p.getY(i),p.getZ(i)].map(x=>Math.round(x*1e7)).join(','));
    if(upperTail.size<3)throw Error('No exposed tail above the discarded flat cut');
    const triangles=geo=>(geo.index?.count??geo.attributes.position.count)/3;
    return {hash,outer,checks,tailSamples,upperTail:upperTail.size,mountTriangles:[triangles(old.get(mount)),triangles(mount.geometry)]};
  }
  const tube=stock.children[0],pivot=model.children[39],p=tube.geometry.attributes.position;
  const previous=old.get(tube).attributes.position,oldRim=new Set(),newRim=new Set();
  const key=(x,y)=>[x,y].map(v=>Math.round(v*1e7)).join(',');
  for(let i=0;i<previous.count;i++)if(previous.getZ(i)<-.45999&&Math.hypot(previous.getX(i),previous.getY(i))>.02399)oldRim.add(key(previous.getX(i),previous.getY(i)));
  const edgeNormals=Array.from({length:12},(_,i)=>(i+.5)*Math.PI/6).map(a=>[Math.cos(a),Math.sin(a)]);
  const support=.024*Math.cos(Math.PI/12);let maxOutlineError=0,minFront=1,maxFront=-1;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    maxOutlineError=Math.max(maxOutlineError,Math.abs(Math.max(...edgeNormals.map(([nx,ny])=>nx*x+ny*y))-support));
    if(z<-.45999)newRim.add(key(x,y));
    else{minFront=Math.min(minFront,z);maxFront=Math.max(maxFront,z);}
  }
  if(oldRim.size!==12||[...oldRim].some(k=>!newRim.has(k))||maxOutlineError>1e-7)throw Error('Original stock outline changed '+oldRim.size+' '+maxOutlineError);
  const samples=[];
  for(let degrees=-80;degrees<=80;degrees+=5){
    stock.rotation.x=degrees*Math.PI/180;model.updateMatrixWorld(true);
    const gap=checkJoin(tube,pivot);
    samples.push({degrees,gap});
  }
  return {hash,originalRim:oldRim.size,maxOutlineError,frontZ:[minFront,maxFront],samples};
}
