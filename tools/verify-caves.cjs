// Offline runtime/visual check of cave themes, eye reveal, and campsite map names.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const {spawnSync} = require('node:child_process');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(os.tmpdir(), 'dead-wave-cave-checks');
fs.mkdirSync(out, {recursive:true});
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const moduleCode = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const syntax = spawnSync(process.execPath, ['--input-type=module', '--check'], {input:moduleCode, encoding:'utf8'});
if (syntax.status) throw Error(syntax.stderr);
html = html.replace('window.TT = {', 'window.caveProbe = {updateDayNight,updateCaveEyes,drawMinimap,drawFullMap,endLivePreRoll,beginCaveKill(c){gameStarted=true;beginScriptedKill("cave",c);},advanceKill: updateScriptedKill,render(){const nf=renderer._nodes?.nodeFrame;if(nf){nf.update();renderer.info.frame=nf.frameId;}renderFrame();}}; window.TT = {');

(async () => {
  const server = http.createServer((q, r) => {
    const pathname = new URL(q.url, 'http://localhost').pathname;
    if (pathname === '/index.html') {r.setHeader('Content-Type', 'text/html');r.end(html);return;}
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) {r.writeHead(403).end();return;}
    fs.readFile(file, (error, bytes) => {
      if (error) {r.writeHead(404).end();return;}
      r.setHeader('Content-Type', ({'.js':'text/javascript','.css':'text/css','.mp4':'video/mp4'})[path.extname(file)] || 'application/octet-stream');
      r.end(bytes);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({executablePath:process.env.COMBAT_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']});
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({body:''}));
    if (process.env.THREE_TEST_ROOT) await page.route('https://cdn.jsdelivr.net/npm/three@0.175.0/**', route => route.fulfill({path:path.join(process.env.THREE_TEST_ROOT,route.request().url().split('three@0.175.0/')[1]),contentType:'text/javascript'}));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?debug=1`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => !!window.TT, null, {timeout:120000});
    await page.evaluate(() => {DWOpening.ready();document.getElementById('openingSkip').click();document.getElementById('openingSkip').click();});
    await page.waitForFunction(() => document.getElementById('opening').hidden);
    const result = await page.evaluate(() => {
      TT.renderer.setAnimationLoop(null);
      caveProbe.endLivePreRoll();
      TT.finishEffectWarmup();
      TT.renderer.domElement.style.visibility = 'visible';
      document.getElementById('hud').style.display = 'none';
      document.getElementById('menuCameraFade').style.opacity = 0;
      document.body.classList.remove('frontend');
      TT.setWorldTime(0.28);
      caveProbe.updateDayNight(0);
      const caves = TT.POI.caves.map(c => ({name:c.name,theme:c.theme,eyes:c.eyeSprites.length,group:c.group.children.length}));
      const themes = new Set(caves.map(c => c.theme));
      if (caves.length !== 6 || themes.size !== 6 || caves.some(c => c.eyes !== 4)) throw Error('Cave variety/eyes: '+JSON.stringify(caves));
      const c = TT.POI.caves[0];
      TT.player.position.set(c.x + Math.sin(c.yaw)*32,c.gy,c.z + Math.cos(c.yaw)*32);
      caveProbe.updateCaveEyes();
      const far = c.eyeRig.visible;
      TT.player.position.set(c.x + Math.sin(c.yaw)*11,c.gy,c.z + Math.cos(c.yaw)*11);
      caveProbe.updateCaveEyes();
      const near = c.eyeRig.visible && c.eyeSprites.every(e => e.material.opacity > 0);
      if (far || !near) throw Error('Eye proximity fade failed');
      const litOpacity = c.eyeSprites[0].material.opacity;
      c.eyePhase = (4.7 - (performance.now() * 0.001) % 4.7) % 4.7;
      caveProbe.updateCaveEyes();
      const blink = c.eyeSprites[0].material.opacity < litOpacity * 0.2;
      if (!blink) throw Error('Eyes did not blink');
      const ctx = document.getElementById('minimap').getContext('2d');
      const names = [];
      const original = ctx.fillText;
      ctx.fillText = function(text, ...args) {names.push(text);return original.call(this,text,...args);};
      for (const camp of TT.POI.campsites) {
        TT.player.position.set(camp.x,TT.sampleHeight(camp.x,camp.z),camp.z);
        caveProbe.drawMinimap(1);
      }
      ctx.fillText = original;
      for (const name of ['RANGER CAMP','HIKERS CAMP','TRAPPER CAMP']) if (!names.includes(name)) throw Error('Missing nearby campsite name: '+name);
      const fullCtx = document.getElementById('fullMapCanvas').getContext('2d');
      const fullNames = [];
      const originalFull = fullCtx.fillText;
      fullCtx.fillText = function(text, ...args) {fullNames.push(text);return originalFull.call(this,text,...args);};
      caveProbe.drawFullMap(1);
      fullCtx.fillText = originalFull;
      for (const name of ['RANGER CAMP','HIKERS CAMP','TRAPPER CAMP']) if (!fullNames.includes(name)) throw Error('Missing full-map campsite name: '+name);
      return {caves,far,near,blink,mapNames:names.filter(n => n.includes('CAMP'))};
    });
    fs.writeFileSync(path.join(out,'minimap.png'),Buffer.from(await page.evaluate(() => document.getElementById('minimap').toDataURL().split(',')[1]),'base64'));
    for (let i=0; i<result.caves.length; i++) {
      await page.evaluate(i => {
        const c = TT.POI.caves[i], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
        TT.player.position.set(c.x+fx*12,c.gy,c.z+fz*12);
        caveProbe.updateCaveEyes();
        TT.camera.position.set(c.x+fx*14,c.gy+3.2,c.z+fz*14);
        TT.camera.fov=48;TT.camera.updateProjectionMatrix();TT.camera.lookAt(c.x,c.gy+2,c.z);
        TT.sun.position.set(c.x+20,c.gy+40,c.z+15);TT.sun.target.position.set(c.x,c.gy,c.z);
        caveProbe.render();
      },i);
      await page.screenshot({path:path.join(out,result.caves[i].theme+'.png')});
    }
    const grab = await page.evaluate(() => {
      const c = TT.POI.caves[0], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      TT.player.position.set(c.x+fx*0.3,c.gy,c.z+fz*0.3);
      caveProbe.beginCaveKill(c);
      const sk = TT.getScriptedKill();
      if (!sk || !sk.guardian || c.eyeRig.visible) throw Error('Guardian did not replace the preview eyes');
      caveProbe.advanceKill(0.35);
      TT.camera.position.set(c.x+fx*6,c.gy+2.4,c.z+fz*6);
      TT.camera.lookAt(c.x,c.gy+1.7,c.z);
      caveProbe.render();
      return {guardianVisible:sk.guardian.visible,guardianZ:sk.guardian.position.z};
    });
    await page.screenshot({path:path.join(out,'guardian-grab.png')});
    if (!grab.guardianVisible) throw Error('Cave guardian hidden during grab');
    if (errors.length) throw Error(JSON.stringify(errors));
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({result,errors},null,2));
    console.log(JSON.stringify({result,errors,out},null,2));
  } finally {if(browser)await browser.close();server.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
