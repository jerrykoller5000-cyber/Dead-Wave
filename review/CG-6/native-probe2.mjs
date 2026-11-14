// review/CG-6/native-probe2.mjs - Claude 7, CG-6 (J153 note 5, the camo resize glitch). LOOK-ONLY, changes nothing in the
// game. Probe 1 (GP-20141) toured positions and never caught the dense state (05) - and its view never moved. This one stands
// still at one pose (Training, pump in first person, all guns DBDU) and fires the triggers probe 1 never tried, one at a
// time, taking the same picture after each and comparing it to the first (a changed camo density changes the pixels on the
// gun and sleeve while the pose is the same). Per step it records every camo mesh's map (uuid, version, canvas size, GPU
// texture size when the backend shows it), repeat/offset/matrix, uv attribute version and first UVs, material version/type/
// uvNode/colorNode, the camera and view FOV, canvas size and pixel ratio, eye-hide state. Run it headful through the slot:
//   node crew/crew.mjs slot run <you> <task> --checks "CG-6 note 5 trigger probe" -- node review/CG-6/native-probe2.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(new URL('../../tools/serve.mjs', import.meta.url));
const { launch } = await import(new URL('../../tools/cdp.mjs', import.meta.url));
const out = path.join(ROOT, 'review/CG-6/native2'); fs.mkdirSync(out, { recursive: true });
const headless = process.argv.includes('--headless'), q = process.argv.includes('--webgl') ? '&renderer=webgl' : '';
const srv = await serve(ROOT);
const browser = await launch({ headless, args: headless ? ['--no-sandbox'] : ['--window-size=1600,900'] });
const steps = []; let n = 0, code = 0;
const save = () => fs.writeFileSync(path.join(out, 'steps.json'), JSON.stringify(steps, null, 1));
try {
  const page = await browser.newPage({ width: 1600, height: 900 });
  await page.goto(`${srv.origin}/index.html?debug=1${q}`, { timeout: 300000 });
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  const step = (c, ms = 300000) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const THREE = T.THREE || window.THREE; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${c} })()`, ms);
  await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
    const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 120000) await wait(200);
    await wait(3000); T.clearZombies && T.clearZombies(); T.grantAllWeapons && T.grantAllWeapons();
    const W = T.getWardrobe(); W.guns = W.guns || {}; for (const k of Object.keys(T.weaponMeshes)) W.guns[k] = 'dbdu'; T.dressGuns(W);
    T.setCamo && T.setCamo('flecktarn', false);
    T.setViewFirstDbg(true); T.setUnarmedDbg && T.setUnarmedDbg(false);
    for (let i = 0; i < 30 && T.getCurrentWeapon() !== 'shotgun'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun')); await wait(200); }
    window.__p2 = () => { const V = T.viewmodelDbg(), R = T.renderer, cv = R.domElement, meshes = [], be = R.backend;
      const shown = (o) => { for (let p = o; p; p = p.parent) if (p.visible === false) return false; return true; };
      const gpu = (tx) => { try { const d = be && be.get ? be.get(tx) : null; const t = d && (d.texture || d.textureGPU); return t ? (t.width + 'x' + t.height + (t.mipLevelCount ? ' m' + t.mipLevelCount : '')) : null; } catch (e) { return 'err'; } };
      const look = (root, who) => root && root.traverse((o) => { if (!o.isMesh || !shown(o)) return; const m = Array.isArray(o.material) ? o.material[0] : o.material; if (!m || !m.map) return;
        const g = o.geometry, U = g.attributes.uv, tx = m.map;
        meshes.push({ who, name: (o.name || '') + '<' + ((o.parent && o.parent.name) || ''), geo: g.uuid.slice(0, 8), uv: U ? (U.version + ':' + [U.getX(0), U.getY(0), U.getX(1), U.getY(1)].map((v) => +v.toFixed(3)).join(',')) : null,
          mat: m.uuid.slice(0, 8) + ':' + m.version + ':' + m.type + (m.uvNode ? ':uvNode' : '') + (m.colorNode ? ':colorNode' : ''), map: tx.uuid.slice(0, 8) + ':' + tx.version,
          img: tx.image ? tx.image.width + 'x' + tx.image.height : null, gpu: gpu(tx), rep: [tx.repeat.x, tx.repeat.y, tx.offset.x, tx.offset.y].map((v) => +v.toFixed(3)).join(','),
          mtxId: tx.matrix.elements.every((v, i) => Math.abs(v - [1, 0, 0, 0, 1, 0, 0, 0, 1][i]) < 1e-6), ws: (() => { const s = new THREE.Vector3(); o.getWorldScale(s); return +s.y.toFixed(4); })() }); });
      look(V.root, 'view');
      let bodyInEye = 0; const marine = T.marine; if (marine) marine.traverse((o) => { if (o.isMesh && shown(o) && o.layers && (o.layers.mask & T.camera.layers.mask)) bodyInEye++; });
      return { backend: be && be.isWebGPUBackend ? 'WebGPU' : 'WebGL2', pr: R.getPixelRatio(), canvas: cv.width + 'x' + cv.height, css: cv.clientWidth + 'x' + cv.clientHeight,
        key: V.info.key, ads: V.info.ads, raise: V.info.raise, camFov: +T.camera.fov.toFixed(2), fpFov: T.setFirstPersonFov ? T.setFirstPersonFov() : null, bodyMeshesOnEyeLayer: bodyInEye,
        picture: T.pictureDbg ? T.pictureDbg() : null, meshes }; };
    return 1;`);
  const pose = () => step(`const tg = D.tg(), s = tg.spawn; T.player.position.set(s.x, tg.floorY, s.z); T.setAimYawDbg(s.yaw || 0); T.setViewFirstDbg(true);
    for (let i = 0; i < 30 && T.getCurrentWeapon() !== 'shotgun'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun')); await wait(200); }
    const V = T.viewmodelDbg(), t1 = Date.now(); while (!(V.info.key === 'shotgun' && V.info.raise > 0.999) && Date.now() - t1 < 20000) await wait(100); await wait(1200); return 1;`);
  const take = async (tag, extra) => { await pose(); const d = await step(`return __p2();`); d.tag = tag; d.n = ++n; if (extra) d.extra = extra;
    const f = String(n).padStart(2, '0') + '-' + tag.replace(/[^a-z0-9-]+/gi, '_') + '.png'; await page.screenshot(path.join(out, f)); d.file = f; steps.push(d); save();
    console.log(n, tag, d.canvas, d.camFov, d.meshes.length, d.meshes[0] ? d.meshes[0].map + ' ' + d.meshes[0].img + ' gpu ' + d.meshes[0].gpu : ''); };
  const T_ = async (tag, code, after) => { let r = null; try { r = await step(code); } catch (e) { r = 'threw ' + (e && e.message || e); } if (after) await after(); await take(tag, r); };
  await take('start');
  await take('start-again');
  await T_('fpfov-90', `T.setFirstPersonFov(90); await wait(800); return T.setFirstPersonFov();`);
  await T_('fpfov-back-60', `T.setFirstPersonFov(60); await wait(800); return T.setFirstPersonFov();`);
  await T_('resize-1200x700', `return 1;`, async () => { await page.setViewport(1200, 700); await new Promise((r) => setTimeout(r, 2000)); });
  await T_('resize-back', `return 1;`, async () => { await page.setViewport(1600, 900); await new Promise((r) => setTimeout(r, 2000)); });
  await T_('dpr-1.5', `return 1;`, async () => { await page.setViewport(1600, 900, 1.5); await new Promise((r) => setTimeout(r, 2000)); });
  await T_('dpr-back-1', `return 1;`, async () => { await page.setViewport(1600, 900, 1); await new Promise((r) => setTimeout(r, 2000)); });
  await T_('hidden-visible', `return 1;`, async () => { try { await page.send('Page.setWebLifecycleState', { state: 'frozen' }); await new Promise((r) => setTimeout(r, 3000)); await page.send('Page.setWebLifecycleState', { state: 'active' }); } catch (e) {} await new Promise((r) => setTimeout(r, 2000)); });
  await T_('pause-open-close', `const k = (t) => dispatchEvent(new KeyboardEvent(t, { key: 'Escape', code: 'Escape', bubbles: true })); k('keydown'); k('keyup'); await wait(1500); k('keydown'); k('keyup'); await wait(1500); return document.body.className;`);
  await T_('picture-grade-1.2', `localStorage.setItem('tt_brightness', '1.2'); localStorage.setItem('tt_vibrancy', '1.4'); T.applyPictureSettings(); await wait(1500); return T.pictureDbg();`);
  await T_('picture-grade-1', `localStorage.setItem('tt_brightness', '1'); localStorage.setItem('tt_vibrancy', '1'); T.applyPictureSettings(); await wait(1500); return T.pictureDbg();`);
  await T_('lights-off-on', `D.toggleLights(); await wait(1500); D.toggleLights(); await wait(1500); return D.lights();`);
  await T_('3p-and-back', `T.setViewFirstDbg(false); await wait(2000); T.setViewFirstDbg(true); await wait(2000); return 1;`);
  await T_('ads-in-out', `T.setAdsDbg ? (T.setAdsDbg(true), await wait(1200), T.setAdsDbg(false)) : null; await wait(1200); return !!T.setAdsDbg;`);
  await T_('swap-m4-back', `for (let i = 0; i < 30 && T.getCurrentWeapon() !== 'm4'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('m4')); await wait(200); } await wait(2500); return T.getCurrentWeapon();`);
  await T_('armory-fit-mods', `const out = []; try { const mods = T.armoryDbg.mods('shotgun') || []; for (const m of mods) { const id = m.id || m; try { T.armoryDbg.fit('shotgun', id, true); out.push(id); } catch (e) {} } } catch (e) { return 'no armory ' + e.message; } await wait(2500); return out;`);
  await T_('armory-picture', `try { T.armoryDbg.picture('shotgun'); } catch (e) {} await wait(2500); return T.armoryDbg.pics();`);
  await T_('armory-refresh-rack', `try { T.armoryDbg.refreshRack(); } catch (e) {} await wait(2500); return 1;`);
  await T_('cif-m81-flecktarn', `T.setCamo('m81', false); await wait(1500); T.setCamo('flecktarn', false); await wait(1500); return 1;`);
  await T_('gun-finish-swap', `const W = T.getWardrobe(); W.guns.shotgun = 'm81'; T.dressGuns(W); await wait(1500); W.guns.shotgun = 'dbdu'; T.dressGuns(W); await wait(1500); return 1;`);
  await T_('reload', `T.startReload(); await wait(4500); return 1;`);
  await T_('wait-60s', `await wait(60000); return 1;`);
  await take('end');
  console.log('page errors:', (page.errors || []).length);
} catch (e) { console.log('ERR', e && e.stack || e); code = 1; }
finally { await browser.close(); await srv.close(); }
// Compare every picture's gun+sleeve area (the lower right two-thirds) to the first: a big change at the same pose is the glitch.
console.log('steps:', steps.length, '->', out, '(Claude 7 compares the pictures)');
process.exit(code);
