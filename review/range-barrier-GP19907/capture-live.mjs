import fs from 'node:fs';import assert from 'node:assert/strict';
const before=process.argv.includes('--before'),{Engine}=await import('../../tools/camera.mjs');
const dir='review/range-barrier-GP19907',prefix='live',E=new Engine({training:true,warm:'none',size:'1440x900'}),proof={mode:prefix};
try{
 await E.open();proof.loadSeconds=E.loadSec;proof.renderer=E.renderer;
 await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');T.grantAllWeapons();T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));`);
 const views=[['overview',[-8,-192,-651],[0,-198.2,-637],50],['front',[0,-196.4,-651],[0,-198.3,-638],54],['side',[9,-197.1,-642],[0,-198.4,-639.5],52],['shooting-gap',[0,-198.55,-643],[0,-198.45,-630],62]];
 for(const[name,cam,look,fov]of views)await E.run({cmd:'shot',cam:{x:cam[0],y:cam[1],z:cam[2],tx:look[0],ty:look[1],tz:look[2],fov},out:`${dir}/${prefix}-${name}.png`});
 proof.geometry=await E.ev(`const tg=T.trainingDbg.tg(),g=tg.group.getObjectByName('training-firing-bench');let draws=0,triangles=0;g?.traverse(o=>{if(o.isMesh){draws++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});return {walk:tg.walk,spawn:tg.spawn,fixture:!!g,draws,triangles,solids:tg.solids.filter(s=>s.firingLine)};`);
 await E.ev('R.release();T.resetPerf();');await new Promise(r=>setTimeout(r,3500));proof.performance=await E.ev('return T.perfSnapshot();');
 proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
 if(!before){assert(proof.geometry.fixture);assert(proof.geometry.draws<=7);assert.equal(proof.geometry.solids.length,8);assert(proof.geometry.walk[0].maxZ<=-640.23);}
 console.log('PASS '+prefix+' geometry/screenshots; draws '+proof.geometry.draws+'; browser errors0');
}finally{proof.errors=E.page?.errors;fs.writeFileSync(dir+'/'+prefix+'-proof.json',JSON.stringify(proof,null,2));await E.close();}

process.exit(0);
