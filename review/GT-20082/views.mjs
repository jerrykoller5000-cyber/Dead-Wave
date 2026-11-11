import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

const phase = process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after','uv-probe','final'].includes(phase));
const j128 = process.argv.includes('--j128');
if (j128) assert.equal(phase,'final');
const dir = new URL(j128 ? '../GT-20076/visible-repairs/ak/wood/' : './'+phase+'/',import.meta.url);
await mkdir(dir,{recursive:true});
const server = await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser = await launch({headless:false});
try {
  const page = await browser.newPage({width:1280,height:720});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Wood review'; document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate(`(async()=>{
    const T=TT.THREE,H=TT.inspectHost(),{LIGHTS}=await import('/studio/inspector/stage.js');
    const css=document.createElement('style');
    css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);
    TT.grantAllWeapons();TT.modsOwnAllDbg();TT.setViewFirstDbg(true);
    if(TT.isUnarmed())TT.toggleHolster();
    TT.flightHold(true);
    const step=n=>{for(let i=0;i<n;i++)TT.stepFrame(1/30)};
    for(let i=0;i<30&&TT.getCurrentWeapon()!=='ak';i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf('ak'));step(12)}
    let light='noon';
    H.attach({held:()=>false,scale:dt=>dt,frame:()=>{
      const L=LIGHTS[light],p=TT.player.position;
      H.sun.position.copy(p).addScaledVector(new T.Vector3(...L.dir).normalize(),85);
      H.sun.target.position.copy(p);H.sun.target.updateMatrixWorld();H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;
      H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
    }});
    window.prepareWood=async(view,lighting,finish)=>{
      light=lighting;
      TT.setShotView(null);TT.setViewFirstDbg(view!=='held');TT.setZoomHeldDbg(view==='aimed');step(32);
      const range=TT.trainingDbg.tg();TT.player.position.set(range.origin.x,range.floorY,range.origin.z-.55);TT.setOtsAimDbg(0,-.08);
      if(!TT.armoryFinishDbg.paint('ak',finish))throw Error('Paint failed');
      step(70);
      const gun=TT.weaponMeshes.ak;
      if(view==='held'){
        if(!gun.visible || !gun.parent)throw Error('Missing held source');
        const focus=gun.localToWorld(new T.Vector3(0,-.04,.07)),eye=gun.localToWorld(new T.Vector3(-1.55,.34,.38));
        TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:focus.x,ty:focus.y,tz:focus.z,fov:34});step(8);
      }else if(!TT.viewmodelDbg().info.active||TT.viewmodelDbg().info.key!=='ak')throw Error('Missing eye');
      for(let i=0;i<4;i++){await new Promise(r=>setTimeout(r,70));step(1)}
      const root=view==='held'?gun:TT.viewmodelDbg().gun.root;
      const wood=[];root.traverse(o=>{if(o.isMesh && /KR-7 (walnut|birch)/.test(o.material?.name))wood.push({name:o.name,color:o.material.color.getHex(),map:o.material.map?.name||'',paint:o.material.userData.weaponFinishRole||null})});
      if(!wood.length||wood.some(o=>o.paint))throw Error('Missing or paintable wood');
      return {view,light,finish,wood,camera:H.camera.position.toArray(),dir:H.camera.getWorldDirection(new T.Vector3()).toArray()};
    };
  })()`);
  const frames=[];
  const copiesOnly = phase==='uv-probe' || process.argv.includes('--copies');
  for (const finish of (copiesOnly?[]:['', 'm81'])) for (const view of (finish?['held','hip']:['held','hip','aimed'])) for (const light of ['noon','overcast','dusk','night']) {
    const frame=await page.evaluate('prepareWood('+[view,light,finish].map(a=>JSON.stringify(a)).join(',')+')');
    frames.push(frame);
    const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
    await save(new URL([finish||'factory',view,light].join('-')+'.jpg',dir),Buffer.from(shot.data,'base64'));
  }
  if (!copiesOnly) await save(new URL('frames.json',dir),JSON.stringify(frames,null,2));
  if (copiesOnly) await page.evaluate("prepareWood('hip','overcast','m81')");
  if (phase === 'uv-probe' || phase === 'final') {
    const copies = await page.evaluate(`(async()=>{
      const ctx=TT.inspectHost().builders.weaponContext(), {makeAkModel}=await import('/studio/weapon-longarms.js');
      const raw=makeAkModel({...ctx,finishGun:gun=>gun});
      const arm=TT.armoryDbg.ui().armory;
      if(!TT.armoryDbg.stored().includes('ak'))arm.buy({id:'wood-review-kr7',kind:'ak'},{store:true});
      TT.armoryDbg.refreshRack(true);
      await prepareWood('hip','overcast','m81');
      const rack=TT.scene.getObjectByName('training-armory').getObjectByName('armoryRack');
      const copies={art:raw,held:TT.weaponMeshes.ak,eye:TT.viewmodelDbg().gun.root,
        carry:TT.carryGunCopyDbg('ak'),rack:rack.children.find(o=>o.userData.rackKind==='ak')};
      const result={};
      for(const [name,root] of Object.entries(copies)){
        const coords=[];let parts=0;const paints=new Set();
        root.traverse(o=>{
          if(!o.isMesh || o.material?.name!==(name==='eye'?'vm:KR-7 walnut':'KR-7 walnut'))return;
          const m=o.material, uv=o.geometry.attributes.uv;parts++;
          if(m.userData.weaponFinishRole||m.userData.gunPaintId||m.map?.name!=='lacquered birch grain and cut edges')
            throw Error('Finish lost on '+name);
          paints.add([m.map.name,m.color.getHex(),m.roughness,m.metalness].join(','));
          for(let i=0;i<uv.count;i++)coords.push(uv.getX(i)+','+uv.getY(i));
        });
        const data=new TextEncoder().encode(coords.sort().join(';'));
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(n=>n.toString(16).padStart(2,'0')).join('');
        result[name]={parts,count:coords.length,hash,paints:[...paints]};
      }
      return result;
    })()`);
    await save(new URL('wood-uv.json',dir),JSON.stringify(copies,null,2));
    assert.equal(copies.art.parts,4);
    for(const copy of Object.values(copies)){
      assert.equal(copy.hash,copies.art.hash,'Authored wood UVs changed on a displayed copy');
      assert.deepEqual(copy.paints,copies.art.paints);
    }
    if (j128) {
      const baseline = JSON.parse(await readFile(new URL('./final/wood-uv.json',import.meta.url),'utf8'));
      assert.deepEqual(copies,baseline,'Wood differs from the accepted J135 artwork');
      console.log('PASS all five wood UV hashes and finishes match the accepted J135 capture');
      const surface = await page.evaluate("import('/review/GT-20076/kr-cover-surface.mjs').then(m=>m.compareCover(TT.inspectHost().builders.weaponContext()))");
      await save(new URL('metal-surface.json',dir),JSON.stringify(surface,null,2));
      assert.equal(surface.islands,1); assert.equal(surface.closed,true,'Open metal surface');
      assert(surface.before > 100);
      assert.equal(surface.missing,0); assert.equal(surface.added,0);
      console.log('PASS exposed metal positions, normals and texture coordinates:',surface.before,'distinct tuples');
    }
    console.log('PASS authored UVs and factory wood on all five representations:',copies.art.count,'vertices each');
  }
  assert.deepEqual(page.errors,[]);if (!copiesOnly) console.log('PASS',phase,frames.length,'KR-7 eye and actual held views');
}finally{await browser.close();await server.close()}
