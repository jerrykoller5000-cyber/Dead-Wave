import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const file='ui/marine-face.js';
let source=await fs.readFile(file,'utf8');
const hash=crypto.createHash('sha256').update(source).digest('hex').toUpperCase();
if(hash!=='05E171C5A21EB50958E852E46BB6056FCC78CA060292B4D77345024CC55D8886')throw Error(`freshness check failed: ${hash}`);
const start=source.indexOf('  // Draw the cheek growth down to a short tapered sideburn');
const end=source.indexOf('  for(const side of [-1,1])',start);
if(start<0||end<=start)throw Error('taper block not found');
source=source.slice(0,start)+source.slice(end);
const handle=await fs.open(file,'r+');
try{await handle.writeFile(source,'utf8');await handle.truncate(Buffer.byteLength(source,'utf8'));}
finally{await handle.close();}
console.log('Removed the trial cheek taper that opened a profile gap.');
