// GP-168: static Training props. Everything uses the room's ownership/bake path.
// Dimensions are metres; no lights, timers, physics or gameplay state here.
export function dressTrainingProps(T, { B, gate, bedAt, box, add, std, texture, sign, steel, steelLight, hazard, lampMat, labels = {} }) {
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
    const r = Math.min(radius, w/4, h/4), X = w/2, Y = h/2, s = new T.Shape();
    s.moveTo(-X+r,-Y); s.lineTo(X-r,-Y); s.quadraticCurveTo(X,-Y,X,-Y+r);
    s.lineTo(X,Y-r); s.quadraticCurveTo(X,Y,X-r,Y); s.lineTo(-X+r,Y);
    s.quadraticCurveTo(-X,Y,-X,Y-r); s.lineTo(-X,-Y+r); s.quadraticCurveTo(-X,-Y,-X+r,-Y);
    const bevel = Math.min(.012,d/4);
    const geo = new T.ExtrudeGeometry(s,{depth:d-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1,curveSegments:3});
    geo.translate(0,0,-d/2+bevel); const m=add(geo,mat,x,y,z);m.castShadow=true;m.receiveShadow=true;return m;
  };
  const bolt = (x,y,z,r=.035) => { const b=cyl(r,.025,steelLight,x,y,z,6); b.rotation.x=Math.PI/2; };
  const cross = (x,y,z,size=.35) => {
    box(size,size*.24,.025,red,x,y,z); box(size*.24,size,.025,red,x,y,z);
  };

  // A broad sealed containment gate: twin ribbed leaves, central latch, guides,
  // hydraulic gear and a grated approach. Front faces point into the room (-z).
  const gx=gate.x, gz=B.maxZ-.02;
  box(8.0,5.36,.13,dark,gx,2.68,gz-.08);
  box(6.62,4.45,.16,rubber,gx,2.28,gz-.19);
  for (const side of [-1,1]) {
    const px=gx+side*1.65;
    rounded(3.22,4.3,.18,olive,px,2.24,gz-.34,.12);
    box(.13,4.34,.08,steel,px+side*1.48,2.24,gz-.47);
    for (const y of [.55,1.55,2.55,3.55]) {
      box(2.96,.16,.12,steel,px,y,gz-.5);
      for (const dx of [-1.33,1.33]) bolt(px+dx,y,gz-.575);
    }
    const brace=box(.14,3.4,.07,dark,px,2.2,gz-.53); brace.rotation.z=side*.63;
    box(.43,4.72,.48,steel,gx+side*3.53,2.36,gz-.32);
    box(.18,4.37,.2,steelLight,gx+side*3.28,2.24,gz-.59);
    box(.13,4.64,.1,hazard,gx+side*3.54,2.36,gz-.61);
    for (const y of [.4,1.4,2.4,3.4,4.4]) bolt(gx+side*3.67,y,gz-.59,.046);
    // Guide roller, actuator rod and motor housing.
    cyl(.09,1.42,steelLight,gx+side*3.87,2.15,gz-.3);
    cyl(.18,.82,dark,gx+side*3.87,1.17,gz-.3);
    box(.58,.42,.65,olive,gx+side*3.68,4.88,gz-.34);
    const roller=cyl(.18,.25,rubber,gx+side*3.1,4.6,gz-.49);roller.rotation.x=Math.PI/2;
    // Caged warning beacons, using an emissive surface rather than extra lights.
    box(.5,.56,.22,dark,gx+side*3.07,5.03,gz-.28);
    rounded(.3,.32,.13,amber,gx+side*3.07,5.03,gz-.45,.06);
    for (const dx of [-.13,0,.13]) box(.025,.4,.055,steel,gx+side*3.07+dx,5.03,gz-.55);
    for (const y of [4.85,5.21]) box(.4,.025,.055,steel,gx+side*3.07,y,gz-.55);
    for(let i=0;i<7;i++)box(.92,.045,.055,rubber,px,3.92+i*.046,gz-.46);
  }
  box(7.58,.32,.57,steel,gx,4.68,gz-.3);
  box(6.7,.1,.62,hazard,gx,4.51,gz-.39);
  box(.17,4.28,.16,dark,gx,2.24,gz-.56);
  box(.5,.54,.18,steel,gx,2.1,gz-.6);
  for(const y of [1.87,2.33])box(1.12,.07,.13,steelLight,gx,y,gz-.66);
  bolt(gx,2.1,gz-.72,.09);
  box(7.9,.045,1.14,steel,gx,.028,gz-.58);
  for(let i=-19;i<=19;i++)box(.055,.018,1.02,rubber,gx+i*.195,.06,gz-.58);
  box(7.9,.05,.16,hazard,gx,.065,gz-1.06);
  rod([gx-3.87,.6,gz-.28],[gx-3.87,.6,gz-.78],.025,dark);
  if(labels.gate)sign(labels.gate,4.1,.54,gx,5.02,gz-.66,Math.PI,{bg:'#1e2923',color:'#ddd6b1',size:150});
  if(labels.containment)sign(labels.containment,3.1,.21,gx,3.62,gz-.78,Math.PI,{bg:'#27352b',color:'#c7c9ae',size:115});

  // A fitted field medical bay along the back wall. Olive, charcoal and canvas
  // echo the FOB's equipment; a pale floor inset keeps its working area readable.
  const bx=bedAt.x,bz=bedAt.z,back=B.minZ+.08;
  box(7.5,.012,4.1,dark,bx+.8,.016,back+2.05);
  box(7.25,.008,3.87,std({color:0x929a85,roughness:.96}),bx+.8,.026,back+2.05);
  box(7.5,2.75,.075,dark,bx+.8,1.39,back+.02);
  for(let i=0;i<4;i++)box(1.8,2.44,.035,olive,bx-1.95+i*1.83,1.43,back+.075);
  for(const x of [bx-2.96,bx+4.56])box(.08,2.8,.08,steel,x,1.4,back+.1);
  box(7.5,.17,.26,steel,bx+.8,2.85,back+.17);
  box(6.8,.045,.12,lampMat,bx+.8,2.76,back+.27);
  // Short return panel closes the corner visually without enclosing the bay.
  box(.09,2.76,3.75,dark,B.minX+.23,1.38,back+1.9);
  box(.025,2.45,3.4,olive,B.minX+.29,1.43,back+1.9);
  if(labels.infirmary)sign(labels.infirmary,3.6,.48,bx-.2,2.34,back+.11,0,{bg:'#25312b',color:'#ddd6b1',size:140});
  cross(bx-2.58,2.3,back+.13,.49);
  // Reinforced wheeled stretcher, segmented pad, canvas blanket and stitched hem.
  rounded(2.48,.14,1.04,dark,bx,.49,bz,.055);
  for(const dz of [-.48,.48])rod([bx-1.18,.47,bz+dz],[bx+1.18,.47,bz+dz],.046,steelLight);
  for(const dx of [-.93,.93])for(const dz of [-.39,.39]) {
    rod([bx+dx,.16,bz+dz],[bx+dx,.45,bz+dz],.042,steel);
    const wheel=cyl(.095,.055,rubber,bx+dx,.105,bz+dz);wheel.rotation.x=Math.PI/2;
    const hub=cyl(.033,.06,steelLight,bx+dx,.105,bz+dz);hub.rotation.x=Math.PI/2;
    box(.13,.09,.06,steel,bx+dx,.23,bz+dz);
  }
  for(const dx of [-.75,.75])box(.05,.07,.78,steel,bx+dx,.28,bz);
  rod([bx-.93,.18,bz-.36],[bx+.93,.43,bz-.36],.026,steelLight);
  rod([bx+.93,.18,bz+.36],[bx-.93,.43,bz+.36],.026,steelLight);
  rounded(2.36,.16,.94,canvas,bx,.6,bz,.055);
  for(const dx of [-.58,.26])box(.014,.012,.89,dark,bx+dx,.686,bz);
  rounded(.48,.08,.65,bone,bx-.88,.716,bz,.035);
  rounded(1.31,.025,.92,canvas,bx+.34,.703,bz,.012);
  for(const dz of [-.454,.454])box(1.22,.075,.016,canvas,bx+.34,.678,bz+dz);
  for(let i=0;i<9;i++)box(.85,.006,.006,bone,bx+.33,.72,bz-.36+i*.09);
  // Tubular ends and a low side rail; the wake-up side remains clear.
  for(const dx of [-1.18,1.18]) {
    for(const dz of [-.44,.44])rod([bx+dx,.47,bz+dz],[bx+dx,.88,bz+dz],.029,steelLight);
    rod([bx+dx,.88,bz-.44],[bx+dx,.88,bz+.44],.029,steelLight);
  }
  for(const dx of [-.83,.83])rod([bx+dx,.48,bz-.5],[bx+dx,.79,bz-.5],.025,steel);
  rod([bx-.83,.79,bz-.5],[bx+.83,.79,bz-.5],.03,steelLight);
  // Under-bed supplies, fastening straps and folded dressings.
  rounded(.74,.21,.47,olive,bx+.2,.23,bz,.035);
  for(const dx of [-.05,.4])box(.055,.012,.49,dark,bx+dx,.343,bz);
  cross(bx+.18,.236,bz+.247,.13);

  // Lockable medical cabinet and worktop to the foot of the bed.
  const cx=bx+2.72,cz=back+.64;
  rounded(1.65,1.08,.83,olive,cx,.56,cz,.035);
  box(1.78,.075,.94,steelLight,cx,1.13,cz);
  for(const y of [.24,.56,.87]) {
    box(1.52,.25,.024,dark,cx,y,cz+.428);
    box(1.43,.19,.025,olive,cx,y,cz+.451);
    rod([cx-.25,y+.02,cz+.48],[cx+.25,y+.02,cz+.48],.018,steelLight);
  }
  for(const dx of [-.66,.66])box(.07,.12,.07,steel,cx+dx,.06,cz+.3);
  rounded(.49,.24,.35,bone,cx-.43,1.3,cz+.05,.025);cross(cx-.43,1.3,cz+.238,.15);
  for(let i=0;i<3;i++)rounded(.26,.07,.23,bone,cx-.1,1.21+i*.078,cz-.18,.016);
  // Portable monitor with a baked waveform display (no animated extra draw).
  const screen=texture(384,256,c=>{
    c.fillStyle='#081a14';c.fillRect(0,0,384,256);c.strokeStyle='#a8d2ad';c.lineWidth=4;
    c.beginPath();c.moveTo(15,114);c.lineTo(111,114);c.lineTo(128,104);c.lineTo(146,142);c.lineTo(160,62);c.lineTo(180,122);c.lineTo(201,114);c.lineTo(370,114);c.stroke();
    c.fillStyle='#709c7d';for(let i=0;i<12;i++)c.fillRect(18+i*29,192,19,10);
  });
  const screenMat=std({map:screen,color:0xffffff,emissiveMap:screen,emissive:0xffffff,emissiveIntensity:.35,roughness:.48});
  rounded(.59,.47,.25,dark,cx+.48,1.42,cz-.08,.04);
  box(.47,.3,.013,screenMat,cx+.48,1.46,cz+.052);
  for(const dx of [-.17,0,.17])cyl(.026,.024,bone,cx+.48+dx,1.25,cz+.047).rotation.x=Math.PI/2;
  box(.38,.055,.25,steel,cx+.48,1.18,cz-.08);
  // Wall supply case, visible hinges and an olive medical bag.
  rounded(1.55,.7,.3,olive,cx,2.16,back+.23,.03);
  for(const dx of [-.35,.35])box(.62,.57,.025,dark,cx+dx,2.16,back+.394);
  cross(cx-.35,2.16,back+.414,.28);
  for(const dx of [-.59,.59])for(const y of [1.96,2.36])box(.05,.1,.05,steelLight,cx+dx,y,back+.424);
  // IV stand, hooked top, bag seams and an opaque fluid insert; tube is segmented.
  const ix=bx-1.42,iz=bz-.66;
  cyl(.021,1.82,steelLight,ix,.99,iz);
  for(let k=0;k<4;k++){const a=k*Math.PI/2;rod([ix,.12,iz],[ix+Math.cos(a)*.27,.055,iz+Math.sin(a)*.27],.018,steel);}
  rod([ix-.26,1.91,iz],[ix+.26,1.91,iz],.021,steelLight);
  rod([ix-.23,1.91,iz],[ix-.23,1.84,iz],.015,steelLight);
  rounded(.17,.27,.075,bone,ix-.23,1.67,iz,.02);
  box(.13,.16,.012,std({color:0x91aaa0,roughness:.5}),ix-.23,1.63,iz+.044);
  rod([ix-.23,1.52,iz],[ix-.25,.92,iz+.12],.008,rubber);
  rod([ix-.25,.92,iz+.12],[bx-.87,.74,bz-.37],.008,rubber);
  // Oxygen bottle with straps, valve and pressure gauge, tucked at the head.
  const ox=bx-1.49,oz=bz+.8;
  const bottle=add(new T.LatheGeometry([new T.Vector2(.05,0),new T.Vector2(.13,.05),new T.Vector2(.14,.62),new T.Vector2(.11,.73),new T.Vector2(.04,.79)],16),olive,ox,.07,oz);
  bottle.castShadow=true;
  cyl(.035,.1,steelLight,ox,.91,oz);box(.18,.026,.07,steel,ox,.975,oz);
  for(const y of [.25,.66])cyl(.15,.045,dark,ox,y,oz);
  const gauge=cyl(.06,.028,bone,ox+.1,.89,oz+.02);gauge.rotation.x=Math.PI/2;
  rod([ox,.92,oz],[ox+.28,.88,oz],.012,rubber);
  if(labels.medical)sign(labels.medical,.74,.18,cx,1.02,cz+.477,0,{bg:'#25312b',color:'#d2cfb2',size:110});
}
