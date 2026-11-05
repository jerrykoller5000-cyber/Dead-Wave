const w='chainsaw';
const THREE=T.THREE,V=(...a)=>new THREE.Vector3(...a);
if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'm4'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('m4')); await new Promise(r=>setTimeout(r,150)); }
await new Promise(r=>setTimeout(r,2500));
for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
const gun=T.weaponMeshes[w],H=T.getShoulderDbg().holds[w],D=T.handsDbg,rows=[];
const t0=Date.now();
for(let k=0;k<60;k++){ await new Promise(r=>setTimeout(r,100)); T.getMarine().updateMatrixWorld(true); const d=D.gripPoint('R',V()).distanceTo(gun.localToWorld(V(...H.grip))); const s=T.sawStartDbg(); rows.push([Date.now()-t0,+d.toFixed(3),s.phase,+s.t.toFixed(2),T.getSwapDbg().swapT>0?1:0, T.drawDbg().active?1:0]); }
return 'ROWS'+JSON.stringify(rows)+'END';