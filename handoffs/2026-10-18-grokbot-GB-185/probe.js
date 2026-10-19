const THREE=T.THREE; const out={};
try{
for (let i=0;i<16&&T.getCurrentWeapon()!=='sniper';i++) T.setWeapon(i);
await new Promise(r=>setTimeout(r,1500));
const gun=T.weaponMeshes.sniper; T.setAmmoDbg('sniper',5); await new Promise(r=>setTimeout(r,800));
const list=()=>T.m240VisDbg().casingsList; const seen=new Set(list()); const found=[];
T.setMouseFireDbg(true); const w0=Date.now();
while(Date.now()-w0<6000 && found.length<2){ for(const c of list()) if(!seen.has(c)){seen.add(c); const q=gun.getWorldQuaternion(new THREE.Quaternion()).invert(); const v=new THREE.Vector3(c.vx,c.vy,c.vz).applyQuaternion(q); const p=gun.worldToLocal(c.mesh.position.clone()); found.push({age:+c.age.toFixed(3),local:[v.x,v.y,v.z].map(x=>+x.toFixed(2)),pos:[p.x,p.y,p.z].map(x=>+x.toFixed(2))});} await new Promise(r=>setTimeout(r,2)); if(Date.now()-w0>300) T.setMouseFireDbg(false);}
out.found=found; out.weapon=T.getCurrentWeapon();
}catch(e){out.err=String(e&&e.stack||e).slice(0,500);}
return JSON.stringify(out);
