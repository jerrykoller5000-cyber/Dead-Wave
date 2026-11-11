import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../../tools/cdp.mjs';
import {serve} from '../../../tools/serve.mjs';
import {save} from '../../GT-20076/save.mjs';

const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN && ['before','after','unmarked'].includes(phase));
const dir=new URL('./'+phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../../',import.meta.url)),0);
const browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Prop review';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  const surfaceOnly=process.argv.includes('--surface');
  const frameFile=surfaceOnly?'surface-frames.json':'frames.json';
  const refs=phase!=='before'?JSON.parse(await readFile(new URL('./before/'+frameFile,import.meta.url),'utf8')):[];
  await page.evaluate('window.fragRefs='+JSON.stringify(refs));
  await page.evaluate(`(async()=>{
    const T=TT.THREE,H=TT.inspectHost(),{LIGHTS}=await import('/studio/inspector/stage.js');
    TT.setViewFirstDbg(true);TT.grantAllWeapons();if(TT.isUnarmed())TT.toggleHolster();TT.setGrenadesDbg(3);
    TT.flightHold(true);const step=n=>{for(let i=0;i<n;i++)TT.stepFrame(1/30)};
    TT.setWeapon(TT.WEAPON_ORDER.indexOf('pistol'));step(80);
    const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);
    let light='noon',frozen=false,last='',sample=null;
    H.attach({held:()=>frozen,scale:dt=>dt,frame:()=>{
      const L=LIGHTS[light],p=TT.player.position;
      H.sun.position.copy(p).addScaledVector(new T.Vector3(...L.dir).normalize(),85);
      H.sun.target.position.copy(p);H.sun.target.updateMatrixWorld();H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;
      H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
    }});
    window.fragFrame=async(view,lighting)=>{
      light=lighting;
      if(view!==last){
        frozen=false;TT.setShotView(null);TT.setViewFirstDbg(view.startsWith('eye'));
        const range=TT.trainingDbg.tg();TT.player.position.set(range.origin.x,range.floorY,range.origin.z-.55);
        TT.setOtsAimDbg(0,-.08);TT.setZoomHeldDbg(false);step(40);
        TT.holdGrenadeAnim(view==='eye-lift'?'raise':'cocked',view==='eye-lift'?.105:0);
        step(46);
        const held=TT.grenadeAnimDbg();
        if(!held.inHand||!held.hand.visible)throw Error('Missing actual prop at held pose');
        if(view==='surface'){
          const {makeFragGrenade}=await import('/studio/frag-grenade.js');
          sample=makeFragGrenade({THREE:T});
          sample.position.copy(TT.player.position).add(new T.Vector3(0,7,0));TT.scene.add(sample);
          const center=sample.getWorldPosition(new T.Vector3());
          const eye=center.clone().add(new T.Vector3(-.27,.065,.025));
          TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:center.x,ty:center.y,tz:center.z,fov:31});
        }else if(!view.startsWith('eye')){
          const mesh=held.hand.getObjectByName('body');if(!mesh)throw Error('No grenade body');
          const center=new T.Box3().setFromObject(mesh).getCenter(new T.Vector3());
          const eye=center.clone().add(view==='held-left'?new T.Vector3(-.28,.09,.28):new T.Vector3(.29,.13,.20));
          TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:center.x,ty:center.y,tz:center.z,fov:34});
        }else{
          const eye=TT.viewmodelDbg().root.getObjectByName('vm-grenade');
          if(!eye?.children.some(o=>o.visible))throw Error('First-person held prop missing');
        }
        last=view;
      }
      frozen=true;
      const ref=fragRefs.find(f=>f.view===view&&f.light===light);
      if(ref&&!view.startsWith('eye')){
        const [x,y,z]=ref.cam,[dx,dy,dz]=ref.dir;
        TT.setShotView({x,y,z,tx:x+dx,ty:y+dy,tz:z+dz,fov:view==='surface'?31:34});
      }
      for(let i=0;i<4;i++){step(1);await new Promise(r=>setTimeout(r,65))}
      return {view,light,phase:TT.grenadeAnimDbg().phase,cam:H.camera.position.toArray(),dir:H.camera.getWorldDirection(new T.Vector3()).toArray()};
    };
  })()`);
  const frames=[];
  for(const view of (surfaceOnly?['surface']:['eye-held','eye-lift','held-left','held-right']))for(const light of ['noon','overcast','dusk','night']){
    frames.push(await page.evaluate('fragFrame('+[view,light].map(v=>JSON.stringify(v)).join(',')+')'));
    const image=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
    await save(new URL(view+'-'+light+'.jpg',dir),Buffer.from(image.data,'base64'));
  }
  if(phase==='unmarked'){
    const clean=await page.evaluate(`(()=>{
      const held=TT.grenadeAnimDbg().hand;let hasInk=false;
      held.traverse(o=>{if(o.name==='stencil'||o.material?.map)hasInk=true});
      const plain=held.getObjectByName('spoon');
      return !hasInk&&!!plain;
    })()`);
    assert(clean,'The held model still carries lettering');
  }
  await save(new URL(frameFile,dir),JSON.stringify(frames,null,2));
  assert.deepEqual(page.errors,[]);console.log('PASS',phase,frames.length,surfaceOnly?'standalone surface views':'actual held frag views');
}finally{await browser.close();await server.close()}
