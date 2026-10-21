// GB-162 (Jerry, 2026-10-12: "lets do the ones for the build room. Ground needs to be riddled with bullet holes from the
// miniguns on the wall. Dried old bloodstains around. Marks of all different kinds. Old acid splotches from the
// spitters. Old spiderwebs. Flame and burn marks. Not crazy but to the point where it definitely tells a story.")
//
// The build room has been a killing floor for a long time. The four wall miniguns (game/training-containment.js,
// containmentMounts) have chewed the floor where zombies come in from the gate and where they fall: holes, spalls and
// gouges stretched away from the gun that fired them, strafing arcs, brass stains and soot under each mount. Old blood,
// dried brown: pools with darker rims, drips, smears, drag trails, a boot and a hand print, streaks half mopped. Old
// spitter acid etched into the paint: faded yellow-green rings, pitting, drip runs low on the walls. Burn marks: soot
// fans, scorched patches, char up the walls, a melted spot. Scuffs, drags, claw scratches, grime, debris. A few old
// cobwebs in the corners, under the tile ledge and behind the gun mounts.
//
// GB-163 (Jerry: "Remove about half of the decals from the build room. The look is great, just need less."): every
// count halved, the kill zones and the layout kept.
//
// Visual only and cheap: one floor sheet (under the build grid's paint), six wall sheets (each falls into its wall's
// cutaway side, so they fade with the wall), and the cobwebs on one shared texture (baked to one draw). Seeded: every
// build looks the same.
//
//   dressBuildWear(THREE, { B, D, gate, add, std, texture }) -> { parts: [name], decals: [mesh], mounts }

import { containmentMounts } from '../game/training-containment.js';

export const BUILD_WEAR = Object.freeze({
  FLOOR_PX: 40, WALL_PX: 24, WALL_H: 5.9, FLOOR_Y: 0.003,
  KILL: Object.freeze([                                   // where they fall: [x, z, spread, weight] (room local, metres)
    Object.freeze([-26, 16.5, 3.4, 1.0]),                 // just past the gate's hazard paint, where they come through
    Object.freeze([-26, 13, 5.0, 0.8]),                   // the middle of the room
    Object.freeze([-17, 2, 4.0, 0.55]),                   // toward the doorway where he stands to fight
    Object.freeze([-35, 6, 4.0, 0.35])                    // the west side
  ])
});

function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const gauss = (r) => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(6.2832 * r());

