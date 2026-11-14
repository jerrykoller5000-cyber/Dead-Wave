(async()=>{ const S=await import('/tools/tests/weapon-seating.js'); const C=await import('/studio/marine-carry.js?v='+Date.now());
 const T=TT, THREE=T.THREE, out=[]; const marine=T.makeMarine(); const angs=[0,0.26,-0.26,0.52,-0.52,0.79,-0.79,1.05,-1.05,1.31,-1.31,1.57];
 for (const kind of ['launcher','ak','flamer']) {
   const rig=T.carryPreview(marine,{loadout:{primary:[kind,kind],secondary:[null,null]},inHand:null,akimbo:false,vest:false,grenades:0}); const tp=marine.userData.torsoPivotY;
   let under=null; rig.slings.forEach((s,i)=>{ const f=C.seatOnBack(THREE,s,i?-1:1,tp,false,C.BACK_CARRY,under); under=f.pts; });
   const res={0:[0,0],1:[0,0]};
   for (const [si,spot] of rig.slings.entries()) { const toward=si===0?0:1;   // slot0 shows its -x side, slot1 its +x
     for (const ci of [0,1]) { let found=null; for (const a of angs) { const tbl=C.SLING_RING_TURN[kind]||(C.SLING_RING_TURN[kind]=[[0,0],[0,0]]); tbl[toward][ci]=a; spot.sling.userData.signature=null; C.fitBackSling(THREE,spot,si?-1:1,tp,false,spot.sling.material,si?.007:0); marine.updateMatrixWorld(true);
         const st=S.auditSling(spot,1.8/1.655); const bad=st.overlaps.filter(o=>o.sling==='clip'+(ci+1)).length + (st.ends[ci].gunContact&&st.ends[ci].webContact?0:1); if(!bad){found=a;break;} }
       res[toward][ci]=found; C.SLING_RING_TURN[kind][toward][ci]=found||0; } }
   out.push(kind+' '+JSON.stringify(res));
 }
 return out.join('\n'); })()
