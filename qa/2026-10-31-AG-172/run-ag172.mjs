import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-10-31-AG-172');
fs.mkdirSync(OUT, { recursive: true });

// 1. Run realtest tcl281 --all
console.log('=== 1. Running realtest tcl281 --all ===');
const tclOut = execFileSync(process.execPath, ['tools/realtest.mjs', 'tcl281', '--all'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024
});
console.log(tclOut);
fs.writeFileSync(path.join(OUT, 'realtest-tcl281.txt'), tclOut);

// 2. Capture vmsheet shots (with seat at at=0.50 as requested in AG-172, plus 0.58 for comparison) & inspect vm-look-down marine meshes
console.log('=== 2. Running vmsheet shots + vm-look-down TT.drawsOf(TT.marine) probe ===');
const W = 1280, H = 720, gun = 'pistol';
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size=' + W + ',' + H] });
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');

const summary = {
  shots: [],
  lookDownProbe: null,
};

try {
  const page = await browser.newPage({ width: W, height: H });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(lib);
  await page.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'VM');
    T.clearZombies && T.clearZombies();
    T.setHp(1e5);
    T.grantAllWeapons();
    if (T.setWorldTime) T.setWorldTime(0.42);
    const w = '${gun}';
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf(w));
      await new Promise((r) => setTimeout(r, 150));
    }
    T.setViewFirstDbg(true);
    await new Promise((r) => setTimeout(r, 4000));
    return 1;
  })()`, 600000);

  const shot = async (name, js, settle = 2500) => {
    if (js) await page.evaluate(`(async () => { const T = TT; ${js}; return 1; })()`, 300000);
    await new Promise((r) => setTimeout(r, settle));
    const info = await page.evaluate(`(() => {
      const T = TT;
      const v = T.viewmodelDbg && T.viewmodelDbg();
      if (!v) return null;
      const THREE = T.THREE || window.THREE;
      const sp = v.space || v.root;
      sp.updateMatrixWorld(true);
      const rootInv = sp.matrixWorld.clone().invert();
      const inView = (o, p = new THREE.Vector3()) => {
        o.updateWorldMatrix(true, false);
        return p.clone().applyMatrix4(o.matrixWorld).applyMatrix4(rootInv);
      };
      const wL = v.ndc(inView(v.arms.l.wrist));
      const eL = v.ndc(inView(v.arms.l.root));
      const wR = v.ndc(inView(v.arms.r.wrist));
      const eR = v.ndc(inView(v.arms.r.root));
      const asp = (T.camera || window.camera).aspect || (1280 / 720);
      const dxL = (eL.x - wL.x) * asp, dyL = eL.y - wL.y;
      const steepL = Math.atan2(-dyL, Math.abs(dxL)) * 180 / Math.PI;
      const dxR = (eR.x - wR.x) * asp, dyR = eR.y - wR.y;
      const steepR = Math.atan2(-dyR, Math.abs(dxR)) * 180 / Math.PI;
      return {
        active: v.info.active,
        flip: v.info.flip,
        raise: +v.info.raise.toFixed(2),
        ads: +v.info.ads.toFixed(2),
        mag: v.info.magState,
        hand: v.info.handPlace,
        u: v.info.reloadU != null ? +v.info.reloadU.toFixed(3) : null,
        wristL_ndc: [+wL.x.toFixed(3), +wL.y.toFixed(3)],
        elbowL_ndc: [+eL.x.toFixed(3), +eL.y.toFixed(3)],
        steepL_deg: +steepL.toFixed(1),
        wristR_ndc: [+wR.x.toFixed(3), +wR.y.toFixed(3)],
        elbowR_ndc: [+eR.x.toFixed(3), +eR.y.toFixed(3)],
        steepR_deg: +steepR.toFixed(1),
      };
    })()`);
    const file = path.join(OUT, name + '.png');
    await page.screenshot(file);
    console.log(name.padEnd(20), JSON.stringify(info), '->', path.relative(ROOT, file));
    summary.shots.push({ name, info, file: path.relative(ROOT, file) });
  };

  await shot('vm-hip', '');
  await shot('vm-ads', 'T.setZoomHeldDbg(true)', 3500);
  await shot('vm-hip-again', 'T.setZoomHeldDbg(false)', 3000);

  const reloadBeats = [
    ['vm-reload-grab', 0.14],
    ['vm-reload-pouch', 0.40],
    ['vm-reload-seat', 0.50],
    ['vm-reload-seat-058', 0.58],
    ['vm-reload-slide', 0.78],
  ];
  for (const [name, at] of reloadBeats) {
    await shot(
      name,
      `T.setAmmoDbg('${gun}', 2); T.startReload(); const t0 = Date.now(); while (Date.now() - t0 < 30000) { const r = T.getReloadDbg(); if (!T.isReloading() || (1 - r.timer / r.anim) >= ${at}) break; await new Promise((q) => setTimeout(q, 5)); }`,
      30
    );
    await page.evaluate(`(async () => { const T = TT; while (T.isReloading()) await new Promise((q) => setTimeout(q, 50)); return 1; })()`, 120000);
  }

  await shot('vm-look-down', 'T.setOtsAimDbg(null, -0.9)', 2500);

  // Inspect TT.drawsOf(TT.marine) and every visible mesh of TT.marine in vm-look-down
  summary.lookDownProbe = await page.evaluate(`(() => {
    const T = TT;
    const THREE = T.THREE || window.THREE;
    const cam = T.camera || window.camera;
    const vm = T.viewmodelDbg && T.viewmodelDbg();
    cam.updateMatrixWorld(true);
    const camInv = cam.matrixWorld.clone().invert();
    const projMat = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, camInv);

    const drawsOfMarine = T.drawsOf ? T.drawsOf(T.marine) : null;

    const pathOf = (o) => {
      const parts = [];
      for (let p = o; p && p !== T.scene; p = p.parent) {
        parts.unshift((p.name || p.type) + (p === T.marine ? '[TT.marine]' : ''));
      }
      return parts.join(' > ');
    };

    const marineMeshes = [];
    T.marine.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      let visChain = true;
      for (let p = o; p; p = p.parent) if (!p.visible) { visChain = false; break; }
      const eyeHid = !!(o.userData && o.userData.vmEyeHide);
      o.updateWorldMatrix(true, false);
      const pa = o.geometry.attributes.position;
      const v = new THREE.Vector3(), vc = new THREE.Vector3(), vn = new THREE.Vector3();
      let onScreenVerts = 0;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
      let camMinY = Infinity, camMaxY = -Infinity, camMinZ = Infinity, camMaxZ = -Infinity;
      const step = Math.max(1, Math.floor(pa.count / 500));
      for (let i = 0; i < pa.count; i += step) {
        v.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(o.matrixWorld);
        vc.copy(v).applyMatrix4(camInv);
        // In camera space, -Z is forward
        if (vc.z < -0.01) {
          vn.copy(v).applyMatrix4(projMat);
          if (Math.abs(vn.x) <= 1.05 && Math.abs(vn.y) <= 1.05) {
            onScreenVerts++;
            minX = Math.min(minX, vn.x); maxX = Math.max(maxX, vn.x);
            minY = Math.min(minY, vn.y); maxY = Math.max(maxY, vn.y);
            minZ = Math.min(minZ, -vc.z); maxZ = Math.max(maxZ, -vc.z);
            camMinY = Math.min(camMinY, vc.y); camMaxY = Math.max(camMaxY, vc.y);
            camMinZ = Math.min(camMinZ, vc.z); camMaxZ = Math.max(camMaxZ, vc.z);
          }
        }
      }
      marineMeshes.push({
        name: o.name || '(unnamed)',
        parentName: o.parent ? (o.parent.name || o.parent.type) : null,
        grandParentName: o.parent && o.parent.parent ? (o.parent.parent.name || o.parent.parent.type) : null,
        path: pathOf(o),
        visChain,
        eyeHid,
        drawnInEyePass: visChain && !eyeHid,
        verts: pa.count,
        onScreenVerts,
        ndcBox: onScreenVerts > 0 ? {
          x: [+minX.toFixed(3), +maxX.toFixed(3)],
          y: [+minY.toFixed(3), +maxY.toFixed(3)],
          dist: [+minZ.toFixed(3), +maxZ.toFixed(3)],
        } : null,
        userDataKeys: Object.keys(o.userData || {}),
        rigSplit: !!(o.userData && o.userData.rigSplit),
        matName: o.material ? (o.material.name || o.material.type) : null,
        matColor: o.material && o.material.color ? '#' + o.material.color.getHexString() : null,
      });
    });

    // Also inspect rigSkin internal structure if present
    const ud = T.marine.userData || {};
    const rigInfo = ud.rigSkin ? {
      bakes: ud.rigSkin.bakes,
      keys: Object.keys(ud.rigSkin),
      skins: (ud.rigSkin.skins || []).map((s, idx) => ({
        idx,
        name: s.name,
        rigSplit: !!(s.userData && s.userData.rigSplit),
        vmEyeHide: !!(s.userData && s.userData.vmEyeHide),
        userData: s.userData,
        verts: s.geometry && s.geometry.attributes.position ? s.geometry.attributes.position.count : 0,
        matName: s.material ? (s.material.name || s.material.type) : null,
      })),
    } : null;

    // Also inspect hidden source meshes under TT.marine (those with visible === false because rigSkin baked them)
    // and check which ones project onto the screen at pitch = -0.9!
    const bakedSourceCandidates = [];
    T.marine.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      if (o.name === 'rig-skin') return;
      o.updateWorldMatrix(true, false);
      const pa = o.geometry.attributes.position;
      const v = new THREE.Vector3(), vc = new THREE.Vector3(), vn = new THREE.Vector3();
      let onScreenVerts = 0;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
      const step = Math.max(1, Math.floor(pa.count / 200));
      for (let i = 0; i < pa.count; i += step) {
        v.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(o.matrixWorld);
        vc.copy(v).applyMatrix4(camInv);
        if (vc.z < -0.01) {
          vn.copy(v).applyMatrix4(projMat);
          if (Math.abs(vn.x) <= 1.05 && Math.abs(vn.y) <= 1.05) {
            onScreenVerts++;
            minX = Math.min(minX, vn.x); maxX = Math.max(maxX, vn.x);
            minY = Math.min(minY, vn.y); maxY = Math.max(maxY, vn.y);
            minZ = Math.min(minZ, -vc.z); maxZ = Math.max(maxZ, -vc.z);
          }
        }
      }
      if (onScreenVerts > 0) {
        bakedSourceCandidates.push({
          name: o.name || '(unnamed)',
          parentName: o.parent ? (o.parent.name || o.parent.type) : null,
          path: pathOf(o),
          selfVisible: o.visible,
          eyeHid: !!(o.userData && o.userData.vmEyeHide),
          verts: pa.count,
          onScreenVerts,
          ndcBox: {
            x: [+minX.toFixed(3), +maxX.toFixed(3)],
            y: [+minY.toFixed(3), +maxY.toFixed(3)],
            dist: [+minZ.toFixed(3), +maxZ.toFixed(3)],
          },
          matColor: o.material && o.material.color ? '#' + o.material.color.getHexString() : null,
        });
      }
    });

    return {
      drawsOfMarine,
      drawnOnScreenMeshes: marineMeshes.filter((m) => m.drawnInEyePass && m.onScreenVerts > 0),
      allDrawnMeshes: marineMeshes.filter((m) => m.drawnInEyePass),
      rigInfo,
      bakedSourceCandidates,
    };
  })()`);

  await shot('vm-look-up', 'T.setOtsAimDbg(null, 0.5)', 2500);
  await shot('vm-turn', 'T.setOtsAimDbg(null, 0); for (let i = 0; i < 6; i++) { T.otsLook && T.otsLook(-160, 0); await new Promise((r) => setTimeout(r, 30)); }', 60);

  fs.writeFileSync(path.join(OUT, 'ag172-summary.json'), JSON.stringify(summary, null, 2));
} finally {
  await browser.close?.();
  server.close?.();
}
