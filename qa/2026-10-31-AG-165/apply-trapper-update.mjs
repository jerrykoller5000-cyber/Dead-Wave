import fs from 'fs';

const filePath = 'game/trapper-path.js';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Update leaf bed nx and x0, x1
code = code.replace(
  '  const nx = 10, nz = 28;\n  const x0 = -1.00, x1 = 1.00;',
  '  const nx = 14, nz = 28;\n  const x0 = -1.65, x1 = 1.65;'
);

// 2. Update hidden traps
const oldTraps = '  const hiddenTrapSpots = [];\n  for (let r = 0; r < rule.ROWS; r++) {\n    const lz = rowZ(r, rule);\n    hiddenTrapSpots.push([-0.84, lz + 0.12, r * 1.1 + 0.3]);\n    hiddenTrapSpots.push([0.0, lz - 0.34, r * 0.85 - 0.4]);\n    hiddenTrapSpots.push([0.84, lz - 0.10, r * 1.3 + 0.9]);\n  }';
const newTraps = `  const hiddenTrapSpots = [];
  for (let r = 0; r < rule.ROWS; r++) {
    const lz = rowZ(r, rule);
    hiddenTrapSpots.push([-1.55, lz + 0.12, r * 1.1 + 0.3]);
    hiddenTrapSpots.push([-0.90, lz - 0.28, r * 0.9 + 0.1]);
    hiddenTrapSpots.push([0.0, lz + 0.15, r * 0.85 - 0.4]);
    hiddenTrapSpots.push([0.90, lz - 0.32, r * 1.05 + 0.5]);
    hiddenTrapSpots.push([1.55, lz - 0.10, r * 1.3 + 0.9]);
  }`;
code = code.replace(oldTraps, newTraps);

// 3. Update stepping stones & posts & back-half sealing
const oldSlabsStart = '  // 3. Eight rows of two large, natural split-fieldstone stepping slabs';
const oldSlabsEnd = '  // 6. AG-135 / AG-144 (story-chain.md §4 Day 8, docs/art-direction.md §2 Iron rule):';
const idxStart = code.indexOf(oldSlabsStart);
const idxEnd = code.indexOf(oldSlabsEnd);

if (idxStart < 0 || idxEnd < 0) {
  console.error('Could not locate old slabs and posts section');
  process.exit(1);
}

const oldSlabsAndPosts = code.substring(idxStart, idxEnd);

