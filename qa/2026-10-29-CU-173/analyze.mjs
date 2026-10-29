// CU-173: stage tables from summary.json. Run 1 (new) is the throwaway.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const all = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8')).filter((r) => r.phase === 'S');
const f = (n, d = 3) => (n == null ? '-' : Number(n).toFixed(d));
const lines = [];
const out = (s = '') => { lines.push(s); console.log(s); };

out('## Runs (the first is a throwaway)');
out('| run | CPU % before | fps | 1% low | worst | tick | z:update | z:abilities | z:feral | r:render | r:matrices | draws |');
out('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
all.forEach((r, i) => out(`| ${r.name}${i === 0 ? ' (throwaway)' : ''} | ${r.cpuBefore} | ${f(r.fps, 1)} | ${f(r.low, 1)} | ${f(r.worst, 1)} | ${f(r.tick, 2)} | ${f(r.marks['z:update'], 2)} | ${f(r.marks['z:abilities'], 2)} | ${f(r.marks['z:feral'], 2)} | ${f(r.marks['r:render'], 2)} | ${f(r.marks['r:matrices'], 2)} | ${r.draws} |`));

const runs = all.slice(1);
const olds = runs.filter((r) => r.tree === 'old');
const news = runs.filter((r) => r.tree === 'new');
// pairs: old k with the new run just after it
const pairs = [];
for (let i = 0; i < runs.length - 1; i++) if (runs[i].tree === 'old' && runs[i + 1].tree === 'new') pairs.push([runs[i], runs[i + 1]]);
const mean = (arr, k) => arr.reduce((a, r) => a + (r.marks[k] || 0), 0) / (arr.length || 1);
const stageKeys = new Set();
for (const r of all) for (const k of Object.keys(r.marks)) if (k.startsWith('zu:')) stageKeys.add(k);
// keep the order of the function: the order of first appearance in a run's log is not kept, so sort by old mean desc below too
const rows = [...stageKeys].map((k) => {
  const o = mean(olds, k), n = mean(news, k);
  const d = pairs.map(([a, b]) => (b.marks[k] || 0) - (a.marks[k] || 0));
  return { k, o, n, d: n - o, pairsUp: d.filter((x) => x > 0).length, pairD: d };
});
out();
out(`## Stages of updateZombies, mean ms per frame: ${olds.length} old runs, ${news.length} new runs, ${pairs.length} pairs (old, then the new run after it)`);
out(`| stage | old | new | new - old | pairs where new is higher | per pair (new - old) |`);
out('| --- | --- | --- | --- | --- | --- |');
for (const r of [...rows].sort((a, b) => b.d - a.d)) out(`| ${r.k} | ${f(r.o)} | ${f(r.n)} | ${f(r.d)} | ${r.pairsUp} of ${pairs.length} | ${r.pairD.map((x) => f(x, 2)).join(', ')} |`);
const sum = (arr) => arr.reduce((a, r) => a + [...stageKeys].reduce((s, k) => s + (r.marks[k] || 0), 0), 0) / (arr.length || 1);
out(`| sum of the zu: stages | ${f(sum(olds))} | ${f(sum(news))} | ${f(sum(news) - sum(olds))} | | |`);
out(`| z:update (the tail: after the last stage) | ${f(mean(olds, 'z:update'))} | ${f(mean(news, 'z:update'))} | ${f(mean(news, 'z:update') - mean(olds, 'z:update'))} | | |`);
out(`| z:abilities | ${f(mean(olds, 'z:abilities'))} | ${f(mean(news, 'z:abilities'))} | ${f(mean(news, 'z:abilities') - mean(olds, 'z:abilities'))} | | |`);
out(`| z:feral | ${f(mean(olds, 'z:feral'))} | ${f(mean(news, 'z:feral'))} | ${f(mean(news, 'z:feral') - mean(olds, 'z:feral'))} | | |`);
const meanT = (arr) => arr.reduce((a, r) => a + r.tick, 0) / arr.length;
out(`| tick | ${f(meanT(olds), 2)} | ${f(meanT(news), 2)} | ${f(meanT(news) - meanT(olds), 2)} | | |`);

// the outside-the-function marks that moved too
const other = new Set();
for (const r of all) for (const k of Object.keys(r.marks)) if (!k.startsWith('zu:') && !k.startsWith('z:')) other.add(k);
const orows = [...other].map((k) => ({ k, o: mean(olds, k), n: mean(news, k), up: pairs.filter(([a, b]) => (b.marks[k] || 0) > (a.marks[k] || 0)).length }))
  .map((r) => ({ ...r, d: r.n - r.o })).sort((a, b) => b.d - a.d).slice(0, 8);
out();
out('## The other marks that grew most (new - old)');
out('| mark | old | new | new - old | pairs where new is higher |');
out('| --- | --- | --- | --- | --- |');
for (const r of orows) out(`| ${r.k} | ${f(r.o)} | ${f(r.n)} | ${f(r.d)} | ${r.up} of ${pairs.length} |`);
fs.writeFileSync(path.join(dir, 'tables.md'), lines.join('\n') + '\n', 'utf8');
