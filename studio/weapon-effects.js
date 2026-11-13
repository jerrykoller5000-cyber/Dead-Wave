// GT-20105 / J151: original procedural weapon-effect artwork.
// No photographs, models, logos or third-party textures are embedded here.
const TAU = Math.PI * 2;
function random(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
export const IMPACT_ATLAS = Object.freeze({ columns: 4, rows: 2, cell: 128, count: 8, inset: 3 });

function polygon(c, points, fill) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
  c.fillStyle = fill; c.fill();
}
function radial(c, x, y, r, stops) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  for (const [t, color] of stops) g.addColorStop(t, color);
  c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
}

// Eight chipped, asymmetric strike footprints, not eight rotations of one hole.
// A small dark entry sits inside a much broader broken substrate and dust rim.
export function createImpactAtlas(T) {
  if (typeof document === 'undefined') return null;
  const { columns, rows, cell, count } = IMPACT_ATLAS;
  const canvas = document.createElement('canvas'); canvas.width = columns * cell; canvas.height = rows * cell;
  const c = canvas.getContext('2d');
  for (let k = 0; k < count; k++) {
    const rnd = random(0x1511800 + k * 7919);
    c.save(); c.translate((k % columns) * cell, Math.floor(k / columns) * cell);
    c.beginPath(); c.rect(3, 3, cell - 6, cell - 6); c.clip();
    const cx = 64 + (rnd() - .5) * 8, cy = 64 + (rnd() - .5) * 8;
    // Local crushed paint and a faint dust fringe. No opaque outer disc.
    radial(c, cx, cy, 54, [[0, 'rgba(49,47,41,.27)'], [.45, 'rgba(78,75,64,.17)'], [1, 'rgba(86,82,71,0)']]);
    const n = 10 + (rnd() * 5 | 0), rim = [], inner = [];
    for (let i = 0; i < n; i++) {
      const a = TAU * i / n, r = 19 + rnd() * 17;
      rim.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * (.72 + rnd() * .4)]);
      inner.push([cx + Math.cos(a) * (7 + rnd() * 6), cy + Math.sin(a) * (7 + rnd() * 6)]);
    }
    polygon(c, rim, 'rgba(102,99,89,.66)');
    // Unequal flat chips form the broken coating, with the dark cavity between them.
    for (let i = 0; i < n; i++) {
      if (rnd() < .17) continue;
      const j = (i + 1) % n, t = .10 + rnd() * .20;
      const shade = 145 + (rnd() * 43 | 0);
      const a = rim[i], b = rim[j];
      // Short detached flakes, with no spokes joining every chip to the centre.
      polygon(c, [a, [a[0]+(b[0]-a[0])*.63,a[1]+(b[1]-a[1])*.63],
        [a[0]+(cx-a[0])*t+(b[0]-a[0])*.26,a[1]+(cy-a[1])*t+(b[1]-a[1])*.26]],
        'rgba(' + shade + ',' + (shade - 2) + ',' + (shade - 10) + ',' + (.66 + rnd() * .23).toFixed(3) + ')');
    }
    // Few irregular fracture branches; no evenly repeated radial spokes.
    for (let i = 0, m = 3 + (rnd() * 4 | 0); i < m; i++) {
      const a = rnd() * TAU, r0 = 10 + rnd() * 10, len = 18 + rnd() * 27;
      c.strokeStyle = 'rgba(35,34,30,' + (.32 + rnd() * .36).toFixed(3) + ')'; c.lineWidth = .4 + rnd() * .8;
      c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      for (let j = 1; j <= 3; j++) {
        const r = r0 + len * j / 3, aa = a + (rnd() - .5) * .23;
        c.lineTo(cx + Math.cos(aa) * r, cy + Math.sin(aa) * r);
      }
      c.stroke();
    }
    const core = [];
    for (let i = 0; i < 11; i++) { const a = TAU * i / 11, r = 6.8 + rnd() * 3.2; core.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    polygon(c, core, 'rgba(12,12,11,.96)');
    // Detached grit stays close to the strike and fades into the wall.
    for (let i = 0; i < 28; i++) {
      const a = rnd() * TAU, r = 21 + rnd() * 31, s = .6 + rnd() * 1.8;
      c.fillStyle = rnd() < .5 ? 'rgba(143,139,123,.36)' : 'rgba(47,45,40,.28)';
      c.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, s, s);
    }
    c.restore();
  }
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  map.name = 'weapon-impact-eight-variants'; return map;
}

