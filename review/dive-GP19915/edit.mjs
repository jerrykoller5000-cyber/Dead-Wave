import fs from 'node:fs';import assert from 'node:assert/strict';
const dir='review/dive-GP19915',snap=(p,s)=>fs.writeFileSync(dir+'/'+p.replaceAll('/','_')+'.before',s);
function edit(p,f){const a=fs.readFileSync(p,'utf8'),b=f(a);assert.notEqual(a,b);snap(p,a);assert.equal(fs.readFileSync(p,'utf8'),a);fs.writeFileSync(p,b);}
function replace(s,a,b){assert.equal(s.split(a).length,2,a);return s.replace(a,b);}
if(!fs.readFileSync('studio/marine-dive.js','utf8').includes('wallT:0'))edit('studio/marine-dive.js',s=>{
 s=replace(s,'idleT: 99, pads: false, dives: 0','idleT: 99, pads: false, dives: 0, wallT:0, wallX:0, wallZ:0, contact:0');
 s=replace(s,"d.phase = 'air'; d.t = 0;", "d.wallT=0;d.contact=0;\n  d.phase = 'air'; d.t = 0;");
 s=replace(s,'  let ev = null;','  let ev = null;\n  d.wallT=Math.max(0,(d.wallT||0)-dt);d.contact=Math.max(0,(d.contact||0)-rdt*4);');
 s=replace(s,'    let sp = Math.hypot(d.vx, d.vz);','    if(d.wallT>0){const into=d.vx*d.wallX+d.vz*d.wallZ;if(into<0){d.vx-=into*d.wallX;d.vz-=into*d.wallZ;}}\n    let sp = Math.hypot(d.vx, d.vz);');
 s=replace(s,'Math.max(DIVE.speedMin, Math.min(DIVE.speedMax, sp))','Math.max(d.wallT>0?0:DIVE.speedMin, Math.min(DIVE.speedMax, sp))');
 // Keep the landing orientation; recovery releases from a planted knee rather than a rigid linear tilt.
 s=replace(s,'const u = smooth(d.t / (d.pads ? DIVE.getUpPads : DIVE.getUp));','const u = smooth((d.t / (d.pads ? DIVE.getUpPads : DIVE.getUp)-.18)/.82);');
 return s;
});
const p='index.html',source=fs.readFileSync(p,'utf8');let s=source;
const nl=source.includes('\r\n')?'\r\n':'\n';const patch=(a,b)=>{s=replace(s,a.replaceAll('\n',nl),b.replaceAll('\n',nl));};
patch("    import { rollTravel } from './studio/marine-roll.js';","    import { divePose } from './studio/marine-dive-pose.js';\n    import { constrainDiveBody, stopDiveIntoContact } from './studio/marine-dive-contact.js';\n    import { rollTravel } from './studio/marine-roll.js';");
patch('    let diveRealDt = 1 / 60;', '    let divePoseFrame=null;\n    let diveRealDt = 1 / 60;');
patch("        const lie = diveLie(dive, vy), f = lie.flat;", "        const lie = diveLie(dive, vy), f = lie.flat;\n        const dp=divePoseFrame=divePose(dive,vy);");
const a=s.indexOf('        // Legs long, one knee drawn up'),b=s.indexOf('\n      } else {\n        if (divePosed)'.replaceAll('\n',nl),a);assert(a>0&&b>a);
s=s.slice(0,a)+`        if(torso)torso.rotation.set(dp.chest,0,dp.side);
        if(head)head.rotation.x+=dp.head;
        if(lower){lower.rotation.z=0;lower.position.x=0;}
        if(legL)legL.rotation.set(dp.legL,0,dp.spread);
        if(legR)legR.rotation.set(dp.legR,0,-dp.spread);
        if(kneeL)kneeL.rotation.x=dp.kneeL;
        if(kneeR)kneeR.rotation.x=dp.kneeR;
        if(ud.ankleLG)ud.ankleLG.rotation.x=dp.ankleL;
        if(ud.ankleRG)ud.ankleRG.rotation.x=dp.ankleR;
        followMarineWaist(THREE,ud);
        if(unarmed){
          if(armL)armL.rotation.set(-1.15*f+dp.armSwing,0,.2*f);
          if(armR)armR.rotation.set(-1.3*f-dp.armSwing,0,-.2*f);
          if(elbowL)elbowL.rotation.x=-.4*f;
          if(elbowR)elbowR.rotation.x=-.5*f;
        }` .replaceAll('\n',nl)+s.slice(b);
