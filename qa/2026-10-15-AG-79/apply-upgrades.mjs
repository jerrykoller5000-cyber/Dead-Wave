// qa/2026-10-15-AG-79/apply-upgrades.mjs
// Applies visual upgrades to:
// 1. Skeletal Marine (the pit) — REM, remBone, remSkull, remTorso, remBoot, makeSkeletalMarine, makeBoneRaft
// 2. Wood wall (all 5 variants: tiers 0..4) — makeWallMesh
// 3. Wood floor (all 3 variants: tiers 0..2) — makeFloorMesh, makeTierFloorMesh
// 4. Barricade (all 3 variants: tiers 0..2) — makeBarricadeMesh, decoratePiece('barricade')
// 5. Sandbag Wall (all 3 variants: tiers 0..2) — makeSandbagMesh, decoratePiece('sandbag')
import fs from 'node:fs';
import crypto from 'node:crypto';

const INDEX_PATH = 'index.html';
const rawBefore = fs.readFileSync(INDEX_PATH);
const hashBefore = crypto.createHash('sha256').update(rawBefore).digest('hex');
let src = rawBefore.toString('utf8');

const eol = src.includes('\r\n') ? '\r\n' : '\n';
function norm(s) {
  return s.replace(/\r?\n/g, eol);
}

function replaceExact(label, targetRaw, replacementRaw) {
  const target = norm(targetRaw);
  const replacement = norm(replacementRaw);
  const idx = src.indexOf(target);
  if (idx === -1) {
    throw new Error(`Target block not found for: ${label}`);
  }
  if (src.indexOf(target, idx + target.length) !== -1) {
    throw new Error(`Target block is not unique for: ${label}`);
  }
  src = src.slice(0, idx) + replacement + src.slice(idx + target.length);
  console.log(`Replaced block: ${label}`);
}

// ---------------------------------------------------------------------------
// 1. BARRICADE BASE MESH (makeBarricadeMesh)
// ---------------------------------------------------------------------------
const TARGET_BARRICADE = `    const BARRICADE_TOP = 1.4;
    const barricadeSteelMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.62, roughness: 0.4 });
    const barricadeRustMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, metalness: 0.45, roughness: 0.7 });
    function makeBarricadeMesh(matOverride = null) {
      const { outer, inner } = edgeGroups(EDGE_SPEC.barricade.edge);
      const steel = matOverride || barricadeSteelMat, rust = matOverride || barricadeRustMat;
      const H = BARRICADE_TOP, S = BUILD_GRID;
      for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, H + 0.5, 0.2), steel);
        post.position.set(sx * (S / 2 - 0.1), (H + 0.5) / 2 - 0.5, 0);
        post.castShadow = true;
        inner.add(post);
      }
      for (const y of [0.35, H - 0.12]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(S, 0.15, 0.17), y > 1 ? steel : rust);
        rail.position.set(0, y, 0);
        rail.castShadow = true;
        inner.add(rail);
      }
      // Two X-braces across the span.
      const bw = S / 2 - 0.1, diag = Math.hypot(bw, H - 0.5);
      for (const cx of [-S / 4, S / 4]) for (const sgn of [1, -1]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(diag, 0.12, 0.13), rust);
        bar.position.set(cx, (H + 0.35) / 2, 0.02);
        bar.rotation.z = sgn * Math.atan2(H - 0.5, bw);
        inner.add(bar);
      }
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(S, 0.55, 0.24), steel);
      skirt.position.set(0, -0.12, 0);
      inner.add(skirt);
      return outer;
    }`;

const REPLACE_BARRICADE = `    const BARRICADE_TOP = 1.4;
    const barricadeSteelMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.62, roughness: 0.4 });
    const barricadeRustMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, metalness: 0.45, roughness: 0.7 });
    const barricadeDarkMat = new THREE.MeshStandardMaterial({ color: 0x3b4149, metalness: 0.65, roughness: 0.48 });
    const barricadeTimberMat = new THREE.MeshStandardMaterial({ color: 0x6a4d30, roughness: 0.88 });
    function makeBarricadeMesh(matOverride = null) {
      const { outer, inner } = edgeGroups(EDGE_SPEC.barricade.edge);
      const steel = matOverride || barricadeSteelMat;
      const rust = matOverride || barricadeRustMat;
      const dark = matOverride || barricadeDarkMat;
      const timber = matOverride || barricadeTimberMat;
      const H = BARRICADE_TOP, S = BUILD_GRID;
      const addB = (w, h, d, m, x, y, z, rx = 0, ry = 0, rz = 0) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
        mesh.position.set(x, y, z);
        if (rx || ry || rz) mesh.rotation.set(rx, ry, rz);
        mesh.castShadow = true; mesh.receiveShadow = true;
        inner.add(mesh);
        return mesh;
      };
      // Heavy structural I-beam end posts with baseplates, web stiffeners and top cap plates.
      for (const sx of [-1, 1]) {
        const px = sx * (S / 2 - 0.1), ph = H + 0.5, py = ph / 2 - 0.5;
        addB(0.06, ph, 0.18, dark, px, py, 0);
        for (const fz of [-1, 1]) addB(0.2, ph, 0.04, steel, px, py, fz * 0.09);
        addB(0.24, 0.05, 0.26, dark, px, 0.025, 0);
        addB(0.22, 0.04, 0.22, steel, px, H + 0.01, 0);
        for (const wy of [0.35, 0.82, H - 0.12]) addB(0.18, 0.035, 0.14, rust, px, wy, 0);
      }
      // Central upright mullion post dividing the two braced bays.
      addB(0.11, H + 0.35, 0.15, dark, 0, (H + 0.35) / 2 - 0.35, 0);
      addB(0.16, 0.04, 0.2, steel, 0, 0.02, 0);
      // Horizontal rails: lower rusted steel channel, mid rough-sawn timber beam, upper steel C-channel.
      addB(S, 0.14, 0.17, rust, 0, 0.34, 0);
      addB(S - 0.16, 0.13, 0.15, timber, 0, 0.82, 0.025);
      addB(S, 0.15, 0.18, steel, 0, H - 0.11, 0);
      for (const fz of [-1, 1]) addB(S, 0.03, 0.2, dark, 0, H - 0.04, fz * 0.01);
      // Two X-braces across the left and right bays with central bolted gusset plates.
      const bw = S / 2 - 0.14, bh = H - 0.52, diag = Math.hypot(bw, bh), ang = Math.atan2(bh, bw);
      for (const cx of [-S / 4, S / 4]) {
        const cy = (H + 0.26) / 2;
        for (const sgn of [1, -1]) {
          addB(diag, 0.1, 0.09, sgn > 0 ? rust : timber, cx, cy, sgn * 0.03, 0, 0, sgn * ang);
        }
        addB(0.16, 0.16, 0.12, dark, cx, cy, 0.03);
        addB(0.05, 0.05, 0.15, steel, cx, cy, 0.03);
      }
      // Jagged anti-climb scrap rebar / angle-iron spikes welded along the top rail.
      for (let i = 0; i < 7; i++) {
        const sx = -S / 2 + 0.22 + i * ((S - 0.44) / 6);
        const tilt = (i % 2 === 0 ? 1 : -1) * 0.22;
        addB(0.038, 0.18, 0.038, i % 2 ? rust : steel, sx, H + 0.04, tilt * 0.12, tilt, 0, (i - 3) * 0.04);
      }
      // Buried steel anchor skirt with reinforced ground curb.
      addB(S, 0.55, 0.24, dark, 0, -0.12, 0);
      addB(S - 0.08, 0.09, 0.26, rust, 0, 0.11, 0);
      return outer;
    }`;

replaceExact('makeBarricadeMesh', TARGET_BARRICADE, REPLACE_BARRICADE);

// ---------------------------------------------------------------------------
// 2. TIER MATS & WALL MESH (tierMats + makeWallMesh, tiers 0..4)
// ---------------------------------------------------------------------------
const TARGET_WALL = `    const stoneVC = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, vertexColors: true });
    const steelVC = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.68, roughness: 0.42, vertexColors: true });
    const tint = (vc, hex) => ({ vc, color: new THREE.Color(hex), isTint: true });
    const tierMats = {
      stone: [0x8d8a82, 0x7b7872, 0x9a958b].map((c) => tint(stoneVC, c)),
      stoneDark: tint(stoneVC, 0x66635d),
      mortar: tint(stoneVC, 0x5c5850),
      steel: tint(steelVC, 0x5d646c),
      steelDark: tint(steelVC, 0x3b4047),
      steelLight: tint(steelVC, 0x8b939b),
      rivet: tint(steelVC, 0xa3aab1),
      iron: tint(steelVC, 0x3f4349),
      rust: new THREE.MeshStandardMaterial({ color: 0x6a4630, metalness: 0.4, roughness: 0.75 }),
      olive: new THREE.MeshStandardMaterial({ color: 0x4f5a3a, metalness: 0.35, roughness: 0.6 }),
      black: new THREE.MeshStandardMaterial({ color: 0x1f2226, metalness: 0.55, roughness: 0.45 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.8, roughness: 0.35 }),
      lensRed: new THREE.MeshStandardMaterial({ color: 0xff3a2a, emissive: 0xff2a1a, emissiveIntensity: 1.2 }),
      lensBlue: new THREE.MeshStandardMaterial({ color: 0x5ac8ff, emissive: 0x2aa0ff, emissiveIntensity: 1.3 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x6f5232, roughness: 0.88 })
    };
    function _mesh(geo, m) {
      if (m && m.isTint) {
        const n = geo.attributes.position.count, c = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { c[i * 3] = m.color.r; c[i * 3 + 1] = m.color.g; c[i * 3 + 2] = m.color.b; }
        geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
        return new THREE.Mesh(geo, m.vc);
      }
      return new THREE.Mesh(geo, m);
    }
    const _box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
      const m = _mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
      return m;
    };
    // Deterministic "random" so a stone course looks the same every time it is built.
    const _hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

    // Walls come in five tiers: wood, reinforced wood, stone, reinforced stone, steel.
    // Every tier keeps the same parts — posts, a lower run, the upper runs either side
    // of the window, the middle upper run a window takes out, the cap and the sill —
    // so a window or a door cuts into any of them the same way.
    function makeWallMesh(matOverride = null, tier = 0) {
      const { outer, inner } = edgeGroups(EDGE_SPEC.wall.edge);
      const T = matOverride ? 0 : tier;
      const kind = T >= 4 ? 'steel' : (T >= 2 ? 'stone' : 'wood');
      const wood = matOverride || wallWoodMat, metal = matOverride || wallMetalMat;
      const S = BUILD_GRID, inX = S / 2 - WALL_T;          // inner face of each post
      // Posts.
      for (const sx of [-1, 1]) {
        const px = sx * (S / 2 - WALL_T / 2), ph = WALL_TOP + WALL_SKIRT, py = ph / 2 - WALL_SKIRT;
        if (kind === 'wood') inner.add(_box(WALL_T, ph, WALL_T, metal, px, py, 0));
        else if (kind === 'stone') {
          inner.add(_box(WALL_T + 0.04, ph, 0.42, tierMats.stoneDark, px, py, 0));
          if (T >= 3) for (const fz of [-1, 1]) inner.add(_box(WALL_T + 0.08, 0.5, 0.03, tierMats.steelDark, px, 1.0, fz * 0.225)); // corner plates
        } else {
          // An I-beam: flanges front and back, the web between.
          for (const fz of [-1, 1]) inner.add(_box(WALL_T, ph, 0.05, tierMats.steelDark, px, py, fz * 0.15));
          inner.add(_box(0.06, ph, 0.3, tierMats.steelDark, px, py, 0));
        }
      }
      const lower = new THREE.Group(), upper = new THREE.Group(), upperMid = new THREE.Group();
      inner.add(lower, upper, upperMid);
      const capY = WALL_TOP - (kind === 'stone' ? 0.22 : 0.18);
      // One run of wall between x0..x1, y0..y1, in this tier's material.
      const run = (grp, x0, x1, y0, y1) => {
        if (kind === 'wood') {
          const n = Math.max(1, Math.round((x1 - x0) / 0.3)), w = (x1 - x0) / n;
          for (let i = 0; i < n; i++) grp.add(_box(w * 0.97, y1 - y0, 0.2, wood, x0 + w * (i + 0.5), (y0 + y1) / 2, 0));
        } else if (kind === 'stone') {
          // Courses of dressed blocks in a running bond, mortar showing between.
          grp.add(_box(x1 - x0, y1 - y0, 0.22, tierMats.mortar, (x0 + x1) / 2, (y0 + y1) / 2, 0));
          const rh = 0.3;
          for (let r = 0, y = y0; y < y1 - 0.02; r++, y += rh) {
            const yt = Math.min(y1, y + rh), off = (r % 2) ? 0.27 : 0;
            let x = x0 - off;
            for (let k = 0; x < x1 - 0.02; k++) {
              const xa = Math.max(x0, x), xb = Math.min(x1, x + 0.54);
              if (xb - xa > 0.04) {
                const m = tierMats.stone[Math.floor(_hash(r * 7 + k, x0 * 3 + y0) * 3) % 3];
                grp.add(_box((xb - xa) - 0.03, (yt - y) - 0.03, 0.27, m, (xa + xb) / 2, (y + yt) / 2, 0));
              }
              x += 0.54;
            }
          }
        } else {
          // Steel plate, ribbed on the inside, riveted along its top and bottom.
          grp.add(_box(x1 - x0, y1 - y0, 0.14, tierMats.steel, (x0 + x1) / 2, (y0 + y1) / 2, 0));
          for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.42) grp.add(_box(0.06, y1 - y0, 0.06, tierMats.steelDark, x, (y0 + y1) / 2, -0.09));
          for (const ry of [Math.max(y0, 0) + 0.08, y1 - 0.08]) {
            for (let x = x0 + 0.08; x < x1 - 0.04; x += 0.19) grp.add(_box(0.04, 0.04, 0.03, tierMats.rivet, x, ry, 0.085));
          }
        }
      };
      run(lower, -inX, inX, -WALL_SKIRT, WALL_SILL);
      run(upper, -inX, -WALL_WIN_W / 2, WALL_SILL, capY);
      run(upper, WALL_WIN_W / 2, inX, WALL_SILL, capY);
      run(upperMid, -WALL_WIN_W / 2, WALL_WIN_W / 2, WALL_SILL, capY);
      // The cap.
      if (kind === 'wood') inner.add(_box(S, 0.18, 0.4, wood, 0, WALL_TOP - 0.09, 0));
      else if (kind === 'stone') {
        inner.add(_box(S, 0.22, 0.46, tierMats.stoneDark, 0, WALL_TOP - 0.11, 0));
        if (T >= 3) inner.add(_box(S, 0.03, 0.48, tierMats.steelDark, 0, WALL_TOP - 0.005, 0));
      } else {
        inner.add(_box(S, 0.16, 0.36, tierMats.steelDark, 0, WALL_TOP - 0.08, 0));
        for (let x = -S / 2 + 0.12; x < S / 2; x += 0.22) inner.add(_box(0.045, 0.03, 0.045, tierMats.rivet, x, WALL_TOP - 0.005, 0.1));
      }
      // Bands: steel straps on the inside of a wooden wall; reinforced wood has them
      // on both faces with an X-brace across the lower half; reinforced stone is
      // girdled with iron bands front and back.
      const band = (y, z, m) => {
        lower.add(_box(2 * inX, 0.13, 0.06, m, 0, Math.min(y, WALL_SILL - 0.1), z));
      };
      const bandUp = (y, z, m) => {
        const wL = inX - WALL_WIN_W / 2;
        upper.add(_box(wL, 0.13, 0.06, m, -(inX + WALL_WIN_W / 2) / 2, y, z), _box(wL, 0.13, 0.06, m, (inX + WALL_WIN_W / 2) / 2, y, z));
        upperMid.add(_box(WALL_WIN_W, 0.13, 0.06, m, 0, y, z));
      };
      if (kind === 'wood') {
        band(0.55, -0.13, metal); bandUp(1.4, -0.13, metal);
        if (T >= 1) {
          band(0.2, 0.13, tierMats.steelDark); band(0.8, 0.13, tierMats.steelDark);
          bandUp(1.4, 0.13, tierMats.steelDark); bandUp(1.78, 0.13, tierMats.steelDark);
          const dx = 2 * inX - 0.2, dy = WALL_SILL - 0.1, diag = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
          for (const sgn of [1, -1]) {
            const s = _box(diag, 0.1, 0.04, tierMats.steelDark, 0, dy / 2 + 0.03, 0.15);
            s.rotation.z = sgn * a; lower.add(s);
          }
          for (let x = -inX + 0.15; x < inX; x += 0.3) for (const y of [0.2, 0.8]) lower.add(_box(0.05, 0.05, 0.03, tierMats.rivet, x, y, 0.17));
        }
      } else if (kind === 'stone' && T >= 3) {
        for (const z of [-0.145, 0.145]) { band(0.35, z, tierMats.steelDark); bandUp(1.45, z, tierMats.steelDark); }
        for (let x = -inX + 0.2; x < inX; x += 0.4) for (const z of [-0.18, 0.18]) lower.add(_box(0.06, 0.06, 0.03, tierMats.rivet, x, 0.35, z));
      }
      // The sill a window leaves across the opening.
      const sillMat = kind === 'wood' ? wood : (kind === 'stone' ? tierMats.stoneDark : tierMats.steelDark);
      const sill = _box(WALL_WIN_W + 0.1, 0.07, kind === 'wood' ? 0.3 : 0.4, sillMat, 0, WALL_SILL + 0.035, 0);
      sill.visible = false;
      inner.add(sill);
      outer.userData.lower = lower;
      outer.userData.upper = upper;
      outer.userData.upperMid = upperMid;
      outer.userData.sill = sill;
      return outer;
    }`;

