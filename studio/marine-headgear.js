// GP-163: fitted high-cut helmet surfaces. Coordinates match makeMarine's head.
// Caller supplies its own wardrobe materials and registers every helmet mesh via add.
const geometryCaches=new WeakMap();
function geometryTools(T){
  let cache=geometryCaches.get(T);if(!cache){cache=new Map();geometryCaches.set(T,cache);}
  const cached=(key,build)=>{if(!cache.has(key))cache.set(key,build());return cache.get(key);};
  const geometry=(positions,indices)=>{
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setIndex(indices);g.computeVertexNormals();return g;
  };
  const box=(w,h,d,bevel=.004)=>cached(`box:${w}:${h}:${d}:${bevel}`,()=>{
    const x=w/2,y=h/2,z=d/2,b=Math.min(bevel,x*.40,y*.40,z*.40),v=[],ix=[];
    // Eight vertices around each face instead of subdividing a rounded box many times.
    const outline=[[-x+b,-y],[x-b,-y],[x,-y+b],[x,y-b],[x-b,y],[-x+b,y],[-x,y-b],[-x,-y+b]];
    for(const zz of [-z,z])for(const [xx,yy] of outline)v.push(xx,yy,zz);
    v.push(0,0,-z,0,0,z);
    for(let i=0;i<8;i++){const j=(i+1)%8;ix.push(16,j,i,17,8+i,8+j,i,j,8+i,j,8+j,8+i);}
    return geometry(v,ix).toNonIndexed();
  });
  const cylinder=(rt,rb,h,n=10)=>cached(`cyl:${rt}:${rb}:${h}:${n}`,()=>new T.CylinderGeometry(rt,rb,h,n));
  const wire=(key,points,r=.0015,segments=12,sides=4)=>cached(key,()=>{
    const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    return new T.TubeGeometry(path,segments,r,sides,false);
  });
  return {cached,geometry,box,cylinder,wire};
}

// The ear cutout rises between the brow and the lower protective rear skirt.
function helmetEdge(a){
  const front=Math.cos(a),side=Math.abs(Math.sin(a));
  return 1.473+.009*Math.max(front,0)+.051*Math.pow(side,6)-.014*Math.max(-front,0);
}
function helmetPoint(a,rx,front,back,y){
  const c=Math.cos(a),s=Math.sin(a);
  return [s*rx,y,c*(c>=0?front:back)];
}

