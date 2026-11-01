Set-Location 'C:\Users\Zero\Desktop\Tiny Trek'
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 closing: t215 t95 t121 t217 real renderer on the current tree" --minutes 30 -- node tools/realtest.mjs t215 t95 t121 t217 *> qa/2026-10-31-GB-260/real8.log
'ALLDONE' | Out-File -Encoding ascii qa/2026-10-31-GB-260/done8.flag
