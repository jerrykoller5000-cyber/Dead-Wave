(async()=>{ const S=await import('/tools/tests/weapon-seating.js'); const T=TT, out=[]; const marine=T.makeMarine();
 if(T.isUnarmed()) T.toggleHolster();
 for (const kind of (window.__AK2||['minigun','flamer'])) {
   for(let n=0;n<16 && T.getCurrentWeapon()!==kind;n++){ T.setWeapon(T.WEAPON_ORDER.indexOf(kind)); await new Promise(r=>setTimeout(r,150)); }
   for(let n=0;n<45;n++) T.stepFrame(1/30);
   for (const vest of [false,true]) { const rig=T.carryPreview(marine,{loadout:{primary:[kind,kind],secondary:[null,null]},inHand:null,akimbo:false,vest,grenades:0});
     for (const [i,spot] of rig.slings.entries()) { const st=S.auditSling(spot,1.8/1.655); out.push(kind+'-slot'+(i+1)+(vest?'-vest':'')+' '+JSON.stringify(st.overlaps.slice(0,3).map(o=>o.sling+' '+o.gun.slice(-30)+(o.strapU!==undefined?' u'+o.strapU:'')))); } } }
 return out.join('\n'); })()
