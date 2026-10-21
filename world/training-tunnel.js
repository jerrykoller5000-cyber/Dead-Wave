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
  const floor = new T.MeshBasicMaterial({ color: 0x0c0c0e });
  const black = new T.MeshBasicMaterial({ color: 0x000000 });
  const plane = (w, h, mat, x, y, z, rx, ry) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.castShadow = false; m.receiveShadow = false; g.add(m); return m;
  };
  // A plane faces +z before it is turned. Floor up, ceiling down, the side walls inward, the back wall at the room.
  plane(W, L, floor, cx, floorY + 0.01, z0 + L / 2, -Math.PI / 2, 0);
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
