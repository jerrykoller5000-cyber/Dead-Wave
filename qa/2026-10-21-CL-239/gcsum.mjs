export function gcSummary(tr, spikes, frames) {
  const ev = tr.events;
  const threadName = new Map();
  for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name') threadName.set(e.pid + ':' + e.tid, e.args && e.args.name);
  const sync = ev.find((e) => e.name === 'dw-gc-sync' && /user_timing/.test(e.cat || ''));
  const main = sync ? sync.pid + ':' + sync.tid : [...threadName.entries()].find(([, n]) => n === 'CrRendererMain')?.[0];
  const off = sync && tr.sync != null ? sync.ts - tr.sync * 1000 : null;   // trace us = perf ms * 1000 + off
  const isGc = (e) => /GC|Scavenge|Mark|Sweep|Compact|Evacuat/i.test(e.name) && /gc|v8|devtools\.timeline/.test(e.cat || '');
  const spans = [], open = new Map();
  for (const e of ev) {
    if (!isGc(e) || (e.pid + ':' + e.tid) !== main) continue;
    if (e.ph === 'X') spans.push({ name: e.name, a: e.ts, b: e.ts + (e.dur || 0) });
    else if (e.ph === 'B') open.set(e.name, e.ts);
    else if (e.ph === 'E' && open.has(e.name)) { spans.push({ name: e.name, a: open.get(e.name), b: e.ts }); open.delete(e.name); }
  }
  // Nested events (a phase inside its cycle) would count twice: the totals keep only the outermost span at each instant.
  spans.sort((x, y) => x.a - y.a);
  const outer = []; for (const sp of spans) { const l = outer[outer.length - 1]; if (l && sp.a < l.b) { if (sp.b > l.b) l.b = sp.b; } else outer.push({ a: sp.a, b: sp.b }); }
  const byName = {};
  for (const sp of spans) { const k = byName[sp.name] || (byName[sp.name] = { n: 0, ms: 0 }); k.n++; k.ms += (sp.b - sp.a) / 1000; }
  for (const k in byName) byName[k].ms = Math.round(byName[k].ms * 10) / 10;
  const totalMs = outer.reduce((s, o) => s + (o.b - o.a), 0) / 1000;
  const overlap = (a, b, list) => list.reduce((s, o) => s + Math.max(0, Math.min(b, o.b) - Math.max(a, o.a)), 0) / 1000;
  const perSpike = off == null ? [] : spikes.filter((sp) => sp.t0 != null).slice(0, 60).map((sp) => {
    const a = sp.t0 * 1000 + off, b = sp.t1 * 1000 + off;
    const names = {}; for (const x of spans) { const o = Math.max(0, Math.min(b, x.b) - Math.max(a, x.a)) / 1000; if (o > 0.05) names[x.name] = Math.round(((names[x.name] || 0) + o) * 10) / 10; }
    return { frame: sp.frame, ms: sp.ms, wallMs: Math.round((sp.t1 - sp.t0) * 10) / 10, gcMs: Math.round(overlap(a, b, outer) * 10) / 10, names };
  });
  const withGc = perSpike.filter((x) => x.gcMs >= 1).length;
  return { synced: off != null, mainThread: threadName.get(main) || main || null, events: ev.length, totalMs: Math.round(totalMs * 10) / 10,
    perFrameMs: Math.round(totalMs / Math.max(1, frames) * 100) / 100, byName, spikesWithGc: withGc + '/' + perSpike.length, spikes: perSpike };
}

