import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:960,height:540});
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Glove fit';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
 await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.vis=m.makeViews(TT);return true})");
 for(const id of ['m4','aa12']){
   const dir=new URL('./'+phase+'/'+id+'/',import.meta.url);await mkdir(dir,{recursive:true});
   await page.evaluate('vis.equip('+JSON.stringify(id)+')');
   for(const view of ['eye','side']){
     await page.evaluate('vis.pose('+JSON.stringify(view==='eye'?'hip':'held-right-open')+')');
     if(view==='side')await page.evaluate(`(()=>{
       const t=TT,G=t.THREE,g=t.weaponMeshes[${JSON.stringify(id)}],c=new G.Vector3(0,${id==='m4'?'-.088,-.041':'-.117,-.075'}),e=c.clone().add(new G.Vector3(.35,-.045,-.07));
       g.localToWorld(c);g.localToWorld(e);t.setShotView({x:e.x,y:e.y,z:e.z,tx:c.x,ty:c.y,tz:c.z,fov:26});return true;
     })()`);
     for(const light of ['noon','overcast','dusk','night']){
       await page.evaluate('vis.light('+JSON.stringify(light)+')');
       const shot=await page.send('Page.captureScreenshot',{format:'png'});await save(new URL(view+'-'+light+'.png',dir),Buffer.from(shot.data,'base64'));
     }
     if(view==='eye'){
       const result=await page.evaluate("import('/review/GT-20087b/outlines.mjs').then(m=>m.readOutline(TT,"+JSON.stringify(id)+"))");
       if(phase==='after'){
         const original=JSON.parse(await readFile(new URL('../../before/'+id+'/outline.json',dir),'utf8'));
         assert.deepEqual(original.pin,result.pin);assert.equal(original.positions.length,result.positions.length);
         let moved=0,peak=0,landmark;
         for(let i=0;i<result.positions.length;i+=3){
           assert.equal(result.positions[i],original.positions[i]);assert.equal(result.positions[i+1],original.positions[i+1]);
           const d=result.positions[i+2]-original.positions[i+2];assert(d>=0);
           if(d>1e-7)moved++;if(d>peak){peak=d;landmark={from:original.positions.slice(i,i+3),to:result.positions.slice(i,i+3)};}
         }
         assert(peak>(id==='m4'?.007:.013) && peak<(id==='m4'?.009:.015));
         result.change={moved,peak,landmark};console.log('PASS',id,'forward-only change',peak,moved,result.copies);
       }
       await save(new URL('outline.json',dir),JSON.stringify(result)+'\n');
     }
   }
   console.log('PASS',id,phase,'eye and presented model, four lights');
 }
 assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
