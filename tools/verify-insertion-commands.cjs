// Browser smoke test for live insertion scenery and the three console commands.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const moduleCode=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const syntax=spawnSync(process.execPath,['--input-type=module','--check'],{input:moduleCode,encoding:'utf8'});
if(syntax.status)throw Error(syntax.stderr);
html=html.replace('window.TT = {',`window.insertionProbe = {
  menuCamera,birdFlocks,wind,weather,cloudGroup,rainMesh,clock,tick,endLivePreRoll,
  state:()=>({gameStarted,gameMode,worldTime,isNight,day,bank,devInfiniteCash,devGodMode,devNoZombies})
}; window.TT = {`);

(async()=>{
  const server=http.createServer((q,r)=>{
    const pathname=new URL(q.url,'http://localhost').pathname;
    if(pathname==='/index.html'){r.setHeader('Content-Type','text/html');r.end(html);return;}
    const file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root+path.sep)){r.writeHead(403).end();return;}
    fs.readFile(file,(error,bytes)=>{
      if(error){r.writeHead(404).end();return;}
      r.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.mp4':'video/mp4','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');
      r.end(bytes);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.COMBAT_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:''}));
    if(process.env.THREE_TEST_ROOT)await page.route('https://cdn.jsdelivr.net/npm/three@0.175.0/**',r=>r.fulfill({path:path.join(process.env.THREE_TEST_ROOT,r.request().url().split('three@0.175.0/')[1]),contentType:'text/javascript'}));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?debug=1`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.TT,null,{timeout:120000});
    await page.evaluate(()=>{DWOpening.ready();document.getElementById('openingSkip').click();document.getElementById('openingSkip').click();});
    await page.waitForFunction(()=>document.getElementById('opening').hidden);
    const result=await page.evaluate(()=>{
      TT.renderer.setAnimationLoop(null);
      insertionProbe.endLivePreRoll();TT.finishEffectWarmup();
      TT.playerNameEl.value='Insertion Tester';
      document.getElementById('modeHunt').click();
      if(!insertionProbe.menuCamera.deploying)throw Error('Parachute sequence did not start');
      insertionProbe.clock.getDelta=()=>0.05;
      insertionProbe.menuCamera.advance(0.75); // pass the opening fade, begin the drop
      if(!insertionProbe.state().gameStarted)throw Error('Match did not start during drop');
      const before={bird:insertionProbe.birdFlocks[0].ang,wind:insertionProbe.wind.time,cloud:insertionProbe.cloudGroup.position.x};
      for(let i=0;i<5;i++)insertionProbe.tick();
      const after={bird:insertionProbe.birdFlocks[0].ang,wind:insertionProbe.wind.time,cloud:insertionProbe.cloudGroup.position.x};
      if(!insertionProbe.menuCamera.deploying||after.bird===before.bird||after.wind===before.wind||after.cloud===before.cloud)throw Error('Scenery froze during insertion: '+JSON.stringify({before,after}));
      insertionProbe.menuCamera.advance(9); // land before entering commands
      TT.runDevCommand('Night Ops');
      const night=insertionProbe.state();
      if(!night.isNight||Math.abs(night.worldTime-0.02)>0.001)throw Error('Night Ops failed: '+JSON.stringify(night));
      TT.runDevCommand('Shower');
      const storm={raining:insertionProbe.weather.raining,intensity:insertionProbe.weather.intensity,duration:insertionProbe.weather.rainTimeLeft,visible:insertionProbe.rainMesh.visible};
      if(!storm.raining||storm.intensity<=0||storm.duration<80||!storm.visible)throw Error('Shower failed: '+JSON.stringify(storm));
      const camp=TT.landmarks.find(l=>l.kind==='campsite');
      const originalColliders=camp.spawnColliders.length;
      TT.damageLandmark(camp,camp.hp+1);
      if(camp.alive)throw Error('Landmark destruction setup failed');
      TT.runDevCommand('bigtex shooter');TT.runDevCommand('godmode');TT.runDevCommand('nodead');
      TT.runDevCommand('Reset');
      const reset=insertionProbe.state();
      const restored=camp.alive&&camp.mesh.visible&&camp.colliders.length===originalColliders&&camp.colliders.every(c=>TT.worldSolids.includes(c));
      if(!reset.gameStarted||reset.gameMode!=='hunt'||reset.day!==1||reset.bank!==40||reset.isNight||reset.devInfiniteCash||reset.devGodMode||reset.devNoZombies||insertionProbe.weather.raining||insertionProbe.weather.intensity!==0||!restored||Math.abs(TT.player.position.z+8.5)>0.01)throw Error('Reset failed: '+JSON.stringify({reset,restored,weather:insertionProbe.weather,player:TT.player.position.toArray()}));
      return {before,after,night:{worldTime:night.worldTime,isNight:night.isNight},storm,reset,restored};
    });
    if(errors.length)throw Error('Page errors: '+JSON.stringify(errors));
    console.log(JSON.stringify({result,errors},null,2));
  }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
