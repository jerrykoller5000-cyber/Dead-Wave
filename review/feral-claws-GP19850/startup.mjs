import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import path from 'node:path';
const server=await serve(path.resolve('.'),0),browser=await launch({headless:true}),page=await browser.newPage();
try{
  const exceptions=[];page.conn.listeners.push(msg=>{if(msg.method==='Runtime.exceptionThrown')exceptions.push(msg.params);});
  await page.goto(server.origin+'/index.html?debug=1&renderer=webgl');
  for(let i=0;i<2;i++){await new Promise(r=>setTimeout(r,600));await page.evaluate(`if(window.DWOpening?.dismissForTesting)DWOpening.dismissForTesting();true;`);}
  await new Promise(r=>setTimeout(r,15000));
  console.log(JSON.stringify({errors:page.errors,exceptions,state:await page.evaluate(`({tt:!!window.TT,opening:!!window.DWOpening,active:window.DWOpening?.active,error:document.getElementById('errorCard')?.textContent})`)}));
  console.log(await page.evaluate(`import('/game/feral-motion.js').then(()=>({ok:true})).catch(e=>({error:e.message,stack:e.stack}))`));
}finally{await browser.close();await server.close();}
process.exit(0);
