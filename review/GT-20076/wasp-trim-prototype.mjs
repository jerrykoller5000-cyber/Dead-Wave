export function fitWaspTrim(T, grip, trim) {
  const original=trim.geometry;
  grip.updateMatrix(); trim.updateMatrix();
  const frame=trim.matrix.clone().invert().multiply(grip.matrix);
  const rotation=trim.quaternion.clone().invert().multiply(grip.quaternion);
  const point=new T.Vector3(), normal=new T.Vector3();
  function triangles(geometry, local) {
    const {position:p,normal:n,uv}=geometry.attributes;
    const vertices=Array.from({length:p.count},(_,i)=>{
      point.fromBufferAttribute(p,i); normal.fromBufferAttribute(n,i);
      if(local){point.applyMatrix4(frame);normal.applyQuaternion(rotation);}
      return [...point.toArray(),...normal.toArray(),uv.getX(i),uv.getY(i)];
    });
    const ix=geometry.index;
    return Array.from({length:(ix?.count??p.count)/3},(_,i)=>[0,1,2].map(j=>vertices[ix?ix.getX(3*i+j):3*i+j]));
  }
  const pOut=[],nOut=[],uvOut=[];
  function emit(a,b,c) {
    for(const p of [a,b,c]) {pOut.push(p[0],p[1],p[2]);nOut.push(p[3],p[4],p[5]);uvOut.push(p[6],p[7]);}
  }
  function clip(poly,distance) {
    const result=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length];
      let da=distance(a),db=distance(b);
      if(Math.abs(da)<1e-12)da=0;
      if(Math.abs(db)<1e-12)db=0;
      if(da>=0)result.push(a);
      if(da*db<0)result.push(a.map((v,k)=>v+(b[k]-v)*da/(da-db)));
    }
    return result;
  }
  const cross=(a,b,c)=>(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]);
  const key=p=>Math.round(p[0]*1e8)+','+Math.round(p[2]*1e8);
  const roof=[],floor=[];
  for(const tri of triangles(original,false)){
    const [a,b,c]=tri,ab=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),ac=new T.Vector3(c[0]-a[0],c[1]-a[1],c[2]-a[2]);
    const n=ab.cross(ac).normalize();
    if(Math.abs(n.y)<.99){emit(a,b,c);continue;}
    const sign=Math.sign(n.y),den=cross(a,b,c);
    const inside=(poly)=>tri.reduce((s,a,i)=>clip(s,p=>-sign*cross(a,tri[(i+1)%3],p)),poly);
    const distance=p=>sign*(p[1]-a[1]+(n.x*(p[0]-a[0])+n.z*(p[2]-a[2]))/n.y);
    const sample=p=>{
      const u=cross(b,c,p)/den,v=cross(c,a,p)/den,w=1-u-v;
      return a.map((x,i)=>u*x+v*b[i]+w*c[i]);
    };
    (sign>0?roof:floor).push({tri,sign,inside,distance,sample,border:[]});
  }
  // Each tile follows the existing band's original triangles. The inside wall
  // follows only the part of the original grip between those two surfaces.
  const body=triangles(grip.geometry,true);
  for(const triangle of body)for(const upper of roof){
    const below=clip(upper.inside(triangle),p=>-upper.distance(p));
    if(below.length<3)continue;
    for(const lower of floor){
      const wall=clip(lower.inside(below),p=>-lower.distance(p));
      if(wall.length<3)continue;
      const inner=wall.map(p=>[p[0],p[1],p[2],-p[3],-p[4],-p[5],p[6],p[7]]);
      for(let i=1;i+1<inner.length;i++)emit(inner[0],inner[i+1],inner[i]);
      for(let i=0;i<wall.length;i++){
        const a=wall[i],b=wall[(i+1)%wall.length];
        if(key(a)===key(b))continue;
        for(const tile of [upper,lower]){
          if(Math.abs(tile.distance(a))<1e-10&&Math.abs(tile.distance(b))<1e-10)tile.border.push([a,b]);
        }
      }
    }
  }
  function onEdge(a,b,p) {
    const dx=b[0]-a[0],dz=b[2]-a[2],length=dx*dx+dz*dz;
    if(!length||Math.abs(cross(a,b,p))>1e-9*Math.sqrt(length))return null;
    const t=((p[0]-a[0])*dx+(p[2]-a[2])*dz)/length;
    return t>=-1e-8&&t<=1+1e-8?t:null;
  }
  function orderedEdge(a,b,points) {
    const cuts=new Map([[key(a),{t:0,p:a}],[key(b),{t:1,p:b}]]);
    for(const p of points){
      const t=onEdge(a,b,p);
      if(t!==null&&!cuts.has(key(p)))cuts.set(key(p),{t,p});
    }
    return [...cuts.values()].sort((u,v)=>u.t-v.t).map(c=>c.p);
  }
  for(const layer of [roof,floor]){
    const inGrip=([x,y,z])=>{
      let extent=-Infinity;
      for(const [a,b,c] of body){
        const den=(b[2]-c[2])*(a[1]-c[1])+(c[1]-b[1])*(a[2]-c[2]);
        if(Math.abs(den)<1e-15)continue;
        const u=((b[2]-c[2])*(y-c[1])+(c[1]-b[1])*(z-c[2]))/den;
        const v=((c[2]-a[2])*(y-c[1])+(a[1]-c[1])*(z-c[2]))/den;
        if(u>=-1e-10&&v>=-1e-10&&u+v<=1+1e-10)extent=Math.max(extent,u*a[0]+v*b[0]+(1-u-v)*c[0]);
      }
      return Math.abs(x)<=extent;
    };
    for(const tile of layer){
      const edges=new Map();
      const add=(a,b)=>{const k=key(a);if(edges.has(k)&&key(edges.get(k).b)!==key(b))throw Error('Ambiguous band edge');edges.set(k,{a,b});};
      for(const [a,b] of tile.border)add(a,b);
      for(let i=0;i<3;i++){
        const a=tile.tri[i],b=tile.tri[(i+1)%3];
        const cuts=orderedEdge(a,b,tile.border.flat());
        for(let j=0;j+1<cuts.length;j++){
          const u=cuts[j],v=cuts[j+1];
          if(!inGrip(tile.sample([(u[0]+v[0])/2,0,(u[2]+v[2])/2])))add(u,v);
        }
      }
      while(edges.size){
        const first=edges.values().next().value,loop=[];
        let edge=first,lastEnd=key(first.a);
        while(edge&&edges.delete(key(edge.a))){
          loop.push(edge.a);lastEnd=key(edge.b);edge=edges.get(lastEnd);
        }
        if(loop.length<3)continue;
        if(key(loop[0])!==lastEnd)throw Error('Open ring tile '+JSON.stringify([tile.sign,first.a,loop.length,lastEnd]));
        const points=loop.map(p=>new T.Vector2(p[0],p[2]));
        for(const ids of T.ShapeUtils.triangulateShape(points,[])){
          let [a,b,c]=ids.map(i=>loop[i]);
          if(onEdge(a,b,c)!==null||onEdge(b,c,a)!==null||onEdge(c,a,b)!==null)continue;
          if(tile.sign*cross(a,b,c)>0)[b,c]=[c,b];
          const polygon=[];
          for(const [p,q] of [[a,b],[b,c],[c,a]])polygon.push(...orderedEdge(p,q,loop).slice(0,-1));
          const surface=polygon.map(tile.sample);
          if(surface.length===3){emit(...surface);continue;}
          const centre=tile.sample([(a[0]+b[0]+c[0])/3,0,(a[2]+b[2]+c[2])/3]);
          for(let j=0;j<surface.length;j++)emit(centre,surface[j],surface[(j+1)%surface.length]);
        }
      }
    }
  }
  const skin=new T.BufferGeometry();
  skin.setAttribute('position',new T.Float32BufferAttribute(pOut,3));
  skin.setAttribute('normal',new T.Float32BufferAttribute(nOut,3));
  skin.setAttribute('uv',new T.Float32BufferAttribute(uvOut,2));
  skin.computeBoundingBox();skin.computeBoundingSphere();skin.userData.shared=true;
  trim.geometry=skin;
}
