import fs from 'node:fs';import crypto from 'node:crypto';
if(!process.argv.includes('--approved'))throw Error('Owner or Jerry approval is required for these cross-owner patches.');
const dir='review/range-GP19901',hash=s=>crypto.createHash('sha256').update(s).digest('hex'),spec=JSON.parse(fs.readFileSync(dir+'/patches.json','utf8')),pending=[];
for(const entry of spec){const before=fs.readFileSync(entry.file,'utf8');let after=before;for(const {oldText,newText}of entry.patches){if(after.includes(newText)&&!after.includes(oldText))continue;if(!after.includes(oldText)||after.indexOf(oldText)!==after.lastIndexOf(oldText))throw Error('Fresh-file anchor changed or ambiguous in '+entry.file+': '+oldText.slice(0,100));after=after.replace(oldText,newText);}pending.push({...entry,before,after,hash:hash(before)});}
for(const p of pending)if(hash(fs.readFileSync(p.file,'utf8'))!==p.hash)throw Error('File changed during merge: '+p.file);
for(const p of pending){fs.writeFileSync(p.file,p.after,'utf8');console.log('Merged '+p.patches.length+' focused patches into fresh '+p.file);}
fs.writeFileSync(dir+'/applied.json',JSON.stringify(pending.map(p=>({file:p.file,baseHash:p.hash,afterHash:hash(p.after),patches:p.patches.length})),null,2));
// For reviewers: exact changed anchors only. No snapshots are ever restored over another agent's work.
fs.writeFileSync(dir+'/focused-changes.diff',pending.map(p=>'--- '+p.file+'\n+++ '+p.file+'\n'+p.patches.map(h=>'@@ focused @@\n'+h.oldText.split(/\r?\n/).map(s=>'-'+s).join('\n')+'\n'+h.newText.split(/\r?\n/).map(s=>'+'+s).join('\n')).join('\n')).join('\n'),'utf8');
