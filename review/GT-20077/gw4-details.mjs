import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';

const phase = process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const dir = new URL('./m4/details/' + phase + '/', import.meta.url);
await mkdir(dir,{recursive:true});
const server = await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser = await launch({headless:false});
try {
  const page = await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Artwork';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on") && Math.abs(TT.getWorldTime()-.5)<.02',{timeout:45000}));
  const geometry = await page.evaluate(`(async()=>{
    const {makeM4Model}=await import('/studio/weapon-longarms.js');
    const T=TT.THREE, raw=makeM4Model({...TT.inspectHost().builders.weaponContext(),finishGun:g=>g});
    const u=raw.userData;
    const skip=[u.flash,u.flashLight,u.flare,u.laser].filter(Boolean);
    const vertices=[],point=new T.Vector3();
    raw.updateMatrixWorld(true);
    raw.traverse(o=>{
      if(!o.isMesh || !o.geometry.attributes.position)return;
      for(let p=o;p;p=p.parent)if(skip.includes(p))return;
      const attr=o.geometry.attributes.position,coords=[];
      for(let i=0;i<attr.count;i++){
        point.fromBufferAttribute(attr,i).applyMatrix4(o.matrixWorld);
        coords.push(Math.round(point.x*1e6),Math.round(point.y*1e6),Math.round(point.z*1e6));
      }
      vertices.push(coords.join(','));
    });
    const stage=new T.Group();stage.position.set(30,80,-60);stage.scale.setScalar(5);stage.add(raw);TT.scene.add(stage);
    TT.setViewFirstDbg(false);
    const key=new T.DirectionalLight(0xfff4df,2.6),fill=new T.HemisphereLight(0xf1f6ff,0xcabdac,1.5);
    key.position.set(33,84,-62);key.target.position.copy(stage.position);TT.scene.add(key,key.target,fill);
    const style=document.createElement('style');style.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(style);
    window.frameGW=(part,view,target,distance)=>{
      raw.traverse(o=>{if(o.name==='laserLightUnit')o.visible=false});
      const center=new T.Vector3(...target).multiplyScalar(5).add(stage.position);
      const eye=center.clone().addScaledVector(new T.Vector3(...view).normalize(),distance*5);
      TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:center.x,ty:center.y,tz:center.z,fov:34});
    };
    return vertices;
  })()`);
  const hashes = geometry.map(coords=>createHash('sha256').update(coords).digest('hex')).sort();
  await save(new URL('mesh-shapes.json',dir),JSON.stringify(hashes,null,2));
  for (const [name,view,target,distance] of [
    ['side',[1,.07,-.05],[0,.015,.045],.43],
    ['rear',[-.95,.38,-.9],[0,.018,-.20],.72],
    ['mag',[-1,.04,.28],[0,-.14,.049],.43],
    ['whole',[1,.24,-.26],[0,0,.16],1.56]
  ]) {
    await page.evaluate('frameGW('+[name,view,target,distance].map(x=>JSON.stringify(x)).join(',')+');new Promise(r=>setTimeout(r,250))');
    const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
    await save(new URL(name+'.jpg',dir),Buffer.from(shot.data,'base64'));
  }
  assert.deepEqual(page.errors,[]);
  console.log('PASS '+phase+' GW-4: '+hashes.length+' mesh fingerprints and four model views');
} finally {await browser.close();await server.close()}
