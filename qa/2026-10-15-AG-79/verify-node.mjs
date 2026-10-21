// qa/2026-10-15-AG-79/verify-node.mjs
// Pure-Node (non-browser) verification of AG-79 visual upgrades in index.html.
// Complies with Jerry's ONE active game-testing session per computer rule (Rule 16).
import fs from 'node:fs';
import * as THREE from '../../vendor/three/three.webgpu.js';

const geoSrc = fs.readFileSync('core/geometry.js', 'utf8')
  .replace(/import \* as THREE from 'three';/, '')
  .replace(/export function /g, 'function ');
const { addCast, rbox, rmesh, mergeParts } = new Function('THREE', `${geoSrc}\nreturn { addCast, rbox, rmesh, mergeParts };`)(THREE);

const src = fs.readFileSync('index.html', 'utf8');
const raw = fs.readFileSync('index.html');

const results = [];
function check(name, fn) {
  try {
    const info = fn();
    results.push({ name, ok: true, info });
    console.log(`PASS  ${name} -> ${info}`);
  } catch (e) {
    results.push({ name, ok: false, error: e.message || String(e) });
    console.error(`FAIL  ${name} -> ${e.stack || e}`);
  }
}

function extractBetween(startMarker, endMarker) {
  const i0 = src.indexOf(startMarker);
  if (i0 === -1) throw new Error(`Missing start marker: ${startMarker}`);
  const i1 = src.indexOf(endMarker, i0);
  if (i1 === -1) throw new Error(`Missing end marker: ${endMarker}`);
  return src.slice(i0, i1);
}

// Extract the actual code blocks from index.html
const mergeAndBarricadeCode = extractBetween(
  'const _msN = new THREE.Matrix3()',
  'function makeLightTurretMesh'
);
const wallCode = extractBetween(
  'const WALL_SPAN = 2.0;',
  'function addWindowBars(b)'
);
const sandbagCode = extractBetween(
  'const SANDBAG_TOP = 1.05;',
  'function makeBarrelBuildMesh'
);
const floorCode = extractBetween(
  'function makeFloorMesh(matOverride = null)',
  'function makeStairsMesh'
);
const tierFloorAndDecorateCode = extractBetween(
  'function makeTierFloorMesh(tier)',
  'const UPGRADE_TRACKS ='
);
const skeletalCode = extractBetween(
  'const REM = {',
  'const GUARDIAN_SCALE ='
);

const factory = new Function(
  'THREE', 'addCast', 'rbox', 'rmesh', 'mergeParts',
  `
  const BUILD_GRID = 2.0;
  const LEVEL_H = 2.1;
  const PILLAR_H = 2.1;
  const RAIL_H = 1.0;
  const EDGE_SPEC = {
    wall: { edge: 1 },
    barricade: { edge: 1 },
    sandbag: { edge: 1 },
    wire: { edge: 1 },
    railing: { edge: 1 }
  };
  function edgeGroups(edge) {
    const outer = new THREE.Group();
    const inner = new THREE.Group();
    inner.position.z = BUILD_GRID / 2 - 0.16;
    outer.add(inner);
    outer.userData.inner = inner;
    return { outer, inner };
  }
  function ruleFor(k) { return { edgeH: 0.25, height: 0.25 }; }
  function applyOpeningLook(b) {
    const u = b.mesh.userData;
    if (u.upperMid) u.upperMid.visible = !b.opening;
    if (u.upper) u.upper.visible = b.opening !== 'door';
    if (u.lower) u.lower.visible = b.opening !== 'door';
    if (u.sill) u.sill.visible = b.opening === 'window';
  }
  ${mergeAndBarricadeCode}
  ${wallCode}
  ${sandbagCode}
  ${floorCode}
  ${tierFloorAndDecorateCode}
  ${skeletalCode}
  return {
    makeSkeletalMarine,
    poseRemains,
    makeBoneRaft,
    updateBoneRaft,
    makeWallMesh,
    makeFloorMesh,
    makeTierFloorMesh,
    makeBarricadeMesh,
    makeSandbagMesh,
    decoratePiece,
    bakeBuildMesh,
    applyOpeningLook
  };
  `
);

const B = factory(THREE, addCast, rbox, rmesh, mergeParts);

function measure(root) {
  root.updateWorldMatrix(true, true);
  let meshes = 0, tris = 0;
  const mats = new Set();
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  root.traverse((o) => {
    if (o.isMesh && o.visible) {
      meshes++;
      mats.add(o.material);
      const g = o.geometry;
      if (!g || !g.attributes.position) throw new Error('Mesh missing position attribute');
      const pos = g.attributes.position;
      for (let i = 0; i < pos.array.length; i++) {
        if (!Number.isFinite(pos.array[i])) throw new Error('NaN/Inf in position attribute');
      }
      tris += g.index ? g.index.count / 3 : pos.count / 3;
    }
  });
  if (meshes === 0 || tris === 0) throw new Error('Empty mesh or 0 triangles');
  return {
    meshes,
    tris: Math.round(tris),
    mats: mats.size,
    size: `${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}m`
  };
}

// 1. Skeletal Marine & Bone Raft
check('1a. person.skeletal-marine (makeSkeletalMarine + poseRemains)', () => {
  const m = B.makeSkeletalMarine();
  const ud = m.userData;
  for (const k of ['armL', 'foreL', 'armR', 'foreR', 'legL', 'shinL', 'legR', 'shinR']) {
    if (!ud.parts || !ud.parts[k]) throw new Error(`Missing limb pivot: ${k}`);
  }
  if (!ud.spine || !ud.neck || !ud.skull || !ud.jaw) throw new Error('Missing spine/neck/skull/jaw userData');
  if (!Array.isArray(ud.mats) || ud.mats.length !== 0) throw new Error('mats must be []');
  const m0 = measure(m);
  B.poseRemains(m, 0);
  B.poseRemains(m, 0.85);
  const m1 = measure(m);
  return `${m1.meshes} meshes, ${m1.tris} tris, ${m1.mats} shared mats, size ${m0.size}`;
});

