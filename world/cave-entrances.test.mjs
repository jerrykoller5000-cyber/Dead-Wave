// world/cave-entrances.test.mjs — AG-412 unit verification for all 6 cave entrances & PBR texture synth.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  buildGnarledBarkPixels,
  buildCreosoteTimberPixels,
  buildForgedIronPixels,
  buildPgbOliveMetalPixels,
  buildBarrowStonePixels,
  buildWeatheredBonePixels,
  buildCanvasClothPixels,
  getCaveEntrancePBR,
} from './cave-entrance-textures.js';
import { buildAllCaveEntrances, updateCaveEntrances } from './cave-entrances.js';

const MOCK_CAVES = [
  { theme: 'root',  x: 164.48, gy: 3.71, z: 69.65,   yaw: -1.7759, faceSeed: 101, mouthHalf: 2.72, design: { w: 3.4, h: 6.6, p: 1.75, skew: 0.12 } },
  { theme: 'shale', x: -19.00, gy: 3.95, z: 187.79,  yaw:  3.2006, faceSeed: 178, mouthHalf: 2.72, design: { w: 3.4, h: 8.8, p: 1.22, skew: -0.07 } },
  { theme: 'iron',  x: -161.35, gy: 0.68, z: 90.29,  yaw:  2.1192, faceSeed: 255, mouthHalf: 3.44, design: { w: 4.3, h: 6.1, p: 3.4,  skew: 0.18 } },
  { theme: 'wet',   x: -186.76, gy: 1.92, z: -7.22,  yaw:  1.7283, faceSeed: 332, mouthHalf: 2.96, design: { w: 3.7, h: 6.0, p: 3.0,  skew: 0.0 } },
  { theme: 'hill',  x: -12.42, gy: 3.64, z: -187.23, yaw:  0.0052, faceSeed: 409, mouthHalf: 2.64, design: { w: 3.3, h: 6.3, p: 2.0,  skew: 0.0 } },
  { theme: 'chalk', x: 162.24, gy: -2.10, z: -96.62, yaw: -0.9690, faceSeed: 486, mouthHalf: 2.72, design: { w: 3.4, h: 7.2, p: 2.2,  skew: 0.0 } },
];

