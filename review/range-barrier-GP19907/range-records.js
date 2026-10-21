import {boardKey} from './range-drills.js';
export const RANGE_RECORDS_KEY='tt_range_drills_v1';
export const compareRangeResults=(a,b)=>b.score-a.score||a.time-b.time||b.efficiency-a.efficiency||a.at-b.at||(a.id<b.id?-1:a.id>b.id?1:0);
export function createRangeRecords({load=()=>null,save=()=>{},now=()=>Date.now()}={}){
 let boards=Object.create(null),saved=new Set(),storageOK=true;
 const valid=r=>r&&typeof r.id==='string'&&Number.isFinite(r.score)&&r.score>=0&&Number.isFinite(r.time)&&r.time>=0&&Number.isFinite(r.efficiency)&&r.efficiency>=0&&r.efficiency<=100&&Number.isFinite(r.at);
 try{const v=JSON.parse(load());if(v?.version===1&&v.boards&&typeof v.boards==='object')for(const[k,rows]of Object.entries(v.boards))if(Array.isArray(rows))boards[k]=rows.filter(valid).sort(compareRangeResults).slice(0,10);}catch{}
 return {
  list:(d,l)=>[...(boards[boardKey(d,l)]||[])].map(r=>({...r})),
  commit(d,l,result){
   if(result?.state!=='COMPLETED'||!valid({...result,at:now()})||saved.has(result.id))return null;
   const key=boardKey(d,l),entry={id:result.id,score:result.score,time:Math.round(result.time*1000)/1000,efficiency:Math.round(result.efficiency*100)/100,at:now()};
   const rows=[...(boards[key]||[])];if(rows.some(r=>r.id===entry.id))return null;saved.add(entry.id);rows.push(entry);rows.sort(compareRangeResults);boards[key]=rows.slice(0,10);
   try{save(JSON.stringify({version:1,boards}));}catch{storageOK=false;}
   return {rank:rows.indexOf(entry)+1,best:boards[key][0]===entry,storageOK};
  },storageOK:()=>storageOK
 };
}
