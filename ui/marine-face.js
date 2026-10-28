// GP-105. Head-local surfaces; the existing rig and wardrobe own their materials.
// Rings run bottom to top. Front is +z. A shared vertex grid keeps cloth and skin
// softly shaded without adding an asset loader, texture or per-frame work.
// CL-197 (Jerry, 2026-10-15: "the weird vertical line in the marine's head"): a ring surface runs round from a = -pi to
// +pi, so its first and last columns sit on the same spot at the back of the head but are separate vertices, each
// shaded only from its own side: a crease straight down the back. weldSeam gives both columns one shared normal.
// cols = vertices per ring (segments + 1); the last ring may be a pole, which gets a plain up normal.
export function weldSeam(geo, cols, pole = false) {
  const N = geo.attributes.normal, rows = N.count / cols;
  for (let r = 0; r < rows; r++) {
    const a = r * cols, b = a + cols - 1;
    const x = N.getX(a) + N.getX(b), y = N.getY(a) + N.getY(b), z = N.getZ(a) + N.getZ(b), l = Math.hypot(x, y, z) || 1;
    N.setXYZ(a, x / l, y / l, z / l); N.setXYZ(b, x / l, y / l, z / l);
  }
  if (pole) for (let j = 0; j < cols; j++) N.setXYZ((rows - 1) * cols + j, 0, 1, 0);
  N.needsUpdate = true;
  return geo;
}
// GP-19970: a narrow cloth pocket clears the existing sculpted nose.
// Only the upper/front mask moves; eye-opening height and cheek/collar fit stay fixed.
function balaclavaNoseRoom(y,c) {
  return .018*Math.max(0,Math.min(1,(y-1.326)/.029))*Math.max(0,c)**16;
}
function surface(T, rings, {opening = false, frontOnly = false, wrap = false, cloth = false} = {}) {
  const segments = 32, positions = [], uv = [], indices = [];
  for (let r = 0; r < rings.length; r++) {
    const [y, width, front, back] = rings[r];
    for (let j = 0; j <= segments; j++) {
      const a = -Math.PI + j / segments * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      let yy = y;
      if (wrap && r === rings.length - 1) yy = 1.355 + .046 * Math.max(0, c) ** 5;
      if (frontOnly && r === rings.length - 1) yy += .05 * s * s;
      if (opening && r === 4 && c > 0) yy += .015 * c ** 8 + .01 * s ** 4;
      if (opening && r === 5 && c > 0) yy += .019 * c;
      let x = width * s, z = c >= 0 ? front * c ** .55 : -back * (-c) ** .8;
      if (cloth) {
        // Shallow tension folds tuck beneath the nose and run toward the ears.
        // Preserve the opening height and collar; ease the front over the nose.
        const edgeWeight = Math.sin(r / (rings.length - 1) * Math.PI) ** 2;
        const a1 = (y - (1.274 + .016 * Math.abs(s))) / .013;
        const a2 = (y - (1.312 + .019 * Math.abs(s))) / .011;
        const fold = edgeWeight * (.0034 * Math.exp(-a1*a1) - .0020 * Math.exp(-a2*a2)) * (.30 + .70 * Math.max(0,c));
        x += s * fold; z += c * fold + balaclavaNoseRoom(y,c);
      }
      positions.push(x, yy - 1.22, z);
      uv.push(j / segments, (y - 1.2) * 3);
    }
  }
  for (let r = 0; r < rings.length - 1; r++) for (let j = 0; j < segments; j++) {
    const a = -Math.PI + (j + .5) / segments * Math.PI * 2;
    if (frontOnly && Math.abs(a) > Math.PI * .46) continue;
    if (opening && r === 4 && Math.abs(a) < Math.PI / 4) continue;
    const p = r * (segments + 1) + j, q = p + segments + 1;
    indices.push(p, p + 1, q, p + 1, q + 1, q);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);g.computeVertexNormals();
  if (!frontOnly) weldSeam(g, segments + 1, rings[rings.length - 1][1] < .01);
  g.computeBoundingSphere();
  return g;
}

