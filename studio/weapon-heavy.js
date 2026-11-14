// GP-164: heavy-weapon cosmetic constructors. Existing animation and grip contracts remain in the caller.
import { attachLaserLight } from './weapon-attachments.js';
import { addArtworkInstances, addTriggerArtwork, bindModelArtwork, groupArtwork, optionalArtworkGroup, setArtworkHeatRange } from './weapon-model-hooks.js';
import { markPaintSurface } from './weapon-finish.js';
import { roundGeometry, spentCaseGeometry } from './weapon-casings.js';
import { clipArtworkProfile, fitCollarFaces, trimPanelBack } from './weapon-longarms.js';
import { boxProjectUV } from '../core/geometry.js';
import { weaponDetail, fastenerGeometry } from './weapon-detail.js';
import * as TSL from 'three/tsl';
import { foldStatic } from '../world/bake.js';

// CF-1: screw heads and pin ends from the shared CB-316 geometry, as plain meshes. The batchers merge them by material
// (one draw), and code that measures a part by geometry.boundingBox (the extended magazine's feed line, the carry fit,
// the rack) sees each head at its own size, which a unit InstancedMesh does not give it.
// The CB-316 builders cache their geometry per size; mark what this file draws with them as shared.
function sharedDetail(ctx) {
  const W = weaponDetail(ctx), keep = mesh => { mesh.geometry.userData.shared = true; return mesh; };
  return { chamferBox: (...a) => keep(W.chamferBox(...a)), plate: (...a) => keep(W.plate(...a)), serrations: (...a) => keep(W.serrations(...a)) };
}
const HEAD_AXES = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
function heads(T, parent, mat, kind, items) {
  const geo = fastenerGeometry(T, kind, 0.4), up = new T.Vector3(0, 1, 0), roll = new T.Quaternion();
  geo.userData.shared = true;   // cached and reused: a removed build must not dispose it
  return items.map(it => {
    const mesh = new T.Mesh(geo, mat), n = new T.Vector3(...HEAD_AXES[it.axis || 'x']).multiplyScalar(it.side || 1);
    mesh.quaternion.setFromUnitVectors(up, n).multiply(roll.setFromAxisAngle(up, it.turn || 0));
    mesh.position.set(it.x || 0, it.y || 0, it.z || 0);
    mesh.scale.setScalar(it.r || 0.0016);
    mesh.castShadow = false; mesh.receiveShadow = true;
    mesh.userData.weaponDetail = { kind, item: { ...it } };
    parent.add(mesh);
    return mesh;
  });
}
function pinEnds(T, parent, mat, items) {
  const ends = [];
  for (const it of items) {
    const axis = it.axis || 'x', half = (it.span || 0.02) / 2, a = HEAD_AXES[axis];
    for (const side of [-1, 1]) ends.push({ ...it, axis, side, x: (it.x || 0) + a[0] * side * half, y: (it.y || 0) + a[1] * side * half, z: (it.z || 0) + a[2] * side * half });
  }
  return heads(T, parent, mat, 'pin', ends);
}

// Small closed surface builders use BufferGeometry, also available in the test renderer.
// Shared geometry contains no instance material, colour, animation or game state.
const geometryCaches = new WeakMap();
function geometry(T, key, build, projectUV = false) {
  let cache = geometryCaches.get(T); if (!cache) geometryCaches.set(T, cache = new Map());
  if (cache.has(key)) return cache.get(key);
  const p = [], n = [], uv = [];
  const tri = (a, b, c, na, nb = na, nc = na) => {
    const ab = b.map((v, i) => v - a[i]), ac = c.map((v, i) => v - a[i]);
    const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    if (Math.hypot(...cross) < 1e-12) return;
    if (cross.reduce((sum, v, i) => sum + v * (na[i] + nb[i] + nc[i]), 0) < 0) { [b, c] = [c, b]; [nb, nc] = [nc, nb]; }
    for (const [v, normal] of [[a, na], [b, nb], [c, nc]]) { p.push(...v.map(x => Math.abs(x) < 1e-10 ? 0 : x)); n.push(...normal); uv.push(v[2] * 4, v[1] * 4); }
  };
  const quad = (a, b, c, d, na, nb = na, nc = na, nd = na) => { tri(a, b, c, na, nb, nc); tri(a, c, d, na, nc, nd); };
  build(quad, tri);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(new Float32Array(p), 3));
  geo.setAttribute('normal', new T.BufferAttribute(new Float32Array(n), 3));
  const texcoords = new Float32Array(uv);
  if (projectUV) boxProjectUV(geo.attributes.position.array, texcoords);
  geo.setAttribute('uv', new T.BufferAttribute(texcoords, 2));
  geo.computeBoundingSphere(); geo.userData.shared = true; geo.userData.heavyGeometry = key; cache.set(key, geo); return geo;
}
function part(T, geo, mat, parent, x = 0, y = 0, z = 0) {
  const mesh = new T.Mesh(geo, mat); mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
// A rolled steel sheet with actual oval through-holes and a closed inside wall.
function ventTube(T, r, wall, length, rows, columns, holeA = 0.5, holeZ = 0.58, ringN = 12) {
  return geometry(T, ['vent', r, wall, length, rows, columns, holeA, holeZ, ringN].join(','), (quad) => {
    const da = Math.PI * 2 / rows, dz = length / columns;
    const position = (a, z, radius) => [Math.sin(a) * radius, Math.cos(a) * radius, z];
    const normal = (a, sign) => [Math.sin(a) * sign, Math.cos(a) * sign, 0];
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const ax = da * (row + 0.5), zc = dz * (col + 0.5), hx = da / 2, hz = dz / 2;
      // Include every corner exactly so neighbouring patches meet without cracks.
      const corner = Math.atan2(hz, hx * r);
      const angles = [...Array.from({ length: ringN }, (_, i) => i * Math.PI * 2 / ringN), corner, Math.PI - corner, Math.PI + corner, 2 * Math.PI - corner].sort((a, b) => a - b);
      const ring = angles.map(a => {
        const dx = Math.cos(a), dy = Math.sin(a), outer = Math.min(hx * r / Math.max(1e-12, Math.abs(dx)), hz / Math.max(1e-12, Math.abs(dy)));
        const inner = 1 / Math.hypot(dx / (hx * r * holeA), dy / (hz * holeZ));
        return { outer: [ax + dx * outer / r, zc + dy * outer], inner: [ax + dx * inner / r, zc + dy * inner] };
      });
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length];
        for (const [radius, sign] of [[r + wall, 1], [r, -1]]) quad(position(...a.inner, radius), position(...a.outer, radius), position(...b.outer, radius), position(...b.inner, radius), normal(a.inner[0], sign), normal(a.outer[0], sign), normal(b.outer[0], sign), normal(b.inner[0], sign));
        const midA = (a.inner[0] + b.inner[0]) / 2, tangent = [Math.cos(midA), -Math.sin(midA), 0];
        const hu = (a.inner[0] + b.inner[0]) / 2 - ax, hv = (a.inner[1] + b.inner[1]) / 2 - zc;
        const nx = -hu * r / (hx * r * holeA) ** 2, nz = -hv / (hz * holeZ) ** 2, len = Math.hypot(nx, nz) || 1;
        const hn = [tangent[0] * nx / len, tangent[1] * nx / len, nz / len];
        quad(position(...a.inner, r), position(...a.inner, r + wall), position(...b.inner, r + wall), position(...b.inner, r), hn);
      }
    }
    for (const z of [0, length]) for (let i = 0; i < rows * 8; i++) {
      const a = i * Math.PI * 2 / (rows * 8), b = (i + 1) * Math.PI * 2 / (rows * 8);
      quad(position(a, z, r), position(a, z, r + wall), position(b, z, r + wall), position(b, z, r), [0, 0, z ? 1 : -1]);
    }
  });
}
// Only the crescent outside the guide-bar nose is visible. Its outer contour
// follows the original fourteen-sided drawing; its inner edge follows the eight bar facets.
function chainsawNoseInsert(T) {
  const insert = geometry(T, 'chainsaw-nose-insert', quad => {
    const radius = .05, halfWidth = .015;
    const wheel = Array.from({length:14}, (_, i) => {
      const a = i * Math.PI / 7;
      return [radius*Math.sin(a), radius*Math.cos(a)];
    });
    const bar = Array.from({length:9}, (_, i) => {
      const a = -Math.PI/2 + i*Math.PI/8;
      return [radius*Math.sin(a), -.020 + radius*Math.cos(a)];
    });
    function edges(points, h, closed) {
      const values = [];
      for (let i = 1; i < points.length + Number(closed); i++) {
        const [a,z] = points[i-1], [b,w] = points[i%points.length];
        if (Math.abs(a-b)<1e-10 || h<Math.min(a,b)-1e-10 || h>Math.max(a,b)+1e-10) continue;
        values.push(z + (w-z)*(h-a)/(b-a));
      }
      return [Math.min(...values), Math.max(...values)];
    }
    const limit = Math.max(...wheel.map(p => p[0]));
    const heights = [...new Set([...wheel,...bar].map(p => +p[0].toFixed(11)).filter(h => Math.abs(h)<=limit+1e-10))].sort((a,b) => a-b);
    const row = h => {
      const [left,right] = edges(wheel,h,true), support = edges(bar,h,false)[0];
      return {h,left,right,support,back:Math.max(left,support)};
    };
    const breaks = heights.map(row);
    for (let i = 1; i < breaks.length; i++) {
      const a=breaks[i-1], b=breaks[i], d=a.left-a.support, e=b.left-b.support;
      if (d*e<0) heights.push(a.h+(b.h-a.h)*d/(d-e));
    }
    const rows = heights.sort((a,b)=>a-b).map(row);
    const pt = (r,side,z) => [r.h,side*halfWidth,r[z]];
    const rim = (r,z) => [r.h/radius,0,r[z]/radius];
    for (let i = 1; i < rows.length; i++) {
      const a=rows[i-1],b=rows[i];
      for (const side of [-1,1]) quad(pt(a,side,'back'),pt(a,side,'right'),pt(b,side,'right'),pt(b,side,'back'),[0,side,0]);
      quad(pt(a,-1,'right'),pt(a,1,'right'),pt(b,1,'right'),pt(b,-1,'right'),rim(a,'right'),rim(a,'right'),rim(b,'right'),rim(b,'right'));
      const dz=b.back-a.back, dh=b.h-a.h, length=Math.hypot(dz,dh);
      const seat=[dz/length,0,-dh/length], onWheel=(a.left+b.left)>=(a.support+b.support)-1e-10;
      const na=onWheel?rim(a,'back'):seat, nb=onWheel?rim(b,'back'):seat;
      quad(pt(a,-1,'back'),pt(a,1,'back'),pt(b,1,'back'),pt(b,-1,'back'),na,na,nb,nb);
    }
    for (const r of [rows[0],rows.at(-1)]) {
      quad(pt(r,-1,'back'),pt(r,1,'back'),pt(r,1,'right'),pt(r,-1,'right'),rim(r,'back'),rim(r,'back'),rim(r,'right'),rim(r,'right'));
    }
  });
  if (!insert.userData.noseUV) {
    // Preserve the circular graphic’s planar cap UVs and its original facet-by-facet rim mapping.
    const {position:p, normal:n, uv} = insert.attributes, step = Math.PI/7;
    for (let i = 0; i < p.count; i += 3) {
      const cap = Math.abs(n.getY(i)) > .5;
      for (let k = i; k < i+3; k++) {
        const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
        if (cap) { uv.setXY(k, .5 + z/.1, .5 + n.getY(k)*x/.1); continue; }
        const a = (Math.atan2(x,z) + Math.PI*2) % (Math.PI*2);
        const j = Math.floor(a/step), u = Math.sin(j*step), v = Math.cos(j*step);
        const du = Math.sin((j+1)*step)-u, dv = Math.cos((j+1)*step)-v;
        const f = Math.max(0, Math.min(1, ((x/.05-u)*du+(z/.05-v)*dv)/(du*du+dv*dv)));
        uv.setXY(k, (j+f)/14, .5+y/.03);
      }
      if (!cap) {
        const us = [uv.getX(i),uv.getX(i+1),uv.getX(i+2)];
        if (Math.max(...us)-Math.min(...us)>.5) {
          for (let k=i;k<i+3;k++) if (uv.getX(k)<.5) uv.setX(k,uv.getX(k)+1);
        }
      }
    }
    insert.userData.noseUV = true;
  }
  return insert;
}

// Keep the exposed bevels of a painted box and seat its hidden back on the adjacent artwork.
// The rounded boxes come from a shared cache, so only this drawing gets the fitted vertices.
function seatBoxArt(mesh, axis, faceAt, side = 1) {
  const skin = mesh.geometry.clone(), component = axis === 'x' ? 0 : 1;
  skin.userData = { ...skin.userData, shared: false };
  const position = skin.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const limit = faceAt(mesh.position.z + position.getZ(i)) - mesh.position[axis];
    const offset = i * position.itemSize + component;
    if (side * (position.array[offset] - limit) < 0) position.array[offset] = limit;
  }
  skin.computeBoundingBox();
  skin.computeBoundingSphere();
  mesh.geometry = skin;
}

// Intersection in the side drawing's [z,y] coordinates.
function outlineIntersection(a, b, c, d) {
  const dz = b[0]-a[0], dy = b[1]-a[1], fz = d[0]-c[0], fy = d[1]-c[1];
  const t = ((c[0]-a[0])*fy - (c[1]-a[1])*fz) / (dz*fy - dy*fz);
  return [a[0]+t*dz, a[1]+t*dy];
}

function bolt(K, dark, bright, x, y, z, radius = 0.006, parent = null) {
  K.cyl(radius, radius, 0.004, bright, x, y, z, parent, 8, 'x');
  K.box(0.005, radius * 0.35, radius * 1.05, dark, x, y, z, 0, 0, 0, parent, 0.0004);
}
function rod(T, K, a, b, radius, mat, parent = null) {
  const from = new T.Vector3(...a), to = new T.Vector3(...b), delta = to.clone().sub(from), mid = from.add(to).multiplyScalar(0.5);
  const mesh = K.cyl(radius, radius, delta.length(), mat, mid.x, mid.y, mid.z, parent, 8, 'y');
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()); return mesh;
}
// Side profile about an existing pistol-grip centre line. u runs down the handle;
// positive v faces the trigger. The socket at the palm stays on that centre line.
function gripShape(cz, cy, h, d, rake, points) {
  const sn = Math.sin(rake), cs = Math.cos(rake), scale = d / 0.08;
  return points.map(([u, v]) => {
    const along = (u - 0.5) * h, across = v * scale;
    return [cz - along * sn + across * cs, cy - along * cs - across * sn];
  });
}
// Six genuinely recessed chambers. Each sector is a closed cell surrounding its bore.
const launcherDrumFace = .065;

