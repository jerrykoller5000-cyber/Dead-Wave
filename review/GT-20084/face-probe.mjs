import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
const id=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN && ['uzi','minigun'].includes(id));
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:960,height:540});
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Light fit';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
 const rows=await page.evaluate(`(async()=>{
  const id=${JSON.stringify(id)},T=TT.THREE,{makeViews}=await import('/review/GT-20076/visibility-camera.mjs');
  const {laserLightMount}=await import('/studio/weapon-attachments.js'),spec=laserLightMount(id);
  const vis=makeViews(TT);TT.modsOwnAllDbg();TT.addCash(100000);await vis.equip(id);
  if(!TT.armoryDbg.fit(id,'laserLight',true))throw Error('Fit failed');
  await vis.equip(id);await vis.pose('held-right-open');
  const gun=TT.weaponMeshes[id],unit=gun.userData.laserLightUnit,worldQ=unit.getWorldQuaternion(new T.Quaternion());
  const parts=new Set();for(const root of [TT.player,gun])root.traverseVisible(m=>{if(m.isMesh&&!m.isInstancedMesh&&m.material?.visible!==false)parts.add(m);});
  const offsets=[-.2,.1,.3],rows=[];
  const candidates=[['rear',[0,0,-1],[0,0,-spec.length/2]],...offsets.flatMap(z=>[
   ['left '+z,[-1,0,0],[-spec.width/2,-spec.height*.13,spec.length*z]],
   ['right '+z,[1,0,0],[spec.width/2,-spec.height*.13,spec.length*z]],
   ['bottom '+z,[0,-1,0],[0,-spec.height/2,spec.length*z]]])];
  for(const [name,normal,centre] of candidates){
    const n=new T.Vector3(...normal),tan=new T.Vector3(Math.abs(n.x)>.8?0:1,Math.abs(n.x)>.8?1:0,0);
    const target=unit.localToWorld(new T.Vector3(...centre));let visible=0,straight=false;
    for(const tilt of [.55,.8,1])for(let j=0;j<(tilt===1?1:12);j++){
      const direction=tan.clone().applyAxisAngle(n,Math.PI*j/6).multiplyScalar(Math.sqrt(1-tilt*tilt)).addScaledVector(n,tilt).applyQuaternion(worldQ);
      const eye=target.clone().addScaledVector(direction,.135),ray=new T.Raycaster(eye,direction.clone().negate(),0,.136),hits=[];
      for(const mesh of parts)T.Mesh.prototype.raycast.call(mesh,ray,hits);
      const first=hits.sort((a,b)=>a.distance-b.distance)[0];
      let parent=first?.object;while(parent && parent!==unit)parent=parent.parent;
      if(parent===unit && Math.abs(first.distance-.135)<.0012){visible++;if(tilt===1)straight=true;}
    }
    rows.push({name,normal,centre,visible,straight});
  }
  return rows;
 })()`,90000);
 await save(new URL('./'+id+'-face-probe.json',import.meta.url),JSON.stringify(rows,null,2)+'\n');
 console.log(rows.map(r=>r.name+'='+r.visible+(r.straight?' (straight)':'')).join(', '));assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
