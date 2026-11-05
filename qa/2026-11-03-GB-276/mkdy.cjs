const fs=require('fs');let a=fs.readFileSync('tools/tests/t224.js','utf8');
const rep=(x,y)=>{if(!a.includes(x))throw new Error('missing '+x);a=a.replace(x,y);};
rep("const SCEN = [['m4', 'ak', 'uzi', 'revolver'], ['ak', 'm4', 'revolver', 'pistol'], ['minigun', 'm4', 'uzi', 'revolver'], ['shotgun', 'aa12', 'revolver', null]];",
    "const SCEN = [0,0.01,0.02,0.04,0.06,0.09].map((d) => ['ak', 'm4', 'pistol', 'revolver', d]);");
rep("for (const [a, b, c, d] of SCEN) {","for (const [a, b, c, d, dy] of SCEN) {");
rep("marine.updateMatrixWorld(true);\n      const torso = ud.torsoG","marine.updateMatrixWorld(true); for (const s0 of [...rig.holsters, ...rig.pairs]) if (s0.kind === 'pistol' && s0.g.visible) s0.g.position.y -= dy; marine.updateMatrixWorld(true);\n      const torso = ud.torsoG");
rep("tag = [a, b, c, d].join('/')","tag = [a, b, c, d, 'dy' + dy].join('/')");
rep("![0, 0.29, -0.02].some((row) => Math.abs(sp.g.position.y - (fit.y - tp + row)) < 1e-6)","![0, 0.29, -0.02].some((row) => Math.abs(sp.g.position.y + (sp.kind==='pistol'?dy:0) - (fit.y - tp + row)) < 1e-6)");
fs.writeFileSync('qa/2026-11-03-GB-276/t224-dy.js',a,'utf8');