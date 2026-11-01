Set-Location 'C:\Users\Zero\Desktop\Tiny Trek'
node crew/crew.mjs slot run grokbot GB-266 --checks "t322 t320 real renderer" -- node tools/realtest.mjs t322 t320 *> qa/2026-11-01-GB-266/real2.log
'R2DONE' | Out-File -Encoding ascii qa/2026-11-01-GB-266/r2.flag