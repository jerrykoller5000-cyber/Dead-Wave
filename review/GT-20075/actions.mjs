import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../../tools/cdp.mjs';
import { serve } from '../../tools/serve.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'run in the shared slot');
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = path.join(root, 'review/GT-20075/actions');
await fs.mkdir(out, {recursive:true});
const server = await serve(root, 0);
const browser = await launch({headless:false});
try {
  const page = await browser.newPage({width:960,height:540});
  await page.goto(server.origin + '/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state === "ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.querySelector("#opening").hidden'));
  await page.evaluate(await fs.readFile(path.join(root,'tools/tests/lib.js'),'utf8'));
  await page.evaluate("startMatch(TT,'Model mechanics')");
  await page.evaluate(`(async () => {
    const T = await import('three');
    const {weaponModelContext} = await import('/tools/marine-inspector.js');
    const rifle = await import('/studio/weapon-longarms.js');
    const sidearm = await import('/studio/weapon-sidearms.js');
    const heavy = await import('/studio/weapon-heavy.js');
    const {spentCaseGeometry} = await import('/studio/weapon-casings.js');
    const ctx = weaponModelContext();
    TT.clearZombies(); TT.setHp(100000); TT.setWorldTime(.4);
    const quiet = document.createElement('style');
    quiet.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';
    document.head.append(quiet);
    const stand = new T.Group();
    stand.position.set(30,80,-60);
    TT.scene.add(stand);
    const models = {m4:rifle.makeM4Model, ak:rifle.makeAkModel, uzi:sidearm.makeUziModel,
      revolver:sidearm.makeRevolverModel, flamer:heavy.makeFlamerModel};
    const view = (x,y,z,tx,ty,tz) => TT.setShotView({x:30+x,y:80+y,z:-60+z,tx:30+tx,ty:80+ty,tz:-60+tz,fov:28});
    const model = id => {
      stand.clear();
      const gun = models[id](ctx);
      for(const item of ['flash','flashLight','laser','flare']) if (gun.userData[item]) gun.userData[item].visible=false;
      stand.add(gun);
      return gun.userData;
    };
    window.bench = {stand, model, view, ctx, T, spentCaseGeometry};
  })()`);
  const capture = async name => {
    await page.evaluate('new Promise(resolve=>setTimeout(resolve,240))');
    const frame = await page.send('Page.captureScreenshot',{format:'jpeg',quality:92});
    await fs.writeFile(path.join(out,name+'.jpg'),Buffer.from(frame.data,'base64'));
  };
  await page.evaluate(`(() => {
    const {T,stand,view,spentCaseGeometry}=bench;
    const keys=['pistol','revolver','m4','ak','minigun','sniper','shotgun','launcher'];
    const mat = new T.MeshStandardMaterial({vertexColors:true,metalness:.61,roughness:.32});
    for(const [i,id] of keys.entries()) {
      const geo=spentCaseGeometry(T,id);
      if(geo!==spentCaseGeometry(T,id)) throw Error('geometry cache '+id);
      geo.computeBoundingBox();
      const mesh=new T.Mesh(geo,mat);
      mesh.position.set((i-3.5)*.050,-geo.boundingBox.min.y,0);
      stand.add(mesh);
    }
    view(0,.12,.49,0,.032,0);
  })()`);
  await capture('spent-cases');
  for (const id of ['m4','ak','uzi']) {
    await page.evaluate(`(() => { window.ud=bench.model('${id}'); const [x,y,z]=ud.ejectPort; bench.view(x+.31,y+.03,z-.024,x,y,z); })()`);
    for (const phase of [0,.6,1,0]) {
      await page.evaluate(`ud.recoilBoltPose(ud.recoilBolt,ud.portStroke*${phase})`);
      const visible = await page.evaluate('ud.recoilBolt.children.some(p=>p.visible)');
      assert.equal(visible, phase<1, id+' phase '+phase);
      await capture(id+'-port-'+phase);
    }
  }
  await page.evaluate("window.ud=bench.model('revolver');bench.view(.45,.07,-.07,0,.018,-.010)");
  for (const [name,pull,reset] of [['rest',0,false],['cocked',.88,false],['break',1,false],['reset',.5,true]]) {
    await page.evaluate(`ud.doubleActionPose(ud.trigger,ud.hammer,${pull},${reset})`);
    const angle=await page.evaluate('ud.hammer.rotation.x || 0');
    assert(Math.abs(angle-(name==='cocked'?-.55:0))<.0001, name);
    await capture('revolver-'+name);
  }
  await page.evaluate("window.ud=bench.model('flamer');bench.view(.86,.25,-.55,.028,-.02,.07)");
  await capture('flamer-pack-in');
  await page.evaluate('ud.fuelCan.position.y-=.22;ud.fuelNeedle.rotation.z=-Math.PI*.75');
  await capture('flamer-pack-out');
  assert.deepEqual(page.errors,[]);
  console.log('PASS model-bench: 8 cached case shapes, 3 carrier opening/closing cycles, 4 double-action phases, fixed manifold and removable tank renders');
} finally {
  await browser.close();
  await server.close();
}
