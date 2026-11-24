// GP-168/GP-191: Training props; gate leaves stay separate for animation.
// Dimensions are metres; no lights, timers, physics or gameplay state here.
import { getTrainingPBR, heightToNormalRGBA, makeDataTexture, tileFbm } from './training-textures.js';
const PROPS_TEX_CACHE = new WeakMap();
function getVinylDetail(T) {
  let c = PROPS_TEX_CACHE.get(T);
  if (c) return c;
  const w = 256, h = 128;
  const hf = new Float32Array(w * h);
  const orm = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const i = y * w + x, o = i * 4;
      const peb = tileFbm(u, v, 32, 16, 401, 2) - 0.5;
      // Three welded vinyl seams at 1.8m, 3.6m, 5.4m across 7.2m width
      let seam = 0;
      for (const sx of [0.25, 0.5, 0.75]) {
        const d = Math.abs(u - sx) * w;
        if (d < 2.5) seam = Math.max(seam, 1 - d / 2.5);
      }
      // Foot traffic matte scuff zones around stretcher (.38, .55) and cabinet (.82, .35)
      const d1 = Math.hypot((u - 0.38) / 0.22, (v - 0.55) / 0.28);
      const d2 = Math.hypot((u - 0.82) / 0.16, (v - 0.35) / 0.24);
      const wear = Math.max(0, 1 - Math.min(d1, d2));
      hf[i] = 0.55 + peb * 0.08 - seam * 0.32;
      orm[o] = Math.round((0.96 - seam * 0.36 - wear * 0.06) * 255);
      orm[o + 1] = Math.round(Math.min(0.95, 0.42 + wear * 0.34 + seam * 0.38 + Math.abs(peb) * 0.08) * 255);
      orm[o + 2] = 5;
      orm[o + 3] = 255;
    }
  }
  c = {
    nrm: makeDataTexture(T, heightToNormalRGBA(hf, w, h, 2.0, false, false), w, h, { name: 'tg-vinyl-nrm', srgb: false, repeat: false, aniso: 8 }),
    orm: makeDataTexture(T, orm, w, h, { name: 'tg-vinyl-orm', srgb: false, repeat: false, aniso: 8 }),
  };
  PROPS_TEX_CACHE.set(T, c);
  return c;
}
export function dressTrainingProps(T, { B, gate, bedAt, box: roomBox, add: roomAdd, std, texture, sign, steel, steelLight, hazard, lampMat, labels = {} }) {
  let moving = null, staticGate = null, medicalFurniture = false;
  const gateFrame = new T.Group(); gateFrame.name = 'training-gate-frame';
  const route = m => { const parent = moving || staticGate; if (parent) parent.add(m); if (medicalFurniture) m.userData.trainingProp = true; return m; };
  const add = (...args) => route(roomAdd(...args));
  const box = (...args) => route(roomBox(...args));
  const GATE_POCKET = .62;
  const gateLeaves = [-1, 1].map(side => {
    const leaf = new T.Group(); leaf.name = 'training-gate-leaf-' + side;
    leaf.userData.side = side; leaf.scale.y = 1.4; return leaf;
  });
  const pbr = getTrainingPBR(T);
  const rubber = std(pbr ? pbr.rubberCrumb.opts({ color: 0x35403d, normalScale: 0.9 }) : { color: 0x141b19, roughness: .94 });
  const dark = std(pbr ? pbr.steelDark.opts({ color: 0x708278 }) : { color: 0x25312b, roughness: .79, metalness: .4 });
  const bone = std(pbr ? pbr.medicalEnamel.opts({ color: 0xd0d2b6 }) : { color: 0xc7c9ae, roughness: .85 });
  const red = std(pbr ? pbr.medicalEnamel.opts({ color: 0xb23c30, normalScale: 0.6 }) : { color: 0xa6382c, roughness: .79 });
  const paintMap = pbr ? null : texture(256, 256, c => {
    c.fillStyle = '#52604b'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 170; i++) {
      const x = (i * 73 + 9) % 256, y = (i * 41 + 15) % 256;
      c.fillStyle = i % 3 ? '#10201625' : '#d4d2ac35';
      c.fillRect(x, y, 2 + i % 13, 1 + i % 2);
    }
    c.strokeStyle = '#c0c4a255'; c.lineWidth = 2; c.strokeRect(3, 3, 250, 250);
  });
  const olive = std(pbr ? pbr.oliveSteel.opts({ color: 0xffffff }) : { color: 0xffffff, map: paintMap, roughness: .82, metalness: .3 });
  const clothMap = pbr ? null : texture(256, 256, c => {
    c.fillStyle = '#60694f'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 4) {
      c.fillStyle = '#c4c8a01b'; c.fillRect(i, 0, 1, 256);
      c.fillStyle = '#111e181f'; c.fillRect(0, i, 256, 1);
    }
    c.strokeStyle = '#a5ad8266'; c.lineWidth = 3; c.strokeRect(8, 8, 240, 240);
  });
  const canvas = std(pbr ? pbr.canvasMilitary.opts({ color: 0x707a5e, normalScale: 1.0 }) : { color: 0xffffff, map: clothMap, roughness: .98 });
  const amber = std({ color: 0xf2b845, emissive: 0xf2a329, emissiveIntensity: .65, roughness: .32,
    ...(pbr ? { map: pbr.prismaticLens.map, normalMap: pbr.prismaticLens.normalMap, normalScale: T.Vector2 ? new T.Vector2(1.0, 1.0) : undefined } : {}) });
  const worldUvMats = new Map([[rubber, 0.55], [dark, 1.1], [bone, 0.7], [red, 0.6], [olive, 2.4], [canvas, 0.55], [amber, 0.25]]);
  const cyl = (r, h, mat, x, y, z, seg = 12) => add(new T.CylinderGeometry(r, r, h, seg), mat, x, y, z);
  const rod = (a, b, r, mat) => {
    const dir = new T.Vector3(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
    const m = cyl(r, dir.length(), mat, (a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2, 8);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize()); return m;
  };
  const rounded = (w, h, d, mat, x, y, z, radius = .045) => {
    const bevel = Math.min(.012, d / 4, w / 6, h / 6);
    const X = w / 2 - bevel, Y = h / 2 - bevel, r = Math.min(radius, X / 2, Y / 2), s = new T.Shape();
    s.moveTo(-X+r,-Y); s.lineTo(X-r,-Y); s.quadraticCurveTo(X,-Y,X,-Y+r);
    s.lineTo(X,Y-r); s.quadraticCurveTo(X,Y,X-r,Y); s.lineTo(-X+r,Y);
    s.quadraticCurveTo(-X,Y,-X,Y-r); s.lineTo(-X,-Y+r); s.quadraticCurveTo(-X,-Y,-X+r,-Y);
    const geo = new T.ExtrudeGeometry(s,{depth:d-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1,curveSegments:3});
    geo.translate(0,0,-d/2+bevel); const m=add(geo,mat,x,y,z);m.castShadow=true;m.receiveShadow=true;return m;
  };
  const bolt = (x,y,z,r=.035,depth=.024) => { const b=cyl(r,depth,steelLight,x,y,z,6); b.rotation.x=Math.PI/2; return b; };
  const destructSpecs = [];
  const cross = (x,y,z,size=.35,depth=.022) => {
    const w = size * .24, arm = (size - w) / 2;
    const ms = [box(size,w,depth,red,x,y,z)];
    for (const sy of [-1, 1]) ms.push(box(w,arm,depth,red,x,y + sy * (w + arm) / 2,z));
    return ms;
  };
  const bandRing = (rIn, rOut, h, mat, x, y, z, seg = 16) => {
    const m = add(new T.LatheGeometry([
      new T.Vector2(rIn, 0), new T.Vector2(rOut, 0),
      new T.Vector2(rOut, h), new T.Vector2(rIn, h), new T.Vector2(rIn, 0)
    ], seg), mat, x, y, z);
    m.castShadow = true; return m;
  };

  // A broad sealed containment gate: twin ribbed leaves, central latch, guides,
  // hydraulic gear and a grated approach. Front faces point into the room (-z).
  staticGate = gateFrame; gateFrame.scale.y = 1.4;
  const gx=gate.x, gz=B.maxZ-.02;
  // Threshold plate & hazard nosing seated flush on y = 0.000 m, with approach traction ribs.
  box(8.2,.032,1.0,steel,gx,.016,gz-.51);
  { const nose = box(8.2,.032,.14,hazard,gx,.016,gz-1.08), uv = nose.geometry.attributes.uv;   // CF-22 (AG-401): stripes at 1 m a strip, not one stretched strip
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 8.2, uv.getY(i) * (i >> 2 === 2 || i >> 2 === 3 ? 1.12 : .256)); uv.needsUpdate = true; }
  for(let i=-15;i<=15;i++)box(.055,.012,.5,rubber,gx+i*.195,.038,gz-.74);
  // Lintel beam, under-lintel hazard valance, and upper header backing.
  box(7.58,.32,.56,steel,gx,4.68,gz-.36);
  box(5.92,.1,.16,hazard,gx,4.47,gz-.54);
  box(7.9,.52,.14,dark,gx,5.1,gz-.15);
  for (const side of [-1,1]) {
    const px = gx + side * 1.6, rx = gx + side * 1.535;
    moving = gateLeaves[side < 0 ? 0 : 1];
    rounded(3.18,4.3,.18,olive,px,2.24,gz-.26,.08);
    box(3.12,.058,.14,rubber,px,.061,gz-.26);
    box(.12,4.3,.06,steel,gx+side*3.04,2.24,gz-.38);
    for (const y of [.55,1.55,2.55,3.55]) {
      box(2.89,.16,.08,steel,rx,y,gz-.39);
      for (const dx of [-1.25,1.25]) bolt(rx+dx,y,gz-.442,.035,.024);
    }
    // CF-22 (CH-3 #19, D-237 item 13): the leaf read as a flat panel with two loose bars. Now: a Z brace in each bay
    // running rib to rib (the old bar stopped mid-panel), pressed vertical stiffeners in the bays, rivet rows along
    // every rib and down both edges, a channel on the meeting edge, and claw marks through the paint at a zombie's
    // reach (world 1.3-1.9 m). Every part in the leaf's own steel, steelLight and olive: the leaf's dark material is
    // gone (one draw fewer a leaf).
    const fz = gz - .35, ribY = [.55,1.55,2.55,3.55];
    for (let b = 0; b < 3; b++) {   // Z braces, rib to rib, alternating
      const ya = ribY[b] + .08, yb = ribY[b + 1] - .08, xa = rx - side * 1.36 * (b % 2 ? -1 : 1), xb = rx + side * 1.36 * (b % 2 ? -1 : 1);
      const len = Math.hypot(xb - xa, yb - ya), br = box(.1, len, .05, steel, (xa + xb) / 2, (ya + yb) / 2, gz - .40);
      br.rotation.z = Math.atan2(-(xb - xa), yb - ya);
    }
    const patchBay = side < 0;   // CG-2's welded plate sits in the west leaf's lowest bay, outer half
    for (const [y0, y1] of [[.13,.47],[.63,1.47],[1.63,2.47],[2.63,3.47]]) for (const off of [-1.05,-.35,.35,1.05]) {
      if (patchBay && y0 === .63 && off * side > .5) continue;
      box(.05, y1 - y0, .025, olive, px + off, (y0 + y1) / 2, fz - .0125);   // seated on the plate, the brace on it (0 mm)
    }
    for (const y of ribY) for (let k = -4; k <= 4; k++) if (Math.abs(k) !== 4) bolt(rx + k * .3, y + .045, gz - .434, .014, .008);   // seated on the rib's face (0 mm)
    for (const ex of [px - side * 1.33, px + side * 1.33]) for (let y = .3; y < 4.2; y += .3) if (!ribY.some((ry) => Math.abs(ry - y) < .1)) bolt(ex, y, fz - .004, .013, .008);   // clear of the guide and the meeting edge
    if (side > 0) for (const [y0, y1] of [[.09,.47],[.63,1.47],[1.63,2.47],[2.63,3.47],[3.63,4.39]])   // meeting-edge channel, rib to rib
      box(.07, y1 - y0, .05, steel, gx + .135, (y0 + y1) / 2, gz - .39);   // (the west leaf has the latch post there)
    for (const [cx, cy, n, a] of [[px + side * .55, 1.05, 4, .95], [px - side * .1, 1.22, 3, 1.1]]) {   // clear of the stiffeners and rivets (t337)
      for (let k = 0; k < n; k++) { const s = box(.016, .27 + k % 2 * .06, .0016, steelLight, cx + side * k * .034, cy - k * .012, fz - .0008); s.rotation.z = side * a + k * .03; s.castShadow = false; }
    }
    for(let i=0;i<7;i++)box(.92,.036,.05,rubber,rx,3.88+i*.052,gz-.375);
    moving = null;
    // Side pilasters, guide channels, hazard stripes and anchor bolts on the threshold.
    box(.44,4.488,.44,steel,gx+side*3.53,2.276,gz-.34);
    box(.18,4.488,.2,steelLight,gx+side*3.22,2.276,gz-.46);
    box(.13,4.488,.04,hazard,gx+side*3.46,2.276,gz-.58);
    for (const y of [.4,1.4,2.4,3.4,4.35]) bolt(gx+side*3.66,y,gz-.572,.044,.024);
    // Hydraulic cylinder & piston rod on threshold, collared flush to pilaster.
    cyl(.13,1.3,dark,gx+side*3.91,.682,gz-.32,12);
    cyl(.08,1.8,steelLight,gx+side*3.91,2.232,gz-.32,12);
    box(.32,.1,.18,steel,gx+side*3.91,3.182,gz-.32);
    box(.03,.12,.16,steel,gx+side*3.765,.68,gz-.32);
    // Motor housing and upper guide roller under lintel.
    box(.58,.42,.4,olive,gx+side*3.56,5.05,gz-.42);
    box(.16,.1,.1,steel,gx+side*3.04,4.47,gz-.47);
    const roller=cyl(.06,.12,rubber,gx+side*3.04,4.36,gz-.47);roller.rotation.z=Math.PI/2;
    // Caged warning beacons seated on lintel. Named so they stay their own meshes (bakeStatic
    // merges unnamed ones): the encounter lights sit on this glass.
    const bxBeacon = gx + side * 2.8;
    box(.5,.56,.22,dark,bxBeacon,5.12,gz-.36);
    const lens = rounded(.3,.32,.12,amber,bxBeacon,5.12,gz-.53,.06);
    lens.name = 'training-gate-beacon';
    destructSpecs.push({ id: side < 0 ? 'gateBeacon0' : 'gateBeacon1', kind: 'beacon', meshes: [lens], wallNormal: { x: 0, z: -1 } });
    for (const y of [4.92,5.32]) box(.4,.025,.16,steel,bxBeacon,y,gz-.55);
    for (const dx of [-.13,0,.13]) box(.025,.375,.03,steel,bxBeacon+dx,5.12,gz-.615);
  }
  // CG-2 beat 2 (the incident, never explained): the west leaf's outer bay between its two lowest ribs is a newer plate
  // of bare steel welded on over the olive, its bolts bright. Leaf materials only (baked with the leaf: no new draw).
  moving = gateLeaves[0];
  { const x0 = gx - 3.04 + .06 + .02 + .46, fz = gz - .26 - .09;   // inside the leaf's side guide (gx - 3.04, 12 cm wide); its face fz
    box(.92,.78,.012,steelLight,x0,1.05,fz-.006);
    for (let k = 0; k < 5; k++) for (const y of [.71,1.39]) bolt(x0-.4+k*.2,y,fz-.016,.022,.008);
    for (const dx of [-.4,.4]) bolt(x0+dx,1.05,fz-.016,.022,.008); }
  box(.18,4.3,.08,steel,gx,2.24,gz-.39);   // CF-22: the latch post in the leaf's steel (no dark material on a leaf)
  box(.5,.54,.1,steel,gx,2.05,gz-.48);
  for(const y of [1.86,2.24])box(1.12,.07,.06,steelLight,gx,y,gz-.56);
  bolt(gx,2.05,gz-.555,.09,.05);
  moving = null;
  // CG-1 (AH-1 #3): the leaves slid 3.5 m sideways in front of the wall, through the pilasters, the hydraulics and the
  // wall's face, cutting their PGB / CONTAINMENT plate in half. They now run in the wall's pocket: every leaf part
  // stands 0.62 m further back, wholly behind the wall line (front at +2 cm), so opening, they slide out of sight
  // behind the wall and the tunnel's sides. The pilasters, guides and lintel stay in front as the frame.
  for (const leaf of gateLeaves) leaf.position.z = GATE_POCKET;
  if(labels.gate) {
    box(4.18,.56,.06,dark,gx,5.12,gz-.61);
    gateFrame.add(sign(labels.gate,4.1,.54,gx,5.12,gz-.6403,Math.PI,{bg:'#1e2923',color:'#ddd6b1',size:150}));
  }
  if(labels.containment) {
    moving = gateLeaves[0];
    box(2.79,.2,.02,steel,gx-1.535,3.74,gz-.36);   // CF-22: its backing in the leaf's steel (no dark material on a leaf)
    moving = null;
    const label = sign(labels.containment,2.75,.18,gx-1.535,3.74,gz-.3703,Math.PI,{bg:'#27352b',color:'#c7c9ae',size:115});
    gateLeaves[0].add(label);
  }

  staticGate = null;

  // CG-2 beat 4: the Containment crew's count. Tally marks scratched through the paint of the hangar pillar nearest the
  // gate on the west (its flange face, x B.minX + .62, 0.70 m wide at z 23.65-24.35): one row a session, five-bar gates.
  // Light steel on the pillar's steel, so they bake into the west wall's group with it (no new draw).
  { const fx = B.minX + .62 + .0011, rows = [11, 14, 9, 17, 12, 6], z0 = 23.74, rnd = (i) => ((i * 9301 + 49297) % 233280) / 233280;
    rows.forEach((n, row) => {
      const y = 1.78 - row * .115;
      box(.0022, .004, .05, steelLight, fx, y + .005, z0 - .005 + (row % 2) * .004);          // the row's dash
      for (let k = 0; k < n; k++) {
        const g = Math.floor(k / 5), j = k % 5, zc = z0 + .07 + g * .1 + j * .016 + (rnd(row * 31 + k) - .5) * .004;
        if (j < 4) { const m = box(.0022, .07, .0045, steelLight, fx, y, zc); m.rotation.x = (rnd(row * 17 + k) - .5) * .12; }
        else { const m = box(.0022, .09, .0045, steelLight, fx, y, z0 + .07 + g * .1 + .024); m.rotation.x = .75; }
      }
    }); }

  // A fitted field medical bay along the back wall. Olive, charcoal and canvas
  // echo the FOB's equipment; a pale floor inset keeps its working area readable.
  const bx=bedAt.x,bz=bedAt.z,back=B.minZ+.08;
  // Floor mat seated flat on y = 0.000 m, trimmed flush against the bay walls (top y = 0.020 m).
  box(7.4,.012,4.04,dark,bx+.82,.006,back+2.0775);
  // CH-3 #6 (D-237 item 13): the mat is sheet vinyl now, not a flat colour: 1.8 m sheets with welded seams, a fine
  // fleck, soft scuffs where the stretcher and the cabinet sit. One texture, same box, same draw.
  const vinylMap=texture(1024,512,(c,w,h)=>{
    let s=11;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};
    c.fillStyle='#929a85';c.fillRect(0,0,w,h);
    for(let m=0;m<26;m++){const r=40+rnd()*120,x=rnd()*w,y=rnd()*h,gr=c.createRadialGradient(x,y,0,x,y,r);
      gr.addColorStop(0,`rgba(${rnd()<.5?'0,0,0':'255,255,255'},${.03*rnd()})`);gr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gr;c.fillRect(x-r,y-r,2*r,2*r);}
    for(let i=0;i<9000;i++){const k=rnd();c.fillStyle=k<.5?`rgba(40,46,36,${.18*rnd()})`:`rgba(235,238,228,${.22*rnd()})`;c.fillRect(rnd()*w,rnd()*h,1+(rnd()<.3),1);}
    for(let k=1;k<4;k++){const x=Math.round(k*w*1.8/7.2);c.fillStyle='rgba(52,58,48,.55)';c.fillRect(x-1,0,2,h);c.fillStyle='rgba(255,255,255,.18)';c.fillRect(x+1,0,1,h);}
    c.fillStyle='rgba(52,58,48,.5)';c.fillRect(0,0,w,3);c.fillRect(0,h-3,w,3);c.fillRect(0,0,3,h);c.fillRect(w-3,0,3,h);
    for(const [cx,cy,rx,ry] of [[.38,.55,.16,.22],[.82,.35,.1,.16]]){for(let i=0;i<40;i++){c.strokeStyle=`rgba(30,34,28,${.05+.07*rnd()})`;c.lineWidth=1+rnd()*2;
      const x=(cx+(rnd()-.5)*2*rx)*w,y=(cy+(rnd()-.5)*2*ry)*h,a=(rnd()-.5)*.6;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*(14+rnd()*50),y+Math.sin(a)*(4+rnd()*10));c.stroke();}}
  });
  if(vinylMap){vinylMap.anisotropy=8;vinylMap.generateMipmaps=true;}
  const vDet = pbr ? getVinylDetail(T) : null;
  box(7.2,.008,3.84,std({color:0xffffff,map:vinylMap,...(vDet?{normalMap:vDet.nrm,normalScale:T.Vector2?new T.Vector2(0.85,0.85):undefined,roughnessMap:vDet.orm,metalnessMap:vDet.orm,aoMap:vDet.orm,aoMapIntensity:0.68,roughness:1.0,metalness:1.0}:{roughness:.9})}),bx+.82,.016,back+2.0775);
  box(7.56,2.76,.075,dark,bx+.82,1.38,back+.02);
  for(let i=0;i<4;i++)box(1.76,2.44,.035,olive,bx-1.945+i*1.83,1.43,back+.075);
  for(const x of [-43.77,-36.29])box(.08,2.76,.08,steel,x,1.38,back+.0975);
  box(7.56,.17,.26,steel,bx+.82,2.845,back+.1125);
  box(6.8,.045,.1,lampMat,bx+.82,2.7375,back+.19);
  // Short return panel closes the corner visually without enclosing the bay.
  box(.08,2.76,3.74,dark,-43.77,1.38,-9.9125);
  box(.025,2.45,3.4,olive,-43.7175,1.43,-9.9125);
  if(labels.infirmary) {
    box(3.64,.5,.02,dark,bx-.2,2.34,back+.1025);
    sign(labels.infirmary,3.6,.48,bx-.2,2.34,back+.1128,0,{bg:'#25312b',color:'#ddd6b1',size:140});
  }
  cross(bx-2.58,2.3,back+.1035,.49,.022);
  // GP-19893: furniture near a wall must not become part of its architectural fade.
  medicalFurniture = true;
  // Reinforced wheeled stretcher, segmented pad, canvas blanket and stitched hem (seated on y = 0.020 m mat).
  // CG-1 (CF-20 #4): it was 2.48 m long; a hospital stretcher is 2.0-2.1 m. Lengths and offsets along it (x) are 0.85
  // of the old ones (pad 2.0 m), heights, wheels, tubes and the pad top (0.68 m, the lying height) unchanged, so the
  // wake-up spot (training.js bed: the hip at the centre, feet 0.9 m and head 0.9 m from it) still lies on the pad.
  // Its width (SZ) stays 1 for now: the bed-exit pose sits his hip 0.46 m off the centre line (the old pad's edge), so
  // a narrower pad needs that pose changed with it (studio/marine-bed-exit.js; asked of its owner).
  const SX=.85,SZ=1;
  rounded(2.48*SX,.1,1.0*SZ,dark,bx,.47,bz,.045);
  for(const dz of [-.535,.535])rod([bx-1.18*SX,.47,bz+dz*SZ],[bx+1.18*SX,.47,bz+dz*SZ],.035,steelLight);
  for(const dx of [-.93,.93])for(const dz of [-.39,.39]) {
    const wx=bx+dx*SX,wz=bz+dz*SZ;
    const wheel=cyl(.095,.052,rubber,wx,.115,wz);wheel.rotation.x=Math.PI/2;
    for(const sz of [-1,1]) {
      const hub=cyl(.034,.008,steelLight,wx,.115,wz+sz*.03);hub.rotation.x=Math.PI/2;
      box(.05,.125,.012,steel,wx,.1625,wz+sz*.04);
    }
    box(.11,.025,.092,steel,wx,.2375,wz);
    cyl(.036,.17,steel,wx,.335,wz);
  }
  for(const dx of [-.93,.93])box(.045,.045,.78*SZ-.072,steel,bx+dx*SX,.285,bz);
  for(const dz of [-.18,.18])box(1.86*SX-.045,.03,.035,steel,bx,.285,bz+dz*SZ);
  for(const dz of [-.39,.39]) {
    box(1.86*SX-.072,.028,.028,steelLight,bx,.335,bz+dz*SZ);
    box(.028,.071,.028,steelLight,bx,.3845,bz+dz*SZ);
  }
  rounded(2.36*SX,.16,.94*SZ,canvas,bx,.6,bz,.045);
  box(.014,.006,.86*SZ,dark,bx-.52*SX,.683,bz);
  rounded(.46,.076,.65*SZ,bone,bx-.77,.718,bz,.03);   // under his head (about 0.9 m from the hip)
  rounded(1.3*SX,.024,.94*SZ,canvas,bx+.34*SX,.692,bz,.008);
  for(const sz of [-1,1])box(1.24*SX,.075,.014,canvas,bx+.34*SX,.6665,bz+sz*(.47*SZ+.007));
  for(let i=0;i<9;i++)box(.85*SX,.004,.006,bone,bx+.33*SX,.706,bz+(-.36+i*.09)*SZ);
  // Tubular ends and a low side rail; the wake-up side remains clear.
  for(const dx of [-1.21,1.21]) {
    for(const dz of [-.42,.42]) {
      cyl(.024,.336,steelLight,bx+dx*SX,.688,bz+dz*SZ);
      box(.052,.048,.052,steelLight,bx+dx*SX,.88,bz+dz*SZ);
    }
    box(.036,.036,.84*SZ-.052,steelLight,bx+dx*SX,.88,bz);
  }
  for(const dx of [-.83,.83]) {
    box(.048,.025,.048,steel,bx+dx*SX,.5175,bz-.535*SZ);
    cyl(.02,.26,steel,bx+dx*SX,.66,bz-.535*SZ);
    box(.048,.048,.048,steelLight,bx+dx*SX,.814,bz-.535*SZ);
  }
  box(1.66*SX-.048,.036,.036,steelLight,bx,.814,bz-.535*SZ);
  // Under-bed supplies, fastening straps and folded dressings on the shelf rails.
  rounded(.74,.11,.47*SZ,olive,bx+.2*SX,.355,bz,.028);
  for(const dx of [-.05,.4]) {
    box(.05,.008,.47*SZ,dark,bx+dx*SX,.414,bz);
    for(const sz of [-1,1])box(.05,.118,.008,dark,bx+dx*SX,.359,bz+sz*(.235*SZ+.004));
  }
  cross(bx+.18*SX,.355,bz+.235*SZ+.007,.09,.014);

  // Lockable medical cabinet and worktop on four steel legs seated on y = 0.020 m mat.
  // CG-1 (CF-20 #1): the worktop stood at 1.17 m (a man's ribs) and 0.94 m deep; a lab bench is 0.90 m high and a base
  // unit 0.60 m deep. Same width and back line; the body is 0.715 m on its 9 cm legs, the top 0.65 m deep at 0.90 m.
  const cx=bx+2.72,cz=back+.525,wz=back+.55,top=.90,lift=top-1.1675;
  for(const dx of [-.68,.68])for(const dz of [-.22,.22])box(.08,.09,.08,steel,cx+dx,.065,cz+dz);
  rounded(1.65,.715,.60,olive,cx,.4675,cz,.035);
  box(1.78,.075,.65,steelLight,cx,top-.0375,wz);
  for(const y of [.205,.39,.575]) {
    box(1.5,.17,.016,dark,cx,y,cz+.308);
    box(1.42,.13,.018,olive,cx,y,cz+.3255);
    for(const hx of [-.22,.22])box(.022,.022,.026,steelLight,cx+hx,y+.015,cz+.347);
    rod([cx-.25,y+.015,cz+.374],[cx+.25,y+.015,cz+.374],.014,steelLight);
  }
  const faCase = rounded(.48,.24,.35,bone,cx-.5,1.2875+lift,wz,.025), faCross = cross(cx-.5,1.2875+lift,wz+.183,.15,.016);
  destructSpecs.push({ id: 'firstAidCase', kind: 'firstAid', meshes: [faCase, ...faCross] });
  const medBoxList = [];
  for(let i=0;i<3;i++) medBoxList.push([rounded(.26,.068,.23,bone,cx-.04,1.2015+lift+i*.068,wz-.16,.014)]);
  destructSpecs.push({ id: 'medBoxes', kind: 'medBoxStack', meshes: medBoxList.flat(), extraMeshes: { boxes: medBoxList }, flammable: true });
  // AG-405: Portable medical vitals monitor (512x340 crisp phosphor oscilloscope grid, dual traces & scanlines).
  const screen=texture(512,340,c=>{
    const bg=c.createRadialGradient(256,160,24,256,170,310);bg.addColorStop(0,'#0b241b');bg.addColorStop(1,'#04100c');
    c.fillStyle=bg;c.fillRect(0,0,512,340);
    c.strokeStyle='rgba(70,140,104,0.18)';c.lineWidth=1;
    for(let x=16;x<500;x+=24){c.beginPath();c.moveTo(x,18);c.lineTo(x,268);c.stroke();}
    for(let y=20;y<272;y+=24){c.beginPath();c.moveTo(16,y);c.lineTo(496,y);c.stroke();}
    // ECG QRS phosphor glow + crisp core
    const ecg=[[20,126],[112,126],[126,114],[138,126],[152,150],[166,52],[184,140],[200,126],[218,118],[236,126],[344,126],[358,114],[370,126],[384,150],[398,56],[416,140],[432,126],[492,126]];
    c.strokeStyle='rgba(110,235,165,0.28)';c.lineWidth=9;c.lineJoin='round';c.beginPath();ecg.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
    c.strokeStyle='#b8f0c8';c.lineWidth=3.2;c.beginPath();ecg.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
    // Pleth / SpO2 secondary trace
    c.strokeStyle='#58b4c4';c.lineWidth=2.4;c.beginPath();
    for(let x=20;x<=492;x+=6){const y=214-Math.max(0,Math.sin((x-20)*0.042))*24-Math.max(0,Math.sin((x-52)*0.042))*9;x===20?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();
    // Status LED bars & subtle scanlines
    for(let i=0;i<16;i++){c.fillStyle=i<11?'#7ec494':i<14?'#c8b85a':'#263d30';c.fillRect(20+i*29,288,20,16);}
    c.fillStyle='rgba(0,0,0,0.24)';for(let y=0;y<340;y+=3)c.fillRect(0,y,512,1);
    c.strokeStyle='rgba(180,220,200,0.18)';c.lineWidth=3;c.strokeRect(8,8,496,324);
  });
  if(screen){screen.anisotropy=8;screen.generateMipmaps=true;}
  const screenMat=std({map:screen,color:0xffffff,emissiveMap:screen,emissive:0xffffff,emissiveIntensity:.42,roughness:.28,metalness:.06});
  const mmStand = box(.38,.0525,.25,steel,cx+.48,1.19375+lift,wz-.08);
  const mmCase = rounded(.58,.44,.24,dark,cx+.48,1.44+lift,wz-.08,.035);
  const mmScr = box(.46,.28,.012,screenMat,cx+.48,1.48+lift,wz+.046);
  const mmKnobs = [];
  for(const dx of [-.17,0,.17]){ const k = cyl(.024,.02,bone,cx+.48+dx,1.28+lift,wz+.05); k.rotation.x=Math.PI/2; mmKnobs.push(k); }
  destructSpecs.push({ id: 'medMonitor', kind: 'monitor', meshes: [mmStand, mmCase, mmScr, ...mmKnobs], extraMeshes: { screen: [mmScr] }, wallNormal: { x: 0, z: 1 } });
  // Wall supply case, visible hinges and red cross seated flush on wall panels.
  rounded(1.55,.7,.3,olive,cx,2.08,back+.2425,.03);
  for(const dx of [-.36,.36])box(.62,.57,.02,dark,cx+dx,2.08,back+.4025);
  cross(cx-.36,2.08,back+.4205,.28,.016);
  for(const dx of [-.69,.69])for(const y of [1.9,2.26])box(.04,.09,.02,steelLight,cx+dx,y,back+.4025);
  // IV stand, hooked top, bag seams and an opaque fluid insert; tube is segmented (on y = 0.020 m mat).
  const ix=bx-1.42,iz=bz-.66;
  const ivStandMeshes = [box(.068,.055,.068,steel,ix,.095,iz)];
  for(const [sx,sz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const fx=ix+sx*.26, fz=iz+sz*.26;
    ivStandMeshes.push(cyl(.032,.024,rubber,fx,.032,fz,12));
    ivStandMeshes.push(box(.036,.036,.036,steel,fx,.062,fz));
    ivStandMeshes.push(box(sx?0.208:0.018,.012,sz?0.208:0.018,steel,ix+sx*.138,.074,iz+sz*.138));
  }
  ivStandMeshes.push(cyl(.02,1.7875,steelLight,ix,1.01625,iz));
  ivStandMeshes.push(box(.044,.028,.044,steelLight,ix,1.924,iz));
  for(const sx of [-1,1]) ivStandMeshes.push(box(.218,.018,.018,steelLight,ix+sx*.131,1.924,iz));
  destructSpecs.push({ id: 'ivStand', kind: 'ivStand', meshes: ivStandMeshes, linked: 'ivBag' });
  const bagX=ix+.22, tubeW=(bx-.92-bagX)-.022;
  const ivBagMeshes = [
    cyl(.01,.11,steelLight,bagX,1.86,iz,8),
    rounded(.17,.27,.075,bone,bagX,1.67,iz,.02),
    box(.13,.16,.01,std({color:0x91aaa0,roughness:.5}),bagX,1.64,iz+.0425),
    box(.028,.04,.028,bone,bagX,1.515,iz),
    cyl(.008,.585,rubber,bagX,1.2025,iz,8),
    box(.022,.022,.022,rubber,bagX,.899,iz),
    box(tubeW,.014,.014,rubber,(bagX+bx-.92)/2,.899,iz),
    box(.022,.022,.022,rubber,bx-.92,.899,iz),
    box(.014,.014,.258,rubber,bx-.92,.899,(iz+bz-.38)/2),
    box(.022,.022,.022,rubber,bx-.92,.899,bz-.38),
    cyl(.008,.196,rubber,bx-.92,.79,bz-.38,8),
    box(.04,.012,.04,bone,bx-.92,.686,bz-.38)
  ];
  destructSpecs.push({ id: 'ivBag', kind: 'ivBag', meshes: ivBagMeshes });
  // Closed flat-bottom oxygen bottle with hollow bands, valve, gauge and supply hose (on y = 0.020 m mat).
  // CG-1 (CF-20 #5, AH-1 #21): it was 0.28 m across on 0.79 m (a keg); a medical E cylinder is 0.11 m by 0.74 m. It now
  // stands in a small wheeled cylinder cart (base, two wheels, a handle post and a strap round it), and its hose is
  // coiled and hung on the cart's handle instead of running through the air into the stretcher's head rail.
  const ox=bx-1.49,oz=bz+.8,MT=.02,base=.069;
  for(const dz of [-.075,.075]){const w=cyl(.03,.02,rubber,ox-.07,MT+.03,oz+dz,10);w.rotation.x=Math.PI/2;}
  box(.03,.006,.17,steel,ox-.07,MT+.03,oz);                     // the wheels' axle (top 5.3 cm)
  box(.17,.016,.13,steel,ox,.061,oz);                           // base plate, resting on the axle and a front foot
  box(.03,.033,.11,rubber,ox+.07,MT+.0165,oz);
  const bottle=add(new T.LatheGeometry([
    new T.Vector2(0,0),new T.Vector2(.048,0),new T.Vector2(.058,.02),
    new T.Vector2(.058,.6),new T.Vector2(.05,.69),new T.Vector2(.034,.75),new T.Vector2(.034,.77),new T.Vector2(0,.77)
  ],16),olive,ox,base,oz);
  bottle.castShadow=true;
  const o2Body = [bottle];
  for(const y of [.18,.54]) o2Body.push(bandRing(.058,.064,.04,dark,ox,base+y,oz,16));
  const V=base+.77-.81;                                         // the valve set sits on the new neck
  const o2Valve = [
    cyl(.035,.03,steelLight,ox,.825+V,oz),
    box(.056,.05,.056,steelLight,ox,.865+V,oz),
    cyl(.03,.023,steelLight,ox,.9015+V,oz),
    box(.1,.022,.05,steel,ox,.924+V,oz)
  ];                                                            // valve key (E cylinders use a small one)
  const gStem=cyl(.012,.034,steel,ox+.045,.865+V,oz,8);gStem.rotation.z=Math.PI/2;
  const gauge=cyl(.03,.022,bone,ox+.073,.865+V,oz);gauge.rotation.x=Math.PI/2;   // a 6 cm regulator gauge
  o2Valve.push(gStem, gauge);
  // Cart handle post behind the bottle, strap ring round it, the hose coiled on a hook.
  rod([ox-.085,.061,oz],[ox-.085,1.0,oz],.012,steelLight);
  box(.034,.02,.02,steel,ox-.07,base+.45,oz);
  bandRing(.059,.066,.03,steel,ox,base+.435,oz,16);
  box(.03,.012,.012,steel,ox-.1,.92,oz);
  const coil=add(new T.TorusGeometry(.075,.009,6,18),rubber,ox-.117,.84,oz);coil.rotation.y=Math.PI/2;
  o2Valve.push(rod([ox-.028,.865+V,oz],[ox-.113,.905,oz+.025],.008,rubber));  // regulator to the coil (shears with valve)
  destructSpecs.push({ id: 'oxygenTank', kind: 'oxygen', meshes: [...o2Body, ...o2Valve], extraMeshes: { valve: o2Valve } });
  if(labels.medical) {
    box(.76,.14,.014,dark,cx,.745,cz+.307);
    sign(labels.medical,.74,.13,cx,.745,cz+.3143,0,{bg:'#25312b',color:'#d2cfb2',size:110});
  }
  return { gateLeaves, gateFrame, gateLamp: amber, worldUvMats, destructSpecs };
}
