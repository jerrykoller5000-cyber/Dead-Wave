// Geometry-only queries. Bounds prune candidates; actual triangles establish contact.
import {BackSide, Box3, Matrix4, Ray, Triangle, Vector3} from '../../vendor/three/three.core.js';
import {clipException} from '../../core/clip-exceptions.js';

const EPS = 0.0005; // metres
const axes = ['x','y','z'];
const point = new Vector3(), edge = new Vector3(), hit = new Vector3();
const ray = new Ray();
const insideDirection = new Vector3(0.81731,0.36179,0.44717).normalize();

function boxDistance(a, b) {
  let d = 0;
  for (const k of axes) {
    const gap = Math.max(0, a.min[k]-b.max[k], b.min[k]-a.max[k]);
    d += gap*gap;
  }
  return d;
}

function tree(faces) {
  const box = new Box3();
  for (const f of faces) box.union(f.box);
  if (faces.length <= 10) return {box, faces};
  const span = box.getSize(new Vector3());
  const axis = axes.reduce((best,k) => span[k] > span[best] ? k : best);
  faces.sort((a,b) => a.center[axis]-b.center[axis]);
  const mid = faces.length >> 1;
  return {box, left:tree(faces.slice(0,mid)), right:tree(faces.slice(mid))};
}

function surfaces(mesh, transform, label) {
  const geom = mesh.geometry, attr = geom.attributes.position, index = geom.index;
  const vertices = [], faces = [], byKey = new Map(), parents=[];
  const root=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
  const vertex = i => {
    point.fromBufferAttribute(attr, i).applyMatrix4(transform);
    const key = axes.map(k=>Math.round(point[k]*1e8)).join(',');
    if (!byKey.has(key)) { byKey.set(key, vertices.length); parents.push(vertices.length); vertices.push(point.clone()); }
    return byKey.get(key);
  };
  const count = index ? index.count : attr.count;
  for (let i=0; i+2<count; i+=3) {
    const ids = [0,1,2].map(n=>vertex(index ? index.getX(i+n) : i+n));
    if (new Set(ids).size !== 3) continue;
    const p = ids.map(k=>vertices[k]);
    const tri = new Triangle(...p);
    if (tri.getArea() < 1e-15) continue;
    parents[root(ids[1])]=root(ids[0]); parents[root(ids[2])]=root(ids[0]);
    faces.push({tri,p,ids,box:new Box3().setFromPoints(p),center:tri.getMidpoint(new Vector3())});
  }
  // Material batching, panel checkering and instanced decoration can put many
  // disconnected objects in one geometry. Each island needs its own support.
  const islands=new Map();
  for (const face of faces) {
    const key=root(face.ids[0]);
    if(!islands.has(key)) islands.set(key,[]);
    islands.get(key).push(face);
  }
  return [...islands.values()].map((faces,i)=>{
    const edges=new Map(),segments=[],points=new Set();
    for (const {ids} of faces) for (let k=0;k<3;k++) {
      const a=ids[k], b=ids[(k+1)%3], key=a<b?a+','+b:b+','+a;
      points.add(vertices[a]);
      if (!edges.has(key)) segments.push([vertices[a],vertices[b]]);
      edges.set(key,(edges.get(key)||0)+1);
    }
    const node=tree(faces);
    return {label:islands.size===1?label:label+'~'+i,mesh,vertices:[...points],segments,faces,
      tree:node,box:node.box,closed:[...edges.values()].every(n=>n===2)};
  });
}

// Closest points on two bounded segments, including parallel and crossed edges.
const u = new Vector3(), v = new Vector3(), w = new Vector3();
const clamp = n => Math.max(0, Math.min(1,n));
function edgeDistance(a,b,c,d) {
  u.subVectors(b,a); v.subVectors(d,c); w.subVectors(a,c);
  const uu=u.lengthSq(), vv=v.lengthSq(), uv=u.dot(v), uw=u.dot(w), vw=v.dot(w);
  const den=uu*vv-uv*uv;
  let s = den > 1e-26 ? clamp((uv*vw-vv*uw)/den) : 0;
  let t = (uv*s+vw)/vv;
  if (t<0) { t=0; s=clamp(-uw/uu); }
  if (t>1) { t=1; s=clamp((uv-uw)/uu); }
  return w.addScaledVector(u,s).addScaledVector(v,-t).lengthSq();
}

