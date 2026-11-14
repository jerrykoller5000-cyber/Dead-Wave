(async()=>{ const T=TT, THREE=T.THREE||window.THREE, m=T.getMarine(), ud=m.userData, rig=ud.carry; const V3=()=>new THREE.Vector3();
 const step=(n)=>{for(let i=0;i<n;i++) T.stepFrame(1/30);}; const press=(k,z)=>T.flightInput({keys:k,zoom:!!z});
 const vis=(o)=>{for(let q=o;q;q=q.parent) if(!q.visible) return false; return true;};
 const legs=[]; m.traverse((o)=>{ if(o.isMesh && /live-trouser-leg|live-seat|boot|pad/.test(o.name||'')) legs.push(o); });
 const armsM=[]; for (const a of [ud.armRG,ud.armLG]) a.traverse(o=>{ if(o.isMesh) armsM.push(o); });
 const skip=new Set(); for (const s of [...rig.slings,...rig.holsters,...rig.pairs,rig.hip,rig.hipPair]) s.g.traverse(o=>skip.add(o));
 for (const a of [ud.armRG,ud.armLG]) a.traverse(o=>skip.add(o));
 const cfg={loadout:{primary:['m4','shotgun'],secondary:['revolver',null]},inHand:null,akimbo:false,vest:true,grenades:4,dualOwned:{pistol:true}};
 const res=[];
 for (const C of window.__CANDS) {
   rig.hipFit.y=C.y; rig.hipFit.splay=C.splay; rig.hipFit.n=C.n; rig.hipFit.x=C.x??0.135; rig.hipFit.z=C.z??-0.1;
   for (const s of [rig.hip,rig.hipPair,...rig.holsters,...rig.pairs]) s.station=null; rig.sig=''; T.carryDbg(cfg); rig.t=1e6;
   const spots=[rig.hip,rig.hipPair,...rig.holsters,...rig.pairs].filter(x=>x.onHips&&vis(x.g)&&x.shell&&x.shell.userData.fitKey);
   // (b) float: the shell's lowest third, distance to his body along the station's inward normal (ray)
   const sk2=new Set(skip); for (const s2 of [...rig.slings,...rig.holsters,...rig.pairs,rig.hip,rig.hipPair]) s2.g.traverse(o=>sk2.add(o));
   const bodyM=[]; m.traverseVisible(o=>{ if(o.isMesh&&!sk2.has(o)) bodyM.push(o); });
   let floatWorst=0, nearWorst=0; step(0); m.updateMatrixWorld(true);
   const BP=[]; { const v=V3(); for (const o of bodyM) { const pa=o.geometry&&o.geometry.attributes&&o.geometry.attributes.position; if(!pa) continue; for(let i=0;i<pa.count;i++){ if(o.isSkinnedMesh&&o.getVertexPosition) o.getVertexPosition(i,v); else v.fromBufferAttribute(pa,i); v.applyMatrix4(o.matrixWorld); BP.push(v.x,v.y,v.z);} } }
   const nearest=(p)=>{ let b=1e9; for(let i=0;i<BP.length;i+=3){ const dx=BP[i]-p.x, dy=BP[i+1]-p.y, dz=BP[i+2]-p.z; const d=dx*dx+dy*dy+dz*dz; if(d<b) b=d; } return Math.sqrt(b); };
   for (const sp of spots) { const P=[], v=V3(); const pa=sp.shell.geometry.attributes.position; for(let i=0;i<pa.count;i++) P.push(v.fromBufferAttribute(pa,i).applyMatrix4(sp.shell.matrixWorld).clone());
     P.sort((a,b)=>a.y-b.y); const low=P.slice(0,Math.max(1,Math.floor(P.length/3)));
     let d=1; for (const p of low) d=Math.min(d,nearest(p)); let dn=1; for (const p of P) dn=Math.min(dn,nearest(p)); floatWorst=Math.max(floatWorst,d); nearWorst=Math.max(nearWorst,dn); }
   // (a) legs and arms inside the shells (tcc347's box) through the moves
   const home=T.player.position.clone(), v=V3(), q=V3(); let worst=-1, where='', armW=-1, armWhere='';
   T.flightHold(true);
   const MOVES=[['stand',()=>{press([]);step(16);}],['walk',()=>{press(['KeyW']);step(12);}],['run',()=>{press(['KeyW','ShiftLeft']);step(14);}],['crouch',()=>{press(['KeyC']);step(20);}],['aim',()=>{press([],true);step(18);}]];
   for (const [name,set] of MOVES) { T.player.position.copy(home); set(); for (let f=0;f<4;f++){ if(f) step(3); m.updateMatrixWorld(true);
     for (const sp of spots) { const [, cx, cy, rx, ry, mouth, end]=String(sp.shell.userData.fitKey).split(':').map(Number), inv=sp.g.matrixWorld.clone().invert(), sc=sp.g.getWorldScale(V3()).x;
       const test=(list,isArm)=>{ for (const o of list) { if(!vis(o)) continue; const pa=o.geometry.attributes.position; for(let i=0;i<pa.count;i+=2){ if(o.isSkinnedMesh&&o.getVertexPosition) o.getVertexPosition(i,v); else v.fromBufferAttribute(pa,i); q.copy(v.applyMatrix4(o.matrixWorld)).applyMatrix4(inv);
         const d=Math.min(rx+0.004-Math.abs(q.x-cx), ry+0.004-Math.abs(q.y-cy), q.z-mouth, end-q.z)*sc; if(isArm){ if(d>armW){armW=d;armWhere=name+' '+sp.station;} } else if(d>worst){worst=d;where=name+' '+sp.station+' '+o.name;} } } };
       test(legs,false); test(armsM,true); } } }
   press([]); step(10); T.flightHold(false); T.player.position.copy(home);
   res.push(JSON.stringify(C)+' float(lowest third) '+(floatWorst*100).toFixed(1)+'cm nearest '+(nearWorst*100).toFixed(1)+'cm legs '+(worst*1000).toFixed(1)+'mm '+where+' | arms '+(armW*1000).toFixed(1)+'mm '+armWhere);
 }
 return res.join('\n'); })()