export function buildMarineHelmet(T,{add,mesh=(geo,mat)=>new T.Mesh(geo,mat),mats}){
  const {cached,geometry,box,cylinder,wire}=geometryTools(T);
  const {shellW,helmetMat,nvgMat,strapMat,pouchMat,buckleMat}=mats;
  const anchorY=1.455,created=[];
  const at=(geo,mat,x,y,z,rx=0,ry=0,rz=0)=>{
    const o=mesh(geo,mat);o.castShadow=true;add(o,x,y,z);o.rotation.set(rx,ry,rz);created.push(o);return o;
  };
  const part=(w,h,d,mat,x,y,z,rx=0,ry=0,rz=0,b=.003)=>at(box(w,h,d,b),mat,x,y,z,rx,ry,rz);
  const shellGeo=cached('fitted-shell-v1',()=>{
    const v=[],ix=[],uv=[],n=40,rings=6;
    for(let row=0;row<rings;row++)for(let i=0;i<=n;i++){
      const a=i/n*Math.PI*2,edge=helmetEdge(a),profiles=[
        [.171,.193,.184,edge],[.181,.201,.190,edge*.25+1.563*.75],
        [.163,.181,.175,1.602],[.123,.140,.134,1.639],[.070,.084,.080,1.659],[.006,.008,.008,1.668]];
      const [rx,f,b,y]=profiles[row],p=helmetPoint(a,rx,f,b,y);
      v.push(p[0],p[1]-anchorY,p[2]);uv.push(i/n,row/(rings-1));
    }
    for(let row=0;row<rings-1;row++)for(let i=0;i<n;i++){
      const a=row*(n+1)+i,b=a+n+1;ix.push(a,a+1,b,b,a+1,b+1);
    }
    const top=v.length/3;v.push(0,1.668-anchorY,0);uv.push(.5,1);
    for(let i=0;i<n;i++){const a=(rings-1)*(n+1)+i;ix.push(top,a,a+1);}
    const g=geometry(v,ix);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return g;
  });
  const shell=at(shellGeo,shellW,0,anchorY,0);
  shell.name='marine-fitted-helmet-cover';
  const rimGeo=cached('fitted-rim-v1',()=>{
    const v=[],ix=[],n=48,sides=6;
    for(let i=0;i<=n;i++){
      const a=i/n*Math.PI*2,edge=helmetEdge(a),p=helmetPoint(a,.171,.193,.184,edge);
      for(let j=0;j<sides;j++){
        const t=j/sides*Math.PI*2,r=.0050*Math.cos(t);
        v.push(p[0]+Math.sin(a)*r,p[1]-anchorY+.0044*Math.sin(t),p[2]+Math.cos(a)*r);
      }
    }
    for(let i=0;i<n;i++)for(let j=0;j<sides;j++){
      const a=i*sides+j,b=i*sides+(j+1)%sides,c=a+sides,d=b+sides;
      ix.push(a,c,b,b,c,d);
    }
    return geometry(v,ix);
  });
  const rim=at(rimGeo,helmetMat,0,anchorY,0);rim.name='marine-molded-helmet-rim';

  // Curved ARC rails sit above the ear defenders, with a dropped mounting shoe.
  const rails=[];
  for(const side of [-1,1]){
    const railGeo=cached(`fitted-arc-rail:${side}`,()=>{
      const center=[[1.517,.128],[1.536,.082],[1.542,.020],[1.538,-.049],[1.523,-.113],[1.503,-.148]];
      const v=[],ix=[];
      for(let i=0;i<center.length;i++){
        const [y,z]=center[i],a=center[Math.max(0,i-1)],b=center[Math.min(center.length-1,i+1)];
        const dy=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dy,dz),ny=dz/len,nz=-dy/len;
        const x=side*(.181-Math.pow(Math.abs(z)/.16,2)*.030);
        for(const depth of [-.004,.009])for(const s of [-1,1])v.push(x+side*depth,y-anchorY+ny*s*.011,z+nz*s*.011);
      }
      for(let i=0;i<center.length-1;i++){
        const a=i*4,b=a+4;ix.push(a,b,a+1,a+1,b,b+1,a+2,a+3,b+2,a+3,b+3,b+2,
          a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3);
      }
      const e=(center.length-1)*4;ix.push(0,1,2,1,3,2,e,e+2,e+1,e+1,e+2,e+3);
      if(side<0)for(let i=0;i<ix.length;i+=3){const temp=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=temp;}
      return geometry(v,ix);
    });
    const rail=at(railGeo,nvgMat,0,anchorY,0);rails.push(rail);
    for(const [y,z] of [[1.531,.079],[1.536,.023],[1.531,-.042],[1.516,-.107]]){
      const x=side*(.195-Math.pow(Math.abs(z)/.16,2)*.030);
      part(.004,.008,.025,helmetMat,x,y,z,0,0,0,.001);
    }
    for(const [y,z] of [[1.518,.120],[1.507,-.134]]){
      const x=side*(.194-Math.pow(Math.abs(z)/.16,2)*.030);
      at(cylinder(.0053,.0053,.0035,8),buckleMat,x,y,z,0,0,Math.PI/2);
      part(.0038,.0013,.006,nvgMat,x+side*.0021,y,z,0,0,0,.0002);
    }
    // This tab meets the retained headset pivot at x +/- .21, y 1.488, z -.033.
    part(.023,.043,.034,nvgMat,side*.189,1.510,-.033,0,0,-side*.15);
    part(.025,.018,.036,helmetMat,side*.200,1.492,-.033,0,0,0,.004);
    // Surface-following Velcro avoids burying a flat rectangle in the curved cover.
    const patchGeo=cached(`helmet-velcro-contour:${side}`,()=>{
      const p=shellGeo.attributes.position,ix=shellGeo.index,v=[],indices=[],ny=3,nz=6;
      const onCover=(y,z)=>{
        let extreme=0;
        for(let t=0;t<ix.count;t+=3){
          const ai=ix.getX(t),bi=ix.getX(t+1),ci=ix.getX(t+2);
          const ay=p.getY(ai),az=p.getZ(ai),by=p.getY(bi)-ay,bz=p.getZ(bi)-az;
          const cy=p.getY(ci)-ay,cz=p.getZ(ci)-az,den=by*cz-bz*cy;
          if(Math.abs(den)<1e-10)continue;
          const u=((y-ay)*cz-(z-az)*cy)/den,w=(by*(z-az)-bz*(y-ay))/den;
          if(u>=-1e-6&&w>=-1e-6&&u+w<=1.000001){
            const x=p.getX(ai)+u*(p.getX(bi)-p.getX(ai))+w*(p.getX(ci)-p.getX(ai));
            if(x*side>extreme*side)extreme=x;
          }
        }
        return extreme+side*.0014;
      };
      for(let row=0;row<=ny;row++)for(let col=0;col<=nz;col++){
        const y=1.568-anchorY+row/ny*.028,z=-.062+col/nz*.080;
        v.push(onCover(y,z),y,z);
      }
      for(let row=0;row<ny;row++)for(let col=0;col<nz;col++){
        const a=row*(nz+1)+col,b=a+nz+1;indices.push(a,b,a+1,b,b+1,a+1);
      }
      if(side<0)for(let i=0;i<indices.length;i+=3){const temp=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=temp;}
      return geometry(v,indices);
    });
    at(patchGeo,pouchMat,0,anchorY,0);
    // End washers seat the two existing yoke rods against each curved ear cup.
    for(const z of [-.033,.028])at(cylinder(.0085,.0085,.008,10),nvgMat,side*.201,1.410,z,0,0,Math.PI/2);
    // Retention strap follows the cheek beside the existing mask and headset.
    part(.016,.091,.023,strapMat,side*.148,1.388,.049,0,0,side*.03,.003);
    const a=new T.Vector3(side*.15,1.343,.05),b=new T.Vector3(side*.060,1.252,.132);
    const center=a.clone().add(b).multiplyScalar(.5);
    const chin=part(.016,a.distanceTo(b),.021,strapMat,center.x,center.y,center.z);
    chin.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());
    part(.024,.021,.029,helmetMat,side*.146,1.353,.054,0,0,-side*.18,.003);
  }
  part(.131,.019,.022,strapMat,0,1.252,.132,0,0,0,.004);

  const shroudGeo=cached('fitted-nvg-shroud',()=>{
    const outline=[[-.033,-.037],[.033,-.037],[.043,.008],[.026,.039],[-.026,.039],[-.043,.008]],v=[],ix=[];
    for(const z of [-.010,.010])for(const [x,y] of outline)v.push(x,y,z);
    v.push(0,0,-.010,0,0,.010);
    for(let i=0;i<6;i++){const j=(i+1)%6;ix.push(12,j,i,13,6+i,6+j,i,j,6+i,j,6+j,6+i);}
    return geometry(v,ix).toNonIndexed();
  });
  const shroud=at(shroudGeo,helmetMat,0,1.580,.193,-.22);
  part(.045,.054,.014,nvgMat,0,1.579,.208,-.22,0,0,.005);
  part(.028,.020,.025,nvgMat,0,1.578,.218,0,0,0,.003);
  for(const [x,y,z] of [[-.026,1.564,.207],[.026,1.564,.207],[0,1.607,.195]]){
    at(cylinder(.0045,.0045,.003,8),buckleMat,x,y,z,Math.PI/2-.22);
  }

  // Flat fabric panels, a subdued retention band and two seams trace the shell.
  part(.064,.006,.074,pouchMat,0,1.665,-.016,0,0,0,.002);
  part(.025,.009,.036,nvgMat,0,1.669,-.033,0,0,0,.002);
  for(const side of [-1,1]){
    const a=.34,s=Math.sin(a),c=Math.cos(a),fy=helmetEdge(a),by=helmetEdge(Math.PI-a);
    const pts=[[side*s*.174,fy+.001,c*.196],[side*s*.184,fy*.25+1.563*.75+.001,c*.204],
      [side*s*.166,1.603,c*.184],[side*s*.126,1.640,c*.143],[side*s*.073,1.660,c*.087],
      [side*.007,1.669,0],[side*s*.073,1.660,-c*.083],[side*s*.126,1.640,-c*.137],
      [side*s*.166,1.603,-c*.178],[side*s*.184,by*.25+1.563*.75+.001,-c*.193],[side*s*.174,by+.001,-c*.187]];
    at(wire(`cover-long-seam:${side}`,pts.map(([x,y,z])=>[x,y-anchorY,z]),.0013,18,3),pouchMat,0,anchorY,0);
    const band=[[side*.155,1.555,.096],[side*.176,1.554,.02],[side*.171,1.547,-.07],
      [side*.136,1.533,-.139],[side*.073,1.520,-.178]];
    at(wire(`cover-retainer:${side}`,band.map(([x,y,z])=>[x,y-anchorY,z]),.0021,12,4),strapMat,0,anchorY,0);
    part(.025,.013,.039,strapMat,side*.061,1.548,-.174,.23,0,0,.002);
  }
  const counterweight=part(.123,.058,.038,pouchMat,0,1.535,-.190,.17,0,0,.008);
  part(.105,.021,.009,pouchMat,0,1.555,-.211,.17,0,0,.003);
  for(const side of [-1,1])part(.016,.066,.009,strapMat,side*.038,1.536,-.215,.17,0,0,.002);
  part(.041,.019,.006,helmetMat,0,1.533,-.213,.17,0,0,.002);
  return {shell,rim,rails,shroud,counterweight,meshes:created};
}

