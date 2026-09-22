// NODE_PATH must expose Playwright. THREE_TEST_ROOT optionally supplies the pinned
// three@0.175.0 package offline. Uses an isolated browser and a temporary local port.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), os = require('node:os');
const { chromium } = require('playwright');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = process.env.OPENING_TEST_OUTPUT || path.join(os.tmpdir(), 'dead-wave-opening-checks');
fs.mkdirSync(out, {recursive:true});
const html = fs.readFileSync(path.join(root, 'index.html'),'utf8');
const syntax = spawnSync(process.execPath, ['--input-type=module','--check'], {input:html.match(/<script type="module">([\s\S]*?)<\/script>/)[1],encoding:'utf8'});
if (syntax.status) throw Error(syntax.stderr);
const results=[];
function check(name, pass) { results.push({name,pass:!!pass}); if(!pass) throw Error(name); }
(async()=>{
  const server=http.createServer((req,res)=>{
    const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(err,data)=>{
      if(err){res.writeHead(404).end();return;}
      const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp4':'video/mp4','.mp3':'audio/mpeg'}[path.extname(file)];
      res.setHeader('Content-Type',type||'application/octet-stream');res.end(data);
    });
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try {
    browser=await chromium.launch({executablePath:process.env.COMBAT_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
    const context=await browser.newContext({viewport:{width:1440,height:900}});
    await context.addInitScript(() => {
      window.gameMasterLevels=[];
      const connect=AudioNode.prototype.connect;
      AudioNode.prototype.connect=function(destination,...args){
        if(this instanceof GainNode && destination instanceof AudioDestinationNode && new Error().stack.includes('index.html:')) gameMasterLevels.push({level:this.gain.value,opening:!!window.DWOpening?.active});
        return connect.call(this,destination,...args);
      };
    });
    await context.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:''}));
    let release; const gate=new Promise(r=>release=r);
    const page=await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://cdn.jsdelivr.net/npm/three@0.175.0/**',async route=>{
      await gate;
      if(process.env.THREE_TEST_ROOT) return route.fulfill({path:path.join(process.env.THREE_TEST_ROOT,route.request().url().split('three@0.175.0/')[1]),contentType:'text/javascript'});
      return route.continue();
    });
    const url=`http://127.0.0.1:${server.address().port}/index.html?debug=1`;
    await page.goto(url,{waitUntil:'commit'});
    await page.waitForFunction(()=>document.querySelector('video')?.currentTime>0 || document.getElementById('openingPlay')?.hidden===false);
    if(await page.locator('#openingPlay').isVisible()) await page.click('#openingPlay');
    await page.waitForFunction(()=>document.querySelector('video')?.currentTime>5,{},{timeout:15000});
    check('Caracal sound is on by default, with an audible-play gesture fallback',await page.evaluate(()=>!document.querySelector('video').muted&&DWOpening.soundEnabled));
    check('Uploaded 10-second video plays while game imports are pending',await page.evaluate(()=>{const v=document.querySelector('video');return v.videoWidth===1920&&v.duration===10&&!v.paused&&document.getElementById('hud').inert;}));
    await page.screenshot({path:path.join(out,'01-caracal.png')});
    await page.click('#openingSound');
    check('Sound control can mute the splash',await page.evaluate(()=>document.querySelector('video').muted));
    await page.click('#openingSound');
    await page.waitForFunction(()=>document.getElementById('opening').dataset.phase==='intro',null,{timeout:10000});
    await page.waitForTimeout(1300);
    await page.screenshot({path:path.join(out,'02-title.png')});
    await page.waitForFunction(()=>document.getElementById('opening').dataset.phase==='loading');
    check('Intro leads to loading without exposing an unready menu',await page.evaluate(()=>DWOpening.active&&document.getElementById('hud').inert));
    await page.screenshot({path:path.join(out,'03-loading.png')});
    release();
    await page.waitForFunction(()=>!!window.TT,null,{timeout:120000});
    check('Game music cannot unlock during the opening',await page.evaluate(()=>{
      TT.AudioSys.unlock();TT.AudioSys.startMusic();
      return DWOpening.active&&!TT.AudioSys.musicState().playing;
    }));
    await page.waitForFunction(()=>document.getElementById('opening').hidden,null,{timeout:120000});
    check('Ready menu follows real warm-up, with no browser errors',errors.length===0);
    check('Any game master bus created before the menu is silent',await page.evaluate(()=>gameMasterLevels.filter(v=>v.opening).every(v=>v.level===0)));
    check('Opening menu contains only Play, Settings and callsign',await page.evaluate(()=>{const m=document.getElementById('modeSelect');return m.querySelectorAll('button').length===2&&!m.querySelector('p')&&!document.getElementById('hud').inert;}));
    await page.waitForTimeout(1800);
    check('Marine is hidden in cinematic menu',await page.evaluate(()=>!TT.player.visible));
    const shotA=await page.evaluate(()=>TT.camera.position.toArray());
    await page.screenshot({path:path.join(out,'04-menu.png')});
    await page.waitForTimeout(1500);
    const shotB=await page.evaluate(()=>TT.camera.position.toArray());
    check('Menu camera moves through the real map',Math.hypot(...shotA.map((v,i)=>v-shotB[i]))>.1);
    await page.waitForTimeout(10000);
    const shotC=await page.evaluate(()=>TT.camera.position.toArray());
    check('Cinematic sequence changes to a different map location',Math.hypot(...shotB.map((v,i)=>v-shotC[i]))>10&&shotC.every(Number.isFinite));
    await page.screenshot({path:path.join(out,'07-next-shot.png')});
    await page.fill('#playerName','   ');await page.click('#modeHunt');
    check('Blank names cannot start a game',await page.evaluate(()=>document.body.classList.contains('frontend')&&document.getElementById('playerName').getAttribute('aria-invalid')==='true'));
    await page.click('#menuSettingsBtn');
    check('Settings opens from the new menu',await page.locator('#pauseSettingsView').evaluate(e=>e.classList.contains('on')));
    await page.click('#settingsBackBtn');
    check('Settings returns to the title menu',await page.locator('#pause').evaluate(e=>!e.classList.contains('show')));
    await page.setViewportSize({width:390,height:700});
    await page.screenshot({path:path.join(out,'05-narrow-menu.png')});
    check('Menu actions fit a narrow screen',await page.locator('#modeHunt').evaluate(e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.bottom<innerHeight;}));
    await page.setViewportSize({width:1440,height:900});
    await page.fill('#playerName','Opening QA'); await page.click('#modeHunt');
    await page.evaluate(()=>{
      window.cameraHandoff=[];
      let previous=TT.camera.position.clone(), wasDeploying=true;
      const sample=()=>{
        const deploying=document.body.classList.contains('deploying');
        if(!deploying||!wasDeploying) cameraHandoff.push(TT.camera.position.distanceTo(previous));
        previous.copy(TT.camera.position);wasDeploying=deploying;
        if(cameraHandoff.length<8)requestAnimationFrame(sample);
      };requestAnimationFrame(sample);
    });
    check('Play begins a camera transition with input locked',await page.evaluate(()=>document.body.classList.contains('deploying')&&document.getElementById('hud').inert));
    await page.waitForTimeout(1600);
    check('Marine descends under an olive parachute with a transport overhead',await page.evaluate(()=>{
      const chute=TT.scene.getObjectByName('marine-parachute'),plane=TT.scene.getObjectByName('insertion-aircraft');
      return !!chute&&chute.visible&&!!plane&&plane.visible&&TT.player.position.y>TT.sampleHeight(0,-8.5)+3&&document.getElementById('hud').inert;
    }));
    await page.screenshot({path:path.join(out,'06-deployment.png')});
    await page.waitForFunction(()=>!document.body.classList.contains('deploying'),null,{timeout:45000});
    check('Play enters the game and restores its canvas',await page.evaluate(()=>!document.body.classList.contains('frontend')&&!document.getElementById('modeSelect').classList.contains('show')));
    check('Marine becomes visible only after Play',await page.evaluate(()=>TT.player.visible&&TT.session.name==='Opening QA'));
    check('Insertion lands on terrain and removes its temporary aircraft and rig',await page.evaluate(()=>Math.abs(TT.player.position.y-TT.sampleHeight(0,-8.5))<.1&&!TT.scene.getObjectByName('marine-parachute')&&!TT.scene.getObjectByName('insertion-aircraft')&&!TT.scene.getObjectByName('insertion-harness')));
    await page.waitForFunction(()=>cameraHandoff.length===8);
    check('Camera hands off without a position jump',await page.evaluate(()=>Math.max(...cameraHandoff)<1));
    await page.keyboard.press('Escape');await page.click('#quitMenuBtn');
    check('Quit returns directly to the menu without replaying splash',await page.evaluate(()=>document.body.classList.contains('frontend')&&document.getElementById('opening').hidden));
    const fallback=await context.newPage();
    await fallback.route('https://cdn.jsdelivr.net/**',r=>r.abort());
    await fallback.route('**/assets/intro/caracal.mp4',r=>r.abort());
    await fallback.goto(url,{waitUntil:'domcontentloaded'});
    await fallback.waitForFunction(()=>document.getElementById('opening').dataset.phase==='intro');
    await fallback.keyboard.press('Escape');
    check('Missing video advances; failed game load offers Reload instead of a dead menu',await fallback.evaluate(()=>document.getElementById('opening').dataset.phase==='error'&&!document.getElementById('openingRetry').hidden&&document.getElementById('hud').inert));
    await fallback.emulateMedia({reducedMotion:'reduce'});
    check('Reduced motion disables decorative animation',await fallback.locator('.opening-title .dw-wordmark').evaluate(e=>getComputedStyle(e).animationName==='none'));
    check('No gameplay or menu runtime errors',errors.length===0);
    console.log(JSON.stringify(results,null,2));
  } finally {
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
    if(browser)await browser.close(); server.close();
    console.log(`${results.filter(r=>r.pass).length}/${results.length} passed. Screenshots: ${out}`);
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
