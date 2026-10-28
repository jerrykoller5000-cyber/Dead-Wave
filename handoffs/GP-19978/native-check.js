const D=T.trainingDbg;
if(!D?.state().active)throw new Error('Training Ground is not active');
const seen=[];
for(const [label,amount,kind,dir,zone] of [
  ['blast',50,'explosive',{x:1,z:0},null],
  ['left bullet',20,'bullet',{x:1,z:0},'left'],
  ['back bullet',20,'bullet',{x:0,z:1},'back'],
]){
  T.clearZombies();
  const z=T.spawnZombie(-35,-630,'brute',true,true);
  const plates=Object.keys(z.mesh.userData.brutePlates||{}).sort();
  if(plates.join(',')!=='back,front,left,right')throw new Error(label+': missing plate: '+plates);
  const hp=z.hp;
  T.damageZombie(z,amount,{kind,dir,bruteZone:zone,defense:true});
  const damage=hp-z.hp;
  if(!(damage>0))throw new Error(label+': no damage: '+hp+' -> '+z.hp);
  if(zone&&!(z.mesh.userData.bruteArmor[zone]<({left:30,back:40})[zone]))throw new Error(label+': correct plate did not wear');
  seen.push({label,plates,damage,armor:{...z.mesh.userData.bruteArmor}});
}
return seen;
