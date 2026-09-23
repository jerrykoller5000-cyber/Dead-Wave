/* Static landmark art. Kept separate from gameplay so multiple agents can edit
   the world safely. Parts are baked into each owner's existing merged mesh. */
window.buildLandmarkDetails = (THREE, o) => {
  const parts = [], solids = [], mats = new Map();
  const ground = o.ground || (() => 0), variant = o.variant || 0;
  const C = { wood:0x72553b, cut:0x9b8058, old:0x514739, dark:0x282c27,
    steel:0x606963, rust:0x805039, pale:0xb9b4a1, stone:0x7e8075,
    olive:0x646b49, red:0x934b37, rope:0xa79974, soot:0x383631 };
  const mat = c => { if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({color:c})); return mats.get(c); };
  const mesh = (geo,c,x=0,y=0,z=0) => {
    const m = new THREE.Mesh(geo,mat(c)); m.position.set(x,y,z); parts.push(m); return m;
  };
  const box = (w,h,d,c,x,y,z,ry=0,rz=0,rx=0) => {
    const m = mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z); m.rotation.set(rx,ry,rz); return m;
  };
  const bar = (a,b,r,c,sides=6) => {
    const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);
    const m=mesh(new THREE.CylinderGeometry(r,r,delta.length(),sides),c);
    m.position.copy(av).add(bv).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()); return m;
  };
  const cyl = (r,h,c,x,y,z,sides=10) => mesh(new THREE.CylinderGeometry(r,r,h,sides),c,x,y,z);
  const ring = (r,t,c,x,y,z) => mesh(new THREE.TorusGeometry(r,t,5,16),c,x,y,z);
  const panel = (vs,c) => {
    const p=[];
    for(let i=1;i<vs.length-1;i++)for(const v of [vs[0],vs[i],vs[i+1],vs[i+1],vs[i],vs[0]])p.push(...v);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();return mesh(g,c);
  };
  const solid = (x,z,r,y,h) => solids.push({x,z,r,y,h});
  const transform = (start,x,y,z,yaw=0,roll=0,pitch=0) => {
    const m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,roll)),new THREE.Vector3(1,1,1));
    for(let i=start;i<parts.length;i++)parts[i].applyMatrix4(m);
  };
  function crate(x,y,z,w=.65,color=C.wood,yaw=0,medical=false) {
    const start=parts.length;
    box(w,w*.75,w,color,0,w*.375,0);
    for(const s of [-1,1]){
      box(w+.035,.07,w+.035,C.cut,0,w*(.375+s*.23),0);
      box(.075,w*.76,w+.05,C.old,s*w*.32,w*.375,0);
    }
    for(let i=0;i<4;i++)box(w*.23,.03,w-.03,i%2?color:C.cut,(i-1.5)*w*.24,w*.75+.01,0);
    if(medical){box(.25,.27,.012,C.pale,0,w*.38,w*.51);box(.05,.19,.016,C.red,0,w*.38,w*.52);box(.18,.05,.016,C.red,0,w*.38,w*.52);}
    transform(start,x,y,z,yaw);
  }
  function can(x,y,z,color=C.olive) {
    box(.29,.44,.2,color,x,y+.22,z);
    box(.3,.025,.21,C.old,x,y+.025,z);
    for(const s of [-1,1])bar([x-.1,y+.07,z+s*.105],[x+.1,y+.36,z+s*.105],.012,C.old,4);
    bar([x-.09,y+.48,z],[x+.05,y+.48,z],.023,C.steel);
    cyl(.043,.03,C.dark,x+.09,y+.46,z);
  }
  function bolt(x,y,z,axis='z') {
    const m=cyl(.034,.026,C.steel,x,y,z,6);
    if(axis==='z')m.rotation.x=Math.PI/2;
    if(axis==='x')m.rotation.z=Math.PI/2;
  }
  function lantern(x,y,z) {
    cyl(.12,.055,C.dark,x,y+.03,z);cyl(.075,.2,0xc1ac79,x,y+.15,z);
    mesh(new THREE.ConeGeometry(.14,.11,8),C.dark,x,y+.29,z);
    for(const s of [-1,1])bar([x+s*.09,y+.06,z],[x+s*.09,y+.27,z],.012,C.steel);
    ring(.08,.012,C.steel,x,y+.39,z);
  }
  function plankFloor(x,y,z,w,d) {
    const n=Math.ceil(w/.25);
    for(let i=0;i<n;i++)box(w/n-.016,.05,d,i%3?C.wood:C.cut,x-w/2+(i+.5)*w/n,y,z);
  }
  function ruinedFloor(w,d) {
    // A rotted floor follows the soil underneath. Small missing patches are
    // intentional, instead of terrain cutting arbitrary holes through a flat slab.
    const nx=Math.floor(w/.27),nz=Math.floor(d/.65),sx=w/nx,sz=d/nz;
    for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
      if((i*7+j*11)%17<3)continue;
      const x=-w/2+(i+.5)*sx,z=-d/2+(j+.5)*sz,y=ground(x,z)+.035;
      const rx=Math.atan2(ground(x,z-sz/2)-ground(x,z+sz/2),sz);
      const rz=Math.atan2(ground(x+sx/2,z)-ground(x-sx/2,z),sx);
      box(sx-.016,.045,sz-.022,(i+j)%3?C.old:C.wood,x,y,z,0,rz,rx);
    }
  }
  function pipeCable(points,r=.022,c=C.dark) { for(let i=1;i<points.length;i++)bar(points[i-1],points[i],r,c,5); }
  let theme='';

  if(o.kind==='cabin') {
    theme=variant%2?'burned supply house':'last aid station';
    ruinedFloor(4.78,3.78);
    // Thin overlapping siding replaces the blank slab appearance without closing
    // the collapsed side or adding a roof over the playable entrance.
    for(let row=0;row<9;row++){
      const y=.39+row*.21;
      box(4.8,.19,.045,row%3?C.wood:C.old,0,y,-2.045);
      box(.045,.19,3.76,row%4?C.wood:C.old,-2.545,y,0);
    }
    for(const x of [-2.4,2.4])box(.18,2.12,.18,C.cut,x,1.18,-1.91);
    // Boarded window, proud frame and projecting sill on the surviving side.
    box(.06,.77,1.03,C.dark,-2.585,1.3,-.25);
    for(const z of [-.83,.33])box(.12,.97,.09,C.cut,-2.63,1.3,z);
    for(const y of [.8,1.79])box(.16,.09,1.3,C.cut,-2.63,y,-.25);
    for(let i=0;i<3;i++)box(.07,.12,1.25,C.old,-2.68,1.04+i*.23,-.25,0,0,(i-1)*.16);
    // Roof boards follow the actual pitch of the surviving panel.
    for(let i=0;i<12;i++){
      const u=-1.6+i*.28;
      box(.265,.04,2.92,i%4?C.old:C.soot,-.9+u*Math.cos(.42),2.26+u*Math.sin(.42),-.6,0,.42);
    }
    for(const z of [-1.6,.65])bar([-2.35,1.64,z],[.4,2.85,z],.07,C.old,4);
    box(.17,1.25,.17,C.cut,.6,.97,1.75,0,-.39);
    // Brick joints and a broken clay chimney cap.
    for(let row=0;row<11;row++)for(let j=0;j<3;j++){
      const x=1.7+(j-1)*.24;
      box(.22,.22,.045,(row+j)%3?0x827969:0x635e54,x,.25+row*.24,-1.88);
    }
    box(.91,.15,.91,C.stone,1.7,2.88,-1.5);
    box(.47,.035,.47,C.dark,1.7,2.97,-1.5);
    for(const x of [-2.1,-1.75])box(.21,.16,3.8,C.old,x,.34,0);
    // Contents tell two different stories: emergency treatment, or a fire that
    // interrupted ration storage. All large objects sit beside existing walls.
    if(variant%2===0){
      box(.78,.12,1.8,C.old,-1.8,.73,.1);
      box(.7,.12,1.65,0x9b9d83,-1.8,.84,.1);
      box(.64,.11,.37,C.pale,-1.8,.95,-.5);
      for(const z of [-.6,.8])for(const x of [-2.07,-1.53])bar([x,.28,z],[x,.7,z],.026,C.steel);
      crate(.55,.3,-1.3,.65,C.olive,.1,true);
      box(.35,.06,.22,C.pale,.1,.34,.95,-.2);
      for(let i=0;i<3;i++)cyl(.034,.15,0x797954,.45+i*.11,.39,.82);
      solid(-1.8,.1,.53,.28,.7);
    }else{
      box(1.6,.024,1.2,C.soot,.4,.296,.35,.2);
      for(let i=0;i<4;i++)box(.12,.14,1.25,C.soot,.15+i*.27,.37,.4,i*.5,0,.08);
      crate(-1.85,.29,-.75,.6,C.old);crate(-1.87,.75,-.75,.52,C.wood,.08);
      crate(-1.8,.29,.35,.65,C.olive,-.2);
      solid(-1.85,-.35,.62,.28,1);
    }
    // Threshold has a worn step and a dropped pack, clear down its centre.
    box(1.2,.12,.48,C.old,.2,ground(.2,2.1)+.06,2.1);
    box(.38,.22,.45,C.olive,1.45,.4,1.65,.5);
    for(const x of [-2.4,2.4])for(const y of [.45,1.6])bolt(x,y,-2.055);
  }

  if(o.kind==='shed') {
    theme=['field repair shop','abandoned food store','generator shelter'][variant%3];
    ruinedFloor(2.95,2.35);
    // Corrugated ribs follow the tilted roof, with raised seams and fixing heads.
    for(let i=0;i<15;i++){
      const u=-1.6+i*.225;
      box(.045,.045,2.75,i%4?0x8a8270:C.rust,-.1+u*Math.cos(.28),2.02+u*Math.sin(.28),-.15,0,.28);
    }
    for(let i=0;i<12;i++)box(.035,1.52,.065,i%4?C.steel:C.rust,1.61,.91,-1.13+i*.2);
    for(let i=0;i<7;i++)box(3.12,.18,.035,i%3?C.wood:C.cut,0,.36+i*.21,-1.335);
    for(const x of [-1.5,1.5])box(.13,1.88,.13,C.old,x,.97,-1.24);
    for(const y of [.43,1.22])box(.18,.085,.035,C.steel,-.88,y,1.34);
    box(.06,.15,.05,C.dark,-.3,.91,1.36);
    // A slatted outside workbench does not block the shed's entry.
    const y=ground(-2.45,-.35);
    box(.6,.07,1.5,C.cut,-2.45,y+.78,-.35);
    for(const z of [-.95,.25])for(const x of [-2.67,-2.23])box(.065,.76,.065,C.old,x,y+.38,z);
    solid(-2.45,-.35,.59,y,.84);
    if(variant%3===0){
      box(.25,.11,.38,C.steel,-2.43,y+.87,-.68);
      box(.035,.14,.27,C.dark,-2.43,y+.94,-.68);
      bar([-2.8,y+.9,-.68],[-2.22,y+.9,-.68],.016,C.steel);
      ring(.24,.045,C.dark,-2.46,y+.12,.85).rotation.x=Math.PI/2;
      for(let i=0;i<3;i++)box(.04,.028,.24,C.steel,-2.55+i*.1,y+.83,.04,i*.3);
    }else if(variant%3===1){
      crate(-2.45,y+.82,-.6,.45,C.old);
      for(let i=0;i<4;i++)cyl(.07,.14,i%2?C.pale:C.red,-2.55+(i%2)*.17,y+.89,-.05+Math.floor(i/2)*.17);
      box(.37,.015,.28,C.pale,-2.47,y+.83,.24,-.1);
    }else{
      box(.43,.35,.8,C.olive,-2.45,y+.24,-.35);
      for(let i=0;i<5;i++)box(.035,.18,.032,C.dark,-2.675,y+.26,-.6+i*.12);
      pipeCable([[-2.3,y+.1,.05],[-1.9,y+.02,.7],[-1.55,ground(-1.55,.9)+.03,.9]]);
      can(-2.48,y+.82,-.65);
    }
    // Hoop seams and a bung turn the existing barrel into a readable drum.
    for(const h of [.19,.69])ring(.296,.018,C.dark,-1.9,h,1.35).rotation.x=Math.PI/2;
    cyl(.046,.016,C.dark,-1.81,.88,1.37,8);
  }

  if(o.kind==='graveyard') {
    theme='old parish cemetery and recent hurried burials';
    for(const [i,s] of (o.stones||[]).entries()){
      const start=parts.length,{gx:x,gz:z,dy:y,h,tilt,angle}=s;
      box(.68,.12,.36,C.stone,0,.06,0);
      if(i%3===0){
        box(.5,h-.19,.16,C.stone,0,(h-.19)/2+.1,0);
        const cap=cyl(.25,.16,C.stone,0,h-.09,0,12);cap.rotation.x=Math.PI/2;cap.scale.y=1;
      }else if(i%3===1){
        box(.14,h,.17,C.pale,0,h*.5,0);box(.57,.15,.17,C.pale,0,h*.69,0);
      }else{
        panel([[-.25,.12,.09],[.25,.12,.09],[.22,h-.07,.09],[-.08,h,.09],[-.25,h-.13,.09]],C.stone);
        box(.43,h*.63,.15,C.stone,0,h*.36,-.005);
      }
      if(i%3!==1)for(let j=0;j<3;j++)box(.23-j*.04,.022,.012,C.old,0,h*.55-j*.09,.1);
      transform(start,x,y,z,angle,tilt);
      // Low individual grave kerbs follow the terrain and remain step-over details.
      const base=ground(x,z+.63);
      for(const side of [-1,1])box(.08,.075,1.03,C.stone,x+side*.35,base+.04,z+.62,angle);
      for(const end of [.12,1.14])box(.78,.075,.08,C.stone,x,base+.04,z+end,angle);
      const mound=mesh(new THREE.SphereGeometry(.32,8,5),0x615741,x,base+.015,z+.63);
      mound.scale.set(.9,.16,1.45);
      if(i===2||i===6){
        box(.4,.055,.23,C.stone,x+.13,base+.055,z+.5,.4);
        for(let j=0;j<3;j++)cyl(.035,.11,C.pale,x-.12+j*.1,base+.08,z+.92,6);
      }
    }
    // Broken boundary, a bent iron gate, and an empty wreath hook at the entry.
    for(const x of [-1.2,1.2]){
      const y=ground(x,-4.5);
      box(.55,1.6,.55,C.stone,x,y+.8,-4.5);
      box(.68,.14,.68,C.pale,x,y+1.63,-4.5);
      solid(x,-4.5,.35,y,1.7);
    }
    for(const side of [-1,1]){
      const x=side*1.2,y=ground(x,-4.5);
      for(let i=0;i<4;i++){
        const px=x+side*(.65+i*.7),py=ground(px,-4.5);
        box(.055,.86,.055,C.dark,px,py+.43,-4.5);
        mesh(new THREE.ConeGeometry(.06,.15,4),C.dark,px,py+.92,-4.5);
      }
      bar([x+side*.35,y+.7,-4.5],[x+side*2.9,ground(x+side*2.9,-4.5)+.7,-4.5],.025,C.dark);
    }
    // Fallen gate leaf rests beside the path rather than sealing the entrance.
    for(let i=0;i<5;i++)box(.04,.035,1.3,C.rust,2+i*.19,ground(2+i*.19,-3.6)+.07,-3.6,.27);
    const by=ground(-4,-1);
    box(.65,.12,1.7,C.old,-4,by+.42,-1);
    for(const z of [-1.6,-.4])box(.42,.4,.14,C.stone,-4,by+.2,z);
    solid(-4,-1,.63,by,.5);
    lantern(-4,by+.5,-1.6);
    // Gardener left a spade, and a single fresh bouquet on the bench.
    bar([-4.2,by,-1.8],[-3.85,by+1.2,-1.8],.028,C.cut);
    box(.18,.27,.045,C.steel,-4.2,by+.11,-1.8,0,-.25);
    for(let i=0;i<5;i++){
      bar([-4.2+i*.07,by+.5,-.6],[-4.15+i*.07,by+.51,-1.05],.009,C.olive,4);
      mesh(new THREE.IcosahedronGeometry(.045,0),i%2?C.pale:C.red,-4.15+i*.07,by+.53,-1.05);
    }
  }
  if(o.kind==='tower') {
    theme='abandoned forward observation post';
    for(const x of [-1.1,1.1])for(const z of [-1.1,1.1]){
      const y=ground(x,z);
      box(.5,.32,.5,C.stone,x,y+.08,z);
      for(const yy of [.38,3.2,5.23]){
        box(.31,.15,.32,C.steel,x,yy,z);
        bolt(x,yy,z+.17);bolt(x+.17,yy,z,'x');
      }
    }
    plankFloor(0,5.615,0,2.85,2.85);
    for(const side of [-1,1]){
      bar([side*1.12,3.7,-1.1],[side*1.12,5.4,.5],.075,C.cut,4);
      bar([-1.1,3.7,side*1.12],[.5,5.4,side*1.12],.075,C.cut,4);
    }
    // A compact plotting table sits against the far rail; the ladder exit and
    // firing space stay open. The lantern uses the tower's existing light.
    box(.53,.07,.72,C.cut,1.02,6.2,.66);
    for(const z of [.41,.91])box(.06,.54,.06,C.old,1.02,5.9,z);
    box(.4,.01,.55,C.pale,1.02,6.24,.66,.04);
    for(let i=0;i<3;i++)box(.015,.009,.37,C.olive,.9+i*.08,6.25,.66,.08);
    for(const x of [.91,1.06]){const m=cyl(.043,.19,C.dark,x,6.3,.44,8);m.rotation.x=Math.PI/2;}
    solid(1.02,.66,.34,5.62,.65);
    lantern(-1.08,5.66,1.08);
    crate(-1.03,5.66,.3,.42,C.olive);
    for(let i=0;i<7;i++){
      const m=cyl(.016,.08,0x9a8850,.55+i*.07,5.67,-.5+(i%3)*.09,5);m.rotation.z=Math.PI/2;
    }
    // Hoist rope and pulley outside the deck, with the load resting at ground.
    bar([-1.1,5.45,.9],[-1.85,5.45,.9],.065,C.old,4);
    ring(.095,.025,C.steel,-1.78,5.35,.9);
    bar([-1.78,5.34,.9],[-1.78,ground(-1.78,.9)+.6,.9],.012,C.rope,5);
    crate(-1.78,ground(-1.78,.9),.9,.6,C.old);
    solid(-1.78,.9,.4,ground(-1.78,.9),.6);
    // Foot rungs have metal tread caps and bolts.
    for(let i=0;i<15;i++)for(const x of [-.31,.31])bolt(x,.35+i*.36,-o.ladderOut-.05);
  }

  if(o.kind==='mast') {
    theme='silent emergency relay station';
    const h=14.5;
    for(const x of [-.55,.55])for(const z of [-.55,.55]){
      box(.5,.3,.5,C.stone,x,.12,z);
      for(const a of [-.14,.14])bolt(x+a,.285,z,'y');
    }
    for(let y=.7;y<h-2;y+=2.2)for(const side of [-1,1]){
      bar([side*.55,y,-.55],[side*.55,y+2.1,.55],.028,C.steel);
      bar([side*.55,y,.55],[side*.55,y+2.1,-.55],.025,C.steel);
      bar([-.55,y,side*.55],[.55,y+2.1,side*.55],.028,C.steel);
      bar([.55,y,side*.55],[-.55,y+2.1,side*.55],.025,C.steel);
    }
    // Cable ladder, feeders and ceramic stand-offs along one face.
    for(const x of [-.18,.18])bar([x,.15,-.67],[x,h-.65,-.67],.025,C.dark);
    for(let y=.3;y<h-.5;y+=.4)bar([-.2,y,-.67],[.2,y,-.67],.018,C.steel);
    for(let y=1;y<h-1;y+=1.5){box(.17,.07,.19,C.pale,.5,y,-.62);bar([.44,y-.5,-.76],[.44,y+.8,-.76],.025,C.dark);}
    // A shallow paraboloid has an actual bowl, rim, feed and mounting arm.
    const profile=[new THREE.Vector2(0,0),new THREE.Vector2(.2,.015),new THREE.Vector2(.45,.07),new THREE.Vector2(.68,.17),new THREE.Vector2(.85,.29)];
    const bowl=mesh(new THREE.LatheGeometry(profile,20),0xa7ada7,.86,h-2.2,0);
    bowl.rotation.z=-Math.PI/2;
    // Back face uses its own reversed geometry so the dish reads from either side.
    const backGeo=bowl.geometry.clone(),indices=backGeo.index.array,normals=backGeo.attributes.normal.array;
    for(let i=0;i<indices.length;i+=3){const t=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=t;}
    for(let i=0;i<normals.length;i++)normals[i]*=-1;
    const back=mesh(backGeo,C.steel,.84,h-2.2,0);back.rotation.z=-Math.PI/2;
    const rim=ring(.85,.035,C.pale,1.15,h-2.2,0);rim.rotation.y=Math.PI/2;
    for(const z of [-.6,.6])bar([1.06,h-2.2,z],[1.55,h-2.2,0],.023,C.steel);
    bar([.45,h-2.2,0],[.91,h-2.2,0],.065,C.dark);
    cyl(.07,.19,C.dark,1.55,h-2.2,0).rotation.z=Math.PI/2;
    // Open service cabinet: racks, vents, disconnected leads, spare battery.
    const y=ground(-2.1,.3);
    box(1.35,.18,1.25,C.stone,-2.1,y+.09,.3);
    box(1.05,1.55,.7,C.olive,-2.1,y+.96,.3);
    box(.86,1.29,.045,C.dark,-2.1,y+.97,.677);
    for(let j=0;j<4;j++){
      box(.72,.16,.1,C.steel,-2.1,y+.48+j*.27,.7);
      for(let i=0;i<4;i++)box(.1,.025,.015,C.dark,-2.34+i*.15,y+.5+j*.27,.765);
      cyl(.023,.02,j===2?C.red:C.pale,-1.81,y+.51+j*.27,.77,6).rotation.x=Math.PI/2;
    }
    box(.82,1.42,.05,C.olive,-2.82,y+.97,.79,-.9);
    solid(-2.1,.3,.68,y,1.8);
    pipeCable([[-1.7,y+.28,.8],[-1.3,ground(-1.3,.9)+.035,.9],[-.5,.08,.7],[.44,.4,-.76]],.022);
    const by=ground(-2.5,1.55);box(.43,.29,.3,C.dark,-2.5,by+.15,1.55);
    for(const x of [-2.65,-2.35])cyl(.035,.05,C.steel,x,by+.32,1.55,6);
    for(let i=0;i<3;i++){const r=ring(.32+i*.025,.012,C.dark,-1.7,ground(-1.7,1.9)+.03,1.9);r.rotation.x=Math.PI/2;}
  }

  if(o.kind==='bridge') {
    theme=variant%2?'reinforced emergency crossing':'patched timber footbridge';
    const L=o.halfLen,W=o.halfWidth;
    for(const side of [-1,1]){
      for(const z of [-L+.4,-L/2,0,L/2,L-.4]){
        box(.16,.16,.16,C.steel,side*(W-.06),.25,z);
        bolt(side*(W-.06),.28,z+.085);
        box(.18,.055,.18,C.cut,side*(W-.06),.95,z);
      }
      for(const z of [-L*.55,0,L*.55]){
        bar([side*(W-.2),-1.6,z],[side*(W-.2),-.5,z-1.5],.08,C.old,4);
        bar([side*(W-.2),-1.6,z],[side*(W-.2),-.5,z+1.5],.08,C.old,4);
      }
    }
    // Replaced boards, split ends and nail heads stay flush with the walking deck.
    for(let i=0;i<21;i++)for(const side of [-1,1])bolt(side*(W-.36),.085,-L+.4+i*.79,'y');
    for(let i=0;i<4;i++)box(W*1.62,.035,.21,i%2?C.cut:C.old,0,.089,-L+1.9+i*.23,.025);
    for(let i=0;i<3;i++)box(.022,.015,.34,C.dark,.5-i*.21,.078,L-1.2,i*.12);
    if(variant%2){
      for(const side of [-1,1]){
        box(.09,.25,L*.7,C.steel,side*(W+.025),-.38,0);
        for(const z of [-L*.3,0,L*.3])bolt(side*(W+.08),-.34,z,'x');
      }
    }
    // Faded diagonal caution paint on end posts; no barricade across the walkway.
    for(const side of [-1,1])for(const z of [-L+.4,L-.4])for(let k=0;k<3;k++){
      box(.145,.075,.018,k%2?C.dark:0xb2a05e,side*(W-.06),.42+k*.14,z+.08,0,-.35);
    }
  }

  if(o.kind==='dock') {
    theme='evacuation landing left in haste';
    const W=o.halfWidth,L=o.length,side=o.boatSide||1;
    for(let i=0;i<12;i++){
      const z=-L/2+.8+i*.78;
      box(W*2-.03,.008,.018,C.old,0,.065,z);
      box(.3,.009,.017,C.old,(i%3-1)*.51,.066,z-.22,i*.13);
    }
    for(const z of [-L/2+.5,0,L/2-.5])for(const side of [-1,1]){
      cyl(.16,.08,C.cut,side*(W-.1),.11,z,8);
      for(const h of [-.12,-.28])ring(.15,.022,C.dark,side*(W-.1),h,z).rotation.x=Math.PI/2;
    }
    for(const z of [-2.3,2.6]){
      box(.25,.035,.14,C.steel,side*(W-.27),.085,z);
      bar([side*(W-.36),.18,z],[side*(W-.12),.18,z],.027,C.dark);
      bar([side*(W-.24),.1,z],[side*(W-.24),.19,z],.022,C.dark);
    }
    // An open clinker hull with curved sides, visible ribs and two thwarts.
    const bx=side*(W+1.2),bz=1.8;
    const sections=[[-1.6,.03],[-1.1,.43],[0,.57],[1.05,.48],[1.3,.35]];
    for(let i=1;i<sections.length;i++)for(const side of [-1,1])for(let row=0;row<3;row++){
      const [za,wa]=sections[i-1],[zb,wb]=sections[i],lo=row/3,hi=(row+1)/3;
      panel([[bx+side*wa*(.55+lo*.45),-.64+lo*.58,bz+za],[bx+side*wb*(.55+lo*.45),-.64+lo*.58,bz+zb],[bx+side*wb*(.55+hi*.45),-.64+hi*.58,bz+zb],[bx+side*wa*(.55+hi*.45),-.64+hi*.58,bz+za]],row%2?C.wood:C.cut);
    }
    panel([[bx-.3,-.63,bz-1],[bx+.3,-.63,bz-1],[bx+.34,-.63,bz+1.3],[bx-.34,-.63,bz+1.3]],C.old);
    // Raised walking boards sit above the bilge while the keel remains submerged.
    for(const x of [-.2,0,.2])box(.18,.035,2.1,C.cut,bx+x,-.46,bz+.1);
    box(.7,.55,.075,C.wood,bx,-.34,bz+1.3);
    for(const z of [-.7,.55])box(.94,.07,.22,C.cut,bx,-.1,bz+z);
    for(const [z,w] of sections)if(w>.1)bar([bx-w,-.1,bz+z],[bx+w,-.1,bz+z],.025,C.old,5);
    bar([bx-.35,.015,bz-.9],[bx+.2,.015,bz+1.4],.028,C.cut);
    box(.17,.035,.47,C.cut,bx+.25,.015,bz+1.63,-.23);
    pipeCable([[side*(W-.24),.18,2.6],[side*(W+.12),.02,2.4],[bx-.02,-.04,bz+1.25]],.018,C.rope);
    for(const z of [-1.2,1.2])ring(.27,.075,C.dark,-W-.08,-.22,z);
    const crateZ=-L/2+.85;
    crate(-W+.3,.08,crateZ,.48,C.old,.04,true);solid(-W+.3,crateZ,.3,.08,.45);
    // Life ring on its own post and a hanging drying net outside the walking edge.
    bar([-W+.08,.05,L/2-.6],[-W+.08,1.15,L/2-.6],.045,C.old);
    ring(.29,.062,0xaa6f48,-W+.08,.78,L/2-.56);
    for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])box(.11,.14,.04,C.pale,-W+.08+Math.sin(a)*.29,.78+Math.cos(a)*.29,L/2-.5,0,-a);
    for(let i=0;i<8;i++)bar([-W-.1,-.07,-.5+i*.14],[-W-.13,-.75+Math.abs(i-3.5)*.07,-.5+i*.14],.009,C.rope,4);
    for(let j=0;j<4;j++)bar([-W-.12,-.19-j*.12,-.5],[-W-.12,-.19-j*.12,.48],.009,C.rope,4);
  }

  if(o.kind==='wreck') {
    theme=variant%2?'stripped utility truck':'failed medical supply convoy';
    const paint=variant%2?0x716f53:0x556752;
    // Chassis and hollow cab: pillars frame real window gaps instead of a solid box.
    for(const x of [-.73,.73])box(.13,.23,5.4,C.dark,x,.59,0);
    box(2.15,.19,1.68,paint,0,1.02,-1.36);
    box(2.14,.13,1.5,paint,0,2.27,-1.32);
    box(2.08,1.16,.12,paint,0,1.65,-.63);
    for(const x of [-1.02,1.02]){
      box(.095,1.1,.095,C.steel,x,1.72,-2.03,0,0,-.12);
      box(.08,1.13,.085,C.steel,x,1.69,-.65);
      box(.1,.48,1.32,paint,x,1.26,-1.35);
      box(.13,.085,1.34,C.cut,x,1.57,-1.35);
      box(.4,.09,.07,C.steel,x*1.18,1.02,-1.32);
      bar([x,1.83,-1.75],[x*1.23,1.83,-1.78],.025,C.dark);
      box(.055,.21,.15,C.steel,x*1.25,1.85,-1.78);
    }
    box(1.85,.19,.28,C.dark,0,1.5,-1.89);
    for(const x of [-.52,.52]){
      box(.59,.15,.58,C.soot,x,1.21,-1.11);box(.58,.5,.13,C.soot,x,1.48,-.83,0,0,-.13);
    }
    const wheel=ring(.19,.023,C.dark,-.54,1.68,-1.69);wheel.rotation.x=-.65;
    bar([-.54,1.39,-1.87],[-.54,1.68,-1.69],.028,C.steel);
    // Raised bonnet, exposed engine, radiator and one smashed lamp.
    box(1.98,.08,1.03,paint,0,1.71,-2.34,0,0,.58);
    box(1.22,.37,.76,C.dark,0,1.19,-2.3);
    for(let i=0;i<4;i++)cyl(.1,.16,C.steel,-.42+i*.28,1.42,-2.3,8);
    box(1.8,.45,.12,C.dark,0,1.04,-2.87);
    for(let i=0;i<10;i++)box(.08,.38,.06,C.steel,-.69+i*.15,1.05,-2.95);
    for(const x of [-.92,.92]){
      cyl(.145,.08,C.steel,x,1.25,-2.88,12).rotation.x=Math.PI/2;
      cyl(.11,.02,x<0?C.dark:0xb5ad86,x,1.25,-2.93,10).rotation.x=Math.PI/2;
    }
    box(2.32,.16,.19,C.steel,.06,.77,-3.02,0,-.08);
    // Timber cargo deck, separate side boards and a bent tailgate.
    plankFloor(0,.99,1.2,2.2,3.1);
    for(const side of [-1,1]){
      for(let row=0;row<3;row++)box(.1,.17,3.05,row===1?paint:C.old,side*1.07,1.19+row*.2,1.2);
      for(const z of [-.24,1.1,2.65])box(.13,.83,.09,C.steel,side*1.12,1.34,z);
    }
    box(2.13,.57,.085,paint,0,1.11,2.93,0,0,-.73);
    for(const x of [-.86,.86])box(.18,.075,.03,C.red,x,.79,2.85);
    for(const z of [-2.02,.55,2.05]){
      bar([-1.16,.5,z],[1.16,.5,z],.075,C.steel);
      for(const side of [-1,1]){
        const x=side*1.14,flat=side>0&&z<0,wy=flat?.38:.5;
        const m=cyl(.46,.28,C.dark,x,wy,z,14);m.rotation.z=Math.PI/2;
        if(flat)m.scale.x=.7;
        const hub=cyl(.23,.3,C.rust,x,wy,z,10);hub.rotation.z=Math.PI/2;
        const cap=cyl(.13,.315,C.steel,x,wy,z,8);cap.rotation.z=Math.PI/2;
        for(let i=0;i<6;i++)bolt(x+side*.17,wy+Math.cos(i*Math.PI/3)*.17,z+Math.sin(i*Math.PI/3)*.17,'x');
      }
    }
    for(let i=0;i<3;i++)box(.09,.07,1.8,C.steel,-.65+i*.65,.76,1.2);
    crate(-.52,1.03,.25,.68,C.olive,.04,variant%2===0);
    crate(.45,1.03,1.35,.7,C.old,-.06);
    // Torn canvas still hangs over the last load.
    for(const z of [.1,2.25]){
      bar([-1.05,1.68,z],[-.85,2.24,z],.035,C.steel);
      bar([-.85,2.24,z],[.85,2.24,z],.035,C.steel);
      bar([.85,2.24,z],[1.05,1.68,z],.035,C.steel);
    }
    panel([[-1.02,1.7,.1],[-.83,2.27,.1],[-.83,2.24,1.75],[-1.02,1.85,1.9]],C.olive);
    panel([[-.83,2.27,.1],[.83,2.27,.1],[.83,2.24,1.2],[.12,2.17,1.73],[-.83,2.24,1.75]],0x73785c);
    // Apply the vehicle's settled suspension before placing loose cargo on ground.
    transform(0,0,0,0,0,o.roll||0,o.tilt||0);
    solid(0,-1.5,1.2,0,2.55);solid(0,1.2,1.3,0,2.3);
    for(const [x,z] of [[1.75,2.55],[-1.95,1.5]]){
      const y=ground(x,z);crate(x,y,z,.68,C.wood,.35,variant%2===0);solid(x,z,.45,y,.55);
    }
    const y=ground(-1.75,-1.8);
    // Detached door, empty fuel can and glass shards show why it never left.
    box(.85,.075,1.03,paint,-1.85,y+.1,-1.65,.3,0,.08);
    box(.62,.03,.32,C.dark,-1.85,y+.15,-1.93,.3);
    can(1.68,ground(1.68,-.3),-.3,C.rust);
    for(let i=0;i<5;i++)panel([[-1.5+i*.16,y+.025,-2.3],[-1.42+i*.16,y+.025,-2.2],[-1.57+i*.16,y+.025,-2.16]],0x687977);
  }
  if(o.kind==='camp') {
    theme=['ranger search party','interrupted hiking holiday','trapper winter preparations'][variant%3];
    if(variant%3===0){
      // A search board sits behind the command table, with a route map, pinned
      // missing-person sheets, red search markers and a rolled spare chart.
      const x=.35,z=-4.9,y=ground(x,z);
      for(const dx of [-.6,.6])bar([x+dx,y,z],[x+dx,y+1.85,z],.045,C.old,4);
      box(1.45,.93,.09,C.wood,x,y+1.25,z);
      box(.72,.62,.012,C.pale,x-.22,y+1.28,z+.052);
      for(let i=0;i<4;i++)box(.47,.015,.014,C.olive,x-.22,y+1.08+i*.12,z+.066,0,(i-1.5)*.15);
      for(const [dx,dy] of [[-.38,.16],[-.09,-.12],[.05,.2]])cyl(.024,.02,C.red,x+dx,y+1.28+dy,z+.077,7).rotation.x=Math.PI/2;
      for(const yy of [1.03,1.4]){
        box(.28,.28,.012,C.pale,x+.42,y+yy,z+.06,0,-.08);
        box(.1,.12,.015,C.old,x+.42,y+yy+.035,z+.075);
      }
      solid(x,z,.67,y,1.85);
      const py=ground(.95,-3.55);cyl(.1,.48,C.pale,.95,py+.1,-3.55).rotation.z=Math.PI/2;
      can(1.5,ground(1.5,-4.7),-4.7,C.olive);
    }else if(variant%3===1){
      // A camera, folded route map and hiking boots were left with the packs.
      const x=.7,z=-1.95,y=ground(x,z);
      box(.9,.025,.68,0x687e78,x,y+.023,z,.14);
      box(.38,.012,.25,C.pale,x+.05,y+.044,z,.24);
      box(.018,.014,.21,C.red,x+.08,y+.054,z,.4);
      box(.22,.11,.13,C.dark,x-.25,y+.092,z+.12,-.1);
      cyl(.049,.07,C.steel,x-.25,y+.1,z+.22,10).rotation.x=Math.PI/2;
      for(const side of [-1,1]){
        const bx=-3.7+side*.12,bz=.1,by=ground(bx,bz);
        box(.17,.095,.32,C.old,bx,by+.06,bz,.2);
        box(.16,.15,.16,C.wood,bx,by+.16,bz-.07,.2);
        for(let i=0;i<3;i++)box(.1,.012,.015,C.rope,bx,by+.23,bz-.1+i*.04,.2);
      }
      for(const side of [-1,1]){
        const py=ground(-4.05,-.65);
        bar([-4.05+side*.1,py+.045,-.65],[-3.1+side*.1,ground(-3.1,-1.3)+.08,-1.3],.016,C.steel);
        bar([-3.1+side*.1,ground(-3.1,-1.3)+.08,-1.3],[-2.93+side*.1,ground(-2.93,-1.4)+.1,-1.4],.026,C.dark);
      }
      const mug=cyl(.07,.12,C.pale,2.38,ground(2.38,2.1)+.07,2.1,8);mug.rotation.z=1.4;
    }else{
      // Curing frame and stored traps sit outside the sleeping shelter and hearth.
      const x=4.5,z=-2.8,y=ground(x,z);
      for(const dz of [-.85,.85])bar([x,y,z+dz],[x,y+1.65,z+dz],.048,C.old);
      for(const yy of [.1,1.6])bar([x,y+yy,z-.85],[x,y+yy,z+.85],.04,C.cut);
      panel([[x+.015,y+1.4,z-.65],[x+.015,y+1.48,z+.5],[x+.035,y+1.14,z+.62],[x+.045,y+.5,z+.45],[x+.02,y+.28,z-.12],[x+.035,y+.57,z-.62]],0x9a8a62);
      for(const dz of [-.55,-.1,.4])bar([x,y+1.6,z+dz],[x+.025,y+1.4,z+dz],.008,C.rope,4);
      solid(x,z,.48,y,1.65);
      for(const z2 of [-.1,.4]){
        const py=ground(3.65,z2);ring(.18,.02,C.steel,3.65,py+.035,z2).rotation.x=Math.PI/2;
        box(.09,.055,.16,C.old,3.65,py+.065,z2);
        for(let i=0;i<4;i++)box(.025,.045,.025,C.steel,3.53+i*.08,py+.07,z2+.1);
      }
      const by=ground(3.25,1.65);box(.4,.24,.27,C.wood,3.25,by+.12,1.65);
      for(let i=0;i<3;i++)box(.032,.17,.025,C.rope,3.12+i*.13,by+.17,1.8);
    }
  }

  if(o.kind==='wall') {
    theme='quarantine perimeter';
    const h=o.height;
    const top=o.topAt||(()=>h);
    // Proud masonry buttress and a coping course give the boundary a silhouette.
    box(1,.23,1.05,C.stone,0,.055,-.08);
    box(.63,h,.64,variant%3?0x777c72:0x8b897d,0,h/2,-.17);
    box(.88,.16,.86,C.pale,0,h+.08,-.12);
    for(let i=0;i<Math.floor(h/.52);i++)box(.65,.025,.03,C.old,0,.35+i*.52,.17);
    solid(0,-.03,.48,-.06,h+.24);
    for(let i=0;i<6;i++){const x=-2.1+i*.84;box(.8,.12,.82,i%2?C.stone:C.pale,x,top(x)+.015,-.14);}
    // Rusting wire above the wall; sag and a few broken spans reveal its age.
    for(const x of [-2.25,2.25])bar([x,top(x),-.14],[x,top(x)+.71,-.04],.035,C.steel);
    for(const yy of [.3,.62])pipeCable([[-2.25,top(-2.25)+yy,-.08],[0,h+yy-.1,-.08],[2.25,top(2.25)+yy,-.08]],.013,C.rust);
    for(let i=0;i<7;i++){
      const x=-1.9+i*.63,y=top(x)+.58-.08*(1-Math.abs(x)/2.25);
      bar([x-.055,y-.07,-.08],[x+.055,y+.07,-.08],.012,C.steel,4);
      bar([x-.055,y+.07,-.08],[x+.055,y-.07,-.08],.012,C.steel,4);
    }
    // Repairs, rust runs, faded warning paint and inspection tally marks.
    for(let i=0;i<3;i++)box(.08+.025*i,.8+i*.32,.02,0x665d49,-.8+i*.23,h-1.1-i*.1,-.22);
    if(variant%3===0){
      box(1.32,1.55,.075,C.steel,1.5,1.28,-.22);
      for(const x of [.98,2.02])for(const y of [.67,1.88])bolt(x,y,-.17);
      for(let i=0;i<3;i++)box(.72,.055,.03,C.dark,1.5,.96+i*.23,-.17);
      for(let i=0;i<4;i++)box(.03,.13,.03,C.pale,1.21+i*.13,1.66,-.16,0,.14);
      box(.54,.025,.035,C.pale,1.4,1.66,-.15,0,.26);
    }else{
      box(.83,.61,.035,0xa79a66,1.42,1.9,-.22,0,-.03);
      panel([[1.11,1.68,-.193],[1.73,1.68,-.193],[1.42,2.15,-.193]],C.dark);
      box(.045,.17,.02,C.pale,1.42,1.91,-.18);box(.05,.045,.02,C.pale,1.42,1.77,-.18);
    }
    if(variant%6===0){
      const y=ground(1.45,1.1);
      crate(1.45,y,1.1,.66,C.olive,.18);solid(1.45,1.1,.44,y,.55);
      can(2.25,ground(2.25,.8),.8,C.rust);
    }
  }
  return {parts,solids,theme};
};
