// GP-20124 Training QA: entry, Armory, CIF and every range-console drill.
// Run through crew.mjs slot run only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root,'review/GP-20124',process.argv.includes('--repeat')?'repeat':'');
const report = { at: new Date().toISOString(), stages: [], drills: [], errors: [], warnings: [] };
const pause = ms => new Promise(r => setTimeout(r, ms));
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 400000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 400000 })) throw Error('game load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 500000 })) throw Error('opening stayed up');
  await page.evaluate(`(()=>{window.__qa={stage:'training entry',spikes:[],last:0,frames:0};
    const tick=t=>{const q=window.__qa;if(q.last){const dt=t-q.last;if(dt>100)q.spikes.push({stage:q.stage,ms:+dt.toFixed(1),at:+t.toFixed(1)});}q.last=t;q.frames++;requestAnimationFrame(tick);};requestAnimationFrame(tick);
    document.getElementById('playerName').value='GP-20124 Stations';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 400000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 });
  await page.evaluate('TT.setWorldTime(0.5);TT.weather.raining=false');
  async function stage(name, expr, shot = false) {
    await page.evaluate(`window.__qa.stage=${JSON.stringify(name)}`);
    const data = expr ? await page.evaluate(expr, 300000) : null;
    await pause(350);
    if (shot) await page.screenshot(path.join(out, `${name}.png`));
    report.stages.push({ name, data });
    console.log(name, JSON.stringify(data).slice(0, 420));
    return data;
  }
  await stage('01-entry-3p', `(()=>{const T=TT;T.setViewFirstDbg(false);return {phase:T.getPhase(),training:T.trainingDbg.state().active,view:T.fpDbg(),player:T.player.position.toArray()};})()`, true);
  await stage('02-entry-1p', `(()=>{const T=TT;T.setViewFirstDbg(true);return {phase:T.getPhase(),view:T.fpDbg(),vm:T.viewmodelDbg()?.info?.active};})()`, true);
  await stage('03-armory-open', `(()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.armory.front;T.setViewFirstDbg(false);T.player.position.set(f.x,tg.floorY,f.z);T.doAction();return {open:!document.getElementById('armoryPanel').hidden,action:T.trainingDbg.action()};})()`, true);
  await stage('04-armory-buy', `(()=>{const T=TT,b=document.querySelector('#armoryPanel [data-buy-gun=m4]');if(b&&!b.disabled)b.click();return {m4Owned:!!T.getWeaponOwned().m4,buyButton:!!b,disabled:b?.disabled};})()`, true);
  await stage('05-armory-fit', `(()=>{const T=TT,A=T.armoryDbg.ui().armory;T.grantAllWeapons();T.armoryDbg.ui().bench('m4');const b=document.querySelector('#armoryPanel [data-mod=ext] button');if(b&&!b.disabled)b.click();return {fitButton:!!b,disabled:b?.disabled,loadout:A.loadout()};})()`, true);
  await stage('06-armory-shelf', `(()=>{const T=TT,A=T.armoryDbg.ui().armory;if(A.loadout().primary[0]!=='m4')A.take('m4','primary',0);document.querySelector('#armoryPanel [data-slot="primary:0"]')?.click();const b=document.querySelector('#armoryPanel .armory-actions button');if(b&&!b.disabled)b.click();return {button:!!b,disabled:b?.disabled,loadout:A.loadout()};})()`, true);
  await stage('07-cif-open', `(()=>{const T=TT;T.armoryDbg.ui().close();T.openCIF();return {open:T.isCIFOpen(),camo:T.getCamo?.()};})()`, true);
  await stage('08-cif-camo-kit', `(()=>{document.querySelector('[data-camo=marpat]')?.click();document.querySelector('[data-cif-tab=body]')?.click();document.querySelector('[data-cif-item=shirt]')?.click();const b=document.querySelector('#cifOptions button:last-child');b?.click();return {shirtOption:!!b,cifOpen:TT.isCIFOpen()};})()`, true);
  await stage('09-range-console', `(()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.rangeConsole.front;T.closeCIF();T.player.position.set(f.x,tg.floorY,f.z);T.doAction();return {open:T.rangeDbg.feature().isOpen(),action:T.trainingDbg.action()};})()`, true);
  report.drills = await stage('10-all-drills', `(async()=>{const T=TT,D=(await import('/ui/range-drills.js')).RANGE_DRILLS,rows=[];T.grantAllWeapons();T.setUnarmedDbg(false);T.rangeDbg.exit();
    for(const d of D){window.__qa.stage='drill '+d.id;T.rangeDbg.open();const w=document.querySelector('[data-weapon="'+d.weapon+'"]');w?.click();const card=document.querySelector('[data-drill="'+d.id+'"]');card?.click();const b=document.querySelector('[data-start]');const disabled=b?.disabled;b?.click();const s=T.rangeDbg.read();rows.push({weapon:d.weapon,id:d.id,weaponButton:!!w,card:!!card,start:!!b,disabled,state:s?.state,expected:s?.expectedWeapon});T.rangeDbg.exit();await new Promise(r=>setTimeout(r,35));}
    return rows;})()`, false);
  await stage('11-range-active', `(async()=>{const T=TT,d=(await import('/ui/range-drills.js')).RANGE_DRILLS.find(x=>x.id==='first-steps');T.rangeDbg.open();const r=T.rangeDbg.start(d);return {start:r,state:T.rangeDbg.read()?.state};})()`, true);
  await page.evaluate(`window.__qa.stage='range countdown to active'`);
  await pause(9000);
  await stage('12-range-fire', `(()=>({state:TT.rangeDbg.read()?.state,score:TT.rangeDbg.read()?.score,action:TT.rangeDbg.read()?.action}))()`, true);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 640, y: 360, button: 'left', clickCount: 1 });
  await pause(150);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 640, y: 360, button: 'left', clickCount: 1 });
  await stage('13-range-after-shot', `(()=>{const s=TT.rangeDbg.read();TT.rangeDbg.exit();return {state:s?.state,score:s?.score,shots:s?.stats?.shots};})()`, true);
  report.frames = await page.evaluate('({count:window.__qa.frames,over100:window.__qa.spikes})');
  report.errors = page.errors.slice();
  report.warnings = page.console.filter(x => /warn|error/i.test(x.type) || /WebGPU|validation/i.test(x.text)).map(x => `${x.type}: ${x.text.slice(0, 320)}`);
  console.log('summary', JSON.stringify({drills:report.drills.length,failed:report.drills.filter(x=>!['PREPARING','COUNTDOWN','ACTIVE'].includes(x.state)||x.disabled),spikes:report.frames.over100.length,errors:report.errors.length,warnings:report.warnings.length}));
} catch (e) {
  report.failure = String(e?.stack || e);
  console.error(report.failure);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(out, 'stations-drills.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  await server.close();
}
