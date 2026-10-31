// qa/2026-10-31-AG-168/run-ag168-part2-all.mjs
// Runs inside ONE game-test slot grant (--jobs 1, sequentially):
// 1. node tools/vmsheet.mjs --out qa/2026-10-31-AG-168/v2
// 2. GPU captures for v2 wall/shade/night20 + CL-283 noon NVG + CL-284 yard/ruts/relay/mast skeleton
// 3. node tools/realtest.mjs tcl281 --all
// 4. node tools/tests/run-all.mjs t281 t287 t299 tcl280 tcl281 tcl283 t294 t204 --jobs 1 --all-fails
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const ROOT = path.resolve(HERE, '..', '..');
const TESTS = path.join(ROOT, 'tools', 'tests');
const OUT_V2 = path.join(HERE, 'v2');
fs.mkdirSync(OUT_V2, { recursive: true });
const W = 1280, H = 720;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function runCmd(label, args) {
  console.log(`\n=== [${label}] node ${args.join(' ')} ===`);
  const r = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    cwd: ROOT,
    env: { ...process.env, DW_SLOT_HELD: '1' }
  });
  console.log(`=== [${label}] exited ${r.status} ===\n`);
  return r.status;
}

// Step 1: vmsheet into qa/2026-10-31-AG-168/v2
runCmd('vmsheet-v2', ['tools/vmsheet.mjs', '--out', 'qa/2026-10-31-AG-168/v2']);

// Step 2: Custom GPU captures (v2 extras + CL-283 noon NVG + CL-284 views)
console.log('\n=== [gpu-captures] Starting v2 telemetry + CL-283 + CL-284 captures ===');
const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', `--window-size=${W},${H}`]
});

const summary = { v2Telemetry: null, cl283: null, cl284: null };

