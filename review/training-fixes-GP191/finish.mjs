import fs from 'node:fs';
import {createHash} from 'node:crypto';
const dir='review/training-fixes-GP191';
const paths=['index.html','world/training.js','world/training-props.js'];
const old=paths.map(p=>fs.readFileSync(p,'utf8'));
const edit=(s,a,b)=>{if(!s.includes(a)||s.indexOf(a)!==s.lastIndexOf(a))throw Error('Expected one match: '+a);return s.replace(a,b);};
const changed=old.map(s=>s.replace(/\r\n/g,'\n'));
changed[0]=edit(changed[0],'      if (!house.group || !house.group.visible) return;\n      updateHQ(dt);',
 '      if (!house.group || (!house.group.visible && !training.active)) return;\n      updateHQ(dt);   // GP-191: the Training intake still processes skulls while the outdoor HQ is hidden.');
let p=changed[2];
p=edit(p,'// GP-168: static Training props. Everything uses the room\'s ownership/bake path.', '// GP-168/GP-191: Training props; gate leaves stay separate for animation.');
p=edit(p,'  let moving = null;\n  const route = m => { if (moving) moving.add(m); return m; };',
 `  let moving = null, staticGate = null;
  const gateFrame = new T.Group(); gateFrame.name = 'training-gate-frame';
  const route = m => { const parent = moving || staticGate; if (parent) parent.add(m); return m; };`);
p=edit(p,'    leaf.userData.side = side; return leaf;', '    leaf.userData.side = side; leaf.scale.y = 1.4; return leaf;');
p=edit(p,'  const gx=gate.x, gz=B.maxZ-.02;', '  staticGate = gateFrame; gateFrame.scale.y = 1.4;\n  const gx=gate.x, gz=B.maxZ-.02;');
p=edit(p,"  if(labels.gate)sign(labels.gate,4.1,.54,gx,5.02,gz-.66,Math.PI,{bg:'#1e2923',color:'#ddd6b1',size:150});",
 "  if(labels.gate)gateFrame.add(sign(labels.gate,4.1,.54,gx,5.02,gz-.66,Math.PI,{bg:'#1e2923',color:'#ddd6b1',size:150}));");
p=edit(p,'  // A fitted field medical bay along the back wall.', '  staticGate = null;\n\n  // A fitted field medical bay along the back wall.');
p=edit(p,'return { gateLeaves, gateLamp: amber };','return { gateLeaves, gateFrame, gateLamp: amber };');
changed[2]=p;
let w=changed[1];
w=edit(w,'gateHalfWidth = 3.3, gateHeight = 4.5;', 'gateHalfWidth = 3.3, gateHeight = 6.3;');
w=edit(w,'  const gateLeafSolids = releaseProps.gateLeaves.map(leaf => {',
 '  g.add(releaseProps.gateFrame); bakeStatic(T, releaseProps.gateFrame);\n  const gateLeafSolids = releaseProps.gateLeaves.map(leaf => {');
w=edit(w,'halfWidth: 3.3 },', 'halfWidth: 3.3, height: gateHeight },');
w=edit(w,"//     build: { grid, minGX, maxGX, minGZ, maxGZ, refusal(gx, gz) -> null | 'outside' | 'gate' | 'door' | 'terminal' |\n//              'infirmary', gateCells: [[gx, gz]] }", "//     releaseGate: { setState({ amount, lit }), leaves, lamp, passage: { x, wallZ, spawnZ, halfWidth, height } }\n//     build: { grid, offset, minGX, maxGX, minGZ, maxGZ, refusal(gx, gz) -> null | 'outside' | 'gate' | 'door' | 'terminal' |\n//              'infirmary' | 'column', gateCells: [[gx, gz]] }");
w=edit(w,"//   opts.grid: the game's build lattice (2 m, centred on multiples of it in world coordinates)",
 "//   opts.grid: the game's build lattice (2 m); opts.gridOffset offsets cell centres (Training uses 1 m to meet walls).");
changed[1]=w;
const updated=changed.map((s,i)=>old[i].includes('\r\n')?s.replaceAll('\n','\r\n'):s);
for(let i=0;i<paths.length;i++)if(fs.readFileSync(paths[i],'utf8')!==old[i])throw Error('Concurrent change: '+paths[i]);
for(let i=0;i<paths.length;i++){fs.writeFileSync(`${dir}/refinement-backup-${paths[i].replaceAll('/','-')}`,old[i],'utf8');
 if(fs.readFileSync(paths[i],'utf8')!==old[i])throw Error('Concurrent change: '+paths[i]);fs.writeFileSync(paths[i],updated[i],'utf8');}
const sha=s=>createHash('sha256').update(s).digest('hex');
fs.writeFileSync(`${dir}/final-hashes.json`,JSON.stringify(paths.map((path,i)=>({path,sha:sha(updated[i])})),null,2)+'\n');
console.log('Fixed hidden-HQ processing and enlarged gate clearance to 6.3m.');
