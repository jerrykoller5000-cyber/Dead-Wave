(async()=>{ const T=TT, THREE=T.THREE||window.THREE; const step=(n)=>{for(let i=0;i<n;i++) T.stepFrame(1/30);}; const press=(k)=>T.flightInput({keys:k,zoom:false});
 const m=T.getMarine(), ud=m.userData; const v=new THREE.Vector3(); const res={};
 T.flightHold(true);
 for (const w of ['unarmed','pistol','m4','chainsaw','revolver','aa12','sniper','minigun','flamer','launcher','uzi','shotgun','ak']) {
   if (w==='unarmed') { if(!T.isUnarmed()) T.toggleHolster(); } else { if(T.isUnarmed()) T.toggleHolster(); T.setWeapon(T.WEAPON_ORDER.indexOf(w)); }
   step(25); let worst=9, wz=null;
   for (const [keys,n] of [[[],6],[['KeyW'],16],[['KeyW','ShiftLeft'],16],[['KeyC'],20]]) { const h=window.__home; T.player.position.set(h.x,h.y,h.z); press([]); step(6); press(keys);
     for(let i=0;i<n;i++){ step(1); m.updateWorldMatrix(true,true); const inv=new THREE.Matrix4().copy(m.matrixWorld).invert();
      for (const a of [ud.armRG,ud.armLG]) a.traverseVisible(o=>{const P=o.geometry&&o.geometry.attributes&&o.geometry.attributes.position; if(!o.isMesh||!P) return; for(let q=o;q;q=q.parent) if(q===ud.weaponMount) return;
       for(let j=0;j<P.count;j+=3){ (o.isSkinnedMesh&&o.getVertexPosition?o.getVertexPosition(j,v):v.fromBufferAttribute(P,j)).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
        if(v.y>0.98&&v.y<1.24&&v.z<0.30&&Math.abs(v.x)<worst){ worst=Math.abs(v.x); wz=[+v.x.toFixed(3),+v.y.toFixed(3),+v.z.toFixed(3)]; } } }); } }
   res[w]={minAbsX:+worst.toFixed(3), at:wz}; press([]); step(8);
 }
 T.flightHold(false); return JSON.stringify(res); })()