// Bounded shot-to-shot variation without changing world seeds or consuming RNG.
export function impactAppearance(sequence, target = false, shot = {}) {
  const rnd = random((sequence + 1) * 2654435761), weapon=shot.weapon||'m4', pellets=shot.pellets||1;
  const scatter=weapon==='shotgun'||weapon==='aa12';
  const category=scatter?(pellets>1?'pellet':'slug'):(weapon==='pistol'||weapon==='uzi'?'handgun':weapon==='revolver'?'magnum':'rifle');
  const nominal={pellet:.15,handgun:.32,magnum:.36,rifle:weapon==='sniper'?.44:.40,slug:.48}[category];
  const size=nominal*(target?.55:1)*(.9+rnd()*.30);
  return {cell:sequence%IMPACT_ATLAS.count,roll:rnd()*TAU,width:size,height:size*(.88+rnd()*.24),category};
}
const flashTextures = new WeakMap();
export function createMuzzleFlashTexture(T) {
  if (flashTextures.has(T)) return flashTextures.get(T);
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const c = cv.getContext('2d'), rnd = random(0x1515700);
  // Side cell: a short hot root and separated tongues of escaping gas.
  c.save(); c.beginPath(); c.rect(2, 2, 124, 124); c.clip();
  for (let i = 0; i < 7; i++) {
    const x = 64 + (rnd() - .5) * 23, top = 7 + rnd() * 43, lean = (rnd() - .5) * 32;
    const g = c.createLinearGradient(64, 121, x + lean, top);
    g.addColorStop(0, 'rgba(255,252,222,.98)'); g.addColorStop(.24, 'rgba(255,224,137,.85)');
    g.addColorStop(.60, 'rgba(255,155,55,.39)'); g.addColorStop(1, 'rgba(255,112,25,0)');
    polygon(c, [[58,123],[51-rnd()*13,87],[x+lean-6,top+14],[x+lean,top],[x+lean+5,top+20],[78+rnd()*12,84],[70,123]], g);
  }
  radial(c, 64, 114, 18, [[0, 'rgba(255,255,244,1)'], [.38, 'rgba(255,237,180,.92)'], [1, 'rgba(255,164,70,0)']]);
  c.restore();
  // Axial cell: uneven petals around a tiny white core, for a view down the bore.
  c.save(); c.translate(128, 0); c.beginPath(); c.rect(2, 2, 124, 124); c.clip();
  for (let i = 0; i < 6; i++) {
    c.save(); c.translate(64, 64); c.rotate(i * TAU / 6 + (rnd() - .5) * .4); c.scale(.34 + rnd() * .15, 1);
    radial(c, 0, -12, 36 + rnd() * 10, [[0, 'rgba(255,217,123,.7)'], [.45, 'rgba(255,164,55,.4)'], [1, 'rgba(255,119,25,0)']]);
    c.restore();
  }
  radial(c, 64, 64, 15, [[0, 'rgba(255,255,242,1)'], [.34, 'rgba(255,243,195,.96)'], [1, 'rgba(255,181,76,0)']]);
  c.restore();
  const map = new T.CanvasTexture(cv); map.colorSpace = T.SRGBColorSpace;
  map.name = 'weapon-muzzle-gas-plume'; flashTextures.set(T, map); return map;
}

// One mesh, one material, eight triangles. The plume points forward (+Z), with
// three crossing sheets so it has depth from side views and an axial hot root.
export function createMuzzleFlashGeometry(T, radius) {
  const positions = [], uv = [], indices = [];
  const quad = (p, u0, u1) => {
    const b = positions.length / 3; positions.push(...p.flat());
    uv.push(u0,0,u1,0,u1,1,u0,1); indices.push(b,b+1,b+2,b,b+2,b+3);
  };
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI / 3, x = Math.cos(a) * radius * .95, y = Math.sin(a) * radius * .95;
    quad([[-x,-y,0],[x,y,0],[x,y,radius*3.2],[-x,-y,radius*3.2]], 0, .5);
  }
  const r = radius * .65, z = radius * .2;
  quad([[-r,-r,z],[r,-r,z],[r,r,z],[-r,r,z]], .5, 1);
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(positions,3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv,2)); geo.setIndex(indices); geo.computeVertexNormals();
  geo.computeBoundingBox(); geo.computeBoundingSphere(); return geo;
}

