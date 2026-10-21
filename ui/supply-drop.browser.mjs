// GP-88: exercise the live plane/crate with a chosen landing point and contents.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';

const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url));
const server=await serve(root,0);
let browser;
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
 await page.evaluate(()=>DWOpening.dismissForTesting());
 await page.fill('#playerName','Drop Tester');await page.click('#modeHunt');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
 const result=await page.evaluate(()=>{
  const T=TT,events=[]; addEventListener('dw-game',({detail})=>{if(detail.type==='supply-drop')events.push(detail);});
  const random=T.spawnSupplyDrop();
  const p=T.spawnSupplyDrop({x:random.x,z:random.z,contents:'medical',source:'radio'});
  const cue=T.AudioSys.musicState().lastCue;
  for(let i=0;i<700&&!T.supplyDrops.some(s=>s.source==='radio'&&s.state==='landed');i++)T.updateSupplyDrops(0.05);
  const s=T.supplyDrops.find(s=>s.source==='radio');
  const before=T.getMedkits();
  if(s?.state==='landed'){T.claimSupplyDrop(s);T.claimSupplyDrop(s);}
  return {random:!!random,target:!!p,cue:cue?.name,landed:s?.state==='open',distance:s?Math.hypot(s.x-p.x,s.z-p.z):null,
    before,after:T.getMedkits(),receipt:s?.receipt,events:events.map(({phase,x,z,source,breather})=>({phase,x,z,source,breather}))};
 });
 assert(result.random&&result.target,'old random and targeted calls both spawn');
 assert.equal(result.cue,'airdrop');
 assert(result.landed,'targeted crate landed and opened');
 assert(result.distance<3,`landed ${result.distance} m from chosen point`);
 assert.equal(result.after-result.before,2,'medical contents grant two MedPens once');
 assert.equal(result.receipt.accepted.find(item=>item.id==='medkit')?.qty,2);
 const radio=result.events.filter(e=>e.source==='radio');
 assert.deepEqual(radio.map(e=>e.phase),['inbound','landed','claimed']);
 assert(radio.every(e=>e.breather===false&&Number.isFinite(e.x)&&Number.isFinite(e.z)));
 assert.deepEqual(errors,[]);
 console.log('PASS GP-88 WebGPU: default and targeted spawn, <3m landing, medical grant once, three lifecycle phases, airdrop cue, no page errors.');
} finally {if(browser)await browser.close();server.close();}
