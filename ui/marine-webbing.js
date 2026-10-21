// Flat, thick webbing along a sewn path. Width stays across the strap rather than
// becoming a round cable; no animation joints or wardrobe materials are replaced.
export function webbingGeometry(T, points, width, thickness=.008, {closed=false, widthAxis=[1,0,0], segments=40, fit=null}={}) {
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed,'centripetal');
  const axis=new T.Vector3(...widthAxis).normalize(),positions=[],uv=[],indices=[];
  for(let j=0;j<=segments;j++){
    const t=j/segments,c=curve.getPointAt(t),d=curve.getTangentAt(t),normal=new T.Vector3().crossVectors(axis,d).normalize();
    for(const[s,h]of[[-1,-1],[1,-1],[-1,1],[1,1]]){
      const p=c.clone().addScaledVector(axis,s*width/2);if(fit)fit(p);
      p.addScaledVector(normal,h*thickness/2);positions.push(p.x,p.y,p.z);uv.push(s*.5+.5,t*6);
    }
  }
  for(let j=0;j<segments;j++)for(const[a,b]of[[0,1],[1,3],[3,2],[2,0]]){
    const x=j*4+a,y=j*4+b;indices.push(x,y,x+4,y,y+4,x+4);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}

const profile=(rows,y)=>{
  if(y<=rows[0][0])return rows[0][1];
  for(let i=1;i<rows.length;i++)if(y<=rows[i][0]){const[a,b]=[rows[i-1],rows[i]],t=(y-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t;}
  return rows.at(-1)[1];
};
// Front includes shirt pouches or the carrier's loaded pouches; the back crosses
// the pack exterior. Separate profiles avoid pushing the entire loop through him.
const frontBare=[[.70,.105],[.78,.132],[.84,.175],[.89,.2],[.945,.196],[1.0,.151],[1.10,.15],[1.15,.122],[1.2,.063]];
const frontVest=[[.70,.11],[.78,.152],[.84,.213],[.90,.235],[.98,.237],[1.015,.219],[1.10,.223],[1.15,.177],[1.2,.063]];
const back=[[.70,.12],[.79,.20],[.85,.285],[.90,.322],[1.05,.322],[1.12,.286],[1.17,.18],[1.21,.07]];
export function bandolierFit(dir,vest,layer=0) {
  const a=dir*.62,c=Math.cos(a),s=Math.sin(a);
  return p=>{
    const y=.98+p.x*s+p.y*c;
    const overlap=layer*Math.max(0,1-Math.abs(y-.98)/.19);
    if(p.z>.075)p.z=profile(vest?frontVest:frontBare,y)+.008+overlap;
    else if(p.z<-.075)p.z=-profile(back,y)-.008-overlap;
    return p;
  };
}
