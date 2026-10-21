import * as Coldwater from './coldwater.js';
import * as Trapper from './trapper.js';
import * as Mine from './mine-props.js';
import { text } from '../ui/strings.js';
// world/history-props.js — the valley's history in things, not words (CL-108, CL-109, D-70, docs/story.md §2, §6, §7).
// Claude's. What's left of everyone who came here: the PGB's stencils and the fall of FOB Threshold (CL-109); the
// hikers and the rangers (CL-109); Coldwater the ghost town, the old mine and the trapper (CL-108). Each builder returns
// a Group in its own frame (+z is "out", toward whoever walks up to it), made of boxes and simple solids in the game's
// style; the caller places it. Painted boards and stencils are canvases (browser only: in node they come back blank).
//
//   stencilCanvas(doc, w, h, lines, o)       a stencilled sign: lines of block capitals, spray-edged, on a ground colour
//   buildSurveyBoard(T, doc, { n, theme })   the PGB survey board at a warren cave: "SURVEY · WARREN n · THEME · DO NOT ENTER"
//   buildLockdownDoor(T, doc)                FOB Threshold's sealed door: LOCKDOWN stencil, claw marks gouged through it
//   buildMottoBand(T, doc)                   "AGAINST WHAT SHOULD NOT BE" stencilled under the parapet
//   buildCordonGate(T, doc, o)               the Cordon's steel gate, chained: "CORDON · PGB · NOTHING LEAVES"
//   buildTrailheadBoard(T, doc)              the trailhead sign with the hikers' missing-person posters
//   buildHikersCache(T)                      the hikers' packs, rope and a headlamp, left at the mine mouth
//   buildRangerTruck(T, doc)                 the rangers' pickup, its radio on the bonnet still on its last channel
//   buildBrass(T, n, rnd)                    spent cases round a fighting position
//   buildDroppedHelmet(T)                    a PGB helmet on its side
//   buildDragMarks(T, pts, groundAt)         two dark furrows along a path of points, laid on the ground
//   buildIronBelowBoards(T, doc)             the settlers' boards nailed across the old mine: IRON BELOW
//   buildMineTimbers(T, w, h)                the mine's timber set: two legs and a cap
//   buildCutBars(T, w, h, allCut)            the settlers' iron bars across the mine mouth, cut and bent aside
//   buildRuinedFoundation(T, rnd, o)         a house's stone footing, a doorway with a horseshoe over it
//   buildChimney(T, rnd)                     a stone chimney standing on its own
//   buildChurchShell(T, rnd)                 the parish church's walls, gable and empty windows, no roof
//   buildIronBandedGrave(T, rnd)             a slumped grave, the coffin's iron bands showing through the soil
//   buildOpenGrave(T, rnd)                   the grave opened from below: soil thrown out, the lid split upward
//   buildHorseshoe(T)                        one horseshoe, points up
//   buildTraps(T)                            two leghold traps
//   buildCellarHatch(T)                      the trapper's root-cellar hatch with its iron ring
import { mulberry } from './first-people.js';

export const STORY_SPOTS = Object.freeze({ WARREN_ORDER: ['root', 'shale', 'iron', 'wet', 'hill'] });

