import fs from 'fs';
const { late, type } = JSON.parse(fs.readFileSync('qa/2026-11-02-GB-253/late-fields.json','utf8'));
const files = ['index.html', ...fs.readdirSync('game').filter(f=>f.endsWith('.js')).map(f=>'game/'+f), ...fs.readdirSync('combat').filter(f=>f.endsWith('.js')).map(f=>'combat/'+f)];
const text = files.map(f=>[f, fs.readFileSync(f,'utf8')]);
const res = {};
for (const f of late) {
  const re = new RegExp('(.{0,14})\\.' + f.replace(/\$/g,'\\$') + '\\b(?!\\s*\\()(.{0,16})', 'g');
  const occ = []; let unsafe = []; let numericWrite = false;
  for (const [fn, t] of text) for (const m of t.matchAll(re)) {
    const pre = m[1], post = m[2];
    let c;
    if (/^\s*=(?!=)/.test(post)) { c = 'write'; if (/^\s*=\s*[-\d.(M]/.test(post)) numericWrite = true; }
    else if (/^\s*(\+\+|--)/.test(post) || /(\+\+|--)\s*$/.test(pre)) c = 'incdec';
    else if (/^\s*(\+|-|\*|\/)=/.test(post)) c = 'compound';
    else if (/^\s*\|\|\s*0\b/.test(post)) c = 'or0';
    else if (/^\s*\|\|/.test(post)) c = 'or';
    else if (/^\s*>\s*(0|0?\.\d+|\d+(\.\d+)?)\b/.test(post)) c = 'gtc';
    else if (/^\s*>=\s*(0?\.\d*[1-9]|[1-9][\d.]*)\b/.test(post)) c = 'gec+';
    else if (/!\s*$/.test(pre) && !/!=\s*$/.test(pre)) c = 'not';
    else if (/(&&|\|\||\(|\?)\s*[\w$.]*$/.test(pre) && /^\s*(&&|\|\||\)|\?)/.test(post) && !/[<>=]=?\s*[\w$.]*$/.test(pre)) c = 'truthy';
    else c = 'other';
    occ.push(c); if (!['write','or0','or','gtc','gec+','not','truthy'].includes(c)) unsafe.push(fn.replace(/^.*\//,'')+':'+c+':'+JSON.stringify(pre+'.'+f+post));
  }
  res[f] = { t: type[f], n: occ.length, unsafe, numericWrite };
}
const safe0 = late.filter(f => (res[f].t === 'number' || res[f].numericWrite) && res[f].unsafe.length === 0);
const risky = late.filter(f => (res[f].t === 'number' || res[f].numericWrite) && res[f].unsafe.length > 0);
fs.writeFileSync('qa/2026-11-02-GB-253/classify.json', JSON.stringify(res, null, 1));
console.log('safe0', safe0.length, safe0.join(' '));
console.log('risky', risky.length);
for (const f of risky) console.log(f, res[f].t, res[f].unsafe.length, res[f].unsafe.slice(0,2).join(' | ').slice(0,230));