// Project a bounded rectangular mark onto actual source triangles. The result
// is clipped to the receiving geometry, so no quad survives over empty space.
// Triangles use CH-1's documented [p0, edge1, edge2, normal] twelve-float layout.
export function clipSurfaceMark(triangles, center, normal, width, height, roll = 0, maxTriangles = 64) {
  const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit = a => { const m=Math.hypot(...a)||1; return a.map(v=>v/m); };
  const n=unit(normal), ref=Math.abs(n[1])>.9?[1,0,0]:[0,1,0], a=unit(cross(ref,n)), b=cross(n,a);
  const co=Math.cos(roll),si=Math.sin(roll),u=a.map((v,i)=>v*co+b[i]*si),v=b.map((q,i)=>q*co-a[i]*si);
  const depth=Math.min(.06,Math.max(.012,Math.min(width,height)*.25));
  const result={positions:[],uv:[],triangles:0,truncated:false};
  function cut(poly,axis,limit,sign) {
    const out=[];
    for(let i=0;i<poly.length;i++){
      const p=poly[i],q=poly[(i+1)%poly.length],dp=limit-sign*p[axis],dq=limit-sign*q[axis];
      if(dp>=-1e-9)out.push(p);
      if((dp<0)!==(dq<0)){const t=dp/(dp-dq);out.push(p.map((x,j)=>x+(q[j]-x)*t));}
    }
    return out;
  }
  for(const bank of triangles)for(let k=0;k+11<bank.length;k+=12){
    const face=[bank[k+9],bank[k+10],bank[k+11]];
    const facing=dot(face,n);if(Math.abs(facing)<.45)continue;
    if(facing<0)for(let j=0;j<3;j++)face[j]*=-1;
    let poly=[];
    for(let j=0;j<3;j++){
      const p=[bank[k]+(j===1?bank[k+3]:j===2?bank[k+6]:0),bank[k+1]+(j===1?bank[k+4]:j===2?bank[k+7]:0),bank[k+2]+(j===1?bank[k+5]:j===2?bank[k+8]:0)];
      const d=p.map((q,i)=>q-center[i]);poly.push([dot(d,u),dot(d,v),dot(d,n),...p]);
    }
    for(const [axis,limit,sign]of [[0,width/2,1],[0,width/2,-1],[1,height/2,1],[1,height/2,-1],[2,.003,1],[2,depth,-1]]){
      poly=cut(poly,axis,limit,sign);if(poly.length<3)break;
    }
    for(let j=1;j+1<poly.length;j++){
      const p=poly[0],q=poly[j],r=poly[j+1];
      const e=q.slice(3).map((x,i)=>x-p[i+3]),f=r.slice(3).map((x,i)=>x-p[i+3]);
      if(Math.hypot(...cross(e,f))<1e-10)continue;
      if(result.triangles===maxTriangles){result.truncated=true;return result;}
      for(const t of [p,q,r]){
        result.positions.push(t[3]+face[0]*.0012,t[4]+face[1]*.0012,t[5]+face[2]*.0012);
        result.uv.push(t[0]/width+.5,t[1]/height+.5);
      }
      result.triangles++;
    }
  }
  return result;
}

