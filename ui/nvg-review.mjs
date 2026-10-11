// GP-165: existing camera service, actual game state; no production debug hooks.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const root='review/nvg-pvs14',phase=process.argv[2]||'before';
assert(['before','after'].includes(phase));
function job(value,name){
 const p=`${root}/${phase}-${name}.json`;fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n','utf8');
 const r=spawnSync(process.execPath,['tools/camera.mjs','job',p],{encoding:'utf8',windowsHide:true,maxBuffer:16e6});
 fs.writeFileSync(`${root}/${phase}-${name}.log`,(r.stdout||'')+(r.stderr||''),'utf8');assert.equal(r.status,0,r.stderr||r.stdout);
 return value.cmd==='eval'?JSON.parse(r.stdout):r.stdout;
}
const setup=job({cmd:'eval',timeout:180000,code:`
 R.release();window.nvgReviewErrors=[];window.addEventListener('error',e=>nvgReviewErrors.push(e.message));
 if(!T.trainingDbg.state().active){document.getElementById('playerName').value='NVG review';document.getElementById('modeTraining').click();}
 for(let i=0;i<600&&(!T.trainingDbg.state().active||document.getElementById('trainingBlackout')?.classList.contains('on'));i++)await wait(100);
 T.runDevCommand('godmode');T.clearZombies();T.setGearDbg('helmet');T.setGearDbg('nvg');
 if(T.trainingDbg.lights().on)T.trainingDbg.toggleLights();await wait(300);
 const p=T.player.position;T.setWorldTime(0);await wait(300);
 if(!T.renderer.domElement.classList.contains('nvg-phosphor'))T.toggleNvgDbg();await wait(500);
 return {position:p.toArray(),active:T.renderer.domElement.classList.contains('nvg-phosphor'),overlay:getComputedStyle(document.getElementById('nvgOverlay')).display,renderer:R.renderer()};`},'setup');
assert(setup.active,'night vision activated');
const [x,y,z]=setup.position;
const views=[['training',{x:x+7,y:y+13,z:z+13,tx:x,ty:y+.4,tz:z-3,fov:48}],['wide',{x:x+12,y:y+22,z:z+23,tx:x,ty:y+.5,tz:z-6,fov:48}]];
const shots=views.map(([name,cam])=>({target:'player',cam:phase==='after'?JSON.parse(fs.readFileSync(`${root}/before/${name}.json`,'utf8')).cam:cam,ui:true,time:'midnight',size:'1440x900',out:`${root}/${phase}/${name}.png`}));
job({shots,out:`${root}/${phase}`,cols:2,tile:720,sheet:true},'shots');
const proof=job({cmd:'eval',code:`
 const c=T.renderer.domElement,o=document.getElementById('nvgOverlay'),css=()=>({filter:getComputedStyle(c).filter,overlay:getComputedStyle(o).display,grain:getComputedStyle(o,'::after').animationName});
 const night=css();T.resetPerf();const samples=[];for(let i=0;i<4;i++){await wait(1000);samples.push(T.perfSnapshot());}
 T.toggleNvgDbg();await wait(300);const off=css();T.toggleNvgDbg();await wait(300);
 return {night,off,samples,errors:nvgReviewErrors,renderer:R.renderer()};`},'proof');
assert.equal(proof.night.overlay,'block');assert.equal(proof.off.overlay,'none');assert(!proof.off.filter.includes('nvg'));
fs.writeFileSync(`${root}/${phase}-proof.json`,JSON.stringify(proof,null,2)+'\n','utf8');
console.log('PASS '+phase+' real NVG activation/deactivation, captures; errors '+proof.errors.length);
