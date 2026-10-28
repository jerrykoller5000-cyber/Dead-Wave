const fs=require('fs'),crypto=require('crypto');let t=fs.readFileSync('index.html','utf8');console.log('hash',crypto.createHash('sha1').update(t).digest('hex'));
const R=[
["    const burlapVC = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, vertexColors: true });\n",
 "    const burlapVC = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, vertexColors: true });\n    const paintVC = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.08, roughness: 0.69, vertexColors: true });   // GB-242: the wire's paints in one draw\n"],
["      const postMat = matOverride || tierMats.paintOliveDark;\n      const dark = matOverride || tierMats.paintCharcoal;\n      const strandMat = matOverride || tierMats.steel;\n      const barbMat = matOverride || tierMats.wornSteel;\n",
 "      // GB-242 (t13): two baked meshes, not four: the paints are shades of paintVC, the worn steel a shade of steelVC\n      // (with the strands and rivets). Same colours as paintOliveDark, paintCharcoal and wornSteel.\n      const postMat = matOverride || WIRE_TINTS.olive;\n      const dark = matOverride || WIRE_TINTS.charcoal;\n      const strandMat = matOverride || tierMats.steel;\n      const barbMat = matOverride || WIRE_TINTS.worn;\n"],
["    function makeWireMesh(matOverride = null) {\n",
 "    const WIRE_TINTS = { olive: tint(paintVC, 0x3c442f), charcoal: tint(paintVC, 0x2a2e33), worn: tint(steelVC, 0x767e87) };\n    function makeWireMesh(matOverride = null) {\n"]];
for(const [a] of R){const n=t.split(a).length-1;if(n!==1){console.log('COUNT',n,a.slice(0,60));process.exit(1)}}
if(fs.readFileSync('index.html','utf8')!==t)process.exit(1);
for(const [a,b] of R)t=t.replace(a,()=>b);fs.writeFileSync('index.html',t);console.log('saved');
