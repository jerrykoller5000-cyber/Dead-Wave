import fs from 'node:fs';import crypto from 'node:crypto';
const dir='review/vault-GP19900',src=fs.readFileSync('index.html','utf8'),patches=[];
function replace(oldText,newText){if(!src.includes(oldText))throw Error('missing anchor '+oldText.slice(0,100));if(src.indexOf(oldText)!==src.lastIndexOf(oldText))throw Error('ambiguous '+oldText.slice(0,100));patches.push({oldText,newText});}
const nl=src.includes('\r\n')?'\r\n':'\n',n=s=>s.replace(/\r?\n/g,nl);
replace("    import { vaultReward } from './game/relay-vault.js';", "    import { planVault, sampleVault, vaultEligible, vaultCanFire } from './game/player-vault.js';   // GP-19900"+nl+"    import { vaultReward } from './game/relay-vault.js';");
replace('    const DUAL_CAPABLE = { pistol: 1, uzi: 1, revolver: 1 };','    let vault = null; // GP-19900: declared before the hand-ownership policy'+nl+'    const DUAL_CAPABLE = { pistol: 1, uzi: 1, revolver: 1 };');
replace('return dualActive && dualCapable(currentWeapon) && !!dualOwned[currentWeapon];','return dualActive && dualCapable(currentWeapon) && !!dualOwned[currentWeapon] && !vault;');
replace('    let vault = null;          // CU-52: the 0.5 s hop over his own cover'+nl,'');
const a=src.indexOf('    // CU-52 (P-44): Space beside his own sandbag'),b=src.indexOf('    function cashMult()',a);
if(a<0||b<0)throw Error('vault block');replace(src.slice(a,b),n(fs.readFileSync(dir+'/integration.js.txt','utf8'))+nl);
replace('      marineTurn.apply(dt, { yaw: player.rotation.y, aimLocked: !unarmed, crouch: POSE.crouch,','      poseVault();   // GP-19900: weighted push, staggered tucked legs and landing'+nl+'      marineTurn.apply(dt, { yaw: player.rotation.y, aimLocked: !unarmed, crouch: POSE.crouch,');
replace('      if (!gameStarted || paused || gameOver || won || placeMode || buildMode) return;'+nl+'      if (mortarMounted && mortarMounted.type', '      if (!gameStarted || paused || gameOver || won || placeMode || buildMode || vault) return;'+nl+'      if (mortarMounted && mortarMounted.type');
replace('grenadeCd > 0 || playerSwimming || mortarMounted || mortarCarried) return;', 'grenadeCd > 0 || playerSwimming || mortarMounted || mortarCarried || vault) return;');
replace('    function setWeapon(idx, dir = 1) {','    function setWeapon(idx, dir = 1) {'+nl+'      if(vault)return; // keep the firing/support hands owned through the crossing');
replace('    function toggleHolster() {','    function toggleHolster() {'+nl+'      if(vault)return;');
replace('    function toggleDualWield() {','    function toggleDualWield() {'+nl+'      if(vault)return;');
replace('    function startGrenadeCharge() {','    function startGrenadeCharge() {'+nl+'      if(vault)return;');
replace('    function knifeAttack() {','    function knifeAttack() {'+nl+'      if(vault)return;');
replace('&& !unarmed && !vault && !onAnyLadder();','&& !unarmed && (!vault || vaultCanFire(currentWeapon,unarmed)) && !onAnyLadder();');
// Weapon hold: right hand still aims, support hand belongs to the vault, long guns tucked across the body.
const holdAt=src.indexOf('    function holdWeapon(dt)'),holdEnd=src.indexOf('    function ',holdAt+30);const hold=src.slice(holdAt,holdEnd);
if(!hold.includes('const target = weaponAimPoint();'))throw Error('hold target');
replace(hold,hold.replace('const target = weaponAimPoint();',n("const target = vault && !vaultCanFire(currentWeapon,unarmed)\n        ? player.localToWorld(_vaultCarryAim.set(-.7,1.03,.28)) : weaponAimPoint();"))
 .replace('if (H.sh && !aki)', 'if (H.sh && !aki && !vault)')
 .replace('if (!aki && Array.isArray(H.fore)', 'if (!aki && !vault && Array.isArray(H.fore)')
 .replace('      // Akimbo: the left hand is not supporting this gun,',n('      if(vault) { offhandMount.visible=false;return; } // the left hand braces the obstacle\n\n      // Akimbo: the left hand is not supporting this gun,')));
