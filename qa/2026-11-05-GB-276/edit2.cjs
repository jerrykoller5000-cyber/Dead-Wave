const fs=require('fs');const f='tools/tests/t224.js';let s=fs.readFileSync(f,'utf8');
for(const [a,b] of [["[0, 0.29, -0.02].some(","[0, 0.27, -0.02].some("],["(applyCarryPlan: the first +0.29 m, the second -0.02 m).","(applyCarryPlan: the shorter +0.27 m, the taller -0.02 m; GB-276)."]]){const n=s.split(a).length-1;if(n!==1)throw new Error('x'+n);s=s.replace(a,()=>b);}
fs.writeFileSync(f,s);console.log('ok');
