Set-Location 'C:\Users\Zero\Desktop\Tiny Trek'
node crew/crew.mjs slot run grokbot GB-266 --checks "t322 --all t215 t95 real renderer" -- node tools/realtest.mjs t322 t215 t95 --all *> qa/2026-11-01-GB-266/real4.log
$A = '--agent','grokbot','--task','GB-266'
node tools/camera.mjs start --match @A *> qa/2026-11-01-GB-266/cam4.log
$v = node tools/camera.mjs eval "T.utilityDbg.on(true); T.utilityDbg.lead('oldman'); T.clearZombies(); const all = T.ironDbg.spots(); const s = all.slice().sort((a, b) => a.half - b.half)[0]; window.__s = s; const ra = Math.atan2(s.z, s.x); const ox = s.x + Math.cos(ra) * 6 - s.ux * 2.5, oz = s.z + Math.sin(ra) * 6 - s.uz * 2.5; const h = (x, z) => T.sampleHeight(x, z); return 'SPOT ' + JSON.stringify(all.map(q => [q.id, +(q.half * 2).toFixed(1), q.segs.length])) + ' CAM ' + [ox, h(ox, oz) + 2.2, oz].map(n => n.toFixed(2)).join(',') + ' LOOK ' + [s.x, h(s.x, s.z) + 1.1, s.z].map(n => n.toFixed(2)).join(',') + ' AT ' + s.x.toFixed(2) + ',' + s.z.toFixed(2)" @A 2>&1
$v | Out-File -Append -Encoding utf8 qa/2026-11-01-GB-266/cam4.log
$line = ($v | Select-String 'CAM ').Line
$cam = [regex]::Match($line, 'CAM (\S+)').Groups[1].Value; $look = [regex]::Match($line, 'LOOK (\S+)').Groups[1].Value; $at = [regex]::Match($line, 'AT (\S+)').Groups[1].Value
node tools/camera.mjs shot "xz:$at" --cam $cam --look $look --time noon --out review/GB-266/gap-before-noon.png @A *>> qa/2026-11-01-GB-266/cam4.log
node tools/camera.mjs eval "return JSON.stringify({ hung: T.ironDbg.hang(window.__s.id), left: T.ironDbg.left(), meshes: T.ironDbg.meshes() })" @A *>> qa/2026-11-01-GB-266/cam4.log
node tools/camera.mjs shot "xz:$at" --cam $cam --look $look --time noon --out review/GB-266/gap-iron-noon.png @A *>> qa/2026-11-01-GB-266/cam4.log
node tools/camera.mjs shot "xz:$at" --cam $cam --look $look --time dusk --out review/GB-266/gap-iron-dusk.png @A *>> qa/2026-11-01-GB-266/cam4.log
node tools/camera.mjs shot "xz:$at" --height 9 --orbit 30 --time noon --out review/GB-266/gap-iron-above-noon.png @A *>> qa/2026-11-01-GB-266/cam4.log
node tools/camera.mjs stop @A *>> qa/2026-11-01-GB-266/cam4.log
'R4DONE' | Out-File -Encoding ascii qa/2026-11-01-GB-266/r4.flag