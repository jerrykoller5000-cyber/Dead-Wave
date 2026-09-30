import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILL_RANKS,createSkills,resetSkills,skillLvl,addSkillXp} from './skills.js';

test('six independent player stores have the D-59 thresholds',()=>{
 assert.deepEqual(Object.keys(SKILL_RANKS),['vitality','power','hands','legs','scavenger','grenadier']);
 assert.deepEqual(SKILL_RANKS.vitality,[6,14,24,36,50]);
 assert.deepEqual(SKILL_RANKS.legs,[20,60,130,230,360]);
 const a={skills:createSkills()},b={skills:createSkills()};
 assert.deepEqual(addSkillXp(a,'vitality',14),[1,2]);
 assert.equal(skillLvl(a,'vitality'),2);assert.equal(skillLvl(b,'vitality'),0);
 assert.equal(a.skills.vitality.xp,14);assert.equal(b.skills.vitality.xp,0);
 resetSkills(a);assert.equal(skillLvl(a,'vitality'),0);assert.equal(skillLvl(b,'vitality'),0);
});

test('XP crosses each rank once, caps at five, and rejects invalid awards',()=>{
 const p={skills:createSkills()};
 assert.deepEqual(addSkillXp(p,'hands',9),[]);
 assert.deepEqual(addSkillXp(p,'hands',141),[1,2,3,4,5]);
 assert.deepEqual(addSkillXp(p,'hands',1),[]);
 assert.equal(p.skills.hands.xp,151);assert.equal(skillLvl(p,'hands'),5);
 for(const n of [0,-1,1.5,NaN,Infinity])assert.throws(()=>addSkillXp(p,'hands',n),TypeError);
 assert.throws(()=>addSkillXp(p,'unknown',1),TypeError);
 assert.throws(()=>addSkillXp(p,'hands',Number.MAX_SAFE_INTEGER),RangeError);
 assert.equal(p.skills.hands.xp,151);
});