const REPLACE_WALL = `    const stoneVC = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, vertexColors: true });
    const steelVC = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.68, roughness: 0.42, vertexColors: true });
    const woodVC = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, vertexColors: true });
    const burlapVC = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, vertexColors: true });
    const tint = (vc, hex) => ({ vc, color: new THREE.Color(hex), isTint: true });
    const tierMats = {
      stone: [0x8d8a82, 0x7b7872, 0x9a958b, 0x848078].map((c) => tint(stoneVC, c)),
      stoneDark: tint(stoneVC, 0x66635d),
      stoneLight: tint(stoneVC, 0xa5a096),
      mortar: tint(stoneVC, 0x4f4b44),
      steel: tint(steelVC, 0x5d646c),
      steelDark: tint(steelVC, 0x3b4047),
      steelLight: tint(steelVC, 0x8b939b),
      rivet: tint(steelVC, 0xa8b0b8),
      iron: tint(steelVC, 0x3f4349),
      woodPlanks: [0x87653e, 0x795935, 0x6d4f2e, 0x805e39].map((c) => tint(woodVC, c)),
      woodPost: tint(woodVC, 0x593f24),
      woodCap: tint(woodVC, 0x66492a),
      woodDark: tint(woodVC, 0x45301a),
      burlap: [0x968763, 0x877856, 0x7c6e4e, 0x8e7f5c].map((c) => tint(burlapVC, c)),
      burlapDark: tint(burlapVC, 0x584c33),
      rust: new THREE.MeshStandardMaterial({ color: 0x6a4630, metalness: 0.4, roughness: 0.75 }),
      olive: new THREE.MeshStandardMaterial({ color: 0x4f5a3a, metalness: 0.35, roughness: 0.6 }),
      black: new THREE.MeshStandardMaterial({ color: 0x1f2226, metalness: 0.55, roughness: 0.45 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.8, roughness: 0.35 }),
      lensRed: new THREE.MeshStandardMaterial({ color: 0xff3a2a, emissive: 0xff2a1a, emissiveIntensity: 1.2 }),
      lensBlue: new THREE.MeshStandardMaterial({ color: 0x5ac8ff, emissive: 0x2aa0ff, emissiveIntensity: 1.3 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x6f5232, roughness: 0.88 })
    };
    function _mesh(geo, m) {
      if (m && m.isTint) {
        const n = geo.attributes.position.count, c = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { c[i * 3] = m.color.r; c[i * 3 + 1] = m.color.g; c[i * 3 + 2] = m.color.b; }
        geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
        return new THREE.Mesh(geo, m.vc);
      }
      return new THREE.Mesh(geo, m);
    }
    const _box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
      const m = _mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
      return m;
    };
    const _rbox = (w, h, d, r, mat, x = 0, y = 0, z = 0) => {
      const m = _mesh(rbox(w, h, d, r).clone(), mat);
      m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
      return m;
    };
    // Deterministic "random" so a stone course looks the same every time it is built.
    const _hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

    // Walls come in five tiers: wood, reinforced wood, stone, reinforced stone, steel.
    // Every tier keeps the same parts — posts, a lower run, the upper runs either side
    // of the window, the middle upper run a window takes out, the cap and the sill —
    // so a window or a door cuts into any of them the same way.
    function makeWallMesh(matOverride = null, tier = 0) {
      const { outer, inner } = edgeGroups(EDGE_SPEC.wall.edge);
      const T = matOverride ? 0 : tier;
      const kind = T >= 4 ? 'steel' : (T >= 2 ? 'stone' : 'wood');
      const wood = matOverride || wallWoodMat, metal = matOverride || wallMetalMat;
      const wPost = matOverride || tierMats.woodPost;
      const wCap = matOverride || tierMats.woodCap;
      const wDark = matOverride || tierMats.woodDark;
      const wPlanks = matOverride ? [matOverride] : tierMats.woodPlanks;
      const S = BUILD_GRID, inX = S / 2 - WALL_T;          // inner face of each post
      // Corner Posts / Piers / Columns.
      for (const sx of [-1, 1]) {
        const px = sx * (S / 2 - WALL_T / 2), ph = WALL_TOP + WALL_SKIRT, py = ph / 2 - WALL_SKIRT;
        if (kind === 'wood') {
          // Dressed dark-timber corner post with iron base shoe and collar bands.
          inner.add(_box(WALL_T, ph, WALL_T, wPost, px, py, 0));
          inner.add(_box(WALL_T + 0.03, 0.22, WALL_T + 0.03, T >= 1 ? tierMats.steelDark : metal, px, 0.11, 0));
          inner.add(_box(WALL_T + 0.025, 0.08, WALL_T + 0.025, T >= 1 ? tierMats.steelDark : metal, px, WALL_SILL, 0));
          inner.add(_box(WALL_T + 0.025, 0.08, WALL_T + 0.025, T >= 1 ? tierMats.steelDark : metal, px, WALL_TOP - 0.22, 0));
          if (T >= 1) {
            // Reinforced wood: corner iron angle straps and heavy bolts on the post faces.
            for (const fz of [-1, 1]) {
              inner.add(_box(WALL_T + 0.04, ph - 0.2, 0.03, tierMats.steelDark, px, py, fz * (WALL_T / 2 + 0.01)));
              for (const by of [0.2, 0.8, 1.4, 1.78]) inner.add(_box(0.055, 0.055, 0.04, tierMats.rivet, px, by, fz * (WALL_T / 2 + 0.025)));
            }
          }
        } else if (kind === 'stone') {
          // Ashlar stone pier with stepped plinth and alternating corner quoin blocks.
          inner.add(_box(WALL_T + 0.04, ph, 0.40, tierMats.stoneDark, px, py, 0));
          inner.add(_box(WALL_T + 0.08, 0.26, 0.46, tierMats.stoneDark, px, 0.13, 0));
          for (let q = 0; q < 6; q++) {
            const qy = 0.16 + q * 0.28, qw = (q % 2 === 0) ? WALL_T + 0.07 : WALL_T + 0.03;
            const qm = tierMats.stone[(q + (sx > 0 ? 1 : 0)) % tierMats.stone.length];
            inner.add(_box(qw, 0.23, 0.43, qm, px, qy, 0));
          }
          if (T >= 3) {
            // Reinforced stone: riveted iron corner armour plates & bolted straps.
            for (const fz of [-1, 1]) {
              inner.add(_box(WALL_T + 0.09, 1.68, 0.035, tierMats.steelDark, px, 0.96, fz * 0.225));
              for (const by of [0.35, 0.9, 1.45]) inner.add(_box(0.065, 0.065, 0.04, tierMats.rivet, px, by, fz * 0.245));
            }
          }
        } else {
          // Heavy structural H/I-beam steel column with baseplate, web stiffeners and rivet rows.
          for (const fz of [-1, 1]) {
            inner.add(_box(WALL_T + 0.02, ph, 0.055, tierMats.steelDark, px, py, fz * 0.155));
            for (let ry = 0.18; ry < WALL_TOP - 0.15; ry += 0.36) {
              inner.add(_box(0.045, 0.045, 0.035, tierMats.rivet, px - sx * 0.06, ry, fz * 0.188));
              inner.add(_box(0.045, 0.045, 0.035, tierMats.rivet, px + sx * 0.06, ry, fz * 0.188));
            }
          }
          inner.add(_box(0.08, ph, 0.30, tierMats.iron, px, py, 0));
          for (const wy of [0.22, 0.68, 1.14, 1.60]) inner.add(_box(WALL_T - 0.02, 0.04, 0.26, tierMats.steelLight, px, wy, 0));
          inner.add(_box(WALL_T + 0.08, 0.08, 0.42, tierMats.steelDark, px, 0.04, 0));
        }
      }
      const lower = new THREE.Group(), upper = new THREE.Group(), upperMid = new THREE.Group();
      inner.add(lower, upper, upperMid);
      const capY = WALL_TOP - (kind === 'stone' ? 0.22 : 0.18);
      // One run of wall between x0..x1, y0..y1, in this tier's material.
      const run = (grp, x0, x1, y0, y1) => {
        const spanW = x1 - x0, spanH = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        if (kind === 'wood') {
          // Recessed dark-timber shadow core + vertical interior framing studs + horizontal bevelled planks.
          grp.add(_box(spanW, spanH, 0.15, wDark, cx, cy, 0));
          const nStuds = Math.max(2, Math.round(spanW / 0.42) + 1);
          for (let s = 0; s < nStuds; s++) {
            const sx = x0 + 0.04 + (spanW - 0.08) * (s / Math.max(1, nStuds - 1));
            grp.add(_box(0.065, spanH, 0.21, wPost, sx, cy, -0.02));
          }
          const ph = 0.175;
          for (let r = 0, y = y0; y < y1 - 0.015; r++, y += ph) {
            const yt = Math.min(y1, y + ph), hCourse = (yt - y) - 0.016, yc = (y + yt) / 2;
            if (hCourse <= 0.02) continue;
            // Split wide spans into two butt-jointed planks with staggered joint.
            const splitX = spanW > 0.75 ? x0 + spanW * (r % 2 === 0 ? 0.58 : 0.42) : x1;
            const segs = splitX < x1 - 0.1 ? [[x0, splitX - 0.008], [splitX + 0.008, x1]] : [[x0, x1]];
            segs.forEach(([sa, sb], idx) => {
              const sw = sb - sa;
              if (sw <= 0.03) return;
              const pm = wPlanks[Math.floor(_hash(r * 5 + idx, x0 * 7 + y0) * wPlanks.length) % wPlanks.length];
              grp.add(_box(sw - 0.01, hCourse, 0.20, pm, (sa + sb) / 2, yc, 0.008));
            });
          }
          if (y0 < 0) {
            // Baseboard / wainscoting trim rail just above ground and under the sill.
            grp.add(_box(spanW, 0.09, 0.24, wPost, cx, 0.05, 0));
            grp.add(_box(spanW, 0.06, 0.23, wCap, cx, y1 - 0.03, 0));
          }
        } else if (kind === 'stone') {
          // Courses of dressed ashlar blocks in a running bond over recessed mortar, with rusticated boss faces.
          grp.add(_box(spanW, spanH, 0.24, tierMats.mortar, cx, cy, 0));
          if (y0 < 0) grp.add(_box(spanW, 0.18, 0.34, tierMats.stoneDark, cx, 0.09, 0));
          const rh = 0.27;
          for (let r = 0, y = y0; y < y1 - 0.02; r++, y += rh) {
            const yt = Math.min(y1, y + rh), off = (r % 2) ? 0.25 : 0;
            let x = x0 - off;
            for (let k = 0; x < x1 - 0.02; k++) {
              const xa = Math.max(x0, x), xb = Math.min(x1, x + 0.50);
              const bw = xb - xa, bh = yt - y;
              if (bw > 0.05 && bh > 0.05) {
                const m = tierMats.stone[Math.floor(_hash(r * 7 + k, x0 * 3 + y0) * tierMats.stone.length) % tierMats.stone.length];
                const bx = (xa + xb) / 2, by = (y + yt) / 2;
                grp.add(_box(bw - 0.026, bh - 0.026, 0.28, m, bx, by, 0));
                if (bw > 0.16 && bh > 0.14) {
                  grp.add(_box(bw - 0.08, bh - 0.07, 0.31, m, bx, by, 0));
                }
              }
              x += 0.50;
            }
          }
          if (y0 < 0) grp.add(_box(spanW, 0.055, 0.33, tierMats.stoneDark, cx, y1 - 0.025, 0));
        } else {
          // Armoured steel bulkhead: main plate, horizontal blast ribs, vertical interior T-stiffeners, and rivet rows.
          grp.add(_box(spanW, spanH, 0.16, tierMats.steel, cx, cy, 0));
          // Raised outer armour panels.
          const ph = 0.42;
          for (let r = 0, y = Math.max(0.04, y0); y < y1 - 0.06; r++, y += ph) {
            const yt = Math.min(y1 - 0.03, y + ph - 0.04);
            if (yt - y > 0.08) {
              grp.add(_box(spanW - 0.06, yt - y, 0.19, r % 2 ? tierMats.steel : tierMats.steelLight, cx, (y + yt) / 2, 0.01));
            }
          }
          // Vertical interior T-stiffeners and exterior seam straps.
          for (let x = x0 + 0.22; x < x1 - 0.12; x += 0.44) {
            grp.add(_box(0.06, spanH, 0.09, tierMats.steelDark, x, cy, -0.09));
            grp.add(_box(0.045, spanH, 0.03, tierMats.steelDark, x, cy, 0.095));
          }
          // Horizontal blast-deflector ribs and dense rows of raised rivets.
          const ribYs = y0 < 0 ? [0.12, 0.52, y1 - 0.06] : [y0 + 0.06, (y0 + y1) / 2, y1 - 0.06];
          for (const ry of ribYs) {
            grp.add(_box(spanW, 0.055, 0.22, tierMats.steelDark, cx, ry, 0));
            for (let x = x0 + 0.08; x < x1 - 0.04; x += 0.17) {
              grp.add(_box(0.04, 0.04, 0.035, tierMats.rivet, x, ry, 0.105));
              grp.add(_box(0.04, 0.04, 0.035, tierMats.rivet, x, ry, -0.105));
            }
          }
        }
      };
      run(lower, -inX, inX, -WALL_SKIRT, WALL_SILL);
      run(upper, -inX, -WALL_WIN_W / 2, WALL_SILL, capY);
      run(upper, WALL_WIN_W / 2, inX, WALL_SILL, capY);
      run(upperMid, -WALL_WIN_W / 2, WALL_WIN_W / 2, WALL_SILL, capY);
      // The overhanging cap beam / coping stones / steel box-girder cap.
      if (kind === 'wood') {
        inner.add(_box(S, 0.13, 0.36, wPost, 0, WALL_TOP - 0.115, 0));
        inner.add(_box(S + 0.02, 0.06, 0.42, wCap, 0, WALL_TOP - 0.03, 0));
        if (T >= 1) {
          inner.add(_box(S + 0.03, 0.03, 0.44, tierMats.steelDark, 0, WALL_TOP - 0.005, 0));
          for (let x = -S / 2 + 0.16; x < S / 2; x += 0.28) inner.add(_box(0.045, 0.03, 0.045, tierMats.rivet, x, WALL_TOP + 0.008, 0));
        }
      } else if (kind === 'stone') {
        inner.add(_box(S, 0.12, 0.44, tierMats.stoneDark, 0, WALL_TOP - 0.16, 0));
        const nCop = 5, cw = S / nCop;
        for (let i = 0; i < nCop; i++) {
          const cm = tierMats.stone[(i + 1) % tierMats.stone.length];
          inner.add(_box(cw - 0.025, 0.10, 0.48, cm, -S / 2 + cw * (i + 0.5), WALL_TOP - 0.05, 0));
          inner.add(_box(cw - 0.06, 0.03, 0.38, tierMats.stoneLight, -S / 2 + cw * (i + 0.5), WALL_TOP - 0.005, 0));
        }
        if (T >= 3) {
          inner.add(_box(S + 0.02, 0.035, 0.50, tierMats.steelDark, 0, WALL_TOP - 0.005, 0));
          for (const fz of [-1, 1]) inner.add(_box(S + 0.02, 0.065, 0.03, tierMats.steelDark, 0, WALL_TOP - 0.04, fz * 0.245));
          for (let x = -S / 2 + 0.18; x < S / 2; x += 0.32) inner.add(_box(0.05, 0.03, 0.05, tierMats.rivet, x, WALL_TOP + 0.012, 0));
        }
      } else {
        inner.add(_box(S, 0.14, 0.38, tierMats.steelDark, 0, WALL_TOP - 0.09, 0));
        inner.add(_box(S + 0.02, 0.04, 0.42, tierMats.steelLight, 0, WALL_TOP - 0.02, 0));
        for (let x = -S / 2 + 0.12; x < S / 2; x += 0.22) {
          for (const fz of [-1, 1]) inner.add(_box(0.045, 0.03, 0.045, tierMats.rivet, x, WALL_TOP + 0.004, fz * 0.13));
        }
      }
      // Reinforcement bands & bracing.
      const band = (y, z, m, h = 0.11) => {
        lower.add(_box(2 * inX, h, 0.055, m, 0, Math.min(y, WALL_SILL - 0.09), z));
      };
      const bandUp = (y, z, m, h = 0.11) => {
        const wL = inX - WALL_WIN_W / 2;
        upper.add(_box(wL, h, 0.055, m, -(inX + WALL_WIN_W / 2) / 2, y, z), _box(wL, h, 0.055, m, (inX + WALL_WIN_W / 2) / 2, y, z));
        upperMid.add(_box(WALL_WIN_W, h, 0.055, m, 0, y, z));
      };
      if (kind === 'wood') {
        const riv = matOverride || tierMats.rivet;
        band(0.52, -0.125, metal, 0.10); bandUp(1.42, -0.125, metal, 0.10);
        for (let x = -inX + 0.18; x < inX; x += 0.34) {
          lower.add(_box(0.045, 0.045, 0.03, riv, x, 0.52, -0.15));
        }
        if (T >= 1) {
          for (const fz of [-1, 1]) {
            band(0.22, fz * 0.125, tierMats.steelDark);
            band(0.80, fz * 0.125, tierMats.steelDark);
            bandUp(1.38, fz * 0.125, tierMats.steelDark);
            bandUp(1.76, fz * 0.125, tierMats.steelDark);
          }
          const dx = 2 * inX - 0.16, dy = WALL_SILL - 0.18, diag = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
          for (const fz of [-1, 1]) {
            for (const sgn of [1, -1]) {
              const s = _box(diag, 0.095, 0.038, tierMats.steelDark, 0, dy / 2 + 0.09, fz * 0.145);
              s.rotation.z = sgn * a; lower.add(s);
            }
            lower.add(_box(0.18, 0.18, 0.05, tierMats.iron, 0, dy / 2 + 0.09, fz * 0.15));
            lower.add(_box(0.06, 0.06, 0.07, tierMats.rivet, 0, dy / 2 + 0.09, fz * 0.16));
          }
          for (let x = -inX + 0.15; x < inX; x += 0.28) {
            for (const y of [0.22, 0.80]) {
              for (const fz of [-1, 1]) lower.add(_box(0.05, 0.05, 0.03, tierMats.rivet, x, y, fz * 0.16));
            }
          }
        }
      } else if (kind === 'stone' && T >= 3) {
        for (const z of [-0.155, 0.155]) {
          band(0.32, z, tierMats.steelDark, 0.12);
          band(0.78, z, tierMats.steelDark, 0.10);
          bandUp(1.45, z, tierMats.steelDark, 0.12);
        }
        // Diagonal iron cross-straps and masonry tie-rod star plates on lower stone wall.
        const dx = 2 * inX - 0.2, dy = 0.56, diag = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        for (const fz of [-1, 1]) {
          for (const sgn of [1, -1]) {
            const s = _box(diag, 0.08, 0.035, tierMats.steelDark, 0, 0.55, fz * 0.165);
            s.rotation.z = sgn * a; lower.add(s);
          }
          lower.add(_box(0.16, 0.16, 0.05, tierMats.iron, 0, 0.55, fz * 0.17));
        }
        for (let x = -inX + 0.2; x < inX; x += 0.36) {
          for (const z of [-0.185, 0.185]) {
            lower.add(_box(0.065, 0.065, 0.035, tierMats.rivet, x, 0.32, z));
            lower.add(_box(0.055, 0.055, 0.035, tierMats.rivet, x, 0.78, z));
          }
        }
      }
      // The sill a window leaves across the opening.
      const sillMat = kind === 'wood' ? wCap : (kind === 'stone' ? tierMats.stoneDark : tierMats.steelDark);
      const sill = new THREE.Group();
      sill.add(_box(WALL_WIN_W + 0.14, 0.07, kind === 'wood' ? 0.34 : 0.42, sillMat, 0, WALL_SILL + 0.035, 0));
      for (const sx of [-1, 1]) {
        sill.add(_box(0.08, 0.06, kind === 'wood' ? 0.30 : 0.38, sillMat, sx * (WALL_WIN_W * 0.38), WALL_SILL - 0.02, 0));
      }
      sill.visible = false;
      inner.add(sill);
      outer.userData.lower = lower;
      outer.userData.upper = upper;
      outer.userData.upperMid = upperMid;
      outer.userData.sill = sill;
      return outer;
    }`;

