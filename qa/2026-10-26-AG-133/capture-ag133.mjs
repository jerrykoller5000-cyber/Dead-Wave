// AG-133 GPU verification of CL-269 (The blades from his eyes on the GPU at play speed):
// 1. First-person held key moments (cock, drive, stab/chop, cut) for Knife, Machete, and Katana
//    with Pistol drawn and with a Long Gun (M4) drawn, plus unswung baseline (gun dip comparison).
// 2. First-person unheld play-speed 60 fps trajectories & filmstrips (0.22 s knife stab,
//    0.40 s machete chop, 0.30 s katana cut) with Pistol and with M4 drawn.
// 3. Third-person Front & Right verification of Knife and Machete (confirming 3P swing is unchanged).
// 4. Runs t299, t195, t296, t297 on the real WebGPU renderer.
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

const out = 'qa/2026-10-26-AG-133';
fs.mkdirSync(out, { recursive: true });

async function makeSheet(page, tiles, outPath, cols = 4, tw = 480) {
  const payload = tiles.map((t) => ({
    label: t.label,
    data: fs.readFileSync(t.file).toString('base64')
  }));
  const jpgB64 = await page.evaluate(`(async (items, cols, tw) => {
    const load = (d) => new Promise((r) => {
      const i = new Image();
      i.onload = () => r(i);
      i.onerror = () => r(null);
      i.src = 'data:image/png;base64,' + d;
    });
    const imgs = await Promise.all(items.map((x) => load(x.data)));
    const first = imgs.find(Boolean);
    const th = first ? Math.round(tw * first.height / first.width) : Math.round(tw * 9 / 16);
    const rows = Math.ceil(items.length / cols);
    const c = document.createElement('canvas');
    c.width = cols * tw;
    c.height = rows * th;
    const g = c.getContext('2d');
    g.fillStyle = '#111';
    g.fillRect(0, 0, c.width, c.height);
    for (let idx = 0; idx < items.length; idx++) {
      const col = idx % cols, row = Math.floor(idx / cols);
      const x = col * tw, y = row * th;
      const im = imgs[idx];
      if (im) g.drawImage(im, x, y, tw, th);
      g.fillStyle = 'rgba(0,0,0,0.72)';
      g.fillRect(x, y + th - 26, tw, 26);
      g.fillStyle = '#f2ead7';
      g.font = 'bold 13px Consolas, monospace';
      g.fillText(items[idx].label, x + 8, y + th - 8);
    }
    return c.toDataURL('image/jpeg', 0.92).split(',')[1];
  })(${JSON.stringify(payload)}, ${cols}, ${tw})`, 120000);
  fs.writeFileSync(outPath, Buffer.from(jpgB64, 'base64'));
}

const e = new Engine({ match: true, warm: 'none', size: [1280, 720] });

