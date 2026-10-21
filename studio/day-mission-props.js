// studio/day-mission-props.js - GB-199: the props of Grokbot's two day missions (D-82), modelled to real references.
//   Hikers' first-aid kit (GB-196): a khaki canvas first-aid bag with a white patch and a red cross, a hanging loop,
//   grab handle, front pocket and compression straps; a frayed rope end; a bough that fits any tree; snag dressing
//   (rocks and bleached driftwood) for the pool where the bag catches.
//   Fuel depot (GB-197): a hand-crank fuel pump on a plinth (red cabinet, dial face, hose and nozzle, globe); a NATO
//   pattern jerrycan (three handles, X-stamped sides, spout with its cam lever); an open-frame generator for the HQ; a
//   fuel drip decal with a rainbow sheen.
// Each maker returns a THREE.Group in its own local frame (ground y = 0 unless said); index.html merges each by
// material (mergeStaticKeepUV) so a prop costs a handful of draws. Canvas textures only: no image files to load.

const canvasTex = (THREE, w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); if (x) draw(x, w, h);
  const t = new THREE.CanvasTexture(c); if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
const std = (THREE, color, roughness = 0.8, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const box = (THREE, w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const cyl = (THREE, rt, rb, h, mat, seg = 10, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); return m; };
// A rod from a to b (local points).
const rod = (THREE, a, b, r, mat, seg = 6, r2 = r) => {
  const v = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z), l = v.length() || 1e-3;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, l, seg), mat);
  m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  return m;
};
// Faceted look without flatShading (the WebGPU node build would not take it here): split the faces and give each its
// own normal.
const facet = (geo) => { const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); return g; };
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

