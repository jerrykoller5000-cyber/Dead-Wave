// world/cargo-plane.js: the four-engine turboprop freighter that drops the marine in and brings the supply crates
// (CL-142, Jerry 2026-10-10: "a fidelity sweep and upgrade"; it was index.html's makeCargoPlane, boxes and tubes).
// Same aircraft, same size, same angles in mind (from underneath as she crosses the map, from behind as the load
// leaves), now lofted: a round fuselage with a flat floor line, a stepped flight deck with its glasshouse and chin
// windows over the radome, gear sponsons faired into the flanks, a tapered high wing with dihedral, flaps and ailerons,
// four long turboprop nacelles with their chin intakes and four-bladed paddle props, drop tanks on pylons, a tall swept
// fin with its fillet and rudder, a tapered tailplane, and the cargo bay open behind the ramp, the jump lights burning.
//
//   buildCargoPlane(THREE, mats) -> Group      (nose +Z, up +Y, port wing +X; the fuselage's axis at y = 0)
//     mats: { planeMat, planeDark, planeTrim, planeKeel, planeMetal, planeGlass, planeStencil, planeBayMat } as in
//     index.html. userData.props (the four props, for anything that counts them) and userData.tick(dt, spin) as before.
//
// The model is built once per set of materials (a few milliseconds) and every plane after is a copy that shares its
// geometry (userData.shared: airborne.dispose leaves it alone) with its own lamps, so each blinks on its own clock and
// a supply drop costs nothing to spawn. Still parts are one mesh per material.
import { loftBody, airfoilPanel, skinPatch, skinBand, strut, tubeAB, camo, camoField, mergeStatic, stencilTexture, spaced, smoothstep, mix, joinGeos } from './aircraft-kit.js';

const R = 1.4, HINGE = -10.9;                                // the barrel's radius; the ramp's hinge
function fuselage(z) {
  let yTop = R, yBot = -R, w = R, n = 2.25;
  if (z > 8.0) w = R - 0.35 * smoothstep(8.0, 10.6, z);
  if (z > 8.3) yTop = R - 0.86 * smoothstep(8.3, 10.5, z);                     // the flight deck's windscreen
  if (z > 9.2) yBot = -R + 0.62 * smoothstep(9.2, 10.9, z);                     // the chin rises to the radome
  if (z > 10.6) {                                                               // the radome
    const s = Math.min(1, (z - 10.6) / 1.25), e = Math.sqrt(Math.max(0, 1 - s * s));
    const top0 = R - 0.86, bot0 = -R + 0.62 * smoothstep(9.2, 10.9, 10.6), mid = -0.22;
    yTop = mid + (top0 - mid) * e; yBot = mid - (mid - bot0) * e; w = (R - 0.35) * e; n = 2.25 - 0.25 * s;
  }
  let nb = n;
  if (z < -4.0) {                                                               // the belly rises to the floor at the hinge
    const u = smoothstep(-4.0, HINGE, z);
    yBot = -R + 0.57 * Math.pow(u, 1.2); nb = n + 2.6 * u;
    if (z < -7.5) w = R - 0.12 * smoothstep(-7.5, HINGE, z);
    if (z < -8.5) yTop = R - 0.07 * smoothstep(-8.5, HINGE, z);
  }
  if (z < HINGE) {                                                              // the beaver tail over the opening
    const u = Math.min(1, (HINGE - z) / (HINGE + 13.15));
    yBot = -R + 0.57 + 1.45 * Math.pow(u, 1.1); w = (R - 0.12) - 0.72 * Math.pow(u, 1.2); yTop = (R - 0.07) - 0.32 * u; nb = n + 2.6;
  }
  const y = (yTop + yBot) / 2;
  return { w, ht: yTop - y, hb: y - yBot, y, n, nb };
}
// The gear sponson on each flank (its own frame, x across from its middle).
function sponson(z) {
  const u = z > 2.6 ? Math.min(1, (z - 2.6) / 0.9) : z < -3.4 ? Math.min(1, (-3.4 - z) / 1.1) : 0;
  const e = Math.sqrt(Math.max(0.0, 1 - u * u));
  return { w: 0.5 * Math.max(0.05, e), ht: 0.55 * Math.max(0.05, e), hb: 0.62 * Math.max(0.05, e), y: 0, n: 2.8 };
}
function nacelle(z) {                                        // z from -1.3 (into the wing) to 5.9 (the cowl lip)
  let w = 0.6, ht = 0.6, hb = 0.82, y = 0, n = 2.3;
  if (z > 4.7) { const s = (z - 4.7) / 1.2; w = 0.6 - 0.12 * s * s; ht = 0.6 - 0.12 * s * s; hb = 0.82 - 0.3 * s * s; }
  if (z < 1.2) { const s = Math.min(1, (1.2 - z) / 2.5); w = 0.6 - 0.36 * Math.pow(s, 1.2); ht = 0.6 - 0.3 * s; hb = 0.82 - 0.62 * Math.pow(s, 0.85); y = 0.25 * s; }
  return { w, ht, hb, y, n };
}
function dropTank(z) {                                       // z from -2.4 to 3.1
  const u = z > 1.4 ? (z - 1.4) / 1.7 : z < -0.6 ? (-0.6 - z) / 1.8 : 0;
  const e = Math.sqrt(Math.max(0, 1 - Math.min(1, u) ** 2));
  const r = 0.5 * (z > 1.4 ? Math.pow(e, 0.9) : Math.pow(e, 1.4));
  return { w: r, ht: r, hb: r, y: 0, n: 2 };
}

