@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-244 --checks "t282 real x2 + t215 t95 after the day1FwdOk fix" --minutes 60 -- node tools/realtest.mjs t282 t282 t215 t95 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-244\fix.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-244\fix-ran.txt"
