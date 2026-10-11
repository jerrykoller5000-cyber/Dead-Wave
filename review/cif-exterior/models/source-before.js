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
  // Three hanging field shirts: real shoulders, sleeves, collars and pockets.
  for(let i=0;i<3;i++){
    const x=(i-1)*.47,m=cloth[i];
    box(.018,.12,.018,edge,x,2.28,.28);
    for(const s of [-1,1])box(.20,.015,.022,edge,x+s*.082,2.20,.28,s*-.30);
    box(.29,.48,.065,m,x,1.945,.29);
    for(const s of [-1,1]){
      box(.105,.255,.065,m,x+s*.18,2.045,.29,s*.27);
      box(.083,.096,.017,m,x+s*.076,2.00,.334);
      box(.09,.015,.020,edge,x+s*.076,2.047,.343);
      box(.075,.045,.025,dark,x+s*.033,2.178,.336,s*-.45);
    }
    box(.013,.36,.010,dark,x,1.95,.329);
  }
  // Lower shelf: folded fatigues on the left and a matched pair of boots.
  box(1.60,.045,.30,steel,0,1.40,.30);
  for(let i=0;i<3;i++){
    box(.55,.065,.24,cloth[i],-.37,1.46+i*.067,.29);
    box(.53,.010,.015,edge,-.37,1.45+i*.067,.417);
  }
  for(const x of [.30,.56]){
    box(.18,.27,.15,rubber,x,1.56,.27);
    box(.185,.11,.29,rubber,x,1.48,.35);
    box(.19,.035,.30,dark,x,1.432,.35);
    for(let i=0;i<3;i++)box(.085,.013,.014,edge,x,1.53+i*.045,.351);
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
