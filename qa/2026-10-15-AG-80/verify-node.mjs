// qa/2026-10-15-AG-80/verify-node.mjs
// Pure-Node (non-browser) verification of AG-80 visual upgrades across all 8 buildables & 24 tier variants in index.html.
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
const mergeAndHelpersCode = extractBetween(
  'const _msN = new THREE.Matrix3()',
  'function makeLightTurretMesh'
);
const tierMatsCode = extractBetween(
  'const stoneVC =',
  'function makeWallMesh'
);
const spikesCode = extractBetween(
  'const SPIKE_SINK = 0.95;',
  'function updateSpikeTraps(dt)'
);
const platformThroughLureCode = extractBetween(
  'const PLATFORM_PAD = 0.88;',
  'function makeMortarMesh(matOverride = null'
);
const tierFloorAndDecorateCode = extractBetween(
  'function makeTierFloorMesh(tier)',
  'const UPGRADE_TRACKS ='
);
const makeTieredMeshCode = extractBetween(
  'const TIERED_MESH = {',
  'function onStairsRamp(b)'
);

const factory = new Function(
  'THREE', 'addCast', 'rbox', 'rmesh', 'mergeParts',
  `
  const BUILD_GRID = 2.0;
  const LEVEL_H = 2.1;
  const PILLAR_H = 2.1;
  const RAIL_H = 1.0;
  const BUILD_RULES = {
    platform: { edgeH: 0.25, height: 0.42 }
  };
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
  function ruleFor(k) { return BUILD_RULES[k] || { edgeH: 0.25, height: 0.25 }; }
  function makeWallMesh() { return new THREE.Group(); }
  function makeBarricadeMesh() { return new THREE.Group(); }
  function makeSandbagMesh() { return new THREE.Group(); }
  function makeLightTurretMesh() { return new THREE.Group(); }
  function makeHeavyTurretMesh() { return new THREE.Group(); }
  function makeFlameTurretMesh() { return new THREE.Group(); }
  function makeMortarMesh() { return new THREE.Group(); }
  function decorateTurret() {}
  ${mergeAndHelpersCode}
  ${tierMatsCode}
  ${spikesCode}
  ${platformThroughLureCode}
  ${tierFloorAndDecorateCode}
  ${makeTieredMeshCode}
  return {
    makeWireMesh,
    makeRailingMesh,
    makePlatformMesh,
    makePillarMesh,
    makeStairsMesh,
    makeSpikesMesh,
    makeMineMesh,
    makeLureMesh,
    decoratePiece,
    makeTieredMesh,
    bakeBuildMesh,
    tierMats
  };
  `
);

const B = factory(THREE, addCast, rbox, rmesh, mergeParts);

