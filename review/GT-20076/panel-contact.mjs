import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from './save.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:800,height:450});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  const rows=await page.evaluate(`(async()=>{
    const {makeAa12Model}=await import('/studio/weapon-longarms.js');
    const {visiblePieces}=await import('/tools/tests/weapon-seating.js');
    const ctx=TT.inspectHost().builders.weaponContext(),records=[];
    makeAa12Model({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit(g){
      const kit=ctx.gunKit(g);
      return {...kit,slab(...args){
        const mesh=kit.slab(...args);
        if(args[2]===ctx.gunRubber && Math.abs(mesh.position.x)===.0255 && args[1]===.003){
          records.push({mesh,old:mesh.geometry.clone(),origin:mesh.position.toArray()});
        }
        return mesh;
      }};
    }});
    return records.map(({mesh,old,origin})=>{
      const side=Math.sign(mesh.position.x),base=.026,eps=1e-8;
      function scan(geo){
        const a=geo.attributes, points=new Set();let below=0,extreme=-Infinity;
        for(let i=0;i<a.position.count;i++){
          const x=a.position.getX(i),y=a.position.getY(i),z=a.position.getZ(i),level=side*(x+mesh.position.x);
          extreme=Math.max(extreme,level);if(level<base-eps)below++;
          if(level<=base+eps)continue;
          points.add([x,y,z,a.normal.getX(i),a.normal.getY(i),a.normal.getZ(i),a.uv.getX(i),a.uv.getY(i)].join('/'));
        }return {points,extreme,below};
      }
      const a=scan(old),b=scan(mesh.geometry),pieces=visiblePieces(mesh);
      return {side,origin,movedOrigin:mesh.position.distanceTo(new TT.THREE.Vector3(...origin)),
        outsideVertices:a.points.size,missing:[...a.points].filter(x=>!b.points.has(x)).length,
        added:[...b.points].filter(x=>!a.points.has(x)).length,extremeChange:b.extreme-a.extreme,
        pointsBehindBefore:a.below,pointsBehindAfter:b.below,islands:pieces.length,closed:pieces.every(p=>p.closed)};
    });
  })()`);
  await save(new URL('./visible-repairs/aa12/grip-panel-contact.json',import.meta.url),JSON.stringify(rows,null,2)+'\n');
  assert.equal(rows.length,2);
  for(const r of rows){assert(r.outsideVertices>0 && r.pointsBehindBefore>0);assert.equal(r.pointsBehindAfter,0);
    assert.equal(r.missing+r.added,0);assert.equal(r.extremeChange,0);assert.equal(r.movedOrigin,0);assert.equal(r.islands,1);assert(r.closed);}
  assert.deepEqual(page.errors,[]);
  console.log('PASS both thin graphics closed, every exposed vertex/normal/UV identical, origin and outer-plane displacement zero',rows.map(r=>r.outsideVertices));
}finally{await browser.close();await server.close();}
