// world/pit-tentacles.js — what lives under the runes. Claude's (world/*).
//
// The pit's arms are smooth tubes swept along a curve that is rebuilt every frame, not a
// chain of cylinders: a chain shows its joints and can only point at a leg, while a curve
// can be run round it as a helix, which is what a grab looks like. Each arm has a set of
// control points that the scene moves (idle, reaching, coiled, hauling); the tube follows
// a Catmull-Rom through them, tapering to the tip. Vertex colours give it a dark back, a
// pale sucker-lined belly and a run of cold light toward the tip in the colour of the runes.
//
// API:
//   makePitTentacles({ THREE, cx, cz, floorY, ringR, count, glow }) → group
//   tentacleIdle(arm, t, rise)              rise 0..1 out of the abyss, swaying
//   tentacleReach(arm, t, target, coil, w)  reach from the abyss to `target` and coil round
//                                           it (coil: { centre, axis, r, turns, len }); w 0..1
//                                           blends from the idle shape into the reach
//   tentacleUpdate(arm, t)                  rebuild the tube from the arm's current points
import * as THREE from 'three';

const SEGS = 44, RADIAL = 9, CTRL = 11;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3(), _bn = new THREE.Vector3();
const _t0 = new THREE.Vector3(), _t1 = new THREE.Vector3(), _u = new THREE.Vector3(), _v = new THREE.Vector3();
const _col = new THREE.Color();

export function makePitTentacles({ cx, cz, floorY, ringR = 3.2, count = 7, glow = 0x8ef0ff, waterY = 0 }) {
  const g = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.38, metalness: 0.05 });
  const glowMat = new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 3.2, roughness: 0.4 });
  g.userData.mats = [skinMat, glowMat];
  g.userData.arms = [];
  const dark = new THREE.Color(0x1a3a33), belly = new THREE.Color(0x7fb0a0), suck = new THREE.Color(0xd6f4e8), tip = new THREE.Color(glow);
  const glowGeo = new THREE.SphereGeometry(1, 8, 6);
  for (let k = 0; k < count; k++) {
    const a = k * (Math.PI * 2 / count) + 0.35;
    const base = new THREE.Vector3(cx + Math.cos(a) * ringR, floorY, cz + Math.sin(a) * ringR);
    const geo = new THREE.BufferGeometry();
    const nV = (SEGS + 1) * (RADIAL + 1);
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nV * 3), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nV * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nV * 3), 3));
    const idx = [];
    for (let i = 0; i < SEGS; i++) for (let j = 0; j < RADIAL; j++) {
      const p = i * (RADIAL + 1) + j, q = p + RADIAL + 1;
      idx.push(p, q, p + 1, q, q + 1, p + 1);
    }
    geo.setIndex(idx);
    // Tip cap: the last ring collapses to a point (radius 0), so no cap is needed.
    const mesh = new THREE.Mesh(geo, skinMat);
    mesh.castShadow = true; mesh.frustumCulled = false;
    g.add(mesh);
    // Cold light: a lure at the tip and a few spots up the last third.
    const lights = [];
    for (let s = 0; s < 4; s++) {
      const m = new THREE.Mesh(glowGeo, glowMat);
      const r = s === 0 ? 0.075 : 0.04 - s * 0.004;
      m.scale.setScalar(r); m.castShadow = false;
      g.add(m); lights.push(m);
    }
    const arm = {
      base, phase: k * 1.71, size: 0.9 + ((k * 7) % 3) * 0.08, mesh, geo, lights,
      pts: Array.from({ length: CTRL }, () => base.clone()),
      idlePts: Array.from({ length: CTRL }, () => base.clone()),
      reachPts: Array.from({ length: CTRL }, () => base.clone()),
      curve: null, dark, belly, suck, tip, cx, cz, waterY,
      // Bearing out from the pit's centre: the direction an idle arm leans.
      outX: Math.cos(a), outZ: Math.sin(a),
      rise: 0
    };
    arm.curve = new THREE.CatmullRomCurve3(arm.pts, false, 'centripetal', 0.5);
    // `visible`, as the old arm groups had it (t65 reads it).
    Object.defineProperty(arm, 'visible', { get: () => arm.mesh.visible });
    g.userData.arms.push(arm);
    mesh.visible = false;
    for (const l of lights) l.visible = false;
  }
  return g;
}

