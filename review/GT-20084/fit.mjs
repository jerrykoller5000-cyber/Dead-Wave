import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';

const [phase,...ids]=process.argv.slice(2);
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase) && ids.length);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Light artwork';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate(`(async()=>{
    const {makeViews}=await import('/review/GT-20076/visibility-camera.mjs');
    window.vis=makeViews(TT);TT.modsOwnAllDbg();TT.addCash(100000);
    window.drawLightModel=(id,source=TT.weaponMeshes[id])=>{
      const T=TT.THREE,renderer=TT.inspectHost().renderer;
      const copy=TT.cloneLean(source);copy.visible=true;copy.position.set(0,0,0);copy.quaternion.identity();
      copy.traverse(n=>n.frustumCulled=false);
      const lamp=copy.getObjectByName('laserLightUnit');if(!lamp?.visible)throw Error('Missing fitted copy '+id);
      const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,16/9,.01,100);
      const sun=new T.DirectionalLight(0xffffff,2);sun.position.set(2,3,4);scene.add(sun,new T.HemisphereLight(0xffffff,0x888888,1));
      camera.layers.enableAll();scene.add(copy);copy.updateMatrixWorld(true);
      const box=new T.Box3(),point=new T.Vector3();
      copy.traverseVisible(o=>{const p=o.geometry?.attributes?.position;if(!o.isMesh || !p)return;for(let i=0;i<p.count;i++)box.expandByPoint(point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));});
      const center=box.getCenter(new T.Vector3()),span=box.getSize(new T.Vector3()).length();
      camera.position.copy(center).addScaledVector(new T.Vector3(1,.4,.6).normalize(),Math.max(1,span*2));camera.lookAt(center);camera.updateMatrixWorld();
      const info=renderer.info,auto=info.autoReset;
      function draw(){info.reset();renderer.render(scene,camera);return info.render.drawCalls??info.render.calls;}
      try{
        info.autoReset=false;scene.remove(copy);const empty=draw();scene.add(copy);
        lamp.visible=false;draw();const off=draw()-empty;lamp.visible=true;draw();const on=draw()-empty;
        const meshes=[];lamp.traverseVisible(m=>{if(m.isMesh)meshes.push({name:m.name,material:m.material.name||m.material.type});});
        return {off,on,moduleDraws:on-off,meshes,empty,span,backend:renderer.backend?.constructor.name};
      }finally{info.autoReset=auto;scene.remove(copy);}
    };
  })()`);
  for(const id of ids){
    assert(/^[a-z0-9]+$/.test(id));const folder=new URL('./'+phase+'/'+id+'/',import.meta.url);await mkdir(folder,{recursive:true});
    if(id==='m240'){
      const mounted=await page.evaluate(`(async()=>{
        const build=TT.inspectHost().builders.m240, result={};
        for(const folded of [false,true]){
          const gun=build(folded),key=folded?'folded':'tripod';
          result[key]={draws:drawLightModel('m240',gun)};
          if(${phase==='after'}){
            const {inspectSwitchCopies}=await import('/review/GT-20084/motion.mjs');
            result[key].motion=inspectSwitchCopies(TT,'m240',gun,{[key]:gun});
          }
        }
        return result;
      })()`);
      await save(new URL('draws.json',folder),JSON.stringify(mounted,null,2)+'\n');
      for(const [key,item] of Object.entries(mounted)){
        assert(item.draws.on>item.draws.off && item.draws.off>0);
        if(phase==='after'){
          const base=JSON.parse(await readFile(new URL('./before/m240/draws.json',import.meta.url),'utf8'))[key];
          assert.equal(item.draws.on,base.draws.on);assert.equal(item.draws.off,base.draws.off);
          const r=item.motion.copies[key];assert(r.moved>0 && r.stationary>0 && r.reset<1e-7 && Math.abs(r.furthest-item.motion.travel)<1e-6);
        }
        console.log('PASS',key,'Watchman lamp',item.draws.off,'bare draws',item.draws.on,'fitted draws');
      }
      continue;
    }
    await page.evaluate('vis.equip('+JSON.stringify(id)+')');
    assert(await page.evaluate('TT.armoryDbg.fit('+JSON.stringify(id)+',"laserLight",true)'));
    await page.evaluate('vis.equip('+JSON.stringify(id)+')');
    const camera=await page.evaluate('vis.pose("hip")');
    for(const light of ['noon','overcast','dusk','night']){
      await page.evaluate('vis.light('+JSON.stringify(light)+')');
      const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
      await save(new URL('hip-'+light+'.jpg',folder),Buffer.from(shot.data,'base64'));
    }
    if(phase==='after'){
      const motion=await page.evaluate('import("/review/GT-20084/motion.mjs").then(m=>m.inspectSwitches(TT,'+JSON.stringify(id)+'))');
      await save(new URL('motion.json',folder),JSON.stringify(motion,null,2)+'\n');
      for(const [copy,r] of Object.entries(motion.copies)){
        assert(r.moved>0 && r.stationary>0,id+'/'+copy+' must move only the switch');
        assert(Math.abs(r.furthest-motion.travel)<1e-6 && r.lateral<1e-6 && r.reset<1e-7,id+'/'+copy+' travel or reset');
      }
    }
    await page.evaluate('vis.pose("held-right-open")');
    if(phase==='after'){
      await page.evaluate('import("/review/GT-20084/motion.mjs").then(m=>{window.switchProof=m;m.setSwitchShot(TT,'+JSON.stringify(id)+');return true})');
      const frames={};
      for(const light of ['noon','overcast','dusk','night']){
        for(const pressed of [false,true]){
          await page.evaluate('switchProof.setSwitchPress(TT,'+JSON.stringify(id)+','+pressed+');vis.light('+JSON.stringify(light)+')');
          frames[light+'/'+pressed]=await page.evaluate('switchProof.switchRenderState(TT,'+JSON.stringify(id)+')');
          const shot=await page.send('Page.captureScreenshot',{format:'png'});
          await save(new URL('close-'+light+'-'+(pressed?'pressed':'rest')+'.png',folder),Buffer.from(shot.data,'base64'));
        }
      }
      await save(new URL('close-states.json',folder),JSON.stringify(frames,null,2)+'\n');
      await page.evaluate('switchProof.setSwitchPress(TT,'+JSON.stringify(id)+',false)');
    }
    const result=await page.evaluate('drawLightModel('+JSON.stringify(id)+')');
    await save(new URL('draws.json',folder),JSON.stringify(result,null,2)+'\n');
    await save(new URL('camera.json',folder),JSON.stringify(camera,null,2)+'\n');
    assert(result.off>0 && result.moduleDraws>0);
    if(phase==='after'){
      const old=JSON.parse(await readFile(new URL('./before/'+id+'/draws.json',import.meta.url),'utf8'));
      assert.equal(result.on,old.on,id+' fitted submissions');assert.equal(result.off,old.off,id+' bare submissions');
    }
    console.log('PASS',id,phase,result.off,'bare draws',result.on,'fitted draws',result.moduleDraws,'lamp draws; four eye lights');
  }
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
