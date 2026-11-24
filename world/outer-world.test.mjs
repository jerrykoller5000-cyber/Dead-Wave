// world/outer-world.test.mjs — AG-408 / AG-411 unit tests for outer-world beyond the fenceline.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.webgpu.js';
import { buildOuterWorld } from './outer-world.js';
import { getOuterTextureSet, createOuterAtmosphere, createOuterWorldMaterials } from './outer-textures.js';

// Synthetic alpine valley terrain mirroring Grave Shift's r=220..430 mountain rim
function mockSampleHeight(x, z) {
  const r = Math.hypot(x, z);
  if (r <= 220) return 2.0 + Math.sin(x * 0.02) * 3.0;
  const t = Math.min(1, (r - 220) / 180);
  const a = Math.atan2(z, x);
  const peak = 95 + 45 * Math.sin(a * 5 + 0.7) + 25 * Math.cos(a * 3 - 0.5);
  return 2.0 + t * t * peak;
}

test('buildOuterWorld generates all landmarks, forests, crags, and far ranges strictly outside LAND_MAX & inside skyDome', () => {
  const ow = buildOuterWorld(THREE, {
    sampleHeight: mockSampleHeight,
    wallRadius: 220,
    terrainRadius: 430,
    cordonAng: 181.6 * Math.PI / 180,
    riverAng: 29.6 * Math.PI / 180,
  });

  assert.equal(ow.group.name, 'outer-world-vistas');
  assert.ok(ow.stats.forestTrees >= 800, `expected dense outer foothill forest, got ${ow.stats.forestTrees}`);
  assert.ok(ow.stats.crags >= 60, `expected outer alpine crags, got ${ow.stats.crags}`);
  assert.ok(ow.stats.redBeacons >= 3, `expected Ridgeline & Cordon red beacons, got ${ow.stats.redBeacons}`);
  assert.ok(ow.stats.amberLights >= 20, `expected distant town/lookout/ops amber lights, got ${ow.stats.amberLights}`);
  assert.equal(ow.landmarks.length, 7, 'expected 7 named outer landmark anchors');

  // Verify every landmark anchor sits strictly beyond wallRadius (220 m)
  for (const lm of ow.landmarks) {
    const r = Math.hypot(lm.x, lm.z);
    assert.ok(r > 235, `landmark ${lm.id} too close to wall (r=${r.toFixed(1)})`);
  }

  // Verify ALL mesh vertices & instances are finite, outside playable interior, and inside skyDome (1350 m)
  let meshCount = 0;
  ow.group.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    meshCount++;
    const p = o.geometry.attributes.position;
    if (o.isInstancedMesh) {
      const m4 = new THREE.Matrix4();
      const v = new THREE.Vector3();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m4);
        v.setFromMatrixPosition(m4);
        assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), `${o.name}: non-finite instance ${i}`);
        const r = Math.hypot(v.x, v.z);
        assert.ok(r > 221, `${o.name} instance ${i} intruded inside playable valley (r=${r.toFixed(1)})`);
      }
      return;
    }
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + o.position.x;
      const y = p.getY(i) + o.position.y;
      const z = p.getZ(i) + o.position.z;
      assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z), `${o.name}: non-finite vertex ${i}`);
      const d3 = Math.hypot(x, y, z);
      assert.ok(d3 < 1345, `${o.name}: vertex ${i} clips skyDome (d3=${d3.toFixed(1)})`);
    }
  });
  assert.ok(meshCount >= 14 && meshCount <= 35, `unexpected outer-world draw mesh count: ${meshCount}`);
});

test('outer crags are slope-anchored with deep buried roots so none hover above steep terrain', () => {
  const ow = buildOuterWorld(THREE, { sampleHeight: mockSampleHeight, wallRadius: 220, terrainRadius: 430 });
  const cragsGroup = ow.group.getObjectByName('outer-alpine-crags');
  assert.ok(cragsGroup, 'expected outer-alpine-crags group');
  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const q = new THREE.Quaternion();
  let checked = 0;
  cragsGroup.traverse((o) => {
    if (!o.isInstancedMesh) return;
    // Geometry lower bound must extend deeply below origin (buried root wedge < -1.2)
    o.geometry.computeBoundingBox();
    assert.ok(o.geometry.boundingBox.min.y < -1.2, `${o.name}: expected deep buried root wedge, got min.y=${o.geometry.boundingBox.min.y}`);
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m4);
      m4.decompose(pos, q, scl);
      const gh = mockSampleHeight(pos.x, pos.z);
      // Root bottom sits deeply below local ground height!
      const rootBottomY = pos.y + o.geometry.boundingBox.min.y * scl.y;
      assert.ok(rootBottomY < gh - 0.5, `${o.name}[${i}] root bottom ${rootBottomY.toFixed(2)} not buried below ground ${gh.toFixed(2)}`);
      checked++;
    }
  });
  assert.ok(checked >= 80, `expected >= 80 checked crags, got ${checked}`);
});

