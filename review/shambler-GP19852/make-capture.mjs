import fs from 'node:fs';
let s=fs.readFileSync('review/feral-claws-GP19850/capture.mjs','utf8');
s=s.replaceAll('feral-claws-GP19850','shambler-GP19852').replaceAll("'feral'","'shambler'");
s=s.replace('  proof.effects=await E.ev(`return T.feralMotionDbg?.state()||null;`);',`  proof.ankles=await E.ev(\`return [F.mesh.userData.legLG,F.mesh.userData.legRG].map(l=>({thigh:l.rotation.x,knee:l.userData.shinG.rotation.x,ankle:l.userData.shamblerAnkle?.rotation.x}));\`);`);
fs.writeFileSync('review/shambler-GP19852/capture.mjs',s);
