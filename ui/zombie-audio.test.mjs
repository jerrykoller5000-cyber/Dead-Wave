import test from 'node:test';
import assert from 'node:assert/strict';
import {ZOMBIE_AUDIO_ADDITIONS as P,zombieAudioRecipe as recipe,createZombieVoiceGate,zombieDriveCurve,zombieAudioVariants,createZombieVocalizer,zombieFoldCoefficients} from './zombie-audio.js';
const states=['idle','chase','attack','hurt','death'];
const voices=(type,state)=>recipe(type,state).filter(a=>a.kind==='voice').map(a=>a.spec);
test('every current zombie has complete, distinct state recipes',()=>{
  assert.equal(Object.keys(P).length,14);
  for(const type of Object.keys(P))for(const state of states)assert(recipe(type,state)?.length,type+'/'+state);
  for(const state of states)assert.equal(new Set(Object.keys(P).map(t=>JSON.stringify(recipe(t,state)))).size,14);
  assert.equal(recipe('constructor','idle'),null);assert.equal(recipe('guardian','toString'),null);
  assert.equal(recipe('guardian','hit'),recipe('guardian','hurt'));assert.equal(recipe('demon','leap'),recipe('demon','attack'));
});
test('low growlers stay low on hits/death too; feral keeps an angry lower register',()=>{
  for(const state of states){assert(voices('shambler',state).every(s=>s.f[1]<=66&&s.formantScale<.6));assert(voices('brute',state).every(s=>s.f[1]<=56&&s.chest>.8));assert(voices('colossus',state).every(s=>s.f[1]<=50&&s.rough[0]<.2));}
  assert(voices('feral','idle')[0].f[1]<100);assert(voices('feral','attack')[0].f[1]<150);assert(voices('feral','attack')[0].grit>.7);
});
test('spider hisses and spitter boils without pitched electronic beeps or shared throats',()=>{
  for(const type of ['spider','spitter'])for(const state of states)assert(recipe(type,state).every(a=>a.kind==='texture'));
  assert(recipe('spider','attack').some(a=>a.freq>=3000&&a.dur>.25));
  assert(recipe('spitter','idle').some(a=>a.freq<700&&a.flutter>12));assert(recipe('spitter','attack').some(a=>a.freq>2500));
});
test('approved leaper/drowned base voices survive; movement and gurgles remain quiet',()=>{
  for(const type of ['leaper','drowned'])for(const state of states)assert(recipe(type,state).some(a=>a.kind==='base'));
  assert(recipe('leaper','move').filter(a=>a.kind==='texture').length>=3);assert(voices('leaper','move')[0].vol<.05);
  for(const state of states)assert(recipe('drowned',state).filter(a=>a.kind==='texture').every(a=>a.vol<=.03));
});
test('soldiers bicker, bomber drones and guardian combines huffs with creature shrieks',()=>{
  assert(voices('military','idle')[0].repeat[0]>=3);assert(voices('military','attack')[0].f[1]<130);
  for(const state of ['idle','chase']){const s=voices('bomber',state)[0];assert(s.f[1]<=68&&s.f[2]>.95&&s.jitter<.03);assert(recipe('bomber',state).every(a=>a.kind==='voice'));}
  const g=voices('guardian','idle');assert(g[0].repeat[0]>=3&&g[1].f[0]>200);assert(voices('guardian','attack')[1].f[2]>1.5);
});
test('screamer is noisy and more intense; demon charge and giant steps have their own shape',()=>{
  const s=voices('screamer','attack')[0];assert(s.vol>.25&&s.grit>1&&s.jitter>.15&&s.formantQ<.25&&s.dur[0]>=1);
  const d=recipe('demon','charge');assert(d[0].kind==='texture'&&d.filter(a=>a.kind==='voice').length===2);assert(d.some(a=>a.when>=.3));assert.notDeepEqual(d,recipe('demon','attack'));
  assert(recipe('colossus','step').some(a=>a.kind==='tone'&&a.freq<45));
});
test('recipes are immutable, finite, bounded; saturation has no DC or invalid values',()=>{
  const scan=x=>{if(typeof x==='number')assert(Number.isFinite(x));else if(x&&typeof x==='object')for(const v of Object.values(x))scan(v);};scan(P);
  for(const profiles of Object.values(P))for(const actions of Object.values(profiles))for(const a of actions){assert(a.when>=0&&a.when<2);if(a.spec){assert(a.spec.dur[1]<=2.5);assert(a.spec.vol<=.3);}else if(a.kind!=='base'){assert(a.dur>0&&a.dur<=1.2);assert(a.vol<=.17);}}
  assert.throws(()=>{P.guardian.idle[0].spec.vol=9;});
  for(const d of [3.5,4,5,5.5]){const c=zombieDriveCurve(d);assert.equal(c[128],0);for(let i=0;i<c.length;i++){assert(Number.isFinite(c[i])&&Math.abs(c[i])<=1.000001);assert(Math.abs(c[i]+c[c.length-i-1])<1e-6);}}
});
test('combat feedback has independent priority, and leaper movement cannot spam',()=>{
  const gate=createZombieVoiceGate();assert(gate(1,'shambler','idle'));assert(!gate(1.1,'feral','idle'));
  assert(gate(1.01,'guardian','attack'));assert(!gate(1.02,'guardian','attack'));assert(gate(1.011,'feral','hurt'));assert(gate(1.012,'guardian','death'));
  assert(gate(1.05,'shambler','hurt'));for(let i=1;i<16;i++)assert(!gate(1.05+i*.01,'shambler','hurt'));assert(gate(1.34,'shambler','hurt'));
  assert(gate(2,'leaper','move'));for(let i=1;i<14;i++)assert(!gate(2+i*.1,'leaper','move'));assert(gate(2.01,'leaper','attack'));assert(gate(3.41,'leaper','move'));assert(!gate(NaN,'shambler','death'));
});

