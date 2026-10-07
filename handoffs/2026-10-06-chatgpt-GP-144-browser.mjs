// Production ammo-HUD function, magazine store and DOM; controlled game state, no live GPU claim.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/Zero/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const server=await serve(process.cwd(),0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const source=fs.readFileSync('index.html','utf8');
 const start=source.indexOf('    function updateAmmoHud() {'),code=source.slice(start,source.indexOf('    updateAmmoHud();',start));
 assert(start>=0&&code.includes('magazineHud.render'));
 const html=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,m=>m.includes('type="importmap"')?m:'').replace('</head>','<style>body{background:#15251c}body>*:not(#hud){display:none!important}#hud>*:not(#ammo):not(#hudNotices){display:none!important}#hudNotices>*:not(#kioskPrompt){display:none!important}</style></head>');
 await page.route('**/gp144-fixture',r=>r.fulfill({contentType:'text/html',body:html}));
 const dir='handoffs/2026-10-06-chatgpt-GP-144-shots';fs.mkdirSync(dir,{recursive:true});
 for(const width of [1280,390])for(const mode of ['before','after']){
  await page.setViewportSize({width,height:720});await page.goto(server.origin+'/gp144-fixture');
  await page.evaluate(async({code,mode})=>{
   const {createMagazineHud}=await import('/ui/magazine-hud.js'),{text}=await import('/ui/strings.js'),M=await import('/game/magazines.js');
   document.body.className='playing';document.getElementById('kioskPrompt').classList.add('on');document.getElementById('kioskPrompt').textContent='E — Supply terminal';
   window.store=M.createMagazineStore();window.magazineAPI=M;
   window.view=mode==='after'?createMagazineHud({ammo:document.getElementById('ammo'),text}):{render(){}};
   window.hud=new Function('M','magazineStore','magazineHud',`
    const {magazineSnapshot,isMagazineWeapon,spareMagazineRounds}=M;
    const ammoEl=document.getElementById('ammo'),ammoCountEl=document.getElementById('ammoCount'),ammoWeaponEl=document.getElementById('ammoWeapon'),ammoDetailEl=document.getElementById('ammoDetail'),grenadeChipsEl=document.getElementById('grenadeChips');
    const WEAPON_STATS={pistol:{name:'Pistol'},revolver:{name:'Revolver'},shotgun:{name:'Shotgun'},launcher:{name:'Launcher'}},BUILD_NAMES={m240:'Watchman MG'};
    const AudioSys={},ammoByWeapon={},reserveAmmo={'7.62 belt':300};
    let currentWeapon='pistol',reloading=false,mortarMounted=null,grenades=3,medkits=2;
    const selectorGun=()=>false,weaponIsAuto=()=>false,magSize=w=>magazineStore[w]?.size||6,reserveOf=w=>isMagazineWeapon(w)?spareMagazineRounds(magazineStore,w):11,updateReloadPrompt=()=>{};
    ${code}
    return {update(s={}){currentWeapon=s.weapon||currentWeapon;reloading=!!s.reloading;mortarMounted=s.mounted||null;ammoByWeapon[currentWeapon]=magazineStore[currentWeapon]?.loaded[0].rounds??2;updateAmmoHud();}};
   `)(M,window.store,window.view);
   M.issueMagazines(window.store,'pistol',{size:12,loaded:5,spareRounds:0,maxSpare:40});window.store.pistol.spare=[12,6,1].map(rounds=>({rounds,size:12}));
   M.issueMagazines(window.store,'revolver',{size:6,loaded:2,spareRounds:0,maxSpare:4});window.store.revolver.spare=[6,3].map(rounds=>({rounds,size:6}));
   window.before=JSON.stringify(window.store);window.hud.update();
  },{code,mode});
  await page.waitForTimeout(100);await page.screenshot({path:`${dir}/${mode}-${width}.png`});
  assert.equal(await page.evaluate(()=>JSON.stringify(store)),await page.evaluate(()=>window.before));
  assert.match(await page.locator('#ammoDetail').innerText(),/19 Bullets/);
  if(mode==='before')continue;
  const glyphs=()=>page.locator('#ammoMags .mag-glyph').evaluateAll(es=>es.map(e=>[e.dataset.rounds,e.style.getPropertyValue('--fill')]));
  assert.deepEqual(await glyphs(),[['12','100%'],['6','50%'],['1','8%']]);
  assert.match(await page.locator('#ammoMags').getAttribute('aria-label'),/3 mags: 12 of 12 rounds, 6 of 12 rounds, 1 of 12 rounds/);
  assert(await page.evaluate(()=>{const first=document.querySelector('.mag-glyph');hud.update();return first===document.querySelector('.mag-glyph');}),'unchanged spares reuse DOM');
  await page.evaluate(()=>{magazineAPI.reloadMagazines(store,'pistol');hud.update();});assert.deepEqual((await glyphs()).map(x=>x[0]),['6','1','5']);
  await page.evaluate(()=>{magazineAPI.setLoadedMagazineRounds(store,'pistol',4);magazineAPI.reloadMagazines(store,'pistol',{drop:true});hud.update();});assert.deepEqual((await glyphs()).map(x=>x[0]),['1','5']);
  await page.evaluate(()=>hud.update({weapon:'revolver',reloading:true}));assert.equal(await page.locator('#ammoMags .loader').count(),2);assert.equal(await page.locator('#ammoMags .mag-count').innerText(),'2 loaders');
  for(const weapon of ['shotgun','launcher']){await page.evaluate(weapon=>hud.update({weapon}),weapon);assert.equal(await page.locator('#ammoMags').isVisible(),false);}
  await page.evaluate(()=>hud.update({weapon:'pistol',mounted:{type:'m240',belt:500,beltMax:1000,feedT:0}}));assert.equal(await page.locator('#ammoMags').isVisible(),false);assert.match(await page.locator('#ammoWeapon').innerText(),/Watchman/i);
  await page.evaluate(()=>{store.pistol.spare=[];hud.update();});assert.equal(await page.locator('#ammoMags .mag-count').innerText(),'0 mags');
  await page.evaluate(()=>{store.pistol.spare=Array.from({length:30},()=>({rounds:12,size:12}));hud.update();});await page.waitForTimeout(100);
  assert.equal(await page.locator('.mag-glyph').count(),30);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const a=await page.locator('#ammo').boundingBox(),notice=await page.locator('#hudNotices').boundingBox();assert(notice.y+notice.height<=a.y-6,'action notices stay above expanded ammo panel');
  await page.screenshot({path:`${dir}/full-reserve-${width}.png`});
  await page.evaluate(()=>view.dispose());assert.equal(await page.locator('#ammoMags').count(),0);
 }
 assert.deepEqual(errors,[]);console.log('PASS 1280/390 production ammo function: partial magazines, stow/drop updates, loaders/reloading, loose/mounted hiding, zero/full reserve, unchanged Bullets total, no store writes, DOM reuse and notice clearance; page errors 0');
}finally{await browser?.close();await server.close();}
