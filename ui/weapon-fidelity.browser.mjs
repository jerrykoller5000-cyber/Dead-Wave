// GP-164: capture/audit through the repository's real-renderer camera service.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root='review/weapon-fidelity';
fs.mkdirSync(root,{recursive:true});
const builders=['makeMinigun','makeM4','makeAk','makeAa12','makePistol','makeUzi','makeShotgun','makeSniper','makeLauncher','makeChainsaw','makeRevolver','makeFlamer','makeKnife','makeMortarMesh','makeM240Mesh'];
const weapons=['pistol','revolver','uzi','m4','ak','aa12','shotgun','sniper','minigun','launcher','flamer','chainsaw','knife','machete','m240','m240Carried','mortar','mortarCarried'];
const hash=s=>createHash('sha256').update(s).digest('hex');
const extract=(s,n)=>{const m=s.match(new RegExp('    function '+n+'\\([^]*?\\n    \\}'));assert(m,n+' source boundary');return m[0];};
const sources=()=>{
 const s=fs.readFileSync('index.html','utf8');
 const out=Object.fromEntries(builders.map(n=>[n,hash(extract(s,n))]));
 if(phase==='after')for(const p of ['studio/weapon-sidearms.js','studio/weapon-longarms.js','studio/weapon-heavy.js'])if(fs.existsSync(p))out[p]=hash(fs.readFileSync(p));
 return out;
};
function write(p,o){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof o==='string'?o:JSON.stringify(o,null,2)+'\n','utf8');}
function cameraJob(job,name){
 const p=root+'/'+name+'.json';write(p,job);
 const r=spawnSync(process.execPath,['tools/camera.mjs','job',p],{encoding:'utf8',maxBuffer:16*1024*1024,windowsHide:true});
 write(root+'/'+name+'.log',(r.stdout||'')+(r.stderr||''));
 assert.equal(r.status,0,'camera job: '+(r.stderr||r.stdout));
 const out=JSON.parse(r.stdout);assert(!out.error,JSON.stringify(out));return {value:out};
}
const cmd=process.argv[2]||'snapshot',phase=process.argv[3]||'before';
assert(['before','after'].includes(phase));
if(cmd==='snapshot'){
 const s=fs.readFileSync('index.html','utf8');
 const p=root+'/baseline-index.html';assert(!fs.existsSync(p),'baseline already exists; do not replace');
 fs.writeFileSync(p,s,{encoding:'utf8',flag:'wx'});
 write(root+'/baseline-constructors.json',Object.fromEntries(builders.map(n=>[n,extract(s,n)])));
 write(root+'/baseline-source-hashes.json',{at:new Date().toISOString(),index:hash(s),builders:Object.fromEntries(builders.map(n=>[n,hash(extract(s,n))]))});
 console.log('Saved untouched weapon constructors and index recovery snapshot.');
}else if(cmd==='job'){
 const shots=weapons.flatMap(w=>['side','three'].map(view=>({target:'weapon:'+w,view,time:'noon',size:'1024x768',margin:1.25,out:root+'/'+phase+'/'+w+'-'+view+'.png'})));
 if(phase==='after')for(const s of shots){const p=root+'/before/'+s.target.split(':')[1]+'-'+s.view+'.json';if(fs.existsSync(p)){s.cam=JSON.parse(fs.readFileSync(p,'utf8')).cam;}}
 write(root+'/'+phase+'-job.json',{shots,out:root+'/'+phase,cols:4,tile:360,sheet:true});
 console.log('Ready: '+root+'/'+phase+'-job.json');
}else if(cmd==='audit'){
 const start=sources();
 const code=`
 // The shared baseline camera had already initialized the optional mod shells.
 // Initialize the same hidden shells after a fresh reload before comparing refs.
 T.fitWeaponMod('pistol',null);
 const V=()=>new T.THREE.Vector3(), inv=new T.THREE.Matrix4();
 function metrics(g){
   g.updateWorldMatrix(true,true);inv.copy(g.matrixWorld).invert();
   const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity],v=V();let meshes=0,triangles=0,finite=true;
   const effects=new Set([g.userData.flash,g.userData.flashLight,g.userData.laser]);
   g.traverse(o=>{if(!o.isMesh||effects.has(o))return;for(let q=o;q&&q!==g;q=q.parent)if(!q.visible)return;
     const p=o.geometry?.attributes?.position;if(!p)return;
     const mat=new T.THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);meshes++;triangles+=(o.geometry.index?.count||p.count)/3;
     for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mat);const a=v.toArray();finite&&=a.every(Number.isFinite);for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],a[j]);hi[j]=Math.max(hi[j],a[j]);}}
   });return {meshes,triangles,finite,bounds:{min:lo,max:hi}};
 }
 function state(g){const refs={},values={};for(const [k,v] of Object.entries(g.userData)){
   if(['flash','flashLight','laser'].includes(k))continue;
   if(v?.isObject3D)refs[k]={type:v.type,position:v.position.toArray(),quaternion:v.quaternion.toArray(),scale:v.scale.toArray()};
   else if(v?.isVector3||v?.isEuler)values[k]=v.toArray();
   else if(typeof v==='number'||typeof v==='boolean'||typeof v==='string'||v===null)values[k]=v;
   else if(Array.isArray(v)&&v.every(x=>x?.isObject3D))refs[k]=v.map(x=>({type:x.type,position:x.position.toArray(),quaternion:x.quaternion.toArray(),scale:x.scale.toArray()}));
 }return {refs,values,...metrics(g)};}
 const guns=Object.fromEntries(Object.entries(T.weaponMeshes).map(([k,g])=>[k,state(g)]));
 const kn=T.knifeMesh();for(const k of ['knifeModel','macheteModel'])guns[k]=state(kn.userData[k]);
 const carried=T.m240VisDbg().carriedGun;guns.m240Carried=state(carried);
 const mt=carried.parent.children.find(o=>o!==carried&&Math.abs(o.scale.x-.78)<.001&&Math.abs(o.position.y-1.06)<.001);if(mt)guns.mortarCarried=state(mt);
 const deployed={};for(const k of ['m240','mortar']){const b=T.spawnBuild(k,500,500);deployed[k]=state(b.mesh);}
 return {guns,deployed,size:T.getWeaponSizeDbg(),holds:T.getShoulderDbg().holds,renderer:R.renderer()};`;
 const r=cameraJob({cmd:'eval',code},phase+'-audit-job');
 const end=sources();assert.deepEqual(end,start,'weapon sources changed during audit');
 write(root+'/'+phase+'-audit.json',{at:new Date().toISOString(),sources:start,...r.value});
 assert(Object.values(r.value.guns).every(x=>x.finite),'finite weapon geometry');
 if(phase==='after'){
   const old=JSON.parse(fs.readFileSync(root+'/before-audit.json','utf8'));
   assert.deepEqual(r.value.size,old.size,'weapon sizes and carry settings unchanged');assert.deepEqual(r.value.holds,old.holds,'grip anchors unchanged');
   for(const [k,g] of Object.entries(old.guns))for(const [ref,value]of Object.entries(g.refs))assert.deepEqual(r.value.guns[k].refs[ref],value,k+' animated reference '+ref);
 }
 console.log('PASS '+phase+' geometry, anchors, animated refs and source stability.');
}else if(cmd==='studio'){
 const code=`const Q=T.THREE,base=new Q.Vector3(-40,T.sampleHeight(-40,-70)+34,-70);
  T.fitWeaponMod('pistol',null);
  // Camera's generic bare() exposes all children, including the reload-only shell.
  // Reapply those source visibilities to its clones for these static review photos.
  const photoAim=R.aim;R.aim=async req=>{const meta=await photoAim(req),src=T.weaponMeshes[req.target?.split(':')[1]];
   if(src)for(const g of T.scene.children.filter(x=>x.visible&&x.position.distanceTo(base)<.001))for(const key of ['reloadShell','heavyLook','tubeExt']){
    const part=src.userData[key];if(!part||part.visible)continue;const path=[];let o=part;
    while(o&&o!==src){if(!o.parent)break;path.unshift(o.parent.children.indexOf(o));o=o.parent;}
    if(o!==src)continue;let clone=g;for(const i of path)clone=clone?.children[i];if(clone)clone.visible=false;
   }return meta;};
  // A plain scene background avoids the photo sphere's shadow artifact on back-side materials.
  for(const o of T.scene.children)if(!o.isLight)o.visible=false;
  T.scene.background.setHex(0x73818b);
  const fill=new Q.HemisphereLight(0xdde9f4,0x746a59,1.6);T.scene.add(fill);
  const key=new Q.DirectionalLight(0xfff0dc,2.5);key.position.copy(base).add(new Q.Vector3(4,6,4));key.target.position.copy(base);T.scene.add(key,key.target);
  return {background:'world hidden for review; plain scene background',lighting:'game sunlight plus photo fill',renderer:R.renderer()};`;
 cameraJob({cmd:'eval',code},'studio-light-job');
 const shots=weapons.flatMap(w=>['side','three','threeR'].map(view=>({target:'weapon:'+w,view,time:'noon',size:'1200x900',margin:1.15,out:root+'/studio/'+w+'-'+view+'.png'})));
 write(root+'/studio-job.json',{shots,out:root+'/studio',cols:3,tile:440,sheet:true});
 console.log('Ready: '+root+'/studio-job.json (temporary review lighting; reset by reload).');
}else if(cmd==='preview'){
 const names={pistol:'Pistol',revolver:'Revolver',uzi:'Uzi',m4:'M4',ak:'AK',aa12:'AA-12',shotgun:'Shotgun',sniper:'Sniper',minigun:'Minigun',launcher:'Launcher',flamer:'Flamer',chainsaw:'Chainsaw',knife:'Knife',machete:'Machete',m240:'M240',mortar:'Mortar'};
 write(root+'/preview-job.json',{shots:Object.entries(names).map(([w,name])=>({target:'weapon:'+w,view:['m240','mortar','revolver'].includes(w)?'threeR':'three',time:'noon',size:'1200x900',margin:1.15,caption:name,out:root+'/preview/'+w+'.png'})),out:root+'/preview',cols:4,tile:440,sheet:true});
 console.log('Ready: '+root+'/preview-job.json');
}else if(cmd==='performance'){
 const start=sources();
 const reload=spawnSync(process.execPath,['tools/camera.mjs','reload'],{encoding:'utf8',windowsHide:true});assert.equal(reload.status,0,reload.stderr);
 const code=`
  R.release();const errors=[];window.addEventListener('error',e=>errors.push(e.message));
  document.getElementById('playerName').value='Weapon performance';document.getElementById('modeTraining').click();
  for(let i=0;i<600&&(!T.trainingDbg.state().active||document.getElementById('trainingBlackout')?.classList.contains('on'));i++)await wait(100);
  const tg=T.trainingDbg.tg(),O=tg.origin;T.clearZombies();T.runDevCommand('godmode');T.grantAllWeapons();
  T.player.position.set(O.x-17,tg.floorY,O.z+12);T.aimTarget.set(O.x-17,tg.floorY+1.2,O.z);
  for(let i=0;i<48;i++){const z=T.spawnZombie(O.x-24+(i%8)*2,O.z-7+Math.floor(i/8)*2.4,['shambler','feral','military','drowned','spitter','bomber'][i%6],true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;}
  T.setShotView({x:O.x-17,y:tg.floorY+23,z:O.z+25,tx:O.x-17,ty:tg.floorY+1,tz:O.z,fov:45});
  const states={};
  for(const w of ['pistol','m4','minigun']){T.setWeapon(T.WEAPON_ORDER.indexOf(w));await wait(2500);T.resetPerf();const samples=[];for(let i=0;i<4;i++){await wait(1250);samples.push(T.perfSnapshot());}states[w]={samples,meanFps:samples.reduce((s,x)=>s+x.fps,0)/samples.length,render:{...T.renderer.info.render}};}
  const onScreen=T.zombies.filter(z=>{const v=z.mesh.getWorldPosition(new T.THREE.Vector3());v.y+=.8;v.project(T.camera);return z.alive&&z.mesh.visible&&Math.abs(v.x)<1&&Math.abs(v.y)<1&&v.z<1;}).length;
  return {states,onScreen,renderer:R.renderer(),errors};`;
 const r=cameraJob({cmd:'eval',code,timeout:180000},phase+'-performance-job').value;
 assert.deepEqual(sources(),start,'source stable through performance');write(root+'/'+phase+'-performance.json',{sources:start,...r});
 assert.equal(r.onScreen,48,'48 on-screen bodies');assert.deepEqual(r.errors,[]);
 console.log('PASS '+phase+' 48 visible bodies, '+Object.entries(r.states).map(([k,v])=>k+' '+v.meanFps.toFixed(1)+' fps').join(', '));
}else if(cmd==='behavior'){
 const start=sources(),prior=fs.existsSync(root+'/'+phase+'-behavior.json')?JSON.parse(fs.readFileSync(root+'/'+phase+'-behavior.json','utf8')):null,results=prior?.results||{};
 for(const result of Object.values(results))result.sources??=prior.sources;
 const names=(process.argv[4]||'t188,t189,t217,t218,t221,t224').split(',');
 for(const name of names){
  assert(/^t\d+$/.test(name));
  let reload;for(let attempt=0;attempt<6;attempt++){reload=spawnSync(process.execPath,['tools/camera.mjs','reload'],{encoding:'utf8',windowsHide:true});if(reload.status===0)break;await new Promise(r=>setTimeout(r,3000));}assert.equal(reload.status,0,reload.stderr);
  const testSources=sources();
  const code=`
   R.release();window.weaponAuditErrors=[];window.addEventListener('error',e=>weaponAuditErrors.push({message:e.message,file:e.filename,line:e.lineno}));
   document.getElementById('playerName').value='Weapon fidelity';document.getElementById('modeHunt').click();
   for(let i=0;i<600&&(T.getPhase()!=='prep'||document.body.classList.contains('deploying'));i++)await wait(100);
   if(T.getPhase()!=='prep')throw Error('match not ready');await wait(400);
   window.startMatch=async()=>{};
   const result=await (0,eval)(${JSON.stringify(fs.readFileSync('tools/tests/'+name+'.js','utf8'))});
   return {result,errors:weaponAuditErrors,renderer:R.renderer()};`;
  const r=cameraJob({cmd:'eval',code,timeout:240000},phase+'-'+name).value;
  write(root+'/'+phase+'-'+name+'.txt',r.result);
  assert.deepEqual(sources(),testSources,'weapon sources changed during '+name);
  results[name]={sources:testSources,pass:(r.result.match(/^PASS /gm)||[]).length,fail:(r.result.match(/^FAIL /gm)||[]).length,skip:(r.result.match(/^SKIP /gm)||[]).length,errors:r.errors,renderer:r.renderer};
  const {sources:_recordedSources,...summary}=results[name];console.log(name+' '+JSON.stringify(summary));
  write(root+'/'+phase+'-behavior.json',{sources:start,results});
 }
 const end=sources();assert.deepEqual(end,start,'weapon sources changed during behavior checks');
 write(root+'/'+phase+'-behavior.json',{sources:start,results});
 console.log('Saved unchanged-source real-renderer behavior results.');
}else throw new Error('Unknown command '+cmd);
