import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`);
  if (!await page.waitFor('!!window.TT?.opticDbg', { timeout: 45000 })) throw new Error('Game did not expose optic hooks');
  const result = await page.evaluate(`(() => {
    const T = window.TT, O = T.opticDbg, A = T.armoryDbg, results = [];
    const ok = (name, yes) => { results.push({ name, pass: !!yes }); };
    const expect = { m4: 'acog,prism,rmr', ak: 'acog,prism,rmr', pistol: 'rmr', revolver: 'prism,rmr',
      uzi: 'rmr', shotgun: 'prism,rmr', aa12: 'rmr', minigun: 'rmr', launcher: 'rmr' };
    ok('eligibility', Object.keys(O.options).length === 9 && Object.entries(expect).every(([w, v]) => O.options[w].join(',') === v));
    ok('no sniper or M240 Armory slot', !A.mods('sniper').some(m => m.slot === 'optic') && !A.mods('m240').some(m => m.slot === 'optic'));
    ok('unowned fit refused', !O.fit('m4', 'acog'));
    T.stockNoticeDbg.setDay(1); // The title camera has no run night yet.
    const before = T.getBank(); T.addCash(1000); const funded = T.getBank(); O.buy('m4', 'acog');
    ok('kiosk purchase spends Cash', O.owned().m4.acog && T.getBank() < funded && funded >= before + 1000);
    ok('Armory fit succeeds', O.fit('m4', 'acog') && O.fitted().m4 === 'acog');
    ok('old holo removed', T.weaponMeshes.m4.userData.defaultSight.visible === false);
    ok('ACOG has both sight points', !!T.weaponMeshes.m4.userData.fittedOptic.getObjectByName('optic.acog')?.userData.sightModes?.topRmr);
    O.grant('m4', 'prism'); O.fit('m4', 'prism');
    ok('one optic replaces another', O.fitted().m4 === 'prism' && T.weaponMeshes.m4.userData.fittedOptic.userData.kind === 'prism' && !T.weaponMeshes.m4.getObjectByName('optic.acog'));
    O.clear('m4');
    ok('bare M4 restores holo', !O.fitted().m4 && T.weaponMeshes.m4.userData.defaultSight.visible && !T.weaponMeshes.m4.userData.fittedOptic);
    O.grant('pistol', 'rmr'); O.fit('pistol', 'rmr');
    ok('slide carries pistol RMR', T.weaponMeshes.pistol.userData.fittedOptic.parent === T.weaponMeshes.pistol.userData.slide);
    for (const w of ['revolver','uzi']) { O.grant(w, 'rmr'); O.fit(w, 'rmr'); }
    ok('revolver plate and UZI rail appear only fitted', T.weaponMeshes.revolver.userData.opticPlate.visible && T.weaponMeshes.uzi.userData.opticRail.visible);
    O.clear('revolver'); O.clear('uzi');
    ok('bare accessory mounts disappear', !T.weaponMeshes.revolver.userData.opticPlate.visible && !T.weaponMeshes.uzi.userData.opticRail.visible);
    O.grant('minigun','rmr'); O.fit('minigun','rmr');
    ok('rotary stock sight yields to RMR', !T.weaponMeshes.minigun.userData.defaultSight.visible && !!T.weaponMeshes.minigun.userData.fittedOptic);
    ok('sniper NX8 is issued', !T.weaponMeshes.sniper.getObjectByName('scope').visible && !!T.weaponMeshes.sniper.getObjectByName('optic.nx8'));
    T.resetEconomyDbg();
    ok('reset clears ownership and fitted looks', !Object.keys(O.owned()).length && !Object.keys(O.fitted()).length && T.weaponMeshes.m4.userData.defaultSight.visible);
    return results;
  })()`);
  for (const r of result) console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.name}`);
  const failures = result.filter(r => !r.pass);
  if (page.errors.length) console.log('Browser errors:', page.errors.slice(0, 4));
  if (failures.length || page.errors.length) throw new Error(`${failures.length} checks failed, ${page.errors.length} browser errors`);
  console.log(`${result.length} passed, 0 failed`);
} finally {
  await browser.close();
  await server.close();
}
