import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { RANGE_DRILLS } from '../../ui/range-drills.js';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20099');
const from = Math.max(0, Number(process.argv[2]) || 0), count = Math.max(1, Number(process.argv[3]) || 1);
const runner = fs.readFileSync(path.join(out, 'drills-page.js'), 'utf8');
const server = await serve(root, 0), browser = await launch({headless:false,args:['--window-size=1280,720']});
const results = [];
try {
  const page = await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"',{timeout:90000})) throw Error('game not ready');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('document.getElementById("opening").hidden',{timeout:15000});
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20099 Range';document.getElementById('modeTraining').click()})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000})) throw Error('training not ready');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000});
  await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.rangeConsole.front;T.player.position.set(f.x,tg.floorY,f.z);T.grantAllWeapons();T.setUnarmedDbg(false)})()`);
  for (let i=from;i<from+count;i++) {
    await page.evaluate(`window.GP20099={index:${i}}`);
    const row=await page.evaluate(runner,300000);
    results.push(row);
    const d=RANGE_DRILLS[i],r=row.result;
    assert.equal(row.started,true,`${row.id}: start`);
    assert.equal(r?.state,'COMPLETED',`${row.id}: state`);
    assert.equal(r?.valid,true,`${row.id}: valid result`);
    assert.equal(r?.cleared,row.expected,`${row.id}: cleared goal`);
    assert.equal(row.hitRejected,0,`${row.id}: rejected hit`);
    assert.equal(row.hitAccepted,r?.shots,`${row.id}: real hits and shot ledger`);
    assert.equal(r?.score,Math.max(0,Math.round(r.base+r.bonuses-r.deductions)),`${row.id}: score breakdown`);
    assert(r.time>0&&r.time<=d.duration,`${row.id}: time within drill`);
    assert.equal(row.saved?.score,r.score,`${row.id}: saved record score`);
    assert(Math.abs(row.saved?.time-r.time)<.001,`${row.id}: saved record time`);
    assert.equal(row.ui.result.score,String(r.score),`${row.id}: visible result score`);
    assert(row.ui.result.metrics.includes(r.time.toFixed(2)+'s'),`${row.id}: visible result time`);
    assert(row.ui.result.metrics.includes(`${r.cleared}/${row.expected}`),`${row.id}: visible result cleared`);
    assert(row.ui.result.metrics.includes(String(r.shots)),`${row.id}: visible result shots`);
    assert(row.ui.board.history.includes(String(r.score))&&row.ui.board.history.includes(r.time.toFixed(2)+'s'),`${row.id}: visible record board`);
    console.log(`DRILL ${i+1} ${row.weapon}/${row.id} ${row.result?.state || row.reason || 'NO RESULT'} ${row.result?.cleared || 0}/${row.expected} hits=${row.hitAccepted} rejected=${row.hitRejected} record=${row.recordCount}`);
    if (i===from) await page.screenshot(path.join(out,`drill-${String(i+1).padStart(2,'0')}-result.png`));
  }
  results.push({pageErrors:page.errors});
  console.log(`SUMMARY ${results.filter(r=>r.result?.state==='COMPLETED').length}/${count} completed; page errors ${page.errors.length}`);
} finally {
  fs.writeFileSync(path.join(out,`drills-${from}-${count}.json`),JSON.stringify(results,null,2));
  await browser.close(); await server.close();
}
