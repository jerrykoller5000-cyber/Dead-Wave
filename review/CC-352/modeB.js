// emulate (B): the slung guns seated as without handguns (on the pack), then the pack handguns seated over them
(async()=>{ const T=TT, THREE=T.THREE||window.THREE, rig=T.getMarine().userData.carry, MC=await import('/studio/marine-carry.js');
 const ord=MC.carryOrder(rig.slings.map(s=>s.gun?s.kind:null)); let under=null; const all=[];
 for (const i of (ord.first?[1,0]:[0,1])) { const s=rig.slings[i]; if(!s||!s.gun) continue; const side=i?-1:1, tp=s.sling.userData.torsoPivotY||0.865;
   let mat=null; s.sling.traverse(o=>{ if(!mat&&o.isMesh&&o!==s.sling) mat=o.material; });
   s.seat=MC.seatOnBack(THREE,s,side,tp,!!rig.slingVest,MC.BACK_CARRY,under,ord.bulky?{lowest:MC.PAIR_CARRY.lowest,pair:true,upright:ord.upright===i}:{}); s.seatKey='B';
   const band=side>0?!!rig.bandolier?.visible:!!rig.belt40?.visible; s.sling.userData.signature=null; MC.fitBackSling(THREE,s,side,tp,!!rig.slingVest,null,(band?.012:0)+(i?.007:0)); under=s.seat.pts; all.push(...s.seat.pts.map(p=>p.clone().add(new THREE.Vector3(0,0,-0.0)))); }
 rig.packPts=all.slice();
 for (const h of rig.holsters.concat(rig.pairs).filter(h=>h.station&&h.station.startsWith('pack')).sort((a,b)=>a.station<b.station?-1:1)) { if(!h.gun) continue; rig.placeStation(h,h.station,h.kind); h.gun.position.set(0,0,0); rig.seatStation(h); }
 T.stepFrame(0); return JSON.stringify(rig.holsters.concat(rig.pairs).filter(h=>h.packSeat).map(h=>[h.station,h.packSeat])); })()
