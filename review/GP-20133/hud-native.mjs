import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN,'Use exclusive crew slot');
const root=process.cwd(),out=path.join(root,'review/GP-20133');fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const names=['tryFire','spawnProjectile','triggerMuzzleFlash','spawnCasing','updateCasings','updateSmoke','spawnSmokePuff','spawnDust','spawnEmbers','trainingTraceExact','trainingRound','updateProjectiles','updateAmmoHud','beginWeaponShot'];
const wrappers=[].filter(n=>source.includes('function '+n+'(')).map(n=>`{const old=${n};${n}=function(...args){return Q.time(${JSON.stringify(n)},old,this,args);};}`).join('\n');
const injection=`\n// GP-20133 review-only instrumentation, production bytes on disk unchanged.
const Q=window.__gp={on:false,stats:{},time(n,f,self,args){if(!this.on)return f.apply(self,args);const t=performance.now();try{return f.apply(self,args);}finally{const r=this.stats[n]||=( {calls:0,total:0,max:0});const d=performance.now()-t;r.calls++;r.total+=d;r.max=Math.max(r.max,d);}},reset(){this.stats={};},setup(k,pair){mouseFireHeld=false;grantAllWeapons();for(const type of ['primary','secondary'])for(let i=0;i<2;i++)runArmory.stow(type,i);if(k!=='pistol'){if(!runArmory.has(k))runArmory.buy(k,{store:true});runArmory.take(k,slotType(k),0);}if(pair){if(!runArmory.has(k+':second'))runArmory.buy({id:k+':second',kind:k,loaded:null},{store:true});runArmory.take(k+':second','secondary',1);}setWeapon(WEAPON_ORDER.indexOf(k));pistolAutoOwned=pistolAutoFitted=true;fireMode[k]='auto';dualActive=!!pair;akimboHand=0;syncOffhandVisibility();unarmed=false;toggleViewFirst(true);const e=magazineStore[k];if(e){for(const m of e.loaded)if(m)m.rounds=e.size;e.spare=[];syncMagazine(k);}fireCooldown=0;return{weapon:k,pair:akimboOn(),ammo:ammoByWeapon[k],magSize:singleMagSize(k),auto:weaponIsAuto(k),loadout:runArmory.loadout(),position:player.position.toArray()};},objects(){for(const [label,obj]of [['impacts',training.impacts],['char',training.char],['dummy',training.dummy]])for(const n of ['add','trace'])if(typeof obj?.[n]==='function'&&!obj[n].__gp){const f=obj[n];obj[n]=function(...a){return Q.time(label+'.'+n,f,this,a);};obj[n].__gp=true;}},start(fire){this.reset();this.on=true;this.frames=[];this.t0=performance.now();this.prev=this.t0;this.fire=fire;this.done=false;this.startAmmo=ammoByWeapon[currentWeapon];mouseFireHeld=fire;const frame=t=>{if(!this.on)return;this.frames.push(t-this.prev);this.prev=t;if((fire&&ammoByWeapon[currentWeapon]<=0)||t-this.t0>(fire?45000:4500)){mouseFireHeld=false;this.on=false;this.done=true;this.elapsed=t-this.t0;this.endAmmo=ammoByWeapon[currentWeapon];return;}requestAnimationFrame(frame);};requestAnimationFrame(frame);},result(){return{elapsed:this.elapsed,frames:this.frames,stats:this.stats,startAmmo:this.startAmmo,endAmmo:this.endAmmo,weapon:currentWeapon,pair:akimboOn(),ammo:ammoByWeapon[currentWeapon],projectiles:projectiles.length,casings:casings.length};}};
${wrappers}
const gpOriginalHud =     function updateAmmoHud() {
      if (!(reloading && reloadWeapon === 'revolver')) {   // CL-326: the chambers as the count stands (a pair: half each, the right gun the odd one; CE-6: each gun's live rounds its own magazine's, so the gun that fired shows it)
        const a = ammoByWeapon.revolver | 0, pair = !!(dualActive && pairInLoadout('revolver')), mR = pair && magazineStore.revolver && magazineStore.revolver.loaded && magazineStore.revolver.loaded[0], aR = pair ? (mR ? Math.min(a, mR.rounds | 0) : Math.ceil(a / 2)) : a, sR = pair ? Math.ceil(revolverSpent / 2) : revolverSpent;
        revolverChambers(weaponMeshes.revolver, aR, sR);
        if (offhandMeshes.revolver) revolverChambers(offhandMeshes.revolver, pair ? a - aR : 6, pair ? revolverSpent - sR : 0);
      }
      const st = WEAPON_STATS[currentWeapon];
      const ammo = ammoByWeapon[currentWeapon];
      if (grenadeChipsEl) grenadeChipsEl.innerHTML = '<span class="gchip">G×' + grenades + '</span><span class="gchip">H×' + medkits + '</span>';
      if (ammoWeaponEl) ammoWeaponEl.textContent = st.name;
      const mg = mortarMounted && mortarMounted.type === 'm240' ? mortarMounted : null;   // GB-138: on the Watchman, its belt
      const carriedMg = mortarCarried?.kind === 'm240' ? mortarCarried : null;
      const typedAmmo = typeof ammoTypeState === 'function' ? ammoTypeState(currentWeapon) : null;
      magazineHud.render(currentWeapon, !mortarMounted && !mortarCarried && isMagazineWeapon(currentWeapon) && magazineStore[currentWeapon] ? magazineSnapshot(magazineStore, currentWeapon) : null);
      if (mg) {
        const belt = mg.belt | 0, res = reserveAmmo['7.62 belt'] | 0, feeding = mg.feedT > 0;
        if (ammoWeaponEl) ammoWeaponEl.textContent = BUILD_NAMES.m240;
        if (ammoCountEl) ammoCountEl.textContent = feeding ? '\u2026' : String(belt);
        if (ammoDetailEl) ammoDetailEl.textContent = feeding ? sayText('m240.reloading') : sayText('m240.ammo', {belt, max: mg.beltMax | 0, reserve: res});
        if (belt <= 0 && !feeding) ammoEl.classList.add('empty'); else ammoEl.classList.remove('empty');
      } else if (carriedMg) {
        ammoEl.classList.remove('empty');
        if (ammoWeaponEl) ammoWeaponEl.textContent = BUILD_NAMES.m240;
        if (ammoCountEl) ammoCountEl.textContent = String(carriedMg.belt | 0);
        if (ammoDetailEl) ammoDetailEl.textContent = sayText('m240.carriedAmmo', {belt: carriedMg.belt | 0});
      } else if (typedAmmo) {
        const loaded = Math.max(0, typedAmmo.inGun | 0);
        const type = sayText('ammo.type.' + typedAmmo.loaded + '.tag', {}, typedAmmo.types?.[typedAmmo.loaded]?.tag || typedAmmo.loaded);
        const reserve = Math.max(0, typedAmmo.carried?.[typedAmmo.loaded] | 0);
        if (ammoWeaponEl) ammoWeaponEl.textContent = st.name + ' · ' + sayText('hud.ammo.typeHint');
        if (ammoCountEl) ammoCountEl.textContent = String(loaded);
        if (ammoDetailEl) ammoDetailEl.textContent = typedAmmo.switching
          ? ammoHudTag(currentWeapon)
          : reloading ? sayText('hud.ammo.typedReloading', {type, reserve})
          : sayText('hud.ammo.typed', {loaded, capacity: magSize(currentWeapon), type, reserve});
        if (loaded <= 0 && !reloading && !typedAmmo.switching) ammoEl.classList.add('empty');
        else ammoEl.classList.remove('empty');
      } else if (reloading) {
        ammoEl.classList.remove('empty');
        if (ammoCountEl) ammoCountEl.textContent = '…';
        if (ammoDetailEl) ammoDetailEl.textContent = 'Reloading';
      } else if (st.melee) {
        const running = AudioSys.isChainsawRunning && AudioSys.isChainsawRunning();
        const fuel = Math.max(0, Math.ceil(sawFuel));
        if (ammoCountEl) ammoCountEl.textContent = fuel + 's';
        if (ammoDetailEl) ammoDetailEl.textContent = 'Gas ' + fuel + ' / ' + Math.round(sawFuelMax()) + (running ? ' · Running' : (fuel <= 0 ? ' · EMPTY' : ''));
        if (ammoDetailEl && (sawOverheat || sawHeat > 0.05)) ammoDetailEl.textContent += sawOverheat ? ' \u00b7 OVERHEAT' : ' \u00b7 Heat ' + Math.round(sawHeat * 100) + '%';   // GB-52
        if (fuel <= 0) ammoEl.classList.add('empty'); else ammoEl.classList.remove('empty');
      } else {
        // Loaded / reserve. The reserve is what the kiosk sells; the magazine is what
        // the reload pulls out of it.
        const ammoLabel = Number.isFinite(ammo) ? Math.ceil(ammo) : '∞';
        const res = reserveOf(currentWeapon);
        if (ammoCountEl) ammoCountEl.textContent = String(ammoLabel);
        const mode = selectorGun(currentWeapon) ? ('  ·  ' + (weaponIsAuto(currentWeapon) ? 'AUTO' : 'SEMI')) : '';
        const loadTag = ammoHasTypes(currentWeapon) ? '  ·  ' + ammoHudTag(currentWeapon) : '';   // CB-294: the type in the gun, or the change as it runs
        if (ammoDetailEl) ammoDetailEl.textContent = ammoLabel + ' / ' + magSize(currentWeapon) + '  ·  ' + res + ' ' + sayText('ammo.unit.' + (currentWeapon === 'launcher' ? 'grenades' : currentWeapon === 'flamer' ? 'fuel' : 'bullets')) + mode + loadTag;
        if (Number.isFinite(ammo) && ammo <= 0) ammoEl.classList.add('empty');
        else ammoEl.classList.remove('empty');
      }
      updateReloadPrompt();
    };
const gpChangedHud=updateAmmoHud;Q.useOriginal=on=>{updateAmmoHud=on?gpOriginalHud:gpChangedHud;};Q.repaint=n=>{for(let i=0;i<n;i++)updateAmmoHud();};Q.readHud=()=>({text:ammoEl.innerText,chips:grenadeChipsEl.innerHTML,cls:ammoEl.className});
Q.hudScenarios=()=>{const saved={currentWeapon,reloading,reloadWeapon,mortarMounted,mortarCarried,sawFuel,sawHeat,sawOverheat,grenades,medkits};const rows=[];try{mortarMounted=mortarCarried=null;for(const [key,reload]of [["ak",false],["pistol",false],["minigun",false],["shotgun",false],["shotgun",true],["revolver",true],["flamer",false],["chainsaw",false]]){currentWeapon=key;reloading=reload;reloadWeapon=reload?key:null;sawFuel=23;sawHeat=.38;sawOverheat=false;grenades=2;medkits=3;gpOriginalHud();const before=Q.readHud();gpChangedHud();const after=Q.readHud();rows.push({key,reload,before,after});}return rows;}finally{currentWeapon=saved.currentWeapon;reloading=saved.reloading;reloadWeapon=saved.reloadWeapon;mortarMounted=saved.mortarMounted;mortarCarried=saved.mortarCarried;sawFuel=saved.sawFuel;sawHeat=saved.sawHeat;sawOverheat=saved.sawOverheat;grenades=saved.grenades;medkits=saved.medkits;gpChangedHud();}};
for(const n of []){const f=AudioSys[n];if(typeof f==='function')AudioSys[n]=function(...a){return Q.time('sound.'+n,f,this,a);};}
`;
const cut=source.lastIndexOf('</script>');assert(cut>0);const instrumented=source.slice(0,cut)+injection+source.slice(cut);
const bench=fs.readFileSync('tools/bench.mjs','utf8');function expression(n){const tick=String.fromCharCode(96),m=bench.match(new RegExp('const '+n+' = ('+tick+'[\\s\\S]*?'+tick+');'));assert(m,n);return Function('return '+m[1])();}
const report={scope:'Native production HUD before/after equivalence using saved original body in same lexical context; zero unchanged DOM writes.',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),rows:[]};
const backend=await serve(root,0);const proxy=http.createServer((req,res)=>{if(new URL(req.url,'http://local').pathname==='/index.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(instrumented);return;}const u=new URL(req.url,backend.origin);const p=http.request(u,{method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});p.on('error',e=>{res.writeHead(500);res.end(String(e));});req.pipe(p);});await new Promise(r=>proxy.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+proxy.address().port;let browser,page;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{browser=await launch({headless:false,args:['--enable-precise-memory-info']});page=await browser.newPage({width:1280,height:720});await page.goto(origin+'/index.html?debug=1',{timeout:300000});assert(await page.waitFor('!!window.TT && DWLoad.snapshot().state==="ready"',{timeout:300000}));await page.evaluate('DWOpening.dismissForTesting()');await page.waitFor('!DWOpening.active');await page.evaluate('document.getElementById("playerName").value="GP-20133 profile";document.getElementById("modeTraining").click()');assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:150000}));report.graphics=await page.evaluate('TT.applyGraphicsPreset("high");TT.getGfx()');assert.equal(report.graphics,'high');await page.evaluate('TT.closeCIF();TT.trainingDbg.panel()?.close();TT.runDevCommand("godmode");TT.AudioSys.setMuted(false)');
await page.evaluate('__gp.setup("ak",false)');await pause(2200);await page.evaluate('TT.flightHold(true);__gp.mutations={};for(const id of ["grenadeChips","ammoWeapon","ammoCount","ammoDetail"]){const el=document.getElementById(id);new MutationObserver(rs=>__gp.mutations[id]=(__gp.mutations[id]||0)+rs.length).observe(el,{childList:true,subtree:true,characterData:true});}');
report.hud=[];for(const before of [true,false]){await page.evaluate('__gp.useOriginal('+before+');__gp.repaint(1)');await pause(50);await page.evaluate('__gp.mutations={};__gp.repaint(100)');await pause(50);const row=await page.evaluate('({mutations:__gp.mutations,snapshot:__gp.readHud()})');row.before=before;report.hud.push(row);await page.screenshot(path.join(out,before?'hud-native-before.png':'hud-native-after.png'));}
assert.deepEqual(report.hud[0].snapshot,report.hud[1].snapshot);assert.equal(report.hud[0].mutations.grenadeChips,100);assert.equal(report.hud[0].mutations.ammoWeapon,100);assert.equal(report.hud[1].mutations.grenadeChips||0,0);assert.equal(report.hud[1].mutations.ammoWeapon||0,0);assert.equal(report.hud[1].mutations.ammoCount||0,0);assert.equal(report.hud[1].mutations.ammoDetail||0,0);
report.scenarios=await page.evaluate('__gp.hudScenarios()');for(const r of report.scenarios)assert.deepEqual(r.after,r.before,r.key+' '+r.reload);await page.evaluate('TT.flightHold(false)');console.log('PASS native HUD:100 unchanged calls, 400->0 tracked mutations;8 display states identical');
report.endSourceSha256=crypto.createHash('sha256').update(fs.readFileSync('index.html')).digest('hex');report.errors=page.errors;assert.equal(report.errors.length,0);console.log('PASS current-tree full-magazine receipts written; no baseline or improvement claim');
}catch(e){report.failure=String(e.stack||e);report.errors=page?.errors;console.error(report.failure);process.exitCode=1;}finally{fs.writeFileSync(path.join(out,'hud-native.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>proxy.close(r));await backend.close();}
