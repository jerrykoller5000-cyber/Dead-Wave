const M = await import('/home/claude/handfit-work/hand/mh-tool.mjs');
const p = JSON.parse(process.argv[2]);
for (const inf of [0, M.GLOVE_INFLATE]) { const r = M.handClipReport(p, 0.0005, true, inf); console.log(inf ? 'gloved' : 'bare', JSON.stringify(r).slice(0, 300)); }