// CG-6 (J153 note 26, Jerry: "cylinder needs camo for launcher"): which = 'core' (the two end faces and the six bores,
// bare steel) or 'shell' (the outer wall, painted with the gun); the two together are the whole drum as before.
function launcherDrum(T, which = 'all') {
  return geometry(T, 'launcher-six-chambers' + (which === 'all' ? '' : ':' + which), (quad) => {
    const core = which !== 'shell', shell = which !== 'core';
    // M32A1 drum: 157 mm across at the held scale, with six true 40 mm bores.
    const outerR = 0.112, orbit = 0.065, holeR = 0.030, halfLength = launcherDrumFace;
    for (let sector = 0; sector < 6; sector++) {
      const angle = sector * Math.PI / 3, centre = [Math.sin(angle) * orbit, Math.cos(angle) * orbit];
      const rays = [];
      const samples = Array.from({ length: 36 }, (_, i) => i * Math.PI * 2 / 36);
      // Include the two outer sector corners exactly. Without them the sampled polygon
      // shortcuts the curve/straight join and leaves a triangular gap between cells.
      for (const s of [-1, 1]) {
        const edge = angle + s * Math.PI / 6;
        const a = Math.atan2(Math.sin(edge) * outerR - centre[0], Math.cos(edge) * outerR - centre[1]) - angle;
        samples.push(((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
      }
      samples.sort((a, b) => a - b);
      for (const sample of samples) {
        const a = angle + sample, dir = [Math.sin(a), Math.cos(a)], cd = centre[0] * dir[0] + centre[1] * dir[1];
        let distance = -cd + Math.sqrt(cd * cd + outerR * outerR - orbit * orbit);
        for (const s of [-1, 1]) {
          const edge = angle + s * Math.PI / 6, inside = [-s * Math.cos(edge), s * Math.sin(edge)];
          const originDot = centre[0] * inside[0] + centre[1] * inside[1], directionDot = dir[0] * inside[0] + dir[1] * inside[1];
          if (directionDot < -1e-10) distance = Math.min(distance, -originDot / directionDot);
        }
        rays.push({ inner: [centre[0] + dir[0] * holeR, centre[1] + dir[1] * holeR], outer: [centre[0] + dir[0] * distance, centre[1] + dir[1] * distance], dir });
      }
      for (let i = 0; i < rays.length; i++) {
        const a = rays[i], b = rays[(i + 1) % rays.length], at = (p, z) => [p[0], p[1], z];
        if (core) for (const z of [-halfLength, halfLength]) quad(at(a.inner, z), at(a.outer, z), at(b.outer, z), at(b.inner, z), [0, 0, Math.sign(z)]);
        if (core) quad(at(a.inner, -halfLength), at(a.inner, halfLength), at(b.inner, halfLength), at(b.inner, -halfLength), [-a.dir[0], -a.dir[1], 0], [-a.dir[0], -a.dir[1], 0], [-b.dir[0], -b.dir[1], 0], [-b.dir[0], -b.dir[1], 0]);
        const dx = b.outer[0] - a.outer[0], dy = b.outer[1] - a.outer[1], len = Math.hypot(dx, dy) || 1;
        const faceN = [dy / len, -dx / len, 0];
        const mx = (a.outer[0] + b.outer[0]) / 2 - centre[0], my = (a.outer[1] + b.outer[1]) / 2 - centre[1];
        if (faceN[0] * mx + faceN[1] * my < 0) { faceN[0] *= -1; faceN[1] *= -1; }
        if (shell) quad(at(a.outer, -halfLength), at(a.outer, halfLength), at(b.outer, halfLength), at(b.outer, -halfLength), faceN);
      }
    }
  });
}

export function makeMinigunModel(ctx) {
  const { THREE, gunKit, gunArc, gunBand, gunEffects, finishGun, gunBody, gunDark, gunMid, gunAccent, gunPoly, gunRubber, gunOlive, fuelRedMat, glassMat, sightDotMat } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun), W = sharedDetail(ctx);
  // CF-1 (J149): screw heads with real drives, one draw a kind; gunAccent keeps them out of the body-metal merge.
  const hexHeads = [], slotHeads = [];
  const panelSteel = new THREE.MeshStandardMaterial({color: 0x3b4245, metalness: .17, roughness: .72});
  const drumFinish = new THREE.MeshStandardMaterial({color: 0x545a3e, metalness: .15, roughness: .67});
  const lidFinish = new THREE.MeshStandardMaterial({color: 0x565e60, metalness: .33, roughness: .54});
  // Housing: one moulded body with a round back end, bolted side plates, cooling slots, the hub showing.
  // Ease the rear shell between its original top and bottom attachment points.
  // The posed glove pad reaches this face; the separate rear handle stays in its socket.
  const rearShell=gunArc(-.32,0,.13,Math.PI/2,Math.PI*1.5,10).map(([z,y])=>[
    z+.012*(1-(y/.13)**2),y
  ]);
  const housing = K.slab([[.225,-.13],[.225,.13],...rearShell],.28,gunBody,{bevel:.035,segs:3});
  markPaintSurface(housing, 'receiver');
  const panelRearBottom = [-.255, -.092], panelRearTop = [-.247, .098];
  for (const sx of [-1, 1]) {
    const plate = K.slab([panelRearBottom, [0.152, -0.092], [0.161, -0.08], [0.161, 0.087], [0.148, 0.098], panelRearTop], 0.020, gunMid, { x: sx * 0.150, bevel: 0.003 });
    markPaintSurface(plate, 'receiver');
    const sideFace = plate.position.x + sx * .010;
    for (let i = 0; i < 4; i++) {
      const rib = K.box(0.012, 0.009, 0.26, gunDark, sx * 0.158, 0.065 - i * 0.039, -0.064, 0, 0, 0, null, 0.003);
      seatBoxArt(rib, 'x', () => sideFace, sx);
    }
    for (const [by, bz] of [[0.085, 0.13], [0.085, -0.24], [-0.085, 0.13], [-0.085, -0.24]]) hexHeads.push({ x: sideFace, y: by, z: bz, axis: 'x', side: sx, r: 0.009, turn: bz * 7 });
  }
  // Two removable top service panels break up the broad receiver shell without
  // crossing the centre sight line or shifting either hand's support point.
  // Spent cases leave the rotor housing ahead of the feed drum. The lips surround
  // the opening and the chute angles outboard beneath it.
  K.box(0.005, 0.032, 0.068, gunDark, 0.162, 0.035, 0.122, 0, 0, 0, null, 0.002);
  for (const y of [0.018, 0.052]) K.box(0.013, 0.005, 0.072, gunAccent, 0.164, y, 0.122, 0, 0, 0, null, 0.001);
  for (const z of [0.086, 0.158]) K.box(0.013, 0.031, 0.005, gunAccent, 0.164, 0.035, z, 0, 0, 0, null, 0.001);
  K.box(0.017, 0.005, 0.064, gunMid, 0.174, 0.014, 0.122, 0, 0, -0.37, null, 0.001);
  for (const sx of [-1, 1]) {
    const border = K.box(0.061, 0.007, 0.19, gunDark, sx * 0.079, 0.129, -0.075, 0, 0, 0, null, 0.004);
    trimPanelBack(THREE, border, 1, .130, 'y');
    const lid = K.box(0.055, 0.008, 0.184, panelSteel, sx * 0.079, 0.134, -0.075, 0, 0, 0, null, 0.004);
    trimPanelBack(THREE, lid, 1, .1325, 'y');
    for (const z of [-0.148, -0.002]) slotHeads.push({ x: sx * 0.079, y: 0.138, z, axis: 'y', side: 1, r: 0.0042, turn: 0.6 + z * 9 + sx });
  }
  // Only the two round ends show on the housing. The side panel covers the forward tip of each disc.
  const leftDisc = K.cyl(.07, .07, .01, gunDark, -.145, -.02, -.32, null, 12, 'x');
  leftDisc.name = 'minigun left side disc';
  const rim = leftDisc.geometry.attributes.position;
  for (let i = 0; i < rim.count; i++) {
    const y = leftDisc.position.y + rim.getX(i);
    const t = (y - panelRearBottom[1]) / (panelRearTop[1] - panelRearBottom[1]);
    const panelZ = panelRearBottom[0] + t * (panelRearTop[0] - panelRearBottom[0]);
    rim.setZ(i, Math.min(rim.getZ(i), panelZ - leftDisc.position.z));
  }
  leftDisc.geometry.computeBoundingSphere();
  // Drive motor under the housing, finned, with its power lead.
  const fins = [[0, -0.18], [0.072, -0.18]];
  for (let i = 0; i < 6; i++) { const z = -0.15 + i * 0.04; fins.push([0.072, z - 0.006], [0.084, z - 0.006], [0.084, z + 0.006], [0.072, z + 0.006]); }
  fins.push([0.072, 0.08], [0, 0.08]);
  K.lathe(fins, gunDark, { y: -0.18, seg: 14 });
  // The motor is a separate serviceable unit: rear fan guard, eight open radial
  // windows and a bolted end cap. Its axle remains below the main receiver.
  K.cyl(0.064, 0.064, 0.006, gunMid, 0, -0.18, -0.191, null, 24);
  K.cyl(0.051, 0.051, 0.007, gunDark, 0, -0.18, -0.196, null, 24);
  K.cyl(0.013, 0.013, 0.011, gunAccent, 0, -0.18, -0.202, null, 12);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const x = Math.cos(a) * 0.039, y = -0.18 + Math.sin(a) * 0.039;
    rod(THREE, K, [x * 0.42, -0.18 + (y + 0.18) * 0.42, -0.201], [x, y, -0.201], 0.003, gunMid);
  }
  for (const sx of [-1, 1]) for (const z of [-0.13, 0.055]) {
    K.box(0.008, 0.026, 0.012, gunAccent, sx * 0.075, -0.18, z, 0, 0, 0, null, 0.002);
  }
  // GB-172: the power lead was a black bar floating out past the housing. The motor stays.
  // The rear firing hand grips behind the motor. A left-side peg keeps the support forearm clear of the housing.
  // The low arch remains as the reflex-sight mount, not as a hand rest.
  const handleBand = gunBand([[-0.36, 0.095], [-0.51, 0.095], [-0.55, 0.045], [-0.55, -0.11], [-0.46, -0.13], [-0.40, -0.09]], 0.018);
  // Terminate each arm of the drawing on its adjacent housing facet.
  const meet = (edge, facet) => outlineIntersection(handleBand[edge], handleBand[edge+1], rearShell[facet], rearShell[facet+1]);
  const handleFrame = K.slab([meet(0,2), ...handleBand.slice(1,5), meet(4,7),
    meet(6,7), ...handleBand.slice(7,11), meet(10,2)], 0.065, gunPoly, { bevel: 0.008 });
  markPaintSurface(handleFrame, 'furniture');   // CF-1 (c): the moulded spade frame takes the finish; its rubber grip does not
  K.box(0.074, 0.133, 0.054, gunRubber, 0, -0.017, -0.52, 0, 0, 0, null, 0.012);
  for (let i = 0; i < 5; i++) K.box(0.078, 0.008, 0.056, gunPoly, 0, -0.067 + i * 0.025, -0.52, 0, 0, 0, null, 0.002);
  // GP-20024: steel bracket projects from the -X housing plate; a 36 mm rubber peg hangs at its outer end.
  // Grip centre (-0.304, 0.012, 0.16), axis +Y, 116 mm long. The glove sits outside the side plate.
  // CF-1 (c): the bracket is painted steel like the housing it bolts to.
  for (const piece of [K.box(0.018, 0.12, 0.085, gunDark, -0.168, 0.055, 0.16, 0, 0, 0, null, 0.004),
    K.box(0.14, 0.028, 0.05, gunMid, -0.236, 0.083, 0.16, 0, 0, 0, null, 0.006),
    rod(THREE, K, [-0.17, -0.005, 0.16], [-0.255, 0.071, 0.16], 0.011, gunDark)]) markPaintSurface(piece, 'receiver');
  K.cyl(0.018, 0.018, 0.116, gunRubber, -0.304, 0.012, 0.16, null, 12, 'y');
  for (const y of [-0.043, 0.066]) K.cyl(0.024, 0.024, 0.01, gunMid, -0.304, y, 0.16, null, 12, 'y');
  for (const y of [-0.026, -0.007, 0.012, 0.031, 0.05]) K.cyl(0.0188, 0.0188, 0.003, gunDark, -0.304, y, 0.16, null, 12, 'y');
  const archStart = gun.children.length;
  for (const z of [-0.12, 0.12]) K.box(0.03, 0.12, 0.03, gunDark, 0, 0.18, z);
  K.box(0.03, 0.021, 0.27, gunDark, 0, 0.238, 0);
  for (const piece of gun.children.slice(archStart)) markPaintSurface(piece, 'rail');
  for (const z of [-0.12, 0.12]) {
    const pin = K.cyl(.018, .018, .047, gunMid, 0, .155, z, null, 10, 'x');
    pin.geometry.rotateZ(pin.rotation.z); pin.rotation.z = 0;
    // The top of the ten-sided disc meets the sloping side of the rounded post.
    const rounding = .03 * .18, edgeDrop = rounding * (1 - Math.SQRT1_2);
    const shoulder = .015 - (.025 - .018*Math.sin(2*Math.PI/5)) * edgeDrop / (.06 - edgeDrop);
    fitCollarFaces(THREE, pin, shoulder);
    bolt(K, gunDark, gunAccent, -.025, .155, z);
  }
  const reflexStart = gun.children.length;
  K.box(0.05, 0.029, 0.18, gunRubber, 0, 0.263, 0);
  for (let i = 0; i < 8; i++) K.box(0.051, 0.003, 0.007, gunPoly, 0, 0.278, -0.072 + i * 0.020, 0, 0, 0, null, 0.001);
  // GP-20051/J22: protective chamfered reflex hood, lens, elevation/windage dials
  // and emitter housing. The red aiming datum stays at (0, .330, .0355).
  const hoodStart = gun.children.length;
  K.box(0.045, 0.013, 0.083, gunDark, 0, 0.284, 0.006, 0, 0, 0, null, 0.003);
  K.box(0.052, 0.017, 0.025, gunMid, 0, 0.298, -0.022, 0, 0, 0, null, 0.003);
  for (const sx of [-1, 1])
    K.slab([[-0.029, 0.294], [-0.029, 0.346], [-0.017, 0.366], [0.038, 0.366], [0.045, 0.352], [0.045, 0.294]], 0.005, gunDark, { x: sx * 0.025, bevel: 0.0015 });
  K.box(0.055, 0.007, 0.055, gunDark, 0, 0.367, 0.01, 0, 0, 0, null, 0.002);
  for (const piece of gun.children.slice(hoodStart)) markPaintSurface(piece, 'optic shell');
  K.box(0.051, 0.003, 0.009, gunAccent, 0, 0.367, 0.04, 0, 0, 0, null, 0.001);
  K.cyl(0.012, 0.012, 0.013, gunMid, 0, 0.373, -0.007, null, 12, 'y');
  K.cyl(0.011, 0.011, 0.013, gunMid, 0.03, 0.329, -0.016, null, 12, 'x');
  const reflexGlass = Object.assign(glassMat.clone(), { transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  reflexGlass.color.setHex(0x78919b);
  K.box(0.045, 0.064, 0.003, reflexGlass, 0, 0.325, 0.035);
  K.box(0.0035, 0.0035, 0.002, sightDotMat, 0, 0.330, 0.0355);
  K.tor(0.0075, 0.0006, sightDotMat, 0, 0.330, 0.0355, 0, 0, 0, null, Math.PI * 2, 24);
  const defaultSight = K.group(0, 0, 0);
  defaultSight.name = 'minigun-default-reflex';
  for (const part of gun.children.slice(reflexStart, -1)) defaultSight.add(part);
  gun.userData.defaultSight = defaultSight;
  // Trigger and guard sit just ahead of the rear firing grip.
  const trigger = addTriggerArtwork(gun, K, gunBand([[-0.44, 0.07], [-0.43, 0.035], [-0.425, 0.008]], 0.005), 0.016, fuelRedMat, { bevel: 0.002 }).parent;
  K.slab(gunBand([[-0.46, 0.081], [-0.40, 0.078], [-0.39, -0.045], [-0.465, -0.06]], 0.006), 0.024, gunDark, { bevel: 0.003 });
  // Face plate and a spindle hub for the barrel cluster.
  K.lathe([[0, 0.225], [0.132, 0.225], [0.132, 0.264], [0.126, 0.27], [0, 0.27]], gunMid, { seg: 20 });
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; K.cyl(0.01, 0.01, 0.07, gunAccent, Math.cos(a) * 0.11, Math.sin(a) * 0.11, 0.24, null, 6); }
  const barrelAssembly = new THREE.Group();
  barrelAssembly.position.set(0, 0, 0.27);
  const barrelLen = 0.84, barrelR = 0.028, clusterR = 0.075;
  const exposedTubes = [];
  K.cyl(0.03, 0.03, barrelLen, gunDark, 0, 0, barrelLen / 2, barrelAssembly, 10);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2, bx = Math.cos(ang) * clusterR, by = Math.sin(ang) * clusterR;
    exposedTubes.push(K.cyl(barrelR * 0.85, barrelR, barrelLen, gunAccent, bx, by, barrelLen / 2, barrelAssembly, 10));
    K.lathe([[0, barrelLen - 0.04], [barrelR * 1.08, barrelLen - 0.04], [barrelR * 1.08, barrelLen + 0.008], [barrelR * 0.5, barrelLen + 0.01], [barrelR * 0.5, barrelLen + 0.004], [0, barrelLen + 0.004]], gunDark, { x: bx, y: by, parent: barrelAssembly, seg: 10 });
  }
  // Machined retaining collars replace the bulky rounded rings. The centre stays open.
  // GB-180 pass 5 (the collars were rings round the outside, not gripping the barrels): each clamp is a solid plate
  // from the spindle out past the barrels, the six barrels running through it, with a raised rim and bolts between them.
  for (const [rz, radius] of [[0.04, 0.118], [0.39, 0.112], [0.80, 0.108]]) {
    // CG-6 (J153 note 29, Jerry: "Rings around minigun barrels could use camo"): the clamp plate takes the gun's paint
    markPaintSurface(K.lathe([[0.026, rz - 0.016], [radius - 0.003, rz - 0.016], [radius, rz - 0.012], [radius, rz + 0.012], [radius - 0.003, rz + 0.016], [0.026, rz + 0.016], [0.026, rz - 0.016]], gunMid, { parent: barrelAssembly, seg: 28 }), 'clamp');
    // Stepped rim and six transverse fasteners read as a barrel clamp rather
    // than a smooth ring; they turn with the animated barrel assembly.
    for (const dz of [-0.018, 0.018]) K.tor(radius - 0.004, 0.002, gunDark, 0, 0, rz + dz, 0, 0, 0, barrelAssembly, Math.PI * 2, 28);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + Math.PI / 6;
      const x = Math.cos(a) * 0.075, y = Math.sin(a) * 0.075;
      K.cyl(0.007, 0.007, 0.04, gunDark, x, y, rz, barrelAssembly, 8);
      K.cyl(0.010, 0.010, 0.004, gunAccent, x, y, rz + 0.019, barrelAssembly, 6);
    }
  }
  gun.add(barrelAssembly);
  // Enclosed side drum. The existing reload pivots about the feed socket.
  const ammoBox = new THREE.Group();
  ammoBox.position.set(0.2, -0.08, -0.02);
  ammoBox.rotation.z = 0.12;
  // GT-20106/J153-31: clear the complete receiver panel; retain the reload root.
  const drumOffsetX = .060;
  const drumShell = K.cyl(0.125, 0.125, 0.155, drumFinish, drumOffsetX, -0.045, 0, ammoBox, 32, 'x');
  drumShell.name = 'minigun drum shell';
  K.cyl(0.128, 0.124, 0.009, lidFinish, drumOffsetX + 0.082, -0.045, 0, ammoBox, 32, 'x');
  K.cyl(0.050, 0.056, 0.009, gunOlive, drumOffsetX + 0.091, -0.045, 0, ammoBox, 24, 'x');
  // CF-1: the lid's six slotted screws move with the drum (their own draw on the drum).
  heads(THREE, ammoBox, gunAccent, 'slot', Array.from({ length: 6 }, (_, i) => {
    const a = i * Math.PI / 3;
    return { x: drumOffsetX + 0.0865, y: -0.045 + 0.108 * Math.cos(a), z: 0.108 * Math.sin(a), axis: 'x', side: 1, r: 0.0042, turn: a * 1.7 };
  }));
  const drumNeck = K.slab([[-.042,.146],[.006,.146],[.059,.074],[.011,.074]], .062, gunDark,
    {ry:Math.PI/2,z:.028,bevel:.003,parent:ammoBox});
  drumNeck.name = 'minigun sloped feed chute';
  for (const y of [.088,.104,.120,.136]) {
    const x = -.018 + (.146-y) * (.053/.072);
    K.box(.050,.003,.064,gunMid,x,y,.028,0,0,0,ammoBox,.001);
  }
  // Painted drum; bare feed guide, lid and fasteners.
  markPaintSurface(drumShell, 'magazine');
  gun.add(ammoBox);
  // Fixed socket above the detachable drum neck.
  const feedHanger = gun;   // Fixed bracket: share the receiver's static metal batch.
  for (const z of [-.018,.074]) K.slab([[.159,.018],[.159,.082],[.193,.082]], .006, gunMid,
    {ry:Math.PI/2,z,bevel:.001,parent:feedHanger});
  K.box(.042,.008,.098,gunDark,.172,.078,.028,0,0,0,feedHanger,.002);
  K.box(0.054, 0.030, 0.068, gunDark, 0.167, 0.071, 0.028, 0, 0, -0.12, null, 0.004);
  K.box(0.064, 0.055, 0.103, gunDark, 0.172, 0.111, 0.034, 0, 0, -0.12, null, 0.006);
  K.box(0.068, 0.008, 0.108, gunMid, 0.172, 0.141, 0.034, 0, 0, -0.12, null, 0.003);
  for (const z of [-0.011, 0.079]) K.cyl(0.005, 0.005, 0.004, gunAccent, 0.172, 0.147, z, null, 8, 'y');
  gunEffects(gun, new THREE.Vector3(0, 0, 0.27 + barrelLen + 0.02), 0.08, 4, 8, 0.008);
  gun.userData.laser.position.set(0, 0, 0.27 + barrelLen + 4);
  gun.userData.laserBaseZ = 0.27 + barrelLen;
  gun.userData.barrelAssembly = barrelAssembly;
  gun.userData.ammoBox = ammoBox;
  gun.userData.mag = ammoBox;
  gun.userData.baseBarrelRotX = 0;
  gun.userData.baseAmmoPos = ammoBox.position.clone();
  gun.userData.baseAmmoRot = ammoBox.rotation.clone();
  // GB-302: Claude drives the ammo box (view gun.ammoBox / mag).
  gun.userData.reloadParts = Object.assign(gun.userData.reloadParts || {}, {
    ammoBox: { restPos: [0.2, -0.08, -0.02], restRot: [0, 0, 0.12], visibleAtRest: true }
  });
  gun.userData.partFinish = true;
  for (const piece of gun.children) {
    if (piece.material === panelSteel) markPaintSurface(piece, 'receiver');
  }
  // CF-1 (b, J149): the controls a hand works, each its own part with its origin on its pivot.
  // Safety: a thumb lever on the spade frame's left face above the firing grip; turns about x on its boss.
  const safety = K.group(-0.0335, 0.095, -0.478); safety.name = 'minigun-safety';
  K.cyl(0.008, 0.008, 0.006, gunDark, -0.002, 0, 0, safety, 12, 'x');
  K.box(0.004, 0.011, 0.032, gunDark, -0.0035, -0.004, -0.017, -0.18, 0, 0, safety, 0.0015);
  W.serrations(safety, gunDark, { x: -0.0055, y: -0.0068, z: -0.024, axis: 'x', side: -1, along: 'z', count: 4, pitch: 0.004, w: 0.008, depth: 0.0007, profile: 'square' });
  hexHeads.push({ x: -0.0385, y: 0.095, z: -0.478, axis: 'x', side: -1, r: 0.0035 });
  // Arming switch: a guarded toggle on the housing's rear top-left; the lever rocks fore and aft about x.
  W.chamferBox(gun, 0.032, 0.006, 0.028, 0.0015, gunDark, -0.079, 0.1325, -0.215);
  for (const ex of [-0.0125, 0.0125]) W.chamferBox(gun, 0.004, 0.014, 0.022, 0.001, gunDark, -0.079 + ex, 0.141, -0.215);
  const powerSwitch = K.group(-0.079, 0.1355, -0.215); powerSwitch.name = 'minigun-power-switch';
  powerSwitch.rotation.x = -0.38;   // rest: thrown back (safe); the lever's root stays in the base through its travel
  K.cyl(0.0045, 0.0026, 0.0235, gunAccent, 0, 0.0083, 0, powerSwitch, 10, 'y');   // a bat lever, widest at the thumb
  pinEnds(THREE, gun, gunAccent, [{ x: -0.079, y: 0.1385, z: -0.215, axis: 'x', span: 0.029, r: 0.0018 }]);
  // Drum latch: a lever hinged at its top on the feed socket's outboard face; pulled down it frees the drum.
  const drumLatch = K.group(0.2058, 0.1240, 0.05); drumLatch.name = 'minigun-drum-latch';
  drumLatch.rotation.z = -0.12;   // the socket's tilt
  K.cyl(0.006, 0.006, 0.006, gunMid, 0.0015, 0, 0, drumLatch, 12, 'x');
  K.box(0.004, 0.040, 0.014, gunMid, 0.0030, -0.019, 0, 0, 0, 0, drumLatch, 0.0015);
  K.box(0.009, 0.006, 0.017, gunDark, 0.0055, -0.039, 0, 0, 0, 0, drumLatch, 0.002);
  slotHeads.push({ x: 0.2058 + 0.0045 * Math.cos(-0.12), y: 0.1240 + 0.0045 * Math.sin(-0.12), z: 0.05, axis: 'x', side: 1, r: 0.0028 });
  heads(THREE, gun, gunAccent, 'hex', hexHeads);
  heads(THREE, gun, gunAccent, 'slot', slotHeads);
  attachLaserLight(gun, 'minigun', ctx);
  const lamp = gun.userData.laserLightUnit;
  for (const name of ['moduleShell', 'sideRailClamp']) markPaintSurface(lamp.getObjectByName(name), 'light shell');
  // GP-20063: scale the held rotary assembly toward one metre. The view gun
  // resets its source root transform, so scale the parts instead.
  const heldScale = 0.70;
  gun.userData.ejectPort = [0.177, 0.035, 0.122].map(v => v * heldScale);
  for (const child of gun.children) {
    child.position.multiplyScalar(heldScale);
    child.scale.multiplyScalar(heldScale);
  }
  gun.userData.triggerPin = trigger.position.toArray();
  trigger.userData.restPosition = trigger.position.toArray();
  // CF-1 (b): bound after the held scale so each rest pose is the scaled one.
  bindModelArtwork(gun, 'controls', 'safety', safety);
  bindModelArtwork(gun, 'controls', 'powerSwitch', powerSwitch);
  bindModelArtwork(gun, 'controls', 'drumLatch', drumLatch);
  bindModelArtwork(gun, 'heatParts', 'barrel', groupArtwork(THREE, ...exposedTubes));
  gun.userData.muzzleLocal.multiplyScalar(heldScale);
  gun.userData.laserBaseZ *= heldScale;
  gun.userData.laserLensLocal?.multiplyScalar(heldScale);
  gun.userData.lightLensLocal?.multiplyScalar(heldScale);
  gun.userData.baseAmmoPos.copy(ammoBox.position);
  // The fitted short rail replaces the stock reflex pad on the same arch.
  gun.userData.opticPlate = optionalArtworkGroup(ctx, gun, 'rotary-optic-seat', plate => {
    markPaintSurface(K.box(0.030, 0.003, 0.054, gunMid, 0, 0.1935, 0.006, 0, 0, 0, plate, 0.0006), 'rail');
  });
  gun.userData.reloadParts.ammoBox.restPos = ammoBox.position.toArray();
  // A full-diameter side peg still accepts the support glove.
  K.cyl(0.018, 0.018, 0.081, gunRubber, -0.304 * heldScale, 0.012 * heldScale, 0.16 * heldScale, null, 12, 'y');
  // Both discs share the housing's static draw batch and the same held scale.
  const rightDisc = leftDisc.clone();
  rightDisc.name = 'minigun right side disc';
  rightDisc.position.x = -leftDisc.position.x;
  gun.add(rightDisc);
  return finishGun(gun);
}