replace('        player.position.x += velX * dt;'+nl+'        player.position.z += velZ * dt;', '        if(!vault) {'+nl+'          player.position.x += velX * dt;'+nl+'          player.position.z += velZ * dt;'+nl+'        }');
const trigger=n("        let hopped = false;\n        const jumpPressed = !!keys.Space && !vaultSpaceWas;\n        if (jumpPressed && !marineDown()) hopped = tryVault();\n        vaultSpaceWas = !!keys.Space;\n        if (vault) updateVault(dt);\n");
replace('        // Always face aim so weaponMount +Z tracks mouse',trigger+'        // Always face aim so weaponMount +Z tracks mouse');
replace('player.rotation.y = mortarMounted ? mortarFaceYaw : lad ? lad.yaw : aimYaw;', 'player.rotation.y = vault ? Math.atan2(vault.nx,vault.nz) : mortarMounted ? mortarFaceYaw : lad ? lad.yaw : aimYaw;');
const oldTrigger=n("        let hopped = false;\n        const jumpPressed = !!keys.Space && !vaultSpaceWas;\n        if (jumpPressed && !marineDown()) hopped = tryVault();\n        vaultSpaceWas = !!keys.Space;\n");replace('        // press hops him over it instead (CU-52).'+nl+oldTrigger,'        // GP-19900: cover checked before posing; plain jumps keep their input buffer.'+nl);
replace('        if (vault) updateVault(dt);'+nl+'        else if (launchJump) {', '        if (launchJump) {');
replace('        ladderHands();   // CL-180: on a ladder the hands stay on the rungs whatever ran over the arms', '        ladderHands();   // CL-180: on a ladder the hands stay on the rungs whatever ran over the arms'+nl+'        vaultHands();   // GP-19900: palm contact after idle/weapon overrides');
replace('        if (climbingTower) {'+nl+'          // Height is owned entirely by updateTowerClimb()', '        if(vault) { vy=0;grounded=false; }'+nl+'        else if (climbingTower) {'+nl+'          // Height is owned entirely by updateTowerClimb()');
replace('isVaulting: () => !!vault, speedMult,',n("isVaulting: () => !!vault, vaultDbg: { state: () => vault && {u:vault.t/vault.dur,type:vault.piece.type,from:[vault.x0,vault.y0,vault.z0],to:[vault.x1,vault.y1,vault.z1],contact:{...vault.contact},pose:vaultPoseFrame}, hold: u => {vaultHoldU=u==null?null:_clamp01(u);}, clearAt:vaultClearAt, flags: () => ({fireHeld,mouseFireHeld,unarmed,placeMode,buildMode,blocked:uiBlocksFire(),reloading,fireCooldown,dualActive,akimbo:akimboOn()}) }, speedMult,"));
let staged=src;for(const p of patches){if(!staged.includes(p.oldText))throw Error('dependent anchor');staged=staged.replace(p.oldText,p.newText);}
staged=staged.replace('<head>','<head><base href="/">').replace("from './game/player-vault.js'","from './review/vault-GP19900/player-vault.js'");
fs.writeFileSync(dir+'/index.html',staged,'utf8');
fs.writeFileSync(dir+'/patches.json',JSON.stringify({baseHash:crypto.createHash('sha256').update(src).digest('hex'),patches},null,2));
let engine=fs.readFileSync('tools/camera.mjs','utf8').replace("from './serve.mjs'","from '../../tools/serve.mjs'").replace("from './cdp.mjs'","from '../../tools/cdp.mjs'").replace("new URL('..', import.meta.url)","new URL('../..', import.meta.url)").replace('/index.html?debug=1&raf=timer','/review/vault-GP19900/index.html?debug=1&raf=timer');
fs.writeFileSync(dir+'/camera.mjs',engine,'utf8');console.log('Staged '+patches.length+' focused hooks; live index untouched');
