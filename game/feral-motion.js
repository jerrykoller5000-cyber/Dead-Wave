// GP-198: Feral-only locomotion accents and short pose echoes. No combat state is changed.
const clamp = (x, a=0, b=1) => Math.max(a, Math.min(b, x));
const wrap = x => Math.atan2(Math.sin(x), Math.cos(x));
export const FERAL_BLUR = Object.freeze({ maxActors:8, maxDistance:26, echoes:3, life:.17, interval:.04 });

export function feralPose(time, phase, amount, turn=0) {
  const a=clamp(amount), cycle=((time% .72)+.72)% .72;
  // A double tic followed by a short recovery, rather than a regular sine-wave wobble.
  const tic=Math.exp(-Math.pow((cycle-.11)/.028,2))-.72*Math.exp(-Math.pow((cycle-.19)/.037,2));
  const side=Math.sin(time*2.3+phase*.13)>=0?1:-1;
  const snap=tic*side*(.25+.75*a), lean=clamp(turn,-1,1)*a;
  return { lean:a*(.13+Math.sin(phase*2)*.18), sway:-Math.sin(phase+.45)*.11*a-lean*.13,
    twist:Math.sin(phase)*.10*a+snap*.13, hips:Math.sin(phase)*.11*a, bounce:Math.pow(Math.abs(Math.cos(phase)),1.5)*.075*a, weight:-Math.sin(phase)*.055*a,
    headBob:Math.sin(phase*2+1)*.14*a+tic*.10,
    headLoll:Math.sin(time*3)*.035+snap*.27,
    // GP-19849: elbows fold/release independently; shoulders fling forward and out.
    armL:Math.sin(phase*2+.8)*.18*a+snap*.18,
    armR:Math.sin(phase*2+2.2)*.19*a-snap*.20,
    armXL:Math.sin(phase*1.5+.4)*.23*a+snap*.10,
    armXR:Math.sin(phase*1.5+2.1)*.25*a-snap*.12,
    elbowL:a*(.24+.32*(.5+.5*Math.sin(phase*1.5+.8)) + Math.abs(tic)*.16),
    elbowR:a*(.24+.34*(.5+.5*Math.sin(phase*1.5+2.4)) + Math.abs(tic)*.18) };
}


const clawMath=new WeakMap();
function mathFor(T){
  let q=clawMath.get(T);if(!q){q={parent:new T.Quaternion(),world:new T.Quaternion(),yaw:new T.Quaternion(),pitch:new T.Quaternion(),pronate:new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI),up:new T.Vector3(0,1,0),right:new T.Vector3(1,0,0)};clawMath.set(T,q);}return q;
}
export function resetFeralClaws(z){
  if(z.typeKey!=='feral')return;
  const u=z.mesh.userData;
  for(const arm of [u.armLG,u.armRG]){if(!arm)continue;arm.rotation.y=0;const el=arm.userData.elbowG;if(el){el.rotation.y=0;el.rotation.z=0;}}
  if(u.hips)u.hips.position.x=0;
}
export function applyFeralClaws(T,z,phase,amount){
  if(z.typeKey!=='feral'||!z.alive||z.farLod||z.crawling||z.hopping||z.riseT>0||z.knockT>0||z.windowClimb||z.hitReact>0||z.hitPartT>0)return;
  const u=z.mesh.userData;if(!u.hips||!u.torso)return;
  const q=mathFor(T),a=clamp(amount),wind=z.attackWindup>0,slash=z.swingT>0;
  const windU=wind?clamp(1-z.attackWindup/.22):0,slashU=slash?clamp(1-z.swingT/.28):0;
  for(const side of [-1,1]){
    const arm=side<0?u.armLG:u.armRG,lost=side<0?z.partsLost?.armL:z.partsLost?.armR;
    const el=arm?.userData.elbowG;if(!arm||!el||lost)continue;
    const beat=phase+(side>0?Math.PI:0),lead=side===(z.swingSide||1);
    let x=-.57+Math.sin(beat)*.18*a,spread=.48+Math.sin(beat+.6)*.11*a;
    let fingerYaw=side*(.26+Math.sin(beat*.7)*.08*a),fingerPitch=.07+Math.sin(beat)*.04*a;
    if(wind){x-=windU*.32;spread+=windU*.18;fingerYaw+=side*windU*.16;}
    if(slash){
      // Alternating wide rakes, from outside toward the target, without crossing the chest.
      const rake=Math.sin(Math.PI*clamp(slashU*(lead?1.3:1.05)));
      x=-.89+rake*(lead?.60:.37);spread=.66-rake*.22;
      fingerYaw=side*(.42-rake*.27);fingerPitch=.07+rake*.22;
    }
    arm.rotation.set(x,side*.14,side*spread,'XYZ');
    q.parent.copy(z.mesh.quaternion).multiply(u.hips.quaternion).multiply(u.torso.quaternion).multiply(arm.quaternion);
    q.yaw.setFromAxisAngle(q.up,z.mesh.rotation.y+fingerYaw);
    q.pitch.setFromAxisAngle(q.right,-Math.PI/2+fingerPitch);
    q.world.copy(q.yaw).multiply(q.pitch).multiply(q.pronate);
    // Sculpted palm/claw curl is local +Z; -Y points along the fingers. Compensate for
    // the whole shoulder chain so body lean/roll cannot turn the palms upward.
    el.quaternion.copy(q.parent).invert().multiply(q.world);
  }
}

