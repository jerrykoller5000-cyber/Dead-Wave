const fs = require('fs');
const path = 'handoffs/2026-11-07-grokbot-GB-299.md';
let body = fs.readFileSync(path, 'utf8');
// strip old title block if we re-prepend
if (!body.startsWith('Changed:')) {
  const header = [
    'Changed:          Measured night1 + first minute of night2 overlay (fps/low/worst/hitch every 10s) on current (e138d7e8) and v1.1.0 side copy. No game code changes.',
    'Files:            qa/2026-11-07-GB-299/current-table.md, v110-table.md, current-raw.json, v110-raw.json; handoffs/2026-11-07-grokbot-GB-299.md; side copy C:/Users/Zero/Desktop/dw-gb299-v110 (from Local 1.1.0 game/)',
    'Tests:            not run (measure-only card; real-renderer overlay run via slot, not npm test)',
    'Screenshots:      none (overlay numbers sampled via TT.perfSnapshot; no Marine Inspector shots requested)',
    'Not verified:     Natural night1 clear (combat AI never killed the 15z; both runs hit 12-min wall-clock cap). NSIS re-install skipped to avoid overwriting live Local install - used side copy of version.json=1.1.0 game tree instead. Woods/roam load not sampled (parked near HQ).',
    'Requests:         none',
    'Contract changes: none',
    '',
  ].join('\n');
  body = header + body;
  fs.writeFileSync(path, body, 'utf8');
}
console.log(fs.readFileSync(path,'utf8').slice(0,900));
