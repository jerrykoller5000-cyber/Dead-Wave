{
const THREE=T.THREE, V=()=>new THREE.Vector3(), out={};
T.clearZombies&&T.clearZombies(); T.setHp&&T.setHp(100000); T.grantAllWeapons&&T.grantAllWeapons();
const pin=()=>{const p=T.player.position; T.aimTarget.set(p.x,T.sampleHeight(p.x,p.z)+1.25,p.z+10);}; pin();
for (const w of ['m4','pistol','shotgun']) {
  for(let i=0;i<16&&T.getCurrentWeapon()!==w;i++)T.setWeapon(i); const t0=Date.now(); while(Date.now()-t0<2600){pin(); await wait(50);}
  const g=T.weaponMeshes[w]; g.updateMatrixWorld(true);
  const hold=T.getShoulderDbg().holds[w], trig=g.localToWorld(V().fromArray(hold.trig||hold.grip)), side=g.localToWorld(V().set(0.35,0.05,0)).sub(g.localToWorld(V())).normalize();
  const finger=T.handsDbg&&T.handsDbg.fingerTip?T.handsDbg.fingerTip('R','index',V()):null;
  out[w]={trig:trig.toArray(),side:side.toArray(),finger:finger&&finger.toArray(),fingerToTrig:finger?finger.distanceTo(trig):null};
}
return JSON.stringify(out);
}
