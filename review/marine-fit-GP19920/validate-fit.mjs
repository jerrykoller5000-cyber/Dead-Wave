import fs from 'node:fs';import path from 'node:path';import{Engine}from'../../tools/camera.mjs';
const out=path.resolve('review/marine-fit-GP19920/validated');fs.mkdirSync(out,{recursive:true});
const E=new Engine({inspect:true,warm:'none',size:'1440x1000'});
const ev=s=>E.ev(s);
async function shot(name,view='three',move){await E.run({cmd:'shot',target:'marine',view,move,out:path.join(out,name+'.png')});const d=await ev('return DWInspect.shot();');fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(d.split(',')[1],'base64'));}
try{await E.open();console.log('ready',E.loadSec);
await ev(`await DWInspect.show('marine');await DWInspect.marine.preset('full');await DWInspect.marine.play('stand');await wait(500);DWInspect.pause();return true;`);
const checks=await ev(`const {carryBounds}=await import('/ui/marine-kit-fit.js');const TH=T.THREE,m=T.getMarine(),out=[];
for(const primary of ['m4','ak','aa12','shotgun','sniper','launcher','flamer','chainsaw','minigun'])for(const secondary of ['pistol','revolver','uzi']){
 const o={loadout:{primary:[primary,'m4'],secondary:[secondary,null]},dualOwned:{[secondary]:true},inHand:null,akimbo:false,grenades:3,vest:true};
 const rig=T.carryPreview(m,o);m.updateWorldMatrix(true,true);
 const bounds=rig.holsters.concat(rig.pairs).filter(h=>h.g.visible&&h.gun).map(h=>({kind:h.kind,z:carryBounds(TH,h).max.z}));
 const before=rig.holsters[0].g.position.toArray(),shell=rig.holsters[0].shell;
 T.carryPreview(m,{...o,inHand:secondary,akimbo:true});
 const after=rig.holsters[0].g.position.toArray();
 out.push({primary,secondary,packClear:bounds.every(b=>b.z<=-.34499),bounds,emptyShift:Math.hypot(...after.map((v,i)=>v-before[i])),hollow:secondary==='uzi'||!!shell?.userData.fittedHolster});
}
T.carryPreview(m,{loadout:{primary:['minigun','m4'],secondary:['revolver','uzi']},dualOwned:{revolver:true,uzi:true,pistol:true},inHand:null,grenades:3,vest:true});
return out;`);
console.log(JSON.stringify(checks));
await shot('back','back');await shot('helmet','three',{zoom:2.8,pan:[0,.5]});await shot('holster','left',{zoom:3,pan:[0,-.25]});
await ev(`await DWInspect.marine.preset('hot');await DWInspect.marine.play('stand');DWInspect.play();await wait(350);DWInspect.pause();return true;`);
await shot('wrist','front',{zoom:2.8,pan:[.28,-.1]});
const poses=[];
for(const move of ['walk','run','crouch','smoke']){await ev(`await DWInspect.marine.play('${move}');DWInspect.play();await wait(900);DWInspect.pause();return true;`);await shot(move,move==='smoke'?'three':'left',move==='smoke'?{zoom:2.4,pan:[0,.4]}:undefined);poses.push(await ev(`const m=T.getMarine(),bad=[];m.traverse(o=>{if(!o.position.toArray().concat(o.quaternion.toArray()).every(Number.isFinite))bad.push(o.name);});return {move:'${move}',bad};`));}
fs.writeFileSync(path.join(out,'proof.json'),JSON.stringify({loadSec:E.loadSec,checks,poses,errors:await ev('return DWInspect.errors();')},null,2));
}finally{await E.close();}
