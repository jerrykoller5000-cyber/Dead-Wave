export function topTuples(geometry){
  const {position:p,normal:n,uv}=geometry.attributes,ix=geometry.index,faces=[];
  for(let i=0;i<(ix?.count??p.count);i+=3){
    const [a,b,c]=[0,1,2].map(j=>{
      const k=ix?ix.getX(i+j):i+j;return [p.getX(k),p.getZ(k),p.getY(k),n.getX(k),n.getY(k),n.getZ(k),uv.getX(k),uv.getY(k)];
    });
    const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
    if(Math.abs(den)>1e-15)faces.push({a,b,c,den});
  }
  return (x,z)=>{
    let best=null;
    for(const {a,b,c,den} of faces){
      const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(z-c[1]))/den;
      const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(z-c[1]))/den,w=1-u-v;
      if(Math.min(u,v,w)<-1e-8)continue;
      const tuple=a.slice(2).map((value,k)=>u*value+v*b[k+2]+w*c[k+2]);
      if(!best||tuple[0]>best[0])best=tuple;
    }
    return best;
  };
}
