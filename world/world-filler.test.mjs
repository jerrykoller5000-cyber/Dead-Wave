// world/world-filler.test.mjs — AG-418: Unit tests for World Filler props, placements, interactions, and strings.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.webgpu.js';
import { buildWorldFiller, VIGNETTE_SPECS, RECON_MILESTONES } from './world-filler.js';
import { buildVignetteModel, buildMicroPropPrototypes } from './world-filler-props.js';
import { hasText, text } from '../ui/strings.js';

function makeMockValley() {
  const lake = { x: -138, z: -104, r: 54, level: -3.4 };
  const sampleHeight = (x, z) => {
    const dl = Math.hypot(x - lake.x, z - lake.z);
    if (dl < lake.r + 12) {
      const t = Math.max(0, Math.min(1, (dl - (lake.r - 8)) / 20));
      return -5.2 + t * 5.6;
    }
    return 1.2 + Math.sin(x * 0.025) * 2.2 + Math.cos(z * 0.022) * 1.9;
  };
  const waterDepthAt = (x, z) => Math.max(0, lake.level - sampleHeight(x, z));
  const distToRiver = (x, z) => Math.abs(z - (66 - x * 0.14));

  const poi = {
    campsites: [{ x: 128, z: 0 }, { x: 22, z: -126 }, { x: -12, z: 140 }],
    cabins: [{ x: 20, z: 104.1 }, { x: 91.4, z: -66.8 }],
    tower: { x: -25, z: -125 },
    graveyard: { x: -90, z: 89.2 },
    dock: { x: -86.1, z: -64.9 },
    bridges: [{ x: 56.4, z: 72.8 }, { x: -46.8, z: 50.1 }],
    sheds: [{ x: 33.7, z: 33.6 }, { x: -63.5, z: -104.6 }, { x: -116, z: 10 }],
    wrecks: [{ x: -117.6, z: 46 }, { x: -99.9, z: -41.8 }],
    mast: { x: -153.4, z: -4.2 },
    caves: [
      { x: 164.5, z: 69.6, theme: 'root', yaw: -1.78 },
      { x: -19, z: 187.8, theme: 'shale', yaw: 3.2 },
      { x: -161.4, z: 90.3, theme: 'iron', yaw: 2.12 },
      { x: -186.8, z: -7.2, theme: 'wet', yaw: 1.73 },
      { x: -12.4, z: -187.2, theme: 'hill', yaw: 0.01 },
      { x: 162.2, z: -96.6, theme: 'chalk', yaw: -0.97 },
    ],
  };

  const paths = [
    [{ x: 0, z: 0 }, { x: 42, z: -20 }, { x: 128, z: 0 }],
    [{ x: 0, z: 0 }, { x: -46.8, z: 50.1 }, { x: -90, z: 89.2 }],
    [{ x: 0, z: 0 }, { x: -86.1, z: -64.9 }],
    [{ x: 0, z: 0 }, { x: -116, z: 10 }, { x: -153.4, z: -4.2 }],
  ];
  const pathHubs = [
    { x: 42, z: -20, n: 3 },
    { x: -46.8, z: 50.1, n: 3 },
    { x: -55, z: -38, n: 2 },
    { x: 64, z: 22, n: 2 },
    { x: -72, z: 12, n: 2 },
  ];
  const worldSolids = [];
  const addSolid = (x, z, radius, y0, y1) => {
    const s = { x, z, radius, y0, y1 };
    worldSolids.push(s);
    return s;
  };
  const firstPeople = {
    sites: [
      { x: 94, z: -179.9 },
      { x: 60.9, z: 118.3 },
      { x: -87.2, z: 167.7 },
      { x: 7, z: -139.8 },
    ],
  };

  return {
    sampleHeight,
    waterDepthAt,
    distToRiver,
    wallRadius: 215,
    poi,
    paths,
    pathHubs,
    lake,
    worldSolids,
    trees: [],
    rocks: [],
    historyTaken: [],
    firstPeople,
    landing: { x: 42, z: -20 },
    addSolid,
  };
}

test('every vignette model builds cleanly with finite vertices, hinged lid, loot prop and compact solids', () => {
  assert.equal(VIGNETTE_SPECS.length, 14);
  for (const spec of VIGNETTE_SPECS) {
    const built = buildVignetteModel(THREE, spec.id, null);
    assert.ok(built.group, spec.id);
    assert.ok(built.lidPivot, `${spec.id} missing hinged lidPivot`);
    assert.ok(built.lootMesh, `${spec.id} missing inner lootMesh`);
    assert.ok(built.solids.length >= 1, `${spec.id} missing collision solid`);

    let meshes = 0;
    let minY = Infinity;
    built.group.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      meshes++;
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z), `${spec.id} non-finite vert`);
        if (y < minY) minY = y;
      }
    });
    assert.ok(meshes >= 2, `${spec.id} should have meshes`);
    assert.ok(minY <= 0.15, `${spec.id} base hovers above ground (minY=${minY.toFixed(3)})`);
  }
});

test('all micro-prop prototypes have buried roots so none hover on terrain slopes', () => {
  const protos = buildMicroPropPrototypes(THREE);
  for (const key of ['milepost', 'stake', 'wallStub', 'piling', 'cairn']) {
    const g = protos[key].geo;
    g.computeBoundingBox();
    assert.ok(g.boundingBox.min.y < -0.1, `${key} root not buried (min.y=${g.boundingBox.min.y.toFixed(3)})`);
    assert.ok(g.boundingBox.max.y > 0.3, `${key} unexpectedly flat`);
  }
});

