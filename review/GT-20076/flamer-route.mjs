import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate(`(async()=>{
    const source=await(await fetch('/ui/weapon-sling.js')).text();
    const from='const lower=guide?at(...guide):at(.222,.89,-.19)';
    if(source.split(from).length!==2)throw Error('Missing lower guide');
    const url=URL.createObjectURL(new Blob([source.replace(from,'const lower=at(...window.guideTrial)')],{type:'text/javascript'}));
    const {fitWeaponSling}=await import(url);URL.revokeObjectURL(url);
    const {makeSlingAudit}=await import('/tools/tests/weapon-seating.js');
    window.routeCandidates={};
    window.probeRoute=(spot,vest)=>{
      const measure=makeSlingAudit(spot,1.8/1.655,.002), candidates=[];
      const current=measure();
      for(const x of [.222,.20,.18,.245])for(const y of [.82,.85,.89,.78,.94])for(const z of [-.14,-.115,-.165,-.19]){
        window.guideTrial=[x,y,z];spot.sling.userData.signature=null;
        fitWeaponSling(TT.THREE,spot,vest,spot.sling.userData.clips[0].material);
        const r=measure();
        if(!r.nearWeb && !r.overlaps.length && r.ends.every(e=>e.webContact&&e.gunContact))candidates.push([x,y,z]);
      }
      window.routeCandidates[vest?'vest':'shirt']={current,candidates};
      spot.sling.userData.signature=null;
    }
  })()`);
  const src=await readFile(new URL('../../tools/tests/tgt20076.js',import.meta.url),'utf8');
  const marker='      for (const [i,spot] of rig.slings.entries()) {';
  assert.equal(src.split(marker).length,2);
  // Observe the exact loadout state of the catalog fixture. Restore the live
  // builder before the unchanged assertions run on the original route.
  const code=src.replace(marker,`      if(kind==='flamer') {
        window.probeRoute(rig.slings[0],vest);
        const {fitWeaponSling}=await import('/ui/weapon-sling.js');
        fitWeaponSling(T.THREE,rig.slings[0],vest,rig.slings[0].sling.userData.clips[0].material);
      }
`+marker);
  await page.evaluate(code,480000);
  const data=await page.evaluate('window.routeCandidates');
  await writeFile(new URL('./resumed/flamer-route.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
  console.log('Clear routes:',data.shirt.candidates.length,data.vest.candidates.length);
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
