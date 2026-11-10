import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {save as writeFile} from './save.mjs';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
const phase=process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const rows=process.argv[3]==='rows';
const folder=new URL((rows?'./rows/':'./detail/')+phase+'/',import.meta.url);await mkdir(folder,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const p=await browser.newPage({width:960,height:540});
  await p.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await p.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await p.evaluate('DWOpening.dismissForTesting()');
  assert(await p.waitFor('!DWOpening.active'));
  await p.evaluate("document.getElementById('playerName').value='Detail';document.getElementById('modeTraining').click()");
  assert(await p.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on") && Math.abs(TT.getWorldTime()-.5)<.02',{timeout:45000}));
  const data=await p.evaluate(`(async()=>{
    const {gunDetail}=await import('/studio/gun-detail.js'),{auditWeapon}=await import('/tools/tests/weapon-seating.js');
    const T=TT.THREE,ctx=TT.inspectHost().builders.weaponContext(),D=gunDetail(ctx);
    const panel=new T.Group(),report={};
    for(const [i,kind] of (${rows?"['ribs','groove']":"['slot','hex','torx','button','rivet']"}).entries()){
      const g=new T.Group(),plate=new T.Mesh(new T.BoxGeometry(.018,.024,.004),ctx.gunMid);
      plate.position.z=-.002;g.add(plate);
      if(kind==='ribs')D.ribs(g,{axis:'z',along:'x',count:5,pitch:.0027,w:.013,h:.0012});
      else if(kind==='groove')D.groove(g,{axis:'z',along:'y',w:.0016,len:.016});
      else if(kind==='rivet')D.rivet(g,0,0,0,{axis:'z',r:.0045});
      else D.screw(g,0,0,0,{kind,axis:'z',r:.0055,head:.0022});
      const r=auditWeapon(g);
      report[kind]={parts:r.parts,open:r.openSurfaces,loose:r.loose.length,intersections:r.overlaps.length,seated:r.detailSeats.length,breaches:r.detailBreaches.length};
      g.position.x=(i-${rows?'.5':'2'})*.021;panel.add(g);
    }
    panel.scale.setScalar(8);panel.position.set(30,80,-60);TT.scene.add(panel);TT.setViewFirstDbg(false);
    const key=new T.DirectionalLight(0xfff6e1,3),fill=new T.HemisphereLight(0xe5f1ff,0xc2b8aa,1.4);
    key.position.set(31,82,-58);key.target.position.copy(panel.position);TT.scene.add(key,key.target,fill);
    const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);
    return report;
  })()`);
  for(const [name,x,y,z] of [['face',.005,.008,.118],['profile',.025,.042,.075]]){
    await p.evaluate('TT.setShotView('+JSON.stringify({x:30+8*x,y:80+8*y,z:-60+8*z,tx:30,ty:80,tz:-60,fov:36})+');new Promise(r=>setTimeout(r,220))');
    const img=await p.send('Page.captureScreenshot',{format:'jpeg',quality:94});
    await writeFile(new URL(name+'.jpg',folder),Buffer.from(img.data,'base64'));
  }
  await writeFile(new URL('results.json',folder),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify(data));
  if(rows){
    await p.goto(server.origin+'/index.html?inspect&debug=1&raf=timer');
    assert(await p.waitFor('window.DWInspect?.ready'));
    for(const id of ['pistol','uzi']){
      await p.evaluate("DWInspect.show('weapon."+id+"',{instant:true})");
      for(const [light,view] of [['noon','side'],['overcast','three'],['dusk','rear3'],['night','three']]){
        const image=await p.evaluate("(async()=>{DWInspect.light('"+light+"');DWInspect.view('"+view+"',{instant:true});await DWInspect.stepAsync(2);return DWInspect.shot({type:'image/jpeg',quality:.94})})()");
        await writeFile(new URL(id+'-'+light+'.jpg',folder),Buffer.from(image.split(',')[1],'base64'));
      }
    }
  }
  assert.deepEqual(p.errors,[]);
  if(phase==='after')assert(Object.values(data).every(v=>v.parts>=2&&!v.open&&!v.loose&&!v.intersections&&!v.breaches));
}finally{await browser.close();await server.close();}
