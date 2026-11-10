import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Run through crew.mjs slot run');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20078');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const report = { at: new Date().toISOString(), sections: {}, errors: [] };
const save = () => fs.writeFileSync(path.join(out, 'armory-walk.json'), JSON.stringify(report, null, 2));
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`);
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 90000 })) throw new Error('game did not load');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('document.getElementById("opening").hidden', { timeout: 30000 });
  await page.evaluate(`(() => { document.getElementById('playerName').value='GP-20078'; document.getElementById('modeTraining').click(); })()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 90000 })) throw new Error('Training did not start');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 1800));
  report.renderer = await page.evaluate('TT.renderer.info ? TT.renderer.backend?.constructor?.name || TT.renderer.constructor.name : TT.renderer.constructor.name');
  report.sections.kiosk = await page.evaluate(`(() => {
    const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.kiosk.front;
    T.player.position.set(f.x,tg.floorY,f.z);
    const action=T.trainingDbg.action();T.doAction();
    const shop=document.getElementById('shop');
    return {action,open:shop.classList.contains('show'),tabs:[...shop.querySelectorAll('[data-tab]')].map(x=>x.dataset.tab),text:shop.textContent.slice(0,450)};
  })()`);
  await page.screenshot(path.join(out, '01-kiosk.png'));
  report.sections.armoryBefore = await page.evaluate(`(() => {
    const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.armory.front;
    T.closeMenuDbg('shop');T.player.position.set(f.x,tg.floorY,f.z);
    const action=T.trainingDbg.action();T.doAction();
    const p=document.getElementById('armoryPanel');
    return {action,open:!p.hidden,bank:T.getBank(),weaponOrder:T.WEAPON_ORDER,offers:[...p.querySelectorAll('[data-buy-gun]')].map(x=>x.dataset.buyGun),text:p.textContent.slice(0,700)};
  })()`);
  await page.screenshot(path.join(out, '02-armory-before.png'));
  report.sections.guns = await page.evaluate(`(() => {
    const T=TT,p=document.getElementById('armoryPanel'),u=T.armoryDbg.ui(),results=[];
    T.addCash(1000000);
    for(const w of T.WEAPON_ORDER){
      const b=p.querySelector('[data-buy-gun="'+w+'"]');
      if(b){const disabled=b.disabled;if(!disabled)b.click();results.push({gun:w,offer:true,disabled,owned:u.armory.has(w),bank:T.getBank()});}
      else results.push({gun:w,offer:false,owned:w==='pistol'||u.armory.has(w),bank:T.getBank()});
    }
    return results;
  })()`);
  report.sections.mods = await page.evaluate(`(() => {
    const T=TT,p=document.getElementById('armoryPanel'),u=T.armoryDbg.ui(),results=[];
    for(const w of T.WEAPON_ORDER){
      u.bench(w);
      for(const id of T.armoryDbg.mods(w).map(x=>x.id)){
        const before=T.armoryDbg.mods(w).find(x=>x.id===id);
        const row=[...p.querySelectorAll('[data-mod]')].find(x=>x.dataset.mod===id),b=row?.querySelector('button');
        if(before&&!before.owned&&b&&!b.disabled)b.click();
        const after=T.armoryDbg.mods(w).find(x=>x.id===id);
        results.push({gun:w,id,hadRow:!!row,disabled:!!b?.disabled,beforeOwned:!!before?.owned,owned:!!after?.owned,fitted:!!after?.fitted});
      }
    }
    return results;
  })()`);
  report.sections.laserColors = await page.evaluate(`(() => {
    const T=TT,p=document.getElementById('armoryPanel'),u=T.armoryDbg.ui(),results=[];
    u.bench('uzi');
    const ids=[...p.querySelectorAll('.armory-laser [data-laser]')].map(x=>x.dataset.laser);
    for(const id of ids){const b=p.querySelector('.armory-laser [data-laser="'+id+'"]');const disabled=b.disabled;if(!disabled)b.click();
      results.push({id,disabled,selected:p.querySelector('.armory-laser [data-laser="'+id+'"]')?.getAttribute('aria-pressed')});}
    return results;
  })()`);
  await page.screenshot(path.join(out, '03-workbench-after.png'));
  report.sections.ammo = await page.evaluate(`(() => {
    const T=TT,p=document.getElementById('armoryPanel'),u=T.armoryDbg.ui(),results=[];
    for(const w of T.WEAPON_ORDER){
      const caliber=T.caliberOf(w),reserve=T.getReserve();if(caliber&&Object.hasOwn(reserve,caliber))reserve[caliber]=0;
      if(T.magazinesDbg(w))T.setMagazinesDbg(w,0,[]);else T.setAmmoDbg(w,0);
      u.bench(w);
      const b=p.querySelector('[data-buy-ammo="'+w+'"]'),before=T.getBank(),disabled=!!b?.disabled;
      if(b&&!disabled)b.click();
      results.push({gun:w,caliber,button:!!b,disabled,cost:before-T.getBank(),offer:p.querySelector('.armory-ammo-offer')?.textContent?.slice(0,100),spares:T.magazinesDbg(w)?.spare?.length??null});
    }
    return results;
  })()`);
  await page.screenshot(path.join(out, '04-ammo-after.png'));
  report.sections.reload = await page.evaluate(`(async () => {
    const T=TT,wait=ms=>new Promise(r=>setTimeout(r,ms)),results=[];
    T.closeMenuDbg('armory');T.setUnarmedDbg(false);
    for(const w of T.WEAPON_ORDER){
      const n=T.WEAPON_ORDER.indexOf(w);
      if(w!=='pistol')T.takeOutGun(w);
      T.setWeapon(n);
      for(let i=0;i<20&&T.getCurrentWeapon()!==w;i++)await wait(100);
      await wait(600);
      const selected=T.getCurrentWeapon()===w,mag=T.magazinesDbg(w);
      if(mag)T.setMagazinesDbg(w,0,mag.spare,0);else T.setAmmoDbg(w,0);
      const caliber=T.caliberOf(w);if(caliber&&T.getReserve()[caliber]===0)T.getReserve()[caliber]=20;
      const before=T.magazinesDbg(w)?.loaded?.slice()||T.getAmmo()[w];
      const reserveBefore=T.getReserve()[T.caliberOf(w)],sparesBefore=mag?.spare?.slice()||null;
      T.startReload();const started=T.isReloading();
      for(let i=0;i<120&&T.isReloading();i++)await wait(100);
      const after=T.magazinesDbg(w)?.loaded?.slice()||T.getAmmo()[w];
      results.push({gun:w,selected,started,finished:!T.isReloading(),before,after,reserveBefore,reserveAfter:T.getReserve()[T.caliberOf(w)],sparesBefore,sparesAfter:T.magazinesDbg(w)?.spare?.slice()||null});
    }
    return results;
  })()`, 300000);
  await page.screenshot(path.join(out, '05-reload-after.png'));
  report.errors = page.errors.slice();
  console.log('ARMORY WALK', JSON.stringify({renderer:report.renderer,kiosk:report.sections.kiosk.open,armory:report.sections.armoryBefore.open,
    guns:report.sections.guns.filter(x=>x.owned).length,mods:report.sections.mods.filter(x=>x.owned).length+'/'+report.sections.mods.length,
    laser:report.sections.laserColors.length,ammo:report.sections.ammo.filter(x=>x.cost>0).length,
    reload:report.sections.reload.filter(x=>x.started&&x.finished).length,errors:report.errors.length}));
} catch (e) { report.errors.push(String(e?.stack||e)); console.error('ARMORY WALK ERROR',String(e?.stack||e)); process.exitCode=1; }
finally { save(); await browser.close(); await server.close(); }