const templates = new WeakMap();
export function buildCargoPlane(T, mats) {
  let tpl = templates.get(mats.planeMat);
  if (!tpl) { tpl = buildTemplate(T, mats); templates.set(mats.planeMat, tpl); }
  const g = tpl.clone(true);
  // Lamps get their own materials so each aircraft blinks on its own clock; flagging them airborne-owned lets
  // dispose() collect them along with the rest of the model (the shared geometry it leaves).
  const lamp = (color, intensity) => { const m = new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 }); m.userData.airborneOwned = true; return m; };
  const L = { beacon: lamp(0xff2a18, 0.3), strobe: lamp(0xeef6ff, 0.3), jump: lamp(0xff1d0c, 1.1), port: lamp(0xff2a18, 1.4), star: lamp(0x2bff72, 1.4) };
  const disc = new T.MeshBasicMaterial({ color: 0x1a1d18, transparent: true, opacity: 0.08, side: T.DoubleSide, depthWrite: false });
  disc.userData.airborneOwned = true;
  const props = [];
  g.traverse((o) => {
    if (o.userData.lamp) o.material = L[o.userData.lamp];
    if (o.userData.disc) o.material = disc;
    if (o.name === 'cargo-prop') props.push(o);
  });
  g.userData = { props, tick: null };
  let ph = Math.random() * 4;
  // One call per frame handles the props, the beacons and the bay lights together.
  g.userData.tick = (dt, spin) => {
    for (const p of props) p.rotation.z += dt * spin;
    ph += dt;
    L.beacon.emissiveIntensity = ph % 1.15 < 0.14 ? 2.8 : 0.12;     // rotating red beacons
    L.strobe.emissiveIntensity = ph % 1.7 < 0.07 ? 6.0 : 0.08;      // wingtip and fin strobes
    L.jump.emissiveIntensity = 1.0 + Math.sin(ph * 5.5) * 0.25;
  };
  return g;
}

