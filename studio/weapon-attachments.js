// GP-20066 / D-123: one combined light and visible laser, mounted for each gun.
// Coordinates are gun-local; +z is the bore direction. The optical points stay
// separate from the muzzle so recoil, first-person projection and the light can
// all originate at their actual front windows.
import {bindModelArtwork} from './weapon-model-hooks.js';
import {createLightSwitch} from './weapon-light-switch.js';
import {weaponDetail} from './weapon-detail.js';

const MOUNTS = Object.freeze({
  pistol:   { kind: 'guard', x: 0, y: -0.035, z: 0.202, length: 0.16, width: 0.045, height: 0.034 },
  revolver: { kind: 'under', x: 0, y: 0.041, z: 0.246, length: 0.105, width: 0.043, height: 0.036 },
  uzi:      { kind: 'under', x: 0, y: -0.036, z: 0.277, scale: 0.72, length: 0.13, width: 0.052, height: 0.047 },
  shotgun:  { kind: 'dualTube', x: 0.066, y: 0.012, z: 0.786, length: 0.16 },
  m4:       { kind: 'peq', x: 0.082, y: 0.056, z: 0.655, length: 0.125, width: 0.063, height: 0.047 },
  ak:       { kind: 'under', x: 0, y: -0.050, z: 0.586, length: 0.13, width: 0.064, height: 0.047, padY: -0.002 },
  aa12:     { kind: 'tube', x: 0.072, y: 0.041, z: 0.748, length: 0.151 },
  sniper:   { kind: 'peq', x: 0.070, y: 0, z: 0.530, length: 0.125, width: 0.063, height: 0.047 },
  launcher: { kind: 'peq', x: 0.112, y: 0.040, z: 0.550, length: 0.115, width: 0.060, height: 0.047 },   // CL-322: on GP-20060's 3-o'clock rail (was x .087 y .045 z .222, on the receiver bracket)
  minigun:  { kind: 'frame', x: 0.185, y: 0.066, z: 0.168, length: 0.12, width: 0.064, height: 0.050 },
  m240:     { kind: 'peq16', x: 0.093, y: 0.875, z: 0.42, length: 0.11, width: 0.070, height: 0.045 }
});

export function laserLightMount(kind) { return MOUNTS[kind] || null; }

