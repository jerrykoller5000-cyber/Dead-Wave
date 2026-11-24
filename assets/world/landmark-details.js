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
      const y=ground(x,-6.2);
      box(.55,1.6,.55,C.stone,x,y+.8,-6.2);
      box(.68,.14,.68,C.pale,x,y+1.63,-6.2);
      solid(x,-6.2,.35,y,1.7);
    }
    for(const side of [-1,1]){
      const x=side*1.2,y=ground(x,-6.2);
      for(let i=0;i<6;i++){
        const px=x+side*(.65+i*.7),py=ground(px,-6.2);
        box(.055,.86,.055,C.dark,px,py+.43,-6.2);
        mesh(new THREE.ConeGeometry(.06,.15,4),C.dark,px,py+.92,-6.2);
        solid(px,-6.2,.3,py,1);   // CL-256 batch 2 (the sweep): the railing stops him; the gate between the pillars is the way in
      }
      bar([x+side*.35,y+.7,-6.2],[x+side*4.3,ground(x+side*4.3,-6.2)+.7,-6.2],.025,C.dark);
    }
    // Fallen gate leaf rests beside the path rather than sealing the entrance.
    for(let i=0;i<5;i++)box(.04,.035,1.3,C.rust,2+i*.19,ground(2+i*.19,-5.9)+.07,-5.9,.27);
    const bx=-6.8,by=ground(bx,-1);
    box(.65,.12,1.7,C.old,bx,by+.42,-1);
    for(const z of [-1.6,-.4])box(.42,.4,.14,C.stone,bx,by+.2,z);
    solid(bx,-1,.63,by,.5);
    lantern(bx,by+.5,-1.6);
    // Gardener left a spade, and a single fresh bouquet on the bench.
    bar([bx-.2,by,-1.8],[bx+.15,by+1.2,-1.8],.028,C.cut);
    box(.18,.27,.045,C.steel,bx-.2,by+.11,-1.8,0,-.25);
    for(let i=0;i<5;i++){
      bar([bx-.2+i*.07,by+.5,-.6],[bx-.15+i*.07,by+.51,-1.05],.009,C.olive,4);
      mesh(new THREE.IcosahedronGeometry(.045,0),i%2?C.pale:C.red,bx-.15+i*.07,by+.53,-1.05);
    }
  }
  if(o.kind==='tower') {
    theme='abandoned forward observation post';
    for(const x of [-1.1,1.1])for(const z of [-1.1,1.1]){
      const y=ground(x,z);
      box(.5,.32,.5,C.stone,x,y+.08,z);
      for(const yy of [.38,3.2,5.23]){
        // Follow the existing inward-leaning post instead of leaving cuffs in mid-air.
        const rx=-z*.045,rz=x*.045,px=x-Math.tan(rz)/Math.cos(rx)*(yy-2.8),pz=z+Math.tan(rx)*(yy-2.8);
        const cuff=box(.31,.15,.32,C.steel,px,yy,pz);cuff.rotation.set(rx,0,rz);
        bolt(px,yy,pz+.17);bolt(px+.17,yy,pz,'x');
      }
    }
    // GP-117: rain-grey boards and two conspicuous repairs, at the original floor height.
    const aged=[0x72715b,0x686b56,0x807960,0x626550];
    for(let i=0;i<12;i++){
      const x=-1.425+(i+.5)*2.85/12;
      box(2.85/12-.016,.05,2.85,i===3||i===9?0x9c865b:aged[i%4],x,5.615,0);
      for(const z of[-1.25,1.25])bolt(x,5.648,z,'y');
      for(let k=0;k<3;k++)box(.006,.005,.26+(i%3)*.055,0x4b5140,x-.05+k*.04,5.643,-.91+k*.76+(i%2)*.11);
    }
    // Worn observation rail and strapped corner joints; the ladder mouth stays open.
    box(.24,.1,2.86,0x82795e,-1.43,6.42,0);
    for(const x of[-1.43,1.43])for(const z of[-1.43,1.43]){
      box(.15,.3,.035,C.steel,x,6.24,z+Math.sign(z)*.075);
      for(const h of[6.14,6.33])bolt(x,h,z+Math.sign(z)*.101);
      box(.038,.15,.31,0x765641,x+Math.sign(x)*.077,5.93,z);
    }
    for(const x of[-1.43,1.43])for(let i=0;i<5;i++)box(.008,.012,.21,0x80795d,x+Math.sign(x)*.052,6.433,-1.04+i*.5);
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
    bar([.91,6.3,.43],[1.06,6.3,.43],.025,C.dark);
    for(const x of[.91,1.06]){const rim=cyl(.05,.035,0x454b40,x,6.3,.337,10);rim.rotation.x=Math.PI/2;const lens=cyl(.037,.006,0x536a60,x,6.3,.316,10);lens.rotation.x=Math.PI/2;}
    // A scratched plotting sheet, pencil and compass: small working objects, not another plaque.
    bar([.88,6.257,.71],[1.16,6.257,.78],.006,0x85513b,4);
    bar([.94,6.258,.72],[1.08,6.258,.57],.006,0x85513b,4);
    cyl(.032,.017,0x8b805a,1.15,6.265,.83,10);
    bar([.81,6.257,.51],[.82,6.257,.78],.009,0x9a8553,5);
    // Leather binocular case hangs beneath the same table, inside its old solid footprint.
    box(.28,.21,.19,0x514b37,1.08,5.96,.94);box(.3,.04,.21,0x6c6348,1.08,6.075,.94);
    box(.032,.18,.014,C.dark,1.08,5.99,1.042);box(.054,.045,.015,C.steel,1.08,6.025,1.052);
    pipeCable([[.97,6.1,.92],[.94,6.2,.81],[1.2,6.2,.81],[1.2,6.1,.92]],.012,C.old);
    solid(1.02,.66,.34,5.62,.65);
    lantern(-1.08,5.66,1.08);
    // A steel ammunition tin replaces the crate within its existing corner footprint.
    box(.42,.29,.35,0x555f40,-1.03,5.805,.3);box(.45,.055,.38,0x727a54,-1.03,5.977,.3);
    for(const x of[-1.18,-.88])box(.032,.24,.018,C.old,x,5.83,.48);
    bar([-1.15,6.025,.3],[-.91,6.025,.3],.017,C.dark);box(.07,.105,.025,C.steel,-1.03,5.92,.493);
    for(let i=0;i<13;i++){
      const m=cyl(.012,.073,0x9a8850,.52+(i*7%11)*.049,5.66,-.85+(i*3%7)*.09,6);m.rotation.set(Math.PI/2,0,i*2.4);
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
      box(.29,.035,.29,C.dark,x,.295,z);
      for(const a of[-.105,.105])bolt(x+a,.323,z+.105,'y');
      // Bolted replacement plates and thin rust blooms, not a new tower silhouette.
      for(const yy of[.55,4.75,9.15]){
        box(.14,.43,.018,0x747c70,x,yy,z+Math.sign(z)*.065);
        for(const dy of[-.14,.14])bolt(x,yy+dy,z+Math.sign(z)*.082);
        box(.053,.18,.012,0x745842,x+.036,yy-.07,z+Math.sign(z)*.08);
      }
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
    // Door edge chips, hinges, and the unpowered rack's tied service loom.
    for(const yy of[.42,1.47])box(.09,.15,.1,C.steel,-2.61,y+yy,.66);
    for(let j=0;j<5;j++)box(.11,.016,.012,0x939783,-2.43+j*.12,y+1.69,.663);
    for(let j=0;j<3;j++)pipeCable([[-2.42+j*.08,y+.36,.77],[-2.39+j*.08,y+.24,.79],[-1.81,y+.22,.78],[-1.81,y+.39+j*.27,.78]],.008,j===1?0x806f46:C.dark);
    solid(-2.1,.3,.68,y,1.8);
    pipeCable([[-1.7,y+.28,.8],[-1.3,ground(-1.3,.9)+.035,.9],[-.5,.08,.7],[.44,.4,-.76]],.022);
    const by=ground(-2.5,1.55);box(.43,.29,.3,C.dark,-2.5,by+.15,1.55);
    for(const x of [-2.65,-2.35])cyl(.035,.05,C.steel,x,by+.32,1.55,6);
    for(let i=0;i<3;i++){const r=ring(.32+i*.025,.012,C.dark,-1.7,ground(-1.7,1.9)+.03,1.9);r.rotation.x=Math.PI/2;}
    // A used cable reel at the rear of the rack, well away from the repair approach.
    const rx=-3.3,rz=-.7,ry=ground(rx,rz);
    for(const x of[rx-.26,rx+.26])cyl(.39,.045,0x81735a,x,ry+.39,rz,14).rotation.z=Math.PI/2;
    cyl(.26,.48,0x333b35,rx,ry+.39,rz,14).rotation.z=Math.PI/2;
    for(let i=0;i<9;i++){const r=ring(.266,.017,C.dark,rx-.22+i*.055,ry+.39,rz);r.rotation.y=Math.PI/2;}
    for(const z of[rz-.26,rz+.26])box(.62,.07,.12,C.old,rx,ry+.035,z);
    // Broad copper grounding strap follows the real soil and disappears into bedrock.
    const route=[[-.55,-.66],[-1.2,-1.12],[-2.1,-1.36],[-3.1,-1.9],[-4.2,-2.45]];
    for(let i=1;i<route.length;i++){
      const[a,b]=[route[i-1],route[i]],dx=b[0]-a[0],dz=b[1]-a[1],n=Math.hypot(dx,dz),ox=-dz/n*.035,oz=dx/n*.035;
      panel([[a[0]-ox,ground(...a)+.045,a[1]-oz],[a[0]+ox,ground(...a)+.045,a[1]+oz],[b[0]+ox,ground(...b)+.045,b[1]+oz],[b[0]-ox,ground(...b)+.045,b[1]-oz]],0x8c7050);
    }
    const gx=-4.2,gz=-2.45,gy=ground(gx,gz);
    const rGeo=typeof window!=='undefined'&&window.DWRockSculpt?window.DWRockSculpt(THREE,{rx:.84,ry:.36,rz:.59,detail:2,seed:0x90a57,style:'granite',uvTile:.95}):(()=>{const g=new THREE.DodecahedronGeometry(.55,0);g.scale(1.5,.62,1.05);return g;})();
    const rock=mesh(rGeo,0x6a7263,gx,gy-.04,gz);rock.userData.rockPbr='granite';
    box(.22,.028,.17,C.steel,gx,gy+.24,gz);bolt(gx,gy+.266,gz,'y');
    bar([gx,gy-.05,gz],[gx,gy+.25,gz],.027,0x8c7050);
    // Sato's abandoned headset and an open tool roll beside the repair cabinet.
    const hx=2.55,hz=3.05,hy=ground(hx,hz);
    const arch=mesh(new THREE.TorusGeometry(.17,.02,5,16,Math.PI),C.dark,hx,hy+.045,hz);arch.rotation.x=Math.PI/2;
    for(const x of[hx-.17,hx+.17]){box(.095,.07,.14,C.dark,x,hy+.04,hz);box(.075,.022,.11,0x6c735c,x,hy+.09,hz);}
    pipeCable([[hx+.18,hy+.07,hz],[hx+.3,hy+.04,hz+.1],[hx+.33,hy+.03,hz+.3],[hx+.13,hy+.025,hz+.4]],.009,C.dark);
    const tx=2.45,tz=2.37,ty=ground(tx,tz);
    box(.55,.025,.37,0x76745b,tx,ty+.02,tz,.18);
    for(let i=0;i<3;i++){bar([tx-.17+i*.14,ty+.044,tz-.13],[tx-.17+i*.14,ty+.044,tz+.11],.009,C.steel,5);box(.045,.032,.09,i===1?0x7a4936:C.dark,tx-.17+i*.14,ty+.047,tz+.12);}
    for(const x of[tx-.24,tx+.24])box(.026,.014,.32,C.old,x,ty+.041,tz);
  }

  if(o.kind==='bridge') {
    theme=variant%2?'reinforced emergency crossing':'patched timber footbridge';
    const L=o.halfLen,W=o.halfWidth;
    const B=o.buckets||null;
    const orientBox=o.orientBox||null;
    const waterY=o.waterY!=null?o.waterY:-2.2;
    const put=(kind,m)=>{
      if(B&&B[kind]){ parts.pop(); B[kind].push(m); }
      return m;
    };
    const bBox=(kind,w,h,d,c,x,y,z,ry=0,rz=0,rx=0,gAxis='auto',uOff=0,vOff=0)=>{
      const g=new THREE.BoxGeometry(w,h,d);
      if(orientBox)orientBox(g,w,h,d,{grainAxis:gAxis,uOff,vOff});
      const m=mesh(g,c,x,y,z); m.rotation.set(rx,ry,rz);
      return put(kind,m);
    };
    const bBar=(kind,a,b,r,c,sides=8)=>{
      const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);
      const len=delta.length();
      if(len<1e-4)return null;
      const m=mesh(new THREE.CylinderGeometry(r,r,len,sides),c);
      m.position.copy(av).add(bv).multiplyScalar(.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
      return put(kind,m);
    };
    const bBolt=(x,y,z,axis='y')=>{
      const m=cyl(.026,.016,C.steel,x,y,z,6);
      if(axis==='z')m.rotation.x=Math.PI/2;
      if(axis==='x')m.rotation.z=Math.PI/2;
      return put('iron',m);
    };
    // Handrail post iron base saddle brackets, through-bolts, and beveled pyramidal timber caps.
    const postZs=[-L+.24,-L*.64,-L*.32,0,L*.32,L*.64,L-.24];
    for(const side of [-1,1]){
      const px=side*(W-.08);
      for(const z of postZs){
        // Galvanized base saddle wrapping the post foot cleanly above the wheel-guard curb
        bBox('iron',.155,.15,.155,0x737b78,px,.23,z);
        bBolt(px+side*.082,.23,z,'x');
        bBolt(px-side*.082,.23,z,'x');
        // Chamfered pyramidal rain cap on top of each rail post
        bBox('deck',.165,.045,.165,0x8d7252,px,1.03,z,0,0,0,'x',z*.2);
        bBox('deck',.115,.028,.115,0x7d6346,px,1.062,z,0,0,0,'x',z*.3);
        // Outside angled timber knee-brace tying each rail post down to the stringer fascia
        bBar('deck',[px+side*.03,.54,z],[px+side*.06,-.24,z],.042,0x6e563c,6);
        bBox('iron',.09,.09,.075,0x676f6c,px+side*.05,.46,z);
      }
      // Flush low-profile carriage bolts along the deck stringer lines (never floating)
      for(let i=0;i<20;i++){
        const bz=-L+.42+i*((L*2-.84)/19);
        bBolt(side*(W-.30),.074,bz,'y');
      }
    }
    // Grounded structural transverse X-bracing between left & right pilings (strictly above riverbed & water!)
    const bentZs=[-L*.52,0,L*.52];
    const pileX=W-.24;
    for(const bz of bentZs){
      const gL=ground(-pileX,bz), gR=ground(pileX,bz);
      const botY=Math.max(Math.max(gL,gR)+.22, waterY+.16, -1.68);
      const topY=-.48;
      if(topY-botY>.35){
        bBar('deck',[-pileX,topY,bz],[pileX,botY,bz],.058,0x5f4933,6);
        bBar('deck',[pileX,topY,bz],[-pileX,botY,bz],.058,0x5f4933,6);
        // Center bolted iron X-brace gusset plate
        bBox('iron',.20,.20,.14,0x636a67,0,(topY+botY)*.5,bz);
        bBolt(0,(topY+botY)*.5,bz+.075,'z');
        bBolt(0,(topY+botY)*.5,bz-.075,'z');
      }
      // Compact piling-to-stringer longitudinal knee struts (clamped safely above ground & water)
      for(const side of [-1,1]){
        const sx=side*pileX;
        const gS=ground(sx,bz);
        const kBot=Math.max(gS+.25, waterY+.18, -1.18);
        if(-.42-kBot>.28){
          for(const dir of [-1,1]){
            bBar('deck',[sx,kBot,bz],[sx,-.40,bz+dir*.82],.055,0x644d35,6);
          }
          // Galvanized piling collar strap below the bent cap
          bBox('iron',.38,.085,.38,0x626966,sx,-.52,bz);
        }
      }
    }
    if(variant%2){
      // Variant 1 ("reinforced emergency crossing"): true 3D steel I-beam side girders with flanges, stiffeners & bolts
      const gSpan=L*1.64;
      for(const side of [-1,1]){
        const gx=side*(W+.045);
        // Web plate + projecting top & bottom flanges (weathered galvanized steel)
        bBox('iron',.042,.34,gSpan,0x8d9693,gx,-.27,0,0,0,0,'z');
        bBox('iron',.15,.046,gSpan,0x9ea7a4,gx,-.10,0,0,0,0,'z');
        bBox('iron',.15,.046,gSpan,0x7c8582,gx,-.44,0,0,0,0,'z');
        // Vertical web stiffener ribs & bolted splice plates
        for(let i=-4;i<=4;i++){
          const sz=i*(gSpan/9);
          bBox('iron',.13,.30,.045,0x858e8b,gx,-.27,sz);
          bBolt(gx+side*.065,-.20,sz,'x');
          bBolt(gx+side*.065,-.34,sz,'x');
        }
        // Steel end-post lower corner armor collar (below caution reflector so stripes stay crisp!)
        for(const end of [-1,1]){
          bBox('iron',.155,.28,.155,0x858e8b,side*(W-.08),.23,end*(L-.24));
        }
      }
      // Under-deck steel cross tie-rods connecting the two girders
      for(const tz of [-L*.52,-L*.22,L*.22,L*.52]){
        bBar('iron',[-(W+.06),-.42,tz],[W+.06,-.42,tz],.022,0x78807d,6);
      }
    }else{
      // Variant 0 ("patched timber footbridge"): bolted sister-timber splice beams reinforcing mid-span stringers
      for(const side of [-1,1]){
        const sx=side*(W-.09);
        bBox('deck',.085,.26,4.2,0x8b6e4e,sx,-.28,.45,0,0,0,'z',side*.7);
        for(const bz of [-1.25,-.25,.75,1.75,2.25]){
          bBox('iron',.11,.22,.12,0x848d8a,sx,-.28,bz);
          bBolt(sx+side*.055,-.22,bz,'x');
          bBolt(sx+side*.055,-.34,bz,'x');
        }
      }
    }
    // Crisp outward-facing caution reflector bands on all 4 end posts (facing incoming traffic, zero clipping)
    for(const side of [-1,1])for(const end of [-1,1]){
      const px=side*(W-.08);
      const faceZ=end*(L-.24)+end*.074;
      bBox('deck',.125,.38,.014,0x2b302b,px,.60,faceZ);
      for(let k=0;k<3;k++){
        bBox('deck',.112,.064,.018,k%2?0x2c302c:0xc9a853,px,.48+k*.115,faceZ+end*.004);
      }
    }
  }

  if(o.kind==='dock') {
    theme='evacuation landing left in haste';
    const W=o.halfWidth,L=o.length,side=o.boatSide||1;
    const B=o.buckets||null;
    const orientBox=o.orientBox||null;
    const waterY=o.waterY!=null?o.waterY:-.55;
    const put=(kind,m)=>{
      if(B&&B[kind]){ parts.pop(); B[kind].push(m); }
      return m;
    };
    const bBox=(kind,w,h,d,c,x,y,z,ry=0,rz=0,rx=0,gAxis='auto',uOff=0,vOff=0)=>{
      const g=new THREE.BoxGeometry(w,h,d);
      if(orientBox)orientBox(g,w,h,d,{grainAxis:gAxis,uOff,vOff});
      const m=mesh(g,c,x,y,z); m.rotation.set(rx,ry,rz);
      return put(kind,m);
    };
    const bBar=(kind,a,b,r,c,sides=8)=>{
      const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);
      const len=delta.length();
      if(len<1e-4)return null;
      const m=mesh(new THREE.CylinderGeometry(r,r,len,sides),c);
      m.position.copy(av).add(bv).multiplyScalar(.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
      return put(kind,m);
    };
    const bCyl=(kind,r,h,c,x,y,z,sides=10)=>put(kind,cyl(r,h,c,x,y,z,sides));
    const bRing=(kind,r,t,c,x,y,z,tubSeg=8,radSeg=20)=>put(kind,mesh(new THREE.TorusGeometry(r,t,tubSeg,radSeg),c,x,y,z));
    const bCable=(kind,pts,r=.016,c=C.rope)=>{ for(let i=1;i<pts.length;i++)bBar(kind,pts[i-1],pts[i],r,c,6); };
    const bBolt=(x,y,z,axis='y')=>{
      const m=cyl(.022,.014,C.steel,x,y,z,6);
      if(axis==='z')m.rotation.x=Math.PI/2;
      if(axis==='x')m.rotation.z=Math.PI/2;
      return put('iron',m);
    };
    // Structural transverse X-braces strictly between the waterward piling pairs (zero floating sticks!)
    for(const bz of [1.45,L/2-.45]){
      const px=W-.04;
      const gL=ground(-px,bz), gR=ground(px,bz);
      const botY=Math.max(Math.max(gL,gR)+.22, waterY-.55, -1.22);
      const topY=-.24;
      if(topY-botY>.35){
        bBar('deck',[-px,topY,bz],[px,botY,bz],.048,0x5a4a35,6);
        bBar('deck',[px,topY,bz],[-px,botY,bz],.048,0x5a4a35,6);
        bBox('iron',.17,.17,.12,0x5d6562,0,(topY+botY)*.5,bz);
      }
      // Iron cross-bearer tie straps at piling bents
      for(const s of [-1,1]){
        bBox('iron',.04,.22,.20,0x666e6b,s*(W+.06),-.14,bz);
        bBolt(s*(W+.085),-.10,bz,'x');
        bBolt(s*(W+.085),-.18,bz,'x');
      }
    }
    // Iron edge reinforcement straps near the waterward Heron landing end
    for(const s of [-1,1]){
      bBox('iron',.10,.014,2.1,0x6a726f,s*(W-.10),.067,L/2-1.15,0,0,0,'z');
      for(let j=0;j<5;j++)bBolt(s*(W-.10),.076,L/2-2.0+j*.42,'y');
    }
    // Cast-iron twin-horn mooring cleats cleanly along outer edges (zero Z-fighting)
    for(const [cx,cz] of [[side*(W-.18),-1.75],[side*(W-.18),2.65],[-side*(W-.18),1.15]]){
      bBox('iron',.22,.024,.11,0x49504e,cx,.072,cz);
      bCyl('iron',.022,.06,0x3c4240,cx-.045,.105,cz,8);
      bCyl('iron',.022,.06,0x3c4240,cx+.045,.105,cz,8);
      bBar('iron',[cx-.14,.138,cz],[cx+.14,.138,cz],.022,0x3b413f,8);
      for(const dx of [-.085,.085])bBolt(cx+dx,.086,cz,'y');
    }
    // Coiled braided hemp mooring lines tucked neatly near the outer edges (leaving full walkway clear)
    for(const [x,z] of [[W-.29,-2.05],[-W+.29,3.25]]){
      for(let i=0;i<4;i++){
        const m=bRing('rope',.17-i*.032,.015,0xb4a47f,x,.076+i*.007,z,6,18);
        m.rotation.x=Math.PI/2;
      }
      bCable('rope',[[x,.084,z],[x-.08,.076,z+.24],[x+.04,.074,z+.38]],.013,0xb4a47f);
    }
    // Rubber boat-fender tires mounted FLAT against the outer DEEP-WATER rub-rail, strictly BELOW deck top & clear of shore dirt!
    const fendSide=-side;
    for(const fz of [2.15,3.70]){
      const fx=fendSide*(W+.095);
      const t=bRing('deck',.18,.055,0x2b2f2d,fx,-.24,fz,8,18);
      t.rotation.y=Math.PI/2;
      // Twin hemp suspension ropes from iron fascia eye-bolts down to tire rim
      for(const dz of [-.08,.08]){
        bBar('rope',[fendSide*(W+.065),.01,fz+dz],[fx,-.09,fz+dz],.011,0xa79873,5);
        bBolt(fendSide*(W+.07),.01,fz+dz,'x');
      }
    }
    // Hanging drying fishing net draped cleanly over OPEN DEEP WATER (lz=2.45..3.42, never touching shore mud!)
    const netX=fendSide*(W+.085);
    for(let i=0;i<8;i++){
      const nz=2.45+i*.135;
      const u=(i/7)*2-1;
      const sag=.16*(1-u*u);
      bBar('rope',[netX,-.02,nz],[netX+fendSide*.03,-.46-sag,nz],.0085,0xa49674,5);
    }
    for(let j=0;j<4;j++){
      const pts=[];
      for(let i=0;i<=6;i++){
        const t=i/6, u=t*2-1;
        pts.push([netX+fendSide*(.01+j*.006),-.09-j*.11-.13*(1-u*u),2.45+t*.945]);
      }
      bCable('rope',pts,.0085,0xa49674);
    }
    // Dedicated outer-edge timber post & weathered maritime life ring (clear of corner bollard!)
    const ringX=-W-.04, ringZ=L/2-1.10;
    bBox('deck',.095,1.18,.095,0x735b41,ringX,.54,ringZ,0,0,0,'y');
    bBox('deck',.12,.035,.12,0x846a4d,ringX,1.14,ringZ);
    bBox('iron',.12,.14,.12,0x5f6764,ringX,.04,ringZ);
    bBar('iron',[ringX,.96,ringZ],[ringX,.96,ringZ+.10],.018,0x58605d,6);
    const lr=bRing('rope',.26,.054,0xb8663e,ringX,.76,ringZ+.075,10,24);
    lr.rotation.y=0;
    // Flush snug reflective white-canvas collar bands wrapped cleanly around the life ring tube
    for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
      const band=bCyl('rope',.058,.095,0xd4cfc0,ringX+Math.sin(a)*.26,.76+Math.cos(a)*.26,ringZ+.075,10);
      band.rotation.z=a+Math.PI/2;
    }
    solid(ringX,ringZ,.10,.04,1.25);
    // Swamped clinker rowboat alongside the waterward dock: weathered lapstrake hull, gunwales, ribs, broken oar & smooth catenary painter
    const bx=side*(W+1.22),bz=1.80;
    const sections=[[-1.58,.04],[-1.08,.44],[0,.58],[1.05,.49],[1.32,.36]];
    for(let i=1;i<sections.length;i++)for(const hullSide of [-1,1])for(let row=0;row<3;row++){
      const [za,wa]=sections[i-1],[zb,wb]=sections[i],lo=row/3,hi=(row+1)/3;
      const p=(t,h)=>[bx+hullSide*(wa+(wb-wa)*t)*(.54+h*.46),-.74+h*.58,bz+za+(zb-za)*t];
      const strakeCol=row===2?0x667375:(row===1?0x726b56:0x585343);
      if(i===2&&hullSide===side){
        put('deck',panel([p(0,lo),p(.15+(row%2)*.07,lo),p(.28-(row%2)*.10,hi),p(0,hi)],strakeCol));
        put('deck',panel([p(.81,lo),p(1,lo),p(1,hi),p(.68+(row%2)*.10,hi)],0x7d745a));
      }else put('deck',panel([p(0,lo),p(1,lo),p(1,hi),p(0,hi)],strakeCol));
    }
    // Solid timber gunwale rails along the top rim so the hull never reads wafer-thin
    for(let i=1;i<sections.length;i++)for(const hullSide of [-1,1]){
      if(i===2&&hullSide===side)continue;
      const [za,wa]=sections[i-1],[zb,wb]=sections[i];
      bBar('deck',[bx+hullSide*wa,-.15,bz+za],[bx+hullSide*wb,-.15,bz+zb],.032,0x856d4f,6);
    }
    // Keel, broken bilge floorboards, transom, thwarts, and curved ribs
    bBar('deck',[bx,-.76,bz-1.56],[bx,-.74,bz+1.32],.042,0x493b2a,6);
    for(const [x,z,a] of [[-.18,.42,.14],[.19,.78,-.12],[-.04,-.35,.06]])bBox('deck',.15,.032,.66,0x6e6248,bx+x,-.57,bz+z,a,0,0,'z');
    bBox('deck',.72,.52,.075,0x5f5542,bx,-.42,bz+1.31,0,0,0,'x');
    bBox('deck',.39,.055,.22,0x91805d,bx-.28,-.23,bz-.70,0,.12,0,'x');
    bBox('deck',.27,.052,.19,0x817355,bx+.32,-.33,bz-.72,0,-.46,0,'x');
    bBox('deck',.92,.052,.21,0x8b7b59,bx,-.20,bz+.54,0,.07,0,'x');
    for(const [z,w] of sections)if(w>.1){
      bBar('deck',[bx-w,-.16,bz+z],[bx-w*.58,-.70,bz+z],.024,0x564632,6);
      bBar('deck',[bx+w,-.16,bz+z],[bx+w*.58,-.70,bz+z],.024,0x564632,6);
    }
    // Iron bow mooring ring + snapped wooden oar resting inside hull
    bRing('iron',.045,.012,0x515856,bx,-.20,bz+1.35,6,12);
    bBar('deck',[bx-.25,-.36,bz+.14],[bx+.16,-.30,bz+.88],.022,0x9e845c,8);
    bBar('deck',[bx+.12,-.50,bz-.22],[bx+.30,-.49,bz-.67],.023,0x9e845c,8);
    bBox('deck',.15,.024,.36,0x9e845c,bx+.34,-.48,bz-.80,-.28,0,0,'z');
    // Smooth 8-segment catenary braided hemp painter rope from dock cleat to rowboat bow ring
    const p0=[side*(W-.18),.138,2.65], p1=[bx,-.20,bz+1.34];
    const painterPts=[];
    for(let i=0;i<=8;i++){
      const t=i/8;
      const sag=.22*4*t*(1-t);
      painterPts.push([
        p0[0]+(p1[0]-p0[0])*t,
        p0[1]+(p1[1]-p0[1])*t-sag,
        p0[2]+(p1[2]-p0[2])*t
      ]);
    }
    bCable('rope',painterPts,.016,0xb2a27d);
    // Military emergency flare case seated on a cantilevered timber utility shelf OUTSIDE the landward edge
    // so the entire 2.30 m dock entrance stays 100% unobstructed (zero snagging!) and matte olive reads crisply!
    const crateZ=-L/2+1.02, fx=-W-.24;
    bBox('deck',.44,.08,.50,0x67553c,fx+.03,.02,crateZ,0,0,0,'z');
    for(const dz of [-.18,.18])bBar('deck',[fx-.10,-.01,crateZ+dz],[-W,.0-.26,crateZ+dz],.038,0x554632,6);
    bBox('deck',.38,.27,.36,0x637254,fx,.195,crateZ);
    bBox('deck',.41,.062,.39,0x768466,fx,.358,crateZ);
    for(const x of [fx-.12,fx+.12]){
      bBox('iron',.045,.030,.40,0x454c49,x,.40,crateZ);
      bBox('iron',.048,.076,.024,0x8c9491,x,.29,crateZ-.19);
    }
    bBox('deck',.15,.012,.25,0xb35d3e,fx,.394,crateZ);
    bBar('iron',[fx-.09,.23,crateZ-.205],[fx+.09,.23,crateZ-.205],.014,0x464d4a,6);
    solid(fx,crateZ,.18,.04,.38);
    // Proper two-post weathered timber extraction timetable board with pitched rain hood & planked wood back (never a black void!)
    const signX=W+.17, signZ=-3.7;
    for(const dz of [-.52,.52]){
      const gy=ground(signX,signZ+dz);
      bBox('deck',.085,1.72-gy+.25,.085,0x634d35,signX,(gy-.25+1.72)*.5,signZ+dz,0,0,0,'y');
      bBox('iron',.105,.12,.105,0x7c8582,signX,Math.max(.04,gy+.06),signZ+dz);
    }
    // Weathered timber backing frame & tongue-and-groove back planks behind the laminated schedule
    bBox('deck',.055,.76,1.10,0x5f4b36,signX+.012,1.25,signZ,0,0,0,'z');
    for(let k=0;k<5;k++){
      bBox('deck',.022,.135,1.04,k%2?0x776045:0x6b553d,signX+.046,.97+k*.14,signZ,0,0,0,'z',k*.3);
    }
    // Horizontal cross-battens & iron corner brackets on back face
    for(const dz of [-.38,.38])bBox('deck',.03,.70,.08,0x54422f,signX+.062,1.25,signZ+dz,0,0,0,'y');
    bBox('deck',.06,.66,1.00,0xb9b4a1,signX-.014,1.25,signZ,0,0,0,'z');
    // Pitched weathered timber rain-hood cap overhanging top of signboard
    bBox('deck',.30,.048,1.22,0x5c4732,signX+.01,1.665,signZ,0,.16,0,'z');
    for(const dz of [-.48,.48])bBox('iron',.085,.045,.055,0x676f6c,signX-.025,1.56,signZ+dz);
  }

  if(o.kind==='wreck') {
    theme=variant%2?'stripped utility truck':'failed medical supply convoy';
    const medical=variant%2===0;
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
    if(medical){
      panel([[-1,2.42,-2.31],[.16,2.34,-2.4],[.33,2.06,-1.97],[-.98,1.98,-1.93]],paint);
      panel([[.89,1.51,-2.8],[1.3,1.23,-2.83],[1.02,1.96,-2.05],[.6,2.01,-1.97]],C.old);
      bar([.17,2.35,-2.4],[.34,2.07,-1.98],.023,C.rust,4);
    }else box(1.98,.08,1.03,paint,0,1.71,-2.34,0,0,.58);
    box(1.22,.37,.76,C.dark,0,1.19,-2.3);
    for(let i=0;i<4;i++){
      const head=cyl(.1,.16,C.steel,-.42+i*.28,1.42,-2.3,8);
      if(medical&&i>1){head.rotation.z=.48;head.position.y-=.09;}
    }
    box(1.8,.45,.12,C.dark,0,1.04,-2.87);
    for(let i=0;i<10;i++)if(!medical||i<3||i>6)box(.08,.38,.06,C.steel,-.69+i*.15,1.05,-2.95,0,medical?(i-4)*.045:0);
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
    if(medical)box(2.13,.57,.075,paint,0,.39,2.83,0,0,-.12);
    else box(2.13,.57,.085,paint,0,1.11,2.93,0,0,-.73);
    for(const x of [-.86,.86])box(.18,.075,.03,C.red,x,.79,2.85);
    for(const z of [-2.02,.55,2.05]){
      bar([-1.16,.5,z],[1.16,.5,z],.075,C.steel);
      for(const side of [-1,1]){
        const x=side*1.14,flat=side>0&&z<0,wy=flat?.38:.5;
        if(medical&&side<0&&z<0){
          const disc=cyl(.205,.12,C.rust,x,.49,z,12);disc.rotation.z=Math.PI/2;
          const stub=cyl(.095,.28,C.steel,x-.06,.49,z,8);stub.rotation.z=Math.PI/2;
          for(let k=0;k<5;k++)bolt(x-.15,.49+Math.cos(k*Math.PI*2/5)*.145,z+Math.sin(k*Math.PI*2/5)*.145,'x');
          bar([-.72,.54,-2.02],[-1.19,.33,-2.32],.045,C.rust);
          continue;
        }
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
    if(medical){
      // Broken radiator core and severed hoses beneath the folded bonnet.
      box(.68,.29,.16,C.rust,.22,1.01,-2.99,0,.2);
      pipeCable([[-.44,1.35,-2.45],[-.72,1.28,-2.67],[-.87,.93,-2.85]],.047);
      pipeCable([[.42,1.26,-2.5],[.69,1.15,-2.75],[.72,.87,-2.87]],.04);
      bar([-.9,.93,-3.06],[-.43,.68,-3.23],.053,C.steel);
      // Cargo identity panels and shallow paint losses, all below the canvas.
      for(const side of[-1,1]){
        box(.012,.46,1.16,0x455340,side*1.128,1.43,1.88);
        for(let i=0;i<11;i++)box(.015,.016+(i%3)*.009,.08+(i%4)*.043,C.rust,side*1.139,1.17+(i%3)*.2,.1+i*.22);
        box(.015,.022,.43,C.pale,side*1.141,1.63,1.88);
      }
      // Collapse the front progressively without lifting the rear tyres off their seats.
      for(const p of parts){
        p.updateMatrix();p.geometry.applyMatrix4(p.matrix);
        const a=p.geometry.attributes.position;
        for(let i=0;i<a.count;i++){
          const x=a.getX(i),z=a.getZ(i),k=Math.max(0,Math.min(1,(.45-z)/2.47));
          a.setY(i,a.getY(i)-k*(.27+(x<0?.065:0)));
        }
        a.needsUpdate=true;p.geometry.computeVertexNormals();p.position.set(0,0,0);p.rotation.set(0,0,0);p.scale.set(1,1,1);
      }
    }
    // Apply the vehicle's settled suspension before placing loose cargo on ground.
    transform(0,0,0,0,0,o.roll||0,o.tilt||0);
    solid(0,-1.5,1.2,0,2.55);solid(0,1.2,1.3,0,2.3);
    for(const [x,z] of [[1.75,2.55],[-1.95,1.5]]){
      const y=ground(x,z);
      if(medical&&x>0){
        // Burst shipping crate retains its original footprint and collider.
        box(.68,.065,.68,C.old,x,y+.035,z,.35);
        for(const side of[-1,1])box(.055,.46,.65,C.wood,x+side*.31,y+.26,z);
        box(.66,.4,.055,C.wood,x,y+.23,z-.32);
        for(const dx of[-.22,.02,.24])box(.19,.05,.65,C.cut,x+dx,y+.1,z+.38,.25+dx,0,-.12);
        box(.36,.25,.3,C.pale,x-.04,y+.2,z-.06,0,.06);
        box(.075,.15,.015,C.red,x-.04,y+.23,z+.101);
        box(.19,.055,.015,C.red,x-.04,y+.23,z+.102);
        box(.28,.13,.23,0x81876a,x+.08,y+.37,z-.13,.15);
      }else crate(x,y,z,.68,C.wood,.35,variant%2===0);
      solid(x,z,.45,y,.55);
    }
    const y=ground(-1.75,-1.8);
    // Detached door, empty fuel can and glass shards show why it never left.
    box(.85,.075,1.03,paint,-1.85,y+.1,-1.65,.3,0,.08);
    box(.62,.03,.32,C.dark,-1.85,y+.15,-1.93,.3);
    can(1.68,ground(1.68,-.3),-.3,C.rust);
    for(let i=0;i<5;i++)panel([[-1.5+i*.16,y+.025,-2.3],[-1.42+i*.16,y+.025,-2.2],[-1.57+i*.16,y+.025,-2.16]],0x687977);
    if(medical){
      // Abandoned litter, halfway down from the open bed. Its lower handles meet the soil.
      const seat=new THREE.Vector3(-.4,1.06,2.79).applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(o.tilt||0,0,o.roll||0)));
      const near=[seat.x,seat.y,seat.z],far=[-.4,ground(-.4,4.7)+.14,4.7];
      for(const s of[-1,1])bar([near[0]+s*.36,near[1],near[2]-.15],[far[0]+s*.36,far[1],far[2]+.2],.028,C.steel);
      panel([[near[0]-.3,near[1]-.045,near[2]],[near[0]+.3,near[1]-.045,near[2]],[far[0]+.3,far[1]-.045,far[2]],[far[0]-.3,far[1]-.045,far[2]]],0x7b8060);
      for(const t of[.25,.72]){
        const yy=near[1]+(far[1]-near[1])*t,zz=near[2]+(far[2]-near[2])*t;
        const xx=near[0]+(far[0]-near[0])*t;
        bar([xx-.34,yy+.012,zz],[xx+.34,yy+.012,zz],.021,C.old,4);
      }
      box(.47,.07,.28,0xa8a68e,-.4,near[1]-.05,near[2]+.17,0,0,.4);
      // Supply packets and cloth rolls make the spill distinct from general salvage.
      for(let i=0;i<4;i++){
        const x=1.5+i*.18,z=3.02+(i%2)*.36,gy=ground(x,z);
        if(i%2){const m=cyl(.074,.18,C.pale,x,gy+.082,z,10);m.rotation.z=Math.PI/2;box(.035,.014,.14,C.old,x,gy+.15,z);}
        else{box(.21,.065,.28,0xa8a991,x,gy+.045,z,i*.31);box(.07,.008,.14,C.pale,x,gy+.081,z,i*.31);}
      }
      // Uneven, ground-seated scrapes and a small old leak; no glossy puddle effect.
      for(const[x,z,rx,rz,col]of[[-.9,-2.5,.58,.43,0x363a2c],[-1.14,-3.1,.19,.73,0x695b40],[-1.13,-4,.14,.42,0x79694c],[1.78,3.45,.23,.63,0x75654a]]){
        const vs=[];for(let i=0;i<9;i++){const a=i*Math.PI*2/9,k=1-(i%3)*.1,px=x+Math.cos(a)*rx*k,pz=z+Math.sin(a)*rz*k;vs.push([px,ground(px,pz)+.014,pz]);}panel(vs,col);
      }
      // A torn tyre sidewall lies behind the detached door, separate from the bare hub.
      const tyre=ring(.31,.085,C.dark,-2.03,ground(-2.03,-.65)+.105,-.65);tyre.rotation.x=Math.PI/2;tyre.scale.y=.77;
    }
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
      // Curing frame and stored traps sit outside the sleeping shelter and hearth. The frame stands against the cabin's
      // side wall, its hide to the fire (CL-256 batch 3: out by the bench it stood on the cache's approach, 0.78 m off).
      const x=-1.25,z=-2.45,y=ground(x,z);
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
