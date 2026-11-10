import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {save as writeFile} from './save.mjs';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';

const phase=process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const folder=new URL('./rail/'+phase+'/',import.meta.url);
await mkdir(folder,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:960,height:540});
  if(phase==='before'){
    // Reproduce the original single dark strip and overlaid bands only in this
    // local screenshot tab; the measured pre-change fixture is saved separately.
    const source=await readFile(new URL('../../studio/gun-detail.js',import.meta.url),'utf8');
    const start=source.indexOf('export function drawWeaponRail('),end=source.indexOf('export function gunDetail(');
    assert(start>=0 && end>start);
    const old=`export function drawWeaponRail(length,width,side,addBox){
      const horizontal=side===0||side===2;
      addBox(horizontal?width:.014,horizontal?.014:width,length,.003,false,0,0,0);
      for(let z=-length/2+.012;z<length/2-.006;z+=.026)
        addBox(horizontal?width+.006:.018,horizontal?.018:width+.006,.01,.002,true,
          horizontal?0:side*.002,horizontal?(side===2?-.002:.002):0,z);
    }\n`;
    const body=Buffer.from(source.slice(0,start)+old+source.slice(end)).toString('base64');
    page.conn.onEvent(e=>{
      if(e.sessionId===page.sessionId && e.method==='Fetch.requestPaused') {
        page.send('Fetch.fulfillRequest',{requestId:e.params.requestId,responseCode:200,
          responseHeaders:[{name:'Content-Type',value:'text/javascript; charset=utf-8'}],body}).catch(err=>page.errors.push(err.message));
      }
    });
    await page.send('Fetch.enable',{patterns:[{urlPattern:'*/studio/gun-detail.js',requestStage:'Request'}]});
  }
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Rail';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on") && Math.abs(TT.getWorldTime()-.5)<.02',{timeout:45000}));
  await page.evaluate(`(async()=>{
    TT.grantAllWeapons();TT.setViewFirstDbg(true);
    if(TT.isUnarmed())TT.toggleHolster();
    for(let i=0;i<30 && TT.getCurrentWeapon()!=='m4';i++){
      TT.setWeapon(TT.WEAPON_ORDER.indexOf('m4'));await new Promise(r=>setTimeout(r,150));
    }
    TT.flightHold(true);
    for(let i=0;i<120 && !(TT.viewmodelDbg().info.active && TT.viewmodelDbg().info.key==='m4');i++)TT.stepFrame(1/30);
    for(let i=0;i<45;i++)TT.stepFrame(1/30);
  })()`);
  assert(await page.waitFor("TT.getCurrentWeapon()==='m4' && TT.viewmodelDbg()?.info.active",{timeout:30000}));
  await page.evaluate(`(async()=>{
    const {snapshotContact}=await import('/review/GT-20078/clearance.js');
    const held=snapshotContact(TT,'m4');TT.setViewFirstDbg(false);TT.flightHold(false);TT.scene.add(held);
    const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);
    TT.setShotView({x:30.44,y:80.35,z:-60.08,tx:30,ty:80.07,tz:-59.62,fov:39});
    await new Promise(r=>setTimeout(r,250));
  })()`);
  await page.screenshot(fileURLToPath(new URL('held-m4-close.png',folder)));
  const records=await page.evaluate(`(async()=>{
    const {auditWeapon}=await import('/tools/tests/weapon-seating.js');
    const T=TT.THREE,ctx=TT.inspectHost().builders.weaponContext(),out=[];
    for(const side of [0,1,-1,2]) {
      const g=new T.Group(); ctx.gunKit(g).rail(.19,0,0,0,null,.042,side);
      const r=auditWeapon(g),b=new T.Box3().setFromObject(g);
      out.push({side,bounds:[b.min.toArray(),b.max.toArray()],pieces:r.parts,loose:r.loose.length,
        overlaps:r.overlaps.length,open:r.openSurfaces,triangles:g.children.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0)});
    }
    return out;
  })()`);
  await writeFile(new URL('fixtures.json',folder),JSON.stringify(records,null,2)+'\n');
  await page.goto(server.origin+'/index.html?inspect&debug=1&raf=timer');
  assert(await page.waitFor('window.DWInspect?.ready'));
  await page.evaluate("DWInspect.show('weapon.m4',{instant:true})");
  for(const [light,view] of [['noon','side'],['overcast','three'],['dusk','rear3'],['night','three']]){
    const img=await page.evaluate(`(async()=>{DWInspect.light('${light}');DWInspect.view('${view}',{instant:true});await DWInspect.stepAsync(2);return DWInspect.shot({type:'image/jpeg',quality:.92})})()`);
    await writeFile(new URL('inspector-m4-'+light+'.jpg',folder),Buffer.from(img.split(',')[1],'base64'));
  }
  assert.deepEqual(page.errors,[]);
  console.log(JSON.stringify(records));
  if(phase==='after') assert(records.every(r=>r.pieces>1 && !r.loose && !r.overlaps && !r.open));
}finally{await browser.close();await server.close();}
