import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const E=new Engine({training:true,warm:'none',size:'1200x900'}),dir='review/wasp-akimbo-GP19894',tag=process.argv[2]||'before',proof={};
try {
 await E.open();
 await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.grantAllWeapons();if(T.isUnarmed())T.toggleHolster();T.player.position.set(-27,-200,-632);T.setVelDbg(0,0);window.dispatchEvent(new KeyboardEvent('keydown',{code:'F13',key:'F13',bubbles:true}));window.take=async(w)=>{for(let i=0;i<16&&T.getCurrentWeapon()!==w;i++)T.setWeapon(i);await wait(1200);};window.pin=()=>{T.aimTarget.set(-27,-198.7,-621);T.setAimYawDbg(0);};pin();window.aimer=setInterval(pin,16);`);
 proof.states=[];
 for(const w of ['uzi','pistol','revolver']) {
  await E.ev(`await take('${w}');`);
  for(const dual of [false,true]) {
   if(dual)await E.ev(`T.toggleDualWieldDbg();await wait(900);`);
   const result=await E.ev(`const m=T.getMarine(),ud=m.userData,H=T.getShoulderDbg().holds[T.getCurrentWeapon()],V=(...a)=>new T.THREE.Vector3(...a);m.updateMatrixWorld(true);const gun=T.weaponMeshes[T.getCurrentWeapon()],og=T.offhandMeshes[T.getCurrentWeapon()];const channels=['R','L'].map((s,i)=>{const g=i?og:gun,e=i?ud.elbowLG:ud.elbowRG,a=i?ud.armLG:ud.armRG;return {side:s,hand:T.handsDbg.gripPoint(s,V()).toArray(),grip:g.localToWorld(V(...H.grip)).toArray(),gap:T.handsDbg.gripPoint(s,V()).distanceTo(g.localToWorld(V(...H.grip))),shoulder:a.getWorldPosition(V()).toArray(),wrist:e.userData.wrist.getWorldPosition(V()).toArray(),scale:g.getWorldScale(V()).toArray()};});const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};const pieces={};for(const [k,v]of Object.entries(og.userData))if(v?.isObject3D)pieces[k]={type:v.type,inside:v===og||!!og.getObjectById(v.id),visible:visible(v),position:v.getWorldPosition(V()).toArray()};return {weapon:T.getCurrentWeapon(),dual:og.visible&&og.parent.visible,channels,pieces,carry:T.carryDbg(),wrist:T.handsDbg.wrist()};`);
   proof.states.push(result);
   await E.shoot({cam:{x:-23.8,y:-196.8,z:-628.8,tx:-27,ty:-199.05,tz:-632,fov:30},out:dir+'/'+tag+'-'+w+(dual?'-pair':'-single')+'.png'});
   if(dual)await E.ev(`T.toggleDualWieldDbg();await wait(300);`);
  }
 }
 proof.errors=E.page.errors;console.log(JSON.stringify(proof.states.map(s=>({weapon:s.weapon,dual:s.dual,gaps:s.channels.map(c=>c.gap),pieces:s.pieces,wrist:s.wrist}))));
}finally{fs.writeFileSync(dir+'/'+tag+'-proof.json',JSON.stringify({...proof,errors:E.page.errors},null,2));await E.close();}process.exit(0);
