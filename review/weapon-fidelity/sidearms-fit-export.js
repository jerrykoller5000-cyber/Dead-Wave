const Q=T.THREE,m=T.makeMarine(),ud=m.userData;
for(const[k,arr]of Object.entries(ud.gearParts))for(const o of arr)o.visible=['helmet','vest','pads','nvg'].includes(k);
const snapshots=[];
for(const primary of [['m4','ak'],['shotgun','aa12']]){
 T.carryPreview(m,{loadout:{primary,secondary:['revolver',null]},inHand:null,akimbo:false,dualOwned:{revolver:true},vest:true,grenades:3});m.updateMatrixWorld(true);
 const rig=ud.carry,spots=[...rig.slings,...rig.holsters,...rig.pairs,rig.hip,rig.hipPair];
 const skip=new Set([ud.weaponMount,ud.armLG,ud.armRG,ud.headG,...spots.map(s=>s.g)]),body=[];
 m.traverse(o=>{if(!o.isMesh||!o.visible||o.isInstancedMesh)return;for(let q=o;q;q=q.parent)if(!q.visible||skip.has(q))return;body.push(o);});
 const pack=meshes=>meshes.map(o=>({name:o.name,color:o.material.color?.getHexString(),positions:Array.from(o.geometry.attributes.position.array),indices:o.geometry.index?Array.from(o.geometry.index.array):null,matrix:o.matrixWorld.toArray()}));
 const dir=new Q.Vector3(0,0,1).transformDirection(ud.torsoG.matrixWorld).toArray();
 for(const sp of [...rig.holsters,...rig.pairs].filter(s=>s.kind==='revolver'&&s.g.visible&&s.gun))snapshots.push({primary,side:sp.g.position.x<0?'-':'+',body:pack(body),innerMatrix:sp.gun.children[0].matrixWorld.toArray(),torsoMatrix:ud.torsoG.matrixWorld.toArray(),dir});
}
return {snapshots};