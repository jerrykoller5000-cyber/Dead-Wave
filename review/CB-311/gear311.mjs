// CB-311 (claude2, 12 Nov; J142a, Jerry's review/J142/jerry-gear.png): what hangs on his back in the Training Ground, from
// above as Jerry saw it and from the side and rear, with what carryDbg says he carries. Real time, noon.
// Run: node crew/crew.mjs slot run <you> CB-311 --checks "CB-311 gear" -- node review/CB-311/gear311.mjs (HEADLESS=1)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/CB-311');
const phase = process.env.PHASE || 'probe';
const server = await serve(root, 0);
const headless = !!process.env.HEADLESS;
const browser = await launch({ headless, args: ['--window-size=1280,720'] });
const results = [];
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1${headless ? '&raf=timer' : ''}`, { timeout: 400000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 400000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 500000 })) throw Error('the opening stayed up');
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CB-311';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 400000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 });
  const info = await page.evaluate(`(async ()=>{ const T=TT; T.setViewFirstDbg(false); T.setWorldTime(0.42);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));
    const y=T.trainingDbg.tg().floorY; window.__home={x:0,y,z:-645};
    window.__pinI=setInterval(()=>{ const h=__home; T.player.position.set(h.x,h.y,h.z); T.setVelDbg(0,0); T.aimTarget.set(h.x, h.y+1.25, h.z+10); }, 5);
    const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style){visibility:hidden!important}';document.head.append(css);
    await new Promise(r=>setTimeout(r,4000));
    const c=T.carryDbg(); const lo=T.armoryDbg?.ui()?.armory?.loadout?.();
    return { weapon: T.getCurrentWeapon(), carry: c, loadout: lo }; })()`, 120000);
  console.log('INFO', JSON.stringify(info).slice(0, 1500));
  results.push(info);
  const VIEWS = { above: [-0.9, 3.1, -1.3], rear: [0.3, 1.6, -2.4], side: [2.2, 1.4, -0.2], rightHip: [1.3, 1.0, -0.9] };
  for (const [v, c] of Object.entries(VIEWS)) {
    await page.evaluate(`(async (c)=>{ const T=TT,h=__home; T.setShotView({x:h.x+c[0],y:h.y+c[1],z:h.z+c[2],tx:h.x,ty:h.y+1.0,tz:h.z,fov:40}); await new Promise(r=>setTimeout(r,1500)); })(${JSON.stringify(c)})`, 60000);
    await page.screenshot(path.join(out, `gear-${v}-${phase}.png`));
  }
  // With ammo carried (the bandolier, the 40 mm belt, the belt boxes, the tanks and grenades show only with rounds): two
  // loadouts, filled from the shop, from above and the right hip, standing and walking.
  for (const set of [['shotgun', 'launcher'], ['minigun', 'flamer']]) {
    const r = await page.evaluate(`(async (set)=>{ const T=TT, A=T.armoryDbg?.ui()?.armory; if(!A) return { err:'no armory' };
      for (const sl of ['primary','secondary']) for (let i=0;i<2;i++) if (A.read().slots[sl][i]) A.stow(sl,i);
      set.forEach((k,i)=>{ if(!A.has(k)) A.buy({id:k,kind:k,loaded:0},{store:true}); A.take(k,'primary',i); });
      T.addCash && T.addCash(1e6); const cal = { shotgun: ['12g','12 gauge','shotgun'], launcher: ['40mm','40 mm','launcher'], minigun: ['7.62','5.56 belt','minigun'], flamer: ['fuel','flamer'] };
      for (let n=0;n<40;n++) for (const k of set) { for (const c of cal[k]||[k]) { try { T.buyAmmo(c, true); } catch(e){} } try { T.buyAmmoType && ['birdshot','buckshot','slug'].forEach((t)=>T.buyAmmoType(k,t)); } catch(e){} }
      try { for (let n=0;n<4;n++) T.buyGear && T.buyGear('grenade'); } catch(e){} T.setGrenadesDbg && T.setGrenadesDbg(4);
      await new Promise(r=>setTimeout(r,2500)); return T.carryDbg(); })(${JSON.stringify(set)})`, 90000);
    console.log('AMMO', set.join('+'), JSON.stringify(r && r.counts), JSON.stringify(r && r.bands));
    for (const v of ['above', 'rightHip', 'rear']) {
      const c = VIEWS[v];
      await page.evaluate(`(async (c)=>{ const T=TT,h=__home; T.setShotView({x:h.x+c[0],y:h.y+c[1],z:h.z+c[2],tx:h.x,ty:h.y+1.0,tz:h.z,fov:40}); await new Promise(r=>setTimeout(r,1200)); })(${JSON.stringify(c)})`, 60000);
      await page.screenshot(path.join(out, `ammo-${set.join('+')}-${v}-${phase}.png`));
    }
  }
  // Moving, as Jerry was: a loadout slung, then walk, sprint, crouch-walk and a turn, a picture from above as each goes.
  await page.evaluate(`(async ()=>{ const T=TT, A=T.armoryDbg?.ui()?.armory; if(!A) return;
    for (const sl of ['primary','secondary']) for (let i=0;i<2;i++) if (A.read().slots[sl][i]) A.stow(sl,i);
    ['m4','shotgun'].forEach((k,i)=>{ if(!A.has(k)) A.buy({id:k,kind:k,loaded:0},{store:true}); A.take(k,'primary',i); });
    clearInterval(window.__pinI); window.__pinI=null; await new Promise(r=>setTimeout(r,2000));
    if (${process.env.CARRYMOVE ? 'true' : 'false'}) { const h=__home; const b=T.spawnBuild('m240',h.x+1.2,h.z+0.3); T.mountMortar(b); await new Promise(r=>setTimeout(r,1500)); T.shoulderMortar(); await new Promise(r=>setTimeout(r,2500)); window.__carry=T.m240VisDbg().carried; } })()`, 60000);
  for (const [name, keys] of [['walk', ['KeyW']], ['sprint', ['KeyW', 'ShiftLeft']], ['crouchwalk', ['KeyW', 'KeyC']], ['strafe', ['KeyD']]]) {
    const r = await page.evaluate(`(async (keys)=>{ const T=TT,h=__home,p=T.player.position; const k=(c,d)=>document.dispatchEvent(new KeyboardEvent(d?'keydown':'keyup',{code:c,key:c,bubbles:true}));
      p.set(h.x,h.y,h.z+2); T.setVelDbg(0,0); keys.forEach((c)=>k(c,true)); const s0=T.getSimTime(),w0=Date.now(); while(T.getSimTime()-s0<0.8&&Date.now()-w0<20000) await new Promise(r=>setTimeout(r,30));
      const q=p.clone(); T.setShotView({x:q.x-0.9,y:q.y+3.1,z:q.z-1.3,tx:q.x,ty:q.y+1.0,tz:q.z,fov:40});
      await new Promise(r=>setTimeout(r,250)); return keys; })(${JSON.stringify(keys)})`, 60000);
    await page.screenshot(path.join(out, `moving-${name}-${phase}.png`)); console.log('MOVE', name, await page.evaluate('JSON.stringify({carry: window.__carry, carried: TT.m240VisDbg().carried})'));
    await page.evaluate(`(()=>{ ['KeyW','ShiftLeft','KeyC','KeyD'].forEach((c)=>document.dispatchEvent(new KeyboardEvent('keyup',{code:c,key:c,bubbles:true}))); })()`);
    await new Promise((res) => setTimeout(res, 1500));
  }
  // What the meshes under his torso and hips are, roughly: the visible groups carried on him with their names and boxes.
  const parts = await page.evaluate(`(()=>{ const T=TT,m=T.getMarine(),V=T.THREE.Vector3,P=T.player; P.updateMatrixWorld(true); const rows=[];
    m.traverse((o)=>{ if(!o.isMesh&&!o.isInstancedMesh) return; for(let q=o;q;q=q.parent) if(!q.visible) return; if(o.name==='rig-skin') return;
      const b=new T.THREE.Box3().setFromObject(o); if(b.isEmpty()) return; const c=P.worldToLocal(b.getCenter(new V())), s=b.getSize(new V());
      if (s.length()<0.15) return; let path=[]; for(let q=o;q&&q!==m&&path.length<5;q=q.parent) path.push(q.name||'?');
      rows.push(path.join('<')+' ['+c.toArray().map(x=>x.toFixed(2))+'] size '+s.toArray().map(x=>x.toFixed(2))); }); return rows.slice(0,80); })()`);
  for (const r of parts) console.log('PART', r);
  fs.writeFileSync(path.join(out, `gear311-${phase}.json`), JSON.stringify({ info, parts }, null, 2));
} finally { await browser.close(); await server.close(); }
