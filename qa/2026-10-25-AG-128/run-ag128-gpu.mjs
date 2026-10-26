import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-10-25-AG-128');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
      g.fillStyle = 'rgba(0,0,0,0.68)';
      g.fillRect(x, y + th - 26, tw, 26);
      g.fillStyle = '#f2ead7';
      g.font = 'bold 14px Consolas, monospace';
      g.fillText(items[idx].label, x + 8, y + th - 8);
    }
    return c.toDataURL('image/jpeg', 0.90).split(',')[1];
  })(${JSON.stringify(payload)}, ${cols}, ${tw})`, 120000);
  fs.writeFileSync(outPath, Buffer.from(jpgB64, 'base64'));
}

async function main() {
  const report = { ts: new Date().toISOString() };
  const srv = await serve(ROOT, 0);
  let browser = null;
  try {
    browser = await launch({
      headless: false,
      args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1600,900']
    });
    const page = await browser.newPage({ width: 1600, height: 900 });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
    } catch {}

    await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
    await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 120000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); else { const b = document.getElementById('openingSkip'); if (b) b.click(); } return true; })()`);
      await sleep(300);
    }
    await page.waitFor('!!window.TT', { timeout: 400000 });
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
    await sleep(600);

    // Start match and install CamRig
    await page.evaluate(`(async () => {
      const T = window.TT;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'Camera';
      const play = document.getElementById('modeHunt');
      if (play) play.click();
      const firstRun = document.getElementById('firstRunCard');
      const playAnyway = document.getElementById('firstRunPlay');
      if (firstRun && !firstRun.hidden && playAnyway) playAnyway.click();
      for (let i = 0; i < 80; i++) {
        await wait(200);
        if (T.getPhase && T.getPhase() === 'prep') break;
      }
      await wait(300);
      for (let i = 0; i < 600; i++) {
        if (!document.body.classList.contains('deploying')) break;
        await wait(100);
      }
      await wait(300);
      await import('/tools/camera-rig.js').then((m) => { window.CamRig = m.install(); });
      T.clearZombies && T.clearZombies();
      T.runDevCommand && T.runDevCommand('godmode');
      T.setWeather && T.setWeather('clear', 0);
      T.setDayNight && T.setDayNight(0.35);
      const gy = T.sampleHeight(0, 18);
      T.player.position.set(0, gy, 18);
      T.player.rotation.set(0, 0, 0);
      if (T.setLookAngles) T.setLookAngles(0, 0);
      return true;
    })()`, 180000);
    await sleep(400);

    // Install measurement helper in page
    await page.evaluate(`(() => {
      window.__measureBlade = async (heavy, u, useFirstPerson) => {
        const T = window.TT, D = T.handsDbg, THREE = T.THREE;
        T.setMacheteOwned(!!heavy);
        T.setKatanaOwned(false);
        T.setViewFirstDbg(Boolean(useFirstPerson));
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 20));
          const curFp = T.fpDbg ? T.fpDbg() : null;
          if (useFirstPerson ? (curFp && curFp.w > 0.95) : (curFp && curFp.w < 0.05)) break;
        }
        const m = T.getMarine(), ud = m.userData, P = T.player.position;
        // Rest reference at u = 0
        T.setKnifeCd(0);
        T.knifeAttack();
        D.knifeHold(0);
        let s0 = T.getSimTime();
        while (T.getSimTime() - s0 < 0.12) await new Promise((r) => setTimeout(r, 20));
        m.updateMatrixWorld(true);
        const yaw0 = ud.torsoG.rotation.y;
        const pitch0 = ud.torsoG.rotation.x;
        const roll0 = ud.torsoG.rotation.z;

        // Hold at target u
        T.setKnifeCd(0);
        T.knifeAttack();
        D.knifeHold(u);
        s0 = T.getSimTime();
        while (T.getSimTime() - s0 < 0.15) await new Promise((r) => setTimeout(r, 20));
        m.updateMatrixWorld(true);

        const f = new THREE.Vector3(0, 0, 1).applyQuaternion(T.player.getWorldQuaternion(new THREE.Quaternion()));
        f.y = 0; f.normalize();
        const left = new THREE.Vector3(f.z, 0, -f.x);

        const sh = ud.armLG.getWorldPosition(new THREE.Vector3());
        const el = ud.elbowLG.getWorldPosition(new THREE.Vector3());
        const fist = ud.elbowLG.localToWorld(D.HAND_L.clone());
        const K = D.knife();
        const tg = K && K.places && K.places.out ? K.places.out.clone() : null;
        const fullArmLen = sh.distanceTo(el) + el.distanceTo(fist);
        const shToFist = sh.distanceTo(fist);
        const armStraightPct = fullArmLen > 0 ? (shToFist / fullArmLen) * 100 : 0;
        const offPointCm = tg ? fist.distanceTo(tg) * 100 : -1;

        const shOut = sh.clone().sub(P).dot(f);
        const shRight = -sh.clone().sub(P).dot(left);
        const shUp = sh.y - P.y;

        const fistOut = fist.clone().sub(P).dot(f);
        const fistRight = -fist.clone().sub(P).dot(left);
        const fistUp = fist.y - P.y;

        const tgOut = tg ? tg.clone().sub(P).dot(f) : 0;
        const tgRight = tg ? -tg.clone().sub(P).dot(left) : 0;
        const tgUp = tg ? tg.y - P.y : 0;

        const chestTurnRad = ud.torsoG.rotation.y - yaw0;
        const chestLeanRad = ud.torsoG.rotation.x - pitch0;
        const chestRollRad = ud.torsoG.rotation.z - roll0;

        return {
          heavy: !!heavy,
          u,
          viewFirst: !!(T.fpDbg && T.fpDbg().first),
          otsW: T.fpDbg ? +T.fpDbg().w.toFixed(3) : 0,
          chestTurnRad: +chestTurnRad.toFixed(3),
          chestTurnDeg: +(chestTurnRad * 180 / Math.PI).toFixed(1),
          chestLeanRad: +chestLeanRad.toFixed(3),
          chestLeanDeg: +(chestLeanRad * 180 / Math.PI).toFixed(1),
          chestRollDeg: +(chestRollRad * 180 / Math.PI).toFixed(1),
          shOutM: +shOut.toFixed(3),
          shRightM: +shRight.toFixed(3),
          shUpM: +shUp.toFixed(3),
          fistOutM: +fistOut.toFixed(3),
          fistRightM: +fistRight.toFixed(3),
          fistUpM: +fistUp.toFixed(3),
          tgOutM: +tgOut.toFixed(3),
          tgRightM: +tgRight.toFixed(3),
          tgUpM: +tgUp.toFixed(3),
          armStraightPct: +armStraightPct.toFixed(1),
          offPointCm: +offPointCm.toFixed(2),
          shToTargetM: tg ? +sh.distanceTo(tg).toFixed(3) : -1
        };
      };
      return true;
    })()`);

    // 1. KNIFE STAB (Third person: front & right; First person: from his eyes)
    await page.evaluate(`window.CamRig && window.CamRig.ui && window.CamRig.ui(false)`);
    const knifeUs = [
      { u: 0.14, tag: '0-cock' },
      { u: 0.30, tag: '1-drive' },
      { u: 0.40, tag: '2-stab' },
      { u: 0.58, tag: '3-cut' }
    ];
    const knifeMeasurements3P = [];
    for (const { u, tag } of knifeUs) {
      const m = await page.evaluate(`window.__measureBlade(false, ${u}, false)`);
      knifeMeasurements3P.push(m);

      // Front view (marine faces +Z)
      await page.evaluate(`(() => {
        const P = window.TT.player.position;
        window.TT.setShotView({ x: P.x + 0.15, y: P.y + 1.25, z: P.z + 2.05, tx: P.x, ty: P.y + 1.08, tz: P.z + 0.25, fov: 42 });
      })()`);
      await sleep(70);
      await page.screenshot(path.join(OUT_DIR, `cl261p2-knife-front-${tag}.png`));

      // Right view (the knife's side: marine faces +Z, his right is -X)
      await page.evaluate(`(() => {
        const P = window.TT.player.position;
        window.TT.setShotView({ x: P.x - 2.05, y: P.y + 1.20, z: P.z + 0.30, tx: P.x, ty: P.y + 1.08, tz: P.z + 0.30, fov: 42 });
      })()`);
      await sleep(70);
      await page.screenshot(path.join(OUT_DIR, `cl261p2-knife-right-${tag}.png`));
    }

    // First-person from his eyes (release ShotView so real game first-person camera renders)
    await page.evaluate(`(() => { window.TT.setShotView(null); window.CamRig && window.CamRig.ui && window.CamRig.ui(true); })()`);
    const knifeMeasurementsFP = [];
    for (const { u, tag } of knifeUs) {
      const m = await page.evaluate(`window.__measureBlade(false, ${u}, true)`);
      knifeMeasurementsFP.push(m);
      await sleep(70);
      await page.screenshot(path.join(OUT_DIR, `cl261p2-knife-fp-${tag}.png`));
    }

    // Play-speed unheld knife stab at 60 fps in 3P and FP
    const knifePlaySpeed = await page.evaluate(`(async () => {
      const T = window.TT, D = T.handsDbg, THREE = T.THREE;
      D.knifeHold(null);
      const runLive = async (useFP) => {
        T.setViewFirstDbg(Boolean(useFP));
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 20));
          const curFp = T.fpDbg ? T.fpDbg() : null;
          if (useFP ? (curFp && curFp.w > 0.95) : (curFp && curFp.w < 0.05)) break;
        }
        const m = T.getMarine(), ud = m.userData, P = T.player.position;
        const yaw0 = ud.torsoG.rotation.y;
        const camQ0 = T.camera.quaternion.clone();
        T.setKnifeCd(0);
        T.knifeAttack();
        const frames = [];
        for (let fIdx = 0; fIdx < 22; fIdx++) {
          await new Promise((r) => requestAnimationFrame(r));
          m.updateMatrixWorld(true);
          const f = new THREE.Vector3(0, 0, 1).applyQuaternion(T.player.getWorldQuaternion(new THREE.Quaternion()));
          f.y = 0; f.normalize();
          const sh = ud.armLG.getWorldPosition(new THREE.Vector3());
          const fist = ud.elbowLG.localToWorld(D.HAND_L.clone());
          const camAngleDeg = T.camera.quaternion.angleTo(camQ0) * 180 / Math.PI;
          frames.push({
            f: fIdx,
            chestTurnDeg: +((ud.torsoG.rotation.y - yaw0) * 180 / Math.PI).toFixed(1),
            shOutCm: +(sh.clone().sub(P).dot(f) * 100).toFixed(1),
            fistOutCm: +(fist.clone().sub(P).dot(f) * 100).toFixed(1),
            fistUpCm: +((fist.y - P.y) * 100).toFixed(1),
            camAngleDeg: +camAngleDeg.toFixed(3)
          });
        }
        return {
          useFP,
          minTurnDeg: Math.min(...frames.map((x) => x.chestTurnDeg)),
          maxTurnDeg: Math.max(...frames.map((x) => x.chestTurnDeg)),
          maxFistOutCm: Math.max(...frames.map((x) => x.fistOutCm)),
          maxShOutCm: Math.max(...frames.map((x) => x.shOutCm)),
          maxCamAngleDeg: Math.max(...frames.map((x) => x.camAngleDeg)),
          frames
        };
      };
      const res3P = await runLive(false);
      const resFP = await runLive(true);
      T.setViewFirstDbg(false);
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 20));
        if (T.fpDbg && T.fpDbg().w < 0.05) break;
      }
      return { res3P, resFP };
    })()`);

    // 2. MACHETE CHOP (Third person: front & right; First person: from his eyes)
    await page.evaluate(`window.CamRig && window.CamRig.ui && window.CamRig.ui(false)`);
    const macheteUs = [
      { u: 0.16, tag: '0-wind1' },
      { u: 0.36, tag: '1-windPeak' },
      { u: 0.48, tag: '2-midChop' },
      { u: 0.58, tag: '3-chopEnd' }
    ];
    const macheteMeasurements3P = [];
    for (const { u, tag } of macheteUs) {
      const m = await page.evaluate(`window.__measureBlade(true, ${u}, false)`);
      macheteMeasurements3P.push(m);

      // Front view
      await page.evaluate(`(() => {
        const P = window.TT.player.position;
        window.TT.setShotView({ x: P.x + 0.15, y: P.y + 1.30, z: P.z + 2.15, tx: P.x, ty: P.y + 1.12, tz: P.z + 0.20, fov: 42 });
      })()`);
      await sleep(70);
      await page.screenshot(path.join(OUT_DIR, `cl261p2-machete-front-${tag}.png`));

      // Right view (the blade's side)
      await page.evaluate(`(() => {
        const P = window.TT.player.position;
        window.TT.setShotView({ x: P.x - 2.15, y: P.y + 1.25, z: P.z + 0.25, tx: P.x, ty: P.y + 1.12, tz: P.z + 0.25, fov: 42 });
      })()`);
      await sleep(70);
      await page.screenshot(path.join(OUT_DIR, `cl261p2-machete-right-${tag}.png`));
    }

    // Machete first person from his eyes
    await page.evaluate(`(() => { window.TT.setShotView(null); window.CamRig && window.CamRig.ui && window.CamRig.ui(true); })()`);
    const macheteMeasurementsFP = [];
    for (const { u, tag } of macheteUs) {
      const m = await page.evaluate(`window.__measureBlade(true, ${u}, true)`);
      macheteMeasurementsFP.push(m);
      await sleep(70);
      await page.screenshot(path.join(OUT_DIR, `cl261p2-machete-fp-${tag}.png`));
    }

    await page.evaluate(`(() => {
      window.TT.handsDbg.knifeHold(null);
      window.TT.setViewFirstDbg(false);
    })()`);

    report.knife3P = knifeMeasurements3P;
    report.knifeFP = knifeMeasurementsFP;
    report.knifePlaySpeed = knifePlaySpeed;
    report.machete3P = macheteMeasurements3P;
    report.macheteFP = macheteMeasurementsFP;

    fs.writeFileSync(path.join(OUT_DIR, 'ag128-report.json'), JSON.stringify(report, null, 2));

    // Build contact sheet inside browser canvas
    await makeSheet(
      page,
      [
        ...[0, 1, 2, 3].map((i) => ({
          file: path.join(OUT_DIR, `cl261p2-knife-front-${knifeUs[i].tag}.png`),
          label: `Knife Front u=${knifeUs[i].u}`
        })),
        ...[0, 1, 2, 3].map((i) => ({
          file: path.join(OUT_DIR, `cl261p2-knife-right-${knifeUs[i].tag}.png`),
          label: `Knife Right u=${knifeUs[i].u}`
        })),
        ...[0, 1, 2, 3].map((i) => ({
          file: path.join(OUT_DIR, `cl261p2-knife-fp-${knifeUs[i].tag}.png`),
          label: `Knife Eyes (FP) u=${knifeUs[i].u}`
        })),
        ...[0, 1, 2, 3].map((i) => ({
          file: path.join(OUT_DIR, `cl261p2-machete-front-${macheteUs[i].tag}.png`),
          label: `Machete Front u=${macheteUs[i].u}`
        })),
        ...[0, 1, 2, 3].map((i) => ({
          file: path.join(OUT_DIR, `cl261p2-machete-right-${macheteUs[i].tag}.png`),
          label: `Machete Right u=${macheteUs[i].u}`
        })),
        ...[0, 1, 2, 3].map((i) => ({
          file: path.join(OUT_DIR, `cl261p2-machete-fp-${macheteUs[i].tag}.png`),
          label: `Machete Eyes (FP) u=${macheteUs[i].u}`
        }))
      ],
      path.join(OUT_DIR, 'cl261-part2-blades-sheet.jpg'),
      4,
      480
    );

    console.log('AG-128 GPU capture complete.');
  } finally {
    if (browser) await browser.close().catch(() => {});
    srv.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
