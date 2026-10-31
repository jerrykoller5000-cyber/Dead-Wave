Set-Location 'C:\Users\Zero\Desktop\Tiny Trek'
node crew/crew.mjs slot run grokbot GB-258 --checks "GB-258 after-probe" -- node qa/2026-10-31-GB-258/probe.mjs after *> qa/2026-10-31-GB-258/after.log
node crew/crew.mjs slot run grokbot GB-258 --checks "t215 t95 t35 t264 real renderer" -- node tools/realtest.mjs t215 t95 t35 t264 *> qa/2026-10-31-GB-258/real.log
npm test -- t215 t95 t35 t264 --jobs 1 --agent grokbot --task GB-258 *> qa/2026-10-31-GB-258/page.log
'ALLDONE' | Out-File -Encoding ascii qa/2026-10-31-GB-258/done.flag