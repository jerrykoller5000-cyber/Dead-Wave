import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Run through crew.mjs slot run');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20105');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const report = { at: new Date().toISOString(), errors: [] };
const save = () => fs.writeFileSync(path.join(out, 'range-walk.json'), JSON.stringify(report, null, 2));
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`);
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 90000 })) throw new Error('game did not load');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('document.getElementById("opening").hidden', { timeout: 30000 });
  await page.evaluate(`(() => { document.getElementById('playerName').value='GP-20105 Range'; document.getElementById('modeTraining').click(); })()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 90000 })) throw new Error('Training did not start');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 1800));
  report.console = await page.evaluate(`(() => {
    const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.rangeConsole.front;
    T.player.position.set(f.x,tg.floorY,f.z);const action=T.trainingDbg.action();T.doAction();
    return {action,open:T.rangeDbg.feature().isOpen(),text:document.body.textContent.slice(-900)};
  })()`);
  await page.screenshot(path.join(out, '06-range-console.png'));
  report.drills = await page.evaluate(`(async () => {
    const T=TT,D=(await import('/ui/range-drills.js')).RANGE_DRILLS,results=[];
    T.rangeDbg.exit();T.grantAllWeapons();T.setUnarmedDbg(false);
    for(const d of D){
      T.rangeDbg.open();const r=T.rangeDbg.start(d),s=T.rangeDbg.read();
      results.push({weapon:d.weapon,id:d.id,started:!!r?.ok,reason:r?.reason||null,state:s?.state,expected:s?.expectedWeapon});
      T.rangeDbg.exit();
    }
    return results;
  })()`, 300000);
  report.active = await page.evaluate(`(async () => {
    const T=TT,d=(await import('/ui/range-drills.js')).RANGE_DRILLS.find(x=>x.id==='first-steps');
    T.rangeDbg.open();const r=T.rangeDbg.start(d);return {start:r,state:T.rangeDbg.read()};
  })()`);
  await new Promise(r => setTimeout(r, 10500));
  report.activeAfterCountdown = await page.evaluate('TT.rangeDbg.read()');
  await page.screenshot(path.join(out, '07-range-drill-active.png'));
  await page.evaluate('TT.rangeDbg.exit()');
  report.targets = await page.evaluate(`(() => {
    const T=TT,tg=T.trainingDbg.tg(),D=T.trainingDbg;
    tg.resetTargets();T.setShotView({x:0,y:tg.floorY+7,z:tg.origin.z-10.4,tx:0,ty:tg.floorY+1,tz:tg.origin.z+13,fov:52});
    return {five:tg.targets.length,states:tg.targets.map(x=>x.state),hits:D.state().hits};
  })()`);
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot(path.join(out, '08-targets-before.png'));
  report.targetHit = await page.evaluate(`(() => {
    const D=TT.trainingDbg,t=D.tg().targets[2],b=t.box;
    const p={prev:{x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2,z:b.minZ-1},pos:{x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2,z:b.minZ+1},hit:false};
    const worked=D.round(p);return {worked,hit:p.hit,state:t.state,hits:D.state().hits};
  })()`);
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot(path.join(out, '09-targets-hit.png'));
  await new Promise(r => setTimeout(r, 1500));
  report.targetDown = await page.evaluate('TT.trainingDbg.tg().targets[2].state');
  report.targetReset = await page.evaluate(`(() => {
    const tg=TT.trainingDbg.tg();tg.resetTargets();return tg.targets.map(t=>t.state);
  })()`);
  await page.screenshot(path.join(out, '09b-targets-reset.png'));
  await new Promise(r => setTimeout(r, 1200));
  report.targetRisen = await page.evaluate('TT.trainingDbg.tg().targets[2].state');
  await page.screenshot(path.join(out, '09c-targets-risen.png'));
  report.burn = await page.evaluate(`(() => {
    const D=TT.trainingDbg,t=D.tg().targets[0],b=t.box,p={x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2,z:b.minZ};
    return {worked:D.hitDbg(0,p,{kind:'burn',from:{x:p.x,y:p.y,z:p.z-3}}),state:t.state};
  })()`);
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot(path.join(out, '10-targets-ash.png'));
  report.blow = await page.evaluate(`(() => {
    const D=TT.trainingDbg,t=D.tg().targets[4],b=t.box,p={x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2,z:b.minZ};
    return {worked:D.hitDbg(4,p,{kind:'blow',from:{x:p.x,y:p.y,z:p.z-3}}),state:t.state};
  })()`);
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot(path.join(out, '11-targets-pieces.png'));
  report.wreck = await page.evaluate(`(() => ({wreck:TT.trainingDbg.wreck().debug(),consoleOpen:(TT.trainingDbg.act('rangeConsole'),TT.rangeDbg.feature().isOpen())}))()`);
  report.errors = page.errors.slice();
  console.log('RANGE WALK', JSON.stringify({drills:report.drills.length,started:report.drills.filter(x=>x.started).length,notStarted:report.drills.filter(x=>!x.started),hit:report.targetHit,burn:report.burn,blow:report.blow,errors:report.errors.length}));
} catch (e) { report.errors.push(String(e?.stack||e)); console.error('RANGE WALK ERROR',String(e?.stack||e)); process.exitCode=1; }
finally { save(); await browser.close(); await server.close(); }
