import fs from 'node:fs';import crypto from 'node:crypto';const dir='review/training-fit-GP19898',proof=[];
function edit(path,changes){const original=fs.readFileSync(path,'utf8'),crlf=original.includes('\r\n');let s=original;for(let [a,b]of changes){if(crlf){a=a.replaceAll('\n','\r\n');b=b.replaceAll('\n','\r\n');}if(s.split(a).length!==2)throw Error('Anchor not unique: '+path+' '+a.slice(0,70));s=s.replace(a,b);}if(fs.readFileSync(path,'utf8')!==original)throw Error('Freshness '+path);fs.writeFileSync(dir+'/'+path.replaceAll('/','-')+'.before',original,'utf8');fs.writeFileSync(path,s,'utf8');const hash=x=>crypto.createHash('sha256').update(x).digest('hex');proof.push({path,before:hash(original),after:hash(s),hunks:changes.length});}
edit('index.html',[
 ["        copy.name = 'training-' + k;", "        copy.name = 'training-' + k;\n        if (k === 'skullWindow') copy.scale.multiplyScalar(.84); // Jerry GP-19898: fit inside the fence recess"],
 ["if (perimeter?.moved) { p.x = perimeter.x; p.z = perimeter.z;", "if (perimeter?.moved) { if (Math.hypot(p.x-playerFrameStart.x,p.z-playerFrameStart.z)>.003) AudioSys.trainingCue('fence-bump'); p.x = perimeter.x; p.z = perimeter.z;"]
]);
edit('world/training.js',[
 ["import { isTrainingBorderCell }", "import { isTrainingBorderCell, trainingBorderPaintRect }"],
 ["box(.15, .46, .32, steel, D.x + side * .31, 1.4, kz);", "box(.15, .46, .32, steel, D.x + side * .10, 1.4, kz); // back flush with the wall face"],
 ["box(.025, .12, .16, doorLamp, D.x + side * .4, 1.48, kz);", "box(.025, .12, .16, doorLamp, D.x + side * .19, 1.48, kz);"],
 ["box(.05, .16, .14, steelLight, D.x + side * .4, 1.28, kz);", "box(.05, .16, .14, steelLight, D.x + side * .19, 1.28, kz);"],
 ["keypadFace, D.x + side * .4255, 1.28, kz);", "keypadFace, D.x + side * .2155, 1.28, kz);"],
 ["keypads.push({ side, x: O.x + D.x + side * .4,", "keypads.push({ side, x: O.x + D.x + side * .19,"],
 ["  const paintCells = gateCells.slice(),", "  const medicalPaint = {minX:O.x+BAY.minX,maxX:O.x+BAY.maxX,minZ:O.z+BAY.minZ,maxZ:O.z+BAY.maxZ};\n  const paintGrid = {grid,offset,minGX,maxGX,minGZ,maxGZ};\n  const paintCells = gateCells.slice(),"],
 ["if(!isTrainingBorderCell({minGX,maxGX,minGZ,maxGZ},gx,gz)||inLocalRect(gx,gz,BAY.minX,BAY.maxX,BAY.minZ,BAY.maxZ)||painted.has(gx+','+gz))continue;", "if(!isTrainingBorderCell(paintGrid,gx,gz)||!trainingBorderPaintRect(paintGrid,gx,gz,medicalPaint)||painted.has(gx+','+gz))continue;"],
 ["      const x0 = gc(gx) - O.x - grid / 2 + inset, x1 = x0 + grid - 2 * inset, z0 = gc(gz) - O.z - grid / 2 + inset, z1 = z0 + grid - 2 * inset;", "      const rect = trainingBorderPaintRect(paintGrid,gx,gz,isTrainingBorderCell(paintGrid,gx,gz)?medicalPaint:null,inset);\n      if (!rect) continue;\n      const x0=rect.x0-O.x,x1=rect.x1-O.x,z0=rect.z0-O.z,z1=rect.z1-O.z;"]
]);fs.writeFileSync(dir+'/scope-proof.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));
