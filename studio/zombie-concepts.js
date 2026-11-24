import {refineBrute} from "./zombie-brute.js";
// GP-161: cosmetic meshes from review/zombie-types/GPT-Concepts. Joint transforms,
// hit logic and animation remain owned by the original rigs. No random/world state.
import {detailUV,detailMaterial} from "./zombie-detail.js";
import {skinMergeGroup} from "./../core/skin-merge.js";
import {blendZombieJoins} from "./../combat/zombie-joins.js";
import {sculptGuardian} from "./zombie-guardian-detail.js";
import {sculptDemon} from "./../combat/demon-visual.js";
import {refineZombieFace,refineHeavyArmor} from "./../combat/zombie-fidelity.js";
import {refineHumanoid,humanoidPivots} from "./zombie-humanoids.js";
export const CONCEPT_TYPES = Object.freeze(['shambler','feral','brute','military','spitter','bomber','screamer','drowned','leaper','spider','colossus','demon','guardian','caveguard']);

// GP-19937: the one spitter found asleep in the medical convoy. Clone materials
// before tinting so ordinary spitters (and the concept template) keep their look.
export function prepareConvoySleeperAppearance(T, g) {
  if (!g || g.userData?.convoySleeperLook) return g;
  const clones = new Map(), blue = new T.Color(0x507f8d), glow = new T.Color(0x8beaff);
  const eyeMaterials = new Set([...(g.userData.eyeMats || []), ...(g.userData.eyes || []).map(e => e.material)]);
  const tinted = (source) => {
    if (!source) return source;
    if (clones.has(source)) return clones.get(source);
    const m = source.clone(); clones.set(source, m);
    if (m.color) m.color.lerp(blue, m.userData?.surface === 'cloth' ? 0.62 : 0.72);
    if (m.emissive && m.emissive.getHex() !== 0) {
      m.color.lerp(glow, 0.42);
      m.emissive.copy(glow); m.emissiveIntensity = Math.max(eyeMaterials.has(source) ? 1.8 : 1.5, m.emissiveIntensity || 0);
      if (eyeMaterials.has(source)) m.userData.baseEmissive = m.emissiveIntensity;
    }
    return m;
  };
  g.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(tinted) : tinted(o.material); });
  const u = g.userData;
  for (const key of ['bodyMats', 'pulseMats', 'eyeMats', 'mats']) if (Array.isArray(u[key])) u[key] = u[key].map(m => clones.get(m) || m);
  if (u.torso?.userData?.bodyMat) u.torso.userData.bodyMat = clones.get(u.torso.userData.bodyMat) || u.torso.userData.bodyMat;
  // GP-19939: the visible eyes now live in the skinned body draw. Tint their
  // packed emissive bytes as well as the hidden source material whose intensity
  // drives that draw, without recolouring an ordinary spitter's shared source.
  const eyeGlow = u.eyeMats?.[0]?.emissive;
  if (eyeGlow) for (const skin of u.skinMeshes || []) {
    const range = skin.userData.eyeGlowRange, attr = skin.geometry?.attributes?.zGlow;
    if (!range || !attr) continue;
    for (let i = range[0]; i < range[0] + range[1]; i++) {
      attr.array[i * 4] = Math.round(eyeGlow.r * 255);
      attr.array[i * 4 + 1] = Math.round(eyeGlow.g * 255);
      attr.array[i * 4 + 2] = Math.round(eyeGlow.b * 255);
    }
    attr.needsUpdate = true;
  }
  u.convoySleeperLook = true;
  return g;
}
const templates = new WeakMap();
function bones(u){
  const out={hips:u.hips,torso:u.torso,head:u.head};
  if (u.shamblerJaw) out.shamblerJaw = u.shamblerJaw;
  for(const S of ['L','R']){out['arm'+S]=u['arm'+S+'G'];out['elbow'+S]=out['arm'+S]?.userData.elbowG;out['leg'+S]=u['leg'+S+'G'];out['shin'+S]=out['leg'+S]?.userData.shinG;
    for(const [name,bone]of Object.entries(out['elbow'+S]?.userData.hand?.bones||{}))out['hand:'+S+':'+name]=bone;}
  (u.crawlLimbs||[]).forEach((l,i)=>{out['crawl'+i]=l.root;out['knee'+i]=l.knee;});return out;
}
// GP-20146 / J162: cache the complete rigid part tree; geometry stays shared,
// while each body owns its materials and mutable metadata.
function cacheData(value, seen = new Map()) {
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  if (value.isObject3D) throw new Error('Concept part metadata needs a named rig reference');
  if (ArrayBuffer.isView(value)) return value.slice();
  if (value.clone && value.constructor !== Object) return value.clone();
  const out = Array.isArray(value) ? [] : {};
  seen.set(value, out);
  for (const [key, item] of Object.entries(value)) out[key] = cacheData(item, seen);
  return out;
}
function cachePart(node, copy, keep) {
  const part = {
    kind: node.isMesh ? 'mesh' : node.isGroup ? 'group' : 'object',
    name: node.name, position: node.position.clone(), quaternion: node.quaternion.clone(),
    scale: node.scale.clone(), visible: node.visible, castShadow: node.castShadow,
    receiveShadow: node.receiveShadow, renderOrder: node.renderOrder,
    frustumCulled: node.frustumCulled, layers: node.layers.mask,
    matrixAutoUpdate: node.matrixAutoUpdate, userData: cacheData(node.userData), children: []
  };
  if (node.isMesh) { part.geometry = node.geometry; part.material = copy(node.material); }
  for (const child of node.children) if (!keep.has(child)) part.children.push(cachePart(child, copy, keep));
  return part;
}
function restorePart(T, part, copy) {
  const node = part.kind === 'mesh' ? new T.Mesh(part.geometry, copy(part.material))
    : part.kind === 'group' ? new T.Group() : new T.Object3D();
  node.name = part.name; node.position.copy(part.position); node.quaternion.copy(part.quaternion);
  node.scale.copy(part.scale); node.visible = part.visible; node.castShadow = part.castShadow;
  node.receiveShadow = part.receiveShadow; node.renderOrder = part.renderOrder;
  node.frustumCulled = part.frustumCulled; node.layers.mask = part.layers;
  node.userData = cacheData(part.userData); node.updateMatrix(); node.matrixAutoUpdate = part.matrixAutoUpdate;
  for (const child of part.children) node.add(restorePart(T, child, copy));
  return node;
}
function remember(T,g,key){
  const u=g.userData,materials=new Map(),copy=m=>{if(Array.isArray(m))return m.map(copy);if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};
  const parts=[],keep=new Set(u.eyes||[]);for(const [bone,p]of Object.entries(bones(u)))for(const m of p?.children||[])if(m.isMesh&&!keep.has(m)){
    parts.push({bone,node:cachePart(m,copy,keep)});
  }
  const tpl={sharedFit:{head:{cc355Crown:u.head.userData.cc355Crown,cc355CrownY:u.head.userData.cc355CrownY},torso:{cc355Scale:u.torso.userData.cc355Scale,cc355TorsoAt:u.torso.userData.cc355TorsoAt}},parts,body:u.bodyMats.map(copy),pulse:u.pulseMats.map(copy),ember:u.emberMat?copy(u.emberMat):null,concept:{...u.concept},eyes:u.eyes.map(e=>({position:e.position.clone(),scale:e.scale.clone(),color:e.material.color.clone(),emissive:e.material.emissive.clone(),emissiveIntensity:e.material.emissiveIntensity,baseEmissive:e.material.userData.baseEmissive}))};
  if (u.shamblerJaw) tpl.shamblerJawPivot = u.shamblerJaw.position.clone();
  let map=templates.get(T);if(!map){map=new Map();templates.set(T,map);}map.set(key,tpl);
}
function restore(T,g,key,k){
  const tpl=templates.get(T)?.get(key);if(!tpl)return false;
  const u = g.userData;
  if (tpl.shamblerJawPivot) {
    const jaw = u.shamblerJaw || new T.Group();
    jaw.name = 'shambler-jaw';
    jaw.position.copy(tpl.shamblerJawPivot);
    jaw.rotation.set(0, 0, 0);
    jaw.scale.setScalar(1);
    if (jaw.parent !== u.head) u.head.add(jaw);
    u.shamblerJaw = jaw;
  }
  const bs=bones(u),materials=new Map(),copy=m=>{if(Array.isArray(m))return m.map(copy);if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};
  stripMeshes(g,new Set(u.eyes));
  for(const p of tpl.parts){if(!bs[p.bone])throw new Error('Concept cache missing rig bone '+p.bone);const m=restorePart(T,p.node,copy);bs[p.bone].add(m);
    if(m.userData.compacted){if(p.bone.startsWith('leg'))bs[p.bone].userData.thigh=m;if(p.bone.startsWith('arm'))bs[p.bone].userData.upper=m;if(p.bone==='torso')bs.torso.userData.bodyMat=m.material;}}
  tpl.eyes.forEach((e,i)=>{const eye=u.eyes[i];eye.position.copy(e.position);eye.scale.copy(e.scale);eye.material.color.copy(e.color);eye.material.emissive.copy(e.emissive);eye.material.emissiveIntensity=e.emissiveIntensity;eye.material.userData.baseEmissive=e.baseEmissive;});
  u.bodyMats=tpl.body.map(copy);u.pulseMats=tpl.pulse.map(copy);if(tpl.ember)u.emberMat=copy(tpl.ember);u.concept={...tpl.concept};if(tpl.sharedFit){Object.assign(u.head.userData,tpl.sharedFit.head);Object.assign(u.torso.userData,tpl.sharedFit.torso);}return true;
}

function mergeEyes(T,g){
  const eyes=g.userData.eyes||[];if(eyes.length!==2)return;
  const pos=[],norm=[];
  for(const eye of eyes){
    eye.updateMatrix();const source=eye.geometry,geo=source.index?source.toNonIndexed():source.clone();
    geo.applyMatrix4(eye.matrix);
    pos.push(...geo.attributes.position.array);norm.push(...geo.attributes.normal.array);geo.dispose();
    eye.visible=false;
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(norm,3));
  const batch=new T.Mesh(geo,eyes[0].material);batch.name='zombie-eyes';batch.castShadow=false;g.userData.head.add(batch);
  g.userData.eyeBatch=batch;
}