export const HEAD_RINGS = [
    [1.275,.035,.09,.048], [1.283,.052,.110,.060], [1.291,.065,.127,.07],
    [1.309,.084,.141,.083], [1.323,.094,.149,.09], [1.343,.106,.151,.101],
    [1.365,.115,.152,.111], [1.383,.122,.151,.118],
    [1.402,.124,.151,.122], [1.428,.125,.150,.124], [1.455,.125,.148,.125],
    [1.481,.122,.140,.123], [1.50,.118,.13,.12], [1.521,.104,.115,.107],
    [1.534,.085,.094,.087], [1.544,.045,.050,.046], [1.548,.001,.001,.001]
];
// Half-width, front and back radius of the head at height y (what a hat, hair or an ear is fitted to).
export function headRadiusAt(y) {
  const p = HEAD_RINGS; let i = 1;
  while (i < p.length - 1 && p[i][0] < y) i++;
  const a = p[i - 1], b = p[i], t = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0])));
  return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
}
export function buildMarineHead(T, material) {
  const mesh = new T.Mesh(surface(T, HEAD_RINGS), material);
  mesh.name = 'marine-shaped-head';mesh.castShadow = true;mesh.receiveShadow = true;
  return mesh;
}

const fadeTextures = new WeakMap();
// CL-197 (Jerry, 2026-10-15: "improvement to the marine's hair"). The old crop was one dark dome with a hard rim and a
// dotted line where its two meshes met. This one follows the head surface itself: a short, thick top with swept clumps
// and a little lift at the front, a real hairline (a crisp forehead line, a sideburn, a clear gap above and behind
// each ear, a tapered nape) and a medium fade up the back and sides. The fade shares the live hair colour; only its
// coverage thins toward the skin. A single small local texture is reused by every marine, with no frame updates.
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const HAIRLINE = [[0, 1.4895], [.5, 1.4835], [.95, 1.4725], [1.12, 1.462], [1.27, 1.43], [1.40, 1.447], [1.57, 1.452], [1.78, 1.446], [2.05, 1.428], [2.5, 1.411], [3.1416, 1.402]];
function hairline(phi) {
  let i = 1; while (i < HAIRLINE.length - 1 && HAIRLINE[i][0] < phi) i++;
  const a = HAIRLINE[i - 1], b = HAIRLINE[i], t = Math.max(0, Math.min(1, (phi - a[0]) / (b[0] - a[0])));
  return a[1] + (b[1] - a[1]) * (.5 - .5 * Math.cos(t * Math.PI));
}
export function buildMarineHair(T, hairMaterial) {
  const group = new T.Group(); group.name = 'medium-fade';
  const n = 64, APEX = HEAD_RINGS[HEAD_RINGS.length - 2][0] + .004;
  function grid(rows, rowY, rowLift, name, cast, mat, alphaV) {
    const p = [], uv = [], ix = [];
    for (let row = 0; row <= rows; row++) for (let j = 0; j <= n; j++) {
      const a = -Math.PI + j / n * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), phi = Math.abs(a);
      const t = row / rows, yh = rowY(phi, t), lift = rowLift(phi, t, yh, a);
      const [w, f, b] = headRadiusAt(Math.min(yh, APEX - .004));
      const y = yh + lift * sstep(1.46, 1.548, yh) * .9;
      p.push((w + lift) * sn, y - 1.22, c >= 0 ? (f + lift) * c ** .55 : -(b + lift) * (-c) ** .8);
      uv.push(j / n, alphaV ? t : t * .5);
    }
    for (let r = 0; r < rows; r++) for (let j = 0; j < n; j++) { const a = r * (n + 1) + j, b = a + n + 1; ix.push(a, a + 1, b, a + 1, b + 1, b); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(ix); g.computeVertexNormals();
    weldSeam(g, n + 1, rows > 0 && !alphaV);
    const m = new T.Mesh(g, mat); m.name = name; m.castShadow = cast; m.receiveShadow = true; return m;
  }
  // The solid hair starts where the fade ends: no fade at the forehead, most of it up the back.
  const solidY = (phi) => hairline(phi) + .006 + .047 * sstep(.9, 1.75, phi);
  const top = grid(14,
    (phi, t) => { const y0 = solidY(phi) - .004; return y0 + (HEAD_RINGS[HEAD_RINGS.length - 2][0] - y0) * Math.sin(t * Math.PI / 2); },
    (phi, t, yh, a) => {
      const vol = .0032 + .0082 * sstep(1.50, 1.545, yh);                 // short at the sides, fuller on top
      const clump = .0016 * Math.sin(a * 11 + yh * 70) * Math.sin(t * Math.PI) ** .5 * sstep(1.49, 1.52, yh);
      const front = .004 * Math.max(0, Math.cos(a)) ** 6 * sstep(.25, .7, t) * (1 - sstep(.8, 1, t));   // a little lift in the fringe
      return .0007 + (vol - .0007) * sstep(0, .32, t) + clump + front;
    }, 'hair-top', true, hairMaterial, false);
  let fadeTexture = fadeTextures.get(T);
  if (!fadeTexture) {
    const size = 64, data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4, t = y / (size - 1), grain = ((x * 17 + y * 31) % 23) / 23;
      const coverage = Math.max(0, Math.min(1, .1 + .9 * t ** 1.25 + (grain - .5) * .07));
      data[i] = data[i + 1] = data[i + 2] = Math.round(coverage * 255); data[i + 3] = 255;
    }
    fadeTexture = new T.DataTexture(data, size, size); fadeTexture.magFilter = T.LinearFilter; fadeTexture.minFilter = T.LinearFilter; fadeTexture.needsUpdate = true; fadeTextures.set(T, fadeTexture);
  }
  const fade = hairMaterial.clone(); fade.color = hairMaterial.color; fade.alphaMap = fadeTexture; fade.transparent = true; fade.depthWrite = false; fade.roughness = 1;
  const band = grid(7,
    (phi, t) => hairline(phi) + (solidY(phi) + .003 - hairline(phi)) * t,
    (phi, t) => .0009 + .0026 * sstep(0, .5, t) + .0006, 'hair-fade', false, fade, true);
  group.add(top, band); return group;
}

