// GP-20121: isolate CIF open/close CPU work and WebGPU pipeline creation.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Run through crew slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url))),out=path.join(root,'review/GP-20121'),live=path.join(out,'profile-live.html');
const label=process.argv[2]||'profile';
const entrySource=path.join(out,'entry-source.html');
let html=fs.readFileSync(label.startsWith('entry-')&&fs.existsSync(entrySource)?entrySource:path.join(root,'index.html'),'utf8');
const sourceHash=createHash('sha256').update(html).digest('hex');
if (label==='shot-before') html=html.replace('setTimeout(warmDressView, 0);','');
if (label.startsWith('entry-before')) html=html.replace('setTimeout(warmDressView, 0);','').replace('setTimeout(warmCifSwatches, 0);','');
if (label.startsWith('entry-swatchonly')) html=html.replace('setTimeout(warmDressView, 0);','');
if (label.startsWith('entry-previewonly')) html=html.replace('setTimeout(warmCifSwatches, 0);','');
if (label.includes('webgl')) html=html.replace('canvas: cifMarineEl, antialias: true, forceWebGL: FORCE_WEBGL','canvas: cifMarineEl, antialias: true, forceWebGL: true');
if (label.includes('shared')) html=html.replace('canvas: cifMarineEl, antialias: true, forceWebGL: FORCE_WEBGL','canvas: cifMarineEl, antialias: true, forceWebGL: FORCE_WEBGL, device: renderer.backend?.device');
function replaceOne(needle,replacement){if(!html.includes(needle))throw Error('Probe anchor missing: '+needle.slice(0,50));html=html.replace(needle,replacement);}
replaceOne('<head>','<head>\n<base href="/">');
replaceOne('let dressRenderer = null;', 'let dressRenderer = null; window.__cifPipes=()=>dressRenderer?._pipelines?.caches?.size??-1; window.__cifReady=()=>cifMarineEl?.dataset.ready;');
replaceOne('await dressRenderer.init();','await dressRenderer.init(); window.__cifProfile?.push({tag:"renderer init",ms:performance.now()-__cifInitT});');
replaceOne('async function ensureDressView() {','async function ensureDressView() { const __cifInitT=performance.now();');
replaceOne('dressPreview = makeMarine();','dressPreview = makeMarine(); window.__cifProfile?.push({tag:"make marine",ms:performance.now()-__cifInitT});');
replaceOne('function paintCamoTile(key, cv) {','function paintCamoTile(key, cv) { const __paintT=performance.now(); window.__paintCount=(window.__paintCount||0)+1;');
replaceOne('c.putImageData(img, 0, 0);','c.putImageData(img, 0, 0); window.__paintMs=(window.__paintMs||0)+performance.now()-__paintT;');
replaceOne('cifMenu.refresh({tab:dressTab, item:dressItem, current});','{const t=performance.now();cifMenu.refresh({tab:dressTab, item:dressItem, current});window.__cifProfile?.push({tag:"menu refresh",ms:performance.now()-t});}');
replaceOne("        cifMarineEl.dataset.ready = 'true';", "        window.__cifProfile?.push({tag:'kit synced',ms:performance.now()-__cifInitT}); cifMarineEl.dataset.ready = 'true';");
replaceOne('if (dressRenderer && dressScene && dressCam) dressRenderer.render(dressScene, dressCam);','if (dressRenderer && dressScene && dressCam) { const __r=performance.now(); dressRenderer.render(dressScene,dressCam); const __ms=performance.now()-__r; if(__ms>15)window.__cifProfile?.push({tag:"dress render",ms:__ms}); window.__cifDressPipes=dressRenderer._pipelines?.caches?.size??-1; }');
const start=html.indexOf('    function openCIF(armoryOnly = false) {'),end=html.indexOf('    function closeCIF() {',start);
if(start<0||end<0)throw Error('open CIF section missing');
let open=html.slice(start,end);
open=open.replace('renderDressItems();','{const t=performance.now();renderDressItems();window.__cifProfile?.push({tag:"items",ms:performance.now()-t});}');
open=open.replace('renderDressChoices();','{const t=performance.now();renderDressChoices();window.__cifProfile?.push({tag:"choices",ms:performance.now()-t});}');
open=open.replace('ensureDressView();','{const t=performance.now();ensureDressView();window.__cifProfile?.push({tag:"start dress view",ms:performance.now()-t});}');
open=open.replace('dressFrame();','{const t=performance.now();dressFrame();window.__cifProfile?.push({tag:"first dress frame",ms:performance.now()-t});}');
html=html.slice(0,start)+open+html.slice(end);
replaceOne('if (armoryRackDirty) refreshArmoryRack(false);','if (armoryRackDirty) { const t=performance.now();refreshArmoryRack(false);window.__cifProfile?.push({tag:"close rack refresh",ms:performance.now()-t}); }');
fs.writeFileSync(live,html,'utf8');
const result={at:new Date().toISOString(),sourceHash,rows:[],spikes:[],profile:[],errors:[]},pause=ms=>new Promise(r=>setTimeout(r,ms));
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
console.log('CIF probe browser launched');
try{
 const page=await browser.newPage({width:1280,height:720});
 console.log('CIF probe page opened');
 await page.goto(server.origin+'/review/GP-20121/profile-live.html?debug=1',{timeout:400000});
 console.log('CIF probe page loaded');
 if(!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:100000}))throw Error('load: '+JSON.stringify(await page.evaluate('({load:window.DWLoad?.snapshot(),tt:!!window.TT})'))+'; '+JSON.stringify(page.errors.slice(-3)));
 await page.evaluate('DWOpening.dismissForTesting()');
 await page.waitFor('!window.DWOpening || window.DWOpening.active===false',{timeout:500000});
 await page.evaluate('(()=>{window.__cifProfile=[];window.__qa={stage:"entry",last:0,spikes:[]};const tick=t=>{const q=__qa;if(q.last&&t-q.last>100)q.spikes.push({stage:q.stage,ms:+(t-q.last).toFixed(1)});q.last=t;requestAnimationFrame(tick)};requestAnimationFrame(tick);document.getElementById("playerName").value="GP-20121 CIF profile";window.__trainClick=performance.now();document.getElementById("modeTraining").click()})()');
 if(!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:400000}))throw Error('Training entry');
 result.entryMs=await page.evaluate('performance.now()-window.__trainClick');
 result.beforeOpen=await page.evaluate('({ready:window.__cifReady(),pipes:window.__cifPipes()})');
 await page.evaluate('TT.profDbg.on=true;TT.profDbg.spikeMs=80;TT.profDbg.reset()');
 if(label==='control'){
  await page.evaluate('(()=>{__qa.stage="control";const t=TT.trainingDbg.tg(),f=t.stations.cif.front;TT.player.position.set(f.x,t.floorY,f.z);})()');
  await pause(4600);
  result.controlProf=await page.evaluate('TT.profDbg.report().spikes');
 }
 for(let i=1;i<=(label==='control'||label.startsWith('entry-')?0:2);i++){
  await page.evaluate('__qa.stage='+JSON.stringify('open '+i)+';TT.profDbg.reset()');
  const row=await page.evaluate('(()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.cif.front,m0=T.renderer?._pipelines?.caches?.size??-1,d0=window.__cifPipes(),t=performance.now();T.player.position.set(f.x,tg.floorY,f.z);T.doAction();return {open:T.isCIFOpen(),openSyncMs:performance.now()-t,mainBefore:m0,mainAfter:T.renderer?._pipelines?.caches?.size??-1,dressBefore:d0};})()');
  await pause(1400);
  row.dressAfter=await page.evaluate('window.__cifPipes()');
  row.profOpen=await page.evaluate('TT.profDbg.report().spikes');
  if(i===1&&label.includes('choice')){
   await page.evaluate('__qa.stage="choice";TT.profDbg.reset()');
   row.choice=await page.evaluate('(()=>{document.querySelector("[data-cif-tab=body]")?.click();document.querySelector("[data-cif-item=shirt]")?.click();const b=document.querySelector("#cifOptions button:last-child");b?.click();return {tab:!!document.querySelector("[data-cif-tab=body]"),shirt:!!document.querySelector("[data-cif-item=shirt]"),option:!!b,selected:b?.textContent};})()');
   await pause(350);
   row.profChoice=await page.evaluate('TT.profDbg.report().spikes');
  }
  await page.evaluate('__qa.stage='+JSON.stringify('close '+i)+';TT.profDbg.reset()');
  row.close=await page.evaluate('(()=>{const mainBefore=TT.renderer?._pipelines?.caches?.size??-1,dressBefore=window.__cifPipes(),t=performance.now();TT.closeCIF();return {syncMs:performance.now()-t,open:TT.isCIFOpen(),mainBefore,mainAfter:TT.renderer?._pipelines?.caches?.size??-1,dressBefore,dressAfter:window.__cifPipes()};})()');
  await pause(800);row.profClose=await page.evaluate('TT.profDbg.report().spikes');result.rows.push(row);
 }
 result.spikes=await page.evaluate('__qa.spikes');result.profile=await page.evaluate('window.__cifProfile');result.errors=page.errors.slice();
 result.paint=await page.evaluate('({count:window.__paintCount,ms:window.__paintMs})');
 if(label.startsWith('shot-')){
  await page.evaluate('(()=>{const t=TT.trainingDbg.tg(),f=t.stations.cif.front;TT.player.position.set(f.x,t.floorY,f.z);TT.doAction();})()');
  await pause(600);
  await page.screenshot(path.join(out,label+'-1280.png'));
  await page.setViewport(390,844);
  await pause(350);
  await page.screenshot(path.join(out,label+'-390.png'));
  await page.evaluate('TT.closeCIF()');
 }
 console.log(JSON.stringify(result).slice(0,12000));
}catch(e){result.failure=String(e?.stack||e);console.error(result.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify(result,null,2)+'\n');await browser.close();await server.close();fs.unlinkSync(live);}