function buildTemplate(T, M) {
  const g = new T.Group();
  const P = Math.PI, H = P / 2;
  const skin = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.72, metalness: 0.2 });
  const skinIn = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.8, metalness: 0.15, side: T.DoubleSide });
  const rubber = new T.MeshStandardMaterial({ color: 0x1a1c17, roughness: 0.85, metalness: 0.05 });
  const soot = new T.MeshStandardMaterial({ color: 0x1c1d18, roughness: 1, metalness: 0 });
  const bladeMat = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.55, metalness: 0.3 });
  // placeholders, swapped for each plane's own
  const lampMat = {}; for (const k of ['beacon', 'strobe', 'jump', 'port', 'star']) lampMat[k] = new T.MeshStandardMaterial({ color: 0xff0000 });
  const discMat = new T.MeshBasicMaterial({ transparent: true, opacity: 0.08, depthWrite: false });
  const mesh = (geo, mat, shadow = true) => { const m = new T.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; g.add(m); return m; };
  const at = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; };
  const lampAt = (k, r, x, y, z) => at(mesh(new T.SphereGeometry(r, 10, 8), lampMat[k], false), x, y, z);

  // The paint: the olive the old one wore, a darker green-grey over it in soft blotches, a paler belly.
  const OL = new T.Color(M.planeMat.color), DK = new T.Color(M.planeKeel.color).multiplyScalar(0.92), BL = new T.Color(0x737b6c), blot = camoField(1.9);
  const paint = (under) => (x, y, z, c) => { c.copy(OL).lerp(DK, blot(x * 0.6, y * 0.6, z * 0.6) * 0.8); const b = under(x, y, z); if (b > 0) c.lerp(BL, b); return c; };
  const camoOf = (geo, under = () => 0) => camo(T, geo, paint(under));

  // --- The fuselage ------------------------------------------------------------------------------------------------
  // Forward of the ramp's hinge a closed tube (its aft end open onto the bay); aft of it only the upper shell, so the
  // eye runs out through the opening.
  const zs = [...new Set([...spaced(HINGE, -4.0, 12, 'none'), ...spaced(-4.0, 8.0, 12, 'none'), ...spaced(8.0, 10.6, 10, 'none'), ...spaced(10.6, 11.85, 12, 'end')].map((v) => +v.toFixed(4)))].sort((a, b) => a - b);
  const body = loftBody(T, fuselage, { zs, seg: 40, capStart: false });
  camoOf(body.geo, (x, y, z) => { const p = fuselage(z); return smoothstep(p.y - p.hb * 0.25, p.y - p.hb * 0.6, y); });
  { const c = body.geo.attributes.color, p = body.geo.attributes.position, RD = new T.Color(M.planeDark.color).multiplyScalar(1.3), tmp = new T.Color();
    for (let i = 0; i < p.count; i++) { const k = smoothstep(10.75, 10.95, p.getZ(i)); if (k > 0) { tmp.setRGB(c.getX(i), c.getY(i), c.getZ(i)).lerp(RD, k); c.setXYZ(i, tmp.r, tmp.g, tmp.b); } } }   // the radome
  mesh(body.geo, skinIn);
  // the beaver tail over the opening
  const tzs = spaced(-13.15, HINGE, 10, 'none');
  const tail = loftBody(T, fuselage, { zs: tzs, seg: 40, capStart: false, capEnd: false });
  // keep only the upper part of the ring (from a little under the flanks round over the top)
  {
    const geo = tail.geo, idx = geo.index.array, pos = geo.attributes.position, keep = [];
    for (let i = 0; i < idx.length; i += 3) {
      let ok = true;
      for (let k = 0; k < 3; k++) { const vi = idx[i + k], j = vi % 41, th = (j / 40) * P * 2; if (Math.sin(th) < -0.42) ok = false; }
      if (ok) keep.push(idx[i], idx[i + 1], idx[i + 2]);
    }
    geo.setIndex(keep); void pos;
    camoOf(geo);
    mesh(geo, skinIn);
    const endCap = mesh(new T.CircleGeometry(0.6, 16, 0, P), M.planeKeel); at(endCap, 0, fuselage(-13.15).y - 0.05, -13.16, 0, P, 0);
  }
  const win = (z0, z1, a0, a1, rnd = 0) => {
    mesh(skinPatch(T, body, z0 - 0.04, z1 + 0.04, a0 - 0.035, a1 + 0.035, 0.007, { nz: 6, na: 6, round: rnd }), rubber, false);
    mesh(skinPatch(T, body, z0, z1, a0, a1, 0.014, { nz: 6, na: 6, round: rnd }), M.planeGlass, false);
  };
  // The flight deck: six panes across the windscreen, the side windows, the eyebrows, the chin windows.
  for (const [a0, a1] of [[H + 0.03, H + 0.36], [H + 0.4, H + 0.74], [H + 0.78, H + 1.08], [H - 0.36, H - 0.03], [H - 0.74, H - 0.4], [H - 1.08, H - 0.78]]) win(8.95, 10.25, a0, a1);
  for (const [a0, a1] of [[0.32, 0.72], [P - 0.72, P - 0.32]]) { win(8.1, 8.85, a0, a1, 0.6); win(7.25, 7.95, a0 + 0.04, a1 - 0.04, 0.6); }
  for (const [a0, a1] of [[-0.62, -0.22], [P + 0.22, P + 0.62]]) win(9.7, 10.4, a0, a1, 0.8);
  // Doors and seams: the crew door, the paratroop doors either side ahead of the ramp, panel lines round the body.
  const seam = (z0, z1, a0, a1) => {
    for (const z of [z0, z1]) mesh(skinPatch(T, body, z - 0.014, z + 0.014, a0, a1, 0.004, { nz: 1, na: 8 }), rubber, false);
    for (const a of [a0, a1]) mesh(skinPatch(T, body, z0, z1, a - 0.01, a + 0.01, 0.004, { nz: 4, na: 1 }), rubber, false);
  };
  seam(5.9, 6.95, -0.55, 0.4);
  for (const [a0, a1] of [[-0.55, 0.52], [P - 0.52, P + 0.55]]) { seam(-5.0, -4.05, a0, a1); win(-4.75, -4.3, a1 - 0.36, a1 - 0.1, 0.8); }
  for (const z of [7.6, 5.0, 2.4, -0.6, -3.4, -6.2, -8.6]) mesh(skinBand(T, body, z, 0.022, -P, P, 0.003, 40), rubber, false);
  for (const zc of [4.4, 3.4, 0.6, -1.4, -2.6]) for (const a of [0.18, P - 0.18]) win(zc - 0.13, zc + 0.13, a - 0.06, a + 0.06, 1);   // troop windows
  // The gear sponsons, faired into the lower flanks, their doors; the keel strip.
  const szs = spaced(-4.5, 3.5, 16, 'both');
  for (const s of [1, -1]) {
    const sp = loftBody(T, sponson, { zs: szs, seg: 20 });
    sp.geo.translate(s * 1.2, -0.72, 0);
    camoOf(sp.geo, (x, y) => smoothstep(-0.7, -1.05, y)); mesh(sp.geo, skin);
    const spb = { surf: (z, a, off, out) => sp.surf(z, a, off, out).add(new T.Vector3(s * 1.2, -0.72, 0)), norm: sp.norm };
    for (const [z0, z1] of [[0.0, 2.2], [-3.1, -0.9]]) {
      const a0 = s > 0 ? -0.9 : P + 0.9, a1 = s > 0 ? 0.25 : P - 0.25;
      for (const z of [z0, z1]) mesh(skinPatch(T, spb, z - 0.015, z + 0.015, Math.min(a0, a1), Math.max(a0, a1), 0.004, { nz: 1, na: 6 }), rubber, false);
    }
  }
  mesh(new T.BoxGeometry(0.5, 0.1, 11.5), M.planeKeel, false).position.set(0, -1.42, 0.3);
  // --- The cargo bay, seen through the open back -----------------------------------------------------------------------
  {
    const lz = spaced(-13.1, -4.05, 22, 'none');
    const liner = loftBody(T, (z) => { const p = fuselage(z); return { ...p, w: p.w - 0.07, ht: p.ht - 0.07, hb: p.hb - 0.04 }; }, { zs: lz, seg: 40, capStart: false, capEnd: false });
    const idx = liner.geo.index.array, keep = [];
    for (let i = 0; i < idx.length; i += 3) {
      let ok = true;
      for (let k = 0; k < 3; k++) { const vi = idx[i + k], j = vi % 41, row = Math.floor(vi / 41), th = (j / 40) * P * 2; if (lz[row] < HINGE + 0.01 && Math.sin(th) < -0.42) ok = false; }
      if (ok) keep.push(idx[i], idx[i + 1], idx[i + 2]);
    }
    liner.geo.setIndex(keep);
    mesh(liner.geo, M.planeBayMat, false);
  }
  at(mesh(new T.BoxGeometry(1.9, 0.12, 6.85), M.planeBayMat, false), 0, -0.74, -7.48);
  at(mesh(new T.BoxGeometry(2.6, 2.4, 0.14), M.planeBayMat, false), 0, 0.15, -4.05);
  for (const s of [-1, 1]) {
    at(mesh(new T.BoxGeometry(0.14, 0.07, 6.8), M.planeDark, false), s * 0.6, -0.65, -7.48);           // roller rails
    for (let k = 0; k < 12; k++) at(mesh(new T.CylinderGeometry(0.035, 0.035, 0.12, 6), M.planeMetal, false), s * 0.6, -0.6, -4.4 - k * 0.55, 0, 0, H);
    at(mesh(new T.BoxGeometry(0.05, 0.05, 6.4), M.planeMetal, false), s * 0.7, 0.95, -7.6);           // static-line cables
        for (let k = 0; k < 7; k++) at(mesh(new T.BoxGeometry(0.08, 0.42, 0.42), M.planeTrim, false), s * 1.0, -0.3, -4.5 - k * 0.92);  // troop seats, folded
    lampAt('jump', 0.11, s * 0.98, 0.62, -10.2).userData.lamp = 'jump';
    lampAt('jump', 0.09, s * 1.05, 0.62, -8.0).userData.lamp = 'jump';
  }
  // The ramp, hinged at the floor's end and lowered, its ribs and rails, the actuators.
  const ramp = new T.Group(); ramp.position.set(0, -0.76, HINGE); ramp.rotation.x = -0.36; g.add(ramp);
  const rp = (geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; ramp.add(m); return m; };
  rp(new T.BoxGeometry(2.1, 0.16, 3.3), M.planeKeel, 0, -0.08, -1.65);
  for (let k = 0; k < 6; k++) rp(new T.BoxGeometry(2.2, 0.04, 0.06), M.planeDark, 0, 0.02, -0.3 - k * 0.55);
  for (const s of [-1, 1]) { rp(new T.BoxGeometry(0.1, 0.3, 3.3), M.planeDark, s * 1.05, 0.06, -1.65); rp(new T.BoxGeometry(0.14, 0.06, 3.1), M.planeDark, s * 0.6, 0.03, -1.6); }
  rp(new T.BoxGeometry(2.1, 0.1, 0.55), M.planeDark, 0, -0.12, -3.5);               // the toe
  for (const s of [-1, 1]) { const j = tubeAB(T, [s * 0.85, 0.35, HINGE + 0.6], [s * 0.85, -0.95, HINGE - 1.15], 0.06, M.planeMetal); g.add(j); }
  // --- The wing --------------------------------------------------------------------------------------------------
  const SPAN = 17.0, wY = (x) => 1.62 + Math.abs(x) * 0.035, wLE = (x) => 2.75 - Math.abs(x) * 0.09, wTE = (x) => -1.5 + Math.abs(x) * 0.02;
  const wsec = (x) => ({ le: wLE(x), c: wLE(x) - wTE(x), t: 0.15, y: wY(x), camber: 0.02 });
  const wingGeo = joinGeos(T, [
    airfoilPanel(T, { s0: -2.0, s1: 2.0, at: wsec, steps: 4 }),
    airfoilPanel(T, { s0: 1.95, s1: SPAN, at: wsec, to: 0.76, steps: 30, round: 0.5 }),
    airfoilPanel(T, { s0: -1.95, s1: -SPAN, at: wsec, to: 0.76, steps: 30, round: 0.5 })
  ]);
  camoOf(wingGeo, (x, y) => smoothstep(wY(x) + 0.02, wY(x) - 0.08, y));
  mesh(wingGeo, skin);
  for (const [s0, s1, droop] of [[2.0, 8.6, -0.06], [8.75, 12.9, -0.06], [13.05, 16.2, 0], [-2.0, -8.6, -0.06], [-8.75, -12.9, -0.06], [-13.05, -16.2, 0]]) {
    const geo = airfoilPanel(T, { s0, s1, at: wsec, from: 0.79, to: 1.0, steps: 6, cn: 6 });
    const hx = (s0 + s1) / 2, hz = wLE(hx) - 0.79 * (wLE(hx) - wTE(hx)), hy = wY(hx);
    geo.translate(0, -hy, -hz); camoOf(geo, (x, y) => smoothstep(0.02, -0.05, y));
    at(mesh(geo, skin), 0, hy - 0.02, hz, droop);
  }
  // The wing-to-body fairing over the barrel.
  {
    const fz = spaced(-2.2, 3.6, 14, 'both');
    const fb = loftBody(T, (z) => { const u = z > 2.6 ? (z - 2.6) / 1.0 : z < -1.2 ? (-1.2 - z) / 1.0 : 0; const e = Math.sqrt(Math.max(0.02, 1 - Math.min(1, u) ** 2)); return { w: 1.25 * Math.pow(e, 0.6), ht: 0.42 * e, hb: 0.2, y: 1.35, n: 2.6 }; }, { zs: fz, seg: 24 });
    camoOf(fb.geo); mesh(fb.geo, skin);
  }
  // Lights at the tips (red to port, +X), strobes, landing lights in the leading edge; walkway lines, the spoilers.
  lampAt('port', 0.13, SPAN - 0.05, wY(SPAN), wLE(SPAN) - 0.75).userData.lamp = 'port';
  lampAt('star', 0.13, -SPAN + 0.05, wY(SPAN), wLE(SPAN) - 0.75).userData.lamp = 'star';
  for (const s of [1, -1]) {
    lampAt('strobe', 0.1, s * (SPAN - 0.25), wY(SPAN) + 0.05, wTE(SPAN) + 0.4).userData.lamp = 'strobe';
    lampAt('strobe', 0.12, s * 3.0, wY(3) - 0.18, wLE(3) - 0.06).userData.lamp = 'strobe';
    at(mesh(new T.BoxGeometry(0.22, 0.02, 3.0), M.planeStencil, false), s * 2.9, wY(2.9) + 0.32, 0.6);
    at(mesh(new T.BoxGeometry(2.4, 0.02, 0.45), M.planeDark, false), s * 5.2, wY(5.2) + 0.3, 0.3);
    // flap-track fairings
    for (const x of [3.5, 7.1, 11.0, 14.2]) { const f = mesh(new T.SphereGeometry(1, 10, 6), M.planeTrim, false); at(f, s * x, wY(x) - 0.28, wTE(x) + 0.6); f.scale.set(0.07, 0.12, 0.8); }
  }
  // --- The engines --------------------------------------------------------------------------------------------------
  const nzs = [...new Set([...spaced(-1.3, 1.2, 10, 'none'), ...spaced(1.2, 4.7, 6, 'none'), ...spaced(4.7, 5.9, 6, 'end')].map((v) => +v.toFixed(4)))].sort((a, b) => a - b);
  for (const x of [-9.4, -4.9, 4.9, 9.4]) {
    const ny = wY(x) - 0.62;
    const nb = loftBody(T, nacelle, { zs: nzs, seg: 24 });
    nb.geo.translate(x, ny, 0);
    camoOf(nb.geo, (px, y, z) => { const p = nacelle(z); return smoothstep(ny + p.y - p.hb * 0.2, ny + p.y - p.hb * 0.6, y); });
    mesh(nb.geo, skin);
    const nbody = { surf: (z, a, off, out) => nb.surf(z, a, off, out).add(new T.Vector3(x, ny, 0)), norm: nb.norm };
    mesh(skinBand(T, nbody, 5.86, 0.12, -P, P, 0.006, 24), M.planeDark, false);                    // the cowl lip
    for (const z of [4.3, 2.7]) mesh(skinBand(T, nbody, z, 0.02, -P, P, 0.004, 24), rubber, false); // cowl panel seams
    const intake = mesh(new T.SphereGeometry(1, 14, 8, 0, P * 2, 0, H), rubber, false); at(intake, x, ny - 0.62, 5.72, H); intake.scale.set(0.3, 0.12, 0.14);
    // the exhaust on the outboard top of the nacelle, and its soot streak back over the wing
    const side = Math.sign(x);
    const ex = mesh(new T.CylinderGeometry(0.17, 0.2, 0.5, 12, 1, true), M.planeDark, false);
    const ep = nbody.surf(0.4, side > 0 ? 0.55 : P - 0.55, 0.02); at(ex, ep.x, ep.y, ep.z, -H + 0.25);
    mesh(skinPatch(T, nbody, -1.1, 0.25, (side > 0 ? 0.55 : P - 0.55) - 0.25, (side > 0 ? 0.55 : P - 0.55) + 0.25, 0.005, { nz: 5, na: 4, round: 1 }), soot, false);
    const spin = mesh(new T.LatheGeometry([[0, 0], [0.36, 0], [0.355, 0.15], [0.31, 0.38], [0.22, 0.6], [0.11, 0.78], [0, 0.88]].map(([r, h]) => new T.Vector2(r, h)), 20), M.planeMetal);
    at(spin, x, ny, 5.88, H);
    const prop = new T.Group(); prop.name = 'cargo-prop'; prop.position.set(x, ny, 6.12); g.add(prop);
    const blades = new T.Mesh(paddleBlades(T, new T.Color(M.planeDark.color), new T.Color(M.planeStencil.color)), bladeMat); blades.castShadow = true; blades.receiveShadow = true; prop.add(blades);
    const d = new T.Mesh(new T.RingGeometry(0.4, 2.05, 24), discMat); d.userData.disc = true; d.position.z = 0.05; prop.add(d);
  }
  // Drop tanks on pylons between the engines.
  const tzz = spaced(-2.4, 3.1, 16, 'both');
  for (const s of [1, -1]) {
    const x = s * 7.1, ty = wY(7.1) - 1.05;
    const tk = loftBody(T, dropTank, { zs: tzz, seg: 18 }); tk.geo.translate(x, ty, 0.2);
    camoOf(tk.geo, (px, y) => smoothstep(ty, ty - 0.3, y)); mesh(tk.geo, skin);
    const py = airfoilPanel(T, { s0: ty + 0.3, s1: wY(7.1) - 0.1, axis: 'y', at: () => ({ le: 1.6, c: 2.1, t: 0.12, x }), steps: 2 });
    camoOf(py); mesh(py, skin);
    for (const z of [1.5, 0.9]) mesh(skinBand(T, { surf: (zz, a, off, out) => tk.surf(zz, a, off, out).add(new T.Vector3(x, ty, 0.2)), norm: tk.norm }, z - 0.2, 0.02, -P, P, 0.004, 18), rubber, false);
  }
  // --- The tail ----------------------------------------------------------------------------------------------------
  const fLE = (y) => -9.55 - (y - 1.2) * 0.56, fTE = () => -13.95, fC = (y) => fLE(y) - fTE(y);
  const fsec = (y) => ({ le: fLE(y), c: fC(y), t: 0.12, x: 0 });
  const finGeo = joinGeos(T, [
    airfoilPanel(T, { s0: 1.0, s1: 6.45, axis: 'y', at: fsec, to: 0.7, steps: 12, round: 0.3 }),
    airfoilPanel(T, { s0: 1.0, s1: 2.3, axis: 'y', at: (y) => { const u = (y - 1.0) / 1.3; const le = mix(-6.6, fLE(y) + 0.02, Math.pow(u, 0.55)); return { le, c: le - (fLE(y) - 0.9), t: 0.06, x: 0 }; }, steps: 6, round: 0.15 })
  ]);
  camoOf(finGeo); mesh(finGeo, skin);
  const rud = airfoilPanel(T, { s0: 1.5, s1: 6.35, axis: 'y', at: fsec, from: 0.73, to: 1, steps: 8, cn: 6, round: 0.25 }); camoOf(rud); mesh(rud, skin);
  const sY = 1.78, sLE = (x) => -11.0 - Math.abs(x) * 0.26, sTE = (x) => -13.95 + Math.abs(x) * 0.05;
  const ssec = (x) => ({ le: sLE(x), c: sLE(x) - sTE(x), t: 0.11, y: sY + Math.abs(x) * 0.01 });
  for (const s of [1, -1]) {
    const st = airfoilPanel(T, { s0: 0, s1: s * 5.3, at: ssec, to: 0.7, steps: 10, round: 0.25 }); camoOf(st, (x, y) => smoothstep(sY + 0.02, sY - 0.05, y)); mesh(st, skin);
    const el = airfoilPanel(T, { s0: s * 0.3, s1: s * 5.1, at: ssec, from: 0.73, to: 1, steps: 6, cn: 6, round: 0.2 }); camoOf(el, (x, y) => smoothstep(sY + 0.02, sY - 0.05, y)); mesh(el, skin);
  }
  lampAt('strobe', 0.14, 0, 6.5, fLE(6.45) - 0.9).userData.lamp = 'strobe';
  lampAt('strobe', 0.11, 0, 3.9, -14.05).userData.lamp = 'strobe';
  // --- Aerials, beacons, pitots ------------------------------------------------------------------------------------
  lampAt('beacon', 0.13, 0, 1.82, -2.6).userData.lamp = 'beacon';
  lampAt('beacon', 0.13, 0, -1.48, -1.6).userData.lamp = 'beacon';
  at(mesh(new T.BoxGeometry(0.06, 0.55, 0.5), M.planeDark, false), 0, 1.65, -3.6, -0.3);
  at(mesh(new T.BoxGeometry(0.06, 0.42, 0.4), M.planeDark, false), 0, -1.6, 4.2, 0.3);
  g.add(tubeAB(T, [0, 1.85, -3.2], [0, 4.6, fLE(4.6) - 0.1], 0.02, M.planeDark));
  for (const s of [-1, 1]) g.add(tubeAB(T, [s * 0.5, -0.3, 11.2], [s * 0.5, -0.3, 12.2], 0.03, M.planeMetal));
  // --- Stencils ----------------------------------------------------------------------------------------------------
  const decal = (tex, geo) => { if (!tex) return null; const m = new T.Mesh(geo, new T.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 })); g.add(m); return m; };
  const serial = stencilTexture(T, 'PGB 61-2207', { w: 512, h: 96, font: 'bold 70px "Arial Narrow", Arial, sans-serif' });
  if (serial) for (const s of [1, -1]) { const m = decal(serial, new T.PlaneGeometry(2.1, 0.4)); m.position.set(s * 0.215, 2.75, -11.75); m.rotation.y = s * H; }
  const roundel = stencilTexture(T, '', { w: 128, h: 128, draw: (c) => {
    c.fillStyle = 'rgba(32,36,22,0.95)'; c.beginPath(); c.arc(64, 64, 60, 0, P * 2); c.fill();
    c.fillStyle = 'rgba(200,190,150,0.9)'; c.beginPath(); c.arc(64, 64, 44, 0, P * 2); c.fill();
    c.fillStyle = 'rgba(46,52,30,1)'; c.beginPath(); c.moveTo(64, 28); c.lineTo(96, 84); c.lineTo(64, 70); c.lineTo(32, 84); c.closePath(); c.fill();
  } });
  if (roundel) {
    decal(roundel, skinPatch(T, body, -6.9, -5.6, 0.05, 0.62, 0.01, { nz: 3, na: 3 }));
    decal(roundel, skinPatch(T, body, -5.6, -6.9, P - 0.05, P - 0.62, 0.01, { nz: 3, na: 3 }));
    for (const s of [1, -1]) { const r = decal(roundel, new T.PlaneGeometry(1.8, 1.8)); r.rotation.x = -H; r.position.set(s * 13.5, wY(13.5) + 0.25, 0.6); r.rotation.z = s * -0.035; }
  }
  // One mesh per material for the still parts; the props, the bay ramp's group and the decals stay as they are.
  mergeStatic(T, g, (o) => o.name === 'cargo-prop' || (o.material && o.material.transparent));
  // Tag what each plane swaps for its own, and mark the geometry shared.
  g.traverse((o) => {
    if (o.isMesh && !(o.material && o.material.transparent)) o.receiveShadow = true;
    for (const [k, m] of Object.entries(lampMat)) if (o.material === m) o.userData.lamp = k;
    if (o.material === discMat) o.userData.disc = true;
    if (o.geometry) o.geometry.userData.shared = true;
  });
  return g;
}