test('outer-textures procedural DataTextures are deterministic and mist border alpha is strictly zero', () => {
  const tex = getOuterTextureSet(THREE);
  assert.ok(tex && tex.detailTex && tex.waterTex && tex.mistTex && tex.glowRedTex && tex.glowAmberTex);
  assert.equal(getOuterTextureSet(THREE), tex, 'expected WeakMap cache hit');

  // Verify mist texture alpha hits exact 0 along all 4 border edges (zero rectangular mist borders!)
  const { width: mw, height: mh, data: md } = tex.mistTex.image;
  assert.equal(mw, 256);
  assert.equal(mh, 128);
  let maxBorderAlpha = 0;
  for (let x = 0; x < mw; x++) {
    maxBorderAlpha = Math.max(maxBorderAlpha, md[(0 * mw + x) * 4 + 3], md[((mh - 1) * mw + x) * 4 + 3]);
  }
  for (let y = 0; y < mh; y++) {
    maxBorderAlpha = Math.max(maxBorderAlpha, md[(y * mw + 0) * 4 + 3], md[(y * mw + (mw - 1)) * 4 + 3]);
  }
  assert.equal(maxBorderAlpha, 0, `mist texture border alpha must be 0, got ${maxBorderAlpha}`);
  // Verify center has smooth non-zero mist billow
  const centerAlpha = md[(Math.floor(mh / 2) * mw + Math.floor(mw / 2)) * 4 + 3];
  assert.ok(centerAlpha > 60, `expected non-zero mist center alpha, got ${centerAlpha}`);

  const atmo = createOuterAtmosphere(THREE, null);
  assert.equal(atmo.enabled, false);
  const mats = createOuterWorldMaterials(THREE, null, atmo, { wallRadius: 220 });
  assert.equal(mats.tslActive, false);
  assert.ok(mats.concrete && mats.timber && mats.steel && mats.monolith && mats.water && mats.passRoad);
});

test('outerWorld.update handles Noon, Overcast/Rain, Dusk, Night, Blood Moon, Fog Night, Hollows & Training cleanly', () => {
  const ow = buildOuterWorld(THREE, { sampleHeight: mockSampleHeight });
  const hDay = new THREE.Color(0xd8e8ff);
  const hDusk = new THREE.Color(0xff9a52);
  const hNight = new THREE.Color(0x0b1424);
  const mNight = new THREE.Color(0x050a14);

  // Noon: visible, beacons off
  ow.update(0.1, { nightMix: 0, dusk: 0, rainK: 0, fogNightK: 0, horizonColor: hDay });
  assert.equal(ow.group.visible, true);
  const amberCore = ow.group.getObjectByName('outer-amber-lights-core');
  assert.ok(amberCore && amberCore.visible === false, 'amber distant town lights should be off at Noon');

  // Overcast/Rain: birds roost during heavy rain
  ow.update(0.2, { nightMix: 0, dusk: 0.1, rainK: 0.85, fogNightK: 0, horizonColor: new THREE.Color(0x7d8a96) });
  assert.equal(ow.group.getObjectByName('outer-alpine-birds').visible, false, 'birds should roost during heavy rain');

  // Dusk: amber town/lookout lights wake up!
  ow.update(0.5, { nightMix: 0.35, dusk: 0.85, rainK: 0, fogNightK: 0, horizonColor: hDusk });
  assert.equal(amberCore.visible, true, 'amber lights should turn on at Dusk');

  // Clear Night: lights bright, birds roosted, far ranges stay cohesive dark silhouette
  ow.update(0.5, { nightMix: 0.98, dusk: 0, rainK: 0, fogNightK: 0, horizonColor: hNight, skyMidColor: mNight });
  assert.equal(amberCore.visible, true, 'amber lights should glow at clear Night');
  assert.equal(ow.group.getObjectByName('outer-alpine-birds').visible, false, 'birds should roost at Night');
  const farRange = ow.group.getObjectByName('outer-alpine-far-cordillera');
  const fc = farRange.geometry.attributes.color.array;
  let maxFarNightLum = 0;
  for (let i = 0; i < fc.length; i += 3) {
    maxFarNightLum = Math.max(maxFarNightLum, fc[i] * 0.3 + fc[i + 1] * 0.59 + fc[i + 2] * 0.11);
  }
  assert.ok(maxFarNightLum < 0.08, `far range should stay dark cohesive night silhouette, got max lum ${maxFarNightLum.toFixed(4)}`);

  // Fog Night: distant lights & far ranges hidden cleanly so nothing pokes through 32 m mist!
  ow.update(0.5, { nightMix: 0.98, dusk: 0, rainK: 0, fogNightK: 0.95, horizonColor: hNight, skyMidColor: mNight });
  assert.equal(amberCore.visible, false, 'amber lights must hide during Fog Night');
  assert.equal(farRange.visible, false, 'far range must hide during Fog Night');

  // Hollows & Training Ground hide entire outer world
  ow.update(0.1, { inHollow: true, nightMix: 0, dusk: 0, horizonColor: hDay });
  assert.equal(ow.group.visible, false);
  ow.update(0.1, { inTraining: true, nightMix: 0, dusk: 0, horizonColor: hDay });
  assert.equal(ow.group.visible, false);
  ow.update(0.1, { inHollow: false, inTraining: false, nightMix: 0, dusk: 0, horizonColor: hDay });
  assert.equal(ow.group.visible, true);
});

test('buildOuterWorld runs cleanly under tools/tests/fakethree.mjs (npm test harness compatibility)', async () => {
  const FakeTHREE = await import('../tools/tests/fakethree.mjs');
  const ow = buildOuterWorld(FakeTHREE, { sampleHeight: mockSampleHeight });
  assert.equal(ow.group.name, 'outer-world-vistas');
  assert.equal(ow.landmarks.length, 7);
  ow.update(0.1, { nightMix: 0, dusk: 0, rainK: 0, fogNightK: 0, horizonColor: new FakeTHREE.Color(0xd8e8ff) });
  ow.update(0.5, { nightMix: 0.92, dusk: 0.35, rainK: 0, fogNightK: 0, horizonColor: new FakeTHREE.Color(0x0b1424) });
  ow.update(0.1, { inHollow: true });
  assert.equal(ow.group.visible, false);
  ow.update(0.1, { inHollow: false, inTraining: false });
  assert.equal(ow.group.visible, true);
});
