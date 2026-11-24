import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { IdleProofCamera } from '../../review/GP-20218/proof-camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot (node crew/crew.mjs slot run ...)');

const OUT = 'qa/AG-404/cj-r4';
mkdirSync(OUT, { recursive: true });

const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

const FILES = {
  live: 'index.html',
  r4_1_probe: 'review/CJ-R4/index.r4-1-probe.html',
  r4_1_both: 'review/CJ-R4/index.r4-1-both.html',
  r4_1_fix: 'review/CJ-R4/index.r4-1-fix.html',
  r4_3: 'review/CJ-R4/index.r4-3.html',
};

const EXPECTED_MD5 = {
  live: '22afb368',
  r4_1_probe: 'c123ad98',
  r4_1_both: '42225af8',
  r4_1_fix: '51d45eb1',
  r4_3: '25bd1f40',
};

const pins = {};
for (const [k, f] of Object.entries(FILES)) {
  const m = md5(f);
  assert.equal(m.slice(0, 8), EXPECTED_MD5[k], `MD5 mismatch for ${f}: got ${m}, expected ${EXPECTED_MD5[k]}`);
  pins[k] = { file: f, md5: m, sha256: sha256(f) };
}

const probeEvalCode = readFileSync('review/CJ-R4/r4-1/probe-eval.js', 'utf8');
const results = { pins, r4_1_probe: {}, r4_1_visual_and_trace: {}, r4_3_drum: {} };

async function verifyServed(camera, expectedSha) {
  const r = await fetch(camera.server.origin + '/index.html');
  assert(r.ok);
  const s = createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex');
  assert.equal(s, expectedSha, 'Served index.html sha256 mismatch');
  assert.equal(await camera.page.evaluate('TT.getRendererBackend()'), 'WebGPU');
  assert.equal(await camera.page.evaluate('document.visibilityState'), 'visible');
}

// --- 1A. CJ R4 #1 probe-eval.js on index.r4-1-probe.html (before) and index.r4-1-both.html (after) ---
for (const [label, key] of [['before', 'r4_1_probe'], ['after', 'r4_1_both']]) {
  const camera = new IdleProofCamera({ onscreen: true, training: true, size: '1600x900', warm: 'none', files: { '/index.html': FILES[key] } });
  try {
    await camera.open();
    await verifyServed(camera, pins[key].sha256);
    const out = await camera.page.evaluate(`(() => { const T = window.TT; ${probeEvalCode} })()`, 120000);
    results.r4_1_probe[label] = out;
    console.log('R4_1_PROBE', label, JSON.stringify(out));
    assert.deepEqual(camera.page.errors, []);
  } finally {
    await camera.close();
  }
}