// The visible tube keeps its original twelve-sided outline. Only its end follows
// the round graphic on the case. Intermediate points lie on the old edges.
function launcherStockGraphic(T, pivotZ, pivotRadius, depthScale) {
  const key = ['launcher-stock-end', pivotZ, pivotRadius, depthScale].join(',');
  return geometry(T, key, quad => {
    const radius = .024, rear = -.46;
    const clearance = pivotRadius + .00008;
    const rows = [];
    for (let i = 0; i <= 24; i++) {
      const edge = Math.min(5, Math.floor(i / 4)), t = i / 4 - edge;
      const a = -Math.PI / 2 + edge * Math.PI / 6, b = a + Math.PI / 6;
      const nx = (1 - t) * Math.cos(a) + t * Math.cos(b);
      const ny = (1 - t) * Math.sin(a) + t * Math.sin(b);
      const x = radius * nx, y = radius * ny;
      const reach = Math.sqrt(clearance * clearance - y * y);
      const front = pivotZ - reach / depthScale;
      const slope = y / (reach * depthScale), faceLength = Math.hypot(1, slope);
      const sideLength = Math.hypot(nx, ny);
      rows.push({x, y, front, face: [0, -slope / faceLength, 1 / faceLength],
        right: [nx / sideLength, ny / sideLength, 0], left: [-nx / sideLength, ny / sideLength, 0]});
    }
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1], b = rows[i];
      for (const side of [-1, 1]) {
        const face = side > 0 ? 'right' : 'left';
        quad([side * a.x, a.y, rear], [side * b.x, b.y, rear],
          [side * b.x, b.y, b.front], [side * a.x, a.y, a.front], a[face], b[face], b[face], a[face]);
      }
      quad([-a.x, a.y, rear], [a.x, a.y, rear], [b.x, b.y, rear], [-b.x, b.y, rear], [0, 0, -1]);
      quad([-a.x, a.y, a.front], [a.x, a.y, a.front], [b.x, b.y, b.front], [-b.x, b.y, b.front],
        a.face, a.face, b.face, b.face);
    }
  }, true);
}

function fitLauncherNose(T, barrel, endZ) {
  const geometry = barrel.geometry;
  geometry.computeBoundingBox();
  const minZ = geometry.boundingBox.min.z, maxZ = geometry.boundingBox.max.z;
  const {position, uv} = geometry.attributes;
  for (let i = 0; i < position.count; i++) {
    if (position.getZ(i) !== maxZ) continue;
    position.setZ(i, endZ);
    uv.setX(i, position.getZ(i) * 4);
  }
  setArtworkHeatRange(T, geometry, minZ, maxZ);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

export function makeLauncherModel(ctx) {
  const { THREE, gunKit, gunBand, gripOutline, gunEffects, finishGun, gunBody, gunDark, gunMid, gunAccent, gunPoly, gunRubber, gunOlive, steelMat } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  const receiverSteel = steelMat.clone();
  const framePlates = [];   // CF-1 (c): the lower frame plates are painted frame steel
  receiverSteel.color.setHex(0x70797e);
  receiverSteel.roughness = .69;
  receiverSteel.metalness = .38;
  // Rear frame up to the drum's back face, the top strap over the drum, the forward frame round the barrel.
  K.slab([[-0.25, 0.08], [-0.25, -0.035], [-0.23, -0.06], [0.039, -0.06], [0.049, -0.044], [0.049, 0.09], [0.033, 0.106], [-0.227, 0.106]], 0.15, receiverSteel, { bevel: 0.012 });
  // A shallow stamped rear service cover breaks the large blank face seen at 40 cm.
  // It stays inside the frame envelope and folds into its existing opaque batch.
  const bossY = 0.04, bossZ = -0.25, bossRadius = 0.029, bossSegments = 16;
  const outerCover = K.box(0.104, 0.036, 0.002, gunDark, 0, 0.057, -0.251, 0, 0, 0, null, 0.003);
  const insetCover = K.box(0.084, 0.024, 0.001, gunMid, 0, 0.057, -0.253, 0, 0, 0, null, 0.002);
  // Both painted rims meet the same upper facet on the rounded rear artwork.
  const facetSlope = Math.tan(Math.PI / bossSegments);
  for (const cover of [outerCover, insetCover]) {
    seatBoxArt(cover, 'y', z => bossY + bossRadius - Math.abs(z - bossZ) * facetSlope);
  }
  for (const x of [-0.047, 0.047]) K.cyl(0.0025, 0.0025, 0.002, gunAccent, x, 0.0718, -0.253, null, 8);
  // J122: a three-notch leaf and protected front post on the original ADS axis.
  const leafZ = -0.085;
  const irons = K.group(0, 0, 0);
  irons.name = 'launcher-iron-leaf';
  gun.userData.defaultSight = irons;
  K.box(0.028, 0.034, 0.028, gunDark, 0, 0.123, leafZ, 0, 0, 0, irons, 0.003);
  K.cyl(0.004, 0.004, 0.033, gunMid, 0, 0.140, leafZ, irons, 12, 'x');
  for (const side of [-1, 1]) {
    K.box(0.004, 0.052, 0.006, gunDark, side * 0.010, 0.166, leafZ, 0, 0, 0, irons);
    for (const y of [0.170, 0.178, 0.186]) {
      K.box(0.005, 0.002, 0.005, gunMid, side * 0.006, y - 0.001, leafZ, 0, 0, 0, irons);
    }
  }
  gun.userData.opticPlate = optionalArtworkGroup(ctx, gun, 'launcher-optic-seat', plate => {
    K.box(0.035, 0.016, 0.067, gunDark, 0, 0.114, -0.049, 0, 0, 0, plate, 0.002);
    K.box(0.030, 0.006, 0.053, gunMid, 0, 0.143, -0.049, 0, 0, 0, plate, 0.001);
    for (const piece of plate.children) markPaintSurface(piece, 'rail');
  });
  for (const sx of [-1, 1]) {
    framePlates.push(K.slab([[-0.245, -0.017], [-0.112, -0.017], [-0.103, -0.024], [-0.103, -0.051], [-0.233, -0.051], [-0.245, -0.04]], 0.004, gunMid, { x: sx * 0.077, bevel: 0.002 }));
    for (const [z, y, ox] of [[-0.229, 0.084, 0.0775], [0.023, 0.081, 0.0775], [-0.226, -0.035, 0.081], [-0.12, -0.035, 0.081]]) bolt(K, gunDark, gunAccent, sx * ox, y, z, 0.005);   // GB-297: upper bolts on the frame face, lower on the side panel
  }
  // CF-1 (b): the ambidextrous safety is one part, both levers on their cross-shaft; it turns about x on the shaft.
  const safety = K.group(0, -0.027, -0.054); safety.name = 'launcher-safety';
  for (const sx of [-1, 1]) {
    K.cyl(0.009, 0.009, 0.004, gunDark, sx * 0.077, 0, 0, safety, 12, 'x');   // ambidextrous safety selector
    K.box(0.004, 0.01, 0.025, gunDark, sx * 0.08, -0.005, 0.013, 0, 0, 0, safety, 0.002);
  }
  // J80: the tall wire quadrant looked like an unattached arch beside the rear sight.
  // A low marked range plate carries
  // the side adjustment without rising over either sight picture.
  K.box(0.012, 0.022, 0.108, gunMid, 0.081, 0.073, -0.174, 0, 0, 0, null, 0.003);
  for (const z of [-0.211, -0.187, -0.159])
    K.box(0.0015, 0.004, 0.009, gunAccent, 0.0875, 0.077, z, 0, 0, 0, null, 0.0004);
  const collarBack = .265, collarFront = .315;
  K.slab([[collarBack, -.05], [collarFront, -.05], [collarFront, .09], [collarBack, .09]], .12, receiverSteel, { bevel: .014 });
  // Front post above the rail, level with the lowest notch at y=.170.
  K.box(0.032, 0.018, 0.030, gunDark, 0, 0.111, 0.638, 0, 0, 0, null, 0.002);
  K.box(0.004, 0.050, 0.005, gunDark, 0, 0.145, 0.638);
  for (const sx of [-1, 1]) K.box(0.003, 0.054, 0.014, gunDark, sx * 0.013, 0.147, 0.638);
  // Collapsible stock on its tube, with a pad; pistol grip, trigger guard, trigger.
  // J62 (GP-20016): the stock tube, olive body, rubber pad and stock-side slabs (with their bolts) are one group,
  // gun.userData.fpStock ('fp-stock'), for the view gun to leave out of the eye; third person and the shadow keep it.
  // Every part is where it was (the group sits at the gun's origin).
  const stock = K.group(0, 0, 0), stockStart = gun.children.length; stock.name = 'fp-stock';
  const stockDepthScale = .7;
  part(THREE, launcherStockGraphic(THREE, bossZ, bossRadius, stockDepthScale), gunDark, gun, 0, bossY, 0);
  for (const sx of [-1, 1]) for (const z of [-0.425, -0.395, -0.365])
    K.cyl(0.004, 0.004, 0.007, gunMid, sx * 0.022, 0.04, z, null, 8, 'x'); // telescoping tube stops
  K.slab([[-0.33, 0.08], [-0.47, 0.084], [-0.48, 0.08], [-0.48, -0.06], [-0.44, -0.065], [-0.37, -0.02], [-0.33, -0.01]], 0.08, gunOlive, { bevel: 0.016, segs: 3 });
  K.slab([[-0.504, 0.088], [-0.48, 0.088], [-0.48, -0.066], [-0.5, -0.072]], 0.086, gunRubber, { bevel: 0.008 });
  for (const sx of [-1, 1]) {
    K.slab([[-0.462, 0.06], [-0.359, 0.056], [-0.37, -0.009], [-0.45, -0.042]], 0.002, gunOlive, { x: sx * 0.041, bevel: 0.001 });
    bolt(K, gunDark, gunMid, sx * 0.044, 0.036, -0.452, 0.006);
  }
  // CF-1 (b): the stock's release lever under its front, hinged at the front (drawn at the gun's scale, so z / depth).
  const stockRelease = K.group(0, -0.0115, -0.338); stockRelease.name = 'launcher-stock-release';
  K.box(0.012, 0.005, 0.03, gunDark, 0, -0.0025, -0.015, 0.12, 0, 0, stockRelease, 0.0015);
  for (const p of gun.children.slice(stockStart)) stock.add(p);
  stock.position.set(0, 0.04, -0.25);
  for (const piece of stock.children) { piece.position.y -= 0.04; piece.position.z += 0.25; }   // at rest unchanged; X now tilts the stock
  stock.scale.z = stockDepthScale;   // collapsed M32A1 stock; pivot and firing grip stay fixed
  const pivot = K.cyl(bossRadius, bossRadius, .11, gunDark, 0, bossY, bossZ, null, bossSegments, 'x');
  // Only the rear halves of these graphics project from the case.
  trimPanelBack(THREE, pivot, -1, -bossZ, 'z');
  for (const sx of [-1, 1]) {
    const cap = K.cyl(.022, .022, .0035, gunMid, sx * .05675, bossY, bossZ, null, 12, 'x');
    trimPanelBack(THREE, cap, -1, -bossZ, 'z');
    const tab = K.box(.004, .008, .015, gunDark, sx * .06, .061, -.245, 0, 0, 0, null, .001);
    trimPanelBack(THREE, tab, sx, .0585);
    trimPanelBack(THREE, tab, -1, -bossZ, 'z');
  }
  gun.userData.fpStock = stock;
  bindModelArtwork(gun, 'controls', 'stockRelease', stockRelease);
  // A2-style moulding on the same grip centre: one index-finger nub, shallow
  // lower grooves, a backstrap swell and a capped base. The 52 mm local width
  // is 36 mm at the launcher's game scale, so the glove can wrap the sides.
  const launcherGrip = (points) => gripShape(-0.05, -0.1, 0.16, 0.08, 0.3, points);
  K.slab(launcherGrip([
    [-0.08, 0.014], [0.06, 0.026], [0.28, 0.028], [0.37, 0.028], [0.43, 0.039],
    [0.51, 0.029], [0.7, 0.03], [0.9, 0.028], [1, 0.018], [1, -0.028],
    [0.8, -0.036], [0.5, -0.04], [0.2, -0.036], [0.04, -0.034], [-0.06, -0.043]
  ]), 0.052, gunPoly, { bevel: 0.009, segs: 3 });
  for (const sx of [-1, 1]) {
    const cheek = K.slab(launcherGrip([[0.14, 0.014], [0.79, 0.016], [0.86, -0.024], [0.14, -0.026]]),
      0.004, gunRubber, { x: sx * 0.026, bevel: 0.002 });
    trimPanelBack(THREE, cheek, sx, .026);
    for (const y of [-0.091, -0.107, -0.123])
      K.box(0.0015, 0.002, 0.027, gunPoly, sx * 0.0284, y, -0.05, 0.25, 0, 0, null, 0.0005);
  }
  for (const u of [0.59, 0.76]) K.slab(launcherGrip([[u, 0.018], [u + 0.025, 0.019], [u + 0.025, 0.032], [u, 0.032]]),
    0.047, gunRubber, { bevel: 0.001 });
  K.slab(launcherGrip([[0.965, 0.025], [1.035, 0.022], [1.035, -0.033], [0.965, -0.035]]),
    0.054, gunDark, { bevel: 0.003 });
  K.slab(gunBand([[0.03, -0.058], [0.03, -0.088], [0.016, -0.096], [-0.01, -0.09]], 0.007), 0.03, gunDark, { bevel: 0.004 });   // GB-180: a moulded guard, not a wire (pass 4: as wide as a real guard)
  // GB-175: trigger face toward the grip, tip curling forward (the convention Jerry set on the revolver and sniper).
  // GB-180: a solid trigger blade (wide at the root, tapering to the curled tip), not a wire.
  addTriggerArtwork(gun, K, [[0.0219, -0.062], [0.0173, -0.0725], [0.0179, -0.0788], [0.0223, -0.0832], [0.0177, -0.0888], [0.0101, -0.0832], [0.0067, -0.0715], [0.0101, -0.058]], 0.011, gunAccent, { bevel: 0.002 });
  // 6-chamber drum like a real M32/Milkor: cylinder axis along the bore (+z),
  // chambers parallel to the barrel, circular faces front/rear — not sideways.
  const drumHinge = new THREE.Group();
  drumHinge.position.set(-0.14, -0.02, 0.12);
  // CI-1 (J151 note 56): a revolver-style crane. The arm that swings the drum no longer runs into the drum's side to
  // its axle (the old arm ended at the drum's centre and the fixed bracket sat 47 mm inside the drum). The crane arm
  // runs IN FRONT of the drum's front face, from a sleeve on the hinge pin to the front spring housing, the hub the
  // axle hangs from; the drum turns on that axle. The pin is held by two fixed knuckles: a rear lug off the
  // receiver's left wall behind the drum and a front lug off the barrel ahead of the crane. Same pivot and swing.
  const hingeLugs = [
    K.box(0.07, 0.026, 0.036, gunDark, -0.107, -0.02, 0.022, 0, 0, 0, null, 0.005),   // rear lug, behind the drum
    K.box(0.13, 0.022, 0.014, gunDark, -0.14 + 0.065 * 0.9191, -0.02 + 0.065 * 0.3939, 0.210, 0, 0, Math.atan2(0.06, 0.14), null, 0.004)   // front lug, barrel to pin
  ];
  for (const z of [0.022, 0.210]) hingeLugs.push(K.cyl(0.021, 0.021, z < 0.1 ? 0.036 : 0.014, gunDark, -0.14, -0.02, z, null, 14));   // fixed knuckles
  hingeLugs.push(K.cyl(0.0125, 0.0125, 0.213, gunDark, -0.14, -0.02, 0.1105, null, 10));   // the hinge pin through all three knuckles
  K.cyl(0.021, 0.021, 0.097, gunMid, 0, 0, 0.0315, drumHinge, 14);   // crane sleeve on the pin (turns with the drum)
  K.box(0.12, 0.020, 0.012, gunMid, 0.06, -0.004, 0.074, 0, 0, 0, drumHinge, 0.004);   // crane arm ahead of the drum face, into the front housing (the hub)
  // The fixed lugs, knuckles and pin, for tci1 (none inside the drum at any swing). Not enumerable: finishGun keeps every
  // enumerable userData object out of its merge, and these merge into the gun's batches like the rest of the frame.
  Object.defineProperty(gun.userData, 'hingeFixed', { value: hingeLugs, enumerable: false });
  const drumLatch = new THREE.Group();
  drumLatch.position.set(-0.076, 0.057, 0.043);
  K.box(0.031, 0.011, 0.064, gunDark, 0, 0, 0, 0, 0, 0, drumLatch, 0.003);
  K.cyl(0.007, 0.007, 0.035, gunAccent, 0, 0, -0.024, drumLatch, 10, 'x');
  heads(THREE, drumLatch, gunAccent, 'slot', [{ x: 0, y: 0.0055, z: 0.014, axis: 'y', side: 1, r: 0.0035, turn: 0.4 }]);   // CF-1 (a)
  gun.add(drumLatch);
  // CF-1 (a): the hinge pin's two heads, proud of the bracket at each end.
  pinEnds(THREE, gun, gunAccent, [{ x: -0.14, y: -0.02, z: 0.1105, axis: 'z', span: 0.213, r: 0.014 }]);   // CI-1: the pin's span through the new knuckles
  const drum = new THREE.Group();
  drum.position.set(0.14, 0, 0);
  K.cyl(0.018, 0.018, 0.14, gunMid, 0, 0, 0, drum, 8);
  part(THREE, launcherDrum(THREE, 'core'), gunMid, drum);
  markPaintSurface(part(THREE, launcherDrum(THREE, 'shell'), gunMid, drum), 'cylinder');   // CG-6 (J153 26): the painted outer wall
  K.cyl(0.041, 0.041, 0.019, gunDark, 0, 0, 0.072, drum, 16, 'z');   // cylinder spring's forward housing
  K.cyl(0.015, 0.015, 0.011, gunMid, 0, 0, 0.085, drum, 12, 'z');   // winding axle cap
  // The dark ring starts at the side graphic and keeps its original outer face.
  for (const side of [-1, 1]) {
    const face = side * launcherDrumFace, lip = side * (launcherDrumFace + .0015);
    const back = Math.min(face, lip), front = Math.max(face, lip);
    K.lathe([[.098,back],[.112,back],[.112,front],[.098,front],[.098,back]], gunDark, {parent:drum, seg:36});
  }
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3, x = Math.sin(a) * 0.065, y = Math.cos(a) * 0.065;
    K.lathe([[0.029, 0.065], [0.034, 0.065], [0.034, 0.070], [0.029, 0.070], [0.029, 0.065]],
      gunAccent, { x, y, parent: drum, seg: 16 }); // steel lips around the six open chamber mouths
  }
  // The loose copy and the six inventory inserts use one matte, vertex-coloured prop.
  const roundArt = roundGeometry(THREE, 'launcher');
  roundArt.computeBoundingBox();
  const artSize = roundArt.boundingBox.getSize(new THREE.Vector3());
  const roundFinish = new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: .78, metalness: .18
  });
  function placeRound(parent, x, y, z, width, height) {
    const mesh = new THREE.Mesh(roundArt, roundFinish);
    mesh.rotation.x = Math.PI / 2;
    mesh.scale.set(width / artSize.x, height / artSize.y, width / artSize.z);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  const emptyArt = spentCaseGeometry(THREE, 'launcher');
  emptyArt.computeBoundingBox();
  const drumRounds = [], drumNoses = [], displayedRounds = [], displayedCases = [];
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const cx = Math.sin(ang) * 0.065, cy = Math.cos(ang) * 0.065;
    const round = new THREE.Group();
    const mesh = placeRound(round, cx, cy, -.0035, .063, .131);
    round.name = 'launcher-loaded-inserts-slot-' + i;
    const nose = new THREE.Group();
    nose.name = 'launcher-live-display-' + i;
    round.add(nose);
    drumNoses.push(nose);
    displayedRounds.push({anchor:round, mesh, gate:nose});

    // The alternate appearance shares the loaded prop's back face and scale.
    // The shell belongs to its occupied slot until the reload clears that slot.
    const empty = new THREE.Mesh(emptyArt, roundFinish);
    empty.quaternion.copy(mesh.quaternion);
    empty.scale.copy(mesh.scale);
    empty.position.copy(mesh.position);
    empty.position.z += (roundArt.boundingBox.min.y - emptyArt.boundingBox.min.y) * mesh.scale.y;
    round.add(empty);
    displayedCases.push({anchor:round, mesh:empty, gate:nose, whenVisible:false});
    drum.add(round);
    drumRounds.push(round);
    const fa = ang + Math.PI / 6;
    K.box(0.012, 0.004, 0.083, gunDark, Math.sin(fa) * 0.105, Math.cos(fa) * 0.105, 0, 0, 0, -fa, drum, 0.002);
    for (const z of [-0.043, 0.043]) K.box(0.016, 0.007, 0.01, gunAccent, Math.sin(fa) * 0.103, Math.cos(fa) * 0.103, z, 0, 0, -fa, drum, 0.001);
  }
  // A small rear winding key is reachable only after the cylinder swings out.
  const drumWinder = new THREE.Group();
  drumWinder.position.z = -0.071;
  K.cyl(0.011, 0.011, 0.014, gunAccent, 0, 0, 0, drumWinder, 12);
  K.box(0.042, 0.009, 0.009, gunDark, 0.019, 0, -0.003, 0, 0, 0, drumWinder, 0.003);
  drum.add(drumWinder);
  drumHinge.add(drum);
  gun.add(drumHinge);
  addArtworkInstances(THREE, gun, drum, 'launcher-loaded-inserts', displayedRounds);
  addArtworkInstances(THREE, gun, drum, 'launcher-spent-inserts', displayedCases, {fixedCapacity:true});
  gun.userData.drumNoses = drumNoses;
  gun.userData.drum = drum;
  gun.userData.drumRounds = drumRounds;
  gun.userData.drumWinder = drumWinder;
  gun.userData.drumHinge = drumHinge;
  gun.userData.drumLatch = drumLatch;
  gun.userData.baseDrumHingeRot = drumHinge.rotation.clone();
  gun.userData.baseDrumHingePos = drumHinge.position.clone();
  gun.userData.baseDrumRot = drum.rotation.clone();
  gun.userData.baseDrumPos = drum.position.clone();
  gun.userData.mag = drumHinge;
  gun.userData.baseMagPos = drumHinge.position.clone();
  gun.userData.baseMagRot = drumHinge.rotation.clone();
  // One loose 40 mm round for the support palm during each loading trip. Its origin is the round's centre;
  // keep it as a hidden direct child so the first-person copy can move it independently of the drum.
  const loadRound = K.group(0, 0, 0);
  placeRound(loadRound, 0, 0, 0, .055, .104);
  loadRound.visible = false;
  gun.userData.loadRound = loadRound;
  gun.userData.baseLoadRoundPos = loadRound.position.clone();
  gun.userData.baseLoadRoundRot = loadRound.rotation.clone();
  gun.userData.reloadParts = Object.assign(gun.userData.reloadParts || {}, {
    loadRound: { restPos: [0, 0, 0], restRot: [0, 0, 0], visibleAtRest: false,
      note: 'one loose grenade in the support palm, reused for each insertion' }
  });
  // Barrel shroud and original foregrip contact, with short accessory rails clear of the front sight.
  // The square collar fills the middle of this graphic. Both visible ends share its heat material.
  const barrel = K.lathe([[0, .2], [.052, .2], [.052, collarBack], [0, collarBack],
    [0, collarFront], [.052, collarFront], [.052, .66], [0, .66]], gunAccent, { y: .04, seg: 16 });
  const firstRailPart = gun.children.length;
  for (const x of [0.058, -0.058]) K.box(0.012, 0.03, 0.3, gunDark, x, 0.04, 0.42);
  K.box(0.03, 0.012, 0.3, gunDark, 0, -0.018, 0.42);
  const topStrip = K.box(0.037, 0.006, 0.37, gunDark, 0, 0.091, 0.46, 0, 0, 0, null, 0.001);
  seatBoxArt(topStrip, 'y', () => 0.04 + 0.052);
  K.rail(0.37, 0, 0.101, 0.46, null, 0.049);   // 12-o'clock rail, behind the front post
  for (const sx of [-1, 1]) K.rail(0.36, sx * 0.068, 0.04, 0.46, null, 0.025, sx);   // 3 and 9
  K.rail(0.34, 0, -0.018, 0.46, null, 0.03, 2);   // 6-o'clock rail under the foregrip mount
  for (const piece of gun.children.slice(firstRailPart)) markPaintSurface(piece, 'rail');
  K.slab([[0.395, -0.02], [0.445, -0.02], [0.44, -0.148], [0.43, -0.156], [0.405, -0.156], [0.398, -0.148]], 0.048, gunPoly, { bevel: 0.014, segs: 3 });
  for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) K.box(0.002, 0.006, 0.033, gunDark, sx * 0.025, -0.05 - i * 0.014, 0.419, 0, 0, 0, null, 0.001);
  const noseBack = .65;
  K.lathe([[0, noseBack], [0.062, noseBack], [0.062, 0.68], [0.042, 0.682], [0.042, 0.672], [0, 0.672]], gunDark, { y: 0.04, seg: 16 });
  gunEffects(gun, new THREE.Vector3(0, 0.04, 0.72), 0.07, 3, 6, 0.006, 0xff9966, 0xff8844);
  gun.userData.laser.position.set(0, 0.04, 3.7);
  gun.userData.laserBaseZ = 0.72;
  gun.userData.barrelAssembly = null;
  gun.userData.partFinish = true;
  for (const piece of gun.children) {
    if (piece.material === receiverSteel) markPaintSurface(piece, 'receiver');
    else if (piece.material === gunPoly) markPaintSurface(piece, 'furniture');
  }
  for (const piece of stock.children) {
    if (piece.material === gunOlive) markPaintSurface(piece, 'furniture');
  }
  for (const piece of framePlates) markPaintSurface(piece, 'receiver');
  bindModelArtwork(gun, 'controls', 'safety', safety);
  bindModelArtwork(gun, 'controls', 'drumLatch', drumLatch);
  attachLaserLight(gun, 'launcher', ctx);
  const lamp = gun.userData.laserLightUnit;
  for (const name of ['moduleShell', 'topPlate']) markPaintSurface(lamp.getObjectByName(name), 'light shell');
  bindModelArtwork(gun, 'heatParts', 'barrel', groupArtwork(THREE, barrel));
  // Set the shared face after grouping so the heat anchor keeps its original transform.
  fitLauncherNose(THREE, barrel, noseBack);
  return finishGun(gun);
}

