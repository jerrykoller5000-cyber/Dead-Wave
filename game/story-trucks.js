// game/story-trucks.js - AG-246 (D-116).
// Two trucks for the hikers' camp:
// 1. buildEscortTruck(THREE) - At the medical convoy behind the overturned ambulance:
//    The escort truck in the ditch, a PGB cargo truck with front-bumper winch.
// 2. buildCrashedTruck(THREE) - At the hikers' camp trail mouth:
//    Crashed nose-first into the tree ring square across the trail, with winchMount.
//
// Rules:
// - Each truck is a Group with local +x its nose.
// - Crashed truck has userData.inner, userData.winchMount at (3.55, 0.45, 0),
//   and userData.lineAt at (3.62, 0.62, 0) for storyTruckPose and storyWinchLineUpdate.
// - Same kit, palette and visual style as game/convoy-visual.js's ambulance.
// - Merged geometries for high frame rates (1.2 speed rule).

function createAccumulator() {
  const pos = [], nrm = [], idx = [];
  return {
    pos, nrm, idx,
    addQuad(p0, p1, p2, p3, normal) {
      const b = pos.length / 3;
      pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
      const nx = normal ? normal.x : 0, ny = normal ? normal.y : 0, nz = normal ? normal.z : 1;
      nrm.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    },
    addBox(cx, cy, cz, w, h, d, yaw = 0, pitch = 0, roll = 0) {
      const hx = w * 0.5, hy = h * 0.5, hz = d * 0.5;
      const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
      const cosR = Math.cos(roll), sinR = Math.sin(roll);

      const rot = (x, y, z) => {
        // Roll around X
        let x1 = x, y1 = y * cosR - z * sinR, z1 = y * sinR + z * cosR;
        // Pitch around Z
        let x2 = x1 * cosP - y1 * sinP, y2 = x1 * sinP + y1 * cosP, z2 = z1;
        // Yaw around Y
        let x3 = x2 * cosY + z2 * sinY, y3 = y2, z3 = -x2 * sinY + z2 * cosY;
        return { x: cx + x3, y: cy + y3, z: cz + z3 };
      };

      const p000 = rot(-hx, -hy, -hz), p100 = rot(hx, -hy, -hz);
      const p110 = rot(hx, hy, -hz),  p010 = rot(-hx, hy, -hz);
      const p001 = rot(-hx, -hy, hz),  p101 = rot(hx, -hy, hz);
      const p111 = rot(hx, hy, hz),   p011 = rot(-hx, hy, hz);

      // 6 faces
      this.addQuad(p101, p001, p011, p111, { x: 0, y: 0, z: 1 }); // +z
      this.addQuad(p000, p100, p110, p010, { x: 0, y: 0, z: -1 }); // -z
      this.addQuad(p010, p110, p111, p011, { x: 0, y: 1, z: 0 }); // +y
      this.addQuad(p001, p101, p100, p000, { x: 0, y: -1, z: 0 }); // -y
      this.addQuad(p100, p101, p111, p110, { x: 1, y: 0, z: 0 }); // +x
      this.addQuad(p001, p000, p010, p011, { x: -1, y: 0, z: 0 }); // -x
    },
    addCylinder(p0, p1, radius, sides = 8) {
      const dx = p1.x - p0.x, dy = p1.y - p0.y, dz = p1.z - p0.z;
      const len = Math.hypot(dx, dy, dz);
      if (len < 1e-4) return;
      const dirX = dx / len, dirY = dy / len, dirZ = dz / len;

      let upX = 0, upY = 1, upZ = 0;
      if (Math.abs(dirY) > 0.95) { upX = 1; upY = 0; upZ = 0; }
      let ux = dirY * upZ - dirZ * upY, uy = dirZ * upX - dirX * upZ, uz = dirX * upY - dirY * upX;
      const ulen = Math.hypot(ux, uy, uz) || 1;
      ux /= ulen; uy /= ulen; uz /= ulen;
      const vx = uy * dirZ - uz * dirY, vy = uz * dirX - ux * dirZ, vz = ux * dirY - uy * dirX;

      const ring0 = [], ring1 = [], normals = [];
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const cos = Math.cos(a), sin = Math.sin(a);
        const nx = ux * cos + vx * sin, ny = uy * cos + vy * sin, nz = uz * cos + vz * sin;
        normals.push({ x: nx, y: ny, z: nz });
        ring0.push({ x: p0.x + nx * radius, y: p0.y + ny * radius, z: p0.z + nz * radius });
        ring1.push({ x: p1.x + nx * radius, y: p1.y + ny * radius, z: p1.z + nz * radius });
      }

      for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;
        const pA = ring0[i], pB = ring0[next], pC = ring1[next], pD = ring1[i];
        const nA = normals[i], nB = normals[next];
        const avgN = { x: (nA.x + nB.x) * 0.5, y: (nA.y + nB.y) * 0.5, z: (nA.z + nB.z) * 0.5 };
        this.addQuad(pA, pB, pC, pD, avgN);
      }
    },
    toBufferGeometry(THREE) {
      const geo = new THREE.BufferGeometry();
      if (pos.length) geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      if (nrm.length) geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      if (idx.length) geo.setIndex(idx);
      geo.computeVertexNormals();
      return geo;
    }
  };
}