async function openGamePage(query = '', firstPersonPistol = true) {
  const page = await browser.newPage({ width: W, height: H });
  const url = `${server.origin}/index.html?debug=1&raf=timer${query}`;
  await page.goto(url, { timeout: 240000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 300000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));
  await page.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'AG168v2');
    T.clearZombies && T.clearZombies();
    T.setHp(1e5);
    T.grantAllWeapons();
    if (T.setWorldTime) T.setWorldTime(0.42);
    if (${firstPersonPistol}) {
      const w = 'pistol';
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) {
        T.setWeapon(T.WEAPON_ORDER.indexOf(w));
        await new Promise((r) => setTimeout(r, 150));
      }
      T.setViewFirstDbg(true);
      await new Promise((r) => setTimeout(r, 3500));
    } else {
      await new Promise((r) => setTimeout(r, 800));
    }
    return 1;
  })()`, 300000);
  return page;
}

const takeShot = async (p, name, js = '', settle = 1500) => {
  if (js) await p.evaluate(`(async () => { const T = TT; ${js}; return 1; })()`, 300000);
  await wait(settle);
  const file = path.join(OUT_V2, name + '.png');
  await p.screenshot(file);
  console.log('  shot:', name);
};

try {
  const page = await openGamePage('', true);

  // Collect v2 telemetry
  summary.v2Telemetry = await page.evaluate(`(() => {
    const T = TT;
    const d = T.viewmodelDbg();
    const rY = new T.THREE.Vector3(0, 1, 0).applyQuaternion(d.wrists.r.q);
    const lY = new T.THREE.Vector3(0, 1, 0).applyQuaternion(d.wrists.l.q);
    return {
      info: JSON.parse(JSON.stringify(d.info)),
      sockets: {
        r: { p: d.sockets.r.p.toArray().map((n) => +n.toFixed(4)), q: d.sockets.r.q.toArray().map((n) => +n.toFixed(4)) },
        l: { p: d.sockets.l.p.toArray().map((n) => +n.toFixed(4)), q: d.sockets.l.q.toArray().map((n) => +n.toFixed(4)) }
      },
      wristsView: {
        r: { p: d.wrists.r.p.toArray().map((n) => +n.toFixed(4)), yDir: rY.toArray().map((n) => +n.toFixed(4)), elbowRoot: d.arms.r.root.position.toArray().map((n) => +n.toFixed(4)) },
        l: { p: d.wrists.l.p.toArray().map((n) => +n.toFixed(4)), yDir: lY.toArray().map((n) => +n.toFixed(4)), elbowRoot: d.arms.l.root.position.toArray().map((n) => +n.toFixed(4)) }
      }
    };
  })()`);

  // Under HQ roof by day (hip & ADS)
  await takeShot(page, 'vm-hq-roof-hip', 'T.setZoomHeldDbg(false);', 1200);
  await takeShot(page, 'vm-hq-roof-ads', 'T.setZoomHeldDbg(true);', 2000);
  await page.evaluate('TT.setZoomHeldDbg(false)');
  await wait(1500);

  // Wall walk in v2
  await takeShot(page, 'vm-wall-hip', `
    for (let i = 0; i < 60; i++) {
      T.player.position.z += 0.08;
      if (T.resolveHardBuildCollisions) T.resolveHardBuildCollisions(T.player.position, T.PLAYER_RADIUS_DBG || 0.38);
    }
  `, 1200);
  await takeShot(page, 'vm-wall-ads', 'T.setZoomHeldDbg(true);', 2000);
  await page.evaluate('TT.setZoomHeldDbg(false)');
  await wait(1500);

  // CL-283: Goggles down at noon at the HQ and in the valley
  await takeShot(page, 'cl283-hq-noon-nvg-off', `
    T.player.position.set(0, T.sampleHeight(0, -1.5), -1.5);
    T.setGearDbg('nvg');
    if (T.getNvgActiveDbg && T.getNvgActiveDbg()) T.toggleNvgDbg();
  `, 1200);
  await takeShot(page, 'cl283-hq-noon-nvg-on', `
    T.setGearDbg('nvg');
    T.toggleNvgDbg();
  `, 1500);

  // Valley at noon (z = 16, facing south across sunlit trees/valley)
  await takeShot(page, 'cl283-valley-noon-nvg-on', `
    T.player.position.set(0, T.sampleHeight(0, 16), 16);
  `, 1500);
  summary.cl283 = await page.evaluate(`(() => {
    const c = document.querySelector('canvas');
    const ep = document.getElementById('nvgEyepiece');
    return {
      canvasClass: c ? c.className : '',
      computedFilter: c ? getComputedStyle(c).filter : '',
      eyepieceClass: ep ? ep.className : ''
    };
  })()`);
  await takeShot(page, 'cl283-valley-noon-nvg-off', `
    T.toggleNvgDbg();
  `, 1500);

  // Outdoor direct sun shot
  await takeShot(page, 'vm-outdoor-sun-hip', `
    T.player.position.set(0, T.sampleHeight(0, 10), 10);
  `, 1200);

  // Night 20 + NVG shots in v2
  await takeShot(page, 'vm-night20-hip', `
    T.runDevCommand('godmode');
    T.devJumpToNight(20, true);
    T.clearZombies && T.clearZombies();
    T.player.position.set(0, T.sampleHeight(0, 10), 10);
    T.setZoomHeldDbg(false);
  `, 3500);
  await takeShot(page, 'vm-night20-hip', 'T.clearZombies && T.clearZombies();', 500);
  await takeShot(page, 'vm-night20-ads', 'T.clearZombies && T.clearZombies(); T.setZoomHeldDbg(true);', 2000);
  await takeShot(page, 'vm-night20-nvg-ads', `
    T.clearZombies && T.clearZombies();
    T.setGearDbg('nvg');
    T.toggleNvgDbg();
  `, 1500);
  await takeShot(page, 'vm-night20-nvg-hip', 'T.clearZombies && T.clearZombies(); T.setZoomHeldDbg(false);', 2000);
  await page.send('Page.close', {});

  // Step 2B: CL-284 views on a fresh noon match page
  const page2 = await openGamePage('', false);
  const hqY = await page2.evaluate('TT.sampleHeight(0, 0)');

  const camShot = async (name, eye, lookAt, fov = 55, preJs = '', settle = 1000) => {
    await page2.evaluate(`(async () => {
      const T = TT;
      ${preJs}
      T.setCameraOverride({
        enabled: true,
        eye: new T.THREE.Vector3(${eye[0]}, ${eye[1]}, ${eye[2]}),
        lookAt: new T.THREE.Vector3(${lookAt[0]}, ${lookAt[1]}, ${lookAt[2]}),
        fov: ${fov}
      });
      return 1;
    })()`, 300000);
    await wait(settle);
    const file = path.join(OUT_V2, name + '.png');
    await page2.screenshot(file);
    console.log('  shot:', name);
  };

  // 1) HQ east side from CIF's door and Armory's door (nothing in front of them now)
  await camShot('cl284-hq-east-from-cif-door', [5.5, hqY + 1.75, -3.2], [7.2, hqY + 1.1, 5.0], 60, 'T.player.position.set(-4, T.sampleHeight(-4, 0), 0);');
  await camShot('cl284-hq-east-from-armory-door', [5.5, hqY + 1.75, 3.6], [7.2, hqY + 1.1, -5.0], 60);
  await camShot('cl284-hq-east-wide', [12.5, hqY + 3.2, 0.2], [4.5, hqY + 1.4, 0.2], 58);

  // 2) The yard from above
  await camShot('cl284-yard-above', [2.0, hqY + 25.0, -14.0], [2.5, hqY, -1.0], 58);

  // 3) The ruts at the south gap
  const rutY = await page2.evaluate('TT.sampleHeight(4.8, -9.5)');
  await camShot('cl284-south-gap-ruts', [6.2, rutY + 3.0, -14.2], [4.2, rutY + 0.2, -7.2], 52);

  // 4) The relay with no cone
  const relayInfo = await page2.evaluate(`(() => {
    const T = TT;
    const r = T.POI.relay;
    const gy = T.sampleHeight(r.x, r.z);
    let cones = 0;
    T.scene.traverse((o) => { if (/relay.*cone|cone.*relay/i.test(o.name || '')) cones++; });
    return { x: r.x, z: r.z, gy, cones };
  })()`);
  await camShot('cl284-relay-no-cone', [relayInfo.x - 5.5, relayInfo.gy + 3.2, relayInfo.z - 5.5], [relayInfo.x, relayInfo.gy + 1.2, relayInfo.z], 55, `T.player.position.set(${relayInfo.x - 8}, ${relayInfo.gy}, ${relayInfo.z - 8});`);

  // 5) The mast: a pull, the boots half off, the fall, him on the ground
  await page2.evaluate(`(async () => {
    const T = TT;
    const L = T.lightningDbg;
    const sk = L.skeleton();
    L.climbMast(99);
    await new Promise((r) => setTimeout(r, 350));
    T.setCameraOverride({
      enabled: true,
      eye: new T.THREE.Vector3(sk.position.x + 2.0, sk.position.y + 0.55, sk.position.z + 2.0),
      lookAt: new T.THREE.Vector3(sk.position.x, sk.position.y - 0.15, sk.position.z),
      fov: 50
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
    await new Promise((r) => setTimeout(r, 40));
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }));
    await new Promise((r) => setTimeout(r, 85));
    return 1;
  })()`, 300000);
  await page2.screenshot(path.join(OUT_V2, 'cl284-mast-1-pull.png'));
  console.log('  shot: cl284-mast-1-pull');

  // 2 more pulls -> boots half off down shins
  await page2.evaluate(`(async () => {
    const T = TT;
    const sk = T.lightningDbg.skeleton();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const tap = async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
      await wait(40);
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }));
    };
    await wait(350);
    await tap();
    await wait(450);
    await tap();
    await wait(120);
    T.setCameraOverride({
      enabled: true,
      eye: new T.THREE.Vector3(sk.position.x + 1.4, sk.position.y - 0.05, sk.position.z + 1.4),
      lookAt: new T.THREE.Vector3(sk.position.x, sk.position.y - 0.35, sk.position.z),
      fov: 45
    });
    return 1;
  })()`, 300000);
  await page2.screenshot(path.join(OUT_V2, 'cl284-mast-2-boots-half-off.png'));
  console.log('  shot: cl284-mast-2-boots-half-off');

  // Pull until he tips & falls spread-eagled
  await page2.evaluate(`(async () => {
    const T = TT;
    const L = T.lightningDbg;
    const sk = L.skeleton();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const tap = async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
      await wait(40);
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }));
    };
    while (!L.worn()) {
      await tap();
      await wait(220);
    }
    const yTop = sk.position.y;
    const t0 = Date.now();
    while (Date.now() - t0 < 5000) {
      if (L.yankState().phase === 'fall' && sk.position.y < yTop - 3.5) break;
      await wait(25);
    }
    T.setCameraOverride({
      enabled: true,
      eye: new T.THREE.Vector3(sk.position.x + 3.2, sk.position.y + 1.2, sk.position.z + 3.2),
      lookAt: new T.THREE.Vector3(sk.position.x, sk.position.y, sk.position.z),
      fov: 55
    });
    return 1;
  })()`, 300000);
  await page2.screenshot(path.join(OUT_V2, 'cl284-mast-3-fall.png'));
  console.log('  shot: cl284-mast-3-fall');

  // Wait until he lands spread-eagled on the ground
  summary.cl284 = await page2.evaluate(`(async () => {
    const T = TT;
    const L = T.lightningDbg;
    const sk = L.skeleton();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const t0 = Date.now();
    while (Date.now() - t0 < 12000) {
      if (L.yankState().phase === 'down') break;
      await wait(40);
    }
    await wait(300);
    const gy = T.sampleHeight(sk.position.x, sk.position.z);
    T.setCameraOverride({
      enabled: true,
      eye: new T.THREE.Vector3(sk.position.x + 1.6, gy + 2.4, sk.position.z + 1.6),
      lookAt: new T.THREE.Vector3(sk.position.x, gy + 0.1, sk.position.z),
      fov: 50
    });
    const limbs = sk.userData.limbs || {};
    const spread = ['armL', 'armR', 'legL', 'legR'].map((k) => +(2 * Math.acos(Math.min(1, Math.abs(limbs[k].g.quaternion.w)))).toFixed(3));
    return {
      phase: L.yankState().phase,
      pos: [sk.position.x, sk.position.y, sk.position.z].map((n) => +n.toFixed(2)),
      gy: +gy.toFixed(2),
      spreadRad: spread,
      rutsPresent: !!T.scene.getObjectByName('fob-tyre-ruts'),
      blendPresent: !!T.scene.getObjectByName('fob-ground-blend'),
      relayCones: ${relayInfo.cones}
    };
  })()`, 300000);
  await wait(300);
  await page2.screenshot(path.join(OUT_V2, 'cl284-mast-4-ground.png'));
  console.log('  shot: cl284-mast-4-ground');
  await page2.send('Page.close', {});

  fs.writeFileSync(path.join(OUT_V2, 'ag168-v2-summary.json'), JSON.stringify(summary, null, 2));
} finally {
  await browser.close?.();
  await server.close?.();
}

// Step 3: realtest tcl281 --all on RTX 5080
runCmd('realtest-tcl281', ['tools/realtest.mjs', 'tcl281', '--all']);

// Step 4: test-page reruns requested by Claude: t281 t287 t299 tcl280 tcl281 tcl283 t294 t204
runCmd('testpage-reruns', [
  'tools/tests/run-all.mjs',
  't281', 't287', 't299', 'tcl280', 'tcl281', 'tcl283', 't294', 't204',
  '--agent', 'antigravity', '--task', 'AG-168', '--jobs', '1', '--all-fails'
]);
process.exit(0);
