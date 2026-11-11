import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { launch } from '../../../tools/cdp.mjs';
import { serve } from '../../../tools/serve.mjs';
import { save } from '../../GT-20076/save.mjs';

const phase = process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before', 'after'].includes(phase));
const folder = new URL('./' + phase + '/', import.meta.url);
await mkdir(folder, { recursive: true });
const server = await serve(fileURLToPath(new URL('../../../', import.meta.url)), 0);
const browser = await launch({ headless: false });
try {
  const page = await browser.newPage({ width: 960, height: 540 });
  await page.goto(server.origin + '/index.html?inspect&debug=1&raf=timer');
  assert(await page.waitFor('window.DWInspect?.ready'));
  const subject = await page.evaluate("DWInspect.show('weapon.revolver', {instant:true})");
  assert.equal(subject.id, 'weapon.revolver');

  const geometry = await page.evaluate(`(async () => {
    const { makeRevolverModel } = await import('/studio/weapon-sidearms.js');
    const ctx = TT.inspectHost().builders.weaponContext();
    const model = makeRevolverModel({...ctx, finishGun: gun => gun});
    const point = new ctx.THREE.Vector3();
    model.updateMatrixWorld(true);
    const surfaces = [];
    model.traverse(mesh => {
      if (!mesh.isMesh) return;
      const vertices = [], position = mesh.geometry.attributes.position;
      const indices = mesh.geometry.index;
      for (let i = 0; i < (indices ? indices.count : position.count); i++) {
        point.fromBufferAttribute(position, indices ? indices.getX(i) : i).applyMatrix4(mesh.matrixWorld);
        vertices.push(Math.round(point.x * 1e6), Math.round(point.y * 1e6), Math.round(point.z * 1e6));
      }
      surfaces.push(vertices);
    });
    return surfaces;
  })()`);
  const hashes = geometry.map(points => createHash('sha256').update(JSON.stringify(points)).digest('hex'));
  const report = { id: subject.id, info: subject.info, surfaces: hashes };
  await save(new URL('inspector.json', folder), JSON.stringify(report, null, 2));
  if (phase === 'after') {
    const before = JSON.parse(await readFile(new URL('./before/inspector.json', import.meta.url), 'utf8'));
    assert.deepEqual(hashes, before.surfaces, 'Appearance edit changed a rest surface');
  }

  for (const view of ['side', 'rear3']) {
    for (const light of ['noon', 'overcast', 'dusk', 'night']) {
      const shot = await page.evaluate(`(async () => {
        DWInspect.light('${light}');
        DWInspect.view('${view}', {instant: true});
        await DWInspect.stepAsync(2);
        return DWInspect.shot({type: 'image/jpeg', quality: 0.95});
      })()`);
      const jpeg = Buffer.from(shot.split(',')[1], 'base64');
      assert(jpeg.length > 4000);
      await save(new URL(view + '-' + light + '.jpg', folder), jpeg);
    }
  }
  assert.deepEqual(page.errors, []);
  console.log(phase, hashes.length, 'raw rest surfaces, eight inspector views');
} finally {
  await browser.close();
  await server.close();
}
