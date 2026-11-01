Set-Location 'C:\Users\Zero\Desktop\Tiny Trek'
node crew/crew.mjs slot run grokbot GB-266 --checks "t322 --all real renderer" -- node tools/realtest.mjs t322 --all *> qa/2026-11-01-GB-266/real3.log
npm test -- t215 t95 t322 --jobs 1 --agent grokbot --task GB-266 *> qa/2026-11-01-GB-266/page.log
$A = '--agent','grokbot','--task','GB-266'
node tools/camera.mjs start --match @A *> qa/2026-11-01-GB-266/cam.log
node tools/camera.mjs eval "T.utilityDbg.on(true); T.utilityDbg.lead('oldman'); const s = T.ironDbg.spots().filter(q => q.kind === 'ring'); window.__s = s[0]; return JSON.stringify(s.map(q => [q.id, +q.x.toFixed(2), +q.z.toFixed(2), +q.ux.toFixed(3), +q.uz.toFixed(3), +q.half.toFixed(2)]))" @A *>> qa/2026-11-01-GB-266/cam.log
node tools/camera.mjs eval "const s = window.__s; const ra = Math.atan2(s.z, s.x); const ox = s.x + Math.cos(ra) * 7, oz = s.z + Math.sin(ra) * 7; return [ox, T.sampleHeight(ox, oz) + 1.7, oz, s.x, T.sampleHeight(s.x, s.z) + 1.0, s.z].map(v => v.toFixed(2)).join(',')" @A *>> qa/2026-11-01-GB-266/cam.log
'CAMREADY' | Out-File -Encoding ascii qa/2026-11-01-GB-266/cam.flag