function sculpt(T, s, rbox) {
  const mats = [];
  const mat = (color, glow = false, metalness = 0, surface = 'skin') => {
    const m = new T.MeshStandardMaterial({color, roughness: glow ? .48 : .86, metalness,
      ...(glow ? {emissive:color, emissiveIntensity:1.5} : {})}); m.userData.surface=surface;mats.push(m); return m;
  };
  const put = (p, geo, m, x=0,y=0,z=0,rx=0,ry=0,rz=0) => {
    const o=new T.Mesh(geo,m);o.position.set(x*s,y*s,z*s);o.rotation.set(rx,ry,rz);
    o.castShadow=true;o.name='concept-surface';p.add(o);return o;
  };
  const egg = (p,m,x,y,z,w,h,d,rz=0) => {
    const large=Math.min(w,h,d)>.12;
    const geo=new T.SphereGeometry(1,large?8:6,large?4:3);
    const o=put(p,geo,m,x,y,z,0,0,rz);o.scale.set(w*s/2,h*s/2,d*s/2);return o;
  };
  const rock = (p,m,x,y,z,w,h,d,rz=0) => {
    const o=put(p,new T.DodecahedronGeometry(1,0),m,x,y,z,.12,.3,rz);o.scale.set(w*s/2,h*s/2,d*s/2);return o;
  };
  const box = (p,m,x,y,z,w,h,d,rz=0) => {
    const thin=Math.min(w,h,d)<.09;
    return put(p,thin?new T.BoxGeometry(w*s,h*s,d*s):rbox(w*s,h*s,d*s,Math.min(w,h,d)*s*.16),m,x,y,z,0,0,rz);
  };
  const rod = (p,m,a,b,ra,rb=ra,n=6) => {
    const A=new T.Vector3(...a).multiplyScalar(s),B=new T.Vector3(...b).multiplyScalar(s),v=B.clone().sub(A);
    const o=put(p,new T.CylinderGeometry(rb*s,ra*s,v.length(),n,1),m);
    o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;
  };
  const path=(p,m,pts,r=.025,end=r/pts.length)=>{
    if(pts.length<2)return null;
    const curve=new T.CatmullRomCurve3(pts.map(v=>new T.Vector3(...v))),steps=Math.max(1,pts.length-1),sides=4;
    const pos=[],idx=[],N=new T.Vector3(),B=new T.Vector3();
    for(let j=0;j<=steps;j++){
      const t=j/steps,P=curve.getPoint(t),D=curve.getTangent(t),radius=Math.max(.0002,r+(end-r)*t);
      if(!j)N.set(0,Math.abs(D.y)<.9?1:0,Math.abs(D.y)<.9?0:1).cross(D).normalize();
      else N.addScaledVector(D,-N.dot(D)).normalize();
      B.crossVectors(D,N).normalize();
      for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,V=P.clone().addScaledVector(N,Math.cos(a)*radius).addScaledVector(B,Math.sin(a)*radius);pos.push(V.x*s,V.y*s,V.z*s);
        if(j<steps){const x=j*sides+i,y=j*sides+(i+1)%sides;idx.push(x,y,x+sides,y,y+sides,x+sides);}}
    }
    for(const edge of [0,steps]){const P=curve.getPoint(edge/steps),c=pos.length/3;pos.push(P.x*s,P.y*s,P.z*s);for(let i=0;i<sides;i++){const a=edge*sides+i,b=edge*sides+(i+1)%sides;idx.push(c,...(edge?[a,b]:[b,a]));}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();return put(p,geo,m);
  };
  // Extend only a tooth's hidden root; the crown and its normals stay exact.
  const spike = (p,m,a,b,r=.035,seat) => {
    const o=rod(p,m,a,b,r,0,5);
    if(!seat)return o;
    const source=o.geometry,P=source.attributes.position,N=source.attributes.normal,U=source.attributes.uv;
    const delta=new T.Vector3(...seat).sub(new T.Vector3(...a)).multiplyScalar(s).applyQuaternion(o.quaternion.clone().invert());
    // The first two five-sided cylinder rings are the unchanged crown;
    // cap-only vertices follow them. Select the sides without material groups.
    const indices=source.index.array,idx=[];
    for(let i=0;i<indices.length;i+=3)if(indices[i]<12&&indices[i+1]<12&&indices[i+2]<12)idx.push(indices[i],indices[i+1],indices[i+2]);
    const pos=Array.from(P.array),normal=Array.from(N.array),uv=Array.from(U.array),ring=Array.from({length:5},(_,i)=>new T.Vector3().fromBufferAttribute(P,6+i));
    // Stop the root just outside the first real facial surface, instead of
    // burying an approximate center coordinate inside a low-poly maxilla.
    o.updateMatrix();const inverse=o.matrix.clone().invert(),mid=ring.reduce((v,q)=>v.add(q),new T.Vector3()).multiplyScalar(.2),plane=new T.Vector3().crossVectors(ring[1].clone().sub(ring[0]),ring[2].clone().sub(ring[0])).normalize(),denom=plane.dot(delta);
    const walls=ring.map((v,i)=>{const n=new T.Vector3().crossVectors(ring[(i+1)%5].clone().sub(v),delta).normalize();if(n.dot(mid.clone().sub(v))<0)n.negate();return{n,d:n.dot(v)};});
    let fraction=1;
    for(const host of p.children){
      if(host===o||!host.isMesh||host.visible===false||!host.geometry?.attributes.position)continue;
      host.updateMatrix();const matrix=new T.Matrix4().multiplyMatrices(inverse,host.matrix),hp=host.geometry.attributes.position,hi=host.geometry.index?.array,count=hi?.length??hp.count;
      for(let j=0;j<count;j+=3){
        let poly=Array.from({length:3},(_,k)=>new T.Vector3().fromBufferAttribute(hp,hi?hi[j+k]:j+k).applyMatrix4(matrix));
        for(const {n,d}of walls){
          const clipped=[];for(let k=0;k<poly.length;k++){const a=poly[k],b=poly[(k+1)%poly.length],da=n.dot(a)-d,db=n.dot(b)-d;if(da>=0)clipped.push(a);if((da>=0)!==(db>=0))clipped.push(a.clone().lerp(b,da/(da-db)));}poly=clipped;if(!poly.length)break;
        }
        if(!poly.length)continue;
        const ts=poly.map(v=>plane.dot(v.clone().sub(ring[0]))/denom),first=Math.min(...ts);
        if(Math.max(...ts)>=0)fraction=Math.min(fraction,Math.max(0,first));
      }
    }
    delta.multiplyScalar(Math.max(0,fraction-.00025*s/delta.length()));
    const back=ring.map(v=>v.clone().add(delta));
    const center=ring.reduce((v,q)=>v.add(q),new T.Vector3()).multiplyScalar(.2).addScaledVector(delta,.5);
    const triangle=(a,b,c)=>{
      const n=new T.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a)),mid=a.clone().add(b).add(c).multiplyScalar(1/3);
      if(n.dot(mid.sub(center))<0){const swap=b;b=c;c=swap;n.negate();}
      n.normalize();const start=pos.length/3;
      for(const v of[a,b,c]){pos.push(v.x,v.y,v.z);normal.push(n.x,n.y,n.z);uv.push(0,0);}
      idx.push(start,start+1,start+2);
    };
    for(let i=0;i<5;i++){const j=(i+1)%5;triangle(ring[i],back[i],ring[j]);triangle(ring[j],back[i],back[j]);}
    const end=back.reduce((v,q)=>v.add(q),new T.Vector3()).multiplyScalar(.2);
    for(let i=0;i<5;i++)triangle(end,back[i],back[(i+1)%5]);
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normal,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);
    o.geometry=geo;source.dispose();return o;
  };
  // Connected tapered masses replace stacked oval limbs. Rings stay in bone-local space.
  // At horde distance ten sides retain the silhouette; the shared profile helper forces
  // sixteen on flesh, which costs thousands of triangles across every zombie.
  const loft=(p,m,source,n=10)=>{
    n=Math.min(n,8);
    const rings=source[0][0]>source.at(-1)[0]?[...source].reverse():source;
    const value=(j,t,k)=>{
      const a=rings[Math.max(0,j-1)][k]||0,b=rings[j][k]||0,c=rings[j+1][k]||0,d=rings[Math.min(rings.length-1,j+2)][k]||0;
      const v=.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
      return k===1||k===2?Math.max(Math.min(b,c),Math.min(Math.max(b,c),v)):v;
    };
    const peak=rings.reduce((best,R,j)=>R[1]*R[2]>rings[best][1]*rings[best][2]?j:best,0);
    const smooth=[];
    for(let j=0;j<rings.length-1;j++)for(const t of j===Math.min(rings.length-2,peak)?[0,.5]:[0])
      smooth.push([rings[j][0]+(rings[j+1][0]-rings[j][0])*t,...[1,2,3,4].map(k=>value(j,t,k))]);
    smooth.push(rings.at(-1));
    const pos=[],idx=[];
    for(const [y,rx,rz,cz=0,cx=0]of smooth)for(let i=0;i<n;i++){const a=i/n*Math.PI*2;pos.push((cx+Math.sin(a)*rx)*s,y*s,(cz+Math.cos(a)*rz)*s);}
    for(let j=0;j<smooth.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n;idx.push(a,b,a+n,b,b+n,a+n);}
    for(const end of [0,smooth.length-1]){const R=smooth[end],c=pos.length/3;pos.push((R[4]||0)*s,R[0]*s,(R[3]||0)*s);for(let i=0;i<n;i++){const a=end*n+i,b=end*n+(i+1)%n;idx.push(c,...(end?[a,b]:[b,a]));}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();return put(p,geo,m);
  };
  const plate=(p,m,rows,thickness=.018)=>{
    const pos=[],idx=[],n=4,count=rows.length*(n+1);
    for(const back of [false,true])for(const [y,w,z,wrap=.04]of rows)for(let i=0;i<=n;i++){
      const x=i/n*2-1;pos.push(x*w*s,y*s,(z-wrap*x*x-(back?thickness:0))*s);
    }
    for(let j=0;j<rows.length-1;j++)for(let i=0;i<n;i++){
      const a=j*(n+1)+i,b=a+n+1;
      idx.push(a,a+1,b,b,a+1,b+1,a+count,b+count,a+1+count,b+count,b+1+count,a+1+count);
    }
    const rim=[];for(let i=0;i<=n;i++)rim.push(i);for(let j=1;j<rows.length;j++)rim.push(j*(n+1)+n);
    for(let i=n-1;i>=0;i--)rim.push((rows.length-1)*(n+1)+i);for(let j=rows.length-2;j>0;j--)rim.push(j*(n+1));
    for(let i=0;i<rim.length;i++){const a=rim[i],b=rim[(i+1)%rim.length];idx.push(a,a+count,b,b,a+count,b+count);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();return put(p,geo,m);
  };
  const ribbon=(p,m,pts,w=.025,surface=null)=>{
    const pos=[],uv=[],idx=[];
    for(let i=0;i<pts.length;i++){const [x,y,z]=pts[i],rw=w*(1-i/(pts.length+1)),lift=surface?z-surface(x,y):0;
      pos.push((x-rw)*s,y*s,(surface?surface(x-rw,y)+lift:z)*s,(x+rw)*s,y*s,(surface?surface(x+rw,y)+lift:z+.005)*s);
      uv.push(0,i/(pts.length-1),1,i/(pts.length-1));if(i){const a=(i-1)*2;idx.push(a,a+2,a+1,a+1,a+2,a+3,a+1,a+2,a,a+3,a+2,a+1);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);const flat=geo.toNonIndexed();flat.computeVertexNormals();return put(p,flat,m);
  };
  const rag = (p,m,x,y,z,w,h,rz=0) => {
    // Explicit faces: the bundled extruder can return side walls without either cap.
    const pts=[[-w/2,0],[w/2,0],[w*.4,-h*.78],[w*.12,-h*.64],[-w*.04,-h],[-w*.3,-h*.8],[-w/2,-h*.87]],v=[];
    const tri=(a,b,c)=>{for(const p of [a,b,c])v.push(p[0]*s,p[1]*s,p[2]*s);};
    for(let i=1;i<pts.length-1;i++){tri([...pts[0],.008],[...pts[i+1],.008],[...pts[i],.008]);tri([...pts[0],0],[...pts[i],0],[...pts[i+1],0]);}
    for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];tri([...a,0],[...b,.008],[...b,0]);tri([...a,0],[...a,.008],[...b,.008]);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.computeVertexNormals();
    return put(p,geo,m,x,y,z,0,0,rz);
  };
  return {mat,mats,put,egg,rock,box,rod,path,spike,rag,loft,ribbon,sweep:path,plate};
}

function stripMeshes(root, keep = new Set()) {
  const dead=[];root.traverse(o=>{if(o.isMesh&&!keep.has(o))dead.push(o);});
  for(const o of dead)o.removeFromParent();
}

export function applyZombieConcept({THREE:T,g,typeKey:k,scale:s,rbox,audit=null}) {
  if(!CONCEPT_TYPES.includes(k))return false;
  // Small lateral rests keep the swinging hands outside the thighs, while a
  // little more hip spacing prevents opposite knees crossing in fast poses.
  if(['shambler','feral','brute','military','spitter','bomber'].includes(k)){
    const roll=['shambler','brute','military','spitter','bomber'].includes(k)?.2:.1;
    g.userData.armLG.rotation.z=-roll;
    g.userData.armRG.rotation.z=roll;
  }
  if(['feral','brute','military','screamer','leaper'].includes(k)){
    g.userData.legLG.position.x-=k==='feral'?.08:.04;
    g.userData.legRG.position.x+=k==='feral'?.08:.04;
  }
  if(['shambler','feral','brute','military','leaper'].includes(k)){
    const shoulder=k==='feral'?.08:.04;
    g.userData.armLG.position.x-=shoulder;
    g.userData.armRG.position.x+=shoulder;
  }
  if(k==='drowned'){
    // The dragging arms hang outside both knees through the shuffle.
    g.userData.armLG.rotation.z=-.2;
    g.userData.armRG.rotation.z=.2;
  }
  // Keep the demon's thighs and forearms clear through the walking stride.
  // Apply these pivots before both the cached and uncached concept paths.
  if(k==='demon'){
    g.userData.legLG.position.x=-.185*s-.04;
    g.userData.legRG.position.x=.185*s+.04;
    for(const arm of [g.userData.armLG,g.userData.armRG]){
      arm.rotation.x=-.9;
      arm.userData.baseRotX=-.9;
    }
    g.userData.armLG.rotation.z=-.3;
    g.userData.armRG.rotation.z=.3;
    g.userData.armLG.position.x-=.12;
    g.userData.armRG.position.x+=.12;
  }
  if(k==='colossus'){
    // Give the shoulder shield and hanging hand room for the skull and thigh.
    const u=g.userData,shoulder=.26*s/2.3,hip=.08*s/2.3;
    u.armLG.position.x-=shoulder;
    u.armRG.position.x+=shoulder;
    for(const arm of [u.armLG,u.armRG])arm.scale.set(.8,.9,1);
    u.armLG.rotation.z=-.2;
    u.armRG.rotation.z=.2;
    u.head.position.y+=.15*s/2.3;
    u.legLG.position.x-=hip;
    u.legRG.position.x+=hip;
  }
  // GP-20146: keep legacy spacing before the shared pivot hook and template restore.
  if(k==='military'){
    g.userData.armLG.position.x-=.04;
    g.userData.armRG.position.x+=.04;
  }
  humanoidPivots(T,g,s,k); // CC-355 s27 (Claude 3, J158 / D-190): a LIVE humanoid's shoulders, hips and head on its body (both paths)
  const cacheKey=k+':'+s;if(!audit&&restore(T,g,cacheKey,k)){mergeEyes(T,g);return true;}
  const u=g.userData, {hips,torso,head,armLG,armRG,legLG,legRG}=u;
  const A=sculpt(T,s,rbox),{mat,egg,rock,box,rod,path,spike,rag,loft,plate,ribbon}=A;
  stripMeshes(g,new Set(u.eyes));
  const heavy=['brute','colossus','demon'].includes(k), acid=['spitter','bomber'].includes(k);
  const hideSurface=k==='brute'||k==='demon'?'wet':'skin';
  const skin=mat(({shambler:0xb4ad96,feral:0xa4a789,brute:0x86574c,military:0xa5a08b,
    spitter:0xb0ab77,bomber:0x9fa54e,screamer:0xc5b6a4,drowned:0x729194,leaper:0xb2b0b2,
    spider:0xbabdb1,colossus:0x855245,demon:0x784b43,guardian:0xc3c6b3,caveguard:0x55584f})[k],false,0,hideSurface);
  const shadow=mat(skin.color.clone().multiplyScalar(.49),false,0,hideSurface), pale=mat(skin.color.clone().lerp(new T.Color(0xe6dfc8),.28),false,0,hideSurface);
  const wound=mat(0x674137,false,0,'wet'),mouth=mat(0x201b1b),teeth=mat(0xc8bea0,false,0,'bone'),hair=mat(0x27251f,false,0,'root'),cloth=mat(0x49473f,false,0,'cloth');
  const shirt=mat(0xc6bca5,false,0,'cloth'),leather=mat(0x594834,false,0,'leather'),steel=mat(k==='brute'?0x7d817d:0x494a43,false,.35,'metal'),rust=mat(0x996a43,false,.2,'metal');
  // D-89: the uncanny's eyes are cold pale-green points, not archetype neon.
  const moss=mat(k==='drowned'?0x384e35:0x526032,false,0,'root'),glowColor=0x74a18d;
  for(const e of u.eyes){e.material.color.set(glowColor);e.material.emissive.set(glowColor);e.material.emissiveIntensity=.9;e.material.userData.baseEmissive=.9;e.scale.set(.68,.45,.5);}
  u.pulseMats=[];
  const wide=heavy?.68:acid?.65:k==='screamer'?.35:k==='feral'||k==='leaper'?.4:.48;
  const deep=heavy?.4:acid?.48:.3;
  torso.userData.bodyMat=skin;u.bodyMats=[skin];
  // A continuous pelvic waistband reaches inside the abdomen and both hip sockets.
  const spitter=k==='spitter', drowned=k==='drowned', brute=k==='brute';
  let spitterBody, drownedBody;
  if(spitter){
    // The pelvis narrows into two thigh-local cuffs that travel with the stride.
    loft(hips,cloth,[[-.035,.188,.108],[-.006,.206,.127],[.043,.244,.176],[.105,.250,.181,.012],[.171,.236,.168,.012],[.216,.206,.142,.006],[.248,.178,.119]],12);
    const wetSkin=mat(skin.color.clone().lerp(new T.Color(0xb8b18b),.35),false,0,'wet');
    // One continuous skin shell from the tucked abdomen to the shoulder line.
    spitterBody=loft(torso,wetSkin,[[-.215,.154,.143,.027],[-.175,.220,.202,.057],
      [-.110,.281,.248,.084],[0,.325,.277,.085],[.150,.312,.271,.052],
      [.30,.314,.237,.002],[.385,.278,.199,-.002],[.446,.175,.143,-.008],[.481,.105,.101,-.020]],12);
    loft(torso,skin,[[.412,.135,.114,-.03],[.458,.109,.104,-.031],[.513,.097,.092,-.027],[.554,.089,.077,-.020]],10);
  }else if(drowned){
    // Soaked cloth follows the hips, while the long torso fills the seam above it.
    loft(hips,cloth,[[-.065,.151,.096],[-.028,.183,.120],[.044,.196,.139],[.12,.190,.139],[.174,.175,.125],[.238,.139,.104]],10);
    drownedBody=loft(torso,skin,[[-.123,.122,.101],[-.08,.145,.119],[.025,.177,.140],[.16,.214,.152],[.29,.242,.156],
      [.365,.257,.148,-.007],[.412,.235,.134,-.015],[.446,.186,.119,-.020],[.463,.140,.112,-.023],[.504,.091,.082,-.026],[.55,.076,.072,-.022]],12);
  }else if(brute){
    loft(hips,cloth,[[-.068,.179,.127],[-.030,.202,.152],[.048,.249,.170],[.113,.261,.176],
      [.171,.251,.171],[.231,.219,.143],[.257,.192,.129]],12);
  }else{
    loft(hips,cloth,[[-.035,wide*.34,deep*.36],[.04,wide*.41,deep*.43],[.17,wide*.40,deep*.43],[.255,wide*.30,deep*.34]],12);
    loft(torso,skin,[[-.08,wide*.29,deep*.32],[.03,wide*.36,deep*.40],[.17,wide*.43,deep*.47],[.31,wide*.5,deep*.5],[.42,wide*.44,deep*.42],[.48,wide*.22,deep*.28],[.51,.064,.065]],12);
  }
  // Trapezius and collarbone flow into the shoulders instead of exposing ball joints.
  for(const side of [-1,1]){
    if(spitter){
      // A low trapezius overlaps the rounded, moving cap at the arm pivot.
      egg(torso,skin,side*.216,.391,-.012,.276,.165,.224,side*.24);
    }else if(drowned){
      egg(torso,skin,side*.226,.392,-.008,.222,.131,.177,side*.21);
    }else{
      egg(torso,skin,side*wide*.25,.425,-.015,wide*.51,.18,deep*.8,side*.27);
      // A deltoid root reaches the actual shoulder pivot; no detached upper arm.
      path(torso,skin,[[side*wide*.29,.40,0],[side*.255,.42,0],[side*.32,.42,0]],.082,.09);
      path(torso,pale,[[side*.025,.455,.078],[side*.11,.435,.12],[side*wide*.39,.40,.08]],.019);
    }
    if(!spitter&&!drowned)egg(torso,skin,side*wide*.19,.27,-deep*.43,wide*.33,.30,.07,side*.3);
  }
  for(const side of [-1,1]){
    if(!spitter&&!drowned&&k!=='colossus')egg(torso,pale,side*wide*.23,.36,.035,wide*.47,.21,deep*.9,side*.1);   // D-242 colossus P1 #8 (Q4): its pale pecs showed as torn flaps at the plate's top corners
    const arm=side<0?armLG:armRG,el=arm.userData.elbowG,leg=side<0?legLG:legRG,shin=leg.userData.shinG;
    const muscle=heavy?1.6:k==='feral'||k==='leaper'?1.08:.92;
    arm.userData.upper=loft(arm,skin,spitter?
      [[-.366,.062,.064],[-.34,.066,.067],[-.26,.074,.078,.006],[-.17,.092,.094,.012],[-.075,.108,.109,.006],[.018,.103,.097],[.074,.075,.073],[.106,.036,.044]]:
      drowned?[[-.367,.058,.060],[-.34,.061,.064],[-.265,.068,.075,.005],[-.166,.082,.089,.011],
        [-.068,.099,.099,.006],[.022,.096,.093],[.076,.065,.065],[.097,.032,.037]]:
      [[-.355,.053*muscle,.06*muscle],[-.29,.06*muscle,.063*muscle],[-.20,.085*muscle,.095*muscle,.014],[-.10,.102*muscle,.104*muscle,.008],[0,.11*muscle,.103*muscle],[.08,.063*muscle,.075*muscle]],10);
    if(spitter){const ball=A.put(el,new T.SphereGeometry(1,8,4),skin,0,-.002,-.010);ball.scale.set(.118*s/2,.104*s/2,.122*s/2);} // D-242 P2 #5: round elbow, no facet ring
    else if(drowned)egg(el,skin,0,-.003,-.006,.113,.112,.116);
    else egg(el,skin,0,0,-.015,.14*muscle,.13,.15*muscle);
    // The wrist and palm are one continuous surface, with a gentle heel flare.
    const forearm=loft(el,skin,spitter?
      [[-.425,.031,.026,.024],[-.39,.063,.041,.02],[-.35,.069,.046,.02],[-.308,.048,.045,.012],[-.26,.051,.053],[-.17,.071,.064,-.01],[-.07,.074,.067],[-.025,.066,.065],[.03,.056,.055]]:
      drowned?[[-.425,.029,.026,.023],[-.39,.058,.040,.02],[-.35,.066,.045,.018],[-.308,.046,.045,.009],
        [-.24,.048,.052,-.006],[-.15,.061,.059,-.011],[-.063,.065,.065,-.006],[-.016,.061,.065],[.026,.057,.059]]:
      [[-.425,.034*muscle,.028*muscle,.024],[-.39,.068*muscle,.045*muscle,.02],[-.35,.075*muscle,.050*muscle,.02],[-.308,.052*muscle,.049*muscle,.012],[-.26,.055*muscle,.058*muscle],[-.17,.077*muscle,.070*muscle,-.01],[-.07,.082*muscle,.075*muscle],[.025,.055*muscle,.061*muscle]],10);
    if(!drowned&&!brute&&!spitter)rod(el,pale,[-.018,-.03,.063],[.018,-.29,.042],.021,.014); // D-242 P2 #3: no pale stick on the spitter's forearm
    // Palm volume is included in the forearm loft above.
    for(let f=0;f<4;f++){
      const x=(f-1.5)*.031*muscle,len=(f===0||f===3)?.08:.11;
      if(spitter)roundPath(A,T,el,skin,s,[[x,-.37,.025],[x,-.4-len*.45,.047],[x,-.4-len,.015]],.020,.015,6); // D-242 P2 #9: round fingers
      else path(el,skin,[[x,-.37,.025],[x,-.4-len*.45,.047],[x,-.4-len,.015]],.021*muscle);
      if(['feral','leaper','demon','screamer','guardian','caveguard'].includes(k))
        path(el,hair,[[x,-.4-len,.015],[x,-.47-len,.052],[x,-.50-len,.10],[x*.8,-.48-len,.13]],.018);
      else if(spitter||drowned){
        const nailY=-.4-len;
        path(el,hair,[[x,nailY+.014,.029],[x,nailY+.002,.030],[x,nailY-.011,.026]],.009,.005);
      }else if(brute){
        const tip=-.4-len;
        path(el,hair,[[x,tip+.018,.024],[x,tip+.005,.029],[x,tip-.010,.024]],.013,.007);
      }else box(el,teeth,x,-.4-len,.030,.021,.032,.008);
      if(spitter)egg(el,skin,x,-.375,.051-Math.abs(x)*.31,.023,.027,.022);
      else if(drowned)egg(el,skin,x,-.375,.049-Math.abs(x)*.29,.023,.027,.022);
      else if(brute)egg(el,skin,x,-.379,.050-Math.abs(x)*.24,.030,.036,.028);
      else egg(el,pale,x,-.37,.056,.035,.037,.018);
    }
    if(spitter)roundPath(A,T,el,skin,s,[[side*.065,-.33,.025],[side*.096,-.39,.065],[side*.066,-.43,.072]],.025,.017,6);
    else path(el,skin,[[side*.065,-.33,.025],[side*.096,-.39,.065],[side*.066,-.43,.072]],.026);
    const legcloth=['military','shambler','feral','screamer','drowned'].includes(k);
    egg(leg,legcloth?cloth:skin,0,-.045,0,.175*(heavy?1.3:1),.21,.20);
    const lm=heavy?1.35:1;
    leg.userData.thigh=loft(leg,legcloth?cloth:skin,spitter?
      [[-.403,.069,.074,-.001],[-.38,.071,.077,-.003],[-.30,.080,.092,-.006],[-.20,.096,.109,-.008],[-.13,.104,.119,-.01],[.02,.098,.09]]:
      drowned?[[-.402,.065,.071,.004],[-.374,.067,.073,.003],[-.29,.079,.094,.001],
        [-.20,.099,.112,-.004],[-.11,.113,.122,-.008],[.006,.103,.105],[.048,.085,.087]]:
      [[-.38,.067*lm,.067*lm,.01],[-.29,.080*lm,.10*lm],[-.13,.104*lm,.119*lm,-.01],[.02,.098*lm,.09*lm]],10);
    if(spitter){
      loft(leg,cloth,[[-.160,.097,.110,-.009],[-.150,.102,.118,-.009],[-.123,.110,.128,-.008],[-.065,.119,.130,-.004],[.007,.121,.125],[.059,.105,.108]],10);
      {const cap=A.put(shin,new T.SphereGeometry(1,8,4),skin,0,-.016,.050);cap.scale.set(.074*s/2,.088*s/2,.066*s/2);} // D-242 P2 #6: round kneecap set into the leg
    }else if(drowned)egg(shin,skin,0,-.015,.032,.089,.103,.087);
    else egg(shin,pale,0,-.015,.03,.15,.13,.16);
    const bareFoot=['feral','leaper','demon','guardian','caveguard'].includes(k);
    loft(shin,skin,spitter?
      [[-.34,.048,.051,.01],[-.23,.054,.066,-.015],[-.13,.076,.078,-.012],[-.063,.073,.076,-.008],[-.018,.071,.077,-.003],[.034,.069,.074,-.001]]:
      drowned?[[-.34,.049,.054,.013],[-.236,.055,.065,-.01],[-.148,.073,.075,-.013],
        [-.085,.070,.074,-.011],[-.030,.067,.071,-.003],[.024,.064,.071,.004]]:
      [...(bareFoot?[[-.405,.065*lm,.102,.055],[-.375,.092*lm,.139,.043],[-.34,.061*lm,.080,.016],[-.29,.048*lm,.057]]:[[-.34,.048*lm,.051,.01]]),[-.23,.054*lm,.066,-.015],[-.12,.083*lm,.085,-.02],[-.045,.067*lm,.069],[.018,.063*lm,.07]],10);
    // On lean types the straight shin rod bridges the concave calf.
    if(['shambler','feral','leaper'].includes(k)){
      const inset=k==='feral'?.005:0;
      path(shin,shadow,[[.02,-.06,.064],[.018,-.14,.054-inset],[.013,-.23,.048-inset],[.008,-.31,.052-inset]],.010,.006);
    }
    else if(!drowned&&!brute&&!spitter)rod(shin,shadow,[.02,-.06,.066],[.008,-.31,.052],.015,.01); // D-242 P2 #2: no dark rod down the spitter's shin
    const booted=!['feral','leaper','demon','guardian','caveguard'].includes(k);
    if(spitter){
      // Keep the old ground contact while replacing the square sole plate.
      loft(shin,hair,[[-.4165,.073,.118,.042],[-.411,.083,.132,.043],[-.399,.087,.139,.043],[-.391,.084,.134,.043]],10);
      loft(shin,leather,[[-.403,.084,.134,.043],[-.377,.092,.140,.043],[-.345,.083,.117,.033],[-.313,.073,.094,.015],[-.258,.069,.079,-.001],[-.224,.065,.073,-.009],[-.195,.063,.071,-.015]],10);
      for(let j=0;j<3;j++){
        const y=-.259-j*.031,z=.074+j*.023;
        path(shin,shadow,[[-.040,y,z-.014],[0,y-.007,z+.005],[.040,y-.013,z-.005]],.004);
        path(shin,pale,[[.039,y,z-.014],[0,y-.011,z+.006],[-.040,y-.014,z-.005]],.003);
      }
    }else if(drowned){
      loft(shin,hair,[[-.4165,.069,.119,.040],[-.409,.083,.132,.041],[-.397,.086,.135,.042],[-.388,.082,.128,.040]],10);
      const boot=loft(shin,leather,[[-.401,.082,.130,.043],[-.382,.091,.139,.045],[-.348,.082,.119,.033],
        [-.307,.072,.094,.017],[-.264,.070,.083,.003],[-.231,.067,.077,-.006],[-.205,.061,.069,-.010]],10);
      const bootFront=conceptSurface(T,boot.geometry,s);
      for(let lace=0;lace<3;lace++){
        const y=-.265-lace*.029;
        const points=[[-.035,y],[-.018,y-.004],[0,y-.008],[.018,y-.010],[.035,y-.012]];
        const cord=path(shin,shadow,points.map(([x,y])=>[x,y,bootFront(x,y,1)+.001]),.004);
        // Keep the cord and its boot on the same animated ankle after skin batching.
        cord.userData.bootAttachment=true;
      }
    }else if(brute||k==='colossus'){   // D-242 colossus P1 #5 (Q1): the colossus stood on a square slab sole; now the brute's lofted boot
      // The sole footprint stays inside the existing boot contact envelope.
      loft(shin,hair,[[-.4165,.100,.121,.040],[-.410,.113,.133,.040],[-.399,.117,.136,.041],[-.391,.113,.132,.042]],12);
      const boot=loft(shin,leather,[[-.402,.112,.132,.043],[-.378,.124,.140,.045],[-.348,.108,.117,.034],
        [-.314,.094,.092,.018],[-.265,.083,.076,.003],[-.224,.075,.072,-.010],[-.197,.068,.066,-.015]],12);
      const face=conceptSurface(T,boot.geometry,s);
      for(let row=0;row<3;row++){
        const y=-.267-row*.023;
        const points=[[-.040,y],[0,y-.006],[.040,y-.011]].map(([x,py])=>[x,py,face(x,py,1)-.002]);
        const cord=path(shin,shadow,points,.006,.004);
        cord.userData.bootAttachment=true;
      }
    }else if(booted){
      egg(shin,leather,0,-.355,.043,.185*(heavy?1.35:1),.114,.278);
      box(shin,hair,0,-.403,.04,.176*(heavy?1.35:1),.027,.263);
      loft(shin,leather,[[-.38,.083,.10,.045],[-.32,.077,.089,.005],[-.235,.078,.080],[ -.20,.066,.069]],9);
      egg(shin,leather,0,-.363,.116,.166*(heavy?1.35:1),.088,.136);
      for(let j=0;j<3;j++){path(shin,shadow,[[-.052,-.25-j*.036,.073],[.045,-.269-j*.036,.088]],.004);path(shin,pale,[[.047,-.25-j*.036,.073],[-.045,-.269-j*.036,.088]],.003);}
      for(const sign of [-1,1])path(shin,pale,[[sign*.065,-.374,-.055],[sign*.077,-.384,.065],[sign*.061,-.379,.160]],.003);
    }
    else for(let f=0;f<3;f++)spike(shin,hair,[(f-1)*.055,-.37,.15],[(f-1)*.065,-.395,.245],.021);
    if(legcloth&&!drowned)for(let j=0;j<3;j++){
      const fittedHem=k==='shambler'||k==='feral';
      rag(leg,cloth,(j-1)*.052,-.23,fittedHem?.11:.104,fittedHem?.056:.064,fittedHem?.08+(j%2)*.025:.1+(j%2)*.05,(j-1)*.15);
    }
    // Torn muscle and mottling: surface chips, not floating decals.
    egg(arm,shadow,side*.042,-.16,.069*muscle,.05,.14,.018,-side*.35);
    if(drowned){
      const sample=conceptSurface(T,forearm.geometry,s);
      const front=(x,y)=>sample(x,y,1);
      const scars=[
        [[-.036,-.108],[-.022,-.143],[-.014,-.158]],
        [[.018,-.162],[.010,-.186],[.012,-.207]]
      ];
      for(const scratch of scars){
        const points=scratch.map(([x,y])=>[x*side,y,front(x*side,y)+.002]);
        ribbon(el,shadow,points,.005,front);
      }
    }else if(k==='leaper'||k==='shambler'||k==='feral'){
      const rings=[[-.26,.055*muscle,.058*muscle,0],[-.17,.077*muscle,.070*muscle,-.01],[-.07,.082*muscle,.075*muscle,0]];
      const forearmFront=(x,y)=>{
        const i=y<rings[1][0]?0:1,lo=rings[i],hi=rings[i+1],t=(y-lo[0])/(hi[0]-lo[0]);
        const rx=lo[1]+(hi[1]-lo[1])*t,rz=lo[2]+(hi[2]-lo[2])*t,cz=lo[3]+(hi[3]-lo[3])*t;
        return cz+rz*Math.sqrt(Math.max(0,1-(x/rx)**2));
      };
      const onForearm=(pts,lift)=>pts.map(([x,y])=>[x,y,forearmFront(x,y)+lift]);
      const slash=[[-side*.020,-.105],[-side*.046,-.143],[-side*.018,-.21]];
      const ribbonPoints=k==='leaper'?slash.flatMap((p,i)=>i<slash.length-1?[p,[(p[0]+slash[i+1][0])/2,(p[1]+slash[i+1][1])/2]]:[p]):slash;
      ribbon(el,wound,onForearm(ribbonPoints,k==='leaper'?.004:.003),k==='leaper'?.013:.017,k==='leaper'?forearmFront:null);
      path(el,pale,onForearm([[-side*.022,-.11],[-side*.040,-.15],[-side*.024,-.201]],.006),.004);
    }else if(spitter){
      // D-242 P2 #4: the forearm scar follows the skin instead of floating as a painted chevron.
      const sample=conceptSurface(T,forearm.geometry,s),front=(x,y)=>sample(x,y,1);
      const slash=[[-side*.018,-.105],[-side*.034,-.125],[-side*.040,-.150],[-side*.030,-.178],[-side*.016,-.205]];
      ribbon(el,wound,slash.map(([x,y])=>[x,y,front(x,y)+.0015]),.011,front);
      path(el,pale,slash.slice(1,4).map(([x,y])=>[x*1.1,y,front(x*1.1,y)+.0025]),.0028);
    }else{
      ribbon(el,wound,[[-side*.020,-.105,.074*muscle],[-side*.046,-.143,.075*muscle],[-side*.018,-.21,.066*muscle]],.017);
      path(el,pale,[[-side*.022,-.11,.078*muscle],[-side*.040,-.15,.079*muscle],[-side*.024,-.201,.071*muscle]],.004);
    }
  }
  const hw=heavy?.39:.32;
  const snarl=k==='feral'||k==='leaper'||heavy;
  loft(head,skin,[[-.145,hw*.27,.072,-.025],[-.095,hw*.35,.098,-.03],[-.01,hw*.48,.133,-.02],[.075,hw*.50,.151,-.02],[.155,hw*.43,.130,-.035],[.205,hw*.22,.081,-.035]],12);
  for(const side of [-1,1]){
    egg(head,shadow,side*.088,.041,.139,.122,.103,.042,-side*.17);
    egg(head,pale,side*.089,.087,.140,.120,.030,.057,side*(snarl?.27:.14));
    egg(head,pale,side*.117,-.035,.116,.065,.073,.075,-side*.38);
    egg(head,shadow,side*.115,-.085,.104,.056,.070,.020,side*.3);
    path(head,skin,[[side*.122,-.065,.085],[side*.106,-.14,.106],[side*.078,-.172,.09]],.025);
    egg(head,skin,side*hw*.5,-.007,-.019,.051,.097,.056,side*.18);
    egg(head,shadow,side*(hw*.5+.013),-.005,.003,.029,.053,.016,side*.2);
    // Creased eyelids, lips and torn cheek edges surround the glow instead of flat blocks.
    path(head,skin,[[side*.033,.024,.15],[side*.082,-.005,.157],[side*.137,.018,.14]],.009);
    path(head,wound,[[side*.143,.065,.107],[side*.149,-.012,.105],[side*.113,-.08,.132]],.006);
  }
  egg(head,pale,0,.011,.153,.041,.108,.053);rock(head,skin,0,-.03,.177,.063,.040,.046);
  for(const side of [-1,1])egg(head,mouth,side*.019,-.042,.193,.018,.012,.012);
  const scream=k==='screamer',jawH=scream?.26:.105;
  egg(head,mouth,0,-.11-(scream?.07:0),.152,.19,jawH,.070);
  egg(head,skin,.004,scream?-.32:-.171,.085,.202,.062,.14);
  for(const side of [-1,1])path(head,skin,[[side*.103,-.065,.149],[side*(scream?.12:.1),scream?-.20:-.13,.158],[side*.065,scream?-.31:-.166,.155]],scream?.018:.012);
  path(head,wound,[[-.084,-.066,.172],[0,-.066,.194],[.087,-.073,.172]],.014);
  path(head,wound,[[-.079,scream?-.292:-.150,.17],[0,scream?-.307:-.161,.185],[.084,scream?-.29:-.146,.17]],.012);
  for(let i=0;i<8;i++){
    const x=(i-3.5)*.023,z=.193-Math.abs(x)*.15;
    if(i!==2||heavy)box(head,teeth,x,-.080-(i%3)*.004,z,.018,.027+(i%2)*.01,.014,(i-3)*.035);
    if(i!==6)spike(head,teeth,[x,scream?-.292:-.157,z-.004],[x,scream?-.257:-.132,z+.002],.009);
  }
  if(scream){const tongue=mat(0xae6671,false,0,'wet'),tip=mat(0xd89299,false,0,'wet');
    // Curl forward beneath the jaw without pulling the head's measured centre out
    // of its existing headshot slice (which includes every head-attached surface).
    path(head,tongue,[[0,-.21,.191],[.012,-.30,.235],[.037,-.39,.30],[.025,-.435,.38],[-.015,-.40,.445]],.036);
    ribbon(head,tip,[[0,-.24,.22],[.017,-.32,.273],[.035,-.39,.330],[.023,-.43,.40],[-.015,-.40,.451]],.013);
    for(const side of [-1,1])path(head,pale,[[side*.135,-.07,.085],[side*.11,-.24,.089],[side*.06,-.33,.06]],.020);
  }
  refineZombieFace(A,T,g,s,k,{skin,shadow,pale,wound,mouth,teeth});
  // These secondary attachments are added after refineZombieFace rebuilds the
  // skull. Match that function's common-head loft so roots and rear pegs seat.
  const faceW=k==='bomber'?.17:.153;
  const faceRings=[[-.165,.055,.055,.018],[-.12,faceW*.60,.086,.006],[-.055,faceW*.85,.105,-.012],[.025,faceW,.135,-.023],[.10,faceW*.98,.137,-.028],[.167,faceW*.82,.111,-.032],[.205,faceW*.40,.065,-.033]];
  const headDepth=(x,y,phase)=>{
    let lo=faceRings[0],hi=faceRings.at(-1);
    for(let i=1;i<faceRings.length;i++)if(y<=faceRings[i][0]){lo=faceRings[i-1];hi=faceRings[i];break;}
    const t=Math.max(0,Math.min(1,(y-lo[0])/(hi[0]-lo[0]))),rx=lo[1]+(hi[1]-lo[1])*t,rz=lo[2]+(hi[2]-lo[2])*t,cz=lo[3]+(hi[3]-lo[3])*t;
    return cz+phase*rz*Math.sqrt(Math.max(0,1-(x/rx)**2));
  };
  if(scream){
    // GP-19971: a close scalp and wet trailing locks leave the brow readable.
    egg(head,hair,0,.157,-.042,.268,.099,.228);
    for(const side of [-1,1])for(let i=0;i<3;i++){
      const x=side*(.075+i*.024),z=-.075+i*.026;
      path(head,hair,[[x,.175,z],[side*(.124+i*.008),.085,z-.023],[side*(.126-i*.009),-.064-i*.018,z-.042]],.019);
    }
  }else if(['shambler','feral','spitter','drowned'].includes(k)){
    if(spitter){const crown=A.put(head,new T.SphereGeometry(1,8,4),hair,-.010,.176,-.042);crown.scale.set(.104*s,.038*s,.088*s);} // D-242 P2 #7
    else egg(head,hair,-.032,.183,-.045,.24,.040,.23);
    for(let i=0;i<9;i++){
      const row=Math.floor(i/4),x=(i%4-1.5)*.050;
      // Bend the rear row down at the temples instead of bridging level across the dome.
      const crownDrop=row===0?.025*(x/.075)**2:0,rootY=.175-crownDrop;
      const z=headDepth(x,rootY,[-.95,0,.83][row]);
      if(row===2){
        // The single forehead lock follows the skull instead of arching in air.
        const roots=[[-.060,.175],[-.075,.145],[-.068,.095]];
        hairLock(A,T,head,hair,s,roots.map(([hx,hy])=>[hx,hy,headDepth(hx,hy,1)+.003]),.018);
        continue;
      }
      if(row===0){
        // Keep both bends against the rear skull and draw the outer tips in.
        const inward=Math.sign(x),midX=x-inward*.012;
        const midY=.193+(i%3)*.004-crownDrop*.5;
        const tipX=x-inward*.021,tipY=.135-(i%3)*.011-crownDrop*.65;
        hairLock(A,T,head,hair,s,[[x,rootY,headDepth(x,rootY,-1)-.003],
          [midX,midY,headDepth(midX,midY,-1)-.010],
          [tipX,tipY,headDepth(tipX,tipY,-1)-.004]],.021+(i%3)*.003);
        continue;
      }
      const lift=.015,tip=.028;
      hairLock(A,T,head,hair,s,[[x,rootY,z],[x-.025,.205+(i%3)*.007-crownDrop,z+lift],[x-.043,.13-(i%3)*.015-crownDrop,z+tip]],.021+(i%3)*.003);
    }
  }
  // Dirt patches follow the skin's contours and repeat deterministically per type.
  // D-242 P2 #1: the spitter's rear skull keeps its mottled skin texture, without six-sided chips.
  if(!spitter)for(let i=0;i<5;i++){
    const x=(i%3-1)*.077,y=-.03+Math.floor(i/3)*.15;
    const z=['shambler','military','drowned','spitter','bomber'].includes(k)?headDepth(x,y,-1)-.004:-.148;
    egg(head,i%2?shadow:pale,x,y,z,.065,.067,.016,i*.8);
  }

  if(['shambler','feral','screamer'].includes(k)){
    buildTank(A,T,torso,s,wide,shirt,k);
    for(const side of [-1,1])path(torso,shirt,[[side*.035,.285,.164],[side*wide*.30,.34,.158],[side*wide*.39,.45,.095]],.013);
    rag(torso,wound,-wide*.39,.438,.073,.065,.14,-.25);
    if(k==='feral')for(const side of [-1,1])box(torso,wound,side*.142,.37,.135,.035,.23,.022,side*.12);
    if(scream)for(let i=0;i<4;i++)for(const side of [-1,1])path(torso,pale,[[side*.018,.35-i*.057,.161],[side*.10,.33-i*.057,.151],[side*(.14-i*.008),.295-i*.057,.105]],.012);
  }
  if(k==='military'){
    const olive=mat(0x626448,false,0,'cloth'),camLight=mat(0x8a805a,false,0,'cloth'),camDark=mat(0x3c4633,false,0,'cloth');
    loft(head,olive,[[.145,.171,.146,-.02],[.18,.18,.15,-.02],[.245,.17,.141,-.03],[.265,.15,.126,-.03]],12);
    box(head,camDark,0,.148,-.017,.35,.02,.28);box(head,olive,0,.154,.178,.33,.024,.19,-.06);
    box(head,camDark,0,.223,.127,.073,.040,.01);box(head,camLight,0,.226,.134,.053,.012,.008);
    for(let i=0;i<3;i++){const x=(i-1)*.099,y=.202+(i%2)*.031,f=Math.max(0,Math.min(1,(y-.18)/.065)),rx=.18-.01*f,rz=.15-.009*f;rock(head,i%2?camDark:camLight,x,y,-.02-.01*f+rz*Math.sqrt(Math.max(0,1-(x/rx)**2))+.002,.075,.04,.012,i*.6);}
    egg(torso,olive,0,.25,0,.51,.51,.345);
    // The vest shell is an ellipsoid; use its front depth to seat each pouch
    // instead of leaving the outer columns on the old flat chest plane.
    const vestFront=(x,y)=>.1725*Math.sqrt(Math.max(.08,1-(x/.255)**2-((y-.25)/.255)**2));
    for(const side of [-1,1]){
      const arm=side<0?armLG:armRG,leg=side<0?legLG:legRG,shin=leg.userData.shinG;
      egg(arm,olive,0,-.025,.006,.245,.32,.244);egg(leg,olive,0,-.19,0,.217,.41,.246);
      egg(shin,olive,0,-.10,0,.16,.25,.18);box(shin,steel,0,-.055,.075,.15,.11,.045);
      // The shared camo texture carries the pattern; extra raised spots cost four limbs' worth of triangles.
      rag(arm,olive,0,-.135,.092,.059,.095,side*.2);
      box(torso,leather,side*.185,.29,vestFront(.185,.29)+.018,.047,.41,.035,side*.04);
      for(let j=0;j<2;j++){const x=side*(.048+j*.1),z=vestFront(x,.14);box(torso,olive,x,.14,z+.034,.084,.15,.08);box(torso,camLight,x,.19,z+.079,.075,.021,.012);}
      box(torso,camDark,side*.206,.08,.139,.081,.16,.075,side*.13);
      box(torso,steel,side*.185,.34,vestFront(.185,.34)+.02,.063,.048,.02);
      box(leg,olive,side*.105,-.135,.005,.06,.14,.14);
      const el=arm.userData.elbowG;egg(el,leather,0,-.365,.085,.12,.11,.075);box(el,camDark,0,-.33,.107,.12,.025,.07);
      const bootFront=(x,y)=>{const f=Math.max(0,Math.min(1,(y+.32)/.085)),rx=.077+.001*f,rz=.089-.009*f,cz=.005*(1-f);return cz+rz*Math.sqrt(Math.max(0,1-(x/rx)**2));};
      for(let j=0;j<2;j++){const y=-.24-j*.037;path(shin,camLight,[[-.052,y,bootFront(-.052,y)+.001],[0,y-.005,bootFront(0,y-.005)+.001],[.050,y-.01,bootFront(.050,y-.01)+.001]],.005);}
    }
    box(torso,olive,0,.3,.177,.36,.21,.06);
    // Seat the radio pack into the rounded back instead of leaving a side-view gap.
    box(torso,olive,0,.25,-.185,.36,.4,.14);
    box(torso,camDark,.14,.44,-.18,.1,.12,.075);rod(torso,hair,[.14,.48,-.18],[.14,.82,-.19],.01,.006);
    for(let i=0;i<3;i++)box(torso,camLight,0,.235+i*.027,.211,.30,.009,.009);
    for(let i=0;i<3;i++){const x=(i-1)*.12,y=.10;rock(torso,i%2?camDark:camLight,x,y,-.26,.13,.073,.012,i*.5);}
    box(torso,camLight,-.076,.357,.216,.10,.046,.013);box(torso,wound,-.059,.349,.225,.041,.014,.006);
    box(torso,hair,.123,.382,.220,.067,.104,.030);for(let j=0;j<3;j++)box(torso,steel,.123,.406-j*.019,.239,.04,.005,.008);
    path(torso,hair,[[.123,.43,.215],[.21,.455,.14],[.22,.37,.0],[.15,.46,-.21]],.009);
  }
  if(acid){
    const acidMat=mat(k==='bomber'?0xb5b757:0xb8b18b,false,0,'wet'),sac=mat(0xc4c573,false,0,'wet'),ooze=mat(0xb6cb38,true);
    const surface=spitter?conceptSurface(T,spitterBody.geometry,s):null;
    const bellyZ=(x,y)=>surface?surface(x,y,1):.12+.335*Math.sqrt(Math.max(0,1-(x/.415)**2-((y-.095)/.36)**2));
    if(k==='bomber'){
      // The old eight-by-four sphere made an angular belly cone in the gameplay silhouette.
      const belly=A.put(torso,new T.SphereGeometry(1,16,10),acidMat,0,.095,.12);
      belly.scale.set(.415*s,.36*s,.335*s);
    }
    if(spitter){
      const blisters=[[-.126,.219,.028,.022],[-.212,.110,.034,.025],[-.105,.062,.024,.025],[-.156,-.063,.027,.020],
        [.117,.252,.024,.020],[.197,.138,.033,.024],[.109,.039,.025,.021],[.161,-.052,.027,.022]];
      const sphere=new T.SphereGeometry(1,8,5),forward=new T.Vector3(0,0,1);
      for(const [i,[x,y,rx,ry]] of blisters.entries()){
        const dx=(bellyZ(x+.005,y)-bellyZ(x-.005,y))/.010;
        const dy=(bellyZ(x,y+.005)-bellyZ(x,y-.005))/.010;
        const normal=new T.Vector3(-dx,-dy,1).normalize();
        const blister=A.put(torso,sphere,i%3===0?sac:acidMat,x+normal.x*.002,y+normal.y*.002,bellyZ(x,y)+normal.z*.002);
        blister.scale.set(rx*s,ry*s,.023*s);
        blister.quaternion.setFromUnitVectors(forward,normal);
      }
    }else for(let i=0;i<12;i++){
      const a=i*2.399,r=.12+(i%3)*.055,x=Math.cos(a)*r,y=.12+Math.sin(a)*r;
      const z=bellyZ(x,y);
      egg(torso,i%3?shadow:sac,x,y,z+.005,.036+(i%3)*.014,.04+(i%2)*.02,.023);
    }
    if(spitter){
      for(const side of [-1,1]){
        const anchors=[[.150,.430],[.218,.371],[.260,.282],[.271,.156],[.250,.067]];
        const strap=anchors.flatMap(([x,y],j)=>j===anchors.length-1?[[x,y]]:
          Array.from({length:4},(_,i)=>[x+(anchors[j+1][0]-x)*i/4,y+(anchors[j+1][1]-y)*i/4]));
        ribbon(torso,cloth,strap.map(([x,y])=>[side*x,y,bellyZ(side*x,y)+.010]),.041,bellyZ);
        // D-242 P2 #8: the abrasion is a flat graze on the skin, not a rod standing off the chest.
        const abrasion=[[.080,.400],[.108,.385],[.135,.368],[.176,.330],[.217,.285]].map(([x,y])=>[side*x,y,bellyZ(side*x,y)+.0015]);
        ribbon(torso,wound,abrasion,.010,bellyZ);
      }
      spitterVest(A,T,torso,cloth,s,surface);
      // End the chin drips against the upper chest rather than spanning its throat hollow.
      for(let i=0;i<4;i++)path(head,ooze,[[(i-1.5)*.037,-.15,.185],[(i-1.5)*.04,-.21-(i%2)*.025,.172],[(i-1.5)*.03,-.25-(i%2)*.03,.153]],.009);
      const vein=Array.from({length:17},(_,i)=>{
        const y=.258-i*.026,x=.034+.013*Math.sin(i*.58);
        return [x,y,bellyZ(x,y)+.009];
      });
      path(torso,ooze,vein,.008,.004);
    }else{
      // The existing fuse animation drives a belly material and a separate vein material.
      acidMat.emissive.setHex(0x758c21);acidMat.emissiveIntensity=.3;u.pulseMats=[acidMat,ooze];
      for(let i=0;i<8;i++){
        const side=i%2?1:-1,sz=.15+(i%3)*.065;egg(torso,shadow,side*(.13+(i%3)*.09),.35+Math.floor(i/2)*.055,-.20,sz+.027,sz+.04,sz+.03);egg(torso,sac,side*(.13+(i%3)*.09),.37+Math.floor(i/2)*.055,-.22,sz,sz*1.08,sz);egg(torso,acidMat,side*(.13+(i%3)*.09),.42+Math.floor(i/2)*.055,-.31,sz*.58,sz*.45,sz*.58);
      }
      for(const side of [-1,1]){
        const fissure=[[side*.08,.39],[side*.13,.27],[side*.08,.15],[side*.2,.03],[side*.16,-.12]].map(([x,y])=>[x,y,bellyZ(x,y)+.01]);path(torso,wound,fissure,.020);path(torso,ooze,fissure.map(([x,y,z])=>[x,y,z+.009]),.008);
        path(torso,ooze,[[side*.13,.27],[side*.27,.21],[side*.31,.11]].map(([x,y])=>[x,y,bellyZ(x,y)+.012]),.008);
        // The centerline sits just under the faceted sphere; the tube's outer face
        // stays visible without a daylight gap along the upper and lower sac.
        const strap=(x,y)=>[side*x,y,bellyZ(side*x,y)-.020];
        path(torso,leather,[[side*.20,.44,.11],strap(.23,.38),strap(.26,.34),strap(.30,.28),strap(.34,.22),strap(.37,.14),strap(.39,.08),strap(.37,0),strap(.32,-.08)],.023);
      }
      for(let j=0;j<7;j++)rag(hips,leather,(j-3)*.067,.11,.245,.075,.18+(j%2)*.05);
    }
  }
  if(drowned){
    const body=conceptSurface(T,drownedBody.geometry,s);
    const front=(x,y)=>body(x,y,1),back=(x,y)=>body(x,y,-1);
    // The slats remain the Drowned's front tell, with the straps holding them against the chest.
    const wood=mat(0x74513a,false,0,'wood');
    for(const side of [-1,1]){
      const harness=[[.096,.455],[.116,.391],[.132,.317],[.128,.229],[.110,.137]];
      path(torso,leather,harness.map(([x,y])=>[x*side,y,front(x*side,y)+.006]),.017,.015);
      path(torso,leather,harness.map(([x,y])=>[x*side,y,back(x*side,y)-.005]),.012,.010);
    }
    for(let row=0;row<4;row++){
      const y=.337-row*.057,w=.118+(row%2)*.010,z=front(0,y)+.026;
      plate(torso,wood,[[y-.021,w*.95,z-.005,.025],[y-.016,w,z,.023],
        [y+.015,w,z+.003,.023],[y+.019,w*.93,z-.003,.024]],.026);
      for(const side of [-1,1])egg(torso,rust,side*w*.77,y,z-.006,.018,.018,.014);
    }
    // Each frond starts within the hull and follows its surface before trailing.
    const fronds=[
      [[-.114,.43],[-.126,.315],[-.142,.178],[-.112,.068]],
      [[-.082,.42],[-.106,.29],[-.087,.16],[-.104,.043]],
      [[-.038,.389],[-.046,.272],[-.029,.145],[-.064,.025]],
      [[.041,.438],[.019,.34],[.044,.264],[.024,.173],[.063,.066],[.039,.036]],
      [[.093,.413],[.085,.348],[.112,.284],[.121,.198],[.098,.112],[.086,.047]],
      [[.118,.38],[.146,.252],[.146,.144],[.111,.069]]
    ];
    for(const frond of fronds){
      const points=frond.map(([x,y],i)=>[x,y,back(x,y)+(i===0?.003:-.005-i*.004)]);
      ribbon(torso,moss,points,.016,back);
    }
    for(const side of [-1,1]){
      const x=side*.110;
      const points=[[x,.161],[x*1.1,.088],[x*.92,.028]].map(([x,y])=>[x,y,headDepth(x,y,-1)-.003]);
      path(head,moss,points,.011,.005);
    }
    const armSurface=conceptSurface(T,armLG.userData.upper.geometry,s);
    for(const [parent,depth,spots] of [
      [armLG,(x,y)=>armSurface(x,y,1),[[-.049,-.039,.026],[-.058,-.083,.020],[-.042,-.124,.023],[-.047,-.166,.016]]],
      [head,(x,y)=>headDepth(x,y,-1),[[-.054,.090,.023],[.026,.124,.019],[.076,.077,.022],[-.083,.038,.016]]],
    ]){
      const sign=parent===head?-1:1;
      for(const [x,y,r] of spots){
        const z=depth(x,y);
        egg(parent,pale,x,y,z-sign*.003,r*1.78,r*1.58,r*.93);
        egg(parent,shadow,x,y,z+sign*r*.34,r*.78,r*.66,r*.39);
      }
    }
  }
  if(k==='leaper'){
    // Root the dorsal ridge on the taper of the hunched back; the older fixed
    // z plane left its lower vertebrae and attachment pegs in open air.
    const backRings=[[.02,.116],[.17,.141],[.31,.150],[.42,.126],[.48,.084]];
    const backDepth=y=>{for(let j=1;j<backRings.length;j++)if(y<=backRings[j][0]){const [y0,z0]=backRings[j-1],[y1,z1]=backRings[j];return z0+(z1-z0)*Math.max(0,(y-y0)/(y1-y0));}return backRings.at(-1)[1];};
    for(let i=0;i<7;i++){const y=.02+i*.065,z=-backDepth(y)+.008;spike(torso,pale,[0,y,z],[0,y+.04,z-.115-(i%2)*.045],.038);}
    for(const side of [-1,1]){
      egg(side<0?armLG:armRG,pale,0,-.14,.01,.19,.3,.19);
      for(let i=0;i<4;i++)rod(torso,pale,[side*.04,.33-i*.065,.14],[side*.17,.29-i*.065,.10],.015,.009);
    }
    // Short strips root into the rounded waistband; long flat tabs projected
    // backward when the Leaper pitched its hips into the four-footed walk.
    for(let j=0;j<5;j++){
      const x=(j-2)*.045,rx=wide*.405,z=deep*.43*Math.sqrt(Math.max(0,1-(x/rx)**2))-.015;
      rag(hips,wound,x,.1,z,.045,.10-(j%2)*.02);
    }
    for(let i=0;i<6;i++){const y=.07+i*.062,z=-backDepth(y);egg(torso,wound,0,y,z-.004,.09,.073,.022);egg(torso,pale,0,y,z-.014,.07,.044,.054);}
    for(const side of [-1,1])path(torso,shadow,[[side*.18,.4,-.07],[side*.10,.24,-.14],[side*.07,.03,-.11]],.014);
  }
  if(heavy){
    const fire=mat(k==='brute'?0xc3a253:0xff9127,k!=='brute');
    if(k==='demon')u.emberMat=fire;
    const armor=k==='demon'?hair:steel;
    box(torso,armor,0,.29,.226,wide*.83,.34,.10);
    box(torso,rust,0,.458,.280,wide*.86,.025,.022);box(torso,rust,0,.123,.280,wide*.86,.026,.022);
    for(const side of [-1,1]){
      box(torso,rust,side*wide*.405,.29,.28,.025,.30,.024);
      for(let i=0;i<3;i++)egg(torso,steel,side*wide*.40,.17+i*.11,.30,.023,.024,.014);
      egg(torso,skin,side*.19,.475,-.04,.29,.20,.24,side*.35);
      const arm=side<0?armLG:armRG;if(k!=='colossus')egg(arm,pale,side*.075,-.16,.025,.17,.27,.18,side*.25);   // D-242 colossus P1 #9 (Q4): a flat pale disc on the upper arm (a sticker); its wound slashes stay
      for(let j=0;j<(k==='brute'?1:3);j++)path(arm,wound,[[side*.075,-.04-j*.04,.16],[side*.11,-.12-j*.045,.13],[side*.08,-.19-j*.04,.12]],.009);
    }
    for(const side of [-1,1]){
      const arm=side<0?armLG:armRG,el=arm.userData.elbowG,shin=(side<0?legLG:legRG).userData.shinG;
      if(k==='brute')path(torso,leather,[[side*.205,.47,.172],[side*.227,.39,.211],[side*.239,.29,.225],[side*.222,.18,.204],[side*.151,.105,.177]],.025,.023);
      else if(k!=='colossus')box(torso,leather,side*.265,.27,.23,.058,.47,.04,side*.12);   // D-242 colossus P1 #3 (Q5): flat boards standing off the plate's edge; its stone carrier's straps run down the plate instead
      box(torso,rust,side*.264,.34,.263,.083,.062,.024);
      box(torso,hair,side*.264,.341,.28,.047,.029,.009);box(torso,rust,side*.263,.341,.289,.007,.041,.008);
      rock(arm,armor,side*.04,.055,0,.34,.16,.36,-side*.2);
      box(el,armor,0,-.2,.117,.24,.20,.065,side*.1);
      for(let j=0;j<3;j++){box(shin,j%2?rust:armor,0,-.035-j*.092,.112,.205-j*.017,.12,.07,side*.04);if(k!=='colossus')box(el,leather,0,-.10-j*.06,.13,.24,.025,.02);}   // D-242 colossus P1 #6 (Q5): flat straps wider than the forearm stuck out both sides; the curved straps (zombie-fidelity) stay
      for(let j=0;j<3;j++)for(const sign of [-1,1]){egg(el,steel,sign*.087,-.10-j*.06,.151,.017,.018,.011);egg(shin,rust,sign*.071,-.047-j*.092,.151,.018,.019,.011);}
      box(shin,armor,0,-.35,.065,.23,.1,.29);
      if(!brute)for(let j=0;j<3;j++)rag(hips,cloth,side*(.05+j*.065),.12,.20,.083,.24+(j%2)*.06,side*.1);
      if(k!=='brute')for(let j=0;j<3;j++)spike(arm,rust,[side*.06,.09,-.1+j*.09],[side*(.15+j*.015),.28+(j%2)*.1,-.16+j*.1],.047);
    }
    if(k==='brute'){
      fire.userData.surface='metal';
      spike(armLG,steel,[-.08,.06,0],[-.29,.37,-.03],.12);
      box(torso,steel,0,.29,-.223,.52,.33,.09,-.06);
      for(const side of [-1,1]){path(torso,leather,[[side*.205,.47,.172],[side*.233,.49,-.035],[side*.228,.40,-.203],[side*.192,.26,-.216],[side*.148,.12,-.164]],.027,.023);box(torso,rust,side*.21,.35,-.281,.04,.045,.019);}
      for(let j=0;j<3;j++)rock(head,skin,(j-1)*.09,.10,-.06+(j%2)*.10,.077,.07,.07,j*.8);
      for(let i=0;i<5;i++)box(head,steel,(i-2)*.04,-.145,.159,.032,.062,.026,(i-2)*.08);
    }else{
      for(let i=0;i<3;i++)box(torso,fire,(i-1)*.115,.078,.234,.06,.11,.025);
      box(head,armor,0,.105,.165,.36,.1,.075);box(head,armor,0,.175,0,.39,.09,.31);
      if(k==='colossus'){
        const hazard=mat(0xc39648,false,.2,'metal');
        box(armLG,steel,-.10,.105,0,.52,.38,.32,-.18);box(armLG,hazard,-.10,.12,.19,.53,.39,.10,-.18);
        for(let j=0;j<3;j++)box(armLG,hair,-.265+j*.145,.14,.25,.048,.29,.011,-.45);
        for(const x of [-.23,-.02])path(armLG,rust,[[x,.29,.1],[x-.025,.45,.07],[x+.072,.47,.07],[x+.093,.30,.1]],.019);
        for(const x of [-.31,.10])for(const y of [-.035,.27])egg(armLG,steel,x,y,.255,.029,.030,.012);
        for(let j=0;j<3;j++)box(torso,j%2?rust:steel,.025,.18+j*.081,.29+j*.014,.42-(j%2)*.05,.10,.037,(j%2?1:-1)*.065);
        for(let j=0;j<4;j++)box(torso,steel,(j-1.5)*.13,.32,-.25,.11,.4,.09,(j-1.5)*.06);
        for(const side of [-1,1]){
          const leg=side<0?legLG:legRG;
          // Two lapped scrap plates follow the heavy thigh loft. The old flat
          // boxes hung several centimeters ahead of its curved outer edges.
          plate(leg,rust,[[-.16,.098,.155,.052],[-.09,.100,.150,.053],[-.02,.090,.132,.042]],.022);
          plate(leg,rust,[[-.27,.089,.143,.047],[-.20,.095,.151,.051],[-.13,.098,.158,.052]],.022);
          path(torso,hair,[[side*.22,.42,-.26],[side*.29,.29,-.29],[side*.21,.04,-.26]],.021);
        }
      }else{
        for(const side of [-1,1]){
          // Sweep out before curling up: the skull remains in its existing headshot band.
          const pts=[[side*.13,.13,-.03],[side*.30,.18,-.07],[side*.46,.29,-.12],[side*.43,.39,-.13],[side*.34,.43,-.11]];
          for(let j=0;j<4;j++)rod(head,j>=2?teeth:hair,pts[j],pts[j+1],.084-j*.018,j===3?0:.066-j*.018,7);
          for(let j=0;j<2;j++)egg(head,rust,side*(.17+j*.068),.145+j*.022,-.038-j*.02,.10-j*.02,.088-j*.016,.085-j*.01);
          for(let j=0;j<4;j++)spike(torso,rust,[side*.2,.12+j*.09,-.18],[side*.28,.28+j*.10,-.39],.065);
          const crack=[[side*.025,.12,.292],[side*.079,.225,.301],[side*.146,.305,.301],[side*.24,.42,.289]];
          path(torso,mouth,crack,.032);path(torso,fire,crack.map(([x,y,z])=>[x,y,z+.012]),.014);
          path(torso,fire,[[side*.09,.23,.315],[side*.205,.24,.308],[side*.267,.29,.30]],.009);
          path(torso,fire,[[side*.045,.155,-.23],[side*.115,.27,-.244],[side*.18,.43,-.20]],.009);
          rock(torso,rust,side*.185,.22,.265,.18,.19,.095,side*.2);
        }
      }
    }
  }
  if(k==='brute'||k==='colossus')refineHeavyArmor(A,T,g,s,k,{steel,rust,hair,leather,wound,cloth});
  if(k==='brute')for(const m of A.mats)if(m.color.getHex()===0x8e3027&&m.userData.surface==='metal'){
    // The shared metal tile has little diffuse response; painted charcoal must keep a visible value floor.
    m.color.set(0x424746);m.userData.surface='leather';
  }
  if(k==='guardian'||k==='caveguard'){
    const stone=k==='caveguard';
    for(const side of [-1,1]){rock(side<0?armLG:armRG,stone?pale:skin,0,-.12,.015,.28,.4,.26);rock(torso,pale,side*.24,.40,0,.27,.2,.29);}
    for(let j=0;j<5;j++)spike(torso,pale,[0,.08+j*.08,-.14],[0,.3+j*.10,-.33],.065);
    box(head,stone?pale:shadow,0,.15,.11,.39,.10,.2);
  }
  if(k==='spider')buildSpider(A,T,g,s);
  if(k==='demon')sculptDemon(A,T,g,s,{skin,shadow,mouth,teeth,hair,rust,cloth});
  // The pulsing belly remains emissive, but still needs its stretched wet skin.
  if(k==='bomber'){
    const belly=u.pulseMats[0];Object.assign(belly,detailMaterial(T));
    g.traverse(o=>{if(o.isMesh&&o.material===belly)o.geometry.setAttribute('uv',new T.Float32BufferAttribute(detailUV(T,o.geometry,'wet'),2));});
  }
  refineHumanoid(A,T,g,s,k,{skin,shadow,pale,wound,mouth,teeth,hair,cloth,shirt,leather,steel,rust,moss},u.look); // CC-355 (Claude 3): the humanoids' anatomy
  if(k==='brute')refineBrute(A,T,g,s,{skin,shadow,wound,teeth,leather,steel});
  if(audit) audit({type:k,root:g}); // Inspect separate parts before draw-call batching hides their seams.
  batchGlow(T,g);
  const keep=new Set([...u.eyes.map(e=>e.material),...A.mats.filter(m=>m.emissive.getHex()!==0)]);
  batchSurfaces(T,g,keep);u.bodyMats=g.userData.mats.filter(m=>!keep.has(m));
  // Track actual materials (old removed pulse materials must never flash detached meshes).
  u.concept={version:2,type:k,skin:skin.color.getHex(),eye:glowColor};
  remember(T,g,cacheKey);
  mergeEyes(T,g);
  return true;
}

// Sample the triangulated surface so attached details can follow the skin.
function conceptSurface(T,geometry,s){
  const vertices=geometry.attributes.position,index=geometry.index.array;
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),hit=new T.Vector3(),ray=new T.Ray();
  return (x,y,side)=>{
    ray.origin.set(x*s,y*s,side*s);
    ray.direction.set(0,0,-side);
    let best=-Infinity;
    for(let i=0;i<index.length;i+=3){
      a.fromBufferAttribute(vertices,index[i]);
      b.fromBufferAttribute(vertices,index[i+1]);
      c.fromBufferAttribute(vertices,index[i+2]);
      if(ray.intersectTriangle(a,b,c,false,hit))best=Math.max(best,hit.z*side);
    }
    if(!Number.isFinite(best))throw new Error('Concept surface sample outside the mesh: '+x+', '+y);
    return best*side/s;
  };
}
// D-242 P2: a path with round sections for the spitter's fingers (path() is four-sided).
function roundPath(A,T,p,m,s,pts,r,end,sides=6){
  const curve=new T.CatmullRomCurve3(pts.map(v=>new T.Vector3(...v))),steps=Math.max(1,pts.length-1);
  const pos=[],idx=[],N=new T.Vector3(),B=new T.Vector3();
  for(let j=0;j<=steps;j++){
    const t=j/steps,P=curve.getPoint(t),D=curve.getTangent(t),radius=Math.max(.0002,r+(end-r)*t);
    if(!j)N.set(0,Math.abs(D.y)<.9?1:0,Math.abs(D.y)<.9?0:1).cross(D).normalize();
    else N.addScaledVector(D,-N.dot(D)).normalize();
    B.crossVectors(D,N).normalize();
    for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,V=P.clone().addScaledVector(N,Math.cos(a)*radius).addScaledVector(B,Math.sin(a)*radius);pos.push(V.x*s,V.y*s,V.z*s);
      if(j<steps){const x=j*sides+i,y=j*sides+(i+1)%sides;idx.push(x,y,x+sides,y,y+sides,x+sides);}}
  }
  for(const edge of [0,steps]){const P=curve.getPoint(edge/steps),c=pos.length/3;pos.push(P.x*s,P.y*s,P.z*s);for(let i=0;i<sides;i++){const a=edge*sides+i,b=edge*sides+(i+1)%sides;idx.push(c,...(edge?[a,b]:[b,a]));}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();return A.put(p,geo,m);
}
function spitterVest(A,T,torso,cloth,s,surface){
  const rows=[[.085,.135],[.170,.168],[.235,.211],[.31,.212],[.3475,.207],[.385,.188],[.426,.137]];
  const positions=[],indices=[],across=7;
  const count=rows.length*across;
  for(const inner of [false,true])for(const [y,w] of rows)for(let i=0;i<across;i++){
    const x=w*(2*i/(across-1)-1),z=surface(x,y,-1);
    positions.push(x*s,y*s,(z+(inner?.004:-.009))*s);
  }
  for(let row=0;row<rows.length-1;row++)for(let i=0;i<across-1;i++){
    const a=row*across+i,b=a+across;
    indices.push(a,b,a+1,b,b+1,a+1,a+count,a+1+count,b+count,b+count,a+1+count,b+1+count);
  }
  const rim=[];
  for(let i=0;i<across;i++)rim.push(i);
  for(let row=1;row<rows.length;row++)rim.push(row*across+across-1);
  for(let i=across-2;i>=0;i--)rim.push((rows.length-1)*across+i);
  for(let row=rows.length-2;row>0;row--)rim.push(row*across);
  for(let i=0;i<rim.length;i++){
    const a=rim[i],b=rim[(i+1)%rim.length];
    indices.push(a,b,a+count,b,b+count,a+count);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  A.put(torso,geometry,cloth);
}

function hairLock(A,T,p,m,s,points,width){
  const verts=[],uv=[],idx=[];
  for(let i=0;i<points.length;i++){
    const [x,y,z]=points[i],w=width*(1-i/(points.length-1));
    verts.push((x-w)*s,y*s,z*s,x*s,(y+.012)*s,(z+.008)*s,(x+w)*s,y*s,z*s);
    uv.push(0,i/(points.length-1),.5,i/(points.length-1),1,i/(points.length-1));
    if(i){const a=(i-1)*3;for(let j=0;j<2;j++){idx.push(a+j,a+j+3,a+j+1,a+j+1,a+j+3,a+j+4);idx.push(a+j+1,a+j+3,a+j,a+j+4,a+j+3,a+j+1);}}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);const flat=geo.toNonIndexed();flat.computeVertexNormals();A.put(p,flat,m);
}

function buildTank(A,T,torso,s,wide,shirt,k){
  const pos=[],uv=[],n=24,rows=5;
  const vertex=(j,i)=>{
    const a=i/n*Math.PI*2,xn=Math.sin(a),zn=Math.cos(a),front=zn>0;
    const top=front?.28+.17*Math.pow(Math.abs(xn),.8):.36+.09*Math.abs(xn);
    const hem=.055+Math.sin(i*3.1)*.027+(i%4===0?.038:0),t=j/rows;
    const y=hem+(top-hem)*t,rx=wide*(.367+.133*Math.sin(t*Math.PI*.73));
    const fold=.005*Math.sin(i*2.9+j*.8),z=zn*(.168+.022*Math.sin(t*Math.PI))+fold;
    return [xn*rx*s,y*s,z*s];
  };
  const tri=(a,b,c,ta,tb,tc)=>{pos.push(...a,...b,...c);uv.push(...ta,...tb,...tc);};
  for(let j=0;j<rows;j++)for(let i=0;i<n;i++){
    // Open tears reveal actual skin/ribs. Offset the damage instead of repeating a hem fringe.
    if((j===0&&(i%5===1||i===14))||(j===1&&(i===2||i===17))||(k==='screamer'&&j<3&&(i===0||i===23||i===11)))continue;
    const a=vertex(j,i),b=vertex(j,i+1),c=vertex(j+1,i),d=vertex(j+1,i+1);
    const ta=[i/n,j/rows],tb=[(i+1)/n,j/rows],tc=[i/n,(j+1)/rows],td=[(i+1)/n,(j+1)/rows];
    tri(a,b,c,ta,tb,tc);tri(b,d,c,tb,td,tc);tri(c,b,a,tc,tb,ta);tri(c,d,b,tc,td,tb);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();A.put(torso,geo,shirt);
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2;
    A.rag(torso,shirt,Math.sin(a)*wide*.33,.075,Math.cos(a)*.148,.042,.06+(i%3)*.027,Math.sin(a)*.25);
  }
}

function batchGlow(T,g){
  const groups=[];g.traverse(o=>{if(o.isGroup)groups.push(o);});
  for(const p of groups){
    const byMaterial=new Map();
    for(const m of p.children)if(m.isMesh&&m.material.emissive?.getHex()){
      const a=byMaterial.get(m.material)||[];a.push(m);byMaterial.set(m.material,a);
    }
    for(const [mat,meshes] of byMaterial){
      // Eye meshes are animation references, and each has its own material.
      if(meshes.length<2)continue;
      const positions=[],normals=[],uv=[];
      for(const m of meshes){m.updateMatrix();const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);
        positions.push(...geo.getAttribute('position').array);normals.push(...geo.getAttribute('normal').array);
        const tex=geo.getAttribute('uv');if(tex)uv.push(...tex.array);else for(let i=0;i<geo.getAttribute('position').count;i++)uv.push(0,0);
        geo.dispose();m.removeFromParent();}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
      if(mat.map)geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
      const m=new T.Mesh(geo,mat);m.name='concept-glow';m.castShadow=true;p.add(m);
    }
  }
}

