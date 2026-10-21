// One-shot, exact-anchor edits on fresh files. Never restore source snapshots.
import fs from 'node:fs';
const edits=new Map();
function edit(file,fn){const before=fs.readFileSync(file,'utf8');let source=before.replaceAll('\r\n','\n');const replace=(a,b)=>{if(source.split(a).length!==2)throw Error(file+': ambiguous/missing '+a.slice(0,100));source=source.replace(a,b);};fn(replace,()=>source,s=>source=s);edits.set(file,{before,after:source.replaceAll('\n',before.includes('\r\n')?'\r\n':'\n')});}
edit('index.html',r=>{
 r("import { buildMarineHelmet, detailMarineNvg }", "import { buildMarineHelmet, detailMarineNvg, fitMarineHelmetParts }");
 r("import { fitWeaponSling } from './ui/weapon-sling.js';", "import { clearCarryPack, fitCarryHolster } from './ui/marine-kit-fit.js';\n    import { fitWeaponSling } from './ui/weapon-sling.js';");
 r("hlAdd(rmesh(.043,.024,.023,nvgMat,.011),.061,1.329,.193);","hlAdd(rmesh(.043,.024,.023,nvgMat,.011),.061,1.329,.193);\n      fitMarineHelmetParts(THREE,gearParts.helmet,HEAD_PIVOT_Y);");
 r("headG.add(buildBalaclava(THREE, maskW));","const balaclava=buildBalaclava(THREE, maskW);headG.add(balaclava);g.userData.balaclava=balaclava;");
 r("const stanceL = 0.06 + shift * 0.04, stanceR = 0.06 - shift * 0.04;","const stanceL = 0.025 + shift * 0.01, stanceR = 0.025 - shift * 0.01;");
 r("bodyY = -0.02 - Math.max(0, breathe) * (0.004 + 0.012 * wd);","bodyY = -0.001 - Math.max(0, breathe) * (0.001 + 0.012 * wd);");
 r("hipRoll = shift * 0.02;","hipRoll = shift * 0.008;");
 r("torsoLean = 0.02 + breathe * (0.012 + 0.045 * wd) + 0.07 * wd;","torsoLean = 0.006 + breathe * (0.006 + 0.045 * wd) + 0.07 * wd;");
 r("rig.slings.forEach((s) => { fitCarriedGun(s, 'sling'); fitWeaponSling(THREE, s, rig.slingVest, carryMats.mag); });","rig.slings.forEach((s) => { fitCarriedGun(s, 'sling'); clearCarryPack(THREE,s,true); fitWeaponSling(THREE, s, rig.slingVest, carryMats.mag); });");
 r("for (const h of rig.holsters.concat(rig.pairs)) fitCarriedGun(h, 'holster', band);","for (const h of rig.holsters.concat(rig.pairs)) { fitCarriedGun(h, 'holster', band); clearCarryPack(THREE,h); if(h.kind!=='uzi')fitCarryHolster(THREE,h,leatherMat); }");
 r("fitCarriedGun(rig.hip, 'hip'); fitCarriedGun(rig.hipPair, 'hip');","fitCarriedGun(rig.hip, 'hip'); fitCarriedGun(rig.hipPair, 'hip');\n      for(const h of [rig.hip,rig.hipPair])fitCarryHolster(THREE,h,leatherMat);");
 r("const PACK_FIT = { pistol: { x: 0.115, y: 1.02, z: -0.333, tilt: -0.15 }, revolver: { x: 0.115, y: 1.02, z: -0.327, tilt: 0 } };","const PACK_FIT = { pistol: { x: 0.105, y: 0.87, z: -0.35, tilt: -0.08 }, revolver: { x: 0.105, y: 0.87, z: -0.35, tilt: 0 } };");
 r(": 1.01, lower ? (rev ? fit.z : -0.39) : -0.295)",": 1.15, lower ? (rev ? fit.z : -0.39) : -0.35)");
 r("spot.shell.scale.set(lower?1:.8,lower?1:.28,lower?1:.3);\n        spot.shell.position.set(lower?-gripIn*side*.055:0,lower?0:.025,lower?.11:-.03);","if(!spot.shell.userData.fittedHolster){spot.shell.scale.set(lower?1:.8,lower?1:.28,lower?1:.3);\n        spot.shell.position.set(lower?-gripIn*side*.055:0,lower?0:.025,lower?.11:-.03);}");
 r("hip.position.set(-0.228, 0.57, 0.035);","hip.position.set(-0.118, -0.05, 0.035);");
 r("hipsG.add(hip);","ud.legLG.add(hip);");
 r("const hipPair = new THREE.Group(); hipPair.position.set(0.228, 0.57, 0.035);","const hipPair = new THREE.Group(); hipPair.position.set(0.118, -0.05, 0.035);");
 r("hipPair.scale.setScalar(0.8); hipsG.add(hipPair);","hipPair.scale.setScalar(0.8); ud.legRG.add(hipPair);");
 r("rig.grenades = carryInstanced(new THREE.SphereGeometry(0.034, 10, 8), carryMats.grenade, CARRY_SLOTS.grenades, (o, i) => { o.position.copy(T(0.215, 0.62, 0.08 - i * 0.062)); o.scale.set(1, 1.2, 1); });\n      torso.add(rig.grenades);","rig.grenades = carryInstanced(new THREE.SphereGeometry(0.034, 10, 8), carryMats.grenade, CARRY_SLOTS.grenades, (o, i) => { const a=.84+i*.39; o.position.set(Math.cos(a)*.235,.69,-Math.sin(a)*.187); o.scale.set(1,1.2,1); });\n      hipsG.add(rig.grenades);");
});
edit('studio/marine-body.js',r=>{
 r("import {webbingGeometry}","import {wristTransition} from '../ui/marine-kit-fit.js';\nimport {webbingGeometry}");
 r("  put(lowerBody,rmesh(.045,.145,.082,holsterW,.014),-.216,.526,.015,0,0,.08);","  // GP-19920: the carry rig supplies the hollow holster on the thigh joint.");
 r("for(const y of[-.065,.033])addGear('pads',knee,form([[-.01,.076,.087],[.01,.076,.087]],strapMat),0,y,.01);",`// Each strap belongs to the limb it encircles; the upper one must not rotate into the thigh with the shin.
    addGear('pads',knee,form([[-.011,.084,.094],[.011,.083,.093]],strapMat,'calf-pad-strap',16,'high'),0,-.065,.006);
    addGear('pads',legG,form([[-.011,.084,.09],[.011,.087,.096]],strapMat,'thigh-pad-strap',16,'high'),side*.001,-.224,.018);`);
 r("put(bare,form([[-.227,.03,.025,ox,oz],[-.2,.032,.029,ox,oz],[-.165,.04,.044,ox,oz]","put(bare,form([[-.18,.037,.036,ox,oz],[-.165,.04,.044,ox,oz]");
 r("wrist.scale.setScalar(HAND_SCALE);wrist.userData.handScale=HAND_SCALE;","wrist.scale.setScalar(HAND_SCALE);wrist.userData.handScale=HAND_SCALE;\n    const transition=wristTransition(T,elbowG,wrist,skinW,{ox,oz,gz,scale:HAND_SCALE});\n    dress.sleeveRolled.push(transition);");
});
edit('studio/marine-idle.js',r=>{
 r("u.idleSway = shift * .045","u.idleSway = shift * .012");
 r("u.lowerBody.rotation.z += shift * .045;","u.lowerBody.rotation.z += shift * .012;");
 r("Math.max(0, shift) * .11","Math.max(0, shift) * .025");
 r("Math.max(0, -shift) * .11","Math.max(0, -shift) * .025");
 r("u.torsoG.rotation.z -= shift * .055;","u.torsoG.rotation.z -= shift * .014;");
 r("u.torsoG.rotation.x += bored * .045;","u.torsoG.rotation.x += bored * .008;");
});
for(const[file,{before,after}]of edits){if(fs.readFileSync(file,'utf8')!==before)throw Error(file+' changed during edit');fs.writeFileSync(file,after,'utf8');console.log(file);}
