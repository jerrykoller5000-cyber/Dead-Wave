/* Shared cloth rig for the marine insertion and supply crates. */
window.createAirborneRig = (THREE, height) => {
  const point = new THREE.Vector3();
  const own = material => { material.userData.airborneOwned = true; return material; };
  function chute() {
    const root = new THREE.Group(), canopy = new THREE.Group();
    canopy.position.y = 4.2; root.add(canopy);
    const mats = [0x505b32, 0x606a3e].map(color => own(new THREE.MeshStandardMaterial({color, roughness: .96, side: THREE.DoubleSide})));
    const gores = [];
    for (let k=0;k<12;k++) {
      const geometry = new THREE.SphereGeometry(2.1, 4, 8, k*Math.PI/6, Math.PI/6, .08, Math.PI/2.4-.08);
      const mesh = new THREE.Mesh(geometry, mats[k%2]); mesh.castShadow = true; canopy.add(mesh);
      gores.push({mesh, original: geometry.attributes.position.array.slice(), folded: null});
    }
    // Three segments per line allow the cords to go slack instead of staying rigid.
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12*3*6),3));
    const lines = new THREE.LineSegments(lineGeometry, own(new THREE.LineBasicMaterial({color:0xa2a185})));
    root.add(lines);
    root.userData.cloth = {canopy, gores, lines, foldedBase:0};
    updateLines(root,0);
    return root;
  }
  function rim(k) {
    const a=k*Math.PI/6, r=2.1*Math.sin(Math.PI/2.4);
    return [-Math.cos(a)*r,2.1*Math.cos(Math.PI/2.4),Math.sin(a)*r];
  }
  function updateLines(root, fold) {
    const {canopy,lines}=root.userData.cloth, p=lines.geometry.attributes.position;
    let at=0;
    for(let k=0;k<12;k++) {
      const r=rim(k), start=new THREE.Vector3(r[0]>0 ? .28 : -.28,0,r[2]*.1);
      const end=new THREE.Vector3(canopy.position.x+r[0]*(1-.18*fold),canopy.position.y+r[1]*(1-fold)+.16*fold,r[2]);
      for(let s=0;s<3;s++) for(const t of [s/3,(s+1)/3]) {
        point.lerpVectors(start,end,t); point.y-=Math.sin(t*Math.PI)*fold*.35;
        // Slack cords settle on the ground, including uneven terrain.
        if(fold>0){const w=root.localToWorld(point.clone());w.y=Math.max(w.y,height(w.x,w.z)+.025);point.copy(root.worldToLocal(w));}
        p.setXYZ(at++,point.x,point.y,point.z);
      }
    }
    p.needsUpdate=true;lines.geometry.computeBoundingSphere();
  }
  function collapse(root, time) {
    const c=root.userData.cloth, t=Math.min(1,time/2.2), f=t*t*(3-2*t);
    if(c.complete)return;
    root.updateWorldMatrix(true,true);
    if(!c.gores[0].folded) {
      const base=root.localToWorld(new THREE.Vector3(2.7,0,0));base.y=height(base.x,base.z)+.035;
      c.foldedBase=root.worldToLocal(base).y;
      for(const gore of c.gores) {
        gore.folded=gore.original.slice();
        for(let i=0;i<gore.original.length;i+=3) {
          const x=gore.original[i],z=gore.original[i+2];
          const fx=x*.82+Math.sin(z*5+x*3)*.12, fz=z+Math.sin(x*4)*.13;
          const w=root.localToWorld(new THREE.Vector3(2.7+fx,0,fz)); w.y=height(w.x,w.z)+.06;
          const local=root.worldToLocal(w);
          gore.folded[i]=fx;gore.folded[i+1]=local.y-c.foldedBase+.1+Math.abs(Math.sin(x*6+z*4))*.18;gore.folded[i+2]=fz;
        }
      }
    }
    c.canopy.position.set(2.7*f,4.2*(1-f)+c.foldedBase*f,0);
    for(const gore of c.gores) {
      const p=gore.mesh.geometry.attributes.position;
      for(let i=0;i<p.array.length;i++) p.array[i]=gore.original[i]*(1-f)+gore.folded[i]*f;
      p.needsUpdate=true;gore.mesh.geometry.computeVertexNormals();gore.mesh.geometry.computeBoundingSphere();
    }
    updateLines(root,f);c.complete=t===1;
  }
  function prepare(root) {
    const copies=new Map(), entries=[];
    root.traverse(o=>{
      if(!o.material)return;
      const convert=mat=>{
        if(copies.has(mat))return copies.get(mat);
        const copy=mat.userData.airborneOwned?mat:own(mat.clone());
        copies.set(mat,copy);entries.push({mat:copy,opacity:copy.opacity});return copy;
      };
      o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
    });
    root.userData.fadeMaterials=entries;
  }
  function fade(root, alpha) {
    for(const {mat,opacity} of root.userData.fadeMaterials||[]) {
      if(!mat.transparent){mat.transparent=true;mat.depthWrite=false;mat.needsUpdate=true;}
      mat.opacity=opacity*alpha;
    }
    if(alpha<.9)root.traverse(o=>{if(o.isMesh)o.castShadow=false;});
  }
  function dispose(root) {
    root.removeFromParent();const geometries=new Set(),materials=new Set();
    root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])if(m.userData.airborneOwned)materials.add(m);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }
  return {chute,collapse,prepare,fade,dispose};
};
