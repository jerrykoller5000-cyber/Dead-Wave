(async()=>{ const T=TT; const step=(n)=>{for(let i=0;i<n;i++) T.stepFrame(1/30);}; const rig=T.getMarine().userData.carry;
 const P={stand:[[],20,[0]], walk:[['KeyW'],12,[0,2,4,6,8,10,12,14,16]], run:[['KeyW','ShiftLeft'],12,[0,2,4,6,8,10,12]], crouchwalk:[['KeyC','KeyW'],20,[0,4,8,12,16]], crouch:[['KeyC'],26,[0,4,8]], aim:[[],18,[0,4,8]]};
 const res={}; T.flightHold(true);
 for (const V of window.__TV) {
   window.__cfg({...window.__CF0[V.ci],inHand:null,akimbo:false}); step(4);
   for (const sp of rig.holsters.concat(rig.pairs).filter(h=>h.station&&h.station.startsWith('thigh'))) { const side=sp.station.endsWith('+')?1:-1; sp.g.position.set(side*(0.118+V.dx), -0.05+V.dy, 0.035+(V.dz||0)); sp.g.rotation.set(Math.PI/2+(V.rx||0),0,-side*(0.1+(V.rz||0))); sp.g.updateMatrix(); }
   const r={};
   for (const [pn,[keys,pre,frames]] of Object.entries(P)) { const h=window.__home; T.player.position.set(h.x,h.y,h.z); T.player.rotation.y=h.yaw; T.flightInput({keys:[]}); step(10); T.flightInput({keys}); step(pre);
     let last=0; for (const f of frames) { step(f-last); last=f; const MM=T.getMarine(); MM.updateWorldMatrix(true,true); MM.traverse(o=>{ if(o.userData&&o.userData.liveShape&&o.onBeforeRender) o.onBeforeRender(); }); const c=window.__clip352(); for (const [k,o] of Object.entries(c)) { if(!/thigh|hip/.test(o.st)) continue; for (const [wk,v] of Object.entries(o.who)) { if(!wk.startsWith(V.who||'leg')) continue; const key=o.st+'('+o.kind+') '+wk; if(!r[key]||v.mm>r[key].mm){ const sp2=rig.holsters.concat(rig.pairs,[rig.hip,rig.hipPair]).find(h=>h.station===o.st)||rig.hip; const L=new (T.THREE||window.THREE).Vector3(v.at[0],v.at[1],v.at[2]).applyMatrix4(sp2.g.parent.matrixWorld.clone().invert()); r[key]={mm:v.mm,pn,f,at:v.at[3].replace(/live-trouser-leg</,'')+' L['+L.toArray().map(x=>x.toFixed(3))+']'}; } } } }
     T.flightInput({keys:[]}); step(10); }
   res[JSON.stringify(V)]=Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v.mm+' '+v.pn+'@'+v.f+' '+v.at])); }
 T.flightHold(false); return JSON.stringify(res,null,1); })()
