import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const E=new Engine({training:true,warm:'none',size:'1440x900'});
try {
 await E.open();
 const result=await E.run({cmd:'eval',timeout:60000,code:`
 R.release();T.trainingDbg.clear();const key=(type,code)=>document.body.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true}));
 const checks=[],data=[],ok=(v,m)=>{checks.push({pass:!!v,what:m});if(!v)throw Error(m);};
 const until=async f=>{const end=performance.now()+5000;while(!f()&&performance.now()<end)await wait(10);ok(f(),'state reached');};
 key('keydown','Digit0');T.renderer.domElement.dispatchEvent(new PointerEvent('pointerleave',{bubbles:true}));
 const reset=async()=>{T.player.position.set(0,-200,-643);T.setVelDbg(0,0);T.setAimYawDbg(0);T.aimTarget.set(0,-198.9,-628);await wait(900);};
 const record=async duration=>{const list=[],start=T.getSimTime();while(T.getSimTime()-start<duration){await wait(10);const j=T.jumpFeelDbg(),u=T.getMarine().userData,p=T.player.position,gun=T.weaponMeshes[T.getShoulderDbg().w]||T.weaponMeshes.pistol;
 const soles=['L','R'].map(side=>{const ankle=u['ankle'+side+'G'];return ankle.localToWorld(new T.THREE.Vector3(0,-.104,0)).y-(-200);});
 list.push({t:T.getSimTime()-start,y:p.y+200,j,soles,dip:T.smoothDbg.pose().bodyDip});}return list;};
 await reset();let base=T.jumpFeelDbg().launches;const t0=T.getSimTime();key('keydown','Space');await wait(30);key('keyup','Space');let samples=await record(1.4);
 ok(T.jumpFeelDbg().launches===base+1,'a quick tap still produces one jump');ok(Math.max(...samples.map(s=>s.y))>.4,'tap has a real push-off instead of instant ankle hop');ok(T.jumpFeelDbg().grounded,'tap returns to ground');data.push({case:'tap',samples});
 await reset();base=T.jumpFeelDbg().launches;const spam=[];for(let i=0;i<24;i++){key('keydown','Space');await wait(35);key('keyup','Space');await wait(50);spam.push({t:T.getSimTime(),...T.jumpFeelDbg()});}
 const events=spam.filter((s,i,a)=>s.launches>(i?a[i-1].launches:base));const gaps=events.slice(1).map((s,i)=>s.t-events[i].t);
 ok(events.length>=2&&events.length<=3,'rapid presses are limited to deliberate jumps ('+events.length+')');ok(gaps.every(s=>s>.7),'rapid jumps leave time to absorb touchdown');data.push({case:'spam',events,gaps});await until(()=>T.jumpFeelDbg().grounded&&T.jumpFeelDbg().recover===0);
 await reset();key('keydown','KeyW');key('keydown','ShiftLeft');await wait(500);key('keydown','Space');samples=await record(1.3);key('keyup','Space');key('keyup','KeyW');key('keyup','ShiftLeft');
 ok(Math.max(...samples.map(s=>s.y))>1.5,'running jump retains full clearance');ok(samples.some(s=>s.j.recover>0&&s.dip<-.06),'running touchdown braces the hips');ok(samples.every(s=>s.soles.every(Number.isFinite)),'running feet remain finite');data.push({case:'run',samples});
 await until(()=>T.jumpFeelDbg().grounded&&T.jumpFeelDbg().recover===0);await reset();key('keydown','KeyC');await wait(650);key('keydown','Space');samples=await record(1.25);key('keyup','Space');key('keyup','KeyC');
 ok(Math.max(...samples.map(s=>s.y))>1.5,'jump from crouch retains clearance');ok(samples.some(s=>!s.j.grounded),'crouch jump leaves ground');data.push({case:'crouch',samples});await wait(900);
 await reset();key('keydown','Space');samples=await record(1.7);key('keyup','Space');const contacts=samples.filter(s=>s.j.grounded&&s.dip<-.06);
 ok(contacts.length>5,'landed compression has several frames');ok(contacts.every(s=>s.soles.every(h=>h>-.035&&h<.065)),'boot soles stay close to floor while absorbing stationary landing');ok(Math.min(...samples.map(s=>s.dip))<-.1,'landing has a visible hip compression');data.push({case:'feet',contacts});
 key('keyup','Digit0');T.resetPerf();await wait(2000);return {checks,data,perf:T.perfSnapshot()};`});
 assert(result.ok,result.error);fs.writeFileSync('review/marine-jump/accept-proof.json',JSON.stringify({...result.value,loadSeconds:E.loadSec,renderer:E.renderer},null,2)+'\n');console.log('PASS '+result.value.checks.length+' real input/landing checks; '+JSON.stringify(result.value.perf));
}finally{await E.close();}
process.exit(0);
