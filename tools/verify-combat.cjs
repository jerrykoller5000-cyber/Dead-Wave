// Run with Node + Playwright available via NODE_PATH. Optional THREE_TEST_ROOT
// points to an unpacked three@0.175.0 package for completely offline browser tests.
// Test hooks are injected into the served response only; index.html is not edited.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const moduleCode = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const syntax = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: moduleCode, encoding: 'utf8' });
if (syntax.status !== 0) throw new Error(syntax.stderr);

const hook = `
  window.combatProbe = {
    weaponMeshes, offhandMeshes, droppedMags, casings, groundFires, flameParticles,
    updateReloadAnim, syncDualWeaponParts, updateLasers, holdWeapon, updateMarinePose,
    igniteZombie, updateZombies, igniteTree, updateBurningTrees, updateGroundFires,
    fireCanSpreadTo, resolveDeckBody, deckCeilingAt, playerGroundY, seekZombieWindow,
    climbableWindow, updateZombieWindowClimb, applyOpening, addWindowBars, updateDayNight,
    aimDirWithSpread, beginWeaponShot, clearZombies, clearDroppedMags, clearGroundFires,
    startReload, updateFlameStream, triggerMuzzleFlash, tryFire, WEAPON_ORDER, WEAPON_STATS,
    releaseSupplyCrate, updateSupplyDrops, claimSupplyDrop, supplyDrops, airborne,
    init() {
      renderer.setAnimationLoop(null); finishEffectWarmup(); playerNameEl.value = 'Combat QA'; startMode('hunt');
      paused = false; hoursSinceMatchStart = 4; hoursSinceDawn = 4;
      grantAllWeapons(); bank = 100000; devNoZombies = true;
      player.position.set(16, sampleHeight(16, 0), 0); grounded = true;
      clearZombies(); weaponMount.visible = true; pointerOnCanvas = true;
      camera.position.set(16, player.position.y + 9, -9); camera.lookAt(player.position);
      aimTarget.set(16, player.position.y + 1, 20);
      _preRollDone = true;
    },
    equip(w, dual = false) {
      setWeapon(WEAPON_ORDER.indexOf(w)); dualOwned[w] = true; dualActive = dual;
      syncOffhandVisibility(); ammoByWeapon[w] = magSize(w);
      reserveAmmo[caliberOf(w)] = 500;
      resetReloadAnim(); akimboHand = 0; sprayHeat = 0; sprayShot = 0; sprayWeapon = w;
      mouseFireHeld = false; fireHeld = false; fireCooldown = 0;
      for (const key of Object.keys(recoilKick)) recoilKick[key] = 0;
      updateMarinePose(0.05, false, false); holdWeapon(0.05); player.updateMatrixWorld(true);
    },
    reloadAt(p) { reloadTimer = reloadAnimDuration * (1-p); updateReloadAnim(0.016); },
    finishReload() { reloading = false; reloadTimer = 0; resetReloadAnim(); },
    empty(w) { ammoByWeapon[w] = 0; if(w === 'revolver') revolverSpent = magSize(w); },
    fire() { mouseFireHeld = true; tryFire(0.05); mouseFireHeld = false; },
    night(on) { worldTime = on ? 0 : 0.5; hoursSinceDawn = 4; nvgDown = on; updateDayNight(0); },
    lasers(on) { lasersEnabled = on; updateLasers(); },
    spray(heat, shot, crouch = false) { sprayHeat = heat; sprayShot = shot; crouching = crouch; velX = velZ = 0; },
    state() { return {combo, scopeAmt, scopeAnchor: !!scopeAnchor, recoil: {...recoilKick}, ammo: ammoByWeapon[currentWeapon], currentWeapon}; },
    frames(n, scope) { clock.getDelta = () => 0.05; zoomHeld = scope; for(let i=0;i<n;i++) tick(); },
    resetScope() { scopeAmt = 0; scopeAnchor = null; scopeOrbitPosition = null; zoomHeld = false; },
    clearInput() { mouseFireHeld = false; zoomHeld = false; reloading = false; },
    beginClimb(z, b, ax, az, bx, bz) { z.windowClimb = {b, ax, az, bx, bz, ay:sampleHeight(ax,az), by:sampleHeight(bx,bz), time:0}; },
    burstReset() { sprayHeat = 0; sprayShot = 0; },
    audio() { AudioSys.unlock(); AudioSys.flameBurst('test',0.4,-0.2,0.2); AudioSys.flameBurst('test',0.4,0.2,0.2); AudioSys.fireHiss(0.2); AudioSys.fireCrackle(0.2); AudioSys.stopFlames(); },
  };
`;
const instrumented = html.replace('window.TT = {', `${hook}\nwindow.TT = {`);
const out = process.env.COMBAT_TEST_OUTPUT || path.join(os.tmpdir(), 'tiny-trek-combat-checks');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/index.html') { res.setHeader('Content-Type', 'text/html'); res.end(instrumented); return; }
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, body) => {
      if (error) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', ({'.mp3':'audio/mpeg','.mp4':'video/mp4','.js':'text/javascript','.css':'text/css'})[path.extname(file)] || 'application/octet-stream'); res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    const executablePath = process.env.COMBAT_BROWSER || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined);
    browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.stack || String(e)));
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '' }));
    if (process.env.THREE_TEST_ROOT) {
      await page.route('https://cdn.jsdelivr.net/npm/three@0.175.0/**', route => {
        const relative = route.request().url().split('three@0.175.0/')[1];
        return route.fulfill({ path: path.join(process.env.THREE_TEST_ROOT, relative), contentType: 'application/javascript' });
      });
    }
    const postQuery = process.env.COMBAT_TEST_POST === 'on' ? '' : '&post=off';
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?debug=1${postQuery}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.combatProbe, null, { timeout: 60000 });
    await page.evaluate(() => { DWOpening.ready(); document.getElementById('openingSkip').click(); document.getElementById('openingSkip').click(); });
    await page.waitForFunction(() => document.getElementById('opening').hidden);
    const results = await page.evaluate(() => {
      const P = combatProbe, T = TT, results = [];
      const assert = (condition, message) => { if (!condition) throw Error(message); };
      const check = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch(e) { results.push({name, pass:false, error:e.stack}); } };
      const spawn = (x=25,z=15,type='shambler') => { const o=T.spawnZombie(x,z,type); o.riseT=0; o.mesh.position.y=T.sampleHeight(x,z); return o; };
      P.init();
      check('Independent offhand parts and laser materials', () => {
        for(const w of ['pistol','uzi','revolver']) {
          const a=P.weaponMeshes[w], b=P.offhandMeshes[w];
          for(const k of ['mag','slide','cylinder','laser','flash']) if(a.userData[k]) {
            assert(a.userData[k]!==b.userData[k], w+' shared '+k);
            let p=b.userData[k]; while(p && p!==b)p=p.parent;
            assert(p===b,w+' offhand reference escapes its gun');
          }
          assert(a.userData.laser.material!==b.userData.laser.material,w+' shared beam material');
        }
      });
      check('Paired pistol and Uzi magazines both eject and return', () => {
        for(const w of ['pistol','uzi']) {
          P.equip(w,true); P.empty(w); P.clearDroppedMags(); P.startReload(); P.reloadAt(.2);
          assert(P.droppedMags.length===2,w+' dropped '+P.droppedMags.length+' mags');
          assert(P.droppedMags[0].mesh.position.distanceTo(P.droppedMags[1].mesh.position)>.08,'magazines share origin');
          P.reloadAt(.35); assert(!P.weaponMeshes[w].userData.mag.visible && !P.offhandMeshes[w].userData.mag.visible,'empty mag still visible');
          P.reloadAt(.8); assert(P.offhandMeshes[w].userData.mag.visible,'fresh magazine missing');
          P.finishReload();
        }
      });
      check('Both revolver cylinders eject all twelve spent cases', () => {
        P.equip('revolver',true); P.empty('revolver'); const n=P.casings.length;
        P.startReload(); P.reloadAt(.22);
        assert(P.casings.length-n===12,'expected twelve cases, got '+(P.casings.length-n));
        assert(P.weaponMeshes.revolver.userData.cylinder.position.x>0.05,'right cylinder not open');
        assert(P.offhandMeshes.revolver.userData.cylinder.position.x>0.05,'left cylinder not open');
        P.finishReload();
      });
      check('Akimbo lasers appear on both guns and turn off together', () => {
        P.equip('pistol',true); P.lasers(true);
        assert(P.weaponMeshes.pistol.userData.laser.visible && P.offhandMeshes.pistol.userData.laser.visible,'missing paired beam');
        P.lasers(false); assert(!P.offhandMeshes.pistol.userData.laser.visible,'left beam stuck on');
      });
      check('White phosphor and infrared beams toggle back cleanly', () => {
        P.night(true); P.lasers(true);
        assert(T.renderer.domElement.classList.contains('nvg-phosphor'),'phosphor filter missing');
        assert(P.offhandMeshes.pistol.userData.laser.material.color.getHex()===0xd5f4ff,'infrared beam is red');
        P.night(false); P.lasers(true);
        assert(!T.renderer.domElement.classList.contains('nvg-phosphor'),'phosphor filter stuck');
        assert(P.weaponMeshes.pistol.userData.laser.material.color.getHex()===0xff2424,'visible beam not restored');
      });
      check('Player kills advance streak; defense kills do not', () => {
        P.clearZombies(); T.setCombo(0);
        T.damageZombie(spawn(),999,{kind:'bullet',defense:false}); assert(T.getCombo()===1,'player kill missing');
        T.damageZombie(spawn(),999,{kind:'bullet',defense:true}); assert(T.getCombo()===1,'turret credited');
      });
      check('Turret burns and touch-spread burns preserve defense credit', () => {
        P.clearZombies(); T.setCombo(0);
        const a=spawn(), b=spawn(25.5,15); a.speed=b.speed=0; a.hp=100; b.hp=.01;
        P.igniteZombie(a,2,true); P.updateZombies(.05);
        assert(b.burnDefense===true,'touch spread lost source');
        assert(!b.alive && T.getCombo()===0,'touch burn advanced streak');
        a.hp=.01; P.updateZombies(.05); assert(!a.alive && T.getCombo()===0,'turret burn advanced streak');
        const c=spawn(); c.hp=.01; P.igniteZombie(c,2,false); P.updateZombies(.05);
        assert(!c.alive && T.getCombo()===1,'player burn did not count');
      });
      check('Ground fire is bounded and propagation cannot refresh its parent', () => {
        P.clearGroundFires(); let spot;
        for(let x=12;x<70 && !spot;x+=2)for(let z=12;z<70;z+=2)if(P.fireCanSpreadTo(x,z)){spot={x,z};break;}
        assert(spot,'no dry test ground'); const f=T.spawnGroundFire(spot.x,spot.z,true);
        assert(f && f.mesh.userData.flames.children.length>0,'no flame geometry');
        f.age=4; T.spawnGroundFire(f.x+.1,f.z,true,1); assert(f.age===4,'natural spread refreshes parent');
        for(let x=12;x<100;x+=2)for(let z=12;z<100;z+=2)T.spawnGroundFire(x,z,true);
        assert(P.groundFires.length<=44,'unbounded fuel patches');
        P.updateGroundFires(.1); P.clearGroundFires();
      });
      check('Trees carry animated flames and reset without residual fire', () => {
        const tree=T.trees.find(t=>t.alive&&!t.falling); P.igniteTree(tree,true); P.updateBurningTrees(.2);
        assert(tree.fireTongues?.visible && tree.fireTongues.children.length===7,'tree has no flames');
        assert(tree.burnDefense,'tree lost source'); T.restoreTree(tree);
        assert(tree.burnT===0&&!tree.fireTongues.visible,'tree reset remains alight');
      });
      check('Unmeshed ground windows allow a climb; steel mesh and upper floors block it', () => {
        const z=spawn(25,25); const b=T.spawnBuild('wall',25,25);
        b.mesh.position.y=T.sampleHeight(25,25); b.level=0; P.applyOpening(b,'window');
        assert(P.climbableWindow(b,z),'ground window cannot be climbed');
        b.barred=true; P.addWindowBars(b); assert(!P.climbableWindow(b,z),'mesh ignored');
        b.barred=false; b.level=1; assert(!P.climbableWindow(b,z),'upper floor climb allowed');
        b.level=0; const box=T.thinBoxFor(b); const alongX=box.hx>box.hz;
        const nx=alongX?0:1,nz=alongX?1:0;
        const ax=box.cx+nx*.9,az=box.cz+nz*.9,bx=box.cx-nx*.9,bz=box.cz-nz*.9;
        const chest=b.mesh.position.y+1.4;
        assert(T.segmentHitsBuild(b,ax,chest,az,bx,chest,bz)===null,'window opening blocks bullets');
        const shiftX=alongX?.7:0,shiftZ=alongX?0:.7;
        assert(T.segmentHitsBuild(b,ax+shiftX,chest,az+shiftZ,bx+shiftX,chest,bz+shiftZ)!==null,'window side frame lets bullets through');
        b.barred=true;assert(T.buildBetween(ax,chest,az,bx,chest,bz)===b,'mesh lets claws through');b.barred=false;
        z.mesh.position.set(ax,T.sampleHeight(ax,az),az); z.windowSearchT=0;
        const route=P.seekZombieWindow(z,bx,bz,.5);
        assert(route && z.windowClimb,'AI did not discover and start the window route');
        P.beginClimb(z,b,ax,az,bx,bz); P.updateZombieWindowClimb(z,.6);
        assert(z.mesh.position.y>b.mesh.position.y+.7,'climber never clears sill');
        P.updateZombieWindowClimb(z,.7); assert(!z.windowClimb&&Math.hypot(z.mesh.position.x-bx,z.mesh.position.z-bz)<.01,'climber did not reach far side');
        P.beginClimb(z,b,ax,az,bx,bz); b.barred=true; P.updateZombieWindowClimb(z,.1);
        assert(!z.windowClimb&&Math.hypot(z.mesh.position.x-ax,z.mesh.position.z-az)<.01,'mid-climb mesh ignored');
        T.removeBuild(b); P.clearZombies();
      });
      check('Low bridge underside rejects entry; deck mouth remains walkable', () => {
        const x=60,z=60,h=T.sampleHeight(x,z);
        const d={x,z,yaw:Math.PI/4,hw:2,hl:5,deckY:h+1.2,under:h+1}; T.platforms.push(d);
        try {
          const r=P.resolveDeckBody(x,z,h,x,z,h);
          assert(Math.hypot(r.x-x,r.z-z)>2,'player remains intersecting low deck');
          const c=Math.cos(d.yaw),sn=Math.sin(d.yaw),px=x-(d.hl+.5)*sn,pz=z-(d.hl+.5)*c;
          const on=P.resolveDeckBody(x,z,d.deckY-.3,px,pz,d.deckY-.3);
          assert(on.x===x&&on.z===z,'normal step onto deck blocked');
          d.deckY=h+4;d.under=h+3.8;
          const under=P.resolveDeckBody(x,z,h,x,z,h);assert(under.x===x&&under.z===z,'clear underpass blocked');
          assert(P.deckCeilingAt(x,z,h)===d.under,'underside lookup missing');
        } finally {T.platforms.pop();}
      });
      check('Spray is finite for every firearm and crouching tightens the cone', () => {
        const rng=Math.random;
        try {
          Math.random=()=>.75;
          for(const w of ['pistol','uzi','m4','ak','minigun','shotgun','aa12','revolver','sniper','launcher']) {
            P.equip(w); P.spray(8,8,false); const d=P.aimDirWithSpread(P.WEAPON_STATS[w].spread||0);
            assert(Number.isFinite(d.x+d.y+d.z)&&Math.abs(d.length()-1)<1e-6,w+' bad direction');
          }
          P.equip('m4'); P.spray(8,8); const wide=P.aimDirWithSpread();
          P.spray(8,8,true);const narrow=P.aimDirWithSpread();
          P.spray(0,0,true); Math.random=()=>0; const center=P.aimDirWithSpread();
          assert(narrow.angleTo(center)<wide.angleTo(center),'crouch did not tighten grouping');
        } finally {Math.random=rng;}
      });
      check('AK and AA-12 have actual recoil kicks', () => {
        for(const w of ['ak','aa12']){P.equip(w);P.fire();assert(P.state().recoil.rx<0,w+' has no recoil');}
        P.clearInput();
      });
      check('Flame voice refresh, hiss, crackle and stop run without audio errors', () => P.audio());
      let drop, second;
      check('Supply drops have olive canopies and an attached strobe instead of a beam', () => {
        const release=x=>P.releaseSupplyCrate({plane:{position:new T.THREE.Vector3(x,T.sampleHeight(x,15)+22,15)},dir:new T.THREE.Vector3(0,0,1),speed:0,x,z:15});
        release(40);drop=P.supplyDrops.at(-1);release(55);second=P.supplyDrops.at(-1);
        const colors=drop.chute.userData.cloth.gores.map(g=>g.mesh.material.color.getHex());
        assert(colors.every(c=>c===0x505b32||c===0x606a3e),'non-olive canopy');
        assert(drop.strobe.parent===drop.lid,'strobe not attached to crate');
        assert(!drop.beacon,'vertical beam retained');
        assert(drop.strobe.material!==second.strobe.material,'shared strobe material');
      });
      check('Canopies fold onto the terrain after landing', () => {
        for(let i=0;i<720;i++)P.updateSupplyDrops(1/60);
        assert(drop.state==='landed'&&drop.chute.userData.cloth.complete,'drop did not settle');
        const cloth=drop.chute.userData.cloth;
        assert(cloth.canopy.position.x>2,'canopy stayed over box');
        const p=cloth.gores[0].mesh.geometry.attributes.position;
        assert(p.array.some((v,i)=>Math.abs(v-cloth.gores[0].original[i])>.1),'fabric did not crumple');
        let above=-Infinity;
        for(const gore of cloth.gores)for(let i=0;i<gore.mesh.geometry.attributes.position.count;i++){
          const v=new T.THREE.Vector3().fromBufferAttribute(gore.mesh.geometry.attributes.position,i);gore.mesh.localToWorld(v);
          above=Math.max(above,v.y-T.sampleHeight(v.x,v.z));
        }
        assert(above<.6,'collapsed cloth floats above ground: '+above);
      });
      check('Crate strobe flashes locally and stops after collection', () => {
        drop.age=0;P.updateSupplyDrops(.02);const bright=drop.strobe.material.emissiveIntensity;
        P.updateSupplyDrops(.1);assert(bright>drop.strobe.material.emissiveIntensity,'strobe does not pulse');
        P.claimSupplyDrop(drop);assert(drop.strobe.material.emissiveIntensity===0,'collected strobe still flashing');
      });
      check('Collected crate fades independently and cannot award supplies twice', () => {
        const before=JSON.stringify(T.getReserve());P.claimSupplyDrop(drop);
        assert(JSON.stringify(T.getReserve())===before,'duplicate supply award');
        for(let i=0;i<90;i++)P.updateSupplyDrops(1/60);
        const mat=drop.group.children[0].material;
        assert(mat.opacity>0&&mat.opacity<1,'crate did not fade');
        assert(second.group.children[0].material.opacity===1,'other crate faded');
        let disposed=false;drop.group.children[0].geometry.addEventListener('dispose',()=>disposed=true);
        for(let i=0;i<70;i++)P.updateSupplyDrops(1/60);
        assert(!P.supplyDrops.includes(drop)&&!drop.group.parent&&disposed,'collected crate resources not released');
        P.airborne.dispose(second.group);P.supplyDrops.splice(P.supplyDrops.indexOf(second),1);
      });
      return results;
    });
    console.log(JSON.stringify(results, null, 2));
    // Exercise complete frames during both scope transitions and retain screenshots.
    const scope = await page.evaluate(() => {
      const P=combatProbe; P.clearZombies();P.clearGroundFires();P.equip('sniper');P.resetScope();
      const samples=[];
      for(const want of [false,true,false])for(let i=0;i<20;i++){
        P.frames(1,want);samples.push({want,amount:P.state().scopeAmt,p:TT.camera.position.toArray(),fov:TT.camera.fov});
      }
      return samples;
    });
    const finite=scope.every(s=>Number.isFinite(s.fov)&&s.p.every(Number.isFinite));
    const enter=scope.filter(s=>s.want);
    const exit=scope.slice(-20);
    results.push({name:'Scope raises and lowers with finite, monotonic FOV',pass:finite&&enter.every((s,i)=>!i||s.fov<=enter[i-1].fov+.01)&&exit.every((s,i)=>!i||s.fov>=exit[i-1].fov-.01)&&exit.at(-1).amount<.002});
    await page.screenshot({ path: path.join(out, 'day.png') });
    await page.evaluate(() => { combatProbe.equip('pistol',true); TT.aimTarget.set(TT.player.position.x,TT.player.position.y+1,TT.player.position.z+18);combatProbe.holdWeapon(.1);combatProbe.night(true); combatProbe.lasers(true); TT.renderFrame(); });
    await page.screenshot({ path: path.join(out, 'night-vision.png') });
    const hudOverCanvas=await page.evaluate(()=>+getComputedStyle(document.getElementById('hud')).zIndex>0);
    results.push({name:'Night-vision canvas leaves HUD above the filtered scene',pass:hudOverCanvas});
    await page.evaluate(() => {
      combatProbe.night(false);const t=TT.trees.find(t=>t.alive&&!t.falling&&combatProbe.fireCanSpreadTo(t.x,t.z));
      combatProbe.igniteTree(t);combatProbe.updateBurningTrees(.6);TT.spawnGroundFire(t.x+1,t.z);
      combatProbe.updateGroundFires(.5);TT.camera.position.set(t.x+8,t.group.position.y+6,t.z-8);TT.camera.lookAt(t.x,t.group.position.y+2,t.z);TT.renderFrame();
    });
    await page.screenshot({ path: path.join(out, 'fire.png') });
    await page.evaluate(()=>{
      combatProbe.clearGroundFires();combatProbe.clearZombies();combatProbe.night(false);
      const x=40,z=15,y=TT.sampleHeight(x,z);
      combatProbe.releaseSupplyCrate({plane:{position:new TT.THREE.Vector3(x,y+12,z)},dir:new TT.THREE.Vector3(0,0,1),speed:0,x,z});
      const s=combatProbe.supplyDrops.at(-1);window.airdropScreenshot=s;
      s.state='chute';s.t=1;s.group.position.set(x,y+3,z);s.chute.visible=true;s.chute.scale.setScalar(1);
      TT.camera.position.set(x+11,y+9,z-11);TT.camera.lookAt(x,y+4,z);TT.renderFrame();
    });
    await page.screenshot({path:path.join(out,'airdrop-descending.png')});
    await page.evaluate(()=>{
      const s=airdropScreenshot;
      for(let i=0;i<240;i++)combatProbe.updateSupplyDrops(1/60);
      TT.camera.position.set(s.x+7,s.gy+5,s.z-7);TT.camera.lookAt(s.x+1,s.gy+.5,s.z);TT.renderFrame();
    });
    await page.screenshot({path:path.join(out,'airdrop-landed.png')});
    await page.evaluate(()=>{combatProbe.claimSupplyDrop(airdropScreenshot);for(let i=0;i<85;i++)combatProbe.updateSupplyDrops(1/60);TT.renderFrame();});
    await page.screenshot({path:path.join(out,'airdrop-collected.png')});
    results.push({name:'No browser runtime errors',pass:errors.length===0,errors});
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,scope},null,2));
    console.log(`RESULT: ${results.filter(r=>r.pass).length}/${results.length} passed. Artifacts: ${out}`);
    for(const r of results.filter(r=>!r.pass))console.error(r);
    if(results.some(r=>!r.pass))process.exitCode=1;
  } finally { if(browser)await browser.close();server.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
