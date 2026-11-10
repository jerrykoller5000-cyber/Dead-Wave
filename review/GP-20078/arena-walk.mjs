import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Run through crew.mjs slot run');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20078');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const report = { at: new Date().toISOString(), errors: [] };
const save = () => fs.writeFileSync(path.join(out, 'arena-walk.json'), JSON.stringify(report, null, 2));
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`);
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 90000 })) throw new Error('game did not load');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('document.getElementById("opening").hidden', { timeout: 30000 });
  await page.evaluate(`(() => { document.getElementById('playerName').value='GP-20078 Arena'; document.getElementById('modeTraining').click(); })()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 90000 })) throw new Error('Training did not start');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 1800));
  report.kinds = await page.evaluate(`(() => { const D=TT.trainingDbg;D.openPanel();const k=[...D.panel().element.querySelectorAll('[data-kind]')].map(x=>x.dataset.kind);D.panel().close();return [...new Set(k)]; })()`);
  report.tunnel = await page.evaluate(`(() => { const T=TT,D=T.trainingDbg,tg=D.tg();T.player.position.set(tg.spawn.x,tg.floorY,tg.spawn.z);return {group:!!D.tunnel()?.group,gate:tg.gate,passage:tg.releaseGate.passage}; })()`);
  report.arena = [];
  for (const kind of report.kinds) {
    const started = await page.evaluate(`TT.trainingDbg.spawn(${JSON.stringify(kind)},1)`);
    const countdown = await page.evaluate(`(() => { const m=TT.AudioSys.musicState();return {deploy:TT.trainingDbg.state().deployment.read(),security:TT.trainingDbg.state().security.read(),motif:m.score?.motif,track:m.score?.track}; })()`);
    if (kind === report.kinds[0]) await page.screenshot(path.join(out, '12-arena-alarm.png'));
    const arrived = await page.waitFor('TT.trainingDbg.alive() === 1', { timeout: 12000 });
    const emerged = await page.waitFor('TT.zombies.some(z=>z.alive&&z.trainingZ&&z.mesh.visible)', { timeout: 12000 });
    const state = await page.evaluate(`(() => { const T=TT,D=T.trainingDbg,z=T.zombies.find(z=>z.alive&&z.trainingZ),tg=D.tg(),m=T.AudioSys.musicState();T.setShotView({x:tg.gate.x-9,y:tg.floorY+5,z:tg.gate.z-12,tx:tg.gate.x,ty:tg.floorY+1,tz:tg.gate.z,fov:55});return {alive:D.alive(),type:z?.typeKey,entry:!!z?.trainingEntry,visible:!!z?.mesh.visible,tunnel:!!D.tunnel()?.group,motif:m.score?.motif,track:m.score?.track}; })()`);
    await page.screenshot(path.join(out, `13-arena-${kind}.png`));
    report.arena.push({kind,started,arrived:!!arrived,emerged:!!emerged,countdown,state});
    await page.evaluate('TT.trainingDbg.clear()');
    await new Promise(r => setTimeout(r, 400));
  }
  report.mortar = await page.evaluate(`(() => { const T=TT,D=T.trainingDbg,tg=D.tg(),p=T.player.position;p.set(tg.origin.x-14,tg.floorY,tg.origin.z-8);T.unlockAllBuilds();const b=T.spawnBuild('mortar',p.x+1.2,p.z);const mounted=b&&T.mountMortar(b),before=T.getReserve()['60mm']|0,aim=T.getMortarAim();if(mounted)T.fireMortar();const after=T.getReserve()['60mm']|0;return {built:!!b,mounted:!!mounted,before,after,spent:before-after,aim,afterAim:T.getMortarAim(),blocked:T.getMortarNoRoom(),stillMounted:T.getMortarMounted()===b}; })()`);
  await page.screenshot(path.join(out, '14-arena-mortar.png'));
  report.errors = page.errors.slice();
  console.log('ARENA WALK', JSON.stringify({kinds:report.kinds.length,arrived:report.arena.filter(x=>x.arrived&&x.state.type===x.kind).length,mortar:report.mortar,errors:report.errors.length}));
} catch (e) { report.errors.push(String(e?.stack||e)); console.error('ARENA WALK ERROR',String(e?.stack||e)); process.exitCode=1; }
finally { save(); await browser.close(); await server.close(); }
