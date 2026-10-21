import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';
const phase=process.argv[2]||'before',out=path.resolve('review/marine-fit-GP19920',phase);
fs.mkdirSync(out,{recursive:true});
const E=new Engine({inspect:true,warm:'none',show:true,size:'1440x1000'});
const watchdog=setInterval(()=>{if(E.page?.errors?.length)console.log('PAGE ERRORS',JSON.stringify(E.page.errors.slice(-4)));},10000);
try{
 await E.open();
 console.log('ready',E.loadSec,E.renderer);
 await E.ev(`await DWInspect.show('marine');await DWInspect.marine.preset('full');await DWInspect.marine.play('stand');await wait(800);DWInspect.pause();return true;`);
 for(const view of ['front','left','back']){await E.ev('await DWInspect.stepAsync(2);return true;');await E.run({cmd:'shot',target:'marine',view,out:path.join(out,view+'.png')});}
 await E.run({cmd:'shot',target:'marine',view:'three',zoom:2.5,pan:[0,.48],out:path.join(out,'head.png')});
 await E.ev(`await DWInspect.marine.preset('hot');await DWInspect.marine.play('smoke');DWInspect.play();await wait(400);DWInspect.pause();return true;`);
 await E.run({cmd:'shot',target:'marine',view:'three',out:path.join(out,'smoke.png')});
 const proof=await E.ev(`return {state:DWInspect.marine.state(),carry:T.carryDbg(),idleKeys:Object.keys(T).filter(k=>/idle|smok/i.test(k)),errors:DWInspect.errors()};`);
 fs.writeFileSync(path.join(out,'proof.json'),JSON.stringify({renderer:E.renderer,loadSec:E.loadSec,...proof},null,2));
 console.log(JSON.stringify(proof));
}finally{clearInterval(watchdog);await E.close();}
