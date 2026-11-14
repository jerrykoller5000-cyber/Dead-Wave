(async()=>{ const T=TT; const step=(n)=>{for(let i=0;i<n;i++) T.stepFrame(1/30);}; const press=(k,z)=>T.flightInput({keys:k,zoom:!!z});
 const res={}; const CF=window.__CF; const stances=window.__ST||['stand','walk','run','crouch','crouchwalk','aim'];
 const P={stand:[[],20,[0,3,6,9,12]], walk:[['KeyW'],12,[0,4,8,12,16]], run:[['KeyW','ShiftLeft'],12,[0,3,6,9,12]], crouch:[['KeyC'],26,[0,3,6,9,12]], crouchwalk:[['KeyC','KeyW'],20,[0,4,8,12,16]], aim:[[],18,[0,3,6,9,12]]};
 T.flightHold(true);
 for (const [ci,C] of CF.entries()) {
   const w=C.inHand; if (!w) { if(!T.isUnarmed()) T.toggleHolster(); } else { if(T.isUnarmed()) T.toggleHolster(); T.setWeapon(T.WEAPON_ORDER.indexOf(w)); }
   step(30); window.__cfg(C); step(2);
   for (const pn of stances) { const [keys,pre,frames]=P[pn];
     const h=window.__home; T.player.position.set(h.x,h.y,h.z); T.player.rotation.y=h.yaw; press([]); step(10); press(keys,pn==='aim'); step(pre);
     let worst={}; for (const f of frames) { step(f?(frames[1]-frames[0]):0); const c=window.__clip352(); for (const [k,o] of Object.entries(c)) for (const [wk,r] of Object.entries(o.who)) { const key=k+'('+o.kind+'@'+o.st+') vs '+wk; if(r.mm>(worst[key]?.mm||0)) worst[key]={...r,f}; } }
     res['C'+ci+'/'+pn]=worst; press([]); step(15);
   }
 }
 T.flightHold(false); return JSON.stringify(res); })()