check('1b. prop.bone-raft (makeBoneRaft + updateBoneRaft)', () => {
  const raft = B.makeBoneRaft();
  B.updateBoneRaft(raft, 1.5, 0.4);
  const st = measure(raft);
  return `${st.meshes} meshes, ${st.tris} tris, size ${st.size}`;
});

// 2. Wood Wall (all 5 tiers + openings + baking)
const WALL_NAMES = ['Wood wall', 'Reinforced wood wall', 'Stone wall', 'Reinforced stone wall', 'Steel wall'];
for (let t = 0; t < 5; t++) {
  check(`2.${t + 1} build.wall tier ${t} (${WALL_NAMES[t]})`, () => {
    const w = B.makeWallMesh(null, t);
    const ud = w.userData;
    if (!ud.lower || !ud.upper || !ud.upperMid || !ud.sill) throw new Error('Missing wall opening groups');
    const rawSt = measure(w);
    // Test window & door openings
    B.applyOpeningLook({ mesh: w, opening: 'window' });
    if (ud.upperMid.visible !== false || ud.sill.visible !== true) throw new Error('Window opening look failed');
    B.applyOpeningLook({ mesh: w, opening: null });
    B.bakeBuildMesh('wall', w, false);
    const bakedSt = measure(w);
    return `raw ${rawSt.meshes} meshes (${rawSt.tris} tris) -> baked ${bakedSt.meshes} meshes (${bakedSt.mats} mats), size ${bakedSt.size}`;
  });
}

// 3. Wood Floor (all 3 tiers + baking)
const FLOOR_NAMES = ['Wood floor', 'Stone floor', 'Steel floor'];
for (let t = 0; t < 3; t++) {
  check(`3.${t + 1} build.floor tier ${t} (${FLOOR_NAMES[t]})`, () => {
    const f = B.makeTierFloorMesh(t);
    const rawSt = measure(f);
    B.bakeBuildMesh('floor', f);
    const bakedSt = measure(f);
    return `raw ${rawSt.meshes} meshes (${rawSt.tris} tris) -> baked ${bakedSt.meshes} meshes (${bakedSt.mats} mats), size ${bakedSt.size}`;
  });
}

// 4. Barricade (all 3 tiers + baking)
const BARRICADE_NAMES = ['Barricade', 'Braced barricade', 'Czech hedgehog'];
for (let t = 0; t < 3; t++) {
  check(`4.${t + 1} build.barricade tier ${t} (${BARRICADE_NAMES[t]})`, () => {
    const b = B.makeBarricadeMesh(null);
    B.decoratePiece(b, 'barricade', t);
    const rawSt = measure(b);
    B.bakeBuildMesh('barricade', b);
    const bakedSt = measure(b);
    return `raw ${rawSt.meshes} meshes (${rawSt.tris} tris) -> baked ${bakedSt.meshes} meshes (${bakedSt.mats} mats), size ${bakedSt.size}`;
  });
}

// 5. Sandbag Wall (all 3 tiers + baking)
const SANDBAG_NAMES = ['Sandbag wall', 'Double-stacked sandbags', 'Gabion wall'];
for (let t = 0; t < 3; t++) {
  check(`5.${t + 1} build.sandbag tier ${t} (${SANDBAG_NAMES[t]})`, () => {
    const s = B.makeSandbagMesh(null);
    B.decoratePiece(s, 'sandbag', t);
    const rawSt = measure(s);
    B.bakeBuildMesh('sandbag', s);
    const bakedSt = measure(s);
    return `raw ${rawSt.meshes} meshes (${rawSt.tris} tris) -> baked ${bakedSt.meshes} meshes (${bakedSt.mats} mats), size ${bakedSt.size}`;
  });
}

// 6. Placement ghost matOverride check
check('6. Ghost preview matOverride on wall, floor, barricade, sandbag', () => {
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4 });
  for (const [k, m] of [
    ['wall', B.makeWallMesh(ghostMat, 3)],
    ['floor', B.makeFloorMesh(ghostMat)],
    ['barricade', B.makeBarricadeMesh(ghostMat)],
    ['sandbag', B.makeSandbagMesh(ghostMat)]
  ]) {
    m.traverse((o) => {
      if (o.isMesh && o.material !== ghostMat) throw new Error(`${k} ghost had non-override material`);
    });
  }
  return 'all 4 builders uniformly apply matOverride for placement ghosts';
});

// 7. UTF-8 no-BOM & mojibake check (t215 equivalent)
check('7. UTF-8 no-BOM and mojibake check (Rule 4 / t215)', () => {
  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) throw new Error('BOM found on index.html');
  const bad = ['\u00c2\u00b7', '\u00c3\u2014', '\u00e2\u20ac\u201d', '\u00e2\u20ac\u201c', '\u00e2\u2020\u2019'];
  for (const seq of bad) {
    if (src.includes(seq)) throw new Error(`Mojibake sequence found: ${seq}`);
  }
  return `index.html (${raw.length} bytes) UTF-8 no-BOM clean`;
});

const failed = results.filter((r) => !r.ok);
console.log(`\nSummary: ${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) process.exit(1);
