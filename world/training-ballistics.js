import { TRAINING, segmentBox } from './training.js';
export const IMPACT_LIFE = 20, IMPACT_FADE = 4;

// One surface query for the reticle and the rounds. Training is below the world;
// the outdoor height-field search must never march out of this room to find land.
export function trainingFloorHit(tg, origin, direction) {
  if (direction.y >= -1e-8 || origin.y < tg.floorY) return null;
  const distance = (tg.floorY - origin.y) / direction.y;
  const x = origin.x + direction.x * distance, z = origin.z + direction.z * distance;
  if (![TRAINING.RANGE, TRAINING.BUILD].some(r => x >= tg.origin.x+r.minX && x <= tg.origin.x+r.maxX && z >= tg.origin.z+r.minZ && z <= tg.origin.z+r.maxZ)) return null;
  return {distance, x, y:tg.floorY, z};
}

export function traceTraining(tg, a, b, opts) {
  const d={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z};
  // The range walls face inward. From outside, the camera looks through the near one;
  // that face is not an aim surface. A round fired from inside still hits it.
  const glass=opts&&opts.throughGlass;
  let hit=null, fraction=Infinity;
  for(const solid of tg.solids) {
    if(glass && (solid.firingFence||solid.firingFrame||tg.cutaway?.ignoreSolid(solid)))continue;
    if(solid.target!=null && (opts?.ignoreTargets?.has(solid.target)||tg.targets[solid.target].state!=='up'))continue;
    if(glass&&solid.wall&&solid.surface&&d.x*solid.surface.nx+d.z*solid.surface.nz>1e-6)continue;
    let t;
    if(solid.target!=null){
      // A target is a thin drawn plate, not the front face of its broad-phase box.
      // Aim, silhouette tests and scoring must share the actual upright surface.
      if(Math.abs(d.z)<1e-10)continue;
      t=((solid.minZ+solid.maxZ)*.5-a.z)/d.z;
      if(t<0||t>1)continue;
      const x=a.x+d.x*t,y=a.y+d.y*t;
      if(x<solid.minX||x>solid.maxX||y<solid.minY||y>solid.maxY)continue;
    }else t=segmentBox(a,b,solid);
    // CL-144: a plate is hit only on its silhouette; through the cut-away corners the round goes on
    if(t!==null && solid.target!=null && tg.onPlate && !tg.onPlate(solid.target,{x:a.x+d.x*t,y:a.y+d.y*t,z:a.z+d.z*t}))continue;
    if(t!==null && t<fraction){fraction=t;hit={solid,t};}
  }
  const floor=trainingFloorHit(tg,a,d);
  if(floor && floor.distance<=1 && floor.distance<fraction){fraction=floor.distance;hit={solid:{floor:true},t:fraction};}
  if(!hit)return null;
  hit.point={x:a.x+d.x*fraction,y:a.y+d.y*fraction,z:a.z+d.z*fraction};
  hit.normal={x:0,y:0,z:0};
  if(hit.solid.floor)hit.normal.y=1;
  else if(hit.solid.target!=null)hit.normal.z=d.z>0?-1:1;
  else {
    let nearest=Infinity;
    for(const [axis,lo,hi]of [['x','minX','maxX'],['y','minY','maxY'],['z','minZ','maxZ']])for(const[key,sign]of [[lo,-1],[hi,1]]){
      const distance=Math.abs(hit.point[axis]-hit.solid[key]);
      if(distance<nearest){nearest=distance;hit.normal={x:0,y:0,z:0};hit.normal[axis]=sign;}
    }
  }
  return hit;
}