function crosses(a,b,tri) {
  edge.subVectors(b,a);
  const len=edge.length();
  ray.set(a,edge.divideScalar(len));
  return ray.intersectTriangle(tri.a,tri.b,tri.c,false,hit) && hit.distanceToSquared(a)<=len*len;
}

function facesTouch(a,b,tol2) {
  if (boxDistance(a.box,b.box)>tol2) return false;
  for (let i=0;i<3;i++) {
    const x=a.p[i], y=a.p[(i+1)%3], z=b.p[i], end=b.p[(i+1)%3];
    if (b.tri.closestPointToPoint(x,point).distanceToSquared(x)<=tol2 ||
        a.tri.closestPointToPoint(z,point).distanceToSquared(z)<=tol2 ||
        crosses(x,y,b.tri) || crosses(z,end,a.tri)) return true;
    for (let j=0;j<3;j++) if (edgeDistance(x,y,b.p[j],b.p[(j+1)%3])<=tol2) return true;
  }
  return false;
}

function surfacesTouch(a,b,tol2) {
  if (boxDistance(a.box,b.box)>tol2) return false;
  if (a.faces && b.faces) return a.faces.some(f=>b.faces.some(g=>facesTouch(f,g,tol2)));
  if (!a.faces && (b.faces || a.box.getSize(point).lengthSq()>b.box.getSize(edge).lengthSq())) {
    return surfacesTouch(a.left,b,tol2) || surfacesTouch(a.right,b,tol2);
  }
  return surfacesTouch(a,b.left,tol2) || surfacesTouch(a,b.right,tol2);
}

function nearFace(p,node,tolerance) {
  if (node.box.distanceToPoint(p)>tolerance) return false;
  if (node.faces) return node.faces.some(f=>
    f.tri.closestPointToPoint(p,point).distanceToSquared(p)<=tolerance*tolerance);
  return nearFace(p,node.left,tolerance) || nearFace(p,node.right,tolerance);
}

function depthToSurface(p,node,best=Infinity) {
  if (node.box.distanceToPoint(p)>=best) return best;
  if (node.faces) {
    for (const {tri} of node.faces) best=Math.min(best,tri.closestPointToPoint(p,point).distanceTo(p));
    return best;
  }
  const first=node.left.box.distanceToPoint(p)<node.right.box.distanceToPoint(p)?node.left:node.right;
  return depthToSurface(p,first===node.left?node.right:node.left,depthToSurface(p,first,best));
}

function inside(p,host) {
  ray.set(p,insideDirection);
  const crossings=[];
  function visit(node) {
    if (!ray.intersectsBox(node.box)) return;
    if (node.faces) {
      for (const {tri} of node.faces) {
        if (ray.intersectTriangle(tri.a,tri.b,tri.c,false,hit)) crossings.push(p.distanceTo(hit));
      }
    } else { visit(node.left); visit(node.right); }
  }
  visit(host.tree);
  crossings.sort((a,b)=>a-b);
  return crossings.filter((x,i)=>!i || x-crossings[i-1]>1e-8).length%2===1;
}

function penetration(part,host,depth) {
  if (!host.closed) return null;
  // A witness must lie farther than the specified seating depth from EVERY host face.
  const inner = host.box.clone().expandByScalar(-depth);
  if (!inner.intersectsBox(part.box)) return null;
  const buried = p => inner.containsPoint(p) && !nearFace(p,host.tree,depth) && inside(p,host);
  for (const p of part.vertices) if (buried(p)) return p;
  for (const f of part.faces) if (buried(f.center)) return f.center;
  // Long crossing pieces can have all their corners and face centres outside
  // the other solid. Clip their edges to the candidate region and sample it.
  const dir=new Vector3(), probe=new Vector3();
  for (const [start,end] of part.segments) {
    dir.subVectors(end,start);
    let lo=0,hi=1;
    for (const k of axes) {
      if (Math.abs(dir[k])<1e-14) {
        if (start[k]<inner.min[k] || start[k]>inner.max[k]) { hi=-1; break; }
      } else {
        const a=(inner.min[k]-start[k])/dir[k], b=(inner.max[k]-start[k])/dir[k];
        lo=Math.max(lo,Math.min(a,b)); hi=Math.min(hi,Math.max(a,b));
      }
    }
    if (hi>lo && buried(probe.copy(start).addScaledVector(dir,(lo+hi)/2))) return probe;
  }
  return null;
}

