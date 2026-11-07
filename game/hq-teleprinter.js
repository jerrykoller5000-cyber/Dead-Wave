// game/hq-teleprinter.js - AG-247 (D-116).
// The HQ teleprinter and the duty board's stamp.
//
// Features:
// - A military teleprinter (AN/UGC style teletypewriter) on an olive field desk.
// - Sits beside the HQ duty board (inside Center Bay).
// - Dynamic paper strip feed-out animation with chattering carriage on print().
// - Rubber stamp with turned wood handle and ink pad box on the desk/board with animated stamping.
// - Merged geometries for high frame rates (1.2 performance rule).
//
// Exports:
//   buildTeleprinter(THREE) -> { group, print(text), sheetTaken(), stamp(), update(dt), isPrinting, hasSheet, isStamping }

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
        let x1 = x, y1 = y * cosR - z * sinR, z1 = y * sinR + z * cosR;
        let x2 = x1 * cosP - y1 * sinP, y2 = x1 * sinP + y1 * cosP, z2 = z1;
        let x3 = x2 * cosY + z2 * sinY, y3 = y2, z3 = -x2 * sinY + z2 * cosY;
        return { x: cx + x3, y: cy + y3, z: cz + z3 };
      };

      const p000 = rot(-hx, -hy, -hz), p100 = rot(hx, -hy, -hz);
      const p110 = rot(hx, hy, -hz),  p010 = rot(-hx, hy, -hz);
      const p001 = rot(-hx, -hy, hz),  p101 = rot(hx, -hy, hz);
      const p111 = rot(hx, hy, hz),   p011 = rot(-hx, hy, hz);

      this.addQuad(p101, p001, p011, p111, { x: 0, y: 0, z: 1 });
      this.addQuad(p000, p100, p110, p010, { x: 0, y: 0, z: -1 });
      this.addQuad(p010, p110, p111, p011, { x: 0, y: 1, z: 0 });
      this.addQuad(p001, p101, p100, p000, { x: 0, y: -1, z: 0 });
      this.addQuad(p100, p101, p111, p110, { x: 1, y: 0, z: 0 });
      this.addQuad(p001, p000, p010, p011, { x: -1, y: 0, z: 0 });
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

export function getTeleprinterMaterials(THREE) {
  return {
    olive: new THREE.MeshStandardMaterial({ color: 0x3d4636, roughness: 0.74, metalness: 0.22 }),
    darkOlive: new THREE.MeshStandardMaterial({ color: 0x2b3326, roughness: 0.82, metalness: 0.16 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x565e64, roughness: 0.44, metalness: 0.72 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x23272c, roughness: 0.70, metalness: 0.55 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb5954a, roughness: 0.42, metalness: 0.75 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x583e2a, roughness: 0.70, metalness: 0.06 }),
    darkWood: new THREE.MeshStandardMaterial({ color: 0x3e2b1d, roughness: 0.75, metalness: 0.05 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1a1c1d, roughness: 0.90, metalness: 0.04 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xeee7d3, roughness: 0.88, metalness: 0.02 }),
    inkRed: new THREE.MeshStandardMaterial({ color: 0x9e241c, roughness: 0.82, metalness: 0.05 }),
    lampAmber: new THREE.MeshStandardMaterial({ color: 0xffaa33, roughness: 0.35, metalness: 0.15, emissive: 0xff8811, emissiveIntensity: 0.85 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x34444a, roughness: 0.18, metalness: 0.35, transparent: true, opacity: 0.65 }),
  };
}

