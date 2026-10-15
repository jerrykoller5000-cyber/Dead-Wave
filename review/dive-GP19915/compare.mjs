import fs from 'node:fs';import {Engine as Live} from '../../tools/camera.mjs';import {Engine as Before} from './camera-before.mjs';
const dir='review/dive-GP19915',source=fs.readFileSync(dir+'/native.mjs','utf8'),clockPart=source.slice(source.indexOf('let clock='),source.indexOf('try{')),clock=new Function('fs',`${clockPart};return clock;`)(fs);
for(const [tag,Engine]of [['before',Before],['after',Live]]){
 const E=new Engine({training:true,warm:'none',size:'1280x900'});
 try{await E.open();await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.grantAllWeapons();window.__S={x:0,y:-200,z:-645};window.__aimTarget=new T.THREE.Vector3(0,-198.5,-605);`);await E.page.evaluate(clock);await E.ev('await wait(100);__step(3);');await E.ev(source.match(/await E.ev\(`(window.prep=[\s\S]*?)`\);/)[1].replace("T.setWeapon(T.WEAPON_ORDER.indexOf(w));if(T.isUnarmed())T.toggleHolster();","if(T.isUnarmed())T.toggleHolster();T.setWeapon(T.WEAPON_ORDER.indexOf(w));"));
 await E.ev(`prep('m4');__key('KeyV',true);__key('KeyV',false);__step(90);photo();__step(1);`);await E.page.screenshot(`${dir}/${tag}-matched-flight.png`);
 await E.ev(`let n=0;while(T.diveDbg().phase==='air'&&n++<650)__step(1);__key('KeyW',true);__step(25);__key('KeyW',false);while(T.diveDbg().phase==='down'&&n++<850)__step(1);__step(6);photo();__step(1);`);await E.page.screenshot(`${dir}/${tag}-matched-recovery.png`);console.log('PASS',tag,'matched camera screenshots');
 }finally{await E.close();}
}process.exit(0);
