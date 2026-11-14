// review/CG-6/native-probe.mjs - Claude 7, CG-6 (J153 note 5: "Camo resize glitch persists"). A look-only probe for Jerry's
// own GPU (WebGPU on the RTX): it changes nothing in the game. Run it through the slot, headful:
//   node crew/crew.mjs slot run <you> CG-6 --checks "CG-6 native camo probe" -- node review/CG-6/native-probe.mjs
// It enters the Training Ground, paints every gun DBDU (the camo in Jerry's 05/06), takes the pump in first person and
// tours the ground: every station's front and a grid of spots, four headings each, then hip/ADS/reload/swap/fire, the CIF
// camo change and back, 3P and back. Per stop: a screenshot (review/CG-6/native/NNN-*.png) and a line in stops.json with
// what the view draws: each camo mesh's geometry/uv ids and first UVs, its material map (id, image size, repeat, matrix),
// the backend, pixel ratio, canvas size, the view's FOV and the camera's. In the glitch (05) the camo's chips are about
// four times smaller on the gun AND the sleeve; the stop where that shows and its data name the cause.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(new URL('../../tools/serve.mjs', import.meta.url));
const { launch } = await import(new URL('../../tools/cdp.mjs', import.meta.url));
const out = path.join(ROOT, 'review/CG-6/native'); fs.mkdirSync(out, { recursive: true });
const headless = process.argv.includes('--headless');
const srv = await serve(ROOT);
const browser = await launch({ headless, args: headless ? [] : ['--window-size=1600,900'] });
const stops = []; let n = 0, code = 0;
try {
  const page = await browser.newPage({ width: 1600, height: 900 });
  await page.goto(`${srv.origin}/index.html?debug=1`, { timeout: 300000 });
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  const step = (c, ms = 300000) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const THREE = T.THREE || window.THREE; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${c} })()`, ms);
  await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
    const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 120000) await wait(200);
    await wait(3000); T.clearZombies && T.clearZombies(); T.grantAllWeapons && T.grantAllWeapons();
    const W = T.getWardrobe(); W.guns = W.guns || {}; for (const k of Object.keys(T.weaponMeshes)) W.guns[k] = 'dbdu'; T.dressGuns(W);
    T.setViewFirstDbg(true); T.setUnarmedDbg && T.setUnarmedDbg(false);
    window.__cg6 = () => { const V = T.viewmodelDbg(), R = T.renderer, cv = R.domElement, meshes = [];
      const shown = (o) => { for (let p = o; p; p = p.parent) if (p.visible === false) return false; return true; };
      V.root.traverse((o) => { if (!o.isMesh || !shown(o)) return; const m = Array.isArray(o.material) ? o.material[0] : o.material; if (!m || !m.map) return;
        const g = o.geometry, U = g.attributes.uv, tx = m.map; o.updateWorldMatrix(true, false); const ws = new THREE.Vector3(); o.getWorldScale(ws);
        meshes.push({ name: (o.name || '') + '<' + ((o.parent && o.parent.name) || ''), geo: g.uuid.slice(0, 8), twinOf: g.userData && g.userData.vmFlipOf ? g.userData.vmFlipOf.uuid.slice(0, 8) : null,
          uvAttr: U ? (U.uuid || U.id || '') + ':' + U.version : null, uv0: U ? [U.getX(0), U.getY(0), U.getX(1), U.getY(1)].map((v) => +v.toFixed(4)) : null,
          ws: +ws.x.toFixed(4), mat: m.uuid.slice(0, 8) + ':' + m.version + ':' + (m.type || ''), map: tx.uuid.slice(0, 8) + ':' + tx.version, img: tx.image ? (tx.image.width + 'x' + tx.image.height) : null,
          rep: [tx.repeat.x, tx.repeat.y, tx.offset.x, tx.offset.y], mtx: Array.from(tx.matrix.elements).map((v) => +v.toFixed(4)), ch: tx.channel, mips: tx.generateMipmaps, minF: tx.minFilter, uvNode: !!m.uvNode, colorNode: !!m.colorNode }); });
      return { backend: R.backend && R.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2', pr: R.getPixelRatio(), canvas: cv.width + 'x' + cv.height, key: V.info.key, ads: V.info.ads, vmFov: V.info.fov, camFov: T.camera.fov,
        pos: T.player ? [T.player.position.x, T.player.position.z].map((v) => +v.toFixed(2)) : null, meshes }; };
    return true;`);
  const take = (w) => step(`T.setUnarmedDbg && T.setUnarmedDbg(false); for (let i = 0; i < 30 && T.getCurrentWeapon() !== '${w}'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await wait(200); }
    const V = T.viewmodelDbg(); const t1 = Date.now(); while (!(V.info.key === '${w}' && V.info.raise > 0.999) && Date.now() - t1 < 20000) await wait(100); await wait(400); return 1;`);
  const stop = async (tag) => { const d = await step(`return __cg6();`); d.tag = tag; d.n = ++n; stops.push(d); const f = String(n).padStart(3, '0') + '-' + tag.replace(/[^a-z0-9-]+/gi, '_') + '.png'; await page.screenshot(path.join(out, f)); d.file = f; console.log(n, tag, d.meshes.length, d.meshes[0] ? d.meshes[0].map + ' ' + d.meshes[0].uvAttr : ''); fs.writeFileSync(path.join(out, 'stops.json'), JSON.stringify(stops, null, 1)); };
  await take('shotgun'); await stop('start');
  const spots = await step(`const tg = D.tg(), s = tg.spawn, out = [{ name: 'spawn', x: s.x, z: s.z }];
    for (const [k, v] of Object.entries(tg.stations || {})) { const f = v && (v.front || v); if (f && Number.isFinite(f.x) && Number.isFinite(f.z)) out.push({ name: k, x: f.x, z: f.z }); }
    const o = tg.origin; for (const dx of [-8, 0, 8]) for (const dz of [-10, 0, 10]) out.push({ name: 'grid' + dx + '_' + dz, x: o.x + dx, z: o.z + dz });
    return out;`);
  for (const sp of spots) {
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      await step(`T.player.position.x = ${sp.x}; T.player.position.z = ${sp.z}; T.setAimYawDbg(${yaw}); await wait(500); return 1;`);
      await stop(sp.name + '-y' + Math.round(yaw * 57.3));
    }
  }
  await step(`T.player.position.set(D.tg().spawn.x, D.tg().floorY, D.tg().spawn.z); T.setAimYawDbg(D.tg().spawn.yaw); await wait(600); return 1;`);
  await step(`T.startReload(); await wait(700); return 1;`); await stop('reload-mid');
  await step(`await wait(3500); return 1;`); await stop('reload-after');
  await take('m4'); await stop('m4'); await take('pistol'); await stop('pistol'); await take('shotgun'); await stop('shotgun-back');
  await step(`T.setViewFirstDbg(false); await wait(1500); T.setViewFirstDbg(true); await wait(1500); return 1;`); await stop('3p-and-back');
  await step(`T.setCamo('flecktarn', false); await wait(1500); return 1;`); await stop('uniform-flecktarn');
  await step(`T.setCamo('m81', false); await wait(1500); return 1;`); await stop('uniform-m81');
  await step(`try { T.openCIF && T.openCIF(); } catch (e) {} await wait(2500); try { T.closeCIF && T.closeCIF(); } catch (e) {} await wait(2000); return 1;`); await stop('cif-open-close');
  await step(`try { T.armoryDbg.picture('shotgun'); } catch (e) {} await wait(2500); return 1;`); await stop('armory-picture');
  console.log('page errors:', (page.errors || []).length);
} catch (e) { console.log('ERR', e && e.stack || e); code = 1; }
finally { await browser.close(); await srv.close(); }
console.log('stops:', stops.length, '->', out);
process.exit(code);
