import {LIGHTS} from '../../studio/inspector/stage.js';
export function trailScene(T){
  const G=T.THREE,H=T.inspectHost(),b=T.barrelHeat,update=b.update;
  let locked=false,captureOnly=false,light=LIGHTS.noon,group=[],elapsed=0,mode,view,origin,walkKeys=[],walkMin=Infinity,eyeMin=Infinity;
  const cam=H.camera||T.camera;
  if(!cam)throw Error('Missing gameplay camera');
  const dt=1/60,steps=n=>{for(let i=0;i<n;i++)T.stepFrame(dt);};
  function lighting(){
    const p=T.player.position;H.sun.position.copy(p).addScaledVector(new G.Vector3(...light.dir).normalize(),85);
    H.sun.target.position.copy(p);H.sun.target.updateMatrixWorld();H.sun.color.setHex(light.sunColor);H.sun.intensity=light.sun;
    H.hemi.color.setHex(light.skyColor);H.hemi.groundColor.setHex(light.ground);H.hemi.intensity=light.sky;H.ambientFill.intensity=light.fill;H.moon.intensity=0;
  }
  H.attach({held:()=>locked,scale:d=>d,frame:lighting});
  b.update=(d,s)=>update.call(b,d,captureOnly?{...s,suppressWisp:true}:s);
  T.flightHold(true);T.grantAllWeapons();if(T.isUnarmed())T.toggleHolster();
  document.head.appendChild(document.createElement('style')).textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';
  function start(which,action){
    view=which;mode=action;locked=false;captureOnly=false;light=LIGHTS.noon;elapsed=0;
    T.setShotView(null);T.flightInput({keys:[],fire:false,zoom:false});T.setViewFirstDbg(view==='eye');
    const range=T.trainingDbg.tg();T.player.position.set(range.origin.x,range.floorY,range.origin.z-6);
    T.setVelDbg(0,0);T.setOtsAimDbg(0,-.02);
    const a=T.armoryDbg.ui().armory;if(!a.has('uzi'))a.buy({id:'uzi',kind:'uzi'},{store:true});
    for(let i=0;i<30&&T.getCurrentWeapon()!=='uzi';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('uzi'));steps(20);}
    T.setViewFirstDbg(view==='eye');steps(85);
    if(T.vaultDbg.flags().akimbo)T.toggleDualWieldDbg();
    if(T.getCurrentWeapon()!=='uzi'||(view==='eye'&&!T.viewmodelDbg().info.active))throw Error('Wrong burst camera or gun');
    b.reset();
    let shots=0,frames=0,seed=20089;const old=b.addShot;
    Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    b.addShot=function(...args){shots++;return old.apply(this,args);};
    try{
      for(;frames<2400&&shots<175;frames++){
        if(frames%12===0)T.setMagazinesDbg('uzi',24,[],0);
        T.setMouseFireDbg(true);steps(1);
      }
    }finally{T.setMouseFireDbg(false);b.addShot=old;}
    if(shots!==175||b.getHeat('uzi')<.6)throw Error('Incomplete burst '+JSON.stringify({shots,frames,heat:b.getHeat('uzi')}));
    group=b._wisps.filter(w=>w.active).map(w=>({w,age:w.age,life:w.life,x:w.x0,y:w.y0,z:w.z0}));
    if(!group.length)throw Error('No visible trail');
    origin=T.player.position.clone();const tip=group.reduce((a,b)=>a.age<b.age?a:b);
    const motion=new G.Vector3(tip.x-origin.x,0,tip.z-origin.z);motion.normalize();
    let front=new G.Vector3();cam.getWorldDirection(front);front.y=0;front.normalize();
    const left=new G.Vector3(front.z,0,-front.x),f=motion.dot(front),s=motion.dot(left);
    walkKeys=[];if(Math.abs(f)>.38)walkKeys.push(f>0?'KeyW':'KeyS');if(Math.abs(s)>.38)walkKeys.push(s>0?'KeyA':'KeyD');
    walkMin=Infinity;eyeMin=Infinity;
    captureOnly=mode==='trail';locked=true;
    return {view,mode,shots,frames,heat:b.getHeat('uzi'),walkKeys,position:origin.toArray(),muzzle:[tip.x,tip.y,tip.z],startCohort:group.length,
      youngest:{age:tip.age,life:tip.life,strength:tip.w.hNorm},lifetimes:group.map(g=>g.life)};
  }
  function stats(){
    const eye=cam.getWorldPosition(new G.Vector3()),player=T.player.position;
    const alive=group.filter(o=>o.w.active&&Math.abs(o.w.age-o.age-elapsed)<.0001);
    for(const o of alive){const w=o.w;walkMin=Math.min(walkMin,Math.hypot(w.x-player.x,w.z-player.z));eyeMin=Math.min(eyeMin,eye.distanceTo(w.mesh.position));}
    return {elapsed:Math.round(elapsed*1000)/1000,alive:alive.length,active:b._wisps.filter(w=>w.active).length,
      opacity:alive.reduce((sum,o)=>sum+o.w.mat.opacity,0),walkTravel:player.distanceTo(origin),walkMin,eyeMin,
      eye:eye.toArray(),player:player.toArray(),sample:alive.slice(0,3).map(o=>({age:o.w.age,life:o.w.life,opacity:o.w.mat.opacity}))};
  }
  function advance(t){
    locked=false;T.flightInput({keys:mode==='walk'?walkKeys:[],fire:false,zoom:false});
    for(;elapsed+dt/2<t;){steps(1);elapsed+=dt;stats();}
    locked=true;return stats();
  }
  function picture(key){light=LIGHTS[key];locked=true;steps(1);}
  return {start,advance,picture,stats};
}
