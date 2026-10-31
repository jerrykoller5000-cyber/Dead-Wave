// probe.mjs: GB-258 (J51, J17). Real renderer, a hunt match.
//   node qa/2026-10-31-GB-258/probe.mjs <phase>      (inside the game-test slot lease)
// J51: what the E prompt says (and what E would do) at the hikers' camp and at the first-aid bag, hanging, on the ground,
// floating, in both views. J17: H while akimbo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PHASE = process.argv[2] || 'before';
const srv = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const page = await browser.newPage({ width: 1280, height: 720 });
try { const { windowId } = await page.send('Browser.getWindowForTarget', {}); await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } }); } catch { }
await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
await page.waitFor('!!window.TT', { timeout: 400000 });
await page.evaluate(`(() => { window.__errs = []; addEventListener('error', (e) => __errs.push(String(e.message || e.error))); if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
const step = (code, ms = 240000) => page.evaluate(`(async () => { const T = window.TT; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const D = () => T.hikersDbg();
  const el = () => document.getElementById('kioskPrompt');
  const look = (label) => { const e = el(), d = D(); return { label, view: T.fpDbg().first ? 'first' : 'third', phase: d.kit && d.kit.phase, grabbable: d.grabbable, reach: d.reach && d.reach.blockedBy,
    dist: d.reach && +d.reach.distance.toFixed(2), action: T.actionTarget(), objPrompt: T.convoyDbg.prompt(), shown: !!e && e.classList.contains('on'), offscreen: !!e && e.classList.contains('offscreen'), text: e ? e.textContent : null }; };
  const shoot = (piece) => { const [a, b] = piece, P = T.player.position, e = { x: P.x, y: P.y + 1.6, z: P.z };
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }, dx = m.x - e.x, dy = m.y - e.y, dz = m.z - e.z, L = Math.hypot(dx, dy, dz) || 1;
    T.fireRoundDbg(e.x, e.y, e.z, dx / L, dy / L, dz / L, 20, 90, 0); for (let i = 0; i < 20; i++) T.stepProjectilesDbg(0.016); };
  ${code} })()`, ms);
console.log('entered: ' + await step(`const n = document.getElementById('playerName'); if (n) n.value = 'Probe'; document.getElementById('modeHunt').click();
  for (let i = 0; i < 100 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
  for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
  await wait(1500); T.runDevCommand('godmode'); T.clearZombies && T.clearZombies(); T.setHp(100000);
  return JSON.stringify({ phase: T.getPhase(), day: T.getDay && T.getDay() });`, 180000));
const rows = [];
const at = (label, put, views = [false, true]) => `const out = []; for (const first of ${JSON.stringify(views)}) { T.setViewFirstDbg(first); ${put}; await wait(700); out.push(look(${JSON.stringify(label)})); } return JSON.stringify(out);`;
const run = async (code) => { const r = await step(code); for (const x of JSON.parse(r)) { console.log(JSON.stringify(x)); rows.push(x); } };
// J51, a dry run.
await step(`T.runDevCommand('site hikers dry'); await until(() => !!D().bag && D().kit.phase === 'hanging', 6000); return 'ok';`);
const camp = `const c = T.getObjectiveProps().props['objective:hikers-cache'].approach; T.player.position.set(c.x + 0.4, c.y, c.z)`;
await run(at('dry: hanging, he is at the camp approach', camp));
await run(at('dry: hanging, he stands under the bag', `const d = D(); T.player.position.set(d.hang.x + 1.0, T.sampleHeight(d.hang.x + 1.0, d.hang.z), d.hang.z)`));
await step(`T.setViewFirstDbg(false); T.runDevCommand('site hikers dry'); await until(() => !!D().bag && D().kit.phase === 'hanging', 6000); await wait(300); const d = D(); shoot(d.rope[1]); await until(() => D().kit.phase !== 'hanging' && D().kit.phase !== 'falling', 6000); return D().kit.phase;`);
await run(at('dry: on the ground, he is 1.2 m off', `const d = D(); T.player.position.set(d.bag.x + 1.2, T.sampleHeight(d.bag.x + 1.2, d.bag.z), d.bag.z)`));
await run(at('dry: on the ground, he is at the camp approach', camp));
// J51, a river run.
await step(`T.setViewFirstDbg(false); T.runDevCommand('site hikers river'); await until(() => !!D().bag && D().kit.phase === 'hanging', 6000); await wait(300); const d = D(); shoot(d.rope[1]); await until(() => D().kit.phase === 'floating' || D().kit.phase === 'ground', 6000); return D().kit.phase;`);
await run(at('river: floating, he is 1.2 m off', `const d = D(); T.player.position.set(d.bag.x + 1.2, d.bag.y + 0.2, d.bag.z)`));
await run(at('river: floating, he is at the camp approach', camp));
await step(`T.hikersAgeDbg(45); return D().kit.phase;`);
await run(at('river: snagged, he is 1.2 m off', `T.clearZombies(); const d = D(); T.player.position.set(d.bag.x + 1.2, d.bag.y + 0.2, d.bag.z)`));
// J17: H while akimbo.
const j17 = await step(`T.setViewFirstDbg(false); T.clearZombies(); const P = T.player.position; P.set(P.x + 40, T.sampleHeight(P.x + 40, P.z), P.z);
  T.setDualOwnedDbg('pistol', true); T.setWeapon(T.WEAPON_ORDER.indexOf('pistol')); await wait(600);
  for (let i = 0; i < 3; i++) { T.spawnMedDrop(P.x + 0.3, P.z + 0.3); await until(() => (T.getMedkits() | 0) > i, 4000); }
  const aki = () => !!T.vaultDbg.flags().akimbo, r = { medkits: T.getMedkits() | 0 };
  const tryPen = async (label) => { T.setHp(40); await wait(100); const m0 = T.getMedkits() | 0;
    T.useMedkit(); await wait(80); const b1 = document.getElementById('bigBanner'); r[label] = { akimbo: aki(), medkitsBefore: m0, medkitsAfter: T.getMedkits() | 0, penT: +T.getMedPenT().toFixed(2), penVisible: !!T.medPenHand.visible, banner: b1 ? b1.textContent.trim().slice(0, 80) : null };
    await until(() => T.getMedPenT() <= 0, 3000); await wait(300); };
  await tryPen('one gun');
  T.toggleDualWieldDbg(); await wait(600);
  await tryPen('akimbo');
  T.toggleDualWieldDbg(); await wait(600);
  await tryPen('one gun again');
  return JSON.stringify(r);`);
console.log('J17 ' + j17); rows.push({ J17: JSON.parse(j17) });
const errs = await page.evaluate(`JSON.stringify(window.__errs || [])`);
console.log('page errors: ' + errs);
rows.push({ pageErrors: JSON.parse(errs) });
fs.writeFileSync(path.join(ROOT, 'qa/2026-10-31-GB-258/' + PHASE + '.json'), JSON.stringify(rows, null, 1));
await browser.close(); srv.close && srv.close(); process.exit(0);