// The detachable tank keeps its complete shell. Only the three underside facets of
// the fixed case that it reaches receive a recess. The remaining case triangles
// keep their original positions, shading and UVs.
const flamerCaseSkins = new WeakMap();
function fitFlamerCase(T, housing, tank) {
  const original = housing.geometry;
  if (flamerCaseSkins.has(T)) {
    housing.geometry = flamerCaseSkins.get(T);
    original.dispose();
    return;
  }
  const {position, normal, uv} = original.attributes;
  const positions = [], normals = [], uvs = [], rows = new Map();
  const point = i => new T.Vector3().fromBufferAttribute(position, i);
  for (let i = 0; i < position.count; i += 3) {
    const face = [point(i), point(i+1), point(i+2)];
    const underside = face.every(p => p.y < -.031 && Math.abs(p.x) < .053)
      && face.some(p => p.z < -.14) && face.some(p => p.z > .30);
    if (underside) {
      for (const p of face) {
        if (!rows.has(p.x)) rows.set(p.x, {x:p.x, y:p.y});
        rows.get(p.x)[p.z < 0 ? 'rear' : 'front'] = p;
      }
      continue;
    }
    for (let j=i; j<i+3; j++) {
      positions.push(position.getX(j),position.getY(j),position.getZ(j));
      normals.push(normal.getX(j),normal.getY(j),normal.getZ(j));
      uvs.push(uv.getX(j),uv.getY(j));
    }
  }
  const floor = [...rows.values()].sort((a,b) => a.x-b.x);
  const outer = [...floor.map(r=>r.rear), ...floor.map(r=>r.front).reverse()];
  // Clip a polygon against a plane. Adjacent tank triangles use the same planes,
  // so the pocket lip and the curved recess share all their boundary vertices.
  function clip(poly, distance) {
    const out = [];
    for (let i=0; i<poly.length; i++) {
      const a=poly[i], b=poly[(i+1)%poly.length], da=distance(a), db=distance(b);
      if (da >= -1e-11) out.push(a);
      if ((da < -1e-11 && db > 1e-11) || (db < -1e-11 && da > 1e-11))
        out.push(a.clone().lerp(b,da/(da-db)));
    }
    return out;
  }
  const strips=floor.slice(1).map((b,i)=>{
    const a=floor[i], slope=(b.y-a.y)/(b.x-a.x);
    return {left:a.x,right:b.x,height:x=>a.y+(x-a.x)*slope};
  });
  const inStrip=(poly,s)=>clip(clip(poly,p=>p.x-s.left),p=>s.right-p.x);
  function triangle(a,b,c,direction) {
    const n=b.clone().sub(a).cross(c.clone().sub(a));
    if (n.lengthSq()<1e-24) return;
    if (n.dot(direction)<0) { [b,c]=[c,b]; n.multiplyScalar(-1); }
    n.normalize();
    for (const p of [a,b,c]) {
      positions.push(p.x,p.y,p.z); normals.push(n.x,n.y,n.z); uvs.push(p.x/.42,p.z/.42);
    }
  }
  const rim=new Map(), tp=tank.geometry.attributes.position;
  const key=p=>Math.round(p.x*1e8)+','+Math.round(p.z*1e8);
  for (let i=0; i<tp.count; i+=3) {
    const face=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(tp,i+j).add(tank.position));
    for (const s of strips) {
      const cut=clip(inStrip(face,s),p=>p.y-s.height(p.x));
      if (cut.length<3) continue;
      const inward=face[2].clone().sub(face[0]).cross(face[1].clone().sub(face[0]));
      for (const p of cut) if (Math.abs(p.y-s.height(p.x))<1e-9) rim.set(key(p),p);
      for (let j=1;j+1<cut.length;j++) triangle(cut[0],cut[j],cut[j+1],inward);
    }
  }
  const lip=[...rim.values()], centre=new T.Vector3();
  for (const p of lip) centre.add(p);
  centre.multiplyScalar(1/lip.length);
  const angle=p=>Math.atan2(p.z-centre.z,p.x-centre.x);
  lip.sort((a,b)=>angle(a)-angle(b));
  const map=p=>new T.Vector2(p.x,p.z), outline=[...outer,...lip];
  const faces=T.ShapeUtils.triangulateShape(outer.map(map),[lip.map(map)]);
  const down=new T.Vector3(0,-1,0);
  for (const face of faces) for (const s of strips) {
    const poly=inStrip(face.map(i=>outline[i]),s);
    if (poly.length<3) continue;
    // Earcut can omit collinear lip points. Keep each on its original edge so
    // the painted floor shares the exact same edges as the tank-shaped recess.
    const boundary=[];
    for (let i=0;i<poly.length;i++) {
      const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;
      boundary.push(a);
      if (len<1e-18) continue;
      const along=p=>((p.x-a.x)*dx+(p.z-a.z)*dz)/len;
      const between=outline.filter(p=>along(p)>1e-7 && along(p)<1-1e-7
        && Math.abs((p.x-a.x)*dz-(p.z-a.z)*dx)<1e-10*Math.sqrt(len));
      boundary.push(...between.sort((p,q)=>along(p)-along(q)));
    }
    const mid=new T.Vector3();
    for (const p of boundary) mid.add(p);
    mid.multiplyScalar(1/boundary.length); mid.y=s.height(mid.x);
    for (let i=0;i<boundary.length;i++) {
      const a=boundary[i].clone(), b=boundary[(i+1)%boundary.length].clone();
      a.y=s.height(a.x); b.y=s.height(b.x); triangle(mid,a,b,down);
    }
  }
  const skin=new T.BufferGeometry();
  skin.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  skin.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  skin.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  skin.computeBoundingSphere(); skin.userData.shared=true;
  flamerCaseSkins.set(T,skin); housing.geometry=skin; original.dispose();
}

// Keep the exposed tail of the rear grip mount where it passes behind the case.
// Cut only its roof. The three heights follow the end and underside of the drawn case.
const flamerMountSkins = new WeakMap();
function fitFlamerMount(T, mount) {
  const source = mount.geometry;
  if (flamerMountSkins.has(T)) {
    mount.geometry = flamerMountSkins.get(T);
    source.dispose();
    return;
  }
  const {position, normal, uv} = source.attributes;
  const points = [], normals = [], texcoords = [];
  const cuts = [-.1704, -.17, -.152];
  const heights = [-.022, -.028, -.035];
  function split(polygon, distance) {
    const below = [], above = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      const da = distance(a), db = distance(b);
      if (da <= 1e-10) below.push(a);
      if (da >= -1e-10) above.push(a);
      if ((da < -1e-10 && db > 1e-10) || (da > 1e-10 && db < -1e-10)) {
        const t = da / (da - db);
        const v = {p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t), uv: a.uv.clone().lerp(b.uv, t)};
        below.push(v);
        above.push(v);
      }
    }
    return [below, above];
  }
  function emit(poly) {
    for (let j = 2; j < poly.length; j++) {
      const a = poly[0].p, b = poly[j-1].p, c = poly[j].p;
      if (b.clone().sub(a).cross(c.clone().sub(a)).lengthSq() < 1e-24) continue;
      for (const v of [poly[0], poly[j-1], poly[j]]) {
        points.push(v.p.x, v.p.y, v.p.z);
        normals.push(v.n.x, v.n.y, v.n.z);
        texcoords.push(v.uv.x, v.uv.y);
      }
    }
  }
  function roof(poly, startZ, startY, slope) {
    const height = z => startY + slope * (z + mount.position.z - startZ) - mount.position.y;
    const distance = v => v.p.y - height(v.p.z);
    if (poly.every(v => distance(v) <= 1e-10)) { emit(poly); return; }
    const [kept, raised] = split(poly, distance);
    emit(kept);
    const n = new T.Vector3(0, 1, -slope).normalize();
    emit(raised.map(v => {
      const p = new T.Vector3(v.p.x, height(v.p.z), v.p.z);
      return {p, n, uv: new T.Vector2(p.x / .42, (Math.abs(slope) > 1 ? p.y : p.z) / .42)};
    }));
  }
  const index = source.index, count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) {
    let remaining = [0, 1, 2].map(j => {
      const k = index ? index.getX(i+j) : i+j;
      return {p: new T.Vector3().fromBufferAttribute(position, k), n: new T.Vector3().fromBufferAttribute(normal, k),
        uv: new T.Vector2().fromBufferAttribute(uv, k)};
    });
    // The tail behind the case is entirely exposed.
    if (remaining.every(v => v.p.z + mount.position.z < cuts[0])) { emit(remaining); continue; }
    for (let j = 0; j < cuts.length && remaining.length; j++) {
      const [left, right] = split(remaining, v => v.p.z + mount.position.z - cuts[j]);
      if (!j) emit(left);
      else roof(left, cuts[j-1], heights[j-1], (heights[j] - heights[j-1]) / (cuts[j] - cuts[j-1]));
      remaining = right;
    }
    roof(remaining, cuts[2], heights[2], 0);
  }
  const skin = new T.BufferGeometry();
  skin.setAttribute('position', new T.Float32BufferAttribute(points, 3));
  skin.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  skin.setAttribute('uv', new T.Float32BufferAttribute(texcoords, 2));
  skin.computeBoundingSphere();
  flamerMountSkins.set(T, skin);
  mount.geometry = skin;
  source.dispose();
}

