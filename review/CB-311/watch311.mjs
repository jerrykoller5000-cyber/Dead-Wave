// CB-311 (claude2): watch for Jerry's J142a picture on the 5080: every gun missing (in his hands, slung, holstered, the
// Watchman) while the pack, the slings' webbing and the leather shells still draw. Training with all weapons and the akimbo
// pair; he fires the pair, switches first and third person, shoulders the Watchman, and every second a close overhead picture
// (Jerry's camera: above and behind his right shoulder) and the renderer's warnings. Run on Jerry's PC through the slot:
//   node crew/crew.mjs slot run <you> CB-311 --checks "CB-311 watch" -- node review/CB-311/watch311.mjs
// (not headless: it must be his GPU). Writes review/CB-311/watch-pairs/<i>-<what>.png and watch311-pairs.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/CB-311/watch-pairs');
fs.mkdirSync(out, { recursive: true });
const headless = !!process.env.HEADLESS;
const server = await serve(root, 0);
const browser = await launch({ headless, args: ['--window-size=1280,720'] });
const log = [];
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1${headless ? '&raf=timer' : ''}`, { timeout: 400000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 400000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 500000 })) throw Error('opening stayed up');
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CB-311 watch';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 400000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 });
  await page.evaluate(`(()=>{ const T=TT; T.unlockAllBuilds && T.unlockAllBuilds(); T.grantAllWeapons(); T.setUnarmedDbg(false); T.setHp(100000);
    window.__sim=async(s)=>{const s0=T.getSimTime(),w0=Date.now(); while(T.getSimTime()-s0<s&&Date.now()-w0<60000) await new Promise(r=>setTimeout(r,30));};
    window.__cam=()=>{ const p=T.player.position, y=T.player.rotation.y, c=Math.cos(y), s=Math.sin(y); const tw=(v)=>({x:p.x+v[0]*c+v[2]*s, y:p.y+v[1], z:p.z-v[0]*s+v[2]*c}); const a=tw([0.8,2.5,-1.2]), b=tw([0,1.1,0.1]); T.setShotView({x:a.x,y:a.y,z:a.z,tx:b.x,ty:b.y,tz:b.z,fov:40}); };
    // What draws: every gun-material mesh on him (held, slung, holstered, the Watchman) visible in the scene graph
    window.__guns=()=>{ const ud=(T.getMarine?T.getMarine():window.worldMarine).userData, rig=ud.carry; let held=0, stowed=0, mg=0; const vis=(o)=>{ for(let q=o;q;q=q.parent) if(q.visible===false) return false; return true; };
      const cnt=(g)=>{ let n=0; if(g) g.traverse(o=>{ if(o.isMesh&&vis(o)) n++; }); return n; };
      held=cnt(T.weaponMeshes[T.getCurrentWeapon()]); if(rig){ for(const s of [...rig.slings,...rig.holsters,...rig.pairs]) stowed+=cnt(s.gun); } mg=cnt(T.m240VisDbg().carriedGun);
      const weapon=T.getCurrentWeapon(), offhand=cnt(T.offhandMeshes[weapon]), vm=T.viewmodelDbg();
      return { weapon, held, offhand, stowed, mg, vmFilter:vm?vm.filtering:null,
        akimbo:T.vaultDbg.flags().akimbo, loadout:T.armoryDbg.ui().armory.loadout() }; };
  })()`);
  const actions = [
    ['armed', ''],
    ['pair-pistol', "T.setDualOwnedDbg('pistol', true); if(!T.armoryDbg.fit('pistol','pair',true)) throw Error('pistol pair did not fit'); T.setWeapon(T.WEAPON_ORDER.indexOf('pistol')); T.toggleDualWieldDbg(); if(!T.vaultDbg.flags().akimbo || !T.offhandMeshes.pistol.visible) throw Error('pistol pair not drawn');"],
    ['fire-pair', "T.setMouseFireDbg(true); await __sim(1.2); T.setMouseFireDbg(false);"],
    ['1p', 'T.setViewFirstDbg(true);'],
    ['fire-pair-1p', "T.setMouseFireDbg(true); await __sim(1.2); T.setMouseFireDbg(false);"],
    ['3p', 'T.setViewFirstDbg(false);'],
    ['pair-wasp', "T.toggleDualWieldDbg(); if(T.vaultDbg.flags().akimbo) throw Error('pistol pair stayed active'); if(!T.armoryDbg.fit('pistol','pair',false)) throw Error('pistol pair did not stow'); const A=T.armoryDbg.ui().armory; if(!A.has('uzi') && !A.buy({id:'uzi',kind:'uzi',loaded:32},{store:true}).ok) throw Error('Wasp not on shelf'); if(!A.take('uzi','secondary',0).ok) throw Error('Wasp did not enter secondary slot'); T.setDualOwnedDbg('uzi',true); if(!T.armoryDbg.fit('uzi','pair',true)) throw Error('Wasp pair did not fit'); T.setWeapon(T.WEAPON_ORDER.indexOf('uzi')); T.toggleDualWieldDbg(); if(!T.vaultDbg.flags().akimbo || !T.offhandMeshes.uzi.visible) throw Error('Wasp pair not drawn');"],
    ['fire-wasp', "T.setMouseFireDbg(true); await __sim(1.2); T.setMouseFireDbg(false);"],
    ['wasp-1p', 'T.setViewFirstDbg(true);'],
    ['fire-wasp-1p', "T.setMouseFireDbg(true); await __sim(1.2); T.setMouseFireDbg(false);"],
    ['wasp-3p', 'T.setViewFirstDbg(false);'],
    ['watchman', "if(T.vaultDbg.flags().akimbo) T.toggleDualWieldDbg(); const p=T.player.position, yaw=T.player.rotation.y; const g=T.spawnBuild('m240', p.x+Math.sin(yaw)*1.2, p.z+Math.cos(yaw)*1.2); T.mountMortar(g); await __sim(0.8); T.shoulderMortar();"],
    ['watchman-1p', 'T.setViewFirstDbg(true);'],
    ['watchman-3p', 'T.setViewFirstDbg(false);'],
  ];
  let i = 0;
  for (const [what, js] of actions) {
    const c0 = page.console.length;
    if (js) await page.evaluate(`(async()=>{ const T=TT; ${js} })()`, 120000);
    for (let k = 0; k < 3; k++) {
      await page.evaluate('__sim(1)', 60000);
      const g = await page.evaluate('__guns()');
      if (['pair-pistol','fire-pair','1p','fire-pair-1p','3p','pair-wasp','fire-wasp','wasp-1p','fire-wasp-1p','wasp-3p'].includes(what) && !g.akimbo)
        throw Error(`${what} did not keep the pair active`);
      if (['pair-pistol','fire-pair','3p','pair-wasp','fire-wasp','wasp-3p'].includes(what) && g.offhand === 0)
        throw Error(`${what} had no visible offhand gun`);
      await page.evaluate('__cam()'); await page.evaluate('__sim(0.05)', 30000);
      const name = `${String(i++).padStart(2, '0')}-${what}-${k}.png`;
      await page.screenshot(path.join(out, name));
      await page.evaluate('TT.setShotView(null)');
      const warn = page.console.slice(c0).filter((m) => /warn|error/i.test(m.type) || /WebGPU|pipeline|validation|missing/i.test(m.text)).map((m) => m.type + ': ' + m.text.slice(0, 300));
      log.push({ what, k, name, ...g, warnings: warn.slice(0, 20) });
      console.log(what, k, JSON.stringify(g), warn.length ? warn.length + ' warnings' : '');
    }
  }
  fs.writeFileSync(path.join(out, '..', 'watch311-pairs.json'), JSON.stringify(log, null, 2));
} finally { await browser.close(); await server.close(); }
