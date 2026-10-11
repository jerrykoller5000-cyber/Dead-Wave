/* Shared cloth rig for the marine insertion and supply crates.
   CL-142 (Jerry, 2026-10-10: "make the straps on the parachute connect to player when he is dropping in"): the
   marine's chute is no longer a canopy whose lines end in the air over his head. harness(torso) dresses him in a
   harness that rides on his chest (it follows the torso, not the hips), with a riser connector on each shoulder and two
   risers a side up to the links where the lines meet; attach(chute, left, right) runs the lines to those links every
   frame, and the steering lines run from the rear risers to his hands. Crates keep the old rig (lines to the root). */
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
    root.userData.cloth = {canopy, gores, lines, foldedBase:0, fold:0, attach:null};
    updateLines(root,0);
    return root;
  }
  function rim(k) {
    const a=k*Math.PI/6, r=2.1*Math.sin(Math.PI/2.4);
    return [-Math.cos(a)*r,2.1*Math.cos(Math.PI/2.4),Math.sin(a)*r];
  }
  function updateLines(root, fold) {
    const {canopy,lines,attach}=root.userData.cloth, p=lines.geometry.attributes.position;
    let at=0, ends=null;
    if(attach){root.updateWorldMatrix(true,false);ends=attach.map(w=>root.worldToLocal(w.clone()));if(ends[0].x>ends[1].x)ends.reverse();}
    for(let k=0;k<12;k++) {
      const r=rim(k), start=ends ? ends[r[0]>0?1:0].clone() : new THREE.Vector3(r[0]>0 ? .28 : -.28,0,r[2]*.1);
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
    c.fold=f;updateLines(root,f);c.complete=t===1;
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
    root.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])if(m.userData.airborneOwned)materials.add(m);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }
  // The lines run to two world points (the links over his shoulders) from now on; null puts them back on the root.
  function attach(root, left, right) {
    const c=root.userData.cloth;
    c.attach=left&&right?[left,right]:null;
    updateLines(root,c.fold||0);
  }
  // The harness, in the torso's frame (+Y up, +Z his front): main lift webs up the chest and over the shoulders, a
  // chest strap and a waist band, the container on his back, a three-ring connector on each shoulder and the risers
  // (front and rear) up to the links. update(fold, hands) moves the links (they come down onto the shoulders as the
  // canopy folds after the landing), lays the risers between, runs the steering lines down to the hands while he
  // holds them, and returns the two links in the world for attach().
  function harness(torso, {width=.16, top=.5, chest=.235, back=-.31, link=[.36,1.1,0], skip=[]}={}) {
    const g=new THREE.Group();g.name='insertion-harness';
    // Fit to the body as it is: rays at the torso's own meshes (not the arms or the head) find his chest, his back and
    // the tops of his shoulders, and the webbing is laid on them. Where a ray finds nothing the defaults above stand.
    const body=[], held=new Set(skip.filter(Boolean));
    const walk=o=>{if(held.has(o)||!o.visible)return;if(o.isMesh)body.push(o);for(const c of o.children)walk(c);};   // hidden kit (and its hidden parents) does not count
    for(const c of torso.children)walk(c);
    torso.updateWorldMatrix(true,true);
    const rc=new THREE.Raycaster(), o3=new THREE.Vector3(), d3=new THREE.Vector3();
    const cast=(o,d)=>{o3.set(o[0],o[1],o[2]).applyMatrix4(torso.matrixWorld);d3.set(d[0],d[1],d[2]).transformDirection(torso.matrixWorld);rc.set(o3,d3);rc.far=3;
      const h=body.length?rc.intersectObjects(body,false)[0]:null;return h?torso.worldToLocal(h.point.clone()):null;};
    const front=(x,y,def)=>{const h=cast([x,y,1],[0,0,-1]);return h&&h.z>.02&&h.z<.4?h.z:def;};
    const rear=(x,y,def)=>{const h=cast([x,y,-1],[0,0,1]);return h&&h.z<-.05&&h.z>-.42?h.z:def;};
    const over=(x,z,def)=>{const h=cast([x,1.4,z],[0,-1,0]);return h&&h.y>.3&&h.y<.7?h.y:def;};
    const T2=.016;                                                       // webbing thickness, and a hair over the cloth
    torso.add(g);
    const web=own(new THREE.MeshStandardMaterial({color:0x4e5038,roughness:.95,metalness:0}));
    const pack=own(new THREE.MeshStandardMaterial({color:0x444833,roughness:.9,metalness:.02}));
    const steel=own(new THREE.MeshStandardMaterial({color:0x9a9c94,roughness:.35,metalness:.85}));
    const cord=own(new THREE.MeshStandardMaterial({color:0xb9b48f,roughness:.8}));
    const unit=new THREE.BoxGeometry(1,1,1), Y=new THREE.Vector3(0,1,0), v=new THREE.Vector3();
    const band=(a,b,w,th,mat,parent=g)=>{const m=new THREE.Mesh(unit,mat);m.castShadow=true;parent.add(m);lay(m,a,b,w,th);return m;};
    const lay=(m,a,b,w,th)=>{v.subVectors(b,a);const len=Math.max(1e-3,v.length());m.position.addVectors(a,b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(Y,v.divideScalar(len));m.scale.set(w,len,th);};
    const P=(x,y,z)=>new THREE.Vector3(x,y,z);
    // his back beside whatever he carries on it (the container goes over a pack: it is as deep as the pack needs)
    const backZ=Math.max(rear(.16,.3,back),rear(-.16,.3,back),rear(.16,.15,back),rear(-.16,.15,back));
    // the rearmost of what he carries there (his ruck): the container is strapped on over it
    const far=(x,y)=>{const h=cast([x,y,-1],[0,0,1]);return h&&h.z<0&&h.z>-.75?h.z:0;};
    let packZ=backZ;for(const x of [-.14,0,.14])for(const y of [-.02,.08,.18,.28,.38])packZ=Math.min(packZ,far(x,y));
    const deep=.2, boxZ=packZ-deep/2-T2*.5;
    const shoulderY=Math.max(over(width,.06,top),over(width,0,top),over(width,-.06,top));
    for(const s of [-1,1]){
      // the main lift web: up the chest, over the shoulder to the connector, down the back into the container
      const fz=(x,y)=>front(x,y,chest)+T2*.6;
      const path=[P(s*.13,.08,fz(s*.13,.08)),P(s*.145,.25,fz(s*.145,.25)),P(s*.155,.4,fz(s*.155,.4)),
        P(s*width,over(s*width,.1,top)+T2*.6,.1),P(s*width,shoulderY+T2*.6,.02),P(s*width,over(s*width,-.08,top)+T2*.6,-.08),
        P(s*.15,.4,rear(s*.15,.4,back)-T2*.6),P(s*.15,.44,packZ-T2*.6)];
      for(let i=0;i<path.length-1;i++)band(path[i],path[i+1],.048,.012,web);
      // the connector: three rings lying on the shoulder
      for(let k=0;k<3;k++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.017-k*.004,.0035,6,12),steel);ring.position.set(s*width,shoulderY+T2+.004,.04+k*.012);ring.rotation.x=Math.PI/2;g.add(ring);}
    }
    const cz=Math.max(front(-.155,.31,chest),front(.155,.31,chest),front(0,.31,chest))+T2;
    band(P(-.155,.31,cz),P(.155,.31,cz),.04,.012,web);                                               // chest strap
    const buckle=new THREE.Mesh(new THREE.BoxGeometry(.05,.035,.012),steel);buckle.position.set(0,.31,cz+.01);g.add(buckle);
    const wz=front(0,.1,chest), bz=Math.max(rear(.15,.1,back),rear(-.15,.1,back));
    const waist=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.05,24,1,true),web);waist.scale.set(.215,1,(wz-bz)/2+.02);waist.position.set(0,.06,(wz+bz)/2);g.add(waist);
    // the container on his back, a reserve flap over its top, the ripcord housing along the left main lift web
    const box=new THREE.Mesh(new THREE.BoxGeometry(.38,.48,deep),own(pack.clone()));box.position.set(0,.2,boxZ);box.castShadow=true;g.add(box);
    const flap=new THREE.Mesh(new THREE.BoxGeometry(.39,.06,deep+.01),web);flap.position.set(0,.43,boxZ);g.add(flap);
    for(const y of [.05,.3])band(P(-.19,y,boxZ-deep/2-.006),P(.19,y,boxZ-deep/2-.006),.03,.01,web);
    // and held to him: side straps from the container's lower corners round to the waist band
    for(const s of [-1,1])band(P(s*.19,.02,boxZ+deep/2),P(s*.2,.06,Math.max(packZ,backZ-.02)+.01),.035,.01,web);
    // the risers (front and rear a side), the guide rings on the rear ones, the steering lines and toggles
    const risers=[], steer=[], toggles=[];
    for(let i=0;i<4;i++)risers.push(band(P(0,0,0),P(0,1,0),.04,.008,web));
    for(let i=0;i<2;i++){steer.push(band(P(0,0,0),P(0,1,0),.006,.006,cord));const t=new THREE.Mesh(new THREE.BoxGeometry(.03,.09,.03),pack);g.add(t);toggles.push(t);}
    const C=[P(-width,shoulderY+T2+.01,.04),P(width,shoulderY+T2+.01,.04)];
    const L0=[P(-link[0],C[0].y+.6,link[2]),P(link[0],C[1].y+.6,link[2])];
    const L=[P(0,0,0),P(0,0,0)], out=[new THREE.Vector3(),new THREE.Vector3()], hand=new THREE.Vector3(), guide=new THREE.Vector3();
    g.userData.update=(fold=0,hands=null)=>{
      for(let i=0;i<2;i++){
        L[i].lerpVectors(L0[i],P(C[i].x*1.1,C[i].y+.07,C[i].z),fold);
        const rz=-.065*(1-fold)-.02;
        lay(risers[i*2],P(C[i].x,C[i].y,C[i].z+.022),P(L[i].x,L[i].y,L[i].z+.05*(1-fold)+.01),.04,.008);   // front
        lay(risers[i*2+1],P(C[i].x,C[i].y,C[i].z-.012),P(L[i].x,L[i].y,L[i].z+rz),.04,.008);            // rear
        guide.set(mix(C[i].x,L[i].x,.62),mix(C[i].y,L[i].y,.62),mix(C[i].z-.012,L[i].z+rz,.62));
        const held=!!(hands&&hands[i]);
        steer[i].visible=toggles[i].visible=held;
        if(held){hand.copy(hands[i]);g.worldToLocal(hand);lay(steer[i],hand,guide,.006,.006);toggles[i].position.copy(hand);toggles[i].quaternion.copy(steer[i].quaternion);}
        out[i].copy(L[i]);g.localToWorld(out[i]);
      }
      return out;
    };
    g.userData.fit={meshes:body.length,backZ,packZ,deep,shoulderY,chestZ:cz,waistFront:wz,waistBack:bz};
    // every piece takes the light and the shadows as the body does: without receiveShadow the game's renderer
    // drew the container's far faces in the sky's colour (CL-142)
    g.traverse(o=>{if(o.isMesh){o.receiveShadow=true;o.castShadow=true;}});
    g.updateWorldMatrix(true,false);g.userData.update(0,null);
    return g;
  }
  const mix=(a,b,t)=>a+(b-a)*t;
  return {chute,collapse,prepare,fade,dispose,attach,harness};
};
