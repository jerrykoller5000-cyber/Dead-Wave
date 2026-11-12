export function sideSkin(G,parts,axis='x',sign=1){
  const tris=[];
  for(const mesh of parts){
    const p=mesh.geometry.attributes.position,ix=mesh.geometry.index;
    for(let i=0;i<(ix?ix.count:p.count);i+=3){
      const [a,b,c]=[0,1,2].map(j=>{
        const v=new G.Vector3().fromBufferAttribute(p,ix?ix.getX(i+j):i+j).add(mesh.position);
        if(axis==='z')return v.set(sign*v.z,v.y,v.x);
        if(axis==='y')return v.set(sign*v.y,v.x,v.z);
        return v.set(sign*v.x,v.y,v.z);
      });
      const den=(b.y-c.y)*(a.z-c.z)+(c.z-b.z)*(a.y-c.y);
      if(Math.abs(den)<1e-13)continue;
      tris.push({a,b,c,den,z0:Math.min(a.z,b.z,c.z),z1:Math.max(a.z,b.z,c.z),y0:Math.min(a.y,b.y,c.y),y1:Math.max(a.y,b.y,c.y)});
    }
  }
  return (z,y)=>{
    let x=-Infinity;
    for(const {a,b,c,den,z0,z1,y0,y1} of tris){
      if(z<z0||z>z1||y<y0||y>y1)continue;
      const u=((b.y-c.y)*(z-c.z)+(c.z-b.z)*(y-c.y))/den,v=((c.y-a.y)*(z-c.z)+(a.z-c.z)*(y-c.y))/den;
      if(u>=-1e-9&&v>=-1e-9&&u+v<=1+1e-9)x=Math.max(x,u*a.x+v*b.x+(1-u-v)*c.x);
    }return x;
  };
}
