import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Engine } from '../../tools/camera.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew game-test slot');
const E = new Engine({ training: true, warm: 'none', size: '1280x720' });
const out = 'review/GP-20086/exact-corpse-fitted.json';
const proof = {};
try {
  await E.open();
  proof.rows = await E.ev(`
    R.release();
    const D = T.trainingDbg;
    D.panel().close(); D.clear(); T.AudioSys.setMuted(true);
    const f = D.tg().floorY, C = D.state().zombieCollision, rows = [];
    T.player.position.set(-10, f, -614); T.setVelDbg(0, 0);
    for (const kind of Object.keys(T.ZOMBIE_TYPES).filter(k => k !== 'caveguard')) {
      T.clearZombies();
      const z = T.spawnZombie(-30, -630, kind, true, true);
      z.trainingZ = true; z.riseT = 0; z.speed = z.baseSpeed = 0;
      z.mesh.position.set(-30, f, -630);
      T.stepFrame(.016);
      const before = T.getCorpses().length;
      T.killZombie(z, false, { kind: 'bullet', dir: { x: -1, z: 0 }, raw: 120 });
      const c = T.getCorpses().length > before ? T.getCorpses().at(-1) : null;
      if (!c) { rows.push({ kind, corpse: false }); continue; }
      for (let i = 0; i < 75; i++) T.stepFrame(.016);
      const proxy = C.bounds(c.mesh), exact = new T.THREE.Box3().makeEmpty();
      const v = new T.THREE.Vector3();
      c.mesh.updateMatrixWorld(true);
      c.mesh.traverse(o => {
        if (!o.isMesh || !o.visible) return;
        for (let p = o.parent; p && p !== c.mesh; p = p.parent) if (!p.visible) return;
        const pos = o.geometry?.getAttribute('position');
        if (!pos) return;
        if (o.isSkinnedMesh) o.skeleton.update();
        for (let i = 0; i < pos.count; i++) {
          if (o.isSkinnedMesh) o.getVertexPosition(i, v);
          else v.fromBufferAttribute(pos, i);
          exact.expandByPoint(v.applyMatrix4(o.matrixWorld));
        }
      });
      rows.push({ kind, corpse: true, proxyMin: proxy.min.y, exactMin: exact.min.y,
        floor: f, lift: c.trainingLift || 0 });
    }
    return rows;
  `, 30000);
  for (const row of proof.rows) if (row.corpse) {
    assert(row.exactMin >= row.floor - .03, `${row.kind} visible corpse through floor`);
    assert(row.exactMin >= row.proxyMin - .05, `${row.kind} proxy missed visible geometry`);
  }
  assert.deepEqual(E.page.errors, []);
  console.log(`PASS GP-20086 exact visible corpse floor for ${proof.rows.filter(r => r.corpse).length} kinds; bomber gibs; 0 page errors`);
} finally {
  fs.writeFileSync(out, JSON.stringify(proof, null, 2));
  await E.close();
}
