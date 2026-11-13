import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew slot');
const phase=process.argv[2]||'before',root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/GP-20129'),pause=ms=>new Promise(r=>setTimeout(r,ms)),report={phase};
const s=await serve(root,0),b=await launch({headless:false});
try{
 const p=await b.newPage({width:1280,height:720});await p.goto(s.origin+'/index.html?debug=1',{timeout:240000});
 await p.waitFor('!!window.TT && DWLoad.snapshot().state==="ready"',{timeout:120000});await p.evaluate('DWOpening.dismissForTesting()');await p.waitFor('!DWOpening.active');
 await p.evaluate('document.getElementById("playerName").value="Gun icons";document.getElementById("modeTraining").click()');
 await p.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:120000});
 await p.evaluate('TT.runDevCommand("bigtex shooter");TT.openWheel("weapon")');await pause(600);
 await p.screenshot(path.join(out,phase+'-wheel-all.png'));
 await p.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyQ',key:'q'});
 await p.evaluate('TT.runDevCommand("bigtex shooter off");TT.takeOutGun("m4");TT.takeOutGun("ak");TT.takeOutGun("uzi");TT.takeOutGun("revolver");TT.openWheel("weapon")');await pause(300);
 await p.screenshot(path.join(out,phase+'-wheel-carried.png'));
 report.errors=p.errors.slice();console.log(JSON.stringify(report));
}finally{fs.writeFileSync(path.join(out,phase+'-wheel.json'),JSON.stringify(report,null,2));await b.close();await s.close();}
