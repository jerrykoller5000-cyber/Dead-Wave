import assert from 'node:assert/strict';
import {writeFile,readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
 const result=await page.evaluate(`(async()=>{
  const T=TT,{makePistolModel}=await import('/studio/weapon-sidearms.js'),
   {visibleSurfaceGap,visiblePieces}=await import('/tools/tests/weapon-seating.js');
  const ctx=T.inspectHost().builders.weaponContext();
  const gun=makePistolModel({...ctx,finishGun:g=>g}),u=gun.userData,slide=u.slide,barrel=u.barrelAssembly;
  gun.scale.copy(T.weaponMeshes.pistol.scale);gun.visible=true;
  const rest=barrel.position.clone(),base=slide.position.clone(),rows=[];
  const closure={slide:visiblePieces(slide).filter(p=>p.mesh.name==='pistol slide shell').map(p=>({closed:p.closed,faces:p.faces.length})),
   chamber:visiblePieces(barrel).filter(p=>p.mesh.name==='pistol chamber and hood').map(p=>({closed:p.closed,faces:p.faces.length}))};
  for(const travel of [0,.002,.004,.005,.006,.0065,.007,.0075,.008,.01,.02,.04,.06,.08,.10,.13]){
   slide.position.copy(base);slide.position.z-=travel;
   const joint=Math.min(travel,.004),unlock=Math.max(0,Math.min(1,(travel-.004)/.004));
   barrel.position.copy(rest);barrel.position.z-=joint;barrel.position.y-=.010*unlock;barrel.rotation.x=-.05*unlock;gun.updateMatrixWorld(true);
   rows.push({travel,barrelPosition:barrel.position.toArray(),barrelAngle:barrel.rotation.x,
    slide:visibleSurfaceGap(barrel,slide,1),frame:visibleSurfaceGap(barrel,u.frame,1)});
  }
  return {closure,scale:gun.scale.toArray(),triggerPin:u.triggerPin,rows};
 })()`,240000);
 await writeFile(new URL('mechanism-check.json',import.meta.url),JSON.stringify(result,null,2));
 console.log('CANONICAL CLOSURE',JSON.stringify(result.closure));
 assert(result.closure.slide.length===1&&result.closure.slide[0].closed);
 assert(result.closure.chamber.length===1&&result.closure.chamber[0].closed);
 for(const row of result.rows)console.log('POSE',row.travel,'slidePenetrating',row.slide.penetrating,'framePenetrating',row.frame.penetrating,'gaps',row.slide.upperMm,row.frame.upperMm);
 const failed=result.rows.filter(r=>r.slide.penetrating||r.frame.penetrating);
 assert.equal(failed.length,0,'barrel must clear slide/frame across mechanical pose envelope');
 const test=String(await page.evaluate(await readFile(new URL('../../tools/tests/t333.js',import.meta.url),'utf8'),180000));
 await writeFile(new URL('t333.txt',import.meta.url),test);console.log(test);
 assert(!test.split('\n').some(s=>s.startsWith('FAIL')));
 assert.deepEqual(page.errors,[]);
 console.log('PASS native pistol candidate envelope and original t333');
}finally{await browser.close();await server.close();}
