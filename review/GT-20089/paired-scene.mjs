import {LIGHTS} from '../../studio/inspector/stage.js';
import {findGunHeatParts} from '../../game/barrel-heat.js';

export function pairedScene(T){
  const H=T.inspectHost(),G=T.THREE,arm=T.armoryDbg.ui().armory;
  let locked=false,light=LIGHTS.noon,key,view,prior;
  const step=n=>{for(let i=0;i<n;i++)T.stepFrame(1/30);};
  function relight(){
    const p=T.player.position;
    H.sun.position.copy(p).addScaledVector(new G.Vector3(...light.dir).normalize(),120);
    H.sun.target.position.copy(p);H.sun.color.setHex(light.sunColor);H.sun.intensity=light.sun;
    H.hemi.color.setHex(light.skyColor);H.hemi.groundColor.setHex(light.ground);
    H.hemi.intensity=light.sky;H.ambientFill.intensity=light.fill;H.moon.intensity=0;
  }
  H.attach({held:()=>locked,scale:dt=>dt,frame:relight});
  T.flightHold(true);T.grantAllWeapons();T.addCash(20000);
  if(T.isUnarmed())T.toggleHolster();
  document.head.appendChild(document.createElement('style')).textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';
  async function equip(id,suppressed){
    key=id;locked=false;T.setShotView(null);T.setViewFirstDbg(true);T.setMouseFireDbg(false);
    const range=T.trainingDbg.tg();
    T.player.position.set(range.origin.x,range.floorY,range.origin.z-.55);T.setOtsAimDbg(0,-.08);step(75);
    if(prior!==id){
      for(let i=0;i<arm.read().slots.secondary.length;i++)if(arm.read().slots.secondary[i])arm.stow('secondary',i);
      if(!arm.has(id))arm.buy({id,kind:id},{store:true});
      arm.take(id,'secondary',0);
      T.setDualOwnedDbg(id,true);
      if(!T.armoryDbg.fit(id,'pair',true))throw Error('Cannot fit pair '+id+' '+JSON.stringify(arm.loadout()));
      for(let i=0;i<22&&T.getCurrentWeapon()!==id;i++){T.setWeapon(T.WEAPON_ORDER.indexOf(id));step(14);}
      step(50);T.setViewFirstDbg(true);
      for(let i=0;i<12&&!T.viewmodelDbg()?.gun2;i++){
        if(!T.vaultDbg.flags().akimbo)T.toggleDualWieldDbg();
        step(18);await new Promise(r=>setTimeout(r,90));
      }
      prior=id;
    }
    if(id!=='revolver'){
      if(suppressed)T.buySuppressor(id);
      if(!T.armoryDbg.fit(id,'suppressor',suppressed))throw Error('Cannot fit can '+id);
    }
    step(12);
    if(!T.viewmodelDbg().gun2||T.getCurrentWeapon()!==id||!!T.offhandMeshes[id].userData.suppressed!==suppressed)
      throw Error('Missing equipped pair '+JSON.stringify({id,loadout:arm.loadout(),actual:T.getCurrentWeapon(),flags:T.vaultDbg.flags(),internals:window.pairViewState?.(),ots:T.otsDbg(),mount:world()[0].parent?.visible,first:T.getViewFirst?.(),wake:!!T.trainingDbg.state().wake,want:T.vmStateDbg().want,active:T.viewmodelDbg()?.info?.active,left:!!T.viewmodelDbg()?.gun2,can:T.offhandMeshes[id].userData.suppressed}));
  }
  const world=()=>[T.weaponMeshes[key],T.offhandMeshes[key]];
  function muzzles(){
    return world().map((gun,i)=>view==='eye'?T.viewmodelDbg().muzzleWorld(new G.Vector3(),i+1):
      gun.localToWorld(gun.userData.muzzleLocal.clone()));
  }
  function camera(which){
    view=which;locked=false;T.setMouseFireDbg(false);T.setShotView(null);T.setViewFirstDbg(view==='eye');
    // Start every photographed trial with the right gun next and the same aim and recoil variation.
    let seed=71420089;
    Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    if(T.vaultDbg.flags().akimbo)T.toggleDualWieldDbg();
    T.toggleDualWieldDbg();T.setOtsAimDbg(0,-.08);step(42);
    if(!T.vaultDbg.flags().akimbo)throw Error('Pair did not come back up');
    if(view==='held'){
      const [a,b]=muzzles(), target=a.clone().lerp(b,.5);
      const delta=new G.Vector3(.55,.36,.63).applyQuaternion(world()[0].getWorldQuaternion(new G.Quaternion()));
      const eye=target.clone().add(delta);T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:38});step(3);
    }
  }
  function observe(){
    const vm=T.viewmodelDbg(),roots=view==='eye'?[vm.gun.root,vm.gun2.root]:world();
    return roots.map((g,i)=>{
      const parts=findGunHeatParts(g,key,world()[i]),out={};
      for(const [kind,node] of Object.entries(parts)){
        let hot=0,peak=0;
        node?.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m?.emissive?.getHex()&&m.emissiveIntensity>0){hot++;peak=Math.max(peak,m.emissiveIntensity);}});
        const meshes=[];
        node?.traverse(o=>{if(o.isMesh){const m=Array.isArray(o.material)?o.material[0]:o.material;
          const rm=o.geometry?.attributes?.foldRM;
          meshes.push({name:o.name,foldRM:rm?[rm.getX(0),rm.getY(0)]:null,type:m?.type,em:m?.emissive?.getHex(),intensity:m?.emissiveIntensity,vc:m?.vertexColors,rough:m?.roughness,metal:m?.metalness,active:o.visible});}});
        out[kind]={hot,peak,node:node?.name??null,meshes};
      }
      return out;
    });
  }
  function graph(){
    const vm=T.viewmodelDbg();
    return [...world(),vm.gun?.root,vm.gun2?.root].map(g=>{
      if(!g)return null;const nodes=[];
      g.traverse(n=>{if(/barrel|can-|suppressor|fold-static/i.test(n.name)||n.isInstancedMesh)nodes.push([n.name,n.type,n.children.length,n.userData?.artworkSlots?.length]);});
      return {binding:g.userData.heatParts,nodes};
    });
  }
  function burst(){
    locked=false;T.setMouseFireDbg(false);T.barrelHeat.reset();
    let shots=0,frames=0;const seen=[0,0],last=[-1,-1],maxGap=[0,0],history=[];
    const b=T.barrelHeat,original=b.addShot,temps=()=>[b.getHeat(key,0),b.getHeat(key,1)];
    let shot=null;b.addShot=function(...args){const old=temps();const r=original.apply(this,args);shot={hand:args[3]??0,old,after:temps()};return r;};
    try{
      const shotCount=key==='uzi'?210:110;
      for(let f=0;f<2200&&shots<shotCount;f++){
        frames=f+1;
        if(f%6===0){if(key==='revolver')T.setAmmoDbg(key,12);else T.setMagazinesDbg(key,12,[],12);}
        T.setMouseFireDbg(key==='pistol'?f%2===0:true);shot=null;step(1);
        if(shot){shots++;if(shots<=10)history.push(shot);}
        const ends=muzzles();
        for(const w of b._wisps)if(w.active&&Math.abs(w.age-1/30)<.0002){
          const p=new G.Vector3(w.x0,w.y0-.01,w.z0),ds=ends.map(end=>end?p.distanceTo(end):Infinity);
          const hand=Number(ds[1]<ds[0]);if(ds[hand]<.035){seen[hand]++;if(last[hand]>=0)maxGap[hand]=Math.max(maxGap[hand],f-last[hand]);last[hand]=f;}
        }
      }
    } finally{b.addShot=original;T.setMouseFireDbg(false);}
    if(shots<80)throw Error('Too few actual shots '+key+' '+shots);
    locked=true;return {key,view,shots,frames,seen,last,maxGap,history,temperatures:temps(),parts:observe(),muzzles:muzzles().map(v=>v?.toArray())};
  }
  function unequalMagazines(){
    if(key==='revolver')return [];
    locked=false;const results=[];
    for(const expected of [1,0]){
      T.setMouseFireDbg(false);step(20);T.barrelHeat.reset();
      T.setMagazinesDbg(key,expected===0?8:0,[],expected===1?8:0);
      const total=T.getAmmo()[key];
      for(let i=0;i<25&&T.getAmmo()[key]===total;i++){
        T.setMouseFireDbg(key==='pistol'?i%2===0:true);step(1);
      }
      T.setMouseFireDbg(false);
      const temps=[0,1].map(hand=>T.barrelHeat.getHeat(key,hand));
      if(T.getAmmo()[key]!==total-1||temps[expected]<=0||temps[1-expected]!==0)
        throw Error('Wrong source when one magazine is empty '+JSON.stringify({key,expected,total,temps}));
      results.push({expected,total,temps});
    }
    return results;
  }
  function saturation(){
    camera('eye');const b=T.barrelHeat,roots=world(),vm=T.viewmodelDbg();
    const state={currentWeapon:key,weaponMesh:roots[0],offhandMesh:roots[1],viewmodel:vm,isSuppressed:!!roots[0].userData.suppressed,daylight:1};
    b.reset();
    const counts=[0,0],last=[0,0],gaps=[0,0];
    let peak=0,fullFrames=0;
    for(let i=0;i<840;i++){
      for(let h=0;h<2;h++)b.setHeat(key,1,h);
      b.update(1/120,state);
      const ends=muzzles();let active=0;
      for(const w of b._wisps)if(w.active){
        active++;if(w.age>1/120+.00001)continue;
        const p=new G.Vector3(w.x0,w.y0-.01,w.z0),d=ends.map(q=>p.distanceTo(q));
        const h=Number(d[1]<d[0]);if(d[h]>.001)throw Error('Pooled smoke lost its muzzle '+d);
        counts[h]++;gaps[h]=Math.max(gaps[h],i-last[h]);last[h]=i;
      }
      peak=Math.max(peak,active);if(active===48)fullFrames++;
    }
    const packed=[];
    for(const g of [...roots,vm.gun.root,vm.gun2.root]){
      const part=findGunHeatParts(g,key,g)[state.isSuppressed?'suppressor':'barrel'];
      part?.traverse(o=>{
        const rm=o.geometry?.attributes?.foldRM,uv=o.geometry?.attributes?.uv1;
        if(!rm||!uv)return;
        let dark=0,metal=0,wrong=0;
        for(let i=0;i<rm.count;i++){
          const lit=rm.getX(i)<.84999||rm.getY(i)>.05001;
          if(lit)metal++;else dark++;
          if(Math.abs(uv.getY(i)-(lit?.5:0))>.00001)wrong++;
        }
        packed.push({dark,metal,wrong});
      });
    }
    if(peak!==48||!fullFrames||gaps.some(g=>g>48)||counts.some(n=>n<44)||packed.some(p=>p.wrong))
      throw Error('Paired saturation '+JSON.stringify({peak,fullFrames,counts,gaps,packed}));
    // Put the second gun away at peak heat. Its stored heat must continue to cool.
    T.toggleDualWieldDbg();locked=false;step(12);
    const cooling=b.getHeat(key,1);if(!(cooling>0&&cooling<.995))throw Error('Holstered hand did not cool '+cooling);
    b.reset();step(2);
    if(b.getHeat(key,0)||b.getHeat(key,1)||b._wisps.some(w=>w.active))throw Error('Heat or smoke survived reset');
    T.toggleDualWieldDbg();step(15);
    const kind=state.isSuppressed?'suppressor':'barrel',isolated=[];
    if(observe().some(p=>p.barrel.hot||p.suppressor.hot))throw Error('View retained an emissive surface after reset');
    for(const hotHand of [0,1]){
      b.reset();b.setHeat(key,.9,hotHand);step(4);
      const brightness=observe().map(p=>p[kind].hot);
      if(!brightness[hotHand]||brightness[1-hotHand])throw Error('Shared per-hand material: '+brightness);
      isolated.push(brightness);
    }
    let switched=null;
    if(key!=='revolver'){
      T.buySuppressor(key);for(const h of [0,1])b.setHeat(key,.9,h);
      if(!T.armoryDbg.fit(key,'suppressor',!state.isSuppressed))throw Error('Failed to switch hot attachment');
      step(4);const other=state.isSuppressed?'barrel':'suppressor';
      switched=observe().map(p=>[p[other].hot,p[kind].hot]);
      if(switched.some(([now,old])=>!now||old))throw Error('Hot attachment switch leaked '+JSON.stringify(switched));
      T.armoryDbg.fit(key,'suppressor',state.isSuppressed);
    }
    b.reset();return {peak,fullFrames,counts,gaps,packed,cooling,isolated,switched};
  }
  function picture(name){light=LIGHTS[name];locked=false;relight();step(1);locked=true;}
  return {equip,camera,burst,picture,observe,unequalMagazines,graph,saturation};
}