// --- Shared materials (one set per page) ---
let M = null;
function mats(THREE) {
  if (M) return M;
  const canvasWeave = canvasTex(THREE, 128, 128, (x, w, h) => {
    x.fillStyle = '#8a7d55'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < h; i += 2) { x.fillStyle = i % 4 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)'; x.fillRect(0, i, w, 1); }
    for (let i = 0; i < w; i += 2) { x.fillStyle = i % 4 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)'; x.fillRect(i, 0, 1, h); }
    const r = rng(7); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(40,30,15,${0.05 + r() * 0.08})`; x.beginPath(); x.arc(r() * w, r() * h, 2 + r() * 8, 0, 6.3); x.fill(); }
  });
  canvasWeave.wrapS = canvasWeave.wrapT = THREE.RepeatWrapping;
  const crossPatch = canvasTex(THREE, 128, 128, (x, w, h) => {
    x.fillStyle = '#ece8dc'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#b9b2a0'; x.lineWidth = 4; x.strokeRect(4, 4, w - 8, h - 8);
    x.fillStyle = '#c4161c'; const a = w * 0.2, b = w * 0.6; x.fillRect((w - a) / 2, (h - b) / 2, a, b); x.fillRect((w - b) / 2, (h - a) / 2, b, a);
    x.strokeStyle = 'rgba(80,60,40,0.35)'; x.setLineDash([3, 3]); x.lineWidth = 2; x.strokeRect(9, 9, w - 18, h - 18);
  });
  const pumpFace = canvasTex(THREE, 128, 192, (x, w, h) => {
    x.fillStyle = '#f1ede2'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#1d1d1d'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.fillText('DIESEL', w / 2, 30);
    x.beginPath(); x.arc(w / 2, 92, 42, 0, 6.3); x.fillStyle = '#fbfaf5'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#222'; x.stroke();
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.8 + i * 0.14); x.beginPath(); x.moveTo(w / 2 + Math.cos(a) * 34, 92 + Math.sin(a) * 34); x.lineTo(w / 2 + Math.cos(a) * 40, 92 + Math.sin(a) * 40); x.lineWidth = 2; x.stroke(); }
    x.beginPath(); x.moveTo(w / 2, 92); x.lineTo(w / 2 + 26, 70); x.strokeStyle = '#c4161c'; x.lineWidth = 3; x.stroke();
    x.fillStyle = '#111'; x.fillRect(18, 146, w - 36, 28); x.fillStyle = '#e8a33a'; x.font = 'bold 20px monospace'; x.fillText('0 0 4 2 7', w / 2, 168);
  });
  const genPanel = canvasTex(THREE, 128, 64, (x, w, h) => {
    x.fillStyle = '#2b2b2b'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#d9d4c4'; x.font = 'bold 11px sans-serif'; x.fillText('230V  50Hz  5.5kVA', 8, 14);
    for (const cx of [26, 64]) { x.beginPath(); x.arc(cx, 40, 13, 0, 6.3); x.fillStyle = '#111'; x.fill(); x.fillStyle = '#555'; x.fillRect(cx - 5, 36, 3, 8); x.fillRect(cx + 2, 36, 3, 8); }
    x.fillStyle = '#c4161c'; x.fillRect(92, 28, 24, 24); x.fillStyle = '#fff'; x.font = 'bold 9px sans-serif'; x.fillText('OFF', 96, 44);
  });
  const drip = canvasTex(THREE, 64, 64, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(18,14,10,0.95)'); g.addColorStop(0.45, 'rgba(30,24,20,0.85)'); g.addColorStop(0.62, 'rgba(90,60,140,0.45)');
    g.addColorStop(0.72, 'rgba(60,140,120,0.35)'); g.addColorStop(0.82, 'rgba(170,140,60,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(w / 2, h / 2, w / 2, 0, 6.3); x.fill();
  });
  M = {
    canvas: std(THREE, 0xffffff, 0.92, 0, { map: canvasWeave }), cross: std(THREE, 0xffffff, 0.85, 0, { map: crossPatch }),
    webbing: std(THREE, 0x2c2a22, 0.9), buckle: std(THREE, 0x161616, 0.5, 0.2), zip: std(THREE, 0x3a3a3a, 0.4, 0.6),
    rope: std(THREE, 0xcdb98a, 0.95), fray: std(THREE, 0xe2d4ac, 1),
    bark: std(THREE, 0x4e3b2a, 1), barkDark: std(THREE, 0x3a2c20, 1), leaf: std(THREE, 0x3f6b2e, 0.9),
    rock: std(THREE, 0x77746c, 0.95), rockDark: std(THREE, 0x5a5850, 0.95), drift: std(THREE, 0xb7ab95, 0.95),
    pumpRed: std(THREE, 0xb3221a, 0.55, 0.15), pumpFace: std(THREE, 0xffffff, 0.6, 0, { map: pumpFace }), steel: std(THREE, 0x8d9196, 0.35, 0.8),
    dark: std(THREE, 0x1c1c1c, 0.7, 0.1), hose: std(THREE, 0x151515, 0.75), concrete: std(THREE, 0x9c978c, 0.95), glass: std(THREE, 0xf5f1e0, 0.2, 0, { emissive: 0x332a10 }),
    olive: std(THREE, 0x4b5323, 0.6, 0.25), oliveDark: std(THREE, 0x3a4019, 0.6, 0.25),
    genFrame: std(THREE, 0xd8a420, 0.5, 0.3), genEngine: std(THREE, 0x50545a, 0.55, 0.5), genTank: std(THREE, 0xb3221a, 0.45, 0.2), genPanel: std(THREE, 0xffffff, 0.6, 0, { map: genPanel }),
    drip: new THREE.MeshBasicMaterial({ map: drip, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
  };
  return M;
}

// --- Hikers' kit ---
// The bag: centre at the origin, the hanging loop's top at y = +0.30 (where the rope ties), about 0.46 tall.
export function makeHikersBag({ THREE }) {
  const m = mats(THREE), g = new THREE.Group(); g.name = 'hikers-bag';
  const body = box(THREE, 0.36, 0.42, 0.2, m.canvas, 0, -0.02, 0); g.add(body);
  const roll = cyl(THREE, 0.1, 0.1, 0.36, m.canvas, 12, 0, 0.19, 0); roll.rotation.z = Math.PI / 2; roll.scale.set(1, 1, 1); g.add(roll);   // the rounded top
  g.add(box(THREE, 0.3, 0.2, 0.06, m.canvas, 0, -0.1, 0.12));                      // front pocket
  g.add(box(THREE, 0.15, 0.15, 0.005, m.cross, 0, -0.08, 0.153));                    // the white patch, red cross
  const back = box(THREE, 0.15, 0.15, 0.005, m.cross, 0, -0.02, -0.103); back.rotation.y = Math.PI; g.add(back);
  g.add(box(THREE, 0.34, 0.008, 0.012, m.zip, 0, 0.11, 0.1));                        // the zip
  for (const sx of [-0.19, 0.19]) { g.add(box(THREE, 0.012, 0.36, 0.21, m.webbing, sx, -0.03, 0)); g.add(box(THREE, 0.016, 0.04, 0.05, m.buckle, sx * 1.04, 0.05, 0.08)); }
  for (const sz of [-0.07, 0.07]) g.add(box(THREE, 0.37, 0.02, 0.01, m.webbing, 0, -0.18, sz < 0 ? -0.103 : 0.155));
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), m.webbing); loop.position.set(0, 0.26, 0); g.add(loop);   // the hanging loop
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 6, 12, Math.PI), m.webbing); handle.position.set(0, 0.26, 0); handle.rotation.y = Math.PI / 2; g.add(handle);
  return g;
}
// A frayed rope end: strands splayed out of the cut, pointing along +y from the origin (the cut).
export function makeFrayedEnd({ THREE }) {
  const m = mats(THREE), g = new THREE.Group(); g.name = 'rope-fray'; const r = rng(31);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r() * 0.5, s = 0.012 + r() * 0.02, l = 0.05 + r() * 0.05;
    g.add(rod(THREE, { x: 0, y: 0, z: 0 }, { x: Math.cos(a) * s, y: l, z: Math.sin(a) * s }, 0.004, m.fray, 4, 0.0015));
  }
  return g;
}
export function ropeMaterial(THREE) { return mats(THREE).rope; }
// A bough: from the trunk (origin) out along +x for len, rising a little, tapering; side twigs and leaf clumps.
export function makeBough({ THREE, len = 3, r0 = 0.13 }) {
  const m = mats(THREE), g = new THREE.Group(); g.name = 'hikers-bough'; const r = rng(11);
  const pts = [{ x: 0, y: -0.25, z: 0 }, { x: len * 0.45, y: -0.05, z: 0.05 }, { x: len + 0.4, y: 0.08, z: -0.02 }];
  g.add(rod(THREE, pts[0], pts[1], r0, m.bark, 8, r0 * 0.72));
  g.add(rod(THREE, pts[1], pts[2], r0 * 0.72, m.bark, 8, r0 * 0.32));
  for (let i = 0; i < 4; i++) {
    const t = 0.25 + i * 0.2, b = { x: len * t, y: -0.15 + t * 0.2, z: 0 }, s = i % 2 ? 1 : -1;
    const e = { x: b.x + 0.5 + r() * 0.4, y: b.y + 0.35 + r() * 0.3, z: s * (0.45 + r() * 0.3) };
    g.add(rod(THREE, b, e, r0 * 0.3, m.barkDark, 5, r0 * 0.12));
    const leaf = new THREE.Mesh(facet(new THREE.IcosahedronGeometry(0.32 + r() * 0.18, 0)), m.leaf); leaf.position.set(e.x, e.y + 0.1, e.z); leaf.scale.set(1.2, 0.7, 1); g.add(leaf);
  }
  const tip = new THREE.Mesh(facet(new THREE.IcosahedronGeometry(0.4, 0)), m.leaf); tip.position.set(len + 0.55, 0.3, 0.1); tip.scale.set(1.3, 0.7, 1.1); g.add(tip);
  return g;
}
// Snag dressing: rocks and a jam of bleached driftwood round the origin (the water line at y = 0).
export function makeSnag({ THREE }) {
  const m = mats(THREE), g = new THREE.Group(); g.name = 'hikers-snag'; const r = rng(5);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + r() * 0.4, d = 0.7 + r() * 0.8, s = 0.25 + r() * 0.35;
    const k = new THREE.Mesh(facet(new THREE.DodecahedronGeometry(s, 0)), i % 2 ? m.rock : m.rockDark);
    k.position.set(Math.cos(a) * d, -s * 0.35, Math.sin(a) * d); k.scale.set(1.3, 0.7, 1); k.rotation.set(r() * 3, r() * 3, r() * 3); g.add(k);
  }
  for (let i = 0; i < 4; i++) {
    const a = r() * 6.3, l = 1 + r() * 1.2, c = { x: Math.cos(a) * 0.4, z: Math.sin(a) * 0.4 }, d = { x: Math.cos(a + 1.6), z: Math.sin(a + 1.6) };
    g.add(rod(THREE, { x: c.x - d.x * l / 2, y: 0.02, z: c.z - d.z * l / 2 }, { x: c.x + d.x * l / 2, y: 0.08 + r() * 0.1, z: c.z + d.z * l / 2 }, 0.05 + r() * 0.03, m.drift, 6, 0.03));
  }
  return g;
}

// --- Fuel depot ---
// The pump: on the ground at the origin, the face toward +z; about 1.75 m tall.
export function makeFuelPump({ THREE }) {
  const m = mats(THREE), g = new THREE.Group(); g.name = 'fuel-pump';
  g.add(box(THREE, 0.9, 0.16, 0.7, m.concrete, 0, 0.08, 0));                               // the plinth
  g.add(box(THREE, 0.56, 1.2, 0.42, m.pumpRed, 0, 0.76, 0));                               // the cabinet
  const cap = cyl(THREE, 0.21, 0.21, 0.56, m.pumpRed, 14, 0, 1.36, 0); cap.rotation.z = Math.PI / 2; cap.scale.set(1, 1, 1); g.add(cap);   // the rounded top
  g.add(box(THREE, 0.4, 0.6, 0.01, m.pumpFace, 0, 0.98, 0.215));                           // dial face
  g.add(box(THREE, 0.44, 0.64, 0.012, m.steel, 0, 0.98, 0.209));                           // its bezel
  g.add(box(THREE, 0.58, 0.04, 0.44, m.steel, 0, 0.18, 0));                                // kick plate
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), m.glass); globe.position.set(0, 1.68, 0); g.add(globe);
  g.add(cyl(THREE, 0.08, 0.1, 0.08, m.steel, 12, 0, 1.55, 0));
  // Hand crank on the right side.
  const hub = cyl(THREE, 0.05, 0.05, 0.06, m.steel, 10, 0.31, 0.9, 0); hub.rotation.z = Math.PI / 2; g.add(hub);
  g.add(rod(THREE, { x: 0.33, y: 0.9, z: 0 }, { x: 0.36, y: 0.72, z: 0.05 }, 0.015, m.steel));
  g.add(rod(THREE, { x: 0.36, y: 0.72, z: 0.05 }, { x: 0.46, y: 0.72, z: 0.05 }, 0.02, m.dark));
  // The hose: out of the left side, a loop down and up to the nozzle on its holster.
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.28, 1.05, 0.05), new THREE.Vector3(-0.42, 0.75, 0.12), new THREE.Vector3(-0.4, 0.32, 0.22),
    new THREE.Vector3(-0.33, 0.45, 0.3), new THREE.Vector3(-0.3, 0.8, 0.26)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.022, 6), m.hose));
  g.add(box(THREE, 0.06, 0.1, 0.12, m.steel, -0.3, 0.85, 0.24));                           // holster
  g.add(rod(THREE, { x: -0.3, y: 0.8, z: 0.26 }, { x: -0.3, y: 0.9, z: 0.36 }, 0.025, m.dark));   // nozzle grip
  g.add(rod(THREE, { x: -0.3, y: 0.9, z: 0.36 }, { x: -0.3, y: 0.82, z: 0.48 }, 0.012, m.steel));   // spout
  return g;
}
// The NATO jerrycan: standing at the origin, 0.47 tall, 0.345 long (x), 0.165 thick (z); handles on top.
export function makeJerrycan({ THREE }) {
  const m = mats(THREE), g = new THREE.Group(); g.name = 'jerrycan';
  const H = 0.43, L = 0.345, T = 0.165;
  g.add(box(THREE, L, H, T, m.olive, 0, H / 2, 0));
  g.add(box(THREE, L + 0.012, 0.018, T + 0.012, m.oliveDark, 0, H, 0));                    // the welded seam at the top
  g.add(box(THREE, L + 0.012, 0.012, T + 0.012, m.oliveDark, 0, 0.006, 0));
  g.add(box(THREE, 0.012, H, T + 0.012, m.oliveDark, -L / 2, H / 2, 0));
  g.add(box(THREE, 0.012, H, T + 0.012, m.oliveDark, L / 2, H / 2, 0));
  // The X stamped into each broad side (raised ribs), with the rim round it.
  const ang = Math.atan2(H * 0.8, L * 0.8), len = Math.hypot(H * 0.8, L * 0.8);
  for (const s of [-1, 1]) {
    for (const a of [ang, -ang]) { const x = box(THREE, len, 0.022, 0.008, m.oliveDark, 0, H / 2, s * (T / 2 + 0.003)); x.rotation.z = a; g.add(x); }
    g.add(box(THREE, L * 0.86, 0.012, 0.008, m.oliveDark, 0, H * 0.92, s * (T / 2 + 0.003)));
    g.add(box(THREE, L * 0.86, 0.012, 0.008, m.oliveDark, 0, H * 0.08, s * (T / 2 + 0.003)));
  }
  // Three handles across the top.
  for (const hx of [-0.1, 0, 0.1]) {
    g.add(box(THREE, 0.026, 0.012, T * 0.8, m.oliveDark, hx, H + 0.06, 0));
    g.add(box(THREE, 0.026, 0.06, 0.012, m.oliveDark, hx, H + 0.03, T * 0.36));
    g.add(box(THREE, 0.026, 0.06, 0.012, m.oliveDark, hx, H + 0.03, -T * 0.36));
  }
  // The spout at the front corner: neck, cap and its cam lever.
  const neck = cyl(THREE, 0.026, 0.03, 0.04, m.oliveDark, 10, -L / 2 + 0.05, H + 0.02, 0); neck.rotation.z = 0.5; g.add(neck);
  const capM = cyl(THREE, 0.034, 0.034, 0.025, m.olive, 12, -L / 2 + 0.035, H + 0.045, 0); capM.rotation.z = 0.5; g.add(capM);
  g.add(rod(THREE, { x: -L / 2 + 0.06, y: H + 0.06, z: 0 }, { x: -L / 2 + 0.13, y: H + 0.035, z: 0 }, 0.007, m.steel));
  return g;
}
// The generator: open frame on the ground at the origin, the panel toward +z; about 0.75 m tall, 0.9 long.
export function makeGenerator({ THREE }) {
  const m = mats(THREE), g = new THREE.Group(); g.name = 'hq-generator';
  const L = 0.9, W = 0.6, Ht = 0.62, r = 0.022;
  const c = (x, y, z) => ({ x, y, z });
  for (const sx of [-L / 2, L / 2]) for (const sz of [-W / 2, W / 2]) g.add(rod(THREE, c(sx, 0, sz), c(sx, Ht, sz), r, m.genFrame));
  for (const y of [0.02, Ht]) for (const sz of [-W / 2, W / 2]) g.add(rod(THREE, c(-L / 2, y, sz), c(L / 2, y, sz), r, m.genFrame));
  for (const y of [0.02, Ht]) for (const sx of [-L / 2, L / 2]) g.add(rod(THREE, c(sx, y, -W / 2), c(sx, y, W / 2), r, m.genFrame));
  g.add(box(THREE, 0.4, 0.34, 0.36, m.genEngine, -0.12, 0.22, 0));                        // engine
  const alt = cyl(THREE, 0.15, 0.15, 0.32, m.genEngine, 14, 0.22, 0.22, 0); alt.rotation.z = Math.PI / 2; g.add(alt);   // alternator
  g.add(box(THREE, 0.62, 0.18, 0.44, m.genTank, 0, Ht + 0.1, 0));                         // fuel tank on top
  g.add(cyl(THREE, 0.05, 0.05, 0.04, m.dark, 12, -0.18, Ht + 0.21, 0.05));                 // filler cap
  g.add(cyl(THREE, 0.012, 0.012, 0.02, m.steel, 6, -0.18, Ht + 0.24, 0.05));
  const muff = cyl(THREE, 0.07, 0.07, 0.3, m.steel, 12, -0.25, 0.45, -0.18); muff.rotation.z = Math.PI / 2; g.add(muff);
  g.add(box(THREE, 0.34, 0.17, 0.01, m.genPanel, 0.18, 0.42, W / 2 - 0.02));              // control panel
  g.add(box(THREE, 0.08, 0.06, 0.06, m.dark, -0.32, 0.36, W / 2 - 0.08));                  // recoil starter
  return g;
}
// The drip: a flat decal, 0.44 across (lay it on the ground).
export function makeDripDecal({ THREE }) {
  const m = mats(THREE), geo = new THREE.CircleGeometry(0.22, 12); geo.rotateX(-Math.PI / 2);
  return { geo, mat: m.drip };
}