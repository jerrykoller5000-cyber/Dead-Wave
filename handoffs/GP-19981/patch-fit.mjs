import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const file='ui/marine-face.js';
let source=await fs.readFile(file,'utf8');
const hash=crypto.createHash('sha256').update(source).digest('hex').toUpperCase();
if(hash!=='E2D973CA5AE097E65FA56C03D42A03451B70D2991D64603BC369B03D8D8A2C25')throw Error(`freshness check failed: ${hash}`);
const changes=[
  ['const rawBottom=1.258+.108*p**1.25;','const rawBottom=1.274+.092*p*p;'],
  ['const ragged=(.0035*Math.sin(a*13+.4)+.0018*Math.sin(a*23-.6))*(1-p);','const ragged=(.0025*Math.sin(a*13+.4)+.0012*Math.sin(a*23-.6))*(1-p);'],
  ['const loft=.0025+.017*chin+.002*Math.sin(a*8+v*4)*Math.sin(Math.PI*v)*(1-p);','const loft=.007+.013*chin+.0015*Math.sin(a*8+v*4)*Math.sin(Math.PI*v)*(1-p);'],
  ['return [(w+loft*.42)*Math.sin(a),y,(f+loft)*Math.cos(a)**.55];','return [(w+.013+loft*.52)*Math.sin(a),y,(f+.006+loft)*Math.cos(a)**.55];'],
  ['const lower=1.350-.003*p,upper=lower+(.016-.006*p)*tip;','const lower=1.352-.003*p,upper=lower+(.021-.011*p)*tip;'],
  ['const z=.171-.007*p*p+.0015*Math.sin(Math.PI*v);','const z=.174-.007*p*p+.0015*Math.sin(Math.PI*v);']
];
for(const [before,after]of changes){
  if(source.split(before).length!==2)throw Error(`expected one occurrence: ${before}`);
  source=source.replace(before,after);
}
const handle=await fs.open(file,'r+');
try{
  await handle.writeFile(source,'utf8');
  await handle.truncate(Buffer.byteLength(source,'utf8'));
}finally{await handle.close();}
console.log(`Applied ${changes.length} exact Brandt beard fit edits, UTF-8 without BOM.`);
