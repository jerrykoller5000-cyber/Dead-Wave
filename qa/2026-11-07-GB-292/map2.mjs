import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const W=1280,H=720;
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size='+W+','+H] });
const lib = fs.readFileSync(path.join(ROOT,'tools/tests/lib.js'),'utf8');
const page = await browser.newPage({ width:W, height:H });
await page.goto(server.origin+'/index.html?debug=1&raf=timer',{timeout:300000});
if(!(await page.waitFor('!!window.TT',{timeout:600000}))) throw new Error('no TT');
await page.evaluate(`(()=>{if(window.DWOpening&&window.DWOpening.dismissForTesting)DWOpening.dismissForTesting();})()`);
await page.waitFor('!window.DWOpening || window.DWOpening.active === false',{timeout:60000});
await page.evaluate(lib);
await page.evaluate(`(async () => {
  const T = TT; await startMatch(T, 'm'); T.clearZombies && T.clearZombies(); T.setHp(1e5); T.grantAllWeapons();
  if (T.setWorldTime) T.setWorldTime(0.42);
  for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'chainsaw'; i++) {
    T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw')); await new Promise((r) => setTimeout(r, 150));
  }
  T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4000)); return 1;
})()`, 600000);
const map = await page.evaluate(`(() => {
  const T = TT, v = T.viewmodelDbg(), W = ${W}, H = ${H};
  const n = (p) => { const d = v.ndc(p, { x:0, y:0, d:0 }); return { ndc:[+d.x.toFixed(3), +d.y.toFixed(3)], px:[Math.round((d.x*0.5+0.5)*W), Math.round((1-(d.y*0.5+0.5))*H)] }; };
  const wr = v.wrists, G = v.frame, THREE = T.THREE;
  const toV = (x,y,z) => new THREE.Vector3(x,y,z).multiplyScalar(G.s).applyQuaternion(G.q).add(G.p);
  return JSON.stringify({
    grip: n(toV(0,-0.014,-0.43)),
    support: n(toV(-0.01,0.25,-0.035)),
    wristR: n(wr.r.p),
    wristL: n(wr.l.p)
  }, null, 2);
})()`);
fs.writeFileSync(path.join(OUT,'screen-map2.json'), map);
console.log(map);
await browser.close?.(); server.close?.();
