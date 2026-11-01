import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-AG-175');
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
  console.log('=== Loading Tiny Trek on real RTX 5080 WebGPU renderer for AG-175 ===');
  await page.goto(`${server.origin}/index.html?debug=1&chaingates=1&raf=timer`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(lib);

  await page.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'AG175');
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

  // Turn chain gates on and teleport to trapper site
  console.log('=== 1. Trapper yard gate locked with combination padlock ===');
  await page.evaluate(`(() => {
    const T = TT;
    T.chainDbg.on(true);
    T.runDevCommand('site trapper');
  })()`);
  await wait(1000);

  const gateInfo = await page.evaluate(`(() => {
    const T = TT;
    const g = T.chainDbg.at('trapper-fence');
    return g ? { x: g.x, y: g.y, z: g.z, open: g.open, fenced: g.fenced } : null;
  })()`);
  summary.metrics.gateInfo = gateInfo;
  console.log('Trapper gate info:', JSON.stringify(gateInfo, null, 2));

  if (!gateInfo) throw new Error('trapper-fence gate not found');

  // Shot 1 & 2: Trapper gate approach locked (noon & dusk)
  // Approach: from outside the yard looking toward the gate opening
  // Gate stands at gateInfo.x, gateInfo.z. The yard yaw is ~2.0944 rad.
  // We place camera 3.5 m back along approach vector
  const approachAngle = 2.0944; // TRAPPER.YARD_YAW
  // normal vector pointing outward: (sin(yaw), cos(yaw))
  const nx = Math.sin(approachAngle), nz = Math.cos(approachAngle);
  const camAppX = gateInfo.x + nx * 3.6;
  const camAppZ = gateInfo.z + nz * 3.6;
  const camAppY = await page.evaluate(`TT.sampleHeight(${camAppX}, ${camAppZ}) + 1.2`);

  for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
    await page.evaluate(`TT.setWorldTime(${time})`);
    await lookAt(camAppX, camAppY, camAppZ, gateInfo.x, gateInfo.y + 0.8, gateInfo.z);
    await wait(350);
    const shot = path.join(OUT, `trapper-gate-locked-${light}.png`);
    await page.screenshot(shot);
    summary.shots.push({ id: `trapper-gate-locked-${light}`, path: shot, desc: `Trapper fence gate locked approach at ${light}` });
  }

  // Shot 3 & 4: Trapper gate combination lock close-up (noon & dusk)
  const camCloseX = gateInfo.x + nx * 1.5 - nz * 0.4;
  const camCloseZ = gateInfo.z + nz * 1.5 + nx * 0.4;
  const camCloseY = await page.evaluate(`TT.sampleHeight(${camCloseX}, ${camCloseZ}) + 0.9`);

  for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
    await page.evaluate(`TT.setWorldTime(${time})`);
    await lookAt(camCloseX, camCloseY, camCloseZ, gateInfo.x, gateInfo.y + 0.8, gateInfo.z);
    await wait(350);
    const shot = path.join(OUT, `trapper-gate-lock-closeup-${light}.png`);
    await page.screenshot(shot);
    summary.shots.push({ id: `trapper-gate-lock-closeup-${light}`, path: shot, desc: `Combination lock close-up at ${light}` });
  }

  // Shot 5 & 6: Open the gate with the combination and capture open passage
  console.log('=== 2. Opening trapper gate with combination ===');
  await page.evaluate(`(() => {
    const T = TT;
    T.chainDbg.event('search-log-read');
    T.player.position.set(${gateInfo.x}, ${gateInfo.y + 0.3}, ${gateInfo.z});
    T.chainDbg.use();
  })()`);
  await wait(800); // let open animation finish

  for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
    await page.evaluate(`TT.setWorldTime(${time})`);
    await lookAt(camAppX, camAppY, camAppZ, gateInfo.x, gateInfo.y + 0.8, gateInfo.z);
    await wait(350);
    const shot = path.join(OUT, `trapper-gate-open-${light}.png`);
    await page.screenshot(shot);
    summary.shots.push({ id: `trapper-gate-open-${light}`, path: shot, desc: `Trapper fence gate open passage at ${light}` });
  }

  // Shot 7 & 8: Inside trapper yard looking along path (noon & dusk)
  console.log('=== 3. Trapper yard path view ===');
  const camInsideX = gateInfo.x - nx * 2.0;
  const camInsideZ = gateInfo.z - nz * 2.0;
  const camInsideY = await page.evaluate(`TT.sampleHeight(${camInsideX}, ${camInsideZ}) + 1.2`);
  for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
    await page.evaluate(`TT.setWorldTime(${time})`);
    // look toward cabin / cellar / yard center
    await lookAt(camInsideX, camInsideY, camInsideZ, gateInfo.x - nx * 8.0, gateInfo.y + 1.0, gateInfo.z - nz * 8.0);
    await wait(350);
    const shot = path.join(OUT, `trapper-yard-path-${light}.png`);
    await page.screenshot(shot);
    summary.shots.push({ id: `trapper-yard-path-${light}`, path: shot, desc: `Inside trapper yard along safe path at ${light}` });
  }

  // Shot 9 & 10: Ranger search log prop at ranger station (where combination is learned)
  console.log('=== 4. Ranger search log ===');
  await page.evaluate(`(() => {
    const T = TT;
    T.runDevCommand('site ranger');
  })()`);
  await wait(1000);

  const logPos = await page.evaluate(`(() => {
    const T = TT;
    const l = T.rangerDbg && T.rangerDbg.ranger && T.rangerDbg.ranger.log;
    if (!l) return null;
    return { x: l.position.x, y: l.position.y, z: l.position.z };
  })()`);
  summary.metrics.rangerLogPos = logPos;
  console.log('Ranger search log position:', JSON.stringify(logPos, null, 2));

  if (logPos) {
    const camLogX = logPos.x + 0.8, camLogZ = logPos.z + 0.8;
    const camLogY = await page.evaluate(`TT.sampleHeight(${camLogX}, ${camLogZ}) + 1.1`);
    for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
      await page.evaluate(`TT.setWorldTime(${time})`);
      await lookAt(camLogX, camLogY, camLogZ, logPos.x, logPos.y, logPos.z);
      await wait(350);
      const shot = path.join(OUT, `ranger-search-log-${light}.png`);
      await page.screenshot(shot);
      summary.shots.push({ id: `ranger-search-log-${light}`, path: shot, desc: `Ranger search log prop at ${light}` });
    }
  }

  // Shot 11 & 12: Spare combination note on HQ duty board after two dawns
  console.log('=== 5. Spare combination on HQ duty board ===');
  await page.evaluate(`(() => {
    const T = TT;
    T.runDevCommand('site hq');
    T.chainDbg.reset();
    T.chainDbg.on(true);
    T.runDevCommand('story open oldman');
    const opened = (T.chainDbg.story().leads.find((l) => l.id === 'oldman') || {}).openedDay;
    T.chainDbg.dawn((opened == null ? 0 : opened) + 2);
  })()`);
  await wait(1000);

  const spareInfo = await page.evaluate(`(() => {
    const T = TT;
    const s = T.chainDbg.spare();
    return s ? { x: s.x, z: s.z, key: s.key, state: s.state } : null;
  })()`);
  summary.metrics.spareInfo = spareInfo;
  console.log('HQ duty board spare info:', JSON.stringify(spareInfo, null, 2));

  if (spareInfo) {
    const camBoardX = spareInfo.x, camBoardZ = spareInfo.z + 1.35;
    const camBoardY = await page.evaluate(`TT.sampleHeight(${camBoardX}, ${camBoardZ}) + 1.25`);
    for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
      await page.evaluate(`TT.setWorldTime(${time})`);
      await lookAt(camBoardX, camBoardY, camBoardZ, spareInfo.x, camBoardY, spareInfo.z);
      await wait(350);
      const shot = path.join(OUT, `spare-combination-dutyboard-${light}.png`);
      await page.screenshot(shot);
      summary.shots.push({ id: `spare-combination-dutyboard-${light}`, path: shot, desc: `Spare combination note on HQ duty board at ${light}` });
    }
  }

  // Stitch into contact sheet
  const stitchGrid = async (imageFiles, labels, cols, rows, outFile) => {
    const b64s = imageFiles.map((f) => fs.readFileSync(f).toString('base64'));
    const b64Out = await page.evaluate(`(async () => {
      const b64s = ${JSON.stringify(b64s)};
      const labels = ${JSON.stringify(labels)};
      const cols = ${cols}, rows = ${rows};
      const cellW = 400, cellH = 225, labelH = 28;
      const c = document.createElement('canvas');
      c.width = cols * cellW;
      c.height = rows * (cellH + labelH);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#0f1217';
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
        ctx.font = 'bold 13px Consolas, monospace';
        ctx.fillText(labels[i] || '', x + 10, y + cellH + 19);
      }
      return c.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '');
    })()`, 60000);
    fs.writeFileSync(outFile, Buffer.from(b64Out, 'base64'));
  };

  const keyShots = [
    path.join(OUT, 'trapper-gate-locked-noon.png'),
    path.join(OUT, 'trapper-gate-locked-dusk.png'),
    path.join(OUT, 'trapper-gate-lock-closeup-noon.png'),
    path.join(OUT, 'trapper-gate-lock-closeup-dusk.png'),
    path.join(OUT, 'trapper-gate-open-noon.png'),
    path.join(OUT, 'trapper-gate-open-dusk.png'),
    path.join(OUT, 'trapper-yard-path-noon.png'),
    path.join(OUT, 'trapper-yard-path-dusk.png'),
    path.join(OUT, 'ranger-search-log-noon.png'),
    path.join(OUT, 'ranger-search-log-dusk.png'),
    path.join(OUT, 'spare-combination-dutyboard-noon.png'),
    path.join(OUT, 'spare-combination-dutyboard-dusk.png')
  ];

  const keyLabels = [
    'Trapper fence gate locked (noon)',
    'Trapper fence gate locked (dusk)',
    'Combination padlock closeup (noon)',
    'Combination padlock closeup (dusk)',
    'Trapper gate opened (noon)',
    'Trapper gate opened (dusk)',
    'Trapper yard safe path (noon)',
    'Trapper yard safe path (dusk)',
    'Ranger search log prop (noon)',
    'Ranger search log prop (dusk)',
    'Spare combination on HQ duty board (noon)',
    'Spare combination on HQ duty board (dusk)'
  ];

  await stitchGrid(keyShots, keyLabels, 4, 3, path.join(OUT, 'ag175-sheet.png'));

  fs.writeFileSync(path.join(OUT, 'ag175-summary.json'), JSON.stringify(summary, null, 2));
  console.log('=== AG-175 capture finished! All shots and sheet saved in qa/2026-11-01-AG-175/ ===');
} finally {
  try { await browser.close(); } catch (_) {}
  try { server.close(); } catch (_) {}
}