patch('        if (divePosed) { divePosed = false;', '        divePoseFrame=null;\n        if (divePosed) { divePosed = false;');
patch('    function holdWeapon(dt) {','    function holdWeapon(dt) {\n      if(diving())dt=diveRealDt; // Aim and grip response stay on real time in bullet time.');
// Both firearm bases use the same partially body-relative up direction during a dive.
const gunUp=`    const _diveGunUp=new THREE.Vector3(),_diveBodyUp=new THREE.Vector3(),_diveGunQ=new THREE.Quaternion(),_divePalm=new THREE.Vector3(),_diveSide=new THREE.Vector3();
    function diveGunUp(forward,out){
      out.copy(_AXIS_Y);if(!diving()||diveFlatW<.01)return out;
      marine.userData.torsoG.getWorldQuaternion(_diveGunQ);
      _diveBodyUp.set(0,1,0).applyQuaternion(_diveGunQ);
      _diveBodyUp.addScaledVector(forward,-_diveBodyUp.dot(forward));
      if(_diveBodyUp.lengthSq()>.04)out.lerp(_diveBodyUp.normalize(),.65*diveFlatW).normalize();
      return out;
    }
    function poseDiveBrace(){
      const dp=divePoseFrame,ud=marine.userData;if(!dp||dp.brace<.01||reloading||akimboOn())return;
      player.updateMatrixWorld(true);
      ud.torsoG.getWorldQuaternion(_diveGunQ);_diveSide.set(-1,0,0).applyQuaternion(_diveGunQ);_diveSide.y=0;_diveSide.normalize();
      _divePalm.copy(player.position).addScaledVector(_diveU,.18).addScaledVector(_diveSide,.28);_divePalm.y=player.position.y+.09;
      solveArmIK(ud.armLG,ud.elbowLG,_HAND_L,_divePalm,_POLE_L,dp.brace);
      const wr=ud.elbowLG?.userData.wrist,rig=wr?.userData.hand;if(rig){rig.set(HAND_POSES.open);rig.update();}
    }
`;
patch('    function holdWeapon(dt) {',gunUp+'    function holdWeapon(dt) {');
patch('      if (!H || holdW < 0.01) return;', '      if (!H || holdW < 0.01) {poseDiveBrace();return;}');
// Replace the up cross in exactly the shoulder, generic and akimbo aim portions of hold functions.
const hStart=s.indexOf('    function holdShoulderGun('),hEnd=s.indexOf('    // GP-188: keep the saw fixed',hStart);assert(hStart>0&&hEnd>hStart);
let holds=s.slice(hStart,hEnd);assert(holds.includes('crossVectors(_AXIS_Y, f)'));holds=holds.replaceAll('crossVectors(_AXIS_Y, f)','crossVectors(diveGunUp(f,_diveGunUp), f)');
s=s.slice(0,hStart)+holds+s.slice(hEnd);
patch('      torso.localToWorld(P);\n      gun.getWorldScale(_hScale);','      torso.localToWorld(P);\n      if(diving())P.y=Math.max(P.y,player.position.y+.27*diveFlatW);\n      gun.getWorldScale(_hScale);');
patch('        torso.localToWorld(anchor);\n        if (dipR > 0)', '        torso.localToWorld(anchor);\n        if(diving())anchor.y=Math.max(anchor.y,player.position.y+.27*diveFlatW);\n        if (dipR > 0)');
// Brace only after the weapon grip has been solved, so the planted free hand is not overwritten.
// Insert at the main tick's post-hold point, and after a recoil re-solve by using holdWeapon's own final branch.
patch('      if (currentWeapon === \'chainsaw\' && on && sawStart.phase === \'starting\') poseSawStarter(gun, ud);','      if (currentWeapon === \'chainsaw\' && on && sawStart.phase === \'starting\') poseSawStarter(gun, ud);\n      poseDiveBrace();');
const collision=`    const _diveSolids=[];
    function resolveDiveContacts(){
      if(!diving()||climbingTower||vault)return;
      const p=player.position,lie=diveLie(dive,vy),S=_diveSolids;S.length=0;
      if(training.active&&training.tg){
        for(const s of training.tg.solids)if(s.target==null&&!s.floor)S.push(s);
      }else{
        const near=(x,z,r)=>Math.abs(x-p.x)<r+2&&Math.abs(z-p.z)<r+2;
        for(const s of worldSolids)if(near(s.x,s.z,s.radius))S.push({x:s.x,z:s.z,radius:s.radius,minY:s.y0,maxY:s.y1});
        for(const s of caveSealSolids)if(near(s.x,s.z,s.radius))S.push({x:s.x,z:s.z,radius:s.radius,minY:s.y0,maxY:s.y1});
        for(const t of trees)if(t.group.visible&&(t.alive&&!t.falling||t.stump)&&near(t.x,t.z,t.trunkRadius))S.push({x:t.x,z:t.z,radius:t.trunkRadius,minY:t.group.position.y,maxY:t.group.position.y+(t.stump ? .3 : (t.canopyBottom||2))});
        for(const r of rocks)if(r.alive&&r.mesh.visible&&near(r.x,r.z,r.radius))S.push({x:r.x,z:r.z,radius:r.radius,minY:r.mesh.position.y,maxY:r.mesh.position.y+r.height});
      }
      const q=constrainDiveBody(playerFrameStart,p,dive.dirX,dive.dirZ,lie.flat,lie.hip,S);
      if(q.hit){p.x=q.x;p.z=q.z;stopDiveIntoContact(dive,q.nx,q.nz);velX=dive.vx;velZ=dive.vz;}
      // Reuse owners' exact build/house/static-prop envelopes at the extended body samples.
      if(!training.active)for(const k of [-.58,.66]){
        const x=p.x+dive.dirX*k*lie.flat,z=p.z+dive.dirZ*k*lie.flat;
        let q=resolveHardBuildCollisions(x,z,.29,true,p.y+lie.hip-.29);q=resolveStaticProps(q.x,q.z,.29,p.y+lie.hip-.29);
        if(house.present)q=pushOutOfHouse(q.x,q.z,.29);
        const dx=q.x-x,dz=q.z-z,L=Math.hypot(dx,dz);if(L>.001){p.x+=dx;p.z+=dz;stopDiveIntoContact(dive,dx/L,dz/L);velX=dive.vx;velZ=dive.vz;}
      }
    }
`;
patch('    function trainingKeepPlayer() {',collision+'    function trainingKeepPlayer() {');
patch('      // Order: move ? collisions ? clamp XZ ? ground stick','      resolveDiveContacts(); // The flat body sweeps its head and boots, not just the standing root.\n      // Order: move ? collisions ? clamp XZ ? ground stick');
patch('flat: diveFlatW }), setDiveMeterDbg:', 'flat: diveFlatW,pose:divePoseFrame,contact:dive.contact }), setDiveMeterDbg:');
snap(p,source);assert.equal(fs.readFileSync(p,'utf8'),source);fs.writeFileSync(p,s);console.log('Applied guarded dive pose, weapon and contact integration.');
