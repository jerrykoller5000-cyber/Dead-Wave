import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use the crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20099');
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
let page;
try {
  page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && DWLoad?.snapshot().state==="ready"',{timeout:90000}),'boot');
  await page.evaluate(`(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Saw target contact';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:60000}),'Training');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:60000}),'opening finished');
  const setup=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),i=2,b=tg.targets[i].box,cx=(b.minX+b.maxX)/2,walkOriginal=tg.walk[0].maxZ;
    // The real five plates are 8-25 m beyond the walkable firing line. Extend
    // that test-only boundary to exercise a genuine held saw against the
    // original stationary plate, with its geometry and hit/score/FX intact.
    tg.walk[0].maxZ=b.maxZ+1.5;
    T.grantAllWeapons();T.setUnarmedDbg(false);T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));T.setViewFirstDbg(false);
    T.player.position.set(cx-.3,tg.floorY,b.minZ-.82);T.setAimYawDbg(0);T.setAimTargetDbg(cx,b.minZ);
    T.setShotView({x:cx+3,y:tg.floorY+2,z:b.minZ-3,tx:cx,ty:tg.floorY+1.5,tz:b.minZ,fov:58});
    return {index:i,box:b,walkOriginal,walkTest:tg.walk[0].maxZ,player:{x:T.player.position.x,y:T.player.position.y,z:T.player.position.z},hits:T.trainingDbg.state().hits,target:{state:tg.targets[i].state,hits:tg.targets[i].hits}}})()`);
  await new Promise(r=>setTimeout(r,2500));
  const before=await page.evaluate(`(()=>({weapon:TT.getCurrentWeapon(),phase:TT.getPhase(),swap:TT.getSwapDbg(),player:{x:TT.player.position.x,y:TT.player.position.y,z:TT.player.position.z},blade:TT.sawDbg.blade(),fuel:TT.getSawFuel(),start:TT.sawStartDbg(),flags:TT.vaultDbg.flags(),hits:TT.trainingDbg.state().hits,target:{state:TT.trainingDbg.tg().targets[2].state,hits:TT.trainingDbg.tg().targets[2].hits},sparks:TT.sawEffectsDbg.motesList().length}))()`);
  await page.screenshot(path.join(out,'chainsaw-before.png'));
  await page.evaluate('TT.setMouseFireDbg(true)');
  await new Promise(r=>setTimeout(r,800));
  await page.evaluate('TT.setMouseFireDbg(false)');
  const after=await page.evaluate(`(()=>({player:{x:TT.player.position.x,y:TT.player.position.y,z:TT.player.position.z},blade:TT.sawDbg.blade(),fuel:TT.getSawFuel(),start:TT.sawStartDbg(),flags:TT.vaultDbg.flags(),hits:TT.trainingDbg.state().hits,target:{state:TT.trainingDbg.tg().targets[2].state,hits:TT.trainingDbg.tg().targets[2].hits},score:TT.trainingDbg.state().score,sparks:TT.sawEffectsDbg.motesList().length,bite:TT.getSawHeat().biteT}))()`);
  await page.screenshot(path.join(out,'chainsaw-after.png'));
  fs.writeFileSync(path.join(out,'chainsaw-target.json'),JSON.stringify({setup,before,after,pageErrors:page.errors},null,2));
  assert(after.hits>before.hits,'actual held chainsaw trigger scores a target hit');
  assert(after.target.hits>before.target.hits,'target takes saw contact');
  assert(after.score>0,'contact awards score');
  assert.deepEqual(page.errors,[],'page errors');
  console.log(`PASS saw target: hits ${before.hits}->${after.hits}, target ${before.target.hits}->${after.target.hits}, score ${after.score}, page errors 0`);
} finally {if(page)await page.close();await browser.close();await server.close();}