test('four structurally different performances per state have bounded costs and immediate combat feedback',()=>{
  for(const [type,profile]of Object.entries(P))for(const state of Object.keys(profile)){
    const bank=zombieAudioVariants(type,state);assert.equal(bank.length,4,type+'/'+state);
    assert.equal(new Set(bank.map(p=>JSON.stringify(p))).size,4);
    for(const actions of bank){
      assert(actions.length<=6);assert(actions.filter(a=>a.spec).length<=3);
      let end=0;
      for(const a of actions){
        const s=a.spec;assert(a.when>=0);end=Math.max(end,a.when+(s?s.dur[1]:a.dur));
        if(s){assert(!s.repeat);assert(s.vol>0&&s.vol<=.3);assert(s.dur[0]>0&&s.dur[1]<=2.5);}
        else assert(a.vol>0&&a.vol<=.17&&a.dur>0);
        for(const path of [s?.pitchContour,s?.gainContour,s?.vowelPath,a.gainContour].filter(Boolean)){
          assert.equal(path[0][0],0);assert.equal(path.at(-1)[0],1);
          for(let i=1;i<path.length;i++)assert(path[i][0]>path[i-1][0]);
        }
      }
      assert(end<=3.2,type+'/'+state+' is too long');
      if(state==='attack'||state==='hurt')assert(Math.min(...actions.map(a=>a.when))<=.025);
      if(type==='spider'||type==='spitter')assert(actions.every(a=>a.kind==='texture'));
      if((type==='leaper'||type==='drowned')&&state!=='move')assert(actions.some(a=>a.kind==='base'));
    }
    assert(Object.isFrozen(bank)&&Object.isFrozen(bank[0]));
  }
});

test('individual voices stay stable across states; new actors have distinct traits',()=>{
  const pick=createZombieVocalizer(),one={},two={};
  const first=pick('shambler','idle',one),other=pick('shambler','idle',two);
  assert.notDeepEqual(first.identity,other.identity);
  for(const state of states)assert.strictEqual(pick('shambler',state,one).identity,first.identity);
  assert.strictEqual(pick('shambler','death',two).identity,other.identity);
  assert.equal(pick('constructor','idle',one),null);assert.equal(pick('shambler','invalid',one),null);
  assert(Object.isFrozen(first.identity));assert(first.identity.pitch>=.86&&first.identity.pitch<=1.13);
});

test('a shuffled phrase bag covers all four choices and never repeats at its boundary',()=>{
  for(const type of Object.keys(P))for(const state of states){
    const pick=createZombieVocalizer(),actor={};let last=-1;
    for(let round=0;round<8;round++){
      const seen=new Set();
      for(let n=0;n<4;n++){const call=pick(type,state,actor);assert.notEqual(call.variant,last);last=call.variant;seen.add(last);}
      assert.equal(seen.size,4);
    }
  }
  const pick=createZombieVocalizer(),a={},b={},history=new Map();
  for(let i=0;i<80;i++){
    const actor=i%3===0?a:b,call=pick('military','attack',actor);
    assert.notEqual(call.variant,history.get(actor),'interleaved actors repeat their own last phrase');history.set(actor,call.variant);
  }
});

test('character has articulation and source differences, not only randomized pitch',()=>{
  const soldier=zombieAudioVariants('military','idle');
  assert(new Set(soldier.map(actions=>actions.filter(a=>a.spec).length)).size>1);
  for(const actions of soldier){const voices=actions.filter(a=>a.spec);if(voices.length>1)assert(new Set(voices.map(a=>JSON.stringify(a.spec.dur))).size>1);}
  const guardian=zombieAudioVariants('guardian','idle');
  assert(guardian.some(actions=>actions.filter(a=>a.spec).every(a=>a.spec.f[1]<200)));
  assert(guardian.some(actions=>actions.some(a=>a.spec?.f?.[0]>200)));
  const family=['pressed','ragged','hollow','roar','breathy','whistle','chest'].map(zombieFoldCoefficients);
  assert.equal(new Set(family.map(p=>JSON.stringify([...p.real,...p.imag]))).size,7);
  for(const p of family){assert.equal(p.real[0],0);assert.equal(p.imag[0],0);assert([...p.real,...p.imag].every(Number.isFinite));}
  assert(family.at(-1).imag[2]>.3,'giant chest must have audible bass harmonics');
});