replaceExact('tierMats and makeWallMesh', TARGET_WALL, REPLACE_WALL);

// ---------------------------------------------------------------------------
// 3. SANDBAG WALL BASE MESH (makeSandbagMesh)
// ---------------------------------------------------------------------------
const TARGET_SANDBAG = `    function makeSandbagMesh(matOverride = null) {
      const { outer, inner } = edgeGroups(EDGE_SPEC.sandbag.edge);
      const bag = matOverride || sandbagMat;
      const rows = 4, rh = SANDBAG_TOP / rows, S = BUILD_GRID;
      for (let r = 0; r < rows; r++) {
        const n = r % 2 ? 5 : 4, bw = S / n;
        for (let i = 0; i < n; i++) {
          const m = new THREE.Mesh(rbox(bw * 0.95, rh * 0.94, 0.52, 0.06), bag);
          m.position.set(-S / 2 + bw * (i + 0.5), rh * (r + 0.5), 0);
          m.castShadow = true; m.receiveShadow = true;
          inner.add(m);
        }
      }
      const foot = new THREE.Mesh(rbox(S, 0.22, 0.54, 0.05), bag);
      foot.position.y = -0.11;
      inner.add(foot);
      return outer;
    }`;

const REPLACE_SANDBAG = `    function makeSandbagMesh(matOverride = null) {
      const { outer, inner } = edgeGroups(EDGE_SPEC.sandbag.edge);
      const tones = matOverride ? [matOverride] : tierMats.burlap;
      const twine = matOverride || tierMats.burlapDark;
      const rows = 4, rh = SANDBAG_TOP / rows, S = BUILD_GRID;
      for (let r = 0; r < rows; r++) {
        const n = r % 2 ? 5 : 4, bw = S / n;
        for (let i = 0; i < n; i++) {
          const h1 = _hash(r * 11 + i, i * 17 + r);
          const h2 = _hash(i * 23 + r, r * 7 + 3);
          const bagMat = tones[Math.floor(h1 * tones.length) % tones.length];
          const isEnd = (i === 0 || i === n - 1);
          const cx = -S / 2 + bw * (i + 0.5) + (isEnd ? 0 : (h1 - 0.5) * 0.025);
          const cy = rh * (r + 0.5);
          const cz = (h2 - 0.5) * 0.035;
          const depth = 0.52 + (r === 0 ? 0.04 : 0) - r * 0.012;
          const m = _rbox(bw * 0.96, rh * 0.96, depth, 0.068, bagMat, cx, cy, cz);
          if (!isEnd) {
            m.rotation.y = (h1 - 0.5) * 0.08;
            m.rotation.z = (h2 - 0.5) * 0.035;
          }
          inner.add(m);
          // Center waist seam / burlap tie crease around the middle of each sack.
          inner.add(_box(0.032, rh * 0.88, depth * 0.94, twine, cx, cy, cz));
          // Cinch-tied bag neck & flared burlap ear on interior joints so adjacent walls meet flush.
          const neckDir = (i % 2 === 0) ? 1 : -1;
          if (!((i === 0 && neckDir < 0) || (i === n - 1 && neckDir > 0))) {
            const nx = cx + neckDir * (bw * 0.45);
            inner.add(_box(0.035, rh * 0.52, depth * 0.48, twine, nx, cy, cz));
            const ear = _box(0.055, rh * 0.62, depth * 0.56, bagMat, nx + neckDir * 0.028, cy, cz);
            ear.rotation.z = neckDir * 0.18;
            inner.add(ear);
          }
        }
      }
      // Buried foundation course of 4 heavy base bags so slopes never show daylight underneath.
      for (let i = 0; i < 4; i++) {
        const bm = tones[(i + 1) % tones.length];
        inner.add(_rbox(S / 4 * 0.98, 0.24, 0.56, 0.05, bm, -S / 2 + (S / 4) * (i + 0.5), -0.11, 0));
      }
      return outer;
    }`;

replaceExact('makeSandbagMesh', TARGET_SANDBAG, REPLACE_SANDBAG);

// ---------------------------------------------------------------------------
// 4. WOOD FLOOR BASE MESH (makeFloorMesh)
// ---------------------------------------------------------------------------
const TARGET_FLOOR = `    // A floor is timber: boards across bearers, no steel in it anywhere.
    function makeFloorMesh(matOverride = null) {
      const g = new THREE.Group();
      const wood = matOverride || new THREE.MeshStandardMaterial({ color: 0x7a5c38, roughness: 0.85 });
      const bearer = matOverride || new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.9 });
      for (let i = 0; i < 6; i++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(BUILD_GRID * 0.98, 0.12, BUILD_GRID / 6 * 0.94), wood);
        plank.position.set(0, 0.19, -BUILD_GRID / 2 + BUILD_GRID / 6 * (i + 0.5));
        plank.castShadow = true; plank.receiveShadow = true;
        g.add(plank);
      }
      for (const sz of [-1, 1]) {
        const joist = new THREE.Mesh(new THREE.BoxGeometry(BUILD_GRID, 0.14, 0.14), bearer);
        joist.position.set(0, 0.07, sz * (BUILD_GRID / 2 - 0.07));
        g.add(joist);
      }
      // A skirt board down each side, reaching into the ground: where two floors on
      // uneven ground meet at slightly different heights, it closes the gap between
      // them instead of letting grass show through the seam.
      for (const [sx, sz, w, d] of [[1, 0, 0.05, BUILD_GRID], [-1, 0, 0.05, BUILD_GRID], [0, 1, BUILD_GRID, 0.05], [0, -1, BUILD_GRID, 0.05]]) {
        const sk = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), bearer);
        sk.position.set(sx * (BUILD_GRID / 2 - 0.03), -0.17, sz * (BUILD_GRID / 2 - 0.03));
        g.add(sk);
      }
      return g;
    }`;

