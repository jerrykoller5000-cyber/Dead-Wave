import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

const out = 'qa/2026-10-26-AG-134';
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
    g.fillStyle = '#0d0f12';
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

  await e.page.evaluate(`(async () => {
    const T = window.TT;
    T.runDevCommand('godmode');
    T.clearZombies();
    T.weather.raining = false;
    T.weather.intensity = 0;
    T.setWorldTime(0.42);
    for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);
  })()`);

  const report = {
    task: 'AG-134',
    renderer: await e.page.evaluate(`window.TT.getGpuString ? window.TT.getGpuString() : 'WebGPU'`),
    hushProps: {},
    warrenWalk: {},
    warrenStops: [],
    worldChanges: {},
    tests: {}
  };

  // 1. Verify Hush Spare Board Props (carried on belt + wired on HQ radio set) in 4 lights
  report.hushProps.checks = await e.page.evaluate(`(() => {
    const T = window.TT, D = T.hushDbg;
    D.board('none');
    const p0 = D.props();
    const noneState = { carriedVis: !!(p0.carried && p0.carried.visible), wiredVis: !!(p0.wired && p0.wired.visible) };
    D.board('carried');
    const carriedState = {
      carriedVis: !!(p0.carried && p0.carried.visible),
      wiredVis: !!(p0.wired && p0.wired.visible),
      carriedDraws: T.drawsOf(p0.carried).length
    };
    D.wire();
    const wiredState = {
      board: D.board(),
      carriedVis: !!(p0.carried && p0.carried.visible),
      wiredVis: !!(p0.wired && p0.wired.visible),
      wiredDraws: T.drawsOf(p0.wired).length
    };
    return { noneState, carriedState, wiredState };
  })()`);

  const lights = [
    { id: 'noon', t: 0.42, rain: false },
    { id: 'overcast', t: 0.42, rain: true },
    { id: 'dusk', t: 0.78, rain: false },
    { id: 'night', t: 0.02, rain: false }
  ];

  // Baseline BEFORE ('none') shot on HQ radio set at noon
  await e.page.evaluate(`(() => {
    const T = window.TT, V = T.THREE.Vector3;
    T.hushDbg.board('none');
    T.weather.raining = false; T.weather.intensity = 0;
    T.setWorldTime(0.42);
    const rs = T.house.group.getObjectByName('hq-radio-set');
    rs.updateMatrixWorld(true);
    const target = rs.localToWorld(new V(0.05, 0.08, 0.08));
    const eye = rs.localToWorld(new V(0.14, 0.20, 0.72));
    T.player.position.set(eye.x + 1.5, T.sampleHeight(eye.x + 1.5, eye.z - 1.0), eye.z - 1.0);
    T.setShotView({ x: eye.x, y: eye.y, z: eye.z, tx: target.x, ty: target.y, tz: target.z, fov: 38 });
    for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
  })()`);
  const beforeRadioFile = `${out}/hush-radio-before-none-noon.png`;
  await e.page.screenshot(beforeRadioFile);

  report.hushProps.shots = [];
  for (const L of lights) {
    // Carried board on marine's left utility belt (3P close-up)
    await e.page.evaluate(`(() => {
      const T = window.TT, V = T.THREE.Vector3;
      T.hushDbg.board('carried');
      if (T.setViewFirstDbg) T.setViewFirstDbg(false);
      T.weather.raining = ${L.rain}; T.weather.intensity = ${L.rain ? 0.85 : 0};
      T.setWorldTime(${L.t});
      const px = 4.5, pz = -7.2, py = T.sampleHeight(px, pz);
      T.player.position.set(px, py, pz);
      T.player.rotation.set(0, 0, 0);
      T.setAimYawDbg(0);
      T.setAimTargetDbg(px, pz + 8);
      T.setShotView(null);
      for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
      const cb = T.hushDbg.props().carried;
      cb.updateMatrixWorld(true);
      const target = cb.getWorldPosition(new V());
      const eye = new V(target.x + 0.52, target.y + 0.14, target.z - 0.36);
      T.setShotView({ x: eye.x, y: eye.y, z: eye.z, tx: target.x, ty: target.y - 0.01, tz: target.z, fov: 35 });
      for (let i = 0; i < 6; i++) T.stepFrame(1 / 60);
    })()`);
    const cFile = `${out}/hush-carried-belt-${L.id}.png`;
    await e.page.screenshot(cFile);
    report.hushProps.shots.push({ kind: 'carried', light: L.id, file: cFile });

    // Wired board on HQ radio set (close-up showing L-bracket, PCB, phase toroid, cyan LED, and jumper cables)
    await e.page.evaluate(`(() => {
      const T = window.TT, V = T.THREE.Vector3;
      T.hushDbg.board('wired');
      T.weather.raining = ${L.rain}; T.weather.intensity = ${L.rain ? 0.85 : 0};
      T.setWorldTime(${L.t});
      const rs = T.house.group.getObjectByName('hq-radio-set');
      rs.updateMatrixWorld(true);
      const target = rs.localToWorld(new V(0.05, 0.08, 0.08));
      const eye = rs.localToWorld(new V(0.14, 0.20, 0.72));
      T.player.position.set(eye.x + 1.5, T.sampleHeight(eye.x + 1.5, eye.z - 1.0), eye.z - 1.0);
      T.setShotView({ x: eye.x, y: eye.y, z: eye.z, tx: target.x, ty: target.y, tz: target.z, fov: 38 });
      for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
    })()`);
    const wFile = `${out}/hush-wired-radio-${L.id}.png`;
    await e.page.screenshot(wFile);
    report.hushProps.shots.push({ kind: 'wired-close', light: L.id, file: wFile });
  }

  await e.page.evaluate(`window.TT.setShotView(null)`);

  // 2. Enter the Iron Warren (CL-259) and walk from Mouth to the Deep in 3P and 1P
  const warrenInfo = await e.page.evaluate(`(() => {
    const T = window.TT;
    T.weather.raining = false; T.weather.intensity = 0;
    T.setWorldTime(0.42);
    const built = T.enterHollow({ theme: 'iron', cave: 0 });
    window.__ag134Built = built;
    const plan = built.plan;
    const C = 6;
    const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const byIJ = new Map(plan.cells.map(c => [c.i + ',' + c.j, c]));
    const byId = new Map(plan.cells.map(c => [c.id, c]));
    const mouth = byId.get(plan.mouthCell);
    const deepCells = plan.deep.map(id => byId.get(id));
    const prev = new Map([[mouth.id, null]]);
    const q = [mouth];
    let targetDeep = deepCells[0];
    while (q.length) {
      const cur = q.shift();
      if (cur.kind === 'deep') { targetDeep = cur; break; }
      for (let s = 0; s < 4; s++) {
        if (!cur.open[s]) continue;
        const n = byIJ.get((cur.i + DIRS[s][0]) + ',' + (cur.j + DIRS[s][1]));
        if (n && !prev.has(n.id)) {
          prev.set(n.id, cur.id);
          q.push(n);
        }
      }
    }
    const routeIds = [];
    for (let at = targetDeep ? targetDeep.id : mouth.id; at != null; at = prev.get(at)) routeIds.unshift(at);
    const routeCells = routeIds.map(id => {
      const c = byId.get(id);
      const cx = c.i * C + 3, cz = c.j * C + 3;
      return { id: c.id, kind: c.kind, depth: c.depth, i: c.i, j: c.j, x: cx, z: cz, y: built.groundAt(cx, cz), roof: built.roofAt(cx, cz), open: c.open };
    });
    return {
      entry: built.entry,
      ramps: plan.ramps,
      chambers: plan.chambers,
      deep: plan.deep,
      strongbox: built.points.strongbox,
      runeDoor: built.doors.rune,
      passage: built.exits.deep,
      routeCells
    };
  })()`);
  report.warrenWalk.plan = warrenInfo;

  // Continuous 3P walk & corner-turn probe along the route from mouth to the Deep
  report.warrenWalk.walk3P = await e.page.evaluate(`(() => {
    const T = window.TT, W = T.warrenDbg(), B = window.__ag134Built;
    T.setShotView(null);
    if (T.setViewFirstDbg) T.setViewFirstDbg(false);
    const route = ${JSON.stringify(warrenInfo.routeCells)};
    const samples = [];
    let prevCam = null;
    let maxCamJump = 0, minCamDist = 99, maxCamDist = 0, minRoofMargin = 99, outOfOpenCount = 0, poppedUpCount = 0;
    for (let idx = 0; idx < route.length; idx++) {
      const cur = route[idx];
      const next = route[Math.min(route.length - 1, idx + 1)];
      const prev = route[Math.max(0, idx - 1)];
      const yaw = Math.atan2(next.x - prev.x, next.z - prev.z);
      const steps = 12;
      for (let s = 0; s < steps; s++) {
        const u = s / steps;
        const px = idx === 0 && s === 0 ? B.entry.x : prev.x + (cur.x - prev.x) * u;
        const pz = idx === 0 && s === 0 ? B.entry.z : prev.z + (cur.z - prev.z) * u;
        const fy = B.groundAt(px, pz);
        if (fy == null) continue;
        T.player.position.set(px, fy, pz);
        T.player.rotation.y = yaw;
        T.setAimYawDbg(yaw);
        T.stepFrame(1 / 60);
        const cp = T.camera.position;
        const roof = W.roof(cp.x, cp.z) ?? W.roof(px, pz);
        const open = W.open(cp.x, cp.y, cp.z);
        const dist = Math.hypot(cp.x - T.player.position.x, cp.z - T.player.position.z);
        const roofMargin = roof != null ? roof - cp.y : 99;
        const jump = prevCam && s > 0 ? Math.hypot(cp.x - prevCam.x, cp.y - prevCam.y, cp.z - prevCam.z) : 0;
        prevCam = { x: cp.x, y: cp.y, z: cp.z };
        if (jump > maxCamJump) maxCamJump = jump;
        if (dist < minCamDist) minCamDist = dist;
        if (dist > maxCamDist) maxCamDist = dist;
        if (roofMargin < minRoofMargin) minRoofMargin = roofMargin;
        if (!open) outOfOpenCount++;
        if (T.player.position.y > -350) poppedUpCount++;
        if (s === steps - 1) {
          samples.push({
            cellId: cur.id, kind: cur.kind, depth: cur.depth,
            playerY: +T.player.position.y.toFixed(2),
            cam: [+cp.x.toFixed(2), +cp.y.toFixed(2), +cp.z.toFixed(2)],
            camDist: +dist.toFixed(2),
            camAboveFloor: +(cp.y - T.player.position.y).toFixed(2),
            roofMargin: +roofMargin.toFixed(2),
            open
          });
        }
      }
    }
    // Corner rotation sweep at a tunnel corner: rotate 3P camera orbit 360 deg in 60 steps (6 deg/frame) to check for camera pull-in smoothness
    const cornerCell = route.find(c => c.kind === 'tunnel' && c.depth === 1) || route[1] || route[0];
    T.player.position.set(cornerCell.x + 0.9, cornerCell.y, cornerCell.z + 0.9);
    const turnSamples = [];
    let maxTurnStep = 0, prevTurnDist = null;
    const dAng = (Math.PI * 2) / 60;
    for (let k = 0; k < 60; k++) {
      T.rotateCamera(dAng);
      const y = (k / 60) * Math.PI * 2;
      T.player.rotation.y = y;
      T.setAimYawDbg(y);
      T.stepFrame(1 / 60);
      const cp = T.camera.position;
      const d = Math.hypot(cp.x - T.player.position.x, cp.z - T.player.position.z);
      if (prevTurnDist != null) maxTurnStep = Math.max(maxTurnStep, Math.abs(d - prevTurnDist));
      prevTurnDist = d;
      if (k % 10 === 0) turnSamples.push({ deg: k * 6, camDist: +d.toFixed(2), open: W.open(cp.x, cp.y, cp.z) });
    }
    return {
      totalRouteCells: route.length,
      minCamDist: +minCamDist.toFixed(2),
      maxCamDist: +maxCamDist.toFixed(2),
      minRoofMargin: +minRoofMargin.toFixed(2),
      maxCamJumpWithinCell: +maxCamJump.toFixed(3),
      outOfOpenCount,
      poppedUpCount,
      cornerTurnMaxDistStepM: +maxTurnStep.toFixed(3),
      turnSamples,
      samples
    };
  })()`);

  const stops = await e.page.evaluate(`(() => {
    const B = window.__ag134Built, P = B.plan, C = 6;
    const byId = new Map(P.cells.map(c => [c.id, c]));
    const cellInfo = (id) => {
      const c = byId.get(id);
      const x = c.i * C + 3, z = c.j * C + 3;
      return { id: c.id, kind: c.kind, depth: c.depth, x, y: B.groundAt(x, z), z, open: c.open };
    };
    const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const openYaw = (c, preferSide = 2) => {
      const s = c.open[preferSide] ? preferSide : c.open.findIndex(Boolean);
      const [di, dj] = DIRS[s >= 0 ? s : 2];
      return Math.atan2(di, dj);
    };
    const ch1 = cellInfo(P.chambers[0]);
    const r1 = byId.get(P.ramps[0]);
    const r1x = r1.i * C + 3, r1z = r1.j * C + 3;
    const ch2 = cellInfo(P.chambers[P.chambers.length - 1]);
    const r2 = byId.get(P.ramps[1]);
    const r2x = r2.i * C + 3, r2z = r2.j * C + 3;
    return [
      { name: '1-mouth-entry', label: 'Depth 1 Mouth (entry)', x: B.entry.x, y: B.groundAt(B.entry.x, B.entry.z), z: B.entry.z, yaw: 0 },
      { name: '2-tunnel-nearwall', label: 'Depth 1 Tunnel Near Wall', x: B.entry.x + 1.05, y: B.groundAt(B.entry.x, B.entry.z + 6), z: B.entry.z + 6, yaw: 0.45 },
      { name: '3-gallery-chamber', label: 'Depth 1 Gallery Chamber', x: ch1.x, y: ch1.y, z: ch1.z, yaw: openYaw(ch1, 2) },
      { name: '4-ramp-d1-d2', label: 'Ramp 1 (Depth 1 -> 2)', x: r1x, y: B.groundAt(r1x, r1z), z: r1z, yaw: Math.atan2(DIRS[r1.rampSide][0], DIRS[r1.rampSide][1]) },
      { name: '5-narrows-chamber', label: 'Depth 2 Narrows Chamber', x: ch2.x, y: ch2.y, z: ch2.z, yaw: openYaw(ch2, 2) },
      { name: '6-ramp-d2-d3', label: 'Ramp 2 (Depth 2 -> 3)', x: r2x, y: B.groundAt(r2x, r2z), z: r2z, yaw: Math.atan2(DIRS[r2.rampSide][0], DIRS[r2.rampSide][1]) },
      { name: '7-deep-chamber', label: 'Depth 3 The Deep (Rune Door & Strongbox)', x: B.points.set.x, y: B.groundAt(B.points.set.x, B.points.set.z), z: B.points.set.z, yaw: B.doors.rune.yaw + Math.PI }
    ];
  })()`);

  for (const st of stops) {
    for (const view of ['3p', '1p']) {
      const m = await e.page.evaluate(`(() => {
        const T = window.TT, W = T.warrenDbg();
        T.setShotView(null);
        if (T.setViewFirstDbg) T.setViewFirstDbg(${view === '1p'});
        T.player.position.set(${st.x}, ${st.y}, ${st.z});
        T.player.rotation.y = ${st.yaw};
        T.setAimYawDbg(${st.yaw});
        T.setAimTargetDbg(${st.x} + Math.sin(${st.yaw}) * 8, ${st.z} + Math.cos(${st.yaw}) * 8);
        for (let i = 0; i < 35; i++) T.stepFrame(1 / 60);
        const cp = T.camera.position, pp = T.player.position;
        const roof = W.roof(cp.x, cp.z) ?? W.roof(pp.x, pp.z);
        return {
          view: '${view}',
          stop: '${st.name}',
          label: '${st.label}',
          playerPos: [+pp.x.toFixed(2), +pp.y.toFixed(2), +pp.z.toFixed(2)],
          camPos: [+cp.x.toFixed(2), +cp.y.toFixed(2), +cp.z.toFixed(2)],
          camDistM: +Math.hypot(cp.x - pp.x, cp.z - pp.z).toFixed(2),
          camAboveFloorM: +(cp.y - pp.y).toFixed(2),
          roofY: roof != null ? +roof.toFixed(2) : null,
          open: W.open(cp.x, cp.y, cp.z)
        };
      })()`);
      const file = `${out}/warren-${view}-${st.name}.png`;
      await e.page.screenshot(file);
      m.file = file;
      report.warrenStops.push(m);
    }
  }

  await e.page.evaluate(`window.TT.leaveHollow('mouth')`);

  // 3. CL-263-world GPU verification: Night 2 dark HQ (unpowered vs can poured) & Clarke's truck headlamp at night
  await e.page.evaluate(`(() => {
    const T = window.TT;
    T.storyDbg.gate(true);
    T.setRelayUpDbg(false);
    T.setDay(1); T.startPrep();
    T.setWorldTime(0.92); // Night sky while in Day 2 prep (before alarm red lockdown lights override bayLampMat)
    for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
    if (T.setViewFirstDbg) T.setViewFirstDbg(false);
    const gy = T.house.group.position.y;
    T.player.position.set(0, T.sampleHeight(0, -9.5), -9.5);
    T.player.rotation.y = 0;
    T.setAimYawDbg(0);
    T.setShotView({ x: 3.4, y: gy + 3.2, z: -14.2, tx: 0, ty: gy + 1.9, tz: -3.5, fov: 50 });
    for (let i = 0; i < 15; i++) T.stepFrame(1 / 60);
  })()`);
  const hqDarkShot = `${out}/cl263-night2-hq-unpowered.png`;
  await e.page.screenshot(hqDarkShot);
  report.worldChanges.hqUnpowered = await e.page.evaluate(`(() => {
    const W = window.TT.worldChangeDbg;
    return { powered: W.powered(), bay: W.bay(), flood: W.flood(), beacon: W.beacon() };
  })()`);
  report.worldChanges.hqUnpowered.file = hqDarkShot;

  await e.page.evaluate(`(() => {
    const T = window.TT, W = T.worldChangeDbg;
    W.pour();
    T.setWorldTime(0.92);
    for (let i = 0; i < 110; i++) T.stepFrame(1 / 60);
  })()`);
  const hqPoweredShot = `${out}/cl263-night2-hq-powered.png`;
  await e.page.screenshot(hqPoweredShot);
  report.worldChanges.hqPowered = await e.page.evaluate(`(() => {
    const W = window.TT.worldChangeDbg;
    return { powered: W.powered(), bay: W.bay(), flood: W.flood() };
  })()`);
  report.worldChanges.hqPowered.file = hqPoweredShot;

  const hasTruck = await e.page.evaluate(`!!(window.TT.POI && window.TT.POI.wrecks && window.TT.POI.wrecks[1] && window.TT.POI.wrecks[1].mesh)`);
  if (hasTruck) {
    await e.page.evaluate(`(() => {
      const T = window.TT;
      T.setWorldTime(0.86);
      const g = T.POI.wrecks[1].mesh;
      const c = Math.cos(g.rotation.y), sn = Math.sin(g.rotation.y);
      const at = (lx, lz) => { const x = g.position.x + lx * c + lz * sn, z = g.position.z - lx * sn + lz * c; return { x, y: T.sampleHeight(x, z), z }; };
      const eye = at(2.2, -7.2);
      const tgt = at(0.3, -2.4);
      const pSpot = at(3.5, -5.5);
      T.player.position.set(pSpot.x, pSpot.y, pSpot.z);
      T.setShotView({ x: eye.x, y: eye.y + 1.85, z: eye.z, tx: tgt.x, ty: tgt.y + 0.85, tz: tgt.z, fov: 48 });
      for (let i = 0; i < 15; i++) T.stepFrame(1 / 60);
    })()`);
    const truckDarkShot = `${out}/cl263-truck-night-chained-dark.png`;
    await e.page.screenshot(truckDarkShot);

    await e.page.evaluate(`(() => {
      const T = window.TT, M = T.truckDbg.mission;
      M.takeCutters();
      for (let i = 0; i < 80 && !M.unlocked(); i++) M.hold(0.25);
      T.setWorldTime(0.86);
      for (let i = 0; i < 25; i++) T.stepFrame(1 / 60);
    })()`);
    const truckLitShot = `${out}/cl263-truck-night-cut-headlamp.png`;
    await e.page.screenshot(truckLitShot);
    report.worldChanges.truck = {
      unlocked: await e.page.evaluate(`window.TT.truckDbg.mission.unlocked()`),
      lampOn: await e.page.evaluate(`window.TT.worldChangeDbg.truckLamp()`),
      beforeFile: truckDarkShot,
      afterFile: truckLitShot
    };
  }

  await e.page.evaluate(`window.TT.setShotView(null)`);

  // 4. Build Contact Sheets
  await makeSheet(
    e.page,
    report.warrenStops.map((s) => ({
      file: s.file,
      label: `${s.view.toUpperCase()} ${s.label} (dist=${s.camDistM}m, open=${s.open})`
    })),
    path.join(out, 'cl259-warren-3p-1p-sheet.jpg'),
    4, 480
  );

  await makeSheet(
    e.page,
    [
      { file: beforeRadioFile, label: 'BEFORE: HQ Radio Set (board=none, noon)' },
      ...report.hushProps.shots.map((s) => ({
        file: s.file,
        label: `AFTER: ${s.kind === 'carried' ? 'Carried Spare Board on Belt' : 'Wired Spare Board on HQ Radio'} (${s.light})`
      })),
      { file: hqDarkShot, label: 'CL-263 Night 2 Unpowered HQ (flood & bay dark)' },
      { file: hqPoweredShot, label: 'CL-263 Night 2 Can Poured (flood & bay lit)' },
      ...(report.worldChanges.truck ? [
        { file: report.worldChanges.truck.beforeFile, label: 'CL-263 Truck Chained at Night (lamp dark)' },
        { file: report.worldChanges.truck.afterFile, label: 'CL-263 Truck Cut at Night (right headlamp pool)' }
      ] : [])
    ],
    path.join(out, 'ag134-hush-props-and-cl263-sheet.jpg'),
    4, 480
  );

  // 5. Run t302, t303, t215 in the same browser session
  const libCode = fs.readFileSync('tools/tests/lib.js', 'utf8');
  await e.page.evaluate(libCode);
  for (const tName of ['t302', 't303', 't215']) {
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
} finally {
  await e.close();
}
