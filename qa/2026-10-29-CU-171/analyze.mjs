// CU-171: tables from summary.json (output only).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const runs = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8'));
const f = (n, d = 2) => (n == null ? '-' : Number(n).toFixed(d));
const lines = [];
const out = (s = '') => { lines.push(s); console.log(s); };

out('## Headline per run');
out('| run | CPU % before | fps | 1% low | worst | tick | frame | outside | draws | triangles | spikes (code/gc/upload) |');
out('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of runs) {
  const c = r.spikeCauses || {};
  out(`| ${r.name} | ${r.cpuBefore} | ${f(r.fps, 1)} | ${f(r.low, 1)} | ${f(r.worst, 1)} | ${f(r.tick)} | ${f(r.frameMs)} | ${f(r.outside)} | ${r.draws} | ${r.triangles} | ${c.spikes} (${c.code}/${c.gc}/${c.uploads}) |`);
}

// every mark, every run. 'zombies' is the sum of the three z: marks in these trees.
const all = new Set();
for (const r of runs) for (const k of Object.keys(r.marks || {})) all.add(k);
const keys = [...all].sort((a, b) => Math.max(...runs.map((r) => r.marks[b] || 0)) - Math.max(...runs.map((r) => r.marks[a] || 0)));
out();
out('## Every PROF section, mean ms per frame');
out(`| mark | ${runs.map((r) => r.name).join(' | ')} |`);
out(`| --- | ${runs.map(() => '---').join(' | ')} |`);
for (const k of keys) out(`| ${k} | ${runs.map((r) => f(r.marks[k], 3)).join(' | ')} |`);
out(`| tick (sum) | ${runs.map((r) => f(r.tick, 2)).join(' | ')} |`);

// A: old against new, pair by pair
const A = runs.filter((r) => r.phase === 'A');
const pick = (tree, n) => A.filter((r) => r.tree === tree)[n - 1];
if (pick('old', 2) && pick('new', 2)) {
  out();
  out('## Phase A: new minus old, pair 1 (old 1, new 1) and pair 2 (old 2, new 2); marks that grew in both');
  out('| mark | old 1 | new 1 | d1 | old 2 | new 2 | d2 | grew in both |');
  out('| --- | --- | --- | --- | --- | --- | --- | --- |');
  const rows = [];
  for (const k of keys) {
    const o1 = pick('old', 1).marks[k], n1 = pick('new', 1).marks[k], o2 = pick('old', 2).marks[k], n2 = pick('new', 2).marks[k];
    if ([o1, n1, o2, n2].some((x) => x == null)) continue;
    const d1 = n1 - o1, d2 = n2 - o2;
    rows.push({ k, o1, n1, d1, o2, n2, d2, both: d1 > 0 && d2 > 0 });
  }
  rows.sort((a, b) => (b.d1 + b.d2) - (a.d1 + a.d2));
  for (const r of rows) out(`| ${r.k} | ${f(r.o1, 3)} | ${f(r.n1, 3)} | ${f(r.d1, 3)} | ${f(r.o2, 3)} | ${f(r.n2, 3)} | ${f(r.d2, 3)} | ${r.both ? 'yes' : ''} |`);
  const t = (r) => r.tick;
  out(`| tick | ${f(t(pick('old', 1)))} | ${f(t(pick('new', 1)))} | ${f(t(pick('new', 1)) - t(pick('old', 1)))} | ${f(t(pick('old', 2)))} | ${f(t(pick('new', 2)))} | ${f(t(pick('new', 2)) - t(pick('old', 2)))} | |`);
  out(`| frame | ${f(pick('old', 1).frameMs)} | ${f(pick('new', 1).frameMs)} | ${f(pick('new', 1).frameMs - pick('old', 1).frameMs)} | ${f(pick('old', 2).frameMs)} | ${f(pick('new', 2).frameMs)} | ${f(pick('new', 2).frameMs - pick('old', 2).frameMs)} | |`);
  out(`| outside | ${f(pick('old', 1).outside)} | ${f(pick('new', 1).outside)} | ${f(pick('new', 1).outside - pick('old', 1).outside)} | ${f(pick('old', 2).outside)} | ${f(pick('new', 2).outside)} | ${f(pick('new', 2).outside - pick('old', 2).outside)} | |`);
}

