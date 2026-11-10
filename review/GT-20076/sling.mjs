import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {save as writeFile} from './save.mjs';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';

const [phase,...selection]=process.argv.slice(2);
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after','trial','calibrate','seats'].includes(phase));
const folder=new URL('./sling/'+phase+'/',import.meta.url);
await mkdir(folder,{recursive:true});
const baseline=phase==='before'?{}:JSON.parse(await readFile(new URL('./sling/before/results.json',import.meta.url),'utf8'));
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try {
  const p=await browser.newPage({width:960,height:540});
  await p.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await p.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await p.evaluate('DWOpening.dismissForTesting()');
  assert(await p.waitFor('!DWOpening.active'));
  await p.evaluate("document.getElementById('playerName').value='Sling';document.getElementById('modeTraining').click()");
  assert(await p.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on") && Math.abs(TT.getWorldTime()-.5)<.02',{timeout:45000}));
  await p.evaluate(`TT.grantAllWeapons();TT.setViewFirstDbg(false);
    window.slingMarine=TT.makeMarine();
    slingMarine.position.set(30,80,-60);TT.scene.add(slingMarine);
    const style=document.createElement('style');style.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(style);`);
  if(phase==='seats')await p.evaluate(`(async()=>{
    const original=await(await fetch('/ui/weapon-sling.js')).text();
    const line='const anchors=faces.map';
    if(original.split(line).length!==2)throw Error('Missing sling seat selection');
    const code=original.replace(line,'if(window.candidateSeat)faces[window.candidateSeat.end]=window.candidateSeat.face; '+line);
    const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
    window.refitSeat=(await import(url)).fitWeaponSling;URL.revokeObjectURL(url);
  })()`);
  if(phase==='calibrate')await p.evaluate(`(async()=>{
    let source=await (await fetch('/ui/weapon-sling.js')).text();
    for(const [find,to] of [
      ['const lower=guide?at(...guide):at(.222,.89,-.19), shoulder=at(.205,1.155,-.135);','const lower=at(...window.routeFit.lower), shoulder=at(.205,1.155,-.135);'],
      ['f.out,.045','f.out,window.routeFit.lead'],
      ['    tangent.normalize();','    tangent.normalize().applyAxisAngle(out,(window.routeFit.roll?.[i]??0)*Math.PI/180);'],
      ['at(.235,.98,.115)','at(...window.routeFit.turn)']
    ]){if(source.split(find).length!==2)throw Error('Missing fitting parameter');source=source.replace(find,to);}
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    window.refitSling=(await import(url)).fitWeaponSling;URL.revokeObjectURL(url);
  })()`);
  const ids=selection.length?selection:['minigun','launcher','m4','ak','aa12','shotgun','sniper','flamer','chainsaw'];
  const result={};
  for(const id of ids){
    await p.evaluate(`(async()=>{
      for(let n=0;n<25 && TT.getCurrentWeapon()!=='${id}';n++){
        TT.setWeapon(TT.WEAPON_ORDER.indexOf('${id}'));await new Promise(r=>setTimeout(r,150));
      }
      if(TT.getCurrentWeapon()!=='${id}') throw Error('equip ${id}');
      for(let i=0;i<45;i++)TT.stepFrame(1/30);
    })()`);
    for(const vest of [false,true]){
      const rigs=await p.evaluate(`(async()=>{
        const {auditSling,makeSlingAudit}=await import('/tools/tests/weapon-seating.js');
        const m=slingMarine,spec={loadout:{primary:['${id}','${id}'],secondary:[null,null]},inHand:null,akimbo:false,vest:${vest},grenades:0};
        for(const [key,meshes] of Object.entries(m.userData.gearParts??{})){
          if(key==='vest' || key==='bareTorso')for(const mesh of meshes)mesh.visible=key==='vest'?spec.vest:!spec.vest;
        }
        const rig=TT.carryPreview(m,spec);window.currentSlingRig=rig;m.updateMatrixWorld(true);
        return rig.slings.map(spot=>{
          if('${phase}'==='calibrate'){
            const evaluate=makeSlingAudit(spot,1.8/1.655,.002);
            const original={lower:[.222,.89,-.19],turn:[.235,.98,.115],lead:.045};
            window.routeFit=original;spot.sling.userData.signature=null;
            refitSling(TT.THREE,spot,${vest},spot.sling.userData.clips[0].material);
            const score=r=>Number(r.nearWeb)+r.overlaps.filter(p=>p.sling==='web').length+100*r.ends.filter(e=>!e.webContact||!e.gunContact).length;
            let best={score:score(evaluate()),parameters:original},tried=0;
            const candidates=[];
            for(const dx of [0,-.03,-.06,.03])for(const dy of [0,-.07,.07])for(const dz of [0,-.05,.05])
              candidates.push({lower:[.222+dx,.89+dy,-.19+dz],turn:original.turn,lead:.045});
            for(const lead of [.02,.07,.10])candidates.push({...original,lead});
            for(const p of candidates){
              if(best.score===0)break;
              window.routeFit=p;spot.sling.userData.signature=null;
              refitSling(TT.THREE,spot,${vest},spot.sling.userData.clips[0].material);
              const r=evaluate(),s=score(r);tried++;
              if(s<best.score)best={score:s,parameters:p};
            }
            window.routeFit=best.parameters;spot.sling.userData.signature=null;
            refitSling(TT.THREE,spot,${vest},spot.sling.userData.clips[0].material);
            const roll=[0,0];
            for(let k=0;k<2;k++){
              const count=()=>evaluate().overlaps.filter(p=>p.sling==='clip'+(k+1)).length;
              let bestCount=count(),bestAngle=0;
              for(const angle of [15,-15,30,-30,45,-45,60,-60,75,-75,90]){
                if(!bestCount)break;
                roll[k]=angle;window.routeFit={...best.parameters,roll};spot.sling.userData.signature=null;
                refitSling(TT.THREE,spot,${vest},spot.sling.userData.clips[0].material);
                const n=count();if(n<bestCount){bestCount=n;bestAngle=angle;}
              }
              roll[k]=bestAngle;window.routeFit={...best.parameters,roll};spot.sling.userData.signature=null;
              refitSling(TT.THREE,spot,${vest},spot.sling.userData.clips[0].material);
            }
            return {...evaluate(),fit:best,roll,tried};
          }
          const {ends,overlaps}=auditSling(spot,1.8/1.655);
          const fit=spot.sling.userData.fit;
          const T=TT.THREE,model=spot.gun.children[0],targets=[];
          spot.gun.traverseVisible(mesh=>{if(mesh.isMesh)targets.push(mesh);});
          const query=fit.anchors.map(([x,y,z],i)=>{
            if(spot.kind==='minigun')return i===0?[x,.04,-.15]:[x,0,.14];
            if(spot.kind==='shotgun' && i===1)return [x,.035,.63];
            if(spot.kind==='launcher' && i===0)return [x,.015,-.25];
            if(spot.kind==='sniper' && i===1)return [x,.008,.42];
            return [x,y,z];
          });
          const inv=model.matrixWorld.clone().invert(), all=[];
          for(const m of targets) {
            const p=m.geometry.attributes.position,ix=m.geometry.index;
            for(let k=0;k<(m.isInstancedMesh?m.count:1);k++) {
              const xf=inv.clone().multiply(m.matrixWorld);
              if(m.isInstancedMesh){const inst=new T.Matrix4();m.getMatrixAt(k,inst);xf.multiply(inst);}
              for(let i=0;i<(ix?ix.count:p.count);i+=3){
                const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(xf));
                const t=new T.Triangle(...v); if(t.getArea()>1e-10)all.push(t);
              }
            }
          }
          if('${phase}'==='seats'){
            const examine=makeSlingAudit(spot,1.8/1.655);
            const end=spot.kind==='ak'?0:1;
            const metric=r=>r.overlaps.length+100*r.ends.filter(e=>!e.webContact||!e.gunContact).length;
            let best=metric(examine()),chosen=null,attempts=0;
            const [x,y,z]=fit.anchors[end],side=Math.sign(x);
            const offsets=[];
            for(const dy of [0,.005,-.005,.01,-.01,.02,-.02])for(const dz of [0,.006,-.006,.012,-.012,.024,-.024,.04,-.04])
              offsets.push([dy,dz]);
            offsets.sort((a,b)=>Math.hypot(...a)-Math.hypot(...b));
            for(const [dy,dz] of offsets){
              if(!best)break;
              const ray=new T.Ray(new T.Vector3(side*1.3,y+dy,z+dz),new T.Vector3(-side,0,0)),v=new T.Vector3();
              let hit=null,n=null;
              for(const t of all)if(ray.intersectTriangle(t.a,t.b,t.c,false,v) && (!hit || side*v.x>side*hit.x)){
                hit=v.clone();n=t.getNormal(new T.Vector3());
              }
              if(!hit || Math.abs(n.x)<.3 || Math.abs(hit.x-x)>.04)continue;
              if(side*n.x<0)n.negate();
              const face=[hit.x*side,hit.y,hit.z,n.x*side,n.y,n.z].map(x=>+x.toFixed(6));
              window.candidateSeat={end,face};spot.sling.userData.signature=null;
              refitSeat(T,spot,${vest},spot.sling.userData.clips[0].material);
              const s=metric(examine());attempts++;
              if(s<best){best=s;chosen=face;}
            }
            window.candidateSeat=chosen?{end,face:chosen}:null;spot.sling.userData.signature=null;
            refitSeat(T,spot,${vest},spot.sling.userData.clips[0].material);
            window.candidateSeat=null;
            return {...examine(),end,chosen,best,attempts};
          }
          const nearest=query.map(([x,y,z])=>{
            const side=Math.sign(x),goal=new T.Vector3(x,y,z),axis=new T.Vector3(-side,0,0),vertex=new T.Vector3();
            for(const [dy,dz] of [[0,0],[0,-.012],[0,.012],[-.015,0],[.015,0]]) {
              const origin=new T.Vector3(side*1.3,y+dy,z+dz),ray=new T.Ray(origin,axis);
              let point=null,normal=null;
              for(const t of all)if(ray.intersectTriangle(t.a,t.b,t.c,false,vertex) && (!point || side*vertex.x>side*point.x)) {
                point=vertex.clone();normal=t.getNormal(new T.Vector3());
              }
              if(point && Math.abs(normal.x)>.25) {
                if(side*normal.x<0)normal.negate();
                return {point:point.toArray(),normal:normal.toArray()};
              }
            }
            let best=null,distance=Infinity;
            for(const t of all){
              const n=t.getNormal(new T.Vector3());if(side*n.x<.6)continue;
              t.closestPointToPoint(goal,vertex);
              const d=goal.distanceToSquared(vertex);
              if(d<distance){distance=d;best={point:vertex.toArray(),normal:n.toArray()};}
            }
            return best;
          });
          return {ends,overlaps,anchors:fit.anchors,nearest,attachments:fit.attachments};
        });
      })()`,90000);
      for(const [i,rig] of rigs.entries())result[id+'-slot'+(i+1)+(vest?'-vest':'')]=rig;
      if(phase==='calibrate' || phase==='seats')continue;
      if(phase==='after' && (vest || id==='minigun')){
        const framing={x:30.82,y:81.24,z:-61.65,tx:30,ty:81.01,tz:-60.12,fov:37};
        await p.evaluate('TT.setShotView('+JSON.stringify(framing)+');new Promise(r=>setTimeout(r,180))');
        const shot=await p.send('Page.captureScreenshot',{format:'jpeg',quality:92});
        await writeFile(new URL(id+(vest?'-vest':'-shirt')+'-carry.jpg',folder),Buffer.from(shot.data,'base64'));
      }
      if(!vest || !(id==='minigun'||id==='m4'))continue;
      for(const [i,tag] of [[0,'rear'],[1,'front']]) {
        // Aim at the same authored mount each time, in the frame of the carried gun.
        // On the body-facing side the torso hides the junction, so isolate its actual carry assembly.
        const cam=await p.evaluate(`(()=>{
          const T=TT.THREE,m=slingMarine,s=currentSlingRig.slings[0];
          window.slingCopy=TT.cloneLean(s.g);
          const g=slingCopy;s.g.updateWorldMatrix(true,false);g.matrix.copy(s.g.matrixWorld);g.matrixAutoUpdate=false;
          TT.scene.add(g); m.visible=false;
          const mdl=s.gun.children[0],a=${JSON.stringify(baseline[id+'-slot1-vest']?.anchors||null)}?.[${i}]??s.sling.userData.fit.anchors[${i}],p=mdl.localToWorld(new T.Vector3(...a));
          const offset=new T.Vector3(Math.sign(a[0])*.18,.06,.055).transformDirection(mdl.matrixWorld).multiplyScalar(.20);
          return {x:p.x+offset.x,y:p.y+offset.y,z:p.z+offset.z,tx:p.x,ty:p.y,tz:p.z,fov:33};
        })()`);
        await p.evaluate('TT.setShotView('+JSON.stringify(cam)+');new Promise(r=>setTimeout(r,180))');
        const shot=await p.send('Page.captureScreenshot',{format:'jpeg',quality:92});
        await writeFile(new URL(id+'-'+tag+'.jpg',folder),Buffer.from(shot.data,'base64'));
        await p.evaluate('TT.scene.remove(slingCopy);slingMarine.visible=true;true');
      }
    }
  }
  await writeFile(new URL('results.json',folder),JSON.stringify(result,null,2)+'\n');
  const lines=Object.entries(result).map(([name,r])=>name+' '+r.ends.filter(e=>!e.gunContact).length+' loose clips, '+r.ends.filter(e=>!e.webContact).length+' loose strap ends, '+r.overlaps.length+' intersections');
  console.log(lines.join('\n'));
  assert.deepEqual(p.errors,[]);
  if(phase==='after' && Object.values(result).some(r=>r.ends.some(e=>!e.webContact||!e.gunContact)||r.overlaps.length))process.exitCode=1;
}finally{await browser.close();await server.close();}
