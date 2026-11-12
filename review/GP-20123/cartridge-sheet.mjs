// Production cartridge props in four game lighting presets. Run via crew slot.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use crew.mjs slot run');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20123/cartridges');
fs.mkdirSync(out,{recursive:true});
const server=await serve(root,0),browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:1440,height:960});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer',{timeout:240000});
  assert(await page.waitFor('!!window.TT && DWLoad.snapshot().state==="ready"',{timeout:120000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Cartridge sheet';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  const data=await page.evaluate(`(async()=>{
    const T=TT.THREE,H=TT.inspectHost(),lib=await import('/studio/weapon-casings.js');
    const {LIGHTS}=await import('/studio/inspector/stage.js');
    const ids=['pistol','uzi','revolver','m4','ak','minigun','m240','sniper','shotgun','aa12','launcher'];
    const labels=['Pistol 9 mm','Uzi 9 mm','Revolver .357','GW-4 5.56','KR-7 7.62×39','Rotary 7.62×51','Watchman 7.62×51','Sniper .338','Pump 12 ga','Breacher 12 ga','Launcher 40 mm'];
    TT.flightHold(true);TT.setViewFirstDbg(false);
    const centre=new T.Vector3(25,80,-60),stage=new T.Group();stage.position.copy(centre);stage.scale.setScalar(8);TT.scene.add(stage);
    const mat=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.2,roughness:.47,side:T.DoubleSide});
    const rackSun=new T.DirectionalLight(0xffffff,1),rackSky=new T.HemisphereLight(0xffffff,0x555555,1);
    TT.scene.add(rackSun,rackSky);
    const sizes=[];
    for(let k=0;k<ids.length;k++){
      const id=ids[k],col=k%3,row=Math.floor(k/3),live=lib.roundGeometry(T,id),spent=lib.spentCaseGeometry(T,id);
      if(!live||!spent)throw Error('Missing geometry '+id);
      const dims=[];
      for(const [j,g] of [live,spent].entries()){
        g.computeBoundingBox();const box=g.boundingBox,size=box.getSize(new T.Vector3());
        if(!Number.isFinite(size.y)||size.y<=0)throw Error('Invalid '+id);
        const mesh=new T.Mesh(g,mat);mesh.position.set((col-1)*.22+(j? .038:-.038),(1.5-row)*.16,0);
        mesh.rotation.x=.18;stage.add(mesh);
        dims.push({lengthMm:+(size.y*1000).toFixed(2),diameterMm:+(Math.max(size.x,size.z)*1000).toFixed(2)});
      }
      sizes.push({id,label:labels[k],live:dims[0],case:dims[1]});
    }
    const style=document.createElement('style');style.textContent='body>:not(canvas):not(script):not(style):not(#view):not(#cartridgeLabels){visibility:hidden!important} #cartridgeLabels{position:fixed;inset:0;pointer-events:none;color:white;font:13px system-ui;text-shadow:1px 2px 3px #000;background:transparent;z-index:9999} #cartridgeLabels span{position:absolute;transform:translate(-50%,-50%);white-space:nowrap}';document.head.append(style);
    const overlay=document.createElement('div');overlay.id='cartridgeLabels';document.body.append(overlay);
    for(let k=0;k<ids.length;k++){
      const s=document.createElement('span');s.textContent=labels[k]+' · '+sizes[k].live.lengthMm+'/'+sizes[k].case.lengthMm+' mm · live/spent';overlay.append(s);
      s.dataset.k=k;
    }
    const eye=centre.clone().add(new T.Vector3(0,.2,8.5));TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:centre.x,ty:centre.y+.2,tz:centre.z,fov:35});
    window.cartridgeLight='noon';
    const light=()=>{const L=LIGHTS[cartridgeLight],p=centre;
      H.sun.position.copy(p).addScaledVector(new T.Vector3(...L.dir).normalize(),75);H.sun.target.position.copy(p);H.sun.target.updateMatrixWorld();
      H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
      rackSun.position.copy(p).addScaledVector(new T.Vector3(...L.dir).normalize(),10);rackSun.target.position.copy(p);rackSun.target.updateMatrixWorld();rackSun.color.setHex(L.sunColor);rackSun.intensity=L.sun;
      rackSky.color.setHex(L.skyColor);rackSky.groundColor.setHex(L.ground);rackSky.intensity=L.sky;};
    H.attach({held:()=>false,scale:dt=>dt,frame:light});
    window.showCartridges=async(name)=>{cartridgeLight=name;for(let i=0;i<8;i++){TT.stepFrame(1/30);await new Promise(r=>setTimeout(r,50));}light();
      const camera=TT.camera;camera.updateMatrixWorld();
      for(const s of overlay.children){const k=+s.dataset.k,col=k%3,row=Math.floor(k/3);
        const p=stage.localToWorld(new T.Vector3((col-1)*.22,(1.5-row)*.16+.05,0)).project(camera);
        s.style.left=((p.x+1)*.5*innerWidth)+'px';s.style.top=((1-p.y)*.5*innerHeight)+'px';}
      return {light:name,labels:overlay.children.length};};
    window.showPrimers=async()=>{
      cartridgeLight='overcast';stage.scale.setScalar(13);
      for(const mesh of stage.children)mesh.visible=false;
      const picks=[[0,'9 mm pistol'],[8,'12 ga shell'],[10,'40 mm launcher']];
      const labels=[...overlay.children];for(const s of labels)s.style.display='none';
      for(let j=0;j<picks.length;j++){
        const [k,label]=picks[j],mesh=stage.children[k*2+1];
        mesh.visible=true;mesh.position.set((j-1)*.09,0,0);mesh.rotation.x=-Math.PI/2;mesh.scale.setScalar(2);
        const s=labels[j];s.style.display='';s.textContent=label+' · fired primer';
      }
      const eye=centre.clone().add(new T.Vector3(0,0,4.5));TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:centre.x,ty:centre.y,tz:centre.z,fov:35});
      for(let i=0;i<8;i++){TT.stepFrame(1/30);await new Promise(r=>setTimeout(r,50));}light();
      const camera=TT.camera;camera.updateMatrixWorld();
      for(let j=0;j<picks.length;j++){
        const p=stage.localToWorld(new T.Vector3((j-1)*.09,.07,0)).project(camera);
        labels[j].style.left=((p.x+1)*.5*innerWidth)+'px';labels[j].style.top=((1-p.y)*.5*innerHeight)+'px';
      }
      return {primers:picks.length};
    };
    window.showPrimerBaseline=async()=>{
      // Reconstruct the former undented/light primer on the same staged meshes.
      for(const [k,hex,limit] of [[0,0xbba17d,.003],[8,0x9c8d79,.005],[10,0xbcc3c3,.009]]){
        const mesh=stage.children[k*2+1],g=mesh.geometry.clone(),p=g.attributes.position,c=g.attributes.color;
        g.computeBoundingBox();const low=g.boundingBox.min.y,old=new T.Color(hex);
        for(let i=0;i<p.count;i++){
          const radius=Math.hypot(p.getX(i),p.getZ(i)),y=p.getY(i)-low;
          if(radius<limit&&y<.001){
            p.setY(i,low);
            c.setXYZ(i,old.r,old.g,old.b);
          }
        }
        g.computeVertexNormals();mesh.geometry=g;
      }
      for(const s of [...overlay.children].slice(0,3))s.textContent=s.textContent.replace('fired primer','smooth baseline');
      for(let i=0;i<8;i++){TT.stepFrame(1/30);await new Promise(r=>setTimeout(r,50));}
      return true;
    };
    return sizes;
  })()`);
  for(const light of ['noon','overcast','dusk','night']){
    const result=await page.evaluate('showCartridges('+JSON.stringify(light)+')');
    assert.equal(result.labels,11);
    await new Promise(r=>setTimeout(r,1000));
    const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:95});
    fs.writeFileSync(path.join(out,light+'.jpg'),Buffer.from(shot.data,'base64'));
  }
  assert.equal((await page.evaluate('showPrimers()')).primers,3);
  await new Promise(r=>setTimeout(r,600));
  const primers=await page.send('Page.captureScreenshot',{format:'jpeg',quality:95});
  fs.writeFileSync(path.join(out,'primers.jpg'),Buffer.from(primers.data,'base64'));
  assert(await page.evaluate('showPrimerBaseline()'));
  await new Promise(r=>setTimeout(r,600));
  const before=await page.send('Page.captureScreenshot',{format:'jpeg',quality:95});
  fs.writeFileSync(path.join(out,'primers-before.jpg'),Buffer.from(before.data,'base64'));
  assert.deepEqual(page.errors,[]);
  fs.writeFileSync(path.join(out,'dimensions.json'),JSON.stringify(data,null,2)+'\n');
  console.log('PASS 11 live/case pairs, four lights, three primer faces, zero page errors');
} finally {await browser.close();await server.close();}
