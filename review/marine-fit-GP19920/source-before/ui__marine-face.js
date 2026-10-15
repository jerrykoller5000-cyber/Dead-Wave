// GP-105. Head-local surfaces; the existing rig and wardrobe own their materials.
// Rings run bottom to top. Front is +z. A shared vertex grid keeps cloth and skin
// softly shaded without adding an asset loader, texture or per-frame work.
function surface(T, rings, {opening = false, frontOnly = false, wrap = false, cloth = false} = {}) {
  const segments = 32, positions = [], uv = [], indices = [];
  for (let r = 0; r < rings.length; r++) {
    const [y, width, front, back] = rings[r];
    for (let j = 0; j <= segments; j++) {
      const a = -Math.PI + j / segments * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      let yy = y;
      if (wrap && r === rings.length - 1) yy = 1.355 + .046 * Math.max(0, c) ** 5;
      if (frontOnly && r === rings.length - 1) yy += .05 * s * s;
      if (opening && r === 4 && c > 0) yy += .015 * c ** 8 + .01 * s ** 4;
      if (opening && r === 5 && c > 0) yy += .019 * c;
      let x = width * s, z = c >= 0 ? front * c ** .55 : -back * (-c) ** .8;
      if (cloth) {
        // Shallow tension folds tuck beneath the nose and run toward the ears.
        // Keep the top edge and collar fixed so existing eyewear still clears it.
        const edgeWeight = Math.sin(r / (rings.length - 1) * Math.PI) ** 2;
        const a1 = (y - (1.274 + .016 * Math.abs(s))) / .013;
        const a2 = (y - (1.312 + .019 * Math.abs(s))) / .011;
        const fold = edgeWeight * (.0034 * Math.exp(-a1*a1) - .0020 * Math.exp(-a2*a2)) * (.30 + .70 * Math.max(0,c));
        x += s * fold; z += c * fold;
      }
      positions.push(x, yy - 1.22, z);
      uv.push(j / segments, (y - 1.2) * 3);
    }
  }
  for (let r = 0; r < rings.length - 1; r++) for (let j = 0; j < segments; j++) {
    const a = -Math.PI + (j + .5) / segments * Math.PI * 2;
    if (frontOnly && Math.abs(a) > Math.PI * .46) continue;
    if (opening && r === 4 && Math.abs(a) < Math.PI / 4) continue;
    const p = r * (segments + 1) + j, q = p + segments + 1;
    indices.push(p, p + 1, q, p + 1, q + 1, q);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
  return g;
}

const HEAD_RINGS = [
    [1.275,.035,.09,.048], [1.283,.052,.110,.060], [1.291,.065,.127,.07],
    [1.309,.084,.141,.083], [1.323,.094,.149,.09], [1.343,.106,.151,.101],
    [1.365,.115,.152,.111], [1.383,.122,.151,.118],
    [1.402,.124,.151,.122], [1.428,.125,.150,.124], [1.455,.125,.148,.125],
    [1.481,.122,.140,.123], [1.50,.118,.13,.12], [1.521,.104,.115,.107],
    [1.534,.085,.094,.087], [1.544,.045,.050,.046], [1.548,.001,.001,.001]
];
export function buildMarineHead(T, material) {
  const mesh = new T.Mesh(surface(T, HEAD_RINGS), material);
  mesh.name = 'marine-shaped-head';mesh.castShadow = true;mesh.receiveShadow = true;
  return mesh;
}

const fadeTextures = new WeakMap();
// The fade shares the live hair colour; only its coverage thins toward the skin.
// A single small local texture is reused by every marine, with no frame updates.
export function buildMarineHair(T, hairMaterial) {
  const group=new T.Group();group.name='medium-fade';
  const n=48,rows=10,head=HEAD_RINGS.filter(r=>r[0]>=1.402);
  const radius=y=>{let i=1;while(i<head.length-1&&head[i][0]<y)i++;const a=head[i-1],b=head[i],t=Math.max(0,Math.min(1,(y-a[0])/(b[0]-a[0])));return a.slice(1).map((v,k)=>v+(b[k+1]-v)*t);};
  const edge=c=>1.477+.022*Math.max(0,c)**3;
  function mesh(top,mat){const p=[],uv=[],ix=[];
    for(let row=0;row<=rows;row++)for(let j=0;j<=n;j++){
      const a=-Math.PI+j/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a),t=row/rows,upper=edge(c);
      const lower=c>.65?upper-.002:1.427+.065*Math.max(0,c)**3-.008*Math.max(0,-c);
      let y=top?upper+(1.561-upper)*Math.sin(t*Math.PI/2):lower+(upper-lower)*t;
      const r=radius(top?upper:y),lift=top?.003:.0015;
      const taper=top?Math.max(0,Math.cos(t*Math.PI/2))**.72:1;
      // Short, swept ridges stay part of the scalp surface, never floating spikes.
      const ridge=top?.0018*Math.sin(t*Math.PI)**2*Math.sin(a*7+t*4):0;
      if(top)y-=.0016*Math.sin(t*Math.PI)**2*(.5+.5*Math.sin(a*5+t*3));
      p.push((r[0]+lift+ridge)*s*taper,y-1.22,c>=0?(r[1]+lift+ridge)*c**.55*taper:-(r[2]+lift+ridge)*(-c)**.8*taper);uv.push(j/n,t);
    }
    for(let r=0;r<rows;r++)for(let j=0;j<n;j++){const a=r*(n+1)+j,b=a+n+1;ix.push(a,a+1,b,a+1,b+1,b);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();const m=new T.Mesh(g,mat);m.castShadow=top;m.receiveShadow=true;return m;
  }
  let fadeTexture=fadeTextures.get(T);
  if(!fadeTexture){const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,t=y/(size-1),grain=((x*17+y*31)%23)/23;const coverage=Math.max(0,Math.min(1,t**1.35+(grain-.5)*.065));data[i]=data[i+1]=data[i+2]=Math.round(coverage*255);data[i+3]=255;}fadeTexture=new T.DataTexture(data,size,size);fadeTexture.magFilter=T.LinearFilter;fadeTexture.minFilter=T.LinearFilter;fadeTexture.needsUpdate=true;fadeTextures.set(T,fadeTexture);}
  const fade=hairMaterial.clone();fade.color=hairMaterial.color;fade.alphaMap=fadeTexture;fade.transparent=true;fade.depthWrite=false;fade.roughness=1;
  group.add(mesh(true,hairMaterial),mesh(false,fade));return group;
}

