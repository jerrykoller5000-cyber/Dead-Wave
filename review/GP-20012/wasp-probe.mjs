// Real-renderer Wasp stage-2 geometry and reload check. Run via crew game-test slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20012/wasp-probe.json');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!await page.waitFor('!!window.TT', { timeout: 600000 })) throw new Error('TT did not boot');
  await page.evaluate('DWOpening?.dismissForTesting?.()');
  await page.waitFor('!window.DWOpening||DWOpening.active===false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  const facts = await page.evaluate(`(async()=>{
    const T=TT, E=T.THREE||window.THREE, sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
    await startMatch(T,'WaspProbe'); T.clearZombies(); T.setHp(1e5); T.grantAllWeapons();
    for(let i=0;i<16&&T.getCurrentWeapon()!=='uzi';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('uzi'));await sleep(150);}
    T.setViewFirstDbg(true); await sleep(2300);
    const vm=T.viewmodelDbg();
    if(!vm?.info.active||vm.info.key!=='uzi')throw new Error('Wasp viewmodel inactive');
    const inView=(o,p)=>{o.updateWorldMatrix(true,false);vm.space.updateMatrixWorld(true);return p.clone().applyMatrix4(o.matrixWorld).applyMatrix4(vm.space.matrixWorld.clone().invert());};
    const minVisible=()=>{
      let closest=Infinity, seen=0;
      vm.root.traverse((o)=>{
        const pa=o.isMesh&&o.geometry?.attributes?.position;if(!pa)return;
        for(let q=o;q&&q!==vm.root;q=q.parent)if(!q.visible)return;
        o.updateWorldMatrix(true,false);vm.space.updateMatrixWorld(true);
        const mat=vm.space.matrixWorld.clone().invert().multiply(o.matrixWorld),v=new E.Vector3();
        for(let i=0;i<pa.count;i+=Math.max(1,Math.floor(pa.count/150))){
          v.set(pa.getX(i),pa.getY(i),pa.getZ(i)).applyMatrix4(mat);
          const n=vm.ndc(v);
          if(n.d>0&&Math.abs(n.x)<1.02&&Math.abs(n.y)<1.02){closest=Math.min(closest,n.d);seen++;}
        }
      });
      return {closest,seen};
    };
    const hip=vm.ndc(vm.viewPoint(new E.Vector3(0,-.088,-.027)));
    const hipGrip={x:hip.x,y:hip.y};
    T.setZoomHeldDbg(true);await sleep(1900);
    const sight=vm.ndc(vm.viewPoint(new E.Vector3(0,.156,-.25)));
    const front=vm.ndc(vm.viewPoint(new E.Vector3(0,.156,.25)));
    const aimed={rear:[sight.x,sight.y],front:[front.x,front.y],near:minVisible()};
    T.setZoomHeldDbg(false);await sleep(1100);
    T.setAmmoDbg('uzi',2);T.startReload();
    const places=new Set(),states=new Set();let reloadNear=Infinity,workFrames=0,maxWrist=0,samples=0;
    while(T.isReloading()&&samples<140){
      const inf=vm.info;places.add(inf.handPlace);states.add(inf.magState);
      if(inf.handPlace==='work')workFrames++;
      maxWrist=Math.max(maxWrist,inf.wrist.r,inf.wrist.l);
      reloadNear=Math.min(reloadNear,minVisible().closest);
      samples++;await sleep(20);
    }
    await sleep(250);
    return {backend:T.getRendererBackend(),hipGrip,aimed,places:[...places],states:[...states],
      reloadNear,workFrames,maxWrist,samples,finished:!T.isReloading(),
      finalMag:vm.info.magState,finalHand:vm.info.handPlace};
  })()`, 600000);
  fs.writeFileSync(out, JSON.stringify(facts, null, 2));
  console.log(JSON.stringify(facts));
  if (facts.backend !== 'WebGPU' || Math.max(...facts.aimed.rear.map(Math.abs), ...facts.aimed.front.map(Math.abs)) > .002 ||
      facts.aimed.near.closest <= .015 || facts.reloadNear <= .015 || !facts.finished ||
      !['hand','pouch','seated'].every(s=>facts.states.includes(s)) || !['well','pouch','work','fore'].every(s=>facts.places.includes(s)) ||
      facts.workFrames < 1 || facts.maxWrist > .873 || facts.finalMag !== 'seated' || facts.finalHand !== 'fore' || page.errors.length) {
    throw new Error('Wasp stage-2 geometry/reload check failed: ' + page.errors.slice(0,2).join(' | '));
  }
} finally {
  await browser.close();
  await server.close();
}
