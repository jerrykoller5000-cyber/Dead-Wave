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
    if(variant===0){
      // The search team's canvas wall tent: reinforced hem, rolled doorway,
      // vent and repair patches. All inside its established footprint.
      for(const side of [-1,1]){
        bar(p(side*w,wall+.025,-d),p(side*w,wall+.025,d),.035,palette.trim);
        bar(p(side*w,.12,-d),p(side*w,.12,d),.018,palette.trim);
        const u=side*w*.6,h=wall+(tall-wall)*.4;
        panel([p(u,h+.012,-.5),p(u-side*.26,h+.32,-.5),p(u-side*.26,h+.32,.02),p(u,h+.012,.02)],0x858969);
        bar(p(side*w*.78,.45,d+.065),p(side*w*.44,tall*.63,d+.065),.064,0x858969,8);
      }
      panel([p(-.18,tall-.38,d+.02),p(0,tall-.13,d+.02),p(.18,tall-.38,d+.02)],dark);
      for(let k=0;k<3;k++)bar(p(-.11+k*.11,tall-.35,d+.035),p(-.07+k*.07,tall-.22,d+.035),.012,palette.trim,4);
      // Spare blanket folded at the foot of the bed, with crossed webbing.
      const q=p(-.55,.13,.45);box(.48,.2,.63,0x9b8060,...q,angle);
      for(const z of [.25,.64]){const q=p(-.55,.24,z);box(.51,.025,.045,dark,...q,angle);}
    }
    if(variant===1){
      // GP-114: different repair fabrics, rolled flaps and personal sleeping gear.
      const patch=x<0?0xc18e63:0x81928b,quilt=x<0?0x887051:0x707950;
      for(const side of [-1,1]){
        bar(p(side*w,.13,-d),p(side*w,.13,d),.021,0x403e32,5);
        bar(p(side*w*.76,.32,d+.07),p(side*w*.33,tall*.68,d+.07),.045,patch,8);
        bar(p(side*w*.66,.51,d+.09),p(side*w*.49,.72,d+.09),.012,rope,4);
      }
      const side=x<0?1:-1,aa=side*w*.37,bb=side*w*.72,h1=tall-(tall-wall)*.37,h2=tall-(tall-wall)*.72;
      panel([p(aa,h1+.014,-.48),p(bb,h2+.014,-.48),p(bb,h2+.014,.02),p(aa,h1+.014,.02)],patch);
      for(let j=0;j<5;j++){const v=-.45+j*.105;bar(p(aa,h1+.021,v),p(aa+side*.04,h1-.04,v),.005,0xd3bea0,4);}
      const q=p(width*.2,.145,.17);box(.49,.11,depth*.42,quilt,...q,angle);
      for(let j=0;j<4;j++){const q=p(width*.2,.203,-.15+j*.19);box(.48,.01,.016,0x4f5548,...q,angle);}
      const q2=p(-width*.23,.08,d*.36);box(.26,.1,.19,x<0?0xaaa187:0x9b704c,...q2,angle);
      // Worn boots on the small groundsheet lip, with soles, collars and laces.
      for(const u of [-.17,.17]){
        const q=p(u,0,d+.27);q[1]=ground(q[0],q[2]);
        box(.18,.045,.34,dark,q[0],q[1]+.035,q[2],angle);
        box(.17,.12,.29,0x665b45,q[0],q[1]+.11,q[2],angle);
        const ankle=p(u,0,d+.19);box(.16,.17,.16,0x7c6a4e,ankle[0],q[1]+.2,ankle[2],angle);
        box(.11,.015,.11,dark,ankle[0],q[1]+.289,ankle[2],angle);
        for(let j=0;j<3;j++){const r=p(u,0,d+.21+j*.04);box(.115,.015,.014,rope,r[0],q[1]+.174,r[2],angle);}
      }
    }
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
    // GP-107: a covered search desk and cached rescue equipment. No new
    // collider or random draw: camp positions, paths and destruction stay exact.
    const roofY=y+1.38;
    for(const x of [2.1,3.3])for(const z of [-2.5,-1.9])
      bar([x,ground(x,z),z],[x,roofY+(z<-2.2?.12:0),z],.023,steel);
    for(let k=0;k<3;k++){
      const x=1.83+k*.58,xx=x+.58;
      panel([[x,roofY+.09,-1.67],[xx,roofY+.09,-1.67],[xx,roofY+.035,-2.2],[x,roofY+.035,-2.2]],k===1?0x798266:0x8e9271);
      panel([[x,roofY+.035,-2.2],[xx,roofY+.035,-2.2],[xx,roofY+.22,-2.76],[x,roofY+.22,-2.76]],k===1?0x798266:0x8e9271);
    }
    for(const z of [-1.67,-2.76])bar([1.83,roofY+(z<-2?.22:.09),z],[3.57,roofY+(z<-2?.22:.09),z],.02,palette.trim);
    // A low side apron leaves the map visible from the fire.
    panel([[3.57,roofY+.09,-1.67],[3.57,roofY+.22,-2.76],[3.57,roofY-.18,-2.76],[3.57,roofY-.24,-1.67]],palette.trim);
    // Contours, a marked search route and a compass on the existing paper map.
    for(let k=0;k<4;k++){
      const x=2.33+k*.15;
      bar([x,y+.022,-2.38],[x+.07,y+.022,-2.24],.007,0x8d8d6e,4);
      bar([x+.07,y+.022,-2.24],[x+.04,y+.022,-2.04],.007,0x8d8d6e,4);
    }
    bar([2.38,y+.03,-2.07],[2.55,y+.03,-2.24],.009,0x984b37,4);
    bar([2.55,y+.03,-2.24],[2.83,y+.03,-2.31],.009,0x984b37,4);
    mesh(new THREE.CylinderGeometry(.048,.048,.025,10),0xb3995e,2.32,y+.02,-2.12);
    box(.015,.015,.23,0xc6a455,2.91,y+.025,-2.1,.3);
    mesh(new THREE.CylinderGeometry(.068,.059,.11,10),0xb6bbab,2.7,y+.06,-2.47);
    mesh(new THREE.CylinderGeometry(.052,.052,.006,10),0x403327,2.7,y+.119,-2.47);
    const mh=mesh(new THREE.TorusGeometry(.038,.012,4,8),0xb6bbab,2.785,y+.065,-2.47);mh.rotation.y=Math.PI/2;
    // Strapped waterproof orange bag on a crate and rope coiled next to it.
    const cy=ground(3.8,-3.3)+.65;
    box(.51,.21,.43,0xa36b39,3.8,cy+.11,-3.3);
    box(.46,.05,.43,0xc59458,3.8,cy+.235,-3.3);
    for(const x of [3.64,3.95])box(.05,.235,.445,dark,x,cy+.12,-3.3);
    for(const x of [3.65,3.95])box(.07,.07,.018,steel,x,cy+.11,-3.069);
    const ry=ground(3.85,-4.1)+.57;
    for(let k=0;k<4;k++){const r=mesh(new THREE.TorusGeometry(.18-k*.028,.017,4,14),rope,3.85,ry+k*.012,-4.1);r.rotation.x=Math.PI/2;}
    // A folded rescue litter stowed upright against the same supply stack.
    for(const x of [4.03,4.37])bar([x,ground(4.18,-3.32)+.05,-3.22],[x,ground(4.18,-3.32)+1.16,-3.5],.022,steel);
    const ly=ground(4.18,-3.32);
    panel([[4.04,ly+.23,-3.27],[4.36,ly+.23,-3.27],[4.36,ly+.96,-3.45],[4.04,ly+.96,-3.45]],0x9a8156);
    for(const h of [.4,.75])bar([4.02,ly+h,-3.22-h*.25],[4.38,ly+h,-3.22-h*.25],.018,dark,4);
  } else if(variant===1) {
    tent(-3,-2,2.1,2.7,1.65,palette.canvas);
    tent(2.3,-3.4,1.9,2.5,1.5,0x536d78);
    chair(-1.9,.4,1.5,0xaa7147);chair(1.65,.8,0,0x647c6b);
    const y=ground(2.9,1.7);box(.68,.4,.43,0x9b5940,2.9,y+.2,1.7,-.2);box(.73,.09,.47,0xd1c9ad,2.9,y+.445,1.7,-.2);
    bar([2.5,y+.23,1.7],[2.5,y+.44,1.7],.025,steel);
    collider(2.9,1.7,.43,y,.5);
    for(const [x,z,c] of [[-3.7,-.1,0x718071],[2.32,.61,0x9b684b]]) {
      const g=ground(x,z),geo=new THREE.CylinderGeometry(.23,.21,.52,8);geo.scale(1,1,.67);mesh(geo,c,x,g+.3,z);
      box(.34,.22,.1,c,x,g+.22,z+.18);box(.41,.08,.28,c,x,g+.59,z);
      for(const s of [-1,1]){box(.036,.42,.025,dark,x+s*.12,g+.32,z+.237);box(.06,.045,.027,0x959986,x+s*.12,g+.39,z+.255);bar([x+s*.13,g+.52,z-.17],[x+s*.13,g+.19,z-.17],.022,dark);}
      roll(x,g+.64,z,0x777052);box(.1,.2,.095,0xa2a994,x+.24,g+.25,z);box(.035,.035,.04,dark,x+.24,g+.367,z);
    }
    const stump=ground(-.8,2.2);mesh(new THREE.CylinderGeometry(.3,.33,.4,9),wood,-.8,stump+.2,2.2);lantern(-.8,stump+.41,2.2);
    for(let i=0;i<2;i++){const x=-.5+i*.32;mesh(new THREE.CylinderGeometry(.065,.06,.12,8),0xc6c7aa,x,ground(x,1.35)+.06,1.35);}
    // A meal interrupted: open food sack, enamel plates, bread and a cold frying pan.
    const foodY=ground(.65,1.45);
    box(.38,.24,.29,0x9b8058,.65,foodY+.13,1.45,-.1);box(.31,.015,.22,dark,.65,foodY+.256,1.45,-.1);
    for(const dx of [-.15,.15])box(.055,.09,.3,0xb9a37b,.65+dx,foodY+.28,1.45,-.1);
    box(.19,.06,.11,0xb99a63,.58,foodY+.29,1.43,.15);
    for(const [x,z]of [[.13,1.45],[.91,.97]]){
      const h=ground(x,z);mesh(new THREE.CylinderGeometry(.14,.14,.025,12),0xb6b8a3,x,h+.03,z);
      mesh(new THREE.CylinderGeometry(.116,.116,.014,12),0x7c8274,x,h+.049,z);
      box(.13,.065,.08,0xb49a65,x-.025,h+.081,z,.2);bar([x+.15,h+.034,z-.09],[x+.15,h+.034,z+.08],.009,steel,4);
    }
    const panY=ground(-.65,.93);mesh(new THREE.CylinderGeometry(.18,.16,.045,12),steel,-.65,panY+.04,.93);mesh(new THREE.CylinderGeometry(.15,.15,.012,12),dark,-.65,panY+.066,.93);bar([-.8,panY+.05,.94],[-1.12,panY+.052,1.07],.024,dark);
    for(const x of [-.5,-.18]){const h=ground(x,1.35);mesh(new THREE.CylinderGeometry(.051,.051,.006,8),0x473b2e,x,h+.123,1.35);const handle=mesh(new THREE.TorusGeometry(.04,.01,4,10),0xc6c7aa,x+.087,h+.068,1.35);handle.rotation.y=Math.PI/2;}
    // The waiting chair faces the camp's open approach; its packed bag sits beside it.
    const seatY=ground(1.65,.8);box(.29,.035,.2,0xb7b197,1.65,seatY+.528,.8,.1);
    for(const dx of [-.26,.26]){bar([1.65+dx,seatY+.47,.9],[1.65+dx,seatY+.7,.82],.018,steel);box(.045,.045,.39,0x5a6250,1.65+dx,seatY+.72,.79);}
    // Pike's low rock shelf at the back of camp. Its solids are appended after all legacy solids.
    const sx=0,sz=-5.55,base=Math.max(ground(-1.3,-6.2),ground(1.3,-4.9));
    // Embedded rock faces meet the hillside at every foot instead of floating on one base height.
    const rootedRock=(outline,top,color)=>{
      const cx=outline.reduce((s,p)=>s+p[0],0)/outline.length,cz=outline.reduce((s,p)=>s+p[1],0)/outline.length;
      const low=outline.map(([x,z])=>[x,ground(x,z)-.22,z]);
      const high=outline.map(([x,z],i)=>[cx+(x-cx)*.82,top+(i%2)*.09,cz+(z-cz)*.82]);
      const middle=outline.map(([x,z],i)=>[cx+(x-cx)*(i%2?1.08:1.16),ground(x,z)+(top-ground(x,z))*.4,cz+(z-cz)*1.12]);
      panel(high,color);for(let i=0;i<outline.length;i++){const j=(i+1)%outline.length;panel([low[i],low[j],middle[j],middle[i]],i%2?color:0x5d6658);panel([middle[i],middle[j],high[j],high[i]],i%2?0x777e6b:color);}
    };
    rootedRock([[-1.29,-6.17],[-.56,-6.54],[.99,-6.31],[1.27,-5.94],[.75,-5.86],[-.94,-5.96]],base+1.12,0x6c7463);
    rootedRock([[-1.48,-5.93],[-1.01,-5.86],[-.91,-5.31],[-1.22,-5.02],[-1.55,-5.42]],base+.91,0x737b69);
    for(const [x,z,r]of [[-1.57,-5.48,.23],[-1.23,-6.32,.3],[1.08,-6.17,.34]]){const stone=mesh(new THREE.DodecahedronGeometry(r,0),0x6d7662,x,ground(x,z)+r*.27,z);stone.scale.set(1.2,.65,1);stone.rotation.y=x*2;}
    // A sloping, fractured crown and thin projecting lip read as a natural rock overhang.
    const edge=[[-1.48,-.62],[-.7,-.84],[.84,-.71],[1.48,-.25],[1.33,.66],[-.96,.72],[-1.5,.26]];
    const top=edge.map(([x,z],i)=>[sx+x,base+1.16-z*.25+(i%3)*.055,sz+z]),bottom=edge.map(([x,z],i)=>[sx+x*.95,base+.76+(i%2)*.05,sz+z*.95]);
    const crown=[-.3,base+1.73,sz-.33];
    panel([...bottom].reverse(),0x424b40);for(let i=0;i<edge.length;i++){panel([top[i],top[(i+1)%edge.length],crown],i%3===0?0x7b826e:0x69735f);panel([bottom[i],bottom[(i+1)%edge.length],top[(i+1)%edge.length],top[i]],i%2?0x697161:0x828570);}
    // Small patches follow the terrain, including the sleeping mat on this sloping site.
    const groundPatch=(x,z,w,d,color,lift=.035,ragged=false)=>{
      const nx=Math.ceil(w/.13),nz=Math.ceil(d/.13),positions=[];
      const p=(i,j)=>{const a=x-w/2+w*i/nx,b=z-d/2+d*j/nz+(ragged?.035*Math.sin(i*2.3+j*1.7):0);return[a,ground(a,b)+lift,b];};
      for(let i=0;i<nx;i++)for(let j=0;j<nz;j++)for(const v of[p(i,j),p(i+1,j+1),p(i+1,j),p(i,j),p(i,j+1),p(i+1,j+1)])positions.push(...v);
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();mesh(geo,color);
    };
    // Ash and mud beneath the lip, with hand-smears leading in from the hearth side.
    for(const [x,z,w,d]of [[0,-5.27,1.6,.86],[-.4,-4.74,.45,.22],[.12,-4.52,.38,.15]])groundPatch(x,z,w,d,0x47473b,.032,true);
    groundPatch(.05,-5.32,1.33,.62,0x51594a,.06);groundPatch(-.49,-5.32,.25,.5,0x77745e,.095);
    for(let j=0;j<5;j++)groundPatch(-.28+j*.18,-5.32,.018,.48,0x3e4639,.066);
    const kitY=ground(.83,-5.14);box(.24,.18,.17,0x596246,.83,kitY+.11,-5.14,.16);for(const x of [.76,.88])box(.025,.2,.18,dark,x,kitY+.12,-5.14,.16);
    mesh(new THREE.CylinderGeometry(.062,.055,.18,8),0x707b62,.79,ground(.79,-4.92)+.1,-4.92);box(.16,.018,.2,0x918d6b,.49,ground(.49,-4.81)+.026,-4.81,.2);
    const rearFloor=Math.min(ground(-1.29,-6.17),ground(.99,-6.31))-.22,footFloor=Math.min(ground(-1.48,-5.93),ground(-1.22,-5.02))-.22;
    collider(0,sz-.55,1.05,rearFloor,base+1.21-rearFloor);collider(-1.24,sz+.06,.37,footFloor,base+1-footFloor);collider(0,sz,1.49,base+.76,.97);
  } else {
    // GP-111: a repeatedly repaired trapper cabin in the original shelter footprint.
    // Keep the old collider and random stream: this is static scenery, not a new interior.
    const x=-2.9,z=-2.6,y=Math.max(ground(x-1.3,z-1),ground(x+1.3,z+1));
    const aged=[0x686451,0x756b54,0x5e5948,0x82745b,0x625b49], iron=0x363b37;
    const nail=(a,b,c)=>box(.025,.025,.012,iron,a,b,c);
    const shoe=(a,b,c,r=.13)=>{const h=mesh(new THREE.TorusGeometry(r,.025,4,14,Math.PI*1.5),iron,a,b,c);h.rotation.z=Math.PI*.75;for(const s of [-1,1])nail(a+s*r*.77,b+r*.45,c+.025);};
    for(const a of [-1.22,1.22])for(const b of [-.91,.91]){
      const floor=ground(x+a,z+b);box(.23,y+2.05-floor,.23,0x514632,x+a,(floor+y+2.05)/2,z+b);
      const rock=mesh(new THREE.DodecahedronGeometry(.23,0),0x6b6c60,x+a,floor+.1,z+b);rock.scale.set(1,.7,1);
    }
    // Close dark backing behind uneven boards prevents pinholes without bright interior lighting.
    box(2.45,1.95,.045,dark,x,y+1.04,z-.93);
    for(let i=0;i<12;i++){const a=-1.13+i*.205;box(.194,1.91,.09,aged[i%5],x+a,y+1.035,z-.97);for(let k=0;k<2;k++)box(.008,.19+(i%3)*.08,.008,0x514c3c,x+a-.045+k*.072,y+.48+k*.75+(i%4)*.055,z-1.019);}
    for(const side of [-1,1]){
      box(.055,1.95,1.86,dark,x+side*1.21,y+1.04,z);
      for(let i=0;i<9;i++){box(.09,1.9,.197,aged[(i+2)%5],x+side*1.25,y+1.03,z-.82+i*.205);for(let k=0;k<2;k++)box(.008,.17+(i%3)*.09,.008,0x514c3c,x+side*1.299,y+.5+k*.86+(i%3)*.04,z-.85+i*.205+k*.055);}
      for(const h of [.3,1.75])box(.12,.09,2.05,0x504936,x+side*1.29,y+h,z);
      // Long diagonal replacement plank and an old shuttered slit window.
      bar([x+side*1.32,y+.43,z-.7],[x+side*1.32,y+1.33,z+.68],.045,0x8c7b5e,4);
      box(.028,.56,.58,iron,x+side*1.31,y+1.32,z-.26);
      for(let k=0;k<3;k++)box(.06,.51,.17,aged[k],x+side*1.34,y+1.32,z-.44+k*.18);
      for(const h of [1.17,1.5])box(.075,.045,.57,iron,x+side*1.375,y+h,z-.26);
    }
    box(2.46,1.96,.04,dark,x,y+1.05,z+.925);
    for(let i=0;i<12;i++){const a=-1.13+i*.205;if(Math.abs(a)<.48)continue;box(.194,1.94,.08,aged[(i+1)%5],x+a,y+1.06,z+.98);for(const h of [.24,1.75])nail(x+a,y+h,z+1.027);for(let k=0;k<2;k++)box(.008,.17+(i%3)*.07,.009,0x514c3c,x+a-.045+k*.075,y+.5+k*.68+(i%3)*.08,z+1.024);}
    // A recessed, shut plank door; no new interaction is implied.
    for(let i=0;i<5;i++)box(.176,1.53,.045,i%2?0x564936:0x60513b,x-.36+i*.18,y+.89,z+.952);
    for(const a of [-.51,.51])box(.11,1.76,.14,0x817258,x+a,y+.94,z+1.025);
    box(1.13,.15,.14,0x817258,x,y+1.86,z+1.025);
    for(const h of [.4,1.35]){box(.87,.07,.035,iron,x,y+h,z+.991);for(const a of [-.34,.34])nail(x+a,y+h,z+1.012);}
    bar([x-.36,y+.43,z+.99],[x+.34,y+1.32,z+.99],.025,0x8a7657,4);
    const latch=mesh(new THREE.TorusGeometry(.055,.012,4,10),iron,x+.28,y+.95,z+1.007);
    shoe(x,y+1.87,z+1.112,.135);
    // Earlier fasteners remain below the current horseshoe.
    for(const a of [-.19,.18])box(.025,.025,.009,0x302e24,x+a,y+1.78,z+1.1);
    for(let k=0;k<3;k++)box(.11,.48,.025,0x8a785c,x+.69+k*.15,y+.67+k*.025,z+1.038);
    // Timber gables, overlapping split shakes, a canvas repair held by battens.
    for(const b of [-1,1]){panel([[x-1.3,y+2.02,z+b],[x+1.3,y+2.02,z+b],[x,y+2.74,z+b]],0x5c5341);for(let k=-5;k<=5;k++){const a=k*.21,h=.66-Math.abs(a)*.55;box(.196,h,.025,aged[(k+5)%5],x+a,y+2.02+h/2,z+b*1.02);}bar([x-1.36,y+2.01,z+b],[x,y+2.79,z+b],.06,wood,4);bar([x,y+2.79,z+b],[x+1.36,y+2.01,z+b],.06,wood,4);}
    for(const side of [-1,1])for(let row=0;row<3;row++)for(let k=0;k<7;k++){
      const a=row*.49,b=(row+1)*.49+.05+.018*Math.sin(k*3+row),v=-1.19+k*.34,lift=(2-row)*.012;
      panel([[x+side*a,y+2.79-a*.53+lift,z+v],[x+side*b,y+2.79-b*.53+lift,z+v],[x+side*b,y+2.79-b*.53+lift,z+v+.33],[x+side*a,y+2.79-a*.53+lift,z+v+.33]],aged[(k+row*2)%5]);
    }
    bar([x,y+2.82,z-1.26],[x,y+2.82,z+1.26],.07,0x514632,4);
    panel([[x+.43,y+2.58,z-.87],[x+1.25,y+2.14,z-.87],[x+1.25,y+2.14,z-.05],[x+.43,y+2.58,z-.05]],0x687057);
    for(const b of [-.84,-.08])bar([x+.4,y+2.6,z+b],[x+1.29,y+2.13,z+b],.023,0x8c7b5e,4);
    // Cold stovepipe: this cabin has been empty for some time.
    mesh(new THREE.CylinderGeometry(.08,.08,1.03,8),iron,x-.62,y+2.65,z-.55);
    mesh(new THREE.ConeGeometry(.14,.11,8),iron,x-.62,y+3.2,z-.55);
    for(let k=0;k<3;k++){const a=-.36+k*.35;const h=ground(x+a,z+1.25);box(.34,.09,.38,0x686454,x+a,h+.055,z+1.25);}
    collider(x,z,1,y,1.1);
    for(let row=0;row<2;row++)for(let i=0;i<3-row;i++){const a=2.35+i*.29+row*.14,h=ground(a,-2.8)+.15+row*.23;log([a,h,-3.35],[a,h,-2.35],.14);}
    const sy=ground(2.2,.7);mesh(new THREE.CylinderGeometry(.32,.4,.5,9),wood,2.2,sy+.25,.7);
    bar([2.2,sy+.5,.7],[2.4,sy+1.15,.7],.03,cut);box(.28,.16,.06,steel,2.16,sy+.57,.7,-.1);
    collider(2.2,.7,.4,sy,.5);
    crate(3.2,-1.2,.65,.2);jerrycan(3.8,-1.2,0x797052);
    // A woodpile doubles as storage under a scarred outdoor repair bench.
    const bench=ground(2.75,-2.8)+.91;
    for(const a of [2.06,3.44])for(const b of [-3.09,-2.48])bar([a,ground(a,b),b],[a,bench,b],.043,0x584a35,4);
    for(let k=0;k<4;k++)box(1.62,.065,.17,aged[k],2.75,bench,-3.045+k*.18);
    for(const a of [2.14,3.35])for(const b of [-3.045,-2.505])box(.025,.01,.025,iron,a,bench+.038,b);
    box(.36,.045,.23,0x94856b,2.4,bench+.055,-2.82,.16);
    bar([2.76,bench+.045,-2.98],[3.04,bench+.05,-2.7],.024,0x947953,6);box(.19,.055,.07,iron,2.78,bench+.061,-2.97,-.5);
    for(const a of [3.13,3.18,3.23])bar([a,bench+.05,-2.89],[a+.035,bench+.052,-2.76],.007,iron,4);
    // Two stored traps on the cabin wall, with chain loops hanging below.
    for(const a of [-.85,.86]){shoe(x+a,y+1.35,z+1.04,.16);box(.05,.22,.035,iron,x+a,y+1.24,z+1.052);box(.115,.08,.035,0x625d4c,x+a,y+1.32,z+1.074);for(const s of [-1,1])for(let k=0;k<2;k++)box(.04,.025,.03,steel,x+a+s*.11,y+1.31+k*.065,z+1.075);for(let k=0;k<4;k++){const r=mesh(new THREE.TorusGeometry(.025,.007,4,8),steel,x+a+.015*(k%2),y+1.09-k*.04,z+1.055);r.rotation.y=k%2?1:0;}}
    // Repaired stool, water pail and a tool roll keep the route's low edges readable.
    const stool=ground(-1.65,.4);for(const a of [-.15,.15])for(const b of [-.14,.14])bar([-1.65+a,stool,.4+b],[-1.65+a*.8,stool+.4,.4+b*.8],.027,wood,5);
    box(.45,.07,.4,0x817258,-1.65,stool+.43,.4);box(.045,.025,.42,iron,-1.57,stool+.48,.4);
    const by=ground(-1.15,-.7);mesh(new THREE.CylinderGeometry(.16,.115,.28,10),0x747369,-1.15,by+.15,-.7);mesh(new THREE.CylinderGeometry(.14,.14,.01,10),dark,-1.15,by+.295,-.7);
    const handle=mesh(new THREE.TorusGeometry(.155,.011,4,12,Math.PI),iron,-1.15,by+.3,-.7);
    roll(3.19,ground(3.2,-1.2)+.67,-1.2,0x7e7258,.2);
    const y2=ground(-.8,2);log([-1.5,y2+.18,2],[-.1,y2+.18,2],.18);lantern(-1.65,ground(-1.65,2.1),2.1);
  }
  // A few deliberate details around the hearth, with a clear route through camp.
  for(let i=0;i<3;i++){const x=.8+i*.16,z=-1.6;log([x,ground(x,z)+.08,z],[x+.45,ground(x+.45,z+.1)+.08,z+.1],.065);}
  const rotation=new THREE.Matrix4().makeRotationY(yaw);
  for(const part of parts)part.applyMatrix4(rotation);
  return {parts,materials:[...materials.values()],yaw,style:['ranger','hikers','trapper'][variant]};
};
