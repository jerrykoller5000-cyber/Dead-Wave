(async()=>{
const T=TT,G=T.THREE;await startMatch(T,'GT20106 fittings');T.clearZombies();T.grantAllWeapons();T.setUnarmedDbg(false);T.setViewFirstDbg(true);T.flightHold(true);
const H=T.inspectHost(),ctx={...H.builders.weaponContext(),finishGun:g=>g};
const {makeMinigunModel}=await import('/studio/weapon-heavy.js'),{makeShotgunModel}=await import('/studio/weapon-longarms.js');
const mini=makeMinigunModel(ctx),drum=mini.getObjectByName('minigun drum shell'),panel=mini.children.find(o=>o.isMesh&&Math.abs(o.position.x-.105)<1e-8);
if(!drum||!panel)throw Error('drum/panel missing');const drumRows=[];
for(const ext of[false,true]){H.builders.gunExtLook(mini,'minigun',ext);mini.updateMatrixWorld(true);const a=new G.Box3().setFromObject(drum),b=new G.Box3().setFromObject(panel);drumRows.push({ext,drumMinX:a.min.x,panelMaxX:b.max.x,gap:a.min.x-b.max.x,root:mini.userData.mag.position.toArray(),rake:mini.userData.mag.rotation.z});}
let beforeCan;const pump=makeShotgunModel({...ctx,gunSuppressor:(g,k,key)=>{ctx.gunSuppressor(g,k,key);beforeCan=g.userData.suppressor?.clone(true);}}),u=pump.userData,can=u.suppressor;
pump.updateMatrixWorld(true);beforeCan.updateMatrixWorld(true);const box=o=>{const b=new G.Box3().setFromObject(o);return{min:b.min.toArray(),max:b.max.toArray()};},shell=can.getObjectByName('pump continuous suppressor tube and bands');
const roleNames=['moduleShell','rearCap','lightTube','laserTube','barrelMagazineClamp','lightLens','laserLens','windageDial'],roles=Object.fromEntries(roleNames.map(n=>[n,u.laserLightUnit.getObjectByName(n)?.material?.userData?.weaponFinishRole||null]));
const clamp=u.laserLightUnit.getObjectByName('barrelMagazineClamp'),boreRays=[];clamp.updateWorldMatrix(true,false);u.laserLightUnit.updateWorldMatrix(true,false);for(const[y,radius]of[[.018,.01555],[-.018,.01455]])for(let i=0;i<32;i++){const a=i*Math.PI/16,from=u.laserLightUnit.localToWorld(new G.Vector3(-.066+radius*Math.cos(a),y+radius*Math.sin(a),-.080)),direction=new G.Vector3(0,0,1).transformDirection(u.laserLightUnit.matrixWorld);const hits=new G.Raycaster(from,direction,0,.1).intersectObject(clamp).length;boreRays.push({y,angle:a,hits});}const pumpResult={boreRays,before:box(beforeCan),after:box(can),continuousShell:!!shell,laser:u.laserLensLocal.toArray(),light:u.lightLensLocal.toArray(),controls:u.controls,roles,button:u.lightSwitch?.position?.toArray()};
const step=n=>{for(let i=0;i<n;i++)T.stepFrame(1/60);};for(let i=0;i<20&&T.getCurrentWeapon()!=='flamer';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('flamer'));step(20);}step(120);const fuel=T.getAmmo(),startFuel=fuel.flamer,gun=T.weaponMeshes.flamer,frames=[{time:0,ammo:startFuel,angle:gun.userData.fuelNeedle.rotation.z}];
T.setMouseFireDbg(true);try{for(let i=1;i<=5;i++){step(12);frames.push({time:i*.2,ammo:fuel.flamer,angle:gun.userData.fuelNeedle.rotation.z});}}finally{T.setMouseFireDbg(false);}
return{drumRows,pump:pumpResult,fuel:frames};
})()
