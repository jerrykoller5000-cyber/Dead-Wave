Set-Location 'C:\Users\Zero\Desktop\Tiny Trek'
node crew/crew.mjs slot run grokbot GB-262 --checks "t284 t277 real renderer" -- node tools/realtest.mjs t284 t277 *> qa/2026-10-31-GB-262/real.log
npm test -- t284 t277 --jobs 1 --agent grokbot --task GB-262 *> qa/2026-10-31-GB-262/page.log
'ALLDONE' | Out-File -Encoding ascii qa/2026-10-31-GB-262/done.flag
