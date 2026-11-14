// emulate the untouched tree (BEFORE): pack stations on the pack's sides (the old rig.placeStation/seatStation pack branch), slung guns on the pack
(async()=>{ const T=TT, THREE=T.THREE||window.THREE, rig=T.getMarine().userData.carry, MC=await import('/studio/marine-carry.js');
 const tp0=rig.slings[0].sling.userData.torsoPivotY||0.865, PS=rig.packSide, sm=new THREE.Matrix4(), si=new THREE.Matrix4(), sv=new THREE.Vector3(), sb=new THREE.Box3();
 for (const h of rig.holsters.concat(rig.pairs).filter(h=>h.station&&h.station.startsWith('pack'))) { const side=h.station.endsWith('+')?1:-1;
   h.g.quaternion.setFromRotationMatrix(sm.makeBasis(sv.set(1,0,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,-1,0))); h.g.scale.setScalar(0.8); h.g.position.set(side*(PS.x+0.04),PS.y-tp0,PS.z);
   if(!h.gun) continue; h.gun.position.set(0,0,0); h.g.updateMatrix(); const torso=h.g.parent; torso.updateMatrixWorld(true); si.copy(torso.matrixWorld).invert(); sb.makeEmpty();
   h.gun.traverseVisible(o=>{ const P=o.geometry&&o.geometry.attributes&&o.geometry.attributes.position; if(!o.isMesh||!P) return; sm.multiplyMatrices(si,o.matrixWorld); for(let i=0;i<P.count;i+=2) sb.expandByPoint(sv.fromBufferAttribute(P,i).applyMatrix4(sm)); });
   const inner=side>0?sb.min.x:-sb.max.x; h.g.position.x+=side*(PS.x+PS.clear-inner); h.g.updateMatrix(); }
 rig.harness.position.set(0,0.95-tp0,-0.19); rig.harness.scale.set(1,1,1);
 const ord=MC.carryOrder(rig.slings.map(s=>s.gun?s.kind:null)); let under=null;
 for (const i of (ord.first?[1,0]:[0,1])) { const s=rig.slings[i]; if(!s||!s.gun) continue; const side=i?-1:1, tp=s.sling.userData.torsoPivotY||0.865;
   s.seat=MC.seatOnBack(THREE,s,side,tp,!!rig.slingVest,MC.BACK_CARRY,under,ord.bulky?{lowest:MC.PAIR_CARRY.lowest,pair:true,upright:ord.upright===i}:{}); s.seatKey='before'; under=s.seat.pts; const band=side>0?!!rig.bandolier?.visible:!!rig.belt40?.visible; s.sling.userData.signature=null; MC.fitBackSling(THREE,s,side,tp,!!rig.slingVest,null,(band?.012:0)+(i?.007:0)); }
 T.stepFrame(0); return 'before'; })()
