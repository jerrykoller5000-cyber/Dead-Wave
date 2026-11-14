window.__clip = () => { const T=TT, THREE=T.THREE||window.THREE, m=T.getMarine(), ud=m.userData, rig=ud.carry; m.updateWorldMatrix(true,true);
 const v=new THREE.Vector3();
 const spots={hip:rig.hip,hipPair:rig.hipPair,h0:rig.holsters[0],h1:rig.holsters[1],p0:rig.pairs[0],p1:rig.pairs[1],s0:rig.slings[0],s1:rig.slings[1]};
 const inSpot=new Set(); for (const s of Object.values(spots)) s&&s.g&&s.g.traverse(o=>inSpot.add(o));
 const under=(o,root)=>{for(let q=o;q;q=q.parent) if(q===root) return true; return false;};
 const pts={R:[],L:[],legR:[],legL:[]};
 const grab=(root,key)=>root.traverseVisible(o=>{const P=o.geometry&&o.geometry.attributes&&o.geometry.attributes.position; if(!o.isMesh||!P||inSpot.has(o)||under(o,ud.weaponMount)) return;
   for(let i=0;i<P.count;i+=2){ (o.isSkinnedMesh&&o.getVertexPosition?o.getVertexPosition(i,v):v.fromBufferAttribute(P,i)).applyMatrix4(o.matrixWorld); pts[key].push(v.clone()); } });
 grab(ud.armRG,'R'); grab(ud.armLG,'L'); grab(ud.legRG,'legR'); grab(ud.legLG,'legL');
 const shown=(o)=>{for(let q=o;q&&q!==m;q=q.parent) if(!q.visible) return false; return true;};
 const boxesOf=(s)=>{ const b=[]; s.g.traverseVisible(o=>{ if(!o.isMesh||!o.geometry||o===s.sling||(s.sling&&under(o,s.sling))) return; o.geometry.boundingBox||o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox.clone().expandByScalar(-0.002); b.push([new THREE.Matrix4().copy(o.matrixWorld).invert(), bb, o.getWorldScale(new THREE.Vector3()).x]); }); return b; };
 const out={};
 for (const [k,s] of Object.entries(spots)) { if(!s||!s.g||!shown(s.g)) continue; const boxes=boxesOf(s); const who={};
   for (const [key,arr] of Object.entries(pts)) { let n=0, dmax=0; for (const p of arr) for (const [inv,bb,sc] of boxes) { v.copy(p).applyMatrix4(inv); if(bb.containsPoint(v)){ n++; const d=Math.min(v.x-bb.min.x,bb.max.x-v.x,v.y-bb.min.y,bb.max.y-v.y,v.z-bb.min.z,bb.max.z-v.z)*sc; dmax=Math.max(dmax,d); break; } } if(n) who[key]=+(dmax*1000).toFixed(1); }
   out[k]={kind:s.kind, st:s.station||'', who}; }
 return out; };
'ok'
