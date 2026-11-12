import {readFile,writeFile} from 'node:fs/promises';
const s=JSON.parse(await readFile(new URL('trial.json',import.meta.url),'utf8')),p=s.guard.data.attributes.position.array;
function hits(a,b,axes){
 const list=[];
 for(let i=0;i<p.length;i+=9){
  const A=p.slice(i,i+3),B=p.slice(i+3,i+6),C=p.slice(i+6,i+9),[u,v,w]=axes;
  const den=(B[v]-C[v])*(A[u]-C[u])+(C[u]-B[u])*(A[v]-C[v]);
  if(Math.abs(den)<1e-16)continue;
  const x=((B[v]-C[v])*(a-C[u])+(C[u]-B[u])*(b-C[v]))/den;
  const y=((C[v]-A[v])*(a-C[u])+(A[u]-C[u])*(b-C[v]))/den,z=1-x-y;
  if(x>=-1e-8&&y>=-1e-8&&z>=-1e-8)list.push(x*A[w]+y*B[w]+z*C[w]);
 }
 return list.sort((a,b)=>a-b).filter((q,i,all)=>!i||q-all[i-1]>1e-7);
}
const xs=[-.0159,-.0145,-.0135,-.011,-.010,0,.010,.011,.0135,.0145,.0159],front=[];
for(const [lo,hi,target] of [[-52,-48,83],[-56,-52,92],[-60,-56,99],[-68,-60,105],[-72,-68,110],[-80,-72,111.5],[-88,-80,109]]){
 let min=Infinity,worst=null;
 for(let y=lo+.1;y<hi;y+=.5)for(const x of xs){const h=hits(x,y/1000,[0,1,2]);if(h.length!==2&&h.length!==4){worst={x,y,h};min=-Infinity;break;}const inner=h.at(-2)*1000;if(inner<min){min=inner;worst={x,y,hits:h.length};}}
 front.push({y:[lo,hi],targetMm:target,minInnerFrontMm:min,worst,passes:min>=target});
}
const bottom=[];
for(let z=86;z<=110;z+=2){
 let max=-Infinity,worst=null;
 for(const x of xs){const h=hits(x,z/1000,[0,2,1]);if(h.length<2){max=Infinity;worst={x,h};break;}if(h[1]*1000>max){max=h[1]*1000;worst={x};}}
 bottom.push({zMm:z,maxInnerBottomMm:max,worst,passes:max<=-91});
}
let outer=-Infinity;
for(let i=0;i<p.length;i+=3)if(p[i+1]<=-.088)outer=Math.max(outer,p[i+2]);
for(let i=0;i<p.length;i+=9)for(const [a,b] of [[i,i+3],[i+3,i+6],[i+6,i]])if((p[a+1]<-.088)!==(p[b+1]<-.088)){const t=(-.088-p[a+1])/(p[b+1]-p[a+1]);outer=Math.max(outer,p[a+2]+t*(p[b+2]-p[a+2]));}
const result={samplesXmm:xs.map(x=>x*1000),front,bottom,outerFrontBelowY88Mm:outer*1000};
await writeFile(new URL('cavity-measurements.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
