// CD-9 (cloud only): the third-person hold exported for the grip solver, in tools/handfit's export format (parts: the gun's
// triangles in world; hands r/l: the 3P glove as drawn, its matrixWorld, side/ox/gz/pose; info.gunMw), plus the arm frames.
// tpexp2 (CD-10): tpexp with AIMYAWS='0,-1.13' (each aim yaw off +z, rad: the aim point turned round him; -1.13 = tcc341's stance) and VIEWS2 (ids for yaw != 0)
// node tools/handfit/c4/tpexp.mjs <outdir> [guns]   env SHOTS=0 (no pictures), TINT=1, LIGHT=<world time>, TAG, AIM=1 (RMB)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../serve.mjs';
import { launch } from '../../cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const out = path.resolve(process.argv[2] || 'tpx'); fs.mkdirSync(out, { recursive: true });
const guns = (process.argv[3] || 'pistol,revolver').split(',');
const SHOTS = process.env.SHOTS !== '0', TINT = !!process.env.TINT, LIGHT = +(process.env.LIGHT || 0.42), TAG = process.env.TAG || 'x', AIM = !!process.env.AIM;
const VIEWS = [
  { id: 'left', d: [0.55, 0.08, 0.05] }, { id: 'right', d: [-0.55, 0.08, 0.05] },
  { id: 'top', d: [0.02, 0.55, -0.05] }, { id: 'front-low', d: [0.25, -0.25, 0.45] },
];
const server = await serve(root, 0);
const browser = await launch({ headless: true, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/${process.env.PAGE || "index.html"}?debug=1&raf=timer`, { timeout: 400000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 400000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()', 400000);
  // the cloud (software GL) is slow: keep asking, and once the load is ready, tell the opening (it waited on a gate here)
  for (let i = 0; i < 40 && await page.evaluate('!!(window.DWOpening && window.DWOpening.active)', 400000); i++) {
    await new Promise((r) => setTimeout(r, 5000));
    await page.evaluate('DWOpening.dismissForTesting(); if (i_ready()) {}'.replace('if (i_ready()) {}', i > 6 ? 'window.DWOpening.ready()' : ''), 400000);
  }
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: +(process.env.OPEN_T || 500000) })) { console.log('ERRORS', JSON.stringify(page.errors), await page.evaluate('JSON.stringify({load: window.DWLoad && window.DWLoad.snapshot(), txt: document.body.innerText.slice(0, 400)})')); throw Error('opening stayed up'); }
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CD-9';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 400000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 });
  await page.evaluate(`(()=>{ const T=TT; T.grantAllWeapons(); T.setUnarmedDbg(false); T.setViewFirstDbg(false); T.setWorldTime(${LIGHT});
    if (${TINT}) { const ud=T.getMarine().userData; const red=new T.THREE.MeshBasicMaterial({color:0xff2020}); const blu=new T.THREE.MeshBasicMaterial({color:0x2060ff}); const wl=ud.elbowLG.userData.wrist, wr=ud.elbowRG.userData.wrist; if(wl) wl.traverse(o=>{ if(o.isMesh) o.material=red; }); if(wr) wr.traverse(o=>{ if(o.isMesh) o.material=blu; }); }
    const y=T.trainingDbg.tg().floorY; window.__home={x:0,y,z:-645}; window.__zoom=${AIM};
    window.__sim=async(s)=>{const s0=T.getSimTime(),w0=Date.now(); while(T.getSimTime()-s0<s&&Date.now()-w0<90000) await new Promise(r=>setTimeout(r,40));};
    setInterval(()=>{ const h=window.__home; T.player.position.set(h.x,h.y,h.z); T.setVelDbg(0,0); const yw=window.__yaw||0; T.aimTarget.set(h.x+Math.sin(yw)*10, h.y+1.25, h.z+Math.cos(yw)*10); T.setZoomHeldDbg(window.__zoom); }, 5); })()`);
  const YAWS = (process.env.AIMYAWS || '0').split(',').map(Number);
  for (const yaw of YAWS) { await page.evaluate(`window.__yaw=${yaw}`);
  for (const w of guns) {
    if (yaw !== 0 && process.env.YAWGUNS && !process.env.YAWGUNS.split(',').includes(w)) continue;
    const YT = yaw === 0 ? '' : 'yaw' + yaw + '-';
    const r = await page.evaluate(`(async()=>{ const T=TT; for (let i=0;i<16&&T.getCurrentWeapon()!=='${w}';i++) T.setWeapon(i); await __sim(2.2);
      const key='${w}', gun=T.weaponMeshes[key], ud=T.getMarine().userData; gun.updateMatrixWorld(true); T.getMarine().updateMatrixWorld(true);
      const vis=(o)=>{ for (let x=o;x;x=x.parent) if (!x.visible) return false; return true; };
      const b64=(a)=>{ const u=new Uint8Array(a.buffer, a.byteOffset, a.byteLength); let s=''; for (let i=0;i<u.length;i+=0x8000) s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000)); return btoa(s); };
      const v=new T.THREE.Vector3(); const parts=[]; let ntri=0;
      gun.traverse((m)=>{ if (!m.isMesh||!m.geometry||!m.geometry.attributes.position||!vis(m)) return; const pos=m.geometry.attributes.position, idx=m.geometry.index, n=idx?idx.count:pos.count; const o=new Float32Array(n*3);
        for (let i=0;i<n;i++){ const j=idx?idx.getX(i):i; v.fromBufferAttribute(pos,j).applyMatrix4(m.matrixWorld); o[i*3]=v.x;o[i*3+1]=v.y;o[i*3+2]=v.z; } ntri+=n/3; parts.push({name:m.name||(m.parent&&m.parent.name)||'?',tris:n/3,b64:b64(o)}); });
      const hands={}, arms={};
      for (const [sd,e,a] of [['r',ud.elbowRG,ud.armRG],['l',ud.elbowLG,ud.armLG]]) {
        const wr=e.userData.wrist, rig=wr.userData.hand; let mesh=null, which=null;
        { let best=null; for (const sk of rig.skins) if (vis(sk.mesh) && (!best || sk.n>best.n)) best=sk; if (best) { mesh=best.mesh; which=best.kind||'main'; } }
        arms[sd]={ arm:Array.from(a.matrixWorld.elements), elbow:Array.from(e.matrixWorld.elements), wrist:Array.from(wr.matrixWorld.elements), wristQ:wr.quaternion.toArray(), wristPos:wr.position.toArray(), grip:wr.userData.grip.toArray(), scale:wr.userData.handScale };
        if (!mesh) { hands[sd]={err:'no visible hand'}; continue; }
        const pos=mesh.geometry.attributes.position, loc=new Float32Array(pos.count*3), wor=new Float32Array(pos.count*3);
        for (let i=0;i<pos.count;i++){ v.fromBufferAttribute(pos,i); loc[i*3]=v.x;loc[i*3+1]=v.y;loc[i*3+2]=v.z; v.applyMatrix4(mesh.matrixWorld); wor[i*3]=v.x;wor[i*3+1]=v.y;wor[i*3+2]=v.z; }
        const ix=mesh.geometry.index;
        hands[sd]={ which, n:pos.count, idx: ix? b64(new Uint32Array(ix.array)) : null, mw:Array.from(mesh.matrixWorld.elements), side:rig.layout.s, ox:rig.layout.ox, gz:rig.layout.gz, pose:JSON.parse(JSON.stringify(rig.pose)), loc:b64(loc), wor:b64(wor) };
      }
      const H=T.handsDbg; T.getMarine().userData.elbowRG.userData.wrist.updateMatrixWorld(true); const info={ key, tp:true, tpdbg: window.__tpdbg || null, wrRNow: Array.from(T.getMarine().userData.elbowRG.userData.wrist.matrixWorld.elements), elRNow: Array.from(T.getMarine().userData.elbowRG.matrixWorld.elements), gunMw:Array.from(gun.matrixWorld.elements), ntri, parts:parts.length, arms, roll:H.roll(), wristTurn:H.wrist(), gripA:H.gripA(), limits:T.armLimitsDbg(), hold:T.getShoulderDbg().holds[key] };
      const gr=H.gripPoint('R'), gl=H.gripPoint('L'); window.__mid=gr.clone().add(gl).multiplyScalar(0.5);
      window.__file={info,parts,hands}; return { key, ntri, hands:Object.fromEntries(Object.entries(hands).map(([k,h])=>[k,{which:h.which,n:h.n,err:h.err}])), roll:info.roll, wrist:info.wristTurn, lim:{r:info.limits.r&&{ok:info.limits.r.ok,flex:info.limits.r.flex,dev:info.limits.r.dev,twist:info.limits.r.twist},l:info.limits.l&&{ok:info.limits.l.ok,flex:info.limits.l.flex,dev:info.limits.l.dev,twist:info.limits.l.twist}} }; })()`, 180000);
    console.log(JSON.stringify(r));
    const js = await page.evaluate('JSON.stringify(window.__file)', 120000);
    fs.writeFileSync(path.join(out, `${YT}${w}.json`), js);
    if (SHOTS) {
      const LS = process.env.LIGHTS ? process.env.LIGHTS.split(',') : [null];
      if (process.env.LIGHTS) await page.evaluate(`(async()=>{ if (window.__lit) return; window.__lit=1; const css=document.createElement('style'); css.textContent='#hud,#crosshair{display:none!important;visibility:hidden!important}'; document.head.append(css);
        const T=window.TT, Hh=T.inspectHost(); const { LIGHTS } = await import('/studio/inspector/stage.js'); window.__LIGHTS=LIGHTS; window.eyeLight='noon';
        function illuminate(){ const L=window.__LIGHTS[window.eyeLight]||window.__LIGHTS.noon; const p=T.player.position; const dir=new Hh.THREE.Vector3(...L.dir).normalize();
          Hh.sun.position.copy(p).addScaledVector(dir,85); Hh.sun.target.position.copy(p); Hh.sun.target.updateMatrixWorld(); Hh.sun.color.setHex(L.sunColor); Hh.sun.intensity=L.sun;
          Hh.hemi.color.setHex(L.skyColor); Hh.hemi.groundColor.setHex(L.ground); Hh.hemi.intensity=L.sky; Hh.ambientFill.intensity=L.fill; Hh.moon.intensity=window.eyeLight==='night'?0.45:0; }
        Hh.attach({ held:()=>false, scale:(dt)=>dt, frame: illuminate }); })()`, 120000);
      for (const L of LS) {
        if (L) await page.evaluate(`window.eyeLight=${JSON.stringify(L)}`);
        for (const V of VIEWS) {
          if (yaw !== 0 && process.env.VIEWS2 && !process.env.VIEWS2.split(',').includes(V.id)) continue;
          await page.evaluate(`(async()=>{ const T=TT,V=${JSON.stringify(V)}; const m=window.__mid; T.setShotView({x:m.x+V.d[0],y:m.y+V.d[1],z:m.z+V.d[2],tx:m.x,ty:m.y,tz:m.z,fov:32}); await __sim(0.3); })()`, 60000);
          await page.screenshot(path.join(out, `tp-${YT}${w}-${V.id}-${L ? L + '-' : ''}${TAG}.png`));
        }
      }
      if (process.env.TINT2) {   // the same views at noon with the hands tinted (firing blue, support red)
        await page.evaluate(`(()=>{ const T=TT; window.eyeLight='noon'; const ud=T.getMarine().userData; const red=new T.THREE.MeshBasicMaterial({color:0xff2020}); const blu=new T.THREE.MeshBasicMaterial({color:0x2060ff}); window.__mats=new Map(); const wl=ud.elbowLG.userData.wrist, wr=ud.elbowRG.userData.wrist; if(wl) wl.traverse(o=>{ if(o.isMesh) { window.__mats.set(o,o.material); o.material=red; } }); if(wr) wr.traverse(o=>{ if(o.isMesh) { window.__mats.set(o,o.material); o.material=blu; } }); })()`);
        for (const V of VIEWS) {
          await page.evaluate(`(async()=>{ const T=TT,V=${JSON.stringify(V)}; const m=window.__mid; T.setShotView({x:m.x+V.d[0],y:m.y+V.d[1],z:m.z+V.d[2],tx:m.x,ty:m.y,tz:m.z,fov:32}); await __sim(0.3); })()`, 60000);
          await page.screenshot(path.join(out, `tp-${w}-${V.id}-tint-${TAG}.png`));
        }
        await page.evaluate('(()=>{ for (const [o,m] of window.__mats) o.material=m; })()');
      }
      await page.evaluate('TT.setShotView(null)');
    }
  }
  }
} finally { await browser.close(); await server.close(); }
