export function checkFinish(T,id){
 const gun=T.weaponMeshes[id],registry=T.getGunFurniture()[id],registered=new Set(registry);
 const eye=T.viewmodelDbg().gun.root,materials=new Set();
 for(const root of [gun,eye])root.traverse(m=>{
  if(m.isMesh)for(const mat of (Array.isArray(m.material)?m.material:[m.material])){
   if(!registered.has(mat)&&!mat.userData.weaponFinishRole)materials.add(mat);
  }
 });
 const state=m=>[m.color?.getHex(),m.map?.uuid||null,m.userData.gunPaintId||null];
 const before=new Map([...materials].map(m=>[m,state(m)]));
 const prior=T.armoryFinishDbg.list(id).current||'';
 try{
  if(!T.armoryFinishDbg.paint(id,'m81'))throw Error('M81 unavailable');
  for(let i=0;i<20;i++)T.stepFrame(1/30);
  for(const [mat,values] of before)if(JSON.stringify(state(mat))!==JSON.stringify(values))throw Error('Factory finish changed '+mat.name);
  if(!registry.length||!registry.some(m=>m.map))throw Error('No coated materials');
  const controls=gun.userData.controls||{};
  for(const [key,name] of Object.entries(controls)){
   if(!gun.getObjectByName(name)||!eye.getObjectByName(name))throw Error('Missing world/eye control '+key);
  }
  return {factoryMaterials:before.size,paintedMaterials:registry.length,controls:Object.keys(controls)};
 }finally{T.armoryFinishDbg.paint(id,prior);}
}