export function buildBalaclava(T, material) {
  material.roughness = .98;material.metalness = 0;material.side = T.DoubleSide;
  const mesh = new T.Mesh(surface(T, [
    [1.205,.094,.105,.097], [1.229,.091,.115,.101],
    [1.253,.086,.122,.102], [1.272,.089,.141,.106], [1.29,.094,.156,.109],
    [1.309,.108,.166,.116], [1.326,.12,.171,.122], [1.341,.128,.175,.129], [1.355,.131,.177,.132]
  ], {wrap:true,cloth:true}), material);
  mesh.name = 'cloth-balaclava';mesh.castShadow = true;mesh.receiveShadow = true;
  const group = new T.Group();group.name = 'balaclava';group.add(mesh);
  // A rolled hem follows the nose and dips beneath the ears; no hood over the scalp.
  const edge = [];
  for (let j = 0; j < 32; j++) {
    const a = -Math.PI + j / 32 * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
    const y = 1.355 + .046 * Math.max(0,c) ** 5;
    edge.push(new T.Vector3(.131 * sn, y - 1.22, c >= 0 ? .178*c**.55 : -.133*(-c)**.8));
  }
  const hem = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(edge, true), 48, .0016, 4, true), material);
  hem.castShadow = true;hem.receiveShadow = true;group.add(hem);
  // Flat-lock seams follow the cheek panels, using the live mask fabric material.
  for(const side of [-1,1]){
    const p=mesh.geometry.getAttribute('position'),n=mesh.geometry.getAttribute('normal');
    const seamPoints=[[1,4],[3,4],[5,5],[7,6]].map(([row,offset])=>{
      const i=row*33+16+side*offset;
      return new T.Vector3().fromBufferAttribute(p,i).addScaledVector(new T.Vector3().fromBufferAttribute(n,i),.00065);
    });
    const seam=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(seamPoints),12,.00085,3,false),material);
    seam.name='mask-flatlock-seam';seam.castShadow=true;seam.receiveShadow=true;group.add(seam);
  }
  return group;
}

export function buildSurvivorBeard(T, material) {
  const mesh = new T.Mesh(surface(T, [
    [1.273,.036,.098,.05], [1.291,.069,.134,.07],
    [1.323,.098,.155,.09], [1.341,.125,.156,.1]
  ], {frontOnly:true}), material);
  mesh.name = 'survivor-fitted-beard';mesh.castShadow = true;mesh.receiveShadow = true;
  return mesh;
}

