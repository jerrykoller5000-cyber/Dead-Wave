// posedlabels.mjs '<pose>': the posed canonical hand's vertices and each one's first bone (for slide2.py)
const M = await import('/home/claude/handfit-work/hand/mh-tool.mjs');
const P = M.handPosed(JSON.parse(process.argv[2]), M.GLOVE_INFLATE);
console.log(JSON.stringify({ p: Array.from(P.p, (v) => +v.toFixed(5)), b: Array.from(P.b0) }));