// The gameplay-camera review uses these same labelled islands and triangles.
export function visiblePieces(root,metresPerUnit=1,ignore=[]) {
  root.updateWorldMatrix(true,true);
  const parts=[], excluded=new Set(ignore);
  const origin = new Matrix4().makeScale(metresPerUnit,metresPerUnit,metresPerUnit);
  function walk(o,path) {
    if (!o.visible || excluded.has(o)) return;
    if (o.isMesh && o.geometry?.attributes?.position) {
      const base=new Matrix4().multiplyMatrices(origin,o.matrixWorld);
      for(let i=0;i<(o.isInstancedMesh?o.count:1);i++) {
        const m=base.clone();
        if(o.isInstancedMesh) { const ins=new Matrix4(); o.getMatrixAt(i,ins); m.multiply(ins); }
        parts.push(...surfaces(o,m,o.isInstancedMesh?path+'#'+i:path));
      }
    }
    o.children.forEach((kid,i)=>walk(kid,path+'/'+(kid.name||kid.geometry?.type||'group')+'['+i+']'));
  }
  walk(root,'root');
  return parts;
}

// The offline camera review can outlive a live edit to a model. Refuse a
// comparison if the strict catalog and the rendered review built different art.
export function artworkFingerprint(parts) {
  let hash=2166136261;
  const mix=n=>{hash=Math.imul(hash^(n|0),16777619)>>>0;};
  for(const p of parts){
    for(let i=0;i<p.label.length;i++) mix(p.label.charCodeAt(i));
    mix(p.vertices.length); mix(p.faces.length);
    for(const v of p.vertices){mix(Math.round(v.x*1e8));mix(Math.round(v.y*1e8));mix(Math.round(v.z*1e8));}
    for(const f of p.faces){mix(f.ids[0]);mix(f.ids[1]);mix(f.ids[2]);}
  }
  return hash.toString(16).padStart(8,'0');
}

// Surface-gap bounds in millimetres for the meshes actually drawn, including contained pieces.
export function visibleSurfaceGap(left,right,metresPerUnit=1) {
  const a=visiblePieces(left,metresPerUnit),b=visiblePieces(right,metresPerUnit);
  if(!a.length || !b.length) throw Error('Missing visible contact surface');
  const pairs=[];
  for(const x of a) for(const y of b) pairs.push({x,y,bound:boxDistance(x.box,y.box)});
  pairs.sort((x,y)=>x.bound-y.bound);
  for(const {x,y,bound} of pairs) {
    if(bound>0) break;
    if(penetration(x,y,1e-7) || penetration(y,x,1e-7)) return {lowerMm:0,upperMm:0,penetrating:true};
  }
  const touches=d=>{
    for(const {x,y,bound} of pairs) {
      if(bound>d*d) break;
      if(surfacesTouch(x.tree,y.tree,d*d)) return true;
    }
    return false;
  };
  let lo=0,hi=.002;
  while(!touches(hi))hi*=2;
  while(hi-lo>.00001){
    const mid=(hi+lo)/2;
    if(touches(mid))hi=mid;else lo=mid;
  }
  return {lowerMm:1000*lo,upperMm:1000*hi};
}

// Check only the joints crossing the actual posed sling and its weapon. The catalog covers the gun itself.
export function makeSlingAudit(spot,metresPerUnit,webClearance=0) {
  const gun=visiblePieces(spot.gun,metresPerUnit);
  return ()=>checkSling(spot,metresPerUnit,gun,webClearance);
}

export function auditSling(spot,metresPerUnit) {
  return makeSlingAudit(spot,metresPerUnit)();
}