function measure(root, includeHidden = false) {
  root.updateWorldMatrix(true, true);
  let meshes = 0, tris = 0;
  const mats = new Set();
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  root.traverse((o) => {
    if (o.isMesh && (includeHidden || o.visible)) {
      // Check if any ancestor is hidden when !includeHidden
      if (!includeHidden) {
        let p = o.parent, vis = true;
        while (p) { if (!p.visible) { vis = false; break; } p = p.parent; }
        if (!vis) return;
      }
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

// 1. Barbed wire (Tiers 0..2)
const wireNames = ['Barbed wire', 'Concertina wire', 'Razor wire'];
for (let t = 0; t < 3; t++) {
  check(`1.${t + 1} build.wire tier ${t} (${wireNames[t]})`, () => {
    const m = B.makeTieredMesh({ type: 'wire', tier: t });
    if (!m.userData.inner) throw new Error('Missing userData.inner on edge piece wire');
    const pre = measure(m);
    B.bakeBuildMesh('wire', m);
    const post = measure(m);
    if (post.tris !== pre.tris) throw new Error(`Triangle count mismatch after bake: ${pre.tris} vs ${post.tris}`);
    if (post.meshes >= pre.meshes) throw new Error(`Expected bakeBuildMesh to reduce draw calls (${pre.meshes} -> ${post.meshes})`);
    return `raw ${pre.meshes} meshes -> baked ${post.meshes} draw calls, ${post.tris} tris, ${post.mats} mats, size ${post.size}`;
  });
}

// 2. Railing (Tiers 0..2)
const railingNames = ['Railing', 'Mesh railing', 'Armoured parapet'];
for (let t = 0; t < 3; t++) {
  check(`2.${t + 1} build.railing tier ${t} (${railingNames[t]})`, () => {
    const m = B.makeTieredMesh({ type: 'railing', tier: t });
    if (!m.userData.inner) throw new Error('Missing userData.inner on edge piece railing');
    const pre = measure(m);
    B.bakeBuildMesh('railing', m);
    const post = measure(m);
    if (post.tris !== pre.tris) throw new Error(`Triangle count mismatch after bake: ${pre.tris} vs ${post.tris}`);
    if (post.meshes >= pre.meshes) throw new Error(`Expected bakeBuildMesh to reduce draw calls (${pre.meshes} -> ${post.meshes})`);
    return `raw ${pre.meshes} meshes -> baked ${post.meshes} draw calls, ${post.tris} tris, ${post.mats} mats, size ${post.size}`;
  });
}

// 3. Platform (Tiers 0..2)
const platformNames = ['Platform', 'Plated platform', 'Gun emplacement'];
for (let t = 0; t < 3; t++) {
  check(`3.${t + 1} build.platform tier ${t} (${platformNames[t]})`, () => {
    const m = B.makeTieredMesh({ type: 'platform', tier: t });
    const pre = measure(m);
    B.bakeBuildMesh('platform', m);
    const post = measure(m);
    if (post.tris !== pre.tris) throw new Error(`Triangle count mismatch after bake: ${pre.tris} vs ${post.tris}`);
    if (post.meshes >= pre.meshes) throw new Error(`Expected bakeBuildMesh to reduce draw calls (${pre.meshes} -> ${post.meshes})`);
    return `raw ${pre.meshes} meshes -> baked ${post.meshes} draw calls, ${post.tris} tris, ${post.mats} mats, size ${post.size}`;
  });
}

// 4. Structural pillar (Tiers 0..2)
const pillarNames = ['Structural pillar', 'Concrete pillar', 'Steel column'];
for (let t = 0; t < 3; t++) {
  check(`4.${t + 1} build.pillar tier ${t} (${pillarNames[t]})`, () => {
    const m = B.makeTieredMesh({ type: 'pillar', tier: t });
    const pre = measure(m);
    B.bakeBuildMesh('pillar', m);
    const post = measure(m);
    if (post.tris !== pre.tris) throw new Error(`Triangle count mismatch after bake: ${pre.tris} vs ${post.tris}`);
    if (post.meshes >= pre.meshes) throw new Error(`Expected bakeBuildMesh to reduce draw calls (${pre.meshes} -> ${post.meshes})`);
    return `raw ${pre.meshes} meshes -> baked ${post.meshes} draw calls, ${post.tris} tris, ${post.mats} mats, size ${post.size}`;
  });
}

// 5. Stairs (Tiers 0..2)
const stairsNames = ['Stairs', 'Steel stairs', 'Retractable stairs'];
for (let t = 0; t < 3; t++) {
  check(`5.${t + 1} build.stairs tier ${t} (${stairsNames[t]})`, () => {
    const m = B.makeTieredMesh({ type: 'stairs', tier: t });
    if (t > 0) {
      const wood = new Set([...B.tierMats.woodPlanks, B.tierMats.woodPost, B.tierMats.woodCap, B.tierMats.woodDark]);
      let woodMeshes = 0;
      m.traverse((o) => { if (o.isMesh && wood.has(o.material)) woodMeshes++; });
      if (woodMeshes) throw new Error(`Steel stair tier retains ${woodMeshes} timber base meshes`);
    }
    if (t >= 2) {
      if (!m.userData.pivot) throw new Error('Retractable stairs (tier 2) missing userData.pivot (t31 invariant)');
      if (Math.abs(m.userData.pivot.position.z - (-1.0)) > 1e-4) throw new Error(`Expected pivot.z = -1.0, got ${m.userData.pivot.position.z}`);
    }
    const pre = measure(m);
    B.bakeBuildMesh('stairs', m);
    const post = measure(m);
    if (post.tris !== pre.tris) throw new Error(`Triangle count mismatch after bake: ${pre.tris} vs ${post.tris}`);
    if (post.meshes >= pre.meshes) throw new Error(`Expected bakeBuildMesh to reduce draw calls (${pre.meshes} -> ${post.meshes})`);
    return `raw ${pre.meshes} meshes -> baked ${post.meshes} draw calls, ${post.tris} tris, ${post.mats} mats, size ${post.size}`;
  });
}

// 6. Spike trap (Tiers 0..2)
const spikesNames = ['Spike trap', 'Resetting spikes', 'Steel spike bed'];
for (let t = 0; t < 3; t++) {
  check(`6.${t + 1} build.spikes tier ${t} (${spikesNames[t]})`, () => {
    const m = B.makeTieredMesh({ type: 'spikes', tier: t });
    const sp = m.userData.spikes;
    if (!sp || !sp.isGroup) throw new Error('Missing userData.spikes Group');
    if (sp.visible !== false) throw new Error('userData.spikes.visible must start false when placed (t14 invariant)');
    if (Math.abs(sp.position.y - (-0.95)) > 1e-4) throw new Error(`Expected spikes.position.y = -0.95, got ${sp.position.y}`);
    const expectedSpikes = t === 1 ? 16 : 25;
    if (sp.children.length !== expectedSpikes) throw new Error(`Expected ${expectedSpikes} impaler spikes in userData.spikes, got ${sp.children.length}`);
    const preSurface = measure(m, false);
    B.bakeBuildMesh('spikes', m);
    const postSurface = measure(m, false);
    if (postSurface.tris !== preSurface.tris) throw new Error(`Surface triangle count mismatch after bake: ${preSurface.tris} vs ${postSurface.tris}`);
    if (postSurface.meshes >= preSurface.meshes) throw new Error(`Expected bakeBuildMesh to reduce draw calls (${preSurface.meshes} -> ${postSurface.meshes})`);
    // Also test sprung state (spikes.visible = true)
    sp.visible = true;
    sp.position.y = 0;
    const sprung = measure(m, false);
    return `surface raw ${preSurface.meshes} -> baked ${postSurface.meshes} draw calls (${postSurface.tris} surface tris; ${sprung.tris} total tris when sprung), size ${postSurface.size}`;
  });
}

// 7. Land mine (Tiers 0..2)
const mineNames = ['Land mine', 'Frag mine', 'Bounding mine'];
for (let t = 0; t < 3; t++) {
  check(`7.${t + 1} build.mine tier ${t} (${mineNames[t]})`, () => {
    const m = B.makeTieredMesh({ type: 'mine', tier: t });
    if (!m.userData.led || !m.userData.led.emissive) throw new Error('Missing userData.led material with emissive');
    if (t === 2) {
      let ledMesh = null;
      m.traverse((o) => { if (o.isMesh && o.material === m.userData.led) ledMesh = o; });
      if (!ledMesh) throw new Error('Bounding mine LED material is not assigned to visible geometry');
      const ledBox = new THREE.Box3().setFromObject(ledMesh);
      if (ledBox.min.y < 0.269) {
        throw new Error(`Bounding mine LED is buried in its launch pot (bottom y=${ledBox.min.y.toFixed(3)}, pot top y=0.270)`);
      }
      if (Math.hypot(ledMesh.position.x, ledMesh.position.z) > 0.225) {
        throw new Error('Bounding mine LED is floating beyond the launch pot rim');
      }
    }
    const pre = measure(m);
    B.bakeBuildMesh('mine', m);
    const post = measure(m);
    if (post.tris !== pre.tris) throw new Error(`Triangle count mismatch after bake: ${pre.tris} vs ${post.tris}`);
    if (post.meshes >= pre.meshes) throw new Error(`Expected bakeBuildMesh to reduce draw calls (${pre.meshes} -> ${post.meshes})`);
    return `raw ${pre.meshes} meshes -> baked ${post.meshes} draw calls, ${post.tris} tris, ${post.mats} mats, size ${post.size}`;
  });
}

// 8. Decoy beacon (Tiers 0..2)
const lureNames = ['Decoy beacon', 'Siren beacon', 'Shock beacon'];
for (let t = 0; t < 3; t++) {
  check(`8.${t + 1} build.lure tier ${t} (${lureNames[t]})`, () => {
    const m = B.makeTieredMesh({ type: 'lure', tier: t });
    if (!m.userData.lamp || !m.userData.lamp.emissive) throw new Error('Missing userData.lamp material with emissive');
    let visibleLampMeshes = 0;
    m.traverse((o) => {
      if (!o.isMesh || o.material !== m.userData.lamp) return;
      let visible = o.visible;
      for (let p = o.parent; p && visible; p = p.parent) visible = p.visible;
      if (visible) visibleLampMeshes++;
    });
    if (!visibleLampMeshes) throw new Error('userData.lamp does not drive any visible beacon geometry');
    if (t > 0 && m.userData.baseHorn?.visible !== false) throw new Error('Upgraded beacon retains the base klaxon');
    if (t === 2) {
      if (m.userData.baseStrobe?.visible !== false) throw new Error('Shock beacon retains the base orange strobe');
      if (m.userData.lamp.emissive.getHex() !== 0x2aa0ff) throw new Error('Shock beacon runtime lamp is not the blue plasma globe');
    }
    const pre = measure(m);
    B.bakeBuildMesh('lure', m);
    const post = measure(m);
    if (post.tris !== pre.tris) throw new Error(`Triangle count mismatch after bake: ${pre.tris} vs ${post.tris}`);
    if (post.meshes >= pre.meshes) throw new Error(`Expected bakeBuildMesh to reduce draw calls (${pre.meshes} -> ${post.meshes})`);
    return `raw ${pre.meshes} meshes -> baked ${post.meshes} draw calls, ${post.tris} tris, ${post.mats} mats, size ${post.size}`;
  });
}

// 9. Placement ghost matOverride across all 8 base builders
check('9. Placement ghost matOverride across all 8 base builders', () => {
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.45 });
  const builders = [
    ['wire', B.makeWireMesh],
    ['railing', B.makeRailingMesh],
    ['platform', B.makePlatformMesh],
    ['pillar', B.makePillarMesh],
    ['stairs', B.makeStairsMesh],
    ['spikes', B.makeSpikesMesh],
    ['mine', B.makeMineMesh],
    ['lure', B.makeLureMesh]
  ];
  for (const [name, fn] of builders) {
    const g = fn(ghostMat);
    let count = 0;
    g.traverse((o) => {
      if (o.isMesh) {
        count++;
        if (o.material !== ghostMat) throw new Error(`${name} ghost mesh did not use matOverride`);
      }
    });
    if (count === 0) throw new Error(`${name} ghost produced 0 meshes`);
    if (name === 'spikes' && !g.userData.spikes.visible) {
      throw new Error('spikes ghost should show spikes (visible === true)');
    }
  }
  return 'All 8 base builders uniformly apply matOverride for placement ghosts';
});

// 10. UTF-8 no-BOM & mojibake check (t215 equivalent)
check('10. index.html UTF-8 no-BOM & zero mojibake check (t215)', () => {
  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) {
    throw new Error('UTF-8 BOM detected in index.html');
  }
  const bad = ['\u00c2\u00b7', '\u00c3\u2014', '\u00e2\u20ac\u201d', '\u00e2\u20ac\u201c', '\u00e2\u20ac\u2122', '\u00e2\u20ac\u0153', '\u00fffd'];
  for (const seq of bad) {
    if (src.includes(seq)) throw new Error(`Mojibake sequence detected: ${JSON.stringify(seq)}`);
  }
  return `Clean UTF-8 no-BOM (${raw.length} bytes)`;
});

const failed = results.filter((r) => !r.ok);
console.log(`\nSummary: ${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) process.exit(1);
