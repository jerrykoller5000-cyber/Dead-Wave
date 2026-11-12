import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';

assert(process.env.DW_GAME_TEST_TOKEN,'Use the crew slot');
const phase=process.argv[2];
assert(['photo-before','photo-after','photo-gpu-before','photo-gpu-after','race-before','cold-1','cold-2','cold-3','cold-4','cold-5'].includes(phase));
const photo=phase.startsWith('photo'),delayed=['race-before','cold-1','cold-5'].includes(phase);
const root=new URL('../../',import.meta.url),dir=new URL('./',import.meta.url);
const server=await serve(fileURLToPath(root),0);
const browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:800,height:560});
  let pending=null,held=false;
  const gl=phase==='photo-before'||phase==='photo-after';
  if(photo&&!gl){
    await page.send('Page.addScriptToEvaluateOnNewDocument',{source:"const earlyPatchImage=new Image();earlyPatchImage.src='/assets/insignia/pgb-patch.png';"});
  }
  if(delayed){
    await page.send('Page.addScriptToEvaluateOnNewDocument',{source:'('+observePatchUpload.toString()+')()'});
    page.conn.onEvent(event=>{
      if(event.sessionId===page.sessionId&&event.method==='Fetch.requestPaused'){
        assert(new URL(event.params.request.url).pathname==='/assets/insignia/pgb-patch.png');
        pending=event.params.requestId;held=true;
      }
    });
    await page.send('Fetch.enable',{patterns:[{urlPattern:server.origin+'/assets/insignia/pgb-patch.png',requestStage:'Request'}]});
  }
  await page.goto(server.origin+'/index.html?debug=1'+(gl?'&renderer=webgl':''),{waitUntil:'none'});
  const settled=await page.waitFor("['ready','failed'].includes(window.DWLoad?.snapshot().state)",{timeout:120000});
  assert(settled,'Load timed out '+JSON.stringify(page.errors));
  const state=await page.evaluate('DWLoad.snapshot().state');
  const clean=text=>text.replace(/__gameTestToken=[^:&\s)]+/g,'__gameTestToken=<redacted>');
  const errors=page.errors.map(clean),consoleErrors=page.console.filter(v=>v.type==='error').map(v=>clean(v.text));
  if(phase==='race-before'){
    assert(held&&state==='failed'&&errors.some(e=>e.includes('canvas without rendering context')),JSON.stringify({held,state,errors}));
    await writeFile(new URL(phase+'.json',dir),JSON.stringify({state,held,errors,consoleErrors},null,2)+'\n');
    console.log('PASS original race reproduced with patch image pending');
  }else{
    assert.equal(state,'ready',JSON.stringify({errors,consoleErrors}));
    assert(await page.waitFor('!!window.TT'),'Debug hooks missing');
    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active',{timeout:30000}),'Opening did not reach menu');
    const initialUpload=delayed?await page.evaluate('window.__patchUpload'):null;
    if(delayed)assert(initialUpload.count>0&&initialUpload.hadContext===true,'Patch uploaded before context '+JSON.stringify(initialUpload));
    const info=await page.evaluate(`(()=>{
      const h=TT.inspectHost(),model=h.builders.marine({skin:false}),patch=model.getObjectByName('pgb-patch');
      if(!patch)throw Error('No shoulder patch on the marine');
      window.bootMarine=model;window.bootPatch=patch;
      const tex=patch.material.map,ctx=tex.image.getContext('2d'),px=ctx.getImageData(0,0,tex.image.width,tex.image.height).data;
      let nonzero=0;for(let i=3;i<px.length;i+=4)if(px[i])nonzero++;
      return {backend:TT.renderer.backend.constructor.name,width:tex.image.width,height:tex.image.height,loaded:!!patch.material.userData.loaded,visiblePixels:nonzero};
    })()`);
    assert.deepEqual([info.width,info.height],[192,224]);
    if(!gl)assert.equal(info.backend,'WebGPUBackend');
    if(delayed){
      assert(pending&&held&&!info.loaded&&info.visiblePixels===0,'Expected the empty patch at ready '+JSON.stringify(info));
      await page.send('Fetch.continueRequest',{requestId:pending});pending=null;
    }
    assert(await page.waitFor('bootPatch.material.userData.loaded===true',{timeout:30000}),'Patch image did not arrive');
    const texture=await page.evaluate(`(()=>{
      const canvas=bootPatch.material.map.image,p=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let h=2166136261,visible=0;for(let i=0;i<p.length;i++){h=Math.imul(h^p[i],16777619);if(i%4===3&&p[i])visible++;}
      return {hash:(h>>>0).toString(16),visible};
    })()`);
    assert(texture.visible>1000);
    let pose=null;
    if(photo){
      const result=await page.evaluate('('+portrait.toString()+')()',60000);
      const png=Buffer.from(result.png.split(',')[1],'base64');
      assert(png.length>15000,'Empty marine portrait');
      await writeFile(new URL(phase+'.png',dir),png);
      pose=result.pose;
    }else{
      await page.evaluate("TT.inspectHost().enterTraining();true");
      assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:120000}),'Training failed to finish');
    }
    const processes=await page.conn.send('SystemInfo.getProcessInfo',{});
    const browserPid=processes.processInfo.find(p=>p.type==='browser')?.id;
    const loadId=await page.evaluate('DWLoad.snapshot().loadId');
    const report={phase,state,loadId,browserPid,held,initialUpload,info,texture,pose,errors:page.errors.map(clean),consoleErrors:page.console.filter(v=>v.type==='error').map(v=>clean(v.text))};
    await writeFile(new URL(phase+'.json',dir),JSON.stringify(report,null,2)+'\n');
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);
    console.log('PASS',phase,info.backend,'ready',held?'image held until menu':'normal image',texture,'zero console errors');
  }
}finally{await browser.close();await server.close();}

