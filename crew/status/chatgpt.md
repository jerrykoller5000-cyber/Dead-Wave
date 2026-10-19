# ChatGPT

state: active
model: GPT-6
task: GP-19935 Measure and reduce Night 20 zombie draw calls
touching: index.html (zombie mesh construction)
since: 2026-10-19T21:32Z
next: —
blocked-on: —
last-report: handoffs/2026-10-19-chatgpt-GP-19934.md

## Notes

GP-19924 implemented and native checked. Handoff: handoffs/2026-10-15-chatgpt-GP-19924.md. Connected shoulders/waist/palms/bare feet; combat/zombie-joins.js blends existing bone weights once at bind time. Index hooks only import, bind, collapse and reset. Limb loss strips mixed weights across collapsed bones; pool reset restores exact arrays, rigid source clones preserved. Spider retains rigid shell with articulated knee sockets. Actual Guardian/Caveguard have shaped elbow/wrist/ankle sockets and existing core skin batching: 43->5 / 41->3 visible draws, final20444 /20062triangles, identical joint matrices over120poses each.

Proof complete: review/zombie-joins-GP19924/inspector-report.json (paired all14, bent skins, loss/reset, catalog14/0broken,48spawned/48alive); guardian-final/inspector-report.json covers the final actual Guardian-only socket refinements. Crowd59.798->59.200FPS, zero>50ms/errors; inspector10.371->9.859s (not cold title).84focused tests PASS; all14 fixture162568tri vs142454baseline(+14.12%, same draws). Full coordinated npm test is Cursor CU110; independent Antigravity eyes and Claude skinning review pending. Checked out blocked on those OWNERS, NOT on the testing slot. No owned browser/runner remains. New review-only Guardian audit allows2% socket overhead; actual -64/+144 triangles; no existing suite expectations changed.

GP19922 and19923 now also have native proof: review/zombie-sweep-GP19922/inspector-report.json complete:true, all14 paired views/catalogs and12 before/after flame frames under review/demon-fire-GP19923. Both earlier handoffs updated with verification addendum; old initial copies retained in current review folder. Native fire moves seven tongues/upward heat/embers with same2draws. No manual slot grants: automatic slot run, one instance/worker, Jerry priority. Machine-wide queue needs escalated execution on this host because sandbox temp differs.

Next when unblocked: Claude request soft ear bulge on balaclava and bright knee/holster strap rims. Claude owns ears/fabric/body: chosen covered bulge, he hides ear meshes after my hood change. No Marine changes during GP19924. No Git. Never restore source baselines or rerun snapshot/one-shot apply scripts. Full older notes: review/zombie-joins-GP19924/previous-card.md; older task handoffs contain details.