export function motionIntensity(speed, angular) {
  return clamp(Math.max((speed-2.2)/2.1,(Math.abs(angular)-3.5)/8));
}

export function createFeralMotion({THREE:T, scene, actors, camera, active, inDomain=()=>true}) {
  const history=new WeakMap(), records=new Map();
  let enabled=true, clock=0;
  const eligible=z=>z.typeKey==='feral'&&z.alive&&z.mesh?.visible&&!z.farLod&&inDomain(z)&&
    !(z.riseT>0||z.knockT>0||z.getUpT>0||z.windowClimb||z.belowRiseT>0||z.crawling||z.hopping||z.sleeping||z.poiGuard&&!z.poiAwake);
  function release(z){
    const record=records.get(z);if(!record)return;
    for(const echo of record.echoes)for(const part of echo.parts){scene.remove(part.mesh);part.mesh.skeleton.dispose();part.mesh.material.dispose();}
    records.delete(z);
  }
  function make(z){
    const sources=(z.mesh.userData.skinMeshes||[]).filter(s=>s.visible).slice(0,2);
    if(!sources.length)return null; // ?skin=0 retains its original rendering, without rebuilding the rig.
    const echoes=[];
    for(let i=0;i<FERAL_BLUR.echoes;i++){
      const parts=sources.map(source=>{
        const bones=source.skeleton.bones.map(()=>{const b=new T.Bone();b.matrixAutoUpdate=false;return b;});
        const skeleton=new T.Skeleton(bones,source.skeleton.boneInverses.map(m=>m.clone()));
        const material=new T.MeshBasicMaterial({color:0xa0b391,vertexColors:true,transparent:true,opacity:0,depthWrite:false,side:T.FrontSide,toneMapped:false});
        const mesh=new T.SkinnedMesh(source.geometry,material);
        mesh.name='feral-motion-echo';mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;
        mesh.castShadow=false;mesh.receiveShadow=false;mesh.visible=false;
        mesh.userData.feralEcho=true;
        mesh.bind(skeleton,source.bindMatrix);scene.add(mesh);
        return {source,mesh,bones};
      });
      echoes.push({parts,age:FERAL_BLUR.life,strength:0});
    }
    const record={echoes,next:0,sample:0};records.set(z,record);return record;
  }
  function snapshot(z,record,strength){
    z.mesh.updateMatrixWorld(true);
    const echo=record.echoes[record.next];record.next=(record.next+1)%record.echoes.length;
    echo.age=0;echo.strength=strength;
    for(const part of echo.parts){
      part.mesh.matrix.copy(part.source.matrixWorld);
      for(let i=0;i<part.bones.length;i++){
        part.bones[i].matrix.copy(part.source.skeleton.bones[i].matrixWorld);
        part.bones[i].updateMatrixWorld(true);
      }
      part.mesh.updateMatrixWorld(true);part.mesh.skeleton.update();
    }
  }
  function clear(){for(const z of records.keys())release(z);}
  function update(dt){
    if(!(dt>0)||!Number.isFinite(dt))return;
    clock+=dt;
    if(!enabled||!active()){clear();return;}
    const candidates=[];
    for(const z of actors()){
      if(!eligible(z)){history.delete(z);continue;}
      const p=z.mesh.position, yaw=z.mesh.rotation.y, head=z.mesh.userData.head?.rotation;
      const prev=history.get(z);
      let speed=0,angular=0,turn=0;
      // Reset across a teleport or a skipped simulation interval; never streak across rooms.
      if(prev&&clock-prev.time<.15){
        const distance=Math.hypot(p.x-prev.x,p.z-prev.z);
        if(distance<1.5){speed=distance/dt;turn=wrap(yaw-prev.yaw)/dt;
          angular=Math.max(Math.abs(turn),head?Math.hypot(wrap(head.x-prev.hx),wrap(head.y-prev.hy),wrap(head.z-prev.hz))/dt:0);}
      }
      history.set(z,{x:p.x,z:p.z,yaw,hx:head?.x||0,hy:head?.y||0,hz:head?.z||0,time:clock,turn:clamp(turn/7,-1,1)});
      const distance=p.distanceToSquared(camera.position);
      if(distance<FERAL_BLUR.maxDistance**2)candidates.push({z,distance,strength:motionIntensity(speed,angular)});
    }
    candidates.sort((a,b)=>a.distance-b.distance);
    const selected=new Set(candidates.slice(0,FERAL_BLUR.maxActors).map(c=>c.z));
    for(const z of records.keys())if(!selected.has(z))release(z);
    for(const c of candidates.slice(0,FERAL_BLUR.maxActors)){
      const record=records.get(c.z)||(c.strength>.04?make(c.z):null);if(!record)continue;
      for(const echo of record.echoes){
        echo.age+=dt;
        const opacity=.22*echo.strength*Math.pow(clamp(1-echo.age/FERAL_BLUR.life),1.4);
        for(const part of echo.parts){part.mesh.visible=opacity>.008;part.mesh.material.opacity=opacity;}
      }
      record.sample-=dt;
      if(c.strength>.04&&record.sample<=0){snapshot(c.z,record,c.strength);record.sample=FERAL_BLUR.interval;}
    }
  }
  return { update,clear, turn:z=>history.get(z)?.turn||0,
    setEnabled(v){enabled=!!v;if(!enabled)clear();},
    state:()=>({enabled,actors:records.size,echoes:[...records.values()].reduce((n,r)=>n+r.echoes.filter(e=>e.parts.some(p=>p.mesh.visible)).length,0)}) };
}