export function buildBalaclava(T, material) {
  material.roughness=.98;material.metalness=0;material.side=T.DoubleSide;
  const group=new T.Group();group.name='balaclava';
  // A tapered neck, chin pocket and cheek panels follow the head, rather than
  // a straight cylinder flaring out above the collar.
  const rings=[[1.205,.079,.087,.081],[1.229,.077,.092,.083],
    [1.253,.080,.097,.084],[1.272,.077,.111,.080],[1.29,.069,.135,.077],
    [1.309,.09,.151,.091],[1.326,.105,.16,.104],[1.341,.118,.164,.117],[1.355,.123,.166,.123]];
  const front=new T.Mesh(surface(T,rings,{wrap:true,cloth:true}),material);
  front.name='cloth-balaclava';front.castShadow=front.receiveShadow=true;group.add(front);
  // Hood covers the ears, back and scalp with one eye opening. Its crown sits
  // inside both the cover and fitted helmet; no new wardrobe item is needed.
  const hoodGeo=surface(T,[[1.341,.118,.164,.117],[1.355,.123,.166,.123],
    [1.38,.128,.158,.125],[1.396,.129,.157,.128],[1.403,.130,.157,.129],
    [1.449,.131,.155,.132],[1.48,.129,.148,.130],[1.51,.12,.132,.123],
    [1.538,.091,.101,.094],[1.555,.035,.04,.037],[1.56,.001,.001,.001]]);
  const source=Array.from(hoodGeo.index.array),ix=[];
  for(let tri=0;tri<source.length;tri+=6){const a=source[tri],row=Math.floor(a/33),j=a%33;
    const angle=-Math.PI+(j+.5)/32*Math.PI*2;
    if(row<5&&Math.abs(angle)<1.0)continue;
    ix.push(...source.slice(tri,tri+6));}
  hoodGeo.setIndex(ix);hoodGeo.computeVertexNormals();
  const hood=new T.Mesh(hoodGeo,material);hood.name='balaclava-fitted-hood';hood.castShadow=hood.receiveShadow=true;group.add(hood);
  const edge=[];for(let j=0;j<32;j++){const a=-Math.PI+j/32*Math.PI*2,c=Math.cos(a);
    edge.push(new T.Vector3(.123*Math.sin(a),1.355+.046*Math.max(0,c)**5-1.22,c>=0?.167*c**.55+balaclavaNoseRoom(1.355,c):-.124*(-c)**.8));}
  const hem=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(edge,true),48,.0014,4,true),material);
  hem.castShadow=hem.receiveShadow=true;group.add(hem);
  const parts=[front,hem].map(mesh=>({mesh,rest:Float32Array.from(mesh.geometry.attributes.position.array)}));
  // Smoking lowers the stretch face panel under the lip, rather than passing
  // a cigarette through fabric. These two meshes remain outside rigid merging.
  for(const {mesh} of parts){mesh.add(new T.Object3D());mesh.userData.liveShape=true;}
  let last=-1;
  group.userData.mouthOpen=k=>{k=Math.max(0,Math.min(1,k));if(Math.abs(k-last)<.0001)return;last=k;
    for(const{mesh,rest}of parts){const p=mesh.geometry.attributes.position;
      for(let i=0;i<p.count;i++){const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2];
        const frontWeight=Math.max(0,Math.min(1,(z-.045)/.085));
        const high=Math.max(0,Math.min(1,(y-.065)/.10));
        p.setXYZ(i,x,y-k*frontWeight*high*.083,z-k*frontWeight*high*.007);}
      p.needsUpdate=true;mesh.geometry.computeVertexNormals();}
  };
  group.userData.mouthOpen(0);return group;
}

