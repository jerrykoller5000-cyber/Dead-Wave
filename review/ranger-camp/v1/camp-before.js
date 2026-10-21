/* Static campsite dressing. The caller merges these parts into one world mesh. */
window.buildCampsiteDetails = (THREE, {cx, cz, gy, variant, random, height, solid}) => {
  const parts=[], materials=new Map(), yaw=random()*Math.PI*2;
  const palettes=[{canvas:0x687149,trim:0x39412d},{canvas:0xa7653f,trim:0x584b38},{canvas:0x80765a,trim:0x4d5038}];
  const palette=palettes[variant], wood=0x6b5034, cut=0x9e7b4b, steel=0x454d45, rope=0xb2a585, dark=0x252a23;
  const world=(x,z)=>({x:cx+Math.cos(yaw)*x+Math.sin(yaw)*z,z:cz-Math.sin(yaw)*x+Math.cos(yaw)*z});
  const ground=(x,z)=>{const p=world(x,z);return height(p.x,p.z)-gy;};
  const material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color}));return materials.get(color);};
  const mesh=(geometry,color,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,material(color));m.position.set(x,y,z);parts.push(m);return m;};
  const box=(w,h,d,color,x,y,z,angle=0)=>{const m=mesh(new THREE.BoxGeometry(w,h,d),color,x,y,z);m.rotation.y=angle;return m;};
  const bar=(a,b,r,color,sides=6)=>{
    a=new THREE.Vector3(...a);b=new THREE.Vector3(...b);
    const m=mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),sides),color);
    m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());return m;
  };
  const panel=(vertices,color)=>{
    const positions=[];
    for(let i=1;i<vertices.length-1;i++)for(const v of [vertices[0],vertices[i],vertices[i+1],vertices[i+1],vertices[i],vertices[0]])positions.push(...v);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();return mesh(g,color);
  };
  const collider=(x,z,r,y,h)=>{const p=world(x,z);solid(p.x,p.z,r,gy+y,gy+y+h);};
  function crate(x,z,size=.65,angle=0) {
    const y=ground(x,z);
    box(size,size,size,wood,x,y+size/2,z,angle);
    for(const f of [-.3,.3])box(size+.025,.07,size+.025,cut,x,y+size*(.5+f),z,angle);
    box(size*.55,.04,size*.55,cut,x,y+size+.02,z,angle);
    collider(x,z,size*.65,y,size);
    return y+size;
  }
  function log(a,b,r=.14) {
    bar(a,b,r,wood,8);
    const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av).normalize().multiplyScalar(.012);
    bar(av.clone().sub(d).toArray(),av.clone().add(d).toArray(),r*.9,cut,8);
    bar(bv.clone().sub(d).toArray(),bv.clone().add(d).toArray(),r*.9,cut,8);
  }
  function roll(x,y,z,color,angle=0) {
    const m=mesh(new THREE.CylinderGeometry(.14,.14,.58,10),color,x,y+.14,z);m.rotation.set(0,0,Math.PI/2);m.rotation.y=angle;
    for(const dx of [-.18,.18]){const band=mesh(new THREE.TorusGeometry(.145,.023,4,10),dark,x+Math.cos(angle)*dx,y+.14,z-Math.sin(angle)*dx);band.rotation.y=Math.PI/2+angle;}
  }
  function lantern(x,y,z) {
    mesh(new THREE.CylinderGeometry(.115,.14,.09,8),steel,x,y+.045,z);
    mesh(new THREE.CylinderGeometry(.08,.08,.18,8),0xd8b973,x,y+.17,z);
    mesh(new THREE.ConeGeometry(.15,.11,8),steel,x,y+.31,z);
    for(const dx of [-.105,.105])bar([x+dx,y+.07,z],[x+dx,y+.31,z],.012,steel);
    const handle=mesh(new THREE.TorusGeometry(.095,.014,4,10,Math.PI),steel,x,y+.34,z);
    handle.rotation.z=0;
  }
  function tent(x,z,width,depth,tall,color,wall=.12) {
    const angle=Math.atan2(-x,-z), c=Math.cos(angle), s=Math.sin(angle);
    let base=-Infinity;
    for(const u of [-width/2,width/2])for(const v of [-depth/2,depth/2])base=Math.max(base,ground(x+c*u+s*v,z-s*u+c*v));
    const p=(u,y,v)=>[x+c*u+s*v,base+y,z-s*u+c*v];
    const w=width/2,d=depth/2;
    // Triangular rear, open entrance, and separate sewn panels along the flysheet.
    for(const side of [-1,1])for(let k=0;k<3;k++) {
      const a=-d+depth*k/3,b=-d+depth*(k+1)/3;
      panel([p(0,tall,a),p(side*w,wall,a),p(side*w,wall,b),p(0,tall,b)],new THREE.Color(color).multiplyScalar(k===1?.92:1).getHex());
      bar(p(side*w,wall,a),p(0,tall,a),.012,palette.trim);
    }
    panel([p(-w,wall,-d),p(0,tall,-d),p(w,wall,-d)],palette.trim);
    for(const side of [-1,1]) {
      const back=p(side*w,0,-d),front=p(side*w,0,d);
      back[1]=ground(back[0],back[2])+.02;front[1]=ground(front[0],front[2])+.02;
      panel([back,p(side*w,wall,-d),p(side*w,wall,d),front],color);
    }
    // Entrance flaps are tied aside, leaving a clear view of the sleeping gear.
    for(const side of [-1,1])panel([p(0,tall,d+.01),p(side*w,wall,d+.01),p(side*w*.82,.08,d+.04),p(side*w*.5,.55,d+.06)],color);
    panel([p(-w,.025,-d),p(w,.025,-d),p(w,.025,d),p(-w,.025,d)],dark);
    bar(p(0,tall+.025,-d-.12),p(0,tall+.025,d+.12),.033,wood);
    for(const v of [-d,d])bar(p(0,0,v),p(0,tall+.02,v),.028,steel);
    for(const side of [-1,1])for(const v of [-d,d]) {
      const peg=p(side*(w+.55),0,v*1.18);peg[1]=ground(peg[0],peg[2]);
      bar([peg[0],peg[1]-.04,peg[2]],[peg[0]-.04,peg[1]+.13,peg[2]],.022,steel);
      bar(p(side*w,wall+.05,v),[peg[0],peg[1]+.06,peg[2]],.009,rope,4);
    }
    const bed=p(width*.2,.065,0);
    box(.52,.11,depth*.7,variant===1?0x536c74:0x77714c,...bed,angle);
    const pillow=p(width*.2,.15,-depth*.23);box(.45,.1,.3,0xafa58b,...pillow,angle);
    for(const v of [-depth*.23,depth*.23]){const q=p(0,0,v);collider(q[0],q[2],width*.45,base,tall);}
  }
  function chair(x,z,angle,color) {
    const base=ground(x,z),c=Math.cos(angle),s=Math.sin(angle),p=(a,y,b)=>[x+c*a+s*b,base+y,z-s*a+c*b];
    for(const a of [-.25,.25]) {
      bar(p(a,.02,-.27),p(a,.52,.27),.025,steel);
      bar(p(a,.02,.27),p(a,.88,-.28),.025,steel);
    }
    panel([p(-.27,.5,-.26),p(.27,.5,-.26),p(.27,.5,.27),p(-.27,.5,.27)],color);
    panel([p(-.27,.53,-.27),p(.27,.53,-.27),p(.27,.85,-.28),p(-.27,.85,-.28)],color);
  }
  function table(x,z) {
    const y=ground(x,z);
    for(const dx of [-.6,.6])for(const dz of [-.3,.3])bar([x+dx,y,z+dz],[x+dx*.9,y+.8,z+dz],.035,steel);
    for(let i=0;i<4;i++)box(1.5,.055,.18,wood,x,y+.83,z-.285+i*.19);
    collider(x,z,.75,y,.9);return y+.87;
  }
  function jerrycan(x,z,color=0x677044) {
    const y=ground(x,z);box(.29,.47,.2,color,x,y+.235,z);
    bar([x-.08,y+.49,z],[x+.08,y+.49,z],.025,steel);
    for(const s of [-1,1])bar([x-.1,y+.09,z+s*.105],[x+.1,y+.37,z+s*.105],.012,palette.trim,4);
    box(.075,.045,.07,steel,x-.085,y+.49,z+.04);
  }
  // Every camp has a proper hearth: ash, irregular stones, split logs and a pot.
  mesh(new THREE.CylinderGeometry(.53,.58,.035,12),0x34332c,0,ground(0,0)+.025,0);
  for(let i=0;i<10;i++) {
    const a=i*Math.PI/5, r=.62+(random()-.5)*.08,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const stone=mesh(new THREE.DodecahedronGeometry(.16,0),i%2?0x77756b:0x62645a,x,ground(x,z)+.1,z);stone.scale.set(1.2,.75,.9);stone.rotation.y=random()*6;
  }
  for(let i=0;i<3;i++){const a=i*Math.PI/3;bar([-.4*Math.cos(a),ground(0,0)+.09,-.4*Math.sin(a)],[.4*Math.cos(a),ground(0,0)+.11,.4*Math.sin(a)],.075,0x29251f);}
  const py=ground(.08,0)+.77;
  for(const a of [0,2.1,4.2])bar([Math.cos(a)*.63,ground(Math.cos(a)*.63,Math.sin(a)*.63),Math.sin(a)*.63],[0,py+.48,0],.025,steel);
  bar([0,py+.48,0],[0,py+.09,0],.011,steel,4);
  mesh(new THREE.CylinderGeometry(.18,.14,.19,10),dark,0,py,0);
  mesh(new THREE.CylinderGeometry(.19,.19,.025,10),steel,0,py+.11,0);
  collider(0,0,.65,ground(0,0),.4);
  if(variant===0) {
    tent(-2.8,-3,2.6,3.3,2.05,palette.canvas,.5);
    const y=table(2.7,-2.2);
    box(.85,.012,.5,0xc2b898,2.65,y,-2.2,.08);
    for(let i=0;i<3;i++)box(.025,.008,.4,0x7b8661,2.42+i*.18,y+.01,-2.2,.12);
    box(.34,.23,.2,dark,3.16,y+.12,-2.17);
    bar([3.2,y+.23,-2.17],[3.24,y+.91,-2.17],.009,steel,4);
    for(let i=0;i<4;i++)box(.18,.01,.012,0x858e79,3.14,y+.06+i*.035,-2.06);
    lantern(2.15,y,-2.3);chair(2.8,-.95,Math.PI,palette.canvas);
    crate(3.8,-3.3);crate(3.85,-4.1,.55,.1);jerrycan(2.75,-3.5);jerrycan(3.18,-3.5);
    roll(-1.1,ground(-1.1,-3.4),-3.4,0x637052,.2);
  } else if(variant===1) {
    tent(-3,-2,2.1,2.7,1.65,palette.canvas);
    tent(2.3,-3.4,1.9,2.5,1.5,0x536d78);
    chair(-1.9,.4,1.5,0xaa7147);chair(1.65,.8,-1.2,0x647c6b);
    const y=ground(2.9,1.7);box(.68,.4,.43,0x9b5940,2.9,y+.2,1.7,-.2);box(.73,.09,.47,0xd1c9ad,2.9,y+.445,1.7,-.2);
    bar([2.5,y+.23,1.7],[2.5,y+.44,1.7],.025,steel);
    collider(2.9,1.7,.43,y,.5);
    for(const [x,z,c] of [[-3.7,-.1,0x718071],[3.6,-1.9,0x9b684b]]) {
      const g=ground(x,z);box(.42,.57,.24,c,x,g+.3,z,.2);box(.29,.23,.08,palette.trim,x,g+.2,z+.15,.2);roll(x,g+.6,z,0x777052);
    }
    const stump=ground(-.8,2.2);mesh(new THREE.CylinderGeometry(.3,.33,.4,9),wood,-.8,stump+.2,2.2);lantern(-.8,stump+.41,2.2);
    for(let i=0;i<2;i++){const x=-.5+i*.32;mesh(new THREE.CylinderGeometry(.065,.06,.12,8),0xc6c7aa,x,ground(x,1.35)+.06,1.35);}
  } else {
    // Low lean-to with a sagging canvas roof, open front, and a raised sleeping cot.
    const x=-2.9,z=-2.6,y=Math.max(ground(x-1.3,z-1),ground(x+1.3,z+1));
    for(const a of [-1.3,1.3])for(const b of [-1,1])bar([x+a,ground(x+a,z+b),z+b],[x+a,y+(b>0?1.9:1.35),z+b],.05,wood);
    for(let i=0;i<4;i++){const a=-1.45+i*.725,b=a+.725;panel([[x+a,y+1.95-.1*Math.sin(i*Math.PI/4),z+1.1],[x+b,y+1.95-.1*Math.sin((i+1)*Math.PI/4),z+1.1],[x+b,y+1.35,z-1.1],[x+a,y+1.35,z-1.1]],i%2?palette.canvas:0x72694f);}
    panel([[x-1.3,ground(x-1.3,z-1)+.03,z-1],[x+1.3,ground(x+1.3,z-1)+.03,z-1],[x+1.3,y+1.3,z-1],[x-1.3,y+1.3,z-1]],palette.trim);
    for(const a of [-1.3,1.3]) {
      const px=x+a*1.6,pz=z+1.8,py=ground(px,pz);
      bar([x+a,y+1.9,z+1],[px,py+.07,pz],.009,rope,4);
      bar([px,py-.03,pz],[px,py+.13,pz],.023,steel);
    }
    bar([x-1.45,y+1.97,z+1],[x+1.45,y+1.97,z+1],.045,wood);
    box(1.8,.12,.66,0x625e43,x,y+.37,z);box(.37,.12,.53,0x9b917a,x-.62,y+.5,z);
    for(const a of [-.75,.75])for(const b of [-.24,.24])bar([x+a,y,z+b],[x+a,y+.34,z+b],.035,wood);
    collider(x,z,1,y,1.1);
    for(let row=0;row<2;row++)for(let i=0;i<3-row;i++){const a=2.35+i*.29+row*.14,h=ground(a,-2.8)+.15+row*.23;log([a,h,-3.35],[a,h,-2.35],.14);}
    const sy=ground(2.2,.7);mesh(new THREE.CylinderGeometry(.32,.4,.5,9),wood,2.2,sy+.25,.7);
    bar([2.2,sy+.5,.7],[2.4,sy+1.15,.7],.03,cut);box(.28,.16,.06,steel,2.16,sy+.57,.7,-.1);
    collider(2.2,.7,.4,sy,.5);
    crate(3.2,-1.2,.65,.2);jerrycan(3.8,-1.2,0x797052);
    const y2=ground(-.8,2);log([-1.5,y2+.18,2],[-.1,y2+.18,2],.18);lantern(-1.65,ground(-1.65,2.1),2.1);
  }
  // A few deliberate details around the hearth, with a clear route through camp.
  for(let i=0;i<3;i++){const x=.8+i*.16,z=-1.6;log([x,ground(x,z)+.08,z],[x+.45,ground(x+.45,z+.1)+.08,z+.1],.065);}
  const rotation=new THREE.Matrix4().makeRotationY(yaw);
  for(const part of parts)part.applyMatrix4(rotation);
  return {parts,materials:[...materials.values()],yaw,style:['ranger','hikers','trapper'][variant]};
};
