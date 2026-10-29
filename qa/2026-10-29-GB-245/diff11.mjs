import fs from 'fs';
const a = fs.readFileSync('qa/2026-10-29-GB-245/index.before-patch11.html', 'utf8').split('\n');
const b = fs.readFileSync('index.html', 'utf8').split('\n');
// line diff: what is in b but not a, and vice versa
const setA = new Map(); for (const l of a) setA.set(l, (setA.get(l) || 0) + 1);
const added = [];
for (const l of b) { const n = setA.get(l) || 0; if (n > 0) setA.set(l, n - 1); else added.push(l); }
const setB = new Map(); for (const l of b) setB.set(l, (setB.get(l) || 0) + 1);
const removed = [];
for (const l of a) { const n = setB.get(l) || 0; if (n > 0) setB.set(l, n - 1); else removed.push(l); }
console.log('lines ' + a.length + ' -> ' + b.length);
console.log('--- added (' + added.length + ') ---');
for (const l of added) console.log('+ ' + l.slice(0, 150));
console.log('--- removed (' + removed.length + ') ---');
for (const l of removed) console.log('- ' + l.slice(0, 150));
