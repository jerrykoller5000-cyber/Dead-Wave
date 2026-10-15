import {boardKey} from './range-drills.js';
import {targetGoal} from './range-guide.js';
export const RANGE_RECORDS_KEY='tt_range_drills_v1';
export const compareRangeResults=(a,b)=>b.score-a.score||a.time-b.time||b.efficiency-a.efficiency||a.at-b.at||(a.id<b.id?-1:a.id>b.id?1:0);
const clean=r=>r?.goal>0&&r.cleared>=r.goal&&r.missed===0;
export function createRangeRecords({load=()=>null,save=()=>{},now=()=>Date.now()}={}){
 let boards=Object.create(null),bests=Object.create(null),saved=new Set(),storageOK=true;
 const valid=r=>r&&typeof r.id==='string'&&Number.isFinite(r.score)&&r.score>=0&&Number.isFinite(r.time)&&r.time>=0&&Number.isFinite(r.efficiency)&&r.efficiency>=0&&r.efficiency<=100&&Number.isFinite(r.at)&&['goal','cleared','missed','shots','firstShot','draws','reloads'].every(k=>r[k]==null||Number.isFinite(r[k])&&r[k]>=0);
 function consider(key,r){
  const b=bests[key]||(bests[key]={});
  if(!b.score||compareRangeResults(r,b.score)<0)b.score=r;
  if(clean(r)){
   if(!b.speed||r.time<b.speed.time||r.time===b.speed.time&&r.score>b.speed.score)b.speed=r;
   if(!b.accuracy||r.efficiency>b.accuracy.efficiency||r.efficiency===b.accuracy.efficiency&&r.score>b.accuracy.score)b.accuracy=r;
   if(r.draws>0&&r.firstShot!=null&&(!b.draw||r.firstShot<b.draw.firstShot))b.draw=r;
  }
 }
 try{
  const v=JSON.parse(load());
  if([1,2].includes(v?.version)&&v.boards&&typeof v.boards==='object'){
   for(const[k,rows]of Object.entries(v.boards))if(Array.isArray(rows)){boards[k]=rows.filter(valid).sort(compareRangeResults).slice(0,10);boards[k].forEach(r=>consider(k,r));}
   if(v.version===2&&v.bests&&typeof v.bests==='object')for(const[k,b]of Object.entries(v.bests))for(const r of Object.values(b||{}))if(valid(r))consider(k,r);
  }
 }catch{}
 return {
  list:(d,l)=>[...(boards[boardKey(d,l)]||[])].map(r=>({...r})),
  summary(d,l){const b=bests[boardKey(d,l)]||{};return Object.fromEntries(Object.entries(b).map(([k,r])=>[k,{...r}]));},
  commit(d,l,result){
   if(result?.state!=='COMPLETED'||!valid({...result,at:now()})||saved.has(result.id))return null;
   const key=boardKey(d,l),entry={id:result.id,score:result.score,time:Math.round(result.time*1000)/1000,efficiency:Math.round(result.efficiency*100)/100,at:now()};
   for(const k of ['cleared','missed','shots','firstShot','draws','reloads'])if(result[k]!=null)entry[k]=result[k];entry.goal=targetGoal(d);
   const rows=[...(boards[key]||[])];if(rows.some(r=>r.id===entry.id))return null;saved.add(entry.id);rows.push(entry);rows.sort(compareRangeResults);boards[key]=rows.slice(0,10);
   const prev=bests[key]?{...bests[key]}:{};consider(key,entry);
   try{save(JSON.stringify({version:2,boards,bests}));}catch{storageOK=false;}
   return {rank:rows.indexOf(entry)+1,best:boards[key][0]===entry,newBests:Object.keys(bests[key]).filter(k=>bests[key][k]===entry&&prev[k]!==entry),storageOK};
  },storageOK:()=>storageOK
 };
}
