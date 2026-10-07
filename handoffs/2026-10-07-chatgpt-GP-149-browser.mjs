// Actual repaired HUD functions and markup; controlled state, no full game run.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/Zero/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source=fs.readFileSync('index.html','utf8');
const from=source.indexOf('    function updateAmmoHud() {');
const ammo=source.slice(from,source.indexOf('    updateAmmoHud();',from));
const tactical=source.match(/    function updateTacticalHud\(\) \{[\s\S]*?\n    \}/)?.[0];
assert(from>=0&&tactical&&ammo.includes('grenadeChipsEl'));
const html=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,m=>m.includes('type="importmap"')?m:'')
 .replace('</head>','<style>body{background:#15251c}body>*:not(#hud){display:none!important}#hud>*:not(#ammo):not(#hudTopLeft){display:none!important}</style></head>');
const server=await serve(process.cwd(),0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/gp149-fixture',r=>r.fulfill({contentType:'text/html',body:html}));
 const dir='handoffs/2026-10-07-chatgpt-GP-149-shots';fs.mkdirSync(dir,{recursive:true});
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:720});await page.goto(server.origin+'/gp149-fixture');
  await page.evaluate(({ammo,tactical})=>{
   document.body.className='playing';
   window.hudEnv={WEAPON_STATS:{pistol:{name:'Pistol'}},currentWeapon:'pistol',ammoByWeapon:{pistol:11},
    grenades:3,medkits:0,mortarMounted:null,reloading:false,magazineStore:{},magazineHud:{render(){}},
    isMagazineWeapon:()=>true,AudioSys:{},selectorGun:()=>true,weaponIsAuto:()=>false,
    magSize:()=>12,reserveOf:()=>168,updateReloadPrompt(){},
    gearOwned:{nvg:true,laser:true,flashlight:true},nvgDown:false,isNight:false,lasersEnabled:false,flashlightActive:()=>false};
   for(const [name,id] of Object.entries({ammoEl:'ammo',ammoWeaponEl:'ammoWeapon',ammoCountEl:'ammoCount',ammoDetailEl:'ammoDetail',grenadeChipsEl:'grenadeChips',tacticalLineEl:'tacticalLine'}))hudEnv[name]=document.getElementById(id);
   window.drawHud=new Function('env',`with(env){${ammo}\n${tactical}\nreturn ()=>{updateAmmoHud();updateTacticalHud();};}`)(hudEnv);
   drawHud();
  },{ammo,tactical});
  assert.equal(await page.locator('#tacticalLine').textContent(),'NVG off \u00b7 Laser off \u00b7 Light off');
  assert.deepEqual(await page.locator('#grenadeChips .gchip').allTextContents(),['G\u00d73','H\u00d70']);
  assert.equal(await page.locator('#ammoDetail').textContent(),'11 / 12  \u00b7  168 Bullets  \u00b7  SEMI');
  await page.screenshot({path:`${dir}/hud-${width}.png`});
  await page.evaluate(()=>{hudEnv.gearOwned={};hudEnv.reloading=true;drawHud();});
  assert.equal(await page.locator('#tacticalLine').textContent(),'NVG \u2014 \u00b7 Laser \u2014 \u00b7 Light \u2014');
  assert.equal(await page.locator('#ammoCount').textContent(),'\u2026');
  await page.evaluate(()=>{hudEnv.reloading=false;hudEnv.ammoByWeapon.pistol=Infinity;drawHud();});
  assert.equal(await page.locator('#ammoCount').textContent(),'\u221e');
  assert.match(await page.locator('#ammoDetail').textContent(),/^\u221e \/ 12/);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS repaired production HUD at 1280/390: tactical middle dots and missing-gear dashes, grenade/medpen multiplication, ammo SEMI separators, reload ellipsis and infinite ammo; page errors 0');
}finally{await browser?.close();await server.close();}