const REPLACE_FLOOR = `    // A floor is timber: multi-tone bevelled boards across heavy joists, with countersunk nail heads and framed skirt boards.
    function makeFloorMesh(matOverride = null) {
      const g = new THREE.Group(), G = BUILD_GRID;
      const planks = matOverride ? [matOverride] : tierMats.woodPlanks;
      const bearer = matOverride || tierMats.woodPost;
      const trim = matOverride || tierMats.woodCap;
      const subDeck = matOverride || tierMats.woodDark;
      const nailMat = matOverride || tierMats.iron;
      // Dark sub-deck shadow bed so the seams between deck planks read crisply without letting ground show through.
      g.add(_box(G * 0.96, 0.08, G * 0.96, subDeck, 0, 0.16, 0));
      const nPlanks = 8, pw = G / nPlanks;
      for (let i = 0; i < nPlanks; i++) {
        const pz = -G / 2 + pw * (i + 0.5);
        // Staggered butt-joint splits each plank course into two boards of varied length and timber shade.
        const splitX = (i % 2 === 0 ? 0.22 : -0.24) + (_hash(i, 3) - 0.5) * 0.18;
        const boards = [[-G / 2 + 0.03, splitX - 0.007], [splitX + 0.007, G / 2 - 0.03]];
        boards.forEach(([x0, x1], bIdx) => {
          const bw = x1 - x0, cx = (x0 + x1) / 2;
          const pm = planks[Math.floor(_hash(i * 3 + bIdx, bIdx * 11 + 5) * planks.length) % planks.length];
          g.add(_box(bw, 0.10, pw * 0.92, pm, cx, 0.195, pz));
          g.add(_box(bw - 0.02, 0.015, pw * 0.84, pm, cx, 0.2425, pz));
          // Countersunk iron nail pairs at both ends of each board.
          for (const nx of [x0 + 0.055, x1 - 0.055]) {
            for (const nz of [-pw * 0.24, pw * 0.24]) {
              g.add(_box(0.024, 0.01, 0.024, nailMat, nx, 0.251, pz + nz));
            }
          }
        });
      }
      // Three heavy cross-joists and two longitudinal stringers underneath.
      for (const sz of [-1, 0, 1]) {
        g.add(_box(G * 0.98, 0.14, 0.13, bearer, 0, 0.07, sz * (G / 2 - 0.08)));
      }
      for (const sx of [-1, 1]) {
        g.add(_box(0.12, 0.12, G * 0.96, bearer, sx * (G / 2 - 0.08), 0.07, 0));
      }
      // Perimeter rim trim and deep skirt boards reaching into the ground.
      for (const [sx, sz, w, d] of [[1, 0, 0.055, G], [-1, 0, 0.055, G], [0, 1, G, 0.055], [0, -1, G, 0.055]]) {
        g.add(_box(w, 0.6, d, bearer, sx * (G / 2 - 0.03), -0.17, sz * (G / 2 - 0.03)));
        g.add(_box(sx ? 0.04 : G, 0.09, sz ? 0.04 : G, trim, sx * (G / 2 - 0.02), 0.20, sz * (G / 2 - 0.02)));
      }
      // Corner post blocks flush to the perimeter skirt.
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        g.add(_box(0.11, 0.72, 0.11, trim, sx * (G / 2 - 0.055), -0.11, sz * (G / 2 - 0.055)));
      }
      return g;
    }`;

replaceExact('makeFloorMesh', TARGET_FLOOR, REPLACE_FLOOR);

// ---------------------------------------------------------------------------
// 5. TIER FLOORS & DECORATE PIECE (makeTierFloorMesh + decoratePiece barricade/sandbag)
// ---------------------------------------------------------------------------
const TARGET_TIER_FLOOR_AND_DECORATE = `    // Floors: wood, stone flags, steel tread plate. Same top height and footprint.
    function makeTierFloorMesh(tier) {
      if (!tier) return makeFloorMesh();
      const g = new THREE.Group(), G = BUILD_GRID;
      if (tier === 1) {
        g.add(_box(G * 0.99, 0.14, G * 0.99, tierMats.mortar, 0, 0.12, 0));
        const n = 4, s = G / n;
        for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
          const m = tierMats.stone[Math.floor(_hash(i, k) * 3) % 3];
          g.add(_box(s - 0.05, 0.07, s - 0.05, m, -G / 2 + s * (i + 0.5), 0.215 - _hash(k, i) * 0.012, -G / 2 + s * (k + 0.5)));
        }
        for (const [sx, sz, w, d] of [[1, 0, 0.06, G], [-1, 0, 0.06, G], [0, 1, G, 0.06], [0, -1, G, 0.06]]) g.add(_box(w, 0.6, d, tierMats.stoneDark, sx * (G / 2 - 0.03), -0.17, sz * (G / 2 - 0.03)));
      } else {
        g.add(_box(G * 0.99, 0.1, G * 0.99, tierMats.steel, 0, 0.19, 0));
        // Diamond tread: short raised bars at alternating angles.
        for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) {
          const t = _box(0.16, 0.02, 0.045, tierMats.steelLight, -G / 2 + G / 6 * (i + 0.5), 0.245, -G / 2 + G / 6 * (k + 0.5));
          t.rotation.y = ((i + k) % 2 ? 1 : -1) * Math.PI / 4; t.castShadow = false;
          g.add(t);
        }
        for (let x = -G / 2 + 0.1; x < G / 2; x += 0.3) for (const z of [-G / 2 + 0.06, G / 2 - 0.06]) { g.add(_box(0.04, 0.02, 0.04, tierMats.rivet, x, 0.245, z)); g.add(_box(0.04, 0.02, 0.04, tierMats.rivet, z, 0.245, x)); }
        for (const sz of [-1, 1]) g.add(_box(G, 0.14, 0.14, tierMats.steelDark, 0, 0.07, sz * (G / 2 - 0.07)));
        for (const [sx, sz, w, d] of [[1, 0, 0.05, G], [-1, 0, 0.05, G], [0, 1, G, 0.05], [0, -1, G, 0.05]]) g.add(_box(w, 0.6, d, tierMats.steelDark, sx * (G / 2 - 0.03), -0.17, sz * (G / 2 - 0.03)));
      }
      return g;
    }`;

const REPLACE_TIER_FLOOR = `    // Floors: wood, stone flags, steel tread plate. Same top height and footprint.
    function makeTierFloorMesh(tier) {
      if (!tier) return makeFloorMesh();
      const g = new THREE.Group(), G = BUILD_GRID;
      if (tier === 1) {
        // Stone floor: recessed mortar bed, dressed stone perimeter kerbs, interlocking ashlar flagstones, and coursed stone skirt.
        g.add(_box(G * 0.99, 0.14, G * 0.99, tierMats.mortar, 0, 0.125, 0));
        // Perimeter stone kerb stones along all four edges.
        const kw = 0.12, innerSpan = G - kw * 2;
        for (let i = 0; i < 4; i++) {
          const pos = -G / 2 + (G / 4) * (i + 0.5), w = G / 4 - 0.02;
          const km = (i % 2 === 0) ? tierMats.stoneDark : tierMats.stone[1];
          g.add(_box(w, 0.065, kw - 0.01, km, pos, 0.218, -G / 2 + kw / 2));
          g.add(_box(w, 0.065, kw - 0.01, km, pos, 0.218, G / 2 - kw / 2));
          g.add(_box(kw - 0.01, 0.065, w, km, -G / 2 + kw / 2, 0.218, pos));
          g.add(_box(kw - 0.01, 0.065, w, km, G / 2 - kw / 2, 0.218, pos));
        }
        // Interlocking ashlar flagstones inside the kerb border, with bevelled top tables.
        const rows = 4, rh = innerSpan / rows;
        for (let r = 0; r < rows; r++) {
          const zc = -innerSpan / 2 + rh * (r + 0.5);
          const splits = (r % 2 === 0) ? [-0.88, -0.22, 0.34, 0.88] : [-0.88, -0.36, 0.20, 0.88];
          for (let c = 0; c < splits.length - 1; c++) {
            const x0 = splits[c], x1 = splits[c + 1], fw = (x1 - x0) - 0.028, xc = (x0 + x1) / 2;
            const fh = rh - 0.028;
            const m = tierMats.stone[Math.floor(_hash(r * 5 + c, c * 7 + r) * tierMats.stone.length) % tierMats.stone.length];
            const yJit = _hash(c, r) * 0.008;
            g.add(_box(fw, 0.062, fh, m, xc, 0.214 - yJit, zc));
            g.add(_box(fw - 0.04, 0.012, fh - 0.04, m, xc, 0.244 - yJit, zc));
          }
        }
        // Coursed stone foundation skirt with water-table ledge.
        for (const [sx, sz, w, d] of [[1, 0, 0.065, G], [-1, 0, 0.065, G], [0, 1, G, 0.065], [0, -1, G, 0.065]]) {
          g.add(_box(w, 0.6, d, tierMats.stoneDark, sx * (G / 2 - 0.032), -0.17, sz * (G / 2 - 0.032)));
          g.add(_box(sx ? 0.085 : G, 0.08, sz ? 0.085 : G, tierMats.stone[1], sx * (G / 2 - 0.04), 0.09, sz * (G / 2 - 0.04)));
        }
      } else {
        // Steel floor: dark steel frame & cross-seam grid, 4-quadrant armoured deck plates, central hatch, 5-bar diamond tread & rivets.
        g.add(_box(G * 0.99, 0.09, G * 0.99, tierMats.steelDark, 0, 0.185, 0));
        // Four quadrant steel deck plates leaving recessed seam grooves between them.
        const qw = G / 2 - 0.10;
        for (const qx of [-1, 1]) for (const qz of [-1, 1]) {
          g.add(_box(qw, 0.03, qw, tierMats.steel, qx * (G / 4 - 0.01), 0.232, qz * (G / 4 - 0.01)));
        }
        // Central armoured inspection hatch with bevelled frame.
        g.add(_box(0.42, 0.034, 0.42, tierMats.steelDark, 0, 0.233, 0));
        g.add(_box(0.36, 0.038, 0.36, tierMats.steelLight, 0, 0.235, 0));
        // Raised herringbone / diamond checker-plate lug pairs across the deck.
        for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) {
          const tx = -G / 2 + G / 6 * (i + 0.5), tz = -G / 2 + G / 6 * (k + 0.5);
          const ang = ((i + k) % 2 ? 1 : -1) * Math.PI / 4;
          for (const off of [-0.024, 0.024]) {
            const dx = Math.sin(ang) * off, dz = Math.cos(ang) * off;
            const t = _box(0.14, 0.014, 0.024, tierMats.steelLight, tx + dx, 0.248, tz + dz);
            t.rotation.y = ang; t.castShadow = false;
            g.add(t);
          }
        }
        // Perimeter channel frame, corner gusset plates, and hex rivet rows.
        for (const [sx, sz, w, d] of [[1, 0, 0.07, G], [-1, 0, 0.07, G], [0, 1, G, 0.07], [0, -1, G, 0.07]]) {
          g.add(_box(w, 0.04, d, tierMats.steelDark, sx * (G / 2 - 0.035), 0.232, sz * (G / 2 - 0.035)));
          g.add(_box(w, 0.6, d, tierMats.steelDark, sx * (G / 2 - 0.035), -0.17, sz * (G / 2 - 0.035)));
        }
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          g.add(_box(0.22, 0.042, 0.22, tierMats.steelDark, sx * (G / 2 - 0.11), 0.234, sz * (G / 2 - 0.11)));
        }
        for (let x = -G / 2 + 0.12; x < G / 2; x += 0.26) {
          for (const z of [-G / 2 + 0.05, G / 2 - 0.05]) {
            g.add(_box(0.036, 0.018, 0.036, tierMats.rivet, x, 0.248, z));
            g.add(_box(0.036, 0.018, 0.036, tierMats.rivet, z, 0.248, x));
          }
        }
        for (const sz of [-1, 0, 1]) g.add(_box(G, 0.14, 0.14, tierMats.steelDark, 0, 0.07, sz * (G / 2 - 0.07)));
      }
      return g;
    }`;

replaceExact('makeTierFloorMesh', TARGET_TIER_FLOOR_AND_DECORATE, REPLACE_TIER_FLOOR);

const TARGET_DECORATE_BARRICADE_SANDBAG = `      if (kind === 'barricade') {
        if (tier === 1) {
          add(_box(S, 0.5, 0.1, tierMats.steel, 0, 0.2, 0.02));                                    // welded plate along the bottom
          const d = Math.hypot(S / 2 - 0.1, BARRICADE_TOP - 0.5);
          for (const sgn of [1, -1]) { const br = add(_box(d, 0.1, 0.1, tierMats.steelDark, 0, (BARRICADE_TOP + 0.35) / 2, -0.06)); br.rotation.z = sgn * Math.atan2(BARRICADE_TOP - 0.5, S / 2 - 0.1); }
          for (let x = -S / 2 + 0.2; x < S / 2; x += 0.4) add(_box(0.05, 0.05, 0.05, tierMats.rivet, x, 0.42, 0.08));
        } else {
          // Czech hedgehog: three crossed beams on a rail.
          hideBuilt(mesh);
          add(_box(S, 0.12, 0.12, tierMats.steelDark, 0, 0.06, 0));
          for (const cx of [-S / 3, 0, S / 3]) {
            for (const [rz, rx] of [[0.9, 0], [-0.9, 0], [0, 0.9]]) {
              const beam = add(_box(0.11, 1.5, 0.11, tierMats.steel, cx, 0.6, 0));
              beam.rotation.z = rz; beam.rotation.x = rx;
            }
            add(_box(0.16, 0.16, 0.16, tierMats.rivet, cx, 0.6, 0));
          }
        }
      } else if (kind === 'sandbag') {
        if (tier === 1) {
          const rh = SANDBAG_TOP / 4;
          for (let i = 0; i < 4; i++) add(_box(S / 4 - 0.04, rh * 0.9, 0.5, sandbagMat, -S / 2 + S / 4 * (i + 0.5) + (i % 2 ? 0.04 : -0.04), SANDBAG_TOP + rh / 2, 0));
          add(_box(S, 0.08, 0.56, tierMats.wood, 0, SANDBAG_TOP + rh + 0.04, 0));                  // plank along the top
        } else {
          // Gabions: wire baskets packed with rock.
          hideBuilt(mesh);
          for (const cx of [-S / 3, 0, S / 3]) {
            add(_box(S / 3 - 0.03, 1.15, 0.62, tierMats.stone[1], cx, 0.575, 0));
            for (const y of [0.12, 0.45, 0.78, 1.1]) add(_box(S / 3 - 0.02, 0.035, 0.66, tierMats.steelDark, cx, y, 0));
            for (const dx of [-0.28, 0, 0.28]) add(_box(0.035, 1.15, 0.66, tierMats.steelDark, cx + dx, 0.575, 0));
            add(_box(S / 3 - 0.06, 0.1, 0.5, tierMats.stone[2], cx, 1.18, 0));                     // rock spilling over
          }
        }
      }`;