export function attachLaserLight(gun, kind, ctx) {
  const spec = MOUNTS[kind];
  if (!spec || !gun) return gun;
  const { THREE, gunDark, gunMid, gunPoly, gunTan, gunRubber, glassMat } = ctx;
  const unit = new THREE.Group();
  unit.name = 'laserLightUnit';
  unit.position.set(spec.x, spec.y, spec.z);
  unit.scale.setScalar(spec.scale ?? 1);
  unit.visible = kind === 'm240'; // standard issue on the Watchman's gun
  gun.add(unit);
  const body = kind === 'm240' ? gunTan : gunPoly;
  const metal = kind === 'm240' ? gunTan : gunMid;
  const lens = glassMat || new THREE.MeshStandardMaterial({ color: 0xb7c9d0, roughness: 0.17, metalness: 0.05 });
  const put = (geo, mat, x, y, z, name = '') => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z); o.name = name;
    o.castShadow = true; o.receiveShadow = true; unit.add(o); return o;
  };
  const box = (w, h, d, mat, x, y, z, name = '') => put(new THREE.BoxGeometry(w, h, d), mat, x, y, z, name);
  const cyl = (r, depth, mat, x, y, z, name = '', n = 14) => {
    const o = put(new THREE.CylinderGeometry(r, r, depth, n), mat, x, y, z, name);
    o.rotation.x = Math.PI / 2; return o;
  };
  const window = (x, y, z, r, which) => {
    // A hollow bezel, dark cavity and inset glass. A solid cylinder behind the
    // glass used to make the front look like a painted-on circle at oblique angles.
    const wall = put(new THREE.CylinderGeometry(r * 1.37, r * 1.37, 0.004, 20, 1, true), metal, x, y, z - 0.0025, which + 'BezelWall');
    wall.rotation.x = Math.PI / 2;
    put(new THREE.RingGeometry(r * 0.98, r * 1.37, 20), metal, x, y, z - 0.0004, which + 'Bezel');
    put(new THREE.RingGeometry(r, r * 1.37, 20), metal, x, y, z - 0.0024, which + 'BezelSeat');
    cyl(r, 0.0008, gunDark, x, y, z - 0.0024, which + 'Cavity');
    cyl(r * 0.91, 0.0006, lens, x, y, z - 0.0016, which + 'Lens');
    return new THREE.Vector3(x, y, z + 0.002);
  };
  const L = spec.length;
  let light, laser;
  if (spec.kind === 'dualTube') {
    // GT-20106/J153-34: split barrel/tube clamp, bevelled dual-optic housing.
    // Optical axes and the existing rear switch datum stay unchanged.
    const W = weaponDetail(ctx);
    const clampShape = new THREE.Shape();
    const clampOutline = [[-.086,-.030],[-.080,-.039],[-.052,-.039],[-.045,-.032],
      [-.018,-.032],[-.018,.032],[-.045,.032],[-.052,.039],[-.080,.039],[-.086,.030]];
    clampOutline.forEach(([x,y],i)=>i?clampShape.lineTo(x,y):clampShape.moveTo(x,y));
    clampShape.closePath();
    // Hole radii include the edge bevel and polygon apothem: clear the actual
    // 15.5mm barrel and14.5mm magazine tube, rather than sinking a ring into either.
    for (const [y,r] of [[.018,.0168],[-.018,.0158]]) {
      const hole = new THREE.Path(); hole.absarc(-.066,y,r,0,Math.PI*2,true);
      clampShape.holes.push(hole);
    }
    put(new THREE.ExtrudeGeometry(clampShape,{depth:.014,steps:1,curveSegments:8,
      bevelEnabled:true,bevelSize:.0007,bevelThickness:.001,bevelSegments:1}),
      gunDark,0,0,-.041,'barrelMagazineClamp');
    W.chamferBox(unit,.012,.060,.030,.0015,metal,-.018,0,-.034).name='sideRail';
    W.fasteners(unit,gunMid,'hex',[.018,-.018].map(y=>({x:-.033,y,z:-.026,axis:'z',side:1,r:.003})));
    W.chamferBox(unit,.048,.074,.116,.002,body,0,.003,-.016).name='moduleShell';
    W.chamferBox(unit,.049,.075,.006,.001,body,0,.003,-.077).name='rearCap';
    for (const [y,r] of [[.019,.019],[-.020,.012]]) {
      cyl(r,L,body,0,y,0,y>0?'lightTube':'laserTube');
      cyl(r*1.10,.016,metal,0,y,L/2-.009,y>0?'lightHead':'laserHead');
    }
    W.fasteners(unit,gunMid,'torx',[-.058,.020].flatMap(z=>[-.022,.028].map(y=>({x:.024,y,z,axis:'x',side:1,r:.0022}))));
    W.serrations(unit,gunDark,{x:.0243,y:.003,z:-.024,axis:'x',side:1,along:'z',count:5,pitch:.006,w:.017,depth:.0006});
    light = window(0,.019,L/2+.003,.014,'light');
    laser = window(0,-.020,L/2+.003,.007,'laser');
    const windage = put(new THREE.CylinderGeometry(.006,.006,.006,12),metal,.027,-.020,-.005,'windageDial');
    windage.rotation.z = -Math.PI/2;
    bindModelArtwork(gun,'controls','laserWindage',windage);
  } else if (spec.kind === 'tube') {
    // A cantilever shoe on the shroud's right collar carries the lamp and
    // the smaller laser pod. Both front windows have their own bore axis.
    box(0.022, 0.020, 0.024, metal, -0.024, -0.018, 0.002, 'collarClamp');
    put(new THREE.TorusGeometry(0.0195, 0.003, 6, 24), gunDark, 0, 0, 0.002, 'lampBand');
    cyl(0.0175, L - 0.018, body, 0, 0, -0.009, 'lightTube');
    cyl(0.020, 0.018, metal, 0, 0, L / 2 - 0.009, 'lampHead');
    box(0.012, 0.016, 0.060, body, 0, -0.018, 0.030, 'laserBridge');
    cyl(0.009, 0.070, gunDark, 0, -0.024, 0.026, 'laserBarrel');
    box(0.005, 0.009, 0.021, gunRubber, 0.018, 0, -0.046, 'pressureSwitch');
    light = window(0, 0, L / 2 + 0.004, 0.014, 'light');
    laser = window(0, -0.024, 0.065, 0.006, 'laser');
  } else {
    // Guard and under-barrel shells differ in scale; the PEQ family shares the
    // same basic flat face and dual windows on the right side rail.
    const W = spec.width, H = spec.height;
    if (spec.kind === 'under' || spec.kind === 'guard') {
      const clamp = box(W * 0.66, 0.012, L * 0.58, gunDark, 0, H * 0.55, -L * 0.16, 'railClamp');
      if (kind === 'uzi') {
        // This mount meets the sloping face of the Wasp's drawn fore-end.
        // Keep its underside flush with the light's lid and its top flush with that face.
        const vertices = clamp.geometry.attributes.position;
        for (let i = 0; i < vertices.count; i++) {
          const z = spec.z + spec.scale * (vertices.getZ(i) + clamp.position.z);
          const foreEndY = -0.013 - (z - 0.187) * (0.003 / 0.132);
          const top = (foreEndY - spec.y) / spec.scale;
          vertices.setY(i, (vertices.getY(i) > 0 ? top : H / 2) - clamp.position.y);
        }
        clamp.geometry.computeVertexNormals();
      }
      if (spec.kind === 'guard') for (const sx of [-1, 1]) {
        box(0.0065, 0.027, 0.035, body, sx * 0.02575, -0.008, -L * 0.39, 'guardPad');
        box(0.003, 0.016, 0.016, gunRubber, sx * 0.0305, -0.008, -L * 0.39, 'activationPad');
      }
    } else {
      box(0.013, H * 0.8, L * 0.77, gunDark, -W * 0.57, -0.003, -0.008, 'sideRailClamp');
      for (const z of [-0.026, 0.020]) cyl(0.006, 0.008, metal, -W * 0.58, 0, z, 'clampScrew');
    }
    box(W, H, L, body, 0, 0, 0, 'moduleShell');
    box(W * 0.96, H * 0.16, L * 0.82, gunDark, 0, H * 0.38, 0, 'coverSeam');
    if (spec.kind === 'guard') for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
      box(0.002, H * 0.54, 0.004, gunDark, sx * (W / 2 + 0.0002), -0.002, L * (0.21 + i * 0.07), 'noseRib');
    }
    const face = L / 2 + 0.003;
    light = window(-W * 0.22, 0, face, Math.min(H * 0.28, 0.014), 'light');
    laser = window(W * 0.25, 0, face, Math.min(H * 0.13, 0.007), 'laser');
    if (spec.kind === 'peq' || spec.kind === 'peq16') {
      for (const x of [-W * 0.20, W * 0.21]) cyl(0.010, 0.008, metal, x, H * 0.57, -L * 0.19, 'modeDial');
      box(W * 0.55, 0.003, L * 0.35, gunDark, W * 0.02, H * 0.51, L * 0.13, 'topPlate');
    }
    if (spec.kind === 'peq16') {
      // PEQ-16 profile: prominent low white head, raised dual laser housing.
      box(0.002, H * 0.48, L * 0.43, gunDark, W / 2 + 0.0002, -0.002, -L * 0.12, 'blankDataPlate');
      put(new THREE.CylinderGeometry(0.018, 0.018, 0.008, 16), metal, -0.012, H / 2 + 0.003, -L * 0.16, 'selectorDial');
      box(0.029, 0.003, 0.004, gunDark, -0.012, H / 2 + 0.008, -L * 0.16, 'selectorBar');
      put(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 12), metal, W * 0.31, H / 2 + 0.002, -L * 0.3, 'adjusterDial');
      cyl(0.019, 0.023, body, -W * 0.22, -H * 0.12, face + 0.010, 'lightHead');
      light = window(-W * 0.22, -H * 0.12, face + 0.022, 0.014, 'light');
      cyl(0.015, 0.021, body, W * 0.24, H * 0.17, face + 0.009, 'laserHousing');
      laser = window(W * 0.24, H * 0.17, face + 0.021, 0.007, 'laser');
      box(0.015, 0.013, 0.003, gunDark, W * 0.34, 0, -L * 0.53, 'lanyardLoop');
    }
  }
  let pad,axis,faceOffset;
  const padKit=ctx.gunKit(unit);
  if(spec.kind==='guard'){
    pad=unit.children.find(mesh=>mesh.name==='activationPad' && mesh.position.x<0);
    axis=new THREE.Vector3(1,0,0);faceOffset=.0015;
  }else if(kind==='ak'){
    const tape=kr7TapeSwitch(THREE,gun,unit,ctx,padKit);
    pad=tape.pad;axis=tape.axis;faceOffset=tape.faceOffset;
  }else if(kind==='uzi'){
    // The support grip covers the back of this compact light; its near side is exposed.
    faceOffset=.0012;
    pad=padKit.box(2*faceOffset,spec.height*.42,L*.20,gunDark,spec.width/2+faceOffset,-spec.height*.13,-L*.20,0,0,0,unit,.0009);
    pad.name='lightSwitchPad';axis=new THREE.Vector3(-1,0,0);
  }else if(spec.kind==='tube'){
    pad=unit.getObjectByName('pressureSwitch');axis=new THREE.Vector3(-1,0,0);faceOffset=.0025;
  }else if(spec.kind==='dualTube'){
    faceOffset=.0012;
    pad=padKit.lathe([[0,-faceOffset],[.0062,-faceOffset],[.0068,-.00085],[.007,-.00035],[.007,faceOffset],[0,faceOffset]],
      gunDark,{y:.019,z:-L/2-faceOffset,seg:16});
    pad.name='lightSwitchPad';
    axis=new THREE.Vector3(0,0,1);
  }else if(spec.kind==='peq' || spec.kind==='peq16'){
    const plate=unit.getObjectByName('topPlate');faceOffset=.0012;
    pad=padKit.box(spec.width*.34,2*faceOffset,L*.19,gunDark,plate.position.x,plate.position.y+.0015+faceOffset,plate.position.z,
      0,0,0,unit,.0009);
    pad.name='lightSwitchPad';
    axis=new THREE.Vector3(0,-1,0);
  }else{
    faceOffset=.0012;
    pad=padKit.box(spec.width*.42,spec.height*.42,2*faceOffset,gunDark,0,spec.padY ?? 0,-L/2-faceOffset,0,0,0,unit,.0009);
    pad.name='lightSwitchPad';
    axis=new THREE.Vector3(0,0,1);
  }
  const contact=createLightSwitch(THREE,gun,unit,kind,pad,axis,.001,faceOffset);
  bindModelArtwork(gun,'controls','lightSwitch',contact);
  gun.userData.laserLightUnit = unit;
  // Keep the light's local optical points and the held gun's projected origins in sync.
  // The M240's copy follows its elevation pivot; the Wasp's compact module has its own scale.
  unit.userData.laserLens=laser;
  unit.userData.lightLens=light;
  unit.updateMatrix();
  gun.userData.laserLensLocal=laser.clone().applyMatrix4(unit.matrix);
  gun.userData.lightLensLocal=light.clone().applyMatrix4(unit.matrix);
  return gun;
}


