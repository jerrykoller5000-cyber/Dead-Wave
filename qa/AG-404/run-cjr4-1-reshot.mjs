import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { IdleProofCamera } from '../../review/GP-20218/proof-camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot');

const OUT = 'qa/AG-404/cj-r4';
mkdirSync(OUT, { recursive: true });

const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

const LIVE = 'index.html';
const FIX = 'review/CJ-R4/index.r4-1-fix.html';
assert.equal(md5(LIVE).slice(0, 8), '22afb368');
assert.equal(md5(FIX).slice(0, 8), '51d45eb1');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runSide(label, file) {
  const dir = `${OUT}/r4-1-${label}`;
  mkdirSync(dir, { recursive: true });
  const expectedSha = sha256(file);
  const camera = new IdleProofCamera({ onscreen: true, training: true, size: '1600x900', warm: 'none', files: { '/index.html': file } });
  try {
    await camera.open();
    const r = await fetch(camera.server.origin + '/index.html');
    assert.equal(createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex'), expectedSha);
    const page = camera.page;
    const ev = (code, ms = 90000) => page.evaluate(code, ms);
    assert.equal(await ev('TT.getRendererBackend()'), 'WebGPU');

    const setup = await ev(`(() => {
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
      // Open center of Training build room (-26, floorY, -632), 18m from every wall
      const px = -26, py = tg.floorY, pz = -632;
      T.player.position.set(px, py, pz);
      T.setVelDbg(0, 0);
      T.setOtsAimDbg(0, 0);
      T.pinAimDbg(() => { T.aimTarget.set(px, py + 1.25, pz + 30); T.setAimYawDbg(0); });
      // Side view of the gun hand, ~2.5 m away on the right (+X) side, facing the marine & barrel (+Z)
      const cam = { x: px + 2.50, y: py + 1.22, z: pz + 0.55, tx: px + 0.05, ty: py + 1.02, tz: pz + 0.45, fov: 40 };
      window.__r4Cam = cam;
      T.setShotView(cam);
      // Deterministic PRNG
      let s = 133742;
      Math.random = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
      for (let i = 0; i < 60; i++) T.stepFrame(1 / 60);
      T.flightInput({ keys: [], fire: true, zoom: false });
      let spun = 0;
      const startAmmo = T.getAmmo().minigun;
      while (spun < 120 && T.getAmmo().minigun === startAmmo) {
        T.stepFrame(1 / 60);
        spun++;
      }
      window.__r4Read = () => {
        const gun = T.weaponMeshes.minigun;
        const m = T.getMarine();
        m.updateMatrixWorld(true);
        const muzzle = gun.userData.flash.getWorldPosition(new V()).toArray();
        const mount = m.userData.weaponMount;
        const mountPos = mount.position.toArray();
        const mountQuat = mount.quaternion.toArray();
        const fl = gun.userData.flashLight;
        const lightPos = fl ? fl.getWorldPosition(new V()).toArray() : null;
        const lightInt = fl ? fl.intensity : 0;
        const lightDistToMuzzle = lightPos ? Math.hypot(lightPos[0] - muzzle[0], lightPos[1] - muzzle[1], lightPos[2] - muzzle[2]) : null;
        return {
          sim: +T.getSimTime().toFixed(4),
          ammo: T.getAmmo().minigun,
          muzzle,
          mountPos,
          mountQuat,
          lightInt,
          lightPos,
          lightDistToMuzzle: lightDistToMuzzle !== null ? +lightDistToMuzzle.toFixed(4) : null,
        };
      };
      return { spun, cam };
    })()`);

    // Render frame 0 (first firing frame where flashLight is lit!) cleanly without advancing sim
    await ev('TT.setShotView(window.__r4Cam); TT.stepFrame(0);');
    await sleep(80);
    await ev('TT.stepFrame(0);');
    await sleep(60);
    const f0 = await ev('window.__r4Read()');
    await page.screenshot(`${dir}/glow-frame0.png`);

    const trace = [{ frame: 0, ...f0 }];
    let midShot = null;
    for (let f = 1; f <= 60; f++) {
      const st = await ev('(() => { TT.setShotView(window.__r4Cam); TT.stepFrame(1 / 60); return window.__r4Read(); })()');
      trace.push({ frame: f, ...st });
      if (!midShot && f >= 8 && st.lightInt > 0) {
        await ev('TT.stepFrame(0);');
        await sleep(80);
        await ev('TT.stepFrame(0);');
        await sleep(60);
        await page.screenshot(`${dir}/glow-frame-mid.png`);
        midShot = { frame: f, state: st };
      }
    }
    assert.deepEqual(page.errors, []);
    return { setup, f0, midShot, trace };
  } finally {
    await camera.close();
  }
}

const b = await runSide('before', LIVE);
const a = await runSide('after', FIX);

const diffs = [];
let maxMuzzle = 0, maxMountPos = 0, maxMountQuat = 0, ammoDiffs = 0;
for (let i = 0; i < b.trace.length; i++) {
  const x = b.trace[i], y = a.trace[i];
  if (x.ammo !== y.ammo) ammoDiffs++;
  const dm = Math.hypot(x.muzzle[0] - y.muzzle[0], x.muzzle[1] - y.muzzle[1], x.muzzle[2] - y.muzzle[2]);
  const dp = Math.hypot(x.mountPos[0] - y.mountPos[0], x.mountPos[1] - y.mountPos[1], x.mountPos[2] - y.mountPos[2]);
  const dq = Math.max(...x.mountQuat.map((v, k) => Math.abs(v - y.mountQuat[k])));
  if (dm > maxMuzzle) maxMuzzle = dm;
  if (dp > maxMountPos) maxMountPos = dp;
  if (dq > maxMountQuat) maxMountQuat = dq;
  if (dm > 0.002) diffs.push({ frame: i, dm: +dm.toFixed(5), bAmmo: x.ammo, aAmmo: y.ammo, bSim: x.sim, aSim: y.sim });
}

// Update results.json with clean r4_1_visual_and_trace
const results = JSON.parse(readFileSync(`${OUT}/results.json`, 'utf8'));
results.r4_1_visual_and_trace = {
  framesCompared: b.trace.length,
  ammoMismatches: ammoDiffs,
  maxMuzzleDelta: +maxMuzzle.toFixed(6),
  maxMountPosDelta: +maxMountPos.toFixed(6),
  maxMountQuatDelta: +maxMountQuat.toFixed(6),
  framesOver2mm: diffs.slice(0, 10),
  beforeGlow: { file: `${OUT}/r4-1-before/glow-frame0.png`, state: b.f0 },
  afterGlow: { file: `${OUT}/r4-1-after/glow-frame0.png`, state: a.f0 },
  beforeGlowMid: b.midShot,
  afterGlowMid: a.midShot,
};
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2) + '\n');
console.log('R4_1_RESHOT_DONE', JSON.stringify({
  maxMuzzleDelta: +maxMuzzle.toFixed(6),
  maxMountPosDelta: +maxMountPos.toFixed(6),
  ammoDiffs,
  beforeLightDist: b.f0.lightDistToMuzzle,
  afterLightDist: a.f0.lightDistToMuzzle,
  framesOver2mm: diffs.length,
}));
