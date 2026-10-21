// studio/relay-vault-model.js — CL-184: the radio relay's supply vault (Claude's).
//
// Jerry (2026-10-12): "we are going to have the Locker turn into almost a small building. It will bring up your reward
// from a little elevator shaft." A squat concrete store with a steel roll-up door, a keypad and a lamp beside it; inside,
// a hazard-striped shaft in the floor and the lift that brings the reward up it.
// CL-185 (Jerry): "Smooth relay building ramp out" (a wedge that runs out flush into the grass, a handrail each side);
// "Give relay building more personality and a better model": weathered, streaked concrete; a rusted roll-up door with a
// stencilled 07, worn hazard paint and a bloody handprint; an awning over it on two struts; a caged bulkhead lamp;
// steel corner guards; an aircon box and a conduit run down the wall; a dish, a whip aerial with a red tip and a coil
// of wire on the roof; sandbags by the ramp.
//
// Local frame: the door faces +z, the ground is y = 0, the floor's top is at y = FLOOR (on a dock, with a ramp up to
// the door), the shaft is at SHAFT. index.html places the group, adds the wall solids, the floor and ramp decks, and
// drives the moving parts:
//   makeVaultModel({ THREE, makeKatana })  { group, door, lift, rewards: { crate, case, rack, katanaStand }, roof,
//                                front, walls, lampMat, ledMat, stripMat, tipMat, solids, doorSolid, keypad, inside,
//                                decks, SIZE, setDoor(v), setLift(v), setCutaway(on) }
//   setDoor(v)   0 shut .. 1 rolled up          setLift(v)   0 at the bottom of the shaft .. 1 flush with the floor

export const VAULT_SIZE = Object.freeze({
  W: 3.2, D: 3.0, H: 2.35, WALL: 0.18,
  FLOOR: 1.15,             // it stands on a concrete dock (the ground can't be dug for the shaft), a ramp up to the door
  DOOR_W: 1.4, DOOR_H: 1.95,
  SHAFT: Object.freeze({ x: 0, z: -0.45, w: 1.1 }),
  LIFT_DROP: 1.05,
  RAMP_L: 4.2, RAMP_W: 1.6  // CL-185: longer and gentler (about 15 degrees), its foot flush with the ground
});

