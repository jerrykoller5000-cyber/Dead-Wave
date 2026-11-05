const fs=require('fs');let a=fs.readFileSync('tools/tests/t224.js','utf8');
const k="['ak', 'm4', 'revolver', 'pistol']";if(!a.includes(k))throw new Error('no scen');
a=a.replace(k,"['ak', 'm4', 'pistol', 'revolver']");
fs.writeFileSync('qa/2026-11-03-GB-276/t224-swap.js',a,'utf8');