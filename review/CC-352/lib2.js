// CC-352 (claude3, cloud only): triangle-based clip sweep. For a set A of vertices and a set B of world triangles (spatial hash,
// 2 cm cells): a vertex is inside B when its nearest triangle (within 3 cm) faces away from it; depth = the distance (mm).
// Both ways: body vertices in gun triangles and gun vertices in body triangles.
window.__clip352 = () => { const T=TT, THREE=T.THREE||window.THREE, m=T.getMarine(), ud=m.userData, rig=ud.carry; m.updateWorldMatrix(true,true);
  const v=new THREE.Vector3(), a=new THREE.Vector3(), b=new THREE.Vector3(), c=new THREE.Vector3(), cp=new THREE.Vector3(), tri=new THREE.Triangle(), nn=new THREE.Vector3();
  const spots={hip:rig.hip,hipPair:rig.hipPair,h0:rig.holsters[0],h1:rig.holsters[1],p0:rig.pairs[0],p1:rig.pairs[1],s0:rig.slings[0],s1:rig.slings[1]};
  const owner=new Map(); for (const [k,s] of Object.entries(spots)) s&&s.g&&s.g.traverse(o=>owner.set(o,k));
  const under=(o,root)=>{for(let q=o;q;q=q.parent) if(q===root) return true; return false;};
  const shown=(o)=>{for(let q=o;q&&q!==m;q=q.parent) if(!q.visible) return false; return true;};
  const vert=(o,i,t)=>(o.isSkinnedMesh&&o.getVertexPosition?o.getVertexPosition(i,t):t.fromBufferAttribute(o.geometry.attributes.position,i)).applyMatrix4(o.matrixWorld);
  const meshes={arm:[],leg:[],held:[]};
  const addM=(root,key)=>root.traverseVisible(o=>{ if(!o.isMesh||!o.geometry||!o.geometry.attributes.position||owner.has(o)) return; if(key!=='held'&&under(o,ud.weaponMount)) return; if(o.material&&o.material.visible===false) return; if(/holster/.test(o.name||'')) return; meshes[key].push(o); });
  addM(ud.armRG,'arm'); addM(ud.armLG,'arm'); addM(ud.legRG,'leg'); addM(ud.legLG,'leg');
  m.traverseVisible(o=>{ if(o.isMesh&&/live-seat|boot|live-trouser-leg/.test(o.name||'')&&!under(o,ud.legRG)&&!under(o,ud.legLG)&&!owner.has(o)) meshes.leg.push(o); });
  if (ud.weaponMount && shown(ud.weaponMount)) addM(ud.weaponMount,'held');
  for (const [k,s] of Object.entries(spots)) { if(!s||!s.g||!shown(s.g)||!s.gun) continue; meshes[k]=[]; s.gun.traverseVisible(o=>{ if(o.isMesh&&o.geometry&&o.geometry.attributes.position) meshes[k].push(o); }); }
  const pts={}, tris={}, boxes={}, names={};
  for (const [k,list] of Object.entries(meshes)) { const P=[], Tr=[], bx=new THREE.Box3();
    const NM=[]; for (const o of list) { const n=o.geometry.attributes.position.count, base=P.length/3; NM.push([base,(o.name||'?')+(o.parent&&o.parent.name?'<'+o.parent.name:'')]); for(let i=0;i<n;i++){ vert(o,i,v); P.push(v.x,v.y,v.z); bx.expandByPoint(v); }
      const ix=o.geometry.index; const nt=ix?ix.count/3:n/3; const flip=o.matrixWorld.determinant()<0; for(let t=0;t<nt;t++){ const i0=ix?ix.getX(3*t):3*t, i1=ix?ix.getX(3*t+1):3*t+1, i2=ix?ix.getX(3*t+2):3*t+2; if(flip) Tr.push(base+i0,base+i2,base+i1); else Tr.push(base+i0,base+i1,base+i2); } }
    pts[k]=new Float32Array(P); tris[k]=Tr; boxes[k]=bx; names[k]=NM; }
  const nameAt=(k,i)=>{ let r='?'; for(const [b,nm] of names[k]) if(b<=i) r=nm; return r; };
  const CELL=0.02, key=(x,y,z)=>x+','+y+','+z;
  const hashOf=(k)=>{ const H=new Map(), P=pts[k], Tr=tris[k]; for(let t=0;t<Tr.length;t+=3){ let x0=1e9,y0=1e9,z0=1e9,x1=-1e9,y1=-1e9,z1=-1e9; for(let j=0;j<3;j++){ const i=Tr[t+j]*3; x0=Math.min(x0,P[i]);x1=Math.max(x1,P[i]);y0=Math.min(y0,P[i+1]);y1=Math.max(y1,P[i+1]);z0=Math.min(z0,P[i+2]);z1=Math.max(z1,P[i+2]); }
      for(let X=Math.floor(x0/CELL);X<=Math.floor(x1/CELL);X++) for(let Y=Math.floor(y0/CELL);Y<=Math.floor(y1/CELL);Y++) for(let Z=Math.floor(z0/CELL);Z<=Math.floor(z1/CELL);Z++){ const kk=key(X,Y,Z); let L=H.get(kk); if(!L) H.set(kk,L=[]); L.push(t); } } return H; };
  const H={}, H2={}; const C2=0.01;
  const hash2=(k)=>{ const M=new Map(), P=pts[k], Tr=tris[k]; for(let t=0;t<Tr.length;t+=3){ let y0=1e9,z0=1e9,y1=-1e9,z1=-1e9; for(let j=0;j<3;j++){ const i=Tr[t+j]*3; y0=Math.min(y0,P[i+1]);y1=Math.max(y1,P[i+1]);z0=Math.min(z0,P[i+2]);z1=Math.max(z1,P[i+2]); }
      for(let Y=Math.floor(y0/C2);Y<=Math.floor(y1/C2);Y++) for(let Z=Math.floor(z0/C2);Z<=Math.floor(z1/C2);Z++){ const kk=Y+','+Z; let L=M.get(kk); if(!L) M.set(kk,L=[]); L.push(t); } } return M; };
  const ray=new THREE.Ray(), hit=new THREE.Vector3(), dirs=[new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0)];
  const parity=(B,v)=>{ const M=H2[B]||(H2[B]=hash2(B)), P=pts[B], Tr=tris[B]; const L=M.get(Math.floor(v.y/C2)+','+Math.floor(v.z/C2)); if(!L) return false; let odd=0;
    for(const dir of dirs){ ray.set(v,dir); let n=0; for(const t of L){ a.set(P[Tr[t]*3],P[Tr[t]*3+1],P[Tr[t]*3+2]); b.set(P[Tr[t+1]*3],P[Tr[t+1]*3+1],P[Tr[t+1]*3+2]); c.set(P[Tr[t+2]*3],P[Tr[t+2]*3+1],P[Tr[t+2]*3+2]); if(ray.intersectTriangle(a,b,c,false,hit)) n++; } if(n%2) odd++; }
    return odd===2; };
  const depth=(A,B)=>{ // vertices of A inside triangles of B
    if(!pts[A]||!pts[B]||!pts[A].length||!pts[B].length) return null; const bb=boxes[B].clone().expandByScalar(0.005); const PA=pts[A], PB=pts[B], Tr=tris[B];
    let hb=null, n=0, dmax=0, at=null;
    for(let i=0;i<PA.length;i+=3){ v.set(PA[i],PA[i+1],PA[i+2]); if(!bb.containsPoint(v)) continue; if(!hb) hb=H[B]||(H[B]=hashOf(B));
      const X=Math.floor(v.x/CELL),Y=Math.floor(v.y/CELL),Z=Math.floor(v.z/CELL); let best=0.03, sgn=1, bt=-1; const seen=new Set();
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){ const L=hb.get(key(X+dx,Y+dy,Z+dz)); if(!L) continue; for(const t of L){ if(seen.has(t)) continue; seen.add(t);
        a.set(PB[Tr[t]*3],PB[Tr[t]*3+1],PB[Tr[t]*3+2]); b.set(PB[Tr[t+1]*3],PB[Tr[t+1]*3+1],PB[Tr[t+1]*3+2]); c.set(PB[Tr[t+2]*3],PB[Tr[t+2]*3+1],PB[Tr[t+2]*3+2]);
        tri.set(a,b,c); if(tri.getArea()<1e-10) continue; tri.closestPointToPoint(v,cp); const d=cp.distanceTo(v); if(d<best-1e-6){ best=d; bt=t; tri.getNormal(nn); sgn=Math.sign(nn.dot(cp.sub(v).negate()))||1; } else if(Math.abs(d-best)<1e-6){ tri.getNormal(nn); const s2=Math.sign(nn.dot(cp.sub(v).negate()))||1; if(s2>0) sgn=1; } } }
      if(best<0.03&&sgn<0&&best>0.002&&parity(B,v)){ n++; if(best>dmax){dmax=best;at=[+v.x.toFixed(3),+v.y.toFixed(3),+v.z.toFixed(3),A+':'+nameAt(A,i/3)+' in '+B+':'+nameAt(B,Tr[bt])];} } }
    return n?{n,mm:+(dmax*1000).toFixed(1),at}:null; };
  const out={};
  for (const [k,s] of Object.entries(spots)) { if(!meshes[k]) continue; const who={};
    for (const B of ['arm','leg','held']) { const r1=depth(B,k), r2=depth(k,B); if(r1) who[B]=r1; if(r2) who[B+'<']=r2; }
    for (const k2 of Object.keys(spots)) if(k2!==k&&meshes[k2]&&k2>k){ const r=[depth(k2,k),depth(k,k2)].filter(Boolean).sort((x,y)=>y.mm-x.mm)[0]; if(r) who['gun:'+k2]=r; }
    out[k]={kind:s.kind, st:s.station||'', who}; }
  window.__lastWorld=m.position.clone();
  return out; };
'ok'
