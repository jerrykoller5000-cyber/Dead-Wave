// CU-174: old against new after the cuts. Run 1 (new) is the throwaway.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const all = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8')).filter((r) => r.phase === 'K');
const f = (n, d = 2) => (n == null ? '-' : Number(n).toFixed(d));
const lines = [];
const out = (s = '') => { lines.push(s); console.log(s); };
const m = (r, k) => r.marks[k] || 0;

out('## Runs (the first is a throwaway)');
out('| run | CPU % | fps | 1% low | worst | tick | z:update | z:abilities | z:feral | r:render | r:matrices | r:cull | draws | triangles |');
out('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
all.forEach((r, i) => out(`| ${r.name}${i === 0 ? ' (throwaway)' : ''} | ${r.cpuBefore} | ${f(r.fps, 1)} | ${f(r.low, 1)} | ${f(r.worst, 1)} | ${f(r.tick)} | ${f(m(r, 'z:update'))} | ${f(m(r, 'z:abilities'))} | ${f(m(r, 'z:feral'))} | ${f(m(r, 'r:render'))} | ${f(m(r, 'r:matrices'))} | ${f(m(r, 'r:cull'))} | ${r.draws} | ${r.triangles} |`));

const runs = all.slice(1);
const olds = runs.filter((r) => r.tree === 'old');
const news = runs.filter((r) => r.tree === 'new');
const pairs = [];
for (let i = 0; i < runs.length - 1; i++) if (runs[i].tree === 'old' && runs[i + 1].tree === 'new') pairs.push([runs[i], runs[i + 1]]);
const mean = (arr, g) => arr.reduce((a, r) => a + g(r), 0) / (arr.length || 1);

const keys = new Set();
for (const r of all) for (const k of Object.keys(r.marks)) keys.add(k);
const rows = [...keys].map((k) => {
  const o = mean(olds, (r) => m(r, k)), n = mean(news, (r) => m(r, k));
  const d = pairs.map(([a, b]) => m(b, k) - m(a, k));
  return { k, o, n, d: n - o, up: d.filter((x) => x > 0).length, pd: d };
});
out();
out(`## Old against new: ${olds.length} old runs, ${news.length} new runs, ${pairs.length} pairs (old, then the new run after it)`);
out('| what | old | new | new - old | pairs where new is higher | per pair |');
out('| --- | --- | --- | --- | --- | --- |');
const tickD = pairs.map(([a, b]) => b.tick - a.tick);
out(`| tick | ${f(mean(olds, (r) => r.tick))} | ${f(mean(news, (r) => r.tick))} | ${f(mean(news, (r) => r.tick) - mean(olds, (r) => r.tick))} | ${tickD.filter((x) => x > 0).length} of ${pairs.length} | ${tickD.map((x) => f(x)).join(', ')} |`);
const fpsD = pairs.map(([a, b]) => b.fps - a.fps);
out(`| fps | ${f(mean(olds, (r) => r.fps), 1)} | ${f(mean(news, (r) => r.fps), 1)} | ${f(mean(news, (r) => r.fps) - mean(olds, (r) => r.fps), 1)} | | ${fpsD.map((x) => f(x, 1)).join(', ')} |`);
const lowD = pairs.map(([a, b]) => b.low - a.low);
out(`| 1% low | ${f(mean(olds, (r) => r.low), 1)} | ${f(mean(news, (r) => r.low), 1)} | ${f(mean(news, (r) => r.low) - mean(olds, (r) => r.low), 1)} | | ${lowD.map((x) => f(x, 1)).join(', ')} |`);
const drD = pairs.map(([a, b]) => b.draws - a.draws);
out(`| draws | ${f(mean(olds, (r) => r.draws), 0)} | ${f(mean(news, (r) => r.draws), 0)} | ${f(mean(news, (r) => r.draws) - mean(olds, (r) => r.draws), 0)} | ${drD.filter((x) => x > 0).length} of ${pairs.length} | ${drD.join(', ')} |`);
for (const k of ['z:update', 'z:abilities', 'z:feral', 'r:render', 'r:matrices', 'r:cull']) {
  const r = rows.find((x) => x.k === k); if (!r) continue;
  out(`| ${k} | ${f(r.o, 3)} | ${f(r.n, 3)} | ${f(r.d, 3)} | ${r.up} of ${pairs.length} | ${r.pd.map((x) => f(x, 2)).join(', ')} |`);
}
out();
out('## Every other mark that moved 0.02 ms or more (new - old, mean), largest first');
out('| mark | old | new | new - old | pairs where new is higher |');
out('| --- | --- | --- | --- | --- |');
for (const r of rows.filter((x) => !['z:update', 'z:abilities', 'z:feral', 'r:render', 'r:matrices', 'r:cull'].includes(x.k) && Math.abs(x.d) >= 0.02).sort((a, b) => b.d - a.d)) {
  out(`| ${r.k} | ${f(r.o, 3)} | ${f(r.n, 3)} | ${f(r.d, 3)} | ${r.up} of ${pairs.length} |`);
}
out();
out('## The decks probe (night 20 peak)');
out('| run | platforms | platformHeightAt ns | entityGroundY ns | resolveStaticProps ns | worldSolids |');
out('| --- | --- | --- | --- | --- | --- |');
for (const r of all) if (r.eval) out(`| ${r.name} | ${r.eval.platforms} | ${r.eval.platformHeightAt_ns} | ${r.eval.entityGroundY_ns} | ${r.eval.resolveStaticProps_ns} | ${r.eval.worldSolids} |`);
fs.writeFileSync(path.join(dir, 'tables.md'), lines.join('\n') + '\n', 'utf8');
