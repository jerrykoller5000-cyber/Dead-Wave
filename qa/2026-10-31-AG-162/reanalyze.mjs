// qa/2026-10-31-AG-162/reanalyze.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeTrace } from './analyze.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const summaryFile = path.join(dir, 'summary.json');
const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));

for (const rec of summary) {
  const tracePath = path.join(dir, `${rec.name}.trace.json`);
  if (!fs.existsSync(tracePath)) continue;
  const raw = JSON.parse(fs.readFileSync(tracePath, 'utf8'));
  const events = raw.traceEvents || raw;
  const expectedFrames = rec.windowSplit?.last10s?.frames || null;
  const ts = analyzeTrace(events, expectedFrames);
  rec.traceSummary = ts;
  fs.writeFileSync(path.join(dir, `${rec.name}.trace-summary.json`), JSON.stringify(ts, null, 2), 'utf8');

  const m = ts.mainThreadSummary;
  const b = m.breakdown;
  console.log(`\n=== ${rec.name} (hud=${rec.hudMode}) ===`);
  console.log(`  bench.mjs view : fps ${rec.fps} | low ${rec.low} | frame10s ${rec.benchProf.frameMs10s} ms = tick30s ${rec.benchProf.tickMs30s} ms + outsideBench ${rec.benchProf.outsideMsBench} ms`);
  console.log(`  first 20s view : frames ${rec.windowSplit.first20s.frames} | wallFrame ${rec.windowSplit.first20s.wallFrameMs} ms = tick20s ${rec.windowSplit.first20s.tickMs} ms + outside20s ${rec.windowSplit.first20s.outsideMs} ms (${rec.windowSplit.first20s.spikes} spikes)`);
  console.log(`  last 10s view  : frames ${rec.windowSplit.last10s.frames} | wallFrame ${rec.windowSplit.last10s.wallFrameMs} ms = tick10s ${rec.windowSplit.last10s.tickMs} ms + outside10s ${rec.windowSplit.last10s.outsideMs} ms (${rec.windowSplit.last10s.spikes} spikes)`);
  console.log(`  trace 10s view : frames ${ts.renderedFrames} (gameTickRafs ${ts.gameTickRafCount}, allRafs ${ts.allRafCallbacksCount}) | traceFrame ${m.frameMs} ms`);
  console.log(`    CrRendererMain : gameTickRaf ${m.gameTickRafMsPerFrame} ms | otherRafs ${m.otherRafMsPerFrame} ms | mainOutRafBusy ${m.mainOutsideRafBusyMsPerFrame} ms | waitForFrameIdle ${m.waitForFrameIdleMsPerFrame} ms`);
  console.log(`    Main renderPipe: total ${m.renderPipelineTotalMsPerFrame} ms/f (post-rAF ${m.renderPipelinePostRafMsPerFrame} ms/f) -> Style ${b.UpdateLayoutTree_Style.msPerFrame} (out ${b.UpdateLayoutTree_Style.outRafMsPerFrame}) | Layout ${b.Layout.msPerFrame} | PrePaint ${b.PrePaint.msPerFrame} | Layerize ${b.Layerize.msPerFrame} | Paint ${b.Paint.msPerFrame} | Commit ${b.Composite_Commit.msPerFrame}`);
  console.log(`    Main other     : Animation ${b.Animation.msPerFrame} ms/f | GC ${b.GC.msPerFrame} ms/f (inRaf ${b.GC.inRafMsPerFrame}, outRaf ${b.GC.outRafMsPerFrame}) | FuncOutRaf ${b.FunctionCall_OutsideRaf.msPerFrame} ms/f | Timer ${b.TimerFire.msPerFrame} ms/f | MicrotasksOutRaf ${b.RunMicrotasks_OutsideRaf.msPerFrame} ms/f`);
  console.log(`    Other threads  : Compositor ${ts.compositorSummary.busyMsPerFrame} ms/f | VizCompositor ${ts.vizSummary.busyMsPerFrame} ms/f | CrGpuMain ${ts.gpuMainSummary.busyMsPerFrame} ms/f`);
  console.log(`    Normal <=20ms  : ${ts.frameIntervals.normalVsync_le20ms.count}f | wall ${ts.frameIntervals.normalVsync_le20ms.wallMs} ms = gameTick ${ts.frameIntervals.normalVsync_le20ms.gameTickMs} + postRafBusy ${ts.frameIntervals.normalVsync_le20ms.postRafBusyMs} + idleWait ${ts.frameIntervals.normalVsync_le20ms.idleWaitMs} ms`);
  console.log(`    Slow >20ms     : ${ts.frameIntervals.missedVsync_gt20ms.count}f | wall ${ts.frameIntervals.missedVsync_gt20ms.wallMs} ms = gameTick ${ts.frameIntervals.missedVsync_gt20ms.gameTickMs} + postRafBusy ${ts.frameIntervals.missedVsync_gt20ms.postRafBusyMs} + idleWait ${ts.frameIntervals.missedVsync_gt20ms.idleWaitMs} ms`);
  console.log(`    top30s phases  : ${rec.benchProf.top30s.slice(0, 8).map((p) => p.k + ':' + p.avg).join(', ')}`);
  console.log(`    top10s phases  : ${rec.windowSplit.last10s.top10s.slice(0, 8).map((p) => p.k + ':' + p.avg).join(', ')}`);
  console.log(`    mainOutRaf top : ${ts.mainThreadSummary.topMainOutsideRaf.slice(0, 6).map((e) => e.name + ':' + e.msPerFrame + 'ms(' + e.count + ')').join(', ')}`);
  console.log(`    Compositor top : ${ts.compositorSummary.topEvents.slice(0, 5).map((e) => e.name + ':' + e.msPerFrame + 'ms').join(', ')}`);
  console.log(`    Viz top        : ${ts.vizSummary.topEvents.slice(0, 5).map((e) => e.name + ':' + e.msPerFrame + 'ms').join(', ')}`);
  console.log(`    CrGpuMain top  : ${ts.gpuMainSummary.topEvents.slice(0, 5).map((e) => e.name + ':' + e.msPerFrame + 'ms').join(', ')}`);
  console.log(`    DOM state      : activeAnimations=${rec.domState?.activeAnimations?.length || 0} (${JSON.stringify(rec.domState?.activeAnimations || [])}), markerCount=${rec.domState?.markerCount}, pictureDbg=${JSON.stringify(rec.domState?.pictureDbg)}`);
}

fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
