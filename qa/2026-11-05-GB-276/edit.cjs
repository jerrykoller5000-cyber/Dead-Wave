const fs=require('fs');
function edit(f,a,b){let s=fs.readFileSync(f,'utf8');const n=s.split(a).length-1;if(n!==1)throw new Error(f+' anchor x'+n);fs.writeFileSync(f,s.replace(a,()=>b));}
edit('index.html',"const rise=i===0?.29:-.02;","// GB-276 (Claude, 4 Nov): by height, not slot: the taller handgun (the revolver) rides the lower row, the shorter above at +0.27.\n          const up=(p.secondaryKinds[0]==='revolver'&&p.secondaryKinds[1]!=='revolver')?1:0;\n          const rise=i===up?.27:-.02;");
edit('tools/tests/t224.js',"[0, 0.29, -0.02].some(","[0, 0.27, -0.02].some(");
edit('tools/tests/t224.js',"(applyCarryPlan: the first +0.29 m, the second -0.02 m).","(applyCarryPlan: the shorter +0.27 m, the taller -0.02 m; GB-276).");
console.log('ok');
