// GP-106: Jerry's fitted marine body. Uses the existing joint locations and item
// materials; animation, purchases and dressing remain owned by their callers.
import {wristTransition} from '../ui/marine-kit-fit.js';
import {webbingGeometry} from '../ui/marine-webbing.js';
import {buildHandMeshes,makeHandRig} from './marine-hand.js';   // GB-152
import {liveCloth,loftRings,ringsIn,joinGeos,smooth01,weigh,geoIn} from './marine-cloth.js';   // CL-198
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
  function form(rings, mat, name = '', n = 12, caps = 'both', e = .7) {
    const p=[], uv=[], ix=[];
    for(let r=0;r<rings.length;r++) {
      const [y,rx,rz,cx=0,cz=0]=rings[r];
      for(let j=0;j<=n;j++) {
        const a=j/n*Math.PI*2,s=Math.sin(a),c=Math.cos(a);
        p.push(cx+rx*Math.sign(s)*Math.abs(s)**e,y,cz+rz*Math.sign(c)*Math.abs(c)**e);
        uv.push(j/n,y*3);
      }
    }
    for(let r=0;r<rings.length-1;r++)for(let j=0;j<n;j++) {
      const a=r*(n+1)+j,b=a+n+1;ix.push(a,a+1,b,a+1,b+1,b);
    }
    // End caps close inside the next piece of clothing. 'high' leaves the low end open
    // so a cuff can sit around a boot instead of a lid cutting through it.
    const rows=caps==='high'?[[rings.length-1,false]]:caps==='low'?[[0,true]]:[[0,true],[rings.length-1,false]];
    for(const [row,reverse] of rows) {
      const ring=rings[row],center=p.length/3;p.push(ring[3]||0,ring[0],ring[4]||0);uv.push(.5,.5);
      for(let j=0;j<n;j++) {const a=row*(n+1)+j;ix.push(center,...(reverse?[a+1,a]:[a,a+1]));}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));
    geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();weldRows(geo,n+1,rings.length);
    const mesh=new T.Mesh(geo,mat);mesh.castShadow=mesh.receiveShadow=true;mesh.name=name;return mesh;
  }
  // The first and last column of a ring loft sit on one spot: give them one shared normal (no crease down the seam).
  function weldRows(geo,cols,rows){
    const N=geo.attributes.normal;
    for(let r=0;r<rows;r++){
      const a=r*cols,b=a+cols-1,x=N.getX(a)+N.getX(b),y=N.getY(a)+N.getY(b),z=N.getZ(a)+N.getZ(b),l=Math.hypot(x,y,z)||1;
      N.setXYZ(a,x/l,y/l,z/l);N.setXYZ(b,x/l,y/l,z/l);
    }
  }
  // CL-197 (Jerry, 2026-10-15): a coarse ring table made the torso, shoulder and sleeves read as faceted slabs (12 sides,
  // a ring every 5 to 10 cm). subdiv() adds `steps` Catmull-Rom rings between every pair (all of y, rx, rz, cx and cz), so
  // the same silhouette is lofted through a smooth curve instead of straight chords.
  function subdiv(rings,steps=1){
    const R=rings.map(r=>[r[0],r[1],r[2],r[3]||0,r[4]||0]),out=[];
    const cr=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
    for(let i=0;i<R.length-1;i++){
      const p0=R[Math.max(0,i-1)],p1=R[i],p2=R[i+1],p3=R[Math.min(R.length-1,i+2)];
      out.push(p1);
      for(let k=1;k<=steps;k++){const t=k/(steps+1);out.push([0,1,2,3,4].map(c=>cr(p0[c],p1[c],p2[c],p3[c],t)));}
    }
    out.push(R[R.length-1]);return out;
  }
  function plate(w,h,d,mat) {
    // Explicit closed faces also work with the lightweight test geometry.
    // A four-ring bevel gives the small molded pads a solid face.
    const outline=[[-.5,-.36],[-.37,-.5],[.37,-.5],[.5,-.36],[.5,.29],[.29,.5],[-.29,.5],[-.5,.29]];
    const bevel=Math.min(.004,d*.22),p=[],uv=[],ix=[];
    for(const [s,z] of [[.92,-d/2],[1,-d/2+bevel],[1,d/2-bevel],[.92,d/2]])for(const[x,y]of outline){p.push(x*w*s,y*h*s,z);uv.push(x+.5,y+.5);}
    for(let r=0;r<3;r++)for(let j=0;j<8;j++){const a=r*8+j,b=r*8+(j+1)%8;ix.push(a,b,a+8,b,b+8,a+8);}
    for(const [row,reverse] of [[0,true],[3,false]]){const c=p.length/3;p.push(0,0,row===0?-d/2:d/2);uv.push(.5,.5);for(let j=0;j<8;j++){const a=row*8+j,b=row*8+(j+1)%8;ix.push(c,...(reverse?[b,a]:[a,b]));}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();
    const mesh=new T.Mesh(geo,mat);mesh.castShadow=mesh.receiveShadow=true;return mesh;
  }
  function carrierPlate(w,h,d,mat) {
    // The carry fit uses the original carrier's outer bevel as support. Unlike
    // the molded pads above, its bevel grows OUTSIDE the nominal plate shape:
    // keep that exact envelope (including square lower corners) for the slings.
    const x=w/2,y=h/2,cut=w*.18,b=.008,corner=b*(Math.SQRT2-1);
    const inner=[[-x,-y],[x,-y],[x,y-cut],[x-cut,y],[-x+cut,y],[-x,y-cut]];
    const outer=[[-x-b,-y-b],[x+b,-y-b],[x+b,y-cut+corner],[x-cut+corner,y+b],[-x+cut-corner,y+b],[-x-b,y-cut+corner]];
    const p=[],uv=[],ix=[],n=inner.length;
    for(const [edge,z] of [[inner,-d/2-.005],[outer,-d/2],[outer,d/2],[inner,d/2+.005]])for(const [px,py] of edge){p.push(px,py,z);uv.push(px/w+.5,py/h+.5);}
    for(let row=0;row<3;row++)for(let j=0;j<n;j++){const a=row*n+j,c=row*n+(j+1)%n;ix.push(a,c,a+n,c,c+n,a+n);}
    for(const [row,reverse] of [[0,true],[3,false]]){const center=p.length/3;p.push(0,0,row===0?-d/2-.005:d/2+.005);uv.push(.5,.5);for(let j=0;j<n;j++){const a=row*n+j,c=row*n+(j+1)%n;ix.push(center,...(reverse?[c,a]:[a,c]));}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();
    const mesh=new T.Mesh(geo,mat);mesh.name='fitted-carrier-shell';mesh.castShadow=mesh.receiveShadow=true;return mesh;
  }
  const seam=(parent,points,mat,r=.0016)=>{const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const m=new T.Mesh(new T.TubeGeometry(curve,Math.max(6,points.length*3),r,4,false),mat);parent.add(m);return m;};
  const strap=(points,width,mat,thickness=.008)=>{const m=new T.Mesh(webbingGeometry(T,points,width,thickness,{segments:32}),mat);m.castShadow=m.receiveShadow=true;return m;};
  // CU-98 (Jerry: "ankles become detached from boots during crouch ... sliding out of boot while standing"): a boot's
  // shaft is worn on the shin, and only its lower part bends with the foot. The pieces are built in `holder`, a group
  // posed like the ankle at rest, then baked into one mesh per material in the shin's space, each vertex weighted by its
  // height from the shin (1, at `hi` above the ankle bone and up) to the foot (0, at `lo` and down). Before each draw
  // (and each shadow draw) the weighted part follows the ankle's own turn, so the shaft creases at the ankle instead of
  // standing upright while the shin leans out of it. Nothing moves while the ankle doesn't.
  function shinShaft(holder,shin,ankle,lo,hi){
    holder.updateMatrix();const rest=holder.matrix.clone(),restInv=rest.clone().invert(),byMat=new Map();
    const v=new T.Vector3(),n=new T.Vector3(),nm=new T.Matrix3();
    for(const c of [...holder.children]){
      if(!c.isMesh||!c.geometry||!c.geometry.attributes.position)continue;
      c.updateMatrix();nm.getNormalMatrix(c.matrix);
      const g=c.geometry.index?c.geometry.toNonIndexed():c.geometry,P=g.attributes.position,N=g.attributes.normal,U=g.attributes.uv;
      let list=byMat.get(c.material);if(!list){list=[];list.names=new Set();byMat.set(c.material,list);}
      if(c.name)list.names.add(c.name);
      for(let i=0;i+2<P.count;i+=3){
        const tri=[];
        for(let k=i;k<i+3;k++){
          v.fromBufferAttribute(P,k).applyMatrix4(c.matrix);
          const s=Math.max(0,Math.min(1,(v.y-lo)/(hi-lo)));
          if(N)n.fromBufferAttribute(N,k).applyMatrix3(nm).normalize();else n.set(0,1,0);
          v.applyMatrix4(rest);
          tri.push([v.x,v.y,v.z,n.x,n.y,n.z,U?U.getX(k):0,U?U.getY(k):0,s*s*(3-2*s)]);
        }
        list.push(tri);
      }
    }
    shin.remove(holder);
    const group=new T.Group();group.name='boot-shaft';shin.add(group);
    const parts=[];
    for(const [mat,tris] of byMat){
      // The bending triangles first, so a bend uploads only that front part of each buffer.
      tris.sort((a,b)=>Math.min(a[0][8],a[1][8],a[2][8])-Math.min(b[0][8],b[1][8],b[2][8]));
      const count=tris.length*3,pos=new Float32Array(count*3),nrm=new Float32Array(count*3),uv=new Float32Array(count*2),w=new Float32Array(count);
      let soft=0;
      tris.forEach((tri,t)=>tri.forEach((q,k)=>{const i=t*3+k;pos.set(q.slice(0,3),i*3);nrm.set(q.slice(3,6),i*3);uv.set(q.slice(6,8),i*2);w[i]=q[8];if(q[8]<1)soft=t*3+3;}));
      const geo=new T.BufferGeometry();
      geo.setAttribute('position',new T.Float32BufferAttribute(pos.slice(),3));
      geo.setAttribute('normal',new T.Float32BufferAttribute(nrm.slice(),3));
      geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
      geo.computeBoundingSphere();if(geo.boundingSphere)geo.boundingSphere.radius+=.04;
      const mesh=new T.Mesh(geo,mat);mesh.name='boot-shaft';mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
      parts.push({mesh,pos,nrm,w,soft,names:[...tris.names]});
    }
    const M=new T.Matrix4(),last=new Float32Array(16).fill(NaN);
    function bend(){
      ankle.updateMatrix();
      // Under 1e-4 (a hundredth of a degree, a tenth of a millimetre) is not a change anyone can see.
      const e=ankle.matrix.elements;let same=true;
      for(let i=0;i<16;i++)if(!(Math.abs(e[i]-last[i])<1e-4)){same=false;break;}
      if(same)return;
      for(let i=0;i<16;i++)last[i]=e[i];
      M.multiplyMatrices(ankle.matrix,restInv);
      const m=M.elements;
      for(const {mesh,pos,nrm,w,soft} of parts){
        const P=mesh.geometry.attributes.position,N=mesh.geometry.attributes.normal;
        if(!P||P.count!==w.length)continue;
        const pa=P.array,na=N.array;
        for(let i=0;i<soft;i++){
          const k=w[i],j=1-k,o=i*3,x=pos[o],y=pos[o+1],z=pos[o+2],a=nrm[o],b=nrm[o+1],c=nrm[o+2];
          pa[o]=k*x+j*(m[0]*x+m[4]*y+m[8]*z+m[12]);pa[o+1]=k*y+j*(m[1]*x+m[5]*y+m[9]*z+m[13]);pa[o+2]=k*z+j*(m[2]*x+m[6]*y+m[10]*z+m[14]);
          const nx=k*a+j*(m[0]*a+m[4]*b+m[8]*c),ny=k*b+j*(m[1]*a+m[5]*b+m[9]*c),nz=k*c+j*(m[2]*a+m[6]*b+m[10]*c),l=Math.hypot(nx,ny,nz)||1;
          na[o]=nx/l;na[o+1]=ny/l;na[o+2]=nz/l;
        }
        for(const A of [P,N]){A.needsUpdate=true;if(A.clearUpdateRanges){A.clearUpdateRanges();A.addUpdateRange(0,soft*3);}}
      }
    }
    for(const {mesh} of parts){mesh.onBeforeRender=bend;mesh.onBeforeShadow=bend;}
    group.userData.bend=bend;group.userData.parts=parts;
    return group;
  }
  // CL-188's liveShoulder (the shoulder cap worn by the chest and the upper arm) is now the top of CL-198's live sleeve.
  function sole(height,mat) {
    const s=new T.Shape();s.moveTo(-.051,-.103);s.quadraticCurveTo(-.068,-.101,-.065,-.053);s.lineTo(-.059,.008);s.quadraticCurveTo(-.084,.08,-.067,.14);s.quadraticCurveTo(-.048,.185,0,.185);s.quadraticCurveTo(.048,.185,.067,.14);s.quadraticCurveTo(.084,.08,.059,.008);s.lineTo(.065,-.053);s.quadraticCurveTo(.068,-.101,.051,-.103);s.closePath();
    const edge=s.getPoints(8);edge.pop();const v=[],ix=[],n=edge.length;
    for(const h of[0,height]){v.push(0,h,.035);for(const p of edge)v.push(p.x,h+Math.max(0,p.y-.11)*.15,p.y);}
    for(let j=0;j<n;j++){const a=j+1,b=(j+1)%n+1,q=n+1;ix.push(0,b,a,q,q+a,q+b,a,b,q+a,b,q+b,q+a);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(v.length/3*2),2));geo.setIndex(ix);geo.computeVertexNormals();return new T.Mesh(geo,mat);
  }
  const lowerBody=new T.Group();root.add(lowerBody);
  // CL-197 (Jerry, 2026-10-15: "fixing the crotch area"). The pelvis ended in a flat disc between the thighs, a shelf with
  // the sky showing under it. It now narrows through a seat to a rounded crotch that the two thighs close round, as a
  // pair of trousers does, and is smoothed (more rings and sides) like the rest of the body.
  const pelvisR=[[-.138,.014,.014,0,-.004],[-.116,.052,.048,0,-.002],[-.085,.118,.088,0,.006],[-.035,.165,.12,0,-.008],[.025,.183,.124,0,-.006],[.1,.172,.111]];
  // CL-198: `hip` stays the pelvis joint the game and the survivors' kit hang things on, but what shows is the live seat
  // (after the legs, below); hip itself is only the waistband under the belt, a hair inside it.
  const hip=form(subdiv([[.02,.181,.122,0,-.006],[.1,.17,.109]],1),trouserW,'fitted-pelvis',28);
  hip.position.y=.62;lowerBody.add(hip);
  put(lowerBody,form([[-.025,.185,.124],[.025,.18,.12]],beltW),0,.721,0);
  for(const y of[.698,.744])put(lowerBody,form([[-.003,.187,.126],[.003,.187,.126]],beltW),0,y,0);
  put(lowerBody,rmesh(.064,.037,.012,buckleMat,.005),0,.721,.134);
  put(lowerBody,rmesh(.043,.022,.014,beltW,.003),0,.721,.141);
  put(lowerBody,rmesh(.006,.03,.009,buckleMat,.002),.007,.721,.151);
  for(let j=0;j<10;j++){const a=j/10*Math.PI*2,s=Math.sin(a),c=Math.cos(a);put(lowerBody,rmesh(.018,.054,.012,strapMat,.004),Math.sign(s)*Math.abs(s)**.7*.191,.721,Math.sign(c)*Math.abs(c)**.7*.132,0,a,0);}
  for(const side of [-1,1]) {
    put(lowerBody,rmesh(.082,.112,.038,beltW,.012),side*.125,.647,.135);
    put(lowerBody,plate(.079,.041,.008,beltW),side*.125,.684,.157);
    put(lowerBody,rmesh(.014,.028,.007,strapMat,.002),side*.125,.665,.164);
    put(lowerBody,rmesh(.021,.014,.008,buckleMat,.002),side*.125,.654,.164);
    put(lowerBody,rmesh(.026,.055,.018,strapMat,.005),side*.161,.717,.082);
  }
  put(lowerBody,rmesh(.125,.1,.047,beltW,.018),.08,.64,-.137);
  put(lowerBody,rmesh(.035,.026,.155,strapMat,.008),-.185,.63,0);
  // GP-19920: the carry rig supplies the hollow holster on the thigh joint.
  // The drop-leg shell hangs from the belt instead of floating beside the thigh.
  put(lowerBody,rmesh(.022,.16,.018,strapMat,.005),-.204,.622,.018,0,0,.08);
  put(lowerBody,rmesh(.055,.025,.018,buckleMat,.004),-.208,.666,.03);
  const hipGrip=put(lowerBody,rmesh(.032,.043,.038,leatherMat,.01),-.218,.602,.037);
  const gearParts={helmet:[],vest:[],pads:[],nvg:[],bareHead:[],bareTorso:[]};
  const addGear=(key,parent,mesh,...args)=>{put(parent,mesh,...args);gearParts[key].push(mesh);return mesh;};
  function leg(side) {
    const legG=new T.Group();legG.position.set(side*.13,.62,0);lowerBody.add(legG);
    // A thigh mount and retention band support the hollow carry holster.
    put(legG,rmesh(.012,.105,.082,holsterW,.004),side*.108,-.083,.035);
    put(legG,form([[-.008,.101,.113],[.008,.101,.113]],strapMat,'holster-thigh-band',16,'high'),0,-.11,.012);
    // CL-198: the trouser leg itself is worn live (after the boot, below), from inside the seat to the boot.
    put(legG,rmesh(.021,.126,.112,trouserW,.009),side*.094,-.145,.004);
    put(legG,plate(.111,.04,.009,trouserW),side*.108,-.097,.004,0,side*Math.PI/2,0);
    for(const z of[-.032,.038])put(legG,cyl(.004,.004,.004,beltW,6),side*.114,-.105,z,0,0,Math.PI/2);
    seam(legG,[[side*.09,-.055,.047],[side*.098,-.145,.061],[side*.084,-.205,.051]],trouserW);
    seam(legG,[[side*.011,.014,.114],[side*.044,-.033,.114],[side*.074,-.069,.098]],trouserW);
    // One restrained fold at the pocket and knee, not a separate thigh block.
    const knee=new T.Group();knee.position.set(0,-.27,0);legG.add(knee);
    addGear('pads',knee,plate(.151,.176,.028,padW),0,-.014,.093);
    addGear('pads',knee,plate(.126,.149,.026,plateW),0,-.012,.111);
    for(const sx of[-1,1]){
      addGear('pads',knee,rmesh(.01,.051,.01,padW,.003),sx*.054,-.014,.128,0,0,-sx*.08);
      for(const y of[-.05,.03])addGear('pads',knee,cyl(.0035,.0035,.003,buckleMat,6),sx*.05,y,.127,Math.PI/2);
      addGear('pads',knee,rmesh(.021,.037,.022,plateW,.005),sx*.076,-.063,.018);
    }
    // Each strap belongs to the limb it encircles; the upper one must not rotate into the thigh with the shin.
    addGear('pads',knee,form([[-.011,.084,.094],[.011,.083,.093]],strapMat,'calf-pad-strap',16,'high'),0,-.065,.006);
    addGear('pads',legG,form([[-.011,.084,.09],[.011,.087,.096]],strapMat,'thigh-pad-strap',16,'high'),side*.001,-.224,.018);
    const ankle=new T.Group();ankle.position.set(0,-.25,.01);knee.add(ankle);
    // CU-98: the shaft and what is sewn to it go on the shin (shinShaft, below); the foot keeps the upper and the sole.
    const shaft=new T.Group();shaft.position.copy(ankle.position);knee.add(shaft);
    put(shaft,form([[-.055,.067,.086],[-.021,.067,.079],[.022,.06,.067],[.064,.064,.067],[.082,.063,.067]],bootW,'boot-ankle',16),0,0,-.006);
    // A continuous heel/instep/toe upper, instead of two overlapping toe blocks.
    const foot=form([[-.096,.049,.026,0,.054],[-.055,.066,.037,0,.049],[.005,.07,.06,0,.033],[.073,.072,.044,0,.045],[.135,.065,.032,0,.057],[.166,.038,.015,0,.068]],bootW,'shaped-boot-upper');
    foot.rotation.x=Math.PI/2;ankle.add(foot);
    put(ankle,sole(.022,soleW),0,-.103,0);
    put(ankle,sole(.006,bootW),0,-.081,0).scale.set(.97,1,.98);
    put(ankle,form([[-.014,.053,.037],[.005,.059,.041]],soleW),0,-.083,-.06);
    put(shaft,rmesh(.077,.099,.013,bootW,.006),0,.022,.071,-.16);
    for(let k=0;k<5;k++)for(const sx of[-1,1]){
      const y=.064-k*.021,z=.078+k*.004;
      put(shaft,rmesh(.04,.0038,.004,laceMat,.002),sx*.012,y,z,-.16,0,sx*.4);
      put(shaft,cyl(.005,.005,.003,soleW,7),sx*.036,y,z-.001,Math.PI/2);
    }
    // Stitched quarter panels, a reinforced toe rand, pull loop and separate
    // outsole lugs make a boot instead of a smooth shoe-shaped cylinder.
    for(const sx of[-1,1]){
      // Follow an actual column of the loft; a freehand curve stood away from
      // the ankle when seen in profile. Keep the thread below 2 mm in relief.
      const sa=Math.sin(Math.PI*3/8)**.7,ca=Math.cos(Math.PI*3/8)**.7;
      seam(shaft,[[.064,.064,.067],[.022,.06,.067],[-.021,.067,.079],[-.05,.067,.085]].map(([y,rx,rz])=>[sx*rx*sa,y,-.006-rz*ca]),soleW,.0013);
      put(shaft,plate(.04,.068,.007,bootW),sx*.063,.008,-.015,0,sx*Math.PI/2,0);
      for(let j=0;j<6;j++)put(ankle,rmesh(.012,.013,.02,soleW,.002),sx*([.063,.06,.06,.071,.072,.068][j]),-.095,-.076+j*.041,0,sx*.14,0);
    }
    seam(ankle,[[-.066,-.06,.096],[-.054,-.064,.141],[0,-.068,.169],[.054,-.064,.141],[.066,-.06,.096]],soleW,.0033);
    put(shaft,rmesh(.034,.045,.008,bootW,.004),0,.063,-.074,-.12);
    put(shaft,rmesh(.026,.025,.012,strapMat,.003),0,.084,-.072);
    const bootShaft=shinShaft(shaft,knee,ankle,-.04,.05);
    // CL-198 (Jerry, 2026-10-15: the trousers "natural in all their configurations and movements"). The trouser leg was a
    // thigh tube on the thigh and a calf tube on the shin: every bend of the knee drove the calf's top out through the
    // front of the thigh (a crouch showed a block on a block) and a stride opened the seat. It is now one leg of cloth
    // from inside the seat to the boot, worn by four joints at once (liveCloth, studio/marine-cloth.js): the seat at the
    // top, the thigh, the shin below the knee and, at the blousing, the foot by the same share the boot's shaft has
    // (shinShaft), so the cuff stays round the boot when the ankle bends. The knee has room in it, as trousers do.
    {
      const bones=[lowerBody,legG,knee,ankle];
      const seatW=(y)=>smooth01(-.1,.045,y), kneeW=(y)=>smooth01(.05,-.05,y), shinW=(y)=>smooth01(-.04,.05,y);
      // [lowerBody, thigh, shin, foot] from a vertex's height in the thigh's, the knee's and the ankle's frames
      const w4=(L)=>{const p=seatW(L[1][1]),k=kneeW(L[2][1]),s=shinW(L[3][1]);return [p*(1-k),(1-p)*(1-k),k*s,k*(1-s)];};
      const thighR=[[.06,.088,.098,0,.007],[0,.097,.106,0,.007],[-.05,.099,.108,0,.008],[-.1,.095,.104,side*.004,.011],[-.16,.088,.097,side*.003,.014],[-.21,.081,.089,0,.016],[-.25,.077,.086,0,.018],[-.27,.076,.085,0,.02]];
      const calfR=[[-.03,.075,.084,0,.018],[-.07,.075,.086,side*.002,.006],[-.11,.077,.089,side*.003,-.002],[-.15,.073,.085,side*.002,-.002],[-.18,.075,.088,0,.004],[-.205,.081,.094,0,.009],[-.228,.079,.092,0,.01]];
      const longRings=[...ringsIn(T,root,legG,subdiv(thighR,1),{e:.82}),...ringsIn(T,root,knee,subdiv(calfR,1),{e:.82})];
      const long=loftRings(T,longRings,30,{caps:'first'});
      const trousers=liveCloth(T,{space:root,bones,geo:long.geo,weights:weigh(T,root,bones,long.geo,w4),material:trouserW,name:'live-trouser-leg'});
      dress.legLong.push(trousers.parent);
      // Shorts (CU-145: not rolled): the same leg cut 6 cm above the knee, with a stitched hem, over a bare knee and shin
      // and a sock, all worn the same way so the knee bends in skin.
      const shortR=[...thighR.slice(0,5),[-.19,.084,.093,0,.015],[-.205,.085,.094,0,.016]];
      const shorts=loftRings(T,ringsIn(T,root,legG,subdiv(shortR,1),{e:.82}),30,{caps:'first'});
      const stitch=[];for(let j=0;j<16;j++){const a=j/16*Math.PI*2,sn=Math.sin(a),c=Math.cos(a);stitch.push(new T.Vector3(.085*Math.sign(sn)*Math.abs(sn)**.82,-.2,.016+.094*Math.sign(c)*Math.abs(c)**.82));}
      const hemG=geoIn(T,root,legG,new T.TubeGeometry(new T.CatmullRomCurve3(stitch,true),32,.0024,5,true));
      const shortGeo=joinGeos(T,[shorts.geo,hemG]);
      const short=liveCloth(T,{space:root,bones,geo:shortGeo,weights:weigh(T,root,bones,shortGeo,w4),material:trouserW,name:'live-shorts-leg'});
      const skinR=[[-.17,.064,.07,0,.01],[-.205,.06,.066,0,.012],[-.24,.056,.062,0,.013],[-.27,.052,.058,0,.014]];
      const shinR=[[-.035,.05,.057,0,.01],[-.075,.058,.072,side*.003,-.006],[-.11,.06,.077,side*.004,-.012],[-.15,.05,.063,0,-.005],[-.19,.044,.051,0,.003],[-.205,.043,.049,0,.004]];
      const skin=loftRings(T,[...ringsIn(T,root,legG,subdiv(skinR,1),{e:.9}),...ringsIn(T,root,knee,subdiv(shinR,1),{e:.9})],26,{caps:'first'});
      const bareLeg=liveCloth(T,{space:root,bones,geo:skin.geo,weights:weigh(T,root,bones,skin.geo,w4),material:skinW,name:'live-bare-leg'});
      const sockGeo=geoIn(T,root,knee,rmesh(.115,.055,.127,sockMat,.02).geometry.clone(),0,-.188,.007);
      liveCloth(T,{space:root,bones,geo:sockGeo,weights:weigh(T,root,bones,sockGeo,w4),material:sockMat,name:'live-sock',holder:bareLeg.parent});
      dress.legShort.push(short.parent,bareLeg.parent);
    }
    legG.userData.knee=knee;legG.userData.ankle=ankle;legG.userData.bootShaft=bootShaft;return legG;
  }
  const legLG=leg(-1),legRG=leg(1);
  {
    // CL-198 (Jerry: the trousers "natural in all ... movements"; CL-197 shaped the crotch). The seat was rigid on the
    // pelvis, so a crouch left it hanging between thighs that had gone forward, a sack under him. Its lower half is now
    // worn partly by each thigh (its own side more, the middle seam by both equally), so the seat and crotch go with the
    // legs as trousers do, and the waist stays on the pelvis.
    const bones=[lowerBody,legLG,legRG];
    const g=geoIn(T,root,lowerBody,form(subdiv(pelvisR,1),trouserW,'',28).geometry,0,.62,0);
    const w=(L)=>{const y=L[0][1]-.62,x=L[0][0],f=.78*smooth01(-.005,-.115,y),r=smooth01(-.06,.06,x);return [1-f,f*(1-r),f*r];};
    const seat=liveCloth(T,{space:root,bones,geo:g,weights:weigh(T,root,bones,g,w),material:trouserW,name:'live-seat'});
    seat.userData.aoOwners=[lowerBody,legLG,legRG];
  }
  const torsoG=new T.Group();torsoG.position.y=.7;root.add(torsoG);
  const at=(mesh,x,y,z,...angles)=>put(torsoG,mesh,x,y-.7,z,...angles);
  at(form(subdiv([[.015,.168,.109],[.12,.178,.115],[.24,.207,.128,0,.003],[.345,.246,.135,0,.002],[.405,.257,.124],[.46,.198,.098],[.51,.092,.079]],2),uniformW,'fitted-uniform',32),0,.7,0);
  // GP-124: the shirt's shoulder stays with the chest and overlaps the moving
  // sleeve. This closes the notch beside the neck without enlarging the arm cap.
  for(const side of [-1,1]) {
    at(form(subdiv([[-.07,.055,.075,side*.005],[-.02,.076,.089,side*.01],
      [.025,.062,.071,-side*.015],[.055,.029,.047,-side*.05]],2),uniformW,'shirt-shoulder',24),side*.225,1.125,.012);
  }
  // CL-197 (Jerry, 2026-10-15: "fixing the blouse's collar"). There was no collar: a plain cylinder under the neck wrap, and
  // two loose boxes, with the ragged top of the shirt showing round them. This is a folded-down blouse collar, one
  // lofted band: a flat spread over the shoulders, a rounded fold, a stand that hugs the neck, higher at the back with a
  // V-notch at the front, closed underneath so nothing shows through. Built in torso space (y is marine height).
  {
    const prof=[[1.150,.166,.134],[1.172,.146,.122],[1.202,.126,.111],[1.228,.116,.104],[1.2435,.109,.1],[1.2495,.1045,.0975],[1.244,.099,.0945],[1.226,.095,.0935],[1.205,.0925,.0925],[1.178,.092,.0925]];
    const n=40,cz=.004,p=[],uv=[],ix=[],pts=subdiv(prof,1);
    for(let r=0;r<pts.length;r++){
      const [y,rx,rz]=pts[r];
      for(let j=0;j<=n;j++){
        const a=-Math.PI+j/n*Math.PI*2,c=Math.cos(a),sn=Math.sin(a),af=Math.abs(a);
        // notch at the front (a = 0), a little lift at the back; the fold and the stand move, the spread over the shoulders does not
        const move=Math.max(0,Math.min(1,(y-1.18)/.065));
        const dip=-.033*Math.max(0,1-af/.62)**1.6*move+.008*Math.max(0,(af-2.2)/(Math.PI-2.2))*move;
        const spread=1+.05*Math.max(0,1-af/.62)**2*move;   // the notch's lapels open outward
        p.push(rx*sn*spread,y+dip-.7,cz+rz*c*spread-(c>0?0:0));uv.push(j/n,y*3);
      }
    }
    const cols=n+1,rowsN=pts.length;
    for(let r=0;r<rowsN;r++){const q=(r+1)%rowsN;for(let j=0;j<n;j++){const a=r*cols+j,b=q*cols+j;ix.push(a,a+1,b,a+1,b+1,b);}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();weldRows(g,cols,rowsN);
    const mesh=new T.Mesh(g,uniformW);mesh.name='blouse-collar';mesh.castShadow=mesh.receiveShadow=true;torsoG.add(mesh);
  }
  for(const side of [-1,1]) {
    at(rmesh(.122,.092,.014,uniformW,.007),side*.106,1.011,.129);
    at(rmesh(.126,.024,.018,uniformW,.006),side*.106,1.055,.132);
  }
  at(rmesh(.009,.33,.006,strapMat,.002),0,.945,.128);
  at(rmesh(.13,.025,.009,patchMat,.003),.116,1.105,.13);
  at(rmesh(.081,.009,.006,patchInk,.002),.116,1.105,.136);
  const b=(mesh,x,y,z)=>addGear('bareTorso',torsoG,mesh,x,y-.7,z);
  for(const side of [-1,1]) {
    b(strap([[0,.86,.135],[0,1.01,.145],[0,1.115,.136],[0,1.17,.096],[0,1.19,.015],[0,1.176,-.083],[0,1.105,-.138],[0,.88,-.138]],.036,strapMat),side*.139,0,0);
    b(rmesh(.091,.094,.04,pouchMat,.012),side*.108,.882,.16);
    b(rmesh(.094,.023,.042,strapMat,.007),side*.108,.921,.161);
  }
  b(rmesh(.28,.031,.019,strapMat,.007),0,.852,.138);
  b(rmesh(.033,.029,.016,buckleMat,.005),0,.852,.153);
  b(rmesh(.277,.03,.02,strapMat,.006),0,1.11,-.139);
  const v=(mesh,x,y,z,...angles)=>addGear('vest',torsoG,mesh,x,y-.7,z,...angles);
  const torsoSeam=(points,mat,key,r=.0016)=>{const mesh=seam(torsoG,points.map(([x,y,z])=>[x,y-.7,z]),mat,r);if(key)gearParts[key].push(mesh);return mesh;};
  v(carrierPlate(.35,.335,.034,carrierW),0,.973,.151);
  v(carrierPlate(.35,.345,.032,carrierW),0,.98,-.149);
  for(const side of [-1,1]) {
    v(rmesh(.026,.135,.239,carrierW,.01),side*.191,.88,0);
    v(strap([[0,1.075,.183],[0,1.13,.17],[0,1.174,.119],[0,1.2,.02],[0,1.178,-.101],[0,1.12,-.177]],.052,carrierW,.012),side*.132,0,0);
    v(rmesh(.036,.026,.017,buckleMat,.005),side*.132,1.123,.181);
    v(rmesh(.018,.013,.02,strapMat,.002),side*.132,1.123,.183);
    for(let row=0;row<3;row++)v(rmesh(.008,.015,.22,webMat,.002),side*.207,.844+row*.04,0);
  }
  torsoSeam([[-.151,.876,.171],[-.154,1.055,.171],[-.10,1.126,.171],[.10,1.126,.171],[.154,1.055,.171],[.151,.876,.171]],carrierW,'vest',.002);
  for(let row=0;row<4;row++){
    const y=.836+row*.054;
    v(rmesh(.31,.016,.008,webMat,.003),0,y,.174);
    for(let col=-2;col<=2;col++)v(rmesh(.005,.019,.006,carrierW,.001),col*.058,y,.18);
  }
  for(let i=-1;i<=1;i++) {
    v(form([[-.06,.031,.013],[-.047,.041,.024],[.038,.043,.023],[.061,.037,.018]],carrierPouchW),i*.098,.914,.191);
    v(plate(.079,.041,.01,carrierPouchW),i*.098,.963,.214);
    v(rmesh(.014,.045,.008,strapMat,.002),i*.098,.95,.222);
    v(rmesh(.023,.014,.01,webMat,.002),i*.098,.935,.225);
    torsoSeam([[i*.098-.03,.94,.214],[i*.098-.029,.872,.214],[i*.098+.029,.872,.214],[i*.098+.03,.94,.214]],carrierPouchW,'vest',.0014);
    v(cyl(.003,.003,.003,buckleMat,6),i*.098,.867,.212,Math.PI/2);
  }
  v(rmesh(.114,.055,.022,carrierPouchW,.008),.043,1.067,.18);
  v(rmesh(.113,.011,.023,webMat,.003),.043,1.09,.182);
  v(rmesh(.06,.112,.032,nvgMat,.009),-.158,1.055,.19);
  v(rmesh(.045,.015,.006,strapMat,.002),-.158,1.081,.209);
  for(let k=0;k<4;k++)v(rmesh(.026,.003,.005,webMat,.001),-.158,1.068-k*.008,.21);
  for(const x of[-.173,-.149])v(cyl(.006,.006,.014,nvgMat,8),x,1.117,.19);
  torsoSeam([[-.143,1.116,.19],[-.113,1.159,.144],[-.08,1.181,.113],[-.063,1.142,.144],[-.067,1.115,.186]],nvgMat,'vest',.003);
  v(rmesh(.022,.035,.012,nvgMat,.004),-.065,1.105,.189);
  const antenna=v(cyl(.0035,.0035,.17,nvgMat,5),-.158,1.185,.19);antenna.rotation.z=.1;
  v(rmesh(.092,.025,.019,webMat,.006),0,1.138,-.179);
  const patchRed=new T.MeshStandardMaterial({color:0xb03030,roughness:.9});
  for(const [fn,z] of [[at,.132],[v,.178]]) {
    fn(rmesh(.083,.047,.009,patchMat,.003),-.084,1.092,z);
    fn(rmesh(.029,.024,.006,patchInk,.002),-.108,1.1,z+.007);
    fn(rmesh(.045,.009,.006,patchRed,.002),-.073,1.081,z+.007);
  }
  // Lower-profile pack hugs the back plate; shoulder webbing follows the top.
  at(form([[-.148,.09,.04],[-.13,.122,.058],[-.10,.127,.06],[.065,.133,.063],[.112,.124,.06],[.145,.104,.05],[.159,.058,.029],[.162,0,0]],packW,'soft-pack',16),0,.992,-.227);
  at(form([[-.053,.062,.01],[-.04,.091,.022],[.027,.089,.025],[.051,.071,.008]],packTrimW),0,.96,-.286);
  // Flapped upper pocket and stitched edges sit inside the established pack
  // envelope, so the holsters and weapon sling anchors keep their fit.
  at(plate(.154,.074,.022,packTrimW),0,1.087,-.286,0,Math.PI,0);
  at(plate(.153,.029,.008,packW),0,1.112,-.301,0,Math.PI,0);
  at(rmesh(.021,.027,.008,strapMat,.002),0,1.087,-.304);
  at(rmesh(.031,.017,.009,buckleMat,.002),0,1.074,-.307);
  torsoSeam([[-.081,.92,-.313],[-.083,.975,-.313],[-.064,1.003,-.31],[.064,1.003,-.31],[.083,.975,-.313],[.081,.92,-.313]],packW,null,.0017);
  const zipPoints=[[-.111,.87,-.279],[-.119,1.06,-.276],[-.096,1.117,-.275],[0,1.143,-.26],[.096,1.117,-.275],[.119,1.06,-.276],[.111,.87,-.279]].map(([x,y,z])=>new T.Vector3(x,y-.7,z));
  torsoG.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(zipPoints),24,.0022,4,false),packTrimW));
  for(const side of[-1,1]){
    at(rmesh(.009,.016,.005,buckleMat,.002),side*.055,1.135,-.272);
    at(rmesh(.007,.023,.007,strapMat,.002),side*.055,1.119,-.28);
  }
  for(let row=0;row<3;row++){at(rmesh(.173,.012,.006,strapMat,.002),0,.926+row*.028,-.313);for(const x of[-.06,0,.06])at(rmesh(.006,.016,.005,packTrimW,.002),x,.926+row*.028,-.317);}
  for(const side of [-1,1]) {
    at(rmesh(.024,.116,.007,strapMat,.003),side*.08,1.083,-.292);
    at(rmesh(.027,.024,.009,buckleMat,.004),side*.08,1.033,-.298);
    // GP-157: a continuous pack harness, with no loose upper-chest ends. The
    // padded section rests on the shoulder/chest; its narrower return runs
    // around the ribs to the lower bag. Reuse the existing gear visibility so
    // the shirt and loaded carrier each get their own surface fit.
    for(const [attach,armored] of [[b,false],[v,true]]) {
      const p=(x,y,z)=>[side*x,y,z];
      const join=p(.148,.995,armored?.233:.15);
      attach(strap([p(.105,1.11,-.263),p(.145,1.158,-.13),p(.149,1.19,-.03),
        p(.147,1.188,.043),p(.142,1.153,.119),p(.14,1.112,armored?.18:.139),
        p(.144,1.055,armored?.224:.149),join],.033,packW,.008),0,0,0);
      attach(strap([join,p(.174,.936,armored?.228:.15),p(.204,.891,armored?.13:.107),
        p(.213,.868,.015),p(.185,.868,-.154),p(.116,.89,-.268)],.019,strapMat,.006),0,0,0);
      attach(rmesh(.041,.024,.013,buckleMat,.004),join[0],join[1],join[2]+.006);
    }
    at(rmesh(.021,.272,.009,strapMat,.003),side*.105,.998,-.292);
    at(rmesh(.027,.025,.012,buckleMat,.003),side*.105,.899,-.297);
  }
  // Pack grab handle and compression webbing sit against the bag, below the gun mounts.
  at(rmesh(.11,.014,.022,strapMat,.004),0,1.188,-.23);
  for(const side of[-1,1])at(rmesh(.014,.035,.022,strapMat,.004),side*.048,1.174,-.23);
  at(rmesh(.052,.152,.069,packTrimW,.018),.156,.995,-.224);
  const bed=at(cyl(.046,.046,.253,packTrimW,12),0,.811,-.221);bed.rotation.z=Math.PI/2;
  for(const side of [-1,1]){const band=at(cyl(.049,.049,.016,strapMat,12),side*.082,.811,-.221);band.rotation.z=Math.PI/2;}
  for(const side of[-1,1]){
    at(cyl(.038,.038,.003,packW,16),side*.128,.811,-.221).rotation.z=Math.PI/2;
    at(cyl(.021,.021,.004,packTrimW,12),side*.13,.811,-.221).rotation.z=Math.PI/2;
  }
  const HAND_SCALE=1.18;   // GB-169
  function arm(side) {
    const armG=new T.Group();armG.position.set(side*.34,1.08-.7,.02);torsoG.add(armG);
    // Smaller, inward-sloping deltoid around the unchanged animation pivot.
    // CL-197 (Jerry, 2026-10-15: "smooth out the chopped shoulders"): the same sleeve through a smooth ring curve (the old
    // table had a bump at the elbow pad and 16 sides). Sleeves rolled get a short cap that ends in a thick roll above the
    // elbow, with the bare arm, a skin elbow and the forearm below, so nothing has to bend through cloth.
    const capRings=[[-.286,.054,.057],[-.27,.0565,.0595],[-.25,.0585,.062],[-.23,.0605,.0645],[-.207,.0625,.067,-side*.005,.002],[-.175,.0645,.0685,-side*.008,.002],[-.09,.068,.073,-side*.022],[-.01,.075,.078,-side*.027,-.003],[.045,.069,.07,-side*.042,-.004],[.071,.043,.05,-side*.061]];
    put(armG,rmesh(.016,.088,.077,uniformW,.006),side*.053,-.1,0);
    put(armG,plate(.077,.029,.008,uniformW),side*.064,-.056,0,0,side*Math.PI/2,0);
    // Follow the sleeve's changing center as it slopes into the shoulder.
    seam(armG,[[side*.0395,-.09,-.045],[side*.0481,-.175,-.0399],[side*.0556,-.207,-.043]],uniformW,.0012);
    // GB-123 (Jerry): the PGB unit patch on his own left shoulder (+x: he faces +z), 1 mm off the raised block,
    // facing out and reading the right way round. The right shoulder keeps its placeholder.
    if(side>0&&pgbPatch)patches.push(put(armG,pgbPatch(.062,.072),side*.062,-.1,0,0,Math.PI/2,0));
    else put(armG,rmesh(.007,.041,.051,side>0?patchMat:patchInk,.002),side*.064,-.1,0);
    addGear('pads',armG,plate(.122,.111,.023,padW),0,-.261,-.067,0,Math.PI,0);
    addGear('pads',armG,plate(.099,.088,.019,plateW),0,-.261,-.087,0,Math.PI,0);
    const elbowG=new T.Group();elbowG.position.set(0,-.28,0);elbowG.rotation.set(side<0?-.35:-.2,0,0);armG.add(elbowG);
    const ox=side<0?.02:-.01,oz=side<0?.04:.03;
    const sleeve=part(elbowG,dress.sleeveDown),bare=part(elbowG,dress.sleeveRolled);
    const joint=(mat,r)=>{const m=new T.Mesh(new T.SphereGeometry(1,22,16),mat);m.scale.set(r,r,r*1.02);m.castShadow=m.receiveShadow=true;return m;};
    put(part(armG,dress.sleeveDown),joint(uniformW,.0565),0,-.28,0);
    put(bare,joint(skinW,.0478),0,0,0);   // the skin elbow, on the elbow pivot
    // CL-198 (Jerry, 2026-10-15: the blouse "natural in all ... movements"). The sleeve was a cap on the shoulder and a
    // separate forearm tube on the elbow, with a ball between: bending the arm showed the joins. It is now one sleeve from
    // the top of the shoulder to the cuff, worn by the chest (at the top of the shoulder, as CL-188's live cap was), the
    // upper arm and the forearm (liveCloth, studio/marine-cloth.js), so it bends at the elbow as cloth does. The ball stays
    // inside it to keep the outside of the elbow full when it closes. Sleeves rolled: the same sleeve cut above the elbow
    // and rolled into a thick band, and the bare arm below it is one surface of skin from under the roll to the wrist
    // (ending exactly where ChatGPT's wrist bridge, ui/marine-kit-fit.js, takes it on to the hand).
    {
      const bones=[torsoG,armG,elbowG],hi=.07,lo=-.12;
      const w3=(L)=>{
        const y=L[1][1],x=L[1][0]*side,t=Math.max(0,Math.min(1,(hi-y)/(hi-lo))),out=Math.max(0,Math.min(1,(x-.03)/.05))*.35;
        const a=Math.min(1,t*t*(3-2*t)+out*(1-t)),e=smooth01(.045,-.045,L[2][1]);
        return [(1-a)*(1-e),a*(1-e),e];
      };
      const upper=[[.071,.043,.05,-side*.061],[.045,.069,.07,-side*.042,-.004],[-.01,.075,.078,-side*.027,-.003],[-.09,.068,.073,-side*.022],[-.175,.0635,.0675,-side*.008,.002],[-.215,.061,.065,-side*.004,.002],[-.25,.0585,.0625],[-.28,.0575,.0615]];
      const fore=[[-.025,.059,.062,ox*.15,oz*.1],[-.05,.066,.07,ox*.35,oz*.3],[-.105,.063,.069,ox*.8,oz*.7],[-.135,.0575,.0615,ox*.92,oz*.86],[-.165,.05,.052,ox,oz],[-.2,.043,.038,ox,oz],[-.226,.041,.034,ox,oz]];
      const down=loftRings(T,[...ringsIn(T,root,armG,subdiv(upper,1),{e:.72}),...ringsIn(T,root,elbowG,subdiv(fore,1),{e:.72})],30,{caps:'first'});
      const seamGeo=(pts)=>geoIn(T,root,armG,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(q=>new T.Vector3(...q))),12,.0012,4,false));
      const capSeamG=seamGeo([[side*.0205,.045,.0391],[side*.0409,-.01,.0451],[side*.0395,-.09,.045]]);
      const downGeo=joinGeos(T,[down.geo,capSeamG]);
      const sleeveLive=liveCloth(T,{space:root,bones,geo:downGeo,weights:weigh(T,root,bones,downGeo,w3),material:uniformW,name:'live-sleeve'});
      dress.sleeveDown.push(sleeveLive.parent);
      // rolled: the sleeve to 7.5 cm above the elbow, the roll (a thick fold), then skin
      const shortR=[...upper.slice(0,5),[-.195,.0625,.0665,-side*.005,.002]];
      const shortL=loftRings(T,ringsIn(T,root,armG,subdiv(shortR,1),{e:.72}),30,{caps:'first'});
      const roll=geoIn(T,root,armG,new T.TorusGeometry(.0665,.0145,10,36),-side*.005,-.203,.002,Math.PI/2,0,0,1,1,1.07);
      const rollSeam=seamGeo([[side*.0205,.045,.0391],[side*.0409,-.01,.0451],[side*.0395,-.09,.045]]);
      const rolledGeo=joinGeos(T,[shortL.geo,roll,rollSeam]);
      const rolled=liveCloth(T,{space:root,bones,geo:rolledGeo,weights:weigh(T,root,bones,rolledGeo,w3),material:uniformW,name:'live-sleeve-rolled'});
      const armSkin=[[-.19,.0505,.0525,-side*.005,.002],[-.235,.0495,.0505,-side*.002,.001],[-.28,.0478,.0482]];
      const foreSkin=[[-.03,.0505,.0515,ox*.05,oz*.04],[-.065,.0555,.0555,ox*.3,oz*.25],[-.105,.051,.0525,ox*.8,oz*.7],[-.145,.0425,.0445,ox*.95,oz*.93],[-.18,.037,.036,ox,oz]];
      const skinRings=[...ringsIn(T,root,armG,subdiv(armSkin,1),{e:.88}),...ringsIn(T,root,elbowG,subdiv(foreSkin,1),{e:.88})];
      const skinL=loftRings(T,skinRings,24,{caps:'first'});
      liveCloth(T,{space:root,bones,geo:skinL.geo,weights:weigh(T,root,bones,skinL.geo,w3),material:skinW,name:'live-bare-arm',holder:rolled.parent});
      dress.sleeveRolled.push(rolled.parent);
    }
    put(sleeve,rmesh(.088,.022,.076,uniformW,.008),ox,-.211,oz);   // GB-169: the cuff closes round the slimmer wrist
    put(sleeve,rmesh(.04,.016,.007,uniformW,.003),ox+side*.02,-.211,oz+.04);
    put(sleeve,cyl(.004,.004,.003,beltW,6),ox+side*.031,-.211,oz+.045,Math.PI/2);
    seam(sleeve,[[ox+side*.0471,-.17,oz+.0351],[ox*.8+side*.057,-.105,oz*.7+.0425],[ox*.55+side*.0606,-.075,oz*.5+.0437]],uniformW,.0012);
    const gz=side<0?.08:.07;
    // CU-100: the hand turns at the wrist (the top of the palm, on the forearm), so a grip can lie in the fist's channel
    // whichever way the forearm comes to it. At rest the wrist is identity: the hand is exactly where it was built.
    // userData.grip is that channel's middle (elbow space, wrist at rest): where a gun's grip or forend goes through.
    const wrist=new T.Group();wrist.name='wrist';wrist.position.set(ox,-.214,(oz+gz)/2);elbowG.add(wrist);
    wrist.userData.grip=new T.Vector3(ox,-.262,gz+.008);
    // GB-152 (Jerry: "Make hands that have real finger."): a palm, a two-segment thumb and four three-segment fingers
    // (studio/marine-hand.js) in place of the mitt, same size and materials, the index finger and the thumb now on the
    // correct edge. One rig per hand moves the glove and the bare hand alike: wrist.userData.hand.set(pose).update().
    const handBuilds=[];
    for(const [list,mat,guard] of [[dress.gloveOn,gloveW,true],[dress.handBare,skinW,false]]) {
      const h=part(wrist,list);h.position.set(-wrist.position.x,-wrist.position.y,-wrist.position.z);
      const b=buildHandMeshes({T,s:side,ox,gz,mat,padMat:guard?padMat:null});
      h.add(b.meshes.main);if(b.meshes.pads)h.add(b.meshes.pads);
      handBuilds.push(b);
    }
    wrist.userData.hand=makeHandRig(side,handBuilds);wrist.userData.handRoot=true;
    // GB-169 (Jerry: "hands proportionally tiny"): the hand 18% larger, grown from the wrist; hand length now ~ face length.
    wrist.scale.setScalar(HAND_SCALE);wrist.userData.handScale=HAND_SCALE;
    const transition=wristTransition(T,elbowG,wrist,skinW,{ox,oz,gz,scale:HAND_SCALE});
    bare.add(transition);
    if(side<0)put(elbowG,rmesh(.041,.025,.027,nvgMat,.006),ox,-.195,oz+.055);
    elbowG.userData.wrist=wrist;
    return {armG,elbowG,wrist};
  }
  const {armG:armLG,elbowG:elbowLG,wrist:wristLG}=arm(-1),{armG:armRG,elbowG:elbowRG,wrist:wristRG}=arm(1);
  armLG.rotation.set(-.85,.15,.55);armRG.rotation.set(-1.05,-.05,-.25);
  const gripL=new T.Group();gripL.position.set(.02,-.27,.13);gripL.rotation.set(1.23359,-.24103,-.08361);elbowLG.add(gripL);
  const gripR=new T.Group();gripR.position.set(-.01,-.26,.12);elbowRG.add(gripR);
  const weaponMount=new T.Group();weaponMount.position.set(.12826,.15981,-.10022);weaponMount.rotation.set(1.23359,.24103,.08361);gripR.add(weaponMount);
  return {lowerBody,hip,hipGrip,gearParts,legLG,legRG,torsoG,armLG,armRG,elbowLG,elbowRG,wristLG,wristRG,gripL,gripR,weaponMount,patches};
}
