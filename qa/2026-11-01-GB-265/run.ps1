Set-Location 'C:\Users\Zero\Desktop\Tiny Trek'
node crew/crew.mjs slot run grokbot GB-265 --checks "GB-265 saw-hearing probe" -- node qa/2026-11-01-GB-265/probe.mjs after *> qa/2026-11-01-GB-265/after.log
node crew/crew.mjs slot run grokbot GB-265 --checks "t215 t95 t77 t139 real renderer" -- node tools/realtest.mjs t215 t95 t77 t139 *> qa/2026-11-01-GB-265/real.log
npm test -- t215 t95 t77 t139 --jobs 1 --agent grokbot --task GB-265 *> qa/2026-11-01-GB-265/page.log
'ALLDONE' | Out-File -Encoding ascii qa/2026-11-01-GB-265/done.flag