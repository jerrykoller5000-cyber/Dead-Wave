{
const THREE=T.THREE, V=()=>new THREE.Vector3(), f3=(n)=>(+n).toFixed(3), res=[];
T.clearZombies&&T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
const m=T.marine||window.worldMarine, ud=m.userData, R=T.reloadClipDbg, gp=T.handsDbg&&T.handsDbg.gripPoint;
const pin=()=>{const p=T.player.position; T.aimTarget.set(p.x,T.sampleHeight(p.x,p.z)+1.25,p.z+10);}; const aim=setInterval(pin,5); pin();
const holds=T.getShoulderDbg().holds;
const pouchOf=(sx)=>{const vest=ud.gearParts&&ud.gearParts.vest&&ud.gearParts.vest.some(o=>o.visible),piv=ud.torsoPivotY||0.7;return ud.torsoG.localToWorld(vest?V().set(0.12*sx,0.965-piv,0.25):V().set(0.115*sx,0.68-piv,0.19));};
for (const w of ['pistol','uzi','revolver']) {
  for(let i=0;i<16&&T.getCurrentWeapon()!==w;i++)T.setWeapon(i); await wait(2500);
  if(!(T.offhandMeshes[w]&&T.offhandMeshes[w].visible)){T.toggleDualWieldDbg(); await wait(1200);}
  T.setAmmoDbg(w,1); if(T.setMagazinesDbg&&T.magazinesDbg&&T.magazinesDbg(w))T.setMagazinesDbg(w,1,[99,99,99],1); T.startReload(); await wait(80);
  const guns=[T.weaponMeshes[w],T.offhandMeshes[w]], sx=[Math.sign(ud.armRG.position.x)||1,Math.sign(ud.armLG.position.x)||-1];
  for (const u of [0.16,0.2,0.24,0.6,0.66,0.7,0.74]) {
    R.hold(u); await wait(220); m.updateMatrixWorld(true);
    const i=u<0.5?0:1, g=guns[i]; g.updateMatrixWorld(true);
    const well=g.userData.mag?g.userData.mag.getWorldPosition(V()):g.getWorldPosition(V());
    const grip=g.localToWorld(V().fromArray(holds[w].grip)), palm=gp?gp(i?'L':'R',V()):V();
    const sh=(i?ud.armLG:ud.armRG).getWorldPosition(V());
    res.push(`${w} ${i?'L':'R'} u${u}: well-pouch ${f3(well.distanceTo(pouchOf(sx[i])))} palm-grip ${f3(palm.distanceTo(grip))} shoulder-pouch ${f3(sh.distanceTo(pouchOf(sx[i])))} sx ${sx[i]} wellT ${ud.torsoG.worldToLocal(well.clone()).toArray().map(f3)} pouchT ${ud.torsoG.worldToLocal(pouchOf(sx[i])).toArray().map(f3)}`);
  }
  R.hold(null); for(let k=0;k<60&&T.getReloadDbg().weapon;k++)await wait(100); await wait(300);
  if(T.offhandMeshes[w].visible){T.toggleDualWieldDbg(); await wait(600);}
}
clearInterval(aim); return res.join('\n');
}
