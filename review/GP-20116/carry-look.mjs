import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through the crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20116');
const kind = 'm240';
const closeOnly = process.argv.includes('--close-only');
const backOnly = process.argv.includes('--back-only');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: [
  '--window-position=40,40', '--window-size=1280,720', '--disable-background-timer-throttling'
] });
const result = {};
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&gp20116=carry-look`, { timeout: 120000 });
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 120000 }), 'game ready');
  await page.evaluate(`(() => {
    DWOpening.dismissForTesting();
    document.getElementById('playerName').value = 'GP20116';
    document.getElementById('modeTraining').click();
  })()`);
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:30000}),'title hidden');
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 90000 }), 'Training visible');
  await new Promise(r=>setTimeout(r,12000));
  const snapshot = () => page.evaluate(`(() => {
    const T=TT, t=T.trainingDbg.state(), c=T.getMortarCarried(), v=T.m240VisDbg(), g=v.carriedGun;
    const carry=T.carryDbg(), slots=[
      ['sling0',carry.slung[0]],['sling1',carry.slung[1]],
      ['holster0',carry.holstered[0]],['holster1',carry.holstered[1]],
      ['pair0',carry.plan.pairOn[0]?carry.plan.paired[0]:null],['pair1',carry.plan.pairOn[1]?carry.plan.paired[1]:null],
      ['hip',carry.hip],['hipPair',carry.plan.hipPairOn?carry.plan.hipPair:null]
    ];
    const meshKinds=[];T.getMarine().traverse(o=>{if(o.userData?.carryKind){let shown=true;for(let p=o;p;p=p.parent)if(!p.visible){shown=false;break;}meshKinds.push({kind:o.userData.carryKind,shown,pos:o.getWorldPosition(o.position.clone()).toArray()});}});
    return { player:T.player.position.toArray(), hp:T.getHp(), wake:t.wake?.phase||(t.wake?'pending':null),
      carrying:c?{kind:c.kind,hp:c.hp,belt:c.belt}:null, carry, slots, meshKinds,
      carriedVisible:v.carried, carriedMortarVisible:v.carriedMortar,
      carriedGun:{name:g.name,parent:g.parent?.name,pos:g.position.toArray(),world:g.getWorldPosition(g.position.clone()).toArray(),scale:g.scale.toArray(),children:g.children.length},
      CARRY_M240:v.CARRY_M240,CARRY_ARM:v.CARRY_ARM,
      fence:t.infirmaryFence?.state(),placed:T.builds.filter(b=>b.type==='m240').map(b=>({hp:b.hp,belt:b.belt})),
      fuel:T.fuelDbg.run().phase,fuelSlow:T.fuelDbg.slow(),bed:t.tg?.bed?.stand,bay:t.infirmaryFence?.bay,phase:T.getPhase()};
  })()`);
  const shoot=async(name,view)=>{
    await page.evaluate(`TT.setShotView(${JSON.stringify(view)})`);
    const file=path.join(out,name+'.png');
    for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,450));await page.screenshot(file);if(fs.statSync(file).size>100000)return;}
    throw Error('blank scene: '+name);
  };
  const entry = await page.evaluate(`(() => {
    const T=TT,tg=T.trainingDbg.tg();
    T.player.position.set(tg.origin.x-25,tg.floorY,tg.origin.z);
    T.setViewFirstDbg(false);T.setAimYawDbg(0);
    return T.player.position.toArray();
  })()`);
  const [x,y,z]=entry;
  const overhead={x:x+2,y:y+5,z:z-3.1,tx:x,ty:y+1.2,tz:z,fov:48};
  const rear={x:x+1.5,y:y+2.2,z:z-4.2,tx:x,ty:y+1.1,tz:z,fov:55};
  const close={x:x-0.8,y:y+3.2,z:z-1.4,tx:x,ty:y+1.05,tz:z,fov:32};
  const backClose={x:x+0.8,y:y+3.2,z:z+1.4,tx:x,ty:y+1.05,tz:z,fov:32};
  result.camera={overhead,rear,close,backClose};
  await new Promise(r=>setTimeout(r,1200));
  result.start = await snapshot();
  await page.screenshot(path.join(out,'build-room-entry-natural.png'));
  if(!closeOnly)await shoot('build-room-entry-overhead',overhead);
  await page.evaluate('TT.grantAllWeapons()');
  await new Promise(r=>setTimeout(r,700));
  result.allWeapons=await snapshot();
  if(!closeOnly)await shoot('all-weapons-overhead',overhead);
  if(!backOnly)await shoot('all-weapons-close',close);
  await shoot('all-weapons-back-close',backClose);
  await page.evaluate('TT.setShotView(null)');
  const setup = await page.evaluate(`(() => {
    const T = TT, p = T.player.position;
    const b = T.spawnBuild('${kind}', p.x + 1.2, p.z);
    if (!b) return { error: 'spawnBuild returned null', p: p.toArray() };
    const mounted = T.mountMortar(b);
    if (mounted) T.shoulderMortar();
    return { mounted, carried: T.getMortarCarried(), p: p.toArray() };
  })()`);
  console.log('setup ' + JSON.stringify(setup));
  assert.equal(setup?.carried?.kind, kind, `${kind} shouldered`);
  result.shouldered = await snapshot();
  if(!closeOnly)await shoot('watchman-shouldered-overhead',overhead);
  if(!backOnly)await shoot('watchman-shouldered-close',close);
  await shoot('watchman-shouldered-back-close',backClose);
  if(!closeOnly)await shoot('watchman-shouldered-rear',rear);
  await page.evaluate('TT.setShotView(null)');
  await page.evaluate(`TT.runDevCommand('rip')`);
  assert(await page.waitFor('!!TT.trainingDbg.state().wake', { timeout: 20000 }), 'death wake started');
  result.downed = await snapshot();
  assert(await page.waitFor('!TT.trainingDbg.state().wake', { timeout: 90000 }), 'infirmary recovery ended');
  result.recovered = await snapshot();
  const [bx,by,bz]=result.recovered.player;
  if(!closeOnly)await shoot('infirmary-wake-overhead',{x:bx+2,y:by+5,z:bz-3.1,tx:bx,ty:by+1.2,tz:bz,fov:48});
  await page.evaluate('TT.setShotView(null)');
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  await new Promise(resolve => setTimeout(resolve, 1800));
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  result.walked = await snapshot();
  assert.equal(result.recovered.carrying, null, `${kind} carry cleared on death`);
  assert.equal(result.recovered.placed.length, 1, `${kind} returned to death site`);
  assert.equal(result.recovered.placed[0].hp, result.shouldered.carrying.hp, `${kind} health preserved`);
  if (kind === 'm240') assert.equal(result.recovered.placed[0].belt, result.shouldered.carrying.belt, 'Watchman belt preserved');
  assert.equal(result.recovered.fence.raised, false, 'infirmary fence lowered for recovery');
  assert(result.walked.player[2] - result.recovered.player[2] > 5, `${kind} can walk out of infirmary`);
  assert.equal(result.walked.fence.raised, true, 'fence rises after exit');
  assert.equal(result.walked.fuelSlow, 1, 'no carried fuel slowdown');
  console.log(JSON.stringify({closeOnly,slots:result.allWeapons.slots,meshKinds:result.allWeapons.meshKinds,shouldered:result.shouldered.carrying,recovered:result.recovered.carrying,walked:result.walked.player,pageErrors:page.errors}));
  assert.equal(page.errors.length, 0, 'page errors');
} finally {
  fs.writeFileSync(path.join(out, 'carry-look.json'), JSON.stringify(result, null, 2) + '\n');
  await browser.close();
  await server.close();
}
