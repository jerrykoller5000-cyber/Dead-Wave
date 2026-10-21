import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const live=process.argv.includes('--live');
const clock=fs.readFileSync('tools/posesheet.mjs','utf8').match(/const PAGE = String\.raw`([\s\S]*?)`;/)[1]
  .replace('=> window.dispatchEvent(new KeyboardEvent','=> document.body.dispatchEvent(new KeyboardEvent');
const root='review/chainsaw-animation',proof={at:new Date().toISOString(),cases:{}};
let E;
try{
  for(const tag of (live?['live']:['before','after'])){
    E=new Engine({training:true,warm:'none',size:'1100x800'});
    const load=E.load.bind(E);
    E.load=async()=>{const go=E.page.goto.bind(E.page);E.page.goto=(url,opts)=>go(live?url:url.replace('/index.html?','/'+root+'/'+tag+'.html?'),opts);try{return await load();}finally{E.page.goto=go;}};
    await E.open();
    const capture=E.page.screenshot.bind(E.page);E.page.screenshot=async file=>{await E.ev('__step(1);return true;');return capture(file);};
    await E.ev(`R.release();T.clearZombies();T.setHp(10000);T.grantAllWeapons();T.AudioSys.setMuted(true);
      const tg=T.trainingDbg.tg(),O=tg.origin;window.__S={x:O.x,y:tg.floorY,z:O.z+4};
      T.player.position.set(__S.x,__S.y,__S.z);T.renderer.domElement.dispatchEvent(new PointerEvent('pointerleave',{bubbles:true}));return true;`);
    await E.page.evaluate(clock);await new Promise(r=>setTimeout(r,150));
    await E.ev(`window.sampleSaw=()=>{
      T.player.updateMatrixWorld(true);const g=T.weaponMeshes.chainsaw,V=T.THREE.Vector3,H={grip:[0,-.086,-.176],fore:[0,.18,.02]};
      const r=T.handsDbg.gripPoint('R'),l=T.handsDbg.gripPoint('L'),rear=g.localToWorld(new V(...H.grip)),front=g.localToWorld(new V(...H.fore));
      const h=g.userData.starterHandle;
    return {weapon:T.getCurrentWeapon(),unarmed:T.isUnarmed(),state:T.sawStartDbg?T.sawStartDbg():null,fuel:T.getSawFuel(),heat:T.getSawHeat(),
        rearError:r.distanceTo(rear),frontError:l.distanceTo(front),
        handleError:h?r.distanceTo(h.getWorldPosition(new V())):null,
        cord:h?h.position.distanceTo(g.userData.starterExit):0,
        gun:g.getWorldPosition(new V()).toArray(),rotation:g.getWorldQuaternion(new T.THREE.Quaternion()).toArray()};
    };__weapon('pistol');__step(100);T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));T.setMouseFireDbg(true);return true;`);
    fs.mkdirSync(root+'/'+tag,{recursive:true});
    const entry=proof.cases[tag]={renderer:E.renderer,loadSeconds:E.loadSec,start:[]};
    for(let f=0;f<100;f++){
      entry.start.push(await E.ev('__step(1);return sampleSaw();'));
      if([18,30,42,60,88].includes(f))await E.shoot({target:'player',view:'three',dist:3.2,out:`${root}/${tag}/start-${f}.png`});
    }
    await E.shoot({target:'player',view:'front',dist:3.2,out:`${root}/${tag}/idle.png`});
    entry.cut=await E.ev(`T.setMouseFireDbg(true);const a=[];for(let i=0;i<80;i++){__step(1);a.push(sampleSaw());}return a;`);
    await E.shoot({target:'player',view:'three',dist:3.2,out:`${root}/${tag}/cutting.png`});
    await E.shoot({target:'player',view:'front',dist:3.2,out:`${root}/${tag}/cutting-front.png`});
    if(false){
      entry.walk=await E.ev(`__key('KeyW',true);__step(30);const a=[];for(let i=0;i<60;i++){__step(1);a.push(sampleSaw());}__key('KeyW',false);T.setMouseFireDbg(false);return a;`);
      entry.crouch=await E.ev(`__key('KeyC',true);__step(80);T.setMouseFireDbg(true);const a=[];for(let i=0;i<40;i++){__step(1);a.push(sampleSaw());}T.setMouseFireDbg(false);__key('KeyC',false);return a;`);
      await E.ev(`T.toggleHolster();__step(40);return true;`);entry.holster=await E.ev('return sampleSaw();');
      await E.ev("T.toggleHolster();T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));__step(12);return true;");
      entry.redraw=await E.ev(`const a=[];for(let i=0;i<105;i++){__step(1);a.push(sampleSaw());}return a;`);
      entry.pause=await E.ev(`T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));__step(60);
        T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));__step(35);const before=sampleSaw();
        __key('Escape',true);__key('Escape',false);__step(40);const during=sampleSaw();
        __key('Escape',true);__key('Escape',false);__step(100);return {before,during,after:sampleSaw()};`);
      await E.ev(`T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));__step(60);T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));__step(25);T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));__step(60);return true;`);
      entry.cancel=await E.ev('return sampleSaw();');
    }
    entry.errors=E.page.errors;await E.close();E=null;
    console.log(tag+': '+JSON.stringify({rearError:Math.max(...entry.cut.map(s=>s.rearError)),frontError:Math.max(...entry.cut.map(s=>s.frontError)),errors:entry.errors.length}));
  }
  fs.writeFileSync(root+'/'+(live?'reach-proof.json':'proof.json'),JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify(proof.cases.live.start.filter(x=>x.state&&x.state.t>.18&&x.state.t<.25).map(x=>({t:x.state.t,error:x.handleError,cord:x.cord}))));
}finally{if(E)await E.close();}
process.exit(0);
