import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';

const phase=process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after','trial'].includes(phase));
const root=fileURLToPath(new URL('../../',import.meta.url));
const output=new URL('./'+phase+'/',import.meta.url);
await mkdir(output,{recursive:true});
const server=await serve(root,0), browser=await launch({headless:false});
try {
  const p=await browser.newPage({width:1280,height:720});
  await p.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await p.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await p.evaluate('DWOpening.dismissForTesting()');
  assert(await p.waitFor('!window.DWOpening || !DWOpening.active',{timeout:30000}));
  await p.evaluate(`document.getElementById('playerName').value='HandFit';
    document.getElementById('modeTraining').click()`);
  assert(await p.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on") && Math.abs(TT.getWorldTime()-.5)<.02',{timeout:45000}));
  await p.evaluate(`TT.grantAllWeapons(); TT.modsOwnAllDbg(); TT.setGearDbg('laserLight');
    TT.armoryDbg.fit('uzi','laserLight',true); TT.setWeapon(TT.WEAPON_ORDER.indexOf('minigun'));
    if(TT.isUnarmed()) TT.toggleHolster(); TT.setViewFirstDbg(true);`);
  const vmReady=await p.waitFor('TT.viewmodelDbg()?.info.active',{timeout:30000});
  if(!vmReady) {
    const state=await p.evaluate("({phase:TT.getPhase(),weapon:TT.getCurrentWeapon(),holstered:TT.isUnarmed(),view:!!TT.viewmodelDbg(),body:document.body.className,loading:DWLoad.snapshot().state,first:TT.vmStateDbg()?.first})");
    throw Error('View did not settle '+JSON.stringify(state));
  }
  // Retain the lead's hip pose, hand meshes and depth calculation. The Training
  // Ground is already running. Record where on each hand and model the test failed.
  const original=await readFile(new URL('../../tools/tests/clip-check.js',import.meta.url),'utf8');
  const changes=[
    ['export async function clipCheck','async function clipCheck'],
    ["await startMatch(T, 'Clip');","if(!T.trainingDbg.state().active)throw Error('Training Ground required');"],
    ["let worst = 0, where = '';","let worst = 0, where = ''; const hands={}; window.fitContacts[key]=hands;"],
    ["if (d > worst) { worst = d;",`const id=sd+' '+mk;
       if(!hands[id] || d*1000>hands[id].depthMm) hands[id]={depthMm:d*1000,part:pt.name,
         local:V.gun.root.worldToLocal(v.clone()).toArray()};
       if (d > worst) { worst = d;`]
  ];
  let code=original;
  for(const [find,repl] of changes) {assert.equal(code.split(find).length,2,find); code=code.replace(find,repl);}
  await p.evaluate(code+'\nwindow.captureContact=clipCheck;window.fitContacts={}');
  const lines=[],clearances={};
  const ids=phase==='trial'?['uzi']:['minigun','launcher','uzi'];
  for(const id of ids){
    const result=await p.evaluate(`(async()=>{const out=[];await captureContact(TT,['${id}'],
      (v,msg)=>out.push((v?'PASS ':'FAIL ')+msg),out);return out.join('\\n');})()`,180000);
    assert(result.includes('guns checked up in first person: 1 of 1'),id+' pose failed: '+result);
    lines.push(id+'\n'+result);
    clearances[id]=await p.evaluate(`(async()=>{
      const {contactClearance,snapshotContact}=await import('/review/GT-20078/clearance.js');
      window.pocketCopies??={};window.pocketCopies['${id}']=snapshotContact(TT,'${id}');
      return contactClearance(TT,'${id}');
    })()`);
    await p.screenshot(fileURLToPath(new URL(id+'-hip.png',output)));
  }
  const contacts=await p.evaluate('window.fitContacts');
  await p.evaluate("TT.setViewFirstDbg(false);TT.flightHold(false);const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);");
  for(const [id,x,y,z] of [['minigun',0,-.012,-.35],['launcher',0,-.09,-.05],['uzi',0,-.06,.19]]){
    if(!ids.includes(id)) continue;
    await p.evaluate(`TT.scene.add(pocketCopies['${id}']);true`);
    for(const [side,dx] of [['left',-.44],['right',.44]]){
      const tx=30+x,ty=80+y,tz=-60+z;
      const camera={x:tx+dx,y:ty+.12,z:tz-.16,tx,ty,tz,fov:32};
      await p.evaluate('TT.setShotView('+JSON.stringify(camera)+');new Promise(r=>setTimeout(r,250))');
      const img=await p.send('Page.captureScreenshot',{format:'jpeg',quality:92});
      await writeFile(new URL(id+'-'+side+'-contact.jpg',output),Buffer.from(img.data,'base64'));
    }
    await p.evaluate(`TT.scene.remove(pocketCopies['${id}']);true`);
  }
  await writeFile(new URL('clearance.json',output),JSON.stringify(clearances,null,2)+'\n');
  await writeFile(new URL('depths.json',output),JSON.stringify(contacts,null,2)+'\n');
  await writeFile(new URL('checks.txt',output),lines.join('\n\n')+'\n');
  console.log(JSON.stringify(contacts));
  assert.deepEqual(p.errors,[]);
} finally {await browser.close();await server.close();}