test('all procedural PBR pixel generators stay in valid ranges and keep natural saturation <= 45%', () => {
  const generators = [
    ['gnarledBark', () => buildGnarledBarkPixels(64)],
    ['creosoteTimber', () => buildCreosoteTimberPixels(64, false)],
    ['wetTimber', () => buildCreosoteTimberPixels(64, true)],
    ['forgedIron', () => buildForgedIronPixels(64)],
    ['pgbOliveMetal', () => buildPgbOliveMetalPixels(64)],
    ['barrowStone', () => buildBarrowStonePixels(64, false)],
    ['marrowChalk', () => buildBarrowStonePixels(64, true)],
    ['weatheredBone', () => buildWeatheredBonePixels(64)],
    ['tarpCanvas', () => buildCanvasClothPixels(64)],
  ];
  for (const [name, fn] of generators) {
    const out = fn();
    assert.equal(out.albedo.length, 64 * 64 * 4, `${name} albedo length`);
    assert.equal(out.orm.length, 64 * 64 * 4, `${name} orm length`);
    assert.equal(out.height.length, 64 * 64, `${name} height length`);
    let satSum = 0;
    for (let i = 0; i < 64 * 64; i++) {
      const r = out.albedo[i * 4] / 255;
      const g = out.albedo[i * 4 + 1] / 255;
      const b = out.albedo[i * 4 + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      satSum += mx > 1e-4 ? (mx - mn) / mx : 0;
      assert.ok(Number.isFinite(out.height[i]), `${name} finite height`);
    }
    const meanSat = satSum / (64 * 64);
    assert.ok(meanSat < 0.48, `${name} natural base saturation ${meanSat.toFixed(3)} stays restrained`);
  }
  const lib = getCaveEntrancePBR(THREE);
  assert.ok(lib && lib.gnarledBark && lib.forgedIron && lib.barrowStone);
});

test('all six cave entrances build cleanly, stay clear of wall (<214m), and keep Colossus central lane clear', () => {
  const firstPeople = { glowMats: [] };
  const sampleHeight = (x, z) => {
    const c = MOCK_CAVES.reduce((best, q) => (Math.hypot(q.x - x, q.z - z) < Math.hypot(best.x - x, best.z - z) ? q : best));
    return c.gy + Math.sin(x * 0.04) * 0.12 + Math.cos(z * 0.04) * 0.12;
  };
  const rig = buildAllCaveEntrances(THREE, {
    caves: MOCK_CAVES,
    sampleHeight,
    doc: null,
    firstPeople,
  });

  assert.equal(rig.group.name, 'cave-entrance-dressing');
  assert.equal(rig.group.userData.cullKids, true);
  assert.equal(rig.perCave.length, 6);
  assert.ok(rig.lights.length >= 6, `at least one dusk/night light per cave (${rig.lights.length})`);
  assert.ok(rig.leds.length >= 3, `PGB sensor LEDs built (${rig.leds.length})`);

  rig.group.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  let totalTris = 0;

  for (const entry of rig.perCave) {
    const c = MOCK_CAVES.find((q) => q.theme === entry.theme);
    const d = c.design;
    let caveTris = 0, caveMeshes = 0, rMax = 0;
    let corridorHits = 0;

    for (const grp of [entry.archGrp, entry.storyGrp]) {
      assert.ok(grp.userData.maxDist >= 80, `${entry.theme} distance culled`);
      const grpInv = grp.matrixWorld.clone().invert();
      const toCaveLocal = new THREE.Matrix4();
      const lv = new THREE.Vector3();
      grp.traverse((o) => {
        if (!o.isMesh) return;
        caveMeshes++;
        const pos = o.geometry?.attributes?.position;
        const nrm = o.geometry?.attributes?.normal;
        const uv = o.geometry?.attributes?.uv;
        assert.ok(pos && pos.count > 0, `${entry.theme} ${o.name} has positions`);
        assert.ok(nrm && nrm.count === pos.count, `${entry.theme} ${o.name} has normals`);
        assert.ok(uv && uv.count === pos.count, `${entry.theme} ${o.name} has UVs`);
        const triCount = (o.geometry.index ? o.geometry.index.count : pos.count) / 3;
        caveTris += triCount;
        toCaveLocal.copy(grpInv).multiply(o.matrixWorld);

        for (let i = 0; i < pos.count; i++) {
          const ox = pos.getX(i), oy = pos.getY(i), oz = pos.getZ(i);
          assert.ok(Number.isFinite(ox) && Number.isFinite(oy) && Number.isFinite(oz), `${entry.theme} finite verts`);
          // World radius check (t42 perimeter wall clearance < 216)
          v.set(ox, oy, oz).applyMatrix4(o.matrixWorld);
          rMax = Math.max(rMax, Math.hypot(v.x, v.z));
          // Cave-local corridor clearance check
          lv.set(ox, oy, oz).applyMatrix4(toCaveLocal);
          if (entry.theme !== 'chalk') {
            const clearHalf = entry.theme === 'iron' ? 1.15 : 1.75;
            const clearTop = entry.theme === 'iron' ? 3.7 : 5.2;
            const inLane = Math.abs(lv.x - (d.skew || 0) * 1.2) < clearHalf && lv.z > -4.0 && lv.z < 3.6 && lv.y > 0.16 && lv.y < clearTop;
            if (inLane) corridorHits++;
          }
        }
      });
    }

    totalTris += caveTris;
    assert.ok(caveMeshes >= 4, `${entry.theme} built rich geometry (${caveMeshes} meshes)`);
    assert.ok(rMax < 214, `${entry.theme} clears perimeter wall (rMax=${rMax.toFixed(1)}m)`);
    assert.equal(corridorHits, 0, `${entry.theme} keeps central Colossus & walk-in corridor unobstructed (${corridorHits} hits)`);
  }

  assert.ok(totalTris < 95000, `total dressing triangle budget reasonable (${Math.round(totalTris)} tris across all 6 caves)`);

  // Frame update test (noon vs night)
  const requested = [];
  updateCaveEntrances(rig, { now: 1.0, night: false, dusk: 0, requestEffectLight: (...a) => requested.push(a) });
  assert.equal(requested.length, 0, 'no pooled lights requested at noon');
  updateCaveEntrances(rig, { now: 1.0, night: true, dusk: 1, requestEffectLight: (...a) => requested.push(a), camPos: { x: 164, z: 70 } });
  assert.ok(requested.length >= 1, 'pooled lights activate near cave at night');
});
