// CL-171 (Jerry: "Have the zombies that are coming out of the gate start their walk cycle further out and have them
// come out of the gate in a line. It should be as if there is a dark tunnel behind the gate that they are walking out
// of and the cycle of walking has already begun as they emerge. Do not let players see the zombies or their holding
// tunnel by rotation of camera. They should be invisible.")
//
// A holding tunnel behind the Training Ground's containment gate. It is dark inside: black veils hang across it every
// so often, so a zombie deeper in is behind more of them and comes out of the dark as it walks to the mouth. Every
// face points into the tunnel or at the room, and the host shows the tunnel (and the zombies in it) only while the
// camera is on the room's side of the gate wall, so no turn of the camera shows it from outside or from above.
// No game state. World coordinates: passage = tg.releaseGate.passage { x, wallZ, halfWidth, height }; the room is on
// the -z side of wallZ.

import { getTrainingPBR } from './training-textures.js';
export const TUNNEL = Object.freeze({
  length: 14,          // metres behind the gate wall
  veils: 7,            // black veils across it
  veilFrom: 0.7,       // the first, this far behind the wall
  veilStep: 0.6,       // and one every this far after it
  veilOpacity: 0.3,
  showDepth: 4.6,      // a zombie deeper than this behind the wall is not drawn at all (behind every veil)
  startDepth: 5.4,     // where the first in line starts walking
  minGap: 1.5          // the least room between two in the line (a bigger body takes more)
});

// Where each of `kinds` (their radii) starts: one behind the other down the middle of the tunnel.
export function tunnelLine(passage, radii) {
  const out = [];
  let d = TUNNEL.startDepth;
  for (let i = 0; i < radii.length; i++) {
    const r = radii[i] || 0.42;
    if (i > 0) d += Math.max(TUNNEL.minGap, (radii[i - 1] || 0.42) + r + 0.7);
    out.push({ x: passage.x, z: passage.wallZ + d });
  }
  return out;
}

// How far into the dark a point is (0 at the wall's room face, more the deeper in), and how much of it shows from
// the room: each veil in front of it takes veilOpacity.
export function tunnelDepth(passage, z) { return z - passage.wallZ; }
export function veilsInFront(depth) {
  let n = 0;
  for (let i = 0; i < TUNNEL.veils; i++) if (depth > TUNNEL.veilFrom + i * TUNNEL.veilStep) n++;
  return n;
}
export function tunnelShows(depth, cameraInRoom) { return !!cameraInRoom && depth < TUNNEL.showDepth; }
export function cameraInRoom(passage, camZ) { return camZ < passage.wallZ - 0.25; }