export function makeFlamerModel(ctx) {
  const { THREE, gunKit, gunBand, gripOutline, finishGun, gunBody, gunDark, gunMid, gunAccent, gunPoly, gunRubber, steelMat, brassMat, fuelRedMat, hazardYellow, gaugeFace } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  const fieldCoat = gunBody.clone();
  gun.userData.partFinish = true;
  fieldCoat.name = 'flamer field enamel';
  fieldCoat.userData.weaponFinishRole = 'receiver';
  fieldCoat.color.setHex(0x58615b);
  fieldCoat.roughness = .65;
  fieldCoat.metalness = .16;
  const tankEnamel = fuelRedMat.clone();
  tankEnamel.name = 'flamer red enamel';
  tankEnamel.color.setHex(0x913d32);
  tankEnamel.roughness = .63;
  tankEnamel.metalness = .13;
  // CI-1 (J151 note 52: "The tank needs to be able to take camo"): the two tank shells take the gun's coat; the
  // valves, gauge, straps, brass and hoses keep their own finish.
  tankEnamel.userData.weaponFinishRole = 'tank';
  // CI-1 (J151 note 50): tritium. The dial's strokes and the needle are self-lit green paint: pale green by day, a
  // green glow in the dark (an emissive the bloom picks up at night; daylight washes it out like the real thing).
  const tritium = new THREE.MeshStandardMaterial({ color: 0xb8e6b0, emissive: 0x3dff6e, emissiveIntensity: .85, roughness: .5, metalness: 0 });
  tritium.name = 'flamer gauge tritium';
  const shroudSteel = gunMid.clone();
  shroudSteel.name = 'flamer satin shroud';
  shroudSteel.color.setHex(0x626b69);
  shroudSteel.roughness = .61;
  shroudSteel.metalness = .32;
  const sleeve = gunRubber.clone();
  sleeve.name = 'flamer hose rubber';
  sleeve.color.setHex(0x363938);
  sleeve.roughness = .86;
  sleeve.metalness = 0;
  const dial = gaugeFace.clone();
  dial.name = 'flamer dial enamel';
  dial.color.setHex(0xbabaab);
  dial.roughness = .76;
  // Angular sheet-metal case and inset blank service panels: no rail or lettering.
  const housing = K.slab([[-0.17, 0.076], [-0.17, -0.028], [-0.152, -0.035], [0.321, -0.035], [0.336, -0.022], [0.336, 0.078], [0.316, 0.095], [-0.142, 0.095]], 0.11, fieldCoat, { bevel: 0.007 });
  K.box(0.074, 0.0015, 0.28, fieldCoat, 0, 0.096, 0.076, 0, 0, 0, null, 0.002); // inset top service skin
  // Transverse pressed seams catch the light without changing the case silhouette.
  for (const z of [-0.112, 0.268]) K.box(0.083, 0.0018, 0.003, fieldCoat, 0, 0.096, z, 0, 0, 0, null, 0.001);
  for (const sx of [-1, 1]) {
    // CF-1 (c): the outer side plates are painted case steel.
    markPaintSurface(K.slab([[-0.133, -0.022], [0.272, -0.022], [0.284, -0.01], [0.284, 0.055], [0.266, 0.072], [-0.115, 0.072], [-0.133, 0.058]], 0.007, gunDark, { x: sx * 0.0585, bevel: 0.002 }), 'receiver');
    K.slab([[-0.12, -0.013], [0.27, -0.013], [0.273, -0.004], [0.273, 0.052], [0.26, 0.062], [-0.105, 0.062], [-0.12, 0.05]], 0.003, fieldCoat, { x: sx * 0.0635, bevel: 0.001 });
    for (const [z, y] of [[-0.120, 0.050], [0.260, 0.050], [-0.120, -0.010], [0.260, -0.010], [-0.106, 0.047], [0.256, 0.047]]) bolt(K, gunDark, gunAccent, sx * 0.066, y, z, 0.0038);   // GB-297: corner bolts seated on the side panel face
  }
  // GP-20063: the compact tank/trigger body stays at its fitted hand points;
  // stretch only the wand ahead of its 0.29 m shoulder toward the 1.29 m reference.
  const wand = K.group(0, 0, 0);
  const W = gunKit(wand);
  const wandZ = 1.445;
  wand.scale.z = wandZ;
  wand.position.z = 0.29 * (1 - wandZ);
  W.lathe([[0, 0.29], [0.035, 0.29], [0.035, 0.71], [0, 0.71]], gunDark, { y: 0.05, seg: 12 });
  part(THREE, ventTube(THREE, 0.046, 0.004, 0.29, 6, 6, 0.44, 0.60), shroudSteel, wand, 0, 0.05, 0.375);
  // The two trim rings meet the perforated skin at its first and last rows.
  W.lathe([[.035,.364],[.05,.364],[.052,.367],[.052,.375],[.035,.375],[.035,.364]], gunAccent, { y: .05, seg: 24 });
  W.lathe([[.035,.665],[.052,.665],[.052,.671],[.035,.674],[.035,.665]], gunAccent, { y: .05, seg: 24 });
  // Nozzle: a thick flared bell, the igniter housing under it, the pilot light.
  const nozzle = W.lathe([[0.034, 0.69], [0.038, 0.69], [0.062, 0.786], [0.062, 0.792], [0.054, 0.792], [0.032, 0.705], [0.034, 0.69]], gunAccent, { y: 0.05, seg: 16 });
  nozzle.name = 'flamerNozzle';
  W.box(0.03, 0.04, 0.08, gunDark, 0, 0.0, 0.7, 0, 0, 0, null, 0.01);
  W.cyl(0.004, 0.004, 0.05, steelMat, 0, 0.02, 0.73, null, 5, 'y');
  W.cyl(0.009, 0.009, 0.058, brassMat, 0, 0.01, 0.746, null, 8);
  W.cyl(0.005, 0.005, 0.015, steelMat, 0, 0.01, 0.78, null, 8);
  // GP-20044: the pilot sits below the bell, inside an open steel cage instead
  // of hidden in the bore. The sparker cable is clamped to the wand underside.
  for (const sx of [-1, 1]) {
    W.box(0.002, 0.024, 0.043, gunMid, sx * 0.017, -0.001, 0.702, 0, 0, 0, null, 0.001);
    W.box(0.002, 0.004, 0.024, brassMat, sx * 0.019, 0.002, 0.7, 0, 0, 0, null, 0.0005);
    rod(THREE, W, [sx * 0.018, -0.028, 0.735], [sx * 0.018, -0.028, 0.788], 0.0026, steelMat);
  }
  for (const z of [0.736, 0.786])
    W.lathe([[0.015, z - 0.002], [0.02, z - 0.002], [0.02, z + 0.002], [0.015, z + 0.002]], gunAccent, { y: -0.028, seg: 10 });
  for (let i = 0; i < 8; i++) {
    const pt = u => [0, -0.014 - Math.sin(Math.PI * u) * 0.007, 0.285 + 0.4 * u];
    rod(THREE, W, pt(i / 8), pt((i + 1) / 8), 0.0033, gunRubber);
  }
  for (const z of [0.37, 0.57]) W.box(0.018, 0.004, 0.01, gunMid, 0, -0.018, z, 0, 0, 0, null, 0.002);
  rod(THREE, W, [0, -0.018, 0.727], [0, -0.028, 0.766], 0.003, steelMat); // seated pilot electrode
  const pilot = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff6a10, emissiveIntensity: 1.6 }));
  pilot.position.set(0, -0.028, 0.766); wand.add(pilot);
  gun.userData.pilot = pilot.material;
  // Fuel tanks with domed ends shifted forward of the rear pistol grip/trigger so the grip is fully exposed:
  // straps, mounting brackets, manifold valves, connected front/rear hoses, and a pressure gauge.
  const tanks = K.group(0, 0, 0);
  const tankKit = gunKit(tanks);
  const dome = (r, z0, z1) => [[0, z0], [r * 0.55, z0 + r * 0.06], [r * 0.85, z0 + r * 0.2], [r, z0 + r * 0.45], [r, z1 - r * 0.45], [r * 0.85, z1 - r * 0.2], [r * 0.55, z1 - r * 0.06], [0, z1]];
  const mainTank = tankKit.lathe(dome(0.075, -0.048, 0.205), tankEnamel, { y: -0.09, seg: 16 });
  fitFlamerCase(THREE, housing, mainTank);
  tankKit.lathe(dome(0.056, -0.038, 0.175), tankEnamel, { x: 0.11, y: -0.05, seg: 14 });
  for (const z of [0.005, 0.14]) {
    // Upper saddle bracket bolting the tanks into the underside of the receiver housing.
    tankKit.box(0.064, 0.032, 0.024, gunDark, 0.035, -0.036, z, 0, 0, 0, null, 0.003);
    for (const [x, y, r] of [[0, -0.09, 0.077], [0.11, -0.05, 0.058]]) {
      const outer = r + (x === 0 ? 0.008 : 0.007); // retain the old rounded strap's support envelope
      // Let the painted band's inside follow the facets of the coloured shell.
      const inside = r - .002, facets = x === 0 ? 16 : 14;
      tankKit.lathe([[inside, z - .012], [outer, z - .012], [outer, z + .012], [inside, z + .012], [inside, z - .012]], gunPoly, { x, y, seg: facets });
      tankKit.box(0.011, 0.03, 0.031, gunMid, x + r + 0.002, y, z, 0, 0, 0, null, 0.002);
      tankKit.box(0.012, 0.018, 0.016, gunDark, x + r + 0.004, y, z, 0, 0, 0, null, 0.001);
      tankKit.cyl(0.0032, 0.0032, 0.002, steelMat, x + r + 0.006, y, z, null, 8, 'x');
    }
  }
  // The detachable pack carries the valves. Its two outlets plug upward into a
  // manifold bolted to the receiver; all flexible plumbing stays above that joint.
  for (const [x,y,z] of [[0,-0.09,0.21],[0.11,-0.05,0.184]]) {
    tankKit.cyl(0.021, 0.021, 0.030, gunDark, x, y, z, null, 12);
    tankKit.cyl(0.012, 0.012, -y - 0.003, brassMat, x, (y - 0.003) / 2, z, null, 8, 'y');
  }
  // CF-1 (b): the tank valve is its own part (the yellow handwheel and its bar), turning about the outlet's axis (z).
  const valve = tankKit.group(0.11, -0.05, 0.204); valve.name = 'flamer-valve';
  tankKit.cyl(0.022, 0.012, 0.010, hazardYellow, 0, 0, 0, valve, 12);
  tankKit.box(0.034, 0.006, 0.005, hazardYellow, 0, 0, 0.0065, 0, 0, 0, valve, 0.0015);
  K.box(0.137, 0.020, 0.054, gunMid, 0.055, 0.007, 0.198, 0, 0, 0, null, 0.004);
  // A formed hose hugs the near shoulder of the casing, above the firing wrist.
  const route = new THREE.CatmullRomCurve3([
    [0.102,0.017,0.197], [0.107,0.046,0.179], [0.085,0.062,0.135],
    [0.077,0.064,-0.098], [0.073,0.061,-0.138], [0.055,0.052,-0.146]
  ].map(p => new THREE.Vector3(...p)));
  part(THREE, new THREE.TubeGeometry(route, 18, 0.008, 8, false), sleeve, gun);
  K.cyl(0.013, 0.013, 0.012, brassMat, 0.102, 0.023, 0.197, null, 8, 'y');
  K.cyl(0.013, 0.013, 0.014, brassMat, 0.062, 0.052, -0.146, null, 8, 'x');
  // Rear-facing gauge. Its dial sits on the flat rear bulkhead.
  K.cyl(0.027, 0.027, 0.013, shroudSteel, 0, 0.044, -0.1765, null, 24);
  K.disc(0.022, dial, 0, 0.044, -0.1832, Math.PI, null, 24);
  // Long and short ink strokes keep the small dial legible at the eye.
  for (let i = -6; i <= 6; i++) {
    const a = i * Math.PI / 8;
    const major = i % 2 === 0;
    const inner = major ? .0155 : .018;
    rod(THREE, K, [inner * Math.sin(a), .044 + inner * Math.cos(a), -.1835],
      [.020 * Math.sin(a), .044 + .020 * Math.cos(a), -.1835], major ? .0009 : .0006, tritium);   // CI-1 (note 50): tritium strokes
  }
  const needle = K.group(0, 0.044, -0.184);
  rod(THREE, K, [0,0,0], [0,0.015,0], 0.0013, tritium, needle);   // CI-1 (note 50): a tritium needle
  K.cyl(0.0024, 0.0024, 0.002, gunDark, 0, 0, -0.001, needle, 10);
  needle.rotation.z = -3 * Math.PI / 4;
  needle.name = 'fuel-gauge-needle';
  gun.userData.fuelNeedle = needle;
  // CI-1 (J151 note 50: "The flamethrower gauge needs to show how much fuel is left in the tank"): the needle reads the
  // tank. GT-20106/J153-21: FULL is lower right (-3PI/4) at the native eye,
  // EMPTY lower left (+3PI/4), draining counter-clockwise through twelve o'clock.
  // index.html calls this every frame the flamer
  // is in hand with fuel left / the tank's size. It eases so a refill sweeps the needle up instead of snapping.
  gun.userData.gaugeFull = -3 * Math.PI / 4;
  gun.userData.gaugeEmpty = 3 * Math.PI / 4;
  gun.userData.setFuelGauge = (fraction, dt = 1) => {
    const f = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 1));
    const want = gun.userData.gaugeEmpty + (gun.userData.gaugeFull - gun.userData.gaugeEmpty) * f;
    needle.rotation.z += (want - needle.rotation.z) * Math.min(1, Math.max(0, dt) * 8);
    return needle.rotation.z;
  };
  gun.userData.mag = tanks;
  gun.userData.baseMagPos = tanks.position.clone();
  gun.userData.baseMagRot = tanks.rotation.clone();
  // GB-302: the reload's moving can (off/on). Same group as mag; Claude drives fuelCan.
  gun.userData.fuelCan = tanks;
  gun.userData.baseFuelCanPos = tanks.position.clone();
  gun.userData.baseFuelCanRot = tanks.rotation.clone();
  gun.userData.reloadParts = Object.assign(gun.userData.reloadParts || {}, {
    fuelCan: { restPos: [0, 0, 0], restRot: [0, 0, 0], visibleAtRest: true, note: 'whole tank bank; pull down/away, fresh on with a twist' }
  });
  // Rear pistol grip (now completely clear of the fuel tanks!), grip housing mount, closed trigger guard, and curved trigger.
  const gripMount = K.box(0.054, 0.024, 0.115, gunDark, 0, -0.034, -0.125, 0, 0, 0, null, 0.004);
  fitFlamerMount(THREE, gripMount);
  // Narrow the palm swell to 36 x 59 mm without moving the grip's centre or rake.
  // The moulded finger notches stay in the front edge; rubber side panels carry
  // shallow cross ribs so neither close-up face is an empty rectangle.
  const rearGrip = (outline) => outline.map(([z, y]) => [-0.16 + (z + 0.16) * 0.65, y]);
  const rearGripBody = K.slab(rearGrip([
    [-0.195, -0.032], [-0.122, -0.032], [-0.126, -0.062], [-0.118, -0.082],
    [-0.128, -0.105], [-0.122, -0.126], [-0.132, -0.148], [-0.142, -0.162],
    [-0.196, -0.158], [-0.208, -0.142], [-0.192, -0.092], [-0.202, -0.052]
  ]), 0.036, gunPoly, { bevel: 0.008, segs: 3 });
  trimPanelBack(THREE, rearGripBody, -1, .046, 'y');
  markPaintSurface(rearGripBody, 'furniture');   // CF-1 (c)
  for (const sx of [-1, 1]) {
    const panel = K.slab(rearGrip([[-0.186, -0.052], [-0.136, -0.052], [-0.144, -0.144], [-0.19, -0.142]]),
      0.003, gunRubber, { x: sx * 0.018, bevel: 0.002 });
    trimPanelBack(THREE, panel, sx, .018);
    for (const y of [-0.078, -0.101, -0.124]) {
      const rib = K.box(0.0015, 0.0025, 0.025, gunPoly, sx * 0.0195, y, -0.16, 0.22, 0, 0, null, 0.0005);
      trimPanelBack(THREE, rib, sx, .0195);
    }
  }
  K.box(0.04, 0.012, 0.05, gunDark, 0, -0.162, -0.165, 0, 0, -0.06, null, 0.003);
  K.slab(gunBand([[-0.064, -0.034], [-0.064, -0.064], [-0.078, -0.076], [-0.128, -0.076], [-0.132, -0.062]], 0.007), 0.03, gunDark, { bevel: 0.004 });   // GB-180: a moulded guard, not a wire (pass 4: as wide as a real guard)
  // GB-175: trigger face toward the grip, tip curling forward (the convention Jerry set on the revolver and sniper).
  // GB-180: a solid trigger blade (wide at the root, tapering to the curled tip), not a wire, moved to mid-guard.
  addTriggerArtwork(gun, K, [[-0.088, -0.0357], [-0.0927, -0.0484], [-0.092, -0.056], [-0.0875, -0.0615], [-0.0925, -0.0665], [-0.1, -0.06], [-0.1033, -0.0476], [-0.1, -0.0323]], 0.011, gunAccent, { bevel: 0.002 });
  // CF-1 (a): the trigger pin's two ends in the grip mount's cheeks.
  pinEnds(THREE, gun, gunAccent, [{ x: 0, y: gun.userData.triggerPin[1], z: gun.userData.triggerPin[2], axis: 'x', span: 0.054, r: 0.0026 }]);
  // CF-1 (b): the safety, a thumb lever on the grip mount's left cheek; it turns about x on its boss.
  const safety = K.group(-0.027, -0.034, -0.150); safety.name = 'flamer-safety';
  K.cyl(0.0065, 0.0065, 0.005, gunDark, -0.0015, 0, 0, safety, 12, 'x');
  K.box(0.004, 0.009, 0.028, gunDark, -0.0035, -0.004, -0.014, -0.25, 0, 0, safety, 0.0015);
  heads(THREE, safety, gunAccent, 'slot', [{ x: -0.004, y: 0, z: 0, axis: 'x', side: -1, r: 0.0032, turn: 0.7 }]);
  // Ergonomic angled front pistol foregrip with upper collar, finger grooves, side panels, and flared baseplate.
  K.box(0.056, 0.018, 0.068, gunDark, 0, -0.034, 0.282, 0, 0, 0, null, 0.003);
  // CF-1 (a): the collar's clamp screws, two a side.
  heads(THREE, gun, gunAccent, 'hex', [-1, 1].flatMap(sx => [0.262, 0.302].map(z => ({ x: sx * 0.028, y: -0.034, z, axis: 'x', side: sx, r: 0.0038, turn: z * 11 }))));
  // 36 mm wide, round-ended and 56 mm deep at the support palm. The socket
  // remains (0,-0.07,0.28); the glove can close over the grooves on the front.
  const frontGrip = (outline) => outline.map(([z, y]) => [0.28 + (z - 0.28) * 0.8, y]);
  markPaintSurface(K.slab(frontGrip([
    [0.252, -0.032], [0.312, -0.032], [0.304, -0.058], [0.31, -0.078],
    [0.302, -0.098], [0.307, -0.116], [0.296, -0.134], [0.25, -0.132],
    [0.242, -0.116], [0.254, -0.078], [0.246, -0.048]
  ]), 0.036, gunPoly, { bevel: 0.01, segs: 3 }), 'furniture');   // CF-1 (c)
  // CF-1 (b): the igniter, a short paddle on the front face of the grip's collar, hinged at its top: the support
  // hand's index presses it back. It stays above the fingers' wrap of the grip (tcl334d: no glove inside it).
  const igniter = K.group(0, -0.0265, 0.3160); igniter.name = 'flamer-igniter';
  K.box(0.014, 0.013, 0.004, gunAccent, 0, -0.0065, 0.0015, -0.1, 0, 0, igniter, 0.0012);
  for (const sx of [-1, 1]) {
    const cheek = K.slab(frontGrip([[0.258, -0.048], [0.296, -0.048], [0.29, -0.12], [0.252, -0.118]]),
      0.003, gunRubber, { x: sx * 0.018, bevel: 0.002 });
    trimPanelBack(THREE, cheek, sx, .018);
    for (const y of [-.067, -.087, -.107]) {
      const stripe = K.box(.0015, .0025, .022, gunPoly, sx * .0195, y, .28, -.18, 0, 0, null, .0005);
      trimPanelBack(THREE, stripe, sx, .0195);
    }
  }
  K.box(0.04, 0.011, 0.047, gunDark, 0, -0.135, 0.275, 0, 0, 0, null, 0.003);
  gun.userData.muzzleLocal = new THREE.Vector3(0, 0.05, 0.29 + (0.78 - 0.29) * wandZ);
  bindModelArtwork(gun, 'controls', 'safety', safety);
  bindModelArtwork(gun, 'controls', 'igniter', igniter);
  bindModelArtwork(gun, 'controls', 'valve', valve);
  // GT-20106/GT-20077: the existing bell is the heat surface; keep pilot/cage bare.
  bindModelArtwork(gun, 'heatParts', 'barrel', nozzle);
  // Fixed wand fittings share the receiver's static batches. Bake the complete
  // local matrix, including the wand's nonuniform stretch, without TRS shear loss.
  // The independently heated bell and emissive pilot keep their existing nodes.
  wand.updateMatrix();
  for (const mesh of wand.children.slice()) {
    if (!mesh.isMesh || mesh === nozzle || mesh === pilot) continue;
    mesh.updateMatrix();
    mesh.geometry = mesh.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(wand.matrix, mesh.matrix));
    mesh.geometry.userData.shared = false;
    mesh.position.set(0,0,0); mesh.rotation.set(0,0,0); mesh.scale.set(1,1,1);
    gun.add(mesh);
  }
  // The slot head shares this lever's physical shadow as well as its pivot.
  for (const mesh of safety.children) mesh.castShadow = true;
  foldStatic(THREE, TSL, safety);   // Static artwork only; its named pivot stays movable.
  return finishGun(gun);
}

// CI-1 (J151 note 36): the running chain's blur band. A closed belt over the links' racetrack path (straights at y=+-R
// from z=-L to L, half-circle caps round z=+-L: index.html sampleChainsawChainPath, SAW_CHAIN_L/_R), as thick and wide
// as a link, so a chain at speed reads as a smeared steel band instead of links crawling.
function chainsawBlurBand(T, L, R) {
  return geometry(T, 'chainsaw-blur-band-' + L + '-' + R, (quad) => {
    const out = 0.0068, inn = 0.0052, half = 0.0175, total = 4 * L + 2 * Math.PI * R;
    const at = (s) => {   // position (y, z) and outward normal on the path at arc length s
      s = ((s % total) + total) % total;
      if (s < 2 * L) return [R, -L + s, 1, 0];
      if ((s -= 2 * L) < Math.PI * R) { const a = s / R; return [R * Math.cos(a), L + R * Math.sin(a), Math.cos(a), Math.sin(a)]; }
      if ((s -= Math.PI * R) < 2 * L) return [-R, L - s, -1, 0];
      s -= 2 * L; const a = Math.PI + s / R; return [R * Math.cos(a), -L + R * Math.sin(a), Math.cos(a), Math.sin(a)];
    };
    const marks = [];
    for (const [s0, len, n] of [[0, 2 * L, 6], [2 * L, Math.PI * R, 14], [2 * L + Math.PI * R, 2 * L, 6], [4 * L + Math.PI * R, Math.PI * R, 14]])
      for (let i = 0; i < n; i++) marks.push(s0 + len * i / n);
    for (let i = 0; i < marks.length; i++) {
      const [ya, za, nya, nza] = at(marks[i]), [yb, zb, nyb, nzb] = at(marks[(i + 1) % marks.length]);
      const P = (y, z, ny, nz, r, x) => [x, y + ny * r, z + nz * r];
      quad(P(ya, za, nya, nza, out, -half), P(ya, za, nya, nza, out, half), P(yb, zb, nyb, nzb, out, half), P(yb, zb, nyb, nzb, out, -half), [0, nya, nza], [0, nya, nza], [0, nyb, nzb], [0, nyb, nzb]);
      quad(P(ya, za, nya, nza, -inn, -half), P(yb, zb, nyb, nzb, -inn, -half), P(yb, zb, nyb, nzb, -inn, half), P(ya, za, nya, nza, -inn, half), [0, -nya, -nza], [0, -nyb, -nzb], [0, -nyb, -nzb], [0, -nya, -nza]);
      for (const x of [-half, half])
        quad(P(ya, za, nya, nza, -inn, x), P(ya, za, nya, nza, out, x), P(yb, zb, nyb, nzb, out, x), P(yb, zb, nyb, nzb, -inn, x), [Math.sign(x), 0, 0]);
    }
  });
}

const sawCoverMaps = new WeakMap();
function sawCoverTexture(T) {
  if (sawCoverMaps.has(T)) return sawCoverMaps.get(T);
  const size = 128, data = new Uint8Array(size * size * 4);
  let seed = 0x428e9;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const grain = seed / 0x100000000;
    const cloud = Math.sin((x + 5 * Math.sin(y * Math.PI / 32)) * Math.PI / 32)
      * Math.cos(y * Math.PI / 64);
    const value = Math.round(239 + 7 * cloud - 17 * grain ** 3);
    const i = 4 * (y * size + x);
    data[i] = value; data[i + 1] = value; data[i + 2] = value; data[i + 3] = 255;
  }
  const map = new T.DataTexture(data, size, size);
  map.name = 'moulded tool cover stipple';
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.magFilter = T.LinearFilter; map.minFilter = T.LinearMipmapLinearFilter;
  map.generateMipmaps = true; map.needsUpdate = true;
  sawCoverMaps.set(T, map);
  return map;
}

// The visible metal and rubber share a centreline and meet on matching end rings.
// Each finish is one cached mesh, including the two mounting pads and their caps.
function sawFrontHandle(T, finish) {
  return geometry(T, 'saw-front-'+finish, (quad, tri) => {
    const v = (x,y,z) => new T.Vector3(x,y,z);
    const axis = v(1,0,0), upZ = v(0,0,1);
    const row = (p,t,r,s=r) => ({p,t,r,s});
    const contactQ=new T.Quaternion().setFromUnitVectors(v(0,1,0),v(.01,.103,.045).normalize());
    const contactU=v(0,0,1).applyQuaternion(contactQ),contactV=v(1,0,0).applyQuaternion(contactQ);
    function skin(rows, sides=24, fittedSide=false) {
      const rings = rows.map(({p,t,r,s}) => {
        const u = upZ.clone().cross(t).normalize(), w = t.clone().cross(u).normalize();
        return Array.from({length:sides}, (_,i) => {
          const angle = i * 2 * Math.PI / sides;
          const radial=u.clone().multiplyScalar(r*Math.cos(angle)).addScaledVector(w,s*Math.sin(angle));
          if(fittedSide){
            // Under the posed glove the rounded skin stays inside the former contact facets.
            const sector=Math.atan2(radial.dot(contactV),radial.dot(contactU))/(Math.PI/4);
            const offset=(sector-Math.floor(sector)-.5)*Math.PI/4;
            const envelope=Math.cos(Math.PI/8)/Math.cos(offset);
            const weight=Math.max(0,Math.min(1,(p.y-.123)/.013,(.222-p.y)/.013));
            radial.multiplyScalar(1+(envelope-1)*weight);
          }
          return p.clone().add(radial);
        });
      });
      closeRings(rows,rings);
    }
    function closeRings(rows,rings) {
      const sides=rings[0].length;
      const normals = rings.map((ring,j) => ring.map((point,i) => {
        const around = ring[(i+1)%sides].clone().sub(ring[(i+sides-1)%sides]);
        const along = rings[Math.min(j+1,rings.length-1)][i].clone().sub(rings[Math.max(0,j-1)][i]);
        const n = around.cross(along).normalize();
        if(n.dot(point.clone().sub(rows[j].p))<0)n.negate();
        return n.toArray();
      }));
      for(let j=1;j<rings.length;j++) for(let i=0;i<sides;i++){
        const k=(i+1)%sides;
        quad(rings[j-1][i].toArray(),rings[j-1][k].toArray(),rings[j][k].toArray(),rings[j][i].toArray(),
          normals[j-1][i],normals[j-1][k],normals[j][k],normals[j][i]);
      }
      for(const j of [0,rows.length-1]){
        const n=rows[j].t.clone().multiplyScalar(j===0?-1:1).toArray();
        for(let i=0;i<sides;i++)tri(rows[j].p.toArray(),rings[j][i].toArray(),rings[j][(i+1)%sides].toArray(),n);
      }
    }

    const panelFace=.1435, leftDepth=.020, rightDepth=.042, mountFace=panelFace+leftDepth;
    const rightSeat=v(.164,.113,.020);
    const centreY=.246, centreZ=-.035, left=-.076, right=.056;
    if(finish==='caps'){
      // Bright chamfered heads sit against the outer face of each rubber mount.
      for(const [side,depth,y,z] of [[-1,leftDepth,-.004,-.147],[1,rightDepth,.093,.018]]){
        skin([[0,.0062],[.001,.0074],[.0031,.0074],[.0043,.0059]].map(([d,r])=>
          row(v(side*(panelFace+depth+d),y,z),v(side,0,0),r)),10);
      }
      return;
    }
    if(finish==='rubber'){
      const sleeve=[];
      const samples=Array.from({length:89},(_,i)=>left+(right-left)*i/88);
      for(let rib=-2;rib<=2;rib++)samples.push(-.01+rib*.025);
      samples.sort((a,b)=>a-b);
      for(const [i,x] of samples.entries()){
        if(i && x-samples[i-1]<1e-8)continue;
        const edge=Math.min(x-left,right-x);
        const blend=Math.max(0,Math.min(1,edge/.009));
        let radius=.014+.004*blend*blend*(3-2*blend);
        for(let rib=-2;rib<=2;rib++){
          const t=Math.abs(x-(-.01+rib*.025))/.005;
          if(t<1)radius+=.002*(1+Math.cos(Math.PI*t))/2;
        }
        sleeve.push(row(v(x,centreY,centreZ),axis,radius));
      }
      skin(sleeve);
      // A flared shoulder gives the left boss depth in profile and a raised face for the cap.
      skin([[0,.033,.0148],[.002,.035,.0155],[.006,.0345,.0155],[.012,.033,.0152],
        [.017,.031,.0151],[leftDepth,.0295,.0150]].map(([d,ry,rz])=>
        row(v(-(panelFace+d),.012,-.147),v(-1,0,0),ry,rz)));

      // The opposite pad has a level top for the descending rail. Its side face
      // carries the cap, and the broad rounded shoulder meets the original panel.
      const padRows=[], padRings=[];
      for(const [depth,inset] of [[0,.004],[.002,.0015],[.005,0],[.032,0],[.036,.0015],[.039,.0045],[.041,.008],[rightDepth,.011]]){
        const centre=v(panelFace+depth,.093,.019), ring=[];
        const halfY=.020-inset,halfZ=.032-inset,corner=Math.min(.016,halfY*.84);
        for(let quadrant=0;quadrant<4;quadrant++){
          const signY=quadrant===0||quadrant===3?1:-1,signZ=quadrant<2?1:-1;
          for(let i=0;i<=4;i++){
            const angle=(quadrant+i/4)*Math.PI/2;
            ring.push(v(centre.x,centre.y+signY*(halfY-corner)+corner*Math.cos(angle),
              centre.z+signZ*(halfZ-corner)+corner*Math.sin(angle)));
          }
        }
        padRows.push(row(centre,axis,1));padRings.push(ring);
      }
      closeRings(padRows,padRings);
      return;
    }

    function bend(knots, fittedSide=false) {
      const rows=[];
      for(let j=1;j<knots.length;j++){
        const [p,a]=knots[j-1], [q,b]=knots[j], length=p.distanceTo(q)/3;
        const c=p.clone().addScaledVector(a,length), d=q.clone().addScaledVector(b,-length);
        const steps=Math.max(6,Math.ceil(length*3/.009));
        for(let i=j===1?0:1;i<=steps;i++){
          const t=i/steps, u=1-t;
          const point=p.clone().multiplyScalar(u*u*u).addScaledVector(c,3*u*u*t).addScaledVector(d,3*u*t*t).addScaledVector(q,t*t*t);
          const tangent=c.clone().sub(p).multiplyScalar(u*u).addScaledVector(d.clone().sub(c),2*u*t).addScaledVector(q.clone().sub(d),t*t).normalize();
          rows.push(row(point,tangent,.014));
        }
      }
      skin(rows,24,fittedSide);
    }
    const contact=v(.01,.103,.045), gripDirection=contact.clone().normalize();
    const oldSide=v(-.15,.115,-.13);
    // Retain the straight contact under the fitted left palm as well as the top grip.
    bend([[v(-mountFace,.022,-.147),v(-1,0,0)],[v(-.175,.022,-.147),v(-1,0,0)],
      [v(-.183,.068,-.147),v(0,1,0)],
      [v(-.163,.119,-.135),v(.36,.88,.30).normalize()],
      [oldSide.clone().addScaledVector(contact,.19),gripDirection],[oldSide.clone().addScaledVector(contact,.90),gripDirection],
      [v(-.126,.228,-.069),v(.72,.4,.58).normalize()],[v(left,centreY,centreZ),axis]],true);
    bend([[v(right,centreY,centreZ),axis],[v(.123,.221,.009),v(.65,-.57,.50).normalize()],
      [v(.159,.171,.018),v(.22,-.97,.04).normalize()],[v(.164,.143,.020),v(0,-1,0)],
      [rightSeat,v(0,-1,0)]]);
  });
}