// GP-163. Shallow facial surfaces stay at the established eye/eyewear anchors.
// All materials are supplied by the wardrobe: changing skin, iris or hair color
// updates these surfaces without rebuilding them. No extruded eye boxes.
export function buildMarineFeatures(T,{skinW,skinShade,hairW,irisW,eyeWhite,eyeDark,glint,scarMat}) {
  const group=new T.Group();group.name='marine-facial-features';
  const profile=HEAD_RINGS;
  const faceZ=(x,y)=>{
    let i=1;while(i<profile.length-1&&profile[i][0]<y)i++;
    const a=profile[i-1],b=profile[i],t=Math.max(0,Math.min(1,(y-a[0])/(b[0]-a[0])));
    const w=a[1]+(b[1]-a[1])*t,f=a[2]+(b[2]-a[2])*t;
    return f*Math.max(0,1-(x/w)**2)**.275;
  };
  const mesh=(positions,indices,material,name)=>{
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geo.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(positions.length/3*2),2));
    geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();
    const m=new T.Mesh(geo,material);m.name=name;m.castShadow=false;m.receiveShadow=true;group.add(m);return m;
  };
  const fan=(points,center,mat,name,out=[0,0,1])=>{
    const p=[center[0],center[1]-1.22,center[2]],ix=[];
    for(const [x,y,z]of points)p.push(x,y-1.22,z);
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];
      const v=new T.Vector3(a[0]-center[0],a[1]-center[1],a[2]-center[2]);
      v.cross(new T.Vector3(b[0]-center[0],b[1]-center[1],b[2]-center[2]));
      const j=i+1,k=(i+1)%points.length+1;
      ix.push(0,...(v.dot(new T.Vector3(...out))>=0?[j,k]:[k,j]));
    }
    return mesh(p,ix,mat,name);
  };
  const ellipse=(x,y,rx,ry,z,mat,name)=>{
    const pts=[];for(let j=0;j<20;j++){const a=j/20*Math.PI*2,dx=Math.cos(a)*rx,dy=Math.sin(a)*ry;pts.push([x+dx,y+dy,typeof z==='function'?z(dx,dy):z]);}
    return fan(pts,[x,y,typeof z==='function'?z(0,0):z],mat,name);
  };
  const strip=(points,width,mat,name)=>{
    const p=[],ix=[];
    points.forEach(([x,y,z],i)=>{const w=typeof width==='function'?width(i/(points.length-1)):width;p.push(x,y-w-1.22,z,x,y+w-1.22,z);if(i){const a=(i-1)*2;ix.push(a,a+2,a+1,a+1,a+2,a+3);}});
    return mesh(p,ix,mat,name);
  };
  for(const side of [-1,1]){
    const ex=side*.06,ey=1.419,halfWidth=.020;
    const opening=(dx,upper)=>(upper?.0038:-.0045)*Math.max(0,1-(dx/halfWidth)**2)**.65+side*dx*.022;
    const eyeDepth=(dx,dy)=>faceZ(ex+dx,ey+dy)+.0015+.0007*Math.max(0,1-(dx/halfWidth)**2-(dy/.007)**2);
    const eyeEdge=[];
    for(let j=0;j<24;j++){
      const a=j/24*Math.PI*2,dx=Math.cos(a)*halfWidth,dy=opening(dx,Math.sin(a)>=0);
      eyeEdge.push([ex+dx,ey+dy,eyeDepth(dx,dy)]);
    }
    // The sockets blend into the face instead of projecting as a dark rectangle.
    const socket=[];for(let j=0;j<24;j++){const a=j/24*Math.PI*2,x=ex+Math.cos(a)*.0245,y=ey+Math.sin(a)*.0075;socket.push([x,y,faceZ(x,y)+.0003]);}
    fan(socket,[ex,ey,faceZ(ex,ey)+.0005],skinShade,'eye-socket-'+side);
    fan(eyeEdge,[ex,ey,eyeDepth(0,0)],eyeWhite,'almond-eye-'+side);
    // Circular iris/pupil surfaces follow the eyeball's shallow curve.
    const ix=ex-side*.0012;
    const irisDisc=(radius,lift,mat,name)=>{
      const pts=[];
      for(let j=0;j<24;j++){
        const a=j/24*Math.PI*2,dx=Math.cos(a)*radius-side*.0012;
        const dy=Math.max(opening(dx,false)+.00025,Math.min(opening(dx,true)-.00025,Math.sin(a)*radius));
        pts.push([ex+dx,ey+dy,eyeDepth(dx,dy)+lift]);
      }
      return fan(pts,[ix,ey,eyeDepth(-side*.0012,0)+lift],mat,name);
    };
    irisDisc(.0055,.00018,eyeDark,'iris-rim-'+side);
    irisDisc(.0048,.00034,irisW,'iris-'+side);
    irisDisc(.00235,.00048,eyeDark,'pupil-'+side);
    ellipse(ix+.0012,ey+.0015,.00075,.00075,(dx,dy)=>eyeDepth(dx-side*.0012+.0012,dy+.0015)+.00065,glint,'eye-glint-'+side);
    // Each lid is a tapered patch from the eye edge back to the surrounding skin.
    for(const upper of [true,false]){
      const p=[],idx=[];
      for(let j=0;j<=12;j++){
        const t=j/12,dx=-halfWidth+2*halfWidth*t,arch=Math.sin(t*Math.PI);
        const dy=opening(dx,upper);
        const x=ex+dx,y=ey+dy,z=eyeDepth(dx,dy)+.00055;
        const outerY=y+(upper?1:-1)*(.0008+(upper?.0055:.0016)*arch),outerZ=faceZ(x,outerY)+.0006;
        p.push(x,y-1.22,z,x,outerY-1.22,outerZ);
        if(j){const a=(j-1)*2;if(upper)idx.push(a,a+2,a+1,a+1,a+2,a+3);else idx.push(a,a+1,a+2,a+1,a+3,a+2);}
      }
      mesh(p,idx,skinW,(upper?'upper':'lower')+'-eyelid-'+side);
    }
    const brow=[];
    for(let j=0;j<=14;j++){const t=j/14,x=ex+(t-.5)*.060,y=1.439+.0022*Math.sin(t*Math.PI)+side*(t-.5)*.003;brow.push([x,y,faceZ(x,y)+.0015]);}
    strip(brow,t=>.0007+.0030*Math.sin(t*Math.PI)**.65,hairW,'tapered-brow-'+side);

    // Fitted ear silhouette and recessed concha, kept inside the old ear envelope.
    const ear=[[1.375,-.013],[1.369,.001],[1.378,.018],[1.399,.023],[1.424,.015],[1.436,.001],[1.428,-.017],[1.401,-.021]];
    fan(ear.map(([y,z])=>[side*.129,y,z]),[side*.143,1.402,.001],skinW,'ear-'+side,[side,0,0]);
    const inner=ear.map(([y,z])=>[side*.1355,1.402+(y-1.402)*.58,z*.52+.002]);
    fan(inner,[side*.1435,1.402,.003],skinShade,'ear-concha-'+side,[side,0,0]);
    ellipse(side*.009,1.383,.0037,.0018,(dx,dy)=>.1659-Math.abs(side*.009+dx)*1.14+dy*.65,skinShade,'nostril-'+side);
  }
  // Six connected cross-sections make a restrained bridge, tip and nasal wings.
  const nose=[[1.379,.010,.158,.150],[1.385,.017,.169,.148],[1.394,.014,.174,.151],
    [1.409,.010,.167,.147],[1.428,.009,.157,.146],[1.443,.008,.150,.146]];
  const p=[],idx=[];
  nose.forEach(([y,w,front,edge],r)=>{p.push(-w,y-1.22,edge,0,y-1.22,front,w,y-1.22,edge);if(r)for(let j=0;j<2;j++){const a=(r-1)*3+j;idx.push(a,a+1,a+3,a+1,a+4,a+3);}});
  mesh(p,idx,skinW,'sculpted-nose');
  const lips=[],lower=[];
  for(let j=0;j<=12;j++){const t=j/12,x=(t-.5)*.053,y=1.345+.0012*Math.sin(t*Math.PI);lips.push([x,y,faceZ(x,y)+.0012]);lower.push([x,y-.0025,faceZ(x,y-.0025)+.0015]);}
  strip(lips,t=>.00035+.00065*Math.sin(t*Math.PI),skinShade,'resting-mouth');
  strip(lower,t=>.00025+.0013*Math.sin(t*Math.PI),skinW,'lower-lip');
  const scar=[];for(let j=0;j<5;j++){const t=j/4,x=-.075+.004*t,y=1.434+.022*t;scar.push([x,y,faceZ(x,y)+.0027]);}
  strip(scar,t=>.0003+.00065*Math.sin(t*Math.PI),scarMat,'brow-scar');
  return group;
}