function checkSling(spot,metresPerUnit,gun,webClearance) {
  const clipMeshes=spot.sling.userData.clips||[];
  const webParts=visiblePieces(spot.sling,metresPerUnit,clipMeshes);
  const clipParts=clipMeshes.map(m=>visiblePieces(m,metresPerUnit));
  if(!webParts.length || clipParts.length!==2 || clipParts.some(c=>!c.length) || !gun.length) {
    throw Error('Incomplete sling '+spot.kind+' (web '+webParts.length+', clips '+
      clipParts.map(c=>c.length).join('/')+', weapon '+gun.length+', scale '+spot.gun.getWorldScale(new Vector3()).toArray().join('/')+')');
  }
  const ends=clipParts.map(clip=>{
    const near=gun.filter(p=>clip.some(c=>boxDistance(c.box,p.box)<.1*.1));
    let lo=0, hi=.1;
    const touches=distance=>near.some(p=>clip.some(c=>surfacesTouch(c.tree,p.tree,distance*distance)));
    const inRange=touches(hi);
    if(inRange) while(hi-lo>.00001) {
      const mid=(lo+hi)/2; if(touches(mid)) hi=mid; else lo=mid;
    }
    return {gunGapMm:inRange?+(hi*1000).toFixed(2):null,gunContact:touches(EPS),
      webContact:webParts.some(w=>clip.some(c=>surfacesTouch(w.tree,c.tree,EPS*EPS)))};
  });
  const overlaps=[];
  for(const element of [...webParts,...clipParts.flat()]) for(const part of gun) {
    if(boxDistance(element.box,part.box)>0) continue;
    const witness=penetration(element,part,EPS) || penetration(part,element,EPS);
    if(witness) {
      const end=clipParts.findIndex(pieces=>pieces.includes(element));
      const row={sling:end<0?'web':'clip'+(end+1),gun:part.label,at:witness.toArray().map(x=>+x.toFixed(5))};
      if(end<0) {
        const local=element.mesh.worldToLocal(witness.clone().multiplyScalar(1/metresPerUnit));
        const pos=element.mesh.geometry.attributes.position,uv=element.mesh.geometry.attributes.uv;
        if(uv) {
          let near=Infinity;
          for(let i=0;i<pos.count;i++){
            const d=point.fromBufferAttribute(pos,i).distanceToSquared(local);
            if(d<near){near=d;row.strapU=+uv.getY(i).toFixed(3);}
          }
        }
      }
      overlaps.push(row);
    }
  }
  const nearWeb=webClearance>0 && webParts.some(w=>gun.some(p=>
    boxDistance(w.box,p.box)<=webClearance**2 && surfacesTouch(w.tree,p.tree,webClearance**2)));
  return {ends,overlaps,nearWeb};
}

// Detail seats are one-sided. Trace the actual entry and exit faces below the
// centre and outline of a drawn detail; a shallow host can be pierced even
// when no point sits half a millimetre inside it.
function detailFrame(part, metresPerUnit) {
  const spec = part.mesh.userData.detailSeat;
  if (!spec || !axes.includes(spec.axis) || ![1,-1].includes(spec.side) || !(spec.depth > 0)) return null;
  const parent = part.mesh.parent, axis = new Vector3();
  axis[spec.axis] = spec.side;
  const local = part.mesh.position.clone().addScaledVector(axis,spec.surface);
  const origin = parent.localToWorld(local.clone()).multiplyScalar(metresPerUnit);
  const direction = parent.localToWorld(local.add(axis)).multiplyScalar(metresPerUnit).sub(origin);
  const depth = spec.depth * direction.length();
  direction.normalize();
  const sampleMap = new Map();
  let bottom = Infinity, top = -Infinity;
  for (const vertex of part.vertices) {
    const relative = vertex.clone().sub(origin), level = relative.dot(direction);
    bottom = Math.min(bottom,level); top = Math.max(top,level);
    relative.addScaledVector(direction,-level);
    const key = relative.toArray().map(x=>Math.round(x*1e7)).join(',');
    const sample = sampleMap.get(key);
    if (!sample || level < sample.level) sampleMap.set(key,{offset:relative,level});
  }
  const samples = [{offset:new Vector3(),level:bottom}, ...sampleMap.values()];
  return {origin,direction,depth,top,samples,spec,host:spec.hostIndex===undefined?null:parent.children[spec.hostIndex]};
}

function crossingLevels(start,direction,host,reach) {
  const scan = new Ray(start.clone().addScaledVector(direction,reach),direction.clone().negate());
  const hits = [], at = new Vector3();
  function visit(node) {
    if (!scan.intersectsBox(node.box)) return;
    if (!node.faces) { visit(node.left); visit(node.right); return; }
    for (const {tri} of node.faces) {
      if (scan.intersectTriangle(tri.a,tri.b,tri.c,false,at)) hits.push(reach-scan.origin.distanceTo(at));
    }
  }
  visit(host.tree);
  hits.sort((a,b)=>b-a);
  return hits.filter((x,i)=>!i || hits[i-1]-x>1e-8);
}

