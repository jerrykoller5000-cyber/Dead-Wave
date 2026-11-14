import fs from 'node:fs';
const dir='review/GP-20133/correct-shadow-cpu/';
const rows=[];
for(const file of fs.readdirSync(dir).filter(f=>/^cpu-.*\.json$/.test(f))){
 const p=JSON.parse(fs.readFileSync(dir+file)).profile;
 const nodes=new Map(p.nodes.map(n=>[n.id,n]));const parent=new Map();for(const n of p.nodes)for(const c of n.children||[])parent.set(c,n.id);
 const self=new Map(),inclusive=new Map(),matrixCaller=new Map();let total=0;
 const key=n=>[n.callFrame.functionName||'(anonymous)',n.callFrame.url.split('/').at(-1)+':'+(n.callFrame.lineNumber+1)].join(' ');
 const add=(map,k,ms)=>map.set(k,(map.get(k)||0)+ms);
 for(let i=0;i<p.samples.length;i++){
  const ms=p.timeDeltas[i]/1000;total+=ms;const leaf=nodes.get(p.samples[i]);add(self,key(leaf),ms);
  const seen=new Set();let n=leaf;const stack=[];while(n){const k=key(n);if(!seen.has(k)){add(inclusive,k,ms);seen.add(k);}stack.push(n);n=nodes.get(parent.get(n.id));}
  if(leaf.callFrame.functionName==='updateMatrixWorld'){
   const ctx=stack.slice(1).filter(n=>!['updateMatrixWorld','updateWorldMatrix'].includes(n.callFrame.functionName)).slice(0,4).map(n=>n.callFrame.functionName||'(anonymous)').join(' <- ');add(matrixCaller,ctx,ms);
  }
 }
 const sorted=m=>[...m].sort((a,b)=>b[1]-a[1]).map(([name,ms])=>({name,ms,percent:100*ms/total}));
 rows.push({file,windowMs:total,self:sorted(self).slice(0,25),inclusiveUniquePerSample:sorted(inclusive).slice(0,25),matrixSelfNearestCaller:sorted(matrixCaller)});
}
const report={scope:'CPU sampling diagnostics, not acceptance. Each inclusive function key counted once per sample, including recursion; inclusive values for different functions still overlap and must not be added. Matrix caller rows partition updateMatrixWorld self samples only. Profiler overhead and postphase polling retained.',rows};
fs.writeFileSync(dir+'unique-stack-summary.json',JSON.stringify(report,null,2));console.log(JSON.stringify(rows.map(r=>({file:r.file,matrix:r.matrixSelfNearestCaller.slice(0,4)})),null,2));