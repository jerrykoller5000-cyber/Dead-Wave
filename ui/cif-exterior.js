// GP-150: static dressing for the exterior CIF. Local +Z faces the player.
// The caller owns placement and keeps the returned sign in its night-lock list.
export function dressCifExterior(THREE, root, text, lampMaterial) {
  const mat=(color,metalness=.25)=>new THREE.MeshStandardMaterial({color,roughness:.78,metalness});
  const steel=mat(0x47534c), dark=mat(0x172421), edge=mat(0x899285,.55);
  const cloth=[mat(0x62704d,0),mat(0xb49e76,0),mat(0x6e7e80,0)];
  const rubber=mat(0x232a24,0);
  const box=(w,h,d,m,x,y,z,rz=0)=>{
    const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
    o.position.set(x,y,z);o.rotation.z=rz;o.receiveShadow=true;root.add(o);return o;
  };
  // Deep reveal, folded steel jambs and a lower service apron.
  box(1.90,2.48,.10,dark,0,1.85,.06);
  box(1.63,1.46,.06,dark,0,1.78,.13);
  for(const x of [-.88,.88]){
    box(.14,2.42,.42,steel,x,1.84,.24);
    box(.025,1.53,.025,edge,x*.88,1.80,.465);
    for(const y of [.76,1.36,2.30,2.98]){
      const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.027,.027,.016,6),edge);
      bolt.rotation.x=Math.PI/2;bolt.position.set(x,y,.46);root.add(bolt);
    }
  }
  box(1.76,.18,.40,steel,0,2.56,.25);
  box(1.92,.12,.67,steel,0,1.04,.37);
  box(1.79,.026,.58,edge,0,1.115,.38);
  box(1.66,.30,.26,steel,0,.83,.20);
  for(const x of [-.63,.63])box(.07,.28,.34,dark,x,.89,.30);
  // Rain hood and a warm strip, using emission rather than another world light.
  box(2.02,.10,.73,dark,0,3.14,.34);
  box(2.02,.085,.045,edge,0,3.075,.69);
  const lamp=lampMaterial; // Existing bay light also turns red during lockdown.
  box(1.45,.035,.09,lamp,0,2.455,.37);
  // Rolled shutter slats above the rail. Geometry shares the frame's material
  // so the existing HQ static bake combines it into a single material batch.
  for(let i=0;i<4;i++)box(1.64,.035,.05,edge,0,2.60+i*.055,.46);
  box(1.53,.026,.035,edge,0,2.32,.27);
  // GP-151: soft bevelled silhouettes and seam curves, all still baked by HQ.
  const clothSeam=cloth.map(m=>mat(m.color.clone().multiplyScalar(.67),0));
  const leather=mat(0x42463a,0), lace=mat(0x8a8168,0);
  const mesh=(geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.receiveShadow=true;root.add(o);return o;};
  const profile=(points,depth,bevel,m,x,y,z)=>{
    const shape=new THREE.Shape();points.forEach(([px,py],i)=>i?shape.lineTo(px,py):shape.moveTo(px,py));shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:5});
    return mesh(geo,m,x,y,z);
  };
  const soft=(w,h,d,r,m,x,y,z)=>profile([[-w/2+r,-h/2+r],[w/2-r,-h/2+r],[w/2-r,h/2-r],[-w/2+r,h/2-r]],d-2*r,r,m,x,y,z-d/2+r);
  const seam=(points,r,m)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(4,points.length*2),r,5,false),m,0,0,0);
  const shirtOutline=[[-.042,.215],[-.13,.192],[-.196,.15],[-.229,.023],[-.165,.003],[-.133,.080],[-.127,-.090],[-.143,-.215],[-.072,-.225],[.028,-.216],[.134,-.224],[.123,-.072],[.13,.080],[.165,.005],[.228,.025],[.197,.151],[.132,.191],[.044,.215],[.023,.163],[-.019,.163]];
  for(let i=0;i<3;i++){
    const x=(i-1)*.47,m=cloth[i],stitch=clothSeam[i],y=1.976,z=.275;
    // GP-152: the shoulder wire sits inside the garment's thickness, below
    // its shoulder seam. Only the neck and hook emerge through the collar.
    // Hook curls in Y/Z around the X-running rail, rather than beside it.
    seam([[x,y+.188,.301],[x,2.275,.301],[x,2.319,.300],[x,2.341,.288],[x,2.346,.265],[x,2.331,.244],[x,2.307,.248]],.005,edge);
    seam([[x,y+.202,.301],[x-.080,y+.165,.301],[x-.158,y+.111,.301],[x,y+.111,.301],[x+.158,y+.111,.301],[x+.080,y+.165,.301],[x,y+.202,.301]],.005,edge);
    const body=profile(shirtOutline,.057,.009,m,x,y,z);
    // A shallow irregular bow gives the broad face cloth drape, not a slab.
    const pos=body.geometry.attributes.position;
    for(let v=0;v<pos.count;v++){
      const px=pos.getX(v),py=pos.getY(v);
      const bow=.010*Math.cos(px*28+py*9+i)*Math.max(0,1-Math.abs(py)/.24);
      pos.setZ(v,pos.getZ(v)+bow);
    }
    pos.needsUpdate=true;body.geometry.computeVertexNormals();
    for(const s of [-1,1]){
      // Turned collar points and gusseted pockets with pentagonal flaps.
      profile([[s*.010,.166],[s*.046,.212],[s*.087,.176],[s*.055,.125]],.013,.003,m,x,y,.345);
      soft(.085,.101,.020,.006,m,x+s*.077,y+.027,.349);
      profile([[-.045,.019],[.045,.019],[.045,-.003],[0,-.024],[-.045,-.003]],.009,.002,stitch,x+s*.077,y+.068,.361);
      seam([[x+s*.12,y+.112,.345],[x+s*.158,y+.08,.34],[x+s*.18,y+.032,.343]],.0026,stitch);
      seam([[x+s*.067,y-.078,.35],[x+s*.052,y-.135,.354],[x+s*.085,y-.195,.345]],.003,m);
      seam([[x+s*.165,y+.021,.339],[x+s*.202,y+.031,.339],[x+s*.22,y+.038,.333]],.003,stitch);
    }
    soft(.019,.353,.014,.003,m,x,y-.026,.352);
    for(let j=0;j<5;j++){
      const b=mesh(new THREE.SphereGeometry(.0055,6,4),stitch,x,y+.104-j*.063,.365);b.scale.z=.45;
    }
    seam([[x-.128,y-.204,.34],[x-.068,y-.213,.344],[x+.026,y-.204,.344],[x+.121,y-.213,.34]],.0027,stitch);
    // Woven chest tape; no new player-facing wording.
    soft(.087,.017,.007,.002,stitch,x-.076,y+.102,.345);
  }
  box(1.60,.045,.30,steel,0,1.40,.30);
  // Folded bundles have rolled edges, tucked sleeves, slight offsets and seams.
  const bundle=(w,h,d,m,x,y,z)=>{
    const geo=new THREE.BoxGeometry(w,h,d,8,2,6),p=geo.attributes.position,r=Math.min(h*.38,.020);
    const inner=new THREE.Vector3(w/2-r,h/2-r,d/2-r),v=new THREE.Vector3(),nearest=new THREE.Vector3();
    for(let j=0;j<p.count;j++){
      v.fromBufferAttribute(p,j);const sx=v.x/(w/2),sz=v.z/(d/2),side=Math.sign(v.y);
      nearest.set(Math.max(-inner.x,Math.min(inner.x,v.x)),Math.max(-inner.y,Math.min(inner.y,v.y)),Math.max(-inner.z,Math.min(inner.z,v.z)));
      v.sub(nearest).normalize().multiplyScalar(r).add(nearest);
      v.y+=side*.007*Math.cos(sx*Math.PI/2)*Math.cos(sz*Math.PI/2);
      v.y+=.002*Math.sin(sx*8+sz*3);v.z+=.003*Math.sin(sx*9)*Math.abs(sz);
      p.setXYZ(j,v.x,v.y,v.z);
    }
    geo.computeVertexNormals();return mesh(geo,m,x,y,z);
  };
  for(let i=0;i<3;i++){
    const x=-.37+[0,.012,-.007][i],y=1.456+i*.067,z=.295+[0,-.009,.005][i];
    bundle(.55-i*.018,.060,.25,cloth[i],x,y,z);
    bundle(.40,.014,.18,cloth[i],x-.02,y+.029,z+.005);
    seam([[x-.25,y-.006,z+.118],[x-.18,y-.011,z+.130],[x+.14,y-.01,z+.131],[x+.25,y-.003,z+.118]],.0028,clothSeam[i]);
    seam([[x+.23,y+.02,z-.10],[x+.24,y+.027,z],[x+.23,y+.02,z+.11]],.0022,clothSeam[i]);
    // The folded leg/sleeve lies across the top, with a rounded tucked end.
    bundle(.125,.018,.21,cloth[i],x+.125,y+.033,z);
  }
  // Rounded boot uppers loft from the broad toe into a narrower ankle shaft.
  const bootLoft=(rings,m,x)=>{
    const points=[],indices=[],segments=14;
    for(const [y,rx,rz,zc] of rings)for(let j=0;j<segments;j++){
      const a=j/segments*Math.PI*2;points.push(Math.cos(a)*rx,y,zc+Math.sin(a)*rz);
    }
    for(let k=0;k<rings.length-1;k++)for(let j=0;j<segments;j++){
      const a=k*segments+j,b=k*segments+(j+1)%segments,c=b+segments,d=a+segments;indices.push(a,d,b,b,d,c);
    }
    for(let j=1;j<segments-1;j++)indices.push(0,j,(j+1)%segments);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(geo,m,x,0,0);
  };
  for(const x of [.29,.56]){
    bootLoft([[1.425,.090,.151,.337],[1.450,.096,.157,.337],[1.465,.090,.151,.337]],rubber,x);
    bootLoft([[1.46,.085,.147,.337],[1.49,.088,.142,.337],[1.525,.073,.119,.313],[1.57,.063,.075,.270],[1.665,.064,.066,.257],[1.693,.065,.067,.257]],leather,x);
    // Hollow padded cuff, dark interior and rear pull loop.
    const cuff=mesh(new THREE.TorusGeometry(.059,.010,5,14),rubber,x,1.691,.257);cuff.rotation.x=Math.PI/2;cuff.scale.set(1,1.02,1);
    const opening=mesh(new THREE.CircleGeometry(.049,14),dark,x,1.686,.257);opening.rotation.x=-Math.PI/2;
    soft(.029,.046,.014,.005,rubber,x,1.704,.191);
    soft(.068,.138,.016,.007,rubber,x,1.605,.333);
    // Cross-laced eyelets follow the instep up the tongue.
    for(let j=0;j<4;j++){
      const y=1.551+j*.033,z=.352-j*.005;
      for(const s of [-1,1]){
        const eye=mesh(new THREE.SphereGeometry(.007,6,4),edge,x+s*.037,y,z);eye.scale.z=.4;
        seam([[x+s*.031,y,z+.006],[x,y+.015,z+.012],[x-s*.031,y+.025,z+.002]],.0035,lace);
      }
    }
    seam([[x-.070,1.5,.370],[x-.060,1.516,.420],[x,1.519,.447],[x+.060,1.516,.420],[x+.070,1.5,.370]],.0027,rubber);
    for(const s of [-1,1])for(let j=0;j<5;j++)soft(.018,.021,.030,.003,rubber,x+s*.085,1.434,.24+j*.045);
    seam([[x-.048,1.49,.232],[x-.061,1.56,.225],[x-.059,1.65,.217]],.003,rubber);
  }
  const plate=(w,h,x,y,z,paint,emission=.22)=>{
    const cv=document.createElement('canvas');cv.width=1024;cv.height=256;
    const c=cv.getContext('2d');if(c)paint(c);
    const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:0xffffff,emissiveIntensity:emission,roughness:.8,metalness:.12});
    const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);p.position.set(x,y,z);root.add(p);return p;
  };
  // All lettering is catalogue-owned; weathering uses a fixed pattern, no RNG.
  const sign=plate(1.66,.38,0,2.90,.466,c=>{
    c.fillStyle='#263a33';c.fillRect(0,0,1024,256);
    c.strokeStyle='#98a28b';c.lineWidth=4;c.strokeRect(10,10,1004,236);
    c.fillStyle='#d8c795';c.fillRect(28,29,9,198);
    c.textAlign='left';c.fillStyle='#f0e6c7';c.font='bold 155px Impact, Arial Black, sans-serif';c.fillText(text('cif.title'),55,178,340);
    c.fillStyle='#9fb3a1';c.font='bold 31px Arial';c.fillText(text('cif.exterior.unit'),425,70,560);
    c.fillStyle='#f0e6c7';c.font='bold 40px Arial';c.fillText(text('cif.exterior.issue'),425,129,560);
    c.fillStyle='#c7c29d';c.font='bold 27px Arial';c.fillText(text('cif.exterior.kit'),425,190,560);
    for(let i=0;i<50;i++){c.fillStyle='#101a1740';c.fillRect((i*137)%1024,(i*71)%256,6+i%17,2);}
  },.45);
  sign.name='cif-exterior-sign';
  plate(1.62,.20,0,.83,.336,c=>{
    c.fillStyle='#26332b';c.fillRect(0,0,1024,256);
    c.fillStyle='#bfb287';
    for(let i=-1;i<15;i++){c.beginPath();c.moveTo(i*85,210);c.lineTo(i*85+35,210);c.lineTo(i*85+70,256);c.lineTo(i*85+35,256);c.fill();}
    c.textAlign='center';c.font='bold 65px Arial';c.fillStyle='#d8d4b6';c.fillText(text('cif.exterior.return'),512,125,960);
  });
  return sign.material;
}
