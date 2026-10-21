// GP-44: compact opaque plant geometry. No world RNG, placement or per-frame work.
// Factory injection keeps the game and the geometry checks on the same Three build.
export function createGroundFoliage(THREE) {
  const geometry = (vertices, indices) => {
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);
    g.computeVertexNormals();g.computeBoundingSphere();return g;
  };
  function blade(width,height) {
    return geometry([
      0,-height*.5,0,
      -width*.36,-height*.2,height*.035, width*.36,-height*.2,height*.035,
      -width*.14,height*.24,height*.15, width*.19,height*.24,height*.15,
      width*.2,height*.5,height*.34
    ],[0,2,1,1,2,3,2,4,3,3,4,5]);
  }
  function fern(width,height) {
    const v=[],ix=[];
    const tri=(a,b,c)=>{const n=v.length/3;v.push(...a,...b,...c);ix.push(n,n+1,n+2);};
    const spine=t=>[0,Math.sin(t*Math.PI*.8)*height*.42,t*height*1.14];
    const a=spine(0),b=spine(.98),w=.007;
    tri([a[0]-w,a[1],a[2]],[a[0]+w,a[1],a[2]],[b[0]-w*.15,b[1],b[2]]);
    tri([a[0]+w,a[1],a[2]],[b[0]+w*.15,b[1],b[2]],[b[0]-w*.15,b[1],b[2]]);
    for(let k=0;k<4;k++)for(const side of [-1,1]) {
      const t=.19+k*.18+(side===1?.025:0),p=spine(t),q=spine(t+.09);
      const reach=width*Math.sin(t*Math.PI)*.85;
      tri(p,[side*reach,p[1]+height*.045,p[2]+height*.17],q);
    }
    const p=spine(.8),q=spine(1.08);
    tri([-width*.08,p[1],p[2]],[width*.08,p[1],p[2]],q);
    return geometry(v,ix);
  }
  function shrub(radius) {
    const v=[],ix=[];
    const tri=(a,b,c)=>{const n=v.length/3;v.push(...a,...b,...c);ix.push(n,n+1,n+2);};
    // Four uneven woody sprays, with paired, folded leaves rather than solid balls.
    for(let branch=0;branch<4;branch++) {
      const a=branch*2.39996+radius*7,dx=Math.cos(a),dz=Math.sin(a);
      const tip=[dx*radius*.68,radius*(.65+.13*(branch%2)),dz*radius*.68];
      const base=[0,-radius*.6,0],bw=radius*.025;
      tri([base[0]-bw,base[1],base[2]],tip,[base[0]+bw,base[1],base[2]]);
      tri([base[0],base[1],base[2]-bw],tip,[base[0],base[1],base[2]+bw]);
      for(let k=0;k<4;k++) {
        const t=.4+k*.18,side=k%2?1:-1;
        const root=[tip[0]*t,base[1]+(tip[1]-base[1])*t,tip[2]*t];
        const yaw=a+side*(.65+.15*(k%2)),lx=Math.cos(yaw),lz=Math.sin(yaw);
        const length=radius*(.84-.07*k),half=length*.32;
        const mid=[root[0]+lx*length*.48,root[1]+length*.18,root[2]+lz*length*.48];
        const left=[mid[0]-lz*half,mid[1]-length*.055,mid[2]+lx*half];
        const right=[mid[0]+lz*half,mid[1]-length*.055,mid[2]-lx*half];
        const end=[root[0]+lx*length,root[1]+length*.04,root[2]+lz*length];
        tri(root,left,mid);tri(root,mid,right);tri(left,end,mid);tri(mid,end,right);
      }
    }
    return geometry(v,ix);
  }
  function flower(radius) {
    const v=[],ix=[];
    for(let p=0;p<6;p++) {
      const a=p*Math.PI/3,dx=Math.cos(a),dz=Math.sin(a),n=v.length/3;
      // A shallow cup with separate rounded-looking petal tips and open notches.
      v.push(dx*radius*.14,-radius*.05,dz*radius*.14,
        dx*radius*.72-dz*radius*.3,radius*.1,dz*radius*.72+dx*radius*.3,
        dx*radius,radius*.23,dz*radius,
        dx*radius*.72+dz*radius*.3,radius*.1,dz*radius*.72-dx*radius*.3);
      ix.push(n,n+1,n+2,n,n+2,n+3);
    }
    return geometry(v,ix);
  }
  function flowerStem(height) {
    const v=[],ix=[];
    // Crossed tapered stalk plus two small lanceolate leaves; double-sided at merge.
    const w=.008;
    v.push(-w,-height*.5,0,w,-height*.5,0,0,height*.5,0,
      0,-height*.5,-w,0,-height*.5,w,0,height*.5,0);
    ix.push(0,1,2,3,4,5);
    for(const side of [-1,1]) {
      const n=v.length/3,y=height*(side<0?-.12:.03),len=height*.32;
      v.push(0,y,0,side*len*.55,y+len*.24,-len*.16,side*len,y+len*.5,0,side*len*.55,y+len*.24,len*.16);
      ix.push(n,n+1,n+2,n,n+2,n+3);
    }
    return geometry(v,ix);
  }
  function mushroomCap(radius) {
    const g=new THREE.SphereGeometry(radius,8,4,0,Math.PI*2,0,Math.PI*.57),p=g.attributes.position;
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x);
      const irregular=1+.06*Math.sin(a*3+.7)+.035*Math.cos(a*5);
      p.setXYZ(i,x*irregular,y*.64,z*irregular);
    }
    g.computeVertexNormals();g.computeBoundingSphere();return g;
  }
  function shade(mesh,kind) {
    // mergeParts supplies the species' base colour. Add root occlusion, lighter new
    // growth and small face variation here so the chunk merger retains those colours.
    const p=mesh.geometry.attributes.position,c=mesh.geometry.attributes.color;
    let lo=Infinity,hi=-Infinity;
    for(let i=0;i<p.count;i++){lo=Math.min(lo,p.getY(i));hi=Math.max(hi,p.getY(i));}
    const range=Math.max(.01,hi-lo);
    for(let i=0;i<p.count;i++) {
      const t=Math.max(0,Math.min(1,(p.getY(i)-lo)/range));
      const variation=Math.sin(p.getX(i)*31+p.getZ(i)*23)*.035;
      const k=(kind==='flower'?.9:kind==='bush'?.78:.82)+t*(kind==='flower'?.14:.32)+variation;
      c.setXYZ(i,c.getX(i)*k,c.getY(i)*k,c.getZ(i)*k*(.94+t*.06));
    }
    c.needsUpdate=true;return mesh;
  }
  return {blade,fern,shrub,flower,flowerStem,mushroomCap,shade};
}
