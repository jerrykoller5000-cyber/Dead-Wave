// GP-106: Jerry's fitted marine body. Uses the existing joint locations and item
// materials; animation, purchases and dressing remain owned by their callers.
const detailCache = new Map();
export function buildMarineBody(T, {root, put, rmesh: roundedMesh, cyl, part, dress, mats, pgbPatch}) {
  const patches=[];   // GB-123: the PGB patch meshes; the caller keeps them out of its merge so their UVs survive
  // Flat webbing, labels and seams do not need rounded-box subdivisions.
  const rmesh = (w,h,d,mat,r) => {
    if(Math.min(w,h,d) > .018) return roundedMesh(w,h,d,mat,r);
    const key=[w,h,d].join(',');let geo=detailCache.get(key);
    if(!geo){geo=new T.BoxGeometry(w,h,d);geo.userData.shared=true;detailCache.set(key,geo);}
    const mesh=new T.Mesh(geo,mat);mesh.castShadow=mesh.receiveShadow=true;return mesh;
  };
  const {uniformW, trouserW, bootW, soleW, gloveW, beltW, holsterW,
    carrierW, carrierPouchW, packW, packTrimW, padW, plateW, skinW,
    strapMat, buckleMat, padMat, camoOD, pouchMat, leatherMat, patchMat,
    patchInk, webMat, nvgMat, laceMat, sockMat} = mats;
  // A soft rectangular cross-section, lofted as one surface rather than stacked
  // boxes. The radius through a joint overlaps the adjacent limb as it bends.
  function form(rings, mat, name = '', n = 12) {
    const p=[], uv=[], ix=[];
    for(let r=0;r<rings.length;r++) {
      const [y,rx,rz,cx=0,cz=0]=rings[r];
      for(let j=0;j<=n;j++) {
        const a=j/n*Math.PI*2,s=Math.sin(a),c=Math.cos(a);
        p.push(cx+rx*Math.sign(s)*Math.abs(s)**.7,y,cz+rz*Math.sign(c)*Math.abs(c)**.7);
        uv.push(j/n,y*3);
      }
    }
    for(let r=0;r<rings.length-1;r++)for(let j=0;j<n;j++) {
      const a=r*(n+1)+j,b=a+n+1;ix.push(a,a+1,b,a+1,b+1,b);
    }
    // The lowest/highest rings close inside neighbouring clothing/joints.
    for(const [row,reverse] of [[0,true],[rings.length-1,false]]) {
      const ring=rings[row],center=p.length/3;p.push(ring[3]||0,ring[0],ring[4]||0);uv.push(.5,.5);
      for(let j=0;j<n;j++) {const a=row*(n+1)+j;ix.push(center,...(reverse?[a+1,a]:[a,a+1]));}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));
    geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();
    const mesh=new T.Mesh(geo,mat);mesh.castShadow=mesh.receiveShadow=true;mesh.name=name;return mesh;
  }
  function plate(w,h,d,mat) {
    const s=new T.Shape(),cut=w*.18;
    s.moveTo(-w/2,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h/2-cut);
    s.lineTo(w/2-cut,h/2);s.lineTo(-w/2+cut,h/2);s.lineTo(-w/2,h/2-cut);s.closePath();
    const geo=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.008,bevelThickness:.005});
    geo.translate(0,0,-d/2);const mesh=new T.Mesh(geo,mat);mesh.castShadow=mesh.receiveShadow=true;return mesh;
  }
  const lowerBody=new T.Group();root.add(lowerBody);
  const hip=form([[-.085,.12,.084,0,.008],[-.035,.165,.12,0,-.008],[.025,.183,.124,0,-.006],[.1,.172,.111]],trouserW,'fitted-pelvis');
  hip.position.y=.62;lowerBody.add(hip);
  put(lowerBody,form([[-.025,.185,.124],[.025,.18,.12]],beltW),0,.721,0);
  put(lowerBody,rmesh(.062,.037,.015,buckleMat,.005),0,.721,.126);
  for(const side of [-1,1]) {
    put(lowerBody,rmesh(.082,.112,.038,beltW,.012),side*.125,.647,.135);
    put(lowerBody,rmesh(.026,.055,.018,strapMat,.005),side*.161,.717,.082);
  }
  put(lowerBody,rmesh(.125,.1,.047,beltW,.018),.08,.64,-.137);
  put(lowerBody,rmesh(.035,.026,.155,strapMat,.008),-.185,.63,0);
  put(lowerBody,rmesh(.045,.145,.082,holsterW,.014),-.216,.526,.015,0,0,.08);
  const hipGrip=put(lowerBody,rmesh(.032,.043,.038,leatherMat,.01),-.218,.602,.037);
  const gearParts={helmet:[],vest:[],pads:[],nvg:[],bareHead:[],bareTorso:[]};
  const addGear=(key,parent,mesh,...args)=>{put(parent,mesh,...args);gearParts[key].push(mesh);return mesh;};
  function leg(side) {
    const legG=new T.Group();legG.position.set(side*.13,.62,0);lowerBody.add(legG);
    // GP-123: the quadriceps swell above the knee, while the inner thigh narrows.
    put(legG,form([[-.30,.064,.066],[-.255,.07,.074,0,.008],[-.19,.083,.094,side*.003,.01],[-.10,.094,.104,side*.006,.006],[-.025,.099,.108],[.055,.085,.096]],trouserW),0,0,.007);
    put(legG,rmesh(.021,.126,.112,trouserW,.009),side*.094,-.145,.004);
    put(legG,rmesh(.025,.025,.116,trouserW,.008),side*.096,-.09,.006);
    // One restrained fold at the pocket and knee, not a separate thigh block.
    put(legG,rmesh(.126,.013,.012,trouserW,.005),0,-.207,.089,0,0,side*.08);
    const knee=new T.Group();knee.position.set(0,-.27,0);legG.add(knee);
    const shinLong=part(knee,dress.legLong),shinBare=part(knee,dress.legShort),hem=part(legG,dress.legShort);
    // Calf volume sits high and behind the shin, tapering into the boot shaft.
    put(shinLong,form([[-.225,.059,.061],[-.17,.062,.07,0,-.005],[-.105,.075,.087,side*.003,-.014],[-.055,.078,.087,side*.002,-.009],[.006,.071,.075,0,.005],[.045,.058,.061]],trouserW),0,0,.012);
    put(shinLong,rmesh(.127,.024,.138,trouserW,.011),0,-.21,.007);
    put(shinBare,form([[-.2,.043,.048],[-.155,.046,.055,0,-.004],[-.095,.061,.076,side*.004,-.014],[-.05,.064,.074,side*.003,-.01],[.004,.055,.06,0,.006],[.028,.049,.05]],skinW),0,0,.008);
    put(shinBare,rmesh(.115,.055,.127,sockMat,.02),0,-.188,.007);
    put(hem,rmesh(.167,.033,.186,trouserW,.012),0,-.242,.007);
    addGear('pads',knee,plate(.126,.118,.031,plateW),0,-.009,.096);
    addGear('pads',knee,rmesh(.068,.047,.015,padW,.008),0,-.012,.12);
    addGear('pads',knee,rmesh(.162,.024,.171,strapMat,.009),0,-.065,.01);
    const ankle=new T.Group();ankle.position.set(0,-.25,.01);knee.add(ankle);
    put(ankle,form([[-.055,.067,.086],[.015,.066,.073],[.082,.063,.067]],bootW),0,0,-.006);
    // A continuous heel/instep/toe upper, instead of two overlapping toe blocks.
    const foot=form([[-.096,.049,.026,0,.054],[-.055,.066,.037,0,.049],[.005,.07,.06,0,.033],[.073,.072,.044,0,.045],[.135,.065,.032,0,.057],[.166,.038,.015,0,.068]],bootW,'shaped-boot-upper');
    foot.rotation.x=Math.PI/2;ankle.add(foot);
    put(ankle,rmesh(.158,.025,.276,soleW,.009),0,-.091,.036);
    put(ankle,rmesh(.131,.025,.07,soleW,.008),0,-.081,-.072);
    put(ankle,rmesh(.077,.099,.013,bootW,.006),0,.022,.071,-.16);
    for(let k=0;k<4;k++)put(ankle,rmesh(.07,.007,.008,laceMat,.003),0,.055-k*.022,.079+k*.004,-.16);
    legG.userData.knee=knee;legG.userData.ankle=ankle;return legG;
  }
  const legLG=leg(-1),legRG=leg(1);
  const torsoG=new T.Group();torsoG.position.y=.7;root.add(torsoG);
  const at=(mesh,x,y,z)=>put(torsoG,mesh,x,y-.7,z);
  at(form([[.015,.168,.109],[.12,.178,.115],[.24,.207,.128,0,.003],[.345,.246,.135,0,.002],[.405,.257,.124],[.46,.198,.098],[.51,.092,.079]],uniformW,'fitted-uniform'),0,.7,0);
  // GP-124: the shirt's shoulder stays with the chest and overlaps the moving
  // sleeve. This closes the notch beside the neck without enlarging the arm cap.
  for(const side of [-1,1]) {
    at(form([[-.07,.055,.075,side*.005],[-.02,.076,.089,side*.01],
      [.025,.062,.071,-side*.015],[.055,.029,.047,-side*.05]],uniformW,'shirt-shoulder'),side*.225,1.125,.012);
  }
  // Collar is a low folded opening rather than a high bucket around the neck.
  at(cyl(.079,.103,.052,uniformW,12),0,1.209,0);
  for(const side of [-1,1]) {
    const lap=at(rmesh(.072,.053,.018,uniformW,.007),side*.055,1.18,.081);lap.rotation.z=side*.36;
    at(rmesh(.122,.092,.014,uniformW,.007),side*.106,1.011,.129);
    at(rmesh(.126,.024,.018,uniformW,.006),side*.106,1.055,.132);
  }
  at(rmesh(.009,.33,.006,strapMat,.002),0,.945,.128);
  at(rmesh(.13,.025,.009,patchMat,.003),.116,1.105,.13);
  at(rmesh(.081,.009,.006,patchInk,.002),.116,1.105,.136);
  const b=(mesh,x,y,z)=>addGear('bareTorso',torsoG,mesh,x,y-.7,z);
  for(const side of [-1,1]) {
    b(rmesh(.036,.29,.02,strapMat,.007),side*.139,1.00,.139);
    b(rmesh(.036,.31,.02,strapMat,.007),side*.139,1.01,-.134);
    b(rmesh(.042,.023,.256,strapMat,.008),side*.14,1.164,0);
    b(rmesh(.091,.094,.04,pouchMat,.012),side*.108,.882,.16);
    b(rmesh(.094,.023,.042,strapMat,.007),side*.108,.921,.161);
  }
  b(rmesh(.28,.031,.019,strapMat,.007),0,.852,.138);
  b(rmesh(.033,.029,.016,buckleMat,.005),0,.852,.153);
  b(rmesh(.277,.03,.02,strapMat,.006),0,1.11,-.139);
  const v=(mesh,x,y,z)=>addGear('vest',torsoG,mesh,x,y-.7,z);
  v(plate(.35,.335,.034,carrierW),0,.973,.151);
  v(plate(.35,.345,.032,carrierW),0,.98,-.149);
  for(const side of [-1,1]) {
    v(rmesh(.026,.135,.239,carrierW,.01),side*.191,.88,0);
    v(rmesh(.059,.025,.278,carrierW,.011),side*.132,1.151,0);
    v(rmesh(.058,.078,.025,carrierW,.009),side*.132,1.111,.137);
    v(rmesh(.036,.026,.017,buckleMat,.005),side*.132,1.123,.155);
  }
  for(let row=0;row<3;row++)v(rmesh(.312,.011,.008,webMat,.003),0,.842+row*.052,.174);
  for(let i=-1;i<=1;i++) {
    v(rmesh(.086,.122,.041,carrierPouchW,.012),i*.098,.914,.191);
    v(rmesh(.082,.024,.045,webMat,.007),i*.098,.97,.191);
    v(rmesh(.009,.058,.005,strapMat,.002),i*.098,.96,.217);
  }
  v(rmesh(.114,.055,.022,carrierPouchW,.008),.043,1.067,.18);
  v(rmesh(.113,.011,.023,webMat,.003),.043,1.09,.182);
  v(rmesh(.06,.112,.032,nvgMat,.009),-.158,1.055,.19);
  const antenna=v(cyl(.0035,.0035,.17,nvgMat,5),-.158,1.185,.19);antenna.rotation.z=.1;
  v(rmesh(.092,.025,.019,webMat,.006),0,1.138,-.179);
  const patchRed=new T.MeshStandardMaterial({color:0xb03030,roughness:.9});
  for(const [fn,z] of [[at,.132],[v,.178]]) {
    fn(rmesh(.083,.047,.009,patchMat,.003),-.084,1.092,z);
    fn(rmesh(.029,.024,.006,patchInk,.002),-.108,1.1,z+.007);
    fn(rmesh(.045,.009,.006,patchRed,.002),-.073,1.081,z+.007);
  }
  // Lower-profile pack hugs the back plate; shoulder webbing follows the top.
  at(rmesh(.266,.295,.119,packW,.033),0,.992,-.227);
  at(rmesh(.252,.062,.123,packTrimW,.02),0,1.131,-.229);
  at(rmesh(.182,.098,.031,packTrimW,.014),0,.96,-.296);
  for(const side of [-1,1]) {
    at(rmesh(.024,.116,.007,strapMat,.003),side*.08,1.083,-.292);
    at(rmesh(.027,.024,.009,buckleMat,.004),side*.08,1.033,-.298);
    at(rmesh(.049,.03,.257,packW,.01),side*.156,1.157,-.013);
  }
  at(rmesh(.052,.152,.069,packTrimW,.018),.156,.995,-.224);
  const bed=at(cyl(.046,.046,.253,packTrimW,12),0,.811,-.221);bed.rotation.z=Math.PI/2;
  for(const side of [-1,1]){const band=at(cyl(.049,.049,.016,strapMat,12),side*.082,.811,-.221);band.rotation.z=Math.PI/2;}
  function arm(side) {
    const armG=new T.Group();armG.position.set(side*.34,1.08-.7,.02);torsoG.add(armG);
    // Smaller, inward-sloping deltoid around the unchanged animation pivot.
    put(armG,form([[-.302,.055,.057],[-.25,.06,.064],[-.175,.062,.068,-side*.008,.002],[-.09,.068,.073,-side*.022],[-.01,.075,.078,-side*.027,-.003],[.045,.069,.07,-side*.042,-.004],[.071,.043,.05,-side*.061]],uniformW),0,0,0);
    put(armG,rmesh(.016,.088,.077,uniformW,.006),side*.053,-.1,0);
    // GB-123 (Jerry): the PGB unit patch on his own left shoulder (+x: he faces +z), 1 mm off the raised block,
    // facing out and reading the right way round. The right shoulder keeps its placeholder.
    if(side>0&&pgbPatch)patches.push(put(armG,pgbPatch(.062,.072),side*.062,-.1,0,0,Math.PI/2,0));
    else put(armG,rmesh(.007,.041,.051,side>0?patchMat:patchInk,.002),side*.064,-.1,0);
    addGear('pads',armG,rmesh(.116,.081,.041,padW,.017),0,-.261,-.067);
    const elbowG=new T.Group();elbowG.position.set(0,-.28,0);elbowG.rotation.set(side<0?-.35:-.2,0,0);armG.add(elbowG);
    const ox=side<0?.02:-.01,oz=side<0?.04:.03;
    const sleeve=part(elbowG,dress.sleeveDown),bare=part(elbowG,dress.sleeveRolled),roll=part(armG,dress.sleeveRolled);
    put(sleeve,form([[-.226,.046,.049,ox,oz],[-.17,.052,.057,ox,oz],[-.105,.063,.069,ox*.8,oz*.7],[-.05,.067,.071,ox*.35,oz*.3],[.005,.063,.06],[.05,.046,.046]],uniformW),0,0,0);
    put(sleeve,rmesh(.109,.025,.113,uniformW,.009),ox,-.211,oz);
    put(bare,form([[-.227,.035,.038,ox,oz],[-.17,.04,.045,ox,oz],[-.105,.053,.058,ox*.8,oz*.7],[-.055,.058,.061,ox*.35,oz*.3],[.015,.053,.049],[.041,.042,.042]],skinW),0,0,0);
    put(roll,rmesh(.153,.051,.15,uniformW,.016),0,-.248,0);
    put(roll,rmesh(.148,.013,.147,uniformW,.005),0,-.223,0);
    const gz=side<0?.08:.07;
    for(const [list,mat,guard] of [[dress.gloveOn,gloveW,true],[dress.handBare,skinW,false]]) {
      const h=part(elbowG,list);
      put(h,form([[-.038,.033,.026],[.002,.044,.033],[.023,.034,.027],[.042,.031,.026]],mat,'shaped-palm'),ox,-.253,gz-.003);
      // A sloping knuckle line and shorter little finger give the hand its shape.
      for(let finger=0;finger<4;finger++) {
        const x=ox+side*(-.031+finger*.020);
        const length=[.9,1,.94,.76][finger],width=finger===3?.88:1;
        const digit=form([[-.025,.004,.008,0,-.009],[-.012,.008,.012,0,-.003],[.009,.0085,.016],[.026,.006,.011]],mat,'',6);
        digit.scale.set(width,length,1);put(h,digit,x,-.278+(1-length)*.021,gz+.029,.18);
      }
      put(h,rmesh(.025,.046,.029,mat,.011),ox-side*.041,-.244,gz+.014,.22,0,side*.48);
      put(h,rmesh(.026,.023,.029,mat,.009),ox-side*.034,-.262,gz+.04,.2);
      if(guard)put(h,rmesh(.069,.019,.015,padMat,.006),ox,-.265,gz+.04);
    }
    if(side<0)put(elbowG,rmesh(.041,.025,.027,nvgMat,.006),ox,-.195,oz+.055);
    return {armG,elbowG};
  }
  const {armG:armLG,elbowG:elbowLG}=arm(-1),{armG:armRG,elbowG:elbowRG}=arm(1);
  armLG.rotation.set(-.85,.15,.55);armRG.rotation.set(-1.05,-.05,-.25);
  const gripL=new T.Group();gripL.position.set(.02,-.27,.13);gripL.rotation.set(1.23359,-.24103,-.08361);elbowLG.add(gripL);
  const gripR=new T.Group();gripR.position.set(-.01,-.26,.12);elbowRG.add(gripR);
  const weaponMount=new T.Group();weaponMount.position.set(.12826,.15981,-.10022);weaponMount.rotation.set(1.23359,.24103,.08361);gripR.add(weaponMount);
  return {lowerBody,hip,hipGrip,gearParts,legLG,legRG,torsoG,armLG,armRG,elbowLG,elbowRG,gripL,gripR,weaponMount,patches};
}