// Fixed-size pools: one static batch and one small batch per moving target.
// Marks inherit the target hinge, so they fall/rise with its plate.
export function createTrainingImpacts(T,tg) {
  let map=null;
  if(typeof document!=='undefined'){
    const cv=document.createElement('canvas');cv.width=cv.height=64;
    const c=cv.getContext('2d');
    const rim=c.createRadialGradient(32,32,3,32,32,30);
    rim.addColorStop(0,'#080a0b');rim.addColorStop(.23,'#111416');rim.addColorStop(.31,'#a0a09a');rim.addColorStop(.48,'#666962');rim.addColorStop(1,'rgba(70,72,66,0)');
    c.fillStyle=rim;c.fillRect(0,0,64,64);
    c.strokeStyle='#444843';c.lineWidth=1.5;
    for(let i=0;i<7;i++){const a=i*2.4;c.beginPath();c.moveTo(32+Math.cos(a)*8,32+Math.sin(a)*8);c.lineTo(32+Math.cos(a)*21,32+Math.sin(a)*21);c.stroke();}
    map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;
  }
  const mat=new T.MeshBasicMaterial({map,transparent:true,vertexColors:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  mat.name='training-impact-mark';
  const corners=[[-.5,-.5],[.5,-.5],[-.5,.5],[.5,-.5],[.5,.5],[-.5,.5]];
  // Quads share a vertex buffer rather than an instance-uniform whose compiled
  // length changes with count in the bundled WebGPU renderer.
  const make=(parent,capacity)=>{
    const geo=new T.BufferGeometry(),positions=new T.Float32BufferAttribute(new Float32Array(capacity*18),3),uv=[];
    positions.setUsage(T.DynamicDrawUsage);
    for(let i=0;i<capacity;i++)for(const[x,y]of corners)uv.push(x+.5,y+.5);
    geo.setAttribute('position',positions);geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setDrawRange(0,0);
    const colors=new T.Float32BufferAttribute(new Float32Array(capacity*24).fill(1),4);colors.setUsage(T.DynamicDrawUsage);geo.setAttribute('color',colors);
    const mesh=new T.Mesh(geo,mat);mesh.name='training-impact-marks';mesh.renderOrder=1.1;mesh.frustumCulled=false;mesh.raycast=()=>{};parent.add(mesh);
    return{mesh,parent,capacity,next:0,count:0,positions,colors,life:new Float32Array(capacity)};
  };
  const batches=[make(tg.group,128),...tg.targets.map(t=>make(t.pivot,16))];
  const pos=new T.Vector3(),normal=new T.Vector3(),q=new T.Quaternion(),parentQ=new T.Quaternion(),vertex=new T.Vector3(),front=new T.Vector3(0,0,1);
  return {
    // Prime the actual meshes (including each hinged target) while the range is
    // blacked out. Restore draw ranges before play; no artificial hits or ammo use.
    prepareWarmup(){
      const ranges=batches.map(b=>b.mesh.geometry.drawRange.count);
      for(const b of batches){
        if(b.count)continue;
        corners.forEach(([x,y],i)=>b.positions.setXYZ(i,x*.06,y*.06,0));
        b.positions.needsUpdate=true;b.mesh.geometry.setDrawRange(0,6);
      }
      return()=>batches.forEach((b,i)=>b.mesh.geometry.setDrawRange(0,ranges[i]));
    },
    add(hit){
      const target=hit.solid.target, batch=batches[target==null?0:target+1];
      pos.set(hit.point.x,hit.point.y,hit.point.z);normal.set(hit.normal.x,hit.normal.y,hit.normal.z);
      const s=hit.solid.surface;
      if(s){if(s.nx)pos.x=s.x;if(s.nz)pos.z=s.z;normal.set(s.nx,0,s.nz);}
      if(target!=null)pos.z=tg.origin.z+tg.targets[target].z;
      const lift=hit.solid.floor?.0017:(target!=null?.0018:.0022);
      pos.addScaledVector(normal,lift);
      batch.parent.updateWorldMatrix(true,false);batch.parent.worldToLocal(pos);
      q.setFromUnitVectors(front,normal);batch.parent.getWorldQuaternion(parentQ);q.premultiply(parentQ.invert());
      const size=target==null?.12:.06;
      corners.forEach(([x,y],i)=>{vertex.set(x*size,y*size,0).applyQuaternion(q).add(pos);batch.positions.setXYZ(batch.next*6+i,vertex.x,vertex.y,vertex.z);});
      batch.life[batch.next]=IMPACT_LIFE;
      for(let i=0;i<6;i++)batch.colors.setW(batch.next*6+i,1);
      batch.colors.needsUpdate=true;
      batch.next=(batch.next+1)%batch.capacity;batch.count=Math.min(batch.capacity,batch.count+1);
      batch.positions.needsUpdate=true;batch.mesh.geometry.setDrawRange(0,batch.count*6);
    },
    update(dt){
      if(!(dt>0))return;
      for(const b of batches){let dirty=false,alive=0;
        for(let j=0;j<b.capacity;j++)if(b.life[j]>0){
          b.life[j]=Math.max(0,b.life[j]-dt);if(b.life[j]>0)alive++;
          if(b.life[j]<IMPACT_FADE){for(let i=0;i<6;i++)b.colors.setW(j*6+i,b.life[j]/IMPACT_FADE);dirty=true;}
        }
        if(dirty)b.colors.needsUpdate=true;
        if(!alive){b.mesh.geometry.setDrawRange(0,0);b.count=0;b.next=0;}
      }
    },
    clear(){for(const b of batches){b.mesh.geometry.setDrawRange(0,0);b.count=0;b.next=0;b.life.fill(0);}},
    count:()=>batches.reduce((n,b)=>n+b.life.reduce((a,t)=>a+(t>0?1:0),0),0),
    dispose(){for(const b of batches){b.mesh.removeFromParent();b.mesh.geometry.dispose();}mat.dispose();map?.dispose();}
  };
}

export const CHAR_LIFE = 30, CHAR_FADE = 6;

// J120 (Jerry, 2026-11-09) / AG-296: flames leave rich black char marks on walls, floor and target plates in the Training Ground, fading slowly.
// Batches are renderOrder 1 so flames (renderOrder 3) always render over them.
export function createTrainingChar(T, tg) {
  let map = null;
  if (typeof document !== 'undefined') {
    // 2x2 variant atlas (256x256, 128x128 per quadrant) of organic carbon-black scorch & soot clouds (zero repeating ring artifacts).
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const c = cv.getContext('2d');
    let seed = 120296;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const puff = (cx, cy, rx, ry, rot, r, g, b, a0, aMid) => {
      c.save(); c.translate(cx, cy); c.rotate(rot); c.scale(rx, ry);
      const gr = c.createRadialGradient(0, 0, 0.04, 0, 0, 1);
      gr.addColorStop(0, `rgba(${r},${g},${b},${a0})`);
      gr.addColorStop(0.42, `rgba(${r},${g},${b},${aMid})`);
      gr.addColorStop(0.76, `rgba(${Math.min(255, r + 10)},${Math.min(255, g + 7)},${Math.min(255, b + 5)},${(aMid * 0.34).toFixed(3)})`);
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill();
      c.restore();
    };
    for (let cell = 0; cell < 4; cell++) {
      const ox = (cell % 2) * 128 + 64, oy = ((cell >> 1) * 128) + 64;
      c.save();
      c.beginPath(); c.rect((cell % 2) * 128 + 3, (cell >> 1) * 128 + 3, 122, 122); c.clip();
      // Broad warm scorched-umber thermal halo
      puff(ox, oy - (cell >= 2 ? 4 : 0), 52, cell >= 2 ? 56 : 50, rnd() * 3.14, 24, 16, 11, 0.46, 0.22);
      // Multi-lobe turbulent soot clouds (irregular silhouette, velvety feathered fringe)
      const lobes = 14;
      for (let i = 0; i < lobes; i++) {
        const ang = (i / lobes) * Math.PI * 2 + (rnd() - 0.5) * 0.48;
        const dist = 7 + rnd() * 20;
        const upward = cell >= 2 && Math.sin(ang) < -0.2 ? 1.22 : 1;
        const lx = ox + Math.cos(ang) * dist * 0.92;
        const ly = oy + Math.sin(ang) * dist * upward;
        puff(lx, ly, (15 + rnd() * 16), (13 + rnd() * 15) * upward, rnd() * 3.14, 10, 8, 7, 0.62 + rnd() * 0.22, 0.30);
      }
      // Deep carbon-black scorched heart
      puff(ox + (rnd() - 0.5) * 5, oy + (rnd() - 0.5) * 5, 29, 26, rnd() * 3.14, 6, 5, 5, 0.96, 0.78);
      // Fine dry soot streaks radiating softly inside quadrant bounds
      for (let i = 0; i < 22; i++) {
        const ang = rnd() * Math.PI * 2, r0 = 10 + rnd() * 16, len = 10 + rnd() * 18;
        const sx = ox + Math.cos(ang) * (r0 + len * 0.45), sy = oy + Math.sin(ang) * (r0 + len * 0.45);
        puff(sx, sy, len * 0.55, 3.2 + rnd() * 4.5, ang, 12, 10, 9, 0.34 + rnd() * 0.2, 0.14);
      }
      c.restore();
    }
    map = new T.CanvasTexture(cv); map.colorSpace = T.SRGBColorSpace;
  }
  const mat = new T.MeshBasicMaterial({ map, transparent: true, vertexColors: true, depthWrite: false, side: T.DoubleSide, forceSinglePass: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  mat.name = 'training-char-mark';
  const corners = [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, -.5], [.5, .5], [-.5, .5]];
  const setQuadUV = (uvAttr, slot, cell) => {
    const u0 = (cell % 2) * 0.5 + 0.035, v0 = (cell >> 1) * 0.5 + 0.035, span = 0.43;
    for (let i = 0; i < 6; i++) {
      const [cx, cy] = corners[i];
      uvAttr.setXY(slot * 6 + i, u0 + (cx + 0.5) * span, v0 + (cy + 0.5) * span);
    }
  };
  const make = (parent, capacity) => {
    const geo = new T.BufferGeometry(), positions = new T.Float32BufferAttribute(new Float32Array(capacity * 18), 3);
    const uvArr = new Float32Array(capacity * 12);
    positions.setUsage(T.DynamicDrawUsage);
    for (let i = 0; i < capacity; i++) for (let k = 0; k < 6; k++) { const [x, y] = corners[k]; uvArr[(i * 6 + k) * 2] = (x + .5) * 0.43 + 0.035; uvArr[(i * 6 + k) * 2 + 1] = (y + .5) * 0.43 + 0.035; }
    const uvs = new T.Float32BufferAttribute(uvArr, 2); uvs.setUsage(T.DynamicDrawUsage);
    geo.setAttribute('position', positions); geo.setAttribute('uv', uvs); geo.setDrawRange(0, 0);
    const colors = new T.Float32BufferAttribute(new Float32Array(capacity * 24).fill(1), 4); colors.setUsage(T.DynamicDrawUsage); geo.setAttribute('color', colors);
    const mesh = new T.Mesh(geo, mat); mesh.name = 'training-char-marks'; mesh.renderOrder = 1.2; mesh.frustumCulled = false; mesh.raycast = () => {}; parent.add(mesh);
    return { mesh, parent, capacity, next: 0, count: 0, positions, uvs, colors, life: new Float32Array(capacity), alpha: new Float32Array(capacity), lastPos: new Float32Array(capacity * 3) };
  };
  const batches = [make(tg.group, 256), ...tg.targets.map(t => make(t.pivot, 24))];
  const pos = new T.Vector3(), normal = new T.Vector3(), q = new T.Quaternion(), rotZ = new T.Quaternion(), parentQ = new T.Quaternion(), vertex = new T.Vector3(), front = new T.Vector3(0, 0, 1);
  let seq = 0;
  return {
    prepareWarmup() {
      const ranges = batches.map(b => b.mesh.geometry.drawRange.count);
      for (const b of batches) {
        if (b.count) continue;
        corners.forEach(([x, y], i) => b.positions.setXYZ(i, x * .2, y * .2, 0));
        b.positions.needsUpdate = true; b.mesh.geometry.setDrawRange(0, 6);
      }
      return () => batches.forEach((b, i) => b.mesh.geometry.setDrawRange(0, ranges[i]));
    },
    add(hit, strength = 0.82) {
      const target = hit.solid?.target;
      if (target != null) {
        const tObj = tg.targets[target];
        if (!tObj || tObj.state === 'wrecked') return;
        if (tg.onPlate && !tg.onPlate(target, hit.point)) return;
      }
      const batch = batches[target == null ? 0 : target + 1];
      if (!batch) return;
      // Check recent marks in this batch so a hosed wall/floor builds deep pitch-black char instead of cycling the ring buffer.
      const checkN = Math.min(batch.count, 18);
      const mergeR2 = target == null ? 0.058 : 0.016;
      for (let k = 1; k <= checkN; k++) {
        const idx = (batch.next - k + batch.capacity) % batch.capacity;
        if (batch.life[idx] <= 0) continue;
        const lx = batch.lastPos[idx * 3], ly = batch.lastPos[idx * 3 + 1], lz = batch.lastPos[idx * 3 + 2];
        const dx = hit.point.x - lx, dy = hit.point.y - ly, dz = hit.point.z - lz;
        if (dx * dx + dy * dy + dz * dz < mergeR2) {
          batch.life[idx] = CHAR_LIFE;
          const nextA = Math.min(1, (batch.alpha[idx] || 0.78) + 0.22);
          batch.alpha[idx] = nextA;
          for (let i = 0; i < 6; i++) batch.colors.setW(idx * 6 + i, nextA);
          batch.colors.needsUpdate = true;
          return;
        }
      }
      pos.set(hit.point.x, hit.point.y, hit.point.z); normal.set(hit.normal.x, hit.normal.y, hit.normal.z);
      const s = hit.solid?.surface;
      if (s) { if (s.nx) pos.x = s.x; if (s.nz) pos.z = s.z; normal.set(s.nx, 0, s.nz); }
      if (target != null) pos.z = tg.origin.z + tg.targets[target].z;
      const lift = hit.solid?.floor ? .0019 : (target != null ? .0022 : .0028);
      pos.addScaledVector(normal, lift);
      batch.parent.updateWorldMatrix(true, false); batch.parent.worldToLocal(pos);
      q.setFromUnitVectors(front, normal);
      const isWall = Math.abs(normal.y) < 0.45;
      const roll = isWall ? ((Math.random() - 0.5) * 0.9) : (Math.random() * 6.283);
      rotZ.setFromAxisAngle(front, roll);
      q.multiply(rotZ);
      batch.parent.getWorldQuaternion(parentQ); q.premultiply(parentQ.invert());
      const baseSz = hit.size || (target == null ? (.46 + Math.random() * .24) : (.22 + Math.random() * .09));
      const sx = baseSz * (isWall ? (0.88 + Math.random() * 0.22) : (0.95 + Math.random() * 0.25));
      const sy = baseSz * (isWall ? (1.05 + Math.random() * 0.30) : (0.95 + Math.random() * 0.25));
      const slot = batch.next;
      const cell = isWall ? (2 + (seq++ & 1)) : (seq++ & 1);
      setQuadUV(batch.uvs, slot, cell);
      batch.uvs.needsUpdate = true;
      corners.forEach(([x, y], i) => { vertex.set(x * sx, y * sy, 0).applyQuaternion(q).add(pos); batch.positions.setXYZ(slot * 6 + i, vertex.x, vertex.y, vertex.z); });
      batch.life[slot] = CHAR_LIFE;
      const a0 = Math.max(0.45, Math.min(1, strength));
      batch.alpha[slot] = a0;
      batch.lastPos[slot * 3] = hit.point.x;
      batch.lastPos[slot * 3 + 1] = hit.point.y;
      batch.lastPos[slot * 3 + 2] = hit.point.z;
      for (let i = 0; i < 6; i++) batch.colors.setW(slot * 6 + i, a0);
      batch.colors.needsUpdate = true;
      batch.next = (slot + 1) % batch.capacity; batch.count = Math.min(batch.capacity, batch.count + 1);
      batch.positions.needsUpdate = true; batch.mesh.geometry.setDrawRange(0, batch.count * 6);
    },
    update(dt) {
      if (!(dt > 0)) return;
      for (const b of batches) {
        let dirty = false, alive = 0;
        for (let j = 0; j < b.capacity; j++) if (b.life[j] > 0) {
          b.life[j] = Math.max(0, b.life[j] - dt); if (b.life[j] > 0) alive++;
          if (b.life[j] < CHAR_FADE) {
            const w = (b.alpha[j] || 1) * (b.life[j] / CHAR_FADE);
            for (let i = 0; i < 6; i++) b.colors.setW(j * 6 + i, w);
            dirty = true;
          }
        }
        if (dirty) b.colors.needsUpdate = true;
        if (!alive && b.count > 0) { b.mesh.geometry.setDrawRange(0, 0); b.count = 0; b.next = 0; }
      }
    },
    clearTarget(targetIndex) {
      const b = batches[targetIndex + 1];
      if (!b) return;
      b.mesh.geometry.setDrawRange(0, 0); b.count = 0; b.next = 0; b.life.fill(0); b.alpha.fill(0);
    },
    clear() { for (const b of batches) { b.mesh.geometry.setDrawRange(0, 0); b.count = 0; b.next = 0; b.life.fill(0); b.alpha.fill(0); } },
    count: () => batches.reduce((n, b) => n + b.life.reduce((a, t) => a + (t > 0 ? 1 : 0), 0), 0),
    dispose() { for (const b of batches) { b.mesh.removeFromParent(); b.mesh.geometry.dispose(); } mat.dispose(); map?.dispose(); }
  };
}
