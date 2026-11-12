import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN&&['before','after'].includes(phase));
const root=new URL('./'+phase+'/',import.meta.url);await mkdir(root,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const p=await browser.newPage({width:960,height:540});await p.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await p.waitFor('window.TT&&DWLoad.snapshot().state==="ready"'));await p.evaluate('DWOpening.dismissForTesting()');assert(await p.waitFor('!DWOpening.active'));
  await p.evaluate("document.getElementById('playerName').value='Smoke trail';document.getElementById('modeTraining').click()");
  assert(await p.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await p.evaluate("import('/review/GT-20089b/trail-scene.mjs').then(m=>{window.trail=m.trailScene(TT);return true})");
  for(const view of ['eye','third'])for(const mode of ['trail','walk']){
    const label=view+'-'+mode,dir=new URL(label+'/',root);await mkdir(dir,{recursive:true});
    const initial=await p.evaluate('trail.start('+JSON.stringify(view)+','+JSON.stringify(mode)+')',180000);
    const states=[];
    for(const t of (mode==='trail'?[0,1,2]:[0,.15,.32,.6,1,2])){
      states.push(await p.evaluate('trail.advance('+t+')'));
      for(const light of ['noon','overcast','dusk','night']){
        await p.evaluate('trail.picture('+JSON.stringify(light)+')');
        const frame=await p.send('Page.captureScreenshot',{format:'png'});
        await writeFile(new URL(t+'-'+light+'.png',dir),Buffer.from(frame.data,'base64'));
      }
    }
    await writeFile(new URL('run.json',dir),JSON.stringify({initial,states},null,2)+'\n');
    const last=states.at(-1);
    console.log(label,initial.shots,'life',initial.youngest.life,'alive',states.map(s=>s.alive),'travel',last.walkTravel,'nearest player/eye',last.walkMin,last.eyeMin);
    if(mode==='walk')assert(last.walkTravel>1&&last.walkMin<.45,'The character must walk through the emitted trail');
    if(mode==='trail'&&phase==='after')assert.equal(last.alive,0);
  }
  assert.deepEqual(p.errors,[]);
}finally{await browser.close();await server.close();}
