import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const before=process.argv.includes('--before'),label=before?'before':'after',expected=before?1.6:.8;
const E=new Engine({training:true,warm:'none',size:'1440x900'});
const cam={x:8,y:-188,z:-641,tx:0,ty:-199,tz:-640,fov:50};
try {
 await E.open();
 await E.run({cmd:'shot',target:'player',cam,out:`review/grenade-charge/${label}-setup.png`,pre:`R.release();T.trainingDbg.clear();T.player.position.set(0,-200,-643);T.setGrenadesDbg(4);T.setAimYawDbg(0);T.aimTarget.set(0,-200,-628);T.renderer.domElement.dispatchEvent(new PointerEvent('pointerleave',{bubbles:true}));await wait(800);`});
 const result=await E.run({cmd:'eval',timeout:30000,code:`
 const checks=[],ok=(v,m)=>{checks.push({pass:!!v,what:m});if(!v)throw Error(m);};
 const until=async f=>{const end=performance.now()+4000;while(!f()&&performance.now()<end)await wait(5);ok(f(),'condition reached');};
 const D=T.grenadeArcDbg,A=T.grenadeAnimDbg;
 ok(T.GRENADE_THROW.FULL_S===${expected},'full charge setting is ${expected} seconds');
 const s0=T.getSimTime();document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyG',bubbles:true}));ok(D().charging,'G starts charge');
 await until(()=>D().t>=.8);const atEight={t:D().t,speed:T.grenadeThrowSpeed(D().t),hit:D().hit};
 T.renderer.render(T.scene,T.camera);const png=T.renderer.domElement.toDataURL('image/png');
 await until(()=>D().t>=T.GRENADE_THROW.FULL_S);const full={elapsed:T.getSimTime()-s0,t:D().t,speed:T.grenadeThrowSpeed(D().t),hit:D().hit};
 ok(Math.abs(full.elapsed-${expected})<.08,'actual charge saturates within one-frame tolerance');ok(full.speed.h===17&&full.speed.vy===7.5,'full throw strength unchanged');
 await wait(200);ok(D().t===${expected},'holding longer remains capped');
 const n=D().n,release=T.getSimTime();document.body.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyG',bubbles:true}));await until(()=>D().n===n-1);
 const thrown={...D().last,releaseDelay:T.getSimTime()-release};ok(thrown.h===17&&thrown.vy===7.5&&thrown.charge===${expected},'released grenade uses full preview strength');ok(!D().charging&&!D().visible,'release clears charge and preview');
 await until(()=>A().phase==='');await wait(700);const nt=D().n;document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyG',bubbles:true}));document.body.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyG',bubbles:true}));await until(()=>D().n===nt-1);ok(D().last.h===4&&D().last.vy===4.5,'tap remains a short lob');
 return {checks,atEight,full,thrown,png};`});
 assert(result.ok,result.error);const {png,...proof}=result.value;
 fs.writeFileSync(`review/grenade-charge/${label}-at-0.8s.png`,Buffer.from(png.split(',')[1],'base64'));
 fs.writeFileSync(`review/grenade-charge/${label}-proof.json`,JSON.stringify({...proof,cam,loadSeconds:E.loadSec,renderer:E.renderer},null,2)+'\n');
 console.log(JSON.stringify({label,checks:proof.checks.length,atEight:proof.atEight,full:proof.full,thrown:proof.thrown}));
} finally {await E.close();}
process.exit(0);