const REPLACE_DECORATE_BARRICADE_SANDBAG = `      if (kind === 'barricade') {
        if (tier === 1) {
          // Braced barricade: overlapped front ballistic shield plates, firing notch, rear diagonal compression struts & rivet rows.
          add(_box(S - 0.06, 0.48, 0.07, tierMats.steel, 0, 0.28, 0.095));
          add(_box(S - 0.14, 0.42, 0.06, tierMats.steelLight, 0, 0.76, 0.105));
          // Left and right upper ballistic shield cheeks with central firing/vision cutout.
          for (const sx of [-1, 1]) {
            const g = add(_box(S * 0.36, 0.24, 0.055, tierMats.steelDark, sx * (S * 0.28), 1.10, 0.10));
            g.rotation.x = -0.18;
          }
          // Vertical armour seam straps on the front shield.
          for (const vx of [-0.62, 0, 0.62]) add(_box(0.07, 0.92, 0.04, tierMats.steelDark, vx, 0.52, 0.13));
          // Rear diagonal steel X-brace & compression struts anchored to footplates.
          const d = Math.hypot(S / 2 - 0.1, BARRICADE_TOP - 0.5);
          for (const sgn of [1, -1]) {
            const br = add(_box(d, 0.1, 0.09, tierMats.steelDark, 0, (BARRICADE_TOP + 0.35) / 2, -0.07));
            br.rotation.z = sgn * Math.atan2(BARRICADE_TOP - 0.5, S / 2 - 0.1);
          }
          for (const sx of [-0.64, 0.64]) {
            const strut = add(_box(0.08, 1.12, 0.08, tierMats.steelDark, sx, 0.54, -0.18));
            strut.rotation.x = 0.28;
            add(_box(0.18, 0.05, 0.22, tierMats.steelDark, sx, 0.025, -0.32));
          }
          for (let x = -S / 2 + 0.16; x < S / 2; x += 0.28) {
            for (const ry of [0.14, 0.46, 0.62, 0.92]) add(_box(0.045, 0.045, 0.035, tierMats.rivet, x, ry, 0.14));
          }
        } else {
          // Czech hedgehog: three massive structural I-beam anti-tank hedgehogs on a welded steel ground skid frame.
          hideBuilt(mesh);
          add(_box(S, 0.48, 0.24, tierMats.steelDark, 0, -0.18, 0));                               // buried slope skirt
          for (const sz of [-0.14, 0.14]) add(_box(S, 0.09, 0.09, tierMats.steelDark, 0, 0.05, sz));
          for (let x = -S / 2 + 0.16; x < S / 2; x += 0.42) add(_box(0.10, 0.07, 0.36, tierMats.iron, x, 0.04, 0));
          add(_box(S - 0.2, 0.07, 0.07, tierMats.steelDark, 0, 0.62, 0));                          // longitudinal spine bar
          for (const cx of [-S / 3, 0, S / 3]) {
            const axes = [[0.86, 0, 0.12], [-0.86, 0, -0.12], [0.08, 0.88, 0]];
            for (const [rz, rx, ry] of axes) {
              const bGrp = new THREE.Group();
              bGrp.position.set(cx, 0.62, 0);
              bGrp.rotation.set(rx, ry, rz);
              // Structural I-beam: central web + twin flanges + bevelled spear tips at both ends.
              const len = 1.54;
              bGrp.add(_box(0.038, len, 0.11, tierMats.steelDark, 0, 0, 0));
              for (const fx of [-1, 1]) bGrp.add(_box(0.032, len - 0.08, 0.135, tierMats.steel, fx * 0.048, 0, 0));
              for (const ey of [-1, 1]) {
                const cap = _box(0.09, 0.11, 0.09, tierMats.steelLight, 0, ey * (len / 2 - 0.02), 0);
                cap.rotation.z = Math.PI / 4;
                bGrp.add(cap);
              }
              add(bGrp);
            }
            // Central 3-axis welded gusset box with corner rivets.
            add(_box(0.24, 0.24, 0.24, tierMats.steelDark, cx, 0.62, 0));
            add(_box(0.28, 0.10, 0.28, tierMats.iron, cx, 0.62, 0));
            for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
              add(_box(0.042, 0.042, 0.042, tierMats.rivet, cx + sx * 0.11, 0.62 + sy * 0.11, sz * 0.11));
            }
          }
        }
      } else if (kind === 'sandbag') {
        if (tier === 1) {
          // Double-stacked sandbags: 5th plump burlap crest course, base buttress bags, and strapped timber duckboard cap.
          const rh = SANDBAG_TOP / 4;
          for (let i = 0; i < 4; i++) {
            const bm = tierMats.burlap[(i + 2) % tierMats.burlap.length];
            const bx = -S / 2 + S / 4 * (i + 0.5), by = SANDBAG_TOP + rh * 0.48, bz = (i % 2 ? 0.025 : -0.025);
            add(_rbox(S / 4 * 0.95, rh * 0.94, 0.48, 0.06, bm, bx, by, bz));
            add(_box(0.032, rh * 0.86, 0.45, tierMats.burlapDark, bx, by, bz));
          }
          // Angled lower buttress sandbags along front and back base for extra embankment mass.
          for (let i = 0; i < 3; i++) {
            const bx = -S / 3 + (S / 3) * i;
            for (const fz of [-1, 1]) {
              const butt = add(_rbox(0.54, 0.22, 0.28, 0.05, tierMats.burlap[(i + (fz > 0 ? 1 : 0)) % tierMats.burlap.length], bx, 0.16, fz * 0.23));
              butt.rotation.x = -fz * 0.28;
            }
          }
          // Two-plank timber firing-step / duckboard cap with cross-cleats and bolted iron tie-down straps.
          const topY = SANDBAG_TOP + rh + 0.035;
          add(_box(S, 0.065, 0.25, tierMats.woodPlanks[0], 0, topY, -0.135));
          add(_box(S, 0.065, 0.25, tierMats.woodPlanks[2], 0, topY, 0.135));
          for (const sx of [-0.72, 0, 0.72]) {
            add(_box(0.09, 0.085, 0.56, tierMats.woodPost, sx, topY - 0.005, 0));
            add(_box(0.05, 0.14, 0.58, tierMats.steelDark, sx, topY - 0.02, 0));
            for (const fz of [-0.2, 0.2]) add(_box(0.04, 0.03, 0.04, tierMats.rivet, sx, topY + 0.048, fz));
          }
        } else {
          // Gabions: three heavy galvanized wire-mesh cages packed with multi-tone rough-quarried rock cobbles.
          hideBuilt(mesh);
          add(_box(S, 0.42, 0.58, tierMats.stoneDark, 0, -0.18, 0));                               // buried foundation curb
          add(_box(S, 0.06, 0.66, tierMats.steelDark, 0, 0.03, 0));
          const bw = S / 3;
          for (let b = 0; b < 3; b++) {
            const cx = -S / 3 + b * bw, cw = bw - 0.025, ch = 1.16, cd = 0.62;
            // Dark mortar/rubble core recessed slightly inside the wire cage.
            add(_box(cw - 0.07, ch - 0.06, cd - 0.08, tierMats.mortar, cx, ch / 2 + 0.02, 0));
            // Individual multi-tone rough-quarried rock cobbles pressing out against the wire mesh.
            for (let ry = 0; ry < 4; ry++) {
              const y = 0.17 + ry * 0.265;
              for (let rx = 0; rx < 3; rx++) {
                const x = cx + (rx - 1) * (cw * 0.31);
                for (const fz of [-1, 1]) {
                  const h1 = _hash(b * 19 + ry * 7 + rx, fz * 13 + ry);
                  const h2 = _hash(rx * 29 + b, ry * 11 + 5);
                  const sm = tierMats.stone[Math.floor(h1 * tierMats.stone.length) % tierMats.stone.length];
                  const rock = add(_rbox(0.19 + h1 * 0.04, 0.22 + h2 * 0.03, 0.22, 0.045, sm, x + (h2 - 0.5) * 0.02, y, fz * 0.185));
                  rock.rotation.set((h1 - 0.5) * 0.16, (h2 - 0.5) * 0.18, (h1 - h2) * 0.14);
                }
              }
            }
            // Heaped crown of boulders spilling across the top of each gabion basket.
            for (let tx = -1; tx <= 1; tx++) for (const tz of [-0.14, 0.14]) {
              const h = _hash(b * 13 + tx, tz * 31);
              const sm = tierMats.stone[Math.floor(h * tierMats.stone.length) % tierMats.stone.length];
              const topRock = add(_rbox(0.20, 0.13 + h * 0.04, 0.24, 0.04, sm, cx + tx * 0.19, ch + 0.03, tz));
              topRock.rotation.set((h - 0.5) * 0.2, h * 0.3, 0);
            }
            // Structural corner angle posts and horizontal steel frame hoops.
            for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
              add(_box(0.045, ch + 0.04, 0.045, tierMats.steelDark, cx + sx * (cw / 2 - 0.01), ch / 2 + 0.02, sz * (cd / 2 - 0.01)));
              add(_box(0.055, 0.055, 0.055, tierMats.rivet, cx + sx * (cw / 2 - 0.01), ch + 0.04, sz * (cd / 2 - 0.01)));
            }
            for (const y of [0.06, 0.34, 0.62, 0.90, 1.16]) {
              for (const sz of [-1, 1]) add(_box(cw + 0.01, 0.032, 0.032, tierMats.steelDark, cx, y, sz * (cd / 2)));
              for (const sx of [-1, 1]) add(_box(0.032, 0.032, cd + 0.01, tierMats.steelDark, cx + sx * (cw / 2), y, 0));
            }
            // Welded galvanized wire mesh grid bars across front, back, and top.
            for (let wx = -2; wx <= 2; wx++) {
              const x = cx + wx * (cw * 0.20);
              for (const sz of [-1, 1]) add(_box(0.018, ch, 0.018, tierMats.steelLight, x, ch / 2 + 0.02, sz * (cd / 2 + 0.006)));
              add(_box(0.018, 0.018, cd, tierMats.steelLight, x, ch + 0.05, 0));
            }
            for (let wy = 0; wy < 4; wy++) {
              const y = 0.20 + wy * 0.28;
              for (const sz of [-1, 1]) add(_box(cw, 0.016, 0.016, tierMats.steelLight, cx, y, sz * (cd / 2 + 0.006)));
            }
          }
        }
      }`;

replaceExact('decoratePiece barricade and sandbag', TARGET_DECORATE_BARRICADE_SANDBAG, REPLACE_DECORATE_BARRICADE_SANDBAG);

