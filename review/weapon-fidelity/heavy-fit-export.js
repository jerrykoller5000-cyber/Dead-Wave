const Q=T.THREE,m=T.makeMarine(),ud=m.userData;
for(const[k,arr]of Object.entries(ud.gearParts))for(const o of arr)o.visible=['helmet','vest','pads','nvg'].includes(k);
const snapshots=[];
for(const primary of[['flamer','chainsaw'],['chainsaw','flamer']]){
 T.carryPreview(m,{loadout:{primary,secondary:['uzi','pistol']},inHand:null,akimbo:false,dualOwned:{},vest:true,grenades:3});m.updateMatrixWorld(true);
 const rig=ud.carry,spots=[...rig.slings,...rig.holsters,...rig.pairs,rig.hip,rig.hipPair],sp=rig.slings.find(s=>s.kind==='flamer');
 const skip=new Set([ud.weaponMount,ud.armLG,ud.armRG,ud.headG,...spots.map(s=>s.g)]),body=[];
 m.traverse(o=>{if(!o.isMesh||!o.visible||o.isInstancedMesh)return;for(let q=o;q;q=q.parent)if(!q.visible||skip.has(q))return;body.push(o);});
 const pack=meshes=>meshes.map(o=>({name:o.name,color:o.material.color?.getHexString(),positions:Array.from(o.geometry.attributes.position.array),indices:o.geometry.index?Array.from(o.geometry.index.array):null,matrix:o.matrixWorld.toArray()}));
 const other=[];for(const s of spots)if(s!==sp&&s!==rig.hip&&s!==rig.hipPair&&s.gun&&s.g.visible&&s.gun.visible)s.gun.traverse(o=>{if(o.isMesh&&o.visible)other.push(o);});
 snapshots.push({primary,side:sp.g.position.x<0?'-':'+',body:pack(body),other:pack(other),innerMatrix:sp.gun.children[0].matrixWorld.toArray(),parentMatrix:sp.g.parent.matrixWorld.toArray(),targetZ:sp.g.parent===ud.torsoG?-.05:.03});
}
return {snapshots};