const sawBootSkins = new WeakMap();
function fitSawBoot(T, boot) {
  let skin = sawBootSkins.get(T);
  if (!skin) {
    // Work in the plane of the orange roof, then in the plane of the intake's rear edge.
    const roofPitch = Math.atan2(.025, .036);
    const roofY = .155 + Math.tan(roofPitch) * (boot.position.z + .250);
    const source = boot.geometry.clone().rotateX(boot.rotation.x + roofPitch);
    source.userData = {...source.userData, shared: false};
    const part = new T.Mesh(source, null);
    trimPanelBack(T, part, 1, (roofY - boot.position.y) * Math.cos(roofPitch), 'y');
    // Rotate both attributes linearly. Normalizing newly interpolated edge normals
    // here would also change the shading on the original rubber face.
    const rotate = (geometry, matrix) => {
      const point = new T.Vector3();
      for (const attribute of [geometry.attributes.position, geometry.attributes.normal]) {
        for (let i=0; i<attribute.count; i++) {
          point.fromBufferAttribute(attribute,i).applyMatrix4(matrix);
          attribute.setXYZ(i,point.x,point.y,point.z);
        }
      }
    };
    const drawing = new T.Matrix4().makeRotationZ(Math.PI / 2)
      .multiply(new T.Matrix4().makeRotationX(-roofPitch));
    rotate(part.geometry, drawing);
    // The rounded intake reaches furthest back at its centre. Both adjacent
    // facets are visible where the rubber meets the thin grey border.
    const radius = .003 * .49;
    const bevel = radius * (1 - Math.SQRT1_2);
    const centre = .035 - boot.position.x;
    const half = .105 / 2 - bevel;
    const edge = -.2205 - boot.position.z;
    const rows = [[centre-half, edge+bevel], [centre, edge], [centre+half, edge+bevel]];
    skin = clipArtworkProfile(T, part.geometry, rows, -1, 'z');
    part.geometry.dispose();
    rotate(skin, new T.Matrix4().makeRotationX(-boot.rotation.x)
      .multiply(new T.Matrix4().makeRotationZ(-Math.PI / 2)));
    skin.computeBoundingBox();
    skin.computeBoundingSphere();
    skin.userData.shared = true;
    sawBootSkins.set(T, skin);
  }
  boot.geometry = skin;
}

export function makeChainsawModel(ctx) {
  const { THREE, gunKit, gunArc, gunBand, gripOutline, finishGun, gunBody, gunDark, gunMid, gunAccent, gunPoly, gunRubber, steelMat, hazardYellow, bladeMat, layoutChainsawChain } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun), W = sharedDetail(ctx);
  // Engine body under a moulded top cover with vents. CF-8 (J151 note 34, Jerry: "The chainsaw glows when the trigger
  // is pulled"): the enamel no longer glows; the game's heat (userData.heatMat) warms only the exhaust shield, dark enough
  // that a running saw shows nothing and an overheated one (1.2) a dull red on the muffler.
  const bodyMat = gunBody.clone();
  bodyMat.name = 'chainsaw motor enamel';
  bodyMat.color.setHex(0x985632);
  bodyMat.roughness = .69;
  bodyMat.emissive = new THREE.Color(0x000000);
  bodyMat.emissiveIntensity = 0;
  const coverMat = bodyMat.clone();
  coverMat.name = 'chainsaw moulded covers';
  coverMat.color.setHex(0xbd733e);
  coverMat.roughness = .74;
  coverMat.metalness = .025;
  coverMat.map = sawCoverTexture(THREE);
  gun.userData.partFinish = true;
  coverMat.userData.weaponFinishRole = 'furniture';
  const barMat = steelMat.clone();
  barMat.name = 'chainsaw satin bar';
  barMat.color.setHex(0x87908c);
  barMat.roughness = .65;
  barMat.metalness = .47;
  K.slab([[-0.27, 0.105], [-0.28, 0.083], [-0.28, -0.024], [-0.248, -0.06], [0.088, -0.06], [0.11, -0.038], [0.11, 0.112], [0.09, 0.14], [-0.24, 0.14]], 0.24, bodyMat, { bevel: 0.012, segs: 3 });
  // Orange cowling steps down at the front, leaving a clear grip over the engine.
  const cowl = K.slab([[-0.25, 0.132], [-0.247, 0.132], [-0.24, 0.14], [0.073, 0.14], [0.073, 0.148], [-0.01, 0.154], [-0.03, 0.177], [-0.214, 0.18], [-0.25, 0.155]], 0.22, coverMat, { bevel: 0.010, segs: 3 });
  seatBoxArt(cowl, 'y', z => Math.min(.14, .105 + (z + .27) * (.035 / .03)));
  for (let i = 0; i < 4; i++) {
    // The first rubber strip ends at the intake border.
    const left = -.0675, right = i === 0 ? -.0175 : .0675;
    const rib = K.box(right - left, 0.008, 0.012, gunDark, (left + right) / 2, 0.18, -0.193 + i * 0.04, 0, 0, 0, null, 0.002);
    seatBoxArt(rib, 'y', z => .180 + (.177 - .180) * (z + .214) / (.214 - .030));
  }
  // Recessed air intake and service seam break up the broad moulded top.
  K.box(0.105, 0.003, 0.045, gunMid, 0.035, 0.181, -0.198, 0, 0, 0, null, 0.006);
  for (let i = 0; i < 4; i++) K.box(0.008, 0.004, 0.035, gunDark, -0.003 + i * 0.022, 0.184, -0.198, 0, 0, 0, null, 0.002);
  // The painted side covers sit on the grey backing, with an uninterrupted bevel around each one.
  const backingDepth = .012;
  for (const sx of [-1, 1]) {
    const backing = K.slab([[-0.251, -0.035], [-0.251, 0.112], [-0.233, 0.127], [0.071, 0.127], [0.09, 0.108], [0.09, -0.035]], backingDepth, gunMid, { x: sx * 0.13, bevel: 0.005 });
    const cover = K.slab([[-0.243, -0.027], [-0.243, 0.106], [-0.225, 0.117], [0.067, 0.117], [0.078, 0.10], [0.078, -0.027]], 0.009, bodyMat, { x: sx * 0.139, bevel: 0.004 });
    // The concealed bevel rings flatten against the backing. The exposed skin and bolt seats keep their original coordinates.
    const backFace = backing.position.x + sx * backingDepth / 2 - cover.position.x;
    const position = cover.geometry.attributes.position;
    for (let vertex = 0; vertex < position.count; vertex++) {
      if (sx * (position.getX(vertex) - backFace) < 0) position.setX(vertex, backFace);
    }
    cover.geometry.computeBoundingSphere();
    for (const [z, y] of [[-0.227, 0.101], [0.06, 0.1], [-0.226, -0.012], [0.058, -0.012]]) bolt(K, gunDark, gunAccent, sx * 0.1455, y, z, 0.0055);   // GB-297: seated on the outer cowling face (x 0.1435)
    K.box(0.012, 0.068, 0.064, gunDark, sx * 0.15, 0.004, -0.195, 0, 0, 0, null, 0.009);
    for (let i = 0; i < 5; i++) {
      const ventRib = K.box(0.014, 0.004, 0.058, gunMid, sx * 0.152, -0.018 + i * 0.011, -0.195, 0, 0, 0, null, 0.001);
      // The outermost face of the rounded case slopes away from the centre.
      // Seat each rib at the highest support reached by its inner edge.
      const radius = .012 * .49;
      const edgeDrop = radius * (1 - Math.SQRT1_2);
      const innerY = Math.max(0, Math.abs(ventRib.position.y - .004) - .002);
      trimPanelBack(THREE, ventRib, sx, .156 - innerY * edgeDrop / (.034 - edgeDrop));
    }
  }
  // Exhaust muffler with a dark vent, fuel and oil caps, spark-plug boot at rear of cowling.
  const ventHousing = K.box(0.05, 0.09, 0.1, gunDark, 0.14, 0.02, 0.05, 0, 0, 0, null, 0.012);
  trimPanelBack(THREE, ventHousing, 1, .1435);
  for (let i = 0; i < 3; i++) K.box(0.006, 0.05, 0.012, gunRubber, 0.166, 0.02, 0.025 + i * 0.022);
  const exhaustMat = steelMat.clone();
  exhaustMat.name = 'chainsaw exhaust shield';
  exhaustMat.emissive = new THREE.Color(0x3a0c02);
  exhaustMat.emissiveIntensity = 0;
  K.box(0.005, 0.038, 0.068, exhaustMat, 0.17, 0.018, 0.05, 0, 0, 0, null, 0.004);
  for (const z of [0.026, 0.074]) bolt(K, gunDark, gunAccent, 0.172, 0.032, z, 0.005);
  // CI-1 (J151 note 35): where the exhaust leaves the muffler (its slotted outer plate, the saw's right side); index.html
  // puffs the running engine's fumes from here. A bare point, nothing drawn.
  const exhaustPort = new THREE.Object3D();
  exhaustPort.name = 'chainsaw-exhaust-port';
  exhaustPort.position.set(0.176, 0.016, 0.05);
  gun.add(exhaustPort);
  gun.userData.exhaustPort = exhaustPort;
  // Circular recoil-starter cover and radial breathing slots, clear of the animated pull handle.
  K.cyl(0.063, 0.063, 0.012, gunMid, 0.15, 0.047, -0.085, null, 16, 'x');
  K.cyl(0.051, 0.051, 0.010, coverMat, 0.161, 0.047, -0.085, null, 16, 'x');
  K.cyl(0.016, 0.016, 0.011, gunDark, 0.1715, 0.047, -0.085, null, 12, 'x');
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    K.box(0.003, 0.004, 0.018, gunDark, 0.1675, 0.047 + Math.sin(a) * 0.034, -0.085 + Math.cos(a) * 0.034, a, 0, 0, null, 0.001);
  }
  // Removable filter cover and thumb knob on the opposite side of the engine.
  // The filter assembly sits on the cowling independently of the front handle.
  K.box(0.0135, 0.082, 0.082, gunMid, -0.15025, 0.053, -0.09, 0, 0, 0, null, 0.009);
  K.box(0.008, 0.068, 0.067, coverMat, -0.16, 0.053, -0.09, 0, 0, 0, null, 0.007);
  for (let i = 0; i < 3; i++) K.box(0.003, 0.004, 0.045, gunDark, -0.165, 0.029 + i * 0.022, -0.09, 0, 0, 0, null, 0.001);
  K.cyl(0.009, 0.009, 0.01, gunRubber, -0.17, 0.079, -0.064, null, 10, 'x');
  // GB-302: fuel cap is a named part Claude can unscrew during the gas refill.
  const fuelCap = K.group(-0.12, 0.1, -0.15);
  K.cyl(0.025, 0.025, 0.02, gunRubber, 0, 0, 0, fuelCap, 10, 'x');
  K.cyl(0.012, 0.012, 0.008, gunAccent, 0.012, 0, 0, fuelCap, 8, 'x');
  gun.userData.fuelCap = fuelCap;
  gun.userData.baseFuelCapPos = fuelCap.position.clone();
  gun.userData.baseFuelCapRot = fuelCap.rotation.clone();
  gun.userData.reloadParts = Object.assign(gun.userData.reloadParts || {}, {
    fuelCap: { restPos: [-0.12, 0.1, -0.15], restRot: [0, 0, 0], visibleAtRest: true, note: 'unscrew, pour, screw back' }
  });
  K.cyl(0.02, 0.02, 0.02, gunRubber, -0.12, 0.02, -0.03, null, 10, 'x');
  const boot = K.box(0.028, 0.024, 0.036, gunRubber, 0.045, 0.168, -0.232, -0.35, 0, 0, null, 0.008);
  fitSawBoot(THREE, boot);
  // Rear throttle grip is in line with the bar, beyond the engine housing.
  const rearBand = gunBand([[-0.245, 0.08], [-0.445, 0.08], [-0.49, 0.025], [-0.49, -0.095], [-0.27, -0.095]], 0.014);
  // Fit just the upper end against the two facets of the orange case.
  const caseCorner = [-.28, .083];
  rearBand[0] = outlineIntersection(rearBand[0], rearBand[1], caseCorner, [-.28, -.024]);
  rearBand[rearBand.length - 1] = outlineIntersection(rearBand.at(-1), rearBand.at(-2), caseCorner, [-.27, .105]);
  rearBand.push(caseCorner);
  K.slab(rearBand, .07, gunPoly, { bevel: .007 });
  K.box(0.074, 0.13, 0.055, gunRubber, 0, -0.014, -0.46, 0, 0, 0, null, 0.012);
  for (let i = 0; i < 5; i++) K.box(0.076, 0.007, 0.058, gunPoly, 0, -0.064 + i * 0.024, -0.46, 0, 0, 0, null, 0.002);
  addTriggerArtwork(gun, K, gunBand([[-0.395, 0.062], [-0.393, 0.045], [-0.375, 0.01], [-0.365, -0.03]], 0.006), 0.022, hazardYellow, { bevel: 0.002 });
  // CF-1 (a): the throttle's pin, its two ends on the cheeks of the handle's top bar just above the blade's root.
  pinEnds(THREE, gun, gunAccent, [{ x: 0, y: 0.078, z: gun.userData.triggerPin[2], axis: 'x', span: 0.07, r: 0.0028 }]);
  K.slab(gunBand([[-0.395, 0.062], [-0.34, 0.06], [-0.326, -0.065], [-0.42, -0.069]], 0.006), 0.033, gunDark, { bevel: 0.003 });
  const rearTrim = K.box(0.072, 0.02, 0.04, gunAccent, 0, 0.085, -0.445, 0, 0, 0, null, 0.004);
  trimPanelBack(THREE, rearTrim, 1, .094, 'y');
  // CF-1 (b): the throttle lock is its own part, hinged at its back edge; the palm presses it down.
  const throttleLock = K.group(0, 0.0995, -0.4575); throttleLock.name = 'chainsaw-throttle-lock';
  K.box(0.05, 0.009, 0.027, gunDark, 0, 0, 0.0135, 0, 0, 0, throttleLock, 0.003); // throttle lock paddle
  W.serrations(throttleLock, gunDark, { x: 0, y: 0.0045, z: 0.0135, axis: 'y', side: 1, along: 'z', count: 4, pitch: 0.0045, w: 0.032, depth: 0.0007, profile: 'square' });
  // CF-1 (b): the stop switch, a rocker on the rear handle's top bar ahead of the throttle lock.
  W.chamferBox(gun, 0.022, 0.004, 0.018, 0.001, gunDark, 0, 0.0955, -0.300);
  const stopSwitch = K.group(0, 0.0975, -0.300); stopSwitch.name = 'chainsaw-stop-switch';
  stopSwitch.rotation.x = 0.2;   // rest: rocked to run
  K.box(0.013, 0.005, 0.016, ctx.fuelRedMat, 0, 0.0015, 0, 0, 0, 0, stopSwitch, 0.0015);
  part(THREE,sawFrontHandle(THREE,'metal'),gunDark,gun).name='chainsaw front rail metal';
  part(THREE,sawFrontHandle(THREE,'rubber'),gunRubber,gun).name='chainsaw front rail rubber';
  part(THREE,sawFrontHandle(THREE,'caps'),gunMid,gun).name='chainsaw front rail caps';
  // Front hand guard stands ahead of the support hand, before the chain root.
  // CF-1 (b): the guard is the chain brake: it and its two stays tip forward about the pivot bosses (x axis).
  const chainBrake = K.group(0, 0.075, 0.104); chainBrake.name = 'chainsaw-chain-brake';
  const frontGuard = [[.075,.055],[.102,.055],[.135,.219],[.109,.225]], corner = [.11,.112];
  K.slab([outlineIntersection(frontGuard[1],frontGuard[2],[.11,-.038],corner),
    frontGuard[2],frontGuard[3],outlineIntersection(frontGuard[3],frontGuard[0],corner,[.09,.14]),corner],
    .16, gunMid, { bevel: .007, y: -0.075, z: -0.104, parent: chainBrake });
  for (const sx of [-1, 1]) {
    K.cyl(0.012, 0.012, 0.008, gunDark, sx * 0.083, 0.075, 0.104, null, 10, 'x');
    bolt(K, gunDark, gunAccent, sx * 0.089, 0.075, 0.104, 0.005);
    rod(THREE, K, [sx * 0.074, 0.003, 0.002], [sx * 0.074, 0.112, 0.019], 0.004, steelMat, chainBrake);
  }
  // GB-180 pass 6 (vs a real saw: toothed bucking spikes at the bar root, a chain catcher under it): both added.
  // GB-180 pass 7 (the pass-6 spikes read as a dark clump under the bar): steel spike plates flat on the housing face,
  // either side of the bar, three big forward teeth each.
  for (const sx of [-1, 1]) {
    const plate = K.slab([[0.104, -0.034], [0.13, -0.034], [0.165, -0.012], [0.13, 0.004], [0.165, 0.026], [0.13, 0.042], [0.165, 0.064], [0.13, 0.08], [0.104, 0.09]], 0.01, steelMat, { x: sx * 0.1, bevel: 0.002 });
    trimPanelBack(THREE, plate, 1, .11, 'z');
  }
  K.slab([[0.089, -0.055], [0.13, -0.06], [0.135, -0.075], [0.09, -0.078]], 0.04, gunDark, { bevel: 0.004 });   // chain catcher
  // Pull cord and its T-handle.
  K.cyl(0.012, 0.012, 0.0675, gunDark, 0.14375, 0.12, -0.22, null, 6, 'x');
  const starter = new THREE.Group();
  starter.position.set(0.19, 0.12, -0.22);
  const SK = gunKit(starter);
  SK.sph(0.018, gunMid, 0.01, 0, 0, null, 8);
  SK.box(0.025, 0.025, 0.085, gunPoly, 0, 0, 0, 0, 0, 0, null, 0.005);
  gun.add(starter);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1, 6), gunDark);
  cord.scale.set(1, 0.001, 1); // Keep the hidden starter cord out of static model bounds; the pull pose sets its length.
  cord.visible = false;
  gun.add(cord);
  gun.userData.starterHandle = starter;
  gun.userData.starterCord = cord;
  gun.userData.starterHome = starter.position.clone();
  gun.userData.starterExit = new THREE.Vector3(0.16, 0.12, -0.22);
  // GP-20063: retain the long-bar character but bring the held silhouette
  // toward 1 m. The entire bar and live chain shorten about the rear stud;
  // the engine, brake and both hand grips stay at their established contacts.
  const bar = K.group(0, 0, 0), B = gunKit(bar), barZ = 0.71;
  bar.scale.z = barZ;
  bar.position.z = 0.1 * (1 - barZ);
  // Guide bar: the plate with its round nose, the inner plate, rivets, bar-stud nuts, the sprocket.
  B.slab([[0.06, -0.01], ...gunArc(0.88, 0.04, 0.05, -Math.PI / 2, Math.PI / 2, 8), [0.06, 0.09]], 0.032, barMat, { bevel: 0.006 });
  for (const sx of [-1, 1]) {
    B.slab([[0.14, 0.004], [0.848, 0.004], ...gunArc(0.874, 0.04, 0.036, -Math.PI / 2, Math.PI / 2, 8), [0.14, 0.076]], 0.003, barMat, { x: sx * 0.019, bevel: 0.001 });
    for (const z of [0.25, 0.67]) B.box(0.003, 0.014, 0.11, gunDark, sx * 0.0215, 0.04, z, 0, 0, 0, null, 0.006);
    for (const z of [0.14, 0.185]) {
      B.cyl(0.012, 0.012, 0.003, gunDark, sx * 0.024, 0.04, z, null, 10, 'x');
      bolt(B, gunDark, gunAccent, sx * 0.027, 0.04, z, 0.008);
    }
    for (const y of [0.006, 0.074]) for (let i = 0; i < 22; i++) B.cyl(0.0028, 0.0028, 0.002, steelMat, sx * 0.022, y, 0.155 + i * 0.032, null, 6, 'x');
  }
  for (const z of [0.1, 0.16]) B.cyl(0.014, 0.014, 0.05, gunDark, 0, 0.04, z, null, 6, 'x');
  const nose = B.cyl(.05, .05, .03, gunDark, 0, .04, .90, null, 14, 'x');
  nose.geometry.dispose();
  nose.geometry = chainsawNoseInsert(THREE);
  B.cyl(0.02, 0.02, 0.034, steelMat, 0, 0.04, 0.90, null, 8, 'x');
  // Chain teeth ride a racetrack path around the guide-bar perimeter (YZ plane).
  // Do NOT rigid-spin this group — advanceChainsawChain moves each tooth along the path.
  const chainGroup = new THREE.Group();
  chainGroup.position.set(0, 0.04, 0.48);
  const toothCount = 42;
  const chainTeeth = [];
  // One low, dark segment and two offset steel accents repeat around the
  // existing animated path. Their silhouette stays fine in the player's view.
  // A single closed skin carries the alternating highlights. Adjacent faces
  // share vertices, including where the raised areas meet the dark band.
  const positions = [], colors = [], indices = [];
  const columns = 3, rows = 4, stride = columns + 1, layer = stride * (rows + 1);
  const dark = gunDark.color, bright = steelMat.color;
  for (let top = 0; top < 2; top++) for (let row = 0; row <= rows; row++) {
    const v = row / rows - .5, side = Math.sign(v);
    const stripe = Math.max(0, 1 - 4 * Math.abs(Math.abs(v) - .25));
    for (let col = 0; col <= columns; col++) {
      const u = col / columns - .5;
      const ridge = stripe * Math.max(0, Math.min(1, .40 + 1.50 * side * u));
      const tone = top && ridge > .3 ? .98 : .06;
      const x = u * (.025 + .012 * ridge);
      positions.push(x, top ? -.0002 + .0066 * ridge : -.0048, .041 * v);
      colors.push(dark.r + (bright.r - dark.r) * tone, dark.g + (bright.g - dark.g) * tone, dark.b + (bright.b - dark.b) * tone);
    }
  }
  const quad = (a, b, c, d) => indices.push(a, b, c, a, c, d);
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const a = row * stride + col, b = a + 1, d = a + stride, c = d + 1;
    quad(a, b, c, d);
    quad(layer + a, layer + d, layer + c, layer + b);
    if (row === 0) quad(a, layer + a, layer + b, b);
    if (col === columns - 1) quad(b, layer + b, layer + c, c);
    if (row === rows - 1) quad(c, layer + c, layer + d, d);
    if (col === 0) quad(d, layer + d, layer + a, a);
  }
  const surface = new THREE.BufferGeometry();
  surface.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  surface.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
  surface.setIndex(indices);
  const segment = surface.toNonIndexed();
  segment.computeVertexNormals();
  segment.computeBoundingSphere();
  const chainFinish = steelMat.clone();
  chainFinish.name = 'chainsaw link finish';
  chainFinish.color.setHex(0xffffff);
  chainFinish.vertexColors = true;
  chainFinish.roughness = .58;
  for (let i = 0; i < toothCount; i++) {
    // GB-189: teeth are transform-only nodes; one InstancedMesh draws all of them.
    const tooth = new THREE.Object3D();
    chainGroup.add(tooth);
    chainTeeth.push(tooth);
  }
  const chainInst = new THREE.InstancedMesh(segment, chainFinish, toothCount);
  chainInst.castShadow = chainInst.receiveShadow = true;
  chainInst.frustumCulled = false;
  chainGroup.add(chainInst);
  gun.userData.chainInst = chainInst;
  // CI-1 (note 36): the blur band, shown only while the chain runs (index.html advanceChainsawChain sets .visible).
  const blurFinish = steelMat.clone();
  blurFinish.name = 'chainsaw chain blur';
  blurFinish.color.setHex(0x5c6166);
  blurFinish.roughness = .42;
  blurFinish.transparent = true;
  blurFinish.opacity = .62;
  blurFinish.depthWrite = false;
  const chainBlur = new THREE.Mesh(chainsawBlurBand(THREE, 0.40, 0.055), blurFinish);
  chainBlur.name = 'chainsaw-chain-blur';
  chainBlur.castShadow = false; chainBlur.receiveShadow = false;
  chainBlur.renderOrder = 1;
  chainBlur.visible = false;
  chainGroup.add(chainBlur);
  gun.userData.chainBlur = chainBlur;
  bar.add(chainGroup);
  gun.userData.bladeSpin = chainGroup; // kept for callers; rotation is never used for chain motion
  gun.userData.chainGroup = chainGroup;
  gun.userData.chainTeeth = chainTeeth;
  gun.userData.chainPhase = 0;
  layoutChainsawChain(gun);
  // The inspector supplies only the transform nodes; seed the instance buffer
  // here too so a static sheet sees the same cutters the running game updates.
  for (let i = 0; i < toothCount; i++) {
    chainTeeth[i].updateMatrix();
    chainInst.setMatrixAt(i, chainTeeth[i].matrix);
  }
  chainInst.instanceMatrix.needsUpdate = true;
  gun.userData.heatMat = exhaustMat;   // CF-8: the heat shows on the muffler's shield only (see bodyMat)
  gun.userData.flash = null;
  gun.userData.flashLight = null;
  gun.userData.laser = null;
  gun.userData.barrelAssembly = null;
  gun.userData.muzzleLocal = new THREE.Vector3(0, 0.04, 0.1 + (0.94 - 0.1) * barZ);
  bindModelArtwork(gun, 'controls', 'throttleLock', throttleLock);
  bindModelArtwork(gun, 'controls', 'chainBrake', chainBrake);
  bindModelArtwork(gun, 'controls', 'stopSwitch', stopSwitch);
  return finishGun(gun);
}