export function buildTeleprinter(THREE) {
  const root = new THREE.Group();
  root.name = 'hq-teleprinter';

  const mats = getTeleprinterMaterials(THREE);

  const oliveBuf = createAccumulator();
  const darkOliveBuf = createAccumulator();
  const steelBuf = createAccumulator();
  const ironBuf = createAccumulator();
  const brassBuf = createAccumulator();
  const woodBuf = createAccumulator();
  const rubberBuf = createAccumulator();

  // -------------------------------------------------------------------------
  // 1. MILITARY FIELD DESK (Sturdy olive/steel tubular frame with wood desktop)
  // Desk dimensions: W = 0.86, D = 0.54, H = 0.76 (desktop at y = 0.76)
  // -------------------------------------------------------------------------
  const deskTopY = 0.74;

  // Solid wood desktop with beveled edge
  woodBuf.addBox(0, deskTopY - 0.015, 0, 0.86, 0.03, 0.54);
  // Metal perimeter frame band
  ironBuf.addBox(0, deskTopY - 0.015, 0.265, 0.864, 0.032, 0.01);
  ironBuf.addBox(0, deskTopY - 0.015, -0.265, 0.864, 0.032, 0.01);
  ironBuf.addBox(0.425, deskTopY - 0.015, 0, 0.01, 0.032, 0.54);
  ironBuf.addBox(-0.425, deskTopY - 0.015, 0, 0.01, 0.032, 0.54);

  // 4 Steel Tube Legs with Floor Foot Plates
  const legCoords = [
    [-0.39, -0.23], [0.39, -0.23],
    [-0.39,  0.23], [0.39,  0.23]
  ];
  for (const [lx, lz] of legCoords) {
    ironBuf.addBox(lx, (deskTopY - 0.03) * 0.5, lz, 0.036, deskTopY - 0.03, 0.036);
    // Foot pads on floor
    steelBuf.addBox(lx, 0.006, lz, 0.065, 0.012, 0.065);
  }

  // Cross-bracing Rails (left, right, and back sides)
  ironBuf.addBox(0, 0.16, -0.23, 0.78, 0.024, 0.024); // Back lower stretcher
  ironBuf.addBox(-0.39, 0.16, 0, 0.024, 0.024, 0.46); // Left stretcher
  ironBuf.addBox( 0.39, 0.16, 0, 0.024, 0.024, 0.46); // Right stretcher

  // Right-side Drawer Unit under desk
  darkOliveBuf.addBox(0.24, deskTopY - 0.16, 0.02, 0.32, 0.24, 0.46);
  // Drawer front face & seam
  oliveBuf.addBox(0.24, deskTopY - 0.10, 0.252, 0.30, 0.10, 0.012);
  oliveBuf.addBox(0.24, deskTopY - 0.21, 0.252, 0.30, 0.10, 0.012);
  // Brass drawer handles
  brassBuf.addBox(0.24, deskTopY - 0.10, 0.264, 0.07, 0.014, 0.012);
  brassBuf.addBox(0.24, deskTopY - 0.21, 0.264, 0.07, 0.014, 0.012);

  // -------------------------------------------------------------------------
  // 2. TELEPRINTER UNIT (Model 28 Teletypewriter / Military TT-98/UG)
  // Sits on desk at left: center at x = -0.08, z = 0.02, y = deskTopY
  // -------------------------------------------------------------------------
  const tpX = -0.08, tpY = deskTopY, tpZ = 0.02;

  // Main housing cabinet (wrinkle olive-drab)
  darkOliveBuf.addBox(tpX, tpY + 0.11, tpZ - 0.04, 0.42, 0.22, 0.34);
  // Heavy cast base plate & vibration dampening rubber feet
  ironBuf.addBox(tpX, tpY + 0.008, tpZ - 0.04, 0.43, 0.016, 0.35);
  for (const fx of [-0.18, 0.18]) for (const fz of [-0.18, 0.12]) {
    rubberBuf.addCylinder({ x: tpX + fx, y: tpY, z: tpZ + fz }, { x: tpX + fx, y: tpY + 0.012, z: tpZ + fz }, 0.022, 8);
  }

  // Sloped Keyboard Console at front (angles up 16°)
  darkOliveBuf.addBox(tpX, tpY + 0.045, tpZ + 0.165, 0.38, 0.07, 0.14, 0, 0.28, 0);
  ironBuf.addBox(tpX, tpY + 0.052, tpZ + 0.165, 0.35, 0.015, 0.12, 0, 0.28, 0); // Keyboard tray well

  // Individual Typewriter Keycaps in 4 staggered rows
  for (let row = 0; row < 3; row++) {
    const rZ = tpZ + 0.125 + row * 0.028;
    const rY = tpY + 0.042 + (2 - row) * 0.008;
    const numKeys = row === 0 ? 10 : (row === 1 ? 9 : 8);
    for (let k = 0; k < numKeys; k++) {
      const kX = tpX - 0.14 + (k + (row % 2) * 0.4) * 0.030;
      rubberBuf.addBox(kX, rY + 0.015, rZ, 0.018, 0.012, 0.018, 0, 0.28, 0);
      steelBuf.addBox(kX, rY + 0.022, rZ, 0.012, 0.004, 0.012, 0, 0.28, 0); // Keycap top
    }
  }
  // Spacebar on bottom row
  rubberBuf.addBox(tpX, tpY + 0.038, tpZ + 0.215, 0.18, 0.012, 0.018, 0, 0.28, 0);

  // Platen Roller Mechanism (Central horizontal cylinder)
  const platenY = tpY + 0.175, platenZ = tpZ - 0.02;
  // Platen rubber roller
  rubberBuf.addCylinder({ x: tpX - 0.15, y: platenY, z: platenZ }, { x: tpX + 0.15, y: platenY, z: platenZ }, 0.022, 12);
  // Steel carriage side brackets
  steelBuf.addBox(tpX - 0.16, platenY, platenZ, 0.02, 0.06, 0.06);
  steelBuf.addBox(tpX + 0.16, platenY, platenZ, 0.02, 0.06, 0.06);
  // Knurled platen advance knob on right side
  brassBuf.addCylinder({ x: tpX + 0.17, y: platenY, z: platenZ }, { x: tpX + 0.19, y: platenY, z: platenZ }, 0.024, 10);
  // Chrome carriage return lever on left
  steelBuf.addBox(tpX - 0.18, platenY + 0.02, platenZ + 0.03, 0.04, 0.01, 0.07, 0, -0.3, 0);

  // Twin Ribbon Spools on top
  for (const rx of [-0.09, 0.09]) {
    steelBuf.addCylinder({ x: tpX + rx, y: tpY + 0.205, z: tpZ + 0.04 }, { x: tpX + rx, y: tpY + 0.225, z: tpZ + 0.04 }, 0.032, 10);
    brassBuf.addCylinder({ x: tpX + rx, y: tpY + 0.225, z: tpZ + 0.04 }, { x: tpX + rx, y: tpY + 0.235, z: tpZ + 0.04 }, 0.012, 8); // Spool nut
  }
  // Typebar guide basket in center
  steelBuf.addBox(tpX, tpY + 0.185, tpZ + 0.02, 0.08, 0.03, 0.04);

  // Rear Paper Roll Hopper & Spindle
  const rollY = tpY + 0.17, rollZ = tpZ - 0.15;
  darkOliveBuf.addBox(tpX, rollY - 0.02, rollZ, 0.36, 0.08, 0.10); // Cradle
  // White/buff paper roll inside cradle
  oliveBuf.addCylinder({ x: tpX - 0.14, y: rollY + 0.01, z: rollZ }, { x: tpX + 0.14, y: rollY + 0.01, z: rollZ }, 0.042, 14);
  steelBuf.addCylinder({ x: tpX - 0.16, y: rollY + 0.01, z: rollZ }, { x: tpX + 0.16, y: rollY + 0.01, z: rollZ }, 0.008, 6); // Spindle

  // Controls, switches, indicator jewel & nameplate
  ironBuf.addBox(tpX - 0.15, tpY + 0.09, tpZ + 0.10, 0.04, 0.04, 0.01); // Switch plate
  brassBuf.addCylinder({ x: tpX - 0.15, y: tpY + 0.09, z: tpZ + 0.10 }, { x: tpX - 0.15, y: tpY + 0.105, z: tpZ + 0.115 }, 0.004, 4); // Toggle lever
  brassBuf.addBox(tpX, tpY + 0.09, tpZ + 0.10, 0.11, 0.028, 0.006); // Nameplate

  // Coiled power lead running off back of teleprinter
  ironBuf.addCylinder({ x: tpX + 0.12, y: tpY + 0.03, z: tpZ - 0.20 }, { x: tpX + 0.12, y: tpY + 0.03, z: tpZ - 0.26 }, 0.009, 6);

  // Clear viewing visor over carriage (acrylic shield)
  const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.006, 0.12), mats.glass);
  visorMesh.name = 'teleprinter-visor';
  visorMesh.position.set(tpX, tpY + 0.22, platenZ + 0.02);
  visorMesh.rotation.x = -0.22;
  root.add(visorMesh);

  // Amber power/signal indicator lamp
  const amberLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.014, 8), mats.lampAmber);
  amberLamp.name = 'teleprinter-lamp';
  amberLamp.position.set(tpX + 0.15, tpY + 0.09, tpZ + 0.105);
  amberLamp.rotation.x = Math.PI / 2;
  root.add(amberLamp);

  // -------------------------------------------------------------------------
  // 3. PAPER STRIP (Emerges from platen slot, animated during print())
  // -------------------------------------------------------------------------
  const paperGroup = new THREE.Group();
  paperGroup.name = 'teleprinter-paper-group';
  paperGroup.position.set(tpX, platenY + 0.025, platenZ);

  // Procedural canvas for printed teletype text
  let paperTexture = null;
  try {
    if (typeof document !== 'undefined' && document.createElement) {
      const cv = document.createElement('canvas');
      cv.width = 256; cv.height = 512;
      const ctx = cv.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#eee6d2';
        ctx.fillRect(0, 0, 256, 512);
        // Feed sprocket holes along left & right margins
        ctx.fillStyle = '#222';
        for (let y = 12; y < 500; y += 24) {
          ctx.beginPath(); ctx.arc(12, y, 4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(244, y, 4, 0, Math.PI * 2); ctx.fill();
        }
        // Teletype military header & order text lines
        ctx.fillStyle = '#222824';
        ctx.font = 'bold 13px monospace';
        ctx.fillText('PGB DET. 4 // HQ GRAVE SHIFT', 26, 36);
        ctx.fillText('AUTH: CAPT. HALE [SEALED]', 26, 56);
        ctx.fillStyle = '#8b2016';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('>>> PRIORITY ORDER <<<', 26, 82);
        ctx.fillStyle = '#1e2220';
        ctx.font = '12px monospace';
        ctx.fillText('DISPATCH: RELAY MAST YARD', 26, 110);
        ctx.fillText('GATE SECURED W/ VINES', 26, 128);
        ctx.fillText('RECOVER MACHETE AT DEPOT', 26, 146);
        ctx.fillText('CUT PERIMETER CORRIDOR', 26, 164);
        ctx.fillText('STAMP ORDER UPON COMPLETE', 26, 192);
        ctx.fillStyle = '#444';
        for (let y = 220; y < 480; y += 18) {
          ctx.fillRect(26, y, 160 + (y * 13) % 40, 2);
        }
        paperTexture = new THREE.CanvasTexture(cv);
        if (THREE.SRGBColorSpace) paperTexture.colorSpace = THREE.SRGBColorSpace;
      }
    }
  } catch (_) {}

  const paperMat = paperTexture
    ? new THREE.MeshStandardMaterial({ map: paperTexture, roughness: 0.90, metalness: 0.02 })
    : mats.paper;

  // The printed sheet mesh
  const paperGeo = new THREE.PlaneGeometry(0.22, 0.28);
  const paperMesh = new THREE.Mesh(paperGeo, paperMat);
  paperMesh.name = 'teleprinter-sheet';
  paperMesh.rotation.x = -Math.PI / 2 + 0.35; // Rests on front tray
  paperMesh.position.set(0, 0.04, 0.07);
  paperMesh.castShadow = true;
  paperMesh.receiveShadow = true;
  paperMesh.visible = false; // Initially idle
  paperGroup.add(paperMesh);
  root.add(paperGroup);

  // -------------------------------------------------------------------------
  // 4. RUBBER STAMP & INK PAD BOX (On desk beside teleprinter, near duty board)
  // Positioned at x = 0.24, z = -0.06 on the desk
  // -------------------------------------------------------------------------
  const stampStationX = 0.22, stampStationY = deskTopY, stampStationZ = -0.05;

  // Metal Ink Pad Box (rectangular tin box with open lid)
  ironBuf.addBox(stampStationX - 0.08, stampStationY + 0.010, stampStationZ, 0.11, 0.018, 0.075);
  // Saturated purple-black felt pad inside tin
  rubberBuf.addBox(stampStationX - 0.08, stampStationY + 0.016, stampStationZ, 0.096, 0.008, 0.062);
  // Open tin lid angled back 70°
  ironBuf.addBox(stampStationX - 0.08, stampStationY + 0.042, stampStationZ - 0.048, 0.11, 0.072, 0.006, 0.45, 0, 0);

  // Animated Rubber Stamp Group (Handle, Ferrule, Mount, and Rubber Die)
  const stampGroup = new THREE.Group();
  stampGroup.name = 'duty-board-rubber-stamp';
  const stampRestX = stampStationX + 0.06, stampRestY = stampStationY + 0.01, stampRestZ = stampStationZ;
  stampGroup.position.set(stampRestX, stampRestY, stampRestZ);

  const stWood = createAccumulator();
  const stBrass = createAccumulator();
  const stRubber = createAccumulator();

  // Turned wooden knob handle
  stWood.addCylinder({ x: 0, y: 0.035, z: 0 }, { x: 0, y: 0.085, z: 0 }, 0.012, 10);
  stWood.addCylinder({ x: 0, y: 0.080, z: 0 }, { x: 0, y: 0.105, z: 0 }, 0.022, 12); // Top spherical/rounded knob
  // Brass ferrule & mounting plate
  stBrass.addCylinder({ x: 0, y: 0.022, z: 0 }, { x: 0, y: 0.035, z: 0 }, 0.015, 10);
  stBrass.addBox(0, 0.018, 0, 0.070, 0.008, 0.045);
  // Red rubber die with raised stamp lettering on bottom
  stRubber.addBox(0, 0.008, 0, 0.066, 0.012, 0.042);
  stRubber.addBox(0, 0.001, 0, 0.058, 0.003, 0.034); // Raised text face

  const addMesh = (parent, buf, mat) => {
    const geo = buf.toBufferGeometry(THREE);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  addMesh(stampGroup, stWood, mats.wood);
  addMesh(stampGroup, stBrass, mats.brass);
  addMesh(stampGroup, stRubber, mats.inkRed);
  root.add(stampGroup);

  // Add merged background meshes to root
  addMesh(root, oliveBuf, mats.olive);
  addMesh(root, darkOliveBuf, mats.darkOlive);
  addMesh(root, steelBuf, mats.steel);
  addMesh(root, ironBuf, mats.iron);
  addMesh(root, brassBuf, mats.brass);
  addMesh(root, woodBuf, mats.wood);
  addMesh(root, rubberBuf, mats.rubber);

  // -------------------------------------------------------------------------
  // 5. ANIMATION & CONTROLLER LOGIC
  // -------------------------------------------------------------------------
  let isPrinting = false;
  let printTime = 0;
  const PRINT_DURATION = 1.6; // 1.6s paper chatter feed
  let hasSheet = false;

  let isStamping = false;
  let stampTime = 0;
  const STAMP_DURATION = 0.55; // 0.55s lift, press down, return

  const controller = {
    group: root,
    isPrinting: false,
    hasSheet: false,
    isStamping: false,

    print(text = null) {
      isPrinting = true;
      this.isPrinting = true;
      printTime = 0;
      hasSheet = true;
      this.hasSheet = true;
      paperMesh.visible = true;
      paperMesh.scale.set(1, 0.08, 1);
      paperMesh.position.set(0, 0.01, 0.01);
      amberLamp.material.emissiveIntensity = 2.2;
    },

    sheetTaken() {
      hasSheet = false;
      this.hasSheet = false;
      isPrinting = false;
      this.isPrinting = false;
      paperMesh.visible = false;
      amberLamp.material.emissiveIntensity = 0.85;
    },

    stamp() {
      isStamping = true;
      this.isStamping = true;
      stampTime = 0;
    },

    update(dt) {
      if (dt <= 0) return;

      // 1. Paper print animation
      if (isPrinting) {
        printTime += dt;
        const u = Math.min(1, printTime / PRINT_DURATION);
        // Ratchet chatter step
        const chatter = Math.sin(printTime * 70) * 0.0015;
        paperGroup.position.x = tpX + chatter;

        // Paper advances along feed ramp
        paperMesh.scale.y = 0.08 + 0.92 * u;
        paperMesh.position.z = 0.01 + 0.06 * u;
        paperMesh.position.y = 0.01 + 0.03 * u;

        // Lamp pulses while chattering
        amberLamp.material.emissiveIntensity = 1.4 + Math.sin(printTime * 35) * 0.9;

        if (u >= 1) {
          isPrinting = false;
          this.isPrinting = false;
          paperGroup.position.x = tpX;
          amberLamp.material.emissiveIntensity = 1.1;
        }
      }

      // 2. Rubber stamp animation
      if (isStamping) {
        stampTime += dt;
        const progress = Math.min(1, stampTime / STAMP_DURATION);

        // Phase 1: Lift up and move slightly over (0.0 -> 0.35)
        // Phase 2: Slam down onto pad/surface (0.35 -> 0.55)
        // Phase 3: Hold impact briefly (0.55 -> 0.70)
        // Phase 4: Return smoothly to rest (0.70 -> 1.0)
        let liftY = 0, offsetX = 0;
        if (progress < 0.35) {
          const t = progress / 0.35;
          liftY = Math.sin(t * Math.PI * 0.5) * 0.075;
          offsetX = -Math.sin(t * Math.PI * 0.5) * 0.05;
        } else if (progress < 0.55) {
          const t = (progress - 0.35) / 0.20;
          liftY = 0.075 * (1 - t * t);
          offsetX = -0.05 * (1 - t * 0.3);
        } else if (progress < 0.70) {
          liftY = 0;
          offsetX = -0.035;
        } else {
          const t = (progress - 0.70) / 0.30;
          const k = t * t * (3 - 2 * t);
          liftY = 0;
          offsetX = -0.035 * (1 - k);
        }

        stampGroup.position.set(stampRestX + offsetX, stampRestY + liftY, stampRestZ);

        if (progress >= 1) {
          isStamping = false;
          this.isStamping = false;
          stampGroup.position.set(stampRestX, stampRestY, stampRestZ);
        }
      }
    }
  };

  root.userData.controller = controller;
  return controller;
}
