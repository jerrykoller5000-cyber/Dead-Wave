import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const dir='review/range-polish-GP19913',before=process.argv.includes('--before'),E=new Engine({training:true,warm:'none',size:'1440x900'}),proof={};
try{
 await E.open();proof.loadSec=E.loadSec;
 await E.ev('R.release();T.trainingDbg.panel().close();T.AudioSys.setMuted(true);T.player.position.set(0,-200,-642);T.setVelDbg(0,0);T.rangeDbg.open();');
 await E.page.screenshot(`${dir}/${before?'before':'after'}-menu.png`);
 proof.weapons=await E.ev('return [...document.querySelectorAll("[data-weapon]")].map(e=>({weapon:e.dataset.weapon,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));');
 if(!before){
  assert.equal(proof.weapons.length,8);assert.equal(new Set(proof.weapons.map(x=>x.height)).size,1);
  assert(proof.weapons.every(x=>Math.abs(x.width-proof.weapons[0].width)<1));
  await E.ev('document.querySelector("[data-view=records]").click();');await E.page.screenshot(`${dir}/after-records.png`);
  for(const width of [900,650,390]){
   await E.page.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
   await E.ev('document.querySelector("[data-view=briefing]").click();');
   await E.page.screenshot(`${dir}/after-${width}.png`);
   const overflow=await E.ev('return [...document.querySelectorAll("#rangeConsole,.rd-panel")].some(e=>e.scrollWidth>e.clientWidth+1);');assert(!overflow,`no horizontal overflow ${width}`);
  }
 }
 await E.ev('T.rangeDbg.exit();T.resetPerf();');await new Promise(r=>setTimeout(r,3500));proof.perf=await E.ev('return T.perfSnapshot();');
 assert.deepEqual(E.page.errors,[]);
}finally{proof.errors=E.page?.errors;fs.writeFileSync(`${dir}/${before?'before':'after'}-visual.json`,JSON.stringify(proof,null,2));await E.close();}process.exit(0);
