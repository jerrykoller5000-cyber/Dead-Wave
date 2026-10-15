import fs from 'node:fs';import assert from 'node:assert/strict';
const p='ui/range-feature.js',s=fs.readFileSync(p,'utf8'),a="if(pending&&['death','left-training'].includes(pending.reason)){pending=null;session.reset();ui.close();}",b="if(pending&&['death','left-training'].includes(pending.reason)){ui.setResult(pending,lastDrill,entry);monitor.update(session.snapshot(),dt);pending=null;session.reset();ui.close();}";
assert.equal(s.split(a).length,2);assert.equal(fs.readFileSync(p,'utf8'),s);fs.writeFileSync(p,s.replace(a,b));
