// CC-347 (claude3): J151 note 8: floating holsters/pouches/gear. Poses the carry rig through loadout x gun-in-hand x vest
// combinations (TT.carryDbg overrides) in the Training Ground, third person, and pictures each from fixed cameras.
// PHASE=before|after, CONFIGS=<json file or empty for the built-in list>, VIEWS=top,rear,sideR,sideL, LIGHTS=noon,...
// Writes review/CC-347/shots-<phase>/<cfg>-<view>-<light>.png and probe-<phase>.json (per-part distances).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const phase = process.env.PHASE || 'before';
const out = path.join(root, 'review/CC-347', 'shots-' + phase); fs.mkdirSync(out, { recursive: true });
const LT = { noon: 0.42, overcast: 0.5, dusk: 0.74, night: 0.02 };
const LIGHTS = (process.env.LIGHTS || 'noon').split(',');
const ALLV = { top: { cam: [0.9, 3.4, 1.6], look: [0, 1.0, 0] }, rear: { cam: [-0.3, 1.6, -2.4], look: [0, 1.05, 0] },
  sideR: { cam: [-2.4, 1.4, 0.1], look: [0, 1.0, 0] }, sideL: { cam: [2.4, 1.4, 0.1], look: [0, 1.0, 0] }, front: { cam: [0.3, 1.5, 2.4], look: [0, 1.05, 0] } };
const VIEWS = (process.env.VIEWS || 'top,rear,sideR,sideL').split(',');
const CONFIGS = process.env.CONFIGS ? JSON.parse(fs.readFileSync(process.env.CONFIGS, 'utf8')) : [
  { id: 'fresh' },
  { id: 'rifles-vest', o: { loadout: { primary: ['m4', 'shotgun'], secondary: ['revolver', 'uzi'] }, inHand: 'pistol', akimbo: false, vest: true, grenades: 3 } },
  { id: 'rifles-novest', o: { loadout: { primary: ['m4', 'shotgun'], secondary: ['revolver', 'uzi'] }, inHand: 'pistol', akimbo: false, vest: false, grenades: 3 } },
  { id: 'heavy-vest', o: { loadout: { primary: ['minigun', 'flamer'], secondary: ['pistol', 'revolver'] }, inHand: 'm4', akimbo: false, vest: true, grenades: 0 } },
  { id: 'sniper-launch', o: { loadout: { primary: ['sniper', 'launcher'], secondary: ['uzi', null] }, inHand: 'sniper', akimbo: false, vest: false, grenades: 2 } },
  { id: 'aa12-saw-dual', o: { loadout: { primary: ['aa12', 'chainsaw'], secondary: ['pistol', 'uzi'] }, inHand: 'pistol', akimbo: true, vest: true, grenades: 3, dualOwned: { pistol: true, uzi: true } } },
  { id: 'empty', o: { loadout: { primary: [null, null], secondary: [null, null] }, inHand: null, akimbo: false, vest: false, grenades: 0 } },
  { id: 'empty-vest', o: { loadout: { primary: [null, null], secondary: [null, null] }, inHand: 'pistol', akimbo: false, vest: true, grenades: 0 } },
];
const server = await serve(root, 0);
const browser = await launch({ headless: true, args: ['--window-size=1280,720'] });
const results = [];
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 600000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 600000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 600000 })) throw Error('opening stayed up');
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CC-347';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 600000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 90000 });
  const info = await page.evaluate(`(()=>{ const T=TT; T.setViewFirstDbg(false); const p=T.player.position; window.__home={x:p.x,y:p.y,z:p.z,yaw:T.player.rotation.y};
    return { home: window.__home, carry: T.carryDbg() }; })()`, 120000);
  console.log('info', JSON.stringify(info));
  for (const C of CONFIGS) {
    const meas = await page.evaluate(`(async (C)=>{ const T=TT, THREE=T.THREE; const d = C.o ? T.carryDbg(C.o) : T.carryDbg();
      const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
      for (let i=0;i<6;i++){ T.stepFrame && T.stepFrame(1/30); }
      if (C.o) T.carryDbg(C.o);   // the game's own refresh may have reapplied its plan
      const m=T.getMarine(); m.updateMatrixWorld(true); const rig=m.userData.carry;
      // every visible mesh under the rig's mounts, with its world box
      const parts=[]; const seen=new Set(); const vis=(o)=>{ for(let q=o;q;q=q.parent){ if(!q.visible) return false; if(q===m) return true;} return true; };
      const name=(o)=>{ const n=[]; for(let q=o;q&&q!==m;q=q.parent) n.push(q.name||q.type); return n.slice(0,4).join('<'); };
      const roots={}; rig.slings.forEach((s,i)=>roots['sling'+i]=s.g); rig.holsters.forEach((s,i)=>roots['holster'+i]=s.g); rig.pairs.forEach((s,i)=>roots['pair'+i]=s.g);
      roots.hip=rig.hip.g; roots.hipPair=rig.hipPair.g; roots.harness=rig.harness; roots.bandolier=rig.bandolier; roots.belt40=rig.belt40; roots.mags=rig.mags; roots.grenades=rig.grenades; roots.boxes=rig.boxes; roots.tanks=rig.tanks;
      for (const [k,r] of Object.entries(roots)) { if(!r) continue; let n=0, box=new THREE.Box3(); r.traverse(o=>{ if(o.isMesh && vis(o)) { n++; box.union(new THREE.Box3().setFromObject(o)); } });
        parts.push({ k, visible: vis(r), meshes:n, box: n? [box.min.toArray().map(v=>+v.toFixed(3)), box.max.toArray().map(v=>+v.toFixed(3))] : null, gun: (rig.slings.concat(rig.holsters,rig.pairs,[rig.hip,rig.hipPair]).find(s=>s.g===r)||{}).kind||null }); }
      return { d: { slung:d.slung, holstered:d.holstered, hip:d.hip, counts:d.counts, bands:d.bands }, parts }; })(${JSON.stringify(C)})`, 120000);
    results.push({ id: C.id, ...meas });
    console.log(C.id, JSON.stringify(meas.d));
    for (const v of VIEWS) for (const light of LIGHTS) {
      await page.evaluate(`(async (V,t,l,C)=>{ const T=TT; T.setWorldTime(t); T.weather.raining = l==='overcast';
        const h=window.__home, c=Math.cos(h.yaw), s=Math.sin(h.yaw); const tw=(o)=>({x:h.x+o[0]*c+o[2]*s, y:h.y+o[1], z:h.z-o[0]*s+o[2]*c});
        const a=tw(V.cam), b=tw(V.look); T.setShotView({x:a.x,y:a.y,z:a.z,tx:b.x,ty:b.y,tz:b.z,fov:38});
        for (let i=0;i<4;i++){ T.stepFrame && T.stepFrame(1/30); }
        if (C.o) T.carryDbg(C.o);
        await new Promise(r=>setTimeout(r,400)); })(${JSON.stringify(ALLV[v])},${LT[light]},${JSON.stringify(light)},${JSON.stringify(C)})`, 120000);
      await page.screenshot(path.join(out, `${C.id}-${v}-${light}.png`));
    }
  }
} finally {
  fs.writeFileSync(path.join(root, 'review/CC-347', `probe-${phase}.json`), JSON.stringify(results, null, 1));
  await browser.close(); server.close && server.close();
}
