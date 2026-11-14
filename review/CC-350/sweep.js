(async()=>{ const T=TT; const step=(n)=>{for(let i=0;i<n;i++) T.stepFrame(1/30);}; const press=(k)=>T.flightInput({keys:k,zoom:false});
 const res={}; const W=window.__SW||['unarmed','pistol','m4','chainsaw','aa12','revolver'];
 const P={stand:[[],20,[0]], walk:[['KeyW'],12,[4,8,12,16]], run:[['KeyW','ShiftLeft'],12,[3,6,9,12]], crouch:[['KeyC'],26,[0]]};
 T.flightHold(true);
 for (const w of W) {
   if (w==='unarmed') { if(!T.isUnarmed()) T.toggleHolster(); } else { if(T.isUnarmed()) T.toggleHolster(); T.setWeapon(T.WEAPON_ORDER.indexOf(w)); }
   step(30);
   const cfg=Object.assign({}, window.__lastCfg, {inHand: w==='unarmed'?null:w}); T.carryDbg(cfg); if(window.__afterCfg) await window.__afterCfg(); T.getMarine().userData.carry.t=1e6;
   for (const [pn,[keys,pre,frames]] of Object.entries(P)) {
     const h=window.__home; T.player.position.set(h.x,h.y,h.z); T.player.rotation.y=h.yaw; press([]); step(10); press(keys); step(pre);
     let worst={}; for (const f of frames) { step(f? 3:0); const c=window.__clip(); for (const [k,o] of Object.entries(c)) { o.n=Object.values(o.who||{}).reduce((a,b)=>a+b,0); if(o.n>(worst[k]?.n||0)) worst[k]={...o, at:pn+f}; } }
     res[w+'/'+pn]=worst; press([]); step(15);
   }
 }
 T.flightHold(false); return JSON.stringify(res); })()