export function getStoryTruckMaterials(THREE) {
  return {
    olive: new THREE.MeshStandardMaterial({ color: 0x4b5137, roughness: 0.82, metalness: 0.22 }),
    darkOlive: new THREE.MeshStandardMaterial({ color: 0x3a402d, roughness: 0.88, metalness: 0.18 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x5a605c, roughness: 0.62, metalness: 0.70 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x222625, roughness: 0.90, metalness: 0.10 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1c1e1d, roughness: 0.92, metalness: 0.05 }),
    rust: new THREE.MeshStandardMaterial({ color: 0x724c38, roughness: 0.94, metalness: 0.15 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x273a40, roughness: 0.28, metalness: 0.35 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xd8c797, roughness: 0.40, metalness: 0.20, emissive: 0x443c28, emissiveIntensity: 0.25 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x8a9290, roughness: 0.55, metalness: 0.75 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xd48b30, roughness: 0.45, metalness: 0.15 }),
  };
}

// ---------------------------------------------------------------------------
// 1. buildEscortTruck(THREE)
// Medical convoy escort truck ditched behind the overturned ambulance.
// Includes bumper-mounted recovery winch (with drum, cable, hook and remote lead).
// ---------------------------------------------------------------------------
export function buildEscortTruck(THREE) {
  const root = new THREE.Group();
  root.name = 'story-escort-truck';

  const mats = getStoryTruckMaterials(THREE);
  const bodyBuf = createAccumulator();
  const steelBuf = createAccumulator();
  const darkBuf = createAccumulator();
  const rubberBuf = createAccumulator();
  const glassBuf = createAccumulator();
  const lampBuf = createAccumulator();

  // Truck sitting tilted in the ditch (flank list & slight rear squat)
  const inner = new THREE.Group();
  inner.name = 'escort-truck-inner';
  inner.rotation.z = -0.06;
  inner.rotation.x = 0.08;
  root.add(inner);

  // Chassis Rails (pair of heavy steel C-channels)
  for (const sz of [-0.46, 0.46]) {
    steelBuf.addBox(0.2, 0.48, sz, 6.2, 0.18, 0.10);
    // Cross-members
    for (const cx of [-2.4, -1.0, 0.5, 2.0, 3.2]) {
      steelBuf.addBox(cx, 0.48, 0, 0.12, 0.14, 0.92);
    }
  }

  // Front Heavy Bumper (reinforcement & tow hooks)
  steelBuf.addBox(3.48, 0.45, 0, 0.24, 0.26, 2.32);
  for (const sz of [-1.02, 1.02]) {
    steelBuf.addBox(3.42, 0.45, sz, 0.30, 0.24, 0.16, 0.25 * Math.sign(sz));
    // D-ring tow shackles
    steelBuf.addCylinder({ x: 3.60, y: 0.42, z: sz }, { x: 3.64, y: 0.48, z: sz }, 0.03, 6);
  }

  // Engine Hood / Bonnet
  bodyBuf.addBox(2.80, 1.15, 0, 1.40, 0.88, 2.16);
  // Sloped front nose
  bodyBuf.addBox(3.38, 0.96, 0, 0.28, 0.65, 2.08, 0, -0.15);

  // Radiator Grille
  darkBuf.addBox(3.46, 0.94, 0, 0.08, 0.62, 1.48);
  for (let i = -5; i <= 5; i++) {
    steelBuf.addBox(3.48, 0.94, i * 0.13, 0.03, 0.58, 0.03);
  }

  // Headlights & Amber Signals
  for (const sz of [-0.88, 0.88]) {
    lampBuf.addCylinder({ x: 3.42, y: 0.98, z: sz }, { x: 3.48, y: 0.98, z: sz }, 0.14, 10);
    darkBuf.addCylinder({ x: 3.39, y: 0.98, z: sz }, { x: 3.43, y: 0.98, z: sz }, 0.17, 10);
    lampBuf.addBox(3.46, 0.74, sz, 0.05, 0.09, 0.16); // Amber turn signal
  }

  // Military Cab (2-man enclosed cab)
  bodyBuf.addBox(1.55, 1.62, 0, 1.35, 1.48, 2.24);
  bodyBuf.addBox(1.55, 2.36, 0, 1.38, 0.12, 2.26); // Roof cap
  // Windshield (Split military glass)
  glassBuf.addBox(2.18, 1.76, 0, 0.08, 0.68, 1.94, 0, -0.12);
  steelBuf.addBox(2.20, 1.76, 0, 0.10, 0.70, 0.06, 0, -0.12); // Center divide
  // Side Windows
  for (const sz of [-1.13, 1.13]) {
    glassBuf.addBox(1.58, 1.76, sz, 0.76, 0.56, 0.05);
    // Door handles
    steelBuf.addBox(1.32, 1.35, sz + Math.sign(sz) * 0.04, 0.14, 0.05, 0.04);
    // Side view mirrors
    steelBuf.addBox(2.05, 1.82, sz + Math.sign(sz) * 0.16, 0.08, 0.24, 0.14);
    steelBuf.addCylinder({ x: 2.05, y: 1.68, z: sz }, { x: 2.05, y: 1.82, z: sz + Math.sign(sz) * 0.16 }, 0.016, 5);
  }

  // Rear Cargo Bed
  bodyBuf.addBox(-0.95, 0.88, 0, 3.85, 0.22, 2.34); // Platform floor
  // Headache rack behind cab
  steelBuf.addBox(0.92, 1.65, 0, 0.08, 1.35, 2.30);
  // Sideboards (wooden/steel cargo stakes)
  for (const sz of [-1.14, 1.14]) {
    bodyBuf.addBox(-0.95, 1.42, sz, 3.85, 0.88, 0.08);
    for (const sx of [-2.8, -1.9, -1.0, -0.1, 0.8]) {
      steelBuf.addBox(sx, 1.42, sz + Math.sign(sz) * 0.02, 0.08, 0.94, 0.06);
    }
  }
  // Tailgate
  bodyBuf.addBox(-2.88, 1.42, 0, 0.08, 0.88, 2.28);
  steelBuf.addBox(-2.89, 1.15, 0, 0.06, 0.06, 2.30); // Tailgate hinge

  // Canopy Bows / Ribs
  for (const rx of [-2.7, -1.5, -0.3, 0.8]) {
    steelBuf.addCylinder({ x: rx, y: 1.86, z: -1.14 }, { x: rx, y: 2.45, z: -1.14 }, 0.02, 6);
    steelBuf.addCylinder({ x: rx, y: 2.45, z: -1.14 }, { x: rx, y: 2.58, z: 0 }, 0.02, 6);
    steelBuf.addCylinder({ x: rx, y: 2.58, z: 0 }, { x: rx, y: 2.45, z: 1.14 }, 0.02, 6);
    steelBuf.addCylinder({ x: rx, y: 2.45, z: 1.14 }, { x: rx, y: 1.86, z: 1.14 }, 0.02, 6);
  }

  // 6 All-Terrain Military Wheels (Tandem rear axle)
  const wheelPositions = [
    [-2.0, 1.12], [-2.0, -1.12],
    [-0.6, 1.12], [-0.6, -1.12],
    [ 2.3, 1.12], [ 2.3, -1.12]
  ];
  for (const [wx, wz] of wheelPositions) {
    const sgn = Math.sign(wz);
    // Rubber Tyre
    rubberBuf.addCylinder({ x: wx, y: 0.52, z: wz - sgn * 0.16 }, { x: wx, y: 0.52, z: wz + sgn * 0.16 }, 0.52, 12);
    // Steel Rim
    steelBuf.addCylinder({ x: wx, y: 0.52, z: wz + sgn * 0.08 }, { x: wx, y: 0.52, z: wz + sgn * 0.17 }, 0.30, 10);
    // Hub with lug nuts
    darkBuf.addCylinder({ x: wx, y: 0.52, z: wz + sgn * 0.14 }, { x: wx, y: 0.52, z: wz + sgn * 0.19 }, 0.14, 8);
  }

  // Undercarriage: differentials and driveshafts
  steelBuf.addBox(-1.3, 0.52, 0, 1.8, 0.22, 0.26);
  steelBuf.addCylinder({ x: 0.8, y: 0.52, z: 0 }, { x: -0.6, y: 0.52, z: 0 }, 0.05, 6);
  steelBuf.addCylinder({ x: -0.6, y: 0.52, z: 0 }, { x: -2.0, y: 0.52, z: 0 }, 0.05, 6);

  // -------------------------------------------------------------------------
  // FRONT BUMPER WINCH (comes off when taken: userData.winch)
  // -------------------------------------------------------------------------
  const winchGroup = new THREE.Group();
  winchGroup.name = 'escort-truck-winch';
  winchGroup.position.set(3.60, 0.46, 0);

  const wSteel = createAccumulator();
  const wCable = createAccumulator();
  const wDark = createAccumulator();

  // Mounting bracket plate on bumper
  wSteel.addBox(-0.04, 0, 0, 0.12, 0.28, 0.74);
  // Winch motor housing (cylindrical motor on left)
  wDark.addCylinder({ x: 0.06, y: 0, z: -0.28 }, { x: 0.06, y: 0, z: -0.16 }, 0.11, 8);
  // Gearbox on right
  wSteel.addCylinder({ x: 0.06, y: 0, z: 0.16 }, { x: 0.06, y: 0, z: 0.28 }, 0.12, 8);
  // Spool drum with tightly wound steel wire cable
  wCable.addCylinder({ x: 0.06, y: 0, z: -0.15 }, { x: 0.06, y: 0, z: 0.15 }, 0.09, 10);
  // 4-way roller fairlead
  wSteel.addBox(0.18, 0, 0, 0.06, 0.16, 0.36);
  wSteel.addCylinder({ x: 0.19, y: -0.06, z: 0 }, { x: 0.19, y: 0.06, z: 0 }, 0.015, 6); // Vertical rollers
  wSteel.addCylinder({ x: 0.19, y: 0, z: -0.14 }, { x: 0.19, y: 0, z: 0.14 }, 0.015, 6); // Horizontal roller
  // Cable hook hooked to bumper shackle
  wCable.addCylinder({ x: 0.18, y: 0, z: 0 }, { x: 0.12, y: -0.10, z: 0.14 }, 0.012, 4);
  wSteel.addBox(0.12, -0.11, 0.15, 0.06, 0.08, 0.05);

  // Remote control handset on lead (draped over fender / bumper)
  wDark.addBox(0.08, 0.26, 0.42, 0.14, 0.08, 0.06); // Handset
  wSteel.addBox(0.08, 0.29, 0.42, 0.04, 0.03, 0.03); // Toggle switch
  // Coiled cable lead
  wCable.addCylinder({ x: 0.06, y: 0.12, z: 0.22 }, { x: 0.08, y: 0.22, z: 0.40 }, 0.008, 4);

  const addMesh = (parent, buf, mat) => {
    const geo = buf.toBufferGeometry(THREE);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  addMesh(winchGroup, wSteel, mats.steel);
  addMesh(winchGroup, wCable, mats.cable);
  addMesh(winchGroup, wDark, mats.dark);
  inner.add(winchGroup);

  root.userData.inner = inner;
  root.userData.winch = winchGroup;

  // Add merged body meshes to inner
  addMesh(inner, bodyBuf, mats.olive);
  addMesh(inner, steelBuf, mats.steel);
  addMesh(inner, darkBuf, mats.dark);
  addMesh(inner, rubberBuf, mats.rubber);
  addMesh(inner, glassBuf, mats.glass);
  addMesh(inner, lampBuf, mats.lamp);

  return root;
}

// ---------------------------------------------------------------------------
// 2. buildCrashedTruck(THREE)
// PGB military cargo truck crashed nose-first into the hikers' camp tree ring.
// Square across the trail, crumpled front, winch mounting point on bumper.
// Compatible with storyTruckPose(e) and storyWinchLineUpdate(e).
// ---------------------------------------------------------------------------
export function buildCrashedTruck(THREE) {
  const root = new THREE.Group();
  root.name = 'story-crashed-truck';

  const mats = getStoryTruckMaterials(THREE);
  const bodyBuf = createAccumulator();
  const steelBuf = createAccumulator();
  const darkBuf = createAccumulator();
  const rubberBuf = createAccumulator();
  const glassBuf = createAccumulator();
  const lampBuf = createAccumulator();

  // Inner group has forward crash tilt (nose down into the dirt/trees)
  const inner = new THREE.Group();
  inner.name = 'crashed-truck-inner';
  inner.rotation.z = -0.07;
  inner.rotation.x = 0.03;
  root.add(inner);

  // Chassis rails
  for (const sz of [-0.46, 0.46]) {
    steelBuf.addBox(0.2, 0.48, sz, 6.2, 0.18, 0.10);
    for (const cx of [-2.4, -1.0, 0.5, 2.0, 3.2]) {
      steelBuf.addBox(cx, 0.48, 0, 0.12, 0.14, 0.92);
    }
  }

  // Crumpled Front Bumper (impact damage with tree ring)
  steelBuf.addBox(3.45, 0.45, -0.45, 0.24, 0.26, 1.25, 0, 0, -0.06);
  steelBuf.addBox(3.42, 0.43, 0.45, 0.24, 0.26, 1.25, 0, 0, 0.08); // Twisted from impact

  // Crumpled Bonnet / Hood (buckled from crash)
  bodyBuf.addBox(2.78, 1.18, 0, 1.38, 0.88, 2.16, 0, 0, 0.05); // Buckled upward
  bodyBuf.addBox(3.35, 1.02, 0.15, 0.28, 0.65, 1.95, 0.08, -0.18, 0.04);

  // Radiator Grille (dented inward)
  darkBuf.addBox(3.44, 0.95, 0, 0.08, 0.60, 1.45, 0.04);
  for (let i = -5; i <= 5; i++) {
    steelBuf.addBox(3.45, 0.95, i * 0.13, 0.03, 0.56, 0.03, (i % 2 === 0 ? 0.08 : -0.06));
  }

  // Headlights: Left headlight shattered/blown out, right lens intact
  lampBuf.addCylinder({ x: 3.42, y: 0.98, z: 0.88 }, { x: 3.48, y: 0.98, z: 0.88 }, 0.14, 10);
  darkBuf.addCylinder({ x: 3.40, y: 0.98, z: -0.88 }, { x: 3.46, y: 0.98, z: -0.88 }, 0.15, 8); // Dark blown socket

  // Cab with shattered windshield crack patterns
  bodyBuf.addBox(1.55, 1.62, 0, 1.35, 1.48, 2.24);
  bodyBuf.addBox(1.55, 2.36, 0, 1.38, 0.12, 2.26);
  // Shattered Windshield
  glassBuf.addBox(2.18, 1.76, 0, 0.08, 0.68, 1.94, 0, -0.12);
  // Spiderweb fracture bars across glass (matching convoy-visual.js style)
  steelBuf.addCylinder({ x: 2.19, y: 1.88, z: -0.45 }, { x: 2.21, y: 1.62, z: -0.15 }, 0.012, 4);
  steelBuf.addCylinder({ x: 2.21, y: 1.62, z: -0.15 }, { x: 2.20, y: 1.55, z: 0.22 }, 0.010, 4);
  steelBuf.addCylinder({ x: 2.21, y: 1.62, z: -0.15 }, { x: 2.19, y: 1.95, z: 0.05 }, 0.010, 4);

  // Side Windows (one driver window half-shattered/missing)
  glassBuf.addBox(1.58, 1.76, 1.13, 0.76, 0.56, 0.05);
  darkBuf.addBox(1.58, 1.76, -1.13, 0.74, 0.54, 0.04); // Broken out opening

  // Cargo Bed (Flatbed with stakes)
  bodyBuf.addBox(-0.95, 0.88, 0, 3.85, 0.22, 2.34);
  steelBuf.addBox(0.92, 1.65, 0, 0.08, 1.35, 2.30); // Headache rack
  for (const sz of [-1.14, 1.14]) {
    bodyBuf.addBox(-0.95, 1.42, sz, 3.85, 0.88, 0.08);
    for (const sx of [-2.8, -1.9, -1.0, -0.1, 0.8]) {
      steelBuf.addBox(sx, 1.42, sz + Math.sign(sz) * 0.02, 0.08, 0.94, 0.06);
    }
  }
  bodyBuf.addBox(-2.88, 1.42, 0, 0.08, 0.88, 2.28); // Tailgate

  // Canopy Bows
  for (const rx of [-2.7, -1.5, -0.3, 0.8]) {
    steelBuf.addCylinder({ x: rx, y: 1.86, z: -1.14 }, { x: rx, y: 2.45, z: -1.14 }, 0.02, 6);
    steelBuf.addCylinder({ x: rx, y: 2.45, z: -1.14 }, { x: rx, y: 2.58, z: 0 }, 0.02, 6);
    steelBuf.addCylinder({ x: rx, y: 2.58, z: 0 }, { x: rx, y: 2.45, z: 1.14 }, 0.02, 6);
    steelBuf.addCylinder({ x: rx, y: 2.45, z: 1.14 }, { x: rx, y: 1.86, z: 1.14 }, 0.02, 6);
  }

  // 6 All-Terrain Wheels
  const wheelPositions = [
    [-2.0, 1.12], [-2.0, -1.12],
    [-0.6, 1.12], [-0.6, -1.12],
    [ 2.3, 1.12], [ 2.3, -1.12]
  ];
  for (const [wx, wz] of wheelPositions) {
    const sgn = Math.sign(wz);
    rubberBuf.addCylinder({ x: wx, y: 0.52, z: wz - sgn * 0.16 }, { x: wx, y: 0.52, z: wz + sgn * 0.16 }, 0.52, 12);
    steelBuf.addCylinder({ x: wx, y: 0.52, z: wz + sgn * 0.08 }, { x: wx, y: 0.52, z: wz + sgn * 0.17 }, 0.30, 10);
    darkBuf.addCylinder({ x: wx, y: 0.52, z: wz + sgn * 0.14 }, { x: wx, y: 0.52, z: wz + sgn * 0.19 }, 0.14, 8);
  }

  // Required hooks for CL-303 / story-gates:
  // userData.winchMount at front bumper (3.55, 0.45, 0)
  const winchMount = new THREE.Object3D();
  winchMount.name = 'winch-mount';
  winchMount.position.set(3.55, 0.45, 0);
  inner.add(winchMount);

  // userData.lineAt for cable attachment in storyWinchLineUpdate (3.62, 0.62, 0)
  const lineAt = new THREE.Object3D();
  lineAt.name = 'line-at';
  lineAt.position.set(3.62, 0.62, 0);
  inner.add(lineAt);

  root.userData.inner = inner;
  root.userData.winchMount = winchMount;
  root.userData.lineAt = lineAt;

  const addMesh = (parent, buf, mat) => {
    const geo = buf.toBufferGeometry(THREE);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Add merged body meshes to inner
  addMesh(inner, bodyBuf, mats.olive);
  addMesh(inner, steelBuf, mats.steel);
  addMesh(inner, darkBuf, mats.dark);
  addMesh(inner, rubberBuf, mats.rubber);
  addMesh(inner, glassBuf, mats.glass);
  addMesh(inner, lampBuf, mats.lamp);

  return root;
}