function inspectDetailSeat(frame,host) {
  if (!host.closed || (frame.host && frame.host!==host.mesh)) return null;
  const {origin,direction,depth,top,samples} = frame, precision=0.00002;
  if (host.box.distanceToPoint(origin)>EPS) return null;
  // Start beyond the host's bounds even when it is tilted relative to this seat.
  const reach=origin.distanceTo(host.box.getCenter(new Vector3()))+host.box.getSize(new Vector3()).length()+EPS;
  let nearest=Infinity, deepest=0;
  for (let i=0;i<samples.length;i++) {
    const {offset,level}=samples[i], start=origin.clone().addScaledVector(offset,.999);
    const hits=crossingLevels(start,direction,host,reach);
    let entry,exit;
    for(let j=0;j+1<hits.length;j+=2) {
      if(Math.abs(hits[j])<=EPS && (entry===undefined || Math.abs(hits[j])<Math.abs(entry))) {
        entry=hits[j];exit=hits[j+1];
      }
    }
    if(entry===undefined) { if(i===0)return null; continue; }
    if(i===0)nearest=Math.abs(entry);
    deepest=Math.max(deepest,entry-level);
    if(level<exit-precision)return {nearest,reason:'through far face',amount:exit-level,at:start.clone().addScaledVector(direction,exit)};
    if(entry-level>depth+precision || (i===0 && entry>top+precision)) {
      return {nearest,reason:'past detail seat',amount:Math.max(entry-level-depth,entry-top),at:start.clone().addScaledVector(direction,entry)};
    }
  }
  return Number.isFinite(nearest)?{nearest,depth:deepest}:null;
}

// A connected island wholly inside a closed solid cannot be seen through its
// outside surface. A coincident, touching, or emerging face stays unresolved.
export function enclosedArtwork(inner, host) {
  if (!host.closed || !host.box.containsBox(inner.box)) return null;
  const materials=Array.isArray(host.mesh.material)?host.mesh.material:[host.mesh.material];
  if (!materials.length || materials.some(m=>!m || m.visible===false || m.transparent || m.opacity!==1 || m.alphaTest>0 ||
      m.alphaHash || m.alphaMap || m.alphaToCoverage || m.transmission>0 || m.wireframe || m.colorWrite===false || m.depthWrite===false ||
      m.side===BackSide || m.clippingPlanes?.length || m.isShaderMaterial || m.opacityNode || m.maskNode || m.positionNode || m.vertexNode)) return null;
  if (surfacesTouch(inner.tree,host.tree,1e-14) || !inside(inner.vertices[0],host)) return null;
  // Distance to the nearest box wall bounds the distance to the real surface,
  // including for a concave host. Bound the entire island, not a single witness.
  const maximum = Math.min(...axes.map(k => Math.min(
    (host.box.max[k]-host.box.min[k])/2,
    inner.box.max[k]-host.box.min[k], host.box.max[k]-inner.box.min[k]
  )));
  return {maximum};
}

function hiddenException(part,host,pose,lookup) {
  const inner=part.mesh.userData.clipPart, outer=host.mesh.userData.clipPart;
  if (!pose || !inner || !outer || !lookup(inner,outer,pose,0)) return null;
  const buried=enclosedArtwork(part,host);
  if (!buried) return null;
  const rule=lookup(inner,outer,pose,buried.maximum);
  return rule && {id:rule.id,inner,outer,pose,maximum:buried.maximum,reason:rule.reason};
}

