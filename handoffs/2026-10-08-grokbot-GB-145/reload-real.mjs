// GB-145 (Grokbot): reload probe and mid-reload shots on the real renderer (headless Chrome + SwiftShader, real three).
//   node handoffs/2026-10-08-grokbot-GB-145/reload-real.mjs probe <out.json> [guns...]
//   node handoffs/2026-10-08-grokbot-GB-145/reload-real.mjs shots <outDir>
//   node handoffs/2026-10-08-grokbot-GB-145/reload-real.mjs t218 <out.txt>   (t218 with the arm IK working)
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const { serve } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'serve.mjs').replace(/\\/g, '/')));
const { launch } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'cdp.mjs').replace(/\\/g, '/')));
const [mode = 'probe', outArg = path.join(HERE, 'probe.json'), ...rest] = process.argv.slice(2);
const wait = (page, ms) => page.evaluate(`new Promise((r) => setTimeout(r, ${ms}))`);
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
let code = 0;
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`);
  await page.waitFor('!!window.DWOpening', { timeout: 120000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); else { const b = document.getElementById('openingSkip'); if (b) b.click(); } })()`);
    await wait(page, 300);
  }
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('window.TT never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  console.log('title up:', await page.evaluate('TT.renderer && TT.renderer.constructor ? TT.renderer.constructor.name : "?"'));
  await page.evaluate(`(() => { const n = document.getElementById('playerName'); if (n) n.value = 'Reload'; document.getElementById('modeHunt').click(); })()`);
  await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 120000 });
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
  await page.evaluate(`(() => { TT.clearZombies && TT.clearZombies(); TT.setHp(100000); TT.grantAllWeapons(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true })); })()`);
  await wait(page, 1500);
  await page.evaluate(fs.readFileSync(path.join(HERE, 'probe-page.js'), 'utf8'));
  if (mode === 't218') {
    if (rest.length) await page.evaluate(`window.__t218only = ${JSON.stringify(rest)}`);
    const res = await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools', 'tests', 't218.js'), 'utf8'), 1200000);
    console.log(res);
    if (outArg) fs.writeFileSync(outArg, String(res));
  } else if (mode === 'probe') {
    const guns = rest.length ? rest : null;
    const rows = await page.evaluate(`window.__gb145probe(${JSON.stringify(guns ? { guns } : {})})`, 900000);
    fs.writeFileSync(outArg, JSON.stringify(rows, null, 1));
    console.log('rows', rows.length, '->', outArg);
  } else {
    // Third person at a distance, mid-reload: the camera 4.5 m off his left-front quarter, at chest height.
    fs.mkdirSync(outArg, { recursive: true });
    const SHOTS = [['rifle-m4', 'm4', false, [0.25, 0.45, 0.6]], ['pistol', 'pistol', false, [0.3, 0.55]], ['akimbo-pistol', 'pistol', true, [0.3, 0.65]], ['akimbo-uzi', 'uzi', true, [0.3, 0.65]], ['sniper', 'sniper', false, [0.3, 0.55]], ['uzi', 'uzi', false, [0.3, 0.55]]];
    for (const [name, w, aki, us] of SHOTS) {
      await page.evaluate(`(async () => { const T = TT; for (let i = 0; i < 16 && T.getCurrentWeapon() !== '${w}'; i++) T.setWeapon(i); await new Promise((r) => setTimeout(r, 2600));
        const on = !!T.offhandMeshes['${w}'] && T.offhandMeshes['${w}'].visible; if (${aki} !== on) { T.toggleDualWieldDbg(); await new Promise((r) => setTimeout(r, 900)); }
        T.setAmmoDbg('${w}', 1); if (T.setMagazinesDbg) T.setMagazinesDbg('${w}', 1, [99, 99, 99], 1); T.startReload(); })()`);
      for (const u of us) {
        await page.evaluate(`(async () => { const T = TT; T.reloadClipDbg.hold(${u}); const p = T.player.position, y = T.sampleHeight(p.x, p.z);
          T.aimTarget.set(p.x, y + 1.25, p.z + 10);
          T.setShotView({ x: p.x + 2.6, y: y + 1.55, z: p.z + 3.4, tx: p.x, ty: y + 1.0, tz: p.z, fov: 40 });
          await new Promise((r) => setTimeout(r, 700)); T.aimTarget.set(p.x, y + 1.25, p.z + 10); await new Promise((r) => setTimeout(r, 200)); })()`);
        const f = path.join(outArg, `${name}-u${String(Math.round(u * 100)).padStart(2, '0')}.png`);
        await page.screenshot(f); console.log('shot', f);
      }
      await page.evaluate(`(async () => { const T = TT; T.reloadClipDbg.hold(null); T.setShotView(null); for (let i = 0; i < 80 && T.getReloadDbg().weapon; i++) await new Promise((r) => setTimeout(r, 100)); if (T.offhandMeshes['${w}'] && T.offhandMeshes['${w}'].visible) { T.toggleDualWieldDbg(); await new Promise((r) => setTimeout(r, 600)); } })()`);
    }
  }
  const errs = page.errors.slice(0, 10);
  if (errs.length) { console.log('page errors:\n  ' + errs.map((e) => e.split('\n')[0]).join('\n  ')); }
} catch (e) { console.error('FAILED', e && e.stack || e); code = 1; }
await browser.close?.(); server.close?.();
process.exit(code);
