import assert from 'node:assert/strict';
import fs from 'node:fs';
import { IdleProofCamera } from '../../review/GP-20218/proof-camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot');

const libSrc = fs.readFileSync('tools/tests/lib.js', 'utf8');
const t215Src = fs.readFileSync('tools/tests/t215.js', 'utf8');

async function runSide(label, files) {
  const camera = new IdleProofCamera({ onscreen: true, size: '1280x800', warm: 'none', files });
  try {
    await camera.open();
    const p = camera.page;
    assert.equal(await p.evaluate('TT.getRendererBackend()'), 'WebGPU');
    const checks = await p.evaluate(`(() => {
      const h = TT.house, g = h.group.getObjectByName('hq-cif');
      let meshes = 0, triangles = 0, lights = 0, sharedLamp = false;
      g.traverse((o) => {
        if (o.isMesh) {
          meshes++;
          triangles += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
          if (o.material === h.bayLampMat) sharedLamp = true;
        }
        if (o.isLight) lights++;
      });
      const sign = g.getObjectByName('cif-exterior-sign')?.material === h.lockSigns[0];
      return { anchor: g.position.toArray(), yaw: g.rotation.y, front: TT.HQ_CIF_FRONT, signs: h.lockSigns.length, meshes, triangles: Math.round(triangles), lights, sharedLamp, sign };
    })()`);
    await p.evaluate(libSrc);
    const t215 = await p.evaluate(t215Src, 120000);
    const t215Lines = String(t215).split('\n');
    const t215Pass = t215Lines.filter((l) => l.startsWith('PASS ')).length;
    const t215Fail = t215Lines.filter((l) => l.startsWith('FAIL '));
    await p.evaluate('TT.player.position.set(TT.HQ_CIF_FRONT.x, TT.house.group.position.y, TT.HQ_CIF_FRONT.z); TT.openCIF();');
    const opens = await p.evaluate('TT.isCIFOpen()');
    await p.evaluate('TT.closeCIF();');
    const closed = !(await p.evaluate('TT.isCIFOpen()'));
    assert.deepEqual(p.errors, []);
    return { label, checks, t215Pass, t215Fail, opens, closed, errors: p.errors };
  } finally {
    await camera.close();
  }
}

const before = await runSide('before', undefined);
await new Promise((r) => setTimeout(r, 1500));
const after = await runSide('after', { '/ui/cif-exterior.js': 'review/CH-3/cif/cif-exterior.ch3c.js' });

// Mirror ui/cif-exterior.browser.mjs exact assertions
assert.equal(after.checks.signs, 2);
assert.deepEqual(after.checks.anchor, before.checks.anchor);
assert.deepEqual(after.checks.front, before.checks.front);
assert.equal(after.checks.yaw, before.checks.yaw);
assert.equal(after.checks.lights, 0);
assert.equal(after.checks.sharedLamp, true);
assert.equal(after.checks.sign, true);
assert.equal(after.t215Fail.length, 0);
assert.equal(after.opens, true);
assert.equal(after.closed, true);

fs.writeFileSync('review/CH-3/cif/native/cdp-gate.json', JSON.stringify({ before, after }, null, 2) + '\n');
console.log('CIF_CDP_GATE_PASS', JSON.stringify({
  anchorMatch: true, frontMatch: true, yawMatch: true, lights: after.checks.lights,
  sharedLamp: after.checks.sharedLamp, sign: after.checks.sign,
  t215: `${after.t215Pass}/${after.t215Fail.length}`, opens: after.opens,
}));
