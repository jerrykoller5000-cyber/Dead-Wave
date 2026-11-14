(async()=>{ const S=await import('/tools/tests/weapon-seating.js'); const C=await import('/studio/marine-carry.js?v='+Date.now());
 const T=TT, THREE=T.THREE, out=[]; const marine=T.makeMarine();
 for (const kind of (window.__AK||['launcher','minigun','ak','flamer'])) { for (const vest of [false,true]) {
   const rig=T.carryPreview(marine,{loadout:{primary:[kind,kind],secondary:[null,null]},inHand:null,akimbo:false,vest,grenades:0});
   const tp=marine.userData.torsoPivotY; let under=null;
   rig.slings.forEach((s,i)=>{ if(!s.gun) return; s.sling.userData.signature=null; const f=C.seatOnBack(THREE,s,i?-1:1,tp,vest,C.BACK_CARRY,under); under=f.pts; C.fitBackSling(THREE,s,i?-1:1,tp,vest,s.sling.userData.clips?s.sling.userData.clips[0].material:s.sling.material,i?.007:0); });
   marine.updateMatrixWorld(true);
   for (const [i,spot] of rig.slings.entries()) { try { const st=S.auditSling(spot,1.8/1.655); out.push(kind+'-slot'+(i+1)+' ends '+JSON.stringify(st.ends)+' overlaps '+JSON.stringify(st.overlaps.slice(0,4))); } catch(e) { out.push(kind+' ERR '+e.message); } }
 } }
 return out.join('\n'); })()