try {
  await e.open();

  // Prepare clean daylight test arena in front of HQ and install measurement helpers
  await e.page.evaluate(`(async () => {
    const T = window.TT, D = T.handsDbg, THREE = T.THREE;
    T.runDevCommand('godmode');
    T.clearZombies();
    T.grantAllWeapons();
    T.weather.raining = false;
    T.weather.intensity = 0;
    T.setWorldTime(0.42);
    const gy = T.sampleHeight(0, 18);
    T.player.position.set(0, gy, 18);
    T.player.rotation.set(0, 0, 0);
    T.setAimYawDbg(0);
    T.setAimTargetDbg(0, 28);
    for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);

    // Helper to project a world point into first-person view space (screen x right, y up; -1..1 is viewport edge)
    window.__projectFP = (p) => {
      const o = T.otsDbg(), y = o.yaw, pi = o.pitch, cp = Math.cos(pi);
      const E = T.fpDbg().eye || T.camera.position;
      const F = new THREE.Vector3(Math.sin(y) * cp, Math.sin(pi), Math.cos(y) * cp);
      const R = new THREE.Vector3(-Math.cos(y), 0, Math.sin(y));
      const U = new THREE.Vector3().crossVectors(R, F).normalize();
      const v = p.clone().sub(E), z = v.dot(F);
      const t = Math.tan((T.camera.fov || 60) * Math.PI / 360);
      const asp = T.camera.aspect || (16 / 9);
      const absZ = Math.max(0.05, Math.abs(z)) * (z < 0 ? -1 : 1);
      return {
        x: +(v.dot(R) / absZ / (t * asp)).toFixed(3),
        y: +(v.dot(U) / absZ / t).toFixed(3),
        z: +z.toFixed(3),
        dist: +v.length().toFixed(3)
      };
    };

    // Helper to find blade tip in world space from live visible meshes under knife group
    window.__bladeTipWorld = () => {
      const k = T.knifeMesh();
      k.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(k.matrixWorld).invert();
      const m = new THREE.Matrix4(), v = new THREE.Vector3();
      let maxZ = 0.25, bestLocal = new THREE.Vector3(0, 0, 0.25);
      k.traverse((o) => {
        if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
        for (let p = o; p && p !== k; p = p.parent) if (!p.visible) return;
        m.multiplyMatrices(inv, o.matrixWorld);
        const P = o.geometry.attributes.position;
        for (let i = 0; i < P.count; i++) {
          v.fromBufferAttribute(P, i).applyMatrix4(m);
          if (v.z > maxZ) {
            maxZ = v.z;
            bestLocal.copy(v);
          }
        }
      });
      return k.localToWorld(bestLocal.clone());
    };

    // Helper to find top-most screen Y of the active held firearm in first person
    window.__gunScreenBounds = (gunKey) => {
      const gun = T.weaponMeshes[gunKey];
      if (!gun) return null;
      gun.updateMatrixWorld(true);
      const v = new THREE.Vector3();
      let maxY = -99, minY = 99, minX = 99, maxX = -99;
      gun.traverse((o) => {
        if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
        for (let p = o; p && p !== gun; p = p.parent) if (!p.visible) return;
        const P = o.geometry.attributes.position;
        for (let i = 0; i < P.count; i += 3) {
          v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld);
          const pr = window.__projectFP(v);
          if (pr.z > 0.05) {
            if (pr.y > maxY) maxY = pr.y;
            if (pr.y < minY) minY = pr.y;
            if (pr.x < minX) minX = pr.x;
            if (pr.x > maxX) maxX = pr.x;
          }
        }
      });
      return { topY: +maxY.toFixed(3), botY: +minY.toFixed(3), leftX: +minX.toFixed(3), rightX: +maxX.toFixed(3) };
    };

    // Helper to set blade kind ('knife' | 'machete' | 'katana') and gun ('pistol' | 'm4')
    window.__configureLoadout = (bladeKind, gunKey, useFP) => {
      T.setMacheteOwned(bladeKind === 'machete');
      T.setKatanaOwned(bladeKind === 'katana');
      const idx = T.WEAPON_ORDER.indexOf(gunKey);
      if (idx >= 0 && T.getCurrentWeapon() !== gunKey) T.setWeapon(idx);
      T.setShotView(null);
      T.setViewFirstDbg(Boolean(useFP));
      const gy2 = T.sampleHeight(0, 18);
      T.player.position.set(0, gy2, 18);
      T.player.rotation.set(0, 0, 0);
      T.setAimYawDbg(0);
      T.setAimTargetDbg(0, 28);
      D.knifeHold(null);
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      if (useFP) {
        const cur = T.otsDbg();
        T.otsLook(-cur.yaw / 0.0022, cur.pitch / 0.0022);
        for (let i = 0; i < 15; i++) T.stepFrame(1 / 60);
      }
    };

    // Measure current frame state (works for both held u and live play-speed stepping)
    window.__readBladeFrame = (bladeKind, gunKey, uLabel) => {
      const m = T.getMarine(), ud = m.userData, P = T.player.position;
      m.updateMatrixWorld(true);
      const sh = ud.armLG.getWorldPosition(new THREE.Vector3());
      const el = ud.elbowLG.getWorldPosition(new THREE.Vector3());
      const fist = D.gripPoint('L', new THREE.Vector3());
      const tip = T.knifeMesh().visible ? window.__bladeTipWorld() : fist.clone();
      const E = (T.fpDbg && T.fpDbg().eye) || T.camera.position;

      // Nearest distance from upper-arm / forearm segments to the eye
      let armNearEyeM = 99;
      for (const a of [0, 0.25, 0.5, 0.75, 1]) {
        const p1 = sh.clone().lerp(el, a);
        const p2 = el.clone().lerp(fist, a);
        armNearEyeM = Math.min(armNearEyeM, p1.distanceTo(E), p2.distanceTo(E));
      }

      const fullArmLen = sh.distanceTo(el) + el.distanceTo(T.handsDbg.HAND_L ? ud.elbowLG.localToWorld(D.HAND_L.clone()) : fist);
      const shToFist = sh.distanceTo(ud.elbowLG.localToWorld(D.HAND_L.clone()));
      const armStraightPct = fullArmLen > 0 ? (shToFist / fullArmLen) * 100 : 0;

      const f = new THREE.Vector3(0, 0, 1).applyQuaternion(T.player.getWorldQuaternion(new THREE.Quaternion()));
      f.y = 0; f.normalize();
      const left = new THREE.Vector3(f.z, 0, -f.x);

      return {
        blade: bladeKind,
        gun: gunKey,
        u: uLabel,
        liveU: +D.knife().u.toFixed(3),
        knifeVisible: T.knifeMesh().visible,
        fpW: +(T.fpDbg().w || 0).toFixed(3),
        fpBladeDip: +D.fpBladeDip().toFixed(3),
        fistScreen: window.__projectFP(fist),
        tipScreen: window.__projectFP(tip),
        armNearEyeM: +armNearEyeM.toFixed(3),
        armStraightPct: +armStraightPct.toFixed(1),
        gunBounds: window.__gunScreenBounds(gunKey),
        shOutM: +sh.clone().sub(P).dot(f).toFixed(3),
        fistOutM: +fist.clone().sub(P).dot(f).toFixed(3),
        fistRightM: +(-fist.clone().sub(P).dot(left)).toFixed(3),
        fistUpM: +(fist.y - P.y).toFixed(3),
        torsoYawDeg: +(ud.torsoG.rotation.y * 180 / Math.PI).toFixed(1),
        torsoPitchDeg: +(ud.torsoG.rotation.x * 180 / Math.PI).toFixed(1)
      };
    };

    window.__holdAndMeasure = (bladeKind, gunKey, u, useFP) => {
      window.__configureLoadout(bladeKind, gunKey, useFP);
      const m = T.getMarine(), ud = m.userData;
      // Record rest torso angles at u=0
      T.setKnifeCd(0);
      T.knifeAttack();
      D.knifeHold(0);
      for (let i = 0; i < 8; i++) T.stepFrame(1 / 60);
      m.updateMatrixWorld(true);
      const yaw0 = ud.torsoG.rotation.y, pitch0 = ud.torsoG.rotation.x;

      if (u === null) {
        D.knifeHold(null);
        for (let i = 0; i < 35; i++) T.stepFrame(1 / 60);
      } else {
        T.setKnifeCd(0);
        T.knifeAttack();
        D.knifeHold(u);
        for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
      }
      const res = window.__readBladeFrame(bladeKind, gunKey, u === null ? 'rest' : u);
      res.chestTurnDeg = +((ud.torsoG.rotation.y - yaw0) * 180 / Math.PI).toFixed(1);
      res.chestLeanDeg = +((ud.torsoG.rotation.x - pitch0) * 180 / Math.PI).toFixed(1);
      return res;
    };
  })()`);

  const report = {
    task: 'AG-133',
    renderer: e.renderer,
    fpHeld: {},
    fpPlaySpeed: {},
    tpVerify: {},
    tests: {}
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 1. FIRST-PERSON HELD KEY MOMENTS (Pistol & M4; Knife, Machete, Katana)
  // ──────────────────────────────────────────────────────────────────────────
  const heldConfigs = [
    {
      blade: 'knife',
      moments: [
        { u: null, tag: '0-rest', label: 'Rest (unswung)' },
        { u: 0.14, tag: '1-cock', label: 'u=0.14 Cock' },
        { u: 0.30, tag: '2-drive', label: 'u=0.30 Drive' },
        { u: 0.40, tag: '3-stab', label: 'u=0.40 Stab' },
        { u: 0.58, tag: '4-cut', label: 'u=0.58 Cut' }
      ]
    },
    {
      blade: 'machete',
      moments: [
        { u: 0.16, tag: '1-wind', label: 'u=0.16 Wind-up' },
        { u: 0.36, tag: '2-cock', label: 'u=0.36 Raised' },
        { u: 0.47, tag: '3-chop', label: 'u=0.47 Mid-chop' },
        { u: 0.58, tag: '4-cut', label: 'u=0.58 Cut end' }
      ]
    },
    {
      blade: 'katana',
      moments: [
        { u: 0.36, tag: '1-cock', label: 'u=0.36 Raised' },
        { u: 0.47, tag: '2-chop', label: 'u=0.47 Mid-cut' },
        { u: 0.58, tag: '3-cut', label: 'u=0.58 Cut end' }
      ]
    }
  ];

  const heldTiles = [];
  for (const gun of ['pistol', 'm4']) {
    for (const cfg of heldConfigs) {
      const key = `${cfg.blade}_${gun}`;
      report.fpHeld[key] = [];
      for (const m of cfg.moments) {
        const data = await e.page.evaluate(`window.__holdAndMeasure(${JSON.stringify(cfg.blade)}, ${JSON.stringify(gun)}, ${JSON.stringify(m.u)}, true)`);
        const file = `${out}/fp-held-${cfg.blade}-${gun}-${m.tag}.png`;
        await e.page.screenshot(file);
        report.fpHeld[key].push({ ...data, file });
        if (m.u !== null) {
          heldTiles.push({
            file,
            label: `1P ${cfg.blade.toUpperCase()} + ${gun.toUpperCase()} ${m.label} (dip=${data.fpBladeDip})`
          });
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. FIRST-PERSON UNHELD PLAY-SPEED SWINGS (60 fps stepping, 0.22s / 0.40s / 0.30s)
  // ──────────────────────────────────────────────────────────────────────────
  const playConfigs = [
    { blade: 'knife', gun: 'pistol', dur: 0.22, totalFrames: 15, shotFrames: [1, 3, 5, 7, 9, 12] },
    { blade: 'knife', gun: 'm4', dur: 0.22, totalFrames: 15, shotFrames: [1, 3, 5, 7, 9, 12] },
    { blade: 'machete', gun: 'pistol', dur: 0.40, totalFrames: 25, shotFrames: [2, 6, 9, 11, 14, 19] },
    { blade: 'machete', gun: 'm4', dur: 0.40, totalFrames: 25, shotFrames: [2, 6, 9, 11, 14, 19] },
    { blade: 'katana', gun: 'pistol', dur: 0.30, totalFrames: 19, shotFrames: [2, 5, 7, 9, 11, 15] },
    { blade: 'katana', gun: 'm4', dur: 0.30, totalFrames: 19, shotFrames: [2, 5, 7, 9, 11, 15] }
  ];

  const playTiles = [];
  for (const pc of playConfigs) {
    const key = `${pc.blade}_${pc.gun}`;
    await e.page.evaluate(`(() => {
      window.__configureLoadout(${JSON.stringify(pc.blade)}, ${JSON.stringify(pc.gun)}, true);
      window.TT.handsDbg.knifeHold(null);
      window.TT.setKnifeCd(0);
      window.TT.knifeAttack();
    })()`);
    const frames = [];
    for (let f = 1; f <= pc.totalFrames; f++) {
      const fData = await e.page.evaluate(`(() => {
        window.TT.stepFrame(1 / 60);
        return window.__readBladeFrame(${JSON.stringify(pc.blade)}, ${JSON.stringify(pc.gun)}, 'frame-' + ${f});
      })()`);
      let file = null;
      if (pc.shotFrames.includes(f)) {
        file = `${out}/fp-play-${pc.blade}-${pc.gun}-f${String(f).padStart(2, '0')}.png`;
        await e.page.screenshot(file);
        if (pc.blade !== 'katana') {
          playTiles.push({
            file,
            label: `Play ${pc.blade.toUpperCase()}+${pc.gun.toUpperCase()} f${f} (u=${fData.liveU}, dip=${fData.fpBladeDip})`
          });
        }
      }
      frames.push({ frame: f, tMs: +(f * 1000 / 60).toFixed(1), ...fData, file });
    }
    report.fpPlaySpeed[key] = {
      durSec: pc.dur,
      minArmNearEyeM: Math.min(...frames.map((x) => x.armNearEyeM)),
      maxFpBladeDip: Math.max(...frames.map((x) => x.fpBladeDip)),
      minGunTopY: Math.min(...frames.map((x) => x.gunBounds ? x.gunBounds.topY : 0)),
      maxGunTopY: Math.max(...frames.map((x) => x.gunBounds ? x.gunBounds.topY : 0)),
      frames
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. THIRD-PERSON SWING VERIFICATION (Confirming 3P is unchanged from AG-128)
  // ──────────────────────────────────────────────────────────────────────────
  const tpTiles = [];
  const tpConfigs = [
    {
      blade: 'knife',
      moments: [
        { u: 0.14, tag: '0-cock' },
        { u: 0.30, tag: '1-drive' },
        { u: 0.40, tag: '2-stab' },
        { u: 0.58, tag: '3-cut' }
      ]
    },
    {
      blade: 'machete',
      moments: [
        { u: 0.16, tag: '0-wind1' },
        { u: 0.36, tag: '1-windPeak' },
        { u: 0.48, tag: '2-midChop' },
        { u: 0.58, tag: '3-chopEnd' }
      ]
    }
  ];

  for (const cfg of tpConfigs) {
    report.tpVerify[cfg.blade] = [];
    for (const m of cfg.moments) {
      const data = await e.page.evaluate(`window.__holdAndMeasure(${JSON.stringify(cfg.blade)}, 'pistol', ${m.u}, false)`);
      // Front shot
      await e.page.evaluate(`(() => {
        const P = window.TT.player.position;
        window.TT.setShotView({ x: P.x + 0.15, y: P.y + 1.25, z: P.z + 2.05, tx: P.x, ty: P.y + 1.08, tz: P.z + 0.25, fov: 42 });
      })()`);
      await e.page.evaluate(`(() => { for (let i = 0; i < 3; i++) window.TT.stepFrame(1 / 60); })()`);
      const frontFile = `${out}/tp-${cfg.blade}-front-${m.tag}.png`;
      await e.page.screenshot(frontFile);
      tpTiles.push({
        file: frontFile,
        label: `3P ${cfg.blade.toUpperCase()} Front u=${m.u} (turn=${data.chestTurnDeg}d, out=${data.fistOutM}m)`
      });

      // Right shot (blade side)
      await e.page.evaluate(`(() => {
        const P = window.TT.player.position;
        window.TT.setShotView({ x: P.x - 2.05, y: P.y + 1.20, z: P.z + 0.30, tx: P.x, ty: P.y + 1.08, tz: P.z + 0.30, fov: 42 });
      })()`);
      await e.page.evaluate(`(() => { for (let i = 0; i < 3; i++) window.TT.stepFrame(1 / 60); })()`);
      const rightFile = `${out}/tp-${cfg.blade}-right-${m.tag}.png`;
      await e.page.screenshot(rightFile);
      tpTiles.push({
        file: rightFile,
        label: `3P ${cfg.blade.toUpperCase()} Right u=${m.u} (lean=${data.chestLeanDeg}d, str=${data.armStraightPct}%)`
      });

      report.tpVerify[cfg.blade].push({ ...data, frontFile, rightFile });
    }
  }

  // Build contact sheets
  await makeSheet(e.page, heldTiles, path.join(out, 'cl269-fp-held-sheet.jpg'), 4, 420);
  await makeSheet(e.page, playTiles, path.join(out, 'cl269-fp-playspeed-sheet.jpg'), 6, 360);
  await makeSheet(e.page, tpTiles, path.join(out, 'cl269-3p-verify-sheet.jpg'), 4, 420);

  // Reset state before running tests
  await e.page.evaluate(`(() => {
    window.TT.setShotView(null);
    window.TT.handsDbg.knifeHold(null);
    window.TT.setViewFirstDbg(false);
    window.TT.setMacheteOwned(false);
    window.TT.setKatanaOwned(false);
    for (let i = 0; i < 15; i++) window.TT.stepFrame(1 / 60);
  })()`);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. RUN AUTOMATED TESTS (t299, t195, t296, t297)
  // ──────────────────────────────────────────────────────────────────────────
  const libCode = fs.readFileSync('tools/tests/lib.js', 'utf8');
  await e.page.evaluate(libCode);
  for (const tName of ['t299', 't195', 't296', 't297']) {
    const code = fs.readFileSync(`tools/tests/${tName}.js`, 'utf8');
    const res = await e.page.evaluate(code, 120000);
    const lines = String(res || '').split('\n').filter(Boolean);
    const pass = lines.filter((l) => l.startsWith('PASS ')).length;
    const fail = lines.filter((l) => l.startsWith('FAIL ')).length;
    report.tests[tName] = { pass, fail, lines };
    console.log(`${tName}: ${pass} pass, ${fail} fail`);
    if (fail > 0) console.error(lines.filter((l) => l.startsWith('FAIL ')).join('\n'));
  }

  report.errors = e.page.errors;
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log('Saved report to', `${out}/report.json`);
  if (report.errors.length || Object.values(report.tests).some((t) => t.fail > 0)) {
    process.exitCode = 1;
  }
} finally {
  await e.close();
}