// C: each variant against the current build run just before and just after it
const C = runs.filter((r) => r.phase === 'C');
if (C.length) {
  out();
  out('## Phase C: each probe against the current build run on either side of it');
  out('| probe | its z:update | before z:update | after z:update | its tick | before tick | after tick | its fps | before fps | after fps | its low | before low | after low |');
  out('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const seq = [pick('new', 2), ...C];
  for (let i = 1; i < seq.length; i++) {
    const r = seq[i];
    if (r.tree === 'new') continue;
    const b = seq[i - 1], a = seq[i + 1];
    const g = (x, k) => (x ? f(x.marks[k], 3) : '-');
    out(`| ${r.name} | ${g(r, 'z:update')} | ${g(b, 'z:update')} | ${g(a, 'z:update')} | ${f(r.tick)} | ${b ? f(b.tick) : '-'} | ${a ? f(a.tick) : '-'} | ${f(r.fps, 1)} | ${b ? f(b.fps, 1) : '-'} | ${a ? f(a.fps, 1) : '-'} | ${f(r.low, 1)} | ${b ? f(b.low, 1) : '-'} | ${a ? f(a.low, 1) : '-'} |`);
  }
}

// D: a throwaway first run, then probes and builds alternating in the same (slow) regime
const D = runs.filter((r) => r.phase === 'D');
if (D.length > 1) {
  out();
  out('## Phase D (first run is a throwaway, not counted): the sequence');
  out('| run | CPU % before | fps | 1% low | tick | z:update | z:abilities | z:feral | r:render | r:matrices | draws | triangles |');
  out('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const m = (r, k) => f(r.marks[k]);
  D.forEach((r, i) => out(`| ${r.name}${i === 0 ? ' (throwaway)' : ''} | ${r.cpuBefore} | ${f(r.fps, 1)} | ${f(r.low, 1)} | ${f(r.tick)} | ${m(r, 'z:update')} | ${m(r, 'z:abilities')} | ${m(r, 'z:feral')} | ${m(r, 'r:render')} | ${m(r, 'r:matrices')} | ${r.draws} | ${r.triangles} |`));
  const mean = (arr, g) => arr.reduce((a, r) => a + g(r), 0) / (arr.length || 1);
  const used = D.slice(1);
  const by = (tree) => used.filter((r) => r.tree === tree);
  out();
  out('Means in the slow regime (throwaway left out):');
  out('| build | runs | fps | 1% low | tick | z:update | z:abilities | z:feral | r:render | r:matrices |');
  out('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const tree of ['new', 's', 'old']) {
    const g = by(tree); if (!g.length) continue;
    const mm = (k) => f(mean(g, (r) => r.marks[k]));
    out(`| ${tree} | ${g.length} | ${f(mean(g, (r) => r.fps), 1)} | ${f(mean(g, (r) => r.low), 1)} | ${f(mean(g, (r) => r.tick))} | ${mm('z:update')} | ${mm('z:abilities')} | ${mm('z:feral')} | ${mm('r:render')} | ${mm('r:matrices')} |`);
  }
{
    out();
    out('Phase D, every mark: mean of the new runs minus mean of the old runs (slow regime), largest growth first:');
    out('| mark | old mean | new mean | new - old | new runs above the old mean |');
    out('| --- | --- | --- | --- | --- |');
    const nw = by('new'), od = by('old');
    const rowsD = [...all].map((k) => {
      const o = mean(od, (r) => r.marks[k] || 0), n = mean(nw, (r) => r.marks[k] || 0);
      return { k, o, n, d: n - o, above: nw.filter((r) => (r.marks[k] || 0) > o).length };
    }).sort((a, b) => b.d - a.d);
    for (const r of rowsD) out(`| ${r.k} | ${f(r.o, 3)} | ${f(r.n, 3)} | ${f(r.d, 3)} | ${r.above} of ${nw.length} |`);
    out(`| tick | ${f(mean(od, (r) => r.tick))} | ${f(mean(nw, (r) => r.tick))} | ${f(mean(nw, (r) => r.tick) - mean(od, (r) => r.tick))} | |`);
    out();
  }

}
fs.writeFileSync(path.join(dir, 'tables.md'), lines.join('\n') + '\n', 'utf8');