function buildSpider(A,T,g,s){
  const {mat,egg,rock,box,rod,spike,path,loft}=A,u=g.userData,{torso,head}=u;
  // Strip the generic replacement, retaining the original eyes and all six limb joints.
  stripMeshes(g,new Set(u.eyes));
  const shell=mat(0xc5c8b9,false,0,'bone'),edge=mat(0x929b8a,false,0,'bone'),joint=mat(0x41423a,false,0,'root'),claw=mat(0x292e29,false,0,'bone'),pink=mat(0xd77b9b,false,0,'wet');
  egg(torso,joint,0,.07,-.17,.66,.35,1.03);
  for(let i=0;i<5;i++){
    const z=.32-i*.205,w=.48+Math.sin(i/4*Math.PI)*.24;
    egg(torso,shell,0,.16,z,w,.27,.29);
    spike(torso,shell,[0,.23,z],[0,.40+(i%2)*.05,z-.09],.066);
    for(const side of [-1,1])egg(torso,edge,side*w*.35,.235,z,.071,.063,.068);
    path(torso,joint,[[0,.295,z+.095],[0,.31,z],[0,.29,z-.095]],.009);
    for(const side of [-1,1]){rock(torso,edge,side*w*.36,.12,z-.025,w*.26,.20,.235,-side*.35);spike(torso,shell,[side*w*.42,.15,z],[side*w*.55,.17,z-.13],.042);}
  }
  egg(head,shell,0,0,.01,.33,.24,.31);
  path(head,edge,[[-.14,.075,.09],[-.07,.10,.136],[.07,.10,.136],[.14,.075,.09]],.017);
  egg(head,joint,0,-.075,.139,.19,.065,.043);
  for(const side of [-1,1]){
    egg(head,pink,side*.041,-.014,.170,.034,.027,.014);
    rock(head,edge,side*.137,-.025,.065,.14,.16,.17,side*.3);
    path(head,shell,[[side*.10,-.064,.155],[side*.15,-.14,.196],[side*.11,-.205,.24]],.037);
    A.sweep(head,claw,[[side*.11,-.205,.24],[side*.055,-.19,.29],[side*.037,-.12,.28]],.024,0);
  }
  for(const e of u.eyes){e.position.set(Math.sign(e.position.x)*.103*s,.04*s,.145*s);e.scale.set(.65,.50,.45);}
  for(const limb of u.crawlLimbs||[]){
    const L1=limb.knee.position.y/s;
    // Existing lower joints encode the exact ground reach; recover it from the rest axis.
    const dir=new T.Vector3(0,1,0).applyQuaternion(limb.kneeQ).applyQuaternion(limb.baseQ);
    const upperY=new T.Vector3(0,L1,0).applyQuaternion(limb.baseQ).y;
    const L2=(.52+upperY-.05)/-dir.y;
    egg(limb.root,joint,0,0,0,.21,.21,.21);
    loft(limb.root,shell,[[.02,.095,.085],[L1*.24,.112,.093],[L1*.65,.091,.075],[L1-.02,.065,.06]],10);
    path(limb.root,edge,[[0,.05,.08],[0,L1*.45,.094],[0,L1-.035,.055]],.017);
    egg(limb.knee,joint,0,0,0,.19,.19,.19); // socket follows the moving knee, not the upper plate
    for(let i=0;i<3;i++){
      const a=.06+i*(L1-.1)/3;
      spike(limb.root,shell,[.065,a+.025,0],[.15,a+.07,-.07],.033);
    }
    loft(limb.knee,shell,[[.025,.08,.075],[L2*.25,.09,.074],[L2*.62,.06,.052],[L2-.07,.035,.03]],10);
    path(limb.knee,edge,[[0,.05,.068],[0,L2*.45,.072],[0,L2-.10,.027]],.012);
    A.sweep(limb.knee,claw,[[0,L2-.1,0],[0,L2,.022],[0,L2+.035,.13],[0,L2+.028,.20]],.039,0);
  }
  torso.userData.bodyMat=shell;u.bodyMats=[shell];
}