const box = (T, g, w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
};
const cyl = (T, g, rt, rb, h, mat, x, y, z, rx = 0, ry = 0, rz = 0, seg = 8) => {
  const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m;
};
const std = (T, color, rough = 0.85, metal = 0) => new T.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
const texMat = (T, canvas, fallback, rough = 0.85) => {
  if (!canvas) return std(T, fallback, rough);
  const t = new T.CanvasTexture(canvas);
  if (T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace;
  return new T.MeshStandardMaterial({ color: 0xffffff, map: t, roughness: rough });
};

// --- painted signs -----------------------------------------------------------------------------------------------
// lines: [{ text, size (px), colour?, y (0..1) }]. ground: the board's colour. o.stripe: a hazard stripe top and foot.
export function stencilCanvas(doc, w, h, lines, o = {}) {
  if (!doc || !doc.createElement) return null;
  const cv = doc.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  if (!c) return null;
  const rnd = mulberry(o.seed || 7);
  c.fillStyle = o.ground || '#b49a6a'; c.fillRect(0, 0, w, h);
  // Grain or grime.
  for (let k = 0; k < 40; k++) { c.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.05})`; c.fillRect(0, rnd() * h, w, 1 + rnd() * 3); }
  if (o.stripe) {
    const sh = h * 0.1;
    for (const y0 of [0, h - sh]) {
      c.save(); c.beginPath(); c.rect(0, y0, w, sh); c.clip();
      for (let x = -sh; x < w + sh; x += sh * 1.4) { c.fillStyle = '#d8a51e'; c.beginPath(); c.moveTo(x, y0 + sh); c.lineTo(x + sh * 0.7, y0); c.lineTo(x + sh * 1.4, y0); c.lineTo(x + sh * 0.7, y0 + sh); c.fill(); }
      c.restore();
    }
  }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const l of lines) {
    c.font = `bold ${l.size}px "Courier New", monospace`;
    const col = l.colour || '#1b1b17';
    // Overspray: a soft halo, then the letters with a few gaps (the stencil's bridges).
    c.fillStyle = col; c.globalAlpha = 0.18; c.fillText(l.text, w / 2 + 1.5, h * l.y + 1.5); c.globalAlpha = 1;
    c.fillText(l.text, w / 2, h * l.y);
    c.fillStyle = o.ground || '#b49a6a';
    for (let k = 0; k < l.text.length * 0.6; k++) c.fillRect(w / 2 - l.text.length * l.size * 0.3 + rnd() * l.text.length * l.size * 0.6, h * l.y - l.size * 0.05, 2, l.size * 0.12);
  }
  if (o.scratches) {   // claw marks: four parallel gouges, twice
    for (const [x0, y0, a] of o.scratches) {
      for (let k = 0; k < 4; k++) {
        c.strokeStyle = 'rgba(10,8,6,0.9)'; c.lineWidth = 8; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x0 + k * 18, y0); c.lineTo(x0 + k * 18 + Math.sin(a) * h * 0.55, y0 + Math.cos(a) * h * 0.55); c.stroke();
        c.strokeStyle = 'rgba(225,215,195,0.6)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x0 + k * 18 + 3, y0); c.lineTo(x0 + k * 18 + 3 + Math.sin(a) * h * 0.55, y0 + Math.cos(a) * h * 0.55); c.stroke();
      }
    }
  }
  return cv;
}

export function buildSurveyBoard(T, doc, { n, theme }) {
  const g = new T.Group(); g.name = 'survey-board:' + theme;
  const wood = std(T, 0x6b5034), steel = std(T, 0x454d45, 0.6, 0.4);
  const cv = stencilCanvas(doc, 512, 320, [
    { text: 'PGB · SURVEY', size: 46, y: 0.24 },
    { text: `WARREN ${n} · ${String(theme).toUpperCase()}`, size: 52, y: 0.5 },
    { text: 'DO NOT ENTER', size: 58, y: 0.77, colour: '#7d1a12' }
  ], { ground: '#c9b384', stripe: true, seed: n * 13 });
  const face = texMat(T, cv, 0xc9b384);
  const edge = std(T, 0xa8916a);
  const board = new T.Mesh(new T.BoxGeometry(1.25, 0.78, 0.04), [edge, edge, edge, edge, face, edge]);
  board.position.set(0, 1.45, 0); board.castShadow = true; g.add(board);
  for (const sx of [-0.5, 0.5]) box(T, g, 0.09, 1.9, 0.09, wood, sx, 0.95, -0.05);
  box(T, g, 0.06, 0.06, 0.06, steel, 0.5, 1.7, 0.03);
  box(T, g, 0.06, 0.06, 0.06, steel, -0.5, 1.7, 0.03);
  g.rotation.z = 0.03 * (n % 2 ? 1 : -1);
  return g;
}

export function buildLockdownDoor(T, doc) {
  const g = new T.Group(); g.name = 'fob-lockdown-door';
  const frame = std(T, 0x2c3036, 0.6, 0.5), rivet = std(T, 0x5a6068, 0.45, 0.6);
  const cv = stencilCanvas(doc, 384, 640, [
    { text: text('hq.designation.name'), size: 52, y: 0.19, colour: '#d9cfa8' },
    { text: text('hq.rear.lockdown'), size: 56, y: 0.5, colour: '#c43a1f' },
    { text: text('hq.rear.sealed'), size: 46, y: 0.6, colour: '#c43a1f' }
  ], { ground: '#3d434a', seed: 3, scratches: [[60, 330, 0.35], [190, 420, -0.2]] });
  const face = texMat(T, cv, 0x3d434a, 0.6);
  const slab = new T.Mesh(new T.BoxGeometry(1.5, 2.5, 0.08), [frame, frame, frame, frame, face, frame]);
  slab.position.set(0, 1.25, 0.04); slab.castShadow = true; g.add(slab);
  box(T, g, 1.75, 0.14, 0.14, frame, 0, 2.57, 0.05);
  for (const sx of [-0.82, 0.82]) box(T, g, 0.14, 2.6, 0.14, frame, sx, 1.3, 0.05);
  for (const y of [0.5, 1.25, 2.0]) for (const sx of [-0.62, 0.62]) cyl(T, g, 0.025, 0.025, 0.03, rivet, sx, y, 0.095, Math.PI / 2);
  // A bar across it, chained.
  box(T, g, 1.9, 0.12, 0.1, rivet, 0, 0.82, 0.16);
  return g;
}

export function buildMottoBand(T, doc) {
  const cv = stencilCanvas(doc, 1024, 96, [{ text: 'AGAINST WHAT SHOULD NOT BE', size: 64, y: 0.55, colour: '#d9cfa8' }], { ground: '#33383e', seed: 11 });
  const m = new T.Mesh(new T.PlaneGeometry(4.0, 0.38), cv ? new T.MeshStandardMaterial({ map: texMat(T, cv, 0x33383e).map, roughness: 0.7, transparent: false }) : std(T, 0x33383e));
  m.name = 'pgb-motto';
  return m;
}

export function buildCordonGate(T, doc, { w = 4.2, h = 4.4 } = {}) {
  const g = new T.Group(); g.name = 'cordon-gate';
  const steel = std(T, 0x4a5058, 0.55, 0.55), dark = std(T, 0x23272c, 0.6, 0.5), chain = std(T, 0x8a8f94, 0.4, 0.8);
  const cv = stencilCanvas(doc, 768, 384, [
    { text: 'CORDON', size: 110, y: 0.3, colour: '#e3d9b8' },
    { text: 'PGB', size: 70, y: 0.58, colour: '#e3d9b8' },
    { text: 'NOTHING LEAVES', size: 64, y: 0.82, colour: '#c43a1f' }
  ], { ground: '#4a5058', seed: 21 });
  const face = texMat(T, cv, 0x4a5058, 0.55);
  for (const s of [-1, 1]) {
    const leaf = new T.Mesh(new T.BoxGeometry(w / 2 - 0.05, h - 0.3, 0.12), steel);
    leaf.position.set(s * w / 4, (h - 0.3) / 2 + 0.05, 0); leaf.castShadow = true; g.add(leaf);
    for (const y of [0.6, h / 2, h - 0.8]) box(T, g, w / 2 - 0.2, 0.12, 0.05, dark, s * w / 4, y, 0.085);
  }
  // The stencil runs across both leaves, sprayed over the pair.
  {
    const p = new T.Mesh(new T.PlaneGeometry(w * 0.86, w * 0.43), face);
    p.position.set(0, h * 0.58, 0.072); g.add(p);
  }
  for (const s of [-1, 1]) box(T, g, 0.4, h + 0.4, 0.5, dark, s * (w / 2 + 0.2), (h + 0.4) / 2, 0);
  box(T, g, w + 0.8, 0.4, 0.5, dark, 0, h + 0.2, 0);
  // The chain and padlock across the meeting edge.
  for (let k = 0; k < 7; k++) { const l = new T.Mesh(new T.TorusGeometry(0.05, 0.014, 5, 10), chain); l.position.set(-0.18 + k * 0.06, 1.4 - Math.sin(k / 6 * Math.PI) * 0.12, 0.1); l.rotation.y = k % 2 ? Math.PI / 2 : 0; g.add(l); }
  box(T, g, 0.12, 0.14, 0.06, chain, 0, 1.22, 0.12);
  return g;
}

export function buildTrailheadBoard(T, doc) {
  const g = new T.Group(); g.name = 'trailhead-board';
  const wood = std(T, 0x6b5034), roof = std(T, 0x4a3a28);
  box(T, g, 1.7, 1.1, 0.06, std(T, 0x8a6e4a), 0, 1.45, 0);
  for (const sx of [-0.8, 0.8]) box(T, g, 0.1, 2.2, 0.1, wood, sx, 1.1, -0.05);
  box(T, g, 1.95, 0.06, 0.45, roof, 0, 2.15, 0.05, 0.25);
  // Three posters, weathered: MISSING, a blank where a photo was, the words under it.
  for (let k = 0; k < 3; k++) {
    const cv = (() => {
      if (!doc || !doc.createElement) return null;
      const p = doc.createElement('canvas'); p.width = 192; p.height = 256;
      const c = p.getContext('2d'); if (!c) return null;
      c.fillStyle = k === 1 ? '#e9e2c6' : '#efe9d4'; c.fillRect(0, 0, 192, 256);
      c.fillStyle = '#b3241a'; c.font = 'bold 34px Arial, sans-serif'; c.textAlign = 'center'; c.fillText('MISSING', 96, 40);
      c.fillStyle = '#9d9785'; c.fillRect(36, 56, 120, 110);   // the photo, faded to nothing
      c.fillStyle = '#c9c3ae'; c.beginPath(); c.arc(96, 98, 22, 0, Math.PI * 2); c.fill(); c.fillRect(66, 124, 60, 42);
      c.fillStyle = '#2a2a26'; c.font = 'bold 15px Arial, sans-serif';
      c.fillText(['HIKER, 24', 'HIKER, 31', 'HIKER, 27'][k], 96, 188);
      c.font = '12px Arial, sans-serif'; c.fillText('LAST SEEN: COLDWATER MINE', 96, 210); c.fillText('CALL THE RANGER STATION', 96, 228);
      c.fillStyle = 'rgba(90,70,40,0.25)'; c.fillRect(0, 230, 192, 26);
      return p;
    })();
    const m = new T.Mesh(new T.PlaneGeometry(0.42, 0.56), cv ? texMat(T, cv, 0xefe9d4, 0.95) : std(T, 0xefe9d4));
    m.position.set(-0.52 + k * 0.52, 1.45 + (k === 1 ? 0.04 : -0.02), 0.035); m.rotation.z = (k - 1) * 0.05; m.name = 'missing-poster'; g.add(m);
  }
  return g;
}

export function buildHikersCache(T, options) { return Mine.hikers(T, options); }

export function buildRangerTruck(T, doc) {
  const g = new T.Group(); g.name = 'ranger-truck';
  // GP-107: an older forestry pickup, before the PGB arrived. Same placement,
  // wheelbase and collider envelope; every detail is static and seed-independent.
  const paint=std(T,0x58684c,.8,.15), edge=std(T,0x788469,.8,.12),
    dark=std(T,0x252d28,.9), glass=std(T,0x334b50,.28,.25),
    tyre=std(T,0x202322,.95), steel=std(T,0x68716b,.62,.45),
    cream=std(T,0xc3bca1,.85), mud=std(T,0x65543e,1),
    amber=std(T,0xba792e,.42), red=std(T,0x833a2f,.5),
    canvas=std(T,0x77765a,1), rope=std(T,0xaa9470,1);
  const b=(w,h,d,m,x,y,z,rx=0,ry=0,rz=0)=>box(T,g,w,h,d,m,x,y,z,rx,ry,rz);
  const c=(r,h,m,x,y,z,rx=0,ry=0,rz=0,n=12)=>cyl(T,g,r,r,h,m,x,y,z,rx,ry,rz,n);
  const bar=(a,b,r,m)=>{
    const av=new T.Vector3(...a),bv=new T.Vector3(...b),o=c(r,av.distanceTo(bv),m,0,0,0,0,0,0,6);
    o.position.copy(av).add(bv).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return o;
  };
  // Convex side profiles, extruded across x (no extra geometry dependency).
  const profile=(points,x0,x1,m)=>{
    if(x0>x1)[x0,x1]=[x1,x0];
    if(points.reduce((a,p,i)=>{const q=points[(i+1)%points.length];return a+p[0]*q[1]-q[0]*p[1];},0)<0)points=[...points].reverse();
    const p=[],tri=(a,b,c)=>p.push(...a,...b,...c),n=points.length;
    for(let i=1;i<n-1;i++){
      tri([x0,...points[0]],[x0,...points[i+1]],[x0,...points[i]]);
      tri([x1,...points[0]],[x1,...points[i]],[x1,...points[i+1]]);
    }
    for(let i=0;i<n;i++){const j=(i+1)%n,a=[x0,...points[i]],b=[x1,...points[i]],cc=[x1,...points[j]],d=[x0,...points[j]];tri(a,cc,b);tri(a,d,cc);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.computeVertexNormals();
    const o=new T.Mesh(geo,m);o.castShadow=o.receiveShadow=true;g.add(o);return o;
  };
  b(1.28,.15,4.25,dark,0,.5,0);
  for(const z of [1.45,-1.4])c(.09,1.9,steel,0,.42,z,0,0,Math.PI/2);
  b(1.74,.16,1.5,paint,0,.74,.31); // cab floor, well clear of both wheels
  b(1.74,.12,2.05,dark,0,.91,-1.18); // lined bed
  for(const x of [-.68,-.34,0,.34,.68])b(.035,.035,1.95,steel,x,.986,-1.2);
  // Fender panels follow the top of each tyre, leaving a real open arch below.
  for(const s of [-1,1]){
    b(.12,.52,1.36,paint,s*.86,1.02,.28);
    b(.125,.065,1.32,cream,s*.868,1.18,.28);
    b(.1,.18,1.5,mud,s*.88,.69,.28);
    b(.19,.06,1.34,steel,s*.94,.59,.28);
    for(const z of [1.45,-1.4]){
      for(let i=0;i<8;i++){
        const a=i*Math.PI/8,aa=(i+1)*Math.PI/8;
        // Counterclockwise in the yz plane.
        profile([[.44+.5*Math.sin(a),z+.5*Math.cos(a)],[1.25,z+.5*Math.cos(a)],
          [1.25,z+.5*Math.cos(aa)],[.44+.5*Math.sin(aa),z+.5*Math.cos(aa)]],s*.82,s*.98,paint);
        bar([s*.992,.44+.515*Math.sin(a),z+.515*Math.cos(a)],
          [s*.992,.44+.515*Math.sin(aa),z+.515*Math.cos(aa)],.028,dark);
      }
      // GP-108: the near front tyre is gone, with its hub hanging off-axis.
      // The empty arch is readable even from the normal overhead camera.
      if(s===1&&z===1.45){
        c(.22,.10,mud,.96,.4,z,0,0,1.06);
        c(.15,.115,steel,.96,.4,z,0,0,1.06);
        c(.067,.16,dark,.96,.4,z,0,0,1.06,8);
        bar([.6,.43,z],[.85,.27,z+.07],.045,steel);
        b(.32,.17,.4,mud,.66,.12,z);
        b(.26,.15,.32,steel,.68,.275,z+.02,0,.16);
      }else{
      c(.43,.3,tyre,s*.94,.44,z,0,0,Math.PI/2,16);
      c(.27,.315,dark,s*.94,.44,z,0,0,Math.PI/2);
      c(.205,.325,steel,s*.94,.44,z,0,0,Math.PI/2);
      c(.087,.35,dark,s*.94,.44,z,0,0,Math.PI/2,8);
      for(let k=0;k<12;k++){
        const a=k*Math.PI/6;
        b(.315,.045,.14,k%4===0?mud:tyre,s*.94,.44+Math.cos(a)*.423,z+Math.sin(a)*.423,a);
      }
      for(let k=0;k<5;k++){const a=k*Math.PI*2/5;c(.018,.335,cream,s*.94,.44+Math.sin(a)*.13,z+Math.cos(a)*.13,0,0,Math.PI/2,5);}
      }
      b(.04,.29,.25,dark,s*.9,.47,z-.5); // mudflap
    }
    b(.16,.51,.38,paint,s*.9,1,-2.08);
    b(.16,.51,.28,paint,s*.9,1,2.08);
    b(.16,.27,.61,paint,s*.9,1.1,-.59);
    b(.18,.055,2.07,edge,s*.9,1.285,-1.22);
    b(.025,.055,1.95,cream,s*.987,1.19,-1.23);
    // Seams, handles and mirror stalks give the doors a readable scale.
    b(.02,.47,.016,dark,s*.928,1.02,-.32);
    b(.055,.035,.17,dark,s*.952,1.18,-.17);
    bar([s*.89,1.42,.88],[s*1.12,1.4,.95],.027,steel);
    b(.08,.19,.19,dark,s*1.14,1.48,.93);
    b(.012,.14,.14,steel,s*1.187,1.48,.93);
  }
  // Broad shoulder, inset windows, sloping screen and a thin cream roof.
  profile([[1.25,-.39],[1.92,-.31],[1.92,.58],[1.28,1.05]],-.86,.86,paint);
  for(const s of [-1,1]){
    profile([[1.36,-.28],[1.82,-.22],[1.82,.51],[1.36,.86]],s*.865,s*.871,glass);
    bar([s*.88,1.35,.67],[s*.88,1.82,.39],.021,steel);
    b(.045,.045,1.17,edge,s*.89,1.31,.26);
  }
  b(1.51,.7,.025,glass,0,1.6,.836,-.633);
  // A star crack through the screen; the wreck has been here a while.
  const crack=(a,b)=>bar([a[0],a[1],.85-(a[1]-1.6)*.734],[b[0],b[1],.85-(b[1]-1.6)*.734],.007,steel);
  for(const end of [[-.71,1.84],[-.1,1.84],[-.02,1.55],[-.17,1.33],[-.69,1.35]])crack([-.43,1.6],end);
  crack([-.26,1.68],[.07,1.77]);crack([-.26,1.49],[.18,1.43]);
  for(const x of [-.4,.4])bar([x-.18,1.34,1.005],[x+.12,1.47,.918],.015,dark);
  b(1.39,.36,.023,glass,0,1.61,-.361,.12);
  b(1.82,.075,1.12,cream,0,1.93,.13);
  for(const x of [-.72,.72])b(.025,.025,.92,edge,x,1.979,.13);
  // Bonnet bent open over a gutted, cold engine compartment. No complete
  // engine or working battery suggests a vehicle waiting to be unlocked.
  b(1.5,.055,1.03,dark,0,.65,1.61);
  b(1.51,.48,.065,dark,0,.91,1.075);
  for(const x of [-.77,.77])b(.055,.4,1.03,dark,x,.87,1.62);
  b(1.73,.07,.27,paint,0,1.175,2.11); // remaining front lip carries the radio
  b(1.4,.32,.055,dark,0,.87,2.06); // dead radiator
  for(const x of [-.59,-.39,-.19,.01,.21,.41,.61])b(.025,.28,.02,steel,x,.87,2.023);
  for(const x of [-.36,.36]){
    b(.12,.1,.6,mud,x,.73,1.58); // empty engine mounts
    bar([x,.82,1.18],[x*.8,.73,1.44],.026,dark);
    bar([x*.8,.73,1.44],[x*.7,.85,1.65],.026,dark);
  }
  const bonnet=new T.Group();bonnet.position.set(0,1.26,1.02);bonnet.rotation.set(-1.02,.035,.055);bonnet.name='ranger-broken-bonnet';g.add(bonnet);
  const hoodPart=(w,h,d,m,x,y,z,rx=0)=>{const o=b(w,h,d,m,x,y,z,rx);bonnet.add(o);};
  hoodPart(1.67,.055,.94,paint,0,0,.47);
  hoodPart(1.67,.055,.27,mud,0,.04,1.05,.3);
  hoodPart(1.33,.017,.76,dark,0,-.038,.48);
  for(const x of [-.62,.62])hoodPart(.04,.04,.89,steel,x,-.058,.46);
  for(const z of [.17,.75])hoodPart(1.27,.04,.035,steel,0,-.058,z);
  bar([-.67,1.23,1.78],[-.67,2.08,1.48],.018,steel);
  // Recessed grille, paired sealed-beam headlamps and amber indicator lenses.
  b(1.74,.32,.12,paint,0,.97,2.21);
  b(1.08,.23,.035,dark,0,.99,2.28);
  for(const y of [.91,.98,1.05])b(1.02,.018,.024,steel,0,y,2.305);
  for(const s of [-1,1]){
    b(.27,.24,.075,dark,s*.7,1.005,2.27);
    if(s===-1)c(.094,.055,cream,s*.7,1.01,2.32,Math.PI/2,0,0,12);
    else {c(.091,.025,mud,s*.7,1.01,2.315,Math.PI/2);bar([.65,.96,2.337],[.74,1.06,2.337],.012,steel);}
    b(.16,.055,.04,amber,s*.72,.835,2.29);
    b(.07,.25,.03,red,s*.85,1.045,-2.294);
    b(.075,.055,.035,cream,s*.85,.96,-2.3);
    b(.055,.085,.22,steel,s*.51,.7,2.27);
    b(.2,.09,.15,dark,s*.75,.7,2.29);
  }
  b(1.99,.13,.2,steel,0,.73,2.29);b(1.96,.12,.17,steel,0,.72,-2.3);
  b(.24,.075,.12,dark,0,.61,-2.28);
  b(1.66,.39,.09,paint,0,1.09,-2.25);
  b(1.51,.22,.014,edge,0,1.08,-2.302);
  b(.23,.04,.025,dark,0,1.205,-2.32);
  for(const x of [-.58,.58])b(.16,.035,.028,steel,x,.897,-2.311);
  // Low amber recovery lightbar, switched off, not an active emergency beacon.
  b(1.12,.045,.24,dark,0,2.002,.17);
  for(const x of [-.43,.43])b(.24,.105,.22,amber,x,2.07,.17);
  b(.52,.08,.19,cream,0,2.057,.17);
  // A stowed canvas stretcher and rescue bags make the bed useful, not empty.
  b(.56,.12,1.35,canvas,-.34,1.07,-1.23);
  for(const x of [-.65,-.03])bar([x,1.14,-2.01],[x,1.14,-.42],.03,steel);
  for(const z of [-1.72,-.76])b(.61,.018,.07,dark,-.34,1.14,z);
  b(.49,.36,.65,amber,.43,1.18,-.78);
  b(.5,.065,.67,canvas,.43,1.386,-.78);
  b(.065,.39,.67,dark,.43,1.19,-.78);
  b(.4,.27,.57,canvas,.45,1.135,-1.74);
  for(const z of [-1.92,-1.57])b(.42,.03,.05,dark,.45,1.282,z);
  for(let k=0;k<3;k++){
    const o=new T.Mesh(new T.TorusGeometry(.15-k*.025,.014,4,14),rope);o.rotation.x=Math.PI/2;o.position.set(.45,1.43+k*.01,-.78);g.add(o);
  }
  // Deterministic mud freckles and rubbed paint; no new use of the world RNG.
  for(const s of [-1,1])for(let k=0;k<15;k++){
    const z=-2.12+k*.295,y=.99+Math.sin(k*4.8)*.1;
    b(.013,.022+(k%3)*.012,.05+(k%4)*.025,k%4?mud:cream,s*.989,y,z,0,0,.1);
  }
  // Forestry insignia carries no invented lore or new player-facing copy.
  if(doc){
    const cv=doc.createElement('canvas');cv.width=256;cv.height=256;const ctx=cv.getContext('2d');
    if(ctx){
      ctx.fillStyle='#c3bca1';ctx.beginPath();ctx.moveTo(43,28);ctx.lineTo(213,28);ctx.lineTo(202,164);ctx.quadraticCurveTo(186,200,128,228);ctx.quadraticCurveTo(70,200,54,164);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#58684c';ctx.lineWidth=8;ctx.stroke();ctx.fillStyle='#354633';
      for(const x of [95,153]){ctx.fillRect(x-5,105,10,79);for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x,55+i*29);ctx.lineTo(x-27-i*5,110+i*27);ctx.lineTo(x+27+i*5,110+i*27);ctx.closePath();ctx.fill();}}
      const badge=texMat(T,cv,0xc3bca1);badge.transparent=true;
      for(const s of [-1,1]){const d=new T.Mesh(new T.PlaneGeometry(.28,.29),badge);d.position.set(s*.931,1.005,.3);d.rotation.y=s*Math.PI/2;g.add(d);}
    }
  }
  // The radio on the remaining bonnet lip, still on its last channel.
  const radio = new T.Group(); radio.name = 'ranger-radio'; radio.position.set(-.3, 1.212, 2.1); radio.rotation.y = 0.15; g.add(radio);
  box(T, radio, 0.34, 0.16, 0.24, std(T, 0x2b2e2a), 0, 0.08, 0);
  const lcd = new T.Mesh(new T.PlaneGeometry(0.12, 0.05), new T.MeshBasicMaterial({ color: 0x6dff8a, toneMapped: false })); lcd.position.set(0, 0.11, 0.121); radio.add(lcd);
  box(T, radio, 0.06, 0.12, 0.04, std(T, 0x1b1b1b), 0.22, 0.02, 0.1, 0, 0, 0.4);
  cyl(T,radio,.006,.006,.3,dark,-.12,.28,-.07);
  // Batch opaque static detail by material, keeping the named radio accessible.
  // Bake the broken bonnet into the same batches; it has no animation or action.
  bonnet.updateMatrix();
  for(const o of [...bonnet.children]){o.applyMatrix4(bonnet.matrix);g.add(o);}g.remove(bonnet);
  const batches=new Map();
  for(const o of [...g.children])if(o.isMesh&&!o.material.transparent){
    o.updateMatrix();const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrix);
    let batch=batches.get(o.material);if(!batch)batches.set(o.material,batch={p:[],n:[]});
    batch.p.push(...geo.attributes.position.array);batch.n.push(...geo.attributes.normal.array);
    geo.dispose();o.geometry.dispose();g.remove(o);
  }
  for(const [m,{p,n}] of batches){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('normal',new T.Float32BufferAttribute(n,3));const o=new T.Mesh(geo,m);o.castShadow=o.receiveShadow=true;g.add(o);}
  return g;
}

export function buildBrass(T, n = 30, rnd = Math.random, spread = 1.4) {
  const g = new T.Group(); g.name = 'brass';
  const brass = std(T, 0xc39a45, 0.35, 0.85);
  for (let k = 0; k < n; k++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * spread;
    const m = new T.Mesh(new T.CylinderGeometry(0.007, 0.007, 0.045, 5), brass);
    m.position.set(Math.cos(a) * r, 0.008, Math.sin(a) * r); m.rotation.set(Math.PI / 2, 0, rnd() * Math.PI * 2); g.add(m);
  }
  return g;
}

export function buildDroppedHelmet(T) {
  const g = new T.Group(); g.name = 'dropped-helmet';
  const m = std(T, 0x3f4430, 0.7, 0.15);
  const shell = new T.Mesh(new T.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m);
  shell.rotation.set(1.9, 0, 0.3); shell.position.y = 0.12; shell.castShadow = true; g.add(shell);
  box(T, g, 0.25, 0.015, 0.04, std(T, 0x2a2a22), 0.08, 0.02, 0.15, 0, 0.6, 0);
  return g;
}

// Two furrows a hand's width apart, following pts ([{ x, z }], world) with groundAt(x, z): heels dragged to a cave.
export function buildDragMarks(T, pts, groundAt) {
  const pos = [], idx = [];
  for (const off of [-0.18, 0.18]) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L, hw = 0.06 * (1 - i / pts.length * 0.5);
      const base = pos.length / 3;
      for (const [p, s] of [[a, -1], [a, 1], [b, 1], [b, -1]]) { const x = p.x + nx * (off + s * hw), z = p.z + nz * (off + s * hw); pos.push(x, groundAt(x, z) + 0.025, z); }
      idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0x261d14, roughness: 1, transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.name = 'drag-marks'; m.renderOrder = 2; m.receiveShadow = true;
  return m;
}

export function buildIronBelowBoards(T, doc) {
  const cv = stencilCanvas(doc, 512, 160, [{ text: 'IRON BELOW', size: 72, y: 0.55, colour: '#d4c6a6' }], { ground: '#5a4430', seed: 41 });
  return Mine.boards(T, texMat(T, cv, 0x5a4430, 0.95));
}

export function buildMineTimbers(T, w = 3.2, h = 3.0) {
  return Mine.timbers(T, w, h);
}

export function buildCutBars(T, w = 3.0, h = 2.9, allCut = false) {   // allCut: every bar cut (nothing left across the way)
  return Mine.bars(T, w, h, allCut);
}

export function buildHorseshoe(T) {
  const m = new T.Mesh(new T.TorusGeometry(0.07, 0.015, 5, 12, Math.PI * 1.3), std(T, 0x5b5650, 0.6, 0.6));
  m.rotation.z = -Math.PI * 0.15 + Math.PI;   // points up (luck held in)
  m.name = 'horseshoe';
  return m;
}

// Preserve the caller's exact legacy RNG consumption: later history positions/yaws
// depend on this stream. New art gets independent seeded variation.
function coldwaterDice(rnd, kind, w = 6, d = 5, door = true) {
  let seed = 0xC01D; const draw = () => { const v = rnd(); seed = Math.imul(seed ^ Math.floor(v * 4294967296), 16777619) >>> 0; return v; };
  if (kind === 'foundation') {
    for (const [L, gap] of [[w, false], [d, false], [w, door], [d, false]]) {
      const n = Math.max(2, Math.round(L / 0.8));
      for (let k = 0; k < n; k++) { if (gap && Math.abs((k + 0.5) / n - 0.5) < 0.12) continue; draw(); draw(); draw(); }
    }
    for (let k = 0; k < 12; k++) draw();
  } else if (kind === 'church') {
    for (let k = 0; k < 14; k++) { if (draw() < 0.3) draw(); } draw(); draw();
  } else if (kind === 'chimney') { for (let k = 0; k < 12; k++) draw(); }
  else if (kind === 'open') { for (let k = 0; k < 27; k++) draw(); }
  return seed;
}
export function buildRuinedFoundation(T, rnd, { w = 6, d = 5, door = true, variant } = {}) {
  return Coldwater.foundation(T, coldwaterDice(rnd, 'foundation', w, d, door), { w, d, door, variant });
}
export function buildChimney(T, rnd) { return Coldwater.chimney(T, coldwaterDice(rnd, 'chimney')); }
export function buildChurchShell(T, rnd) { return Coldwater.church(T, coldwaterDice(rnd, 'church')); }
export function buildIronBandedGrave(T, rnd) { return Coldwater.grave(T, 0xC01D, false); }
export function buildOpenGrave(T, rnd) { return Coldwater.grave(T, coldwaterDice(rnd, 'open'), true); }

export function buildTraps(T) {
  const g = new T.Group(); g.name = 'leghold-traps';
  const iron = std(T, 0x4a4540, 0.55, 0.6), chain = std(T, 0x6b665e, 0.5, 0.7);
  for (let k = 0; k < 2; k++) {
    const t = new T.Group(); t.position.set(k * 0.6, 0, k * 0.25); t.rotation.y = k * 0.9; g.add(t);
    box(T, t, 0.04, 0.02, 0.32, iron, 0, 0.01, 0);
    for (const s of [-1, 1]) { const jaw = new T.Mesh(new T.TorusGeometry(0.12, 0.012, 4, 12, Math.PI), iron); jaw.rotation.set(s * 0.25, Math.PI / 2, 0); jaw.position.y = 0.012; t.add(jaw); }
    for (let c = 0; c < 4; c++) { const l = new T.Mesh(new T.TorusGeometry(0.025, 0.006, 4, 8), chain); l.position.set(0.05 + c * 0.04, 0.01, 0.17 + c * 0.02); l.rotation.x = Math.PI / 2; t.add(l); }
  }
  return g;
}

export function buildCellarHatch(T) {
  return Trapper.cellar(T);
}
