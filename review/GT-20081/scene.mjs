import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { launch } from '../../tools/cdp.mjs';
import { serve } from '../../tools/serve.mjs';
import { save } from '../GT-20076/save.mjs';

const phase=process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && /^[a-z0-9-]+$/.test(phase));
const folder=new URL('./'+phase+'/',import.meta.url);
await mkdir(folder,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  const report=await page.evaluate(`(()=>{
    const counts={},details={};
    function describe(gun){
      const ids=new Map(),roots=new Map([[gun,'body']]);
      for(const [name,value] of Object.entries(gun.userData)){
        if(value?.isObject3D)roots.set(value,name);
        else if(Array.isArray(value))value.forEach((o,i)=>{if(o?.isObject3D)roots.set(o,o.name||name+'['+i+']')});
      }
      const list=[];
      gun.traverse(o=>{
        if(!o.isMesh)return;
        let node=o,shown=true,part=null;
        while(node && node!==gun){
          if(!node.visible)shown=false;
          if(!part && roots.has(node))part=roots.get(node);
          node=node.parent;
        }
        const materials=Array.isArray(o.material)?o.material:[o.material];
        list.push({part:part||'body',name:o.name,owner:o.parent?.name||'',shown,vertices:o.geometry.attributes.position.count,
          drawGroups:Array.isArray(o.material)?o.geometry.groups.length:1,
          finishes:materials.map(m=>{
            if(!ids.has(m))ids.set(m,ids.size);
            return {id:ids.get(m),name:m.name,role:m.userData.weaponFinishRole||'',paint:m.userData.gunPaintId||'',
              color:m.color?.getHex(),roughness:m.roughness,metalness:m.metalness,
              transparent:m.transparent,map:!!m.map,vertexColors:m.vertexColors,fx:!!m.emissiveMap||!!m.emissive?.getHex()};
          })});
      });
      return list;
    }
    for(const [key,gun] of Object.entries(TT.weaponMeshes)){
      const list=details[key]=describe(gun);
      counts[key]={meshes:list.length,shown:list.filter(p=>p.shown).length,
        drawGroups:list.reduce((sum,p)=>sum+(p.shown?p.drawGroups:0),0),vertices:list.reduce((sum,p)=>sum+p.vertices,0)};
    }
    const uzi=TT.weaponMeshes.uzi.userData,offhand=TT.offhandMeshes.uzi.userData;
    return {counts,total:Object.values(counts).reduce((sum,row)=>sum+row.meshes,0),details,
      offhand:{setter:typeof offhand.setMagazineRounds,independent:uzi.magazineTopRound!==offhand.magazineTopRound}};
  })()`);
  await page.evaluate("DWOpening.dismissForTesting()");
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Scene review';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  report.clone=await page.evaluate(`(()=>{
    TT.grantAllWeapons();TT.modsOwnAllDbg();TT.addCash(100000);
    TT.opticDbg.fit('pistol','rmr');
    const mount=TT.weaponMeshes.pistol.userData.fittedOptic,clone=TT.cloneLean(mount);
    return {mount:mount.name,child:!!mount.getObjectByName('optic.rmr'),copy:clone.name,copyChild:!!clone.getObjectByName('optic.rmr')};
  })()`);
  await save(new URL('scene.json',folder),JSON.stringify(report,null,2));
  assert.deepEqual(page.errors,[]);
  console.log('Real renderer',report.total,'meshes across',Object.keys(report.counts).length,'guns',JSON.stringify(report.counts),'optic',JSON.stringify(report.clone));
} finally {await browser.close();await server.close()}
