// Read ONLY wardrobe / appearance from the game's own Edge profile. Never opens or writes its database.
import fs from 'node:fs';
const path='C:/Users/Zero/AppData/Local/TinyTrek/Browser/Default/Local Storage/leveldb/000004.log';
const data=fs.readFileSync(path), records=[];
let fragments=[];
for(let base=0;base<data.length;base+=32768){
  let pos=base;
  while(pos+7<=Math.min(base+32768,data.length)){
    const len=data.readUInt16LE(pos+4), type=data[pos+6];
    if(!len || pos+7+len>data.length)break;
    const part=data.subarray(pos+7,pos+7+len);pos+=7+len;
    if(type===1)records.push(part);
    else if(type===2)fragments=[part];
    else if(type===3)fragments.push(part);
    else if(type===4){fragments.push(part);records.push(Buffer.concat(fragments));fragments=[];}
  }
}
const found=[];
for(const r of records){
  let p=12;
  const n=()=>{let v=0,shift=0,x;do{x=r[p++];v|=(x&127)<<shift;shift+=7;}while(x&128);return v>>>0;};
  for(let i=0;i<r.readUInt32LE(8)&&p<r.length;i++){
    const type=r[p++],kl=n(),k=r.subarray(p,p+kl);p+=kl;
    let v=null;if(type===1){const vl=n();v=r.subarray(p,p+vl);p+=vl;}
    const key=k.toString('latin1');
    if(!key.startsWith('_http://127.0.0.1:8766\0')||!v)continue;
    if(!/tt_wardrobe$|tt_camo$/.test(key))continue;
    const value=v.subarray(1).toString(v[0]===0?'utf16le':'latin1');
    found.push({key:key.split('\0').at(-1).slice(1),value});
  }
}
const last={};for(const row of found)last[row.key]=row.value;
if(last.tt_wardrobe){const wardrobe=JSON.parse(last.tt_wardrobe);fs.writeFileSync('review/dance-GP19902/outfit.json',JSON.stringify({wardrobe,source:'Read-only latest tt_wardrobe from the Grave Shift Edge profile, port 8766',gear:{helmet:true,vest:true,pads:true,nvg:true},gearSource:'Full training kit as shown in Jerry\'s screenshots'},null,2)+'\n');}
console.log(JSON.stringify({matchingRecords:found.length,appearance:last},null,2));