// Same pose/IK skeleton; two deliberately different surface designs.
export function applyGuardianConcept({THREE:T,g,rbox,kind='caveguard',audit=null}){
  const A=sculpt(T,1,rbox);stripMeshes(g);
  const eye=sculptGuardian(A,T,g,kind);
  g.userData.mats=A.mats;g.userData.concept={version:2,type:kind};
  if(audit) audit({type:kind,root:g});
  batchSurfaces(T,g,new Set([eye]));
  // Same articulated skeleton, with shared deformation at shoulders, wrists and fingers.
  const merged=skinMergeGroup(T,g,{keep:new Set([eye]),name:'guardian-skin'});
  if(merged){for(const skin of merged.meshes)blendZombieJoins(T,g,skin);g.userData.mats=[...merged.meshes.map(m=>m.material),eye];}
}

// Guardians don't pass through the zombie compactor. Merge opaque surfaces per bone,
// preserving vertex colour and every articulated finger, jaw and eye.
function batchSurfaces(T,g,keep){
  const groups=[];g.traverse(o=>{if(o.isGroup)groups.push(o);});const mats=[];
  for(const p of groups){
    const all=p.children.filter(o=>o.isMesh&&!keep.has(o.material));if(!all.length)continue;
    // CC-359 (proposal, Claude 3): pieces painted from their own atlas (material.userData.cc359Atlas) keep their UVs and that material
    for(const meshes of [all.filter(o=>!o.material.userData.cc359Atlas),all.filter(o=>o.material.userData.cc359Atlas)]){if(!meshes.length)continue;const atlasMat=meshes[0].material.userData.cc359Atlas?meshes[0].material:null;
    const count=meshes.reduce((sum,o)=>sum+(o.geometry.index?.count??o.geometry.attributes.position.count),0);
    const pos=new Float32Array(count*3),norm=new Float32Array(count*3),col=new Float32Array(count*3),uv=new Float32Array(count*2);
    const hasBootAttachment=meshes.some(o=>o.userData.bootAttachment||o.geometry.attributes.bootAttachment);
    const bootAttachment=hasBootAttachment?new Float32Array(count):null;
    let jawSkinRanges, start=0;
    for(const o of meshes){o.updateMatrix();const src=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();src.applyMatrix4(o.matrix);
      const mapped=atlasMat?src.getAttribute('uv').array:detailUV(T,src,o.material.userData.surface||'skin');
      uv.set(mapped,start*2);
      const a=src.getAttribute('position'),n=src.getAttribute('normal'),c=o.material.color,vc=o.material.vertexColors&&src.getAttribute('color'),binding=src.getAttribute('bootAttachment');
      if (o.userData.cc359JawSkin) (jawSkinRanges ??= []).push([start, start + a.count]);
      for(let i=0;i<a.count;i++){
        const v=start+i,k=v*3;
        pos[k]=a.getX(i);pos[k+1]=a.getY(i);pos[k+2]=a.getZ(i);
        norm[k]=n.getX(i);norm[k+1]=n.getY(i);norm[k+2]=n.getZ(i);
        col[k]=c.r*(vc?vc.getX(i):1);col[k+1]=c.g*(vc?vc.getY(i):1);col[k+2]=c.b*(vc?vc.getZ(i):1);
        if(bootAttachment)bootAttachment[v]=o.userData.bootAttachment?1:(binding?.getX(i)||0);
      }
      start+=a.count;
      src.dispose();o.removeFromParent();
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('normal',new T.BufferAttribute(norm,3));
    geo.setAttribute('color',new T.BufferAttribute(col,3));geo.setAttribute('uv',new T.BufferAttribute(uv,2));
    if(bootAttachment)geo.setAttribute('bootAttachment',new T.BufferAttribute(bootAttachment,1));
    if (jawSkinRanges) {
      const mask = new Uint8Array(geo.attributes.position.count);
      for (const [start, end] of jawSkinRanges) mask.fill(1, start, end);
      geo.userData.cc359JawSkinMask = mask;
    }
    const material=atlasMat||new T.MeshStandardMaterial({vertexColors:true,roughness:.86,...detailMaterial(T)});if(!mats.includes(material))mats.push(material);
    const m=new T.Mesh(geo,material);m.castShadow=true;m.name='concept-surface';m.userData.compacted=true;p.add(m);
    if(p.userData.thigh)p.userData.thigh=m;if(p.userData.upper)p.userData.upper=m;if(p.userData.bodyMat)p.userData.bodyMat=material;
  }}
  g.userData.mats=[...mats,...keep];
}
