import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../../tools/cdp.mjs';
import {serve} from '../../../tools/serve.mjs';
import {save} from '../../GT-20076/save.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const root=new URL('../../../',import.meta.url);
let reference=await readFile(new URL('studio/weapon-heavy.js',root),'utf8');
for(const [current,old] of [
  [
    "  const toothCount = 42;",
    "  const toothCount = 22;"
  ],
  [
    "  // One low, dark segment and two offset steel accents repeat around the\n  // existing animated path. Their silhouette stays fine in the player's view.",
    "  // GP-20051/J31: tall angled cutter crowns break the bar's outline at the\n  // normal sheet scale; bright steel separates them from the grey guide bar."
  ],
  [
    "  bar.remove(toothPrototype);\n  toothPrototype.geometry.computeBoundingBox();\n  const span = toothPrototype.geometry.boundingBox.getSize(new THREE.Vector3());\n  const link = new THREE.Mesh(new THREE.BoxGeometry(span.x * .58, span.y * .18, span.z * 1.25), gunDark);\n  link.position.y = -span.y * .11;\n  const accents = [-1, 1].map(side => {\n    const accent = new THREE.Mesh(toothPrototype.geometry, steelMat);\n    accent.scale.set(.23, .34, .44);\n    accent.position.set(side * span.x * .23, 0, side * span.z * .36);\n    return accent;\n  });\n  const chainFinish = steelMat.clone();\n  chainFinish.name = 'chainsaw link finish';\n  chainFinish.color.setHex(0xffffff);\n  chainFinish.vertexColors = true;\n  chainFinish.roughness = .58;\n  const segment = mergeParts([link, ...accents], chainFinish);\n  for (let i = 0; i < toothCount; i++) {",
    "  bar.remove(toothPrototype);\n  for (let i = 0; i < toothCount; i++) {"
  ],
  [
    "new THREE.InstancedMesh(segment.geometry, chainFinish, toothCount)",
    "new THREE.InstancedMesh(toothPrototype.geometry, steelMat, toothCount)"
  ]
]){
  assert.equal(reference.split(current).length,2,'Reference artwork changed');
  reference=reference.replace(current,old);
}
reference=reference.replace(/(const toothPrototype = B\.slab\([^\n]+)\{ bevel: 0 \}/,'$1{ bevel: 0.001, segs: 1 }');
const server=await serve(fileURLToPath(root),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(server.origin+'/index.html?debug=1');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("TT.applyGraphicsPreset('high');document.getElementById('playerName').value='Chain comparison';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate("TT.grantAllWeapons();TT.setViewFirstDbg(true);if(TT.isUnarmed())TT.toggleHolster();TT.setWeapon(TT.WEAPON_ORDER.indexOf('chainsaw'))");
  assert(await page.waitFor("TT.viewmodelDbg().info.key==='chainsaw' && TT.viewmodelDbg().info.raise>.98"));
  const moduleURL=server.origin+'/studio/weapon-heavy.js';
  reference=reference.replace(/from '(\.{1,2}\/[^']+)'/g,(_,s)=>"from '"+new URL(s,moduleURL).href+"'");
  await page.evaluate('window.coarseSource='+JSON.stringify(reference));
  const runs=await page.evaluate(`(async()=>{
    const url=URL.createObjectURL(new Blob([coarseSource],{type:'text/javascript'}));
    const {makeChainsawModel}=await import(url);URL.revokeObjectURL(url);
    const ctx=TT.inspectHost().builders.weaponContext(),src=TT.weaponMeshes.chainsaw,d=src.userData;
    const original=makeChainsawModel({...ctx,finishGun:g=>g}).userData.chainInst;
    const inst=d.chainInst,fullMarks=d.chainTeeth;
    const looks={coarse:{geometry:original.geometry,material:original.material,count:original.count},
      fine:{geometry:inst.geometry,material:inst.material,count:inst.count}};
    if(looks.coarse.count!==22||looks.fine.count!==42)throw Error('Wrong comparison models');
    const results=[];
    for(const look of ['coarse','fine','coarse','fine']){
      const active=looks[look];
      inst.geometry=active.geometry;inst.material=active.material;inst.count=active.count;
      d.chainTeeth=look==='fine'?fullMarks:fullMarks.slice(0,active.count);ctx.layoutChainsawChain(src);
      await new Promise(r=>setTimeout(r,1500));
      const eye=TT.viewmodelDbg().gun.root;let copies=0;
      eye.traverse(o=>{if(o.isInstancedMesh && o.count===active.count && (o.geometry===active.geometry || o.geometry.userData.vmFlipOf===active.geometry))copies++});
      if(copies!==1)throw Error('Normal first-person copy missed '+look);
      const frames=[],snapshots=[];let last=await new Promise(requestAnimationFrame),start=last;
      while(last-start<9000){
        const now=await new Promise(requestAnimationFrame);frames.push(now-last);last=now;
        if(!snapshots.length||now-snapshots.at(-1).at>=990){
          const s=TT.perfSnapshot();if(TT.getGfx()!=='high'||TT.getCurrentWeapon()!=='chainsaw')throw Error('Scene changed');
          snapshots.push({at:now,fps:s.fps,low:s.low});
        }
      }
      const avg=a=>a.reduce((a,b)=>a+b,0)/a.length,sorted=frames.slice().sort((a,b)=>a-b);
      results.push({look,meanMs:avg(frames),p99Ms:sorted[Math.ceil(sorted.length*.99)-1],
        fps:avg(snapshots.map(s=>s.fps)),low:avg(snapshots.map(s=>s.low)),frames,snapshots});
    }
    return results;
  })()`,100000);
  await save(new URL('./chain-paired-high.json',import.meta.url),JSON.stringify(runs,null,2));
  for(const r of runs)console.log('PASS',r.look,r.meanMs.toFixed(2),'ms mean,',r.p99Ms.toFixed(2),'ms p99,',r.fps.toFixed(1),'fps,',r.low.toFixed(1),'low');
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close()}