// ---------------------------------------------------------------------------
// 6. SKELETAL MARINE & BONE RAFT (REM, remBone, remSkull, remTorso, remBoot, makeSkeletalMarine)
// ---------------------------------------------------------------------------
const TARGET_SKELETAL = `    const REM = {
      bone: new THREE.MeshStandardMaterial({ color: 0xcdc6ae, roughness: 0.84, metalness: 0.03 }),
      boneWet: new THREE.MeshStandardMaterial({ color: 0x9d8b72, roughness: 0.52, metalness: 0.06 }),
      socket: new THREE.MeshStandardMaterial({ color: 0x0b0908, roughness: 1 }),
      gristle: new THREE.MeshStandardMaterial({ color: 0x6b2120, roughness: 0.42, metalness: 0.08 }),
      // Camo at this size is three or four shades of scrap, not a printed pattern — a
      // 256px woodland tile on a 6cm rag is mud with extra steps.
      rags: [
        new THREE.MeshStandardMaterial({ color: 0x4e5733, roughness: 1, side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ color: 0x5d4a2f, roughness: 1, side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ color: 0x323a24, roughness: 1, side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ color: 0x2a231c, roughness: 1, side: THREE.DoubleSide })
      ],
      strap: new THREE.MeshStandardMaterial({ color: 0x24261c, roughness: 0.95 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x8b8d86, roughness: 0.4, metalness: 0.7 })
    };
    // One bone: a tapered shaft with a knuckle on each end, lying along +y from its base.
    function remBone(len, r, mat = REM.bone) {
      const g = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.8, len, 6), mat);
      shaft.position.y = len * 0.5;
      g.add(shaft);
      for (const y of [0, len]) {
        const k = new THREE.Mesh(new THREE.SphereGeometry(r * 1.35, 6, 5), mat);
        k.position.y = y;
        k.scale.set(1, 0.8, 1.05);
        g.add(k);
      }
      return g;
    }
    function remSkull(s = 1) {
      const g = new THREE.Group();
      const cran = new THREE.Mesh(new THREE.SphereGeometry(0.11 * s, 8, 6), REM.bone);
      cran.scale.set(0.94, 1, 1.12);
      g.add(cran);
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.13 * s, 0.09 * s, 0.08 * s), REM.bone);
      face.position.set(0, -0.055 * s, 0.1 * s);
      g.add(face);
      for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.031 * s, 6, 5), REM.socket);
        eye.position.set(sx * 0.045 * s, -0.012 * s, 0.108 * s);
        eye.scale.set(1, 0.9, 0.6);
        g.add(eye);
      }
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.022 * s, 0.03 * s, 0.02 * s), REM.socket);
      nose.position.set(0, -0.055 * s, 0.14 * s);
      g.add(nose);
      // Jaw on its own pivot at the hinge, so it can hang open and swing.
      const jaw = new THREE.Group();
      jaw.position.set(0, -0.05 * s, 0.02 * s);
      const jawBone = new THREE.Mesh(new THREE.BoxGeometry(0.115 * s, 0.035 * s, 0.11 * s), REM.bone);
      jawBone.position.set(0, -0.04 * s, 0.062 * s);
      jaw.add(jawBone);
      for (const sx of [-1, 1]) {
        const ramus = new THREE.Mesh(new THREE.BoxGeometry(0.02 * s, 0.06 * s, 0.022 * s), REM.bone);
        ramus.position.set(sx * 0.05 * s, -0.015 * s, 0.012 * s);
        jaw.add(ramus);
      }
      g.add(jaw);
      g.userData.jaw = jaw;
      return g;
    }
    // Ribcage and pelvis on one spine. Returns the group; ribs are arcs, not a barrel,
    // so you can see through it — which is most of why a ribcage reads as a ribcage.
    function remTorso(s = 1) {
      const g = new THREE.Group();
      for (let i = 0; i < 7; i++) {
        const t = i / 6;
        const rr = (0.145 - t * 0.035) * s;
        const rib = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.014 * s, 4, 9, Math.PI * 1.15), REM.bone);
        rib.rotation.set(Math.PI / 2, 0, Math.PI * 0.42);
        rib.position.set(0, (0.34 - i * 0.055) * s, 0.012 * s);
        rib.scale.set(1, 1, 0.78);
        g.add(rib);
      }
      for (let i = 0; i < 9; i++) {
        const v = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.035 * s, 0.045 * s), REM.bone);
        v.position.set(0, (0.4 - i * 0.055) * s, -0.085 * s);
        g.add(v);
      }
      const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.2 * s, 0.022 * s), REM.bone);
      sternum.position.set(0, 0.25 * s, 0.105 * s);
      g.add(sternum);
      for (const sx of [-1, 1]) {
        const clav = new THREE.Mesh(new THREE.CylinderGeometry(0.014 * s, 0.014 * s, 0.14 * s, 5), REM.bone);
        clav.position.set(sx * 0.075 * s, 0.375 * s, 0.05 * s);
        clav.rotation.set(0, 0, Math.PI / 2 - sx * 0.35);
        g.add(clav);
      }
      const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.09 * s, 0.13 * s), REM.bone);
      pelvis.position.y = -0.1 * s;
      g.add(pelvis);
      for (const sx of [-1, 1]) {
        const ilium = new THREE.Mesh(new THREE.BoxGeometry(0.06 * s, 0.11 * s, 0.1 * s), REM.bone);
        ilium.position.set(sx * 0.1 * s, -0.055 * s, 0);
        ilium.rotation.z = sx * 0.22;
        g.add(ilium);
      }
      return g;
    }
    // A hanging scrap. Thin boxes rather than planes so it still catches the light from
    // the side when the body tumbles.
    function remRag(w, h, mat) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.006), mat);
      m.castShadow = false;
      return m;
    }
    function remBlood(r, flat = 0.3) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), REM.gristle);
      m.scale.set(1, flat, 1);
      return m;
    }

    // The body the guardian throws back out: skeletonised, still wet, with what is left
    // of the uniform hanging off it. Limbs are on pivots so the throw can make them
    // trail and the landing can let them fold.
    function makeSkeletalMarine() {
      const g = new THREE.Group();
      const s = 1.0;
      const rag = (i) => REM.rags[i % REM.rags.length];
      const spine = new THREE.Group();
      spine.position.y = 0.95;
      g.add(spine);
      const torso = remTorso(s);
      spine.add(torso);
      // Shreds of the shirt still caught on the ribs and webbing straps gone slack.
      for (let i = 0; i < 7; i++) {
        const w = 0.07 + Math.random() * 0.1, h = 0.1 + Math.random() * 0.16;
        const r = remRag(w, h, rag(i));
        const a = Math.random() * Math.PI * 2;
        r.position.set(Math.cos(a) * 0.12, 0.3 - Math.random() * 0.38, Math.sin(a) * 0.1);
        r.rotation.set((Math.random() - 0.5) * 0.5, a, (Math.random() - 0.5) * 0.7);
        spine.add(r);
      }
      const strapA = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.42, 0.012), REM.strap);
      strapA.position.set(-0.06, 0.16, 0.1); strapA.rotation.z = 0.24;
      spine.add(strapA);
      const strapB = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.3, 0.012), REM.strap);
      strapB.position.set(0.08, 0.1, 0.1); strapB.rotation.z = -0.4;
      spine.add(strapB);
      // Dog tags on a chain: one small bright thing in all that bone.
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.006), REM.steel);
      tag.position.set(0.01, 0.13, 0.13);
      spine.add(tag);
      spine.add(remBlood(0.1, 0.5).translateY(-0.04).translateZ(0.06));

      const neck = new THREE.Group();
      neck.position.y = 0.44 * s;
      spine.add(neck);
      const skull = remSkull(s);
      skull.position.y = 0.1 * s;
      skull.rotation.x = 0.5;                       // head fallen back off the spine
      neck.add(skull);
      const gore = remBlood(0.055, 0.8);
      gore.position.y = 0.02;
      neck.add(gore);

      const limbs = {};
      for (const sx of [-1, 1]) {
        const k = sx < 0 ? 'L' : 'R';
        const upper = new THREE.Group();
        upper.position.set(sx * 0.135 * s, 0.35 * s, 0.02);
        upper.rotation.z = sx * 0.2;
        upper.add(remBone(0.3 * s, 0.026 * s));
        // Humerus hangs down: the bone is modelled +y, so flip the group over.
        upper.rotation.x = Math.PI;
        const fore = new THREE.Group();
        fore.position.y = 0.3 * s;
        const foreBone = remBone(0.26 * s, 0.021 * s);
        fore.add(foreBone);
        const hand = new THREE.Group();
        hand.position.y = 0.26 * s;
        for (let f = 0; f < 4; f++) {
          const fing = new THREE.Mesh(new THREE.BoxGeometry(0.013 * s, 0.07 * s, 0.013 * s), REM.bone);
          fing.position.set((f - 1.5) * 0.017 * s, 0.035 * s, 0);
          fing.rotation.x = -0.3 - f * 0.12;
          hand.add(fing);
        }
        fore.add(hand);
        upper.add(fore);
        spine.add(upper);
        limbs['arm' + k] = upper;
        limbs['fore' + k] = fore;

        const leg = new THREE.Group();
        leg.position.set(sx * 0.085 * s, -0.12 * s, 0);
        leg.rotation.x = Math.PI;                    // femur hangs down
        leg.add(remBone(0.42 * s, 0.032 * s));
        const shin = new THREE.Group();
        shin.position.y = 0.42 * s;
        shin.add(remBone(0.38 * s, 0.026 * s));
        // The boots outlasted him. One is still laced on.
        const boot = new THREE.Group();
        boot.position.y = 0.38 * s;
        if (sx > 0) {
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.11 * s, 0.1 * s, 0.24 * s), REM.strap);
          b.position.set(0, 0.03 * s, 0.04 * s);
          boot.add(b);
          const sole = new THREE.Mesh(new THREE.BoxGeometry(0.115 * s, 0.022 * s, 0.26 * s), REM.socket);
          sole.position.set(0, -0.02 * s, 0.045 * s);
          boot.add(sole);
        } else {
          for (let f = 0; f < 3; f++) {
            const t = new THREE.Mesh(new THREE.BoxGeometry(0.018 * s, 0.016 * s, 0.07 * s), REM.bone);
            t.position.set((f - 1) * 0.022 * s, 0, 0.04 * s);
            boot.add(t);
          }
        }
        boot.rotation.x = Math.PI;                   // undo the femur flip for the foot
        shin.add(boot);
        // Trouser shreds round the thigh and the knee.
        for (let i = 0; i < 2; i++) {
          const r = remRag(0.1 + Math.random() * 0.06, 0.14 + Math.random() * 0.1, rag(i + sx + 2));
          r.position.set(sx * 0.04, 0.12 + i * 0.16, 0.03 * (i ? -1 : 1));
          r.rotation.set(0.2, sx * 0.6, (Math.random() - 0.5) * 0.5);
          leg.add(r);
        }
        leg.add(shin);
        spine.add(leg);
        limbs['leg' + k] = leg;
        limbs['shin' + k] = shin;
      }
      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
      g.userData.parts = limbs;
      g.userData.spine = spine;
      g.userData.neck = neck;
      g.userData.skull = skull;
      g.userData.jaw = skull.userData.jaw;
      g.userData.mats = [];          // REM materials are shared; the prop owns no material
      return g;
    }`;