function observePatchUpload(){
  const ready=new WeakSet(),log=window.__patchUpload={count:0,hadContext:null};
  const get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...rest){
    const ctx=get.call(this,type,...rest);
    if(ctx&&type==='2d')ready.add(this);
    return ctx;
  };
  const copy=GPUQueue.prototype.copyExternalImageToTexture;
  GPUQueue.prototype.copyExternalImageToTexture=function(input,...args){
    const image=input.source;
    if(image instanceof HTMLCanvasElement&&image.width===192&&image.height===224){
      if(log.count===0)log.hadContext=ready.has(image);
      log.count++;
    }
    return copy.call(this,input,...args);
  };
}

function portrait(){
  const H=TT.inspectHost(),G=TT.THREE,model=window.bootMarine,patch=window.bootPatch;
  H.loop(false);
  const scene=new G.Scene();scene.background=new G.Color(0x343b40);scene.add(model);
  model.updateMatrixWorld(true);
  const p=patch.getWorldPosition(new G.Vector3()),normal=new G.Vector3(0,0,1).transformDirection(patch.matrixWorld);
  const eye=p.clone().addScaledVector(normal,.42).add(new G.Vector3(0,.06,.085));
  const target=p.clone().add(new G.Vector3(0,.025,0));
  const camera=new G.PerspectiveCamera(34,800/560,.01,20);camera.position.copy(eye);camera.lookAt(target);camera.updateMatrixWorld(true);
  scene.add(new G.HemisphereLight(0xfff7e8,0xadc1d5,1.5));
  const light=new G.DirectionalLight(0xfff4df,2.3);light.position.copy(p).add(new G.Vector3(.9,1.3,.7));light.target.position.copy(p);scene.add(light,light.target);
  const renderer=H.renderer;renderer.setRenderTarget(null);renderer.render(scene,camera);
  const canvas=renderer.domElement;
  const corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([x,y])=>{
    const v=patch.localToWorld(new G.Vector3(x,y,0)).project(camera);
    return [(v.x+1)*canvas.width/2,(1-v.y)*canvas.height/2];
  });
  return {png:canvas.toDataURL('image/png'),pose:{eye:eye.toArray(),target:target.toArray(),patch:p.toArray(),normal:normal.toArray(),fov:camera.fov,corners}};
}
