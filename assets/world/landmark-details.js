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
    const rock=mesh(new THREE.DodecahedronGeometry(.55,0),0x626d5c,gx,gy-.1,gz);rock.scale.set(1.5,.62,1.05);
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
      for(const x of [-W+.19,W-.19]){bolt(x,.067,z-.32,'y');bolt(x,.067,z+.19,'y');}
      for(let k=0;k<4;k++)box(.28+(k%2)*.17,.005,.008,i%2?0x655e48:0x4c4a3b,-.77+k*.48,.068,z-.46+(k%3)*.16);
      // Short end-grain cracks and scars stay flush with the walking surface.
      for(const s of [-1,1])bar([s*(W-.02),.071,z-.36],[s*(W-.24),.071,z-.33+(i%3)*.013],.004,0x393c32,4);
    }
    // Aged bearers and diagonal repairs, all below the established deck height.
    for(const x of [-W+.16,W-.16]){
      box(.18,.24,L,0x4f4b39,x,-.16,0);
      for(const z of [1.1,3.2]){bar([x,-1.02,z-.73],[x,-.19,z+.7],.055,0x8b7651,4);box(.05,.25,.22,C.steel,x*1.04,-.21,z+.7);}
      box(.16,.026,2.3,C.steel,x,.069,L/2-1.18);
      for(let j=0;j<6;j++)bolt(x,.087,L/2-2.1+j*.37,'y');
    }
    for(const z of [L/2-.12,L/2-1.6])box(W*2,.22,.17,0x69604a,0,-.21,z);
    // Coiled mooring lines remain outside the middle of the narrow walkway.
    for(const [x,z]of [[W-.28,-1.9],[-W+.3,3.1]]){
      for(let i=0;i<4;i++){const m=ring(.18-i*.034,.014,C.rope,x,.088+i*.008,z);m.rotation.x=Math.PI/2;}
      pipeCable([[x,.105,z],[x-.12,.1,z+.3],[x+.05,.1,z+.43]],.012,C.rope);
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
    // A swamped clinker hull: an open split, absent floorboards and broken seating.
    const bx=side*(W+1.2),bz=1.8;
    const sections=[[-1.6,.03],[-1.1,.43],[0,.57],[1.05,.48],[1.3,.35]];
    for(let i=1;i<sections.length;i++)for(const hullSide of [-1,1])for(let row=0;row<3;row++){
      const [za,wa]=sections[i-1],[zb,wb]=sections[i],lo=row/3,hi=(row+1)/3;
      const p=(t,h)=>[bx+hullSide*(wa+(wb-wa)*t)*(.55+h*.45),-.74+h*.58,bz+za+(zb-za)*t];
      if(i===2&&hullSide===side){
        panel([p(0,lo),p(.14+(row%2)*.08,lo),p(.3-(row%2)*.12,hi),p(0,hi)],C.old);
        panel([p(.82,lo),p(1,lo),p(1,hi),p(.67+(row%2)*.11,hi)],0x7a7156);
      }else panel([p(0,lo),p(1,lo),p(1,hi),p(0,hi)],row%2?0x615e49:0x7d7357);
    }
    // The actual lake surface shows through the missing bilge and the open side.
    for(const [x,z,a]of [[-.18,.43,.15],[.2,.8,-.13]])box(.15,.035,.64,0x6c634a,bx+x,-.56,bz+z,a);
    box(.7,.5,.075,C.old,bx,-.41,bz+1.3);
    box(.39,.06,.22,0x91815c,bx-.29,-.23,bz-.7,0,.13);box(.26,.055,.19,0x817557,bx+.33,-.33,bz-.72,0,-.5);
    box(.91,.055,.2,0x8a7d5d,bx,-.2,bz+.55,0,.08);
    for(const [z,w]of sections)if(w>.1){bar([bx-w,-.18,bz+z],[bx-w*.6,-.68,bz+z],.025,C.old,5);bar([bx+w,-.18,bz+z],[bx+w*.6,-.68,bz+z],.025,C.old,5);}
    // The oar is snapped; neither a sound hull nor a usable paddle is promised.
    bar([bx-.26,-.35,bz+.15],[bx+.15,-.29,bz+.88],.023,C.cut);
    bar([bx+.12,-.5,bz-.2],[bx+.3,-.49,bz-.67],.024,C.cut);box(.15,.026,.34,C.cut,bx+.34,-.48,bz-.78,-.3);
    pipeCable([[side*(W-.24),.18,2.6],[side*(W+.12),-.12,2.4],[bx-.02,-.18,bz+1.25]],.018,C.rope);
    for(const z of [-1.2,1.2])ring(.27,.075,C.dark,-W-.08,-.22,z);
    const crateZ=-L/2+.85;
    // Stowed emergency flare case replaces the old small crate in its exact solid footprint.
    const fx=-W+.3;
    box(.48,.33,.43,0x515d46,fx,.25,crateZ);box(.51,.075,.46,0x687159,fx,.45,crateZ);
    for(const x of [fx-.17,fx+.17]){box(.055,.038,.47,C.dark,x,.5,crateZ);box(.06,.09,.025,C.steel,x,.37,crateZ-.227);}
    box(.17,.012,.31,0xa2583d,fx,.495,crateZ);
    bar([fx-.1,.29,crateZ-.252],[fx+.1,.29,crateZ-.252],.016,C.dark);
    solid(-W+.3,crateZ,.3,.08,.45);
    // Laminated timetable frame, facing across the landward approach (lettering is keyed in buildDock).
    const signX=W+.17,signZ=-3.7;
    bar([signX,ground(signX,signZ)-.08,signZ],[signX,1.67,signZ],.045,C.old,6);
    box(.07,.74,1.08,C.dark,signX,1.25,signZ);box(.075,.66,1,C.pale,signX-.007,1.25,signZ);
    for(const z of [signZ-.48,signZ+.48])box(.09,.045,.045,C.steel,signX-.025,1.55,z);
    // Life ring on its own post and a hanging drying net outside the walking edge.
    bar([-W+.08,.05,L/2-.6],[-W+.08,1.15,L/2-.6],.045,C.old);
    ring(.29,.062,0xaa6f48,-W+.08,.78,L/2-.56);
    for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])box(.11,.14,.04,C.pale,-W+.08+Math.sin(a)*.29,.78+Math.cos(a)*.29,L/2-.5,0,-a);
    for(let i=0;i<8;i++)bar([-W-.1,-.07,-.5+i*.14],[-W-.13,-.75+Math.abs(i-3.5)*.07,-.5+i*.14],.009,C.rope,4);
    for(let j=0;j<4;j++)bar([-W-.12,-.19-j*.12,-.5],[-W-.12,-.19-j*.12,.48],.009,C.rope,4);
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