// Detail only: deployed eye positions, flip-up axis and ownership stay with makeMarine.
export function detailMarineNvg(T,{pivot,put,mesh=(geo,mat)=>new T.Mesh(geo,mat),mats}){
  const {box,cylinder}=geometryTools(T),{nvgMat,helmetMat,buckleMat}=mats;
  const made=[];
  const at=(geo,mat,x,y,z,rx=0,ry=0,rz=0)=>{
    const o=mesh(geo,mat);o.castShadow=true;put(pivot,o,x,y,z,rx,ry,rz);made.push(o);return o;
  };
  for(const x of [-.055,.055]){
    for(const z of [.035,.081])at(cylinder(.0365,.0365,.009,12),helmetMat,x,-.16,z,Math.PI/2);
    for(let i=0;i<6;i++){
      const a=i/6*Math.PI*2;
      at(box(.006,.008,.013,.001),nvgMat,x+Math.sin(a)*.039,-.16+Math.cos(a)*.039,.107,0,0,-a);
    }
    at(box(.025,.011,.039,.002),nvgMat,x,-.118,.045);
    at(cylinder(.009,.009,.006,8),helmetMat,x,-.110,.046);
  }
  at(box(.031,.018,.017,.003),helmetMat,0,-.136,.059);
  at(cylinder(.008,.008,.018,8),buckleMat,0,-.119,.028,0,0,Math.PI/2);
  at(box(.017,.029,.018,.003),nvgMat,-.039,-.012,.004);
  return made;
}
