import fs from 'node:fs';import {Engine} from '../../tools/camera.mjs';
const phase=process.argv[2]||'before',dir='review/training-fit-GP19898',E=new Engine({training:true,warm:'none',size:'1400x900'});
try{await E.open();await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');T.player.position.set(-32,-200,-643);T.setVelDbg(0,0);`);
 for(const [name,cam]of[
 ['medical-left',{x:-34,y:-194,z:-641,tx:-42,ty:-198.7,tz:-647.4,fov:40}],
 ['medical-right',{x:-30,y:-193,z:-643,tx:-36,ty:-198.7,tz:-650.5,fov:40}],
 ['skull',{x:-37,y:-194,z:-639,tx:-43.1,ty:-198.4,tz:-643,fov:40}],
 ['keypad',{x:-13,y:-196.5,z:-646,tx:-8.2,ty:-198.6,tz:-649.8,fov:35}],
 ['pillar',{x:-39,y:-195.5,z:-637,tx:-43.5,ty:-197.5,tz:-640,fov:35}]
 ])await E.shoot({cam,out:dir+'/'+phase+'-'+name+'.png'});
 const perf=await E.ev(`T.trainingDbg.clear();for(let i=0;i<48;i++){const z=T.spawnZombie(-35+(i%8)*2.5,-630+Math.floor(i/8)*2,'shambler',true,true);z.trainingZ=true;z.riseT=0;z.mesh.position.y=-200;}T.player.position.set(-26,-200,-641);T.setShotView({x:-15,y:-176,z:-658,tx:-27,ty:-199,tz:-628,fov:48});await wait(1000);let times=[],last=performance.now();for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);let now=performance.now();times.push(now-last);last=now;}return {fps:1000/(times.reduce((a,b)=>a+b,0)/times.length),worst:Math.max(...times),hitches:times.filter(x=>x>50).length,alive:T.trainingDbg.alive(),render:T.renderer.info.render};`);
 fs.writeFileSync(dir+'/'+phase+'-proof.json',JSON.stringify({perf,errors:E.page.errors},null,2));console.log(JSON.stringify({phase,perf,errors:E.page.errors}));
}finally{await E.close();}process.exit(0);
