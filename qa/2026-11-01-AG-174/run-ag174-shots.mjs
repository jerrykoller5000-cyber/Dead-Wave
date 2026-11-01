import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-AG-174');
fs.mkdirSync(OUT, { recursive: true });

const W = 1280, H = 720;
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size=' + W + ',' + H] });
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const summary = {
  timestamp: new Date().toISOString(),
  metrics: {},
  shots: []
};

try {
  const page = await browser.newPage({ width: W, height: H });
  console.log('=== Loading Tiny Trek on real RTX 5080 WebGPU renderer for AG-174 ===');
  await page.goto(`${server.origin}/index.html?debug=1&chaingates=1&utilities=1&raf=timer`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(lib);

  await page.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'AG174');
    T.clearZombies && T.clearZombies();
    T.setHp(1e5);
    T.setWorldTime(0.42);
    if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
    T.setViewFirstDbg(true);
    if (T.runDevCommand) T.runDevCommand('godmode');
    await new Promise((r) => setTimeout(r, 1500));
    return 1;
  })()`, 600000);

  // Helper to aim camera and position player in FP
  const lookAt = async (px, py, pz, tx, ty, tz) => {
    return await page.evaluate(`(() => {
      const T = TT;
      T.player.position.set(${px}, ${py}, ${pz});
      const dx = ${tx} - ${px}, dz = ${tz} - ${pz}, dy = ${ty} - ${py};
      const yaw = Math.atan2(dx, dz);
      const distXZ = Math.hypot(dx, dz);
      const pitch = Math.atan2(dy, distXZ);
      T.setAimYawDbg(yaw);
      if (T.setOtsAimDbg) T.setOtsAimDbg(yaw, pitch);
      return { px: ${px}, py: ${py}, pz: ${pz}, target: { tx: ${tx}, ty: ${ty}, tz: ${tz} }, yaw, pitch };
    })()`);
  };

  // =========================================================================
  // 1. Price's Clipboard & Key by HQ Generator
  // =========================================================================
  console.log('=== 1. Price clipboard & key by HQ generator ===');
  await page.evaluate(`(() => {
    const T = TT;
    T.chainDbg.on(true);
    if (T.fuelEnsure) T.fuelEnsure();
  })()`);
  await wait(500);

  const priceKeyMetrics = await page.evaluate(`(() => {
    const T = TT;
    const F = T.fuelDbg && T.fuelDbg.props();
    const k = T.chainDbg && T.chainDbg.key();
    let groundY = 0;
    if (k) groundY = T.sampleHeight(k.x, k.z);
    return {
      generator: F ? F.gen : null,
      clipboardKey: k,
      groundY,
      yDelta: k ? +(k.y - groundY).toFixed(4) : null
    };
  })()`);
  summary.metrics.priceKey = priceKeyMetrics;
  console.log('Price key metrics:', JSON.stringify(priceKeyMetrics, null, 2));

  const kPos = priceKeyMetrics.clipboardKey;
  if (kPos) {
    const camX = kPos.x + 0.9, camZ = kPos.z + 1.2;
    const camY = await page.evaluate(`TT.sampleHeight(${camX}, ${camZ}) + 1.1`);
    for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
      await page.evaluate(`TT.setWorldTime(${time})`);
      await lookAt(camX, camY, camZ, kPos.x, kPos.y + 0.05, kPos.z);
      await wait(350);
      const shot = path.join(OUT, `price-clipboard-key-${light}.png`);
      await page.screenshot(shot);
      summary.shots.push({ id: `price-clipboard-key-${light}`, path: shot, desc: `Price clipboard & key by generator at ${light}` });
    }
  }

  // =========================================================================
  // 2. Spare Key on Duty Board
  // =========================================================================
  console.log('=== 2. Spare key on duty board ===');
  await page.evaluate(`(() => {
    const T = TT;
    const C = T.chainDbg;
    T.runDevCommand('story open relay');
    const opened = (C.story().leads.find((l) => l.id === 'relay') || {}).openedDay;
    C.dawn((opened == null ? 0 : opened) + 2);
  })()`);
  await wait(500);

  const spareMetrics = await page.evaluate(`(() => {
    const T = TT;
    const THREE = T.THREE || window.THREE;
    const C = T.chainDbg;
    const sp = C.spare();
    const board = T.house && T.house.dutyBoard;
    let bp = null;
    if (board) {
      board.updateWorldMatrix(true, true);
      const v = new THREE.Vector3();
      board.getWorldPosition(v);
      bp = { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) };
    }
    const hp = T.house && T.house.group ? T.house.group.position : { x: 0, y: 0, z: 0 };
    return {
      spare: sp,
      dutyBoardPos: bp,
      housePos: { x: +hp.x.toFixed(3), y: +hp.y.toFixed(3), z: +hp.z.toFixed(3) }
    };
  })()`);
  summary.metrics.spareKey = spareMetrics;
  console.log('Spare key metrics:', JSON.stringify(spareMetrics, null, 2));

  const spPos = spareMetrics.dutyBoardPos;
  if (spPos) {
    // Face the duty board from the outside south wall (HQ_DUTY_BOARD_FRONT at z = -5.9)
    const camX = spPos.x, camZ = spPos.z - 1.4;
    const camY = await page.evaluate(`TT.sampleHeight(${camX}, ${camZ}) + 1.55`);
    for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
      await page.evaluate(`TT.setWorldTime(${time})`);
      await lookAt(camX, camY, camZ, spPos.x, spPos.y - 0.15, spPos.z);
      await wait(350);
      const shot = path.join(OUT, `spare-key-dutyboard-${light}.png`);
      await page.screenshot(shot);
      summary.shots.push({ id: `spare-key-dutyboard-${light}`, path: shot, desc: `Spare key on HQ duty board at ${light}` });
    }
  }

  // =========================================================================
  // 3. Fuel Depot Padlocked Shed Door & Open Shed Door
  // =========================================================================
  console.log('=== 3. Fuel depot shed door (padlocked & open) ===');
  await page.evaluate(`(() => {
    const T = TT;
    T.runDevCommand('site fuel');
  })()`);
  await wait(800);

  const gateMetrics = await page.evaluate(`(() => {
    const T = TT;
    const g = T.chainDbg && T.chainDbg.gate();
    const F = T.fuelDbg && T.fuelDbg.props();
    let gy = 0;
    if (g) gy = T.sampleHeight(g.x, g.z);
    return {
      gate: g,
      pump: F ? F.pump : null,
      groundY: gy,
      yDelta: g ? +(g.y - gy).toFixed(4) : null
    };
  })()`);
  summary.metrics.gate = gateMetrics;
  console.log('Gate metrics:', JSON.stringify(gateMetrics, null, 2));

  const gPos = gateMetrics.gate;
  if (gPos && gateMetrics.pump) {
    // Stand at approach angle to see door and padlock clearly
    const camX = gPos.x + 1.9, camZ = gPos.z - 1.1;
    const camY = await page.evaluate(`TT.sampleHeight(${camX}, ${camZ}) + 1.2`);

    // Padlocked shots
    for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
      await page.evaluate(`TT.setWorldTime(${time})`);
      await lookAt(camX, camY, camZ, gPos.x - 0.2, gPos.y + 0.85, gPos.z);
      await wait(350);
      const shot = path.join(OUT, `fuel-shed-padlocked-${light}.png`);
      await page.screenshot(shot);
      summary.shots.push({ id: `fuel-shed-padlocked-${light}`, path: shot, desc: `Fuel depot padlocked shed door at ${light}` });
    }

    // Now open the shed door: take key and open
    console.log('Opening fuel depot shed door...');
    await page.evaluate(`(async () => {
      const T = TT;
      const C = T.chainDbg;
      const k = C.key();
      if (k) {
        T.player.position.set(k.x, k.y + 0.3, k.z);
        C.use();
      }
      const g = C.gate();
      if (g) {
        T.player.position.set(g.x, g.y + 0.3, g.z);
        C.use();
      }
    })()`);
    await wait(800); // wait for opening animation and mesh removal

    const openStatus = await page.evaluate(`TT.chainDbg.gate()`);
    console.log('Gate status after open:', openStatus);

    // Open shots from the same spot
    for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
      await page.evaluate(`TT.setWorldTime(${time})`);
      await lookAt(camX, camY, camZ, gPos.x - 0.2, gPos.y + 0.85, gPos.z);
      await wait(350);
      const shot = path.join(OUT, `fuel-shed-open-${light}.png`);
      await page.screenshot(shot);
      summary.shots.push({ id: `fuel-shed-open-${light}`, path: shot, desc: `Fuel depot shed door open at ${light}` });
    }
  }

  // =========================================================================
  // 4. HQ Pump and Water Tank (Dry & Filling)
  // =========================================================================
  console.log('=== 4. HQ pump and water tank (dry & filling) ===');
  await page.evaluate(`(() => {
    const T = TT;
    const U = T.utilityDbg;
    U.on(true);
    U.lead('missing');
    U.lead('generator');
    U.install('plumbing');
  })()`);
  await wait(500);

  const pumpMetrics = await page.evaluate(`(() => {
    const T = TT;
    const spots = T.utilityDbg.spots();
    const p = spots ? spots.pump : null;
    let gy = 0;
    if (p) gy = T.sampleHeight(p.x, p.z);
    return {
      pumpSpot: p,
      groundY: gy,
      fill: T.utilityDbg.tank(),
      yDelta: p ? +(p.y - gy).toFixed(4) : null
    };
  })()`);
  summary.metrics.pump = pumpMetrics;
  console.log('Pump metrics:', JSON.stringify(pumpMetrics, null, 2));

  const pSpot = pumpMetrics.pumpSpot;
  if (pSpot) {
    const camX = pSpot.x + 2.8, camZ = pSpot.z + 2.4;
    const camY = await page.evaluate(`TT.sampleHeight(${camX}, ${camZ}) + 1.2`);

    // Dry shots
    for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
      await page.evaluate(`TT.setWorldTime(${time})`);
      await lookAt(camX, camY, camZ, pSpot.x + 0.45, pSpot.y + 0.75, pSpot.z);
      await wait(350);
      const shot = path.join(OUT, `hq-pump-tank-dry-${light}.png`);
      await page.screenshot(shot);
      summary.shots.push({ id: `hq-pump-tank-dry-${light}`, path: shot, desc: `HQ pump & water tank (dry) at ${light}` });
    }

    // Step water filling to ~0.50
    console.log('Filling water tank...');
    await page.evaluate(`TT.utilityDbg.step(30)`);
    await wait(300);
    const fillingFill = await page.evaluate(`TT.utilityDbg.tank()`);
    console.log('Tank fill level:', fillingFill);

    // Filling shots
    for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
      await page.evaluate(`TT.setWorldTime(${time})`);
      await lookAt(camX, camY, camZ, pSpot.x + 0.45, pSpot.y + 0.75, pSpot.z);
      await wait(350);
      const shot = path.join(OUT, `hq-pump-tank-filling-${light}.png`);
      await page.screenshot(shot);
      summary.shots.push({ id: `hq-pump-tank-filling-${light}`, path: shot, desc: `HQ pump & water tank (filling ~${(fillingFill * 100).toFixed(0)}%) at ${light}` });
    }
  }

  // =========================================================================
  // 5. Armory Front as Workbench with Battery Fitted
  // =========================================================================
  console.log('=== 5. Armory front workbench with battery fitted ===');
  await page.evaluate(`(() => {
    const T = TT;
    const U = T.utilityDbg;
    U.lead('truck');
    U.install('workshop');
  })()`);
  await wait(500);

  const benchMetrics = await page.evaluate(`(() => {
    const T = TT;
    const spots = T.utilityDbg.spots();
    const b = spots ? spots.bench : null;
    const armoryFront = T.HQ_ARMORY_FRONT || null;
    return {
      benchSpot: b,
      armoryFront,
      workshopState: T.utilityDbg.read().state.workshop
    };
  })()`);
  summary.metrics.bench = benchMetrics;
  console.log('Bench metrics:', JSON.stringify(benchMetrics, null, 2));

  const bSpot = benchMetrics.benchSpot;
  if (bSpot) {
    const camX = bSpot.x + 1.2, camZ = bSpot.z - 0.4;
    const camY = bSpot.y + 0.35;
    for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
      await page.evaluate(`TT.setWorldTime(${time})`);
      await lookAt(camX, camY, camZ, bSpot.x, bSpot.y + 0.05, bSpot.z);
      await wait(350);
      const shot = path.join(OUT, `armory-workbench-battery-${light}.png`);
      await page.screenshot(shot);
      summary.shots.push({ id: `armory-workbench-battery-${light}`, path: shot, desc: `Armory workbench with fitted battery at ${light}` });
    }
  }

  // =========================================================================
  // 6. Roof Siren Beside Ladder Head (Turned Toward a Wave)
  // =========================================================================
  console.log('=== 6. Roof siren beside ladder head (turned toward wave) ===');
  await page.evaluate(`(() => {
    const T = TT;
    const U = T.utilityDbg;
    U.lead('search');
    U.install('alarm');
    // Turn siren toward a wave
    const sirenObj = T.scene && T.scene.getObjectByName('hq-roof-siren');
    if (sirenObj) {
      sirenObj.rotation.y = 1.35;
    }
  })()`);
  await wait(500);

  const sirenMetrics = await page.evaluate(`(() => {
    const T = TT;
    const spots = T.utilityDbg.spots();
    const s = spots ? spots.siren : null;
    const sirenObj = T.scene && T.scene.getObjectByName('hq-roof-siren');
    return {
      sirenSpot: s,
      alarmState: T.utilityDbg.read().state.alarm,
      sirenRotationY: sirenObj ? +sirenObj.rotation.y.toFixed(3) : null
    };
  })()`);
  summary.metrics.siren = sirenMetrics;
  console.log('Siren metrics:', JSON.stringify(sirenMetrics, null, 2));

  const sSpot = sirenMetrics.sirenSpot;
  if (sSpot) {
    // Put player onto the roof deck by the ladder head
    await page.evaluate(`(() => {
      const T = TT;
      // Position player standing on the HQ roof deck
      T.player.position.set(${sSpot.x + 1.2}, ${sSpot.y}, ${sSpot.z - 1.2});
      if (T.velX !== undefined) { T.velX = 0; T.velZ = 0; T.vy = 0; }
    })()`);
    await wait(200);

    const camX = sSpot.x + 1.2, camZ = sSpot.z - 1.2;
    const camY = sSpot.y + 0.6; // head height above roof
    for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
      await page.evaluate(`TT.setWorldTime(${time})`);
      await lookAt(camX, camY, camZ, sSpot.x, sSpot.y + 0.2, sSpot.z);
      await wait(350);
      const shot = path.join(OUT, `roof-siren-wave-${light}.png`);
      await page.screenshot(shot);
      summary.shots.push({ id: `roof-siren-wave-${light}`, path: shot, desc: `Roof siren beside ladder turned toward wave at ${light}` });
    }
  }

  // =========================================================================
  // 7. Contact Sheet Stitching
  // =========================================================================
  console.log('=== 7. Stitching AG-174 Contact Sheet ===');
  const stitchGrid = async (shotPaths, labels, cols, rows, outFile) => {
    const b64List = shotPaths.map(p => fs.readFileSync(p).toString('base64'));
    const b64Out = await page.evaluate(`(async () => {
      const b64s = ${JSON.stringify(b64List)};
      const labels = ${JSON.stringify(labels)};
      const cols = ${cols}, rows = ${rows};
      const cellW = 640, cellH = 360, labelH = 26;
      const c = document.createElement('canvas');
      c.width = cols * cellW;
      c.height = rows * (cellH + labelH);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#101216';
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
        ctx.fillStyle = '#181c22';
        ctx.fillRect(x, y + cellH, cellW, labelH);
        ctx.fillStyle = '#e8ecf2';
        ctx.font = 'bold 14px Consolas, monospace';
        ctx.fillText(labels[i] || '', x + 10, y + cellH + 18);
      }
      return c.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '');
    })()`, 60000);
    fs.writeFileSync(outFile, Buffer.from(b64Out, 'base64'));
  };

  const keyShots = [
    path.join(OUT, 'fuel-shed-padlocked-noon.png'),
    path.join(OUT, 'fuel-shed-padlocked-dusk.png'),
    path.join(OUT, 'fuel-shed-open-noon.png'),
    path.join(OUT, 'fuel-shed-open-dusk.png'),
    path.join(OUT, 'price-clipboard-key-noon.png'),
    path.join(OUT, 'price-clipboard-key-dusk.png'),
    path.join(OUT, 'spare-key-dutyboard-noon.png'),
    path.join(OUT, 'spare-key-dutyboard-dusk.png'),
    path.join(OUT, 'hq-pump-tank-dry-noon.png'),
    path.join(OUT, 'hq-pump-tank-dry-dusk.png'),
    path.join(OUT, 'hq-pump-tank-filling-noon.png'),
    path.join(OUT, 'hq-pump-tank-filling-dusk.png'),
    path.join(OUT, 'armory-workbench-battery-noon.png'),
    path.join(OUT, 'armory-workbench-battery-dusk.png'),
    path.join(OUT, 'roof-siren-wave-noon.png'),
    path.join(OUT, 'roof-siren-wave-dusk.png')
  ];

  const keyLabels = [
    'Fuel shed padlocked (noon)',
    'Fuel shed padlocked (dusk)',
    'Fuel shed open (noon)',
    'Fuel shed open (dusk)',
    'Price clipboard & key by HQ gen (noon)',
    'Price clipboard & key by HQ gen (dusk)',
    'Spare key on HQ duty board (noon)',
    'Spare key on HQ duty board (dusk)',
    'HQ pump & water tank dry (noon)',
    'HQ pump & water tank dry (dusk)',
    'HQ pump & water tank filling (noon)',
    'HQ pump & water tank filling (dusk)',
    'Armory workbench + battery fitted (noon)',
    'Armory workbench + battery fitted (dusk)',
    'Roof siren beside ladder turned to wave (noon)',
    'Roof siren beside ladder turned to wave (dusk)'
  ];

  await stitchGrid(keyShots, keyLabels, 4, 4, path.join(OUT, 'ag174-sheet.png'));

  fs.writeFileSync(path.join(OUT, 'ag174-summary.json'), JSON.stringify(summary, null, 2));
  console.log('=== AG-174 capture finished! All shots and sheet saved in qa/2026-11-01-AG-174/ ===');
} finally {
  try { await browser.close(); } catch (_) {}
  try { server.close(); } catch (_) {}
}
