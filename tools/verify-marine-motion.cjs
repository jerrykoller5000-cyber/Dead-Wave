// Live browser checks for hit reactions, weapon bracing and downhill slides.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const moduleCode = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const syntax = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: moduleCode, encoding: 'utf8' });
if (syntax.status) throw Error(syntax.stderr);
html = html.replace('window.TT = {', `window.motionProbe = {
  menuCamera, clock, tick, endLivePreRoll, updateMarinePose, holdWeapon,
  kickPistolRecoil, decayRecoil, bodyRecoil, hitReaction, slopeSlide,
  updateSlopeSlide, terrainNormal, sampleHeight, terrainSlope, onRamp, PHYS,
  state: () => ({ velX, velZ, grounded, gameStarted }),
  setFire: value => { mouseFireHeld = value; fireHeld = value; prevMouseFireHeld = false; },
  resetMovement: () => { velX = velZ = vy = 0; grounded = true; }
}; window.TT = {`);

(async () => {
  const server = http.createServer((q, r) => {
    const pathname = new URL(q.url, 'http://localhost').pathname;
    if (pathname === '/index.html') { r.setHeader('Content-Type', 'text/html'); r.end(html); return; }
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) { r.writeHead(403).end(); return; }
    fs.readFile(file, (error, bytes) => {
      if (error) { r.writeHead(404).end(); return; }
      r.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' })[path.extname(file)] || 'application/octet-stream');
      r.end(bytes);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.COMBAT_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '' }));
    if (process.env.THREE_TEST_ROOT) await page.route('https://cdn.jsdelivr.net/npm/three@0.175.0/**', r => r.fulfill({ path: path.join(process.env.THREE_TEST_ROOT, r.request().url().split('three@0.175.0/')[1]), contentType: 'text/javascript' }));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?debug=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.TT, null, { timeout: 120000 });
    await page.evaluate(() => { DWOpening.ready(); document.getElementById('openingSkip').click(); document.getElementById('openingSkip').click(); });
    await page.waitForFunction(() => document.getElementById('opening').hidden);
    const result = await page.evaluate(() => {
      const p = motionProbe, assert = (ok, msg) => { if (!ok) throw Error(msg); };
      TT.renderer.setAnimationLoop(null); p.endLivePreRoll(); TT.finishEffectWarmup();
      TT.playerNameEl.value = 'Motion Tester'; document.getElementById('modeHunt').click();
      p.menuCamera.advance(10);
      assert(p.state().gameStarted, 'match did not start');
      p.clock.getDelta = () => 0.05;

      const torso = TT.marine.userData.torsoG;
      const hip = TT.marine.userData.hip;
      p.updateMarinePose(0.016, false, false, false);
      const baseZ = torso.rotation.z;
      TT.damagePlayer(12, 'shambler', { mesh: { position: new TT.THREE.Vector3(TT.player.position.x + 1, TT.player.position.y, TT.player.position.z) } });
      p.updateMarinePose(0.05, false, false, false);
      assert(p.hitReaction.side > 0.9 && torso.rotation.z < baseZ - 0.01, 'side hit failed to turn body');
      assert(p.state().velX < 0, 'zombie hit did not shove away');
      for (let i = 0; i < 12; i++) p.updateMarinePose(0.05, false, false, false);
      assert(p.hitReaction.time === 0, 'hit reaction did not recover');

      p.holdWeapon(0.1);
      const arm = TT.marine.userData.armRG;
      const armBefore = arm.rotation.x;
      p.kickPistolRecoil();
      p.holdWeapon(0);
      p.updateMarinePose(0.016, false, false, false);
      assert(p.bodyRecoil.brace > 0 && p.bodyRecoil.gripR < 0, 'kick failed to reach stance and grip');
      assert(Math.abs(arm.rotation.x - armBefore) > 0.002, 'firing arm did not respond');
      const kick = p.bodyRecoil.brace;
      p.decayRecoil(0.2);
      assert(p.bodyRecoil.brace < kick, 'recoil did not settle');

      let candidate = null;
      for (let x = -130; x <= 130 && !candidate; x += 3) for (let z = -130; z <= 130 && !candidate; z += 3) {
        const n = p.terrainNormal(x, z, new TT.THREE.Vector3());
        const len = Math.hypot(n.x, n.z);
        const drop = len > 0.01 ? p.sampleHeight(x, z) - p.sampleHeight(x + n.x / len * p.PHYS.slideProbe, z + n.z / len * p.PHYS.slideProbe) : 0;
        if (p.terrainSlope(x, z) > p.PHYS.slideSlope + 0.08 && drop > p.PHYS.slideDrop + 0.8 && TT.waterDepthAt(x, z) < 0.2 && !p.onRamp(x, z) && !TT.worldSolids.some(s => Math.hypot((s.x || 0) - x, (s.z || 0) - z) < 5)) candidate = { x, z, drop, n: [n.x, n.z] };
      }
      assert(candidate, 'no eligible test slope found');
      TT.player.position.set(candidate.x, p.sampleHeight(candidate.x, candidate.z), candidate.z);
      p.resetMovement();
      const start = TT.player.position.clone();
      const n = p.terrainNormal(candidate.x, candidate.z, new TT.THREE.Vector3());
      const slide = p.updateSlopeSlide(0.05, p.terrainSlope(candidate.x, candidate.z), n, true);
      assert(slide.active && p.slopeSlide.blend > 0, 'steep slope failed to trigger slide');
      p.updateMarinePose(0.05, false, false, false);
      assert(TT.marine.userData.kneeLG.rotation.x > 0.1 && hip, 'slide pose did not bend knee');
      const beforeAmmo = TT.getAmmo().pistol;
      p.setFire(true);
      for (let i = 0; i < 3; i++) p.tick();
      p.setFire(false);
      const travelled = (TT.player.position.x - start.x) * candidate.n[0] + (TT.player.position.z - start.z) * candidate.n[1];
      assert(travelled > 0.03, 'slide failed to move downhill');
      assert(TT.getAmmo().pistol < beforeAmmo, 'marine could not fire while sliding');
      return { hit: 'directional and recovers', recoil: 'stance and hand absorb kick', slide: { candidate, travelled, fired: beforeAmmo - TT.getAmmo().pistol } };
    });
    if (errors.length) throw Error('Page errors: ' + JSON.stringify(errors));
    if (process.env.MARINE_MOTION_SCREENSHOT) {
      await page.evaluate(() => {
        const at = TT.player.position;
        TT.camera.position.set(at.x + motionProbe.slopeSlide.dirX * 7, at.y + 4, at.z + motionProbe.slopeSlide.dirZ * 7);
        TT.camera.lookAt(at.x, at.y + 1, at.z);
        TT.renderFrame();
      });
      await page.screenshot({ path: process.env.MARINE_MOTION_SCREENSHOT });
    }
    console.log(JSON.stringify(result, null, 2));
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
