import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot (node crew/crew.mjs slot run ...)');

const ROOT = process.cwd();
const OUT_ROOT = path.join(ROOT, 'qa', 'AG-402');
fs.mkdirSync(OUT_ROOT, { recursive: true });

const KINDS = [
  'shambler',
  'feral',
  'drowned',
  'spitter',
  'brute',
  'demon',
  'colossus',
  'guardian',
  'caveguard',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const metrics = {
  at: new Date().toISOString(),
  renderer: null,
  viewport: [1920, 1080],
  training: {},
  night12: {},
  errors: [],
};

// Browser-side helper installed once per load
function installHelpers() {
  const T = window.TT;
  const THREE = T.THREE;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function hideHud() {
    for (const id of ['hud', 'topBar', 'ammoHud', 'crosshair', 'reticle', 'trainingHud', 'waveBanner', 'bigBanner', 'placeBanner', 'minimap', 'tips', 'controlsHint', 'fpsBox']) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    }
    document.querySelectorAll('.hud, .banner, .training-hud').forEach((el) => { el.style.display = 'none'; });
  }

  function zombieBox(obj) {
    if (!obj) return null;
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return null;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    return {
      min: box.min.toArray(),
      max: box.max.toArray(),
      center: center.toArray(),
      size: size.toArray(),
    };
  }

  function frameObj(obj, { yawDeg = 22, pitchDeg = 10, margin = 1.28, fov = 36, distOverride = null, clampTraining = true } = {}) {
    const b = zombieBox(obj);
    if (!b) return null;
    const [cx, cy, cz] = b.center;
    const [sx, sy, sz] = b.size;
    const radius = Math.max(0.45, Math.hypot(sx, sy, sz) * 0.5);
    const fovRad = (fov * Math.PI) / 180;
    const aspect = innerWidth / Math.max(1, innerHeight);
    const hFovRad = 2 * Math.atan(Math.tan(fovRad / 2) * aspect);
    const fitV = (sy * 0.5 * margin) / Math.tan(fovRad / 2);
    const fitH = (Math.max(sx, sz) * 0.5 * margin) / Math.tan(hFovRad / 2);
    const dist = distOverride != null ? distOverride : Math.max(1.4, Math.max(fitV, fitH, radius * 1.45));
    const baseYaw = obj.rotation ? obj.rotation.y : 0;
    const yaw = baseYaw + (yawDeg * Math.PI) / 180;
    const pitch = (pitchDeg * Math.PI) / 180;
    const horiz = dist * Math.cos(pitch);
    let x = cx + Math.sin(yaw) * horiz;
    let y = cy + Math.sin(pitch) * dist;
    let z = cz + Math.cos(yaw) * horiz;
    if (clampTraining && T.trainingDbg?.state()?.active) {
      const floorY = T.trainingDbg.tg()?.floorY ?? -200;
      x = clamp(x, -42.6, -11.4);
      z = clamp(z, -650.2, -613.2);
      y = Math.max(floorY + 0.35, Math.min(floorY + 18, y));
    } else {
      const gy = T.sampleHeight ? T.sampleHeight(x, z) : 0;
      y = Math.max(gy + 0.35, y);
    }
    return { cam: { x, y, z, tx: cx, ty: cy, tz: cz, fov }, box: b, dist };
  }

  function framePlayDistance(zObj, { dist = 8.2, sideOffset = 1.15, heightOffset = 1.65, fov = 50, clampTraining = true } = {}) {
    const b = zombieBox(zObj);
    if (!b) return null;
    const [cx, cy, cz] = b.center;
    const px = T.player.position.x, py = T.player.position.y, pz = T.player.position.z;
    let dx = px - cx, dz = pz - cz;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    // Right vector perpendicular to player->zombie
    const rx = -dz, rz = dx;
    let x = cx + dx * dist + rx * sideOffset;
    let z = cz + dz * dist + rz * sideOffset;
    let y = (clampTraining ? (T.trainingDbg.tg()?.floorY ?? py) : (T.sampleHeight ? T.sampleHeight(x, z) : py)) + heightOffset;
    if (clampTraining && T.trainingDbg?.state()?.active) {
      const floorY = T.trainingDbg.tg()?.floorY ?? -200;
      x = clamp(x, -42.6, -11.4);
      z = clamp(z, -650.2, -613.2);
      y = Math.max(floorY + 0.5, y);
    }
    return { cam: { x, y, z, tx: cx, ty: cy + 0.08, tz: cz, fov }, box: b, dist };
  }

  function isAttacking(z) {
    if (!z || !z.alive) return false;
    if ((z.attackWindup || 0) > 0.005 || (z.swingT || 0) > 0.005) return true;
    if ((z.spitT || 0) > 0.005 || (z.abilityT || 0) > 0.005) return true;
    if (z._pendingAttack) return true;
    if (z.spitWindup > 0 || z.spitPhase) return true;
    const rig = z.mesh?.userData?.bossRig?.userData?.rig;
    if (rig && (rig.attackT > 0 || rig.slamT > 0 || rig.swingT > 0 || rig.lungeT > 0 || rig.biteT > 0)) return true;
    return false;
  }

  function stateOf(z) {
    if (!z) return null;
    const b = z.mesh ? zombieBox(z.mesh) : null;
    const floorY = T.trainingDbg?.state()?.active
      ? (T.trainingDbg.tg()?.floorY ?? -200)
      : (T.sampleHeight && z.mesh ? T.sampleHeight(z.mesh.position.x, z.mesh.position.z) : 0);
    return {
      typeKey: z.typeKey,
      alive: !!z.alive,
      dying: !!z.dying,
      hp: z.hp,
      pos: z.mesh ? z.mesh.position.toArray().map((n) => +n.toFixed(3)) : null,
      yaw: z.mesh ? +z.mesh.rotation.y.toFixed(3) : 0,
      windup: +(z.attackWindup || 0).toFixed(3),
      swing: +(z.swingT || 0).toFixed(3),
      spitT: +(z.spitT || 0).toFixed(3),
      abilityT: +(z.abilityT || 0).toFixed(3),
      pending: !!z._pendingAttack,
      distToPlayer: z.mesh ? +Math.hypot(z.mesh.position.x - T.player.position.x, z.mesh.position.z - T.player.position.z).toFixed(2) : null,
      floorY: +floorY.toFixed(3),
      boxMinY: b ? +b.min[1].toFixed(4) : null,
      boxMaxY: b ? +b.max[1].toFixed(4) : null,
      boxSize: b ? b.size.map((n) => +n.toFixed(3)) : null,
      floorClearanceMm: b ? +((b.min[1] - floorY) * 1000).toFixed(1) : null,
    };
  }

  function clearAll() {
    T.flightHold(true);
    try { if (T.trainingDbg?.state()?.active) T.trainingDbg.clear(); } catch {}
    try { T.clearZombies(); } catch {}
    // Also remove lingering corpses so each kind starts clean
    if (Array.isArray(T.corpses)) {
      for (const c of T.corpses) {
        if (c?.mesh) {
          c.mesh.visible = false;
          if (c.mesh.parent) c.mesh.parent.remove(c.mesh);
        }
      }
      T.corpses.length = 0;
    }
    T.setHp(99999);
    T.setArmor(999);
    T.slowMoDbg(0);
    T.stepFrame(0);
  }

  function parkTrainingPlayer(zPos = -632) {
    const tg = T.trainingDbg.tg();
    const floorY = tg.floorY;
    T.setViewFirstDbg(false);
    tg.setLights(true);
    T.player.position.set(-26, floorY, zPos);
    T.setVelDbg(0, 0);
    T.setAimYawDbg(0);
    if (T.grantWeaponDbg) {
      try {
        T.grantWeaponDbg('m4');
        const idx = T.WEAPON_ORDER ? T.WEAPON_ORDER.indexOf('m4') : -1;
        if (idx >= 0) T.setWeapon(idx);
      } catch {}
    }
    T.setHp(99999);
    T.setArmor(999);
    hideHud();
    T.stepFrame(0);
    return { floorY, px: -26, pz: zPos };
  }

  function spawnTrainingKind(kind) {
    clearAll();
    const { floorY } = parkTrainingPlayer(-632);
    let z = null;
    if (kind === 'caveguard') {
      z = T.spawnZombie(-26, -616, 'caveguard', true, true);
      if (z) {
        z.trainingZ = true;
        z.sleeping = false;
        z.awake = true;
        if (z.mesh) {
          z.mesh.position.set(-26, floorY, -616);
          z.mesh.rotation.y = Math.PI;
          z.mesh.visible = true;
        }
      }
    } else {
      const n = T.trainingDbg.deployNow(kind, 1);
      if (!n) throw new Error('deployNow returned 0 for ' + kind);
      z = T.zombies.find((q) => q.alive && q.typeKey === kind);
    }
    if (!z) throw new Error('Failed to spawn ' + kind);
    T.stepFrame(1 / 60);
    return stateOf(z);
  }

  function stepFrames(n, dt = 1 / 60) {
    T.flightHold(true);
    for (let i = 0; i < n; i++) {
      T.setHp(99999);
      T.stepFrame(dt);
    }
  }

  function advanceToApproach(kind) {
    const z = T.zombies.find((q) => q.alive && q.typeKey === kind);
    if (!z) throw new Error('No live ' + kind);
    for (let i = 0; i < 420; i++) {
      stepFrames(2);
      const dist = Math.hypot(z.mesh.position.x - T.player.position.x, z.mesh.position.z - T.player.position.z);
      const inRoom = z.mesh.visible && !z.trainingEntry && z.mesh.position.z < -615.5;
      if (inRoom && dist <= 13.5 && i >= 20) break;
      if (inRoom && dist <= 9.5) break;
    }
    // Step a few extra frames to land clearly mid-stride
    stepFrames(14);
    return stateOf(z);
  }

  function advanceToAttack(kind) {
    const z = T.zombies.find((q) => q.alive && q.typeKey === kind);
    if (!z) throw new Error('No live ' + kind);
    const startGlobs = T.acidGlobs ? T.acidGlobs.length : 0;
    let attacked = false;
    for (let i = 0; i < 450; i++) {
      stepFrames(2);
      const globsNow = T.acidGlobs ? T.acidGlobs.length : 0;
      if (isAttacking(z) || globsNow > startGlobs) {
        // Advance 4-6 frames into active swing/spit peak so limbs/claws are extended
        stepFrames(5);
        attacked = true;
        break;
      }
      // If slow zombie is still far after 140 iterations, step player closer to provoke attack near player
      const dist = Math.hypot(z.mesh.position.x - T.player.position.x, z.mesh.position.z - T.player.position.z);
      if (i === 140 && dist > 4.0) {
        const floorY = T.trainingDbg.tg().floorY;
        const targetDist = kind === 'spitter' ? 6.5 : Math.max(1.3, (z.radius || 0.5) + 0.9);
        const dirX = T.player.position.x - z.mesh.position.x;
        const dirZ = T.player.position.z - z.mesh.position.z;
        const len = Math.hypot(dirX, dirZ) || 1;
        const nx = clamp(z.mesh.position.x + (dirX / len) * targetDist, -40, -13);
        const nz = clamp(z.mesh.position.z + (dirZ / len) * targetDist, -648, -616);
        T.player.position.set(nx, floorY, nz);
      }
      if (i === 260 && dist > 2.2) {
        const floorY = T.trainingDbg.tg().floorY;
        const targetDist = Math.max(1.1, (z.radius || 0.5) + 0.55);
        const nz = clamp(z.mesh.position.z - targetDist, -648, -616);
        T.player.position.set(z.mesh.position.x, floorY, nz);
      }
    }
    return { attacked, state: stateOf(z) };
  }

  function killAndCaptureMid(kind) {
    const z = T.zombies.find((q) => q.alive && q.typeKey === kind);
    if (!z) throw new Error('No live ' + kind + ' to kill');
    const dir = { x: 0, z: 1 };
    T.killZombie(z, false, { kind: 'bullet', dir, hitY: z.mesh.position.y + 1.3 });
    T.slowMoDbg(0);
    stepFrames(14);
    const c = T.corpses.at(-1);
    return { corpseIndex: T.corpses.length - 1, hasCorpse: !!c, state: c ? corpseState(c) : null };
  }

  function settleCorpse() {
    for (let i = 0; i < 65; i++) {
      stepFrames(2);
      const c = T.corpses.at(-1);
      if (c && c.frozen && i >= 15) break;
    }
    const c = T.corpses.at(-1);
    return c ? corpseState(c) : null;
  }

  function corpseState(c) {
    const b = c.mesh ? zombieBox(c.mesh) : null;
    const floorY = T.trainingDbg?.state()?.active
      ? (T.trainingDbg.tg()?.floorY ?? -200)
      : (T.sampleHeight && c.mesh ? T.sampleHeight(c.mesh.position.x, c.mesh.position.z) : 0);
    return {
      typeKey: c.typeKey,
      frozen: !!c.frozen,
      t: +(c.t || 0).toFixed(3),
      pos: c.mesh ? c.mesh.position.toArray().map((n) => +n.toFixed(3)) : null,
      floorY: +floorY.toFixed(3),
      boxMinY: b ? +b.min[1].toFixed(4) : null,
      boxMaxY: b ? +b.max[1].toFixed(4) : null,
      boxSize: b ? b.size.map((n) => +n.toFixed(3)) : null,
      floorClearanceMm: b ? +((b.min[1] - floorY) * 1000).toFixed(1) : null,
    };
  }

  function setCamAndRender(cam) {
    T.flightHold(true);
    T.setShotView(cam);
    T.stepFrame(0);
    return cam;
  }

  window.AG402 = {
    hideHud,
    zombieBox,
    frameObj,
    framePlayDistance,
    stateOf,
    corpseState,
    clearAll,
    parkTrainingPlayer,
    spawnTrainingKind,
    stepFrames,
    advanceToApproach,
    advanceToAttack,
    killAndCaptureMid,
    settleCorpse,
    setCamAndRender,
    isAttacking,
  };
  return true;
}