// V5 review: real routed wood, with the pressure surface flush to its original face.
function routeKr7TapePocket(T,wood,axis,tangent,v0,z0,height,length){
  if(wood.position.length()>1e-12||wood.quaternion.angleTo(new T.Quaternion())>1e-12||wood.scale.distanceTo(new T.Vector3(1,1,1))>1e-12)throw Error('KR-7 source handguard must be in its raw frame');
  const old=wood.geometry,P=old.attributes.position,N=old.attributes.normal,U=old.attributes.uv;
  if(old.index||!N||!U||Object.keys(old.attributes).length!==3)throw Error('Actual nonindexed wood position/normal/UV required');
  const probe=new T.Mesh(old,new T.MeshBasicMaterial({side:T.DoubleSide}));probe.updateMatrixWorld(true);
  const ray=new T.Raycaster(),vMin=v0-height/2,vMax=v0+height/2,zMin=z0-length/2,zMax=z0+length/2;
  let ringZ=Infinity;for(let i=0;i<P.count;i++)if(Math.abs(P.getZ(i)-z0)<Math.abs(ringZ-z0))ringZ=P.getZ(i);
  const samples=new Set([vMin,vMax]);for(let i=0;i<P.count;i++)if(Math.abs(P.getZ(i)-ringZ)<1e-7&&P.getX(i)<-.018){const v=tangent.x*P.getX(i)+tangent.y*P.getY(i);if(v>vMin&&v<vMax)samples.add(v);}
  const surface=v=>{ray.set(axis.clone().multiplyScalar(-1).addScaledVector(tangent,v).add(new T.Vector3(0,0,z0)),axis);const h=ray.intersectObject(probe,false)[0];if(!h||h.point.x>-.018)throw Error('Wood outer left face required');return h.point.dot(axis);};
  const skin=[...samples].map(v=>({v,u:surface(v)})),front=Math.max(...skin.map(s=>s.u))-.0002,back=front+.0025,floor=back+.00006;
  // Keep uncut triangles intact. Split only actual cavity intersections, then
  // insert shared edge points before triangulating: a local cut without T junctions.
  const planes=[p=>floor-p.dot(axis),p=>p.dot(tangent)-vMin,p=>vMax-p.dot(tangent),p=>p.z-zMin,p=>zMax-p.z];
  const blend=(a,b,t)=>({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),uv:a.uv.clone().lerp(b.uv,t)});
  const clip=(poly,d,positive)=>{const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=d(a.p)*(positive?1:-1),db=d(b.p)*(positive?1:-1);if(da>=-1e-12)out.push(a);if(da>1e-12&&db< -1e-12||da< -1e-12&&db>1e-12)out.push(blend(a,b,da/(da-db)));}return out.filter((a,i)=>a.p.distanceToSquared(out[(i+out.length-1)%out.length].p)>1e-22);};
  const polys=[],kept=[],positions=[],normals=[],uvs=[];let removedTriangles=0;
  const add=(a,b,c)=>{if(new T.Vector3().subVectors(b.p,a.p).cross(new T.Vector3().subVectors(c.p,a.p)).lengthSq()<1e-24)return;kept.push([a,b,c]);};
  for(let i=0;i<P.count;i+=3){let poly=[0,1,2].map(j=>({p:new T.Vector3().fromBufferAttribute(P,i+j),n:new T.Vector3().fromBufferAttribute(N,i+j),uv:new T.Vector2().fromBufferAttribute(U,i+j)}));
   if(planes.some(d=>poly.every(a=>d(a.p)<-1e-12))){polys.push(poly);continue;}
   for(const plane of planes){const outside=clip(poly,plane,false);if(outside.length>=3)polys.push(outside);poly=clip(poly,plane,true);if(poly.length<3)break;}
   if(poly.length>=3)removedTriangles++;
  }
  if(!removedTriangles)throw Error('Routed pocket removed no original wood');
  const grid=new Map(),unique=new Map(),h=.01;
  for(const poly of polys)for(const a of poly){const k=a.p.toArray().map(x=>Math.round(x*1e8)).join(',');if(unique.has(k))continue;unique.set(k,a.p);const cell=a.p.toArray().map(x=>Math.floor(x/h)).join(',');if(!grid.has(cell))grid.set(cell,[]);grid.get(cell).push(a.p);}
  let repairedEdges=0;
  for(const poly of polys){const expanded=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],d=b.p.clone().sub(a.p),L=d.lengthSq(),points=new Map();expanded.push(a);if(L<1e-22)continue;
    const lo=a.p.clone().min(b.p).multiplyScalar(1/h).floor(),hi=a.p.clone().max(b.p).multiplyScalar(1/h).floor();
    for(let x=lo.x;x<=hi.x;x++)for(let y=lo.y;y<=hi.y;y++)for(let z=lo.z;z<=hi.z;z++)for(const q of grid.get([x,y,z].join(','))||[]){const t=q.clone().sub(a.p).dot(d)/L;if(t<=1e-7||t>=1-1e-7)continue;if(a.p.clone().addScaledVector(d,t).distanceToSquared(q)>1e-18)continue;points.set(Math.round(t*1e10),t);}
    if(points.size)repairedEdges++;for(const t of [...points.values()].sort((a,b)=>a-b))expanded.push(blend(a,b,t));
   }
   if(expanded.length===3){add(...expanded);continue;}
   const centre={p:new T.Vector3(),n:new T.Vector3(),uv:new T.Vector2()};for(const a of expanded){centre.p.add(a.p);centre.n.add(a.n);centre.uv.add(a.uv);}centre.p.multiplyScalar(1/expanded.length);centre.n.normalize();centre.uv.multiplyScalar(1/expanded.length);
   for(let i=0;i<expanded.length;i++)add(expanded[i],expanded[(i+1)%expanded.length],centre);
  }
  const key=p=>p.toArray().map(x=>Math.round(x*1e7)).join(','),edges=new Map();
  for(const tri of kept)for(let i=0;i<3;i++){const a=tri[i],b=tri[(i+1)%3],ka=key(a.p),kb=key(b.p),k=ka<kb?ka+'|'+kb:kb+'|'+ka,r=edges.get(k)||{count:0,a,b};r.count++;edges.set(k,r);}
  const boundary=[...edges.values()].filter(e=>e.count===1);if(boundary.length<4)throw Error('No actual routed opening boundary');
  if([...edges.values()].some(e=>e.count>2))throw Error('Wood split created nonmanifold edge');
  const bb=old.boundingBox||new T.Box3().setFromBufferAttribute(P),middle=(bb.min.y+bb.max.y)/2,halfWidth=Math.max(Math.abs(bb.min.x),Math.abs(bb.max.x));
  const fresh=(p,n)=>{const side=Math.abs(n.x)>.75,end=Math.abs(n.z)>.70,along=p.z,across=p.y-middle,section=side?.5+across/.24:.5+p.x/(2*halfWidth);return{p,n:n.clone(),uv:new T.Vector2(.63+(side||!end?along:across)*3.8,(side?0:.5)+.02+.46*Math.max(0,Math.min(1,section)))};};
  const rawTriangle=(a,b,c)=>{const n=new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(c,a)).normalize();add(fresh(a,n),fresh(b,n),fresh(c,n));};
  const centre=axis.clone().multiplyScalar(floor).addScaledVector(tangent,v0).add(new T.Vector3(0,0,z0));
  for(const {a,b}of boundary){const A=a.p.clone().addScaledVector(axis,floor-a.p.dot(axis)),B=b.p.clone().addScaledVector(axis,floor-b.p.dot(axis));
   if(Math.abs(a.p.z-zMin)>1e-6&&Math.abs(a.p.z-zMax)>1e-6&&Math.abs(a.p.dot(tangent)-vMin)>1e-6&&Math.abs(a.p.dot(tangent)-vMax)>1e-6)throw Error('Opening escaped routed rectangle');
   rawTriangle(b.p,a.p,A);rawTriangle(b.p,A,B);rawTriangle(B,A,centre);
  }
  for(const tri of kept)for(const a of tri){positions.push(...a.p.toArray());normals.push(...a.n.toArray());uvs.push(...a.uv.toArray());}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeBoundingBox();g.computeBoundingSphere();wood.geometry=g;probe.material.dispose();
  // The factory cloned this geometry before attaching the lamp; only this copy is replaced.
  old.dispose();
  return{front,back,floor,v0,z0,height,length,skin,maximumProudRaw:.0002,sourceTriangles:P.count/3,routedTriangles:g.attributes.position.count/3,openingEdges:boundary.length,removedPolygons:removedTriangles,repairedEdges};
}

