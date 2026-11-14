(async()=>{ const T=TT, THREE=T.THREE||window.THREE; const step=(n)=>{for(let i=0;i<n;i++) T.stepFrame(1/30);}; const press=(k)=>T.flightInput({keys:k,zoom:false});
 const m=T.getMarine(), ud=m.userData; const v=new THREE.Vector3(); const bins={};
 if(!T.isUnarmed()) T.toggleHolster(); step(20); T.flightHold(true);
 const sample=(tag)=>{ m.updateWorldMatrix(true,true); const inv=new THREE.Matrix4().copy(m.matrixWorld).invert();
   for (const a of [ud.armRG,ud.armLG]) a.traverseVisible(o=>{const P=o.geometry&&o.geometry.attributes&&o.geometry.attributes.position; if(!o.isMesh||!P) return;
     for(let i=0;i<P.count;i+=3){ (o.isSkinnedMesh&&o.getVertexPosition?o.getVertexPosition(i,v):v.fromBufferAttribute(P,i)).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
       if(v.y>1.0) continue; const k=(Math.floor(v.y/0.04)*0.04).toFixed(2)+(v.x>0?'R':'L'); const b=bins[k]||(bins[k]={ax:9,z0:9,z1:-9}); b.ax=Math.min(b.ax,Math.abs(v.x)); b.z0=Math.min(b.z0,v.z); b.z1=Math.max(b.z1,v.z);} }); };
 for (const [keys,n] of [[[],10],[['KeyW'],24],[['KeyW','ShiftLeft'],24],[['KeyC'],30]]) { const h=window.__home; T.player.position.set(h.x,h.y,h.z); press([]); step(8); press(keys); for(let i=0;i<n;i++){ step(1); sample(); } }
 press([]); step(10); T.flightHold(false);
 return Object.keys(bins).sort().map(k=>k+' |x|>='+bins[k].ax.toFixed(3)+' z '+bins[k].z0.toFixed(3)+'..'+bins[k].z1.toFixed(3)).join('\n'); })()