export function buildTrainingTunnel(T, passage, floorY) {
  const g = new T.Group(); g.name = 'training-gate-tunnel';
  g.userData.noCull = true;
  const W = passage.halfWidth * 2 + 0.6, H = passage.height + 0.4, L = TUNNEL.length, cx = passage.x, z0 = passage.wallZ + 0.05;
  const dark = new T.MeshBasicMaterial({ color: 0x07070a });   // unlit: the room's lights (and the red alarm) never brighten it
  const pbr = getTrainingPBR(T);
  const floor = new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0x0c0c0e, emissiveIntensity: 1, vertexColors: true,
    ...(pbr ? pbr.tunnelLiner.opts({ normalScale: 1.1 }) : { roughness: 0.9 }) });
  const black = new T.MeshBasicMaterial({ color: 0x000000 });
  const plane = (w, h, mat, x, y, z, rx, ry, heightSegments = 1) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h, 1, heightSegments), mat);
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.castShadow = false; m.receiveShadow = false; g.add(m); return m;
  };
  // A plane faces +z before it is turned. Floor up, ceiling down, the side walls inward, the back wall at the room.
  // The first four metres of steel receive the existing alarm light. Farther in,
  // diffuse response falls to zero, leaving the original unlit tone behind the veils.
  // CH-3 #15 (D-237 item 13): the floor used to step darker at each veil line (each veil takes 30 %), seen as 7 hard
  // bands. Now the floor's own colour steps UP by the same amount right at each veil line (rows doubled there), so
  // behind the veils it fades smoothly to the dark: alarm light falloff x a smooth veil fade. Still one mesh.
  const veilAt = (i) => TUNNEL.veilFrom + i * TUNNEL.veilStep;
  const veilsAt = (d) => { let n = 0; for (let i = 0; i < TUNNEL.veils; i++) if (d > veilAt(i)) n++; return n; };
  const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const steel = new T.Color(0x747b82), keepV = 1 - TUNNEL.veilOpacity;
  const look = (d) => (1 - smooth((d - 0.8) / 3.4)) * Math.pow(keepV, Math.min(TUNNEL.veils, Math.max(0, (d - veilAt(0)) / TUNNEL.veilStep + 0.5)));
  const rows = [];
  for (let k = 0; k <= L * 8; k++) rows.push(k / 8);
  for (let i = 0; i < TUNNEL.veils; i++) rows.push(veilAt(i));
  rows.sort((p, q) => p - q);
  const pos = [], col = [], uv = [], idx = [], nrm = [];
  for (let r = 0; r + 1 < rows.length; r++) {
    const d0 = rows[r], d1 = rows[r + 1]; if (d1 - d0 < 1e-6) continue;
    const n = veilsAt((d0 + d1) / 2), lift = 1 / Math.pow(keepV, n), v = pos.length / 3;
    for (const d of [d0, d1]) for (const sx of [-1, 1]) {
      pos.push(sx * W / 2, L / 2 - d, 0); uv.push((sx * W / 2) / 2.0, d / 2.0); nrm.push(0, 0, 1);
      const c = look(d) * lift; col.push(steel.r * c, steel.g * c, steel.b * c);
    }
    idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
  }
  // CH-3 #15 (D-237 item 13), part 2: the mouth was a black box (flat black walls and roof, no structure). Now the
  // same faded steel lines the walls and the roof, and steel ribs (two posts and a roof beam) stand in the first metres,
  // all in this one mesh (no new draw, no new light). Each rib sits between two veil lines and takes the same lift,
  // so the ribs fade into the dark as smoothly as the floor. Local frame: x across, y = L/2 - depth, z = up.
  const quad = (a, b, c, e, nx, ny, nz, k) => {             // a b c e: corners as [x, depth, up], in order round the face
    const v = pos.length / 3, dm = (Math.min(a[1], b[1], c[1], e[1]) + Math.max(a[1], b[1], c[1], e[1])) / 2, lift = 1 / Math.pow(keepV, veilsAt(dm));
    for (const q of [a, b, c, e]) {
      const d = q[1], cc = look(d) * lift * k;
      const qu = Math.abs(nx) > 0.5 ? d / 2.0 : q[0] / 2.0;
      const qv = Math.abs(nz) > 0.5 ? d / 2.0 : q[2] / 2.0;
      pos.push(q[0], L / 2 - d, q[2]); uv.push(qu, qv); nrm.push(nx, ny, nz); col.push(steel.r * cc, steel.g * cc, steel.b * cc);
    }
    const P = (i) => new T.Vector3(pos[(v + i) * 3], pos[(v + i) * 3 + 1], pos[(v + i) * 3 + 2]);
    const f = P(1).sub(P(0)).cross(P(2).sub(P(0))).dot(new T.Vector3(nx, ny, nz)) > 0;
    if (f) idx.push(v, v + 1, v + 2, v, v + 2, v + 3); else idx.push(v, v + 2, v + 1, v, v + 3, v + 2);
  };
  const lineK = 0.6, roofK = 0.42, ribK = 0.95, hw = W / 2 - 0.004, top = H - 0.004;
  for (let r = 0; r + 1 < rows.length; r++) {             // wall and roof liners, cut at the same rows as the floor
    const d0 = rows[r], d1 = rows[r + 1]; if (d1 - d0 < 1e-6 || d0 > TUNNEL.showDepth + 0.4) continue;
    quad([-hw, d0, 0], [-hw, d1, 0], [-hw, d1, top], [-hw, d0, top], 1, 0, 0, lineK);
    quad([hw, d0, 0], [hw, d1, 0], [hw, d1, top], [hw, d0, top], -1, 0, 0, lineK);
    quad([-hw, d0, top], [hw, d0, top], [hw, d1, top], [-hw, d1, top], 0, 0, -1, roofK);
  }
  const RIB = { at: [0.4, 1.6, 2.8], depth: 0.14, post: 0.2, beam: 0.3 };
  for (const dr of RIB.at) {
    const a = dr - RIB.depth / 2, b = dr + RIB.depth / 2, xi = hw - RIB.post, zb = top - RIB.beam;
    // the room-facing fronts: left post, right post, roof beam
    quad([-hw, a, 0], [-xi, a, 0], [-xi, a, zb], [-hw, a, zb], 0, 1, 0, ribK);
    quad([xi, a, 0], [hw, a, 0], [hw, a, zb], [xi, a, zb], 0, 1, 0, ribK);
    quad([-hw, a, zb], [hw, a, zb], [hw, a, top], [-hw, a, top], 0, 1, 0, ribK);
    // the inner faces of the posts and the underside of the beam (a touch darker: they face away from the room)
    quad([-xi, a, 0], [-xi, b, 0], [-xi, b, zb], [-xi, a, zb], 1, 0, 0, ribK * 0.7);
    quad([xi, a, 0], [xi, b, 0], [xi, b, zb], [xi, a, zb], -1, 0, 0, ribK * 0.7);
    quad([-xi, a, zb], [xi, a, zb], [xi, b, zb], [-xi, b, zb], 0, 0, -1, ribK * 0.55);
  }
  const fg = new T.BufferGeometry();
  fg.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  fg.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3));
  fg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  fg.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  fg.setIndex(idx);
  const mouthFloor = new T.Mesh(fg, floor);
  mouthFloor.position.set(cx, floorY + 0.01, z0 + L / 2); mouthFloor.rotation.set(-Math.PI / 2, 0, 0);
  mouthFloor.castShadow = false; mouthFloor.receiveShadow = false; g.add(mouthFloor);
  mouthFloor.name = 'training-tunnel-floor';
  plane(W, L, dark, cx, floorY + H, z0 + L / 2, Math.PI / 2, 0);
  plane(L, H, dark, cx - W / 2, floorY + H / 2, z0 + L / 2, 0, Math.PI / 2);
  plane(L, H, dark, cx + W / 2, floorY + H / 2, z0 + L / 2, 0, -Math.PI / 2);
  plane(W, H, black, cx, floorY + H / 2, z0 + L, 0, Math.PI);
  // The veils: black, see-through one by one, facing the room; nothing is written to depth, so they stack.
  const veil = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: TUNNEL.veilOpacity, depthWrite: false });
  for (let i = 0; i < TUNNEL.veils; i++) {
    const m = plane(W, H, veil, cx, floorY + H / 2, z0 + TUNNEL.veilFrom + i * TUNNEL.veilStep, 0, Math.PI);
    m.renderOrder = 2;
  }
  g.visible = false;
  return {
    group: g,
    // the camera's side decides; the host calls it every frame
    update(camZ) { g.visible = cameraInRoom(passage, camZ); return g.visible; },
    dispose() { g.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); dark.dispose(); floor.dispose(); black.dispose(); veil.dispose(); }
  };
}
