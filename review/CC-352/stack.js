(async()=>{ const T=TT; const step=(n)=>{for(let i=0;i<n;i++) T.stepFrame(1/30);}; const res={}; T.flightHold(true);
 const rig=T.getMarine().userData.carry;
 for (const [ci,C] of window.__CF0.entries()) { if (window.__ONLY && !window.__ONLY.includes(ci)) continue;
   if(!T.isUnarmed()) T.toggleHolster(); step(20);
   const h=window.__home; T.player.position.set(h.x,h.y,h.z); T.player.rotation.y=h.yaw; T.flightInput({keys:[]});
   window.__cfg({...C,inHand:null,akimbo:false}); step(20); const c=window.__clip352(); const r={};
   for (const [k,o] of Object.entries(c)) for (const [wk,v] of Object.entries(o.who)) if (wk.startsWith('gun:')) r[k+'('+o.kind+'@'+o.st+') vs '+wk]=v.mm+' '+JSON.stringify(v.at);
   r.seats=rig.slings.map(s=>s.gun&&s.seat?s.kind+' z'+s.seat.z.toFixed(3)+' off'+(s.seat.off||0).toFixed(3)+' on:'+s.seat.on:'-').join(' | ');
   r.pack=rig.holsters.concat(rig.pairs).filter(h=>h.station&&h.station.startsWith('pack')&&h.gun).map(h=>h.kind+'@'+h.station+' z'+h.g.position.z.toFixed(3)).join(' | ');
   res['C'+ci]=r; }
 T.flightHold(false); return JSON.stringify(res,null,1); })()
