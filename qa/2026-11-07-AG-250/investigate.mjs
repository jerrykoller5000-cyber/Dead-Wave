// qa/2026-11-07-AG-250/investigate.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-07-AG-250');

async function main() {
  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  });

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    await page.goto(url, { timeout: 180000 });
    await page.waitFor('!!window.TT', { timeout: 180000 });

    await page.evaluate(`(() => {
      if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting();
      else if (window.DWOpening?.skip) DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    const libCode = fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8');
    await page.evaluate(libCode);

    // Enter Training Ground
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'JERRY';
      const btn = document.getElementById('modeTraining');
      if (btn) btn.click();
    })()`);

    await page.waitFor('window.TT?.trainingDbg?.state().active', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // Audit viewmodel, filter, and arm textures
    const auditResult = await page.evaluate(`(() => {
      const T = window.TT;
      T.setHp(100000);
      T.grantAllWeapons();
      if (T.isUnarmed()) T.toggleHolster();
      T.setViewFirstDbg(true);

      const vm = T.viewmodelDbg();
      const renderer = T.renderer;

      // Check renderObjectFunction
      const currentFn = renderer.getRenderObjectFunction ? renderer.getRenderObjectFunction() : null;

      // Count filter calls
      let filterCalls = 0;
      let filterSkips = 0;
      const skippedNames = [];

      if (currentFn) {
        const orig = currentFn;
        renderer.setRenderObjectFunction((object, scene, camera, geometry, material, group, lightsNode, clippingContext, passId) => {
          filterCalls++;
          if (object.userData && object.userData.vmEyeHide === true) {
            filterSkips++;
            if (skippedNames.length < 20) skippedNames.push(object.name || object.type);
            return;
          }
          orig(object, scene, camera, geometry, material, group, lightsNode, clippingContext, passId);
        });
      }

      // Step 10 frames
      for (let i = 0; i < 10; i++) {
        T.stepFrame(1 / 60);
      }

      return {
        hasCurrentFn: !!currentFn,
        filterCalls,
        filterSkips,
        skippedNames,
        vmActive: vm?.info?.active,
        filterOn: vm?.filtering,
        arms: vm ? {
          rFore: {
            name: vm.arms.r.meshes.fore.name,
            mat: vm.arms.r.meshes.fore.material.name,
            matUuid: vm.arms.r.meshes.fore.material.uuid,
            mapUuid: vm.arms.r.meshes.fore.material.map?.uuid,
            camoTile: vm.arms.r.meshes.fore.geometry.attributes.uv ? 'has UV' : 'no UV'
          }
        } : null
      };
    })()`);

    console.log('[INVESTIGATE] Audit result:', JSON.stringify(auditResult, null, 2));

  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
