import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-CU-199');
fs.mkdirSync(OUT, { recursive: true });

const W = 1280, H = 720;
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size=' + W + ',' + H] });
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const summary = {
  timestamp: new Date().toISOString(),
  props: {},
  armory: {},
  shots: []
};

try {
  const page = await browser.newPage({ width: W, height: H });
  console.log('=== Loading Tiny Trek on real RTX 5080 WebGPU renderer for CU-199 ===');
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
    T.setWorldTime(0.42);
    if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
    T.setViewFirstDbg(true);
    await new Promise((r) => setTimeout(r, 2000));
    return 1;
  })()`, 600000);

  // Helper to aim camera and position player in FP
  const lookAtTarget = async (px, pz, tx, tz, elev = 0) => {
    return await page.evaluate(`(() => {
      const T = TT;
      const py = T.sampleHeight(${px}, ${pz});
      T.player.position.set(${px}, py, ${pz});
      const dx = ${tx} - ${px}, dz = ${tz} - ${pz};
      const yaw = Math.atan2(dx, dz);
      T.setAimYawDbg(yaw);
      if (T.setOtsAimDbg) T.setOtsAimDbg(yaw, ${elev});
      return { px: ${px}, py, pz: ${pz}, target: { tx: ${tx}, tz: ${tz} } };
    })()`);
  };

  // 1. From the HQ, first person, look level across the valley (Noon and Dusk)
  console.log('=== 1. HQ valley vistas (Noon & Dusk) ===');
  for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
    await page.evaluate(`(() => {
      const T = TT;
      T.setWorldTime(${time});
      T.player.position.set(0, T.sampleHeight(0, 16), 16);
      T.setAimYawDbg(0);
      if (T.setOtsAimDbg) T.setOtsAimDbg(0, 0.02);
    })()`);
    await wait(400);
    const shotPath = path.join(OUT, `hq-valley-level-${light}.png`);
    await page.screenshot(shotPath);
    summary.shots.push({ id: `hq-valley-${light}`, path: shotPath, desc: `HQ level across valley at ${light}` });
  }

  // Find landmarks & history props positions
  const targets = await page.evaluate(`(() => {
    const T = TT;
    const POI = T.POI || {};
    const hp = T.historyProps || {};
    const parts = hp.parts || {};

    // 1. Sandbag brass & dropped helmet
    const sb = POI.sandbags || { x: -28, z: 22 };
    const brass = hp.group ? hp.group.children.find(c => c.name === 'brass') : null;
    const helmet = hp.group ? hp.group.children.find(c => c.name === 'dropped-helmet') : null;

    // 2. Warren survey board
    const board = hp.group ? hp.group.children.find(c => c.name && c.name.startsWith('survey-board:')) : null;

    // 3. Trapper's yard (post with horseshoes & traps, cellar hatch)
    const trapperCamp = (POI.campsites || []).find(c => c.style === 'trapper') || { x: 45, z: -55 };
    const post = hp.group ? hp.group.children.find(c => c.name === 'trapper-post') : null;
    const traps = hp.group ? hp.group.children.find(c => c.name === 'leghold-traps') : null;
    const hatch = hp.group ? hp.group.children.find(c => c.name === 'cellar-hatch') : null;

    // 4. Graveyard casket (rabbitMound.reliquary), church shell, open grave
    const gy = POI.graveyard || { x: -60, z: -40 };
    const rel = (T.rabbitDbg && T.rabbitDbg.state && T.rabbitDbg.state().reliquary) || null;
    const church = hp.group ? hp.group.children.find(c => c.name === 'church-shell') : null;
    const openGrave = hp.group ? hp.group.children.find(c => c.name === 'open-grave') : null;

    return {
      sandbags: { x: sb.x, z: sb.z },
      brassPos: brass ? { x: brass.position.x, y: brass.position.y, z: brass.position.z, maxDist: brass.userData.maxDist } : null,
      helmetPos: helmet ? { x: helmet.position.x, y: helmet.position.y, z: helmet.position.z, maxDist: helmet.userData.maxDist } : null,
      boardPos: board ? { x: board.position.x, y: board.position.y, z: board.position.z, maxDist: board.userData.maxDist, name: board.name } : null,
      trapperPos: { x: trapperCamp.x, z: trapperCamp.z },
      postPos: post ? { x: post.position.x, y: post.position.y, z: post.position.z } : null,
      trapsPos: traps ? { x: traps.position.x, y: traps.position.y, z: traps.position.z, maxDist: traps.userData.maxDist } : null,
      hatchPos: hatch ? { x: hatch.position.x, y: hatch.position.y, z: hatch.position.z } : null,
      graveyardPos: { x: gy.x, z: gy.z },
      reliquaryPos: rel ? { x: rel.position.x, y: rel.position.y, z: rel.position.z, maxDist: rel.userData.maxDist } : null,
      churchPos: church ? { x: church.position.x, y: church.position.y, z: church.position.z } : null,
      openGravePos: openGrave ? { x: openGrave.position.x, y: openGrave.position.y, z: openGrave.position.z } : null
    };
  })()`);
  summary.targets = targets;

  // Helper to measure prop visibility and distance
  const checkPropVisibility = async (propName, customCheckJs = '') => {
    return await page.evaluate(`(() => {
      const T = TT;
      const P = T.player.position;
      let obj = null;
      if (T.historyProps && T.historyProps.group) {
        obj = T.historyProps.group.children.find(c => c.name === '${propName}' || (c.name && c.name.startsWith('${propName}')));
      }
      if (!obj && '${propName}' === 'reliquary') {
        obj = (T.rabbitDbg && T.rabbitDbg.state && T.rabbitDbg.state().reliquary) || null;
      }
      ${customCheckJs}
      if (!obj) return { found: false };
      const d = Math.hypot(obj.position.x - P.x, obj.position.z - P.z);
      return {
        found: true,
        name: obj.name,
        visible: obj.visible,
        dist: +d.toFixed(2),
        maxDist: obj.userData.maxDist || 0
      };
    })()`);
  };

  // =========================================================================
  // 2. Sandbag Brass (threshold 28 m) & Dropped Helmet (threshold 55 m)
  // =========================================================================
  console.log('=== 2. Testing Sandbag brass (28m) & dropped helmet (55m) ===');
  const sb = targets.brassPos || targets.sandbags;

  for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
    await page.evaluate(`TT.setWorldTime(${time})`);

    // Far view (distance ~40m > 28m: brass must be culled, helmet ~40m < 55m visible)
    await lookAtTarget(sb.x + 28, sb.z + 28, sb.x, sb.z, 0.05);
    await wait(350);
    const brassFar = await checkPropVisibility('brass');
    const helmetFar = await checkPropVisibility('dropped-helmet');
    const shotPathFar = path.join(OUT, `sandbags-far-${light}.png`);
    await page.screenshot(shotPathFar);
    summary.shots.push({ id: `sandbags-far-${light}`, path: shotPathFar, brass: brassFar, helmet: helmetFar });

    // Very far view (distance ~65m > 55m: helmet must be culled)
    await lookAtTarget(sb.x + 46, sb.z + 46, sb.x, sb.z, 0.05);
    await wait(350);
    const helmetVeryFar = await checkPropVisibility('dropped-helmet');
    const shotPathVeryFar = path.join(OUT, `sandbags-veryfar-${light}.png`);
    await page.screenshot(shotPathVeryFar);
    summary.shots.push({ id: `sandbags-veryfar-${light}`, path: shotPathVeryFar, helmet: helmetVeryFar });

    // Close view (distance ~16m < 28m: brass & helmet both visible)
    await lookAtTarget(sb.x + 11, sb.z + 11, sb.x, sb.z, 0.12);
    await wait(350);
    const brassNear = await checkPropVisibility('brass');
    const helmetNear = await checkPropVisibility('dropped-helmet');
    const shotPathNear = path.join(OUT, `sandbags-near-${light}.png`);
    await page.screenshot(shotPathNear);
    summary.shots.push({ id: `sandbags-near-${light}`, path: shotPathNear, brass: brassNear, helmet: helmetNear });
  }

  // =========================================================================
  // 3. Warren Survey Board (threshold 55 m)
  // =========================================================================
  console.log('=== 3. Testing Warren survey board (55m) ===');
  const wb = targets.boardPos;
  if (wb) {
    for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
      await page.evaluate(`TT.setWorldTime(${time})`);

      // Far view (dist ~68m > 55m: board culled)
      await lookAtTarget(wb.x + 48, wb.z + 48, wb.x, wb.z, 0.05);
      await wait(350);
      const boardFar = await checkPropVisibility('survey-board:');
      const shotFar = path.join(OUT, `warren-board-far-${light}.png`);
      await page.screenshot(shotFar);
      summary.shots.push({ id: `warren-board-far-${light}`, path: shotFar, board: boardFar });

      // Inside view (dist ~32m < 55m: board visible)
      await lookAtTarget(wb.x + 22, wb.z + 22, wb.x, wb.z, 0.08);
      await wait(350);
      const boardNear = await checkPropVisibility('survey-board:');
      const shotNear = path.join(OUT, `warren-board-near-${light}.png`);
      await page.screenshot(shotNear);
      summary.shots.push({ id: `warren-board-near-${light}`, path: shotNear, board: boardNear });
    }
  }

  // =========================================================================
  // 4. Trapper's Yard: Horseshoes & Traps (28 m) vs Cellar Hatch / Post (stay)
  // =========================================================================
  console.log('=== 4. Testing Trapper yard: horseshoes & traps (28m) vs cellar hatch (stays) ===');
  const tp = targets.postPos || targets.trapperPos;
  for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
    await page.evaluate(`TT.setWorldTime(${time})`);

    // Far view (dist ~38m > 28m: traps & horseshoes culled; hatch & post stay!)
    await lookAtTarget(tp.x + 27, tp.z + 27, tp.x, tp.z, 0.05);
    await wait(350);
    const trapFar = await checkPropVisibility('leghold-traps');
    const hsFar = await page.evaluate(`(() => {
      const T = TT;
      const shoes = T.trapper && T.trapper.horseshoes;
      if (!shoes || !shoes.length) return { found: false };
      return { found: true, count: shoes.length, visibleCount: shoes.filter(s => s.visible).length };
    })()`);
    const hatchFar = await checkPropVisibility('cellar-hatch');
    const shotFar = path.join(OUT, `trapper-yard-far-${light}.png`);
    await page.screenshot(shotFar);
    summary.shots.push({ id: `trapper-far-${light}`, path: shotFar, traps: trapFar, horseshoes: hsFar, hatch: hatchFar });

    // Inside view (dist ~15m < 28m: traps & horseshoes present!)
    await lookAtTarget(tp.x + 10, tp.z + 11, tp.x, tp.z, 0.10);
    await wait(350);
    const trapNear = await checkPropVisibility('leghold-traps');
    const hsNear = await page.evaluate(`(() => {
      const T = TT;
      const shoes = T.trapper && T.trapper.horseshoes;
      if (!shoes || !shoes.length) return { found: false };
      return { found: true, count: shoes.length, visibleCount: shoes.filter(s => s.visible).length };
    })()`);
    const hatchNear = await checkPropVisibility('cellar-hatch');
    const shotNear = path.join(OUT, `trapper-yard-near-${light}.png`);
    await page.screenshot(shotNear);
    summary.shots.push({ id: `trapper-near-${light}`, path: shotNear, traps: trapNear, horseshoes: hsNear, hatch: hatchNear });
  }

  // =========================================================================
  // 5. Graveyard Casket (50 m) vs Church Shell & Open Grave (stay)
  // =========================================================================
  console.log('=== 5. Testing Graveyard casket (50m) vs church & open grave (stay) ===');
  const gy = targets.graveyardPos;
  for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
    await page.evaluate(`TT.setWorldTime(${time})`);

    // Far view (dist ~65m > 50m: casket culled; church & open grave stay!)
    await lookAtTarget(gy.x + 46, gy.z + 46, gy.x, gy.z, 0.05);
    await wait(350);
    const casketFar = await checkPropVisibility('reliquary');
    const churchFar = await checkPropVisibility('church-shell');
    const graveFar = await checkPropVisibility('open-grave');
    const shotFar = path.join(OUT, `graveyard-far-${light}.png`);
    await page.screenshot(shotFar);
    summary.shots.push({ id: `graveyard-far-${light}`, path: shotFar, casket: casketFar, church: churchFar, openGrave: graveFar });

    // Inside view (dist ~30m < 50m: casket visible!)
    await lookAtTarget(gy.x + 21, gy.z + 21, gy.x, gy.z, 0.08);
    await wait(350);
    const casketNear = await checkPropVisibility('reliquary');
    const churchNear = await checkPropVisibility('church-shell');
    const graveNear = await checkPropVisibility('open-grave');
    const shotNear = path.join(OUT, `graveyard-near-${light}.png`);
    await page.screenshot(shotNear);
    summary.shots.push({ id: `graveyard-near-${light}`, path: shotNear, casket: casketNear, church: churchNear, openGrave: graveNear });
  }

  // =========================================================================
  // 6. Armory Wall: Rack Folded & Taking Gun Off (CU-199)
  // =========================================================================
  console.log('=== 6. Testing Armory Wall Rack: Folded draws & take gun off ===');
  for (const [light, time] of [['noon', 0.42], ['dusk', 0.74]]) {
    await page.evaluate(`TT.setWorldTime(${time})`);

    // Position player right at HQ Armory front
    const armoryState = await page.evaluate(`(async () => {
      const T = TT;
      const front = T.HQ_ARMORY_FRONT || { x: 5.9, z: -3.5 };
      T.player.position.set(front.x, T.sampleHeight(front.x, front.z), front.z);
      // Give several guns owned
      const guns = ['pistol', 'shotgun', 'm4', 'uzi', 'sniper'];
      for (const g of guns) {
        if (T.weaponOwned) T.weaponOwned[g] = true;
      }
      const pIdx = T.WEAPON_ORDER ? T.WEAPON_ORDER.indexOf('pistol') : 0;
      if (T.setWeapon && pIdx >= 0) T.setWeapon(pIdx);
      if (T.armoryDbg && T.armoryDbg.refreshRack) T.armoryDbg.refreshRack(true);
      await new Promise(r => setTimeout(r, 600));

      const rack = T.house && T.house.armoryRack;
      let meshCount = 0;
      if (rack) {
        rack.traverse(o => { if (o.isMesh) meshCount++; });
      }
      const rInfo = (T.renderer.info && T.renderer.info.render) || {};

      // Look straight at armory rack
      const rackPos = new T.THREE.Vector3();
      if (rack) rack.getWorldPosition(rackPos);
      else rackPos.set(front.x - 1.5, T.sampleHeight(front.x, front.z) + 1.2, front.z);

      const dx = rackPos.x - front.x, dz = rackPos.z - front.z;
      const yaw = Math.atan2(dx, dz);
      T.setAimYawDbg(yaw);
      if (T.setOtsAimDbg) T.setOtsAimDbg(yaw, 0.05);

      return {
        near: T.nearArmory ? T.nearArmory() : true,
        gunsOwned: guns,
        rackMeshCount: meshCount,
        rackVisible: rack ? rack.visible : false,
        rackKinds: T.armoryDbg ? T.armoryDbg.rack() : null,
        drawCalls: rInfo.drawCalls ?? rInfo.calls ?? 0
      };
    })()`);
    summary.armory[`mounted-${light}`] = armoryState;

    await wait(400);
    const shotArmory = path.join(OUT, `armory-wall-multi-guns-${light}.png`);
    await page.screenshot(shotArmory);
    summary.shots.push({ id: `armory-wall-${light}`, path: shotArmory, state: armoryState });

    // Now take a gun off the rack (e.g. remove sniper off the rack)
    const armoryTakeOffState = await page.evaluate(`(async () => {
      const T = TT;
      // Take sniper off the wall
      if (T.weaponOwned) T.weaponOwned['sniper'] = false;
      const mIdx = T.WEAPON_ORDER ? T.WEAPON_ORDER.indexOf('m4') : 1;
      if (T.setWeapon && mIdx >= 0) T.setWeapon(mIdx);
      if (T.armoryDbg && T.armoryDbg.refreshRack) T.armoryDbg.refreshRack(true);
      await new Promise(r => setTimeout(r, 600));

      const rack = T.house && T.house.armoryRack;
      let meshCount = 0;
      if (rack) {
        rack.traverse(o => { if (o.isMesh) meshCount++; });
      }
      const rInfo = (T.renderer.info && T.renderer.info.render) || {};
      return {
        currentWeapon: T.getCurrentWeapon ? T.getCurrentWeapon() : 'm4',
        rackMeshCount: meshCount,
        rackKinds: T.armoryDbg ? T.armoryDbg.rack() : null,
        drawCalls: rInfo.drawCalls ?? rInfo.calls ?? 0
      };
    })()`);
    summary.armory[`takeoff-${light}`] = armoryTakeOffState;

    await wait(400);
    const shotTakeOff = path.join(OUT, `armory-wall-after-takeoff-${light}.png`);
    await page.screenshot(shotTakeOff);
    summary.shots.push({ id: `armory-takeoff-${light}`, path: shotTakeOff, state: armoryTakeOffState });
  }

  // =========================================================================
  // 7. Stitch Contact Sheet for CU-199
  // =========================================================================
  console.log('=== 7. Stitching CU-199 Contact Sheet ===');
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
    path.join(OUT, 'hq-valley-level-noon.png'),
    path.join(OUT, 'hq-valley-level-dusk.png'),
    path.join(OUT, 'sandbags-near-noon.png'),
    path.join(OUT, 'sandbags-far-noon.png'),
    path.join(OUT, 'warren-board-near-noon.png'),
    path.join(OUT, 'warren-board-far-noon.png'),
    path.join(OUT, 'trapper-yard-near-noon.png'),
    path.join(OUT, 'trapper-yard-far-noon.png'),
    path.join(OUT, 'graveyard-near-noon.png'),
    path.join(OUT, 'graveyard-far-noon.png'),
    path.join(OUT, 'armory-wall-multi-guns-noon.png'),
    path.join(OUT, 'armory-wall-after-takeoff-noon.png')
  ];
  const keyLabels = [
    'HQ level across valley (noon)',
    'HQ level across valley (dusk)',
    'Sandbags near: brass (<28m) & helmet (<55m) visible',
    'Sandbags far: brass culled (>28m); helmet visible (<55m)',
    'Warren board near (<55m): board visible',
    'Warren board far (>55m): board culled',
    'Trapper near (<28m): traps & horseshoes visible',
    'Trapper far (>28m): traps culled; hatch & post stay',
    'Graveyard near (<50m): casket visible; church stays',
    'Graveyard far (>50m): casket culled; church & grave stay',
    'Armory rack: folded into draws with multiple guns',
    'Armory rack: after taking gun off, rack rebuilds & reads'
  ];
  await stitchGrid(keyShots, keyLabels, 3, 4, path.join(OUT, 'cu199-props-armory-sheet.png'));

  fs.writeFileSync(path.join(OUT, 'cu199-summary.json'), JSON.stringify(summary, null, 2));
  console.log('=== CU-199 shots complete! Saved in qa/2026-11-01-CU-199/ ===');
} finally {
  try { await browser.close(); } catch (_) {}
  try { server.close(); } catch (_) {}
}