const REPLACE_SKELETAL = `    const REM = {
      bone: new THREE.MeshStandardMaterial({ color: 0xcdc6ae, roughness: 0.82, metalness: 0.03 }),
      boneDark: new THREE.MeshStandardMaterial({ color: 0xb4ab90, roughness: 0.88, metalness: 0.04 }),
      boneWet: new THREE.MeshStandardMaterial({ color: 0x9d8b72, roughness: 0.52, metalness: 0.06 }),
      tooth: new THREE.MeshStandardMaterial({ color: 0xe4decb, roughness: 0.45, metalness: 0.05 }),
      cartilage: new THREE.MeshStandardMaterial({ color: 0x85755d, roughness: 0.68, metalness: 0.04 }),
      socket: new THREE.MeshStandardMaterial({ color: 0x0b0908, roughness: 1 }),
      gristle: new THREE.MeshStandardMaterial({ color: 0x6b2120, roughness: 0.38, metalness: 0.1 }),
      // Camo at this size is three or four shades of scrap, not a printed pattern — a
      // 256px woodland tile on a 6cm rag is mud with extra steps.
      rags: [
        new THREE.MeshStandardMaterial({ color: 0x4e5733, roughness: 1, side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ color: 0x5d4a2f, roughness: 1, side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ color: 0x323a24, roughness: 1, side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ color: 0x2a231c, roughness: 1, side: THREE.DoubleSide })
      ],
      flak: new THREE.MeshStandardMaterial({ color: 0x3b4429, roughness: 0.92, side: THREE.DoubleSide }),
      strap: new THREE.MeshStandardMaterial({ color: 0x24261c, roughness: 0.95 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x9a9e96, roughness: 0.32, metalness: 0.78 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xa68336, roughness: 0.38, metalness: 0.72 })
    };
    // Anatomical long bone: slender diaphysis shaft, flared metaphyses, and dual-condyle epiphyses at both ends.
    function remBone(len, r, mat = REM.bone) {
      const g = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.66, r * 0.72, len * 0.84, 7), mat);
      shaft.position.y = len * 0.5;
      g.add(shaft);
      for (const [y, dir] of [[0, 1], [len, -1]]) {
        const meta = new THREE.Mesh(new THREE.CylinderGeometry(
          dir > 0 ? r * 0.72 : r * 1.12,
          dir > 0 ? r * 1.12 : r * 0.72,
          len * 0.16, 7
        ), mat);
        meta.position.y = y + dir * (len * 0.08);
        g.add(meta);
        for (const cx of [-0.42, 0.42]) {
          const cond = new THREE.Mesh(new THREE.SphereGeometry(r * 0.95, 6, 5), mat);
          cond.position.set(cx * r, y, 0);
          cond.scale.set(0.95, 0.82, 1.15);
          g.add(cond);
        }
      }
      return g;
    }
    // Anatomical human skull with cranium vault, supraorbital brow ridges, zygomatic arches, nasal septum,
    // upper maxilla teeth, and hinged mandible (jaw) with lower dentition and rami.
    function remSkull(s = 1) {
      const g = new THREE.Group();
      const cran = new THREE.Mesh(new THREE.SphereGeometry(0.108 * s, 10, 8), REM.bone);
      cran.scale.set(0.92, 0.98, 1.14);
      cran.position.set(0, 0.012 * s, -0.008 * s);
      g.add(cran);
      const occip = new THREE.Mesh(new THREE.SphereGeometry(0.078 * s, 8, 6), REM.boneDark);
      occip.position.set(0, -0.015 * s, -0.055 * s);
      g.add(occip);
      // Recessed temporal fossae on the sides of the cranium.
      for (const sx of [-1, 1]) {
        const temp = new THREE.Mesh(new THREE.SphereGeometry(0.045 * s, 6, 5), REM.boneDark);
        temp.position.set(sx * 0.086 * s, 0.005 * s, 0.025 * s);
        temp.scale.set(0.35, 0.85, 1.1);
        g.add(temp);
      }
      // Supraorbital brow ridges and glabella.
      const glabella = new THREE.Mesh(new THREE.BoxGeometry(0.036 * s, 0.022 * s, 0.028 * s), REM.bone);
      glabella.position.set(0, 0.014 * s, 0.106 * s);
      g.add(glabella);
      for (const sx of [-1, 1]) {
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.056 * s, 0.018 * s, 0.032 * s), REM.bone);
        brow.position.set(sx * 0.042 * s, 0.016 * s, 0.102 * s);
        brow.rotation.set(0.12, -sx * 0.22, -sx * 0.14);
        g.add(brow);
      }
      // Eye sockets (orbits) and zygomatic cheekbones + arches.
      for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.031 * s, 7, 6), REM.socket);
        eye.position.set(sx * 0.043 * s, -0.012 * s, 0.102 * s);
        eye.scale.set(1.02, 0.9, 0.65);
        g.add(eye);
        const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.038 * s, 0.028 * s, 0.042 * s), REM.bone);
        cheek.position.set(sx * 0.064 * s, -0.034 * s, 0.088 * s);
        cheek.rotation.y = -sx * 0.32;
        g.add(cheek);
        const zygArch = new THREE.Mesh(new THREE.BoxGeometry(0.014 * s, 0.016 * s, 0.068 * s), REM.boneDark);
        zygArch.position.set(sx * 0.088 * s, -0.032 * s, 0.048 * s);
        zygArch.rotation.y = sx * 0.14;
        g.add(zygArch);
      }
      // Upper facial maxilla, nasal bridge, piriform nasal cavity and nasal septum.
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.104 * s, 0.056 * s, 0.072 * s), REM.bone);
      face.position.set(0, -0.048 * s, 0.086 * s);
      g.add(face);
      const nasalBridge = new THREE.Mesh(new THREE.BoxGeometry(0.018 * s, 0.028 * s, 0.024 * s), REM.bone);
      nasalBridge.position.set(0, -0.012 * s, 0.118 * s);
      nasalBridge.rotation.x = -0.35;
      g.add(nasalBridge);
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.026 * s, 0.032 * s, 0.026 * s), REM.socket);
      nose.position.set(0, -0.036 * s, 0.118 * s);
      g.add(nose);
      const septum = new THREE.Mesh(new THREE.BoxGeometry(0.004 * s, 0.028 * s, 0.02 * s), REM.boneDark);
      septum.position.set(0, -0.036 * s, 0.122 * s);
      g.add(septum);
      // Maxillary alveolar ridge and 8 individual upper teeth.
      const gumUp = new THREE.Mesh(new THREE.BoxGeometry(0.084 * s, 0.016 * s, 0.058 * s), REM.boneDark);
      gumUp.position.set(0, -0.072 * s, 0.094 * s);
      g.add(gumUp);
      for (let t = 0; t < 8; t++) {
        const u = (t - 3.5) / 3.5;
        const tx = u * 0.036 * s, tz = (0.122 - u * u * 0.026) * s;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.0085 * s, 0.016 * s, 0.0085 * s), REM.tooth);
        tooth.position.set(tx, -0.084 * s, tz);
        g.add(tooth);
      }
      // Jaw (mandible) on its own pivot at the TMJ hinge, slightly ajar by default so it reads in the inspector.
      const jaw = new THREE.Group();
      jaw.position.set(0, -0.05 * s, 0.02 * s);
      jaw.rotation.x = 0.28;
      const chin = new THREE.Mesh(new THREE.BoxGeometry(0.052 * s, 0.028 * s, 0.032 * s), REM.bone);
      chin.position.set(0, -0.044 * s, 0.092 * s);
      jaw.add(chin);
      for (const sx of [-1, 1]) {
        const corpus = new THREE.Mesh(new THREE.BoxGeometry(0.024 * s, 0.026 * s, 0.082 * s), REM.bone);
        corpus.position.set(sx * 0.034 * s, -0.042 * s, 0.054 * s);
        corpus.rotation.y = -sx * 0.24;
        jaw.add(corpus);
        const ramus = new THREE.Mesh(new THREE.BoxGeometry(0.018 * s, 0.058 * s, 0.028 * s), REM.boneDark);
        ramus.position.set(sx * 0.048 * s, -0.016 * s, 0.014 * s);
        ramus.rotation.x = 0.18;
        jaw.add(ramus);
        // Wet masseter tendon strand inside the jaw hinge.
        const tendon = new THREE.Mesh(new THREE.CylinderGeometry(0.005 * s, 0.004 * s, 0.045 * s, 5), REM.gristle);
        tendon.position.set(sx * 0.042 * s, -0.012 * s, 0.038 * s);
        tendon.rotation.x = -0.35;
        jaw.add(tendon);
      }
      for (let t = 0; t < 8; t++) {
        const u = (t - 3.5) / 3.5;
        const tx = u * 0.033 * s, tz = (0.098 - u * u * 0.024) * s;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.008 * s, 0.015 * s, 0.008 * s), REM.tooth);
        tooth.position.set(tx, -0.026 * s, tz);
        jaw.add(tooth);
      }
      g.add(jaw);
      g.userData.jaw = jaw;
      return g;
    }
    // Anatomical ribcage, articulated thoracic/lumbar spine, sternum, scapulae, clavicles, and pelvic girdle.
    function remTorso(s = 1) {
      const g = new THREE.Group();
      // Articulated spine: 11 vertebral centra, dark intervertebral discs, spinous and transverse processes.
      for (let i = 0; i < 11; i++) {
        const vy = (0.41 - i * 0.048) * s, vz = (-0.082 + Math.sin((i / 10) * Math.PI) * 0.014) * s;
        const vw = (0.042 + (i / 10) * 0.014) * s;
        const centrum = new THREE.Mesh(new THREE.CylinderGeometry(vw * 0.52, vw * 0.55, 0.032 * s, 7), REM.bone);
        centrum.position.set(0, vy, vz);
        g.add(centrum);
        if (i < 10) {
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(vw * 0.48, vw * 0.48, 0.014 * s, 7), REM.cartilage);
          disc.position.set(0, vy - 0.023 * s, vz);
          g.add(disc);
        }
        const spinous = new THREE.Mesh(new THREE.BoxGeometry(0.014 * s, 0.022 * s, 0.038 * s), REM.boneDark);
        spinous.position.set(0, vy - 0.006 * s, vz - 0.028 * s);
        spinous.rotation.x = 0.42;
        g.add(spinous);
        const trans = new THREE.Mesh(new THREE.BoxGeometry(vw * 1.65, 0.014 * s, 0.016 * s), REM.boneDark);
        trans.position.set(0, vy, vz - 0.01 * s);
        g.add(trans);
      }
      // 9 pairs of curved ribs (7 true ribs with costal cartilage to the sternum, 2 lower false/floating ribs).
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const ry = (0.37 - i * 0.042) * s;
        const rr = (0.118 + Math.sin(t * Math.PI * 0.85) * 0.034 - t * 0.022) * s;
        const arc = (i < 7 ? 1.24 : 0.92) * Math.PI;
        const rib = new THREE.Mesh(new THREE.TorusGeometry(rr, (0.013 - t * 0.002) * s, 5, 11, arc), i % 2 ? REM.bone : REM.boneDark);
        rib.rotation.set(Math.PI / 2 + 0.16, 0, Math.PI * 0.5 - arc * 0.5);
        rib.position.set(0, ry, 0.008 * s);
        rib.scale.set(1.06, 0.82, 1);
        g.add(rib);
        if (i < 7) {
          for (const sx of [-1, 1]) {
            const cart = new THREE.Mesh(new THREE.BoxGeometry(0.048 * s, 0.014 * s, 0.016 * s), REM.cartilage);
            cart.position.set(sx * 0.044 * s, ry + (i > 3 ? (i - 3) * 0.012 : 0) * s, (0.098 - Math.abs(i - 3) * 0.004) * s);
            cart.rotation.set(0, sx * 0.28, -sx * (0.1 + i * 0.05));
            g.add(cart);
          }
        }
      }
      // Sternum: manubrium, sternal body (gladiolus), and pointed xiphoid process.
      const manubrium = new THREE.Mesh(new THREE.BoxGeometry(0.064 * s, 0.052 * s, 0.022 * s), REM.bone);
      manubrium.position.set(0, 0.355 * s, 0.098 * s);
      manubrium.rotation.x = -0.14;
      g.add(manubrium);
      const gladiolus = new THREE.Mesh(new THREE.BoxGeometry(0.044 * s, 0.135 * s, 0.02 * s), REM.bone);
      gladiolus.position.set(0, 0.258 * s, 0.108 * s);
      g.add(gladiolus);
      const xiphoid = new THREE.Mesh(new THREE.ConeGeometry(0.016 * s, 0.042 * s, 4), REM.cartilage);
      xiphoid.position.set(0, 0.172 * s, 0.106 * s);
      xiphoid.rotation.x = Math.PI;
      g.add(xiphoid);
      // S-curved clavicles and dorsal scapulae (shoulder blades with scapular spine and glenoid socket).
      for (const sx of [-1, 1]) {
        const clav = new THREE.Mesh(new THREE.CylinderGeometry(0.013 * s, 0.015 * s, 0.145 * s, 6), REM.bone);
        clav.position.set(sx * 0.078 * s, 0.382 * s, 0.052 * s);
        clav.rotation.set(0.15, -sx * 0.22, Math.PI / 2 - sx * 0.28);
        g.add(clav);
        const scap = new THREE.Mesh(new THREE.BoxGeometry(0.078 * s, 0.115 * s, 0.016 * s), REM.boneDark);
        scap.position.set(sx * 0.092 * s, 0.305 * s, -0.078 * s);
        scap.rotation.set(0.1, sx * 0.28, sx * 0.18);
        g.add(scap);
        const scapSpine = new THREE.Mesh(new THREE.BoxGeometry(0.088 * s, 0.018 * s, 0.026 * s), REM.bone);
        scapSpine.position.set(sx * 0.096 * s, 0.342 * s, -0.086 * s);
        scapSpine.rotation.set(0, sx * 0.28, -sx * 0.22);
        g.add(scapSpine);
      }
      // Anatomical pelvic girdle: sacrum/coccyx, flared iliac crests, pubic arch, and acetabular hip sockets.
      const sacrum = new THREE.Mesh(new THREE.ConeGeometry(0.058 * s, 0.115 * s, 5), REM.boneDark);
      sacrum.position.set(0, -0.095 * s, -0.068 * s);
      sacrum.rotation.x = Math.PI - 0.25;
      sacrum.scale.set(1.15, 1, 0.55);
      g.add(sacrum);
      const pubis = new THREE.Mesh(new THREE.BoxGeometry(0.11 * s, 0.036 * s, 0.038 * s), REM.bone);
      pubis.position.set(0, -0.132 * s, 0.052 * s);
      g.add(pubis);
      for (const sx of [-1, 1]) {
        const ilium = new THREE.Mesh(new THREE.BoxGeometry(0.082 * s, 0.118 * s, 0.105 * s), REM.bone);
        ilium.position.set(sx * 0.092 * s, -0.068 * s, -0.008 * s);
        ilium.rotation.set(0.14, sx * 0.38, sx * 0.28);
        g.add(ilium);
        const crest = new THREE.Mesh(new THREE.BoxGeometry(0.088 * s, 0.022 * s, 0.112 * s), REM.boneDark);
        crest.position.set(sx * 0.102 * s, -0.012 * s, -0.006 * s);
        crest.rotation.set(0.14, sx * 0.38, sx * 0.28);
        g.add(crest);
        const ischium = new THREE.Mesh(new THREE.TorusGeometry(0.034 * s, 0.012 * s, 5, 8), REM.boneDark);
        ischium.position.set(sx * 0.062 * s, -0.132 * s, 0.018 * s);
        ischium.rotation.y = sx * 0.5;
        g.add(ischium);
        const socket = new THREE.Mesh(new THREE.SphereGeometry(0.028 * s, 6, 5), REM.socket);
        socket.position.set(sx * 0.088 * s, -0.118 * s, 0.005 * s);
        g.add(socket);
      }
      // Glistening visceral gore remnants clinging inside the posterior ribcage.
      const viscera = new THREE.Mesh(new THREE.SphereGeometry(0.072 * s, 7, 6), REM.gristle);
      viscera.position.set(0.015 * s, 0.24 * s, -0.02 * s);
      viscera.scale.set(1.1, 1.45, 0.72);
      g.add(viscera);
      return g;
    }
    // High-fidelity Marine combat boot: lugged outsole, heel block, contoured vamp, laced shaft, collar & torn lace.
    function remBoot(s = 1) {
      const boot = new THREE.Group();
      // Outsole and heel block.
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.116 * s, 0.022 * s, 0.265 * s), REM.socket);
      sole.position.set(0, -0.022 * s, 0.046 * s);
      boot.add(sole);
      const heel = new THREE.Mesh(new THREE.BoxGeometry(0.114 * s, 0.018 * s, 0.082 * s), REM.socket);
      heel.position.set(0, -0.038 * s, -0.042 * s);
      boot.add(heel);
      for (let l = 0; l < 5; l++) {
        const lug = new THREE.Mesh(new THREE.BoxGeometry(0.112 * s, 0.01 * s, 0.022 * s), REM.socket);
        lug.position.set(0, -0.036 * s, (0.025 + l * 0.034) * s);
        boot.add(lug);
      }
      // Contoured lower leather vamp & rounded toe box.
      const vamp = new THREE.Mesh(new THREE.BoxGeometry(0.108 * s, 0.068 * s, 0.185 * s), REM.strap);
      vamp.position.set(0, 0.02 * s, 0.042 * s);
      boot.add(vamp);
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.055 * s, 8, 6), REM.strap);
      toe.position.set(0, 0.016 * s, 0.132 * s);
      toe.scale.set(0.98, 0.68, 1.15);
      boot.add(toe);
      // Angled ankle shaft, padded suede collar, tongue gusset, steel eyelets & crisscrossed laces.
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.052 * s, 0.056 * s, 0.135 * s, 8), REM.strap);
      shaft.position.set(0, 0.088 * s, -0.018 * s);
      shaft.scale.set(0.95, 1, 1.12);
      boot.add(shaft);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.052 * s, 0.012 * s, 5, 10), REM.rags[3]);
      collar.position.set(0, 0.152 * s, -0.018 * s);
      collar.rotation.x = Math.PI / 2;
      collar.scale.set(0.95, 1.12, 1);
      boot.add(collar);
      for (let e = 0; e < 4; e++) {
        const ey = (0.055 + e * 0.024) * s, ez = (0.042 - e * 0.004) * s;
        const lace = new THREE.Mesh(new THREE.BoxGeometry(0.052 * s, 0.006 * s, 0.008 * s), REM.rags[3]);
        lace.position.set(0, ey, ez);
        lace.rotation.z = (e % 2 ? 1 : -1) * 0.18;
        boot.add(lace);
        for (const sx of [-1, 1]) {
          const eyelet = new THREE.Mesh(new THREE.BoxGeometry(0.008 * s, 0.008 * s, 0.008 * s), REM.steel);
          eyelet.position.set(sx * 0.028 * s, ey, ez);
          boot.add(eyelet);
        }
      }
      // Bloody ankle stump inside the top of the boot.
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.036 * s, 0.038 * s, 0.024 * s, 7), REM.gristle);
      stump.position.set(0, 0.156 * s, -0.018 * s);
      boot.add(stump);
      return boot;
    }
    // A hanging scrap. Thin boxes rather than planes so it still catches the light from
    // the side when the body tumbles.
    function remRag(w, h, mat) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.006), mat);
      m.castShadow = false;
      return m;
    }
    function remBlood(r, flat = 0.3) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), REM.gristle);
      m.scale.set(1, flat, 1);
      return m;
    }

    // The body the guardian throws back out: skeletonised, still wet, with what is left
    // of the uniform hanging off it. Limbs are on pivots so the throw can make them
    // trail and the landing can let them fold.
    function makeSkeletalMarine() {
      const g = new THREE.Group();
      const s = 1.0;
      let _seed = 0x6d2b79f5;
      const rnd = () => ((_seed = (_seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      const rag = (i) => REM.rags[i % REM.rags.length];
      const spine = new THREE.Group();
      spine.position.y = 0.95;
      g.add(spine);
      const torso = remTorso(s);
      spine.add(torso);
      // Tattered olive-drab flak vest remnants clinging to the shoulders and upper ribs.
      for (const sx of [-1, 1]) {
        const shPad = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.032, 0.12), REM.flak);
        shPad.position.set(sx * 0.105, 0.395, 0.005);
        shPad.rotation.set(0.08, 0, -sx * 0.24);
        spine.add(shPad);
        const chestFlap = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.16, 0.014), sx < 0 ? REM.flak : REM.rags[0]);
        chestFlap.position.set(sx * 0.078, 0.27, 0.105);
        chestFlap.rotation.set(0.12, sx * 0.28, sx * 0.14);
        spine.add(chestFlap);
      }
      // Shreds of the woodland uniform shirt caught on the ribs and spine.
      for (let i = 0; i < 9; i++) {
        const w = 0.065 + rnd() * 0.095, h = 0.11 + rnd() * 0.15;
        const r = remRag(w, h, rag(i));
        const a = (i / 9) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
        r.position.set(Math.cos(a) * 0.125, 0.32 - rnd() * 0.38, Math.sin(a) * 0.105);
        r.rotation.set((rnd() - 0.5) * 0.45, a, (rnd() - 0.5) * 0.65);
        spine.add(r);
      }
      // Torn load-bearing webbing harness with brass buckles and ripped hip ammo pouch.
      const strapA = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.42, 0.012), REM.strap);
      strapA.position.set(-0.062, 0.165, 0.108); strapA.rotation.z = 0.22;
      spine.add(strapA);
      const buckleA = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.028, 0.018), REM.brass);
      buckleA.position.set(-0.048, 0.22, 0.114); buckleA.rotation.z = 0.22;
      spine.add(buckleA);
      const strapB = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.32, 0.012), REM.strap);
      strapB.position.set(0.078, 0.11, 0.105); strapB.rotation.z = -0.36;
      spine.add(strapB);
      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.038, 0.145), REM.strap);
      belt.position.set(0, -0.075, -0.005); belt.rotation.z = 0.08;
      spine.add(belt);
      const beltBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.044, 0.018), REM.brass);
      beltBuckle.position.set(0.01, -0.075, 0.072);
      spine.add(beltBuckle);
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.085, 0.042), REM.rags[2]);
      pouch.position.set(-0.118, -0.095, 0.035); pouch.rotation.set(0.15, 0.3, 0.22);
      spine.add(pouch);
      // Double dog tags on a V-shaped neck chain: two small bright tags catching the light against the sternum.
      for (const sx of [-1, 1]) {
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.24, 5), REM.steel);
        chain.position.set(sx * 0.026, 0.28, 0.112);
        chain.rotation.set(0.18, 0, sx * 0.18);
        spine.add(chain);
      }
      const tag1 = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.052, 0.005), REM.steel);
      tag1.position.set(0.006, 0.145, 0.126); tag1.rotation.set(-0.1, 0.12, -0.08);
      spine.add(tag1);
      const tag2 = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.052, 0.005), REM.steel);
      tag2.position.set(0.022, 0.132, 0.131); tag2.rotation.set(0.08, -0.18, 0.24);
      spine.add(tag2);
      spine.add(remBlood(0.095, 0.48).translateY(-0.04).translateZ(0.055));

      // Cervical spine (neck) with 5 articulated cervical vertebrae and torn throat tendons.
      const neck = new THREE.Group();
      neck.position.y = 0.44 * s;
      spine.add(neck);
      for (let c = 0; c < 5; c++) {
        const cy = c * 0.022 * s, cz = -0.045 + c * 0.009;
        const cv = new THREE.Mesh(new THREE.CylinderGeometry(0.019 * s, 0.021 * s, 0.018 * s, 6), REM.bone);
        cv.position.set(0, cy, cz);
        cv.rotation.x = 0.32;
        neck.add(cv);
        const cSpin = new THREE.Mesh(new THREE.BoxGeometry(0.01 * s, 0.012 * s, 0.026 * s), REM.boneDark);
        cSpin.position.set(0, cy - 0.004 * s, cz - 0.018 * s);
        cSpin.rotation.x = 0.45;
        neck.add(cSpin);
      }
      const skull = remSkull(s);
      skull.position.y = 0.105 * s;
      skull.rotation.x = 0.42;                      // head fallen back / tilted off the spine
      neck.add(skull);
      const gore = remBlood(0.052, 0.78);
      gore.position.set(0, 0.022, -0.015);
      neck.add(gore);

      const limbs = {};
      for (const sx of [-1, 1]) {
        const k = sx < 0 ? 'L' : 'R';
        const upper = new THREE.Group();
        upper.position.set(sx * 0.142 * s, 0.355 * s, 0.015);
        // Humerus hangs down (+y flipped by Math.PI), with a natural slight abduction and elbow bend.
        upper.rotation.set(Math.PI - 0.18, 0, sx * 0.22);
        upper.add(remBone(0.3 * s, 0.025 * s));
        // Shredded uniform sleeve cuff around the upper arm.
        for (let sr = 0; sr < 2; sr++) {
          const slv = remRag(0.085, 0.12, rag(sr + (sx > 0 ? 1 : 0)));
          slv.position.set(sx * 0.024, 0.09 + sr * 0.06, (sr ? -1 : 1) * 0.024);
          slv.rotation.set(0.18, sx * 0.5, (sr - 0.5) * 0.35);
          upper.add(slv);
        }
        // Forearm: anatomical twin bones (radius + ulna with olecranon elbow hook) and articulated skeletal hand.
        const fore = new THREE.Group();
        fore.position.y = 0.3 * s;
        fore.rotation.x = 0.38;
        const radiusBone = remBone(0.26 * s, 0.015 * s, REM.bone);
        radiusBone.position.x = sx * 0.011 * s;
        fore.add(radiusBone);
        const ulnaBone = remBone(0.265 * s, 0.014 * s, REM.boneDark);
        ulnaBone.position.set(-sx * 0.011 * s, -0.01 * s, 0.005 * s);
        fore.add(ulnaBone);
        const hand = new THREE.Group();
        hand.position.y = 0.26 * s;
        const carpals = new THREE.Mesh(new THREE.BoxGeometry(0.056 * s, 0.022 * s, 0.018 * s), REM.boneDark);
        carpals.position.y = 0.01 * s;
        hand.add(carpals);
        for (let f = 0; f < 4; f++) {
          const fx = (f - 1.5) * 0.015 * s;
          const meta = new THREE.Mesh(new THREE.CylinderGeometry(0.0045 * s, 0.005 * s, 0.036 * s, 5), REM.bone);
          meta.position.set(fx, 0.032 * s, 0);
          hand.add(meta);
          const prox = new THREE.Mesh(new THREE.CylinderGeometry(0.004 * s, 0.0045 * s, 0.032 * s, 5), REM.bone);
          prox.position.set(fx, 0.062 * s, -0.006 * s);
          prox.rotation.x = -0.35 - f * 0.08;
          hand.add(prox);
          const dist = new THREE.Mesh(new THREE.CylinderGeometry(0.0032 * s, 0.004 * s, 0.024 * s, 5), REM.boneDark);
          dist.position.set(fx, 0.082 * s, -0.022 * s);
          dist.rotation.x = -0.75 - f * 0.1;
          hand.add(dist);
        }
        // Opposable thumb.
        const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.0042 * s, 0.005 * s, 0.044 * s, 5), REM.bone);
        thumb.position.set(sx * 0.034 * s, 0.036 * s, -0.008 * s);
        thumb.rotation.set(-0.35, 0, -sx * 0.48);
        hand.add(thumb);
        fore.add(hand);
        upper.add(fore);
        spine.add(upper);
        limbs['arm' + k] = upper;
        limbs['fore' + k] = fore;

        // Lower limb: femur with femoral neck & greater trochanter, patella (kneecap), tibia + fibula, and foot/boot.
        const leg = new THREE.Group();
        leg.position.set(sx * 0.088 * s, -0.12 * s, 0);
        leg.rotation.set(Math.PI + (sx < 0 ? 0.06 : -0.04), 0, sx * 0.08);
        leg.add(remBone(0.42 * s, 0.031 * s));
        const femNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * s, 0.022 * s, 0.055 * s, 6), REM.boneDark);
        femNeck.position.set(-sx * 0.018 * s, 0.015 * s, 0);
        femNeck.rotation.z = sx * 0.65;
        leg.add(femNeck);
        const patella = new THREE.Mesh(new THREE.SphereGeometry(0.024 * s, 6, 5), REM.bone);
        patella.position.set(0, 0.415 * s, -0.028 * s);
        patella.scale.set(0.95, 1.05, 0.55);
        leg.add(patella);

        const shin = new THREE.Group();
        shin.position.y = 0.42 * s;
        shin.rotation.x = 0.26;
        const tibia = remBone(0.38 * s, 0.024 * s, REM.bone);
        tibia.position.x = -sx * 0.006 * s;
        shin.add(tibia);
        const fibula = remBone(0.365 * s, 0.013 * s, REM.boneDark);
        fibula.position.set(sx * 0.018 * s, 0.01 * s, 0.006 * s);
        shin.add(fibula);

        // Right foot still wears its laced combat boot; left foot is bare bone with a shredded sock cuff.
        if (sx > 0) {
          const boot = remBoot(s);
          boot.position.y = 0.38 * s;
          boot.rotation.x = Math.PI;
          shin.add(boot);
        } else {
          const foot = new THREE.Group();
          foot.position.y = 0.38 * s;
          foot.rotation.x = Math.PI;
          // Shredded boot-sock cuff clinging above the ankle malleoli.
          const sockRag = remRag(0.075, 0.065, REM.rags[3]);
          sockRag.position.set(0, 0.045 * s, -0.01 * s);
          sockRag.rotation.set(0.15, 0.4, -0.2);
          foot.add(sockRag);
          // Calcaneus (heel bone) and tarsal arch.
          const heelBone = new THREE.Mesh(new THREE.BoxGeometry(0.042 * s, 0.032 * s, 0.065 * s), REM.boneDark);
          heelBone.position.set(0, -0.012 * s, -0.022 * s);
          foot.add(heelBone);
          const tarsals = new THREE.Mesh(new THREE.BoxGeometry(0.064 * s, 0.024 * s, 0.052 * s), REM.bone);
          tarsals.position.set(0, -0.008 * s, 0.025 * s);
          foot.add(tarsals);
          // 5 distinct metatarsals and phalanges (toes).
          for (let f = 0; f < 5; f++) {
            const tx = (f - 2) * 0.0145 * s;
            const tLen = (0.055 - Math.abs(f - 1) * 0.005) * s;
            const mt = new THREE.Mesh(new THREE.CylinderGeometry(0.005 * s, 0.0055 * s, tLen, 5), REM.bone);
            mt.position.set(tx, -0.012 * s, (0.068 + tLen * 0.3) * s);
            mt.rotation.x = Math.PI / 2 + 0.12;
            foot.add(mt);
            const toe = new THREE.Mesh(new THREE.BoxGeometry(0.009 * s, 0.009 * s, 0.028 * s), REM.boneDark);
            toe.position.set(tx, -0.016 * s, (0.105 + (f === 0 ? 0.008 : -f * 0.003)) * s);
            foot.add(toe);
          }
          shin.add(foot);
        }
        // Layered woodland-camo trouser shreds round the thigh and knee.
        for (let i = 0; i < 3; i++) {
          const r = remRag(0.095 + rnd() * 0.055, 0.13 + rnd() * 0.09, rag(i + (sx > 0 ? 2 : 0)));
          r.position.set(sx * 0.036, 0.10 + i * 0.11, 0.028 * (i % 2 ? -1 : 1));
          r.rotation.set(0.18, sx * 0.55 + i * 0.3, (rnd() - 0.5) * 0.45);
          leg.add(r);
        }
        leg.add(shin);
        spine.add(leg);
        limbs['leg' + k] = leg;
        limbs['shin' + k] = shin;
      }
      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
      g.userData.parts = limbs;
      g.userData.spine = spine;
      g.userData.neck = neck;
      g.userData.skull = skull;
      g.userData.jaw = skull.userData.jaw;
      g.userData.mats = [];          // REM materials are shared; the prop owns no material
      return g;
    }`;

