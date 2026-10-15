import fs from 'node:fs';
function edit(p,fn){const s=fs.readFileSync(p,'utf8'),t=fn(s);if(fs.readFileSync(p,'utf8')!==s)throw Error('Concurrent edit: '+p);fs.writeFileSync(p,t);}
function replace(s,a,b){if(!s.includes(a))throw Error('Missing anchor '+a);return s.replace(a,b);}
edit('studio/marine-idle.js',s=>replace(s,'    marine.updateWorldMatrix(true,true);\n    pointOnHand',`    // Bound flexion during the travel between lip and resting hand. Contact
    // follows the fingers throughout; the full draw already lies inside this limit.
    const bend=2*Math.acos(Math.min(1,Math.abs(wr.quaternion.w)));
    if(bend>1.05)wr.quaternion.slerp(new THREE.Quaternion(),1-1.05/bend);
    wr.getWorldQuaternion(handQ);
    marine.updateWorldMatrix(true,true);
    pointOnHand`));
edit('index.html',s=>replace(s,'bodyY = -0.001 - Math.max(0, breathe)','bodyY = 0.003 - Math.max(0, breathe)'));
edit('studio/marine-turn.js',s=>replace(s,'* sc * .995, f = feet[i]','* sc * (.999 - .004*crouch), f = feet[i]'));
edit('ui/marine-kit-fit.js',s=>{
const a=s.indexOf('  const n=16,rows=6'),b=s.indexOf('  rest.push(...p);',a);
if(a<0||b<0)throw Error('wrist anchors');
return s.slice(0,a)+`  const n=120,rows=4,p=[],uv=[],ix=[],rest=[],weights=[];
  // Match the actual polygon boundaries, including the palm's half-segment
  // angular offset. Scaling happens about the wrist pivot, not the elbow.
  const boundary=(a,count,phase,exponent,rx,rz,cx,cy,cz)=>{
    const f=a/(Math.PI*2)*count-phase,k=Math.floor(f),t=f-k;
    const point=j=>{const q=(j+phase)/count*Math.PI*2,x=Math.sin(q),z=Math.cos(q);
      return [cx+Math.sign(x)*Math.abs(x)**exponent*rx,cy,cz+Math.sign(z)*Math.abs(z)**exponent*rz];};
    const A=point(k),B=point(k+1);return A.map((v,i)=>v+(B[i]-v)*t);
  };
  for(let r=0;r<=rows;r++){
    const t=r/rows;
    for(let j=0;j<=n;j++){
      const a=j/n*Math.PI*2,A=boundary(a,24,0,.88,.037,.036,ox,-.18,oz);
      const B=boundary(a,10,.5,.7,.029,.016,ox,-.214,gz-.022);
      for(let c=0;c<3;c++){const o=[wrist.position.x,wrist.position.y,wrist.position.z][c];B[c]=o+(B[c]-o)*scale;}
      p.push(...A.map((v,c)=>v+(B[c]-v)*t));uv.push(j/n,t);weights.push(t*t*(3-2*t));
    }
  }
`+s.slice(b);
});