// --- Painted textures (canvas): no image files to load ---
const canvasTex = (THREE, w, h, draw, repeat) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (x) draw(x, w, h);
  const t = new THREE.CanvasTexture(c);
  if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
};
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
function concreteTex(THREE, seed, base = [188, 182, 164]) {
  return canvasTex(THREE, 256, 256, (x, w, h) => {
    const r = rng(seed);
    x.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = (r() - 0.5) * 34; x.fillStyle = `rgba(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v | 0},0.55)`; x.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2.5); }
    for (let i = 0; i < 4; i++) { const yy = 40 + i * 58 + r() * 10; x.fillStyle = 'rgba(60,55,45,0.12)'; x.fillRect(0, yy, w, 2); }   // the pour lines
    for (let i = 0; i < 14; i++) {   // rain streaks down from the top
      const sx = r() * w, len = 50 + r() * 150, wd = 2 + r() * 7;
      const gr = x.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, 'rgba(70,62,48,0.38)'); gr.addColorStop(1, 'rgba(70,62,48,0)');
      x.fillStyle = gr; x.fillRect(sx, 0, wd, len);
    }
    const foot = x.createLinearGradient(0, h * 0.72, 0, h); foot.addColorStop(0, 'rgba(70,74,40,0)'); foot.addColorStop(1, 'rgba(64,70,36,0.55)');   // grime and moss at the foot
    x.fillStyle = foot; x.fillRect(0, h * 0.72, w, h * 0.28);
    x.strokeStyle = 'rgba(40,36,30,0.55)'; x.lineWidth = 1;
    for (let i = 0; i < 3; i++) { let px = r() * w, py = r() * h * 0.5; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - 0.5) * 26; py += 8 + r() * 14; x.lineTo(px, py); } x.stroke(); }   // cracks
  });
}
function doorTex(THREE) {
  return canvasTex(THREE, 256, 320, (x, w, h) => {
    const r = rng(77);
    for (let i = 0; i < 16; i++) { const y0 = i * h / 16; const gr = x.createLinearGradient(0, y0, 0, y0 + h / 16); gr.addColorStop(0, '#6e6a5c'); gr.addColorStop(0.5, '#575447'); gr.addColorStop(1, '#3c3a31'); x.fillStyle = gr; x.fillRect(0, y0, w, h / 16); }
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(${120 + r() * 50 | 0},${55 + r() * 25 | 0},${20 + r() * 15 | 0},${0.25 + r() * 0.4})`; const s = 3 + r() * 16; x.beginPath(); x.ellipse(r() * w, r() * h, s, s * (0.4 + r() * 0.8), r() * 3, 0, Math.PI * 2); x.fill(); }   // rust
    for (let i = 0; i < 10; i++) { const sx = r() * w; const gr = x.createLinearGradient(0, h * 0.3, 0, h); gr.addColorStop(0, 'rgba(120,58,24,0)'); gr.addColorStop(1, 'rgba(120,58,24,0.5)'); x.fillStyle = gr; x.fillRect(sx, h * 0.3, 3 + r() * 4, h * 0.7); }
    x.save(); x.beginPath(); x.rect(0, h - 34, w, 34); x.clip();   // worn hazard paint along the foot
    for (let i = -2; i < 14; i++) { x.fillStyle = i % 2 ? '#d8a51e' : '#1b1b19'; x.beginPath(); x.moveTo(i * 24, h); x.lineTo(i * 24 + 24, h); x.lineTo(i * 24 + 58, h - 34); x.lineTo(i * 24 + 34, h - 34); x.fill(); }
    x.restore();
    x.globalAlpha = 0.82; x.fillStyle = '#d9d2b8'; x.font = 'bold 110px "Arial Black", Impact, sans-serif'; x.textAlign = 'center'; x.fillText('07', w / 2, 150);   // the stencil
    x.globalAlpha = 1; x.fillStyle = '#585547'; for (const sx of [w / 2 - 34, w / 2 + 36]) x.fillRect(sx, 62, 6, 92);   // the stencil's bridges
    x.fillStyle = 'rgba(110,8,8,0.85)';   // a bloody handprint and the drag below it
    const hx = 176, hy = 196;
    x.beginPath(); x.ellipse(hx, hy, 14, 17, 0.2, 0, Math.PI * 2); x.fill();
    for (const [dx, dy, l] of [[-14, -22, 16], [-5, -28, 19], [5, -28, 19], [13, -23, 16], [20, -4, 12]]) { x.save(); x.translate(hx + dx, hy + dy); x.rotate(dx * 0.02); x.fillRect(-3, -l, 6, l); x.restore(); }
    const dr = x.createLinearGradient(0, hy, 0, hy + 90); dr.addColorStop(0, 'rgba(110,8,8,0.7)'); dr.addColorStop(1, 'rgba(110,8,8,0)'); x.fillStyle = dr;
    for (const dx of [-9, -2, 6, 12]) x.fillRect(hx + dx, hy + 8, 3, 70 + r() * 30);
  });
}
function hazardTex(THREE) {
  return canvasTex(THREE, 128, 16, (x) => {
    x.fillStyle = '#e8b81e'; x.fillRect(0, 0, 128, 16); x.fillStyle = '#151515';
    for (let i = -16; i < 128; i += 16) { x.beginPath(); x.moveTo(i, 16); x.lineTo(i + 8, 16); x.lineTo(i + 16, 0); x.lineTo(i + 8, 0); x.closePath(); x.fill(); }
  }, [2, 1]);
}
function signTex(THREE) {
  return canvasTex(THREE, 256, 96, (x) => {
    x.fillStyle = '#c9c1a2'; x.fillRect(0, 0, 256, 96);
    x.strokeStyle = '#2a2a22'; x.lineWidth = 5; x.strokeRect(6, 6, 244, 84);
    x.fillStyle = '#23231c'; x.font = 'bold 34px "Courier New", monospace'; x.textAlign = 'center';
    x.fillText('RELAY STORES', 128, 45); x.font = 'bold 22px "Courier New", monospace'; x.fillText('AUTHORISED ONLY', 128, 76);
    x.fillStyle = 'rgba(90,60,30,0.35)'; x.fillRect(180, 0, 60, 96);   // weathered
  });
}
function treadTex(THREE) {
  return canvasTex(THREE, 64, 64, (x) => {
    x.fillStyle = '#8f8a78'; x.fillRect(0, 0, 64, 64);
    x.fillStyle = 'rgba(50,48,40,0.45)'; for (let i = 0; i < 8; i++) x.fillRect(0, i * 8 + 2, 64, 2);   // anti-slip grooves
    x.fillStyle = 'rgba(70,74,40,0.2)'; x.fillRect(0, 40, 64, 24);
  }, [1, 6]);
}

export function makeVaultModel({ THREE, makeKatana = null }) {
  const S = VAULT_SIZE, g = new THREE.Group(); g.name = 'relay-vault';
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...o });
  const concrete = mat(0xffffff, { map: concreteTex(THREE, 11) }), concreteDock = mat(0xffffff, { map: concreteTex(THREE, 29, [160, 154, 138]) });
  const concreteDark = mat(0x8a8574), roofMat = mat(0xffffff, { map: concreteTex(THREE, 53, [150, 146, 132]) });
  const steel = mat(0x4d5446, { roughness: 0.6, metalness: 0.45 }), steelDark = mat(0x2a2e27, { roughness: 0.55, metalness: 0.5 });
  const rust = mat(0x6b3c22, { roughness: 0.9, metalness: 0.3 }), galv = mat(0x8a9088, { roughness: 0.5, metalness: 0.6 });
  const shaftMat = mat(0x141412, { roughness: 1 }), yellow = mat(0xd6a51e, { roughness: 0.6 }), sand = mat(0x9a8a62, { roughness: 1 });
  const hazard = mat(0xffffff, { map: hazardTex(THREE), roughness: 0.7 }), sign = mat(0xffffff, { map: signTex(THREE), roughness: 0.9 });
  const doorMat = mat(0xffffff, { map: doorTex(THREE), roughness: 0.7, metalness: 0.35 }), tread = mat(0xffffff, { map: treadTex(THREE) });
  const lampMat = mat(0x1a1a1a, { emissive: 0xff3b2a, emissiveIntensity: 2.2 });
  const ledMat = mat(0x111111, { emissive: 0xff3b2a, emissiveIntensity: 1.6 });
  const stripMat = mat(0x111111, { emissive: 0xfff1c8, emissiveIntensity: 0.0 });
  const bulkMat = mat(0x222018, { emissive: 0xffd89a, emissiveIntensity: 1.3 });
  const tipMat = mat(0x111111, { emissive: 0xff2a1a, emissiveIntensity: 2.0 });
  const olive = mat(0x4f5b38), olivePale = mat(0x6b7a4a), white = mat(0xe8e6de), redCross = mat(0xb3261e), brass = mat(0xb48a3c, { roughness: 0.45, metalness: 0.7 });
  const box = (w, h, d, m, x, y, z, parent = g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; parent.add(b); return b; };
  const cyl = (r0, r1, h, m, x, y, z, parent = g, seg = 12) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); c.position.set(x, y, z); c.castShadow = true; parent.add(c); return c; };
  const hw = S.W / 2, hd = S.D / 2, t = S.WALL, top = S.FLOOR + S.H;
  const sh = S.SHAFT, sw = sh.w / 2;
  // The dock (deep, so it sits into a slope) with the shaft's hole through it: four slabs round the hole.
  const pd = S.FLOOR + 1.0, py = S.FLOOR - pd / 2;
  box(S.W + 0.2, pd, (hd + 0.1) - (sh.z + sw), concreteDock, 0, py, ((hd + 0.1) + (sh.z + sw)) / 2);
  box(S.W + 0.2, pd, (sh.z - sw) - (-hd - 0.1), concreteDock, 0, py, ((sh.z - sw) + (-hd - 0.1)) / 2);
  box((hw + 0.1) - sw, pd, sh.w, concreteDock, ((hw + 0.1) + sw) / 2, py, sh.z);
  box((hw + 0.1) - sw, pd, sh.w, concreteDock, -((hw + 0.1) + sw) / 2, py, sh.z);
  // Steel corner guards on the dock, striped.
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const k = box(0.08, S.FLOOR + 0.02, 0.08, hazard, x * (hw + 0.08), S.FLOOR / 2, z * (hd + 0.08)); k.rotation.y = 0.78; }
  // The shaft: dark walls down to the lift's bottom, hazard stripes round its rim.
  const sd = S.LIFT_DROP + 0.1;
  box(sh.w, sd, 0.05, shaftMat, 0, S.FLOOR - sd / 2, sh.z - sw + 0.025);
  box(sh.w, sd, 0.05, shaftMat, 0, S.FLOOR - sd / 2, sh.z + sw - 0.025);
  box(0.05, sd, sh.w, shaftMat, -sw + 0.025, S.FLOOR - sd / 2, sh.z);
  box(0.05, sd, sh.w, shaftMat, sw - 0.025, S.FLOOR - sd / 2, sh.z);
  box(sh.w, 0.05, sh.w, shaftMat, 0, S.FLOOR - sd, sh.z);
  for (const [len, x, z, turn] of [[sh.w + 0.16, 0, sh.z - sw - 0.04, 0], [sh.w + 0.16, 0, sh.z + sw + 0.04, 0], [sh.w, -sw - 0.04, sh.z, 1], [sh.w, sw + 0.04, sh.z, 1]]) {
    const r = box(len, 0.012, 0.08, hazard, x, S.FLOOR + 0.006, z); if (turn) r.rotation.y = Math.PI / 2;
  }
  // Inside: a cable reel and a rack of empty shelving against the back wall.
  const shx = -hw + t + 0.2;   // the shelving along the -x wall, clear of the shaft
  for (const y of [0.6, 1.2]) { box(0.38, 0.04, 1.3, steel, shx, S.FLOOR + y, -0.55); }
  for (const z of [-1.18, 0.08]) box(0.38, 1.4, 0.04, steelDark, shx, S.FLOOR + 0.7, z);
  box(0.3, 0.2, 0.3, olive, shx, S.FLOOR + 0.72, -0.9); box(0.26, 0.14, 0.2, olivePale, shx, S.FLOOR + 1.29, -0.2);   // a few empty boxes
  const reel = cyl(0.26, 0.26, 0.24, rust, hw - t - 0.35, S.FLOOR + 0.27, -hd + t + 0.4); reel.rotation.z = Math.PI / 2;
  // Walls: the back and the two sides in one group that index.html cuts down to a low stub while he is inside (so the
  // camera sees him and the lift), then the front either side of the door and over it.
  const walls = new THREE.Group(); walls.position.y = S.FLOOR; g.add(walls);
  const wy = S.FLOOR + S.H / 2;
  box(S.W, S.H, t, concrete, 0, S.H / 2, -hd + t / 2, walls);
  box(t, S.H, S.D, concrete, -hw + t / 2, S.H / 2, 0, walls);
  box(t, S.H, S.D, concrete, hw - t / 2, S.H / 2, 0, walls);
  for (const x of [-1, 1]) box(t + 0.03, 0.14, S.D + 0.03, concreteDark, x * (hw - t / 2), 0.07, 0, walls);   // a darker footing course
  box(S.W + 0.03, 0.14, t + 0.03, concreteDark, 0, 0.07, -hd + t / 2, walls);
  // An aircon box on the +x wall with its fan, a conduit run down the -x wall into the dock.
  box(0.34, 0.5, 0.62, galv, hw + 0.17, 1.15, -0.4, walls);
  const fan = cyl(0.2, 0.2, 0.02, steelDark, hw + 0.345, 1.15, -0.4, walls, 16); fan.rotation.z = Math.PI / 2;
  for (let i = 0; i < 4; i++) box(0.012, 0.36, 0.012, galv, hw + 0.352, 1.15, -0.55 + i * 0.1, walls);
  const cond = cyl(0.035, 0.035, S.H + 0.5, galv, -hw - 0.05, S.H / 2 - 0.25, 0.9, walls, 8);
  box(0.12, 0.16, 0.08, galv, -hw - 0.05, S.H - 0.25, 0.9, walls);   // its junction box
  // The front (the wall, the door's drum and rails, the keypad, lamp, sign and awning) is its own group: index.html cuts
  // it away with the roof while he is inside, or the camera behind him would look at a wall.
  const front = new THREE.Group(); g.add(front);
  const side = (S.W - S.DOOR_W) / 2;
  box(side, S.H, t, concrete, -(S.DOOR_W / 2 + side / 2), wy, hd - t / 2, front);
  box(side, S.H, t, concrete, (S.DOOR_W / 2 + side / 2), wy, hd - t / 2, front);
  box(S.DOOR_W, S.H - S.DOOR_H, t, concrete, 0, S.FLOOR + S.DOOR_H + (S.H - S.DOOR_H) / 2, hd - t / 2, front);
  box(S.DOOR_W + 0.2, 0.28, 0.3, steelDark, 0, S.FLOOR + S.DOOR_H + 0.18, hd + 0.08, front);   // the drum's housing
  for (const x of [-1, 1]) box(0.06, S.DOOR_H, 0.08, steelDark, x * (S.DOOR_W / 2 + 0.03), S.FLOOR + S.DOOR_H / 2, hd + 0.02, front);   // its rails
  // The awning: a sheet of corrugated tin on two struts over the door.
  const aw = new THREE.Group(); aw.position.set(0, S.FLOOR + S.DOOR_H + 0.42, hd + 0.02); aw.rotation.x = 0.22; front.add(aw);
  for (let i = 0; i < 9; i++) { const c = cyl(0.035, 0.035, 0.9, i % 2 ? galv : rust, -0.96 + i * 0.24, 0, 0.45, aw, 6); c.rotation.x = Math.PI / 2; }
  box(2.1, 0.012, 0.92, galv, 0, 0.03, 0.45, aw);
  for (const x of [-0.95, 0.95]) { const s = box(0.04, 0.04, 0.95, steelDark, x, -0.2, 0.42, aw); s.rotation.x = -0.42; }
  // The keypad right of the door, the lamp over it, a caged bulkhead lamp, the sign left of it.
  const kx = S.DOOR_W / 2 + 0.42, kz = hd + 0.03;
  box(0.24, 0.32, 0.06, steelDark, kx, S.FLOOR + 1.12, kz, front);
  box(0.16, 0.06, 0.012, ledMat, kx, S.FLOOR + 1.22, kz + 0.035, front);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) box(0.035, 0.03, 0.012, steel, kx - 0.05 + c * 0.05, S.FLOOR + 1.13 - r * 0.045, kz + 0.035, front);
  box(0.16, 0.16, 0.16, lampMat, 0, S.FLOOR + S.DOOR_H + 0.45, hd + 0.06, front);
  const bulk = cyl(0.07, 0.07, 0.07, bulkMat, -(S.DOOR_W / 2 + 0.4), S.FLOOR + 1.95, hd + 0.05, front, 12); bulk.rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) box(0.16, 0.012, 0.012, steelDark, -(S.DOOR_W / 2 + 0.4), S.FLOOR + 1.9 + i * 0.05, hd + 0.1, front);   // its cage
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), sign); plate.position.set(-(S.DOOR_W / 2 + 0.55), S.FLOOR + 1.45, hd + 0.005); front.add(plate);
  // The roll-up door: one rusted, stencilled sheet that rolls up into the drum (setDoor).
  const door = new THREE.Group(); door.position.set(0, S.FLOOR, hd - t / 2 + 0.02); g.add(door);
  box(S.DOOR_W - 0.04, S.DOOR_H, 0.04, doorMat, 0, S.DOOR_H / 2, 0, door);
  for (let i = 1; i < 8; i++) box(S.DOOR_W - 0.05, 0.012, 0.046, steelDark, 0, i * S.DOOR_H / 8, 0, door);   // the slat joints
  box(0.5, 0.05, 0.05, brass, 0, 0.22, 0.04, door);   // the handle
  // The roof (hidden while he is inside, see index.html): a parapet, a vent, a dish, a whip aerial, a coil of wire.
  const roof = new THREE.Group(); g.add(roof);
  box(S.W + 0.3, 0.16, S.D + 0.3, roofMat, 0, top + 0.08, 0, roof);
  for (const [w, d, x, z] of [[S.W + 0.3, 0.06, 0, hd + 0.12], [S.W + 0.3, 0.06, 0, -hd - 0.12], [0.06, S.D + 0.3, hw + 0.12, 0], [0.06, S.D + 0.3, -hw - 0.12, 0]]) box(w, 0.1, d, concreteDark, x, top + 0.2, z, roof);
  box(0.5, 0.3, 0.5, steel, 0.8, top + 0.31, -0.6, roof);
  box(0.6, 0.06, 0.6, steelDark, 0.8, top + 0.49, -0.6, roof);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, 0, 0.9), galv);
  dish.material = galv; dish.position.set(-0.85, top + 0.62, -0.7); dish.rotation.set(-1.0, 0.7, 0); dish.castShadow = true; roof.add(dish);
  cyl(0.03, 0.03, 0.5, steelDark, -0.85, top + 0.4, -0.7, roof, 8);
  cyl(0.012, 0.006, 2.4, steelDark, 1.25, top + 1.35, 0.9, roof, 6);   // the whip aerial
  cyl(0.035, 0.035, 0.05, tipMat, 1.25, top + 2.57, 0.9, roof, 8);
  for (let i = 0; i < 7; i++) { const coil = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 4, 10), steelDark); coil.position.set(-1.2 + i * 0.32, top + 0.33, hd + 0.12); roof.add(coil); }   // the wire along the front parapet
  // The ramp: a wedge that runs out flush into the grass, grooved concrete, a pipe rail each side, sandbags by its foot.
  const rl = S.RAMP_L, ra = Math.atan2(S.FLOOR, rl), z0 = hd + 0.02, z1 = hd + 0.02 + rl;
  const wedge = new THREE.Shape(); wedge.moveTo(0, S.FLOOR); wedge.lineTo(rl, 0); wedge.lineTo(rl, -0.05); wedge.lineTo(rl * 0.6, -0.8); wedge.lineTo(0, -0.8); wedge.closePath();
  const wg = new THREE.ExtrudeGeometry(wedge, { depth: S.RAMP_W, bevelEnabled: false });
  const wm = new THREE.Mesh(wg, concreteDock); wm.rotation.y = -Math.PI / 2; wm.position.set(S.RAMP_W / 2, 0, z0); wm.castShadow = wm.receiveShadow = true; g.add(wm);
  const treadM = new THREE.Mesh(new THREE.PlaneGeometry(S.RAMP_W - 0.1, Math.hypot(S.FLOOR, rl)), tread);
  treadM.rotation.x = -Math.PI / 2 + ra; treadM.position.set(0, S.FLOOR / 2 + 0.008, (z0 + z1) / 2); treadM.receiveShadow = true; g.add(treadM);
  for (const sx of [-1, 1]) {
    const x = sx * (S.RAMP_W / 2 + 0.04);
    for (let i = 0; i <= 3; i++) { const d = i / 3 * (rl - 0.3), h = S.FLOOR * (1 - d / rl); cyl(0.022, 0.022, 0.85, yellow, x, h + 0.42, z0 + d, g, 6); }
    const run = rl - 0.3, drop = S.FLOOR * run / rl;
    const rail = cyl(0.026, 0.026, Math.hypot(drop, run), yellow, x, S.FLOOR - drop / 2 + 0.84, z0 + run / 2, g, 6);
    rail.rotation.x = Math.PI / 2 + ra;
  }
  for (let i = 0; i < 5; i++) { const bag = box(0.42, 0.18, 0.26, sand, S.RAMP_W / 2 + 0.55, 0.09 + (i > 2 ? 0.17 : 0), z1 - 0.6 - (i % 3) * 0.42 + (i > 2 ? 0.2 : 0)); bag.rotation.y = 1.4 + i * 0.13; }
  const barrel = cyl(0.23, 0.23, 0.72, rust, -S.RAMP_W / 2 - 0.55, 0.36, z1 - 1.0, g, 14);
  cyl(0.235, 0.235, 0.03, steelDark, -S.RAMP_W / 2 - 0.55, 0.55, z1 - 1.0, g, 14);
  // The lift: a steel deck on the shaft, with the rewards on it (index.html shows the one for the day).
  const lift = new THREE.Group(); lift.position.set(sh.x, S.FLOOR - S.LIFT_DROP, sh.z); g.add(lift);
  box(sh.w - 0.06, 0.08, sh.w - 0.06, steel, 0, -0.04, 0, lift);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.05, 0.02, 0.05, brass, x * (sw - 0.1), 0.01, z * (sw - 0.1), lift);
  const crate = new THREE.Group(); lift.add(crate);
  box(0.62, 0.36, 0.42, olive, 0, 0.18, 0.05, crate);
  box(0.64, 0.05, 0.44, olivePale, 0, 0.36, 0.05, crate);
  box(0.3, 0.12, 0.2, white, 0.08, 0.44, 0.02, crate);
  box(0.14, 0.04, 0.012, redCross, 0.08, 0.44, 0.125, crate); box(0.04, 0.1, 0.012, redCross, 0.08, 0.44, 0.125, crate);
  for (const x of [-0.24, 0.24]) box(0.05, 0.05, 0.03, brass, x, 0.3, 0.27, crate);
  const kase = new THREE.Group(); lift.add(kase);
  box(0.95, 0.12, 0.38, steelDark, 0, 0.06, 0, kase);
  for (const x of [-0.3, 0, 0.3]) box(0.06, 0.04, 0.03, brass, x, 0.06, 0.2, kase);
  const rack = new THREE.Group(); rack.position.set(0, 0.3, 0); lift.add(rack);   // index.html puts the gun itself on it
  for (const x of [-0.32, 0.32]) box(0.05, 0.2, 0.06, steel, x, -0.08, 0, rack);
  const katanaStand = new THREE.Group(); lift.add(katanaStand);
  box(0.8, 0.06, 0.24, steelDark, 0, 0.03, 0, katanaStand);
  for (const x of [-0.3, 0.3]) { box(0.05, 0.36, 0.05, steelDark, x, 0.21, 0, katanaStand); box(0.08, 0.04, 0.08, redCross, x, 0.38, 0, katanaStand); }
  if (makeKatana) {
    const k = makeKatana(); k.rotation.y = Math.PI / 2; k.scale.setScalar(1.25); k.position.set(-0.27, 0.44, 0); katanaStand.add(k);
    katanaStand.userData.katana = k;
  }
  crate.visible = kase.visible = rack.visible = katanaStand.visible = false;
  // Where the walls stop him (cylinders along them, the doorway left open), where he works the keypad, where he takes.
  const solids = [];
  const along = (x0, z0_, x1, z1_) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1_ - z0_) / 0.45)); for (let i = 0; i <= n; i++) solids.push([x0 + (x1 - x0) * i / n, z0_ + (z1_ - z0_) * i / n, 0.26]); };
  along(-hw + 0.15, -hd + 0.15, hw - 0.15, -hd + 0.15);
  along(-hw + 0.15, -hd + 0.15, -hw + 0.15, hd - 0.15);
  along(hw - 0.15, -hd + 0.15, hw - 0.15, hd - 0.15);
  along(-hw + 0.15, hd - 0.15, -S.DOOR_W / 2 - 0.2, hd - 0.15);
  along(S.DOOR_W / 2 + 0.2, hd - 0.15, hw - 0.15, hd - 0.15);
  const doorSolid = [0, hd - 0.12, 0.62];   // the shut door (index.html drops it when it rolls up)
  const api = {
    group: g, door, lift, roof, front, walls, lampMat, ledMat, stripMat, tipMat, rewards: { crate, case: kase, rack, katanaStand }, solids, doorSolid,
    keypad: { x: S.DOOR_W / 2 - 0.15, z: hd + 0.55 }, inside: { x: sh.x, z: sh.z + sw + 0.45 }, SIZE: S,
    // The decks he walks on, local. The floor runs out under the doorway onto the top of the ramp, so there is never a
    // gap between them to drop through (CL-185: he fell through the floor there, taking the reward); the ramp rises from
    // its far end, flush with the ground, to the door.
    decks: { floor: { x: 0, z: 0.12, hw: hw - t, hl: hd - t + 0.3, y: S.FLOOR }, ramp: { x: 0, z: z0 + rl / 2, hw: S.RAMP_W / 2, hl: rl / 2, y: 0, rise: S.FLOOR } },
    // Inside: the roof and the front gone, the other walls cut to a stub.
    setCutaway(on) { roof.visible = front.visible = !on; walls.scale.y = on ? 0.2 : 1; },
    setDoor(v) { const k = Math.max(0, Math.min(1, v)); door.position.y = S.FLOOR + k * (S.DOOR_H - 0.06); door.scale.y = 1 - 0.96 * k; door.visible = k < 0.999; },
    setLift(v) { const k = Math.max(0, Math.min(1, v)); lift.position.y = S.FLOOR - S.LIFT_DROP * (1 - k); }
  };
  return api;
}
