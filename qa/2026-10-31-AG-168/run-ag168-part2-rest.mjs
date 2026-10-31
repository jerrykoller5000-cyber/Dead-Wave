// qa/2026-10-31-AG-168/run-ag168-part2-rest.mjs
// Finishes the remaining items of AG-168 part 2 in one slot grant:
// 1. CL-284 views using T.setShotView({ x, y, z, tx, ty, tz, fov }) + v2 summary JSON
// 2. node tools/realtest.mjs tcl281 --all
// 3. node tools/tests/run-all.mjs t281 t287 t299 tcl280 tcl281 tcl283 t294 t204 --jobs 1 --all-fails
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

console.log('\n=== [cl284-captures] Starting CL-284 views + v2 telemetry ===');
const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', `--window-size=${W},${H}`]
});

const summary = { v2Telemetry: null, cl284: null };

try {
  const page = await browser.newPage({ width: W, height: H });
  const url = `${server.origin}/index.html?debug=1&raf=timer`;
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
    const w = 'pistol';
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf(w));
      await new Promise((r) => setTimeout(r, 150));
    }
    T.setViewFirstDbg(true);
    await new Promise((r) => setTimeout(r, 3000));
    return 1;
  })()`, 300000);

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

  // Switch back to 3P for CL-284 world views
  await page.evaluate(`(async () => {
    TT.setViewFirstDbg(false);
    await new Promise((r) => setTimeout(r, 600));
    return 1;
  })()`, 300000);

  const hqY = await page.evaluate('TT.sampleHeight(0, 0)');

  const camShot = async (name, eye, lookAt, fov = 55, preJs = '', settle = 800) => {
    await page.evaluate(`(async () => {
      const T = TT;
      ${preJs}
      T.setShotView({
        x: ${eye[0]}, y: ${eye[1]}, z: ${eye[2]},
        tx: ${lookAt[0]}, ty: ${lookAt[1]}, tz: ${lookAt[2]},
        fov: ${fov}
      });
      return 1;
    })()`, 300000);
    await wait(settle);
    const file = path.join(OUT_V2, name + '.png');
    await page.screenshot(file);
    console.log('  shot:', name);
  };

  // 4) The relay with no cone
  const relayInfo = await page.evaluate(`(() => {
    const T = TT;
    const props = T.getObjectiveProps().props, cab = props['objective:radio-repair'];
    const r = cab ? cab.centre : T.POI.mast;
    const gy = T.sampleHeight(r.x, r.z);
    const marks = T.radioCuesDbg && T.radioCuesDbg().marks;
    return { x: r.x, z: r.z, gy, marksParent: !!(marks && marks.group && marks.group.parent) };
  })()`);
  await camShot('cl284-relay-no-cone', [relayInfo.x - 4.2, relayInfo.gy + 2.8, relayInfo.z - 4.2], [relayInfo.x, relayInfo.gy + 1.0, relayInfo.z], 55, `T.player.position.set(${relayInfo.x - 8}, ${relayInfo.gy}, ${relayInfo.z - 8});`);

  // 5) The mast: a pull, the boots half off, the fall, him on the ground
  await page.evaluate(`(async () => {
    const T = TT;
    const L = T.lightningDbg;
    const sk = L.skeleton();
    L.climbMast(99);
    await new Promise((r) => setTimeout(r, 350));
    T.setShotView({
      x: sk.position.x + 2.0, y: sk.position.y + 0.55, z: sk.position.z + 2.0,
      tx: sk.position.x, ty: sk.position.y - 0.15, tz: sk.position.z,
      fov: 50
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
    await new Promise((r) => setTimeout(r, 40));
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }));
    await new Promise((r) => setTimeout(r, 85));
    return 1;
  })()`, 300000);
  await page.screenshot(path.join(OUT_V2, 'cl284-mast-1-pull.png'));
  console.log('  shot: cl284-mast-1-pull');

  // 2 more pulls -> boots half off down shins
  await page.evaluate(`(async () => {
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
    T.setShotView({
      x: sk.position.x + 1.4, y: sk.position.y - 0.05, z: sk.position.z + 1.4,
      tx: sk.position.x, ty: sk.position.y - 0.35, tz: sk.position.z,
      fov: 45
    });
    return 1;
  })()`, 300000);
  await page.screenshot(path.join(OUT_V2, 'cl284-mast-2-boots-half-off.png'));
  console.log('  shot: cl284-mast-2-boots-half-off');

  // Pull until he tips & falls spread-eagled
  await page.evaluate(`(async () => {
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
    T.setShotView({
      x: sk.position.x + 3.2, y: sk.position.y + 1.2, z: sk.position.z + 3.2,
      tx: sk.position.x, ty: sk.position.y, tz: sk.position.z,
      fov: 55
    });
    return 1;
  })()`, 300000);
  await page.screenshot(path.join(OUT_V2, 'cl284-mast-3-fall.png'));
  console.log('  shot: cl284-mast-3-fall');

  // Wait until he lands spread-eagled on the ground
  summary.cl284 = await page.evaluate(`(async () => {
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
    T.setShotView({
      x: sk.position.x + 1.6, y: gy + 2.4, z: sk.position.z + 1.6,
      tx: sk.position.x, ty: gy + 0.1, tz: sk.position.z,
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
      relayMarksParent: ${relayInfo.marksParent}
    };
  })()`, 300000);
  await wait(300);
  await page.screenshot(path.join(OUT_V2, 'cl284-mast-4-ground.png'));
  console.log('  shot: cl284-mast-4-ground');
  await page.send('Page.close', {});

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
