import fs from 'node:fs';import assert from 'node:assert/strict';
const dir='review/range-flow-waist-GP19914';
function edit(p,f){const a=fs.readFileSync(p,'utf8'),b=f(a);assert.notEqual(a,b,p);fs.writeFileSync(dir+'/'+p.replaceAll('/','_')+'.before',a);assert.equal(fs.readFileSync(p,'utf8'),a);fs.writeFileSync(p,b);}
function replace(s,a,b){assert.equal(s.split(a).length,2,a);return s.replace(a,b);}
edit('ui/range-console.js',s=>{
 s=replace(s,'start,retry,exit,cancel,openSelection','start,exit,cancel');
 s=replace(s,"metric='score',detailView='briefing';","metric='score',detailView='briefing',lastRun=null;");
 const a=s.indexOf("  if(b.hasAttribute('data-retry'))"),b=s.indexOf('  if(b.dataset.view)',a);assert(a>0&&b>a);s=s.slice(0,a)+s.slice(b);
 s=replace(s,' let resultView=null;','');
 const c=s.indexOf('  results(r,d,entry){'),e=s.indexOf('\n  update(s)',c);assert(c>0&&e>c);
 s=s.slice(0,c)+`  setResult(r,d,entry){lastRun={r,d,entry};},`+s.slice(e);
 const x=s.indexOf(' // Results use the same record filters'),y=s.indexOf(' return api;',x);assert(x>0&&y>x);s=s.slice(0,x)+s.slice(y);
 s=replace(s,'${details(d)}</main>','${details(d)}</main>${lastRun?runReport(lastRun):\'\'}');
 const at=s.indexOf(' function details(d)');
 s=s.slice(0,at)+` function runReport({r,d,entry}){
  return \`<section class="rd-last-run"><header><div><small>\${t('range.lastRun')}</small><h3>\${esc(label(d))}</h3></div><b class="rd-run-score">\${r.valid?r.score:t('range.void')}</b></header><p>\${t('range.'+r.state.toLowerCase())}\${r.reason?' · '+t('range.reason.'+r.reason):''}</p><div class="rd-result-metrics"><span>\${t('range.records.time')}: <b>\${r.time.toFixed(2)}s</b></span><span>\${t(d.continuous?'range.contact':'range.accuracy')}: <b>\${r.efficiency.toFixed(1)}%</b></span><span>\${t('range.records.cleared')}: <b>\${r.cleared}/\${targetGoal(d)}</b></span><span>\${t('range.records.shots')}: <b>\${r.shots}</b></span>\${r.firstShot!=null?\`<span>\${t('range.records.first')}: <b>\${r.firstShot.toFixed(2)}s</b></span>\`:''}</div><p>\${t('range.breakdown',{base:Math.round(r.base),bonuses:Math.round(r.bonuses),deductions:Math.round(r.deductions)})}</p>\${r.valid&&entry?.newBests?.length?\`<p class="rd-best-announcement">\${t('range.records.new',{records:entry.newBests.map(k=>text('range.records.'+k)).join(' · ')})}</p>\`:''}</section>\`;
 }
`+s.slice(at);return s;
});
edit('ui/range-feature.js',s=>replace(replace(s,'records,start,retry:()=>start(lastDrill),exit,cancel:()=>session.abort(\'cancel\'),openSelection:open','records,start,exit,cancel:()=>session.abort(\'cancel\')'),"env.stop();env.pause(true);ui.results(r,lastDrill,entry);","env.stop();ui.setResult(r,lastDrill,entry);session.reset();ui.update(session.snapshot());"));
edit('ui/strings.js',s=>replace(s,'  "range.monitor.title":','  "range.lastRun": "Last drill result",\n  "range.monitor.cleared": "{cleared}/{total} cleared  ·  {shots} shots",\n  "range.monitor.title":'));
edit('ui/range-monitor.js',s=>replace(s,"}else if(r){line(r.valid?text('range.score',{score:r.score}):text('range.void'),213,90,r.valid?'#f4e486':'#ff8778');line(text('range.monitor.result',{time:r.time.toFixed(2),accuracy:r.efficiency.toFixed(1),metric:text(d.continuous?'range.contact':'range.accuracy')}),295,38);line(text('range.monitor.retry'),355,27);}","}else if(r){line(r.valid?text('range.score',{score:r.score}):text('range.void'),178,78,r.valid?'#f4e486':'#ff8778');line(text('range.monitor.result',{time:r.time.toFixed(2),accuracy:r.efficiency.toFixed(1),metric:text(d.continuous?'range.contact':'range.accuracy')}),243,34);line(text('range.monitor.cleared',{cleared:r.cleared,total:targetGoal(d),shots:r.shots}),291,31);line(r.reason?text('range.reason.'+r.reason):text('range.monitor.retry'),352,25,r.reason?'#ffb0a2':'#d8ece1');}"));
edit('ui/range-drills.css',s=>s+'\n#rangeConsole .rd-last-run{margin-top:20px;padding:18px;border:1px solid #697459;background:#101a15}#rangeConsole .rd-last-run h3{margin:5px 0}#rangeConsole .rd-run-score{font:700 38px monospace;color:#dfd181}\n');
console.log('Removed automatic after-action modal; monitor persists and computer retains full last-run report.');