// Fixed-capacity receiving-surface batch. Flat walls keep their inexpensive
// existing quads; only triangle-refined prop hits need this clipped geometry.
export function createSurfaceMarkBatch(T, parent, material, options = {}) {
  const capacity=options.capacity||64, maxTriangles=options.maxTriangles||32, stride=maxTriangles*3;
  const lifeSeconds=options.life||20,fade=options.fade||4,uvFor=options.uv||impactUV;
  const geometry=new T.BufferGeometry();
  const positions=new T.Float32BufferAttribute(new Float32Array(capacity*stride*3),3);
  const uv=new T.Float32BufferAttribute(new Float32Array(capacity*stride*2),2);
  const colors=new T.Float32BufferAttribute(new Float32Array(capacity*stride*4),4);
  const normals=new Float32Array(capacity*stride*3);
  for(let i=0;i<capacity*stride;i++)normals[i*3+1]=1;
  for(const a of [positions,uv,colors])a.setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('position',positions);geometry.setAttribute('uv',uv);geometry.setAttribute('color',colors);
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setDrawRange(0,0);
  const mesh=new T.Mesh(geometry,material);mesh.name=options.name||'weapon-surface-marks';
  mesh.renderOrder=options.order||1.1;mesh.frustumCulled=false;mesh.visible=false;mesh.raycast=()=>{};parent.add(mesh);
  const life=new Float32Array(capacity),alpha=new Float32Array(capacity),used=new Uint16Array(capacity),point=new T.Vector3();
  const centers=new Float64Array(capacity*3),slotNormals=new Float32Array(capacity*3),solids=new Array(capacity);
  let next=0,high=0,truncated=0,merged=0;
  return {
    mesh,
    add(hit,banks,look,strength=1) {
      const p=hit.point,n=hit.normal,merge=options.mergeDistance||0;
      if(merge>0)for(let k=1;k<=Math.min(high,18);k++){
        const slot=(next-k+capacity)%capacity,j=slot*3;
        if(!(life[slot]>0)||solids[slot]!==hit.solid)continue;
        const dx=p.x-centers[j],dy=p.y-centers[j+1],dz=p.z-centers[j+2];
        if(dx*dx+dy*dy+dz*dz>merge*merge||Math.abs(dx*n.x+dy*n.y+dz*n.z)>.006||slotNormals[j]*n.x+slotNormals[j+1]*n.y+slotNormals[j+2]*n.z<.95)continue;
        life[slot]=lifeSeconds;alpha[slot]=Math.min(1,alpha[slot]+.18);
        for(let i=0;i<used[slot];i++)colors.setW(slot*stride+i,alpha[slot]);
        colors.needsUpdate=true;merged++;return true;
      }
      const mark=clipSurfaceMark(banks,[p.x,p.y,p.z],[n.x,n.y,n.z],look.width,look.height,look.roll,maxTriangles);
      if(!mark.triangles)return false;
      if(mark.truncated)truncated++;
      parent.updateWorldMatrix(true,false);
      const slot=next,base=slot*stride,count=mark.positions.length/3;
      for(let i=0;i<stride;i++){
        const at=base+i;
        if(i<count){
          point.set(mark.positions[i*3],mark.positions[i*3+1],mark.positions[i*3+2]);parent.worldToLocal(point);
          positions.setXYZ(at,point.x,point.y,point.z);uv.setXY(at,...uvFor(look.cell,mark.uv[i*2]-.5,mark.uv[i*2+1]-.5));
          colors.setXYZW(at,1,1,1,strength);
        }else{positions.setXYZ(at,0,0,0);colors.setXYZW(at,1,1,1,0);}
      }
      centers.set([p.x,p.y,p.z],slot*3);slotNormals.set([n.x,n.y,n.z],slot*3);solids[slot]=hit.solid;
      used[slot]=count;life[slot]=lifeSeconds;alpha[slot]=strength;next=(next+1)%capacity;high=Math.min(capacity,high+1);
      positions.needsUpdate=uv.needsUpdate=colors.needsUpdate=true;geometry.setDrawRange(0,high*stride);mesh.visible=true;return true;
    },
    update(dt) {
      if(!(dt>0))return;let alive=0,dirty=false;
      for(let s=0;s<capacity;s++)if(life[s]>0){
        life[s]=Math.max(0,life[s]-dt);if(life[s]>0)alive++;
        if(life[s]<fade){for(let i=0;i<used[s];i++)colors.setW(s*stride+i,alpha[s]*life[s]/fade);dirty=true;}
      }
      if(dirty)colors.needsUpdate=true;
      if(!alive){geometry.setDrawRange(0,0);mesh.visible=false;next=high=0;}
    },
    clear(){life.fill(0);colors.array.fill(0);colors.needsUpdate=true;geometry.setDrawRange(0,0);mesh.visible=false;next=high=0;},
    count:()=>life.reduce((sum,v)=>sum+(v>0?1:0),0),
    diagnostics:()=>({capacity,maxTriangles,truncated,merged}),
    dispose(){mesh.removeFromParent();geometry.dispose();}
  };
}

export function impactUV(cell, x, y) {
  const a = IMPACT_ATLAS, u = (cell % a.columns), v = Math.floor(cell / a.columns);
  const lo = a.inset / a.cell, span = 1 - 2 * lo;
  // CanvasTexture's default flipY puts its top row at the top of UV space.
  return [(u + lo + (x + .5) * span) / a.columns, 1 - (v + lo + (y + .5) * span) / a.rows];
}