export function auditWeapon(root, {metresPerUnit=1, ignore=[], seats=[], sources,pose,lookup=clipException}={}) {
  const parts=visiblePieces(root,metresPerUnit,ignore);
  const byMesh=new Map();
  for(const part of parts) {
    if(!byMesh.has(part.mesh)) byMesh.set(part.mesh,[]);
    byMesh.get(part.mesh).push(part);
  }
  const allowances=new Map(), unseated=[];
  for (const {part,host,depth=0} of seats) {
    const pieces=byMesh.get(part), supports=byMesh.get(host);
    if (!pieces || !supports || !Number.isFinite(depth) || depth<0) throw Error('Invalid required model seat');
    for (const a of pieces) {
      for (const b of supports) allowances.set(a.label+'|'+b.label,depth);
      if (!supports.some(b=>surfacesTouch(a.tree,b.tree,EPS*EPS))) unseated.push({part:a.label,host:supports[0].label});
    }
  }
  const detailSeats=[], detailBreaches=[], approvedDetails=new Map();
  for(const part of parts) {
    const frame=detailFrame(part,metresPerUnit);
    if(!frame)continue;
    let best;
    for(const host of parts) {
      if(host===part || boxDistance(host.box,part.box)>EPS*EPS)continue;
      if(!frame.host && host.mesh.userData.detailSeat)continue;
      const seat=inspectDetailSeat(frame,host);
      if(seat && (!best || seat.nearest<best.seat.nearest))best={host,seat};
    }
    if(!best)continue;
    const {host,seat}=best;
    const row={part:part.label,host:host.label,kind:frame.spec.kind};
    if(seat.reason)detailBreaches.push({...row,reason:seat.reason,excessMm:+(seat.amount*1000).toFixed(3),
      at:seat.at.toArray().map(x=>+x.toFixed(6)),localPart:part.mesh.position.toArray(),localGroup:part.mesh.parent.position.toArray(),
      hostSource:sources?.get(host.mesh)});
    else {
      detailSeats.push({...row,depthMm:+(seat.depth*1000).toFixed(3)});
      approvedDetails.set(part.label+'|'+host.label,frame.depth);
    }
  }
  const parents=parts.map((_,i)=>i);
  const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
  const overlaps=[], rawOverlaps=[], excusedSeats=[];
  for(let i=0;i<parts.length;i++) for(let j=0;j<i;j++) {
    const a=parts[i], b=parts[j];
    if(boxDistance(a.box,b.box)>EPS*EPS) continue;
    const ab=a.label+'|'+b.label,ba=b.label+'|'+a.label;
    const permitted=allowances.get(ab) ?? allowances.get(ba) ?? approvedDetails.get(ab) ?? approvedDetails.get(ba) ?? 0;
    let host=b, witness=penetration(a,b,permitted+EPS);
    if (!witness) { host=a; witness=penetration(b,a,permitted+EPS); }
    if(witness) {
      const row={a:a.label,b:b.label,at:witness.toArray().map(x=>+x.toFixed(5))};
      if (sources) {
        row.host=host.label;
        row.witnessDepthMm=+(1000*depthToSurface(witness,host.tree)).toFixed(3);
        row.sourceA=sources.get(a.mesh); row.sourceB=sources.get(b.mesh);
      }
      rawOverlaps.push(row);
      const named=hiddenException(a,b,pose,lookup) || hiddenException(b,a,pose,lookup);
      if (named) excusedSeats.push({...row,...named});
      else overlaps.push(row);
    }
    if(find(i)!==find(j) && (witness || surfacesTouch(a.tree,b.tree,EPS*EPS))) parents[find(i)]=find(j);
  }
  const groups=new Map();
  for(let i=0;i<parts.length;i++){
    const key=find(i); if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(parts[i]);
  }
  const components=[...groups.values()].sort((a,b)=>b.length-a.length);
  const describe = p => ({path:p.label, at:p.mesh.position.toArray().map(x=>+x.toFixed(5)), source:sources?.get(p.mesh)});
  function looseGroup(group) {
    const result={members:group.map(p=>p.label),at:group[0].box.getCenter(new Vector3()).toArray().map(x=>+x.toFixed(5))};
    if(!sources) return result;
    const others=parts.filter(p=>!group.includes(p));
    let best=Infinity;
    for(const a of group) {
      const candidates=others.map(b=>({b,d:boxDistance(a.box,b.box)})).sort((x,y)=>x.d-y.d);
      for(const {b,d} of candidates) {
        if(d>=best*best) break;
        let high=Number.isFinite(best)?best:Math.sqrt(d)+.025;
        while(!surfacesTouch(a.tree,b.tree,high*high)) {
          if(Number.isFinite(best)) break;
          high*=2;
        }
        if(!surfacesTouch(a.tree,b.tree,high*high)) continue;
        let low=Math.sqrt(d);
        while(high-low>.000025) {
          const mid=(high+low)/2;
          if(surfacesTouch(a.tree,b.tree,mid*mid)) high=mid; else low=mid;
        }
        if(high<best) {best=high; result.closest={part:describe(a),other:describe(b),gapMm:+(1000*high).toFixed(2)};}
      }
    }
    result.first=describe(group[0]);
    return result;
  }
  return {parts:parts.length, artworkFingerprint:sources?artworkFingerprint(parts):undefined, openSurfaces:parts.filter(p=>!p.closed).length,
    loose:components.slice(1).map(looseGroup),
    rawOverlaps,overlaps,excusedSeats,unseated,detailSeats,detailBreaches};
}
