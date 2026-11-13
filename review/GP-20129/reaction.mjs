import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew slot');
const phase=process.argv[2]||'before',root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/GP-20129'),pause=ms=>new Promise(r=>setTimeout(r,ms)),report={phase,frames:[]};
const server=await serve(root,0),browser=await launch({headless:false});
try{
 const p=await browser.newPage({width:1280,height:720});
 await p.goto(server.origin+'/index.html?debug=1',{timeout:240000});await p.waitFor('!!window.TT && DWLoad.snapshot().state==="ready"',{timeout:120000});
 await p.evaluate('DWOpening.dismissForTesting()');await p.waitFor('!DWOpening.active');
 await p.evaluate('document.getElementById("playerName").value="Dummy force";document.getElementById("modeTraining").click()');
 await p.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:120000});
 await p.evaluate(`(async()=>{
  const T=TT,H=T.inspectHost(),G=T.THREE,{LIGHTS}=await import('./studio/inspector/stage.js'),d=T.trainingDbg.state().dummy.model,o=T.trainingDbg.tg().origin;
  window.drawFailures=[];const backend=H.renderer.backend,originalDraw=backend.draw.bind(backend);
  backend.draw=function(ro,...args){try{return originalDraw(ro,...args);}catch(e){drawFailures.push({error:String(e),object:ro.object.name,parent:ro.object.parent?.name,material:ro.material.uuid,type:ro.material.type,transparent:ro.material.transparent,opacity:ro.material.opacity,color:ro.material.color?.getHex(),map:!!ro.material.map});throw e;}};
  window.Q={light:'noon',view:'eye',subject:'dummy'};T.setUnarmedDbg(true);T.setViewFirstDbg(false);T.player.position.set(o.x-4.5,o.y,o.z-1.15);T.setVelDbg(0,0);T.setAimYawDbg(-Math.PI/2);
  H.attach({held:()=>true,scale:dt=>dt,frame:()=>{
   const q=Q,L=LIGHTS[q.light],v=q.view==='eye'?[o.x-4.5,o.y+1.65,o.z-2.1]:[o.x-1,o.y+4.6,o.z-5.3],target=q.subject==='keypad'?[o.x-7.7,o.y+1.28,o.z-9.5]:[o.x-6.85,o.y+1,o.z-2.1];
   if(q.subject==='keypad')v.splice(0,3,o.x-6.5,o.y+1.55,o.z-9.5);
   H.camera.position.set(...v);H.camera.fov=q.subject==='keypad'?45:q.view==='eye'?65:55;H.camera.lookAt(...target);H.camera.updateProjectionMatrix();H.camera.updateMatrixWorld(true);
   const anchor=new G.Vector3(...target),dir=new G.Vector3(...L.dir).normalize();H.sun.position.copy(anchor).addScaledVector(dir,80);H.sun.target.position.copy(anchor);H.sun.target.updateMatrixWorld();H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
   if(T.flashlight){T.flashlight.visible=q.light==='night';T.flashlight.intensity=q.light==='night'?8:0;T.flashlight.position.set(v[0]+.16,v[1]-.14,v[2]);T.flashlight.target.position.set(...target);T.flashlight.target.updateMatrixWorld();}
  }});
 })()`);
 for(const light of ['noon','overcast','dusk','night']){
  await p.evaluate(`Q.light=${JSON.stringify(light)}`);
  for(const kind of ['bullet','knife'])for(const view of light==='noon'?['eye','approach']:['eye']){
   await p.evaluate(`(()=>{Q.view=${JSON.stringify(view)};Q.subject='dummy';const d=TT.trainingDbg.state().dummy;d.reset();const b=d.solid;d.strike({kind:${JSON.stringify(kind)},point:{x:b.cx+.14,y:b.minY+1.28,z:b.cz},direction:{x:-1,y:0,z:0},damage:26,addMark:false});})()`);
   let prior=0;
   for(const t of light==='noon'?[0,.06,.12,.24,.42,1.4]:[.12]){
    const state=await p.evaluate(`(()=>{const d=TT.trainingDbg.state().dummy;let remaining=${t-prior};while(remaining>1e-9){const dt=Math.min(remaining,1/120);d.update(dt);remaining-=dt;}return d.state();})()`);prior=t;
    await pause(150);const name=phase+'-reaction-'+kind+'-'+view+'-'+light+'-'+t+'.png';await p.screenshot(path.join(out,name));report.frames.push({name,kind,view,light,t,state});
   }
  }
  await p.evaluate('Q.subject="keypad"');await pause(180);await p.screenshot(path.join(out,phase+'-keypad-lit-'+light+'.png'));
 }
 report.errors=p.errors.slice();report.drawFailures=await p.evaluate('drawFailures');console.log(JSON.stringify({phase,frames:report.frames.length,errors:report.errors,drawFailures:report.drawFailures}));
}finally{fs.writeFileSync(path.join(out,phase+'-reaction.json'),JSON.stringify(report,null,2));await browser.close();await server.close();}
