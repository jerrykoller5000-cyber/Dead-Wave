import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const out='handoffs/GP-19969/before';
if(fs.existsSync(`${out}/result.json`))throw Error('Baseline already archived');
fs.mkdirSync(out,{recursive:true});
const engine=new Engine({match:true,warm:'none',size:[1280,720]});
try {
 await engine.open();
 await engine.page.evaluate(`(()=>{TT.runDevCommand('godmode');TT.setDay(5);TT.clearZombies();TT.setRelayUpDbg(true);const p=TT.HQ_PANEL_FRONT;TT.player.position.set(p.x,TT.house.group.position.y+1,p.z);TT.openHQBriefingDbg();})()`);
 for(const name of ['report','fieldwork','relay']) {
  await engine.page.evaluate(`document.querySelector('[aria-controls="briefing-${name}"]').click()`);
  await engine.page.screenshot(`${out}/${name}-1280.png`);
 }
 await engine.page.setViewport(390,844);
 await engine.page.screenshot(`${out}/relay-390.png`);
 const result={errors:engine.page.errors,renderer:engine.renderer,loadSec:engine.loadSec};
 fs.writeFileSync(`${out}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 if(result.errors.length)process.exitCode=1;
} finally {await engine.close();}
