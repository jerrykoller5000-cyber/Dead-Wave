// CB-313 (claude2): a boot on a build floor, before/after, side and close, four lights. A wooden floor on levelled
// ground (Hunt), him standing on it, unarmed; cameras 0.7 m from his left boot at sole height (side) and from behind-left.
// Also measures each boot's sole (8 points, as tcc343b) against the floor mesh raycast from above.
// TAG=before|after (the tree this runs in). Run: node tools/game-test-slot.mjs run claude2 CB-313 --checks "boot on floor" -- node review/CB-313/boot313.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/CB-313', process.env.OUTSUB || '');
fs.mkdirSync(out, { recursive: true });
const tag = process.env.TAG || 'after';
const LIGHTS = { noon: 0.42, overcast: 0.5, dusk: 0.74, night: 0.02 };
// Grazing views along the boards at the sole (a 6 mm gap shows as a light line under the boot): y is from the sole.
const VIEWS = [
  { id: 'side', d: [-1.15, 0.012, 0.0], ty: 0.03, fov: 16 },
  { id: 'rear', d: [-0.55, 0.02, -1.0], ty: 0.03, fov: 16 },
];
const server = await serve(root, 0);
const browser = await launch({ headless: true, args: ['--window-size=1280,720'] });
const res = { tag, shots: [] };
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 400000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 400000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 500000 })) throw Error('the opening stayed up');
  await page.evaluate(`(()=>{ document.getElementById('playerName').value='CB-313 floor'; document.getElementById('modeHunt').click();
    const fr=document.getElementById('firstRunCard'), pa=document.getElementById('firstRunPlay'); if (fr && !fr.hidden && pa) pa.click(); })()`);
  if (!await page.waitFor('TT.getPhase && TT.getPhase() === "prep" && !document.body.classList.contains("deploying")', { timeout: 400000 })) throw Error('no prep');
  const setup = await page.evaluate(`(async()=>{ const T=TT, THREE=T.THREE, V=THREE.Vector3; T.clearZombies && T.clearZombies(); T.setHp(100000); T.setViewFirstDbg(false);
    if (!T.isUnarmed()) T.toggleHolster();
    const SX=18, SZ=18, G0=T.sampleHeight(SX,SZ); T.levelGroundRect(SX-14,SZ-14,SX+14,SZ+14,G0,6);
    const f=T.placeBuildAt('floor', Math.round(SX/2), Math.round(SZ/2), 0); if(!f||!f.deck) return {ok:false};
    const d=f.deck; window.__f={x:d.x, z:d.z, hw:d.hw, deckY:d.deckY, g:G0, b:f};
    window.__step=(n=1)=>{ for(let i=0;i<n;i++){ const p=T.player.position; p.x=__f.x; p.z=__f.z; T.setVelDbg(0,0); T.aimPointDbg(p.x, p.y+1.3, p.z+6); T.setAimYawDbg(0); T.stepFrame(1/30); } };
    T.flightHold(true);
    T.player.position.set(d.x, T.entityGroundY(d.x, d.z, d.deckY+0.3), d.z); __step(60); if (!T.isUnarmed()) { T.toggleHolster(); __step(60); }
    const ud=T.marine.userData, P=T.player, ray=new THREE.Raycaster(), down=new V(0,-1,0);
    const soleOf=(an)=>{ P.updateMatrixWorld(true); const inv=new THREE.Matrix4().copy(an.matrixWorld).invert(), b=new THREE.Box3(), all=new THREE.Box3();
      an.traverse((o)=>{ if(!o.isMesh||!o.geometry) return; o.geometry.computeBoundingBox(); b.copy(o.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld)); all.union(b); });
      const pts=[]; for(const x of [all.min.x+0.01, all.max.x-0.01]) for(const q of [0,0.36,0.68,1]) pts.push(new V(x, all.min.y, all.min.z+0.01+(all.max.z-all.min.z-0.02)*q)); return pts; };
    const meas={}; for (const s of ['L','R']) { const an=ud['ankle'+s+'G']; const pts=soleOf(an).map(q=>an.localToWorld(q.clone()));
      const gaps=pts.map(w=>{ ray.set(new V(w.x, w.y+0.5, w.z), down); ray.far=3; const h=ray.intersectObject(__f.b.mesh,true); return h.length? (w.y-h[0].point.y)*1000 : null; });
      meas[s]={ minGapMm:+Math.min(...gaps.filter(v=>v!=null)).toFixed(1), maxGapMm:+Math.max(...gaps.filter(v=>v!=null)).toFixed(1) }; }
    const top=(()=>{ ray.set(new V(d.x+0.3, d.deckY+0.5, d.z+0.31), down); const h=ray.intersectObject(__f.b.mesh,true); return h.length? +(h[0].point.y-f.mesh.position.y).toFixed(4):null; })();
    const al=ud.ankleLG.getWorldPosition(new V()); window.__boot={x:al.x, y:P.position.y, z:al.z};
    return {ok:true, unarmed:T.isUnarmed(), deckY:+(d.deckY-f.mesh.position.y).toFixed(4), hw:d.hw, plankTop: top, playerY:+(P.position.y-f.mesh.position.y).toFixed(4), soles:meas}; })()`, 180000);
  console.log(tag, 'setup', JSON.stringify(setup)); res.setup = setup;
  for (const [light, t] of Object.entries(LIGHTS)) {
    await page.evaluate(`(()=>{ const T=TT; T.setWorldTime(${t}); T.weather.raining = ${light === 'overcast'}; __step(6); })()`, 60000);
    for (const V of VIEWS) {
      // The held loop's stepFrame draws, but the page only presents on a real frame: let it run 0.6 s with the shot view on.
      await page.evaluate(`(async()=>{ const T=TT, b=__boot, V=${JSON.stringify(V)}; T.setShotView({x:b.x+V.d[0], y:b.y+V.d[1], z:b.z+V.d[2], tx:b.x, ty:b.y+V.ty, tz:b.z, fov:V.fov}); __step(2);
        T.flightHold(false); await new Promise(r=>setTimeout(r,600)); })()`, 60000);
      const f = path.join(out, `boot-${V.id}-${light}-${tag}.png`);
      await page.screenshot(f); res.shots.push(path.basename(f));
      await page.evaluate('TT.flightHold(true)');
    }
  }
  fs.writeFileSync(path.join(out, `boot313-${tag}.json`), JSON.stringify(res, null, 2));
} finally { await browser.close(); await server.close(); }
