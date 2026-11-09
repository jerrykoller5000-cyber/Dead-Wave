// GP-20066 integration probe. Run only through crew.mjs slot run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20066', 'game');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('TT did not boot: ' + JSON.stringify(page.errors));
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  const result = await page.evaluate(`(async () => {
    const T = window.TT, assert = (v, m) => { if (!v) throw new Error(m); };
    const wait = ms => new Promise(r => setTimeout(r, ms));
    window.DWOpening?.dismissForTesting?.();
    document.getElementById('playerName').value = 'GP20066';
    document.getElementById('modeTraining').click();
    const end = Date.now() + 30000;
    while (!T.trainingDbg.state().active && Date.now() < end) await wait(60);
    assert(T.trainingDbg.state().active, 'training ground starts');
    T.clearZombies?.(); T.setHp(100000);
    const eligible = ['pistol','revolver','uzi','shotgun','m4','ak','aa12','sniper','launcher','minigun'];
    assert(T.GEAR.filter(g => g.key === 'laserLight' && g.cost === 90).length === 1, 'one 90-Cash combined kiosk row');
    assert(T.GEAR.every(g => g.key !== 'laser' && g.key !== 'flashlight'), 'old kiosk rows gone');
    for (const key of eligible) {
      const gun = T.weaponMeshes[key], u = gun.userData;
      assert(!!u.laserLightUnit && !!u.laserLensLocal && !!u.lightLensLocal, key + ' unit and lenses');
      assert(!u.laserLightUnit.visible, key + ' starts unfitted');
      const mod = T.armoryDbg.mods(key).find(m => m.id === 'laserLight');
      assert(!!mod && !mod.owned && !mod.fitted, key + ' armory row starts unowned');
    }
    for (const key of ['flamer','chainsaw']) assert(!T.armoryDbg.mods(key).some(m => m.id === 'laserLight'), key + ' excludes attachment');
    assert(!T.armoryDbg.fit('pistol','laserLight',true), 'cannot fit before purchase');
    T.addCash(100); T.buyGear(T.GEAR.find(g => g.key === 'laserLight'));
    assert(T.getGearOwned().laserLight && T.armoryDbg.mods('pistol').find(m => m.id === 'laserLight')?.owned, 'kiosk purchase grants attachment');
    assert(!T.armoryDbg.mods('pistol').find(m => m.id === 'laserLight')?.fitted, 'kiosk purchase does not auto-fit a gun');
    T.grantAllWeapons();
    for (const key of eligible) assert(T.armoryDbg.mods(key).find(m => m.id === 'laserLight')?.fitted, key + ' fitted in debug arsenal');
    assert(T.armoryDbg.fit('pistol','laserLight',false), 'remove pistol unit');
    assert(!T.weaponMeshes.pistol.userData.laserLightUnit.visible, 'pistol model hidden when removed');
    assert(T.armoryDbg.fit('pistol','laserLight',true), 'refit pistol unit');
    assert(T.weaponMeshes.pistol.userData.laserLightUnit.visible, 'pistol model visible when fitted');
    if (T.isUnarmed()) T.toggleHolster();
    T.setWeapon(T.WEAPON_ORDER.indexOf('pistol')); T.setLasersDbg(true);
    await wait(500); T.setLasersDbg(true);
    const gun = T.weaponMeshes.pistol, lens = gun.userData.laserLensLocal.clone();
    assert(T.laserSteadies(), 'fitted pistol steadies');
    assert(gun.userData.laser.visible, 'fitted pistol draws beam: ' + JSON.stringify({
      gun: gun.visible, parent: gun.parent?.visible, fit: T.armoryDbg.mods('pistol').find(m => m.id === 'laserLight'),
      game: T.getGameMode(), vm: T.viewmodelDbg()?.info, aim: T.laserAimDbg()
    }));
    const aim = T.laserAimDbg();
    assert(!!aim && Number.isFinite(aim.ox), 'beam has world origin');
    const projected = gun.localToWorld(lens);
    assert(projected.distanceTo(new T.THREE.Vector3(aim.ox,aim.oy,aim.oz)) < 0.05, 'beam starts at model laser lens');
    document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', bubbles: true }));
    document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit2', bubbles: true }));
    await wait(250);
    const light = T.scene.children.find(o => o.isSpotLight && o.color.getHex() === 0xfff2d0);
    assert(!!light && light.position.distanceTo(projected) > 0.0001, 'light uses separate lens');
    const projectedWhite = gun.localToWorld(gun.userData.lightLensLocal.clone());
    assert(light.position.distanceTo(projectedWhite) < 0.05, 'spotlight starts at model white lens');
    T.armoryDbg.fit('pistol','laserLight',false); await wait(250);
    assert(!T.laserSteadies() && !gun.userData.laser.visible, 'unfit disables beam and spread');
    assert(light.intensity === 0, 'unfit disables spotlight');
    return { backend: T.getRendererBackend(), eligible: eligible.length, origin: [aim.ox,aim.oy,aim.oz], white: projectedWhite.toArray() };
  })()`);
  const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(out, 'integration.png'), Buffer.from(shot.data, 'base64'));
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ result, errors: page.errors }, null, 2) + '\n');
  console.log(JSON.stringify({ result, errors: page.errors }));
  if (page.errors.length) throw new Error(page.errors[0]);
} finally { await browser.close(); await server.close(); }