// --- 1B. CJ R4 #1 glow pair (dark Training, side view ~2.5 m) + 1 s burst trace on LIVE (22afb368) vs CLEAN FIX (51d45eb1) ---
async function runR4_1VisualAndTrace(label, key) {
  const dir = `${OUT}/r4-1-${label}`;
  mkdirSync(dir, { recursive: true });
  const camera = new IdleProofCamera({ onscreen: true, training: true, size: '1600x900', warm: 'none', files: { '/index.html': FILES[key] } });
  try {
    await camera.open();
    await verifyServed(camera, pins[key].sha256);
    const page = camera.page;
    const ev = (code, ms = 90000) => page.evaluate(code, ms);
    await ev(`(() => {
      const T = TT, D = T.trainingDbg, tg = D.tg(), V = T.THREE.Vector3;
      tg.setLights(false);
      CamRig.ui(false);
      T.clearZombies();
      T.flightHold(true);
      T.flightInput({ keys: [], fire: false, zoom: false });
      T.grantAllWeapons();
      T.setUnarmedDbg(false);
      T.setWeapon(T.WEAPON_ORDER.indexOf('minigun'));
      T.setAmmoDbg('minigun', 290);
      T.setViewFirstDbg(false);
      const px = tg.origin.x - 10, py = tg.floorY, pz = tg.origin.z - 4;
      T.player.position.set(px, py, pz);
      T.setVelDbg(0, 0);
      T.setOtsAimDbg(0, 0);
      T.pinAimDbg(() => { T.aimTarget.set(px, py + 1.25, pz + 30); T.setAimYawDbg(0); });
      // Side view of the gun hand, ~2.5 m away on the right side
      T.setShotView({ x: px + 2.45, y: py + 1.22, z: pz + 0.55, tx: px + 0.15, ty: py + 1.05, tz: pz + 0.45, fov: 42 });
      // Deterministic PRNG for burst
      let s = 133742;
      window.__origRand = Math.random;
      Math.random = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
      for (let i = 0; i < 60; i++) T.stepFrame(1 / 60);
      // Spin up until first round fires
      T.flightInput({ keys: [], fire: true, zoom: false });
      let spun = 0;
      const startAmmo = T.getAmmo().minigun;
      while (spun < 120 && T.getAmmo().minigun === startAmmo) {
        T.stepFrame(1 / 60);
        spun++;
      }
      window.__r4SpinFrames = spun;
      window.__r4Read = () => {
        const gun = T.weaponMeshes.minigun;
        const m = T.getMarine();
        m.updateMatrixWorld(true);
        const flashObj = gun.userData.flash;
        const muzzle = flashObj ? flashObj.getWorldPosition(new V()).toArray() : null;
        const mount = m.userData.weaponMount;
        const mountPos = mount.position.toArray();
        const mountQuat = mount.quaternion.toArray();
        const fl = gun.userData.flashLight;
        let lightInfo = null;
        if (fl) {
          const wp = fl.getWorldPosition(new V()).toArray();
          lightInfo = { intensity: fl.intensity, localPos: fl.position.toArray(), worldPos: wp };
        }
        // Also find any scene-level point light near player that's lit
        const litPoints = [];
        T.scene.traverse((o) => {
          if (o.isPointLight && o.intensity > 0.01) {
            const wp = o.getWorldPosition(new V());
            if (wp.distanceTo(T.player.position) < 4) {
              litPoints.push({ name: o.name || 'PointLight', intensity: +o.intensity.toFixed(3), worldPos: wp.toArray().map((n) => +n.toFixed(4)), parent: o.parent?.name || o.parent?.type || '' });
            }
          }
        });
        return { ammo: T.getAmmo().minigun, muzzle, mountPos, mountQuat, lightInfo, litPoints };
      };
      return { spun, first: window.__r4Read() };
    })()`);

    const trace = [];
    let glowShot = null;
    let glowShot2 = null;
    // Capture first lit frame immediately (spin loop stopped on first firing frame!)
    const f0 = await ev('window.__r4Read()');
    await ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
    await page.screenshot(`${dir}/glow-frame0.png`);
    glowShot = { file: `${dir}/glow-frame0.png`, frame: 0, state: f0 };
    trace.push({ frame: 0, ...f0 });

    // Record 60 frames (1.0 s burst at 60 Hz)
    for (let f = 1; f <= 60; f++) {
      const st = await ev(`(() => { TT.stepFrame(1 / 60); return window.__r4Read(); })()`);
      trace.push({ frame: f, ...st });
      if (!glowShot2 && f >= 6 && st.ammo < trace[f - 1].ammo) {
        await ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
        await page.screenshot(`${dir}/glow-frame-mid.png`);
        glowShot2 = { file: `${dir}/glow-frame-mid.png`, frame: f, state: st };
      }
    }
    assert.deepEqual(page.errors, []);
    return { glowShot, glowShot2, trace };
  } finally {
    await camera.close();
  }
}

const r41Before = await runR4_1VisualAndTrace('before', 'live');
const r41After = await runR4_1VisualAndTrace('after', 'r4_1_fix');

// Compare 1 s burst trace frame-by-frame
let maxMuzzleDelta = 0, maxMountPosDelta = 0, maxMountQuatDelta = 0, ammoMismatches = 0;
for (let i = 0; i < r41Before.trace.length; i++) {
  const a = r41Before.trace[i], b = r41After.trace[i];
  if (a.ammo !== b.ammo) ammoMismatches++;
  const dm = Math.hypot(a.muzzle[0] - b.muzzle[0], a.muzzle[1] - b.muzzle[1], a.muzzle[2] - b.muzzle[2]);
  if (dm > maxMuzzleDelta) maxMuzzleDelta = dm;
  const dp = Math.hypot(a.mountPos[0] - b.mountPos[0], a.mountPos[1] - b.mountPos[1], a.mountPos[2] - b.mountPos[2]);
  if (dp > maxMountPosDelta) maxMountPosDelta = dp;
  const dq = Math.max(...a.mountQuat.map((v, idx) => Math.abs(v - b.mountQuat[idx])));
  if (dq > maxMountQuatDelta) maxMountQuatDelta = dq;
}

results.r4_1_visual_and_trace = {
  framesCompared: r41Before.trace.length,
  ammoMismatches,
  maxMuzzleDelta,
  maxMountPosDelta,
  maxMountQuatDelta,
  beforeGlow: r41Before.glowShot,
  afterGlow: r41After.glowShot,
  beforeGlowMid: r41Before.glowShot2,
  afterGlowMid: r41After.glowShot2,
};
console.log('R4_1_TRACE_DIFF', JSON.stringify({ framesCompared: r41Before.trace.length, ammoMismatches, maxMuzzleDelta, maxMountPosDelta, maxMountQuatDelta }));