export function makeMortarModel(ctx, matOverride = null, collapsed = false) {
  const { THREE, gunKit, finishGun, gunMetal, gunDark, gunMid, gunRubber, gunOlive, steelMat, gaugeFace } = ctx;
  const root = new THREE.Group();
  // The parts below were authored with the muzzle leaning toward -Z, while
  // everything that aims or crews the mortar treats +Z as its front: the tube ended
  // up pointing back at the marine standing behind it. Turned round as one piece.
  const g = new THREE.Group();
  if (!collapsed) g.rotation.y = Math.PI;
  root.add(g);
  const K = gunKit(g), material = (m) => matOverride || m;
  const steel = matOverride || new THREE.MeshStandardMaterial({ color: 0x3e4a3a, metalness: 0.08, roughness: 0.7 });   // GB-233: painted
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.08, 12), steel);
  // M3 baseplate: 21 inches across. Scale the existing pressed webs with the plate.
  plate.scale.set(0.58, 0.75, 0.58);
  if (collapsed) { plate.position.set(0, 0.16, -0.1); plate.rotation.x = Math.PI / 2; }
  else plate.position.set(0, 0.04, 0.5);
  g.add(plate);
  const plateDetail = K.group(0, 0, 0, plate);
  // Pressed circular baseplate: raised radial webs and a low rolled outer edge.
  K.cyl(0.11, 0.125, 0.032, steel, 0, 0.041, 0, plateDetail, 16, 'y');
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    K.box(0.015, 0.017, 0.295, steel, Math.sin(a) * 0.244, 0.045, Math.cos(a) * 0.244, 0, a, 0, plateDetail, 0.003);
  }
  K.tor(0.421, 0.009, steel, 0, 0.029, 0, Math.PI / 2, 0, 0, plateDetail, Math.PI * 2, 32);
  for (const sx of [-1, 1]) {
    const z = sx * 0.285;
    rod(THREE, K, [-0.074, 0.040, z], [-0.067, 0.087, z], 0.009, steel, plateDetail);
    rod(THREE, K, [0.074, 0.040, z], [0.067, 0.087, z], 0.009, steel, plateDetail);
    rod(THREE, K, [-0.067, 0.087, z], [0.067, 0.087, z], 0.009, steel, plateDetail);
  }
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.25, 12, 1, true), matOverride || gunOlive);   // GB-233: matte olive phosphate
  const boreMat = (matOverride || gunDark).clone(); boreMat.side = THREE.BackSide;
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.083, 0.102, 1.22, 12, 1, true), boreMat);
  const lip = new THREE.Mesh(new THREE.RingGeometry(0.083, 0.11, 12), matOverride || gunMetal);
  lip.rotation.x = -Math.PI / 2; lip.position.y = 0.625; tube.add(bore, lip);
  const breech = new THREE.Mesh(new THREE.CircleGeometry(0.102, 12), matOverride || gunDark);
  breech.rotation.x = -Math.PI / 2; breech.position.y = -0.59; tube.add(breech);
  if (collapsed) { tube.position.set(0, 0.62, 0); tube.rotation.x = 0; }
  else { tube.position.set(0, 0.62, 0.18); tube.rotation.x = -0.72; }
  // M29A1: 81 mm clear bore, 51-inch cannon. Keep the authored length and aim
  // pivot; reduce the tube's radial forms from the old oversized stand-in.
  tube.scale.set(0.50, 1, 0.50);
  tube.castShadow = true;
  g.add(tube);
  g.userData.tube = tube;
  const tubeDetail = K.group(0, 0, 0, tube);
  const alignmentWhite = material(new THREE.MeshStandardMaterial({ color: 0xc7c8ba, roughness: 0.78, metalness: 0.02 }));
  for (const y of [0.092, 0.168]) K.tor(0.117, 0.0028, alignmentWhite, 0, y, 0, Math.PI / 2, 0, 0, tubeDetail, Math.PI * 2, 24);
  for (const [y, radius, length] of [[0.58, 0.128, 0.07], [-0.547, collapsed ? 0.129 : 0.134, 0.045]]) {   // GB-180: a heavier muzzle band
    const inner = y > 0 ? 0.108 : 0.127, a = y - length / 2, b = y + length / 2;
    K.lathe([[inner, a], [radius, a], [radius, b], [inner, b], [inner, a]], material(gunMetal), { rx: -Math.PI / 2, parent: tubeDetail, seg: 24 });
  }
  // Hollow lip is preserved above; collars stop short of it and never cap the bore.
  K.tor(0.1115, 0.0035, material(gunMid), 0, 0.613, 0, Math.PI / 2, 0, 0, tubeDetail, Math.PI * 2, 24);
  // GB-180 pass 6 (vs a real 81 mm tube: a heavy muzzle band and finned breech): five cooling fins round the breech end.
  if (!collapsed) for (let i = 0; i < 5; i++) { const y = -0.47 + i * 0.045, inner = 0.12 - 0.016 * y; K.lathe([[inner, y - 0.008], [0.155, y - 0.008], [0.155, y + 0.008], [inner, y + 0.008], [inner, y - 0.008]], material(gunMetal), { rx: -Math.PI / 2, parent: tubeDetail, seg: 24 }); }
  const clampR = collapsed ? 0.128 : 0.139;
  K.lathe([[0.117, 0.104], [clampR - 0.005, 0.104], [clampR, 0.11], [clampR, 0.15], [clampR - 0.005, 0.156], [0.117, 0.156], [0.117, 0.104]], steel, { rx: -Math.PI / 2, parent: tubeDetail, seg: 24 });
  for (const sx of [-1, 1]) {
    K.box(0.034, 0.1, 0.088, steel, sx * 0.137, 0.13, 0, 0, 0, 0, tubeDetail, 0.01);
    bolt(K, material(gunDark), material(steelMat), sx * 0.1555, 0.13, 0, 0.016, tubeDetail);
  }
  // Optical level and elevation wheel are mounted on the tube clamp, so they follow its aim.
  K.box(0.038, 0.105, 0.034, steel, -0.135, 0.246, 0, 0, 0, 0, tubeDetail, 0.006);
  K.cyl(0.012, 0.012, 0.043, material(gunDark), -0.135, 0.269, 0, tubeDetail, 10, 'x');
  K.disc(0.0085, material(gaugeFace), -0.1566, 0.269, 0, -Math.PI / 2, tubeDetail, 12);
  K.cyl(0.018, 0.018, 0.103, steel, 0.177, 0.102, 0, tubeDetail, 12, 'x');
  K.tor(0.059, 0.007, steel, 0.232, 0.102, 0, 0, Math.PI / 2, 0, tubeDetail, Math.PI * 2, 20);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    rod(THREE, K, [0.232, 0.102, 0], [0.232, 0.102 + Math.cos(a) * 0.057, Math.sin(a) * 0.057], 0.005, steel, tubeDetail);
  }
  K.cyl(0.008, 0.008, 0.029, material(gunRubber), 0.248, 0.151, 0.019, tubeDetail, 10, 'x');
  const bipod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), steel);
  if (collapsed) { bipod.position.set(0.14, 0.62, 0.02); bipod.rotation.set(0, 0, 0); }
  else { bipod.position.set(0.3, 0.45, -0.25); bipod.rotation.z = 0.5; bipod.rotation.x = 0.35; }
  g.add(bipod);
  const bipod2 = bipod.clone();
  bipod2.position.x = -bipod.position.x;
  if (!collapsed) bipod2.rotation.z = -0.5;
  g.add(bipod2);
  for (const leg of [bipod, bipod2]) {
    const legDetail = K.group(0, 0, 0, leg);
    for (const y of [-0.29, 0.30]) K.cyl(0.037, 0.037, 0.026, steel, 0, y, 0, legDetail, 12, 'y');
    K.cyl(0.036, 0.04, 0.062, steel, 0, -0.398, 0, legDetail, 12, 'y');
    K.cyl(0.04, 0.032, 0.022, steel, 0, -0.435, 0, legDetail, 16, 'y');
    K.box(0.025, 0.042, 0.044, steel, 0.028, -0.288, 0, 0, 0, 0, legDetail, 0.004);
    bolt(K, material(gunDark), material(steelMat), 0.043, -0.288, 0, 0.007, legDetail);
  }
  if (!collapsed) {
    const joint = new THREE.Vector3(0, 0.75, 0.09), up = new THREE.Vector3(0, 1, 0);
    for (const [leg, sx] of [[bipod, 1], [bipod2, -1]]) {
      const foot = new THREE.Vector3(sx * 0.24, 0.035, -0.32), delta = joint.clone().sub(foot);
      leg.position.copy(foot).add(joint).multiplyScalar(0.5);
      leg.quaternion.setFromUnitVectors(up, delta.clone().normalize());
      leg.scale.y = delta.length() / 0.9;
    }
    // M3's rotating U socket receives the spherical breech cap. The open side
    // faces the line of fire; the two jaws remain visible either side of the ball.
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.070, 12, 8), steel);
    cup.position.set(0, 0.13, 0.56); g.add(cup);
    for (const sx of [-1, 1]) K.box(0.022, 0.053, 0.108, steel, sx * 0.061, 0.09, 0.56, 0, 0, 0, null, 0.005);
    K.box(0.122, 0.045, 0.024, steel, 0, 0.085, 0.622, 0, 0, 0, null, 0.005);
    // M23A1 yoke, elevating and traversing mechanism at the bipod head.
    K.cyl(0.024, 0.024, 0.18, steel, 0, 0.75, 0.09, null, 12, 'x');
    K.box(0.15, 0.054, 0.060, steel, 0, 0.73, 0.09, 0, 0, 0, null, 0.007);
    for (const sx of [-1, 1]) {
      bolt(K, material(gunDark), material(steelMat), sx * 0.088, 0.75, 0.09, 0.014);
      rod(THREE, K, [sx * 0.108, 0.44, -0.088], [0, 0.42, -0.17], 0.010, steel);
    }
    // M53 sight in its dovetail socket beside the traversing crank. Its elbow
    // telescope and two covered level vials are larger than decorative screws.
    K.box(0.046, 0.045, 0.066, material(gunDark), -0.107, 0.775, 0.09, 0, 0, 0, null, 0.004);
    K.box(0.048, 0.046, 0.057, steel, -0.139, 0.808, 0.09, 0, 0, 0, null, 0.005);
    K.cyl(0.018, 0.018, 0.052, material(gunDark), -0.145, 0.823, 0.055, null, 12, 'z');
    K.cyl(0.021, 0.021, 0.014, material(gunRubber), -0.145, 0.823, 0.022, null, 12, 'z');
    for (const z of [0.072, 0.110]) K.box(0.032, 0.010, 0.012, material(gunMid), -0.14, 0.834, z, 0, 0, 0, null, 0.002);
    for (const [x, z] of [[-0.168, 0.112], [-0.108, 0.066]]) K.cyl(0.018, 0.018, 0.015, material(gunMid), x, 0.795, z, null, 12, 'x');
  } else {
    // Two closed webbing wraps bind the folded bipod and baseplate to the upright tube.
    for (const y of [0.30, 0.92]) {
      K.box(0.34, 0.033, 0.006, material(gunOlive), 0, y, 0.125, 0, 0, 0, null, 0.002);
      K.box(0.34, 0.033, 0.006, material(gunOlive), 0, y, -0.136, 0, 0, 0, null, 0.002);
      for (const sx of [-1, 1]) K.box(0.012, 0.033, 0.26, material(gunOlive), sx * 0.166, y, -0.0055, 0, 0, 0, null, 0.002);
      K.box(0.046, 0.038, 0.002, material(gunMid), 0.108, y, 0.128, 0, 0, 0, null, 0.0005);
      K.box(0.028, 0.023, 0.002, material(gunOlive), 0.108, y, 0.129, 0, 0, 0, null, 0.0005);
    }
  }
  root.userData.tube = g.userData.tube;
  // The plate and legs have no animated contracts. Bake their fixed decoration into
  // the common frame, so the added castings do not add a draw call for every leg.
  const fixed = [];
  for (const branch of g.children.slice()) if (branch !== tube) branch.traverse(o => { if (o.isMesh) fixed.push(o); });
  for (const mesh of fixed) g.attach(mesh);
  for (const mesh of fixed) for (const child of mesh.children.slice()) if (child.isGroup && child.children.length === 0) mesh.remove(child);
  return finishGun(root);
}

