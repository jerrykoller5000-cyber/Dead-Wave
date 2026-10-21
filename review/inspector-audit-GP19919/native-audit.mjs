import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';
const out = path.resolve('review/inspector-audit-GP19919/native');
fs.mkdirSync(out, { recursive: true });
const E = new Engine({ inspect: true, warm: 'none', size: '1440x1000' });
const results = [];
async function probe(name, source) {
  try { const r = await E.page.evaluate('(async()=>{' + source + '})()', 180000); results.push({ name, ...r }); console.log(name + ': ' + JSON.stringify(r)); }
  catch (e) { results.push({ name, ok: false, error: String(e?.stack || e) }); console.log('FAIL ' + name + ': ' + e.message); }
  fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify({ at: new Date().toISOString(), renderer: E.renderer, loadSec: E.loadSec, results }, null, 2) + '\n', 'utf8');
}
try {
  await E.open();
  await probe('ready', `return {ok:DWInspect.ready && DWInspect.apiVersion===1,version:DWInspect.version,count:DWInspect.list().length,errors:DWInspect.errors(),query:location.search};`);
  await E.run({cmd:'shot',target:'marine',ui:true,out:path.join(out,'after.png')});
  await probe('selection-and-move-readback', `await DWInspect.show('marine'); await DWInspect.marine.play('walk',{loop:false}); await new Promise(r=>setTimeout(r,400)); const a=DWInspect.marine.state(); const ui=document.querySelector('[data-move="walk"]'); DWInspect.marine.stop(); return {ok:a.move==='walk'&&a.loop===false&&!!ui?.classList.contains('on')&&DWInspect.marine.state().move===null,state:a,query:location.search};`);
  await probe('validation-keeps-selection', `await DWInspect.show('weapon.m4'); const id=DWInspect.current().id; const bad=[]; for(const f of [()=>DWInspect.show('missing'),()=>DWInspect.show('weapon.m4',{variant:'bogus'}),()=>DWInspect.show('zombie.brute',{mode:'bogus'}),()=>DWInspect.camera({x:NaN}),()=>DWInspect.sheetData({n:Infinity}),()=>DWInspect.check({only:'no-such-subject'})]){try{await f();bad.push('accepted');}catch(e){bad.push(e.message);}} return {ok:bad.length===6&&!bad.includes('accepted')&&DWInspect.current().id===id,errors:bad};`);
  await probe('cancel-grenade-before-subject-switch', `await DWInspect.show('marine'); DWInspect.speed(1);const p=DWInspect.marine.play('grenade',{loop:false});let t=performance.now();while(!TT.grenadeArcDbg().charging&&performance.now()-t<2500) await new Promise(r=>setTimeout(r,10));const started=TT.grenadeArcDbg().charging,n=TT.grenadeArcDbg().n;await DWInspect.show('weapon.m4');await p;await new Promise(r=>setTimeout(r,600));const g=TT.grenadeArcDbg();return {ok:started&&!g.charging&&g.n===n,started,before:n,after:g};`);
  await probe('dive-home-isolation', `await DWInspect.show('marine');await DWInspect.marine.play('dive-forward',{loop:false});const before=TT.diveDbg().phase;DWInspect.marine.stop();DWInspect.marine.home();await new Promise(r=>setTimeout(r,100));const after=TT.diveDbg().phase;return {ok:after==='idle',before,after,grounded:DWInspect.marine.state().grounded};`);
  await probe('six-acknowledged-steps', `await DWInspect.show('marine');DWInspect.pause();await new Promise(r=>setTimeout(r,100));let a=DWInspect.time().gameTime; await DWInspect.stepAsync(6);let b=DWInspect.time();return {ok:Math.abs(b.gameTime-a-.1)<1e-6&&b.paused&&!b.step,delta:b.gameTime-a,time:b};`);
  await probe('still-capture-resumes', `await DWInspect.still(true); const data=await DWInspect.shot(); return {ok:data.startsWith('data:image/png;base64,')&&data.length>1000&&!DWInspect._ix._still,bytes:data.length};`);
  await probe('drive-keeps-game-camera', `await DWInspect.show('marine');DWInspect.play();DWInspect.drive(true);await new Promise(r=>setTimeout(r,150));const free=TT.getShotView()===null;DWInspect.drive(false);await new Promise(r=>setTimeout(r,150));return {ok:free&&!!TT.getShotView(),free};`);
  await probe('model-world-axes', `await DWInspect.show('prop.standing-stone');DWInspect.overlay('axes',true);await new Promise(r=>setTimeout(r,100));const ix=DWInspect._ix,s=ix.subject,o=s.origin(),v=new TT.THREE.Vector3();o.getWorldPosition(v);const axes=ix.stage.overlay.children.find(c=>c.isLineSegments&&c.geometry.attributes.color);const actual=new TT.THREE.Vector3();axes.getWorldPosition(actual);DWInspect.overlay('axes',false);return {ok:actual.distanceTo(v)<1e-6,wanted:v.toArray(),actual:actual.toArray()};`);
  await E.run({cmd:'check',out:path.join(out,'catalog'),tile:200,cols:8});
  await probe('all-catalog-variants', `const r=await DWInspect.check({frames:1});return {ok:r.length>116&&r.every(x=>x.ok),cases:r.length,failed:r.filter(x=>!x.ok)};`);
  await probe('check-restores-review-recipe', `await DWInspect.show('zombie.brute',{mode:'walk'});DWInspect.view('left',{instant:true});DWInspect.camera(DWInspect.camera());DWInspect.speed(.25);DWInspect.pause();const before=DWInspect.session();await DWInspect.check({only:'weapon.m4',frames:1});const after=DWInspect.session();const gap=Math.max(...Object.keys(before.camera).map(k=>Math.abs(before.camera[k]-after.camera[k])));return {ok:after.subject.id===before.subject.id&&after.subject.mode==='walk'&&after.clock.paused&&after.clock.speed===.25&&gap<1e-8&&!after.view.follow,cameraGap:gap,before,after};`);
  await probe('resource-cycle', `DWInspect.play();await DWInspect.show('prop.standing-stone');await DWInspect.show('weapon.m4');await new Promise(r=>setTimeout(r,100));const before={...TT.renderer.info.memory};for(let i=0;i<12;i++){await DWInspect.show('prop.standing-stone');await DWInspect.show('weapon.m4');}await new Promise(r=>setTimeout(r,100));const after={...TT.renderer.info.memory};return {ok:after.geometries<=before.geometries+2&&after.textures<=before.textures+2,before,after};`);
  await probe('frame-rate', `await DWInspect.show('marine');DWInspect.speed(1);DWInspect.play();const f=DWInspect.time().frames,t=performance.now();await new Promise(r=>setTimeout(r,3000));const fps=(DWInspect.time().frames-f)*1000/(performance.now()-t);return {ok:fps>=55,fps,errors:DWInspect.errors()};`);
  await E.run({cmd:'shot',target:'marine',ui:true,out:path.join(out,'after-final.png')});
} finally { await E.close(); }
if(results.some(r=>!r.ok))process.exitCode=1;
