// GP-106: Jerry's fitted marine body. Uses the existing joint locations and item
// materials; animation, purchases and dressing remain owned by their callers.
import {wristTransition} from '../ui/marine-kit-fit.js';
import {webbingGeometry} from '../ui/marine-webbing.js';
import {buildHandMeshes,makeHandRig} from './marine-hand.js';   // GB-152
import {liveCloth,loftRings,ringsIn,joinGeos,smooth01,weigh,geoIn,relMatrix,armLiveMerge} from './marine-cloth.js';   // CL-198; CC-364 armLiveMerge
import {mergeFaceFeatures} from '../ui/marine-face.js';   // CC-364: the face's unlit parts in one draw
export const PLAYER_HEAD_SIZE = .90;
// The blouse collar profile was measured on the original .73 head.
const COLLAR_HEAD_SCALE = PLAYER_HEAD_SIZE / .73;
const detailCache = new Map();
// D-243 (Jerry 23 Nov: "Why is the player so jacked up? His head is tiny ..."; Claude 9): a man's build, third person only.
// KX: the torso and all worn on it narrower about his middle (shoulder joints .47 -> .38 apart, CF-23 B); KZ: and thinner front
// to back (the chest with the carrier .40 -> .33 deep, the pack with it); KH: the hips and
// belt (hip joints .26 -> .21, C); ARM / the FORE taper: slimmer upper arms and forearms (the cuff and glove as they were);
// KT: the thighs a little slimmer (they sit closer now). The reduced build applies to the player.
const PLAYER_BUILD = { KX: .81, KZ: .82, KH: .81, ARM: .82, FORE: [.88, .88, .9, .93, .97, 1, 1, 1], KT: [.8, .8, .82, .85, .88, .92, .97, 1], KTS: .86, NK: COLLAR_HEAD_SCALE };
// Bake a squash (x by kx, z by kz) in `frame`'s own space into every mesh under `list` (skip(name) keeps one as built).
function d243Squash(T, frame, list, kx, kz = 1, skip = () => false) {
  frame.updateMatrixWorld(true);
  const fi = new T.Matrix4().copy(frame.matrixWorld).invert(), S = new T.Matrix4().makeScale(kx, 1, kz), R = new T.Matrix4(), A = new T.Matrix4();
  for (const top of list) top.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position || skip(o.name || '')) return;
    // R: the mesh's space into the frame's; the squash S done in the frame, baked into the geometry: A = R^-1 S R
    R.multiplyMatrices(fi, o.matrixWorld);A.copy(R).invert().multiply(S).multiply(R);
    o.geometry = o.geometry.clone();o.geometry.applyMatrix4(A);o.geometry.userData = { ...(o.geometry.userData || {}), shared: false, d243: true };
  });
}
export function buildMarineBody(T, {root, put, rmesh: roundedMesh, cyl, part, dress, mats, pgbPatch, gpuCloth = false, playerShape = false}) {   // CC-353: gpuCloth, the live cloth skinned on the GPU (the player's own marine)
  const D243 = { ...PLAYER_BUILD, on: playerShape };
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
    const rows=caps==='none'?[]:caps==='high'?[[rings.length-1,false]]:caps==='low'?[[0,true]]:[[0,true],[rings.length-1,false]];
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
  const subdivC=(rows,steps)=>subdiv(rows.map(([y,rx,rz,cz])=>[y,rx,rz,0,cz]),steps).map(([y,rx,rz,,cz])=>[y,rx,rz,cz]);   // D-243: the collar's rows with a centre
  // CC-357 b (J164 item 5): the shirt's body as rings [y, half width, depth in front, depth behind, e] (a squared ellipse
  // per ring, its front and back halves each their own depth), and where its surface is: shirtR is the distance from the
  // torso's axis to the surface along (dx, dz) at height y (between rings, by straight lines); reseat moves a point that
  // sat on (or off) the old shirt by as much as the surface moved along its own direction, so it keeps its stand-off.
  function shirtForm(rings,mat,name,n=32){
    const p=[],uv=[],ix=[];
    for(const [y,rx,rf,rb,e] of rings)for(let j=0;j<=n;j++){
      const a=j/n*Math.PI*2,s=Math.sin(a),c=Math.cos(a);
      p.push(rx*Math.sign(s)*Math.abs(s)**e,y,(c>=0?rf:rb)*Math.sign(c)*Math.abs(c)**e);uv.push(j/n,y*3);
    }
    for(let r=0;r<rings.length-1;r++)for(let j=0;j<n;j++){const a=r*(n+1)+j,b=a+n+1;ix.push(a,a+1,b,a+1,b+1,b);}
    for(const [row,reverse] of [[0,true],[rings.length-1,false]]){
      if(!reverse && playerShape && name==='fitted-uniform')continue;   // The neck passes through the blouse opening.
      const center=p.length/3;p.push(0,rings[row][0],0);uv.push(.5,.5);
      for(let j=0;j<n;j++){const a=row*(n+1)+j;ix.push(center,...(reverse?[a+1,a]:[a,a+1]));}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));
    geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();weldRows(geo,n+1,rings.length);
    const mesh=new T.Mesh(geo,mat);mesh.castShadow=mesh.receiveShadow=true;mesh.name=name;return mesh;
  }
  function shirtR(rings,y,dx,dz){
    let i=1;while(i<rings.length-1&&rings[i][0]<y)i++;
    const A=rings[i-1],B=rings[i],t=Math.max(0,Math.min(1,(y-A[0])/((B[0]-A[0])||1))),q=(k)=>A[k]+(B[k]-A[k])*t;
    const l=Math.hypot(dx,dz)||1,e=q(4),rz=dz>=0?q(2):q(3);
    return (Math.abs(dx/l/q(1))**(2/e)+Math.abs(dz/l/rz)**(2/e))**(-e/2);
  }
  // (only what lies on the shirt or within 2 cm of it moves fully; from 2 to 5 cm off it, less and less: a strap's end on
  // the pack stays where it was)
  const reseat=(x,y,z)=>{
    const l=Math.hypot(x,z);if(l<1e-6)return [x,z];const r0=shirtR(SHIRT_OLD,y,x,z),d=(shirtR(SHIRT,y,x,z)-r0)*(1-smooth01(.02,.05,l-r0));
    return [x+x/l*d,z+z/l*d];
  };
  const rs=(x,y,z)=>{const [nx,nz]=reseat(x,torsoY(y)-TORSO_Y,z);return [nx,y,nz];};   // a piece at marine height y
  const rsPts=(pts,ox)=>pts.map(([x,y,z])=>{const [nx,nz]=reseat(x+ox,torsoY(y)-TORSO_Y,z);return [nx-ox,y,nz];});   // a strap's points (put at ox)
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
  function carrierPlate(w,h,d,mat,front=false) {
    // The carry fit uses the original carrier's outer bevel as support. Unlike
    // the molded pads above, its bevel grows OUTSIDE the nominal plate shape:
    // keep that exact envelope (including square lower corners) for the slings.
    const x=w/2,y=h/2,cut=w*.18,b=.008,corner=b*(Math.SQRT2-1);
    const cutX=playerShape && front ? w*.28 : cut, cutY=playerShape && front ? h*.64 : cut;
    const inner=[[-x,-y],[x,-y],[x,y-cutY],[x-cutX,y],[-x+cutX,y],[-x,y-cutY]];
    const outer=[[-x-b,-y-b],[x+b,-y-b],[x+b,y-cutY+corner],[x-cutX+corner,y+b],[-x+cutX-corner,y+b],[-x-b,y-cutY+corner]];
    const p=[],uv=[],ix=[],n=inner.length;
    for(const [edge,z] of [[inner,-d/2-.005],[outer,-d/2],[outer,d/2],[inner,d/2+.005]])for(const [px,py] of edge){p.push(px,py,z);uv.push(px/w+.5,py/h+.5);}
    for(let row=0;row<3;row++)for(let j=0;j<n;j++){const a=row*n+j,c=row*n+(j+1)%n;ix.push(a,c,a+n,c,c+n,a+n);}
    for(const [row,reverse] of [[0,true],[3,false]]){const center=p.length/3;p.push(0,0,row===0?-d/2-.005:d/2+.005);uv.push(.5,.5);for(let j=0;j<n;j++){const a=row*n+j,c=row*n+(j+1)%n;ix.push(center,...(reverse?[c,a]:[a,c]));}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();
    const mesh=new T.Mesh(geo,mat);mesh.name='fitted-carrier-shell';mesh.castShadow=mesh.receiveShadow=true;return mesh;
  }
  const seam=(parent,points,mat,r=.0016)=>{const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const m=new T.Mesh(new T.TubeGeometry(curve,Math.max(6,points.length*3),r,4,false),mat);parent.add(m);return m;};
  let strapMap=(p)=>p;   // CC-340: the torso's straps are mapped onto the new torso (torsoY), once it is defined
  const strap=(points,width,mat,thickness=.008)=>{const m=new T.Mesh(webbingGeometry(T,strapMap(points),width,thickness,{segments:32}),mat);m.castShadow=m.receiveShadow=true;m.userData.absPts=!!strapMap.mapped;return m;};
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
  // CC-340 (Jerry, J125: "refine the anatomical fidelity of our player model"): his proportions a man's. At his eye
  // height (1.40 m, the first-person eye, unchanged) a man has his hip joints at 0.785 m, his knees at 0.43 and his
  // shoulder joints at 1.20; he had 0.62, 0.35 and 1.08 (legs 17 cm short, a torso 15 cm long, shoulders 12 cm low).
  // The legs are longer (thigh 35.5 cm, shin 33), the pelvis and belt ride up with the hips, and the chest and
  // everything on it is mapped onto the shorter torso by torsoY (heights below the shoulders scale by 0.88; above
  // them, where the old torso had 13 cm of shoulder, they close up onto the new 6).
  const HIP_Y=.785, THIGH=.355, SHIN=.33, TORSO_Y=.865, SHOULDER_Y=1.2, LB=HIP_Y-.62, K1=THIGH/.27, K2=SHIN/.25;
  const torsoY=(y)=>y<=1?TORSO_Y+(y-.7)*.88:y<=1.08?1.129+(y-1)*(1.2-1.129)/.08:1.2+(y-1.08)*.353;
  const SHIRT_ROWS=[[.013,.148,.103,.104,.94],[.06,.149,.103,.099,.94],[.106,.154,.107,.097,.92],[.16,.167,.115,.106,.9],[.211,.176,.121,.117,.88],
    [.26,.184,.125,.124,.87],[.304,.188,.124,.126,.86],[.344,.178,.114,.117,.84],[.367,.142,.095,.098,.84],[.387,playerShape?.083:.076,playerShape?.081:.07,playerShape?.085:.074,.9]];   // CC-357 b (shirtForm)
  const putL=(mesh,x,y,z,...a)=>put(lowerBody,mesh,x,y+LB,z,...a);
  const lowerBody=new T.Group();root.add(lowerBody);
  // CL-197 (Jerry, 2026-10-15: "fixing the crotch area"). The pelvis ended in a flat disc between the thighs, a shelf with
  // the sky showing under it. It now narrows through a seat to a rounded crotch that the two thighs close round, as a
  // pair of trousers does, and is smoothed (more rings and sides) like the rest of the body.
  // CC-340: the crotch 7.5 cm under the hip joints, where a man's is (it hung 14 cm under them), the hips a little narrower
  const pelvisR=[[-.088,.014,.014,0,-.004],[-.074,.05,.046,0,-.002],[-.054,.112,.086,0,.006],[-.022,.158,.118,0,-.008],[.025,.176,.122,0,-.006],[.1,.172,.111]];
  // CL-198: `hip` stays the pelvis joint the game and the survivors' kit hang things on, but what shows is the live seat
  // (after the legs, below); hip itself is only the waistband under the belt, a hair inside it.
  const hip=form(subdiv([[.02,.181,.122,0,-.006],[.1,.17,.109]],1),trouserW,'fitted-pelvis',28);
  hip.position.y=HIP_Y;lowerBody.add(hip);
  // Webbing encircles the waist. Connect the outer and inner edges with the thickness of the fabric.
  function beltBand(halfHeight, lowX, lowZ, highX, highZ, name) {
    if(playerShape){lowX-=.0045;highX-=.0045;}
    const rows = [[-halfHeight,lowX,lowZ],[halfHeight,highX,highZ]];
    if (!playerShape) return form(rows,beltW);
    const thickness = .002;
    rows.push([halfHeight,highX-thickness,highZ-thickness],[-halfHeight,lowX-thickness,lowZ-thickness],rows[0]);
    return form(rows,beltW,name,28,'none');
  }
  putL(beltBand(.025,.185,.124,.18,.12,'waist-belt'),0,.721,0);
  for(const y of[.698,.744])putL(beltBand(.003,.187,.126,.187,.126,'waist-belt-binding'),0,y,0);
  putL(rmesh(.064,.037,.012,buckleMat,.005),0,.721,.134);
  putL(rmesh(.043,.022,.014,beltW,.003),0,.721,.141);
  putL(rmesh(.006,.03,.009,buckleMat,.002),.007,.721,.151);
  for(let j=0;j<10;j++){const a=j/10*Math.PI*2,s=Math.sin(a),c=Math.cos(a);putL(rmesh(.018,.054,.012,strapMat,.004),Math.sign(s)*Math.abs(s)**.7*(playerShape?.1865:.191),.721,Math.sign(c)*Math.abs(c)**.7*.132,0,a,0);}
  // CC-344 (J128): the two front mag pouches ride on the belt (5 cm higher; they hung 6 cm below it, over the hip crease,
  // where the running thigh went 17 mm into them)
  for(const side of [-1,1]) {
    putL(rmesh(.082,.112,.038,beltW,.012),side*.112,.697,.135);
    putL(plate(.079,.041,.008,beltW),side*.112,.734,.157);
    putL(rmesh(.014,.028,.007,strapMat,.002),side*.112,.715,.164);
    putL(rmesh(.021,.014,.008,buckleMat,.002),side*.112,.704,.164);
    putL(rmesh(.026,.055,.018,strapMat,.005),side*.148,.717,.082);
  }
  putL(rmesh(.125,.1,.047,beltW,.018),.055,.64,-.137);
  putL(rmesh(.035,.026,.155,strapMat,.008),-.185,.63,0);
  // GP-19920: the carry rig supplies the hollow holster on the thigh joint.
  // The drop-leg shell hangs from the belt instead of floating beside the thigh.
  putL(rmesh(.022,.16,.018,strapMat,.005),-.204,.622,.018,0,0,.08);
  putL(rmesh(.055,.025,.018,buckleMat,.004),-.208,.666,.03);
  const hipGrip=putL(rmesh(.032,.043,.038,leatherMat,.01),-.218,.602,.037);
  const gearParts={helmet:[],vest:[],pads:[],nvg:[],bareHead:[],bareTorso:[]};
  const addGear=(key,parent,mesh,...args)=>{put(parent,mesh,...args);gearParts[key].push(mesh);return mesh;};
  // CC-357 (J164, D-196; Jerry 17 Nov: "Ok go for it. Let's do those 4 suggestions"): slimmer, lower boots, as one fit of
  // the pieces leg() builds (so the boot is tuned in one place). In the ankle's frame (the shaft's at rest): every piece of
  // the shaft and the foot narrowed to BOOT.x of its width about the ankle's axis; the shaft above the foot to BOOT.z of its
  // depth (about BOOT.zc, its axis); the toe box lowered (its height over the sole's top to BOOT.h at the toe, none at the
  // instep or the shaft). The tread, the sole's underside (-.103 under the ankle, where he stands), the boot's length, the
  // ankle and every joint are as they were: nothing he stands or walks on moves. Was ~17 cm across the ball, 13 at the shaft.
  const BOOT={x:.78,z:.84,h:.82,sole:-.081,zc:-.006};
  function bootFit(groups){
    const v=new T.Vector3();
    for(const g of groups)for(const c of g.children){
      if(!c.isMesh||!c.geometry||!c.geometry.attributes.position)continue;
      c.updateMatrix();const geo=c.geometry.clone();delete geo.userData.shared;geo.applyMatrix4(c.matrix);
      const P=geo.attributes.position,N=geo.attributes.normal;
      for(let i=0;i<P.count;i++){
        v.fromBufferAttribute(P,i);
        const fz=1-(1-BOOT.z)*smooth01(-.075,-.035,v.y),fh=1-(1-BOOT.h)*smooth01(.02,.1,v.z)*(1-smooth01(-.035,0,v.y));
        const up=v.y>BOOT.sole;
        P.setXYZ(i,v.x*BOOT.x,up?BOOT.sole+(v.y-BOOT.sole)*fh:v.y,BOOT.zc+(v.z-BOOT.zc)*fz);
        if(N){const nx=N.getX(i)/BOOT.x,ny=N.getY(i)/(up?fh:1),nz=N.getZ(i)/fz,l=Math.hypot(nx,ny,nz)||1;N.setXYZ(i,nx/l,ny/l,nz/l);}
      }
      // Preserve the heel strike, cuff and sole thickness. The toe, tread and stitching
      // share one smooth ankle-space fit, strongest below the ball of the foot.
      if(playerShape)for(let i=0;i<P.count;i++){
        const x=P.getX(i), y=P.getY(i), z=P.getZ(i);
        const ballT=Math.max(0,Math.min(1,(z+.04)/.095)), topT=Math.max(0,Math.min(1,(y+.06)/.085));
        const ball=ballT*ballT*(3-2*ballT), low=1-topT*topT*(3-2*topT);
        const toeT=Math.max(0,Math.min(1,(z-.01)/.04)), toe=z>.05?z-.03:.02*toeT*toeT;
        const width=1-.16*ball*low, depth=1-.22*toeT*low;
        P.setXYZ(i,x*width,y,z-.22*toe*low);
        if(N){
          // Inverse-transpose of this fit's Jacobian keeps smoothed seams and tread edges.
          const dBall=6*ballT*(1-ballT)/.095, dLow=-6*topT*(1-topT)/.085;
          const nx=N.getX(i)/width, nz=(N.getZ(i)+.16*x*dBall*low*nx)/depth;
          const ny=N.getY(i)+.16*x*ball*dLow*nx+.22*toe*dLow*nz, len=Math.hypot(nx,ny,nz)||1;
          N.setXYZ(i,nx/len,ny/len,nz/len);
        }
      }
      geo.computeBoundingSphere();geo.computeBoundingBox();
      c.geometry=geo;c.position.set(0,0,0);c.rotation.set(0,0,0);c.scale.set(1,1,1);c.updateMatrix();
    }
  }
  function leg(side) {
    const legG=new T.Group();legG.position.set(side*.13*(D243.on?D243.KH:1),HIP_Y,0);   // D-243: hip joints .26 -> .21
    lowerBody.add(legG);
    const tY=(y)=>y<0?y*K1:y, sY=(y)=>y<0?y*K2:y;   // heights down the thigh and the shin, stretched to their new lengths
    const thighInset=y=>playerShape ? side*.019*smooth01(-.320,-.160,y) : 0;
    const putT=(mesh,x,y,z,...a)=>put(legG,mesh,x-thighInset(tY(y))/(playerShape?D243.KTS:1),tY(y),z,...a), putS=(key,mesh,x,y,z,...a)=>addGear(key,knee,mesh,x,sY(y),z,...a);
    const tP=(pts,scale=1)=>pts.map(([x,y,z])=>[x-thighInset(tY(y))/scale,tY(y),z]);
    // A thigh mount and retention band support the hollow carry holster.
    const mount = putT(rmesh(.012,.105,.082,holsterW,.004),side*.1045,-.083,.035);   // CC-357: 3.5 mm in, on the tapered leg
    // CC-344: 1.5 cm lower (still across the mount): at -.11 its front went 6 mm into the belt's left mag pouch running
    const band = putT(form([[-.008,.0955,.1075],[.008,.0955,.1075]],strapMat,'holster-thigh-band',16,'high'),0,-.125,.012);   // CC-357: round the tapered leg
    if (playerShape) for (const part of [mount, band]) {
      part.userData.thighMount = side > 0 ? 'thigh+' : 'thigh-';
      part.userData.proxySkip = true;
      part.visible = false;
    }
    // CL-198: the trouser leg itself is worn live (after the boot, below), from inside the seat to the boot.
    // CC-357: the cargo pocket, its flap, buttons and seam 6 mm in, onto the tapered leg
    putT(rmesh(.021,.126,.112,trouserW,.009),side*.088,-.145,.004);
    putT(plate(.111,.04,.009,trouserW),side*.102,-.097,.004,0,side*Math.PI/2,0);
    for(const z of[-.032,.038])putT(cyl(.004,.004,.004,beltW,6),side*.108,-.105,z,0,0,Math.PI/2);
    seam(legG,tP([[side*.088,-.055,.046],[side*.0905,-.145,.0575],[side*.073,-.205,.0465]],playerShape?D243.KTS:1),trouserW);
    // (CC-344: the front seam is worn with the live leg now, below: rigid on the thigh it rose through the belt as the thigh came up)
    // One restrained fold at the pocket and knee, not a separate thigh block.
    let knee;
    knee=new T.Group();knee.position.set(0,-THIGH,0);legG.add(knee);
    // CC-357: the knee pad 2 cm narrower and 6 mm in, on the tapered knee (its side guards 5 mm in)
    putS('pads',plate(.13,.176,.028,padW),0,-.014,.087);
    putS('pads',plate(.108,.149,.026,plateW),0,-.012,.105);
    for(const sx of[-1,1]){
      putS('pads',rmesh(.01,.051,.01,padW,.003),sx*.046,-.014,.122,0,0,-sx*.08);
      for(const y of[-.05,.03])putS('pads',cyl(.0035,.0035,.003,buckleMat,6),sx*.043,y,.121,Math.PI/2);
      putS('pads',rmesh(.021,.037,.022,plateW,.005),sx*.071,-.063,.018);
    }
    // Each strap belongs to the limb it encircles; the upper one must not rotate into the thigh with the shin.
    putS('pads',form([[-.011,.071,.083],[.011,.07,.082]],strapMat,'calf-pad-strap',16,'high'),0,-.065,.006);   // CC-357: round the tapered leg
    addGear('pads',legG,form([[-.011,.073,.079],[.011,.076,.085]],strapMat,'thigh-pad-strap',16,'high'),side*.001-thighInset(tY(-.224)+(playerShape?.014:0)),tY(-.224)+(playerShape?.014:0),.018);
    const ankle=new T.Group();ankle.position.set(0,-SHIN,.01);knee.add(ankle);
    // CU-98: the shaft and what is sewn to it go on the shin (shinShaft, below); the foot keeps the upper and the sole.
    const shaft=new T.Group();shaft.position.copy(ankle.position);knee.add(shaft);
    put(shaft,form([[-.055,.067,.086],[-.021,.067,.079],[.022,.06,.067],[.064,.064,.067],[.082,.063,.067]],bootW,'boot-ankle',16),0,0,-.006);
    // A continuous heel/instep/toe upper, instead of two overlapping toe blocks.
    const foot=form([[-.096,.049,.026,0,.054],[-.055,.066,.037,0,.049],[.005,.07,.06,0,.033],[.073,.072,.044,0,.045],[.135,.065,.032,0,.057],[.166,.038,.015,0,.068]],bootW,'shaped-boot-upper');
    foot.rotation.x=Math.PI/2;ankle.add(foot);
    put(ankle,sole(.022,soleW),0,-.103,0);
    put(ankle,sole(.006,bootW),0,-.081,0).scale.set(.97,1,.98);
    put(ankle,form([[-.014,.053,.037],[.005,.059,.041]],soleW),0,-.083,-.06);
    put(shaft,rmesh(.077,.0525,.013,bootW,.006),0,-.00125,.073,-.16);   // CC-357 b: the tongue's top 2.4 cm lower, under the cuff (its front came through the tapered cuff)
    // CC-357 c (Claude 6's FIX 2 on b): its top corners still stood 1-2 cm up into the cuff (two thin dark slivers either
    // side of the laces): the top is at 2.5 cm over the ankle now, under the cuff's edge (2.9); its bottom as it was.
    // CC-357 b (Director 11:45Z, AG-330's 5080 crop): the slimmer boot under the tapered cuff put the top two lace rows
    // and their eyelets (.064 and .043 over the ankle) through the trouser's cuff, which ends 2.9 cm over the ankle: they
    // are under the bloused cloth, so they are not built; the three below the cuff are as they were.
    for(let k=2;k<5;k++)for(const sx of[-1,1]){
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
    bootFit([shaft,ankle]);   // CC-357: slimmer, lower boots (above)
    const bootShaft=shinShaft(shaft,knee,ankle,-.04,.05);
    // CL-198 (Jerry, 2026-10-15: the trousers "natural in all their configurations and movements"). The trouser leg was a
    // thigh tube on the thigh and a calf tube on the shin: every bend of the knee drove the calf's top out through the
    // front of the thigh (a crouch showed a block on a block) and a stride opened the seat. It is now one leg of cloth
    // from inside the seat to the boot, worn by four joints at once (liveCloth, studio/marine-cloth.js): the seat at the
    // top, the thigh, the shin below the knee and, at the blousing, the foot by the same share the boot's shaft has
    // (shinShaft), so the cuff stays round the boot when the ankle bends. The knee has room in it, as trousers do.
    {
      const bones=[lowerBody,legG,knee,ankle];
      const seatW=(y)=>smooth01(-.14,.0,y), kneeW=(y)=>smooth01(.05,-.05,y), shinW=(y)=>smooth01(-.04,.05,y);
      // [lowerBody, thigh, shin, foot] from a vertex's height in the thigh's, the knee's and the ankle's frames
      const w4=(L)=>{const p=seatW(L[1][1]),k=kneeW(L[2][1]),s=shinW(L[3][1]);return [p*(1-k),(1-p)*(1-k),k*s,k*(1-s)];};
      // CC-357 (J164, D-196): tapered. Full at the hip (the top two rings as they were), the same at the pocket and the
      // holster band within 4-6 mm, then narrowing through the knee to a slimmer calf and a bloused cuff over the slimmer
      // boot. Was a straight pillar: 19.8 cm across at the hip, 15.2 at the knee, 15.4 at the calf, 16.2 at the cuff; now
      // 19.4, 12.6, 12.8 and 11.6. The heights, the offsets and the weights (w4) are as they were.
      const thighR=[[.06,.088,.098,0,.007],[0,.097,.106,0,.007],[-.0657,.097,.106,0,.008],[-.1315,.091,.1,side*.004,.011],[-.2104,.08,.089,side*.003,.014],[-.2761,.07,.079,0,.016],[-.3287,.064,.074,0,.018],[-.355,.063,.073,0,.02]];
      const calfR=[[-.0396,.063,.073,0,.018],[-.0924,.064,.075,side*.002,.006],[-.1452,.064,.074,side*.003,-.002],[-.198,.058,.067,side*.002,-.002],[-.2376,.055,.064,0,.004],[-.2706,.058,.068,0,.009],[-.301,.057,.067,0,.01]];
      if(D243.on){thighR.forEach((r,i)=>{r[1]*=D243.KT[i];r[3]=r[3]*D243.KT[i]-thighInset(r[0]);});}   // D-243: the thigh a little slimmer, full at the knee as it was
      const longRings=[...ringsIn(T,root,legG,subdiv(thighR,1),{e:.82}),...ringsIn(T,root,knee,subdiv(calfR,1),{e:.82})];
      const long=loftRings(T,longRings,30,{caps:'first'});
      // CC-344 (J128): the leg stays under the belt's band and under the two mag pouches on its front (above: the band at
      // .721, the pouches at x +-.112, .697, z .135; lowerBody's frame, +LB), and out of the space in front of them, so no
      // cloth hangs over them: it folds there as the thigh comes up (running it went 18 mm into them, crouched 11: tcc344)
      const UNDER={k:0,gap:.002,boxes:[{x:[-.19,.19],y:[.696+LB,.8+LB],z:[-.13,.3]},
        ...[-1,1].map(sd=>({x:sd<0?[-.154,-.070]:[.070,.154],y:[.641+LB,.753+LB],z:[.116,.3]}))]};
      if(D243.on)for(const bx of UNDER.boxes)bx.x=bx.x.map((x)=>x*D243.KH);   // D-243: the belt and its pouches came in with the hips
      const frontSeam=geoIn(T,root,legG,new T.TubeGeometry(new T.CatmullRomCurve3(tP([[side*.011,.014,.114],[side*.044,-.033,.1135],[side*.071,-.069,.0945]]).map(q=>new T.Vector3(...q))),9,.0016,4,false));
      const legGeo=joinGeos(T,[long.geo,frontSeam]);
      const trousers=liveCloth(T,{gpu:gpuCloth,space:root,bones,geo:legGeo,weights:weigh(T,root,bones,legGeo,w4),material:trouserW,name:'live-trouser-leg',under:UNDER});
      dress.legLong.push(trousers.parent);
      // Shorts (CU-145: not rolled): the same leg cut 6 cm above the knee, with a stitched hem, over a bare knee and shin
      // and a sock, all worn the same way so the knee bends in skin.
      const shortR=[...thighR.slice(0,5),[tY(-.19),.084*(D243.on?.93:1),.093,-thighInset(tY(-.19)),.015],[tY(-.205),.085*(D243.on?.93:1),.094,-thighInset(tY(-.205)),.016]];
      const shorts=loftRings(T,ringsIn(T,root,legG,subdiv(shortR,1),{e:.82}),30,{caps:'first'});
      const stitch=[];for(let j=0;j<16;j++){const a=j/16*Math.PI*2,sn=Math.sin(a),c=Math.cos(a);stitch.push(new T.Vector3(.085*(D243.on?.93:1)*Math.sign(sn)*Math.abs(sn)**.82-thighInset(tY(-.2)),tY(-.2),.016+.094*Math.sign(c)*Math.abs(c)**.82));}
      const hemG=geoIn(T,root,legG,new T.TubeGeometry(new T.CatmullRomCurve3(stitch,true),32,.0024,5,true));
      const shortGeo=joinGeos(T,[shorts.geo,hemG]);
      const short=liveCloth(T,{gpu:gpuCloth,space:root,bones,geo:shortGeo,weights:weigh(T,root,bones,shortGeo,w4),material:trouserW,name:'live-shorts-leg'});
      const skinR=[[-.2235,.064,.07,0,.01],[-.2695,.06,.066,0,.012],[-.3156,.056,.062,0,.013],[-.355,.052,.058,0,.014]];
      if(D243.on)skinR.forEach((r,i)=>{r[1]*=[.93,.95,.98,1][i];r[3]-=thighInset(r[0]);});
      const shinR=[[-.0462,.05,.057,0,.01],[-.099,.058,.072,side*.003,-.006],[-.1452,.06,.077,side*.004,-.012],[-.198,.05,.063,0,-.005],[-.2508,.044,.051,0,.003],[-.2706,.043,.049,0,.004]];
      const skin=loftRings(T,[...ringsIn(T,root,legG,subdiv(skinR,1),{e:.9}),...ringsIn(T,root,knee,subdiv(shinR,1),{e:.9})],26,{caps:'first'});
      const bareLeg=liveCloth(T,{gpu:gpuCloth,space:root,bones,geo:skin.geo,weights:weigh(T,root,bones,skin.geo,w4),material:skinW,name:'live-bare-leg'});
      const sockGeo=geoIn(T,root,knee,rmesh(.088,.055,.1,sockMat,.02).geometry.clone(),0,-SHIN+.062,.004);   // CC-357: inside the slimmer boot
      liveCloth(T,{gpu:gpuCloth,space:root,bones,geo:sockGeo,weights:weigh(T,root,bones,sockGeo,w4),material:sockMat,name:'live-sock',holder:bareLeg.parent});
      dress.legShort.push(short.parent,bareLeg.parent);
    }
    if(D243.on)d243Squash(T,legG,legG.children.filter((c)=>c.isMesh&&!/^live/.test(c.name||'')&&c.name!=='thigh-pad-strap'),D243.KTS);   // D-243: pocket, holster band, seams on the slimmer thigh
    if(playerShape){
      mount.geometry.computeBoundingBox();
      const face=side>0?mount.geometry.boundingBox.max.x:mount.geometry.boundingBox.min.x;
      legG.userData.thighCarryFaceX=mount.position.x+face;
    }
    legG.userData.knee=knee;legG.userData.ankle=ankle;legG.userData.bootShaft=bootShaft;return legG;
  }
  if(D243.on){d243Squash(T,lowerBody,lowerBody.children.slice(),D243.KH);for(const r of pelvisR)r[1]*=D243.KH;}   // D-243: the belt and pelvis narrower with the hips
  const legLG=leg(-1),legRG=leg(1);
  {
    // CL-198 (Jerry: the trousers "natural in all ... movements"; CL-197 shaped the crotch). The seat was rigid on the
    // pelvis, so a crouch left it hanging between thighs that had gone forward, a sack under him. Its lower half is now
    // worn partly by each thigh (its own side more, the middle seam by both equally), so the seat and crotch go with the
    // legs as trousers do, and the waist stays on the pelvis.
    const bones=[lowerBody,legLG,legRG];
    const g=geoIn(T,root,lowerBody,form(subdiv(pelvisR,1),trouserW,'',28).geometry,0,HIP_Y,0);
    const w=(L)=>{const y=L[0][1]-HIP_Y,x=L[0][0],f=.78*smooth01(-.005,-.115,y),r=smooth01(-.06,.06,x);return [1-f,f*(1-r),f*r];};
    const seat=liveCloth(T,{gpu:gpuCloth,space:root,bones,geo:g,weights:weigh(T,root,bones,g,w),material:trouserW,name:'live-seat'});
    seat.userData.aoOwners=[lowerBody,legLG,legRG];
  }
  const torsoG=new T.Group();torsoG.position.y=TORSO_Y;root.add(torsoG);
  // A piece placed at height y (the old torso's marine heights) lands at torsoY(y), its height scaled to fit what it
  // spans there (a cylinder lying across keeps its length). Straps and seams map each point (mapPts).
  const mapPts=(pts)=>pts.map(([x,y,z])=>[x,torsoY(y),z]);
  const fitY=(mesh,y)=>{
    const g=mesh.geometry;
    if(!g||mesh.userData.absPts||g.type==='CylinderGeometry'){mesh.position.y=mesh.userData.absPts?0:torsoY(y)-TORSO_Y;return mesh;}
    if(!g.boundingBox)g.computeBoundingBox();
    const h0=g.boundingBox.min.y,h1=g.boundingBox.max.y;
    if(h1-h0<1e-4){mesh.position.y=torsoY(y)-TORSO_Y;return mesh;}
    const k=(torsoY(y+h1)-torsoY(y+h0))/(h1-h0);mesh.scale.y*=k;mesh.position.y=torsoY(y+h0)-TORSO_Y-h0*k;return mesh;
  };
  const at=(mesh,x,y,z,...angles)=>fitY(put(torsoG,mesh,x,y,z,...angles),y);
  strapMap=(pts)=>mapPts(pts).map(([x,y,z])=>[x,y-TORSO_Y,z]);strapMap.mapped=true;
  // CC-340 (Jerry, J125: the anatomy): the chest and shoulders a man's width. The chest was 51 cm across under arms set
  // 68 cm apart (a man's are about 36); now 42 cm at the top of the chest, falling to the shoulders as a trapezius does.
  // CC-357 b (J164 item 5, D-196; Jerry: "You see how square the torso is"): the shirt's body was a box (every ring a
  // squared ellipse, e .7, as deep in front as behind, the same at the waist as at the chest). Now the ribcage tapers to the
  // waist and the sections round off (e .86 at the chest to .94 at the waist), the chest is fullest at the pectorals and
  // the back at the shoulder blades, the small of the back curves in over the belt. Front and back depths never pass what
  // they were (the plate carrier's plates sit on them), nor the width across (the arms hang by it). Rows: [y (torso
  // frame), half width, depth in front, depth behind, squareness e (1 an ellipse, less a squarer section)].
  const SHIRT_OLD=subdiv([[.013,.15,.106],[.106,.156,.11],[.211,.176,.121,0,.003],[.304,.188,.126,0,.002],[.344,.178,.117],[.367,.142,.098],[.387,.076,.072]],2).map(([y,rx,rz,,cz])=>[y,rx,rz+cz,rz-cz,.7]);
  const SHIRT=subdiv(SHIRT_ROWS,2);
  put(torsoG,shirtForm(SHIRT,uniformW,'fitted-uniform',32),0,0,0);
  // GP-124: the shirt's shoulder stays with the chest and overlaps the moving
  // sleeve. This closes the notch beside the neck without enlarging the arm cap.
  for(const side of [-1,1]) {
    // CC-357 b (J164 item 6): front to back no deeper than the sleeve's cap over it (it was 16 cm deep, and stood out in
    // front of and behind the hanging arm as two knobs: the arm read as stuck on); the slope from the neck as it was.
    at(form(subdiv([[-.07,.046,.056,side*.004],[-.02,.06,.064,side*.008],
      [.025,.051,.056,-side*.013],[.055,.025,.04,-side*.043]],2),uniformW,'shirt-shoulder',24),side*.165,1.11,.006);
  }
  // CL-197 (Jerry, 2026-10-15: "fixing the blouse's collar"). There was no collar: a plain cylinder under the neck wrap, and
  // two loose boxes, with the ragged top of the shirt showing round them. This is a folded-down blouse collar, one
  // lofted band: a flat spread over the shoulders, a rounded fold, a stand that hugs the neck, higher at the back with a
  // V-notch at the front, closed underneath so nothing shows through. Built in torso space (y is marine height).
  {
    // D-243 (Jerry: "His collar looks dumb too"): it stood 3-7 cm off the neck as a stiff ring, centred 4 cm in front of
    // the neck. Now a soft turned-down collar ON the neck (centred on it, 6-8 mm of air), 1.5 cm of stand rolled over onto a
    // fold that lies down on the shoulders, open in a soft V at the throat. Rows: [y, half width, half depth, centre z],
    // round the head's neck at its size (NK: HEAD_SIZE / .73; the neck is the head's own surface).
    const NK=D243.on?D243.NK:1,NZ=.002,NX=.0435*NK,NR=.0455*NK+.005;
    const prof=D243.on?[[1.226,.115,.08,-.006],[1.243,.1,.086,NZ*.4],[1.252,NX+.028,NR+.025,NZ*.7],[1.262,NX+.022,NR+.021,NZ],[1.271,NX+.016,NR+.015,NZ],[1.2775,NX+.012,NR+.011,NZ],[1.279,NX+.0085,NR+.008,NZ],[1.2765,NX+.0065,NR+.006,NZ],[1.268,NX+.0065,NR+.006,NZ],[1.255,NX+.008,NR+.0075,NZ*.85],[1.236,.076,.066,NZ*.45]]:
      [[1.236,.148,.116,.004],[1.249,.127,.104,.004],[1.264,.104,.091,.004],[1.279,.089,.083,.004],[1.2885,.081,.0795,.004],[1.2925,.0775,.077,.004],[1.2885,.074,.0748,.004],[1.276,.0718,.0735,.004],[1.261,.0712,.073,.004],[1.243,.0712,.073,.004]];   // CC-340: round the new neck, at its new height
    const n=40,p=[],uv=[],ix=[],pts=subdivC(prof,1);
    for(let r=0;r<pts.length;r++){
      const [y,rx,rz,cz]=pts[r];
      for(let j=0;j<=n;j++){
        const a=-Math.PI+j/n*Math.PI*2,c=Math.cos(a),sn=Math.sin(a),af=Math.abs(a);
        // notch at the front (a = 0), a little lift at the back; the fold and the stand move, the spread over the shoulders does not
        const move=D243.on?Math.max(0,Math.min(1,(y-1.246)/.022)):Math.max(0,Math.min(1,(y-1.255)/.04));
        const dip=D243.on?-.017*Math.max(0,1-af/.75)**1.5*move+.005*Math.max(0,(af-2.2)/(Math.PI-2.2))*move:-.033*Math.max(0,1-af/.62)**1.6*move+.008*Math.max(0,(af-2.2)/(Math.PI-2.2))*move;
        const spread=1+(D243.on?.035:.05)*Math.max(0,1-af/.62)**2*move;   // the notch's lapels open outward
        p.push(rx*sn*spread,y+dip-TORSO_Y,cz+rz*c*spread);uv.push(j/n,y*3);
      }
    }
    const cols=n+1,rowsN=pts.length;
    for(let r=0;r<rowsN;r++){const q=(r+1)%rowsN;for(let j=0;j<n;j++){const a=r*cols+j,b=q*cols+j;ix.push(a,a+1,b,a+1,b+1,b);}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();weldRows(g,cols,rowsN);
    const mesh=new T.Mesh(g,uniformW);mesh.name='blouse-collar';mesh.castShadow=mesh.receiveShadow=true;torsoG.add(mesh);
  }
  for(const side of [-1,1]) {
    at(rmesh(.122,.092,.014,uniformW,.007),...rs(side*.106,1.011,.129));   // CC-357 b: reseated on the rounder chest (rs)
    at(rmesh(.126,.024,.018,uniformW,.006),...rs(side*.106,1.055,.132));
  }
  // CC-357 b: the placket follows the shirt's front down the middle (a straight bar, it stood 1-2 cm off the belly)
  {const pts=[];for(let k=0;k<=8;k++){const y=.78+k*.33/8;pts.push([0,y,shirtR(SHIRT,torsoY(y)-TORSO_Y,0,1)+.003]);}
   const m=strap(pts,.009,strapMat,.005);m.position.y=0;torsoG.add(m);}
  at(rmesh(.13,.025,.009,patchMat,.003),...rs(.116,1.105,.13));
  at(rmesh(.081,.009,.006,patchInk,.002),...rs(.116,1.105,.136));
  const b=(mesh,x,y,z)=>fitY(addGear('bareTorso',torsoG,mesh,x,y,z),y);
  for(const side of [-1,1]) {
    b(strap(rsPts([[0,.86,.135],[0,1.01,.145],[0,1.115,.136],[0,1.168,.096],[0,1.187,.015],[0,1.174,-.083],[0,1.105,-.138],[0,.88,-.138]],side*.123),.036,strapMat),side*.123,0,0);   // CC-340: on the narrower shoulder (CC-357 b: and the rounder shirt)
    b(rmesh(.091,.094,.04,pouchMat,.012),...rs(side*.108,.882,.16));
    b(rmesh(.094,.023,.042,strapMat,.007),...rs(side*.108,.921,.161));
  }
  b(rmesh(.28,.031,.019,strapMat,.007),...rs(0,.852,.138));
  b(rmesh(.033,.029,.016,buckleMat,.005),...rs(0,.852,.153));
  b(rmesh(.277,.03,.02,strapMat,.006),...rs(0,1.11,-.139));
  const v=(mesh,x,y,z,...angles)=>fitY(addGear('vest',torsoG,mesh,x,y,z,...angles),y);
  const radioPart=(mesh)=>{mesh.userData.vmEyeRadio=true;return mesh;};
  const torsoSeam=(points,mat,key,r=.0016)=>{const mesh=seam(torsoG,mapPts(points).map(([x,y,z])=>[x,y-TORSO_Y,z]),mat,r);if(key)gearParts[key].push(mesh);return mesh;};
  const frontCarrier=v(carrierPlate(.35,.335,.034,carrierW,true),0,.973,.151);
  v(carrierPlate(.35,.345,.032,carrierW),0,.98,-.149);
  for(const side of [-1,1]) {
    v(rmesh(.026,.135,.22,carrierW,.01),side*.169,.88,0);   // CC-340: against the narrower waist
    const anchorInset=playerShape ? side*.033 : 0;
    v(strap([[-anchorInset,1.075,.183],[-anchorInset,1.13,.17],[-anchorInset*.30,1.172+(D243.on?.023:0),.119],[0,1.195+(D243.on?.025:0),.02],[0,1.176+(D243.on?.023:0),-.101],[0,1.12,-.177]],.052,carrierW,.012),side*.12,0,0);   // CC-340: on the narrower shoulder
    v(rmesh(.036,.026,.017,buckleMat,.005),side*.12-anchorInset,1.123,.181);
    v(rmesh(.018,.013,.02,strapMat,.002),side*.12-anchorInset,1.123,.183);
    // Thin webbing sits on the .182 carrier side, clear of the resting sleeve.
    for(let row=0;row<3;row++)v(rmesh(.001,.015,.2,webMat,.00025),side*.1825,.844+row*.04,0);
  }
  if(playerShape){
    // Sew the edging onto the face of the fitted panel, following the six corners of its front loop.
    const face=frontCarrier.geometry.attributes.position, edging=[];
    frontCarrier.updateMatrix();
    for(const i of [0,5,4,3,2,1]){
      const pin=new T.Vector3().fromBufferAttribute(face,18+i);
      pin.x*=.88;pin.y*=i<2?.62:.87;pin.z+=.0008;pin.applyMatrix4(frontCarrier.matrix);
      const prev=edging[edging.length-1];
      if(prev)edging.push(new T.Vector3(...prev).lerp(pin,.5).toArray());
      edging.push(pin.toArray());
    }
    gearParts.vest.push(seam(torsoG,edging,carrierW,.002));
  }else torsoSeam([[-.151,.876,.171],[-.154,1.055,.171],[-.10,1.126,.171],[.10,1.126,.171],[.154,1.055,.171],[.151,.876,.171]],carrierW,'vest',.002);
  // CC-341 (J128): the carrier's outline round the torso, for carrierClearance below: the plates (.35 wide, a .008 bevel
  // grown outside, .17 off the middle front and back) and the cummerbund's side panels (outer face .182), y as fitted.
  torsoG.userData.carrierShape={rx:.183,cz:(.173-.170)/2,rz:(.173+.170)/2,y:[torsoY(.8055)-TORSO_Y,torsoY(1.1405)-TORSO_Y],frontZ:.226};
  for(let row=0;row<4;row++){
    const y=.836+row*.054;
    v(rmesh(row===3?.25:.31,.016,.008,webMat,.003),0,y,.174);   // CC-341: the top row stops short of the plate's corner, under the support arm
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
  // CC-341 (J128): the radio and its push-to-talk came in from the plate's top outer corner (x -.158), where the support
  // arm's sleeve crosses the chest to the grip in every hold (23-30 mm through it); now beside the admin pouch, the
  // push-to-talk between them, the antenna leaning out over the shoulder. The ID patch moved to the right chest.
  const RX=-.07;
  radioPart(v(rmesh(.06,.112,.032,nvgMat,.009),RX,1.055,.19));
  radioPart(v(rmesh(.045,.015,.006,strapMat,.002),RX,1.081,.209));
  for(let k=0;k<4;k++)radioPart(v(rmesh(.026,.003,.005,webMat,.001),RX,1.068-k*.008,.21));
  for(const x of[RX-.015,RX+.009])radioPart(v(cyl(.006,.006,.014,nvgMat,8),x,1.117,.19));
  radioPart(torsoSeam([[RX+.015,1.116,.19],[RX+.024,1.15,.16],[-.034,1.16,.15],[-.028,1.14,.17],[-.027,1.122,.186]],nvgMat,'vest',.003));
  radioPart(v(rmesh(.022,.035,.012,nvgMat,.004),-.027,1.105,.189));
  const antenna=radioPart(v(cyl(.0035,.0035,.17,nvgMat,5),RX-.015,1.185,.19));antenna.rotation.z=.42;antenna.position.x-=.035;
  v(rmesh(.092,.025,.019,webMat,.006),0,1.138,-.179);
  // CC-351 (Jerry, D-182: "Remove it"; no logos or markings on models): the flag patch is gone, from the shirt's chest and from
  // the carrier's (CC-341 had moved that one up by the radio, under his shoulder strap); nothing in its place.
  // Lower-profile pack hugs the back plate; shoulder webbing follows the top.
  const packBody=at(form([[-.148,.09,.04],[-.13,.122,.058],[-.10,.127,.06],[.065,.133,.063],[.112,.124,.06],[.145,.104,.05],[.159,.058,.029],[.162,0,0]],packW,'soft-pack',16),0,.992,-.227);
  if (playerShape) {
    const shirtPack=packBody.clone();
    shirtPack.name='soft-pack-over-shirt';
    shirtPack.geometry=packBody.geometry.clone();
    torsoG.add(shirtPack);
    gearParts.vest.push(packBody);
    gearParts.bareTorso.push(shirtPack);
    // The rings of the pack and blouse are in torso space here, before the player build
    // is baked. Only their front half contacts the layer on the player's back.
    for (const pack of [shirtPack,packBody]) {
      const geo=pack.geometry, p=geo.attributes.position, uv=geo.attributes.uv;
      for (let i=0;i<p.count;i++) {
        const x=pack.position.x+p.getX(i)*pack.scale.x;
        const y=pack.position.y+p.getY(i)*pack.scale.y;
        const z=pack.position.z+p.getZ(i)*pack.scale.z;
        const forward=Math.cos(uv.getX(i)*2*Math.PI);
        if (forward<=0) continue;
        let row=1;
        while(row<SHIRT.length-1 && y>SHIRT[row][0])row++;
        const a=SHIRT[row-1], b=SHIRT[row];
        const t=Math.max(0,Math.min(1,(y-a[0])/(b[0]-a[0])));
        const rx=a[1]+t*(b[1]-a[1]), rb=a[3]+t*(b[3]-a[3]), e=a[4]+t*(b[4]-a[4]);
        const back=-rb*Math.max(0,1-(Math.abs(x)/rx)**(2/e))**(e/2);
        const contact=pack===shirtPack ? back-.008 : Math.min(z,-.1725);
        const w=smooth01(.01,.72,forward)*smooth01(.105,.15,y)*(1-smooth01(.345,.38,y));
        p.setZ(i,p.getZ(i)+(contact-z)*w/pack.scale.z);
      }
      geo.computeVertexNormals();weldRows(geo,17,8);geo.computeBoundingSphere();geo.computeBoundingBox();
    }
  }
  at(form([[-.053,.062,.01],[-.04,.091,.022],[.027,.089,.025],[.051,.071,.008]],packTrimW),0,.96,-.286);
  // Flapped upper pocket and stitched edges sit inside the established pack
  // envelope, so the holsters and weapon sling anchors keep their fit.
  at(plate(.154,.074,.022,packTrimW),0,1.087,-.286,0,Math.PI,0);
  at(plate(.153,.029,.008,packW),0,1.112,-.301,0,Math.PI,0);
  at(rmesh(.021,.027,.008,strapMat,.002),0,1.087,-.304);
  at(rmesh(.031,.017,.009,buckleMat,.002),0,1.074,-.307);
  torsoSeam([[-.081,.92,-.313],[-.083,.975,-.313],[-.064,1.003,-.31],[.064,1.003,-.31],[.083,.975,-.313],[.081,.92,-.313]],packW,null,.0017);
  const zipPoints=[[-.111,.87,-.279],[-.119,1.06,-.276],[-.096,1.117,-.275],[0,1.143,-.26],[.096,1.117,-.275],[.119,1.06,-.276],[.111,.87,-.279]].map(([x,y,z])=>new T.Vector3(x,torsoY(y)-TORSO_Y,z));
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
      const p=(x,y,z)=>[side*(x-(playerShape ? (armored?.032:.030)*smooth01(.025,.12,z)*smooth01(.95,1.05,y):0)),y,z];
      const join=p(armored?(playerShape?.118:.128):.14,.995,armored?.233:.15);   // tcc341 (J128): armoured, the buckle 2 cm in from the plate's corner, clear of the support arm's sleeve
      const fit=(pts)=>armored?pts:rsPts(pts,0);   // CC-357 b: the shirt's straps onto the rounder shirt (over the carrier: as they were)
      attach(strap(fit([p(.1,1.11,-.263),p(.128,1.158+(D243.on?.014:0),-.13),p(.13,1.19+(D243.on?.024:0),-.03),
        p(.129,1.188+(D243.on?.024:0),.043),p(.131,1.153+(D243.on?.024:0),.119),p(.136,1.112,armored?.18:.139),
        p(armored?(playerShape?.128:.134):.144,1.055,armored?.224:.149),join]),.033,packW,.008),0,0,0);
      // CC-340: round the narrower ribs (bare: the shirt; armoured: just outside the side plates)
      const rx=armored?[.168,.19,.192,.17]:[.152,.162,.162,.15];
      attach(strap(fit([join,p(rx[0],.936,armored?.228:.15),p(rx[1],.891,armored?.13:.107),
        p(rx[2],.868,.015),p(rx[3],.868,-.154),p(.112,.89,-.268)]),.019,strapMat,.006),0,0,0);
      const jn=fit([join])[0];attach(rmesh(.041,.024,.013,buckleMat,.004),jn[0],jn[1],jn[2]+.006);
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
  // D-243: the chest, the carrier, the pack and every strap on them narrower about his middle (the collar is built for the neck)
  if(D243.on){d243Squash(T,torsoG,torsoG.children.slice(),D243.KX,D243.KZ,(n)=>n==='blouse-collar');const cs=torsoG.userData.carrierShape;if(cs){cs.rx*=D243.KX;cs.rz*=D243.KZ;cs.cz*=D243.KZ;cs.frontZ*=D243.KZ;}}
  torsoG.userData.d243=D243.on?{KX:D243.KX,KZ:D243.KZ,KH:D243.KH,KTS:D243.KTS}:null;   // D-243: the carry rig (index.html) places its parts on the slimmer body
  const HAND_SCALE=1.18;   // GB-169
  // CC-340 (J125): the shoulder joints 47 cm apart (were 68: a man's are about 36, his kit and build add the rest) and
  // the arm a man's girth in his blouse: the sleeve's rings at ARM_GIRTH of what they were above the forearm's end, the
  // wrist (where the hand and its glove, Claude's, take over) as it was.
  const SHOULDER_X=.235*(D243.on?D243.KX:1), ARM_GIRTH=.84, FORE_GIRTH=.87, AK=D243.on?D243.ARM:1;   // D-243: .47 -> .38 apart; AK the slimmer upper arm   // (and SHOULDER_Y, above)
  // CC-357 b (J164 item 8): the elbow's skin blend (+- m about the joint; was .045), its point behind and crease in front (m),
  // and the cloth ball inside it (keeps the outside of the elbow full as it closes; was .0565 x ARM_GIRTH = .0475)
  const ELBOW_BLEND=.02, ELBOW_BACK=.012, ELBOW_POINT=.009, ELBOW_CREASE=.003, ELBOW_BALL=.039*AK;
  torsoG.userData.elbowRadius=.0595*ARM_GIRTH*AK;   // CC-341: the sleeve's widest at the elbow (capRings at -.27), for carrierClearance
  torsoG.userData.upperArmRadius=.0645*ARM_GIRTH*AK;   // and half way down the upper arm (capRings at -.175)
  function arm(side) {
    const armG=new T.Group();armG.position.set(side*SHOULDER_X,SHOULDER_Y-TORSO_Y,.02);torsoG.add(armG);
    // Smaller, inward-sloping deltoid around the unchanged animation pivot.
    // CL-197 (Jerry, 2026-10-15: "smooth out the chopped shoulders"): the same sleeve through a smooth ring curve (the old
    // table had a bump at the elbow pad and 16 sides). Sleeves rolled get a short cap that ends in a thick roll above the
    // elbow, with the bare arm, a skin elbow and the forearm below, so nothing has to bend through cloth.
    const capRings=[[-.286,.054,.057],[-.27,.0565,.0595],[-.25,.0585,.062],[-.23,.0605,.0645],[-.207,.0625,.067,-side*.005,.002],[-.175,.0645,.0685,-side*.008,.002],[-.09,.068,.073,-side*.022],[-.01,.075,.078,-side*.027,-.003],[.045,.069,.07,-side*.042,-.004],[.071,.043,.05,-side*.061]];
    put(armG,rmesh(.016,.08,.068*AK,uniformW,.006),side*.052*AK,-.1,.002);   // CC-357 b: out onto the deltoid's fuller side
    put(armG,plate(.068*AK,.027,.008,uniformW),side*.06*AK,-.056,.002,0,side*Math.PI/2,0);
    // Follow the sleeve's changing center as it slopes into the shoulder.
    seam(armG,[[side*.0335*AK,-.09,-.0385*AK],[side*.0405*AK,-.175,-.0338*AK],[side*.0467*AK,-.207,-.0365*AK]],uniformW,.0012);
    // CC-351 (Jerry, D-182: "Remove it"; no logos or markings on models): no patch on either shoulder (GB-123's PGB unit
    // patch on the left, the placeholder on the right): the sleeve's plain raised block only.
    addGear('pads',armG,plate(.11*AK,.104,.023,padW),0,-.261,-.057*AK,0,Math.PI,0);
    addGear('pads',armG,plate(.09*AK,.082,.019,plateW),0,-.261,-.076*AK+.002,0,Math.PI,0);
    const elbowG=new T.Group();elbowG.position.set(0,-.28,0);elbowG.rotation.set(side<0?-.35:-.2,0,0);armG.add(elbowG);
    const ox=side<0?.02:-.01,oz=side<0?.04:.03;
    // CC-357 b (J164 item 8): the elbow's point and crease, on a lofted sleeve or bare arm (geo, in root at the bind
    // pose) before it is weighed: the olecranon, a rounded point behind the joint (it rides on the forearm: the blend
    // gives it to the elbow's bone as it bends), and a soft crease in front. Each vertex moves out (or in) from the
    // elbow's axis by how far it lies behind (or in front of) it and how near the joint; nothing past ~3 cm from it moves.
    const elbowShape=(geo,k,cols)=>{
      const P=geo.attributes.position,toRoot=relMatrix(T,root,elbowG,new T.Matrix4()),toElbow=relMatrix(T,root,elbowG,new T.Matrix4()).invert(),v=new T.Vector3();
      for(let i=0;i<P.count;i++){
        v.fromBufferAttribute(P,i).applyMatrix4(toElbow);
        const r=Math.hypot(v.x,v.z);if(r<1e-6)continue;
        const dx=v.x/r,dz=v.z/r,back=Math.max(0,-dz)**4,front=Math.max(0,dz)**3;
        const d=k*(ELBOW_POINT*back*Math.exp(-(((v.y+.006)/.015)**2))-ELBOW_CREASE*front*Math.exp(-((v.y/.011)**2)));
        if(Math.abs(d)<1e-6)continue;
        v.x+=dx*d;v.z+=dz*d;v.applyMatrix4(toRoot);P.setXYZ(i,v.x,v.y,v.z);
      }
      P.needsUpdate=true;geo.computeVertexNormals();
      // one normal on the loft's seam column again (loftRings' weld)
      const rows=Math.floor(P.count/(cols+1)),N2=geo.attributes.normal;
      if(N2)for(let r=0;r<rows;r++){const a=r*(cols+1),b=a+cols,x=N2.getX(a)+N2.getX(b),y=N2.getY(a)+N2.getY(b),z=N2.getZ(a)+N2.getZ(b),l=Math.hypot(x,y,z)||1;N2.setXYZ(a,x/l,y/l,z/l);N2.setXYZ(b,x/l,y/l,z/l);}
    };
    // CC-341 (J128): the glove's cuff (Claude's hand) is centred on the wrist's pivot, 2 cm in front of the sleeve's line,
    // and the wrist rests turned 66 degrees, so the flat cuff stands 7 cm deep there and its front came 4-6 mm out through
    // the sleeve's hem: the sleeve's end is centred on the wrist and a little rounder, over it.
    const CUFF_FWD=.02, cuffY=D243.on?-.195:-.211;
    const sleeve=part(elbowG,dress.sleeveDown),bare=part(elbowG,dress.sleeveRolled);
    const joint=(mat,r)=>{const m=new T.Mesh(new T.SphereGeometry(1,22,16),mat);m.scale.set(r,r,r*1.02);m.castShadow=m.receiveShadow=true;return m;};
    // CC-357 b (J164 item 8): the ball that keeps the outside of the bent elbow full is the elbow's point now: worn by the
    // forearm (the olecranon is the ulna's), longer behind than across, so a bent arm comes to a point there instead of
    // a round knob on the upper arm (it was a .0475 ball on the upper arm's end). Inside the sleeve when the arm is straight.
    const olecranon=(mat,k)=>{const m=joint(mat,1);m.scale.set(ELBOW_BALL*k,ELBOW_BALL*k,.041*k);return m;};
    put(sleeve,olecranon(uniformW,1),0,-.002,-.004);
    put(bare,olecranon(skinW,.86),0,-.002,-.004);   // the skin elbow (was a .040 ball on the elbow's pivot)
    // CL-198 (Jerry, 2026-10-15: the blouse "natural in all ... movements"). The sleeve was a cap on the shoulder and a
    // separate forearm tube on the elbow, with a ball between: bending the arm showed the joins. It is now one sleeve from
    // the top of the shoulder to the cuff, worn by the chest (at the top of the shoulder, as CL-188's live cap was), the
    // upper arm and the forearm (liveCloth, studio/marine-cloth.js), so it bends at the elbow as cloth does. The ball stays
    // inside it to keep the outside of the elbow full when it closes. Sleeves rolled: the same sleeve cut above the elbow
    // and rolled into a thick band, and the bare arm below it is one surface of skin from under the roll to the wrist
    // (ending exactly where ChatGPT's wrist bridge, ui/marine-kit-fit.js, takes it on to the hand).
    let foreSeam=null;   // CC-357 c: the forearm's seam, put on the sleeve's own rings (below)
    {
      const bones=[torsoG,armG,elbowG],hi=.07,lo=-.12;
      // CC-357 b (J164 item 8, D-196; Jerry: "Check out the weird bendy noodle look on the arms"): the elbow's blend was
      // +-4.5 cm (smooth01(.045,-.045)), so a bent arm curved along 9 cm like a hose; it is +-2 cm now, so the arm bends AT
      // the elbow. Behind the joint the blend sits up to ELBOW_BACK higher, so the elbow's point is the forearm's (it keeps
      // its shape as the arm bends instead of averaging into a dent). The shoulder's blend (hi/lo) and every bone, pivot
      // and rest turn are as they were.
      const w3=(L)=>{
        const y=L[1][1],x=L[1][0]*side,t=Math.max(0,Math.min(1,(hi-y)/(hi-lo))),out=Math.max(0,Math.min(1,(x-.03)/.05))*.35;
        const a=Math.min(1,t*t*(3-2*t)+out*(1-t)),r=Math.hypot(L[2][0],L[2][2])||1,up=ELBOW_BACK*Math.max(0,-L[2][2]/r)**2,e=smooth01(ELBOW_BLEND+up,-ELBOW_BLEND+up,L[2][1]);
        return [(1-a)*(1-e),a*(1-e),e];
      };
      // CC-357 b (J164 items 6-8; Jerry: "the shoulder is not correctly connected ... the upper arm is nearly the same girth
      // as the forearm"): the sleeve's rings, in their final sizes (ARM_GIRTH/FORE_GIRTH were folded in: the top two rings,
      // sewn into the chest, and the last three, round the cuff and the glove, are exactly as they were). A deltoid caps the
      // shoulder (fullest outside, 2-5 cm under the joint) and narrows into the arm at its insertion, a third of the way
      // down; the upper arm is deeper than wide there (biceps in front, triceps behind) and tapers to the elbow, the
      // narrowest place; the forearm is full just below the elbow (wider across than deep) and tapers to the wrist.
      // Was: upper arm 11.3 x 12.2 cm at the deltoid, 10.7 x 11.3 half way, 9.7 x 10.3 at the elbow; forearm 11.5 x 12.2.
      const upper=[[.036,.0361,.048,-side*.0512],[.022,.058,.066,-side*.0353,-.003],[-.018,.068,.072,-side*.02,-.002],[-.055,.0665,.068,-side*.011,0],[-.1,.06,.064,-side*.002,.003],[-.145,.0565,.0635,0,.004],[-.185,.0535,.0605,0,.004],[-.22,.0502,.0558,0,.002],[-.25,.0478,.0515],[-.28,.0465,.049,0,-.001]];
      const fore=[[-.025,.052,.049,ox*.15,oz*.1],[-.05,.0545,.0505,ox*.35,oz*.3],[-.08,.053,.049,ox*.6,oz*.5],[-.105,.0505,.047,ox*.8,oz*.7],[-.135,.0475,.0465,ox*.92,oz*.86],[-.165,.047,.049,ox,oz+CUFF_FWD*.6],[-.2,.051,.042,ox,oz+CUFF_FWD],[-.226,.05,.041,ox,oz+CUFF_FWD]];   // tcc341: 8 mm wider across at the end, over the cuff's outer edge (4.5 mm through)
      if(D243.on){upper.forEach((r,i)=>{if(!i)return;const k=i===1?(1+AK)/2:AK;r[1]*=k;r[2]*=k;if(r[3])r[3]*=k;});fore.forEach((r,i)=>{const k=D243.FORE[i];r[1]*=k;r[2]*=k;});fore[5][1]=.046;fore[5][2]=.046;fore[6][0]=-.187;fore[6][1]=.0455;fore[6][2]=.0445;fore[7][0]=-.205;fore[7][1]=.0445;fore[7][2]=.044;}   // D-243: slimmer upper arm and forearm; the top ring (into the chest) and the cuff as they were
      const down=loftRings(T,[...ringsIn(T,root,armG,subdiv(upper,1),{e:.72}),...ringsIn(T,root,elbowG,subdiv(fore,1),{e:.72})],30,{caps:'first'});
      // CC-357 c (Claude 6's FIX on b, ChatGPT's trace): the seam down the forearm kept the old forearm's numbers, so on
      // the slimmer sleeve its top stood 7-8 mm off the cloth and it read as a cord in the air in the aims. It is put on
      // the rings it lies on now: at each height the sleeve's own squared ellipse (e .72, between the lofted rings by
      // straight lines, as the loft is) at the same angle round the arm as before (from the front toward his outside),
      // half a millimetre proud; its lower end goes into the cloth 1.4 mm as it always did. Rigid on the forearm there
      // (the sleeve is all forearm below the elbow's blend), so it stays on in every pose.
      {
        const FR=subdiv(fore,1);
        foreSeam=[[-.17,72.3,-.0014],[-.15,68.4,.0005],[-.135,65.5,.0005],[-.105,59.7,.0005],[-.075,59.9,.0005]].map(([y,deg,off])=>{
          let i=0;while(i<FR.length-2&&FR[i+1][0]>y)i++;
          const A=FR[i],B=FR[i+1],t=(A[0]-y)/(A[0]-B[0]),L=(k)=>A[k]+(B[k]-A[k])*t,a=deg*Math.PI/180;
          const u=Math.sin(a)**.72*L(1),w=Math.cos(a)**.72*L(2),k=1+off/Math.hypot(u,w);
          return [L(3)+side*u*k,y,L(4)+w*k];
        });
      }
      elbowShape(down.geo,1,30);
      const seamGeo=(pts)=>geoIn(T,root,armG,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(q=>new T.Vector3(...q))),12,.0012,4,false));
      const capSeamG=seamGeo([[side*.0172,.022,.0328],[side*.0344*AK,-.018,.0379*AK],[side*.0332*AK,-.09,.0378*AK]]);
      const downGeo=joinGeos(T,[down.geo,capSeamG]);
      const sleeveLive=liveCloth(T,{gpu:gpuCloth,space:root,bones,geo:downGeo,weights:weigh(T,root,bones,downGeo,w3),material:uniformW,name:'live-sleeve'});
      dress.sleeveDown.push(sleeveLive.parent);
      // rolled: the sleeve to 7.5 cm above the elbow, the roll (a thick fold), then skin
      const shortR=[...upper.slice(0,6),[-.195,.0525*AK,.0595*AK,0,.004]];   // CC-357 b: the fuller upper arm under the roll
      const shortL=loftRings(T,ringsIn(T,root,armG,subdiv(shortR,1),{e:.72}),30,{caps:'first'});
      const roll=geoIn(T,root,armG,new T.TorusGeometry(.0545*AK,.0135,10,36),0,-.203,.004,Math.PI/2,0,0,1,1,1.1);
      const rollSeam=seamGeo([[side*.0172,.022,.0328],[side*.0344*AK,-.018,.0379*AK],[side*.0332*AK,-.09,.0378*AK]]);
      const rolledGeo=joinGeos(T,[shortL.geo,roll,rollSeam]);
      const rolled=liveCloth(T,{gpu:gpuCloth,space:root,bones,geo:rolledGeo,weights:weigh(T,root,bones,rolledGeo,w3),material:uniformW,name:'live-sleeve-rolled'});
      // CC-357 b: the bare arm the same way: the biceps' end under the roll, a narrower elbow, the forearm full below it;
      // its last two rings (into ChatGPT's wrist bridge, ui/marine-kit-fit.js) exactly as they were
      const armSkin=[[-.19,.0465,.0505,0,.004],[-.235,.0432,.0455,0,.002],[-.28,.041,.0425]];
      const foreSkin=[[-.03,.0465,.0435,ox*.05,oz*.04],[-.065,.0485,.045,ox*.3,oz*.25],[-.105,.0455,.0428,ox*.8,oz*.7],[-.145,.0425*.95,.0445*.95,ox*.95,oz*.93],[-.18,.037,.036,ox,oz]];
      if(D243.on){armSkin.forEach((r)=>{r[1]*=AK;r[2]*=AK;});foreSkin.forEach((r,i)=>{const k=D243.FORE[i];r[1]*=k;r[2]*=k;});}   // D-243
      const skinRings=[...ringsIn(T,root,armG,subdiv(armSkin,1),{e:.88}),...ringsIn(T,root,elbowG,subdiv(foreSkin,1),{e:.88})];
      const skinL=loftRings(T,skinRings,24,{caps:'first'});
      elbowShape(skinL.geo,.8,24);
      liveCloth(T,{gpu:gpuCloth,space:root,bones,geo:skinL.geo,weights:weigh(T,root,bones,skinL.geo,w3),material:skinW,name:'live-bare-arm',holder:rolled.parent});
      dress.sleeveRolled.push(rolled.parent);
    }
    if(!D243.on)put(sleeve,rmesh(.104,.022,.086,uniformW,.008),ox,cuffY,oz+CUFF_FWD);   // tcc341: as wide as the sleeve's end   // GB-169: the cuff closes round the slimmer wrist (CC-341: round the glove's)
    put(sleeve,rmesh(.04,.016,.007,uniformW,.003),ox+side*.02,cuffY,oz+(D243.on?.039:.045)+CUFF_FWD);
    put(sleeve,cyl(.004,.004,.003,beltW,6),ox+side*.031,cuffY,oz+(D243.on?.044:.05)+CUFF_FWD,Math.PI/2);
    seam(sleeve,foreSeam,uniformW,.0012);   // CC-357 c: on the slimmer forearm (above); was [[ox+side*.0445,-.17,oz+.0332],[ox*.8+side*.0497,-.105,oz*.7+.037],[ox*.55+side*.0528,-.075,oz*.5+.038]]
    const gz=side<0?.08:.07;
    // CU-100: the hand turns at the wrist (the top of the palm, on the forearm), so a grip can lie in the fist's channel
    // whichever way the forearm comes to it. At rest the wrist is identity: the hand is exactly where it was built.
    // userData.grip is that channel's middle (elbow space, wrist at rest): where a gun's grip or forend goes through.
    const wrist=new T.Group();wrist.name='wrist';wrist.position.set(ox,-.214,(oz+gz)/2);elbowG.add(wrist);
    wrist.userData.grip=new T.Vector3(ox,-.271,gz+.008);   // CL-334 e: the grip channel 22 mm short of the knuckles, as the longer palm has it (was -.262)
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
    if(D243.on)(dress.wristBridges ||= []).push(transition);else bare.add(transition);
    if(side<0)put(elbowG,rmesh(.041,.025,.027,nvgMat,.006),ox,-.195,oz+.055);
    elbowG.userData.wrist=wrist;
    return {armG,elbowG,wrist};
  }
  const {armG:armLG,elbowG:elbowLG,wrist:wristLG}=arm(-1),{armG:armRG,elbowG:elbowRG,wrist:wristRG}=arm(1);
  armLG.rotation.set(-.85,.15,.55);armRG.rotation.set(-1.05,-.05,-.25);
  const gripL=new T.Group();gripL.position.set(.02,-.27,.13);gripL.rotation.set(1.23359,-.24103,-.08361);elbowLG.add(gripL);
  const gripR=new T.Group();gripR.position.set(-.01,-.26,.12);elbowRG.add(gripR);
  const weaponMount=new T.Group();weaponMount.position.set(.12826,.15981,-.10022);weaponMount.rotation.set(1.23359,.24103,.08361);gripR.add(weaponMount);
  // CC-364 (D-216 lever 3): on his first draw, the live cloth's pieces that share a material and the face's unlit parts
  // drawn as one mesh each (studio/marine-cloth.js armLiveMerge; the same picture, fewer draws). ?livemerge=0: off.
  if(gpuCloth)armLiveMerge(T,root,[()=>mergeFaceFeatures(T,root)]);
  return {torsoPivotY:TORSO_Y,hipY:HIP_Y,lowerBody,hip,hipGrip,gearParts,legLG,legRG,torsoG,armLG,armRG,elbowLG,elbowRG,wristLG,wristRG,gripL,gripR,weaponMount,patches};
}

// CC-341 (J128, D-140; for CB-291's third-person arm IK, Claude 2): with the plate carrier on, the region the elbow's point
// must stay out of, so the sleeve never passes through the carrier's side (the cummerbund) or its plates' edges. null when
// the carrier is off. Torso space (ud.torsoG's own frame, the body's units: +y up, +z forward). Per arm (r: armRG's side,
// x > 0; l: armLG's, x < 0; each side value is the sign of x): an ellipse round the torso, centre [0, cz], radii [rx, rz], over
// y [y0, y1], and the margin to keep the elbow's point outside it: the sleeve's radius at the elbow plus 3 mm of cloth.
// The IK keeps the elbow at least `margin` outside the ellipse (choose the pole, lift the swing) before it reaches, so the
// hands stay on the gun. The same numbers the carrier is built from (buildMarineBody), so they move with it.
export function carrierClearance(ud){
  const t=ud&&ud.torsoG,sh=t&&t.userData.carrierShape,gp=ud&&ud.gearParts;
  if(!sh||!gp||!(gp.vest||[]).some((m)=>m.visible))return null;
  const margin=(t.userData.elbowRadius||.05)+.003;
  // CC-341 (a), CLAUDE DIRECTOR 11 Nov: the upper arm's mid-point too (half way from the shoulder to the elbow): its sleeve
  // must stay off the carrier's front, pouches included (frontZ, their foremost face), by its radius there, 3 mm of cloth
  // and 1 cm of air, when the arm crosses the chest to a long gun's grip.
  const mid={t:.5,margin:(t.userData.upperArmRadius||.054)+.013,frontZ:sh.frontZ||.226};
  const one=(side)=>({side,centre:[0,sh.cz],radii:[sh.rx,sh.rz],y:sh.y.slice(),margin,upperArm:{...mid}});
  return {r:one(1),l:one(-1)};
}
// The same test the IK needs, for the checks and the review: how far (body units) a torso-space point lies inside the
// ellipse grown by the margin (0 when it is clear or outside the y range).
export function carrierIntrusion(c,p){
  if(!c||p.y<c.y[0]||p.y>c.y[1])return 0;
  const ax=c.radii[0]+c.margin,az=c.radii[1]+c.margin,dx=p.x-c.centre[0],dz=p.z-c.centre[1],k=Math.hypot(dx/ax,dz/az);
  return k>=1?0:(1-k)*Math.min(ax,az);
}