// --- 2. CJ R4 #3 (metal hit pop): drum shot frames 1, 2, 3, 5 after hit + mote count ---
function drumImpactWitness(T) {
  let s = 202863;
  Math.random = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
  const drum = T.getMapDrums().find((o) => o.alive && Math.abs(o.x + 104.2) < 0.11 && Math.abs(o.z + 42.4) < 0.11);
  if (!drum) throw Error('Named matched map drum missing');
  const collider = drum.colliders[0];
  const near = (ax, az, bx, bz, x, z, radius) => {
    const dx = bx - ax, dz = bz - az;
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(ax + dx * u - x, az + dz * u - z) < radius;
  };
  const blocked = (sx, sz, ex, ez) =>
    T.worldSolids.some((o) => o !== collider && near(sx, sz, ex, ez, o.x, o.z, (o.radius || 0) + 1.2)) ||
    T.trees.some((o) => o.alive !== false && near(sx, sz, ex, ez, o.x, o.z, 2.5)) ||
    T.rocks.some((o) => o.alive !== false && near(sx, sz, ex, ez, o.x, o.z, (o.radius || 1) + 1));
  let dir;
  for (let k = 0; k < 16 && !dir; k++) {
    const angle = (k / 16) * Math.PI * 2, ux = Math.sin(angle), uz = Math.cos(angle);
    const lines = [0, 0.9].map((o) => [collider.x - ux * 4 + uz * o, collider.z - uz * 4 - ux * o, collider.x + ux * 4 + uz * o, collider.z + uz * 4 - ux * o]);
    if (!lines.some((line) => blocked(...line))) dir = { ux, uz };
  }
  if (!dir) throw Error('No clear launch line');
  const hp = drum.hp, motesBefore = new Set(T.motes), debrisBefore = new Set(T.debris);
  const start = [collider.x - dir.ux * 1.8, collider.y0 + 0.5, collider.z - dir.uz * 1.8];
  const projectile = T.fireRoundDbg(...start, dir.ux, 0, dir.uz, 1, 100, 0);
  let stepsToHit = 0;
  for (let k = 0; k < 6 && T.projectiles.includes(projectile); k++) {
    T.stepProjectilesDbg(1 / 30);
    stepsToHit++;
  }
  const active = T.projectiles.includes(projectile);
  const newMotes = T.motes.filter((m) => !motesBefore.has(m));
  const newDebris = T.debris.filter((d) => !debrisBefore.has(d));
  const moteBreakdown = newMotes.map((m) => ({
    life: +(m.life || 0).toFixed(3),
    scale: +(m.scale || m.s0 || (m.mesh?.scale?.x ?? 0)).toFixed(3),
    speed: +Math.hypot(m.vx || 0, m.vy || 0, m.vz || 0).toFixed(2),
  }));
  return {
    drum: [drum.x, drum.z], dir, start, hp, after: drum.hp, active, stepsToHit,
    newMotesCount: newMotes.length,
    newDebrisCount: newDebris.length,
    moteBreakdown,
  };
}

async function runDrum(label, key) {
  const dir = `${OUT}/r4-3-${label}`;
  mkdirSync(dir, { recursive: true });
  const camera = new IdleProofCamera({ onscreen: true, size: '1600x900', warm: 'none', files: { '/index.html': FILES[key] } });
  try {
    await camera.open();
    await verifyServed(camera, pins[key].sha256);
    const p = camera.page;
    await p.evaluate(readFileSync('tools/tests/lib.js', 'utf8'));
    assert.equal(await p.evaluate("startMatch(TT,'AG-404 CJ R4 #3 drum').then(()=>TT.getPhase())", 180000), 'prep');
    await p.evaluate(`(() => {
      TT.clearZombies();
      TT.skipGrace();
      TT.setWorldTime(0.5);
      CamRig.ui(false);
      TT.setViewFirstDbg(false);
      TT.setShotView({ x: -102.7, y: 1.0, z: -44.1, tx: -104.4, ty: 0.5, tz: -42.4, fov: 50 });
      TT.flightHold(true);
      for (let i = 0; i < 6; i++) TT.stepFrame(1 / 60);
    })()`);
    const hit = await p.evaluate(`(${drumImpactWitness.toString()})(TT)`);
    assert.equal(hit.active, false, `${label}: projectile did not hit drum`);
    assert(hit.after < hit.hp, `${label}: drum hp did not drop`);
    await p.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
    await p.screenshot(`${dir}/drum-f0-hit.png`);

    const frameShots = {};
    for (const targetFrame of [1, 2, 3, 5]) {
      const stepsNeeded = targetFrame === 5 ? 2 : 1;
      for (let s = 0; s < stepsNeeded; s++) {
        await p.evaluate('TT.stepFrame(1 / 30)');
      }
      await p.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
      const liveMotes = await p.evaluate('TT.motes.length');
      const file = `${dir}/drum-f${targetFrame}.png`;
      await p.screenshot(file);
      frameShots[`f${targetFrame}`] = { file, ms: Math.round((targetFrame * 1000) / 30), liveMotes };
    }
    assert.deepEqual(p.errors, []);
    console.log('R4_3_DRUM', label, JSON.stringify({ newMotes: hit.newMotesCount, newDebris: hit.newDebrisCount, frameShots }));
    return { hit, frameShots };
  } finally {
    await camera.close();
  }
}

results.r4_3_drum.before = await runDrum('before', 'live');
results.r4_3_drum.after = await runDrum('after', 'r4_3');

writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2) + '\n');
console.log('CJR4_DONE');
