import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../../tools/cdp.mjs';
import { serve } from '../../tools/serve.mjs';

const phase = process.argv[2];
assert(['before', 'after', 'before-ext', 'after-ext', 'optics'].includes(phase) && process.env.DW_GAME_TEST_TOKEN);
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = path.join(root, 'review/GT-20075', phase);
await fs.mkdir(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false });
try {
  const page = await browser.newPage({ width: 960, height: 540 });
  await page.goto(server.origin + '/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state === "ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.querySelector("#opening").hidden'));
  await page.evaluate(await fs.readFile(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  await page.evaluate("startMatch(TT, 'Model review')");
  await page.evaluate(`TT.clearZombies(); TT.grantAllWeapons(); TT.setHp(100000); TT.modsOwnAllDbg();
    if(TT.isUnarmed()) TT.toggleHolster();
    for(const [id,optic] of [['ak','acog'],['m4','acog'],['minigun','rmr'],['aa12','rmr']]) {
      if (!TT.opticDbg.fit(id,optic) && TT.opticDbg.fitted()[id] !== optic) throw Error('fit '+id);
    }
    for(const id of ['m4','ak']) TT.armoryDbg.fit(id,'suppressor',true);
    TT.weaponMeshes.aa12.userData.laserLightUnit.visible = true;
    const quiet = document.createElement('style');
    quiet.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';
    window.modelReviewStyle = quiet;`);
  const extended = phase.endsWith('-ext');
  if (extended) {
    await page.evaluate("TT.addCash(100000); TT.buyExtMag('aa12'); TT.armoryDbg.fit('aa12','ext',true)");
    assert(await page.evaluate("TT.weaponMods('aa12').ext"), 'extended drum fitted');
  }
  const ids = extended ? ['aa12'] : ['m4','ak','minigun','revolver','aa12','flamer','launcher','sniper'];
  const capture = async name => {
    const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 91, captureBeyondViewport: false });
    await fs.writeFile(path.join(out, name + '.jpg'), Buffer.from(shot.data, 'base64'));
  };
  if (phase === 'optics') {
    const mounts = await page.evaluate('Object.entries(TT.opticDbg.options).flatMap(([id,kinds])=>kinds.map(kind=>[id,kind]))');
    mounts.push(['sniper','nx8']);
    for (const [id,kind] of mounts) {
      const size = kind === 'nx8' ? .69 : .40;
      await page.evaluate(`(() => {
        const id=${JSON.stringify(id)},kind=${JSON.stringify(kind)};
        if(id!=='sniper' && TT.opticDbg.fitted()[id]!==kind && !TT.opticDbg.fit(id,kind)) throw Error('cannot fit '+id+' '+kind);
        const gun=TT.weaponMeshes[id];
        const optic=id==='sniper'?gun.getObjectByName('optic.nx8'):gun.userData.fittedOptic;
        if(!optic?.visible) throw Error('optic hidden '+id+' '+kind);
        const target=gun.worldToLocal(optic.getWorldPosition(gun.position.clone())).multiply(gun.scale);
        const copy=TT.cloneLean(gun);
        copy.visible=true; copy.rotation.set(0,0,0); copy.position.set(30,80,-60);
        TT.scene.add(copy); window.reviewCopy=copy; document.head.append(modelReviewStyle);
        const tx=30+target.x,ty=80+target.y+.014,tz=-60+target.z;
        TT.setShotView({x:tx+${size},y:ty+.007,z:tz-.028,tx,ty,tz,fov:27});
        return new Promise(r=>setTimeout(r,240));
      })()`);
      await capture(id+'-'+kind);
      await page.evaluate('TT.scene.remove(reviewCopy); true');
    }
    console.log('PASS',mounts.length,'fitted optic close-ups');
  }
  for (const id of phase === 'optics' ? [] : ids) {
    const weapon = JSON.stringify(id);
    await page.evaluate(`TT.setViewFirstDbg(false); TT.setWorldTime(.4); TT.weather.raining=false; TT.weather.intensity=0;
      TT.setWeapon(TT.WEAPON_ORDER.indexOf(${weapon}));`);
    assert(await page.waitFor(`TT.getCurrentWeapon() === ${weapon}`));
    await page.evaluate(`(() => {
      const g=TT.weaponMeshes[${weapon}];
      const copy=TT.cloneLean(g);
      copy.visible=true; copy.rotation.set(0,0,0); copy.position.set(30,80,-60);
      const fx=[g.userData.flash,g.userData.laser,g.userData.flare].filter(Boolean).map(o=>o.material);
      copy.traverse(o=>{if(o.isLight || (o.isMesh && fx.includes(o.material))) o.visible=false;});
      TT.scene.add(copy); window.modelReviewGun=copy;
      document.head.append(modelReviewStyle);
    })()`);
    for (const [name,x,y,z,tz] of [['side',1.72,.02,.12,.12],['rear-quarter',.85,.34,-.72,.025]]) {
      await page.evaluate(`TT.setShotView({x:30+${x},y:80+${y},z:-60+${z},tx:30,ty:80,tz:-60+${tz},fov:30});new Promise(r=>setTimeout(r,220))`);
      await capture(id + '-' + name);
    }
    await page.evaluate('TT.scene.remove(modelReviewGun); TT.setShotView(null); modelReviewStyle.remove(); TT.setViewFirstDbg(true)');
    assert(await page.waitFor(`TT.viewmodelDbg()?.info.key===${weapon} && TT.fpDbg().w>.99 && TT.viewmodelDbg().info.raise>.99`));
    for (const [name,time,rain] of [['noon',.4,false],['overcast',.4,true],['dusk',.68,false],['night',0,false]]) {
      await page.evaluate(`TT.weather.raining=${rain}; TT.weather.rainTimeLeft=${rain?100:0}; TT.weather.intensity=${rain?1:0}; TT.setWorldTime(${time}); new Promise(r=>setTimeout(r,350))`);
      await capture(id + '-' + name);
    }
    console.log(id + ': two model angles and four first-person lights');
  }
  assert.deepEqual(page.errors, []);
  console.log('PASS', phase, phase === 'optics' ? '' : ids.length * 6 + ' captures', await page.evaluate('TT.getRendererBackend()'));
} finally {
  await browser.close();
  await server.close();
}
