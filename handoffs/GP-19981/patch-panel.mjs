import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const file='ui/marine-face.js';
let source=await fs.readFile(file,'utf8');
const hash=crypto.createHash('sha256').update(source).digest('hex').toUpperCase();
if(hash!=='EF5AC2E8742951305A03C83E65AF9D031C58F7FD2F77889DF64D2DB7B818F51A')throw Error(`freshness check failed: ${hash}`);
const replace=(a,b)=>{
  if(source.split(a).length!==2)throw Error(`expected one occurrence: ${a}`);
  source=source.replace(a,b);
};
replace('const addGrid=(rows,cols,point)=>{','const addGrid=(rows,cols,point,reverse=false)=>{');
replace('      indices.push(a,a+1,b,a+1,b+1,b);','      if(reverse)indices.push(a,b,a+1,a+1,b,b+1);\n      else indices.push(a,a+1,b,a+1,b+1,b);');
const needle='  const geo=new T.BufferGeometry();';
const start=source.indexOf('export function buildSurvivorBeard');
const at=source.indexOf(needle,start);
if(at<0)throw Error('beard geometry endpoint not found');
const panel=`  // Shallow side panels carry the jaw into narrow sideburns under the ears.
  for(const side of [-1,1])addGrid(5,12,(u,v)=>{
    const z=.092-.118*u;
    const lower=1.292+.074*u*u+.002*Math.sin(u*29);
    const upper=1.357+.019*Math.sin(Math.PI*u)+.018*u;
    const y=lower+(upper-lower)*v;
    const x=side*(.123+.011*Math.sin(Math.PI*u)-.002*u);
    return [x,y,z];
  },side<0);
`;
source=source.slice(0,at)+panel+source.slice(at);
const handle=await fs.open(file,'r+');
try{await handle.writeFile(source,'utf8');await handle.truncate(Buffer.byteLength(source,'utf8'));}
finally{await handle.close();}
console.log('Applied Brandt side panels with freshness check, UTF-8 without BOM.');
