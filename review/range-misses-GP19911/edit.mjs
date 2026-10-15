import fs from 'node:fs';
import crypto from 'node:crypto';
const dir='review/range-misses-GP19911',manifest=[];
const jobs=[['ui/range-feature.js',[
 ["import {text} from './strings.js';","import {text} from './strings.js';\nimport {drillHitFeedback} from './range-hit-feedback.js';"],
 [" let lease=null,lastDrill=null,pending=null,entry=null,ui;"," let lease=null,lastDrill=null,pending=null,entry=null,ui,feedbackActivation='';const reportedHits=new Set();"],
 ["  hit(index,point,token,event){if(!session.owns())return false;const i=targets.localIndex(index);if(i<0)return false;const sc=tg.scoreHit(index,point);const ok=sc&&session.hit(i,{token,event,zone:sc.zone,points:sc.total});if(ok)env.feedback(index,point,sc);return !!ok;},",`  hit(index,point,token,event){
   if(!session.owns())return false;const i=targets.localIndex(index);if(i<0)return false;
   const sc=tg.scoreHit(index,point);if(!sc)return false;
   const before=session.snapshot(),ok=session.hit(i,{token,event,zone:sc.zone,points:sc.total});
   const popup=drillHitFeedback(before,session.snapshot(),i,sc,token,ok);
   const activation=before.id+'/'+before.activation;if(activation!==feedbackActivation){feedbackActivation=activation;reportedHits.clear();}
   const key=token?.shot+'/'+i+'/'+popup?.kind;
   if(ok)env.feedback(index,point,popup?{...sc,popup}:sc);
   else if(popup&&!reportedHits.has(key)){reportedHits.add(key);env.feedback(index,point,{...sc,popup});}
   return !!ok;
  },`]
]],['ui/training-hit-pops.js',[
 ["  if (!sc) return null;","  if (!sc) return null;\n  if (sc.popup) return sc.popup; // timed drill contact can be real but earn no points"],
 [".training-hit-pop.gold{color:#ffd24a}",".training-hit-pop.red{color:#ff7868}.training-hit-pop.gold{color:#ffd24a}"]
]],['ui/strings.js',[
 ['  "range.points":','  "range.hit.contact": "HIT",\n  "range.hit.zone": "Hit {zone} · Aim at {required}",\n  "range.hit.priority": "Wrong order · Shoot lane {lane}",\n  "range.hit.cleared": "Plate already cleared",\n  "range.hit.progress": "{zone}{mult} · {hits}/{required} hits",\n  "range.points":']
]]];
for(const [p,edits]of jobs){const old=fs.readFileSync(p,'utf8');let next=old;for(const[a,b]of edits){if(next.split(a).length!==2)throw Error('unique anchor '+p);next=next.replace(a,b);}if(fs.readFileSync(p,'utf8')!==old)throw Error('file changed '+p);fs.writeFileSync(dir+'/'+p.split('/').pop()+'.before',old);fs.writeFileSync(p,next);const sha=s=>crypto.createHash('sha256').update(s).digest('hex');manifest.push({file:p,before:sha(old),after:sha(next)});}
fs.writeFileSync(dir+'/applied-manifest.json',JSON.stringify(manifest,null,2));
console.log('APPLIED UI-only physical-hit feedback and multi-hit progress; scoring rules unchanged.');
