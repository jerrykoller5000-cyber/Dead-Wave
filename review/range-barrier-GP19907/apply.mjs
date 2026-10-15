// GP-19907: run without --apply to review the fresh, anchor-based merge.
import fs from 'node:fs';import crypto from 'node:crypto';
const dir='review/range-barrier-GP19907',apply=process.argv.includes('--apply');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const rows=JSON.parse(fs.readFileSync(dir+'/patches.json','utf8'));
const prepared=rows.map(r=>{
 if(r.newFile){if(fs.existsSync(r.file))throw Error('New file already exists: '+r.file);return {...r,original:null,result:r.text};}
 const original=fs.readFileSync(r.file,'utf8');let result=original;
 for(const p of r.patches){if(result.split(p.oldText).length!==2)throw Error('Anchor changed: '+r.file);result=result.replace(p.oldText,p.newText);}
 return {...r,original,result,freshHash:hash(original),rebased:hash(original)!==r.baseHash};
});
for(const r of prepared)console.log(`${r.file}: ${r.newFile?'new file':r.patches.length+' focused edits'}${r.rebased?' (merged onto fresh source)':''}`);
if(apply){
 for(const r of prepared){
  if(r.original===null){if(fs.existsSync(r.file))throw Error('File appeared: '+r.file);}
  else if(hash(fs.readFileSync(r.file,'utf8'))!==r.freshHash)throw Error('File changed during preflight: '+r.file);
 }
 fs.mkdirSync(dir+'/applied-before',{recursive:true});
 for(const r of prepared){
  if(r.original!==null){if(hash(fs.readFileSync(r.file,'utf8'))!==r.freshHash)throw Error('File changed before save: '+r.file);fs.writeFileSync(dir+'/applied-before/'+r.file.replaceAll('/','_'),r.original,'utf8');}
  else if(fs.existsSync(r.file))throw Error('New file appeared before save: '+r.file);
  fs.writeFileSync(r.file,r.result,{encoding:'utf8',flag:r.newFile?'wx':'w'});
 }
 fs.writeFileSync(dir+'/applied-manifest.json',JSON.stringify(prepared.map(r=>({file:r.file,before:r.freshHash||null,after:hash(r.result),rebased:r.rebased||false})),null,2));
 console.log('APPLIED all focused edits; unrelated fresh source preserved.');
}else console.log('DRY RUN ONLY: live game unchanged.');