export function dressBuildWear(T, { B, D, gate, add, std, texture }) {
  const parts = [], decals = [];
  const tex = (w, h, draw) => (texture ? texture(w, h, draw) : null);
  const mat = (map) => std({ color: 0xffffff, map, transparent: true, depthWrite: false, roughness: 0.92, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const mounts = containmentMounts(B, 0);
  const W = B.maxX - B.minX, L = B.maxZ - B.minZ, FS = BUILD_WEAR.FLOOR_PX, WS = BUILD_WEAR.WALL_PX, WH = BUILD_WEAR.WALL_H;

  // ---- one kit of marks, shared by the floor and the walls
  const kit = (c, r) => {
    const jag = (u, v, rad, n, wob, sx = 1, sy = 1, rot = 0) => {
      c.beginPath();
      for (let k = 0; k < n; k++) { const a = k / n * 6.2832 + r() * 0.3, d = rad * (1 - wob + r() * wob * 2), x = Math.cos(a) * d * sx, y = Math.sin(a) * d * sy;
        const X = u + x * Math.cos(rot) - y * Math.sin(rot), Y = v + x * Math.sin(rot) + y * Math.cos(rot); k ? c.lineTo(X, Y) : c.moveTo(X, Y); }
      c.closePath();
    };
    const soft = (u, v, rad, rgb, a, sy = 1) => { c.save(); c.translate(u, v); c.scale(1, sy); const g = c.createRadialGradient(0, 0, 0, 0, 0, rad); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = g; c.fillRect(-rad, -rad, rad * 2, rad * 2); c.restore(); };
    // A round into concrete: an elongated pock away from the gun (shallow hits stretch), a spalled rim, a dark core.
    const hole = (u, v, s, ang, stretch) => {
      if (r() < 0.4) soft(u, v, s * 3, '45,42,38', 0.12 + r() * 0.12);
      c.fillStyle = `rgba(${150 + (r() * 20 | 0)},${150 + (r() * 16 | 0)},${146 + (r() * 14 | 0)},0.85)`; jag(u, v, s * (1.4 + r() * 0.8), 7, 0.45, stretch, 1, ang); c.fill();
      c.fillStyle = 'rgba(14,14,15,0.92)'; jag(u + Math.cos(ang) * s * 0.3, v + Math.sin(ang) * s * 0.3, s * 0.55, 6, 0.3, stretch * 0.8, 1, ang); c.fill();
      if (r() < 0.35) { c.strokeStyle = 'rgba(60,60,62,0.5)'; c.lineWidth = 0.7; for (let k = 0; k < 3; k++) { const a = r() * 6.28; c.beginPath(); c.moveTo(u, v); c.lineTo(u + Math.cos(a) * s * (2 + r() * 2), v + Math.sin(a) * s * (2 + r() * 2)); c.stroke(); } }
    };
    const gouge = (u, v, s, ang) => {
      const len = s * (5 + r() * 10); c.save(); c.translate(u, v); c.rotate(ang + (r() - 0.5) * 0.25);
      const g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, 'rgba(18,18,20,0.85)'); g.addColorStop(0.35, 'rgba(160,160,154,0.7)'); g.addColorStop(1, 'rgba(160,160,154,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, -s * 0.5); c.quadraticCurveTo(len * 0.4, -s * 0.55, len, 0); c.quadraticCurveTo(len * 0.4, s * 0.5, 0, s * 0.5); c.fill(); c.restore();
    };
    // Dried blood: brown to maroon, a darker rim where it dried first, satellites, some half mopped.
    const BLOOD = ['92,30,22', '78,26,20', '104,40,26', '66,24,18', '88,44,30'];
    const pool = (u, v, rad) => {
      const col = BLOOD[(r() * BLOOD.length) | 0], rot = r() * 6.28, sy = 0.55 + r() * 0.45;
      c.fillStyle = `rgba(${col},${0.3 + r() * 0.22})`; jag(u, v, rad, 11, 0.35, 1, sy, rot); c.fill();
      c.strokeStyle = `rgba(40,14,10,${0.2 + r() * 0.22})`; c.lineWidth = 1 + r() * 1.5; c.stroke();
      for (let k = 0, n = 4 + (r() * 10 | 0); k < n; k++) { const a = r() * 6.28, d = rad * (1.1 + r() * 1.2); c.fillStyle = `rgba(${col},${0.4 + r() * 0.3})`; jag(u + Math.cos(a) * d, v + Math.sin(a) * d * sy, 1 + r() * rad * 0.12, 6, 0.4); c.fill(); }
      if (r() < 0.4) mopped(u, v, rad * 2.2, col);
    };
    const mopped = (u, v, len, col) => {   // arcs of thinned blood where someone swept at it
      for (let k = 0; k < 5; k++) { c.strokeStyle = `rgba(${col},${0.06 + r() * 0.1})`; c.lineWidth = 3 + r() * 8; c.beginPath(); const a = r() * 6.28; c.arc(u + (r() - 0.5) * len * 0.3, v + (r() - 0.5) * len * 0.3, len * (0.4 + r() * 0.5), a, a + 0.8 + r()); c.stroke(); }
    };
    const drag = (u, v, ang, len, wid) => {   // a body hauled: two smeared tracks with breaks and fingers
      const col = BLOOD[(r() * BLOOD.length) | 0];
      for (let s = 0; s < len; s += 2) {
        if (r() < 0.12) continue;
        const t = s / len, x = u + Math.cos(ang) * s + Math.sin(t * 9) * wid * 0.2, y = v + Math.sin(ang) * s + Math.cos(t * 7) * wid * 0.2;
        c.fillStyle = `rgba(${col},${(1 - t) * 0.22 + 0.04})`; c.beginPath(); c.ellipse(x, y, wid * (0.6 + r() * 0.5), wid * 0.25, ang, 0, 6.28); c.fill();
      }
    };
    const print = (u, v, ang, hand) => {
      const col = BLOOD[(r() * BLOOD.length) | 0]; c.save(); c.translate(u, v); c.rotate(ang); c.fillStyle = `rgba(${col},${0.35 + r() * 0.25})`;
      if (hand) { c.beginPath(); c.ellipse(0, 0, 4.5, 5.5, 0, 0, 6.28); c.fill(); for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(-5 + k * 2.6, -7 - (k === 0 ? -3 : Math.abs(2 - k) * -0.8), 1.1, 3.2, (k - 2) * 0.2, 0, 6.28); c.fill(); } }
      else { for (let k = 0; k < 7; k++) if (r() > 0.2) c.fillRect(-2.5, -8 + k * 2.2, 5, 1.3); c.beginPath(); c.ellipse(0, 9, 2.6, 2.4, 0, 0, 6.28); c.fill(); }
      c.restore();
    };
    // Spitter acid: an etched ring, faded yellow-green, the paint eaten through and pitted.
    const acid = (u, v, rad) => {
      const sy = 0.6 + r() * 0.4, rot = r() * 6.28;
      c.fillStyle = `rgba(${170 + (r() * 20 | 0)},${166 + (r() * 20 | 0)},${140 + (r() * 16 | 0)},0.36)`; jag(u, v, rad, 12, 0.3, 1, sy, rot); c.fill();   // bare, bleached concrete
      c.strokeStyle = `rgba(${150 + (r() * 30 | 0)},${170 + (r() * 20 | 0)},60,${0.2 + r() * 0.2})`; c.lineWidth = 1 + r() * 1.5; c.stroke();     // the yellow-green tide ring
      jag(u, v, rad * 1.15, 12, 0.25, 1, sy, rot); c.strokeStyle = 'rgba(120,140,50,0.15)'; c.lineWidth = 3; c.stroke();
      for (let k = 0, n = 10 + (r() * 25 | 0); k < n; k++) { const a = r() * 6.28, d = Math.sqrt(r()) * rad; c.fillStyle = `rgba(40,44,30,${0.3 + r() * 0.4})`; c.beginPath(); c.arc(u + Math.cos(a) * d, v + Math.sin(a) * d * sy, 0.6 + r() * 1.6, 0, 6.28); c.fill(); }   // pitting
    };
    // Fire: a soot fan, a scorched heart, a melted glossy spot.
    const scorch = (u, v, rad) => {
      soft(u, v, rad * 1.6, '30,26,22', 0.35 + r() * 0.2, 0.7 + r() * 0.3);
      c.fillStyle = `rgba(16,14,12,${0.26 + r() * 0.2})`; jag(u, v, rad * 0.6, 10, 0.45); c.fill();
      for (let k = 0; k < 10; k++) { const a = r() * 6.28, d = rad * (0.4 + r() * 0.9); soft(u + Math.cos(a) * d, v + Math.sin(a) * d, rad * (0.25 + r() * 0.4), '26,22,18', 0.07 + r() * 0.11, 0.6 + r() * 0.4); }   // blotchy, not a star
      for (let k = 0; k < 40; k++) { const a = r() * 6.28, d = Math.sqrt(r()) * rad * 1.2; c.fillStyle = `rgba(${r() < 0.5 ? '12,10,8' : '90,80,64'},${0.2 + r() * 0.3})`; c.fillRect(u + Math.cos(a) * d, v + Math.sin(a) * d, 1 + r() * 2.5, 1 + r() * 2); }   // char flakes and ash
    };
    const melted = (u, v, rad) => { c.fillStyle = 'rgba(24,22,20,0.7)'; jag(u, v, rad, 9, 0.3); c.fill(); c.strokeStyle = 'rgba(120,116,110,0.35)'; c.lineWidth = 1; for (let k = 1; k < 3; k++) { jag(u, v, rad * (0.35 * k), 8, 0.2); c.stroke(); } };
    const claws = (u, v, ang, len) => { c.strokeStyle = `rgba(30,30,32,${0.3 + r() * 0.3})`; c.lineWidth = 1 + r(); for (let k = 0; k < 3 + (r() < 0.5 ? 1 : 0); k++) { const o = (k - 1.5) * 3; c.beginPath(); c.moveTo(u + Math.sin(ang) * o, v - Math.cos(ang) * o); c.quadraticCurveTo(u + Math.cos(ang) * len * 0.5 + Math.sin(ang) * o * 1.2, v + Math.sin(ang) * len * 0.5, u + Math.cos(ang) * len + Math.sin(ang) * o * 0.6, v + Math.sin(ang) * len - Math.cos(ang) * o * 0.6); c.stroke(); } };
    return { jag, soft, hole, gouge, pool, drag, print, acid, scorch, melted, claws, mopped, BLOOD };
  };
  // Where a zombie went down (room local): one of the kill zones, by weight.
  const kills = BUILD_WEAR.KILL, kw = kills.reduce((a, k) => a + k[3], 0);
  const killAt = (r) => { let x = r() * kw, k = kills[0]; for (const z of kills) { if ((x -= z[3]) <= 0) { k = z; break; } } return [k[0] + gauss(r) * k[2], k[1] + gauss(r) * k[2]]; };
  const inRoom = (x, z, m = 0.3) => x > B.minX + m && x < B.maxX - m && z > B.minZ + m && z < B.maxZ - m;
  const inBay = (x, z) => x < B.minX + 7.6 && z < B.minZ + 4.3;   // the infirmary's floor inset covers it anyway

  // ---------- the floor
  const floorTex = tex(W * FS, L * FS, (c) => {
    const r = rng(162), K = kit(c, r), P = (x, z) => [(x - B.minX) * FS, (z - B.minZ) * FS];
    // grime: broad, uneven, heavier along the walls
    for (let n = 0; n < 55; n++) { const [u, v] = P(B.minX + r() * W, B.minZ + r() * L); K.soft(u, v, (0.6 + r() * 2.4) * FS, '60,56,50', 0.04 + r() * 0.06); }
    for (let n = 0; n < 160; n++) { const side = r() * 4 | 0, t = r(); const x = side < 2 ? (side ? B.maxX - 0.3 : B.minX + 0.3) : B.minX + t * W, z = side < 2 ? B.minZ + t * L : (side === 2 ? B.minZ + 0.3 : B.maxZ - 0.3); const [u, v] = P(x, z); K.soft(u, v, (0.3 + r() * 0.8) * FS, '50,46,40', 0.06 + r() * 0.07); }
    // burns first (under the rest): scorched patches where fire went down, a melted spot
    for (let n = 0; n < 3; n++) { const [x, z] = killAt(r); if (!inRoom(x, z, 1) || inBay(x, z)) continue; const [u, v] = P(x, z); K.scorch(u, v, (0.6 + r() * 1.3) * FS); }
    { const [u, v] = P(-31.5, 16.5); K.melted(u, v, 0.35 * FS); }
    // acid: old splotches, mostly toward the gate and the middle
    for (let n = 0; n < 5; n++) { const [x, z] = killAt(r); if (!inRoom(x, z, 0.6) || inBay(x, z)) continue; const [u, v] = P(x, z); K.acid(u, v, (r() < 0.25 ? 0.4 + r() * 0.35 : 0.12 + r() * 0.2) * FS); }
    // minigun fire: holes stretched away from the gun that fired them, densest where they fall; strafing arcs
    const gunFor = (x, z) => mounts[(r() * mounts.length) | 0];
    let holes = 0;
    // GB-165 (Jerry: "a bit too thick ... more sparse and nuanced"): fewer, mostly small and part-faded, a few strong.
    for (let n = 0; n < 400; n++) {
      const [x, z] = r() < 0.8 ? killAt(r) : [B.minX + r() * W, B.minZ + r() * L];
      if (!inRoom(x, z, 0.4) || inBay(x, z)) continue;
      const g = gunFor(x, z), dx = x - g.x, dz = z - g.z, flat = Math.hypot(dx, dz), ang = Math.atan2(dz, dx);
      const stretch = Math.min(3, 1 + flat / 8);                    // farther from the gun: a shallower hit, a longer pock
      const strong = r() < 0.12, [u, v] = P(x, z), s = (strong ? 0.026 + r() * 0.016 : 0.012 + r() * r() * 0.02) * FS;
      c.globalAlpha = strong ? 1 : 0.4 + r() * 0.4;
      if (r() < 0.12) K.gouge(u, v, s, ang); else K.hole(u, v, s, ang, stretch);
      c.globalAlpha = 1;
      holes++;
    }
    for (let n = 0; n < 6; n++) {                                   // strafes: the gun sweeping after a runner
      const g = mounts[n % mounts.length], [kx, kz] = killAt(r), rad = Math.hypot(kx - g.x, kz - g.z), a0 = Math.atan2(kz - g.z, kx - g.x), span = 0.12 + r() * 0.35;
      for (let k = 0, m = 8 + (r() * 16 | 0); k < m; k++) {
        const a = a0 + (k / m - 0.5) * span, rr = rad + gauss(r) * 0.25, x = g.x + Math.cos(a) * rr, z = g.z + Math.sin(a) * rr;
        if (!inRoom(x, z, 0.4) || inBay(x, z)) continue;
        const [u, v] = P(x, z); K.hole(u, v, (0.018 + r() * 0.016) * FS, a, Math.min(3, 1 + rr / 8)); holes++;
      }
    }
    // brass stains and soot under each gun
    for (const g of mounts) {
      const [u, v] = P(g.x, g.z); K.soft(u, v, 1.6 * FS, '40,36,30', 0.22);
      for (let k = 0; k < 35; k++) { const a = r() * 6.28, d = Math.sqrt(r()) * 1.8 * FS; c.strokeStyle = `rgba(${150 + (r() * 40 | 0)},${120 + (r() * 30 | 0)},50,${0.15 + r() * 0.25})`; c.lineWidth = 1; c.beginPath(); c.arc(u + Math.cos(a) * d, v + Math.sin(a) * d, 1 + r() * 1.5, 0, 6.28); c.stroke(); }
    }
    // dried blood: pools where they fell, drag trails toward the gate (hauled out), prints, mopped streaks
    for (let n = 0; n < 7; n++) { const [x, z] = killAt(r); if (!inRoom(x, z, 0.6) || inBay(x, z)) continue; const [u, v] = P(x, z); K.pool(u, v, (r() < 0.25 ? 0.45 + r() * 0.35 : 0.12 + r() * 0.22) * FS); }
    for (let n = 0; n < 3; n++) { const [x, z] = killAt(r); if (!inRoom(x, z, 1)) continue; const [u, v] = P(x, z); const a = Math.atan2(gate.z - z, gate.x - x) + (r() - 0.5) * 0.5; K.drag(u, v, a, (2 + r() * 5) * FS, (0.2 + r() * 0.15) * FS); }
    for (let n = 0; n < 3; n++) { const [x, z] = killAt(r); const [u, v] = P(x, z); const a = r() * 6.28; for (let k = 0; k < 3 + (r() * 3 | 0); k++) K.print(u + Math.cos(a) * k * 0.38 * FS + (k % 2) * 4, v + Math.sin(a) * k * 0.38 * FS, a + Math.PI / 2, false); }
    { const [u, v] = P(-24.2, 9.6); K.print(u, v, 0.4, true); const [u2, v2] = P(-36.4, 4.1); K.print(u2, v2, -0.9, true); }
    for (let n = 0; n < 2; n++) { const [x, z] = killAt(r); const [u, v] = P(x, z); K.mopped(u, v, (0.8 + r() * 1.2) * FS, K.BLOOD[(r() * 5) | 0]); }
    // claw scratches, scuffs and a long drag of something heavy; debris specks over everything
    for (let n = 0; n < 5; n++) { const [x, z] = killAt(r); const [u, v] = P(x, z); K.claws(u, v, r() * 6.28, (0.2 + r() * 0.35) * FS); }
    for (let n = 0; n < 30; n++) { const [x, z] = killAt(r); const [u, v] = P(x, z); c.strokeStyle = `rgba(${18 + (r() * 14 | 0)},${18 + (r() * 10 | 0)},${20 + (r() * 8 | 0)},${0.08 + r() * 0.18})`; c.lineWidth = 1 + r() * 2; c.beginPath(); const a = r() * 6.28, l = (0.06 + r() * 0.2) * FS; c.moveTo(u, v); c.lineTo(u + Math.cos(a) * l, v + Math.sin(a) * l); c.stroke(); }
    for (const off of [-0.25, 0.25]) { c.strokeStyle = 'rgba(60,56,50,0.16)'; c.lineWidth = 2.5; c.beginPath(); for (let t = 0; t <= 1; t += 0.04) { const [u, v] = P(-14 - t * 9 + off * 0.2, 20 - t * 14 + off); t ? c.lineTo(u, v) : c.moveTo(u, v); } c.stroke(); }
    for (let n = 0; n < 380; n++) { const [u, v] = P(B.minX + r() * W, B.minZ + r() * L); c.fillStyle = `rgba(${50 + (r() * 50 | 0)},${46 + (r() * 40 | 0)},${36 + (r() * 12 | 0)},${0.06 + r() * 0.2})`; c.fillRect(u, v, 1 + r() * 2, 1 + r() * 1.5); }
    c.__holes = holes;
  });
  const floor = add(new T.PlaneGeometry(W, L), mat(floorTex), (B.minX + B.maxX) / 2, BUILD_WEAR.FLOOR_Y, (B.minZ + B.maxZ) / 2);
  floor.rotation.set(-Math.PI / 2, 0, 0); floor.renderOrder = 0; decals.push(floor); parts.push('build-floor');

  // ---------- the walls: low and mid, split round the doorway and the gate, each in its wall's cutaway side
  // wall: [name, fixed coordinate, axis it runs along, from, to, yaw, normal sign, seed]
  const gx0 = gate.x - 3.5, gx1 = gate.x + 3.5;
  const WALLS = [
    ['west', B.minX + 0.012, 'z', B.minZ, B.maxZ, Math.PI / 2, 1, 11],
    ['east', B.maxX - 0.012, 'z', D.maxZ + 0.3, B.maxZ, -Math.PI / 2, -1, 12],
    ['south', B.minZ + 0.012, 'x', B.minX, B.maxX, 0, 1, 13],
    ['north-w', B.maxZ - 0.012, 'x', B.minX, gx0, Math.PI, -1, 14],
    ['north-e', B.maxZ - 0.012, 'x', gx1, B.maxX, Math.PI, -1, 15]
  ];
  for (const [name, fixed, axis, a0, a1, yaw, ns, seed] of WALLS) {
    const len = a1 - a0;
    // canvas u along the plane's local +x: west (yaw +90) runs -z, east +z, south +x, north -x
    const U = (a) => ((yaw === Math.PI / 2 || yaw === Math.PI) ? a1 - a : a - a0) * WS, V = (y) => (WH - y) * WS;
    const map = tex(Math.ceil(len * WS), Math.ceil(WH * WS), (c, w, h) => {
      const r = rng(seed * 97), K = kit(c, r);
      for (let n = 0; n < len * 2; n++) K.soft(U(a0 + r() * len), V(r() * 0.4), (0.3 + r() * 0.6) * WS, '50,46,40', 0.08 + r() * 0.08, 0.5);   // grime at the base
      // char streaks up from where fire burned against it
      for (let n = 0; n < Math.round(len / 26); n++) { const a = a0 + r() * len, u = U(a), h0 = (1.5 + r() * 2.5) * WS; for (let k = 0; k < 8; k++) { const g = c.createLinearGradient(0, V(0), 0, V(0) - h0 * (0.5 + r() * 0.5)); g.addColorStop(0, 'rgba(18,16,14,0.55)'); g.addColorStop(1, 'rgba(18,16,14,0)'); c.fillStyle = g; const x = u + (r() - 0.5) * 0.9 * WS; c.beginPath(); c.moveTo(x - 0.25 * WS, V(0)); c.quadraticCurveTo(x + (r() - 0.5) * 0.4 * WS, V(0) - h0 * 0.5, x + (r() - 0.5) * 0.3 * WS, V(0) - h0); c.quadraticCurveTo(x + 0.1 * WS, V(0) - h0 * 0.4, x + 0.25 * WS, V(0)); c.fill(); } }
      // acid drip runs, low
      for (let n = 0; n < Math.round(len / 16); n++) { const u = U(a0 + r() * len), y0 = 0.4 + r() * 1.1; K.acid(u, V(y0), (0.08 + r() * 0.16) * WS); for (let k = 0; k < 3; k++) { const x = u + (r() - 0.5) * 0.2 * WS, g = c.createLinearGradient(0, V(y0), 0, V(y0) + (0.2 + r() * 0.6) * WS); g.addColorStop(0, 'rgba(150,170,70,0.4)'); g.addColorStop(1, 'rgba(150,170,70,0)'); c.fillStyle = g; c.fillRect(x, V(y0), 1.5 + r() * 2, (0.2 + r() * 0.6) * WS); } }
      // blood: spatter and runs at body height
      for (let n = 0; n < Math.round(len / 20); n++) { const u = U(a0 + r() * len), y = 0.4 + r() * 1.3; K.pool(u, V(y), (0.06 + r() * 0.18) * WS); for (let k = 0; k < 4; k++) { const x = u + (r() - 0.5) * 0.25 * WS, l = (0.15 + r() * 0.7) * WS, g = c.createLinearGradient(0, V(y), 0, V(y) + l); g.addColorStop(0, 'rgba(80,26,20,0.55)'); g.addColorStop(1, 'rgba(80,26,20,0)'); c.fillStyle = g; c.fillRect(x, V(y), 1 + r() * 1.5, l); } }
      if (r() < 0.35) { const u = U(a0 + r() * len); K.print(u, V(1.1 + r() * 0.4), (r() - 0.5) * 0.6, true); }
      // the miniguns' misses: holes low on the walls, stretched sideways
      for (let n = 0; n < len * 0.9; n++) { const a = a0 + r() * len, y = Math.abs(gauss(r)) * 0.9 + 0.1; if (y > 3) continue; K.hole(U(a), V(y), (0.012 + r() * 0.01) * WS, (r() - 0.5) * 0.4 + (r() < 0.5 ? 0 : Math.PI), 1 + r()); }
      for (let n = 0; n < len / 10; n++) K.claws(U(a0 + r() * len), V(0.4 + r() * 1.6), Math.PI / 2 + (r() - 0.5) * 0.6, (0.2 + r() * 0.3) * WS);
      // soot fan round this wall's gun mount
      for (const g of mounts) { const a = axis === 'z' ? g.z : g.x, near = axis === 'z' ? Math.abs(g.x - fixed) < 1.2 : Math.abs(g.z - fixed) < 1.2; if (!near || a < a0 || a > a1) continue; K.soft(U(a), V(5.5), 1.1 * WS, '24,22,20', 0.5, 0.8); for (let k = 0; k < 10; k++) { const x = U(a) + (r() - 0.5) * 1.6 * WS, y = V(5.5) + r() * 1.4 * WS; c.fillStyle = `rgba(${150 + (r() * 40 | 0)},${120 + (r() * 30 | 0)},50,0.35)`; c.fillRect(x, y, 2, 2); } }
    });
    const cx = axis === 'z' ? fixed : (a0 + a1) / 2, cz = axis === 'z' ? (a0 + a1) / 2 : fixed;
    const m = add(new T.PlaneGeometry(len, WH), mat(map), cx, WH / 2, cz); m.rotation.y = yaw; decals.push(m); parts.push('build-wall-' + name);
  }

  // ---------- old cobwebs: one texture, a handful of quads (baked to one draw)
  const webTex = tex(256, 256, (c) => {
    const r = rng(7);
    c.strokeStyle = 'rgba(225,228,230,0.32)'; c.lineWidth = 1;
    const spokes = 9, ang = []; for (let k = 0; k < spokes; k++) ang.push(k / (spokes - 1) * Math.PI / 2 + (r() - 0.5) * 0.08);   // a corner web: a quarter fan from (0,0)
    for (const a of ang) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 250, Math.sin(a) * 250); c.stroke(); }
    for (let d = 14; d < 240; d += 9 + r() * 10) { c.beginPath(); ang.forEach((a, i) => { const rr = d * (0.9 + r() * 0.2); const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? c.quadraticCurveTo(Math.cos(a - 0.1) * rr * 0.92, Math.sin(a - 0.1) * rr * 0.92, x, y) : c.moveTo(x, y); }); c.stroke(); }
    c.strokeStyle = 'rgba(220,222,224,0.22)'; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(r() * 200, r() * 200); c.lineTo(r() * 256, r() * 256); c.stroke(); }   // torn strands
    c.fillStyle = 'rgba(200,200,196,0.25)'; for (let k = 0; k < 20; k++) c.fillRect(r() * 180, r() * 180, 1.5, 1.5);   // dust caught in it
  });
  const webMat = std({ color: 0xffffff, map: webTex, transparent: true, depthWrite: false, side: T.DoubleSide, roughness: 1, metalness: 0 });
  // A corner web spans the corner diagonally: its (0,0) in the corner itself.
  const web = (x, y, z, ry, rz, size) => { const m = add(new T.PlaneGeometry(size, size), webMat, x, y, z); m.rotation.set(0, ry, rz); parts.push('build-web'); decals.push(m); return m; };
  const C = [[B.minX, B.minZ, Math.PI / 4], [B.maxX, B.minZ, -Math.PI / 4], [B.minX, B.maxZ, 3 * Math.PI / 4], [B.maxX, B.maxZ, -3 * Math.PI / 4]];
  C.forEach(([x, z, ry], i) => {
    const ix = x + Math.sign(B.minX + B.maxX - 2 * x) * 0.32, iz = z + Math.sign(B.minZ + B.maxZ - 2 * z) * 0.32;
    if (i !== 1 && i !== 3) web(ix, 5.62, iz, ry, Math.PI, 0.9 + i * 0.15);          // up under the tile ledge
    if (i !== 2 && i !== 0) web(ix, 0.42, iz, ry, 0, 0.6 + i * 0.1);                  // down at the floor
  });
  for (const g of mounts.slice(0, 1)) {                                    // GB-165: behind one gun mount (5 webs in all)
    const ry = g.wall === 'west' ? Math.PI / 2 : g.wall === 'east' ? -Math.PI / 2 : g.wall === 'north' ? Math.PI : 0;
    const back = { west: [-0.55, 0], east: [0.55, 0], south: [0, -0.55], north: [0, 0.55] }[g.wall];
    web(g.x + back[0] + (g.wall === 'west' || g.wall === 'east' ? 0 : 0.5), 5.0, g.z + back[1] + (g.wall === 'west' || g.wall === 'east' ? 0.5 : 0), ry, Math.PI / 2, 0.7);
  }
  return { parts, decals, mounts };
}
