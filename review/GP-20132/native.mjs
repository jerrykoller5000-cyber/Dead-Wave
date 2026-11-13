import fs from 'node:fs';import path from 'node:path';import{fileURLToPath}from'node:url';import{serve}from'../../tools/serve.mjs';import{launch}from'../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew slot');
const root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/GP-20132'),report={at:new Date().toISOString()},server=await serve(root,0),browser=await launch({headless:false});
try{
 const p=await browser.newPage({width:1280,height:720});await p.goto(server.origin+'/index.html?debug=1',{timeout:300000});if(!await p.waitFor('!!window.TT && DWLoad.snapshot().state==="ready"',{timeout:300000}))throw Error('load');await p.evaluate('DWOpening.dismissForTesting()');await p.waitFor('!DWOpening.active');
 await p.evaluate('document.getElementById("playerName").value="Training bounds audit";document.getElementById("modeTraining").click()');if(!await p.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:150000}))throw Error('Training');
 report.t336=await p.evaluate(fs.readFileSync(path.join(root,'tools/tests/t336.js'),'utf8'),120000);
 report.native=await p.evaluate(`(()=>{const T=TT,G=T.THREE,tg=T.trainingDbg.tg(),light=tg.group.getObjectByName('training-danger-lighting'),items=[];tg.group.updateMatrixWorld(true);
  const box=b=>({min:b.min.toArray().map(x=>Number.isFinite(x)?x:String(x)),max:b.max.toArray().map(x=>Number.isFinite(x)?x:String(x))});
  tg.group.traverse(o=>{if(o.name==='training-containment-gun'){const actual=new G.Box3().setFromObject(o),manual=new G.Box3(),m=new G.Matrix4(),world=new G.Matrix4();if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);manual.union(o.geometry.boundingBox.clone().applyMatrix4(world.multiplyMatrices(o.matrixWorld,m)));}items.push({count:o.count,cached:box(actual),fromInstances:box(manual),floorGap:manual.min.y-tg.floorY});}});
  const descendants=[];light.traverse(o=>{if(o.isMesh)descendants.push({name:o.name,geometry:o.geometry?.type});});
  return{floor:tg.floorY,lighting:{meshLookup:!!light.getObjectByProperty('isMesh',true),meshDescendants:descendants,bounds:box(new G.Box3().setFromObject(light))},containment:items};})()`);
 await p.evaluate(`(()=>{const T=TT,H=T.inspectHost(),o=T.trainingDbg.tg().origin;T.setViewFirstDbg(false);T.player.position.set(o.x-26,o.y,o.z+4);T.setVelDbg(0,0);H.attach({held:()=>true,scale:d=>d,frame:()=>{H.camera.position.set(o.x-17,o.y+10,o.z-16);H.camera.fov=60;H.camera.lookAt(o.x-31,o.y+4,o.z+4);H.camera.updateProjectionMatrix();H.camera.updateMatrixWorld(true);}});})()`);
 await new Promise(r=>setTimeout(r,500));await p.screenshot(path.join(out,'native-containment-wall-mounts.png'));
 report.errors=p.errors.slice();report.summary={pass:report.t336.split('\n').filter(s=>s.startsWith('PASS')).length,fail:report.t336.split('\n').filter(s=>s.startsWith('FAIL'))};console.log(JSON.stringify({summary:report.summary,native:report.native,errors:report.errors}));
 if(report.errors.length||report.native.lighting.meshLookup||report.native.containment.some(x=>x.floorGap<-.0005))throw Error('native routed findings reproduce; investigate production');
}catch(e){report.failure=String(e.stack||e);console.error(report.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'native.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