const newSlabsAndPosts = `  // 3. Eight rows of four large, natural split-fieldstone stepping slabs (+ gate & cellar apron flagstones):
  const baseSlabGeo = new THREE.CylinderGeometry(0.34, 0.38, 0.072, 9);
  const topSlabGeo = new THREE.CylinderGeometry(0.29, 0.33, 0.042, 8);
  const chipGeo = new THREE.BoxGeometry(0.18, 0.036, 0.15);
  const cols = rule.COLS || 4;
  for (let r = 0; r < rule.ROWS; r++) {
    const lz = rowZ(r, rule);
    for (let col = 0; col < cols; col++) {
      const lx = stoneX(col, rule);
      const gy = groundAtLocal(lx, lz);
      const h = hash01(r * 17 + col * 3, r * 7 + col * 19);
      const colA = stonePalette[(r + col) % stonePalette.length];
      const colB = stonePalette[(r * 2 + col + 1) % stonePalette.length];
      const sx = 1.0 + (h - 0.5) * 0.14;
      const sz = 0.94 + (hash01(r * 23, col * 11) - 0.5) * 0.14;
      const yawA = r * 1.15 + col * 2.05;
      parts.push(trapperPart(baseSlabGeo.clone(), colA, lx, gy + 0.036, lz, 0, yawA, 0, sx, 1, sz));
      parts.push(trapperPart(topSlabGeo.clone(), colB, lx + (h - 0.5) * 0.025, gy + 0.068, lz, 0, yawA + 0.45, 0, sx * 0.95, 1, sz * 0.95));
      const sgn = col >= 2 ? 1 : -1;
      parts.push(trapperPart(chipGeo.clone(), stonePalette[(r + 3) % stonePalette.length],
        lx - sgn * 0.11, gy + 0.055, lz + ((r % 2) ? 0.08 : -0.08), 0.04, yawA + 0.9, -0.03));

      // Moss & autumn leaves tucked around the stone's base rim:
      for (let k = 0; k < 4; k++) {
        const a = yawA + k * 1.57 + 0.3;
        const rimR = 0.33;
        const isMoss = (k + r) % 2 === 0;
        parts.push(trapperPart(
          new THREE.DodecahedronGeometry(0.06, 0),
          isMoss ? mossPalette[(r + k) % mossPalette.length] : leafPalette[(r + k + col) % leafPalette.length],
          lx + Math.cos(a) * rimR, gy + 0.03, lz + Math.sin(a) * rimR,
          0.1, a, 0.08, 1.3, 0.35, 1.0
        ));
      }
      const w = toWorld(lx, lz);
      stones.push({ row: r, side: col, lx, lz, x: w.x, y: cy0 + gy + 0.082, z: w.z });
    }
  }
  // Threshold flagstones at the cellar apron (z = 1.42) and yard gate entrance (z = 8.68):
  for (const [az, aw, ad] of [
    [1.42, 0.46, 0.28],
    [8.68, 0.48, 0.28],
  ]) {
    for (const sx of [-0.45, 0.45]) {
      const gy = groundAtLocal(sx, az);
      parts.push(trapperPart(new THREE.BoxGeometry(aw, 0.054, ad), stonePalette[0], sx, gy + 0.026, az, 0, sx * 0.22, 0));
      parts.push(trapperPart(new THREE.BoxGeometry(aw * 0.86, 0.024, ad * 0.84), stonePalette[2], sx, gy + 0.056, az, 0, -sx * 0.15, 0));
    }
  }

  // 4. Trapper's yard fence: 32 sturdy row posts (4 per row) with chamfered caps, iron bands, and backing boards for horseshoes;
  //    plus heavy entrance gate posts with overhead crossbeam, hanging lantern, split-log rails, and sealed back half.
  const postBox = new THREE.BoxGeometry(0.16, 1.28, 0.16);
  const postBase = new THREE.BoxGeometry(0.19, 0.24, 0.19);
  const postCap = new THREE.BoxGeometry(0.19, 0.045, 0.19);
  const postBand = new THREE.BoxGeometry(0.172, 0.028, 0.172);
  const postPlaque = new THREE.BoxGeometry(0.14, 0.25, 0.022);
  for (let r = 0; r < rule.ROWS; r++) {
    const lz = rowZ(r, rule);
    for (let col = 0; col < cols; col++) {
      const lx = postX(col, rule);
      const gy = groundAtLocal(lx, lz);
      const wCol = woodPalette[(r + col) % woodPalette.length];
      parts.push(trapperPart(postBase.clone(), barkPalette[(r + col) % barkPalette.length], lx, gy + 0.12, lz));
      parts.push(trapperPart(postBox.clone(), wCol, lx, gy + 0.64, lz));
      parts.push(trapperPart(postCap.clone(), barkPalette[0], lx, gy + 1.29, lz));
      parts.push(trapperPart(postBand.clone(), ironDark, lx, gy + 1.12, lz));
      const sgn = col >= 2 ? 1 : -1;
      const rotY = Math.abs(lx) > 1.2 ? -sgn * 0.20 : 0;
      // Pale weathered backing board facing approach (+z):
      parts.push(trapperPart(postPlaque.clone(), 0xc8b68e, lx - sgn * 0.005, gy + 0.88, lz + 0.068, 0, rotY, 0));
      const w = toWorld(lx, lz);
      posts.push({ row: r, side: col, lx, lz, x: w.x, y: cy0 + gy, z: w.z });
    }
  }

  // Heavy gate posts at the yard entrance (lz = rule.BED_Z_MAX + 0.08 = 9.03) and cellar bulkhead posts (lz = 0.68):
  const gateZ = rule.BED_Z_MAX + 0.08;
  const gatePostGeo = new THREE.BoxGeometry(0.22, 2.25, 0.22);
  const gateCapGeo = new THREE.BoxGeometry(0.26, 0.06, 0.26);
  for (const sgn of [-1, 1]) {
    const lx = sgn * rule.POST_X;
    // Cellar end anchor post (lz = 0.68):
    const gy0 = groundAtLocal(lx, 0.68);
    parts.push(trapperPart(postBox.clone(), woodPalette[sgn > 0 ? 1 : 0], lx, gy0 + 0.62, 0.68));
    parts.push(trapperPart(postCap.clone(), barkPalette[0], lx, gy0 + 1.27, 0.68));

    // Tall entrance gate post (lz = gateZ):
    const gyG = groundAtLocal(lx, gateZ);
    parts.push(trapperPart(gatePostGeo.clone(), woodPalette[sgn > 0 ? 1 : 0], lx, gyG + 1.12, gateZ));
    parts.push(trapperPart(gateCapGeo.clone(), barkPalette[0], lx, gyG + 2.26, gateZ));
    parts.push(trapperPart(new THREE.BoxGeometry(0.235, 0.036, 0.235), ironDark, lx, gyG + 1.95, gateZ));

    // Three split-log fence rails + diagonal bracing connecting outer posts from z = 0.68 to gateZ - 0.18:
    const zList = [0.68];
    for (let r = rule.ROWS - 1; r >= 0; r--) zList.push(rowZ(r, rule));
    zList.push(gateZ - 0.18);
    for (let i = 0; i < zList.length - 1; i++) {
      const za = zList[i], zb = zList[i + 1];
      const ya = groundAtLocal(lx, za), yb = groundAtLocal(lx, zb);
      for (const h of [0.32, 0.64, 0.98]) {
        trapperBar(parts, [lx, ya + h, za], [lx, yb + h, zb], 0.042, woodPalette[(i + (sgn > 0 ? 1 : 0)) % woodPalette.length], 6);
      }
      if (i % 2 === (sgn > 0 ? 1 : 0)) {
        trapperBar(parts, [lx, ya + 0.32, za], [lx, yb + 0.96, zb], 0.028, barkPalette[(i + (sgn > 0 ? 1 : 0)) % barkPalette.length], 5);
      }
    }

    // Flared wing fence at the yard gate (z = gateZ -> gateZ + 0.36, x = ±1.80 -> ±2.38):
    const wxOut = sgn * (rule.POST_X + 0.58), wzOut = gateZ + 0.36;
    const gyOut = groundAtLocal(wxOut, wzOut);
    parts.push(trapperPart(postBox.clone(), woodPalette[2], wxOut, gyOut + 0.60, wzOut));
    parts.push(trapperPart(postCap.clone(), barkPalette[1], wxOut, gyOut + 1.25, wzOut));
    for (const h of [0.34, 0.68, 1.00]) {
      trapperBar(parts, [lx, gyG + h, gateZ], [wxOut, gyOut + h, wzOut], 0.04, woodPalette[1], 6);
    }
  }

  // Overhead timber lintel beam across the entrance gate + weathered wooden warning board & hanging iron lantern:
  {
    const yL = groundAtLocal(-rule.POST_X, gateZ), yR = groundAtLocal(rule.POST_X, gateZ);
    const beamY = Math.max(yL, yR) + 2.12;
    trapperBar(parts, [-rule.POST_X - 0.18, beamY, gateZ], [rule.POST_X + 0.18, beamY, gateZ], 0.075, barkPalette[0], 7);
    // Diagonal knee braces on the gate arch:
    for (const sgn of [-1, 1]) {
      const gyS = sgn < 0 ? yL : yR;
      trapperBar(parts, [sgn * rule.POST_X, gyS + 1.55, gateZ], [sgn * (rule.POST_X - 0.48), beamY - 0.04, gateZ], 0.042, woodPalette[0], 5);
    }
    // Weathered plank sign board on the gate lintel:
    parts.push(trapperPart(new THREE.BoxGeometry(1.48, 0.24, 0.04), 0x6b533b, 0, beamY - 0.18, gateZ + 0.05, 0, 0, -0.02));
    parts.push(trapperPart(new THREE.BoxGeometry(1.38, 0.17, 0.046), 0xb8a37a, 0, beamY - 0.18, gateZ + 0.052, 0, 0, -0.02));
    // Hanging iron lantern & spare leghold trap on the right gate post:
    const lxLan = rule.POST_X - 0.24, lyLan = yR + 1.72;
    trapperBar(parts, [rule.POST_X, yR + 1.82, gateZ + 0.08], [lxLan, lyLan + 0.12, gateZ + 0.22], 0.016, ironDark, 5);
    parts.push(trapperPart(new THREE.CylinderGeometry(0.06, 0.075, 0.16, 7), ironDark, lxLan, lyLan, gateZ + 0.22));
    parts.push(trapperPart(new THREE.CylinderGeometry(0.042, 0.042, 0.09, 7), 0xd9a84e, lxLan, lyLan, gateZ + 0.22));
  }

  // 5. Trapper's drying frame, stacked firewood, and thorny deadfall hedge flanking the outside of the fence
  //    and behind the cellar mound:
  const brambleSpots = [];
  for (const sgn of [-1, 1]) {
    for (let lz = 0.96; lz <= gateZ - 0.75; lz += 0.64) {
      brambleSpots.push([sgn * (rule.POST_X + 0.42), lz]);
    }
    // Stacked split logs along the outer base of the fence rails:
    for (let k = 0; k < 5; k++) {
      const lzA = 1.2 + k * 1.45, lzB = lzA + 1.15;
      const lxLog = sgn * (rule.POST_X + 0.18);
      const ya = groundAtLocal(lxLog, lzA), yb = groundAtLocal(lxLog, lzB);
      trapperBar(parts, [lxLog, ya + 0.09, lzA], [lxLog, yb + 0.09, lzB], 0.085, barkPalette[k % barkPalette.length], 6);
      trapperBar(parts, [lxLog + sgn * 0.06, ya + 0.21, lzA + 0.08], [lxLog + sgn * 0.06, yb + 0.21, lzB - 0.08], 0.072, woodPalette[k % woodPalette.length], 6);
    }
  }
  for (let i = 0; i < brambleSpots.length; i++) {
    const [bx, bz] = brambleSpots[i];
    const gy = groundAtLocal(bx, bz);
    parts.push(trapperPart(new THREE.DodecahedronGeometry(0.38, 0), bramblePalette[i % bramblePalette.length],
      bx, gy + 0.28, bz, (i * 0.7) % 3, (i * 1.3) % 6, 0, 1.18, 0.84, 1.12));
    parts.push(trapperPart(new THREE.DodecahedronGeometry(0.28, 0), bramblePalette[(i + 2) % bramblePalette.length],
      bx + ((i % 2) ? 0.14 : -0.14), gy + 0.56, bz + 0.08, 0.4, i * 1.9, 0.2, 1.08, 0.80, 1.05));
    for (let c = 0; c < 2; c++) {
      const a = i * 1.5 + c * 2.4;
      const x2 = bx + Math.cos(a) * 0.36, z2 = bz + Math.sin(a) * 0.36;
      trapperBar(parts, [bx, gy + 0.08, bz], [x2, gy + 0.72, z2], 0.018, barkPalette[0], 5);
      parts.push(trapperPart(new THREE.ConeGeometry(0.012, 0.048, 4), 0xc2b490, (bx + x2) * 0.5, gy + 0.44, (bz + z2) * 0.5, 0.5, a, 0));
    }
  }

  // Solid colliders closing both fence sides (keeping prop.approach at (0, 1.44), (0, 0), and the cellar stairwell clear):
  for (const sgn of [-1, 1]) {
    for (let lz = 0.42; lz <= gateZ; lz += 0.72) {
      colliderSpots.push({ lx: sgn * (rule.POST_X + 0.34), lz, r: 0.36 });
    }
  }

  // AG-165 (J45): Sealed cellar back half:
  // Continue split-rail fence, timber posts, deadfall brambles, and solid colliders along both flanks to lz = -5.70,
  // and completely enclose the rear at lz = -5.70 so nobody clips in or gets stuck (only bear-trap route reaches hatch).
  const sealBackZ = rule.BACK_SEAL_Z_BACK || -5.70;
  const sealHalfW = rule.POST_X + 0.35; // ~2.15 m
  for (const sgn of [-1, 1]) {
    const lxFlank = sgn * sealHalfW;
    for (let lz = 0.42; lz >= sealBackZ; lz -= 1.45) {
      const gy = groundAtLocal(lxFlank, lz);
      parts.push(trapperPart(postBox.clone(), woodPalette[1], lxFlank, gy + 0.64, lz));
      parts.push(trapperPart(postCap.clone(), barkPalette[0], lxFlank, gy + 1.29, lz));
      parts.push(trapperPart(postBand.clone(), ironDark, lxFlank, gy + 1.12, lz));
      parts.push(trapperPart(new THREE.DodecahedronGeometry(0.42, 0), bramblePalette[Math.abs(Math.floor(lz * 2)) % bramblePalette.length],
        lxFlank + sgn * 0.28, gy + 0.32, lz, 0.2, lz * 1.5, 0.1, 1.2, 0.85, 1.1));
    }
    for (let lz = 0.42; lz > sealBackZ; lz -= 1.45) {
      const za = lz, zb = Math.max(sealBackZ, lz - 1.45);
      const ya = groundAtLocal(lxFlank, za), yb = groundAtLocal(lxFlank, zb);
      for (const h of [0.34, 0.68, 1.02]) {
        trapperBar(parts, [lxFlank, ya + h, za], [lxFlank, yb + h, zb], 0.045, woodPalette[0], 6);
      }
    }
    for (let lz = 0.42; lz >= sealBackZ; lz -= 0.65) {
      colliderSpots.push({ lx: lxFlank, lz, r: 0.36 });
    }
  }

  // Rear seal fence line across lz = sealBackZ:
  for (let lx = -sealHalfW; lx <= sealHalfW + 0.01; lx += 1.40) {
    const gy = groundAtLocal(lx, sealBackZ);
    parts.push(trapperPart(postBox.clone(), woodPalette[2], lx, gy + 0.64, sealBackZ));
    parts.push(trapperPart(postCap.clone(), barkPalette[0], lx, gy + 1.29, sealBackZ));
    parts.push(trapperPart(new THREE.DodecahedronGeometry(0.44, 0), bramblePalette[Math.abs(Math.floor(lx * 3)) % bramblePalette.length],
      lx, gy + 0.35, sealBackZ - 0.25, 0.1, lx * 2.1, 0.2, 1.15, 0.88, 1.1));
  }
  for (let lx = -sealHalfW; lx < sealHalfW - 0.01; lx += 1.40) {
    const xa = lx, xb = Math.min(sealHalfW, lx + 1.40);
    const ya = groundAtLocal(xa, sealBackZ), yb = groundAtLocal(xb, sealBackZ);
    for (const h of [0.34, 0.68, 1.02]) {
      trapperBar(parts, [xa, ya + h, sealBackZ], [xb, yb + h, sealBackZ], 0.045, woodPalette[1], 6);
    }
  }
  for (let lx = -sealHalfW; lx <= sealHalfW + 0.01; lx += 0.55) {
    colliderSpots.push({ lx, lz: sealBackZ, r: 0.36 });
  }

  // Bulkhead rear retaining header colliders at lz = -2.25:
  for (const sgn of [-1, 1]) {
    colliderSpots.push({ lx: sgn * 0.95, lz: -2.25, r: 0.32 });
  }
`;

code = code.replace(oldSlabsAndPosts, newSlabsAndPosts);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated game/trapper-path.js with 4-stone width and sealed cellar back half');
