// Runtime/visual checks for landmark dressing, destruction, mortar levels and Swarm.
// Uses the local Three package when THREE_TEST_ROOT is set.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(os.tmpdir(),'dead-wave-landmark-checks');
fs.mkdirSync(out,{recursive:true});
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const parsed=spawnSync(process.execPath,['--input-type=module','--check'],{input:html.match(/<script type="module">([\s\S]*?)<\/script>/)[1],encoding:'utf8'});
if(parsed.status)throw Error(parsed.stderr);
html=html.replace('window.TT = {',`window.poiProbe = {
  nearestMortar,canReachMortar,mountMortar,dismountMortar,devSwarm,clearZombies,
  destroyLandmark,updateDayNight,endLivePreRoll,
  init(){renderer.setAnimationLoop(null);endLivePreRoll();finishEffectWarmup();playerNameEl.value='Landmark QA';startMode('hunt');paused=false;grounded=true;clearZombies();},
  render(){const nf=renderer._nodes?.nodeFrame;if(nf){nf.update();renderer.info.frame=nf.frameId;}renderFrame();},
  mounted:()=>mortarMounted
}; window.TT = {`);
(async()=>{
  const server=http.createServer((q,r)=>{
    const pathname=new URL(q.url,'http://localhost').pathname;
    if(pathname==='/index.html'){r.setHeader('Content-Type','text/html');r.end(html);return;}
    const file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root+path.sep)){r.writeHead(403).end();return;}
    fs.readFile(file,(err,b)=>{if(err){r.writeHead(404).end();return;}r.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.mp4':'video/mp4','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');r.end(b);});
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
    const bugs=await page.evaluate(()=>{
      const T=TT,P=poiProbe,assert=(ok,msg)=>{if(!ok)throw Error(msg);};P.init();
      T.player.position.set(18,T.sampleHeight(18,0),0);
      const m=T.spawnBuild('mortar',18,1),y=T.player.position.y;
      m.mesh.position.y=y+3.2;
      assert(P.nearestMortar(2.6)===null,'upper-floor mortar was selected');P.mountMortar(m);assert(!P.mounted(),'mounted upper-floor mortar');
      m.mesh.position.y=y-3.2;
      assert(!P.canReachMortar(m),'lower-floor mortar was reachable');P.mountMortar(m);assert(!P.mounted(),'mounted lower-floor mortar');
      m.mesh.position.y=y;
      assert(P.nearestMortar(2.6)===m,'same-floor mortar not selected');P.mountMortar(m);assert(P.mounted()===m,'same-floor mortar did not mount');P.dismountMortar();T.removeBuild(m,true);
      T.player.position.set(0,T.sampleHeight(0,0),0);P.clearZombies();T.runDevCommand('Swarm');
      const types=[...new Set(T.zombies.map(z=>z.typeKey))];
      assert(T.zombies.length===100,'Swarm did not spawn 100 zombies');assert(!types.includes('caveguard'),'Swarm included guardian');P.clearZombies();
      return {mortar:'same floor only',swarmCount:100,swarmTypes:types};
    });
    const sites=await page.evaluate(()=>{
      document.getElementById('hud').style.display='none';document.getElementById('menuCameraFade').style.opacity=0;document.body.classList.remove('frontend');
      TT.renderer.domElement.style.visibility='visible';TT.player.visible=false;
      TT.setWorldTime(.52);poiProbe.updateDayNight(0);
      window.qaSites=TT.landmarks.filter(l=>['cabin','shed','graveyard','tower','campsite'].includes(l.kind)).map(l=>({kind:l.kind,x:l.x,z:l.z,y:l.gy,mesh:l.mesh,yaw:l.mesh.rotation.y||0}));
      for(const kind of ['bridges','wrecks'])for(const p of TT.POI[kind])if(p.mesh)qaSites.push({kind:kind.slice(0,-1),x:p.x,z:p.z,y:p.mesh.position.y,mesh:p.mesh,yaw:p.mesh.rotation.y});
      for(const kind of ['dock','mast']){const p=TT.POI[kind];if(p?.mesh)qaSites.push({kind,x:p.x,z:p.z,y:p.mesh.position.y,mesh:p.mesh,yaw:p.mesh.rotation.y});}
      TT.scene.traverse(m=>{if(m.userData.landmarkTheme==='quarantine perimeter')qaSites.push({kind:'wall',x:m.position.x,z:m.position.z,y:m.position.y,mesh:m,yaw:m.rotation.y});});
      return qaSites.map(s=>{let vertices=0,finite=true;s.mesh.traverse(m=>{if(m.geometry){const p=m.geometry.attributes.position;vertices+=p.count;finite&&=Array.from(p.array).every(Number.isFinite);}});return {kind:s.kind,theme:s.mesh.userData.landmarkTheme,vertices,finite};});
    });
    if(sites.some(s=>!s.finite))throw Error('Invalid geometry: '+JSON.stringify(sites));
    let wallShots=0;
    if(process.env.POI_SCREENSHOTS!=='0')for(let i=0;i<sites.length;i++){
      if(sites[i].kind==='wall'&&wallShots++>=3)continue;
      await page.evaluate(i=>{
        const s=qaSites[i],a=s.yaw+(s.kind==='wreck'?Math.PI:0),wide=['bridge','graveyard','mast','wall'].includes(s.kind),r=s.kind==='mast'?27:wide?20:12;
        const x=s.x+Math.cos(a)*r*.45+Math.sin(a)*r,z=s.z-Math.sin(a)*r*.45+Math.cos(a)*r;
        const lookY=s.y+(s.kind==='mast'?6:s.kind==='tower'?2.7:.6);
        TT.camera.position.set(x,Math.max(s.y+r*.7,TT.sampleHeight(x,z)+3),z);
        TT.camera.fov=43;TT.camera.updateProjectionMatrix();TT.camera.lookAt(s.x,lookY,s.z);
        TT.sun.position.set(s.x+20,s.y+40,s.z+15);TT.sun.target.position.set(s.x,s.y,s.z);TT.sun.target.updateMatrixWorld();
        poiProbe.render();
      },i);
      await page.screenshot({path:path.join(out,`${i}-${sites[i].kind}.png`)});
    }
    const access=await page.evaluate(()=>{
      const clear=(x,y,z)=>!TT.worldSolids.some(s=>s.y1>y+.1&&s.y0<y+1.6&&Math.hypot(s.x-x,s.z-z)<s.radius+.42);
      for(const p of [...TT.POI.bridges,TT.POI.dock]){
        const half=p===TT.POI.dock?4.6:8;
        for(let z=-half;z<=half;z+=.4){
          const x=p.x+Math.sin(p.yaw)*z,wz=p.z+Math.cos(p.yaw)*z;
          if(!clear(x,p.deckY+.09,wz))throw Error('New dressing obstructed crossing at '+JSON.stringify({x,z:wz}));
        }
      }
      const tower=TT.landmarks.find(l=>l.kind==='tower');
      if(!clear(tower.ladderX,TT.sampleHeight(tower.ladderX,tower.ladderZ),tower.ladderZ))throw Error('Tower ladder approach obstructed');
      const grave=TT.POI.graveyard;
      for(const z of [4.5,6.2,8])if(!clear(grave.x,TT.sampleHeight(grave.x,grave.z+z),grave.z+z))throw Error('Reserved burial approach obstructed');
      return 'bridge and dock centre lines, tower ladder, burial approach clear';
    });
    const lifecycle=await page.evaluate(()=>{
      const tested=[];
      for(const kind of ['cabin','shed','graveyard','campsite','tower']){
        const l=TT.landmarks.find(l=>l.kind===kind),old=l.colliders.slice();
        poiProbe.destroyLandmark(l);
        if(l.alive||l.mesh.visible||old.some(c=>TT.worldSolids.includes(c)))throw Error(kind+' destruction left scenery or colliders');
        tested.push({l,old});
      }
      TT.runDevCommand('Reset');
      for(const {l,old} of tested)if(!l.alive||!l.mesh.visible||old.some(c=>!TT.worldSolids.includes(c)))throw Error(l.kind+' failed restoration');
      return 'destruction and Reset restore all owned details';
    });
    if(errors.length)throw Error(JSON.stringify(errors));
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({bugs,sites,access,lifecycle,errors},null,2));
    const wall=sites.filter(s=>s.kind==='wall');
    console.log(JSON.stringify({bugs,sites:sites.filter(s=>s.kind!=='wall'),wall:{stations:wall.length,finite:wall.every(s=>s.finite)},access,lifecycle,errors},null,2));console.log('Screenshots: '+out);
  }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
