// Fallen wood is built along +X. Its lower bark and its placement probes use
// the same vertices, so short, tapered or curved sections keep their own feet.
const FORMS = [
  { name: 'weathered', length: 3.7, girth: 0.19, taper: 0.47, bend: 0.085, bark: 0xa59985, wood: 0xc4b59b,
    stubs: [[0.65, 0.65, 0.19, 0.038]] },
  { name: 'forked', length: 2.95, girth: 0.22, taper: 0.60, bend: -0.13, bark: 0x97816b, wood: 0xbda07c,
    stubs: [[0.35, -0.7, 0.36, 0.072], [0.72, 0.9, 0.49, 0.089]] },
  { name: 'mossy', length: 2.45, girth: 0.29, taper: 0.82, bend: 0.06, bark: 0x94836d, wood: 0xab9478,
    stubs: [[0.26, 0.56, 0.23, 0.06]] }
];

const SIDES = 12;
const TAU = 2 * Math.PI;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function buildTimber(THREE, form, variant) {
  const { length, girth, taper, bend, name } = form;
  const positions = [], colors = [], uvs = [], rings = [], stations = [];
  const bark = new THREE.Color(form.bark), wood = new THREE.Color(form.wood);
  const cambium = new THREE.Color(0xb29c80), moss = new THREE.Color(0x91937a);
  const rot = new THREE.Color(0x695946);
  let sector = 0;
  function barkUV(t, angle) {
    let v = angle / TAU;
    v += Math.round(sector - v); // unwrap the longitudinal seam in this facet
    return [Math.max(0.002, Math.min(0.998, t)), (variant + 0.005 + 0.99 * v) / 4];
  }
  const capUV = (a,b) => [0.5 + a * 0.39, (3.5 + b * 0.39) / 4];
  let uvOf = p => {
    const t = p[0] / length + 0.5, cy = girth * 0.12 * Math.sin(t * Math.PI), cz = bend * Math.sin(t * Math.PI);
    return barkUV(t, Math.atan2(p[1] - cy, p[2] - cz));
  };

  function face(a, b, c, color, value = 1) {
    positions.push(...a, ...b, ...c);
    uvs.push(...uvOf(a), ...uvOf(b), ...uvOf(c));
    for (let i = 0; i < 3; i++) colors.push(color.r * value, color.g * value, color.b * value);
  }
  function quad(a, b, c, d, color, value) {
    face(a, b, c, color, value);
    face(a, c, d, color, value);
  }
  const center = t => [(t - 0.5) * length, girth * 0.12 * Math.sin(t * Math.PI), bend * Math.sin(t * Math.PI)];
  const radius = t => girth * (1 + (taper - 1) * t);

  // Broad bark ridges and missing plates follow the grain. The broken end
  // fibers project to different lengths, unlike the end of a sawn round.
  const stops = [0, 0.13, 0.36, 0.60, 0.86, 1];
  for (const [i, t] of stops.entries()) {
    const middle = center(t), ring = [];
    for (let j = 0; j < SIDES; j++) {
      const a = j * TAU / SIDES;
      const rib = 1 + 0.07 * Math.sin(a * 3 + variant) + 0.045 * Math.cos(a * 5 + t * 5);
      const r = radius(t) * rib;
      const end = i === 0 ? 1 : i === stops.length - 1 ? -1 : 0;
      const splinter = end * girth * (0.24 + 0.12 * Math.sin(j * 2.2 + i) + (j === (variant + i) % SIDES ? 0.24 : 0));
      ring.push([middle[0] + splinter, middle[1] + Math.sin(a) * r, middle[2] + Math.cos(a) * r]);
    }
    rings.push(ring);
  }
  for (let i = 0; i + 1 < rings.length; i++) {
    for (let j = 0; j < SIDES; j++) {
      sector = (j + 0.5) / SIDES;
      const k = (j + 1) % SIDES, left = rings[i], right = rings[i + 1];
      const bare = (j === 3 && i !== 0) || (name === 'weathered' && (j === 4 || (j === 1 && i < 3)));
      const shade = 0.85 + 0.13 * Math.sin(j * 3 + variant) + 0.05 * Math.cos(i * 1.3 + j);
      let skin = bare ? wood : bark;
      if (name === 'mossy' && j <= 6) {
        const cover = Math.max(0, Math.sin((j + 0.5) * TAU / SIDES)) * (0.57 + 0.22 * Math.cos(i * 2.2 - j * 0.76));
        skin = skin.clone().lerp(moss, cover);
      }
      // A few lifted bark scales catch grazing light. Subdivide the original
      // facet so the flakes have attached edges and no superimposed faces.
      const plate = j === (variant + 2 * i) % 6 && (name === 'forked' ? i === 1 || i === 3 : i !== 2);
      const a = left[j], b = right[j], c = right[k];
      if (plate) {
        const tip = mix(mix(a, b, 0.87), c, 0.15), heel = mix(mix(a, b, 0.16), c, 0.07);
        const flap = mix(mix(a, b, 0.53), c, 0.25);
        const angle = (j + 0.3) * TAU / SIDES;
        flap[1] += girth * 0.10 * Math.sin(angle);
        flap[2] += girth * 0.10 * Math.cos(angle);
        quad(a, b, tip, heel, skin, shade);
        quad(b, c, flap, tip, skin, shade);
        quad(c, a, heel, flap, skin, shade);
        face(heel, tip, flap, name === 'mossy' ? moss : cambium, shade);
      } else face(a, b, c, skin, shade);
      face(a, c, left[k], skin, shade);
    }
    // Each section is a pair of planar triangles. Track the keel and both
    // lower flanks at short intervals to fit cross slopes as well as the ends.
    const count = Math.ceil((stops[i + 1] - stops[i]) * length / 0.19);
    for (let n = 0; n < count + (i === rings.length - 2 ? 1 : 0); n++) {
      const t = n / count;
      const points = [7, 8, 9, 10, 11].map(j => mix(rings[i][j], rings[i + 1][j], t));
      stations.push({ x: points[2][0], points, barkVertices: n === 0 || n === count });
    }
  }

  const trunkVertices = positions.length / 3;
  function brokenEnd(side) {
    const end = side < 0 ? 0 : 1, outer = rings[end * (rings.length - 1)], core = center(end);
    const section = center(end), endRadius = radius(end);
    uvOf = p => capUV((p[2] - section[2]) / endRadius, (p[1] - section[1]) / endRadius);
    // The damp snag has an eaten-out end with a recessed, ragged dark core.
    const hollow = name === 'mossy' && side < 0;
    const recess = girth * (hollow ? 0.78 : 0.10);
    core[0] -= side * (girth * 0.28 + recess);
    core[1] += girth * 0.06;
    core[2] -= girth * 0.09;
    const rim = outer.map(p => mix(core, p, 0.85));
    const grain = outer.map(p => mix(core, p, hollow ? 0.64 : 0.48));
    const capFace = (a, b, c, color, value) => side < 0 ? face(a, b, c, color, value) : face(a, c, b, color, value);
    for (let j = 0; j < SIDES; j++) {
      const k = (j + 1) % SIDES;
      const value = 0.97 + Math.cos(j * 2.7) * 0.06;
      capFace(outer[j], outer[k], rim[k], cambium, value);
      capFace(outer[j], rim[k], rim[j], cambium, value);
      capFace(rim[j], rim[k], grain[k], wood, value);
      capFace(rim[j], grain[k], grain[j], wood, value);
      if (j === (variant + 3 + end * 4) % SIDES) {
        const split = mix(grain[j], grain[k], 0.14);
        capFace(grain[j], split, core, rot, 0.72);
        capFace(split, grain[k], core, hollow ? rot : wood, value * 0.77);
      } else capFace(grain[j], grain[k], core, hollow ? rot : wood, hollow ? value : value * 0.77);
    }
  }
  brokenEnd(-1);
  brokenEnd(1);

  for (const [t, side, reach, width] of form.stubs) {
    const base = center(t), r = radius(t);
    base[1] += r * 0.46;
    base[2] += r * side * 0.45;
    const direction = new THREE.Vector3(0.58, 0.52, side).normalize();
    const across = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
    const up = direction.clone().cross(across);
    const bottom = [], top = [];
    for (let j = 0; j < 7; j++) {
      const a = j * TAU / 7, factor = 0.88 + 0.12 * Math.sin(j * 3);
      const offset = across.clone().multiplyScalar(Math.cos(a)).addScaledVector(up, Math.sin(a));
      const foot = new THREE.Vector3(...base).addScaledVector(offset, width * factor);
      const tip = new THREE.Vector3(...base).addScaledVector(direction, reach + width * 0.45 * Math.sin(j * 2))
        .addScaledVector(offset, width * factor * 0.50);
      bottom.push(foot.toArray()); top.push(tip.toArray());
    }
    const heart = new THREE.Vector3(...base).addScaledVector(direction, reach - width * 0.25).toArray();
    for (let j = 0; j < 7; j++) {
      const k = (j + 1) % 7;
      sector = (j + 0.5) / 7;
      uvOf = p => {
        const d = new THREE.Vector3(p[0] - base[0], p[1] - base[1], p[2] - base[2]);
        return barkUV(0.29 + d.dot(direction) / length, Math.atan2(d.dot(up), d.dot(across)));
      };
      quad(bottom[j], bottom[k], top[k], top[j], j % 4 === 0 ? cambium : bark, 0.9 + 0.09 * Math.cos(j));
      uvOf = p => {
        const d = new THREE.Vector3(p[0] - heart[0], p[1] - heart[1], p[2] - heart[2]);
        return capUV(d.dot(across) / (width * 0.56), d.dot(up) / (width * 0.56));
      };
      face(top[j], top[k], heart, wood);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  const normal = geometry.attributes.normal;
  // Bark follows the rounded trunk. End grain, checks and stub breaks retain
  // their flat face normals and the silhouette keeps its actual irregular edge.
  for (let i = 0; i < trunkVertices; i++) {
    const o = i * 3, t = positions[o] / length + 0.5, mid = center(t);
    const dy = positions[o + 1] - mid[1], dz = positions[o + 2] - mid[2], r = Math.hypot(dy, dz);
    const slope = Math.PI / length * Math.cos(t * Math.PI);
    const nx = 0.88 * (girth * (1 - taper) / length - slope * (girth * 0.12 * dy + bend * dz) / r) + 0.12 * normal.getX(i);
    const ny = 0.88 * dy / r + 0.12 * normal.getY(i), nz = 0.88 * dz / r + 0.12 * normal.getZ(i);
    const inv = 1 / Math.hypot(nx, ny, nz);
    normal.setXYZ(i, nx * inv, ny * inv, nz * inv);
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const maxZ = Math.max(Math.abs(geometry.boundingBox.min.z), Math.abs(geometry.boundingBox.max.z));
  const stationSpacing = Math.max(...stations.slice(1).map((p, i) => p.x - stations[i].x));
  return { name, geometry, length, radius: maxZ, stations, stationSpacing };
}

export function createFallenTimber(THREE) {
  return FORMS.map((form, i) => buildTimber(THREE, form, i));
}

// Three longitudinal bark strips and one end-grain disc share a single atlas.
// Grain follows each piece's local axis, including the two forked stubs.
export function createTimberBarkTexture(THREE) {
  const width = 512, band = 128, pixels = new Uint8Array(width * band * 4 * 4);
  const lattice = new Float32Array(128 * 128);
  let seed = 0x2e71b94d;
  for (let i = 0; i < lattice.length; i++) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    lattice[i] = seed / 4294967296;
  }
  const grid = (x, y) => lattice[(x & 127) + 128 * (y & 127)];
  const clamp = x => Math.min(1, Math.max(0, x));
  const smooth = t => t * t * (3 - 2 * t);
  function noise(x, y) {
    const i = Math.floor(x), j = Math.floor(y), u = smooth(x - i), v = smooth(y - j);
    return (grid(i, j) * (1 - u) + grid(i + 1, j) * u) * (1 - v)
      + (grid(i, j + 1) * (1 - u) + grid(i + 1, j + 1) * u) * v;
  }
  // Anisotropic cellular borders make elongated bark plates split and rejoin,
  // with a pale sliver along the fractured edge and dark fiber in the fissure.
  function plateEdge(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    let near = 9, next = 9;
    for (let j = iy - 1; j <= iy + 1; j++) for (let i = ix - 1; i <= ix + 1; i++) {
      const dx = i + 0.15 + 0.7 * grid(i, j) - x, dy = j + 0.15 + 0.7 * grid(i + 61, j + 43) - y;
      const ds = dx * dx + dy * dy;
      if (ds < near) { next = near; near = ds; } else next = Math.min(next, ds);
    }
    return Math.sqrt(next) - Math.sqrt(near);
  }
  for (let row = 0; row < band * 4; row++) {
    const form = Math.floor(row / band), v = ((row % band) + 0.5) / band;
    for (let col = 0; col < width; col++) {
      const i = (row * width + col) * 4, u = (col + 0.5) / width;
      const fleck = grid(col + form * 11, row);
      let lum, moss = 0;
      if (form === 3) {
        const x = (u - 0.47) * 2, y = (v - 0.51) * 2;
        const r = Math.hypot(x, y), a = Math.atan2(y, x);
        const rGrain = r * (1 + 0.046 * Math.sin(3 * a + 1) + 0.031 * Math.cos(5 * a - 0.6));
        const growth = rGrain * 14 + 0.30 * noise(x * 5 + 38, y * 5);
        const ring = 1 - clamp(Math.abs(growth - Math.round(growth)) * 5.2);
        const crack = 1 - clamp(Math.abs(Math.sin(a * 2.5 + 0.15 * Math.sin(r * 5) + 2)) * r * 45);
        lum = 245 - ring * 47 - crack * clamp((r - 0.34) * 5) * 109 + (fleck - 0.5) * 10;
      } else {
        const seedX = form * 27;
        const broad = noise(u * 6 + seedX, v * 12);
        const warp = (broad - 0.5) * 0.058 + (noise(u * 18 + 17, v * 22) - 0.5) * 0.017;
        const along = u * (form === 0 ? 9 : 15) + seedX, around = (v + warp) * 24;
        const edge = plateEdge(along, around);
        const shadow = 1 - clamp(edge * (form === 0 ? 17 : 9));
        const lip = 1 - clamp(Math.abs(edge - 0.15) * 9);
        const fiber = noise(u * 34 + seedX, (v + warp) * 114);
        const small = noise(u * 72 + seedX, (v + warp) * 180);
        lum = 197 + (broad - 0.5) * 33 + fiber * 32 + (small - 0.5) * 33 + (fleck - 0.5) * 18
          - shadow * (form === 0 ? 64 : 95) + lip * 16;
        if (form === 2) {
          const upper = 0.5 + 0.5 * Math.sin(v * TAU);
          const patch = 0.45 * broad + 0.32 * noise(u * 20 + 0.8, v * 19 + 2) + 0.23 * upper;
          moss = smooth(clamp((patch - 0.52 + (small - 0.5) * 0.18) * 9));
        }
      }
      pixels[i] = Math.round(Math.min(255, lum * (1 - moss * 0.19)));
      pixels[i + 1] = Math.round(Math.min(255, lum * (1 + moss * 0.07)));
      pixels[i + 2] = Math.round(Math.min(255, lum * (1 - moss * 0.31)));
      pixels[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, width, band * 4, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// Vertical offsets are constrained by the underside of the entire rigid bole,
// including its flanks. Reject a ridge/hollow that leaves a rocking or hanging
// end. Side stubs point up, and are included in the horizontal clearance width.
export function fitFallenTimber(template, x, z, yaw, scale, groundY, allowPoint) {
  if (![x, z, yaw, scale].every(Number.isFinite) || !(scale > 0)) return null;
  const c = Math.cos(yaw), s = Math.sin(yaw), { stations } = template;
  const baseHeight = point => groundY(x + scale * (c * point[0] - s * point[2]), z + scale * (s * point[0] + c * point[2]));
  const a = stations[0].points[2], b = stations.at(-1).points[2];
  const slope = (baseHeight(b) - baseHeight(a) - scale * (b[1] - a[1])) / (scale * (b[0] - a[0]));
  if (!Number.isFinite(slope) || Math.abs(slope) > 0.75) return null;
  const cp = 1 / Math.hypot(1, slope), sp = slope * cp;
  const supports = [];
  const bounds = template.geometry.boundingBox;
  const leftEnd = bounds.min.x + 0.18 * (bounds.max.x - bounds.min.x);
  const rightEnd = bounds.max.x - 0.18 * (bounds.max.x - bounds.min.x);
  let realSupport = -Infinity, leftSupport = -Infinity, rightSupport = -Infinity;
  const tipReach = cp * Math.max(a[0] - bounds.min.x, bounds.max.x - b[0], 0)
    + Math.abs(sp) * Math.max(Math.abs(bounds.min.y), Math.abs(bounds.max.y));
  // Overlapping clearance disks cover the full width *between* samples and
  // the angled splinters beyond the first/last keel station.
  const padding = scale * Math.hypot(template.radius, Math.max(tipReach, cp * template.stationSpacing / 2)) + 0.01;
  for (const station of stations) {
    const axis = cp * station.x * scale, cx = x + c * axis, cz = z + s * axis;
    if (allowPoint && !allowPoint(cx, cz, padding, groundY(cx, cz))) return null;
    let support = -Infinity;
    for (const [lx, ly, lz] of station.points) {
      const along = (cp * lx - sp * ly) * scale, across = lz * scale;
      const wx = x + c * along - s * across, wz = z + s * along + c * across;
      const floor = groundY(wx, wz);
      if (!Number.isFinite(floor)) return null;
      const required = floor - scale * (sp * lx + cp * ly);
      support = Math.max(support, required);
      if (station.barkVertices) {
        realSupport = Math.max(realSupport, required);
        if (lx < leftEnd) leftSupport = Math.max(leftSupport, required);
        if (lx > rightEnd) rightSupport = Math.max(rightSupport, required);
      }
    }
    supports.push(support);
  }
  const y = Math.max(...supports) - 0.012 * scale;
  const minGap = y - Math.max(...supports), maxGap = y - Math.min(...supports);
  // A ridge halfway along a long face can hold an entire log off its end
  // rings. Require physical bark contacts at both ends, in world metres.
  if (maxGap > 0.12 * scale || y - realSupport > 0.012 || y - leftSupport > 0.042 || y - rightSupport > 0.042) return null;
  const matrix = [
    c * cp * scale, sp * scale, s * cp * scale, 0,
    -c * sp * scale, cp * scale, -s * sp * scale, 0,
    -s * scale, 0, c * scale, 0,
    x, y, z, 1
  ];
  return { matrix, x, y, z, yaw, scale, minGap, maxGap };
}

// Half-metre buckets hold the projected faces of fallen timber only. Bake
// world-space barycentric coefficients when a log moves; actors then query
// their own bucket without raycasting the scene or allocating temporaries.
export function createTimberFooting() {
  const columns = new Map(), occupied = new Map();
  const cellOf = p => Math.floor(p * 2);

  function remove(log) {
    const cells = occupied.get(log);
    if (!cells) return;
    for (const cell of cells) {
      cell.faces = cell.faces.filter(face => face.log !== log);
      if (cell.faces.length) continue;
      const column = columns.get(cell.ix);
      column.delete(cell.iz);
      if (!column.size) columns.delete(cell.ix);
    }
    occupied.delete(log);
  }

  function set(log, geometry, matrix) {
    const pos = geometry.attributes.position, index = geometry.index;
    const m = matrix.elements || matrix, points = new Float64Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), o = i * 3;
      points[o] = m[0] * x + m[4] * y + m[8] * z + m[12];
      points[o + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      points[o + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    }
    remove(log);
    const cells = new Set(), count = index ? index.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const a = (index ? index.getX(i) : i) * 3;
      const b = (index ? index.getX(i + 1) : i + 1) * 3;
      const c = (index ? index.getX(i + 2) : i + 2) * 3;
      const x = points[a], y = points[a + 1], z = points[a + 2];
      const bx = points[b] - x, bz = points[b + 2] - z;
      const cx = points[c] - x, cz = points[c + 2] - z;
      const det = bx * cz - bz * cx;
      if (Math.abs(det) <= 1e-12) continue; // no horizontal footing on a vertical edge
      const minX = Math.min(x, points[b], points[c]), maxX = Math.max(x, points[b], points[c]);
      const minZ = Math.min(z, points[b + 2], points[c + 2]), maxZ = Math.max(z, points[b + 2], points[c + 2]);
      const face = { log, x, y, z, minX, maxX, minZ, maxZ, ux: cz / det, uz: -cx / det,
        vx: -bz / det, vz: bx / det, by: points[b + 1] - y, cy: points[c + 1] - y };
      for (let ix = cellOf(minX); ix <= cellOf(maxX); ix++) {
        let column = columns.get(ix);
        if (!column) columns.set(ix, column = new Map());
        for (let iz = cellOf(minZ); iz <= cellOf(maxZ); iz++) {
          let cell = column.get(iz);
          if (!cell) column.set(iz, cell = { ix, iz, faces: [] });
          cell.faces.push(face);
          cells.add(cell);
        }
      }
    }
    if (cells.size) occupied.set(log, cells);
  }

  function heightAt(x, z, maxY) {
    const cell = columns.get(cellOf(x))?.get(cellOf(z));
    if (!cell) return null;
    let top = -Infinity;
    for (let i = 0; i < cell.faces.length; i++) {
      const f = cell.faces[i];
      if (x < f.minX || x > f.maxX || z < f.minZ || z > f.maxZ) continue;
      const dx = x - f.x, dz = z - f.z;
      const u = f.ux * dx + f.uz * dz, v = f.vx * dx + f.vz * dz;
      if (u >= -1e-8 && v >= -1e-8 && u + v <= 1 + 1e-8) {
        top = Math.max(top, f.y + u * f.by + v * f.cy);
      }
    }
    // Applying the step limit to each face would find the *underside* when
    // the top was too high, leaving the actor inside the trunk.
    return top === -Infinity || (maxY != null && top > maxY) ? null : top;
  }
  return { set, remove, heightAt };
}

// One terrain-draped contact strip per trunk, in one draw for the whole map.
// The lower bark, independently of projecting branches, controls its width
// and darkness. Only creation, terrain changes and removals write the buffers.
export function createTimberGroundShade(THREE, capacity, groundY, TSL) {
  const rows = 17, columns = 7, stride = rows * columns, indexCount = (rows - 1) * (columns - 1) * 6;
  const pos = new Float32Array(capacity * stride * 3), rgba = new Float32Array(capacity * stride * 4);
  const indices = new (capacity * stride < 65536 ? Uint16Array : Uint32Array)(capacity * indexCount);
  const slots = new Map(), logs = [];
  let n = 0;
  for (let k = 0; k < capacity; k++) for (let r = 0; r < rows - 1; r++) for (let j = 0; j < columns - 1; j++) {
    const a = k * stride + r * columns + j, b = a + columns;
    indices.set([a, a + 1, b, a + 1, b + 1, b], n); n += 6;
  }
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const color = new THREE.BufferAttribute(rgba, 4).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', position);
  geometry.setAttribute('color', color);
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.setDrawRange(0, 0);
  const nodeAlpha = !!(TSL?.attribute && THREE.MeshBasicNodeMaterial);
  const ShadeMaterial = nodeAlpha ? THREE.MeshBasicNodeMaterial : THREE.MeshBasicMaterial;
  const material = new ShadeMaterial({ color: 0x272623, vertexColors: !nodeAlpha, transparent: true,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, fog: true });
  // The WebGPU node renderer's default vertex-colour path reads RGB only.
  if (nodeAlpha) material.opacityNode = TSL.attribute('color', 'vec4').w;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'fallen-timber-contact';
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  mesh.visible = false;

  function remove(log) {
    const slot = slots.get(log);
    if (slot === undefined) return;
    const last = logs.length - 1;
    if (slot !== last) {
      pos.copyWithin(slot * stride * 3, last * stride * 3, (last + 1) * stride * 3);
      rgba.copyWithin(slot * stride * 4, last * stride * 4, (last + 1) * stride * 4);
      slots.set(logs[last], slot);
      logs[slot] = logs[last];
      position.needsUpdate = color.needsUpdate = true;
    }
    logs.pop(); slots.delete(log);
    geometry.setDrawRange(0, logs.length * indexCount);
    mesh.visible = logs.length > 0;
  }

  function set(log, form, matrix) {
    const slot = slots.get(log) ?? logs.length;
    if (slot >= capacity) return false;
    const m = matrix.elements || matrix, stations = form.stations, scale = Math.hypot(m[8], m[10]);
    const bounds = form.geometry.boundingBox, length = bounds.max.x - bounds.min.x;
    let segment = 0;
    for (let i = 0; i < rows; i++) {
      const t = i / (rows - 1);
      const lx = stations[0].x + t * (stations.at(-1).x - stations[0].x);
      while (segment < stations.length - 2 && stations[segment + 1].x < lx) segment++;
      const a = stations[segment], b = stations[segment + 1], u = (lx - a.x) / (b.x - a.x);
      let keelX, keelZ, leftZ, rightZ, bestGap = Infinity, contactZ = 0;
      for (let p = 0; p < a.points.length; p++) {
        const pa = a.points[p], pb = b.points[p];
        const x = pa[0] + (pb[0] - pa[0]) * u, y = pa[1] + (pb[1] - pa[1]) * u, z = pa[2] + (pb[2] - pa[2]) * u;
        const wx = m[0] * x + m[4] * y + m[8] * z + m[12], wz = m[2] * x + m[6] * y + m[10] * z + m[14];
        const gap = m[1] * x + m[5] * y + m[9] * z + m[13] - groundY(wx, wz);
        if (gap < bestGap) { bestGap = gap; contactZ = z; }
        if (p === 0) leftZ = z;
        if (p === 2) { keelX = wx; keelZ = wz; }
        if (p === a.points.length - 1) rightZ = z;
      }
      const centerZ = a.points[2][2] + (b.points[2][2] - a.points[2][2]) * u;
      const sideShift = (contactZ - centerZ) * 0.32;
      const bodyRadius = Math.abs(rightZ - leftZ) / Math.sqrt(3);
      const end = Math.min(1, Math.min(t, 1 - t) * length / 0.20);
      const feather = end * end * (3 - 2 * end);
      const nearGround = Math.max(0.38, 1 - Math.max(0, bestGap) / (0.18 * scale));
      // Fade into the bark at either broken end instead of stretching a dark
      // disk around the log. The last centimetres carry no visible hard edge.
      for (let j = 0; j < columns; j++) {
        const side = j / (columns - 1) * 2 - 1;
        const edgeWobble = 1 + 0.06 * Math.sin(i * 1.8 + (side < 0 ? 2 : 5) + length);
        const reach = (1.47 * bodyRadius + 0.04) * (0.62 + 0.38 * feather) * edgeWobble;
        const wx = keelX + m[8] * (sideShift + side * reach), wz = keelZ + m[10] * (sideShift + side * reach);
        const y = groundY(wx, wz);
        if (!Number.isFinite(y)) { remove(log); return false; }
        const v = slot * stride + i * columns + j, o = v * 4;
        pos[v * 3] = wx; pos[v * 3 + 1] = y + 0.004; pos[v * 3 + 2] = wz;
        const s = Math.abs(side), fade = 1 - s * s * (3 - 2 * s);
        rgba[o] = rgba[o + 1] = rgba[o + 2] = 1;
        rgba[o + 3] = 0.34 * fade * nearGround * feather;
      }
    }
    if (slot === logs.length) { slots.set(log, slot); logs.push(log); }
    geometry.setDrawRange(0, logs.length * indexCount);
    mesh.visible = true;
    position.needsUpdate = color.needsUpdate = true;
    return true;
  }
  return { mesh, set, remove };
}
