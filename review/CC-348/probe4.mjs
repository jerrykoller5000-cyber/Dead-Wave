// CC-348 (claude3): side views of the GW-4 (can on, bare and painted), the sniper (painted; bolt closed, lifted, drawn back)
// and the pump shotgun, each a clone of the game's own gun (materials shared, so the camo is the game's) held up in the
// Training Ground beside the player. PHASE=before|after. Writes review/CC-348/side-<phase>/<shot>.png.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const phase = process.env.PHASE || 'before';
const out = path.join(root, 'review/CC-348', 'side-' + phase); fs.mkdirSync(out, { recursive: true });
const SHOTS = [
  { id: 'm4-can-camo-left', kind: 'm4', can: true, camo: 'm81', side: 1, dist: 1.25 },
  { id: 'm4-can-issue-left', kind: 'm4', can: true, camo: null, side: 1, dist: 1.25 },
  { id: 'm4-can-camo-right', kind: 'm4', can: true, camo: 'm81', side: -1, dist: 1.25 },
  { id: 'sniper-camo-left', kind: 'sniper', camo: 'm81', side: 1, dist: 1.5 },
  { id: 'sniper-issue-left', kind: 'sniper', camo: null, side: 1, dist: 1.5 },
  { id: 'sniper-bolt-closed', kind: 'sniper', camo: null, side: 1, dist: 0.55, focus: [0, 0.05, -0.2], bolt: [0, 0] },
  { id: 'sniper-bolt-lifted', kind: 'sniper', camo: null, side: 1, dist: 0.55, focus: [0, 0.05, -0.2], bolt: [1, 0] },
  { id: 'sniper-bolt-back', kind: 'sniper', camo: null, side: 1, dist: 0.55, focus: [0, 0.05, -0.2], bolt: [1, 1] },
  { id: 'sniper-bolt-back-top', kind: 'sniper', camo: null, side: 1, dist: 0.55, focus: [0, 0.05, -0.2], bolt: [1, 1], top: true },
  { id: 'shotgun-issue-left', kind: 'shotgun', camo: null, side: 1, dist: 1.3 },
  { id: 'shotgun-issue-right', kind: 'shotgun', camo: null, side: -1, dist: 1.3 },
  { id: 'shotgun-pump-close', kind: 'shotgun', camo: null, side: 1, dist: 0.6, focus: [0, 0, 0.35] },
];
const server = await serve(root, 0);
const browser = await launch({ headless: true, args: ['--window-size=1280,720'] });
const info = [];
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 600000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 600000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 600000 })) throw Error('opening stayed up');
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CC-348';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 600000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 120000 });
  const sim = `(async (s)=>{ const T=TT; const s0=T.getSimTime(),w0=Date.now(); while(T.getSimTime()-s0<s&&Date.now()-w0<90000) await new Promise(r=>setTimeout(r,40)); })`;
  await page.evaluate(`${sim}(2)`, 120000);
  const diag = await page.evaluate(`(()=>{ const T=TT; const g=T.weaponMeshes.m4; T.dressGuns({guns:{m4:'m81'}}); const fur=(T.getGunFurniture()||{}).m4||[]; const out=[];
    g.userData.suppressor.traverse(o=>{ if(o.isMesh) out.push({ n:o.name, mat:o.material&&o.material.name, role:o.material&&o.material.userData&&o.material.userData.weaponFinishRole, map:!!(o.material&&o.material.map), inFur: fur.includes(o.material), uv: !!(o.geometry&&o.geometry.attributes.uv) }); });
    return out; })()`);
  console.log('diag', JSON.stringify(diag)); info.push({ diag });
  for (const S of SHOTS) {
    const r = await page.evaluate(`(()=>{ const T=TT, THREE=T.THREE, S=${JSON.stringify(S)};
      if (window.__disp) { window.__disp.parent.remove(window.__disp); window.__disp=null; }
      const src=T.weaponMeshes[S.kind]; T.setGunSuppressor(src, !!S.can); T.dressGuns({ guns: S.camo ? { [S.kind]: S.camo } : {} });
      const g=src.clone(true); g.visible=true; g.traverse(o=>{ if(o.userData&&o.name==='suppressor') o.visible=!!S.can; });
      const ud=src.userData; for (const k of ['laser','flash']) { const n=ud[k]; if(n){ const i=[]; src.traverse(o=>i.push(o)); const c=[]; g.traverse(o=>c.push(o)); const j=i.indexOf(n); if(j>=0&&c[j]) c[j].visible=false; } }
      if (S.bolt && ud.bolt) { const i=[]; src.traverse(o=>i.push(o)); const c=[]; g.traverse(o=>c.push(o)); const b=c[i.indexOf(ud.bolt)];
        const bp=ud.baseBoltPos, br=ud.baseBoltRot, side=ud.boltSide||1; b.position.set(bp.x, bp.y+0.01*S.bolt[0], bp.z-0.09*S.bolt[1]); b.rotation.set(br.x,br.y,(br.z||0)+side*1.05*S.bolt[0]); }
      const p=T.player.position, yaw=T.player.rotation.y; const fx=Math.sin(yaw), fz=Math.cos(yaw);
      const base=new THREE.Vector3(p.x+fx*1.6, p.y+1.4, p.z+fz*1.6);
      g.position.copy(base); g.rotation.set(0, yaw+Math.PI/2, 0); g.scale.copy(src.getWorldScale(new THREE.Vector3()));
      T.scene ? T.scene.add(g) : T.player.parent.add(g); window.__disp=g; g.updateMatrixWorld(true);
      const f=S.focus||[0,0.02,0.2]; const fw=g.localToWorld(new THREE.Vector3(...f));
      const n=new THREE.Vector3(S.side,0,0).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()));
      const cam=fw.clone().addScaledVector(n,S.dist); if(S.top){ cam.copy(fw).add(new THREE.Vector3(0,S.dist,0)).addScaledVector(n,0.12); }
      T.setShotView({x:cam.x,y:cam.y+0.02,z:cam.z,tx:fw.x,ty:fw.y,tz:fw.z,fov:30});
      const box=new THREE.Box3().setFromObject(g); return { id:S.id, size: box.getSize(new THREE.Vector3()).toArray().map(v=>+v.toFixed(3)), ws: g.scale.x };
    })()`, 60000);
    await page.evaluate(`${sim}(0.3)`, 60000);
    await page.screenshot(path.join(out, S.id + '.png'));
    info.push(r); console.log(JSON.stringify(r));
  }
} finally {
  fs.writeFileSync(path.join(root, 'review/CC-348', `side-${phase}.json`), JSON.stringify(info, null, 1));
  await browser.close(); server.close && server.close(); setTimeout(() => process.exit(0), 2000);
}
