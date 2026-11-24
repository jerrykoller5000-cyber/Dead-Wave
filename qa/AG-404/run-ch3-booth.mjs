import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { IdleProofCamera } from '../../review/GP-20218/proof-camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot');

const OUT = 'review/CH-3/booth/native';
fs.mkdirSync(OUT, { recursive: true });

const LIVE = 'index.html';
const COPY = 'review/CH-3/booth/index.ch3b.html';
const md5 = (p) => createHash('md5').update(fs.readFileSync(p)).digest('hex');
const sha256 = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const liveMd5 = md5(LIVE);
const copyMd5 = md5(COPY);
assert.equal(liveMd5.slice(0, 8), '22afb368', `Expected live 22afb368, got ${liveMd5}`);
assert.equal(copyMd5.slice(0, 8), '4cc9f507', `Expected booth copy 4cc9f507, got ${copyMd5}`);

const c08 = JSON.parse(fs.readFileSync('review/CH-3/walk/closeups/C08-armory-booth.json', 'utf8')).cam;
const libSrc = fs.readFileSync('tools/tests/lib.js', 'utf8');

async function captureBoothSide(side, file) {
  const dir = `${OUT}/${side}`;
  fs.mkdirSync(dir, { recursive: true });
  const expectedSha = sha256(file);
  const rec = { side, file, md5: md5(file), sha256: expectedSha, draws: {}, shots: {} };

  // 1) Training views (1920x1080): C08 front, wide 5m, hatch 1m left — lamps ON and OFF
  {
    const camera = new IdleProofCamera({ onscreen: true, training: true, size: '1920x1080', warm: 'none', files: { '/index.html': file } });
    try {
      await camera.open();
      const p = camera.page;
      const r = await fetch(camera.server.origin + '/index.html');
      assert.equal(createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex'), expectedSha);
      assert.equal(await p.evaluate('TT.getRendererBackend()'), 'WebGPU');
      await p.evaluate(`(() => {
        CamRig.ui(false);
        TT.clearZombies();
        TT.flightHold(true);
        TT.grantAllWeapons();
        TT.setWeapon(TT.WEAPON_ORDER.indexOf('pistol'));
        if (TT.armoryDbg?.refreshRack) TT.armoryDbg.refreshRack();
        for (let i = 0; i < 4; i++) TT.stepFrame(1 / 60);
      })()`);

      // Count meshes/tris/materials in Training armory booth copy and draw calls
      rec.draws.training = await p.evaluate(`(() => {
        const tg = TT.trainingDbg.tg();
        let arm = null;
        tg.group.traverse((o) => { if (o.name === 'hq-armory' && !arm) arm = o; });
        let meshes = 0, tris = 0;
        const mats = new Set();
        if (arm) arm.traverse((o) => {
          if (o.isMesh && o.visible) {
            meshes++;
            tris += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
            mats.add(o.material);
          }
        });
        const info = TT.renderer.info?.render || {};
        return { found: !!arm, meshes, tris: Math.round(tris), uniqueMats: mats.size, frameCalls: info.calls ?? null, frameTris: info.triangles ?? null };
      })()`);

      const cams = [
        ['train-front', c08],
        ['train-wide5m', { x: 2.95, y: -198.1, z: -643.0, tx: 7.95, ty: -198.6, tz: -643.0, fov: 60 }],
        ['train-left1m', { x: 6.45, y: -198.45, z: -644.15, tx: 7.95, ty: -198.6, tz: -642.95, fov: 62 }],
      ];
      for (const lamps of [true, false]) {
        const ltag = lamps ? 'on' : 'off';
        await p.evaluate(`TT.trainingDbg.tg().setLights(${lamps}); TT.stepFrame(0);`);
        for (const [name, cam] of cams) {
          await p.evaluate(`TT.setShotView(${JSON.stringify(cam)}); TT.stepFrame(0);`);
          await new Promise((r) => setTimeout(r, 80));
          await p.evaluate('TT.stepFrame(0);');
          await new Promise((r) => setTimeout(r, 60));
          const outFile = `${dir}/${name}-${ltag}.png`;
          await p.screenshot(outFile);
          rec.shots[`${name}-${ltag}`] = outFile;
        }
      }
      assert.deepEqual(p.errors, []);
    } finally {
      await camera.close();
    }
  }

  // 2) HQ Armory front with guns on the rack (1920x1080), day (noon) & night (lamps off/dusk)
  {
    const camera = new IdleProofCamera({ onscreen: true, size: '1920x1080', warm: 'none', files: { '/index.html': file } });
    try {
      await camera.open();
      const p = camera.page;
      assert.equal(await p.evaluate('TT.getRendererBackend()'), 'WebGPU');
      await p.evaluate(libSrc);
      await p.evaluate("startMatch(TT, 'CH-3 booth HQ').then(()=>TT.getPhase())", 180000);
      await p.evaluate(`(() => {
        CamRig.ui(false);
        TT.clearZombies();
        TT.grantAllWeapons();
        TT.setWeapon(TT.WEAPON_ORDER.indexOf('pistol'));
        if (TT.armoryDbg?.refreshRack) TT.armoryDbg.refreshRack();
        TT.flightHold(true);
        for (let i = 0; i < 6; i++) TT.stepFrame(1 / 60);
      })()`);

      rec.draws.hq = await p.evaluate(`(() => {
        const h = TT.house.group;
        const arm = h.getObjectByName('hq-armory');
        let houseMeshes = 0, houseTris = 0, armMeshes = 0, armTris = 0;
        h.traverse((o) => { if (o.isMesh && o.visible) { houseMeshes++; houseTris += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3; } });
        if (arm) arm.traverse((o) => { if (o.isMesh && o.visible) { armMeshes++; armTris += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3; } });
        // Count live draw calls attributable to house.group vs hq-armory
        const info = TT.renderer.info?.render || {};
        const rackKinds = TT.armoryDbg?.rack ? TT.armoryDbg.rack() : [];
        return { houseMeshes, houseTris: Math.round(houseTris), armMeshes, armTris: Math.round(armTris), rackKinds, frameCalls: info.calls ?? null };
      })()`);

      for (const [tag, wt] of [['hq-front-day', 0.48], ['hq-front-night', 0.0]]) {
        await p.evaluate(`(() => {
          TT.setWorldTime(${wt});
          const arm = TT.house.group.getObjectByName('hq-armory');
          const b = arm.getWorldPosition(new TT.THREE.Vector3());
          // hq-armory sits on +X wall facing +X (rotation.y = PI/2)
          TT.setShotView({ x: b.x + 2.65, y: b.y + 1.65, z: b.z, tx: b.x, ty: b.y + 1.38, tz: b.z, fov: 62 });
          TT.stepFrame(0);
        })()`);
        await new Promise((r) => setTimeout(r, 80));
        await p.evaluate('TT.stepFrame(0);');
        await new Promise((r) => setTimeout(r, 60));
        const outFile = `${dir}/${tag}.png`;
        await p.screenshot(outFile);
        rec.shots[tag] = outFile;
      }
      assert.deepEqual(p.errors, []);
    } finally {
      await camera.close();
    }
  }

  return rec;
}

async function runGates(side, file) {
  const out = {};
  for (const name of ['t336', 'tcb339', 't182', 't179']) {
    const camera = new IdleProofCamera({ onscreen: true, size: '1600x900', warm: 'none', files: { '/index.html': file } });
    const g = { side, name };
    try {
      await camera.open();
      const p = camera.page;
      assert.equal(await p.evaluate('TT.getRendererBackend()'), 'WebGPU');
      await p.evaluate(libSrc);
      const text = await p.evaluate(fs.readFileSync(`tools/tests/${name}.js`, 'utf8'), 450000);
      const lines = String(text).split('\n');
      g.pass = lines.filter((l) => l.startsWith('PASS ')).length;
      g.fail = lines.filter((l) => l.startsWith('FAIL '));
      g.errors = p.errors;
    } catch (e) {
      g.error = String(e.message || e);
    } finally {
      await camera.close();
    }
    out[name] = g;
    console.log('BOOTH_GATE', side, name, JSON.stringify({ pass: g.pass, fail: g.fail, error: g.error }));
  }
  return out;
}

const before = await captureBoothSide('before', LIVE);
const after = await captureBoothSide('after', COPY);
const gatesBefore = await runGates('before', LIVE);
const gatesAfter = await runGates('after', COPY);

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({
  liveMd5, copyMd5, before, after, gatesBefore, gatesAfter,
}, null, 2) + '\n');
console.log('CH3_BOOTH_DONE');
