import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from './save.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const root=new URL('../../',import.meta.url),path='/studio/weapon-sidearms.js',call='  fitPistolFrameSeam(THREE, cover, tang);';
const source=await readFile(new URL('../..'+path,import.meta.url),'utf8');assert.equal(source.split(call).length,2);
const index=await readFile(new URL('index.html',root));
const server=await serve(fileURLToPath(root),0),browser=await launch({headless:false}),reverse=process.argv.includes('--reverse');
const records={indexSha:createHash('sha256').update(index).digest('hex'),reverse};
try{
  for(const phase of (reverse?['after','before']:['before','after'])){
    const page=await browser.newPage({width:1280,height:720});
    const art=source.replace(call,phase==='before'?'':"const t0=performance.now();"+call+"(window.frameSeamBuilds||(window.frameSeamBuilds=[])).push(performance.now()-t0);");
    const seen=new Set();
    page.conn.onEvent(msg=>{
      if(msg.sessionId!==page.sessionId||msg.method!=='Fetch.requestPaused')return;
      const u=new URL(msg.params.request.url);assert.equal(u.origin,server.origin);
      const html=u.pathname==='/index.html';assert(html||u.pathname===path);
      seen.add(u.pathname);
      page.send('Fetch.fulfillRequest',{requestId:msg.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:html?'text/html; charset=utf-8':'text/javascript; charset=utf-8'}],body:(html?index:Buffer.from(art)).toString('base64')}).catch(e=>page.errors.push(e.message));
    });
    await page.send('Fetch.enable',{patterns:[path,'/index.html'].map(p=>({urlPattern:server.origin+p+'*'}))});
    await page.goto(server.origin+'/index.html?debug=1');
    assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"'));
    await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
    await page.evaluate("document.getElementById('playerName').value='Frame timing';document.getElementById('modeTraining').click()");
    assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')"));
    records[phase]=await page.evaluate('('+measure.toString()+')()',120000);
    const expected=JSON.parse(await readFile(new URL('./'+(phase==='before'?'catalog-fix-plate-ribs':'catalog-fix-tang-cheek-final-caps')+'/audit.json',import.meta.url),'utf8')).pistol.artworkFingerprint;
    assert.equal(records[phase].hash,expected);assert.equal(seen.size,2);assert.deepEqual(page.errors,[]);
    await page.send('Page.close',{});
    console.log(phase,records[phase]);
  }
  await save(new URL('./visible-repairs/pistol/clear-tang-cheek-after/frame-timing'+(reverse?'-reverse':'')+'.json',import.meta.url),JSON.stringify(records,null,2)+'\n');
}finally{await browser.close();await server.close();}

async function measure(){
  const T=TT;
  T.flightHold(true);T.grantAllWeapons();T.setViewFirstDbg(true);if(T.isUnarmed())T.toggleHolster();
  for(let i=0;i<18&&T.getCurrentWeapon()!=='pistol';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));for(let j=0;j<15;j++)T.stepFrame(1/30);}
  if(T.getCurrentWeapon()!=='pistol')throw Error('Pistol did not equip');
  const range=T.trainingDbg.tg();T.player.position.set(range.origin.x,range.floorY,range.origin.z-5);
  T.setZoomHeldDbg(false);T.setOtsAimDbg(0,-.08);for(let j=0;j<75;j++)T.stepFrame(1/30);
  const {currentModel}=await import('/review/GT-20076/rank-visibility.mjs');
  const {artworkFingerprint}=await import('/tools/tests/weapon-seating.js');
  const hash=artworkFingerprint(currentModel(T,'pistol'));
  const renderer=T.renderer,backend=renderer.backend;
  const gpuAvailable=!!(backend?.isWebGPUBackend&&backend.device.features.has('timestamp-query'));
  if(gpuAvailable)backend.trackTimestamp=true;
  const raf=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  for(let i=0;i<60;i++)await raf();
  const frames=[],gpuSamples=[];let last=await raf(),busy=false;
  for(let i=0;i<150;i++){
    const t=await raf();frames.push(t-last);last=t;
    if(gpuAvailable&&!busy){
      busy=true;renderer.resolveTimestampsAsync('render').then(ms=>{if(ms>0&&ms<1000)gpuSamples.push(ms);}).finally(()=>{busy=false;});
    }
  }
  const quantiles=vals=>{
    const s=vals.slice().sort((a,b)=>a-b),at=p=>s.length?s[Math.floor((s.length-1)*p)]:null;
    return {count:s.length,p50:at(.5),p95:at(.95)};
  };
  return {hash,gun:T.getCurrentWeapon(),eye:T.viewmodelDbg().info.active,backend:backend?.constructor?.name,frames:quantiles(frames),gpu:quantiles(gpuSamples),seamBuildMs:window.frameSeamBuilds||[]};
}