test('buildWorldFiller places all 14 vignettes deterministically with strict clearance & micro-prop layers', () => {
  const ctxA = makeMockValley();
  const wfA = buildWorldFiller(THREE, ctxA);
  const ctxB = makeMockValley();
  const wfB = buildWorldFiller(THREE, ctxB);

  assert.equal(wfA.vignettes.length, 14, `expected all 14 vignettes placed, got ${wfA.vignettes.length}`);
  assert.equal(wfB.vignettes.length, 14);

  for (let i = 0; i < wfA.vignettes.length; i++) {
    const a = wfA.vignettes[i], b = wfB.vignettes[i];
    assert.equal(a.id, b.id);
    assert.equal(a.x, b.x, `${a.id} non-deterministic x`);
    assert.equal(a.z, b.z, `${a.id} non-deterministic z`);
    assert.equal(a.yaw, b.yaw, `${a.id} non-deterministic yaw`);

    const r = Math.hypot(a.x, a.z);
    assert.ok(r >= 31 && r <= 204, `${a.id} out of playable band (r=${r.toFixed(1)})`);
    assert.equal(ctxA.waterDepthAt(a.x, a.z), 0, `${a.id} placed in water`);
    assert.ok(a.span <= 0.85, `${a.id} footprint span too steep (${a.span.toFixed(2)})`);
    for (let j = i + 1; j < wfA.vignettes.length; j++) {
      const d = Math.hypot(a.x - wfA.vignettes[j].x, a.z - wfA.vignettes[j].z);
      assert.ok(d >= 20, `${a.id} and ${wfA.vignettes[j].id} too close (${d.toFixed(1)} m)`);
    }
  }

  assert.ok(wfA.microCounts.mileposts >= 3, `expected mileposts, got ${wfA.microCounts.mileposts}`);
  assert.ok(wfA.microCounts.stakes >= 8, `expected survey stakes, got ${wfA.microCounts.stakes}`);
  assert.ok(wfA.microCounts.wallStubs >= 6, `expected Coldwater wall stubs, got ${wfA.microCounts.wallStubs}`);
  assert.ok(wfA.microCounts.cairns >= 8, `expected cairns, got ${wfA.microCounts.cairns}`);
  assert.equal(wfA.microCounts.fireflies, 48);
});

test('interaction lifecycle: loot state, lid swing, daily refresh, recon milestones, reset, and hollow/training hide', () => {
  const ctx = makeMockValley();
  const wf = buildWorldFiller(THREE, ctx);

  // Auto-hide in Hollows and Training Ground
  wf.update(0.05, { inTraining: true });
  assert.equal(wf.group.visible, false);
  wf.update(0.05, { inHollow: true });
  assert.equal(wf.group.visible, false);
  wf.update(0.05, { inHollow: false, inTraining: false, nightMix: 0.9 });
  assert.equal(wf.group.visible, true);

  // Loot first 5 vignettes -> triggers 5/14 milestone
  let m5 = null;
  for (let i = 0; i < 5; i++) {
    const v = wf.vignettes[i];
    const near = wf.nearestInteract(v.anchor.x, v.y, v.anchor.z, 1);
    assert.ok(near && near.id === v.id && near.mode === 'loot');
    const res = wf.interact(v.id, { day: 1 });
    assert.ok(res && res.ok && res.mode === 'loot');
    assert.equal(v.model.lootMesh.visible, false);
    if (res.milestone) m5 = res.milestone;
  }
  assert.ok(m5 && m5.count === 5, 'expected 5/14 recon milestone');

  // Lid smoothly opens during update ticks
  for (let k = 0; k < 20; k++) wf.update(0.05, { nightMix: 0.2 });
  assert.ok(Math.abs(wf.vignettes[0].model.lidPivot.rotation.x) > 1.2, 'expected hinged lid to swing open');

  // Repeatable daily utility: stone-well-spring refreshes on Day 2 (not Day 1)
  const well = wf.vignettes.find((v) => v.id === 'stone-well-spring');
  const firstWell = wf.interact(well.id, { day: 1 });
  assert.ok(firstWell && firstWell.mode === 'loot');
  assert.equal(wf.nearestInteract(well.anchor.x, well.y, well.anchor.z, 1), null, 'daily utility should not re-arm on same day');
  const nextDayNear = wf.nearestInteract(well.anchor.x, well.y, well.anchor.z, 2);
  assert.ok(nextDayNear && nextDayNear.mode === 'daily');
  const dailyRes = wf.interact(well.id, { day: 2 });
  assert.ok(dailyRes && dailyRes.mode === 'daily' && dailyRes.rewards.heal === 35);

  // Reset restores all loot, lids, and milestones cleanly
  wf.reset();
  assert.equal(wf.getDebugState().lootedCount, 0);
  assert.equal(wf.vignettes[0].model.lootMesh.visible, true);
  assert.equal(wf.vignettes[0].model.lidPivot.rotation.x, 0);
});

test('all vignette and milestone string keys exist in ui/strings.js and format cleanly', () => {
  assert.ok(hasText('filler.noteTitle'));
  for (const spec of VIGNETTE_SPECS) {
    for (const suffix of ['name', 'prompt', 'note']) {
      const key = `filler.${spec.id}.${suffix}`;
      assert.ok(hasText(key), `missing string key ${key}`);
      assert.ok(text(key).length > 3, `empty string ${key}`);
    }
    if (spec.daily) {
      for (const suffix of ['dailyPrompt', 'dailyNote']) {
        const key = `filler.${spec.id}.${suffix}`;
        assert.ok(hasText(key), `missing daily string key ${key}`);
        assert.ok(text(key).length > 3);
      }
    }
  }
  for (const ms of RECON_MILESTONES) {
    assert.ok(hasText(ms.titleKey) && hasText(ms.lineKey));
  }
});