// --- Shapes -----------------------------------------------------------------------------
// Idle: up out of the abyss, leaning out from the pit and swaying, the tip curling.
export function tentacleIdle(arm, t, rise) {
  const P = arm.idlePts, b = arm.base, ph = arm.phase;
  const H = 17.5 * arm.size;                                        // how far it stands, fully risen
  const r = Math.max(0, Math.min(1, rise));
  const sway = Math.sin(t * 0.8 + ph) * 0.35, sway2 = Math.cos(t * 0.6 + ph * 1.3) * 0.3;
  for (let i = 0; i < CTRL; i++) {
    const u = i / (CTRL - 1);
    // A gentle S: leans out, then back over the pit, the tip curling in.
    // Leans out of the hole, then hooks back in over it like a claw: the tips hang over
    // whatever is in the middle.
    const lean = Math.sin(u * Math.PI * 0.9) * 2.2;
    const curl = Math.max(0, u - 0.6) / 0.4;
    const bend = Math.sin(t * 1.6 + ph + u * 3.0) * 0.35 * u;
    P[i].set(
      b.x + arm.outX * (lean - curl * curl * 4.2) + (sway + bend) * u * -arm.outZ,
      b.y + u * H * r - curl * curl * 2.4,
      b.z + arm.outZ * (lean - curl * curl * 4.2) + (sway2 + bend) * u * arm.outX);
  }
  arm.rise = r;
}
// Reach: from the abyss up through the water to `target`, then a helix round `coil`.
// coil: { centre, axis, r, turns, len } (world). The last control points are the coil and
// a tip that flicks past it.
export function tentacleReach(arm, t, target, coil, w) {
  const P = arm.reachPts, b = arm.base, ph = arm.phase;
  // Perpendicular frame round the coil axis.
  _a.copy(coil.axis).normalize();
  _u.set(0, 1, 0); if (Math.abs(_u.dot(_a)) > 0.9) _u.set(1, 0, 0);
  _u.cross(_a).normalize();
  _v.crossVectors(_a, _u).normalize();
  // Approach: from over the pit, low across the water, coming in from the base's side.
  const ax = target.x - b.x, az = target.z - b.z, ad = Math.hypot(ax, az) || 1;
  const dx = ax / ad, dz = az / ad;
  const surface = arm.waterY;
  const nCoil = 6;                                                   // points spent on the coil
  const nApp = CTRL - nCoil - 1;
  for (let i = 0; i < nApp; i++) {
    const u = i / (nApp - 1);
    // Rises steeply out of the abyss, bows up over the water, drops onto the target.
    const arc = Math.sin(u * Math.PI) * 1.9;
    const y = b.y + (surface + 0.35 - b.y) * Math.min(1, u * 1.35) + arc * (u > 0.35 ? 1 : u / 0.35);
    P[i].set(b.x + dx * ad * u * 0.9, y, b.z + dz * ad * u * 0.9);
    // A wobble so it is not a drawn line.
    P[i].x += Math.sin(t * 5 + ph + u * 6) * 0.12 * u; P[i].z += Math.cos(t * 4.2 + ph + u * 5) * 0.12 * u;
  }
  for (let i = 0; i < nCoil; i++) {
    const u = i / (nCoil - 1);
    const th = u * coil.turns * Math.PI * 2 + (coil.start || 0);
    const h = (u - 0.5) * coil.len;
    P[nApp + i].copy(coil.centre).addScaledVector(_a, h)
      .addScaledVector(_u, Math.cos(th) * coil.r).addScaledVector(_v, Math.sin(th) * coil.r);
  }
  // The tip: past the last turn and up, flicking.
  const last = P[nApp + nCoil - 1];
  P[CTRL - 1].copy(last).addScaledVector(_u, 0.25 * Math.cos(t * 7 + ph)).addScaledVector(_v, 0.25 * Math.sin(t * 7 + ph)).addScaledVector(_a, 0.15);
  P[CTRL - 1].y += 0.25 + 0.1 * Math.sin(t * 9 + ph);
  // Blend from wherever the idle shape has it.
  const k = Math.max(0, Math.min(1, w));
  for (let i = 0; i < CTRL; i++) arm.pts[i].copy(arm.idlePts[i]).lerp(P[i], k);
}
// Use the idle shape as-is.
export function tentacleSettle(arm) { for (let i = 0; i < CTRL; i++) arm.pts[i].copy(arm.idlePts[i]); }

