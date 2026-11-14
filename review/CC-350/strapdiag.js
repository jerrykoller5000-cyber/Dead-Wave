(()=>{ const T=TT, THREE=T.THREE, M=T.getMarine(), rig=M.userData.carry, torso=M.userData.torsoG, tp=M.userData.torsoPivotY;
 const vis=(o)=>{for(let q=o;q;q=q.parent) if(!q.visible) return false; return true;};
 const skip=new Set(); for (const r of [...rig.slings.map(x=>x.g),...rig.holsters.map(x=>x.g),...rig.pairs.map(x=>x.g),rig.hip.g,rig.hipPair.g,rig.harness,rig.bandolier,rig.belt40]) r&&r.traverse(o=>skip.add(o)); M.userData.weaponMount.traverse(o=>skip.add(o));
 M.updateMatrixWorld(true); const tinv=torso.matrixWorld.clone().invert(); const v=new THREE.Vector3(); const BP=[];
 M.traverse(o=>{ if(!o.isMesh||o.isInstancedMesh||skip.has(o)||!vis(o)) return; const pa=o.geometry&&o.geometry.attributes.position; if(!pa) return; for(let i=0;i<pa.count;i++){ if(o.isSkinnedMesh&&o.getVertexPosition) o.getVertexPosition(i,v); else v.fromBufferAttribute(pa,i); v.applyMatrix4(o.matrixWorld).applyMatrix4(tinv); BP.push(v.x,v.y+tp,v.z);} });
 const near=(p)=>{let b=1e9; for(let i=0;i<BP.length;i+=3){const dx=BP[i]-p.x,dy=BP[i+1]-p.y,dz=BP[i+2]-p.z,d=dx*dx+dy*dy+dz*dz; if(d<b)b=d;} return Math.sqrt(b);};
 const out=[]; rig.slings.forEach((s,i)=>{ if(!s.gun||!vis(s.sling)) return; const fit=s.sling.userData.fit; const L=fit.body.slice(1).map(q=>new THREE.Vector3(...q).applyMatrix4(s.sling.matrixWorld).applyMatrix4(tinv));
   const segD=(p,a,b)=>{const ab=b.clone().sub(a),t=Math.max(0,Math.min(1,p.clone().sub(a).dot(ab)/Math.max(1e-9,ab.lengthSq())));return p.distanceTo(a.clone().addScaledVector(ab,t));};
   const pa=s.sling.geometry.attributes.position; let worst=0, at=null;
   for(let j=0;j<pa.count;j+=2){ const p=v.fromBufferAttribute(pa,j).applyMatrix4(s.sling.matrixWorld).applyMatrix4(tinv).clone(); let dl=1; for(let k=0;k+1<L.length;k++) dl=Math.min(dl,segD(p,L[k],L[k+1])); if(dl>0.04) continue; p.y+=tp; const d=near(p); if(d>worst){worst=d; at=p.toArray().map(x=>+x.toFixed(3));} }
   out.push({i,kind:s.kind,worst:+worst.toFixed(3),at, body:fit.body.map(q=>new THREE.Vector3(...q).applyMatrix4(s.sling.matrixWorld).applyMatrix4(tinv).toArray().map((x,k)=>+(x+(k===1?tp:0)).toFixed(3)))}); });
 return JSON.stringify(out); })()
