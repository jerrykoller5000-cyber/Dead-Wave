Set-Location 'C:\Users\Zero\Desktop\Tiny Trek'
node crew/crew.mjs slot run grokbot GB-266 --checks "t322 t215 t95 t314 t319 real renderer" -- node tools/realtest.mjs t322 t215 t95 t314 t319 *> qa/2026-11-01-GB-266/real1.log
'R1DONE' | Out-File -Encoding ascii qa/2026-11-01-GB-266/r1.flag