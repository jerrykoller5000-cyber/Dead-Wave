(() => { const d = window.TT.wallCullDbg && window.TT.wallCullDbg(); return JSON.stringify(d ? { cells: d.cells, hidden: d.hidden, segments: d.segments, ms: d.ms } : null); })()