// --- The tube ------------------------------------------------------------------------------
export function tentacleUpdate(arm, t) {
  const geo = arm.geo, pos = geo.attributes.position.array, nrm = geo.attributes.normal.array, col = geo.attributes.color.array;
  const curve = arm.curve;
  const R0 = 0.34 * arm.size, R1 = 0.04;
  // Parallel-transport frame down the curve, so the belly stripe does not twist.
  curve.getPoint(0, _t0); curve.getPoint(1 / SEGS, _t1);
  _a.copy(_t1).sub(_t0).normalize();                      // tangent
  _n.set(0, 1, 0); if (Math.abs(_n.dot(_a)) > 0.95) _n.set(1, 0, 0);
  _bn.crossVectors(_a, _n).normalize(); _n.crossVectors(_bn, _a).normalize();
  let vi = 0;
  const cy = arm.cx, cz = arm.cz;
  for (let i = 0; i <= SEGS; i++) {
    const u = i / SEGS;
    curve.getPoint(u, _t0);
    if (i < SEGS) { curve.getPoint((i + 1) / SEGS, _t1); _c.copy(_t1).sub(_t0); } else { curve.getPoint((i - 1) / SEGS, _t1); _c.copy(_t0).sub(_t1); }
    if (_c.lengthSq() > 1e-10) {
      _c.normalize();
      // Rotate the frame from the old tangent to the new (parallel transport).
      _b.crossVectors(_a, _c);
      const s = _b.length();
      if (s > 1e-6) {
        _b.divideScalar(s);
        const ang = Math.atan2(s, _a.dot(_c));
        _n.applyAxisAngle(_b, ang); _bn.applyAxisAngle(_b, ang);
      }
      _a.copy(_c);
    }
    // Taper, with a swell along the length so it reads as muscle, and a fat root.
    const taper = Math.pow(1 - u, 1.35);
    const swell = 1 + 0.1 * Math.sin(u * 26 + arm.phase + t * 2.2) * (1 - u);
    const r = i === SEGS ? 0 : (R1 + (R0 - R1) * taper) * swell;
    // Belly: the side that faces down and in toward the pit (where the suckers are).
    _b.set(cy - _t0.x, 0, cz - _t0.z); _b.y = -1.6; _b.normalize();
    for (let j = 0; j <= RADIAL; j++) {
      const th = (j / RADIAL) * Math.PI * 2;
      const ct = Math.cos(th), st = Math.sin(th);
      const nx = _n.x * ct + _bn.x * st, ny = _n.y * ct + _bn.y * st, nz = _n.z * ct + _bn.z * st;
      // Suckers: two rows of dimples along the belly, as a ripple of the radius.
      const bellyK = Math.max(0, nx * _b.x + ny * _b.y + nz * _b.z);
      const dimple = bellyK > 0.75 ? 0.06 * Math.max(0, Math.sin(u * 60 + arm.phase)) : 0;
      const rr = r * (1 - dimple);
      pos[vi] = _t0.x + nx * rr; pos[vi + 1] = _t0.y + ny * rr; pos[vi + 2] = _t0.z + nz * rr;
      nrm[vi] = nx; nrm[vi + 1] = ny; nrm[vi + 2] = nz;
      // Colour: dark back, pale belly with sucker rings, and the cold light toward the tip.
      _col.copy(arm.dark).lerp(arm.belly, Math.pow(bellyK, 1.6));
      if (bellyK > 0.8 && Math.sin(u * 60 + arm.phase) > 0.55) _col.lerp(arm.suck, 0.7);
      const lit = Math.max(0, (u - 0.7) / 0.3);
      if (lit > 0) _col.lerp(arm.tip, lit * lit * (0.35 + 0.35 * Math.max(0, Math.sin(u * 40 - t * 6 + arm.phase))));
      col[vi] = _col.r; col[vi + 1] = _col.g; col[vi + 2] = _col.b;
      vi += 3;
    }
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.normal.needsUpdate = true;
  geo.attributes.color.needsUpdate = true;
  geo.computeBoundingSphere();
  // The lights ride the last third.
  const L = arm.lights;
  for (let s = 0; s < L.length; s++) {
    curve.getPoint(1 - s * 0.085, _t0);
    L[s].position.copy(_t0);
    L[s].visible = arm.mesh.visible;
  }
}
export function tentacleShow(arm, on) { arm.mesh.visible = !!on; for (const l of arm.lights) l.visible = !!on; }
export function tentacleTip(arm, out) { return arm.curve.getPoint(1, out || new THREE.Vector3()); }
export function disposeTentacles(g) {
  if (!g) return;
  g.removeFromParent();
  for (const arm of g.userData.arms || []) arm.geo.dispose();
  for (const m of g.userData.mats || []) m.dispose();
}