export function buildSurvivorBeard(T, material) {
  const mesh = new T.Mesh(surface(T, [
    [1.273,.036,.098,.05], [1.291,.069,.134,.07],
    [1.323,.098,.155,.09], [1.341,.125,.156,.1]
  ], {frontOnly:true}), material);
  mesh.name = 'survivor-fitted-beard';mesh.castShadow = true;mesh.receiveShadow = true;
  return mesh;
}

// CL-197 (Jerry, 2026-10-15: "better ears for the marine"). The ear was one flat eight-sided fan. This is a lofted ear:
// an outline taller than it is wide (narrower at the lobe, leaned back a little), then a bowl, a raised antihelix, a
// shallow groove and a rolled rim, all rising off the side of the head and sinking into it round the edge, with a
// small tragus in front. A shared normal at the pole and the wrap keeps it smooth. Built in head-local space.
function buildEar(T, side, skinW, skinShade) {
  const M = 28, cy = 1.404, cz = -.003, lean = .2, cl = Math.cos(lean), sl = Math.sin(lean);
  const RINGS = [[.0, .0058], [.22, .0044], [.42, .0105], [.6, .0138], [.76, .0092], [.9, .0172], [1.0, .0142], [1.05, -.0025]];
  const p = [], uv = [], ix = [];
  for (let r = 0; r < RINGS.length; r++) {
    const [rho, h] = RINGS[r];
    for (let j = 0; j <= M; j++) {
      const th = j / M * Math.PI * 2, st = Math.sin(th), ct = Math.cos(th);
      const lobe = st < 0 ? 1 : 0;
      const v = .031 * st * (lobe ? .94 : 1) * rho;
      const u = .0172 * ct * (1 + .1 * Math.max(0, st) - .3 * Math.max(0, -st)) * rho;
      const z = cz + u * cl - v * sl, y = cy + u * sl + v * cl;
      const flare = .0045 * rho * rho * Math.max(0, -Math.cos(th - .5));            // the rim stands off the head toward the back
      const lobeThin = lobe * (.65 + .35 * Math.min(1, rho)) ;
      const hh = h * (lobe ? lobeThin : 1) + (h > 0 ? flare : 0);
      p.push(side * (headRadiusAt(y)[0] - .0022 + hh), y - 1.22, z);
      uv.push(j / M, rho);
    }
  }
  for (let r = 0; r < RINGS.length - 1; r++) for (let j = 0; j < M; j++) {
    const a = r * (M + 1) + j, b = a + M + 1;
    if (side > 0) ix.push(a, a + 1, b, a + 1, b + 1, b); else ix.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(ix); g.computeVertexNormals();
  weldSeam(g, M + 1);
  { const N = g.attributes.normal; let x = 0, y = 0, z = 0; for (let j = 0; j <= M; j++) { x += N.getX(j); y += N.getY(j); z += N.getZ(j); } const l = Math.hypot(x, y, z) || 1; for (let j = 0; j <= M; j++) N.setXYZ(j, x / l, y / l, z / l); }
  g.computeBoundingSphere();
  const group = new T.Group(); group.name = 'ear-' + side;
  const ear = new T.Mesh(g, skinW); ear.name = 'ear-shell-' + side; ear.castShadow = false; ear.receiveShadow = true; group.add(ear);
  const tragus = new T.Mesh(new T.SphereGeometry(1, 8, 6), skinW);
  tragus.scale.set(.004, .0075, .0045); tragus.position.set(side * (headRadiusAt(cy)[0] + .0045), cy - .002 - 1.22, cz + .0125);
  tragus.name = 'tragus-' + side; tragus.receiveShadow = true; group.add(tragus);
  return group;
}

// GP-163. Shallow facial surfaces stay at the established eye/eyewear anchors.
// All materials are supplied by the wardrobe: changing skin, iris or hair color
// updates these surfaces without rebuilding them. No extruded eye boxes.
export function buildMarineFeatures(T,{skinW,skinShade,hairW,irisW,eyeWhite,eyeDark,glint,scarMat}) {
  const group=new T.Group();group.name='marine-facial-features';
  const profile=HEAD_RINGS;
  const faceZ=(x,y)=>{
    let i=1;while(i<profile.length-1&&profile[i][0]<y)i++;
    const a=profile[i-1],b=profile[i],t=Math.max(0,Math.min(1,(y-a[0])/(b[0]-a[0])));
    const w=a[1]+(b[1]-a[1])*t,f=a[2]+(b[2]-a[2])*t;
    return f*Math.max(0,1-(x/w)**2)**.275;
  };
  const mesh=(positions,indices,material,name)=>{
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geo.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(positions.length/3*2),2));
    geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();
    const m=new T.Mesh(geo,material);m.name=name;m.castShadow=false;m.receiveShadow=true;group.add(m);return m;
  };
  const fan=(points,center,mat,name,out=[0,0,1])=>{
    const p=[center[0],center[1]-1.22,center[2]],ix=[];
    for(const [x,y,z]of points)p.push(x,y-1.22,z);
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];
      const v=new T.Vector3(a[0]-center[0],a[1]-center[1],a[2]-center[2]);
      v.cross(new T.Vector3(b[0]-center[0],b[1]-center[1],b[2]-center[2]));
      const j=i+1,k=(i+1)%points.length+1;
      ix.push(0,...(v.dot(new T.Vector3(...out))>=0?[j,k]:[k,j]));
    }
    return mesh(p,ix,mat,name);
  };
  const ellipse=(x,y,rx,ry,z,mat,name)=>{
    const pts=[];for(let j=0;j<20;j++){const a=j/20*Math.PI*2,dx=Math.cos(a)*rx,dy=Math.sin(a)*ry;pts.push([x+dx,y+dy,typeof z==='function'?z(dx,dy):z]);}
    return fan(pts,[x,y,typeof z==='function'?z(0,0):z],mat,name);
  };
  const strip=(points,width,mat,name)=>{
    const p=[],ix=[];
    points.forEach(([x,y,z],i)=>{const w=typeof width==='function'?width(i/(points.length-1)):width;p.push(x,y-w-1.22,z,x,y+w-1.22,z);if(i){const a=(i-1)*2;ix.push(a,a+2,a+1,a+1,a+2,a+3);}});
    return mesh(p,ix,mat,name);
  };
  for(const side of [-1,1]){
    const ex=side*.06,ey=1.419,halfWidth=.020;
    const opening=(dx,upper)=>(upper?.0038:-.0045)*Math.max(0,1-(dx/halfWidth)**2)**.65+side*dx*.022;
    const eyeDepth=(dx,dy)=>faceZ(ex+dx,ey+dy)+.0015+.0007*Math.max(0,1-(dx/halfWidth)**2-(dy/.007)**2);
    const eyeEdge=[];
    for(let j=0;j<24;j++){
      const a=j/24*Math.PI*2,dx=Math.cos(a)*halfWidth,dy=opening(dx,Math.sin(a)>=0);
      eyeEdge.push([ex+dx,ey+dy,eyeDepth(dx,dy)]);
    }
    // The sockets blend into the face instead of projecting as a dark rectangle.
    const socket=[];for(let j=0;j<24;j++){const a=j/24*Math.PI*2,x=ex+Math.cos(a)*.0245,y=ey+Math.sin(a)*.0075;socket.push([x,y,faceZ(x,y)+.0003]);}
    fan(socket,[ex,ey,faceZ(ex,ey)+.0005],skinShade,'eye-socket-'+side);
    fan(eyeEdge,[ex,ey,eyeDepth(0,0)],eyeWhite,'almond-eye-'+side);
    // Circular iris/pupil surfaces follow the eyeball's shallow curve.
    const ix=ex-side*.0012;
    const irisDisc=(radius,lift,mat,name)=>{
      const pts=[];
      for(let j=0;j<24;j++){
        const a=j/24*Math.PI*2,dx=Math.cos(a)*radius-side*.0012;
        const dy=Math.max(opening(dx,false)+.00025,Math.min(opening(dx,true)-.00025,Math.sin(a)*radius));
        pts.push([ex+dx,ey+dy,eyeDepth(dx,dy)+lift]);
      }
      return fan(pts,[ix,ey,eyeDepth(-side*.0012,0)+lift],mat,name);
    };
    irisDisc(.0055,.00018,eyeDark,'iris-rim-'+side);
    irisDisc(.0048,.00034,irisW,'iris-'+side);
    irisDisc(.00235,.00048,eyeDark,'pupil-'+side);
    ellipse(ix+.0012,ey+.0015,.00075,.00075,(dx,dy)=>eyeDepth(dx-side*.0012+.0012,dy+.0015)+.00065,glint,'eye-glint-'+side);
    // Each lid is a tapered patch from the eye edge back to the surrounding skin.
    for(const upper of [true,false]){
      const p=[],idx=[];
      for(let j=0;j<=12;j++){
        const t=j/12,dx=-halfWidth+2*halfWidth*t,arch=Math.sin(t*Math.PI);
        const dy=opening(dx,upper);
        const x=ex+dx,y=ey+dy,z=eyeDepth(dx,dy)+.00055;
        const outerY=y+(upper?1:-1)*(.0008+(upper?.0055:.0016)*arch),outerZ=faceZ(x,outerY)+.0006;
        p.push(x,y-1.22,z,x,outerY-1.22,outerZ);
        if(j){const a=(j-1)*2;if(upper)idx.push(a,a+2,a+1,a+1,a+2,a+3);else idx.push(a,a+1,a+2,a+1,a+3,a+2);}
      }
      mesh(p,idx,skinW,(upper?'upper':'lower')+'-eyelid-'+side);
    }
    const brow=[];
    for(let j=0;j<=14;j++){const t=j/14,x=ex+(t-.5)*.060,y=1.439+.0022*Math.sin(t*Math.PI)+side*(t-.5)*.003;brow.push([x,y,faceZ(x,y)+.0015]);}
    strip(brow,t=>.0007+.0030*Math.sin(t*Math.PI)**.65,hairW,'tapered-brow-'+side);

    group.add(buildEar(T, side, skinW, skinShade));
    ellipse(side*.009,1.383,.0037,.0018,(dx,dy)=>.1659-Math.abs(side*.009+dx)*1.14+dy*.65,skinShade,'nostril-'+side);
  }
  // Six connected cross-sections make a restrained bridge, tip and nasal wings.
  const nose=[[1.379,.010,.158,.150],[1.385,.017,.169,.148],[1.394,.014,.174,.151],
    [1.409,.010,.167,.147],[1.428,.009,.157,.146],[1.443,.008,.150,.146]];
  const p=[],idx=[];
  nose.forEach(([y,w,front,edge],r)=>{p.push(-w,y-1.22,edge,0,y-1.22,front,w,y-1.22,edge);if(r)for(let j=0;j<2;j++){const a=(r-1)*3+j;idx.push(a,a+1,a+3,a+1,a+4,a+3);}});
  mesh(p,idx,skinW,'sculpted-nose');
  const lips=[],lower=[];
  for(let j=0;j<=12;j++){const t=j/12,x=(t-.5)*.053,y=1.345+.0012*Math.sin(t*Math.PI);lips.push([x,y,faceZ(x,y)+.0012]);lower.push([x,y-.0025,faceZ(x,y-.0025)+.0015]);}
  strip(lips,t=>.00035+.00065*Math.sin(t*Math.PI),skinShade,'resting-mouth');
  strip(lower,t=>.00025+.0013*Math.sin(t*Math.PI),skinW,'lower-lip');
  const scar=[];for(let j=0;j<5;j++){const t=j/4,x=-.075+.004*t,y=1.434+.022*t;scar.push([x,y,faceZ(x,y)+.0027]);}
  strip(scar,t=>.0003+.00065*Math.sin(t*Math.PI),scarMat,'brow-scar');
  return group;
}
