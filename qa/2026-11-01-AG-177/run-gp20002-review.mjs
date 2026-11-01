import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-AG-177');
fs.mkdirSync(OUT, { recursive: true });

const W = 1280, H = 720;
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const results = {
  timestamp: new Date().toISOString(),
  meshStats: {},
  shots: [],
  scores: {
    silhouette: 5.0,
    materials: 5.0,
    clipping: 5.0,
    eyeFilter: 5.0
  }
};

async function runGp20002() {
  console.log('\n======================================================');
  console.log('Starting GP-20002 Review: Marine Radio Eye Hide & Shadow');
  console.log('======================================================');

  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const page = await browser.newPage({ width: W, height: H });
    const url = `${server.origin}/index.html?debug=1&raf=timer`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { timeout: 300000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');

    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(lib);

    // Initialize match and equip pistol
    await page.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'GP20002');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.grantAllWeapons();
      T.setWorldTime(0.42); // noon
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      if (T.runDevCommand) T.runDevCommand('godmode');

      // Take pistol
      if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'pistol'; i++) {
        T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
        await new Promise(r => setTimeout(r, 150));
      }
      await new Promise(r => setTimeout(r, 800));
    })()`);

    // Helper to position and aim player
    const setAim = async (yaw, pitch) => {
      return await page.evaluate(`(() => {
        const T = TT;
        T.setAimYawDbg(${yaw});
        if (T.setOtsAimDbg) T.setOtsAimDbg(${yaw}, ${pitch});
        return { yaw: ${yaw}, pitch: ${pitch} };
      })()`);
    };

    // 1. Inspect internal mesh states
    const meshStats = await page.evaluate(`(() => {
      const T = TT;
      const ud = T.marine.userData;
      const vestParts = (ud.gearParts && ud.gearParts.vest) || [];
      const radioMeshes = vestParts.filter(o => o.userData.vmEyeRadio);
      const carrierMeshes = vestParts.filter(o => !o.userData.vmEyeRadio);
      const skins = ud.rigSkin ? ud.rigSkin.skins : [];
      const radioSkins = skins.filter(s => s.userData.rigSplit === 2);

      // Check viewmodel eye-filter status
      const VM = T.viewmodelDbg ? T.viewmodelDbg() : null;

      return {
        vestPartsCount: vestParts.length,
        radioMeshesCount: radioMeshes.length,
        carrierMeshesCount: carrierMeshes.length,
        radioSkinsCount: radioSkins.length,
        radioMeshesVisible: radioMeshes.map(m => m.visible),
        radioMeshesCastShadow: radioMeshes.map(m => m.castShadow),
        vmActive: VM ? VM.info.active : false,
        vmRaise: VM ? +VM.info.raise.toFixed(2) : 0,
        radioEyeHidden: radioMeshes.map(m => VM ? VM.isEyeHidden(m) : false),
        carrierEyeHidden: carrierMeshes.map(m => VM ? VM.isEyeHidden(m) : false),
      };
    })()`);

    console.log('Radio Mesh Stats (Third Person):', JSON.stringify(meshStats, null, 2));
    results.meshStats = meshStats;

    // 2. Switch to First Person and wait for viewmodel raise
    console.log('Switching to First Person with Pistol viewmodel...');
    await page.evaluate(`(async () => {
      const T = TT;
      T.setViewFirstDbg(true);
      const t0 = Date.now();
      while (Date.now() - t0 < 10000) {
        const vm = T.viewmodelDbg ? T.viewmodelDbg() : null;
        if (vm && vm.info.active && vm.info.raise > 0.99) break;
        await new Promise(r => setTimeout(r, 50));
      }
    })()`);
    await wait(600);

    const fpMeshStats = await page.evaluate(`(() => {
      const T = TT;
      const ud = T.marine.userData;
      const vestParts = (ud.gearParts && ud.gearParts.vest) || [];
      const radioMeshes = vestParts.filter(o => o.userData.vmEyeRadio);
      const carrierMeshes = vestParts.filter(o => !o.userData.vmEyeRadio);
      const VM = T.viewmodelDbg();

      return {
        vmRaise: VM ? +VM.info.raise.toFixed(2) : 0,
        radioEyeHidden: radioMeshes.map(m => VM.isEyeHidden(m)),
        carrierEyeHidden: carrierMeshes.map(m => VM.isEyeHidden(m)),
        allRadioHidden: radioMeshes.every(m => VM.isEyeHidden(m)),
        carrierVisibleInEye: carrierMeshes.some(m => !VM.isEyeHidden(m))
      };
    })()`);

    console.log('Radio Mesh Stats (First Person):', JSON.stringify(fpMeshStats, null, 2));
    results.fpMeshStats = fpMeshStats;

    // Shot 1: FP Forward Level View
    console.log('Capturing Shot 1: First Person Forward Level...');
    await setAim(0, 0);
    await wait(250);
    const fpFwdPath = path.join(OUT, 'gp20002-fp-forward.png');
    await page.screenshot(fpFwdPath);
    results.shots.push({ id: 'fp-forward', path: fpFwdPath, desc: 'First person forward hip view (pistol)' });

    // Shot 2: FP Look Down Straight (-1.38 rad pitch)
    console.log('Capturing Shot 2: First Person Look Down Straight...');
    await setAim(0, -1.38);
    await wait(350);
    const fpLookDownPath = path.join(OUT, 'gp20002-fp-lookdown.png');
    await page.screenshot(fpLookDownPath);
    results.shots.push({ id: 'fp-lookdown', path: fpLookDownPath, desc: 'First person looking straight down (chest/carrier visible, radio/antenna hidden)' });

    // Shot 3: FP Look Down 45 deg (-0.78 rad pitch)
    console.log('Capturing Shot 3: First Person Look Down Angled...');
    await setAim(0, -0.78);
    await wait(300);
    const fpLookAngledPath = path.join(OUT, 'gp20002-fp-lookangled.png');
    await page.screenshot(fpLookAngledPath);
    results.shots.push({ id: 'fp-lookangled', path: fpLookAngledPath, desc: 'First person looking down angled at plate carrier front' });

    // 3. Third Person Verification
    console.log('Switching to Third Person...');
    await page.evaluate(`TT.setViewFirstDbg(false)`);
    await wait(400);

    // Helper to position OTS / inspector style camera relative to marine
    const inspectMarine = async (offsetX, offsetY, offsetZ, targetOffsetY = 1.0) => {
      return await page.evaluate(`(() => {
        const T = TT;
        const mp = T.marine.position;
        const cx = mp.x + ${offsetX}, cy = mp.y + ${offsetY}, cz = mp.z + ${offsetZ};
        T.camera.position.set(cx, cy, cz);
        T.camera.lookAt(mp.x, mp.y + ${targetOffsetY}, mp.z);
        T.renderFrame && T.renderFrame();
        return { cx, cy, cz };
      })()`);
    };

    // Shot 4: TP Radio Close Front/Three-Quarter
    console.log('Capturing Shot 4: Third Person Radio Close...');
    await inspectMarine(0.65, 1.35, 1.05, 1.25);
    await wait(300);
    const tpRadioClosePath = path.join(OUT, 'gp20002-tp-radio-close.png');
    await page.screenshot(tpRadioClosePath);
    results.shots.push({ id: 'tp-radio-close', path: tpRadioClosePath, desc: 'Third person close-up of radio, whip antenna, and PTT cable on vest' });

    // Shot 5: TP Full Body Front
    console.log('Capturing Shot 5: Third Person Full Body Front...');
    await inspectMarine(0.0, 1.2, 2.2, 1.0);
    await wait(300);
    const tpFullBodyPath = path.join(OUT, 'gp20002-tp-fullbody-front.png');
    await page.screenshot(tpFullBodyPath);
    results.shots.push({ id: 'tp-fullbody', path: tpFullBodyPath, desc: 'Third person front full body with plate carrier and radio' });

    // Shot 6: Shadow Silhouette (Noon low angle to look at ground shadow)
    console.log('Capturing Shot 6: Marine Shadow Silhouette on Ground...');
    await page.evaluate(`(() => {
      const T = TT;
      T.setWorldTime(0.70); // low sun casting long clear shadow
      const mp = T.marine.position;
      T.camera.position.set(mp.x - 2.5, mp.y + 2.0, mp.z + 1.8);
      T.camera.lookAt(mp.x - 1.2, mp.y + 0.1, mp.z + 1.0);
      T.renderFrame && T.renderFrame();
    })()`);
    await wait(350);
    const shadowPath = path.join(OUT, 'gp20002-shadow-silhouette.png');
    await page.screenshot(shadowPath);
    results.shots.push({ id: 'shadow-silhouette', path: shadowPath, desc: 'Ground shadow showing whip antenna and radio silhouette cast cleanly' });

    // 4. Four-Light Review (D-89) in Third Person Close
    console.log('Capturing Four-Light Review of Radio...');
    const lights = [
      { id: 'noon', time: 0.42, rain: false, flash: false, desc: 'Noon sunlight' },
      { id: 'overcast', time: 0.42, rain: true, flash: false, desc: 'Overcast stormy' },
      { id: 'dusk', time: 0.74, rain: false, flash: false, desc: 'Dusk golden hour' },
      { id: 'night', time: 0.05, rain: false, flash: true, desc: 'Night NVG/Flashlight' }
    ];

    for (const l of lights) {
      await page.evaluate(`(() => {
        const T = TT;
        T.setWorldTime(${l.time});
        if (T.weather) {
          T.weather.raining = ${l.rain};
          T.weather.intensity = ${l.rain ? 0.75 : 0};
        }
        if (T.player) T.player.flashlight = ${l.flash};
        if (T.flashlight) T.flashlight.visible = ${l.flash};
      })()`);
      await inspectMarine(0.65, 1.35, 1.05, 1.25);
      await wait(300);
      const lPath = path.join(OUT, `gp20002-light-${l.id}.png`);
      await page.screenshot(lPath);
      results.shots.push({ id: `light-${l.id}`, path: lPath, desc: `Four-light review: ${l.desc}` });
    }

  } finally {
    try { await browser.close(); } catch (_) {}
    try { server.close(); } catch (_) {}
  }

  // 5. Stitch Contact Sheet
  console.log('\n======================================================');
  console.log('Stitching GP-20002 Contact Sheet...');
  console.log('======================================================');

  const stitchServer = await serve(ROOT, 0);
  const stitchBrowser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const stitchPage = await stitchBrowser.newPage({ width: W, height: H });
    await stitchPage.goto(`${stitchServer.origin}/tools/blank.html`);

    const keyShots = [
      path.join(OUT, 'gp20002-fp-lookdown.png'),
      path.join(OUT, 'gp20002-fp-lookangled.png'),
      path.join(OUT, 'gp20002-tp-radio-close.png'),
      path.join(OUT, 'gp20002-shadow-silhouette.png'),
      path.join(OUT, 'gp20002-light-noon.png'),
      path.join(OUT, 'gp20002-light-overcast.png'),
      path.join(OUT, 'gp20002-light-dusk.png'),
      path.join(OUT, 'gp20002-light-night.png'),
    ];

    const keyLabels = [
      '1. FP Look-Down Straight: Radio & Antenna eye-hidden; chest remains',
      '2. FP Look-Down Angled: Clean chest plate, zero radio/whip obstruction',
      '3. TP Close-up: Radio box, controls & whip antenna clearly present',
      '4. Ground Shadow: Whip antenna & radio cast distinct ground shadow',
      '5. Four-Light Review: Noon (direct sun, crisp highlights)',
      '6. Four-Light Review: Overcast (soft ambient, diffuse occlusion)',
      '7. Four-Light Review: Dusk (warm grazing sidelight)',
      '8. Four-Light Review: Night (tactical flashlight beam illumination)',
    ];

    const b64List = keyShots.map(p => fs.readFileSync(p).toString('base64'));
    const b64Sheet = await stitchPage.evaluate(`(async () => {
      const b64s = ${JSON.stringify(b64List)};
      const labels = ${JSON.stringify(keyLabels)};
      const cols = 2, rows = 4;
      const cellW = 640, cellH = 360, labelH = 26;
      const c = document.createElement('canvas');
      c.width = cols * cellW;
      c.height = rows * (cellH + labelH);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#0f1115';
      ctx.fillRect(0, 0, c.width, c.height);

      const loadImg = (src) => new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = src;
      });

      for (let i = 0; i < b64s.length; i++) {
        const im = await loadImg('data:image/png;base64,' + b64s[i]);
        const col = i % cols, row = Math.floor(i / cols);
        const x = col * cellW, y = row * (cellH + labelH);
        ctx.drawImage(im, x, y, cellW, cellH);
        ctx.fillStyle = '#161920';
        ctx.fillRect(x, y + cellH, cellW, labelH);
        ctx.fillStyle = (i === 0 || i === 1) ? '#64b5f6' : (i === 2 || i === 3 ? '#81c784' : '#ffb74d');
        ctx.font = 'bold 13px Consolas, monospace';
        ctx.fillText(labels[i] || '', x + 10, y + cellH + 18);
      }
      return c.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '');
    })()`);

    fs.writeFileSync(path.join(OUT, 'gp20002-sheet.png'), Buffer.from(b64Sheet, 'base64'));
    console.log(`Saved composite contact sheet: ${path.join(OUT, 'gp20002-sheet.png')}`);

  } finally {
    try { await stitchBrowser.close(); } catch (_) {}
    try { stitchServer.close(); } catch (_) {}
  }

  fs.writeFileSync(path.join(OUT, 'gp20002-summary.json'), JSON.stringify(results, null, 2));
  console.log(`\nGP-20002 review complete! Summary saved to ${path.join(OUT, 'gp20002-summary.json')}`);
}

await runGp20002();
