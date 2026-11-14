window.__surf = () => { const T=TT, THREE=T.THREE||window.THREE, m=T.getMarine(), ud=m.userData, torso=ud.torsoG, rig=ud.carry;
 m.updateWorldMatrix(true,true);
 const skip=new Set(); for (const s of [...rig.slings,...rig.holsters,...rig.pairs,rig.hip,rig.hipPair]) s.g.traverse(o=>skip.add(o));
 for (const o of [rig.harness,rig.bandolier,rig.belt40,rig.mags,rig.grenades,rig.shells,rig.rounds40,rig.boxes,rig.tanks]) o&&o.traverse(q=>skip.add(q));
 const arms=new Set(); for (const a of [ud.armRG,ud.armLG,ud.weaponMount]) a.traverse(o=>arms.add(o));
 const meshes=[]; m.traverseVisible(o=>{ if(o.isMesh && !skip.has(o) && !arms.has(o)) meshes.push(o); });
 const rc=new THREE.Raycaster(); const tp=ud.torsoPivotY;
 const cast=(o,d)=>{ const O=torso.localToWorld(new THREE.Vector3(o[0],o[1]-tp,o[2])), D=new THREE.Vector3(...d).transformDirection(torso.matrixWorld); rc.set(O,D); rc.far=3; const h=rc.intersectObjects(meshes,false)[0]; if(!h) return null; const p=torso.worldToLocal(h.point.clone()); return [+p.x.toFixed(3),+(p.y+tp).toFixed(3),+p.z.toFixed(3)]; };
 const R={front:{},back:{},sideP:{},sideN:{},top:{}}; const xs=[-.18,-.15,-.12,-.09,-.06,-.03,0,.03,.06,.09,.12,.15,.18];
 for (let y=.5;y<=1.36;y+=.04){ const k=y.toFixed(2); R.front[k]=xs.map(x=>{const h=cast([x,y,1],[0,0,-1]);return h?h[2]:null}); R.back[k]=xs.map(x=>{const h=cast([x,y,-1],[0,0,1]);return h?h[2]:null}); }
 const zs=[-.15,-.1,-.05,0,.05,.1,.15];
 for (let y=.5;y<=1.36;y+=.04){ const k=y.toFixed(2); R.sideP[k]=zs.map(z=>{const h=cast([1,y,z],[-1,0,0]);return h?h[0]:null}); R.sideN[k]=zs.map(z=>{const h=cast([-1,y,z],[1,0,0]);return h?h[0]:null}); }
 for (const x of [-.22,-.19,-.16,-.13,-.1,.1,.13,.16,.19,.22]) R.top[x]=zs.map(z=>{const h=cast([x,2,z],[0,-1,0]);return h?h[1]:null});
 return JSON.stringify({xs,zs,R}); };
window.__surf()
