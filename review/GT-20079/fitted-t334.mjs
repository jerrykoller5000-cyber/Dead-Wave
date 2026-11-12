import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const phase=process.argv[2];assert(['before','after'].includes(phase));
const root=new URL('../../',import.meta.url);
const server=await serve(fileURLToPath(root),0),browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  assert(await page.evaluate("TT.opticDbg.grant('ak','acog')&&TT.opticDbg.fit('ak','acog')&&TT.weaponMeshes.ak.userData.opticPlate.visible"));
  const uv=await page.evaluate('('+inspectUv.toString()+')()');
  await save(new URL('./fitted-uv-'+phase+'.json',import.meta.url),JSON.stringify(uv,null,2)+'\n');
  console.log('UV disagreements',uv);
  await page.evaluate(await readFile(new URL('tools/tests/lib.js',root),'utf8'));
  const result=await page.evaluate(await readFile(new URL('tools/tests/t334.js',root),'utf8'),180000);
  await save(new URL('./fitted-t334-'+phase+'.txt',import.meta.url),result+'\n');console.log(result);
  assert.deepEqual(page.errors,[]);
} finally {await browser.close();await server.close();}

function inspectUv(){
  const T=window.TT,G=T.THREE,root=T.weaponMeshes.ak,meshes=[],errors=[];
  root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert();
  root.traverse(o=>{if(o.material?.userData.gunPaintId==='ak')meshes.push(o);});
  for(const mesh of meshes){
    const p=mesh.geometry.attributes.position,u=mesh.geometry.attributes.uv,m=inv.clone().multiply(mesh.matrixWorld);
    const a=[0,1,2].map(i=>new G.Vector3().fromBufferAttribute(p,i).applyMatrix4(m));
    const normal=points=>new G.Vector3().crossVectors(points[1].clone().sub(points[0]),points[2].clone().sub(points[0])).toArray().map(Math.abs);
    const n=normal(a),rounded=normal(a.map(v=>new G.Vector3(...v.toArray().map(Math.fround))));
    const at=a.map((v,i)=>{
      const s=Math.abs(root.scale.x)/.42;
      const expected=n[0]>=n[1]&&n[0]>=n[2]?[v.z*s,v.y*s]:n[1]>=n[2]?[v.x*s,v.z*s]:[v.x*s,v.y*s];
      return {expected,actual:[u.getX(i),u.getY(i)]};
    });
    if(at.some(r=>r.expected.some((v,i)=>Math.abs(v-r.actual[i])>.0005))){
      errors.push({part:mesh.name,parent:mesh.parent.name,index:mesh.parent.children.indexOf(mesh),role:mesh.material.userData.weaponFinishRole,n,rounded,at});
    }
  }
  return errors;
}