// Four broad paddle blades with painted tips; one geometry in the prop's frame (the disc in XY).
function paddleBlades(T, dark, tip) {
  const geos = [];
  for (let k = 0; k < 4; k++) {
    const geo = new T.BoxGeometry(0.3, 1.78, 0.06, 2, 14, 1);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) + 0.89) / 1.78;
      let x = p.getX(i), z = p.getZ(i);
      const wdt = (t < 0.1 ? 0.5 + 0.5 * (t / 0.1) : 1 - 0.15 * (t - 0.1)) * (t > 0.92 ? Math.sqrt(Math.max(0.1, 1 - ((t - 0.92) / 0.08) ** 2)) : 1);
      x *= wdt; z *= 1 - 0.5 * t;
      const tw = 0.6 - 0.45 * t, c = Math.cos(tw), s = Math.sin(tw);
      p.setXYZ(i, x * c - z * s, 0.3 + t * 1.75, x * s + z * c);
      const cc = t > 0.88 ? tip : dark; col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    geo.rotateZ((k / 4) * Math.PI * 2 + Math.PI / 4);
    geos.push(geo);
  }
  const hub = new T.CylinderGeometry(0.3, 0.32, 0.3, 16).rotateX(Math.PI / 2);
  hub.setAttribute('color', new T.BufferAttribute(new Float32Array(hub.attributes.position.count * 3).fill(0.3), 3));
  geos.push(hub);
  return joinGeos(T, geos);
}
