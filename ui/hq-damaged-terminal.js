// GP-104: cosmetic damaged terminal. No text, interaction, RNG, physics or damage.
export function buildDamagedTerminal(T,doc=document) {
  const group=new T.Group();group.name='hq-damaged-terminal';
  const steel=new T.MeshStandardMaterial({color:0x424c49,metalness:.55,roughness:.79});
  const edge=new T.MeshStandardMaterial({color:0x778078,metalness:.6,roughness:.65});
  const dark=new T.MeshStandardMaterial({color:0x090e0e,roughness:.95});
  const board=new T.MeshStandardMaterial({color:0x233c2f,roughness:.9});
  const copper=new T.MeshStandardMaterial({color:0x866041,metalness:.5,roughness:.7});
  const box=(w,h,d,m,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
  box(1.83,1.50,.25,dark,0,0,0);
  box(1.72,1.38,.13,steel,0,0,.10);
  box(1.53,1.13,.045,dark,0,.035,.19);
  box(1.30,.87,.025,board,0,.08,.222);
  for(let i=0;i<6;i++)box(.06,.5-(i%3)*.07,.016,copper,-.53+i*.20,.1,.243);
  for(const [x,y] of [[-.39,.12],[.06,.30],[.41,-.08]])box(.18,.12,.035,dark,x,y,.257);
  // Surviving glass surrounds a jagged hole; all cracks are baked into one transparent texture.
  const cv=doc.createElement('canvas');cv.width=768;cv.height=512;const ctx=cv.getContext('2d');
  if(ctx){
    ctx.fillStyle='#13292d';ctx.fillRect(0,0,768,512);
    for(let y=13;y<512;y+=12){ctx.fillStyle='#42606238';ctx.fillRect(0,y,768,2);}
    const hole=[[330,114],[389,151],[483,131],[450,225],[563,294],[445,313],[465,396],[347,355],[279,426],[266,313],[188,284],[290,229]];
    ctx.globalCompositeOperation='destination-out';ctx.beginPath();hole.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.globalCompositeOperation='source-over';
    const cracks=[[[330,114],[283,59],[312,0]],[[483,131],[612,75],[768,54]],[[450,225],[637,210],[768,239]],[[563,294],[643,393],[727,512]],[[279,426],[175,443],[150,512]],[[188,284],[106,207],[0,178]],[[290,229],[136,104],[85,0]],[[465,396],[524,444],[558,512]]];
    ctx.lineWidth=5;ctx.strokeStyle='#020808';for(const points of cracks){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
    ctx.lineWidth=2;ctx.strokeStyle='#96bfc6a0';for(const points of cracks){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x+3,y+1):ctx.moveTo(x+3,y+1));ctx.stroke();}
    for(let i=0;i<75;i++){ctx.fillStyle='#00090944';ctx.fillRect((i*137)%768,(i*67)%512,3+i%11,2);}
  }
  const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
  const glass=new T.Mesh(new T.PlaneGeometry(1.42,.95),new T.MeshStandardMaterial({map:tex,transparent:true,alphaTest:.1,roughness:.3,metalness:.15,emissiveMap:tex,emissive:0x71aab4,emissiveIntensity:.24}));
  glass.name='hq-damaged-screen';glass.position.set(0,.075,.29);glass.rotation.z=-.065;group.add(glass);
  const top=box(1.62,.10,.16,edge,0,.64,.25);top.rotation.z=-.055;
  box(.12,1.16,.16,steel,-.82,.03,.23);
  const bent=box(.12,.86,.12,edge,.81,.18,.33);bent.rotation.y=-.5;bent.rotation.z=-.16;
  const loose=box(.74,.15,.09,steel,.41,-.62,.32);loose.rotation.z=-.19;loose.rotation.x=.26;
  for(const x of [-.76,.76])for(const y of [-.64,.65]){
    const bolt=new T.Mesh(new T.CylinderGeometry(.032,.032,.025,6),dark);bolt.rotation.x=Math.PI/2;bolt.position.set(x,y,.26);group.add(bolt);
  }
  // Fixed bent cable runs, including an exposed break at the spark origin.
  for(const [points,color] of [
    [[[-.28,-.23,.30],[-.35,-.55,.37],[-.24,-.91,.36],[-.04,-1.0,.34],[.01,-.85,.37]],0x512a22],
    [[[.24,-.18,.30],[.28,-.48,.37],[.17,-.75,.42],[.32,-.90,.36]],0x2a3335],
    [[[-.04,.01,.30],[.09,-.13,.34],[.30,-.20,.36],[.40,-.33,.40]],0x8e713f]
  ]) {
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    group.add(new T.Mesh(new T.TubeGeometry(curve,10,.013,5,false),new T.MeshStandardMaterial({color,roughness:.8})));
  }
  const positions=new Float32Array(8*6),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  const sparkMat=new T.LineBasicMaterial({color:0xbcefff,transparent:true,opacity:1,depthWrite:false,toneMapped:false});
  const sparks=new T.LineSegments(geometry,sparkMat);sparks.frustumCulled=false;sparks.visible=false;group.add(sparks);
  const flash=new T.Mesh(new T.SphereGeometry(.035,6,4),new T.MeshBasicMaterial({color:0xd9f6ff,toneMapped:false}));flash.position.set(.4,-.33,.41);flash.visible=false;group.add(flash);
  function update(time) {
    const cycle=((time%4.6)+4.6)%4.6,active=cycle<.52;
    sparks.visible=active;flash.visible=active&&cycle<.12;
    if(!active)return;
    for(let i=0;i<8;i++){
      const age=Math.max(0,cycle-i*.024),angle=i*2.399,velocity=.7+(i%3)*.30;
      const x=.4+Math.cos(angle)*age*velocity,y=-.33+Math.sin(angle)*age*.72-age*age*1.4,z=.42+age*(.36+(i%2)*.26);
      const n=i*6;positions[n]=x;positions[n+1]=y;positions[n+2]=z;
      positions[n+3]=x-Math.cos(angle)*.045;positions[n+4]=y+.027;positions[n+5]=z-.018;
    }
    sparkMat.opacity=1-cycle/.60;geometry.attributes.position.needsUpdate=true;
  }
  return {group,sparks,update};
}
