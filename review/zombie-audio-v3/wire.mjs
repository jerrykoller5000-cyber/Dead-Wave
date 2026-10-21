import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const file='index.html',before=fs.readFileSync(file,'utf8'),proof=[];
let after=before;
for(const name of ['zombieVoice','zombieHit','zombieDeath','deadStep']){
  const token='AudioSys.'+name+'(';let at=0;
  while((at=after.indexOf(token,at))!==-1){
    const start=at+token.length;let end=start,depth=1;
    for(;depth&&end<after.length;end++){if(after[end]==='(')depth++;else if(after[end]===')')depth--;}
    assert.equal(depth,0);const args=after.slice(start,end-1);
    assert(!args.includes('\n'),'expected a single-line zombie cue');
    if(!args.endsWith(', z')){
      assert(args.includes('z.typeKey')||args.includes("'leaper'")||args.includes("'spitter'")||args.includes('z.crawling'),name+' is not an established zombie caller');
      proof.push({name,line:after.slice(0,at).split('\n').length,before:token+args+')',after:token+args+', z)'});
      after=after.slice(0,end-1)+', z'+after.slice(end-1);end+=3;
    }
    at=end;
  }
}
assert.equal(proof.length,13,'all thirteen established zombie audio emitter calls');
assert.equal(fs.readFileSync(file,'utf8'),before,'index changed underneath this narrow patch');
fs.writeFileSync(file,after,'utf8');
fs.writeFileSync('review/zombie-audio-v3/hooks-proof.json',JSON.stringify({beforeHash:createHash('sha256').update(before).digest('hex'),afterHash:createHash('sha256').update(after).digest('hex'),calls:proof},null,2));
console.log('Wired13 existing zombie sound callers to their opaque emitter; original line endings and all other bytes preserved.');
