// Playwright smoke/visual check; THREE_TEST_ROOT optionally supplies three@0.175.0 offline.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {chromium}=require('playwright');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(os.tmpdir(),'dead-wave-campsite-checks');
fs.mkdirSync(out,{recursive:true});
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const syntax=spawnSync(process.execPath,['--input-type=module','--check'],{input:html.match(/<script type="module">([\s\S]*?)<\/script>/)[1],encoding:'utf8'});
if(syntax.status)throw Error(syntax.stderr);
html=html.replace('window.TT = {','window.campProbe = {updateDayNight,updateCampfires,destroyLandmark,endLivePreRoll,render(){const nf=renderer._nodes?.nodeFrame;if(nf){nf.update();renderer.info.frame=nf.frameId;}renderFrame();}}; window.TT = {');
(async()=>{
  const server=http.createServer((q,r)=>{
    const pathname=new URL(q.url,'http://localhost').pathname;
    if(pathname==='/index.html'){r.setHeader('Content-Type','text/html');r.end(html);return;}
    const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){r.writeHead(403).end();return;}
    fs.readFile(file,(e,b)=>{if(e){r.writeHead(404).end();return;}r.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.mp4':'video/mp4','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');r.end(b);});
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.COMBAT_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:''}));
    if(process.env.THREE_TEST_ROOT)await page.route('https://cdn.jsdelivr.net/npm/three@0.175.0/**',r=>r.fulfill({path:path.join(process.env.THREE_TEST_ROOT,r.request().url().split('three@0.175.0/')[1]),contentType:'text/javascript'}));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?debug=1`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.TT,null,{timeout:120000});
    await page.evaluate(()=>{DWOpening.ready();document.getElementById('openingSkip').click();document.getElementById('openingSkip').click();});
    await page.waitForFunction(()=>document.getElementById('opening').hidden);
    const sites=await page.evaluate(()=>{
      TT.renderer.setAnimationLoop(null);campProbe.endLivePreRoll();TT.finishEffectWarmup();TT.renderer.domElement.style.visibility='visible';
      document.getElementById('hud').style.display='none';document.getElementById('menuCameraFade').style.opacity=0;document.body.classList.remove('frontend');
      TT.setWorldTime(.52);campProbe.updateDayNight(0);
      return TT.landmarks.filter(l=>l.kind==='campsite').map(l=>({style:l.campStyle,vertices:l.mesh.geometry.attributes.position.count,colliders:l.colliders.length,finite:Array.from(l.mesh.geometry.attributes.position.array).every(Number.isFinite),validBounds:l.colliders.every(c=>c.y1>c.y0&&c.radius>0)}));
    });
    if(new Set(sites.map(s=>s.style)).size!==3||sites.some(s=>!s.finite||!s.validBounds))throw Error('Invalid campsite geometry/variation: '+JSON.stringify(sites));
    for(let i=0;i<sites.length;i++){
      await page.evaluate(i=>{
        const l=TT.landmarks.filter(l=>l.kind==='campsite')[i],a=l.campYaw;
        TT.camera.position.set(l.x+Math.cos(a)*9+Math.sin(a)*13,l.gy+10,l.z-Math.sin(a)*9+Math.cos(a)*13);
        TT.camera.fov=43;TT.camera.updateProjectionMatrix();TT.camera.lookAt(l.x,l.gy+.5,l.z-1);
        TT.sun.position.set(l.x+20,l.gy+40,l.z+15);TT.sun.target.position.set(l.x,l.gy,l.z);campProbe.render();
      },i);
      await page.screenshot({path:path.join(out,sites[i].style+'.png')});
    }
    const destruction=await page.evaluate(()=>{
      const l=TT.landmarks.find(l=>l.kind==='campsite'),old=l.colliders.slice();campProbe.destroyLandmark(l);campProbe.updateCampfires(.1);
      return !l.alive&&!l.mesh.visible&&!l.emberMesh.visible&&l.light.intensity===0&&old.every(c=>!TT.worldSolids.includes(c));
    });
    if(!destruction||errors.length)throw Error(JSON.stringify({destruction,errors}));
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sites,destruction,errors},null,2));
    console.log(JSON.stringify({sites,destruction,errors},null,2));console.log('Screenshots: '+out);
  }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
