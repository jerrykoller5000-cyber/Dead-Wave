import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:800,height:500});
  await page.goto(server.origin+'/index.html?debug=1');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  const result=await page.evaluate(`(()=>{
    const result={};let total=0,roles=0,masks=0;
    for(const [id,gun] of Object.entries(TT.weaponMeshes)){
      const refs=new Set(),add=v=>{if(v?.isObject3D)refs.add(v)};
      for(const v of Object.values(gun.userData))if(Array.isArray(v))v.forEach(add);else add(v);
      const groups=new Map();let meshes=0;
      gun.traverse(o=>{
        if(!o.isMesh)return;meshes++;
        const m=o.material;
        if(o.isInstancedMesh||o.isSkinnedMesh||Array.isArray(m)||refs.has(o)||o.children.length||
            m.transparent||m.map||m.emissive?.getHex()||m.wireframe||m.alphaTest||m.depthWrite===false||m.depthTest===false||
            m.normalMap||m.aoMap||m.roughnessMap||m.metalnessMap||m.flatShading||
            !(m.type==='MeshStandardMaterial'||m.name==='fold-static'))return;
        const key=[o.parent.uuid,o.visible,o.castShadow,o.receiveShadow,o.renderOrder,o.layers.mask,m.side,m.polygonOffset,m.vertexColors && m.name!=='fold-static'?'art':'plain'].join('/');
        if(!groups.has(key))groups.set(key,{parent:o.parent.name||o.parent.type,items:[]});
        groups.get(key).items.push({name:o.name,role:m.userData.weaponFinishRole||'',coated:m.userData.gunPaintId===id,
          color:m.color.getHex(),rough:m.roughness,metal:m.metalness,material:m.name});
      });
      const rows=[];let byRole=0,byMask=0;
      for(const row of groups.values()){
        if(row.items.length<2)continue;
        const roleBins=new Set(row.items.map(x=>x.coated?'coated/'+x.role:'bare')),maskBins=new Set(row.items.map(x=>x.coated));
        byRole+=row.items.length-roleBins.size;byMask+=row.items.length-maskBins.size;rows.push(row);
      }
      result[id]={meshes,byRole,byMask,rows};total+=meshes;roles+=byRole;masks+=byMask;
    }return {total,roleSavings:roles,maskSavings:masks,result};
  })()`);
  await save(new URL('./palette-plan.json',import.meta.url),JSON.stringify(result,null,2));
  console.log('Eligible attached mesh count',result.total,'role-preserving upper savings',result.roleSavings,'two-mask upper savings',result.maskSavings);
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close()}
