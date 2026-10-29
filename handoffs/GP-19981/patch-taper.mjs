import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const file='ui/marine-face.js';
let source=await fs.readFile(file,'utf8');
const hash=crypto.createHash('sha256').update(source).digest('hex').toUpperCase();
if(hash!=='EF5AC2E8742951305A03C83E65AF9D031C58F7FD2F77889DF64D2DB7B818F51A')throw Error(`freshness check failed: ${hash}`);
const needle='  for(const side of [-1,1])addGrid(2,10,(u,v)=>{';
if(source.split(needle).length!==2)throw Error('expected one moustache grid');
const insert=`  // Draw the cheek growth down to a short tapered sideburn, not a cut slab.
  for(let r=0;r<6;r++)for(const j of [9,10,11,21,22,23]){
    const taper=(j===9||j===23)?.88:(j===10||j===22)?.48:.12;
    const k=(r*33+j)*3+1;
    positions[k]=positions[k]*(1-taper)+(1.35-1.22)*taper;
  }
`;
source=source.replace(needle,insert+needle);
const handle=await fs.open(file,'r+');
try{await handle.writeFile(source,'utf8');await handle.truncate(Buffer.byteLength(source,'utf8'));}
finally{await handle.close();}
console.log('Applied Brandt cheek taper with freshness check, UTF-8 without BOM.');
