// GP-168/GP-191: Training props; gate leaves stay separate for animation.
// Dimensions are metres; no lights, timers, physics or gameplay state here.
export function dressTrainingProps(T, { B, gate, bedAt, box: roomBox, add: roomAdd, std, texture, sign, steel, steelLight, hazard, lampMat, labels = {} }) {
  let moving = null, staticGate = null, medicalFurniture = false;
  const gateFrame = new T.Group(); gateFrame.name = 'training-gate-frame';
  const route = m => { const parent = moving || staticGate; if (parent) parent.add(m); if (medicalFurniture) m.userData.trainingProp = true; return m; };
  const add = (...args) => route(roomAdd(...args));
  const box = (...args) => route(roomBox(...args));
  const gateLeaves = [-1, 1].map(side => {
    const leaf = new T.Group(); leaf.name = 'training-gate-leaf-' + side;
    leaf.userData.side = side; leaf.scale.y = 1.4; return leaf;
  });
  const rubber = std({ color: 0x141b19, roughness: .94 });
  const dark = std({ color: 0x25312b, roughness: .79, metalness: .4 });
  const bone = std({ color: 0xc7c9ae, roughness: .85 });
  const red = std({ color: 0xa6382c, roughness: .79 });
  const paintMap = texture(256, 256, c => {
    c.fillStyle = '#52604b'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 170; i++) {
      const x = (i * 73 + 9) % 256, y = (i * 41 + 15) % 256;
      c.fillStyle = i % 3 ? '#10201625' : '#d4d2ac35';
      c.fillRect(x, y, 2 + i % 13, 1 + i % 2);
    }
    c.strokeStyle = '#c0c4a255'; c.lineWidth = 2; c.strokeRect(3, 3, 250, 250);
  });
  const olive = std({ color: 0xffffff, map: paintMap, roughness: .82, metalness: .3 });
  const clothMap = texture(256, 256, c => {
    c.fillStyle = '#60694f'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 4) {
      c.fillStyle = '#c4c8a01b'; c.fillRect(i, 0, 1, 256);
      c.fillStyle = '#111e181f'; c.fillRect(0, i, 256, 1);
    }
    c.strokeStyle = '#a5ad8266'; c.lineWidth = 3; c.strokeRect(8, 8, 240, 240);
  });
  const canvas = std({ color: 0xffffff, map: clothMap, roughness: .98 });
  const amber = std({ color: 0xf2b845, emissive: 0xf2a329, emissiveIntensity: .65, roughness: .38 });
  const cyl = (r, h, mat, x, y, z, seg = 12) => add(new T.CylinderGeometry(r, r, h, seg), mat, x, y, z);
  const rod = (a, b, r, mat) => {
    const dir = new T.Vector3(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
    const m = cyl(r, dir.length(), mat, (a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2, 8);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize()); return m;
  };
  const rounded = (w, h, d, mat, x, y, z, radius = .045) => {
    const bevel = Math.min(.012, d / 4, w / 6, h / 6);
    const X = w / 2 - bevel, Y = h / 2 - bevel, r = Math.min(radius, X / 2, Y / 2), s = new T.Shape();
    s.moveTo(-X+r,-Y); s.lineTo(X-r,-Y); s.quadraticCurveTo(X,-Y,X,-Y+r);
    s.lineTo(X,Y-r); s.quadraticCurveTo(X,Y,X-r,Y); s.lineTo(-X+r,Y);
    s.quadraticCurveTo(-X,Y,-X,Y-r); s.lineTo(-X,-Y+r); s.quadraticCurveTo(-X,-Y,-X+r,-Y);
    const geo = new T.ExtrudeGeometry(s,{depth:d-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1,curveSegments:3});
    geo.translate(0,0,-d/2+bevel); const m=add(geo,mat,x,y,z);m.castShadow=true;m.receiveShadow=true;return m;
  };
  const bolt = (x,y,z,r=.035,depth=.024) => { const b=cyl(r,depth,steelLight,x,y,z,6); b.rotation.x=Math.PI/2; return b; };
  const cross = (x,y,z,size=.35,depth=.022) => {
    const w = size * .24, arm = (size - w) / 2;
    box(size,w,depth,red,x,y,z);
    for (const sy of [-1, 1]) box(w,arm,depth,red,x,y + sy * (w + arm) / 2,z);
  };
  const bandRing = (rIn, rOut, h, mat, x, y, z, seg = 16) => {
    const m = add(new T.LatheGeometry([
      new T.Vector2(rIn, 0), new T.Vector2(rOut, 0),
      new T.Vector2(rOut, h), new T.Vector2(rIn, h), new T.Vector2(rIn, 0)
    ], seg), mat, x, y, z);
    m.castShadow = true; return m;
  };

  // A broad sealed containment gate: twin ribbed leaves, central latch, guides,
  // hydraulic gear and a grated approach. Front faces point into the room (-z).
  staticGate = gateFrame; gateFrame.scale.y = 1.4;
  const gx=gate.x, gz=B.maxZ-.02;
  // Threshold plate & hazard nosing seated flush on y = 0.000 m, with approach traction ribs.
  box(8.2,.032,1.0,steel,gx,.016,gz-.51);
  box(8.2,.032,.14,hazard,gx,.016,gz-1.08);
  for(let i=-15;i<=15;i++)box(.055,.012,.5,rubber,gx+i*.195,.038,gz-.74);
  // Lintel beam, under-lintel hazard valance, and upper header backing.
  box(7.58,.32,.56,steel,gx,4.68,gz-.36);
  box(5.92,.1,.16,hazard,gx,4.47,gz-.54);
  box(7.9,.52,.14,dark,gx,5.1,gz-.15);
  for (const side of [-1,1]) {
    const px = gx + side * 1.6, rx = gx + side * 1.535;
    moving = gateLeaves[side < 0 ? 0 : 1];
    rounded(3.18,4.3,.18,olive,px,2.24,gz-.26,.08);
    box(3.12,.058,.14,rubber,px,.061,gz-.26);
    box(.12,4.3,.06,steel,gx+side*3.04,2.24,gz-.38);
    for (const y of [.55,1.55,2.55,3.55]) {
      box(2.89,.16,.08,steel,rx,y,gz-.39);
      for (const dx of [-1.25,1.25]) bolt(rx+dx,y,gz-.442,.035,.024);
    }
    const brace=box(.14,3.1,.05,dark,rx,2.05,gz-.455); brace.rotation.z=side*.58;
    for(let i=0;i<7;i++)box(.92,.036,.05,rubber,rx,3.88+i*.052,gz-.375);
    moving = null;
    // Side pilasters, guide channels, hazard stripes and anchor bolts on the threshold.
    box(.44,4.488,.48,steel,gx+side*3.53,2.276,gz-.32);
    box(.18,4.488,.2,steelLight,gx+side*3.22,2.276,gz-.46);
    box(.13,4.4,.04,hazard,gx+side*3.46,2.276,gz-.58);
    for (const y of [.4,1.4,2.4,3.4,4.35]) bolt(gx+side*3.66,y,gz-.572,.044,.024);
    // Hydraulic cylinder & piston rod on threshold, collared flush to pilaster.
    cyl(.13,1.3,dark,gx+side*3.91,.682,gz-.32,12);
    cyl(.08,1.8,steelLight,gx+side*3.91,2.232,gz-.32,12);
    box(.32,.1,.18,steel,gx+side*3.91,3.182,gz-.32);
    box(.03,.12,.16,steel,gx+side*3.765,.68,gz-.32);
    // Motor housing and upper guide roller under lintel.
    box(.58,.42,.4,olive,gx+side*3.56,5.05,gz-.42);
    box(.16,.1,.1,steel,gx+side*3.04,4.47,gz-.47);
    const roller=cyl(.06,.12,rubber,gx+side*3.04,4.36,gz-.47);roller.rotation.z=Math.PI/2;
    // Caged warning beacons seated on lintel. Named so they stay their own meshes (bakeStatic
    // merges unnamed ones): the encounter lights sit on this glass.
    const bxBeacon = gx + side * 2.8;
    box(.5,.56,.22,dark,bxBeacon,5.12,gz-.36);
    const lens = rounded(.3,.32,.12,amber,bxBeacon,5.12,gz-.53,.06);
    lens.name = 'training-gate-beacon';
    for (const y of [4.92,5.32]) box(.4,.025,.16,steel,bxBeacon,y,gz-.55);
    for (const dx of [-.13,0,.13]) box(.025,.375,.03,steel,bxBeacon+dx,5.12,gz-.615);
  }
  moving = gateLeaves[0];
  box(.18,4.3,.08,dark,gx,2.24,gz-.39);
  box(.5,.54,.1,steel,gx,2.05,gz-.48);
  for(const y of [1.86,2.24])box(1.12,.07,.06,steelLight,gx,y,gz-.56);
  bolt(gx,2.05,gz-.555,.09,.05);
  moving = null;
  if(labels.gate) {
    box(4.18,.56,.06,dark,gx,5.12,gz-.61);
    gateFrame.add(sign(labels.gate,4.1,.54,gx,5.12,gz-.6403,Math.PI,{bg:'#1e2923',color:'#ddd6b1',size:150}));
  }
  if(labels.containment) {
    moving = gateLeaves[0];
    box(2.79,.2,.02,dark,gx-1.535,3.74,gz-.36);
    moving = null;
    const label = sign(labels.containment,2.75,.18,gx-1.535,3.74,gz-.3703,Math.PI,{bg:'#27352b',color:'#c7c9ae',size:115});
    gateLeaves[0].add(label);
  }

  staticGate = null;

  // A fitted field medical bay along the back wall. Olive, charcoal and canvas
  // echo the FOB's equipment; a pale floor inset keeps its working area readable.
  const bx=bedAt.x,bz=bedAt.z,back=B.minZ+.08;
  // Floor mat seated flat on y = 0.000 m, trimmed flush against the bay walls (top y = 0.020 m).
  box(7.4,.012,4.04,dark,bx+.82,.006,back+2.0775);
  box(7.2,.008,3.84,std({color:0x929a85,roughness:.96}),bx+.82,.016,back+2.0775);
  box(7.56,2.76,.075,dark,bx+.82,1.38,back+.02);
  for(let i=0;i<4;i++)box(1.76,2.44,.035,olive,bx-1.945+i*1.83,1.43,back+.075);
  for(const x of [-43.77,-36.29])box(.08,2.76,.08,steel,x,1.38,back+.0975);
  box(7.56,.17,.26,steel,bx+.82,2.845,back+.1125);
  box(6.8,.045,.1,lampMat,bx+.82,2.7375,back+.19);
  // Short return panel closes the corner visually without enclosing the bay.
  box(.08,2.76,3.74,dark,-43.77,1.38,-9.9125);
  box(.025,2.45,3.4,olive,-43.7175,1.43,-9.9125);
  if(labels.infirmary) {
    box(3.64,.5,.02,dark,bx-.2,2.34,back+.1025);
    sign(labels.infirmary,3.6,.48,bx-.2,2.34,back+.1128,0,{bg:'#25312b',color:'#ddd6b1',size:140});
  }
  cross(bx-2.58,2.3,back+.1035,.49,.022);
  // GP-19893: furniture near a wall must not become part of its architectural fade.
  medicalFurniture = true;
  // Reinforced wheeled stretcher, segmented pad, canvas blanket and stitched hem (seated on y = 0.020 m mat).
  rounded(2.48,.1,1.0,dark,bx,.47,bz,.045);
  for(const dz of [-.535,.535])rod([bx-1.18,.47,bz+dz],[bx+1.18,.47,bz+dz],.035,steelLight);
  for(const dx of [-.93,.93])for(const dz of [-.39,.39]) {
    const wheel=cyl(.095,.052,rubber,bx+dx,.115,bz+dz);wheel.rotation.x=Math.PI/2;
    for(const sz of [-1,1]) {
      const hub=cyl(.034,.008,steelLight,bx+dx,.115,bz+dz+sz*.03);hub.rotation.x=Math.PI/2;
      box(.05,.125,.012,steel,bx+dx,.1625,bz+dz+sz*.04);
    }
    box(.11,.025,.092,steel,bx+dx,.2375,bz+dz);
    cyl(.036,.17,steel,bx+dx,.335,bz+dz);
  }
  for(const dx of [-.93,.93])box(.045,.045,.708,steel,bx+dx,.285,bz);
  for(const dz of [-.18,.18])box(1.815,.03,.035,steel,bx,.285,bz+dz);
  for(const dz of [-.39,.39]) {
    box(1.788,.028,.028,steelLight,bx,.335,bz+dz);
    box(.028,.071,.028,steelLight,bx,.3845,bz+dz);
  }
  rounded(2.36,.16,.94,canvas,bx,.6,bz,.045);
  box(.014,.006,.86,dark,bx-.52,.683,bz);
  rounded(.46,.076,.65,bone,bx-.88,.718,bz,.03);
  rounded(1.3,.024,.94,canvas,bx+.34,.692,bz,.008);
  for(const sz of [-1,1])box(1.24,.075,.014,canvas,bx+.34,.6665,bz+sz*.477);
  for(let i=0;i<9;i++)box(.85,.004,.006,bone,bx+.33,.706,bz-.36+i*.09);
  // Tubular ends and a low side rail; the wake-up side remains clear.
  for(const dx of [-1.21,1.21]) {
    for(const dz of [-.42,.42]) {
      cyl(.024,.336,steelLight,bx+dx,.688,bz+dz);
      box(.052,.048,.052,steelLight,bx+dx,.88,bz+dz);
    }
    box(.036,.036,.788,steelLight,bx+dx,.88,bz);
  }
  for(const dx of [-.83,.83]) {
    box(.048,.025,.048,steel,bx+dx,.5175,bz-.535);
    cyl(.02,.26,steel,bx+dx,.66,bz-.535);
    box(.048,.048,.048,steelLight,bx+dx,.814,bz-.535);
  }
  box(1.612,.036,.036,steelLight,bx,.814,bz-.535);
  // Under-bed supplies, fastening straps and folded dressings on the shelf rails.
  rounded(.74,.11,.47,olive,bx+.2,.355,bz,.028);
  for(const dx of [-.05,.4]) {
    box(.05,.008,.47,dark,bx+dx,.414,bz);
    for(const sz of [-1,1])box(.05,.118,.008,dark,bx+dx,.359,bz+sz*.239);
  }
  cross(bx+.18,.355,bz+.242,.09,.014);

  // Lockable medical cabinet and worktop on four steel legs seated on y = 0.020 m mat.
  const cx=bx+2.72,cz=back+.64;
  for(const dx of [-.68,.68])for(const dz of [-.31,.31])box(.08,.09,.08,steel,cx+dx,.065,cz+dz);
  rounded(1.65,.9825,.83,olive,cx,.60125,cz,.035);
  box(1.78,.075,.94,steelLight,cx,1.13,cz);
  for(const y of [.25,.53,.81]) {
    box(1.5,.22,.016,dark,cx,y,cz+.423);
    box(1.42,.17,.018,olive,cx,y,cz+.44);
    for(const hx of [-.22,.22])box(.022,.022,.026,steelLight,cx+hx,y+.015,cz+.462);
    rod([cx-.25,y+.015,cz+.489],[cx+.25,y+.015,cz+.489],.014,steelLight);
  }
  rounded(.48,.24,.35,bone,cx-.5,1.2875,cz+.05,.025);cross(cx-.5,1.2875,cz+.233,.15,.016);
  for(let i=0;i<3;i++)rounded(.26,.068,.23,bone,cx-.04,1.2015+i*.068,cz-.16,.014);
  // Portable monitor with a baked waveform display (no animated extra draw).
  const screen=texture(384,256,c=>{
    c.fillStyle='#081a14';c.fillRect(0,0,384,256);c.strokeStyle='#a8d2ad';c.lineWidth=4;
    c.beginPath();c.moveTo(15,114);c.lineTo(111,114);c.lineTo(128,104);c.lineTo(146,142);c.lineTo(160,62);c.lineTo(180,122);c.lineTo(201,114);c.lineTo(370,114);c.stroke();
    c.fillStyle='#709c7d';for(let i=0;i<12;i++)c.fillRect(18+i*29,192,19,10);
  });
  const screenMat=std({map:screen,color:0xffffff,emissiveMap:screen,emissive:0xffffff,emissiveIntensity:.35,roughness:.48});
  box(.38,.0525,.25,steel,cx+.48,1.19375,cz-.08);
  rounded(.58,.44,.24,dark,cx+.48,1.44,cz-.08,.035);
  box(.46,.28,.012,screenMat,cx+.48,1.48,cz+.046);
  for(const dx of [-.17,0,.17])cyl(.024,.02,bone,cx+.48+dx,1.28,cz+.05).rotation.x=Math.PI/2;
  // Wall supply case, visible hinges and red cross seated flush on wall panels.
  rounded(1.55,.7,.3,olive,cx,2.08,back+.2425,.03);
  for(const dx of [-.36,.36])box(.62,.57,.02,dark,cx+dx,2.08,back+.4025);
  cross(cx-.36,2.08,back+.4205,.28,.016);
  for(const dx of [-.69,.69])for(const y of [1.9,2.26])box(.04,.09,.02,steelLight,cx+dx,y,back+.4025);
  // IV stand, hooked top, bag seams and an opaque fluid insert; tube is segmented (on y = 0.020 m mat).
  const ix=bx-1.42,iz=bz-.66;
  box(.068,.055,.068,steel,ix,.095,iz);
  for(const [sx,sz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const fx=ix+sx*.26, fz=iz+sz*.26;
    cyl(.032,.024,rubber,fx,.032,fz,12);
    box(.036,.036,.036,steel,fx,.062,fz);
    box(sx?0.208:0.018,.012,sz?0.208:0.018,steel,ix+sx*.138,.074,iz+sz*.138);
  }
  cyl(.02,1.7875,steelLight,ix,1.01625,iz);
  box(.044,.028,.044,steelLight,ix,1.924,iz);
  for(const sx of [-1,1])box(.218,.018,.018,steelLight,ix+sx*.131,1.924,iz);
  const bagX=ix+.22, tubeW=(bx-1.0-bagX)-.022;
  cyl(.01,.11,steelLight,bagX,1.86,iz,8);
  rounded(.17,.27,.075,bone,bagX,1.67,iz,.02);
  box(.13,.16,.01,std({color:0x91aaa0,roughness:.5}),bagX,1.64,iz+.0425);
  box(.028,.04,.028,bone,bagX,1.515,iz);
  cyl(.008,.585,rubber,bagX,1.2025,iz,8);
  box(.022,.022,.022,rubber,bagX,.899,iz);
  box(tubeW,.014,.014,rubber,(bagX+bx-1.0)/2,.899,iz);
  box(.022,.022,.022,rubber,bx-1.0,.899,iz);
  box(.014,.014,.258,rubber,bx-1.0,.899,(iz+bz-.38)/2);
  box(.022,.022,.022,rubber,bx-1.0,.899,bz-.38);
  cyl(.008,.196,rubber,bx-1.0,.79,bz-.38,8);
  box(.04,.012,.04,bone,bx-1.0,.686,bz-.38);
  // Closed flat-bottom oxygen bottle with hollow bands, valve, gauge and supply hose (on y = 0.020 m mat).
  const ox=bx-1.49,oz=bz+.8;
  const bottle=add(new T.LatheGeometry([
    new T.Vector2(0,0),new T.Vector2(.115,0),new T.Vector2(.14,.035),
    new T.Vector2(.14,.6),new T.Vector2(.11,.72),new T.Vector2(.038,.79),new T.Vector2(0,.79)
  ],16),olive,ox,.02,oz);
  bottle.castShadow=true;
  for(const y of [.18,.54])bandRing(.14,.148,.045,dark,ox,y,oz,16);
  cyl(.035,.03,steelLight,ox,.825,oz);
  box(.056,.05,.056,steelLight,ox,.865,oz);
  cyl(.03,.02,steelLight,ox,.9,oz);
  box(.18,.026,.07,steel,ox,.923,oz);
  const gStem=cyl(.014,.039,steel,ox+.0475,.865,oz,8);gStem.rotation.z=Math.PI/2;
  const gauge=cyl(.048,.028,bone,ox+.115,.865,oz);gauge.rotation.x=Math.PI/2;
  box(.024,.02,.362,rubber,ox,.865,oz-.209);
  box(.242,.02,.02,rubber,ox+.133,.865,bz+.42);
  if(labels.medical) {
    box(.76,.14,.014,dark,cx,1.0,cz+.422);
    sign(labels.medical,.74,.13,cx,1.0,cz+.4293,0,{bg:'#25312b',color:'#d2cfb2',size:110});
  }
  return { gateLeaves, gateFrame, gateLamp: amber };
}
