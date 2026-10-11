// GP-179: bounded special attacks. The host supplies its established world and damage contracts.
import {ABILITY_CONFIG,createRangedAbility,stepRangedAbility,createAcidTrail,sampleAcidTrail,solveBallisticLaunch,stepBallistic,sweptSphereHit,colossusImpactDamage} from '../../game/zombie-abilities.js';
import {createAbilityCollision} from '../../game/zombie-ability-collision.js';
import {updateZombieAbilityVisuals,getZombieAbilityLaunch} from '../../game/zombie-ability-visuals.js';

export function createZombieAbilityRuntime(env){
  const T=env.THREE,scene=env.scene,collision=createAbilityCollision(env);
  const shots=[],trails=[],shotPools={fireball:[],stone:[]},trailPool=[];
  const trailSlots=Array.from({length:ABILITY_CONFIG.spitter.maxActive},(_,i)=>ABILITY_CONFIG.spitter.maxActive-1-i);
  const trailCorners=[[-.8,-.8],[.8,-.8],[.8,.8],[-.8,-.8],[.8,.8],[-.8,.8]];
  let hurtAt=new WeakMap(),states=new WeakMap();
  const launch=new T.Vector3(),from=new T.Vector3(),aim=new T.Vector3();
  const counts={fireballs:0,stones:0,trailDrops:0,directHits:0,blocked:0,acidHits:0};
  let clock=0,domain=null,assets=null,epoch=0,trailBatch=null;
  const live=token=>token===epoch&&env.active();
  function resources(){
    if(assets)return assets;
    const cv=document.createElement('canvas');cv.width=cv.height=64;const ctx=cv.getContext('2d');
    const g=ctx.createRadialGradient(32,32,5,32,32,31);g.addColorStop(0,'rgba(167,211,40,.8)');g.addColorStop(.6,'rgba(128,169,18,.7)');g.addColorStop(1,'rgba(64,89,6,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,64,64);ctx.fillStyle='rgba(222,248,117,.45)';
    for(let i=0;i<18;i++){const a=i*2.4,r=6+(i*17%22);ctx.beginPath();ctx.arc(32+Math.cos(a)*r,32+Math.sin(a)*r,1.2+i%3,0,Math.PI*2);ctx.fill();}
    const map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;
    assets={stoneGeo:new T.DodecahedronGeometry(.8,1),stoneMat:new T.MeshStandardMaterial({color:0x786e61,roughness:.96}),fireGeo:new T.SphereGeometry(.27,10,6),fireMat:new T.MeshBasicMaterial({color:0xffcf54}),haloGeo:new T.SphereGeometry(.4,8,5),haloMat:new T.MeshBasicMaterial({color:0xff5b0c,transparent:true,opacity:.48,depthWrite:false,blending:T.AdditiveBlending}),map};
    return assets;
  }
  function acidBatch(){
    if(trailBatch)return trailBatch;
    const capacity=ABILITY_CONFIG.spitter.maxActive,geometry=new T.BufferGeometry();
    const positions=new T.Float32BufferAttribute(new Float32Array(capacity*18),3);
    const colors=new T.Float32BufferAttribute(new Float32Array(capacity*24),4);
    const uv=new Float32Array(capacity*12);
    positions.setUsage(T.DynamicDrawUsage);colors.setUsage(T.DynamicDrawUsage);
    for(let slot=0;slot<capacity;slot++)for(let i=0;i<6;i++){
      const vertex=slot*6+i;colors.setXYZW(vertex,1,1,1,0);
      uv[vertex*2]=trailCorners[i][0]/1.6+.5;uv[vertex*2+1]=trailCorners[i][1]/1.6+.5;
    }
    geometry.setAttribute('position',positions);geometry.setAttribute('color',colors);
    geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setDrawRange(0,0);
    const Material=T.MeshBasicNodeMaterial&&env.TSL?T.MeshBasicNodeMaterial:T.MeshBasicMaterial;
    const material=new Material({map:resources().map,vertexColors:true,transparent:true,opacity:1,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    // This vendored WebGPU material reads only vertex RGB by default. Explicitly
    // multiply its normal mapped opacity by vertex alpha on either GPU backend.
    if(T.MeshBasicNodeMaterial&&env.TSL)material.opacityNode=env.TSL.attribute('color','vec4').a.mul(env.TSL.materialOpacity);
    material.userData.pooled=true;
    const mesh=new T.Mesh(geometry,material);mesh.name='spitter-acid-trail-batch';mesh.userData.enemyAbility=true;
    mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);
    trailBatch={mesh,geometry,positions,colors,capacity};return trailBatch;
  }
  function trailAlpha(slot,alpha){
    for(let i=0;i<6;i++)trailBatch.colors.setW(slot*6+i,alpha);
    trailBatch.colors.needsUpdate=true;
  }
  function shotMesh(kind){
    let mesh=shotPools[kind].pop();if(mesh){mesh.visible=true;return mesh;}
    const a=resources();mesh=new T.Group();mesh.name='zombie-'+kind;
    mesh.add(new T.Mesh(kind==='stone'?a.stoneGeo:a.fireGeo,kind==='stone'?a.stoneMat:a.fireMat));
    if(kind==='fireball'){const halo=new T.Mesh(a.haloGeo,a.haloMat);mesh.add(halo);}
    mesh.userData.enemyAbility=true;scene.add(mesh);return mesh;
  }
  function releaseShot(i){const s=shots[i];s.mesh.visible=false;shotPools[s.kind].push(s.mesh);shots.splice(i,1);}
  function releaseTrail(i){
    const p=trails[i];trailAlpha(p.slot,0);trailPool.push(p);trails.splice(i,1);
    if(!trails.length){trailBatch.mesh.visible=false;trailBatch.geometry.setDrawRange(0,0);}
  }
  function clear(){
    // A hit can synchronously enter the Training infirmary and call clear while a
    // shot/trail loop is still on its stack. That entire old pass must stop.
    epoch++;
    while(shots.length)releaseShot(shots.length-1);while(trails.length)releaseTrail(trails.length-1);
    hurtAt=new WeakMap();states=new WeakMap();
    for(const z of env.actors()){z.abilityBusy=false;delete z.rangedAbility;if(z.mesh)updateZombieAbilityVisuals(z,clock,{});}
  }
  function actorState(z){
    let s=states.get(z);if(!s){s={trail:createAcidTrail(z.mesh.position),lineT:0,line:true,slot:0};
      if(z.typeKey==='demon'||z.typeKey==='colossus'){s.attack=createRangedAbility(z.typeKey);z.rangedAbility=s.attack;}
      states.set(z,s);
    }return s;
  }
  function poseState(s,fired=false){const a=s.attack;return a?{kind:a.kind==='demon'?'fireball':'stone',stage:fired?'release':a.stage,progress:a.stage==='windup'?a.elapsed/ABILITY_CONFIG[a.kind].windup:a.stage==='recovery'?a.elapsed/ABILITY_CONFIG[a.kind].recovery:0,slot:s.slot}:null;}
  function fire(z,s){
    const kind=z.typeKey==='demon'?'fireball':'stone';
    if(shots.length>=32)return;
    if(!getZombieAbilityLaunch(z,kind,launch))launch.copy(z.mesh.position).add(new T.Vector3(0,z.hitH*.7,0));
    const distance=Math.hypot(s.aim.x-launch.x,s.aim.z-launch.z);
    const flight=kind==='stone'?1.0+distance*.018:.75+distance*.018;
    const gravity=kind==='stone'?8:3;
    const velocity=solveBallisticLaunch(launch,s.aim,flight,gravity),mesh=shotMesh(kind);
    mesh.position.copy(launch);
    const shot={kind,owner:z,mesh,x:launch.x,y:launch.y,z:launch.z,...velocity,gravity,age:0,radius:kind==='stone'?.8:.27,trail:0};
    shots.push(shot);counts[kind==='stone'?'stones':'fireballs']++;env.sound?.(z,kind==='stone'?'throw':'cast');
  }
  function dropTrail(p){
    const y=env.ground(p.x,p.z,p.y+.35);if(y==null||Math.abs(y-p.y)>1||env.wet?.(p.x,p.z,p.y))return;
    if(trails.length>=ABILITY_CONFIG.spitter.maxActive)releaseTrail(0);
    const batch=acidBatch(),record=trailPool.pop()||{slot:trailSlots.pop()};
    const angle=counts.trailDrops*2.39996,c=Math.cos(angle),s=Math.sin(angle);
    for(let i=0;i<6;i++){
      const [x,z]=trailCorners[i];batch.positions.setXYZ(record.slot*6+i,p.x+x*c-z*s,y+.025,p.z+x*s+z*c);
    }
    batch.positions.needsUpdate=true;trailAlpha(record.slot,.8);
    Object.assign(record,{mesh:batch.mesh,x:p.x,y,z:p.z,age:0});
    trails.push(record);counts.trailDrops++;batch.mesh.visible=true;batch.geometry.setDrawRange(0,batch.capacity*6);
  }
  function updateActor(z,dt,token){
    if(!z.mesh||!z.alive||!['demon','spitter','colossus'].includes(z.typeKey))return;
    const s=actorState(z),allowed=env.canAct(z);
    if(z.typeKey==='spitter'){
      if(allowed&&!z.inWater)for(const p of sampleAcidTrail(s.trail,z.mesh.position))dropTrail(p);
      else s.trail=createAcidTrail(z.mesh.position);
      return;
    }
    const target=env.target(z),position=target?.position,a=s.attack;
    if(!position){z.abilityBusy=false;return;}
    const d=Math.hypot(position.x-z.mesh.position.x,position.z-z.mesh.position.z);
    const parts=z.partsLost||{};
    const hands=z.typeKey==='colossus'?!parts.armL&&!parts.armR:!parts.armL||!parts.armR;
    const actionAllowed=allowed&&hands&&!(z.chargeT>0||z.chargeWind>0||z.slamWind>0||z.attackWindup>0||z.swingT>0);
    s.lineT-=dt;
    if(s.lineT<=0&&(a.stage==='windup'||d<=ABILITY_CONFIG[z.typeKey].maxDistance)){
      s.lineT=.2;from.copy(z.mesh.position);from.y+=(z.hitH||2)*.65;
      aim.copy(position);aim.y+=.9;
      s.line=collision.lineClear(from,aim,.12);
    }
    const event=stepRangedAbility(a,dt,{distance:d,canAct:actionAllowed,hasLine:s.line,blocked:shots.length>=32});
    if(event.started){s.aim={x:position.x,y:position.y+.9,z:position.z};s.slot=a.shots%3;env.sound?.(z,'windup');if(!live(token))return;}
    z.abilityBusy=a.stage==='windup'||a.stage==='recovery';
    if(z.abilityBusy){env.preparePose?.(z);if(!live(token))return;}
    if(z.abilityBusy&&s.aim)z.mesh.rotation.y=Math.atan2(s.aim.x-z.mesh.position.x,s.aim.z-z.mesh.position.z);
    // Place the release pose before sampling its actual hand/stone launch anchor.
    updateZombieAbilityVisuals(z,clock,poseState(s,event.fired));
    if(event.fired)fire(z,s);
  }
  function updateShots(dt,token){
    for(let i=shots.length-1;i>=0;i--){
      const s=shots[i];let remaining=dt,ended=false;
      // The curved arc is swept in short slices even on a slow frame.
      while(remaining>1e-8&&!ended){
        const h=Math.min(.04,remaining),a={x:s.x,y:s.y,z:s.z};stepBallistic(s,h,s.gravity);remaining-=h;
        const b={x:s.x,y:s.y,z:s.z};let hit=collision.trace(a,b,s.radius),victim=null;
        const players=env.players((a.x+b.x)*.5,(a.z+b.z)*.5,Math.hypot(b.x-a.x,b.z-a.z)*.5+s.radius+1.2);
        for(const p of players){
          const height=env.playerHeight?.(p)||1.7;
          for(let y=.25;y<=height;y+=.4){
            const t=sweptSphereHit(a,b,{x:p.position.x,y:p.position.y+y,z:p.position.z},s.radius+(env.playerRadius||.4));
            if(t!==null&&(!hit||t<hit.t)){hit={t};victim=p;}
          }
        }
        if(hit){
          const p={x:a.x+(b.x-a.x)*hit.t,y:a.y+(b.y-a.y)*hit.t,z:a.z+(b.z-a.z)*hit.t};
          if(victim){counts.directHits++;env.damage(victim,s.kind==='stone'?colossusImpactDamage(victim.maxHp||100):24,s.kind==='stone'?'colossus':'demon',s.owner);}
          else{counts.blocked++;if(hit.build)env.damageBuild?.(hit.build,s.kind==='stone'?80:20);}
          if(!live(token))return;
          env.impact?.(s.kind,p,!!victim);if(!live(token))return;ended=true;
        }
        if(s.age>6)ended=true;
      }
      if(ended){releaseShot(i);continue;}
      s.mesh.position.set(s.x,s.y,s.z);s.mesh.rotation.x+=dt*2.4;s.mesh.rotation.z+=dt*1.7;
      if(s.kind==='fireball'){s.trail-=dt;if(s.trail<=0){s.trail=.075;env.fireMote?.(s);if(!live(token))return;}}
    }
  }
  function updateTrails(dt,token){
    for(let i=trails.length-1;i>=0;i--){
      const p=trails[i];p.age+=dt;if(p.age>=ABILITY_CONFIG.spitter.life){releaseTrail(i);continue;}
      trailAlpha(p.slot,.8*Math.min(1,(ABILITY_CONFIG.spitter.life-p.age)/1.3));
      for(const target of env.players(p.x,p.z,ABILITY_CONFIG.spitter.radius+(env.playerRadius||.4))){
        if(Math.abs(target.position.y-p.y)>.55||clock<(hurtAt.get(target)||0))continue;
        hurtAt.set(target,clock+.4);counts.acidHits++;env.damage(target,4,'acid',null);if(!live(token))return;
        env.acidMote?.(p);if(!live(token))return;
      }
    }
  }
  return{
    update(dt){
      const next=env.domain();if(next!==domain){clear();domain=next;}
      if(!env.active()||!(dt>0)||!Number.isFinite(dt))return;
      const token=epoch;
      clock+=dt;
      for(const z of env.actors())if(env.inDomain(z)){updateActor(z,dt,token);if(!live(token))return;}
      updateShots(dt,token);if(!live(token))return;updateTrails(dt,token);
    },
    clear,
    read:()=>({clock,domain,shots:shots.length,trails:trails.length,counts:{...counts},pools:{fireballs:shotPools.fireball.length,stones:shotPools.stone.length,trails:trailPool.length}})
  };
}