replaceExact('REM and makeSkeletalMarine', TARGET_SKELETAL, REPLACE_SKELETAL);

// Also upgrade the floating boot in makeBoneRaft() to use remBoot(S) so the pit's Bone Raft matches!
const TARGET_RAFT_BOOT = `      // One boot, still laced, floating sole-up.
      const boot = new THREE.Group();
      const bootBody = new THREE.Mesh(new THREE.BoxGeometry(0.13 * S, 0.11 * S, 0.3 * S), REM.strap);
      boot.add(bootBody);
      const bootSole = new THREE.Mesh(new THREE.BoxGeometry(0.135 * S, 0.026 * S, 0.32 * S), REM.socket);
      bootSole.position.y = 0.06 * S;
      boot.add(bootSole);
      boot.rotation.set(0.2, 1.1, 0.3);
      float(boot, 0.5, 0.78, 0.04);`;

const REPLACE_RAFT_BOOT = `      // One boot, still laced, floating sole-up.
      const boot = remBoot(S * 1.1);
      boot.rotation.set(Math.PI + 0.22, 1.1, 0.3);
      float(boot, 0.5, 0.78, 0.04);`;

replaceExact('makeBoneRaft boot', TARGET_RAFT_BOOT, REPLACE_RAFT_BOOT);

// Verify index.html has not changed on disk since we read it (Rule 4)
const rawCurrent = fs.readFileSync(INDEX_PATH);
const hashCurrent = crypto.createHash('sha256').update(rawCurrent).digest('hex');
if (hashCurrent !== hashBefore) {
  throw new Error('index.html changed on disk while preparing edit! Aborting to prevent overwrite.');
}

// Write UTF-8 with no BOM
const outBuf = Buffer.from(src, 'utf8');
if (outBuf[0] === 0xef && outBuf[1] === 0xbb && outBuf[2] === 0xbf) {
  throw new Error('UTF-8 BOM detected!');
}
fs.writeFileSync(INDEX_PATH, outBuf);
const hashAfter = crypto.createHash('sha256').update(outBuf).digest('hex');
console.log(`Successfully updated index.html (SHA-256: ${hashBefore.slice(0, 12)} -> ${hashAfter.slice(0, 12)})`);