function kr7TapeSwitch(T,gun,unit,ctx,K){
  const axis=new T.Vector3(.998,-.063,0).normalize(),tangent=new T.Vector3(-axis.y,axis.x,0),oldContact=new T.Vector3(-.04132328823429005,-.02229852990104181,.397);
  const width=.0025,height=.016,length=.028,faceOffset=width/2;
  const wood=gun.getObjectByName('KR-7 lower handguard');if(!wood)throw Error('Actual KR-7 handguard required');
  const pocket=routeKr7TapePocket(T,wood,axis,tangent,oldContact.dot(tangent),oldContact.z,.0184,.0334);
  const contact=axis.clone().multiplyScalar(pocket.front).addScaledVector(tangent,pocket.v0).add(new T.Vector3(0,0,pocket.z0)),centre=contact.clone().addScaledVector(axis,faceOffset);
  const pad=K.box(width,height,length,ctx.gunRubber,centre.x-unit.position.x,centre.y-unit.position.y,centre.z-unit.position.z,0,0,Math.atan2(axis.y,axis.x),unit,.0005);
  pad.name='lightSwitchPad';pad.userData.tapePressurePad=true;
  const basis=new T.Matrix4().makeBasis(tangent,new T.Vector3(0,0,1),axis);
  const at=(o,u)=>{o.applyMatrix4(basis);o.position.copy(axis).multiplyScalar(u).addScaledVector(tangent,pocket.v0).add(new T.Vector3(0,0,pocket.z0)).sub(unit.position);o.castShadow=o.receiveShadow=true;unit.add(o);return o;};
  // A shallow fixed surround beds the pad in the routed seat; its aperture clears
  // the deforming rubber on all four sides. The cable grommet meets its front lip.
  const shape=new T.Shape();shape.moveTo(-.009,-.0165);shape.lineTo(.009,-.0165);shape.lineTo(.009,.0165);shape.lineTo(-.009,.0165);shape.closePath();
  const hole=new T.Path();hole.moveTo(-.0081,-.0141);hole.lineTo(-.0081,.0141);hole.lineTo(.0081,.0141);hole.lineTo(.0081,-.0141);hole.closePath();shape.holes.push(hole);
  const seat=at(new T.Mesh(new T.ExtrudeGeometry(shape,{depth:width-.0004,steps:1,curveSegments:1,bevelEnabled:true,bevelSize:.0001,bevelThickness:.0002,bevelSegments:1}),ctx.gunRubber),pocket.front+.0002);
  seat.name='KR-7 tape-switch fixed inset surround';
  const backing=at(new T.Mesh(new T.BoxGeometry(.0162,.0282,.00006),ctx.gunRubber),pocket.back+.00003);backing.name='KR-7 tape-switch adhesive backing';
  // V6 review: retain the approved pad-side exit/wood/datum; route the last
  // four points directly into a named socket on the actual lamp rear face.
  // No loose forward/downward hook; the first five control points stay exact.
  const cablePoints=[[-.04007577139269901,-.029,.4115],[-.0408,-.0245,.422],[-.0406,-.031,.438],[-.039,-.032,.463],[-.035,-.032,.498],[-.0315,-.034,.507],[-.026,-.040,.516],[-.023,-.0445,.5195],[-.023,-.045,.522]];
  const curve=new T.CatmullRomCurve3(cablePoints.map(p=>new T.Vector3(...p).sub(unit.position)),false,'centripetal'),segments=24,radial=6,radius=.0011;
  const tube=new T.TubeGeometry(curve,segments,radius,radial,false),TP=tube.attributes.position,positions=Array.from(TP.array),indices=Array.from(tube.index.array),uv=Array.from(tube.attributes.uv.array);
  for(const end of[0,1]){const c=curve.getPoint(end),normal=curve.getTangent(end).normalize().multiplyScalar(end?1:-1),centreIndex=positions.length/3;positions.push(...c.toArray());uv.push(.5,.5);const row=end?segments*(radial+1):0;for(let i=0;i<radial;i++){let a=row+i,b=row+(i+1)%radial;const A=new T.Vector3().fromBufferAttribute(TP,a).sub(c),B=new T.Vector3().fromBufferAttribute(TP,b).sub(c);if(A.cross(B).dot(normal)<0)[a,b]=[b,a];indices.push(centreIndex,a,b);}}
  tube.setAttribute('position',new T.Float32BufferAttribute(positions,3));tube.setAttribute('uv',new T.Float32BufferAttribute(uv,2));tube.deleteAttribute('normal');tube.setIndex(indices);tube.computeVertexNormals();tube.computeBoundingBox();tube.computeBoundingSphere();const cable=new T.Mesh(tube,ctx.gunRubber);cable.name='KR-7 tape-switch cable';cable.castShadow=cable.receiveShadow=true;unit.add(cable);
  for(const[t,label]of[[0,'pad'],[1,'lamp']]){const r=t?.0016:.0015,cap=new T.Mesh(new T.CylinderGeometry(r,r,.003,8),ctx.gunRubber);cap.name='KR-7 tape-switch '+label+' strain relief';cap.position.copy(curve.getPoint(t));cap.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),curve.getTangent(t).normalize());cap.castShadow=cap.receiveShadow=true;unit.add(cap);}
  // Closed annular rear receptacle: its base enters the existing module shell,
  // its bore receives the cable's rubber strain relief. It is fixed artwork.
  const lampPortRaw=[-.023,-.045,.5203],portProfile=[[.0014,-.002],[.0036,-.002],[.0036,.002],[.0014,.002],[.0014,-.002]];
  const port=new T.Mesh(new T.LatheGeometry(portProfile.map(p=>new T.Vector2(...p)),12),ctx.gunMid);
  port.name='KR-7 tape-switch lamp rear cable socket';port.rotation.x=Math.PI/2;
  port.position.fromArray(lampPortRaw).sub(unit.position);port.castShadow=port.receiveShadow=true;unit.add(port);
  wood.userData.kr7TapePocket={...pocket,axis:axis.toArray(),tangent:tangent.toArray()};
  unit.userData.kr7TapeSwitch={version:6,contact:contact.toArray(),padSize:[width,height,length],inwardAxis:axis.toArray(),travel:.001,sourceThumbPad:[0,-.0138,.009],pocket,cablePoints,cableRadius:radius,lampPort:{center:lampPortRaw,rearShellZ:.521,axis:[0,0,1],innerRadius:.0014,outerRadius:.0036,length:.004},scope:'Review only V6: approvedpad/wood/datum/first5cordpoints exact; last4points run directly into named rear lamp socket. No loose forward hook. Actualnative connection/fullpressclip/fourlightLOOK required before approval; no hand/motion/row change.'};
  return{pad,axis,faceOffset};
}