export function makeM240Model(ctx, folded = false) {
  const { THREE, gunKit, gunBand, gripOutline, finishGun, gunBody, gunDark, gunMid, gunAccent, gunPoly, gunRubber, brassMat, gunOlive, M240_PIVOT } = ctx;
  const g = new THREE.Group();
  const K = gunKit(g), W = sharedDetail(ctx);
  // CF-1 (c, J149): only what is painted takes the finish (the receiver, cover, trigger housing, handguard, the
  // furniture, the can and the tripod); the barrel, trigger, feed tray, bolts, pins, sights and the tan PEQ stay bare.
  g.userData.partFinish = true;
  const painted = [];
  // CU-81: a tripod with a traversing head, and an M240B on its cradle: the receiver and feed cover with its
  // rail, the butt stock and grip, the barrel with its carry handle, gas tube and flash hider, and the belt
  // feeding from an ammo can on the left. The barrel is userData.barrel (not .tube, which the mortar's aim tips).
  const hub = new THREE.Vector3(0, 0.74, 0);
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2;
    const foot = folded ? new THREE.Vector3([-0.035, 0.035, 0][i], 0.66 + (i === 2 ? -0.03 : 0), 0.62)
      : new THREE.Vector3(...[[0, 0.035, 0.5], [-0.42, 0.035, -0.32], [0.42, 0.035, -0.32]][i]);
    const delta = hub.clone().sub(foot), mid = hub.clone().add(foot).multiplyScalar(0.5);
    const l = K.cyl(0.022, 0.028, delta.length(), gunDark, mid.x, mid.y, mid.z, null, 8, 'y');
    painted.push(l);
    l.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    for (const u of [0.23, 0.55, 0.84]) {
      const c = hub.clone().lerp(foot, u);
      const sleeve = K.cyl(0.032, 0.032, 0.042, gunBody, c.x, c.y, c.z, null, 12, 'y');
      sleeve.quaternion.copy(l.quaternion);
    }
    const hinge = hub.clone().lerp(foot, 0.59);
    if (!folded) {
      rod(THREE, K, [0, 0.44, 0], hinge.toArray(), 0.009, gunMid);
      K.cyl(0.058, 0.045, 0.019, gunBody, foot.x, 0.021, foot.z, null, 14, 'y');
    }
    if (folded) painted.push(K.box(0.05, 0.03, 0.06, gunDark, foot.x, foot.y, foot.z, 0, 0, 0, null, 0.006));
    else painted.push(K.box(0.09, 0.025, 0.075, gunDark, foot.x, 0.022, foot.z, 0, -a, 0, null, 0.006));
  }
  const foldedLegArt = folded ? g.children.slice() : null;
  K.cyl(0.06, 0.075, 0.12, gunBody, 0, 0.74, 0, null, 14, 'y');
  K.cyl(0.024, 0.024, 0.1, gunDark, 0, 0.82, 0, null, 10, 'y');
  K.cyl(0.037, 0.037, 0.11, gunDark, 0, 0.765, 0, null, 14, 'x');
  for (const sx of [-1, 1]) bolt(K, gunDark, gunMid, sx * 0.058, 0.765, 0, 0.022);
  if (!folded) {
    // M122 T&E: the sleeve rides a crossbar joining the two rear legs. Its screw
    // rises to the trigger housing's rear pin; wheels adjust traverse and elevation.
    rod(THREE, K, [-0.34, 0.19, -0.31], [0.34, 0.19, -0.31], 0.012, gunMid);
    K.cyl(0.027, 0.027, 0.07, gunBody, 0, 0.19, -0.31, null, 12, 'x');
    K.box(0.075, 0.035, 0.05, gunDark, 0, 0.2, -0.31, 0, 0, 0, null, 0.005);
    rod(THREE, K, [0, 0.215, -0.292], [0, 0.745, -0.21], 0.012, gunMid);
    K.cyl(0.027, 0.027, 0.012, gunDark, 0, 0.43, -0.258, null, 16, 'y');
    K.cyl(0.027, 0.027, 0.012, gunDark, -0.049, 0.2, -0.31, null, 16, 'x');
    K.box(0.055, 0.011, 0.011, gunAccent, -0.071, 0.2, -0.31, 0, 0, 0, null, 0.002);
    K.cyl(0.008, 0.008, 0.087, gunAccent, 0, 0.755, -0.21, null, 10, 'x');
  }
  if (folded) {
    const firstWrap = g.children.length;
    K.box(0.105, 0.016, 0.034, gunOlive, 0, 0.65, 0.46, 0, 0, 0, null, 0.004);   // the wraps: olive webbing, not painted
    K.box(0.105, 0.016, 0.034, gunOlive, 0, 0.713, 0.46, 0, 0, 0, null, 0.004);
    for (const sx of [-1, 1]) K.box(0.015, 0.077, 0.034, gunOlive, sx * 0.047, 0.6815, 0.46, 0, 0, 0, null, 0.004);
    K.box(0.032, 0.013, 0.043, gunMid, 0, 0.724, 0.46, 0, 0, 0, null, 0.003);
    // Pose the bound artwork as a single piece for the shoulder-carry silhouette.
    // The existing hub remains the contact point with the body.
    const tucked = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.10);
    for (const piece of foldedLegArt.concat(g.children.slice(firstWrap))) {
      piece.position.sub(hub).applyQuaternion(tucked).add(hub);
      piece.quaternion.premultiply(tucked);
    }
  }
  const firstGunPart = g.children.length;   // CL-131: from here on, the parts that elevate
  painted.push(K.box(0.096, 0.026, 0.25, gunDark, 0, 0.805, 0.077, 0, 0, 0, null, 0.005));
  K.slab([[-0.22, 0.82], [0.2, 0.82], [0.2, 0.9], [0.18, 0.915], [-0.2, 0.915], [-0.22, 0.9]], 0.11, gunBody, { bevel: 0.01 });
  for (const sx of [-1, 1]) {
    painted.push(K.slab([[-0.204, 0.831], [0.176, 0.831], [0.182, 0.846], [0.182, 0.893], [-0.204, 0.899]], 0.011, gunMid, { x: sx * 0.0605, bevel: 0.002 }));
    K.box(0.006, 0.007, 0.161, gunDark, sx * 0.067, 0.861, 0.034, 0, 0, 0, null, 0.002);
    for (const [z, y] of [[-0.185, 0.883], [0.158, 0.883], [-0.183, 0.844], [0.154, 0.844], [-0.049, 0.882]]) bolt(K, gunDark, gunAccent, sx * 0.068, y, z, 0.003);
    for (const z of [-0.146, 0.128]) K.box(0.008, 0.052, 0.008, gunAccent, sx * 0.068, 0.864, z, 0, 0, 0, null, 0.001);
  }
  K.box(0.01, 0.023, 0.095, gunDark, 0.068, 0.875, 0.052, 0, 0, 0, null, 0.002); // right link-ejection window
  K.box(0.008, 0.004, 0.103, gunAccent, 0.069, 0.863, 0.052, 0, 0, 0, null, 0.001);
  K.box(0.067, 0.006, 0.068, gunDark, 0, 0.818, 0.045, 0, 0, 0, null, 0.002); // cases leave through the bottom
  K.box(0.065, 0.004, 0.007, gunAccent, 0, 0.816, 0.01, 0, 0, 0, null, 0.001);
  // The feed tray and hinged cover are distinct assemblies. The cover opens
  // about its front cross pin, carrying the feed-cover rail with it.
  const feedTray = K.group(0, 0.909, 0.025); feedTray.name = 'm240-feed-tray';
  K.box(0.105, 0.006, 0.23, gunAccent, 0, 0, 0, 0, 0, 0, feedTray, 0.002);
  for (const sx of [-1, 1]) K.box(0.006, 0.009, 0.2, gunDark, sx * 0.049, 0.006, 0, 0, 0, 0, feedTray, 0.001);
  K.box(0.01, 0.014, 0.014, gunDark, -0.044, 0.012, -0.088, 0, 0, 0, feedTray, 0.002); // cartridge stop
  const feedCover = K.group(0, 0.912, 0.14); feedCover.name = 'm240-feed-cover';
  painted.push(K.slab([[-0.22, 0], [0, 0], [0, 0.033], [-0.2, 0.04]], 0.105, gunMid, { bevel: 0.01, parent: feedCover }));
  K.rail(0.2, 0, 0.045, -0.11, feedCover);
  // CF-1 (b): the rear cover catch is its own latch, hinged at its front lower edge; pressed it frees the cover.
  const feedCoverLatch = K.group(0, 0.010, -0.200, feedCover); feedCoverLatch.name = 'm240-feed-cover-latch';
  K.box(0.018, 0.016, 0.02, gunDark, 0, 0.008, -0.010, 0, 0, 0, feedCoverLatch, 0.003); // rear cover catch
  W.serrations(feedCoverLatch, gunDark, { x: 0, y: 0.008, z: -0.020, axis: 'z', side: -1, along: 'y', count: 3, pitch: 0.004, w: 0.013, depth: 0.0007, profile: 'square' });
  K.cyl(0.008, 0.008, 0.135, gunAccent, 0, 0.919, 0.14, null, 12, 'x');
  g.userData.feedCover = feedCover;
  g.userData.feedTray = feedTray;
  g.userData.baseFeedCoverRot = feedCover.rotation.clone();
  g.userData.baseFeedTrayRot = feedTray.rotation.clone();
  K.box(0.032, 0.025, 0.029, gunMid, 0, 0.9275, -0.16, 0, 0, 0, null, 0.003);
  const rearSightLeaf = K.group(0, 0.94, -0.16); rearSightLeaf.name = 'm240-rear-sight-leaf';
  K.box(0.03, 0.004, 0.07, gunDark, 0, 0.006, 0.036, 0, 0, 0, rearSightLeaf, 0.002);
  K.tor(0.008, 0.002, gunAccent, 0, 0.012, 0.066, 0, 0, 0, rearSightLeaf, Math.PI * 2, 12);
  K.cyl(0.009, 0.009, 0.039, gunDark, 0, 0, 0, rearSightLeaf, 12, 'x');
  g.userData.rearSightLeaf = rearSightLeaf;
  g.userData.baseRearSightLeafRot = rearSightLeaf.rotation.clone();
  // 0.19 m buttstock brings the complete M240B to its 48.5-inch handout length
  // without moving the receiver, rear grip, muzzle or elevation pivot.
  const furniture = [K.slab([[-0.22, 0.9], [-0.4, 0.89], [-0.42, 0.9], [-0.425, 0.78], [-0.4, 0.77], [-0.3, 0.81], [-0.22, 0.83]], 0.07, gunPoly, { bevel: 0.016, segs: 3 })];
  K.slab([[-0.44, 0.904], [-0.420, 0.904], [-0.424, 0.776], [-0.442, 0.772]], 0.076, gunRubber, { bevel: 0.006 });
  // CF-1 (a): the butt pad's rubber ribs, across the shoulder face.
  W.serrations(g, gunRubber, { x: 0, y: 0.838, z: -0.4405, axis: 'z', side: -1, along: 'y', count: 11, pitch: 0.0095, w: 0.052, depth: 0.0012, profile: 'round' });
  furniture.push(K.slab(gripOutline(-0.166, 0.76, 0.14, 0.066, 0.28), 0.056, gunPoly, { bevel: 0.013, segs: 3 }));
  // CF-1 (a): moulded grip grooves on both cheeks, square to the grip's rake.
  for (const sx of [-1, 1]) {
    const grooves = W.serrations(g, gunPoly, { x: sx * 0.028, y: 0.7504, z: -0.1688, axis: 'x', side: sx, along: 'y', count: 13, pitch: 0.0062, w: 0.026, depth: 0.0009, profile: 'v' });
    grooves.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.28));
    furniture.push(grooves);
  }
  painted.push(K.slab([[-0.246, 0.829], [-0.068, 0.829], [-0.068, 0.807], [-0.124, 0.803], [-0.224, 0.795]], 0.071, gunMid, { bevel: 0.005 })); // pinned trigger housing
  K.cyl(0.008, 0.008, 0.077, gunAccent, 0, 0.813, -0.219, null, 12, 'x');
  // CF-1 (b): the cross-bolt safety is one part: the bolt through the grip and its two buttons slide along x together.
  const safety = K.group(0, 0.783, -0.151); safety.name = 'm240-safety';
  K.cyl(0.006, 0.006, 0.074, gunDark, 0, 0, 0, safety, 12, 'x'); // safety bolt passes through grip
  for (const sx of [-1, 1]) {
    K.cyl(0.009, 0.009, 0.005, gunDark, sx * 0.03, 0, 0, safety, 12, 'x'); // cross-bolt safety, embedded in grip
    K.cyl(0.005, 0.005, 0.004, gunAccent, sx * 0.033, 0, 0, safety, 10, 'x');
  }
  const chargingHandle = K.group(0.077, 0.852, 0.06); chargingHandle.name = 'm240-charging-handle';
  K.box(0.017, 0.018, 0.25, gunDark, -0.003, 0, -0.08, 0, 0, 0, chargingHandle, 0.003);
  K.cyl(0.008, 0.008, 0.055, gunAccent, 0.024, 0, 0, chargingHandle, 12, 'x');
  K.cyl(0.013, 0.013, 0.029, gunRubber, 0.057, 0, 0, chargingHandle, 12, 'x');
  for (const x of [0.049, 0.057, 0.065]) K.tor(0.0129, 0.0009, gunDark, x, 0, 0, 0, Math.PI / 2, 0, chargingHandle, Math.PI * 2, 16);   // CF-1 (a): knurl bands
  g.userData.chargingHandle = chargingHandle;
  g.userData.baseChargingHandlePos = chargingHandle.position.clone();
  K.slab(gunBand([[-0.078, 0.82], [-0.078, 0.788], [-0.092, 0.776], [-0.132, 0.778], [-0.135, 0.795]], 0.007), 0.03, gunDark, { bevel: 0.004 });   // GB-180: a moulded guard, not a wire (pass 4: as wide as a real guard)
  // GB-175: trigger face toward the grip, tip curling forward (the convention Jerry set on the revolver and sniper).
  // GB-180: a solid trigger blade (wide at the root, tapering to the curled tip), not a wire, moved to mid-guard.
  // CF-1 (b): the trigger is its own part turning on its pin (addTriggerArtwork puts its origin on the pin).
  const trigger = addTriggerArtwork(g, K, [[-0.098, 0.8183], [-0.1027, 0.8056], [-0.102, 0.7979], [-0.0973, 0.7913], [-0.1027, 0.7867], [-0.11, 0.7941], [-0.1133, 0.8064], [-0.11, 0.8217]], 0.011, gunAccent, { bevel: 0.002 }).parent;
  pinEnds(THREE, g, gunAccent, [{ x: 0, y: trigger.position.y - 0.002, z: trigger.position.z, axis: 'x', span: 0.071, r: 0.0026 }]);   // the trigger pin's two ends
  const barrel = K.lathe([[0, 0.2], [0.024, 0.2], [0.024, 0.24], [0.019, 0.25], [0.019, 0.72], [0, 0.72]], gunAccent, { y: 0.875, seg: 12 });
  // CI-1 (J151 note 60, the Watchman in first person): the front sight the gunner's eye lines up through the rear leaf's
  // aperture: a clamp round the barrel near the muzzle with its tall post, the post's top level with the aperture's centre
  // (y 0.952), so the line is parallel to the bore. sightEye/sightFront name that line for the first-person camera.
  const frontSight = K.group(0, 0.875, 0.655); frontSight.name = 'm240-front-sight';
  K.cyl(0.0235, 0.0235, 0.026, gunDark, 0, 0, 0, frontSight, 14);   // the clamp band round the barrel
  K.box(0.016, 0.044, 0.022, gunDark, 0, 0.038, 0, 0, 0, 0, frontSight, 0.003);   // its upright
  K.box(0.0035, 0.022, 0.006, gunDark, 0, 0.066, 0.003, 0, 0, 0, frontSight, 0.0008);   // the post, its top at y 0.952 (0.875 + 0.066 + 0.011)
  for (const sx of [-1, 1]) K.box(0.003, 0.029, 0.014, gunDark, sx * 0.0065, 0.0725, 0.003, 0, 0, 0, frontSight, 0.0008);   // the post's guard ears, standing on the upright's top (tgt20076: were 1 mm off its sides)
  const sightEye = new THREE.Object3D(); sightEye.name = 'm240-sight-eye'; sightEye.position.set(0, 0.952, -0.20); g.add(sightEye);
  const sightFront = new THREE.Object3D(); sightFront.name = 'm240-sight-front'; sightFront.position.set(0, 0.952, 0.658); g.add(sightFront);
  g.userData.sightEye = sightEye; g.userData.sightFront = sightFront;
  // The Watchman carries an ACOG on its feed cover (index.html makeM240Mesh), right in that iron line, so the first-person
  // camera sits at the gunner's eye above and behind the optic (gunnerEye): the ACOG and the receiver low in the view,
  // the world over them, the gun swinging onto where he looks.
  const gunnerEye = new THREE.Object3D(); gunnerEye.name = 'm240-gunner-eye'; gunnerEye.position.set(0, 1.10, -0.34); g.add(gunnerEye);
  g.userData.gunnerEye = gunnerEye;
  painted.push(part(THREE, ventTube(THREE, 0.028, 0.003, 0.24, 8, 7, 0.52, 0.56, 6), gunBody, g, 0, 0.875, 0.227));   // GB-189: 10-point holes (were 16)
  K.rail(0.205, 0.039, 0.875, 0.355, null, 0.026, 1); // right handguard rail for standard PEQ-16
  K.box(0.014, 0.014, 0.085, gunDark, 0.057, 0.875, 0.42, 0, 0, 0, null, 0.002); // PEQ mount shelf
  K.box(0.02, 0.012, 0.016, gunDark, 0.109, 0.875, 0.366, 0, 0, 0, null, 0.003); // PEQ rear lanyard bracket
  for (const z of [0.226, 0.469]) K.cyl(0.032, 0.032, 0.012, gunMid, 0, 0.875, z, null, 16);
  // CF-1 (b): the barrel-locking latch, left, its own part pivoting about y at its inner end.
  const barrelLatch = K.group(-0.045, 0.872, 0.203); barrelLatch.name = 'm240-barrel-latch';
  K.box(0.028, 0.026, 0.017, gunDark, -0.014, 0, 0, 0, 0, 0, barrelLatch, 0.003); // barrel-locking latch, left
  K.box(0.014, 0.009, 0.028, gunAccent, -0.030, 0, 0, 0, 0, 0, barrelLatch, 0.002);
  K.lathe([[0, 0.715], [0.024, 0.72], [0.024, 0.79], [0.012, 0.792], [0.012, 0.785], [0, 0.785]], gunDark, { y: 0.875, seg: 12 });
  K.lathe([[0, 0.2], [0.014, 0.2], [0.014, 0.56], [0, 0.56]], gunDark, { y: 0.835, seg: 10 });
  K.box(0.04, 0.05, 0.05, gunDark, 0, 0.85, 0.57, 0, 0, 0, null, 0.006);
  K.cyl(0.02, 0.02, 0.026, gunMid, 0, 0.835, 0.584, null, 14); // gas regulator plug
  K.tor(0.021, 0.004, gunAccent, 0, 0.835, 0.557, 0, 0, 0, null, Math.PI * 2, 14); // collar
  for (const sx of [-1, 1]) K.box(0.008, 0.016, 0.017, gunDark, sx * 0.018, 0.835, 0.594, 0, 0, 0, null, 0.002);
  K.box(0.012, 0.05, 0.012, gunDark, 0, 0.915, 0.69);
  // Quick-change carrying handle rotates around the barrel axis to the gun's right.
  const barrelHandle = K.group(0, 0.875, 0.26); barrelHandle.name = 'm240-barrel-handle';
  K.cyl(0.014, 0.014, 0.09, gunMid, 0, 0, 0.008, barrelHandle, 12, 'x');
  K.slab(gunBand([[0, 0.02], [0.04, 0.08], [0.16, 0.08], [0.2, 0.02]], 0.008), 0.016, gunDark, { x: 0.04, bevel: 0.003, parent: barrelHandle });
  K.box(0.031, 0.014, 0.1, gunRubber, 0.04, 0.08, 0.1, 0, 0, 0, barrelHandle, 0.003);
  g.userData.barrelHandle = barrelHandle;
  g.userData.baseBarrelHandleRot = barrelHandle.rotation.clone();
  for (const z of [0.267, 0.45]) K.cyl(0.008, 0.008, 0.047, gunMid, 0, 0.902, z, null, 8, 'x');
  for (let i = 0; i < 6; i++) K.box(0.018, 0.003, 0.006, gunRubber, 0.04, 0.961, 0.314 + i * 0.019, 0, 0, 0, null, 0.001);
  const bipod = K.group(0, 0.812, 0.47); bipod.name = 'm240-bipod-folded';
  K.cyl(0.025, 0.025, 0.067, gunMid, 0, 0, 0, bipod, 12, 'x'); // ball joint and leg slot
  for (const sx of [-1, 1]) {
    K.cyl(0.007, 0.007, 0.235, gunDark, sx * 0.025, -0.013, -0.118, bipod, 8);
    K.box(0.022, 0.014, 0.03, gunMid, sx * 0.025, -0.013, -0.232, 0, 0, 0, bipod, 0.003);
  }
  g.userData.bipod = bipod;
  if (!folded) {
    const can = [K.box(0.09, 0.145, 0.2, gunOlive, -0.12, 0.7875, 0, 0, 0, 0, null, 0.008),
      K.box(0.096, 0.013, 0.206, gunMid, -0.12, 0.866, 0, 0, 0, 0, null, 0.003)];
    for (const piece of can) markPaintSurface(piece, 'magazine');
    for (const z of [-0.087, 0.087]) K.box(0.006, 0.126, 0.006, gunMid, -0.166, 0.79, z, 0, 0, 0, null, 0.001);
    K.box(0.009, 0.059, 0.043, gunDark, -0.169, 0.809, -0.003, 0, 0, 0, null, 0.002);
    K.box(0.011, 0.029, 0.034, gunMid, -0.176, 0.818, -0.003, 0, 0, 0, null, 0.003);
    // Linked cartridges turn continuously from the can's mouth into the feed port.
    // CF-1 / GP-20123 (J133): true 7.62 x 51 live rounds (the shared roundGeometry: 71 mm long, 12 mm across), noses
    // forward, each in its link, at a 12.3 mm link pitch on the same path (7 rounds; the 10 before were 8.6 mm thin).
    const beltRound = roundGeometry(THREE, 'm240');
    beltRound.userData.shared = true;   // cached and reused: a removed Watchman must not dispose it
    const beltFinish = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .42, metalness: .55 });
    beltFinish.name = 'm240 belt rounds';
    for (let i = 0; i < 7; i++) {
      const u = i / 6, x = -0.122 + 0.074 * u, y = 0.873 + 0.037 * Math.sin(u * Math.PI / 2);
      const round = new THREE.Mesh(beltRound, beltFinish);
      round.rotation.x = Math.PI / 2;   // the round's +Y nose to the gun's +Z
      round.position.set(x, y, 0.052);
      round.castShadow = round.receiveShadow = true;
      g.add(round);
      K.box(0.0131, 0.0138, 0.012, gunDark, x, y, 0.030, 0, 0, 0, null, 0.0015);   // its link round the case body, hooked into the next (the belt hangs together)
    }
  }
  g.userData.barrel = barrel;
  // gunBody is only ever painted steel on this gun: the receiver, the handguard, the tripod's sleeves, hub and feet.
  g.traverse(o => { if (o.isMesh && o.material === gunBody) painted.push(o); });
  for (const piece of painted) markPaintSurface(piece, 'receiver');
  for (const piece of furniture) markPaintSurface(piece, 'furniture');
  // J52: the Watchman's PEQ-16 comes with the gun. It follows the elevating
  // gun parts, so mount it before those parts are moved into their pivot.
  attachLaserLight(g, 'm240', ctx);
  const elev = new THREE.Group();
  elev.name = 'm240-elev'; elev.position.copy(M240_PIVOT);
  for (const part of g.children.slice(firstGunPart)) { part.position.sub(M240_PIVOT); elev.add(part); }
  g.add(elev);
  g.userData.elev = elev;
  // CF-1 (b, J149): every control a hand works on the Watchman, each its own part with its origin on its pivot
  // (in m240-elev, which tips with the aim; the feed cover's latch rides the cover). Bound after the move into elev.
  g.userData.triggerPin = trigger.position.toArray();
  bindModelArtwork(g, 'controls', 'trigger', trigger);
  bindModelArtwork(g, 'controls', 'safety', safety);
  bindModelArtwork(g, 'controls', 'chargingHandle', chargingHandle);
  bindModelArtwork(g, 'controls', 'feedCover', feedCover);
  bindModelArtwork(g, 'controls', 'feedCoverLatch', feedCoverLatch);
  bindModelArtwork(g, 'controls', 'barrelLatch', barrelLatch);
  bindModelArtwork(g, 'controls', 'barrelHandle', barrelHandle);
  return finishGun(g);
}
