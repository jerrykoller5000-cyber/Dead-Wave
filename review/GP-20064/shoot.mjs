import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const phase = process.argv[2] || 'before';
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  for (const light of ['noon', 'overcast', 'dusk', 'night']) {
    for (const weapon of (process.argv[3] ? process.argv.slice(3) : ['knife', 'machete', 'katana', 'grenade'])) {
      const out = path.join(root, `review/GP-20064/${phase}/${light}/${weapon}`);
      fs.mkdirSync(out, { recursive: true });
      const query = new URLSearchParams({ gun: weapon === 'machete' ? 'knife' : weapon, w: '1280', h: '720', lit: light, blade: weapon === 'machete' ? 'machete' : 'knife' });
      await page.goto(`${server.origin}/tools/gunshot/index.html?${query}`, { timeout: 120000 });
      if (!await page.waitFor('!!window.GUNSHOT?.ready', { timeout: 30000 })) throw new Error(`GUNSHOT did not boot: ${weapon} ${light}`);
      let info = await page.evaluate('window.GUNSHOT.ready');
      if (light === 'overcast' || light === 'dusk') {
        await page.evaluate(`(() => {
          const G = window.GUNSHOT, light = ${JSON.stringify(light)};
          const sky = G.scene.children.find(o => o.isHemisphereLight);
          const dirs = G.scene.children.filter(o => o.isDirectionalLight);
          const sun = dirs[0], fill = dirs[1];
          if (light === 'overcast') {
            sky.color.setHex(0xd4d7de); sky.groundColor.setHex(0x7c7e82); sky.intensity = 1.85;
            sun.color.setHex(0xe6e8ee); sun.intensity = 0.65; sun.position.set(0.25, 1, 0.35);
            fill.intensity = 0.42;
          } else {
            sky.color.setHex(0xffc4a2); sky.groundColor.setHex(0x4a3428); sky.intensity = 0.65;
            sun.color.setHex(0xffb07a); sun.intensity = 1.55; sun.position.set(0.9, 0.26, 0.12);
            fill.intensity = 0.1;
          }
        })()`);
      }
      if (weapon === 'knife' || weapon === 'machete') {
        info = await page.evaluate(`(async () => {
          const G = window.GUNSHOT, g = G.gun, T = G.THREE;
          g.visible = true; g.updateMatrixWorld(true);
          const b = new T.Box3(), part = new T.Box3(); let tris = 0;
          g.traverse(o => { if (!o.isMesh || !o.visible || !o.geometry || !o.parent?.visible) return;
            if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
            part.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); b.union(part);
            tris += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3;
          });
          G.bladeBox = b;
          return { tris: Math.round(tris), box: { min: b.min.toArray(), max: b.max.toArray() }, floats: [] };
        })()`);
      }
      for (const view of ['side', 'quarter', 'close', 'sideR']) {
        if (weapon === 'knife' || weapon === 'machete') {
          await page.evaluate(`(async () => {
            const G = window.GUNSHOT, T = G.THREE, b = G.bladeBox, c = b.getCenter(new T.Vector3()), size = b.getSize(new T.Vector3()), cam = G.camera;
            const d = ${JSON.stringify(view)} === 'close' ? 0.55 : Math.max(size.x, size.y, size.z) * 0.52 / Math.tan(cam.fov * Math.PI / 360) * 1.08;
            const v = ${JSON.stringify(view)};
            if (v === 'side') cam.position.set(c.x + d, c.y, c.z);
            else if (v === 'sideR') cam.position.set(c.x - d, c.y, c.z);
            else cam.position.set(c.x + d * 0.7, c.y + d * 0.45, c.z - d * 0.55);
            cam.lookAt(c); await G.renderer.renderAsync(G.scene, cam);
          })()`);
        } else await page.evaluate(`window.GUNSHOT.shoot(${JSON.stringify(view)})`);
        await page.screenshot(path.join(out, `${weapon}-${view}.png`));
      }
      const errors = page.errors.splice(0);
      fs.writeFileSync(path.join(out, `${weapon}.json`), JSON.stringify({ weapon, light, info, errors }, null, 2) + '\n');
      console.log(JSON.stringify({ weapon, light, tris: info.tris, floats: info.floats.length, errors: errors.length }));
      if (errors.length) throw new Error(errors[0]);
    }
  }
} finally { await browser.close(); await server.close(); }
