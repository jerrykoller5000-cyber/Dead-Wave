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
    // Leaflets grow along the two actual midrib segments, including the drooping tip.
    const spine=t=>[0,(t < .5 ? .68*t : .34-.28*(t-.5))*height,t*height*1.14];
    const m=spine(.5),tip=spine(1),w=width*.033;
    const left=[-w*.65,m[1],m[2]],right=[w*.65,m[1],m[2]];
    tri([-w,0,0],left,[w,0,0]);tri([w,0,0],left,right);tri(left,tip,right);
    for(let k=0;k<4;k++)for(const side of [-1,1]) {
      const t=.19+k*.18+(side===1?.025:0),p=spine(t),q=spine(t+.09);
      const reach=width*Math.sin(t*Math.PI)*.72;
      const tooth=[side*reach,p[1]+height*(.028+.056*(1-t)),p[2]+height*(.095+.08*(1-t))];
      if (side<0) tri(p,tooth,q);
      else tri(p,q,tooth);
    }
    return geometry(v,ix);
  }
  function shrubTip(radius,branch) {
    const a=branch*2.39996+radius*7;
    return [Math.cos(a)*radius*.68,radius*(.65+.13*(branch%2)),Math.sin(a)*radius*.68];
  }
  function shrub(radius) {
    const v=[],ix=[];
    const tri=(a,b,c)=>{const n=v.length/3;v.push(...a,...b,...c);ix.push(n,n+1,n+2);};
    // Four uneven woody sprays, with paired, folded leaves rather than solid balls.
    for(let branch=0;branch<4;branch++) {
      const a=branch*2.39996+radius*7;
      const tip=shrubTip(radius,branch);
      const base=[0,-radius*.6,0],bw=radius*.025;
      tri([base[0]-bw,base[1],base[2]],tip,[base[0]+bw,base[1],base[2]]);
      tri([base[0],base[1],base[2]-bw],tip,[base[0],base[1],base[2]+bw]);
      for(let k=0;k<4;k++) {
        const t=.32+k*.208,side=k%2?1:-1;
        const root=[tip[0]*t,base[1]+(tip[1]-base[1])*t,tip[2]*t];
        const turn=Math.sin(3*branch+7*k+37*radius);
        const yaw=a+side*(.78+.31*turn),lx=Math.cos(yaw),lz=Math.sin(yaw);
        const length=radius*(.7-.057*k+.056*turn),half=length*(.21+.035*turn);
        const mid=[root[0]+lx*length*.42,root[1]+length*(.21+.13*turn),root[2]+lz*length*.42];
        const left=[mid[0]-lz*half,mid[1]-length*(.09+.045*turn),mid[2]+lx*half];
        const right=[mid[0]+lz*half,mid[1]-length*(.09-.045*turn),mid[2]-lx*half];
        const end=[root[0]+length*(lx-.085*turn*lz),root[1]+length*(.02+.17*turn),root[2]+length*(lz+.085*turn*lx)];
        tri(root,left,mid);tri(root,mid,right);tri(left,end,mid);tri(mid,end,right);
      }
    }
    return geometry(v,ix);
  }
  function flower(radius, petals=6, fullness=.3) {
    const v=[],ix=[];
    for(let p=0;p<petals;p++) {
      const a=p*Math.PI*2/petals,dx=Math.cos(a),dz=Math.sin(a),n=v.length/3;
      // A shallow cup with separate rounded-looking petal tips and open notches.
      v.push(dx*radius*.14,-radius*.05,dz*radius*.14,
        dx*radius*.72-dz*radius*fullness,radius*fullness*.5,dz*radius*.72+dx*radius*fullness,
        dx*radius,radius*.23,dz*radius,
        dx*radius*.72+dz*radius*fullness,radius*fullness*.5,dz*radius*.72-dx*radius*fullness);
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
  function mushroomCap(radius, dome=.64) {
    const vertices=[0,radius*dome,0], indices=[], sides=8;
    for (const [spread,h] of [[.52,.85],[.9,.46],[1,-.1]]) {
      for (let i=0; i<sides; i++) {
        const a=i*Math.PI*2/sides, r=radius*spread*(1+.055*Math.sin(a*3+.7)+.035*Math.cos(a*5));
        vertices.push(r*Math.cos(a),radius*dome*h,r*Math.sin(a));
      }
    }
    const collar=vertices.length/3;
    vertices.push(0,-radius*.08,0);
    for (let i=0; i<sides; i++) {
      const a=1+i, b=1+(i+1)%sides;
      indices.push(0,b,a);
      for (const j of [0,sides]) indices.push(a+j,b+j,a+j+sides,b+j,b+j+sides,a+j+sides);
      indices.push(a+sides*2,b+sides*2,collar);
    }
    return geometry(vertices,indices);
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
      const wood=kind==='bush' ? Math.max(0,1-3*t) : 0;
      c.setXYZ(i,c.getX(i)*k*(1+.75*wood),c.getY(i)*k*(1-.47*wood),c.getZ(i)*k*(.94+t*.06-.4*wood));
    }
    c.needsUpdate=true;return mesh;
  }
  return {blade,fern,shrub,shrubTip,flower,flowerStem,mushroomCap,shade};
}

// mergeParts writes non-indexed vertices in part order. A blossom and all of its
// stalk move together, even when two stems in the same patch straddle a bank.
export function plantRoots(parts, originY) {
  let end = 0;
  const roots = [];
  for (const part of parts) {
    const anchor = part.userData.plantRoot || part.position;
    const count = part.geometry.index?.count ?? part.geometry.attributes.position.count;
    const last = roots[roots.length - 1];
    end += count;
    if (last && last.x === anchor.x && last.z === anchor.z) last.end = end;
    else {
      const root={x:anchor.x, z:anchor.z, end, ground:originY};
      if (part.userData.bedAxis) root.axis=part.userData.bedAxis;
      roots.push(root);
    }
  }
  return roots;
}

export function seatPlant(plant, positions, start, heightAt) {
  let i = 0, moved = false;
  for (const root of plant.roots) {
    const level = heightAt(plant.x + root.x, plant.z + root.z);
    const dy = level - root.ground;
    // A loose stick lies across the surface, so both tips follow its local slope.
    if (root.axis) {
      const a=root.axis, x=plant.x+root.x, z=plant.z+root.z;
      const high=heightAt(x+a.x*a.half,z+a.z*a.half), low=heightAt(x-a.x*a.half,z-a.z*a.half);
      const slope=(high-low)/(2*a.half), lift=(high+low)*.5-level;
      const rise=dy+lift-a.lift, tilt=slope-a.slope;
      if (Math.abs(rise)+Math.abs(tilt)>.00001) {
        const cx=plant.chunk ? x : root.x, cz=plant.chunk ? z : root.z;
        for (; i<root.end; i++) {
          const v=start+i, along=(positions.getX(v)-cx)*a.x+(positions.getZ(v)-cz)*a.z;
          positions.setY(v,positions.getY(v)+rise+along*tilt);
        }
        moved=true;
      }
      a.slope=slope; a.lift=lift; root.ground=level;
    } else if (Math.abs(dy) > .00001) {
      if (i === 0 && plant.landing) plant.landing.y += dy;
      for (; i < root.end; i++) positions.setY(start+i, positions.getY(start+i) + dy);
      root.ground = level;
      moved = true;
    }
    i = root.end;
  }
  return moved;
}