async function capturePng(page, fileAbs, lastHashRef) {
  await page.evaluate('TT.stepFrame(0);');
  await sleep(70);
  await page.evaluate('TT.stepFrame(0);');
  await sleep(60);
  const res = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const png = Buffer.from(res.data, 'base64');
  assert(png.length > 5000, `PNG suspiciously small (${png.length} B): ${fileAbs}`);
  const h = crypto.createHash('sha256').update(png).digest('hex');
  if (lastHashRef.hash && lastHashRef.hash === h) {
    // Retry once with an extra render tick
    await page.evaluate('TT.stepFrame(0);');
    await sleep(120);
    const res2 = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const png2 = Buffer.from(res2.data, 'base64');
    const h2 = crypto.createHash('sha256').update(png2).digest('hex');
    assert.notEqual(h2, lastHashRef.hash, `Stale identical frame detected for ${fileAbs}`);
    lastHashRef.hash = h2;
    fs.mkdirSync(path.dirname(fileAbs), { recursive: true });
    fs.writeFileSync(fileAbs, png2);
    const th = await page.send('Page.captureScreenshot', {
      format: 'jpeg',
      quality: 84,
      captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 640 / 1920 },
    });
    return { bytes: png2.length, hash: h2, thumb: th.data };
  }
  lastHashRef.hash = h;
  fs.mkdirSync(path.dirname(fileAbs), { recursive: true });
  fs.writeFileSync(fileAbs, png);
  const th = await page.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 84,
    captureBeyondViewport: false,
    clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 640 / 1920 },
  });
  return { bytes: png.length, hash: h, thumb: th.data };
}

