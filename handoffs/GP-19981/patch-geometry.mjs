import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const file='ui/marine-face.js';
let source=await fs.readFile(file,'utf8');
const hash=crypto.createHash('sha256').update(source).digest('hex').toUpperCase();
if(hash!=='DB53EAFBE777F7015E3C37F346F5F2A0BCDB54B4927473E39D5DBF145DBCCA7B')throw Error(`freshness check failed: ${hash}`);
const begin=source.indexOf('  addGrid(7,32,(u,v)=>{',source.indexOf('export function buildSurvivorBeard'));
const end=source.indexOf('  for(const side of [-1,1])',begin);
if(begin<0||end<=begin||source.indexOf('  addGrid(7,32,(u,v)=>{',begin+1)>=0)throw Error('unexpected beard source');
const replacement=`  const jaw=surface(T,[
    [1.273,.039,.108,.050],[1.282,.058,.129,.060],
    [1.296,.076,.147,.075],[1.311,.094,.159,.088],
    [1.327,.108,.166,.101],[1.341,.118,.166,.109]
  ],{frontOnly:true});
  positions.push(...jaw.attributes.position.array);
  uv.push(...jaw.attributes.uv.array);
  indices.push(...jaw.index.array);
  jaw.dispose();
  // A few short lower tufts break the old smooth helmet-like hem.
  for(let j=0;j<=32;j++){
    const a=-Math.PI+j/32*Math.PI*2;
    if(Math.abs(a)>1.45)continue;
    positions[j*3+1]+=(.0028*Math.sin(a*13+.4)+.0013*Math.sin(a*23-.6))*(1-Math.abs(a)/1.45);
  }
`;
source=source.slice(0,begin)+replacement+source.slice(end);
const handle=await fs.open(file,'r+');
try{await handle.writeFile(source,'utf8');await handle.truncate(Buffer.byteLength(source,'utf8'));}
finally{await handle.close();}
console.log('Applied Brandt jaw loft geometry with freshness check, UTF-8 without BOM.');
