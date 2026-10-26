// Evaluated inside the one queued inspector instance, after its capture batch.
async function eyeLifecycleProbe() {
 const H=TT.inspectHost(),C=await import('/studio/zombie-concepts.js');
 const read=g=>(g.userData.eyeMats||g.userData.eyes.map(e=>e.material)).map(m=>({color:m.color.getHex(),glow:m.emissive.getHex(),intensity:m.emissiveIntensity,base:m.userData.baseEmissive}));
 const rows=[];
 for(const kind of C.CONCEPT_TYPES){
  const a=H.builders.zombie(kind),b=H.builders.zombie(kind),first=read(a),cached=read(b);
  for(const m of a.userData.eyeMats||[])m.emissiveIntensity=0;
  rows.push({kind,first,cached,independent:read(b).every(e=>e.intensity===.9)});
 }
 const sleeper=H.builders.zombie('spitter');C.prepareConvoySleeperAppearance(H.THREE,sleeper);
 const ordinary=H.builders.zombie('spitter'),special={bluebell:read(sleeper),ordinary:read(ordinary)};
 const r=TT.trainingDbg.tg().zombieRoom,x=(r.minX+r.maxX)/2,z=(r.minZ+r.maxZ)/2;
 TT.clearZombies();const a=TT.spawnZombie(x,z,'shambler',true,true),id=a.mesh.uuid;
 const fresh=read(a.mesh);for(const m of a.mesh.userData.eyeMats)m.emissiveIntensity=0;
 TT.clearZombies();const b=TT.spawnZombie(x,z,'shambler',true,true),reused=read(b.mesh);
 const pool={sameBody:b.mesh.uuid===id,fresh,reused,restored:reused.every(e=>e.intensity===e.base)};
 TT.clearZombies();
 return {rows,special,pool,materialPass:rows.every(r=>r.independent&&[...r.first,...r.cached].every(e=>e.glow===0x74a18d&&e.intensity===.9&&e.base===.9))&&special.bluebell.every(e=>e.glow===0x8beaff&&e.intensity===1.8&&e.base===1.8)&&special.ordinary.every(e=>e.glow===0x74a18d&&e.intensity===.9)};
}
