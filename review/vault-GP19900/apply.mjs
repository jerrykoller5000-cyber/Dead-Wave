// Run only after owner approval or Jerry's explicit override. Never restore the staged index.
import fs from 'node:fs';
import crypto from 'node:crypto';
const dir='review/vault-GP19900',live='index.html';
if(!process.argv.includes('--approved'))throw Error('owner/Jerry approval required');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const original=fs.readFileSync(live,'utf8'),initial=hash(original);
const {patches}=JSON.parse(fs.readFileSync(dir+'/patches.json','utf8'));
let result=original;
for(const {oldText,newText} of patches){
 if(!result.includes(oldText)||result.indexOf(oldText)!==result.lastIndexOf(oldText))throw Error('fresh anchor changed: '+oldText.slice(0,120));
 result=result.replace(oldText,newText);
}
for(const name of ['player-vault.js','player-vault.test.mjs']){
 const target='game/'+name,source=fs.readFileSync(dir+'/'+name,'utf8');
 if(fs.existsSync(target)&&fs.readFileSync(target,'utf8')!==source)throw Error('existing helper changed: '+target);
}
if(hash(fs.readFileSync(live,'utf8'))!==initial)throw Error('live index changed while planning');
for(const name of ['player-vault.js','player-vault.test.mjs'])fs.copyFileSync(dir+'/'+name,'game/'+name);
if(hash(fs.readFileSync(live,'utf8'))!==initial)throw Error('live index changed before save');
fs.writeFileSync(live,result,'utf8');
fs.writeFileSync(dir+'/applied-proof.json',JSON.stringify({before:initial,after:hash(result),hooks:patches.length},null,2));
console.log('Applied '+patches.length+' focused hooks to the freshest live file; helper and tests added');