async function run() {
  const engine = new Engine({ training: true, onscreen: true, size: '1920x1080', warm: 'none' });
  const lastHashRef = { hash: null };

  try {
    console.log('[AG-402] Opening native WebGPU 1920x1080 Training session...');
    await engine.open();
    const page = engine.page;
    const backend = await page.evaluate('TT.getRendererBackend()');
    console.log(`[AG-402] Renderer backend: ${backend}, renderer string: ${engine.renderer}`);
    assert.equal(backend, 'WebGPU', `Expected WebGPU backend, got ${backend}`);
    metrics.renderer = { backend, detail: engine.renderer };

    await page.evaluate(`(${installHelpers.toString()})()`);

    // ─── PART 1: TRAINING CALL-INS FOR ALL 9 LANDED KINDS ───────────────────
    for (const kind of KINDS) {
      const t0 = Date.now();
      console.log(`\n[AG-402] === Training QA: ${kind} ===`);
      const kindDir = path.join(OUT_ROOT, kind);
      fs.mkdirSync(kindDir, { recursive: true });

      const spawnInfo = await page.evaluate(`AG402.spawnTrainingKind(${JSON.stringify(kind)})`);
      const approachInfo = await page.evaluate(`AG402.advanceToApproach(${JSON.stringify(kind)})`);
      console.log(`  [${kind}] approach:`, JSON.stringify({ pos: approachInfo.pos, dist: approachInfo.distToPlayer, size: approachInfo.boxSize, floorClearMm: approachInfo.floorClearanceMm }));

      const thumbs = [];
      const shotsMeta = {};

      const takeLive = async (id, label, camCode) => {
        const framed = await page.evaluate(camCode);
        assert(framed && framed.cam, `Failed to frame ${kind} ${id}`);
        await page.evaluate(`AG402.setCamAndRender(${JSON.stringify(framed.cam)})`);
        const fileAbs = path.join(kindDir, `${id}.png`);
        const cap = await capturePng(page, fileAbs, lastHashRef);
        const rel = path.relative(ROOT, fileAbs).split(path.sep).join('/');
        thumbs.push({ data: cap.thumb, label: `${kind.toUpperCase()} · ${label}` });
        shotsMeta[id] = { file: rel, bytes: cap.bytes, cam: framed.cam, box: framed.box };
        return rel;
      };

      const zExpr = `TT.zombies.find(q => q.alive && q.typeKey === ${JSON.stringify(kind)})?.mesh`;

      // 1-4: Walk / Approach (play distance + close front/side/back)
      const playDist = (kind === 'colossus' || kind === 'guardian' || kind === 'caveguard') ? 10.5 : 7.8;
      await takeLive('01-play-approach', '01 Play distance approach', `AG402.framePlayDistance(${zExpr}, { dist: ${playDist}, sideOffset: 1.35, heightOffset: 1.75, fov: 50 })`);
      await takeLive('02-close-front', '02 Close front 3/4 (walk)', `AG402.frameObj(${zExpr}, { yawDeg: 22, pitchDeg: 8, margin: 1.24, fov: 35 })`);
      await takeLive('03-close-side', '03 Close side (walk)', `AG402.frameObj(${zExpr}, { yawDeg: 88, pitchDeg: 6, margin: 1.24, fov: 35 })`);
      await takeLive('04-close-back', '04 Close rear 3/4 (walk)', `AG402.frameObj(${zExpr}, { yawDeg: 158, pitchDeg: 10, margin: 1.24, fov: 35 })`);

      // 5-7: Attack near player
      const atkInfo = await page.evaluate(`AG402.advanceToAttack(${JSON.stringify(kind)})`);
      console.log(`  [${kind}] attack:`, JSON.stringify({ attacked: atkInfo.attacked, windup: atkInfo.state.windup, swing: atkInfo.state.swing, dist: atkInfo.state.distToPlayer, floorClearMm: atkInfo.state.floorClearanceMm }));
      const atkPlayDist = (kind === 'colossus' || kind === 'guardian' || kind === 'caveguard') ? 8.5 : 5.8;
      await takeLive('05-attack-play', '05 Attack play distance', `AG402.framePlayDistance(${zExpr}, { dist: ${atkPlayDist}, sideOffset: 1.65, heightOffset: 1.65, fov: 50 })`);
      await takeLive('06-attack-close-front', '06 Attack close front 3/4', `AG402.frameObj(${zExpr}, { yawDeg: -24, pitchDeg: 8, margin: 1.30, fov: 36 })`);
      await takeLive('07-attack-close-side', '07 Attack close side', `AG402.frameObj(${zExpr}, { yawDeg: -86, pitchDeg: 7, margin: 1.30, fov: 36 })`);

      // 8-9: Death mid-fall + settled corpse
      const deathMid = await page.evaluate(`AG402.killAndCaptureMid(${JSON.stringify(kind)})`);
      const cExpr = `TT.corpses.at(-1)?.mesh`;
      await takeLive('08-death-mid', '08 Death mid-collapse', `AG402.frameObj(${cExpr}, { yawDeg: 38, pitchDeg: 22, margin: 1.34, fov: 38 })`);

      const corpseSettled = await page.evaluate(`AG402.settleCorpse()`);
      console.log(`  [${kind}] corpse:`, JSON.stringify({ frozen: corpseSettled?.frozen, floorClearMm: corpseSettled?.floorClearanceMm, size: corpseSettled?.boxSize }));
      await takeLive('09-death-corpse', '09 Settled corpse', `AG402.frameObj(${cExpr}, { yawDeg: 42, pitchDeg: 28, margin: 1.32, fov: 38 })`);

      const sheetRel = await engine.sheet(thumbs, { cols: 3, tile: 640, sheetFile: `qa/AG-402/${kind}-sheet.jpg` }, []);
      console.log(`  [${kind}] sheet -> ${sheetRel} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

      metrics.training[kind] = {
        spawn: spawnInfo,
        approach: approachInfo,
        attack: atkInfo,
        deathMid: deathMid.state,
        corpse: corpseSettled,
        sheet: sheetRel,
        shots: shotsMeta,
      };
    }

    // ─── PART 2: NIGHT 1-2 REAL OUTDOOR MATCH PLAYTEST ──────────────────────
    console.log('\n[AG-402] === Switching to Match mode for Night 1-2 outdoor playtest ===');
    engine.opt.training = false;
    engine.opt.match = true;
    await engine.load();
    await page.evaluate(`(${installHelpers.toString()})()`);

    const n12Dir = path.join(OUT_ROOT, 'night12');
    fs.mkdirSync(n12Dir, { recursive: true });
    const n12Thumbs = [];
    const n12Shots = {};

    const takeN12 = async (id, label, camCode) => {
      const framed = await page.evaluate(camCode);
      assert(framed && framed.cam, `Failed to frame night12 ${id}`);
      await page.evaluate(`AG402.setCamAndRender(${JSON.stringify(framed.cam)})`);
      const fileAbs = path.join(n12Dir, `${id}.png`);
      const cap = await capturePng(page, fileAbs, lastHashRef);
      const rel = path.relative(ROOT, fileAbs).split(path.sep).join('/');
      n12Thumbs.push({ data: cap.thumb, label });
      n12Shots[id] = { file: rel, bytes: cap.bytes, cam: framed.cam, box: framed.box };
      return rel;
    };

    // Night 1: Shamblers
    console.log('[AG-402] Starting Night 1...');
    const n1State = await page.evaluate(`(() => {
      const T = window.TT;
      T.flightHold(true);
      T.setViewFirstDbg(false);
      T.devJumpToNight(1, true);
      T.setWorldTime(0.02);
      T.setHp(99999);
      T.setArmor(999);
      if (T.grantWeaponDbg) {
      try {
        T.grantWeaponDbg('m4');
        const idx = T.WEAPON_ORDER ? T.WEAPON_ORDER.indexOf('m4') : -1;
        if (idx >= 0) T.setWeapon(idx);
      } catch {}
    }
      if (T.flashlight && !T.flashlight.visible && T.toggleFlashlightDbg) T.toggleFlashlightDbg();
      AG402.hideHud();
      // Step until at least one real Night 1 shambler is active
      for (let i = 0; i < 180; i++) {
        T.stepFrame(1 / 60);
        const live = T.zombies.filter(z => z.alive && z.typeKey === 'shambler' && z.mesh?.visible);
        if (live.length >= 2 && i >= 60) break;
      }
      let z = T.zombies.find(q => q.alive && q.typeKey === 'shambler' && q.mesh?.visible);
      if (!z) {
        const px = T.player.position.x, pz = T.player.position.z;
        z = T.spawnZombie(px, pz + 11, 'shambler', true, false);
        for (let i = 0; i < 60; i++) T.stepFrame(1 / 60);
      } else {
        // Move player to ~9.5m in front of the real Night 1 shambler so we see real outdoor combat without waiting 60s
        const zx = z.mesh.position.x, zz = z.mesh.position.z;
        const px = zx + 2.0, pz = zz + 9.0;
        T.player.position.set(px, T.sampleHeight(px, pz), pz);
        T.setAimYawDbg(Math.atan2(zx - px, zz - pz));
        for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
      }
      window.__n1z = z;
      return AG402.stateOf(z);
    })()`);
    console.log('  [Night 1] shambler approach:', JSON.stringify(n1State));
    await takeN12('01-n1-shambler-play', 'N1 Shambler play distance (moon + flashlight)', `AG402.framePlayDistance(window.__n1z.mesh, { dist: 7.5, sideOffset: 1.3, heightOffset: 1.7, fov: 50, clampTraining: false })`);

    const n1Atk = await page.evaluate(`(() => {
      const T = window.TT, z = window.__n1z;
      for (let i = 0; i < 240; i++) {
        T.setHp(99999);
        T.stepFrame(1 / 60);
        if (AG402.isAttacking(z)) { for (let k = 0; k < 5; k++) T.stepFrame(1 / 60); break; }
        const d = Math.hypot(z.mesh.position.x - T.player.position.x, z.mesh.position.z - T.player.position.z);
        if (i === 90 && d > 2.2) {
          const px = z.mesh.position.x, pz = z.mesh.position.z + 1.35;
          T.player.position.set(px, T.sampleHeight(px, pz), pz);
        }
      }
      return AG402.stateOf(z);
    })()`);
    await takeN12('02-n1-shambler-attack', 'N1 Shambler close attack', `AG402.frameObj(window.__n1z.mesh, { yawDeg: 28, pitchDeg: 10, margin: 1.32, fov: 38, clampTraining: false })`);

    const n1Corpse = await page.evaluate(`(() => {
      const T = window.TT, z = window.__n1z;
      T.killZombie(z, false, { kind: 'bullet', dir: { x: 0, z: -1 }, hitY: z.mesh.position.y + 1.3 });
      T.slowMoDbg(0);
      for (let i = 0; i < 110; i++) { T.stepFrame(1 / 60); const c = T.corpses.at(-1); if (c?.frozen && i > 25) break; }
      return AG402.corpseState(T.corpses.at(-1));
    })()`);
    await takeN12('03-n1-shambler-corpse', 'N1 Shambler corpse on terrain', `AG402.frameObj(TT.corpses.at(-1).mesh, { yawDeg: 38, pitchDeg: 26, margin: 1.35, fov: 38, clampTraining: false })`);
    metrics.night12.night1 = { approach: n1State, attack: n1Atk, corpse: n1Corpse };

    // Night 2: Ferals + outdoor night lighting checks (spitter, demon, colossus)
    console.log('[AG-402] Starting Night 2...');
    const n2State = await page.evaluate(`(() => {
      const T = window.TT;
      T.flightHold(true);
      T.devJumpToNight(2, true);
      T.setWorldTime(0.02);
      T.setHp(99999);
      T.setArmor(999);
      AG402.hideHud();
      for (let i = 0; i < 180; i++) {
        T.stepFrame(1 / 60);
        if (T.zombies.some(z => z.alive && z.typeKey === 'feral' && z.mesh?.visible)) break;
      }
      let z = T.zombies.find(q => q.alive && q.typeKey === 'feral' && q.mesh?.visible);
      if (!z) {
        const px = T.player.position.x, pz = T.player.position.z;
        z = T.spawnZombie(px, pz + 11, 'feral', true, true);
        for (let i = 0; i < 35; i++) T.stepFrame(1 / 60);
      } else {
        const zx = z.mesh.position.x, zz = z.mesh.position.z;
        const px = zx + 1.5, pz = zz + 9.0;
        T.player.position.set(px, T.sampleHeight(px, pz), pz);
        T.setAimYawDbg(Math.atan2(zx - px, zz - pz));
        for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      }
      window.__n2z = z;
      return AG402.stateOf(z);
    })()`);
    console.log('  [Night 2] feral approach:', JSON.stringify(n2State));
    await takeN12('04-n2-feral-play', 'N2 Feral play distance (run)', `AG402.framePlayDistance(window.__n2z.mesh, { dist: 7.5, sideOffset: 1.3, heightOffset: 1.7, fov: 50, clampTraining: false })`);

    const n2Atk = await page.evaluate(`(() => {
      const T = window.TT, z = window.__n2z;
      for (let i = 0; i < 200; i++) {
        T.setHp(99999);
        T.stepFrame(1 / 60);
        if (AG402.isAttacking(z)) { for (let k = 0; k < 4; k++) T.stepFrame(1 / 60); break; }
        const d = Math.hypot(z.mesh.position.x - T.player.position.x, z.mesh.position.z - T.player.position.z);
        if (i === 70 && d > 2.2) {
          const px = z.mesh.position.x, pz = z.mesh.position.z + 1.3;
          T.player.position.set(px, T.sampleHeight(px, pz), pz);
        }
      }
      return AG402.stateOf(z);
    })()`);
    await takeN12('05-n2-feral-attack', 'N2 Feral close attack', `AG402.frameObj(window.__n2z.mesh, { yawDeg: 30, pitchDeg: 10, margin: 1.32, fov: 38, clampTraining: false })`);

    const n2Corpse = await page.evaluate(`(() => {
      const T = window.TT, z = window.__n2z;
      T.killZombie(z, false, { kind: 'bullet', dir: { x: 0, z: -1 }, hitY: z.mesh.position.y + 1.2 });
      T.slowMoDbg(0);
      for (let i = 0; i < 110; i++) { T.stepFrame(1 / 60); const c = T.corpses.at(-1); if (c?.frozen && i > 25) break; }
      return AG402.corpseState(T.corpses.at(-1));
    })()`);
    await takeN12('06-n2-feral-corpse', 'N2 Feral corpse on terrain', `AG402.frameObj(TT.corpses.at(-1).mesh, { yawDeg: 38, pitchDeg: 26, margin: 1.35, fov: 38, clampTraining: false })`);

    // 3 quick Night 2 outdoor readability shots (Spitter P2 glow, Demon P1 flames, Colossus P1 silhouette)
    const nightExtras = [
      ['07-n2-spitter-night', 'spitter', 'N2 Spitter P2 night glow (outdoor)', 7.0],
      ['08-n2-demon-night', 'demon', 'N2 Demon P1 night flames (outdoor)', 7.5],
      ['09-n2-colossus-night', 'colossus', 'N2 Colossus P1 night scale (outdoor)', 10.5],
    ];
    const extrasMeta = {};
    for (const [id, kind, label, dist] of nightExtras) {
      const st = await page.evaluate(`(() => {
        const T = window.TT;
        T.clearZombies();
        const px = 4, pz = 14;
        T.player.position.set(px, T.sampleHeight(px, pz), pz);
        T.setAimYawDbg(Math.PI);
        const z = T.spawnZombie(px, pz - 8.5, ${JSON.stringify(kind)}, true, true);
        for (let i = 0; i < 40; i++) { T.setHp(99999); T.stepFrame(1 / 60); }
        window.__nxz = z;
        return AG402.stateOf(z);
      })()`);
      await takeN12(id, label, `AG402.framePlayDistance(window.__nxz.mesh, { dist: ${dist}, sideOffset: 1.5, heightOffset: 1.75, fov: 48, clampTraining: false })`);
      extrasMeta[kind] = st;
    }

    const n12SheetRel = await engine.sheet(n12Thumbs, { cols: 3, tile: 640, sheetFile: 'qa/AG-402/night12-sheet.jpg' }, []);
    console.log(`[AG-402] Night 1-2 sheet -> ${n12SheetRel}`);
    metrics.night12.night2 = { approach: n2State, attack: n2Atk, corpse: n2Corpse, extras: extrasMeta };
    metrics.night12.sheet = n12SheetRel;
    metrics.night12.shots = n12Shots;

    if (page.errors && page.errors.length) metrics.errors = page.errors.slice();
  } catch (err) {
    console.error('[AG-402] ERROR:', err?.stack || err);
    metrics.fatalError = String(err?.stack || err);
    process.exitCode = 1;
  } finally {
    await engine.close();
    fs.writeFileSync(path.join(OUT_ROOT, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n', 'utf8');
    console.log('[AG-402] Done; closed browser and wrote qa/AG-402/metrics.json');
  }
}

run();
