import assert from 'node:assert/strict';import {mkdir,readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);const dir=new URL('live-integration/',import.meta.url);await mkdir(dir,{recursive:true});
const files=['index.html','game/viewmodel.js','game/viewmodel-poses.js','game/viewmodel-fit.js','studio/hand-contacts.js','studio/hand-grips.js','studio/weapon-sidearms.js','studio/weapon-pistol-action.js'];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])));const start=await hashes();
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{const page=await browser.newPage({width:1280,height:720});await page.goto(server.origin+'/index.html?debug=1&raf=timer');assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
await page.evaluate("document.getElementById('playerName').value='Live pistol integration';document.getElementById('modeTraining').click()");assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:180000}));
await page.evaluate("import('/review/GT-20076/final-visible-camera.mjs').then(m=>{window.liveMechanismViews=m.makeViews(TT);return liveMechanismViews.equip('pistol')})");
await page.evaluate("TT.setAmmoDbg('pistol',0);TT.startReload();true");
const records=[];
for(const fraction of [0,.25,.70,.80,.88,.96,.999])for(const view of ['hip','held-right']){
await page.evaluate('TT.reloadClipDbg.hold('+fraction+');true');await page.evaluate('liveMechanismViews.pose('+JSON.stringify(view)+')');
for(const light of ['noon','overcast','dusk','night']){
await page.evaluate('liveMechanismViews.light('+JSON.stringify(light)+')');
const row=await page.evaluate(`(()=>{const T=TT,H=T.inspectHost(),G=T.THREE,u=T.weaponMeshes.pistol.userData,vm=T.viewmodelDbg(),b=u.barrelAssembly,eb=vm.gun?.pairs.find(([source])=>source===b)?.[1],p=H.camera.getWorldPosition(new G.Vector3()),d=H.camera.getWorldDirection(new G.Vector3());const travel=u.baseSlidePos.z-u.slide.position.z,j=Math.min(Math.max(travel,0),.004),unlock=Math.max(0,Math.min(1,(travel-.004)/.004));return{state:T.getReloadDbg(),travel,expected:{position:[0,.05-.010*unlock,.075-j],rotationX:-.05*unlock},barrel:{position:b.position.toArray(),rotationX:b.rotation.x},eyeBarrel:eb?{position:eb.position.toArray(),rotationX:eb.rotation.x}:null,eyeSlide:vm.gun?.slide?.position.toArray(),slide:u.slide.position.toArray(),camera:{position:p.toArray(),direction:d.toArray(),fov:H.camera.fov}};})()`);
const file=view+'-'+fraction+'-'+light+'.png';const shot=await page.send('Page.captureScreenshot',{format:'png'});await writeFile(new URL(file,dir),Buffer.from(shot.data,'base64'));records.push({fraction,view,light,file,...row});
}}
const end=await hashes();await writeFile(new URL('records.json',dir),JSON.stringify({mode:'Unmodified native production reload only; no review pose writers or barrel overrides',start,end,records,errors:page.errors},null,2));
assert.deepEqual(end,start,'sources changed during integration proof');assert.deepEqual(page.errors,[]);
for(const r of records){assert.equal(r.state.weapon,'pistol');assert(r.eyeBarrel,'eye barrel pair');assert(r.travel>=-1e-6&&r.travel<=.070001,'final slide stroke');
for(const part of [r.barrel,r.eyeBarrel]){for(let k=0;k<3;k++)assert(Math.abs(part.position[k]-r.expected.position[k])<1e-6,'live barrel position '+JSON.stringify({fraction:r.fraction,part,expected:r.expected}));assert(Math.abs(part.rotationX-r.expected.rotationX)<1e-6,'live barrel angle');}}
assert(records.filter(r=>r.fraction===0).every(r=>r.travel>=.0699),'empty reload starts locked back');
console.log('PASS native production reload:56frames,7fractions,eye+held,4lights; .07stroke,empty start lock,world+eye barrel contract and stable source hashes');
}finally{await browser.close();await server.close();}
