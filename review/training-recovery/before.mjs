import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const engine=new Engine({training:true,warm:'none',size:'1440x900'});
try {
 await engine.open();
 const cam={x:-37.2,y:-196.7,z:-646.8,tx:-40.6,ty:-199.05,tz:-650,fov:42};
 await engine.run({cmd:'shot',target:'player',cam,out:'review/training-recovery/before-bed.png',pre:'T.trainingDbg.blackout(); await wait(1500);'});
 await engine.run({cmd:'eval',code:'await wait(2000); return true;'});
 const result=await engine.run({cmd:'eval',code:`
 R.release(); const D=T.trainingDbg,tg=D.tg(),t=tg.targets[0],b=t.box;
 T.player.position.set((b.minX+b.maxX)/2,tg.floorY,b.minZ-.8);T.setAimYawDbg(0);T.setKnifeCd(0);T.knifeAttack();
 const melee=t.state;T.explodeGrenade({pos:new T.THREE.Vector3((b.minX+b.maxX)/2,tg.floorY+.2,b.minZ+.2),mesh:new T.THREE.Group(),defense:true,damage:1});
 return {melee,blast:t.state,hits:D.state().hits};`});
 fs.writeFileSync('review/training-recovery/before-proof.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
 await engine.run({cmd:'shot',target:'player',cam:{x:9,y:-194,z:-640,tx:3,ty:-198.8,tz:-628,fov:48},out:'review/training-recovery/before-targets.png'});
}finally{await engine.close();}
process.exit(0);
